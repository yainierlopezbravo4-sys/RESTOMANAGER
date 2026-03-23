import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BusinessSettings } from '../types';
import { Building2, Save, MapPin, Phone, Mail, Globe, CreditCard, Shield, User, LogOut, Moon, Sun, Languages, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Settings({ user, onLogout }: { user: any, onLogout: () => void }) {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<BusinessSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    pixKey: '',
    taxId: '',
  });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'settings', 'business');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as BusinessSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Solo mostramos error al admin, el staff no tiene permiso por regla
        if (isAdmin) toast.error(t('settings.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user, isAdmin, t]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t('app.restricted_access'));
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'business'), settings);
      toast.success(t('settings.success_save'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('settings.error_save'));
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Sección de Perfil */}
      <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-stone-100 rounded-2xl">
              <User size={24} className="text-stone-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('settings.profile')}</h3>
              <p className="text-sm text-stone-500">{t('settings.profile_desc')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            {t('auth.logout')}
          </button>
        </div>

        <div className="flex items-center gap-6 p-6 bg-stone-50 rounded-2xl">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-20 h-20 rounded-2xl object-cover shadow-md" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-stone-200 flex items-center justify-center">
              <User size={32} className="text-stone-400" />
            </div>
          )}
          <div>
            <h4 className="text-lg font-bold">{user?.displayName}</h4>
            <p className="text-stone-500">{user?.email}</p>
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-600'}`}>
              <Shield size={12} />
              {user?.role}
            </div>
          </div>
        </div>
      </section>

      {/* Preferencias de App (Abierto para todos) */}
      <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-stone-100 rounded-2xl">
            <Globe size={24} className="text-stone-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{t('settings.preferences')}</h3>
            <p className="text-sm text-stone-500">{t('settings.preferences_desc')}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Languages size={18} className="text-stone-600" />
              </div>
              <div>
                <p className="font-bold text-sm">{t('settings.language')}</p>
                <p className="text-xs text-stone-500">{t('settings.language_desc')}</p>
              </div>
            </div>
            <div className="w-48">
              <LanguageSwitcher isSidebarOpen={true} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {darkMode ? <Moon size={18} className="text-stone-600" /> : <Sun size={18} className="text-stone-600" />}
              </div>
              <div>
                <p className="font-bold text-sm">{t('settings.dark_mode')}</p>
                <p className="text-xs text-stone-500">{t('settings.dark_mode_desc')}</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-stone-900' : 'bg-stone-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Configuración de Negocio (SOLO ADMIN) */}
      {isAdmin ? (
        <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-stone-100 rounded-2xl">
              <Building2 size={24} className="text-stone-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('settings.business')}</h3>
              <p className="text-sm text-stone-500">{t('settings.business_desc')}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={14} /> {t('settings.business_name')}
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={14} /> {t('settings.tax_id')}
                </label>
                <input
                  type="text"
                  value={settings.taxId}
                  onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                  className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} /> {t('settings.address')}
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                  <Phone size={14} /> {t('settings.phone')}
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-stone-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-lg active:scale-[0.98]"
            >
              <Save size={20} />
              {t('settings.save')}
            </button>
          </form>
        </section>
      ) : (
        <div className="p-8 bg-stone-100 border border-dashed border-stone-300 rounded-3xl text-center">
          <Lock className="mx-auto mb-3 text-stone-400" size={24} />
          <p className="text-stone-500 font-medium text-sm">
            {t('app.restricted_access_desc')}
          </p>
        </div>
      )}
    </div>
  );
}
