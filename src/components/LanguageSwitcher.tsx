import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
  ];

  return (
    <div className={`px-3 py-2 ${isSidebarOpen ? '' : 'flex justify-center'}`}>
      {isSidebarOpen ? (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">{t('settings.language')}</p>
          <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  i18n.language === lang.code ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'
                }`}
                title={lang.label}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative group">
          <button className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-all">
            <Globe size={20} />
          </button>
          <div className="absolute left-full ml-2 top-0 bg-white border border-stone-200 rounded-xl shadow-xl p-2 hidden group-hover:block z-50 min-w-[120px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  i18n.language === lang.code ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
