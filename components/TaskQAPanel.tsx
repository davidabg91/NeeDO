
import React, { useState, useRef, useEffect } from 'react';
import { Task, AppUser } from '../types';
import { Send, ShieldCheck, ChevronDown, CheckCircle, X, HelpCircle, FileText, FileQuestion, Calendar, AlertCircle } from 'lucide-react';

interface TaskQAPanelProps {
  task: Task;
  currentUser: AppUser | null;
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
  // Fallback to internal state if not controlled externally
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
    // Z-INDEX UPDATE: Changed from z-[120] to z-[210] to appear ABOVE the TaskSidebar (z-200) and its backdrop (z-190).
    <div className="fixed left-4 bottom-24 z-[210] flex flex-col items-start gap-4 pointer-events-none">
       
       {/* THE EXPANDED PANEL (OFFICIAL FORM STYLE) */}
       {isExpanded && (
         <div className="bg-slate-50 w-[calc(100vw-32px)] md:w-[420px] max-h-[75vh] rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto origin-bottom-left font-sans ring-1 ring-black/5">
            
            {/* Header - Formal Style */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex justify-between items-center shrink-0 sticky top-0 z-10">
               <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-white p-2 rounded-lg shadow-md">
                      <FileQuestion size={18} />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-none uppercase tracking-wide">Запитвания</h3>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">Официална кореспонденция</p>
                  </div>
               </div>
               <button 
                  onClick={handleToggle}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
               >
                  <ChevronDown size={18} />
               </button>
            </div>

            {/* Content List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#F8FAFC] scrollbar-thin">
               {questionsCount === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 opacity-60 text-center border-2 border-dashed border-slate-200 rounded-2xl m-2">
                     <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <HelpCircle size={24} className="text-slate-300" />
                     </div>
                     <p className="text-sm font-bold text-slate-600">Няма активни запитвания</p>
                     <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Използвайте формата по-долу за официални въпроси към възложителя.</p>
                  </div>
               )}

               {task.questions?.map((q, idx) => (
                  <div key={q.id} className="group animate-in fade-in duration-300">
                     
                     {/* TICKET CARD STYLE */}
                     <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        
                        {/* Ticket Header */}
                        <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Запитване #{idx + 1}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-[10px] font-bold text-slate-600">{q.userName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(q.createdAt).toLocaleDateString('bg-BG')}
                            </span>
                        </div>

                        {/* Question Body */}
                        <div className="p-4 text-sm text-slate-800 font-medium leading-relaxed">
                            {q.text}
                        </div>

                        {/* STATUS BAR or ANSWER */}
                        {q.answer ? (
                            <div className="bg-blue-50/30 border-t border-blue-100 p-4 relative">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                <div className="flex gap-3">
                                    <div className="shrink-0 mt-0.5">
                                        <ShieldCheck size={18} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                                            Официален отговор
                                            <CheckCircle size={10} />
                                        </p>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {q.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Pending State */
                            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Очаква отговор
                                </span>
                                
                                {/* REQUESTER REPLY BUTTON */}
                                {isRequester && (
                                    <button 
                                        onClick={() => setActiveReplyId(activeReplyId === q.id ? null : q.id)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        {activeReplyId === q.id ? 'Отказ' : 'Отговори'}
                                    </button>
                                )}
                            </div>
                        )}
                     </div>

                     {/* INLINE REPLY FORM (If active) */}
                     {isRequester && activeReplyId === q.id && !q.answer && (
                         <div className="mt-2 ml-4 relative animate-in slide-in-from-top-2">
                             <div className="absolute top-[-10px] left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white z-10"></div>
                             <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-md ring-2 ring-blue-50">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Вашият Отговор</h5>
                                <textarea 
                                    className="w-full text-sm bg-slate-50 border border-slate-200 p-3 rounded-lg outline-none resize-none mb-3 focus:border-blue-400 focus:bg-white transition-all"
                                    placeholder="Напишете официален отговор..."
                                    rows={3}
                                    value={replyText[q.id] || ''}
                                    onChange={(e) => setReplyText({...replyText, [q.id]: e.target.value})}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleAnswer(q.id)} 
                                        className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        Публикувай <Send size={12} />
                                    </button>
                                </div>
                             </div>
                         </div>
                     )}

                  </div>
               ))}
            </div>

            {/* FORM INPUT AREA (Official Style) */}
            {!isRequester && (
               <div className="p-5 bg-white border-t border-slate-200 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                  {currentUser ? (
                     <form onSubmit={handleAsk} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-1.5">
                                <FileText size={12} className="text-blue-500" />
                                Нова заявка
                            </label>
                            <span className="text-[9px] text-slate-400">Публично видима</span>
                        </div>
                        
                        <div className="relative">
                            <textarea 
                               value={questionText}
                               onChange={(e) => setQuestionText(e.target.value)}
                               placeholder="Опишете вашето запитване детайлно..."
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 resize-none"
                               rows={2}
                            />
                        </div>
                        
                        <button 
                           type="submit"
                           disabled={!questionText.trim()}
                           className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-md ${
                               questionText.trim() 
                               ? 'bg-slate-900 text-white hover:bg-blue-600 transform active:scale-[0.98]' 
                               : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                           }`}
                        >
                           <Send size={16} /> Изпрати Запитване
                        </button>
                     </form>
                  ) : (
                     <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-500">Влезте в профила си, за да зададете въпрос</p>
                     </div>
                  )}
               </div>
            )}
         </div>
       )}
    </div>
  );
};
