
import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Phone, Sparkles, Building2, Calendar, CheckSquare, Square, ChevronRight, Camera, Zap, ShieldCheck, Coins } from 'lucide-react';
import { loginUser, registerUserWithPassword, loginWithGoogle, updateUserProfile, resetPassword } from '../services/authService';
import { AppUser } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES_LIST } from '../constants';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  onOpenLegal?: (section: 'TERMS' | 'PRIVACY') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, onOpenLegal }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'PHONE_REQUIRED'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingGoogleUser, setPendingGoogleUser] = useState<AppUser | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Registration Specifics
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Company Registration State
  const [isCompanyLocal, setIsCompanyLocal] = useState(false);
  const [companyCategory, setCompanyCategory] = useState('');
  const [companyFoundedDate, setCompanyFoundedDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'REGISTER' && !agreedToTerms) {
        setError('Моля, съгласете се с Общите условия, за да продължите.');
        return;
    }

    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        const user = await loginUser(email, password);
        if (user) {
          onLoginSuccess(user);
        } else {
          setError('Грешен имейл или парола.');
        }
      } else if (mode === 'REGISTER') {
        const user = await registerUserWithPassword(
          name, 
          email, 
          phoneNumber, 
          password,
          isCompanyLocal,
          companyCategory,
          companyFoundedDate
        );
        onLoginSuccess(user);
      } else if (mode === 'PHONE_REQUIRED' && pendingGoogleUser) {
        if (!phoneNumber.trim() || phoneNumber.length < 6) {
            setError('Моля въведете валиден телефонен номер.');
            setIsLoading(false);
            return;
        }
        await updateUserProfile(pendingGoogleUser.id, { phoneNumber: phoneNumber });
        const updatedUser = { ...pendingGoogleUser, phoneNumber: phoneNumber };
        onLoginSuccess(updatedUser);
      }
    } catch (err: any) {
      const msg = err.message.replace('Firebase: ', '');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      if (!user.phoneNumber) {
          setPendingGoogleUser(user);
          setMode('PHONE_REQUIRED');
          setIsLoading(false);
      } else {
          onLoginSuccess(user);
          setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const isPhoneReq = mode === 'PHONE_REQUIRED';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4 bg-slate-950/60 backdrop-blur-sm">
      
      {/* Backdrop for mobile closes modal */}
      <div 
        className="absolute inset-0 z-0" 
        onClick={() => { if(!isPhoneReq) onClose(); }}
      ></div>

      <div className="relative w-full h-[100dvh] md:h-auto md:max-w-[900px] md:max-h-[90vh] bg-white md:rounded-[32px] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/10 z-10">
        
        {/* Left Side - Artistic / Branding */}
        <div className="hidden md:flex w-5/12 bg-[#0F172A] relative flex-col justify-between p-10 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-indigo-500/20 rounded-full blur-[80px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            
            <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/50">
                    <span className="font-black text-2xl text-white">N</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight leading-tight">
                    {mode === 'LOGIN' ? 'Добре дошли отново.' : 'Започнете своето пътешествие.'}
                </h2>
                <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-[240px]">
                    {mode === 'LOGIN' 
                        ? 'Влезте, за да управлявате своите задачи и оферти.'
                        : 'Намерете правилния човек за всяка задача или предложете услугите си.'
                    }
                </p>
            </div>

            {/* VALUE PROPOSITION LIST (Visible mainly on Register) */}
            {mode === 'REGISTER' && (
                <div className="relative z-10 flex-1 flex flex-col justify-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    {/* Item 1 */}
                    <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-blue-500/20 transition-all">
                            <Camera size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Снимай и Готово</h4>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1 font-medium">
                                Нашият AI анализира снимката и пише обявата вместо теб за секунди.
                            </p>
                        </div>
                    </div>
                    {/* Item 2 */}
                    <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-amber-500/20 transition-all">
                            <Zap size={18} className="text-amber-400 group-hover:scale-110 transition-transform" fill="currentColor" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Мигновени Оферти</h4>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1 font-medium">
                                Получаваш конкурентни цени от проверени майстори и фирми.
                            </p>
                        </div>
                    </div>
                    {/* Item 3 */}
                    <div className="flex gap-4 items-start group">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-emerald-500/20 transition-all">
                            <ShieldCheck size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">100% Сигурност</h4>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1 font-medium">
                                Парите са защитени в Escrow и се освобождават само при свършена работа.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 mt-auto">
                <div className="flex -space-x-3 mb-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-[3px] border-[#0F172A] bg-slate-800 overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=User${i}&background=random`} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-[3px] border-[#0F172A] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                        +2k
                    </div>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Доверете се на общността</p>
            </div>
        </div>

        {/* Right Side - Form (Scroll Container) */}
        <div className="flex-1 bg-white relative h-full overflow-y-auto scrollbar-hide">
            
            {/* Mobile Header Image - Keeps stickyness or normal flow depending on design preference. Here normal flow. */}
            <div className="md:hidden h-40 bg-[#0F172A] relative flex items-end p-6 shrink-0 overflow-hidden min-h-[160px]">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-blue-500/20 rounded-full blur-[50px]"></div>
                <div className="absolute top-4 left-4">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                        <span className="font-black text-xl text-white">N</span>
                    </div>
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white tracking-tight">Needo</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Service Platform</p>
                </div>
                {!isPhoneReq && (
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 w-8 h-8 bg-white/10 backdrop-blur-md text-white rounded-full flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {!isPhoneReq && (
                <button 
                    onClick={onClose} 
                    className="hidden md:flex absolute top-6 right-6 z-20 w-8 h-8 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full items-center justify-center transition-all"
                >
                    <X size={20} />
                </button>
            )}

            {/* Layout Wrapper */}
            {/* Mobile: Standard Block Flow (p-6). Desktop: Flex Center (md:flex-col md:justify-center md:min-h-full). */}
            <div className="p-6 md:p-12 pb-32 w-full md:min-h-full md:flex md:flex-col md:justify-center">
                <div className="w-full max-w-md mx-auto">
                    
                    <div className="mb-8 hidden md:block">
                        <h2 className="text-2xl font-black text-slate-900 mb-1">
                            {isPhoneReq 
                                ? t('auth_phone_req') 
                                : (mode === 'LOGIN' ? t('auth_welcome') : t('auth_register_tab'))}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">
                            {isPhoneReq 
                                ? t('auth_phone_subtitle') 
                                : (mode === 'LOGIN' ? t('auth_subtitle') : t('auth_subtitle_reg'))}
                        </p>
                    </div>

                    {/* Tab Switcher (Modern) */}
                    {!isPhoneReq && (
                        <div className="bg-slate-100 p-1 rounded-xl mb-8 flex relative shrink-0">
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-[10px] shadow-sm transition-all duration-300 ease-out ${mode === 'REGISTER' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                            ></div>
                            <button 
                                type="button"
                                onClick={() => { setMode('LOGIN'); setError(''); }}
                                className={`flex-1 py-2.5 relative z-10 text-xs font-bold text-center transition-colors uppercase tracking-wider ${mode === 'LOGIN' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('auth_login_tab')}
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setMode('REGISTER'); setError(''); }}
                                className={`flex-1 py-2.5 relative z-10 text-xs font-bold text-center transition-colors uppercase tracking-wider ${mode === 'REGISTER' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {t('auth_register_tab')}
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {mode === 'REGISTER' && (
                            <>
                                <div className="animate-in slide-in-from-right fade-in duration-300">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{t('auth_name_ph')}</label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            <UserIcon size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            required 
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 text-sm"
                                            placeholder="Иван Иванов"
                                        />
                                    </div>
                                </div>

                                {/* COMPANY TOGGLE MODERN */}
                                <div className="border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                                    <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white rounded-lg transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isCompanyLocal ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                            {isCompanyLocal && <CheckSquare size={14} className="text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isCompanyLocal}
                                            onChange={e => setIsCompanyLocal(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} className={isCompanyLocal ? 'text-blue-600' : 'text-slate-400'} />
                                                <span className={`text-sm font-bold ${isCompanyLocal ? 'text-slate-900' : 'text-slate-500'}`}>Регистрация като фирма</span>
                                            </div>
                                        </div>
                                    </label>

                                    {isCompanyLocal && (
                                        <div className="p-3 pt-0 mt-2 space-y-3 animate-in slide-in-from-top-2 duration-300 border-t border-slate-100">
                                            <div className="mt-3">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Категория</label>
                                                <div className="relative">
                                                    <Sparkles size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <select 
                                                        required={isCompanyLocal}
                                                        value={companyCategory}
                                                        onChange={e => setCompanyCategory(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-sm font-bold text-slate-800 appearance-none"
                                                    >
                                                        <option value="">Избери категория...</option>
                                                        {CATEGORIES_LIST.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={14} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Дата на създаване</label>
                                                <div className="relative">
                                                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <input 
                                                        type="date" 
                                                        required={isCompanyLocal}
                                                        value={companyFoundedDate}
                                                        onChange={e => setCompanyFoundedDate(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-sm font-bold text-slate-800"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {!isPhoneReq && (
                            <>
                                {mode === 'REGISTER' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{t('auth_phone_ph')}</label>
                                        <div className="relative group">
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <Phone size={18} />
                                            </div>
                                            <input 
                                                type="tel" 
                                                required 
                                                value={phoneNumber}
                                                onChange={e => setPhoneNumber(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 text-sm"
                                                placeholder="0888 123 456"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{t('auth_email_ph')}</label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input 
                                            type="email" 
                                            required 
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 text-sm"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{mode === 'REGISTER' ? t('auth_pass_min') : t('auth_pass_ph')}</label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input 
                                            type="password" 
                                            required 
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 text-sm"
                                            placeholder="••••••••"
                                            minLength={6}
                                        />
                                    </div>
                                    {mode === 'LOGIN' && (
                                        <div className="flex justify-end mt-1.5">
                                            <button 
                                                type="button"
                                                onClick={async () => {
                                                    if (!email) {
                                                        setError('Моля, въведете вашия имейл първо.');
                                                        return;
                                                    }
                                                    setIsLoading(true);
                                                    try {
                                                        await resetPassword(email);
                                                        setResetSent(true);
                                                        setError('');
                                                    } catch (err: any) {
                                                        setError('Грешка при изпращане. Проверете имейла.');
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                            >
                                                {resetSent ? 'Имейлът е изпратен!' : 'Забравена парола?'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {isPhoneReq && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 h-fit">
                                        <Phone size={18} />
                                    </div>
                                    <div className="text-xs text-blue-900 leading-relaxed">
                                        <p className="font-bold mb-1">Почти готово!</p>
                                        {t('auth_phone_missing_google')}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{t('auth_phone_ph')}</label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            type="tel" 
                                            required 
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-slate-800 text-sm"
                                            placeholder="0888 123 456"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MANDATORY TERMS CHECKBOX (REGISTER ONLY) */}
                        {mode === 'REGISTER' && (
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in mt-2 hover:border-blue-200 transition-colors group cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                                <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all duration-200 ${
                                        agreedToTerms 
                                        ? 'bg-blue-600 border-blue-600 text-white' 
                                        : 'bg-white border-slate-300 text-transparent group-hover:border-blue-400'
                                    }`}>
                                    <CheckSquare size={14} fill="currentColor" strokeWidth={3} />
                                </div>
                                <div className="text-xs text-slate-500 leading-snug select-none">
                                    С регистрацията си декларирам, че съм запознат и приемам 
                                    <span onClick={(e) => { e.stopPropagation(); onOpenLegal?.('TERMS'); }} className="text-blue-600 font-bold hover:underline mx-1 cursor-pointer">
                                        Общите условия
                                    </span> 
                                    и
                                    <span onClick={(e) => { e.stopPropagation(); onOpenLegal?.('PRIVACY'); }} className="text-blue-600 font-bold hover:underline mx-1 cursor-pointer">
                                        Политиката за поверителност
                                    </span> 
                                    на Needo.
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-3 text-red-600 text-xs font-bold bg-red-50 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 border border-red-100">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-lg">!</span>
                                </div>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading || (mode === 'REGISTER' && !agreedToTerms)}
                            className={`w-full py-4 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 group mt-6 shrink-0 transition-all duration-300 transform active:scale-[0.98] ${
                                (mode === 'REGISTER' && !agreedToTerms)
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl'
                            }`}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                {mode === 'LOGIN' && t('auth_login_action')}
                                {mode === 'REGISTER' && t('auth_register_action')}
                                {mode === 'PHONE_REQUIRED' && t('auth_save_action')}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {!isPhoneReq && (
                        <div className="mt-6">
                            <div className="flex items-center gap-3 my-6">
                                <div className="h-px bg-slate-100 flex-1"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('auth_or_email')}</span>
                                <div className="h-px bg-slate-100 flex-1"></div>
                            </div>

                            <button 
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] group shadow-sm shrink-0"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="text-sm font-bold text-slate-700">{t('auth_google_btn')}</span>
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};
