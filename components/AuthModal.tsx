
import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Phone, CheckCircle2 } from 'lucide-react';
import { loginUser, registerUserWithPassword, loginWithGoogle, updateUserProfile } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'PHONE_REQUIRED'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        const user = await registerUserWithPassword(name, email, phoneNumber, password);
        onLoginSuccess(user);
      } else if (mode === 'PHONE_REQUIRED' && pendingGoogleUser) {
        // Update user with phone number
        if (!phoneNumber.trim() || phoneNumber.length < 6) {
            setError('Моля въведете валиден телефонен номер.');
            setIsLoading(false);
            return;
        }
        await updateUserProfile(pendingGoogleUser.id, { phoneNumber: phoneNumber });
        // Update local object
        const updatedUser = { ...pendingGoogleUser, phoneNumber: phoneNumber };
        onLoginSuccess(updatedUser);
      }
    } catch (err: any) {
      // Strip firebase codes for cleaner UI
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
      
      // Check if phone number is missing
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={() => { if(mode !== 'PHONE_REQUIRED') onClose(); }}
      ></div>

      {/* Main Card */}
      <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/20">
        
        {/* Decorative Header Background */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           
           {/* Abstract Shapes */}
           <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
           <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-blue-400/20 rounded-full blur-xl"></div>
        </div>

        {/* Close Button (Hidden if forcing phone number) */}
        {mode !== 'PHONE_REQUIRED' && (
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/10 hover:bg-black/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            >
                <X size={18} />
            </button>
        )}

        {/* Content */}
        <div className="relative z-10 pt-12 px-8 pb-8">
            
            {/* Logo & Welcome */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 transform rotate-3">
                    <span className="font-black text-3xl bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent italic">N</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                    {mode === 'PHONE_REQUIRED' ? 'Още една стъпка' : 'Добре дошли в Needo'}
                </h2>
                <p className="text-blue-100 text-sm font-medium mt-1 opacity-90">
                    {mode === 'PHONE_REQUIRED' ? 'Нужен е телефон за връзка' : 'Твоят портал за услуги'}
                </p>
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-3xl shadow-xl p-2">
                
                {/* Toggle Switcher (Hidden for Phone Req) */}
                {mode !== 'PHONE_REQUIRED' && (
                    <div className="flex p-1 bg-slate-100 rounded-2xl mb-4 relative">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${mode === 'REGISTER' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                        ></div>
                        <button 
                            type="button"
                            onClick={() => { setMode('LOGIN'); setError(''); }}
                            className={`flex-1 py-2.5 relative z-10 text-sm font-bold text-center transition-colors ${mode === 'LOGIN' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Вход
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setMode('REGISTER'); setError(''); }}
                            className={`flex-1 py-2.5 relative z-10 text-sm font-bold text-center transition-colors ${mode === 'REGISTER' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Регистрация
                        </button>
                    </div>
                )}

                <div className="px-4 pb-4">
                    
                    {/* Google Button (Hidden for Phone Req) */}
                    {mode !== 'PHONE_REQUIRED' && (
                        <button 
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full py-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all hover:shadow-md active:scale-[0.98] mb-4 group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">Вход с Google</span>
                        </button>
                    )}

                    {mode !== 'PHONE_REQUIRED' && (
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ИЛИ С ИМЕЙЛ</span>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Register Fields */}
                        {mode === 'REGISTER' && (
                            <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
                                <div className="group relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input 
                                        type="text" 
                                        required 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                        placeholder="Вашето име"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Common Fields (Hidden in PHONE_REQUIRED) */}
                        {mode !== 'PHONE_REQUIRED' && (
                            <>
                                {mode === 'REGISTER' && (
                                    <div className="group relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                        <input 
                                            type="tel" 
                                            required 
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                            placeholder="Телефон за връзка"
                                        />
                                    </div>
                                )}
                                <div className="group relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                        placeholder="Имейл адрес"
                                    />
                                </div>

                                <div className="group relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input 
                                        type="password" 
                                        required 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                        placeholder={mode === 'REGISTER' ? 'Парола (мин. 6 символа)' : 'Парола'}
                                        minLength={6}
                                    />
                                </div>
                            </>
                        )}

                        {/* Phone Required Specific Field */}
                        {mode === 'PHONE_REQUIRED' && (
                            <div className="space-y-2 animate-in fade-in">
                                <p className="text-xs text-slate-500 text-center mb-4">
                                    Google не предостави телефонен номер. Моля, въведете го ръчно, за да могат потребителите да се свързват с вас при активни задачи.
                                </p>
                                <div className="group relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input 
                                        type="tel" 
                                        required 
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                        placeholder="0888 123 456"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group mt-4 active:scale-[0.98]"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                {mode === 'LOGIN' && 'Влез в профила'}
                                {mode === 'REGISTER' && 'Създай акаунт'}
                                {mode === 'PHONE_REQUIRED' && 'Запази и Влез'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer Info */}
            {mode !== 'PHONE_REQUIRED' && (
                <div className="text-center mt-6">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                        С натискането на бутона се съгласявате с нашите <span className="text-slate-600 underline cursor-pointer hover:text-blue-600">Общи условия</span> и <span className="text-slate-600 underline cursor-pointer hover:text-blue-600">Политика за поверителност</span>.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
