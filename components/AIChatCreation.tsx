
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, Mic, MicOff, ArrowRight, Check, Camera, Loader2, Edit2, MapPin, Navigation, Search, User, Plus, Trash2, TrendingDown, Info, Image as ImageIcon, Users, Clock, CalendarClock, Zap, Calendar, ListFilter, Target, ShieldCheck, Stars } from 'lucide-react';
import { Chat } from '@google/genai';
import { createTaskChatSession, sendMessageToGemini, estimateTaskPrice } from '../services/geminiService';
import { AIAnalysisResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { LocationPickerModal } from './LocationPickerModal';

interface AIChatCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (data: AIAnalysisResult, images: string[], locationMode: 'GPS' | 'MANUAL', manualAddress?: string, manualCoordinates?: { lat: number, lng: number }, estimatedPrice?: string, timing?: string) => void | Promise<void>;
  userLocation: [number, number] | null;
}

type WizardStep = 'INPUT_TEXT' | 'INPUT_PHOTO' | 'PROCESSING' | 'CLARIFICATION' | 'PREVIEW';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }
        else { reject(new Error("Canvas missing")); }
      };
      img.onerror = () => reject(new Error("Image error"));
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const AIChatCreation: React.FC<AIChatCreationProps> = ({ isOpen, onClose, onTaskCreated, userLocation }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<WizardStep>('INPUT_TEXT');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [activeHint, setActiveHint] = useState(0);
  const [locationMode, setLocationMode] = useState<'GPS' | 'MANUAL'>('GPS');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCoords, setManualCoords] = useState<{ lat: number, lng: number } | undefined>(undefined);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [timingType, setTimingType] = useState<'ASAP' | 'SPECIFIC' | 'FLEXIBLE'>('ASAP');
  const [specificDate, setSpecificDate] = useState('');
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setChatSession(createTaskChatSession());
      setStep('INPUT_TEXT'); setDescription(''); setPhotos([]); setConversationHistory([]); setUserAnswer(''); setAiResult(null);
      setIsLoading(false); setIsEditing(false);
      setLocationMode(userLocation ? 'GPS' : 'MANUAL');
      setManualAddress(''); setManualCoords(undefined);
      setShowPriceModal(false); setEstimatedPrice(''); setActiveHint(0); setIsPublishing(false); setTimingType('ASAP'); setSpecificDate('');
    } else {
      setChatSession(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'INPUT_TEXT') {
      const interval = setInterval(() => setActiveHint(p => (p === 0 ? 1 : 0)), 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, step]);

  useEffect(() => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'bg-BG';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          if (step === 'INPUT_TEXT') setDescription(p => p + (p ? ' ' : '') + transcript);
          else if (step === 'CLARIFICATION') setUserAnswer(p => p + (p ? ' ' : '') + transcript);
        };
        recognitionRef.current = recognition;
      }
    } catch (e) { }
  }, [step]);

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5 - photos.length);
      for (const f of files) {
        if (f instanceof File) {
          const res = await resizeImage(f);
          setPhotos(prev => [...prev, res]);
        }
      }
      // Reset value to allow re-selecting the same file if needed
      if (e.target) e.target.value = '';
    }
  };

  const handleStartAnalysis = async () => {
    if (photos.length === 0) return;
    
    // If AI is not available, proceed with manual data to not block the user
    if (!chatSession) {
      setAiResult({
        title: description.split('\n')[0].substring(0, 60),
        description: description,
        category: 'Други'
      });
      setStep('PREVIEW');
      return;
    }

    setStep('PROCESSING');
    setIsLoading(true);
    setError('');
    try {
      const response = await sendMessageToGemini(chatSession, description, photos[0]);
      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }
      if (response.analysis) { 
        setAiResult(response.analysis); 
        setStep('PREVIEW'); 
      } else { 
        setConversationHistory([{ role: 'ai', text: response.text }]); 
        setStep('CLARIFICATION'); 
      }
    } catch (e) {
      // Fallback on error
      setAiResult({
        title: description.split('\n')[0].substring(0, 60),
        description: description,
        category: 'Други'
      });
      setStep('PREVIEW');
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleAnswerSubmit = async () => {
    if (!chatSession || !userAnswer.trim() || isLoading) return;
    const answer = userAnswer;
    setUserAnswer('');
    setConversationHistory(prev => [...prev, { role: 'user', text: answer }]);
    setIsLoading(true);
    try {
      const response = await sendMessageToGemini(chatSession, answer, null);
      if (response.analysis) { setAiResult(response.analysis); setStep('PREVIEW'); }
      else { setConversationHistory(prev => [...prev, { role: 'ai', text: response.text }]); }
    } finally { setIsLoading(false); }
  };

  const handleInitialPublish = async () => {
    if (!aiResult) return;
    setShowPriceModal(true); setIsCalculatingPrice(true);
    try { const p = await estimateTaskPrice(aiResult.title, aiResult.description); setEstimatedPrice(p); }
    catch (e) { setEstimatedPrice("По договаряне"); } finally { setIsCalculatingPrice(false); }
  };

  const handleFinalConfirm = async () => {
    if (isPublishing || !aiResult) return;
    setIsPublishing(true);
    let timingString = 'Възможно най-скоро';
    if (timingType === 'FLEXIBLE') timingString = 'Гъвкаво / Не е спешно';
    else if (timingType === 'SPECIFIC' && specificDate) timingString = `На ${new Date(specificDate).toLocaleString('bg-BG')}`;
    try { await onTaskCreated(aiResult, photos, locationMode, manualAddress, manualCoords, estimatedPrice, timingString); }
    catch (e) { setIsPublishing(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-950/40 backdrop-blur-xl p-0 md:p-6 overflow-hidden">

      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%] bg-blue-500/30 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[15%] right-[15%] w-[30%] h-[30%] bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2.5s' }}></div>

      {/* Main Container - Removed dynamic transitions for smoother mobile experience */}
      <div className="w-full md:max-w-md h-fit max-h-[95vh] md:rounded-[40px] bg-white/10 backdrop-blur-[60px] border border-white/20 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] flex flex-col relative overflow-hidden ring-1 ring-white/10">

        {/* Mirror Reflection Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-0"></div>

        {/* HEADER - More Compact */}
        <div className="px-6 py-4 flex justify-between items-center z-10 border-b border-white/5 bg-white/5 backdrop-blur-md pt-safe-top overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Bot size={18} /></div>
            <div>
              <h3 className="font-black text-base text-white leading-none tracking-tight">Needo AI</h3>
              <p className="text-[8px] text-blue-300 font-bold uppercase tracking-[0.2em] mt-1">Smart Creation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-slate-300 active:scale-90"><X size={18} /></button>

          {/* Progress Indicator */}
          {step !== 'PREVIEW' && (
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5">
              <div
                className="h-full bg-blue-400 shadow-[0_0_8px_#60a5fa] transition-all duration-700 ease-in-out"
                style={{ width: step === 'INPUT_TEXT' ? '25%' : step === 'INPUT_PHOTO' ? '50%' : step === 'PROCESSING' ? '75%' : '100%' }}
              ></div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col pt-4 pb-safe-bottom px-6 overflow-y-auto scrollbar-hide relative z-10">

          {/* PERSISTENT INPUTS FOR FILE UPLOAD - FIXED HERE */}
          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />

          {/* STEP 1: TEXT INPUT - Minimal */}
          {step === 'INPUT_TEXT' && (
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-2xl font-black tracking-tighter">{t('ai_step1_title')}</h2>
                <span className="text-lg font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">1/3</span>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-md mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/20 blur-xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <h4 className="text-xs font-black text-white uppercase tracking-wide mb-2 relative z-10">Създай задача в 3 лесни и бързи стъпки!</h4>
                <div className="flex items-start gap-3 relative z-10">
                  <Stars size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-blue-100 font-medium leading-normal">
                    {activeHint === 0 ? t('ai_hint1_desc') : t('ai_hint2_desc')}
                  </p>
                </div>
              </div>

              <div className="relative mb-4 bg-white/5 border border-white/10 rounded-[24px] focus-within:bg-white/10 transition-all">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('ai_input_ph')}
                  className="w-full h-32 p-5 pr-14 bg-transparent border-none text-white text-sm font-medium focus:ring-0 outline-none resize-none"
                  autoFocus
                />
                <button
                  onClick={toggleListening}
                  className={`absolute bottom-4 right-4 p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>

              <button
                onClick={() => setStep('INPUT_PHOTO')}
                disabled={!description.trim()}
                className="mb-4 w-full py-4 bg-white text-slate-900 rounded-[20px] text-sm font-black disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                {t('ai_btn_next')} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: PHOTO UPLOAD - Minimal Grid */}
          {step === 'INPUT_PHOTO' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-2xl font-black tracking-tighter">{t('ai_step2_title')}</h2>
                <span className="text-lg font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">2/3</span>
              </div>
              <p className="text-slate-400 text-[10px] font-medium text-center mb-4">{t('ai_photo_hint_desc')}</p>

              <div className="grid grid-cols-2 gap-3 mb-4 content-start overflow-y-auto scrollbar-hide">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-[24px] overflow-hidden border border-white/10 shadow-sm">
                    <img src={p} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-lg text-white"><Trash2 size={14} /></button>
                  </div>
                ))}

                {photos.length < 5 && (
                  <>
                    <button onClick={() => cameraInputRef.current?.click()} className="aspect-square bg-white/5 border border-dashed border-white/20 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all">
                      <Camera size={20} className="text-blue-400" />
                      <span className="text-[9px] font-black uppercase text-slate-300">{t('ai_btn_camera')}</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-white/5 border border-dashed border-white/20 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all">
                      <ImageIcon size={20} className="text-indigo-400" />
                      <span className="text-[9px] font-black uppercase text-slate-300">{t('ai_btn_gallery')}</span>
                    </button>
                  </>
                )}
              </div>

              <button onClick={handleStartAnalysis} disabled={photos.length === 0} className="mb-4 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[20px] text-sm font-black shadow-xl disabled:opacity-30">
                <Sparkles size={18} className="inline mr-2" /> {chatSession ? t('ai_btn_analyze') : 'ПРОДЪЛЖИ БЕЗ ИИ'}
              </button>

              {!chatSession && (
                <p className="text-[10px] text-amber-600 font-bold text-center mb-4 bg-amber-50 py-2 rounded-lg border border-amber-100">
                  ⚠️ ИИ е деактивиран (не е намерен API ключ)
                </p>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 text-red-600 font-bold">!</div>
                  <div className="text-[11px] text-red-700 leading-tight">
                    <p className="font-bold mb-0.5">Грешка при анализа</p>
                    {error}
                    <p className="mt-1 opacity-70">Можете да продължите ръчно, като редактирате описанието.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 'PROCESSING' && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center animate-in fade-in">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-[2px] border-white/10 border-t-blue-400 rounded-full animate-spin"></div>
                <Bot size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-black mb-1 tracking-tighter">{t('ai_processing_title')}</h3>
              <p className="text-slate-400 text-xs font-medium">{t('ai_processing_desc')}</p>
            </div>
          )}

          {/* STEP 4: CLARIFICATION */}
          {step === 'CLARIFICATION' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
              <div className="mb-4">
                <div className="inline-block px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">AI Assistant</div>
                <h2 className="text-lg font-black leading-tight tracking-tight">{conversationHistory.filter(m => m.role === 'ai').pop()?.text}</h2>
              </div>
              <div className="relative mb-4 bg-white/5 border border-white/10 rounded-[24px]">
                <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isLoading && (e.preventDefault(), handleAnswerSubmit())} disabled={isLoading} placeholder={t('ai_q_ph')} className="w-full h-24 p-5 bg-transparent border-none text-white text-sm outline-none resize-none disabled:opacity-50" autoFocus />
                <button onClick={toggleListening} disabled={isLoading} className={`absolute bottom-3 right-3 p-3 rounded-xl ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
              </div>
              <button onClick={handleAnswerSubmit} disabled={!userAnswer.trim() || isLoading} className="mb-4 w-full py-4 bg-white text-slate-900 rounded-[20px] text-sm font-black disabled:opacity-30">
                {isLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : <><Send size={18} className="inline mr-2" /> {t('ai_btn_send')}</>}
              </button>
            </div>
          )}

          {/* STEP 5: PREVIEW - Compacted but fully readable */}
          {step === 'PREVIEW' && aiResult && (
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500 pb-4">
              <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 mb-4 relative overflow-hidden group shadow-inner">
                {isEditing ? (
                  <div className="space-y-3 animate-in fade-in">
                    <input type="text" value={tempTitle} onChange={e => setTempTitle(e.target.value)} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none text-xs font-bold" />
                    <textarea value={tempDescription} onChange={e => setTempDescription(e.target.value)} rows={5} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none resize-none text-[11px]" />
                    <div className="flex gap-2">
                      <button onClick={() => { setAiResult({ ...aiResult, title: tempTitle, description: tempDescription }); setIsEditing(false); }} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold text-[11px]">Запази</button>
                      <button onClick={() => setIsEditing(false)} className="px-5 py-3 bg-white/10 rounded-xl font-bold text-[11px]">Отказ</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">AI Assistant</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{aiResult.category}</span>
                        </div>
                        <h3 className="text-lg font-black text-white leading-tight drop-shadow-sm">{aiResult.title}</h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 font-medium leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">"{aiResult.description}"</p>

                    {/* Edit Button at Bottom */}
                    <div className="flex justify-end mt-2 mb-3">
                      <button onClick={() => { setTempTitle(aiResult.title); setTempDescription(aiResult.description); setIsEditing(true); }} className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/10">
                        <Edit2 size={12} /> Редактирай
                      </button>
                    </div>

                    {/* Images & Add Button */}
                    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide items-center">
                      {photos.map((p, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                          <img src={p} className="w-full h-full object-cover" alt="" />
                        </div>
                      ))}
                      {/* Add Photo Button */}
                      {photos.length < 5 && (
                        <button onClick={() => fileInputRef.current?.click()} className="relative w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0 backdrop-blur-sm bg-white/5">
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {!isEditing && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-2xl font-black tracking-tighter text-white">Преглед</h2>
                    <span className="text-lg font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">3/3</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 bg-white/5 rounded-2xl p-1 border border-white/10 flex gap-1 shadow-inner">
                      <button
                        onClick={() => userLocation && setLocationMode('GPS')}
                        disabled={!userLocation}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${locationMode === 'GPS' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'} ${!userLocation ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <Navigation size={12} /> GPS
                      </button>
                      <button onClick={() => setLocationMode('MANUAL')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${locationMode === 'MANUAL' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}><Search size={12} /> Ръчно</button>
                    </div>
                    {/* Location Info Text */}
                    <p className="col-span-2 text-[10px] text-slate-400 font-medium text-center -mt-1 px-4">
                      {!userLocation && locationMode === 'MANUAL'
                        ? <span className="text-amber-400 flex items-center justify-center gap-1"><Info size={10} /> GPS достъпът е отказан. Моля, изберете локация ръчно.</span>
                        : (locationMode === 'GPS' ? 'Използва текущата ви локация.' : 'Посочете точен адрес на картата.')
                      }
                    </p>

                    {locationMode === 'MANUAL' && (
                      <button onClick={() => setIsLocationPickerOpen(true)} className="col-span-2 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <MapPin size={18} className="text-blue-400 shrink-0" />
                        <p className="text-[11px] font-bold text-white truncate">{manualAddress || 'Избери локация от картата...'}</p>
                      </button>
                    )}

                    <div className="col-span-2 bg-white/5 rounded-2xl p-1 border border-white/10 flex gap-1 shadow-inner">
                      {['ASAP', 'SPECIFIC', 'FLEXIBLE'].map(t => (
                        <button key={t} onClick={() => setTimingType(t as any)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${timingType === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                          {t === 'ASAP' ? 'Спешно' : t === 'SPECIFIC' ? 'Дата' : 'Гъвкаво'}
                        </button>
                      ))}
                    </div>
                    {/* Timing Info Text */}
                    <p className="col-span-2 text-[10px] text-slate-400 font-medium text-center -mt-1 px-4">
                      {timingType === 'ASAP' && 'Изпълнителите ще реагират мигновено.'}
                      {timingType === 'SPECIFIC' && 'За конкретна дата и час.'}
                      {timingType === 'FLEXIBLE' && 'Когато е удобно (често по-ниска цена).'}
                    </p>

                    {timingType === 'SPECIFIC' && (
                      <div className="col-span-2 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                        <Calendar size={16} className="text-purple-400 shrink-0" />
                        <input type="datetime-local" value={specificDate} onChange={e => setSpecificDate(e.target.value)} className="w-full bg-transparent text-white font-bold text-[11px] outline-none" style={{ colorScheme: 'dark' }} />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleInitialPublish}
                    disabled={(locationMode === 'MANUAL' && !manualCoords) || (locationMode === 'GPS' && !userLocation)}
                    className="w-full py-5 bg-white text-slate-900 rounded-[24px] text-base font-black shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all group overflow-hidden relative border-t border-white/20"
                  >
                    <span className="relative z-10">{t('ai_btn_publish_initial')}</span>
                    <Sparkles size={18} className="text-blue-500 z-10" fill="currentColor" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <LocationPickerModal isOpen={isLocationPickerOpen} onClose={() => setIsLocationPickerOpen(false)} onConfirm={(a, lat, lng) => { setManualAddress(a); setManualCoords({ lat, lng }); }} initialLat={manualCoords?.lat} initialLng={manualCoords?.lng} initialAddress={manualAddress} />

      {/* AI PRICE ADVISOR MODAL - FIX: FULL SCREEN ON MOBILE TO PREVENT JITTER (p-0) */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4">

          {/* Backdrop - Visible mainly on desktop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setShowPriceModal(false)}></div>

          {/* Modal Card - Full Screen Mobile (w-full h-full), Centered Desktop */}
          <div className="relative w-full h-full md:w-auto md:h-auto md:max-w-[360px] md:max-h-[85vh] bg-[#0f172a] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-200 md:ring-1 md:ring-white/10">

            {/* Gradient Border Inner - Desktop only feel */}
            <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-blue-400 to-indigo-600 opacity-20 pointer-events-none hidden md:block"></div>

            {/* Inner Scroll Container - Centers content on mobile full screen */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 flex flex-col justify-center items-center relative z-10">

              {/* Mirror Reflection Effect */}
              <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-t-[40px]"></div>

              {isCalculatingPrice ? (
                <div className="py-12 flex flex-col items-center w-full">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-[3px] border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
                    <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">{t('price_calculating')}</h3>
                </div>
              ) : (
                <div className="w-full text-center">
                  {/* ICON */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-white/10 rounded-[28px] flex items-center justify-center text-white shadow-2xl mb-4 border border-white/10">
                      <Sparkles size={32} className="text-blue-300" fill="currentColor" />
                    </div>
                    <h4 className="text-[10px] font-black tracking-[0.4em] text-blue-400 uppercase">AI Price Advisor</h4>
                  </div>

                  {/* PRICE DISPLAY BOX */}
                  <div className="mb-8 py-8 bg-black/40 rounded-[40px] border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 rounded-b-2xl border-b border-x border-white/10 shadow-lg">
                      <span className="text-[8px] font-black text-white uppercase tracking-[0.25em] whitespace-nowrap">Ориентировъчна цена</span>
                    </div>

                    <div className="mt-4 flex flex-col items-center">
                      <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-1 drop-shadow-2xl">
                        {estimatedPrice.replace(/€|EUR|лв\.?|BGN/gi, '').trim()}
                        <span className="text-2xl text-blue-400 font-bold">€</span>
                      </div>
                    </div>
                  </div>

                  {/* COMPETITION EXPLANATION BLOCK */}
                  <div className="bg-white/5 p-6 rounded-[32px] text-left border border-white/10 mb-10 relative">
                    <div className="flex gap-3 items-start mb-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg"><TrendingDown size={18} /></div>
                      <h5 className="text-[11px] font-black text-white uppercase tracking-wider leading-tight pt-1.5">Спести с конкуренция</h5>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                      Тази сума е само начален пазарен ориентир. В <b>Needo</b> изпълнителите <b>наддават за Вашата задача</b>, което често води до оферти <b>в пъти по-ниски</b> от първоначалната оценка.
                    </p>
                  </div>

                  {/* FINAL ACTIONS */}
                  <div className="space-y-6">
                    <button
                      onClick={handleFinalConfirm}
                      disabled={isPublishing}
                      className="w-full py-5 bg-white text-slate-900 rounded-[28px] font-black text-lg shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isPublishing ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24} strokeWidth={4} /> {t('price_btn_publish')}</>}
                    </button>
                    <button onClick={() => setShowPriceModal(false)} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.4em] py-2 block mx-auto">{t('cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
