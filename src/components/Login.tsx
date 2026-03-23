import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First check if user exists in our custom users collection
      const q = query(collection(db, 'users'), where('email', '==', email), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // User found in custom collection, now sign in to Firebase Auth
        // Note: In a real app, we'd use Firebase Auth properly, but keeping this logic for now
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        toast.error(t('auth.invalid_credentials'));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(t('auth.login_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(t('auth.google_error'));
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-stone-900 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-stone-900 rounded-full blur-3xl" />
      </div>

      {/* Language Switcher */}
      <div className="absolute top-8 right-8 z-10">
        <LanguageSwitcher isSidebarOpen={true} />
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-900 text-white rounded-3xl shadow-2xl mb-6 transform hover:rotate-12 transition-transform">
            <UtensilsCrossed size={40} />
          </div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2">RestoManager Pro</h1>
          <p className="text-stone-500 font-medium">{t('auth.welcome_back')}</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-stone-200/50 border border-stone-200 p-10 relative overflow-hidden">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">{t('auth.email')}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-900 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-stone-900 transition-all font-medium text-stone-900 placeholder:text-stone-300"
                  placeholder="admin@restomanager.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">{t('auth.password')}</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-900 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-stone-900 transition-all font-medium text-stone-900 placeholder:text-stone-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('auth.login')}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
              <span className="bg-white px-4 text-stone-400">{t('auth.or_continue_with')}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-stone-100 py-4 rounded-2xl font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-200 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            {t('auth.google_login')}
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-stone-400">
          <ShieldCheck size={16} />
          <p className="text-xs font-medium tracking-wide uppercase">{t('auth.secure_access')}</p>
        </div>
      </div>
    </div>
  );
}
