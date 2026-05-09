import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, ShieldCheck, Loader2 } from 'lucide-react';

// Initialize Stripe outside of component to avoid recreating the object
// In a real app, use an environment variable for the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51TRYJTBmgLQY5UZ4jj9ZRJqqxCYfLuEJDSJOP05L8uKNrQME97tu0ACsYREdvgRcyOiAmDXlD2FfwvdtGbyx6Gbc00OAtfoLjp');

interface CheckoutFormProps {
  amountEuro: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ amountEuro, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isReady) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/?payment_success=true`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Възникна грешка при плащането.");
        setIsProcessing(false);
      } else {
        // Payment successful or handled by redirect
        onSuccess();
      }
    } catch (err) {
      console.error("Payment submission error:", err);
      setError("Възникна неочаквана грешка. Моля опитайте пак.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <PaymentElement onReady={() => setIsReady(true)} />
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0">
        <button
          type="submit"
          disabled={!stripe || isProcessing || !isReady}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-slate-800 shadow-lg active:scale-[0.98]"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (isReady ? <Lock size={18} /> : <Loader2 size={18} className="animate-spin" />)}
          {isReady ? `Депозирай ${amountEuro} €` : 'Зареждане...'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full mt-3 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Отказ
        </button>
      </div>
    </form>
  );
};

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string | null;
  amountEuro: number;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, clientSecret, amountEuro, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !clientSecret ? onClose() : null}></div>
      
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" />
              Сигурно Плащане
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Парите се задържат в Escrow до приключване</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm amountEuro={amountEuro} onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-sm font-medium">Подготовка на плащането...</p>
          </div>
        )}
      </div>
    </div>
  );
};
