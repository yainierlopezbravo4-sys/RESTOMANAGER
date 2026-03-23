import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Wallet, 
  FileBarChart, 
  Users as UsersIcon, 
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, user, onLogout }: SidebarProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), roles: ['admin', 'staff'] },
    { id: 'sales', icon: ShoppingBag, label: t('nav.sales'), roles: ['admin', 'staff'] },
    { id: 'inventory', icon: Package, label: t('nav.inventory'), roles: ['admin', 'staff'] },
    { id: 'financials', icon: Wallet, label: t('nav.financials'), roles: ['admin'] },
    { id: 'reports', icon: FileBarChart, label: t('nav.reports'), roles: ['admin'] },
    { id: 'users', icon: UsersIcon, label: t('nav.users'), roles: ['admin'] },
    { id: 'settings', icon: SettingsIcon, label: t('nav.settings'), roles: ['admin', 'staff'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || 'staff'));

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-stone-900 text-white transition-all duration-300 z-40 flex flex-col shadow-2xl ${
        isOpen ? 'w-72' : 'w-24'
      }`}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div className={`flex items-center gap-3 transition-all duration-300 ${!isOpen && 'opacity-0 scale-0 w-0'}`}>
          <div className="p-2 bg-white/10 rounded-xl">
            <UtensilsCrossed size={24} className="text-white" />
          </div>
          <h1 className="font-black text-xl tracking-tight whitespace-nowrap">RestoManager</h1>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 hover:bg-white/10 rounded-xl transition-all ${!isOpen && 'mx-auto'}`}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative ${
              activeTab === item.id 
                ? 'bg-white text-stone-900 shadow-xl shadow-white/10' 
                : 'text-stone-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={24} className={`shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className={`font-bold transition-all duration-300 whitespace-nowrap ${!isOpen && 'opacity-0 scale-0 w-0'}`}>
              {item.label}
            </span>
            {!isOpen && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-stone-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-white/5 space-y-4">
        <LanguageSwitcher isSidebarOpen={true} />
        
        <div className={`flex items-center gap-3 p-3 bg-white/5 rounded-2xl transition-all ${!isOpen && 'justify-center'}`}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <UsersIcon size={20} />
            </div>
          )}
          <div className={`flex-1 min-w-0 transition-all duration-300 ${!isOpen && 'hidden'}`}>
            <p className="text-sm font-bold truncate">{user?.displayName}</p>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{user?.role || 'Staff'}</p>
          </div>
          <button 
            onClick={onLogout}
            className={`p-2 text-stone-500 hover:text-rose-400 transition-colors ${!isOpen && 'hidden'}`}
            title={t('auth.logout')}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
