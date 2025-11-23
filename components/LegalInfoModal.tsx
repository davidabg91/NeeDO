
import React, { useState } from 'react';
import { X, ChevronRight, ShieldCheck, Scale, CreditCard, Users, FileText, Lock, Info } from 'lucide-react';

interface LegalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section = 'ABOUT' | 'TERMS' | 'PAYMENTS' | 'PRIVACY';

export const LegalInfoModal: React.FC<LegalInfoModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<Section>('ABOUT');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'ABOUT':
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-2">За Нас</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Needo е иновативна платформа, която свързва хора, нуждаещи се от услуги, с проверени изпълнители. 
                Ние използваме <span className="font-bold">Изкуствен Интелект (AI)</span>, за да анализираме задачите от снимки и да пестим времето на потребителите.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-3 text-lg">Как работи Needo?</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <span className="font-bold text-slate-800 block text-sm">Публикуване</span>
                    <p className="text-xs text-slate-600">Потребителят прави снимка на проблема. Нашият AI (Gemini) автоматично анализира ситуацията, създава описание и предлага категория.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <span className="font-bold text-slate-800 block text-sm">Оферти</span>
                    <p className="text-xs text-slate-600">Изпълнителите виждат задачата на картата и изпращат оферти с цена и срок.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <span className="font-bold text-slate-800 block text-sm">Сигурност (Escrow)</span>
                    <p className="text-xs text-slate-600">При избор на изпълнител, сумата се депозира в защитена сметка и се освобождава само след успешно приключване на работата.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <ShieldCheck className="text-green-500 mb-2" size={20} />
                  <h4 className="font-bold text-xs text-slate-800">Проверени профили</h4>
                  <p className="text-[10px] text-gray-500 mt-1">Рейтингова система и верификация.</p>
               </div>
               <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <Scale className="text-blue-500 mb-2" size={20} />
                  <h4 className="font-bold text-xs text-slate-800">Честна конкуренция</h4>
                  <p className="text-[10px] text-gray-500 mt-1">Прозрачни цени и условия.</p>
               </div>
            </div>
          </div>
        );

      case 'TERMS':
        return (
          <div className="space-y-6 animate-in fade-in text-sm text-slate-700 leading-relaxed">
            <section>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Users size={16} /> 2. Регистрация и акаунт
              </h3>
              <p className="mb-2">
                За да използвате пълната функционалност на Needo, трябва да създадете акаунт. Вие носите отговорност за:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>Предоставянето на вярна и актуална информация.</li>
                <li>Опазването на вашата парола и достъп до профила.</li>
                <li>Всички действия, извършени от вашия акаунт.</li>
                <li>Трябва да имате навършени 18 години.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText size={16} /> 3. Използване на платформата
              </h3>
              <p className="text-xs">
                Забранено е публикуването на съдържание, което е незаконно, обидно, заплашително или нарушава правата на другите. Needo си запазва правото да изтрива съдържание и да блокира потребители при нарушение.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Info size={16} /> 4. Комуникация и контактни данни
              </h3>
              <p className="text-xs">
                С цел сигурност, телефонните номера на потребителите се разкриват само след като оферта бъде официално <span className="font-bold">приета</span> през платформата. Споделянето на лични данни в публичния чат/описание е на ваша отговорност, но платформата автоматично скрива чувствителни данни в публичната Q&A секция.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 mb-2">5. Рейтинги и ревюта</h3>
              <p className="text-xs">
                След приключване на задача, страните могат да се оценяват. Ревютата трябва да бъдат честни и базирани на реални факти. Needo не манипулира рейтинги, освен при доказана злоупотреба.
              </p>
            </section>
            
            <section>
               <h3 className="font-bold text-slate-900 mb-2">Отговорност</h3>
               <p className="text-xs text-slate-500">
                 Needo е посредник (Marketplace) и не носи отговорност за качеството на извършените услуги от трети страни (Изпълнители), нито за преки или косвени щети, възникнали от използването на услугите.
               </p>
            </section>
          </div>
        );

      case 'PAYMENTS':
        return (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex gap-3">
                 <CreditCard className="text-green-600 shrink-0" />
                 <div>
                     <h3 className="font-bold text-green-800 text-sm">Защитени плащания</h3>
                     <p className="text-xs text-green-700 mt-1">Вашите пари са в безопасност докато работата не бъде свършена.</p>
                 </div>
             </div>

             <section className="text-sm text-slate-700">
                 <h4 className="font-bold mb-2">Ескроу Модел (Escrow)</h4>
                 <p className="mb-3">
                    Needo използва модел на задържане на средства. Когато Възложителят приеме оферта, сумата се депозира в платформата, но не се превежда веднага на Изпълнителя.
                 </p>
                 <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                    <div>
                        <span className="font-bold text-xs text-slate-900 block">1. Депозиране</span>
                        <p className="text-xs text-slate-500">Приемането на оферта изисква захранване на задачата.</p>
                    </div>
                    <div>
                        <span className="font-bold text-xs text-slate-900 block">2. Изпълнение</span>
                        <p className="text-xs text-slate-500">Изпълнителят работи, знаейки че парите са осигурени.</p>
                    </div>
                    <div>
                        <span className="font-bold text-xs text-slate-900 block">3. Освобождаване</span>
                        <p className="text-xs text-slate-500">След като Възложителят потвърди, че работата е свършена, сумата се превежда към профила на Изпълнителя.</p>
                    </div>
                 </div>
             </section>

             <section className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                * Платформата начислява малка комисионна от Изпълнителя при успешно завършване на задачата. Възложителят не плаща такси за публикуване.
             </section>
          </div>
        );

      case 'PRIVACY':
        return (
            <div className="space-y-5 animate-in fade-in text-sm text-slate-700">
                <section>
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Lock size={16} /> Политика за поверителност
                    </h3>
                    <p className="text-xs mb-2">
                        Ние ценим вашата сигурност. Тази политика описва как събираме и обработваме данни съгласно GDPR.
                    </p>
                </section>

                <section>
                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Какви данни събираме?</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                        <li>Лична информация: Име, имейл, телефон, профилна снимка.</li>
                        <li>Локация: GPS координати за показване на задачи на картата (само с ваше съгласие).</li>
                        <li>Снимки: Качените снимки към задачи се анализират от AI алгоритми.</li>
                    </ul>
                </section>

                <section>
                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Използване на данни</h4>
                    <p className="text-xs text-slate-600">
                        Вашите данни се използват единствено за целите на предоставяне на услугата - свързване на потребители, обработка на плащания и подобряване на AI алгоритмите. Ние не продаваме вашите данни на трети страни.
                    </p>
                </section>

                <section>
                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Бисквитки и Съхранение</h4>
                    <p className="text-xs text-slate-600">
                        Използваме локално съхранение и сесийни бисквитки за поддържане на вашия вход в системата.
                    </p>
                </section>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-lg h-[85vh] rounded-3xl shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
                <h2 className="text-xl font-black text-slate-900">Правна Информация</h2>
                <p className="text-xs text-slate-500">Условия за ползване и поверителност</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} className="text-slate-600" />
            </button>
        </div>

        {/* Sidebar / Tabs (Mobile responsive) */}
        <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide shrink-0 bg-slate-50/50">
            <TabButton label="За Нас" active={activeSection === 'ABOUT'} onClick={() => setActiveSection('ABOUT')} />
            <TabButton label="Условия" active={activeSection === 'TERMS'} onClick={() => setActiveSection('TERMS')} />
            <TabButton label="Плащания" active={activeSection === 'PAYMENTS'} onClick={() => setActiveSection('PAYMENTS')} />
            <TabButton label="Поверителност" active={activeSection === 'PRIVACY'} onClick={() => setActiveSection('PRIVACY')} />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {renderContent()}
            
            <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">
                    Последна актуализация: 25 Октомври 2023<br/>
                    Needo &copy; Всички права запазени.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

const TabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
            active ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
    >
        {label}
    </button>
);
