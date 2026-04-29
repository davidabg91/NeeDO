
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ShieldCheck, Scale, CreditCard, Users, FileText, Lock, Info, Zap, Camera, CheckCircle2, AlertTriangle, ArrowRight, Wallet, Receipt, Building2, User, Briefcase, Gift, Percent, Phone, Mail, MapPin, Globe, Search, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LegalInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSection?: 'ABOUT' | 'TERMS' | 'PAYMENTS' | 'PRIVACY';
}

type Section = 'ABOUT' | 'TERMS' | 'PAYMENTS' | 'PRIVACY';

export const LegalInfoModal: React.FC<LegalInfoModalProps> = ({ isOpen, onClose, initialSection = 'ABOUT' }) => {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState<Section>(initialSection);

    // State for "How it Works" toggle
    const [viewRole, setViewRole] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');

    useEffect(() => {
        if (isOpen) {
            setActiveSection(initialSection);
        }
    }, [isOpen, initialSection]);

    if (!isOpen) return null;

    const renderContent = () => {
        switch (activeSection) {
            case 'ABOUT':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                        {/* Hero Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                <div className="w-24 h-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                                    <img src="about_logo.jpg" alt="Needo Hero Logo" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black mb-3">{t('legal_about_title')}</h2>
                                    <p className="text-blue-100 text-sm leading-relaxed max-w-lg font-medium">
                                        {t('legal_about_desc')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- NEW: HOW IT WORKS (TOP POSITION) --- */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={16} /> Как работи Needo
                                </h3>

                                {/* Role Toggle */}
                                <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
                                    <button
                                        onClick={() => setViewRole('CLIENT')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewRole === 'CLIENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        За Клиенти
                                    </button>
                                    <button
                                        onClick={() => setViewRole('PROVIDER')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewRole === 'PROVIDER' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        За Изпълнители
                                    </button>
                                </div>
                            </div>

                            {/* HOW IT WORKS CONTENT */}
                            <div className="relative min-h-[300px]">
                                {viewRole === 'CLIENT' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <StepCard
                                            number="01"
                                            icon={<Camera size={24} className="text-white" />}
                                            title="Снимай проблема"
                                            desc="Няма нужда да си експерт. Просто направи снимка и нашият AI асистент ще опише задачата професионално вместо теб."
                                            color="bg-blue-600"
                                        />
                                        <StepCard
                                            number="02"
                                            icon={<Users size={24} className="text-white" />}
                                            title="Получи оферти"
                                            desc="Майсторите се състезават за твоята задача. Сравни цени, срокове и рейтинги, за да избереш най-добрия."
                                            color="bg-blue-500"
                                        />
                                        <StepCard
                                            number="03"
                                            icon={<ShieldCheck size={24} className="text-white" />}
                                            title="Плати сигурно"
                                            desc="Депозирай парите в защитена сметка (Escrow). Те се освобождават към изпълнителя само когато потвърдиш, че работата е свършена."
                                            color="bg-slate-800"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <StepCard
                                            number="01"
                                            icon={<Search size={24} className="text-white" />}
                                            title="Намери задачи"
                                            desc="Разглеждай картата или списъка с нови задачи в реално време. Филтрирай по категория и локация, които ти пасват."
                                            color="bg-emerald-600"
                                        />
                                        <StepCard
                                            number="02"
                                            icon={<Zap size={24} className="text-white" />}
                                            title="Кандидатствай"
                                            desc="Изпрати своята оферта с цена и срок. Използвай чата, за да договориш детайлите директно с клиента."
                                            color="bg-emerald-500"
                                        />
                                        <StepCard
                                            number="03"
                                            icon={<Wallet size={24} className="text-white" />}
                                            title="Вземи парите"
                                            desc="Работи спокойно. Сумата е гарантирана в Escrow преди старта. Получаваш парите веднага след одобрение на работата."
                                            color="bg-slate-800"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-slate-200 my-8"></div>

                        {/* MANDATORY LEGAL IDENTIFICATION (IMPRESSUM) */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <Building2 size={14} /> Юридическа Информация (Impressum)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm text-slate-700">
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Доставчик на услугата</span>
                                    <strong className="block text-slate-900">"ДАВИДА БГ" ЕООД</strong>
                                </div>

                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">ЕИК / БУЛСТАТ</span>
                                    <span className="font-mono bg-slate-200 px-1 rounded text-xs">204356138</span>
                                </div>

                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Седалище и адрес на управление</span>
                                    <div className="flex items-start gap-1.5 mt-0.5">
                                        <MapPin size={14} className="shrink-0 mt-0.5 text-slate-400" />
                                        <span>гр. Плевен 5802, жк. Сторгозия, ул. Цар Самуил, паркинг бл. 34А</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Данъчна регистрация (ДДС)</span>
                                    <span className="font-mono text-slate-600 text-xs">Нерегистрирана по ЗДДС</span>
                                </div>

                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">МОЛ (Управител)</span>
                                    <span>Дейвид Василев Димитров</span>
                                </div>

                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Контакти</span>
                                    <div className="flex flex-col gap-1 mt-1 text-xs">
                                        <a href="mailto:support@needo.bg" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"><Mail size={12} /> support@needo.bg</a>
                                        <a href="tel:+359888123456" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"><Phone size={12} /> +359 888 123 456</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MANDATORY SUPERVISORY BODIES */}
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                                <Scale size={14} /> Надзорни Органи
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* KZP */}
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-slate-900 text-xs mb-2">Комисия за защита на потребителите (КЗП)</h4>
                                    <div className="text-[10px] text-slate-500 space-y-1">
                                        <p>Адрес: гр. София, пл. "Славейков" №4А</p>
                                        <p>Тел: 0700 111 22</p>
                                        <a href="https://kzp.bg" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            kzp.bg <ExternalLinkIcon />
                                        </a>
                                    </div>
                                </div>

                                {/* KZLD */}
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-slate-900 text-xs mb-2">Комисия за защита на личните данни (КЗЛД)</h4>
                                    <div className="text-[10px] text-slate-500 space-y-1">
                                        <p>Адрес: гр. София, бул. "Проф. Цветан Лазаров" №2</p>
                                        <p>Email: kzld@cpdp.bg</p>
                                        <a href="https://cpdp.bg" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            cpdp.bg <ExternalLinkIcon />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EU ODR LINK */}
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                            <Globe size={20} className="text-blue-600 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-blue-900 text-xs">Онлайн решаване на спорове (ОРС)</h4>
                                <p className="text-[10px] text-blue-800/80 leading-relaxed mb-2">
                                    Платформа на ЕС за извънсъдебно решаване на спорове, възникнали във връзка с договори за онлайн продажби или услуги.
                                </p>
                                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg inline-block hover:bg-blue-700 transition-colors">
                                    Към платформата на ЕС
                                </a>
                            </div>
                        </div>
                    </div>
                );

            case 'TERMS':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-900 rounded-xl text-white">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{t('auth_terms')}</h2>
                                <p className="text-xs text-slate-500 font-medium">Последна актуализация: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* PLATFORM ROLE DISCLAIMER - EXPANDED */}
                        <div className="bg-slate-100 border-l-4 border-slate-900 p-4 rounded-r-xl">
                            <h4 className="font-bold text-slate-900 text-sm mb-2">I. Статус на посредник (Venue)</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                "ДАВИДА БГ" ЕООД предоставя платформа за свързване на потребители. Ние действаме единствено като доставчик на услуга на информационното общество по смисъла на Закона за електронната търговия.
                                <br /><br />
                                Needo <strong>не е страна по договорите за услуги</strong>, сключвани между потребителите. Ние не наемаме изпълнителите и не носим отговорност за техните действия или бездействия.
                            </p>
                        </div>

                        {/* LIMITATION OF LIABILITY */}
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                            <h4 className="font-bold text-red-900 text-sm mb-2 flex items-center gap-2">
                                <AlertTriangle size={16} /> II. Ограничаване на отговорността
                            </h4>
                            <p className="text-xs text-red-800 leading-relaxed mb-2">
                                С приемането на тези условия Вие се съгласявате, че Needo <strong>НЕ носи отговорност</strong> за:
                            </p>
                            <ul className="text-xs text-red-800 list-disc list-inside space-y-1 pl-1">
                                <li>Качеството, безопасността или законността на предлаганите услуги.</li>
                                <li>Истинността или точността на обявите и профилите на потребителите.</li>
                                <li>Вреди, пропуснати ползи или наранявания, възникнали в следствие на използването на услуги, намерени чрез платформата.</li>
                                <li>Всякакви спорове между Възложител и Изпълнител.</li>
                            </ul>
                            <p className="text-[10px] text-red-800/70 mt-3 font-medium">
                                Вие използвате услугите на трети лица изцяло на свой собствен риск. Needo не извършва проверки за съдимост на потребителите.
                            </p>
                        </div>

                        {/* IMPORTANT TAX & LEGAL SECTION */}
                        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Receipt size={120} className="text-amber-900" />
                            </div>
                            <h3 className="font-black text-amber-900 text-lg mb-4 flex items-center gap-2 relative z-10">
                                <Scale size={20} /> Данъчна и Счетоводна Отговорност
                            </h3>

                            <p className="text-xs text-amber-900/80 mb-6 font-medium leading-relaxed relative z-10">
                                Отговорността за документиране на приходите е Ваша. Needo издава фактура само за своята комисионна.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                {/* For Companies */}
                                <div className="bg-white/60 p-4 rounded-2xl border border-amber-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 size={16} className="text-amber-700" />
                                        <h4 className="font-bold text-amber-900 text-sm">За Фирми (Юридически лица)</h4>
                                    </div>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        Ако сте регистрирани като фирма в Needo, вие сте <strong>длъжни да издадете данъчен документ</strong> (касова бележка или фактура) на клиента за пълната стойност на извършената услуга.
                                    </p>
                                </div>

                                {/* For Individuals */}
                                <div className="bg-white/60 p-4 rounded-2xl border border-amber-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User size={16} className="text-amber-700" />
                                        <h4 className="font-bold text-amber-900 text-sm">За Частни лица</h4>
                                    </div>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        Доходите, получени през платформата, подлежат на <strong>деклариране пред НАП</strong> (Приложение за доходи от друга стопанска дейност) съгласно ЗДДФЛ.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <TermCard
                                number="01"
                                title="Обезщетение (Indemnification)"
                                icon={<ShieldCheck size={18} />}
                                content="Потребителят се задължава да обезщети Needo за всички вреди, разходи и искове от трети страни, възникнали в резултат на нарушение на тези условия или злоупотреба с платформата от страна на Потребителя."
                            />

                            <TermCard
                                number="02"
                                title="Право на Отказ (14 дни)"
                                icon={<Users size={18} />}
                                content="Съгласно ЗЗП, потребителят има право на отказ от услугата в 14-дневен срок, ОСВЕН АКО услугата вече не е изпълнена напълно с неговото изрично съгласие."
                            />

                            <TermCard
                                number="03"
                                title="Съдържание и Авторски Права"
                                icon={<FileText size={18} />}
                                content="Потребителите декларират, че съдържанието (текст, снимки), което публикуват, не нарушава авторски права или законите на Република България."
                            />

                            <TermCard
                                number="04"
                                title="Забранени Дейности"
                                icon={<Lock size={18} />}
                                content="Забранено е предлагането на незаконни услуги, оръжия, наркотични вещества, хазарт или услуги, изискващи специален лиценз, който изпълнителят не притежава."
                            />

                            <TermCard
                                number="05"
                                title="Такси и Комисионни"
                                icon={<Percent size={18} />}
                                content="Needo работи на принципа на споделената отговорност. Комисионната е в размер на 3% за Възложителя (начислява се при плащане) и 3% за Изпълнителя (удържа се при превод). Всички цени са с включен ДДС, където е приложимо."
                            />
                        </div>
                    </div>
                );

            case 'PAYMENTS':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

                        {/* Main Payment Header */}
                        <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                                <CreditCard size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-emerald-900 mb-2">{t('payment_title')}</h2>
                            <p className="text-sm text-emerald-800/80 max-w-md">
                                Плащанията се обработват от <strong>Stripe Payments Europe, Ltd.</strong> - лицензирана финансова институция. Needo не съхранява данни за вашата карта.
                            </p>
                        </div>

                        {/* The Flow */}
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-5 ml-2">{t('payment_flow_title')}</h3>
                            <div className="relative space-y-4">
                                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100"></div>

                                <PaymentStep
                                    step="1"
                                    title="Депозиране (Escrow)"
                                    desc="Сумата се блокира в защитена сметка при приемане на офертата. Парите не отиват директно при изпълнителя."
                                />
                                <PaymentStep
                                    step="2"
                                    title="Изпълнение на услугата"
                                    desc="Изпълнителят извършва работата. През това време средствата са на сигурно място."
                                />
                                <PaymentStep
                                    step="3"
                                    title="Освобождаване"
                                    desc="Възложителят потвърждава, че работата е свършена, и средствата се превеждат автоматично."
                                />
                            </div>
                        </div>

                        {/* SHARED COMMISSION CARDS */}
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
                                <Scale size={16} /> Комисионна
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Client Side */}
                                <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><User size={64} /></div>
                                    <div>
                                        <h4 className="font-bold text-sm mb-1 text-blue-300">За Клиента</h4>
                                        <p className="text-[10px] text-slate-400 font-medium">Начислява се над сумата при депозит в Escrow.</p>
                                    </div>
                                    <div className="text-right mt-4 relative z-10">
                                        <span className="block text-4xl font-black text-blue-400 drop-shadow-md">3%</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">такса платформа</span>
                                    </div>
                                </div>

                                {/* Provider Side */}
                                <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Briefcase size={64} /></div>
                                    <div>
                                        <h4 className="font-bold text-sm mb-1 text-emerald-300">За Изпълнителя</h4>
                                        <p className="text-[10px] text-slate-400 font-medium">Удържа се автоматично от заработената сума.</p>
                                    </div>
                                    <div className="text-right mt-4 relative z-10">
                                        <span className="block text-4xl font-black text-emerald-400 drop-shadow-md">3%</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">такса платформа</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'PRIVACY':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-900 rounded-xl text-white">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{t('auth_privacy')}</h2>
                                <p className="text-xs text-slate-500 font-medium">В съответствие с GDPR.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-800 text-xs uppercase mb-1">Администратор на лични данни</h4>
                            <p className="text-xs text-slate-600">
                                "ДАВИДА БГ" ЕООД, ЕИК 204356138<br />
                                Адрес: гр. Плевен 5802, жк. Сторгозия, ул. Цар Самуил, паркинг бл. 34А
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PrivacyCard title="Основание за събиране" desc="Изпълнение на договор (общи условия), Законово задължение (счетоводство), Съгласие (маркетинг)." />
                            <PrivacyCard title="Вашите права" desc="Право на достъп, корекция, изтриване ('право да бъдеш забравен'), преносимост." />
                            <PrivacyCard title="Срок на съхранение" desc="Докато акаунтът е активен. Данъчни документи се пазят 10 години (ЗСч)." />
                            <PrivacyCard title="Трени страни" desc="Данни се споделят със Stripe (плащания) и Google (карти/анализ)." />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500 leading-relaxed text-center mt-4">
                            За упражняване на правата си по GDPR, моля свържете се с нас на <strong className="text-slate-700">privacy@needo.bg</strong> или се обърнете към КЗЛД.
                        </div>
                    </div>
                );
        }
    };

    // --- MOBILE LAYOUT ---
    const MobileLayout = () => (
        <div className="md:hidden flex flex-col h-full w-full bg-[#F8FAFC] relative z-10">
            {/* Mobile Header */}
            <div className="bg-slate-900 text-white px-5 py-4 pt-safe-top flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-lg font-black">{t('legal_title')}</h2>
                    <p className="text-[10px] text-slate-400">{t('legal_subtitle')}</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
                    <X size={18} />
                </button>
            </div>

            {/* Mobile Tabs */}
            <div className="flex bg-white border-b border-slate-100 overflow-x-auto scrollbar-hide shrink-0 p-1">
                <MobileTab label={t('tab_about')} active={activeSection === 'ABOUT'} onClick={() => setActiveSection('ABOUT')} />
                <MobileTab label={t('tab_terms')} active={activeSection === 'TERMS'} onClick={() => setActiveSection('TERMS')} />
                <MobileTab label={t('tab_payments')} active={activeSection === 'PAYMENTS'} onClick={() => setActiveSection('PAYMENTS')} />
                <MobileTab label={t('tab_privacy')} active={activeSection === 'PRIVACY'} onClick={() => setActiveSection('PRIVACY')} />
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto p-5 pb-20">
                {renderContent()}
            </div>
        </div>
    );

    // --- DESKTOP LAYOUT ---
    const DesktopLayout = () => (
        <div className="hidden md:flex w-full max-w-5xl h-[85vh] bg-[#F8FAFC] rounded-[32px] overflow-hidden shadow-2xl relative">

            {/* Left Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0 p-6 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 mb-8 mt-2">
                    <h2 className="text-2xl font-black">Info</h2>
                    <p className="text-xs text-slate-400 font-medium">{t('legal_title')}</p>
                </div>

                <nav className="flex-1 space-y-2 relative z-10">
                    <SidebarBtn active={activeSection === 'ABOUT'} onClick={() => setActiveSection('ABOUT')} icon={<Zap size={18} />} label={t('tab_about')} />
                    <SidebarBtn active={activeSection === 'TERMS'} onClick={() => setActiveSection('TERMS')} icon={<FileText size={18} />} label={t('tab_terms')} />
                    <SidebarBtn active={activeSection === 'PAYMENTS'} onClick={() => setActiveSection('PAYMENTS')} icon={<Wallet size={18} />} label={t('tab_payments')} />
                    <SidebarBtn active={activeSection === 'PRIVACY'} onClick={() => setActiveSection('PRIVACY')} icon={<Lock size={18} />} label={t('tab_privacy')} />
                </nav>

                <div className="relative z-10 pt-6 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                    &copy; {new Date().getFullYear()} DAVIDA BG LTD EOOD.
                </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 flex flex-col relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">
                    <div className="max-w-2xl mx-auto pt-4">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-6">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}></div>
            <MobileLayout />
            <DesktopLayout />
        </div>
    );
};

// --- SUB COMPONENTS ---

const StepCard = ({ number, icon, title, desc, color }: any) => (
    <div className={`${color} rounded-2xl p-5 text-white shadow-md relative overflow-hidden group h-full flex flex-col`}>
        <div className="absolute -right-4 -top-4 text-white/10 font-black text-6xl select-none">{number}</div>
        <div className="relative z-10 mb-3">{icon}</div>
        <h4 className="font-bold text-lg relative z-10 mb-2 leading-tight">{title}</h4>
        <p className="text-xs text-white/90 leading-relaxed relative z-10 font-medium">{desc}</p>
    </div>
);

const TermCard = ({ number, title, content, icon, isWarning }: any) => (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${isWarning ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                {number}
            </div>
            <div className="flex-1 flex items-center gap-2 font-bold text-slate-800 text-sm">
                <span className="text-slate-400">{icon}</span> {title}
            </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-11">
            {content}
        </p>
    </div>
);

const PaymentStep = ({ step, title, desc }: any) => (
    <div className="flex gap-4 items-start relative z-10">
        <div className="w-12 h-12 bg-white border-4 border-slate-50 rounded-full flex items-center justify-center font-black text-slate-900 shadow-sm shrink-0">
            {step}
        </div>
        <div className="pt-1">
            <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
    </div>
);

const PrivacyCard = ({ title, desc }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
        <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">{title}</h4>
        <p className="text-xs text-slate-600">{desc}</p>
    </div>
);

const SidebarBtn = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        {icon}
        {label}
        {active && <ChevronRight size={14} className="ml-auto" />}
    </button>
);

const MobileTab = ({ label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all whitespace-nowrap px-2 ${active ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
    >
        {label}
    </button>
);

const ExternalLinkIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);
