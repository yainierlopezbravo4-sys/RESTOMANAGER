import React, { useState } from 'react';
import { Shield, X, ArrowRight, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  title: string;
  description: string;
}

export default function ValidationModal({ isOpen, onClose, onSuccess, title, description }: ValidationModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validación segura: intenta autenticarse con firebase.auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Confirma rol admin en la colección users
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        toast.error(t('auth.invalid_admin_credentials'));
        setLoading(false);
        return;
      }
      onSuccess(userDoc.data());
      // Espera corto antes de desmontar el modal (prevenir reconciliación abrupta en React)
      setTimeout(() => {
        onClose();
        setEmail('');
        setPassword('');
      }, 200);
    } catch (error) {
      toast.error(t('auth.invalid_admin_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-xs text-stone-400">{t('auth.admin_required')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-sm text-amber-800 leading-relaxed">
              {description}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('auth.admin_email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="admin@restomanager.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('auth.password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              {t('app.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('auth.validate')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
