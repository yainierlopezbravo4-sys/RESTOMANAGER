import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BusinessSettings } from '../types';
import { Building2, Save, MapPin, Phone, Mail, Globe, CreditCard, Shield, User, LogOut, Moon, Sun, Languages } from 'lucide-react';
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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'business');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as BusinessSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error(t('settings.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [t]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Section */}
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
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-stone-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-stone-600">
              <Shield size={12} />
              {user?.role || 'Staff'}
            </div>
          </div>
        </div>
      </section>

      {/* App Preferences */}
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

      {/* Business Settings */}
      <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
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
                <Building2 size={14} />
                {t('settings.business_name')}
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: RestoManager Pro"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={14} />
                {t('settings.tax_id')}
              </label>
              <input
                type="text"
                value={settings.taxId}
                onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: 00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin size={14} />
                {t('settings.address')}
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: Av. Principal, 123 - Centro"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <Phone size={14} />
                {t('settings.phone')}
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: (00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} />
                {t('settings.email')}
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: contato@restomanager.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <Globe size={14} />
                {t('settings.website')}
              </label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: www.restomanager.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={14} />
                {t('settings.pix_key')}
              </label>
              <input
                type="text"
                value={settings.pixKey}
                onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
                className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                placeholder="Ex: CNPJ, Email, Celular ou Chave Aleatória"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg"
            >
              <Save size={20} />
              {t('settings.save_changes')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
