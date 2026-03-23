import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  getDocFromServer,
  getDocs,
  where
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './utils';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  FileText, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Settings,
  Printer,
  Barcode,
  Shield,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Toaster } from 'sonner';
import { User, UserRole } from './types';

// Components
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Inventory from './components/Inventory';
import Financials from './components/Financials';
import Reports from './components/Reports';
import Tools from './components/Tools';
import Integrations from './components/Integrations';
import SettingsComponent from './components/Settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'yainierlopezbravo4@gmail.com' ? 'admin' : 'staff',
              displayName: firebaseUser.displayName || 'Usuario',
              createdAt: new Date().toISOString(),
              password: firebaseUser.email === 'yainierlopezbravo4@gmail.com' ? '931216' : '',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }

          // Check settings for auto-open sale
          const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
          if (settingsDoc.exists() && settingsDoc.data().openSaleOnStart) {
            setActiveTab('sales');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Master code override for admin
      if (password === '931216') {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'admin'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as User;
          setUser(userData);
          
          const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
          if (settingsDoc.exists() && settingsDoc.data().openSaleOnStart) {
            setActiveTab('sales');
          }
          return;
        }
      }

      // Standard email login
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), where('password', '==', password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as User;
        setUser(userData);
        
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists() && settingsDoc.data().openSaleOnStart) {
          setActiveTab('sales');
        }
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (error) {
      console.error('Email login error:', error);
      setError('Error al iniciar sesión');
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data();
        if (settings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    });
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-stone-200"
        >
          <div className="w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 font-sans">RestoManager Pro</h1>
          <p className="text-stone-500 mb-8">Gestión integral para tu restaurante</p>

          <div className="flex gap-2 mb-6 p-1 bg-stone-100 rounded-xl">
            <button 
              onClick={() => setLoginMethod('google')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'google' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
            >
              Google
            </button>
            <button 
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'email' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
            >
              Operador
            </button>
          </div>

          {loginMethod === 'google' ? (
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-stone-800 transition-colors shadow-lg"
            >
              <img src="https://www.gstatic.com/firebase/builtwith/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
              Iniciar sesión con Google
            </button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1 ml-1">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1 ml-1">Contraseña</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm" 
                  required 
                />
              </div>
              {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
              <button
                type="submit"
                className="w-full bg-stone-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-lg"
              >
                Acceder al Sistema
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart },
    { id: 'inventory', label: 'Almacén', icon: Package, adminOnly: true },
    { id: 'financials', label: 'Finanzas', icon: DollarSign, adminOnly: true },
    { id: 'reports', label: 'Cierres', icon: FileText, adminOnly: true },
    { id: 'tools', label: 'Herramientas', icon: Printer, adminOnly: true },
    { id: 'integrations', label: 'Integraciones', icon: Globe, adminOnly: true },
    { id: 'settings', label: 'Configuración', icon: Settings, adminOnly: true },
  ].filter(item => !item.adminOnly || user.role === 'admin');

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans text-stone-900">
      <Toaster position="top-right" richColors />
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-stone-200 transition-all duration-300 flex flex-col h-screen sticky top-0`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">RestoManager</span>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-stone-900 text-white shadow-md' 
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-xs">
              {user.displayName.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.displayName}</p>
                <p className="text-xs text-stone-500 truncate capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            {isSidebarOpen && <span className="text-sm font-medium">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-stone-200 px-8 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-stone-500 uppercase tracking-widest">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-stone-400 text-xs">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
              <Calendar size={20} />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={user} />}
              {activeTab === 'sales' && <Sales user={user} />}
              {activeTab === 'inventory' && user.role === 'admin' && <Inventory user={user} />}
              {activeTab === 'financials' && user.role === 'admin' && <Financials user={user} />}
              {activeTab === 'reports' && user.role === 'admin' && <Reports user={user} />}
              {activeTab === 'tools' && user.role === 'admin' && <Tools user={user} />}
              {activeTab === 'integrations' && user.role === 'admin' && <Integrations user={user} />}
              {activeTab === 'settings' && user.role === 'admin' && <SettingsComponent user={user} />}
              
              {/* Fallback for restricted access */}
              {['inventory', 'financials', 'reports', 'tools', 'integrations', 'settings'].includes(activeTab) && user.role !== 'admin' && (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 py-20">
                  <Shield size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Acceso Restringido</p>
                  <p className="text-sm">Solo los administradores pueden acceder a esta sección.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
