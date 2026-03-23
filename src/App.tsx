import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Inventory from './components/Inventory';
import Financials from './components/Financials';
import Reports from './components/Reports';
import Users from './components/Users';
import Settings from './components/Settings';
import Login from './components/Login';
import { Toaster, toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { es, enUS, ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check if user exists in our custom users collection
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userData.displayName || firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: userData.role as UserRole
            });
          } else {
            // Default to staff if not found in custom collection
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'staff' as UserRole
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error(t('auth.error_fetching_user'));
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [t]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success(t('auth.logout_success'));
    } catch (error) {
      toast.error(t('auth.logout_error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    const isAdmin = user.role === 'admin';
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'sales': return <Sales user={user} />;
      case 'inventory': return <Inventory user={user} />;
      case 'financials': return isAdmin ? <Financials user={user} /> : <RestrictedAccess />;
      case 'reports': return isAdmin ? <Reports user={user} /> : <RestrictedAccess />;
      case 'users': return isAdmin ? <Users currentUser={user} /> : <RestrictedAccess />;
      case 'settings': return <Settings user={user} onLogout={handleLogout} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        user={user}
        onLogout={handleLogout}
      />

      <main className={`flex-1 transition-all duration-300 p-8 ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight capitalize">
              {t(`nav.${activeTab}`)}
            </h2>
            <p className="text-stone-500 font-medium">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-stone-900">{user.displayName}</p>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-600 font-bold shadow-lg border-2 border-white">
                {user.displayName?.charAt(0)}
              </div>
            )}
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderContent()}
        </div>
      </main>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

function RestrictedAccess() {
  const { t } = useTranslation();
  return (
    <div className="bg-white p-12 rounded-[2.5rem] border border-stone-200 shadow-sm text-center">
      <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15v2m0-8V7m0 0a2 2 0 100-4 2 2 0 000 4zm0 16a10 10 0 110-20 10 10 0 010 20z" /></svg>
      </div>
      <h3 className="text-2xl font-bold text-stone-900 mb-2">{t('app.restricted_access')}</h3>
      <p className="text-stone-500 max-w-md mx-auto">
        {t('app.restricted_access_desc')}
      </p>
    </div>
  );
}

export default App;
