
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, Mic, MicOff, ArrowRight, Check, Camera, Loader2, Edit2, MapPin, Navigation, Search, User, Plus, Trash2, TrendingDown, Info, Image as ImageIcon } from 'lucide-react';
import { Chat } from '@google/genai';
import { createTaskChatSession, sendMessageToGemini, estimateTaskPrice } from '../services/geminiService';
import { AIAnalysisResult } from '../types';

interface AIChatCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (data: AIAnalysisResult, images: string[], locationMode: 'GPS' | 'MANUAL', manualAddress?: string, manualCoordinates?: {lat: number, lng: number}, estimatedPrice?: string) => void;
  userLocation: [number, number] | null;
}

type WizardStep = 'INPUT_TEXT' | 'INPUT_PHOTO' | 'PROCESSING' | 'CLARIFICATION' | 'PREVIEW';

interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Helper to compress images before upload to stay under Firestore 1MB limit
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024; // Max dimension 1024px
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG with 0.6 quality
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
            reject(new Error("Canvas context not available"));
        }
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const AIChatCreation: React.FC<AIChatCreationProps> = ({ isOpen, onClose, onTaskCreated, userLocation }) => {
  const [step, setStep] = useState<WizardStep>('INPUT_TEXT');
  
  // Data
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  
  // Location State
  const [locationMode, setLocationMode] = useState<'GPS' | 'MANUAL'>('GPS');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCoords, setManualCoords] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  // State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');

  // Price Estimation Modal State
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setChatSession(createTaskChatSession());
      setStep('INPUT_TEXT');
      setDescription('');
      setPhotos([]);
      setConversationHistory([]);
      setUserAnswer('');
      setAiResult(null);
      setIsLoading(false);
      setIsEditing(false);
      setLocationMode('GPS');
      setManualAddress('');
      setManualCoords(undefined);
      setSearchResults([]);
      setShowPriceModal(false);
      setEstimatedPrice('');
    } else {
      setChatSession(null);
      stopListening();
      setIsEditing(false);
      setShowPriceModal(false);
    }
  }, [isOpen]);

  // Address Search Logic (Nominatim)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (locationMode === 'MANUAL' && manualAddress.length > 3 && !manualCoords) {
        setIsSearchingAddress(true);
        try {
          // Limit to Bulgaria for this app context
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&countrycodes=bg&limit=5`);
          const data = await response.json();
          setSearchResults(data);
        } catch (error) {
          console.error("Error fetching addresses", error);
        } finally {
          setIsSearchingAddress(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [manualAddress, locationMode, manualCoords]);

  const selectAddress = (result: AddressResult) => {
    setManualAddress(result.display_name);
    setManualCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setSearchResults([]); // Hide dropdown
  };

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualAddress(e.target.value);
    setManualCoords(undefined); // Reset coords when typing new text to force search
  };

  // Speech Recognition
  useEffect(() => {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'bg-BG';

          recognition.onstart = () => setIsListening(true);
          recognition.onend = () => setIsListening(false);
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (step === 'INPUT_TEXT') {
              setDescription(prev => prev + (prev ? ' ' : '') + transcript);
            } else if (step === 'CLARIFICATION') {
              setUserAnswer(prev => prev + (prev ? ' ' : '') + transcript);
            }
          };
          recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                 // Silent fail or simple alert if user explicitly tried to use it
            }
          };
          recognitionRef.current = recognition;
        }
    } catch (e) {
        console.error("Speech Recognition initialization failed", e);
    }
  }, [step]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Вашият браузър не поддържа гласово въвеждане или няма разрешение.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
         recognitionRef.current.start();
      } catch(e) {
         console.error("Mic start failed", e);
      }
    }
  };

  const stopListening = () => {
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
  };

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 5 - photos.length;
      const filesToProcess = newFiles.slice(0, remainingSlots);

      for (const file of filesToProcess) {
         try {
             const resized = await resizeImage(file as File);
             setPhotos(prev => [...prev, resized]);
         } catch (err) {
             console.error("Image resize failed", err);
         }
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = async () => {
    if (!chatSession) return;
    if (photos.length === 0) {
        alert("Моля, добавете поне една снимка.");
        return;
    }
    
    setStep('PROCESSING');
    setIsLoading(true);

    try {
      // Send the first photo for AI analysis
      const response = await sendMessageToGemini(
        chatSession,
        description,
        photos[0]
      );

      if (response.analysis) {
        setAiResult(response.analysis);
        setStep('PREVIEW');
      } else {
        setConversationHistory([{ role: 'ai', text: response.text }]);
        setStep('CLARIFICATION');
      }
    } catch (error) {
      console.error(error);
      setConversationHistory([{ role: 'ai', text: "Възникна грешка. Моля, опитайте отново." }]);
      setStep('CLARIFICATION');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!chatSession || !userAnswer.trim()) return;
    
    const answer = userAnswer;
    setUserAnswer('');
    setConversationHistory(prev => [...prev, { role: 'user', text: answer }]);
    setIsLoading(true);
    
    try {
      const response = await sendMessageToGemini(chatSession, answer, null);
      
      if (response.analysis) {
        setAiResult(response.analysis);
        setStep('PREVIEW');
      } else {
        setConversationHistory(prev => [...prev, { role: 'ai', text: response.text }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    if (aiResult) {
      setTempTitle(aiResult.title);
      setTempDescription(aiResult.description);
      setIsEditing(true);
    }
  };

  const saveEditing = () => {
    if (aiResult && tempTitle.trim() && tempDescription.trim()) {
      setAiResult({
        ...aiResult,
        title: tempTitle,
        description: tempDescription
      });
      setIsEditing(false);
    }
  };

  const handleInitialPublish = async () => {
    if (!aiResult) return;
    
    // Start the Price Modal flow
    setShowPriceModal(true);
    setIsCalculatingPrice(true);
    
    // Calculate Price in background
    try {
        const price = await estimateTaskPrice(aiResult.title, aiResult.description);
        setEstimatedPrice(price);
    } catch (e) {
        setEstimatedPrice("По договаряне");
    } finally {
        setIsCalculatingPrice(false);
    }
  };

  const handleFinalConfirm = () => {
    if (aiResult && photos.length > 0) {
      onTaskCreated(aiResult, photos, locationMode, manualAddress, manualCoords, estimatedPrice);
    }
  };

  // Extract the latest AI message for the "Question" view
  const latestAiMessage = conversationHistory.filter(m => m.role === 'ai').pop()?.text || '';
  const previousQandA = conversationHistory.slice(0, -1); // Everything except the very last AI question (if AI spoke last)

  if (!isOpen) return null;

  return (
    // Mobile: Full screen with no padding. Desktop: Center modal.
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 p-0 md:p-4">
      
      {/* Main Creation Card - Full screen on mobile to avoid resize jittering */}
      <div className={`w-full h-[100dvh] md:h-auto md:max-w-lg md:min-h-[550px] md:max-h-[90vh] md:rounded-[32px] bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-900 text-white shadow-2xl flex flex-col relative transition-all duration-300 ${showPriceModal ? 'scale-95 opacity-50 blur-sm pointer-events-none' : 'scale-100 opacity-100'}`}>
        
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center z-10 border-b border-white/10 absolute top-0 left-0 w-full bg-white/5 backdrop-blur-md pt-safe-top overflow-hidden">
          <div className="flex items-center gap-2.5">
             <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                <Bot size={18} />
             </div>
             <div>
                 <h3 className="font-bold text-lg text-white leading-none">Needo AI</h3>
                 <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wide mt-0.5">Smart Assistant</p>
             </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-blue-100 hover:text-white">
            <X size={20} />
          </button>

          {/* Integrated Progress Bar inside Header */}
          {step !== 'PREVIEW' && (
             <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-sky-300 to-white shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 ease-out"
                  style={{
                     width: step === 'INPUT_TEXT' ? '20%' :
                            step === 'INPUT_PHOTO' ? '40%' :
                            step === 'PROCESSING' ? '60%' :
                            step === 'CLARIFICATION' ? '80%' : '100%'
                  }}
                ></div>
             </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col pt-24 pb-safe-bottom px-6 overflow-y-auto scrollbar-hide">
          
          {/* STEP 1: TEXT INPUT */}
          {step === 'INPUT_TEXT' && (
            <div className="flex flex-col h-full animate-in slide-in-from-bottom duration-300">
              <div className="mb-2 mt-2 shrink-0">
                 <h2 className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight drop-shadow-sm">Какво да свършим?</h2>
                 <p className="text-blue-100 font-medium text-sm">Опишете проблема накратко. AI ще попита за детайли.</p>
              </div>

              {/* Reduced height for mobile: Fixed h-24 (96px) on mobile, auto/flex on desktop */}
              <div className="relative w-full h-24 md:h-auto md:flex-1 md:min-h-[180px]">
                 <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Например: Разходка на куче (Хъски) утре..."
                    className="w-full h-full p-3 md:p-5 bg-white/10 border border-white/20 rounded-3xl text-base md:text-lg text-white placeholder-blue-200/50 focus:border-white/50 focus:bg-white/20 focus:ring-0 outline-none resize-none transition-all leading-relaxed backdrop-blur-sm shadow-inner"
                    autoFocus
                 />
                 <button 
                    onClick={toggleListening}
                    className={`absolute bottom-2 right-2 p-2 md:p-3 md:bottom-4 md:right-4 rounded-2xl transition-all shadow-lg border border-white/10 ${
                       isListening ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'
                    }`}
                 >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                 </button>
              </div>

              <button 
                onClick={() => setStep('INPUT_PHOTO')}
                disabled={!description.trim()}
                className="mt-3 md:mt-6 w-full py-3 md:py-4 bg-white text-blue-700 rounded-2xl text-lg font-black hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl transform active:scale-[0.98] shrink-0"
              >
                Напред <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 2: PHOTO INPUT */}
          {step === 'INPUT_PHOTO' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
               <div className="mb-4 text-center mt-4">
                 <h2 className="text-2xl font-bold text-white mb-1">Добавете снимки</h2>
                 <p className="text-blue-200 text-sm">Снимките са задължителни (до 5 броя).</p>
              </div>

              {/* Hidden Inputs */}
              <input 
                type="file" 
                accept="image/*" 
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex-1 overflow-y-auto">
                 {/* Photo Grid */}
                 <div className="grid grid-cols-2 gap-3 mb-4">
                    {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border border-white/20 group">
                            <img src={photo} className="w-full h-full object-cover" alt={`Upload ${index}`} />
                            <button 
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 bg-red-500/90 backdrop-blur text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                            {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                    Основна
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
                 
                 {/* Action Buttons */}
                 {photos.length < 5 && (
                     <div className="flex gap-3 mb-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                                <ImageIcon size={20} />
                            </div>
                            <span className="text-xs font-bold text-blue-100">Галерия</span>
                        </button>
                        <button 
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex-1 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all transform active:scale-95"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                                <Camera size={20} />
                            </div>
                            <span className="text-xs font-bold text-blue-100">Камера</span>
                        </button>
                     </div>
                 )}

                 {photos.length === 0 && (
                     <div className="text-center py-4 text-blue-200/50">
                        <p className="text-sm font-medium">Моля качете поне една снимка,<br/>за да продължите.</p>
                     </div>
                 )}
              </div>

              <div className="mt-auto">
                <button 
                    onClick={handleStartAnalysis}
                    disabled={photos.length === 0}
                    className="w-full py-4 bg-white text-blue-700 rounded-2xl text-lg font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <Sparkles size={20} className="fill-blue-700" /> Анализирай
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 'PROCESSING' && (
             <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                <div className="relative mb-8">
                   <div className="w-24 h-24 rounded-full border-[6px] border-white/10"></div>
                   <div className="absolute inset-0 border-[6px] border-white rounded-full border-t-transparent animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Bot size={32} className="text-white" />
                   </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Анализиране...</h3>
                <p className="text-blue-200 font-medium text-sm max-w-xs mx-auto">Проверявам за липсващи детайли.</p>
             </div>
          )}

          {/* STEP 4: CLARIFICATION */}
          {step === 'CLARIFICATION' && (
             <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                
                {/* Collapsed History */}
                <div className="mb-2 space-y-2 opacity-60 hover:opacity-100 transition-opacity max-h-24 md:max-h-32 overflow-y-auto scrollbar-thin pr-2">
                   {previousQandA.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.role === 'ai' ? 'flex-row' : 'flex-row-reverse'}`}>
                         <div className={`p-2 rounded-lg text-xs font-medium ${
                            msg.role === 'ai' ? 'bg-white/20 text-white' : 'bg-blue-500/50 text-white'
                         }`}>
                           {msg.text}
                         </div>
                      </div>
                   ))}
                </div>

                {/* Main Question Area */}
                <div className="flex-1 flex flex-col">
                    <div className="mb-2 mt-1">
                       {isLoading ? (
                          <div className="flex items-center gap-3 text-blue-200 animate-pulse">
                             <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                             <span className="font-bold text-xl">Обработка...</span>
                          </div>
                       ) : (
                          <h2 className="text-xl md:text-3xl font-black text-white leading-tight animate-in fade-in slide-in-from-bottom-2 drop-shadow-md line-clamp-3">
                            {latestAiMessage}
                          </h2>
                       )}
                       {!isLoading && <p className="text-blue-200 font-medium text-xs mt-1 uppercase tracking-wide">Въпрос от асистента</p>}
                    </div>

                    <div className="relative w-full h-24 md:h-auto md:flex-1 md:min-h-[180px]">
                       <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAnswerSubmit())}
                          placeholder="Напишете отговор..."
                          className="w-full h-full p-3 md:p-5 bg-white/10 border border-white/20 rounded-3xl text-base md:text-lg text-white placeholder-blue-200/50 focus:border-white/50 focus:bg-white/20 focus:ring-0 outline-none resize-none transition-all leading-relaxed backdrop-blur-sm"
                          autoFocus
                       />
                       <button 
                          onClick={toggleListening}
                          className={`absolute bottom-2 right-2 p-2 md:p-3 md:bottom-4 md:right-4 rounded-2xl transition-all shadow-lg border border-white/10 ${
                             isListening ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'
                          }`}
                       >
                          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                       </button>
                    </div>

                    <button 
                      onClick={handleAnswerSubmit}
                      disabled={!userAnswer.trim() || isLoading}
                      className="mt-3 md:mt-4 w-full py-3 md:py-4 bg-white text-blue-700 rounded-2xl text-lg font-black hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl transform active:scale-[0.98] shrink-0"
                    >
                      Изпрати <ArrowRight size={20} />
                    </button>
                </div>
             </div>
          )}

          {/* STEP 5: PREVIEW */}
          {step === 'PREVIEW' && aiResult && (
             <div className="flex flex-col h-full animate-in slide-in-from-bottom duration-300">
                {!isEditing && (
                    <div className="text-center mb-4">
                       <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                          <CheckCircleIcon /> Готово!
                       </h2>
                    </div>
                )}

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-lg mb-4 relative overflow-hidden shrink-0">
                   <div className="space-y-3">
                      {isEditing ? (
                          <div className="animate-in fade-in duration-200">
                              <div className="mb-3">
                                  <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Заглавие</label>
                                  <input 
                                      type="text" 
                                      value={tempTitle}
                                      onChange={(e) => setTempTitle(e.target.value)}
                                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl font-bold text-sm text-white focus:border-white/50 outline-none"
                                  />
                              </div>
                              <div className="mb-3">
                                  <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Описание</label>
                                  <textarea 
                                      value={tempDescription}
                                      onChange={(e) => setTempDescription(e.target.value)}
                                      rows={5}
                                      className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:border-white/50 outline-none resize-none leading-relaxed"
                                  />
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={saveEditing} className="flex-1 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-50">Запази</button>
                                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20">Отказ</button>
                              </div>
                          </div>
                      ) : (
                          <>
                            <div className="flex justify-between items-start gap-4">
                               <div>
                                  <h3 className="text-lg font-bold text-white leading-tight mb-1.5">{aiResult.title}</h3>
                                  <span className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wide border border-white/10">{aiResult.category}</span>
                               </div>
                               <button onClick={startEditing} className="p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors shrink-0"><Edit2 size={16} /></button>
                            </div>
                            <div className="bg-black/10 p-4 rounded-2xl border border-white/10 text-sm text-blue-50 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin">
                               {aiResult.description}
                            </div>
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                {photos.map((p, i) => (
                                    <img key={i} src={p} className="w-12 h-12 rounded-lg object-cover border border-white/20" alt="" />
                                ))}
                            </div>
                          </>
                      )}
                   </div>
                </div>

                {/* Location Selector */}
                {!isEditing && (
                  <div className="mb-4 animate-in slide-in-from-bottom delay-100 flex-1 flex flex-col min-h-0 relative z-50">
                     <label className="text-[10px] font-bold text-blue-200 uppercase mb-2 block ml-1">Къде ще се изпълнява задачата?</label>
                     
                     <div className="bg-black/20 p-1.5 rounded-2xl flex gap-1 shrink-0 mb-3 relative z-50 backdrop-blur-sm">
                        <button 
                           onClick={() => setLocationMode('GPS')}
                           className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                              locationMode === 'GPS' 
                              ? 'bg-white text-slate-900 shadow-lg' 
                              : 'text-blue-200 hover:text-white hover:bg-white/5'
                           }`}
                        >
                           <Navigation size={14} className={locationMode === 'GPS' ? 'text-blue-500' : ''} />
                           GPS Локация
                        </button>
                        <button 
                           onClick={() => setLocationMode('MANUAL')}
                           className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                              locationMode === 'MANUAL' 
                              ? 'bg-white text-slate-900 shadow-lg' 
                              : 'text-blue-200 hover:text-white hover:bg-white/5'
                           }`}
                        >
                           <MapPin size={14} className={locationMode === 'MANUAL' ? 'text-blue-500' : ''} />
                           Посочи Адрес
                        </button>
                     </div>
                     
                     {locationMode === 'MANUAL' && (
                        <div className="animate-in fade-in slide-in-from-top-2 relative z-50">
                           <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                              <input 
                                 type="text"
                                 value={manualAddress}
                                 onChange={handleManualAddressChange}
                                 placeholder="Въведете град, квартал или улица..."
                                 className={`w-full pl-11 pr-10 py-3.5 bg-white border-2 rounded-2xl text-sm font-medium text-slate-800 focus:border-white outline-none placeholder:text-slate-400 transition-all shadow-lg ${manualCoords ? 'border-green-500/50 ring-4 ring-green-500/20' : 'border-transparent'}`}
                                 autoFocus
                              />
                              {isSearchingAddress && (
                                 <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 size={18} className="animate-spin text-blue-500" />
                                 </div>
                              )}
                              {manualCoords && !isSearchingAddress && (
                                 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <Check size={18} strokeWidth={3} />
                                 </div>
                              )}
                           </div>

                           {/* Autocomplete Dropdown */}
                           {searchResults.length > 0 && (
                              <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[180px] overflow-y-auto z-[60] divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-150">
                                 {searchResults.map((result) => (
                                    <button
                                       key={result.place_id}
                                       onClick={() => selectAddress(result)}
                                       className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm text-slate-700 flex items-start gap-3 group"
                                    >
                                       <div className="mt-0.5 bg-slate-100 p-1 rounded-md group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-slate-400">
                                          <MapPin size={14} />
                                       </div>
                                       <span className="line-clamp-2 font-medium">{result.display_name}</span>
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                     )}
                     
                     {locationMode === 'GPS' && (
                        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center backdrop-blur-sm">
                            <p className="text-sm font-bold text-white mb-1">Използване на текуща локация</p>
                            <p className="text-xs text-blue-100">Задачата ще бъде отбелязана на картата там, където се намирате в момента.</p>
                        </div>
                     )}
                  </div>
                )}

                {!isEditing && (
                    <div className="mt-auto pt-2 relative z-10">
                        <button 
                           onClick={handleInitialPublish}
                           disabled={locationMode === 'MANUAL' && !manualCoords}
                           className="w-full py-4 bg-white text-blue-700 rounded-2xl text-lg font-black hover:bg-blue-50 shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                           Публикувай Задачата
                        </button>
                        <button 
                           onClick={() => { setStep('INPUT_TEXT'); setIsEditing(false); }}
                           className="mt-4 w-full py-2 text-blue-200 font-bold text-xs hover:text-white uppercase tracking-wide transition-colors"
                        >
                           Започни отначало
                        </button>
                    </div>
                )}
             </div>
          )}

        </div>
      </div>

      {/* PRICE ESTIMATION MODAL */}
      {showPriceModal && (
          <div className="absolute z-[70] inset-0 flex items-center justify-center p-6">
               <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                  
                  {isCalculatingPrice && (
                      <div className="p-10 flex flex-col items-center justify-center text-center">
                           <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-6"></div>
                           <h3 className="text-xl font-black text-slate-800 mb-2">AI Оценява Задачата...</h3>
                           <p className="text-sm text-slate-500">Анализирам пазарните цени за подобни услуги в България.</p>
                      </div>
                  )}

                  {!isCalculatingPrice && (
                      <>
                         <div className="h-32 bg-gradient-to-br from-indigo-600 to-blue-500 relative overflow-hidden flex items-center justify-center">
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-blue-50">
                                  <Sparkles size={40} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                              </div>
                         </div>
                         
                         <div className="pt-14 pb-8 px-6 text-center">
                              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">AI ПАЗАРНА ОЦЕНКА</h3>
                              <p className="text-3xl font-black text-slate-900 mb-4">{estimatedPrice}</p>
                              
                              <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100 relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                  <div className="flex gap-3 items-start text-left">
                                      <div className="mt-0.5 bg-white p-1.5 rounded-full text-blue-600 shadow-sm shrink-0">
                                          <TrendingDown size={18} />
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-slate-800 mb-1">Искаш по-добра цена?</p>
                                          <p className="text-xs text-slate-600 leading-relaxed">
                                              Това е стандартната пазарна стойност. В <span className="font-black text-slate-800">Needo</span> обаче изпълнителите се конкурират и често предлагат <span className="text-green-600 font-black">по-изгодни оферти!</span>
                                          </p>
                                      </div>
                                  </div>
                              </div>

                              <button 
                                onClick={handleFinalConfirm}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-blue-600 transition-colors transform active:scale-[0.98]"
                              >
                                  Разбрах, Публикувай!
                              </button>
                         </div>
                      </>
                  )}
               </div>
          </div>
      )}
    </div>
  );
};

const CheckCircleIcon = () => (
   <div className="w-6 h-6 bg-white text-green-600 rounded-full flex items-center justify-center shadow-md">
      <Check size={14} strokeWidth={4} />
   </div>
);
