
import React, { useState, useRef, useEffect } from 'react';
import { Task, User } from '../types';
import { MessageCircle, Send, ShieldAlert, ChevronDown, CheckCircle, X, CornerDownRight } from 'lucide-react';

interface TaskQAPanelProps {
  task: Task;
  currentUser: User | null;
  onAskQuestion: (taskId: string, text: string) => void;
  onAnswerQuestion: (taskId: string, questionId: string, answer: string) => void;
  isOpen: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const TaskQAPanel: React.FC<TaskQAPanelProps> = ({ 
  task, 
  currentUser, 
  onAskQuestion, 
  onAnswerQuestion,
  isOpen,
  isExpanded: externalExpanded,
  onToggle
}) => {
  // Fallback to internal state if not controlled externally, though in this app we control it externally
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggle = onToggle || (() => setInternalExpanded(!internalExpanded));

  const [questionText, setQuestionText] = useState('');
  const [replyText, setReplyText] = useState<{[key: string]: string}>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when opening or new message
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isExpanded, task.questions?.length]);

  if (!isOpen) return null;

  const isRequester = currentUser?.id === task.requesterId;
  const questionsCount = task.questions?.length || 0;

  // Privacy Filter Function
  const sanitizeText = (text: string): string => {
     let clean = text.replace(/\b(?:0|\+359)(?:\s*\d){8,10}\b/g, ' [СКРИТ ТЕЛЕФОН] ');
     clean = clean.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi, ' [СКРИТ ИМЕЙЛ] ');
     clean = clean.replace(/\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)\b/gi, ' [СКРИТ ЛИНК] ');
     return clean;
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    const safeText = sanitizeText(questionText);
    onAskQuestion(task.id, safeText);
    setQuestionText('');
  };

  const handleAnswer = (questionId: string) => {
     const text = replyText[questionId];
     if (!text?.trim()) return;

     const safeText = sanitizeText(text);
     onAnswerQuestion(task.id, questionId, safeText);
     
     setReplyText(prev => ({...prev, [questionId]: ''}));
     setActiveReplyId(null);
  };

  return (
    <div className="fixed left-4 bottom-24 z-[60] flex flex-col items-start gap-4 pointer-events-none">
       
       {/* THE EXPANDED PANEL */}
       {isExpanded && (
         <div className="bg-white w-[calc(100vw-32px)] md:w-[380px] max-h-[65vh] rounded-[32px] shadow-2xl border border-white/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto origin-bottom-left ring-1 ring-black/5 font-sans">
            
            {/* iOS Style Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 p-4 flex justify-between items-center shrink-0 sticky top-0 z-10">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Дискусия</span>
                  <h3 className="font-bold text-slate-900 text-sm">
                     {task.title}
                  </h3>
               </div>
               <button 
                  onClick={handleToggle}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
               >
                  <ChevronDown size={18} />
               </button>
            </div>

            {/* Questions List - iOS Bubbles */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-white scrollbar-thin">
               {questionsCount === 0 && (
                  <div className="text-center py-12 opacity-60">
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle size={28} className="text-slate-300" />
                     </div>
                     <p className="text-sm font-bold text-slate-400">Няма зададени въпроси.</p>
                  </div>
               )}

               {task.questions?.map((q) => (
                  <div key={q.id} className="flex flex-col gap-1">
                     
                     {/* QUESTION BUBBLE (Gray, Left) */}
                     <div className="flex flex-col items-start max-w-[90%] self-start group">
                        <div className="ml-4 mb-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="text-[10px] font-bold text-slate-400">{q.userName}</span>
                            <span className="text-[10px] text-slate-300">{new Date(q.createdAt).toLocaleDateString('bg-BG')}</span>
                        </div>
                        <div className="bg-[#E9E9EB] text-slate-900 px-5 py-3 rounded-[22px] rounded-tl-[4px] text-[14px] leading-snug relative tracking-tight">
                           {q.text}
                        </div>
                     </div>

                     {/* ANSWER BUBBLE (Blue, Right) */}
                     {q.answer ? (
                        <div className="flex flex-col items-end max-w-[90%] self-end animate-in slide-in-from-bottom-1 mt-1 group">
                           <div className="bg-[#007AFF] text-white px-5 py-3 rounded-[22px] rounded-tr-[4px] text-[14px] leading-snug shadow-sm relative tracking-tight bg-gradient-to-b from-[#007AFF] to-[#0062cc]">
                              {q.answer}
                           </div>
                           <div className="mr-3 mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <CheckCircle size={10} className="text-blue-500" />
                              <span>Отговорено</span>
                           </div>
                        </div>
                     ) : (
                        /* Reply Action for Requester */
                        isRequester && (
                           <div className="self-end max-w-[90%] mt-1 flex flex-col items-end w-full">
                              {activeReplyId === q.id ? (
                                 <div className="bg-slate-50 p-2 rounded-[20px] border border-slate-200 w-full animate-in fade-in">
                                    <textarea 
                                       className="w-full text-sm bg-white border border-slate-200 p-3 rounded-2xl outline-none resize-none mb-2 focus:border-blue-500 transition-colors"
                                       placeholder="Напишете отговор..."
                                       rows={2}
                                       value={replyText[q.id] || ''}
                                       onChange={(e) => setReplyText({...replyText, [q.id]: e.target.value})}
                                       autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                       <button 
                                          onClick={() => setActiveReplyId(null)} 
                                          className="text-xs font-bold text-slate-500 px-3 py-1.5 hover:bg-slate-200 rounded-full transition-colors"
                                       >
                                          Отказ
                                       </button>
                                       <button 
                                          onClick={() => handleAnswer(q.id)} 
                                          className="text-xs font-bold bg-[#007AFF] text-white px-4 py-1.5 rounded-full hover:bg-blue-600 transition-colors"
                                       >
                                          Изпрати
                                       </button>
                                    </div>
                                 </div>
                              ) : (
                                 <button 
                                    onClick={() => setActiveReplyId(q.id)}
                                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 py-1.5 px-3 rounded-full transition-colors"
                                 >
                                    <CornerDownRight size={14} />
                                    Отговори
                                 </button>
                              )}
                           </div>
                        )
                     )}

                  </div>
               ))}
            </div>

            {/* Ask Input Area - iMessage Style */}
            {!isRequester && (
               <div className="p-3 bg-slate-50/80 backdrop-blur-md border-t border-slate-200 shrink-0">
                  {currentUser ? (
                     <form onSubmit={handleAsk} className="flex items-end gap-2">
                        <div className="relative flex-1">
                            <input 
                               type="text"
                               value={questionText}
                               onChange={(e) => setQuestionText(e.target.value)}
                               placeholder="iMessage"
                               className="w-full bg-white border border-slate-300 rounded-[20px] pl-4 pr-4 py-2.5 text-sm font-medium focus:border-[#007AFF] outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <button 
                           type="submit"
                           disabled={!questionText.trim()}
                           className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                               questionText.trim() 
                               ? 'bg-[#007AFF] text-white shadow-md hover:scale-105' 
                               : 'bg-slate-300 text-white cursor-not-allowed'
                           }`}
                        >
                           <Send size={16} className={questionText.trim() ? 'ml-0.5' : ''} />
                        </button>
                     </form>
                  ) : (
                     <div className="text-center py-2">
                        <p className="text-xs font-medium text-slate-400">Влезте, за да попитате</p>
                     </div>
                  )}
                  <div className="flex justify-center mt-2">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                          <ShieldAlert size={10} />
                          <span>Личните данни се скриват</span>
                      </div>
                  </div>
               </div>
            )}
         </div>
       )}

       {/* TOGGLE BUTTON */}
       <button 
          onClick={handleToggle}
          className="group pointer-events-auto relative bg-white hover:bg-slate-50 text-slate-900 p-0 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center w-14 h-14 border-4 border-white"
       >
          {isExpanded ? (
             <X size={24} className="text-slate-500" />
          ) : (
             <>
                <MessageCircle size={26} className="text-[#007AFF]" fill="currentColor" fillOpacity={0.1} />
                {questionsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                    {questionsCount}
                    </span>
                )}
             </>
          )}
       </button>
    </div>
  );
};
