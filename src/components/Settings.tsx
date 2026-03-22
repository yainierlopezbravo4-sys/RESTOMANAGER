import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  QrCode, 
  Plus, 
  Trash2, 
  Building, 
  User, 
  Shield, 
  Bell, 
  Smartphone,
  Globe,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  Power,
  LogOut,
  FileText,
  Activity,
  ExternalLink,
  Users as UsersIcon,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, setDoc, onSnapshot, query, where, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PaymentSettings, User as UserType, GeneralSettings, NotificationLog, Integration, Sale } from '../types';
import { handleFirestoreError, OperationType } from '../utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import ValidationModal from './ValidationModal';

type SettingsTab = 'general' | 'payments' | 'users' | 'notifications' | 'integrations' | 'plan';

export default function Settings({ user }: { user: UserType }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    pixKeys: [],
    tedAccounts: []
  });
  const [newPixKey, setNewPixKey] = useState('');
  const [newTed, setNewTed] = useState({ bank: '', agency: '', account: '', owner: '' });
  const [businessInfo, setBusinessInfo] = useState({
    name: 'RESTOMANAGER PRO S.A.',
    address: 'Calle Falsa 123, Ciudad',
    phone: '(555) 123-4567',
    email: 'contacto@restomanager.pro',
    taxId: '12.345.678/0001-99'
  });
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    darkMode: false,
    openSaleOnStart: true,
    closeOnRestaurantClose: true
  });
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // User form state
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const unsubPayments = onSnapshot(doc(db, 'settings', 'payments'), (snapshot) => {
      if (snapshot.exists()) setPaymentSettings(snapshot.data() as PaymentSettings);
    });

    const unsubBusiness = onSnapshot(doc(db, 'settings', 'business'), (snapshot) => {
      if (snapshot.exists()) setBusinessInfo(snapshot.data() as any);
    });

    const unsubGeneral = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) setGeneralSettings(snapshot.data() as GeneralSettings);
    });

    const qNotifications = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(20));
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationLog)));
    });

    const unsubIntegrations = onSnapshot(collection(db, 'integrations'), (snapshot) => {
      setIntegrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const today = new Date();
    const qSales = query(
      collection(db, 'sales'),
      where('timestamp', '>=', startOfDay(today).toISOString()),
      where('timestamp', '<=', endOfDay(today).toISOString()),
      orderBy('timestamp', 'desc')
    );
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      setTodaySales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    let unsubUsers = () => {};
    if (user.role === 'admin') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
    }

    return () => {
      unsubPayments();
      unsubBusiness();
      unsubGeneral();
      unsubNotifications();
      unsubIntegrations();
      unsubSales();
      unsubUsers();
    };
  }, [user.role]);

  const saveGeneralSettings = async (settings: GeneralSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      setGeneralSettings(settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
    }
  };

  const savePaymentSettings = async (newSettings: PaymentSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'payments'), newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/payments');
    }
  };

  const saveBusinessInfo = async () => {
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'settings', 'business'), businessInfo);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/business');
      setSaveStatus('idle');
    }
  };

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Enforce master password for admins
      const finalPassword = newUser.role === 'admin' ? '931216' : newUser.password;
      
      const userUid = Math.random().toString(36).substring(7);
      await setDoc(doc(db, 'users', userUid), {
        uid: userUid,
        ...newUser,
        password: finalPassword,
        createdAt: new Date().toISOString()
      });
      setNewUser({ displayName: '', email: '', password: '', role: 'staff', phone: '', address: '' });
      
      // Log notification
      await addDoc(collection(db, 'notifications'), {
        type: 'receipt_generated',
        message: `Nuevo usuario registrado: ${newUser.displayName} (${newUser.role})`,
        timestamp: new Date().toISOString(),
        operatorName: user.displayName
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === user.uid) {
      alert('No puedes eliminar tu propio usuario.');
      return;
    }
    
    setPendingDeleteId(userId);
    setIsValidationOpen(true);
  };

  const handleValidationSuccess = async (validatedUser: any) => {
    if (!pendingDeleteId) return;

    try {
      await deleteDoc(doc(db, 'users', pendingDeleteId));
      
      // Log notification
      await addDoc(collection(db, 'notifications'), {
        type: 'system_close',
        message: `Usuario eliminado: ${pendingDeleteId}`,
        timestamp: new Date().toISOString(),
        operatorName: validatedUser.displayName
      });
      
      setPendingDeleteId(null);
      setIsValidationOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${pendingDeleteId}`);
    }
  };

  const addPixKey = () => {
    if (!newPixKey) return;
    const updated = { ...paymentSettings, pixKeys: [...paymentSettings.pixKeys, newPixKey] };
    savePaymentSettings(updated);
    setNewPixKey('');
  };

  const removePixKey = (index: number) => {
    const updated = { ...paymentSettings, pixKeys: paymentSettings.pixKeys.filter((_, i) => i !== index) };
    savePaymentSettings(updated);
  };

  const addTedAccount = () => {
    if (!newTed.bank || !newTed.account) return;
    const updated = { ...paymentSettings, tedAccounts: [...paymentSettings.tedAccounts, newTed] };
    savePaymentSettings(updated);
    setNewTed({ bank: '', agency: '', account: '', owner: '' });
  };

  const removeTedAccount = (index: number) => {
    const updated = { ...paymentSettings, tedAccounts: paymentSettings.tedAccounts.filter((_, i) => i !== index) };
    savePaymentSettings(updated);
  };

  const toggleDarkMode = () => {
    const newSettings = { ...generalSettings, darkMode: !generalSettings.darkMode };
    saveGeneralSettings(newSettings);
    if (newSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Building size={20} />
                Aspectos Visuales y Operativos
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${generalSettings.darkMode ? 'bg-stone-900 text-white' : 'bg-amber-100 text-amber-600'}`}>
                      {generalSettings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">Modo Nocturno</p>
                      <p className="text-xs text-stone-500">Cambia el tema visual de la aplicación</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleDarkMode}
                    className={`w-12 h-6 rounded-full transition-all relative ${generalSettings.darkMode ? 'bg-emerald-500' : 'bg-stone-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${generalSettings.darkMode ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                      <Power size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Abrir Venta al Iniciar</p>
                      <p className="text-xs text-stone-500">Inicia automáticamente una nueva venta al abrir el sistema</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => saveGeneralSettings({ ...generalSettings, openSaleOnStart: !generalSettings.openSaleOnStart })}
                    className={`w-12 h-6 rounded-full transition-all relative ${generalSettings.openSaleOnStart ? 'bg-emerald-500' : 'bg-stone-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${generalSettings.openSaleOnStart ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                      <LogOut size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Cerrar Sistema al Finalizar</p>
                      <p className="text-xs text-stone-500">Cierra todas las ventas abiertas al cerrar el restaurante</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => saveGeneralSettings({ ...generalSettings, closeOnRestaurantClose: !generalSettings.closeOnRestaurantClose })}
                    className={`w-12 h-6 rounded-full transition-all relative ${generalSettings.closeOnRestaurantClose ? 'bg-emerald-500' : 'bg-stone-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${generalSettings.closeOnRestaurantClose ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Building size={20} />
                  Información del Negocio
                </h3>
                <button 
                  onClick={saveBusinessInfo}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {saveStatus === 'saving' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : saveStatus === 'success' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  {saveStatus === 'success' ? 'Guardado' : 'Guardar Cambios'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Nombre Comercial</label>
                  <input type="text" value={businessInfo.name} onChange={e => setBusinessInfo({ ...businessInfo, name: e.target.value })} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">ID Fiscal</label>
                  <input type="text" value={businessInfo.taxId} onChange={e => setBusinessInfo({ ...businessInfo, taxId: e.target.value })} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Dirección</label>
                  <input type="text" value={businessInfo.address} onChange={e => setBusinessInfo({ ...businessInfo, address: e.target.value })} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
                </div>
              </div>
            </section>
          </motion.div>
        );
      case 'payments':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-8">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard size={20} />
                Configuración de Pagos y Facturación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <QrCode size={16} className="text-stone-400" />
                    Llaves Pix
                  </h4>
                  <div className="flex gap-2">
                    <input type="text" value={newPixKey} onChange={e => setNewPixKey(e.target.value)} placeholder="Nueva llave Pix..." className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm" />
                    <button onClick={addPixKey} className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"><Plus size={20} /></button>
                  </div>
                  <div className="space-y-2">
                    {paymentSettings.pixKeys.map((key, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <span className="text-xs font-mono text-stone-600">{key}</span>
                        <button onClick={() => removePixKey(i)} className="text-stone-300 hover:text-rose-500"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Building size={16} className="text-stone-400" />
                    Cuentas TED
                  </h4>
                  <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Banco" value={newTed.bank} onChange={e => setNewTed({ ...newTed, bank: e.target.value })} className="p-2 bg-white border border-stone-200 rounded-lg text-xs" />
                      <input type="text" placeholder="Titular" value={newTed.owner} onChange={e => setNewTed({ ...newTed, owner: e.target.value })} className="p-2 bg-white border border-stone-200 rounded-lg text-xs" />
                      <input type="text" placeholder="Agencia" value={newTed.agency} onChange={e => setNewTed({ ...newTed, agency: e.target.value })} className="p-2 bg-white border border-stone-200 rounded-lg text-xs" />
                      <input type="text" placeholder="Cuenta" value={newTed.account} onChange={e => setNewTed({ ...newTed, account: e.target.value })} className="p-2 bg-white border border-stone-200 rounded-lg text-xs" />
                    </div>
                    <button onClick={addTedAccount} className="w-full flex items-center justify-center gap-2 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold"><Plus size={16} /> Agregar Cuenta</button>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        );
      case 'users':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UsersIcon size={20} />
                Gestión de Usuarios y Permisos
              </h3>
              
              {user.role === 'admin' ? (
                <div className="space-y-8">
                  <form onSubmit={registerUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="md:col-span-2"><h4 className="text-sm font-bold uppercase text-stone-400">Registrar Nuevo Usuario</h4></div>
                    <input type="text" placeholder="Nombre Completo" value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} className="p-3 bg-white border border-stone-200 rounded-xl text-sm" required />
                    <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="p-3 bg-white border border-stone-200 rounded-xl text-sm" required />
                    <input type="password" placeholder="Contraseña de Acceso" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="p-3 bg-white border border-stone-200 rounded-xl text-sm" required />
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as any })} className="p-3 bg-white border border-stone-200 rounded-xl text-sm">
                      <option value="staff">Operador (Staff)</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <input type="text" placeholder="Teléfono" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className="p-3 bg-white border border-stone-200 rounded-xl text-sm" />
                    <input type="text" placeholder="Dirección" value={newUser.address} onChange={e => setNewUser({ ...newUser, address: e.target.value })} className="md:col-span-2 p-3 bg-white border border-stone-200 rounded-xl text-sm" />
                    <button type="submit" className="md:col-span-2 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all">Cadastrar Usuario</button>
                  </form>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase text-stone-400">Usuarios Activos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allUsers.map(u => (
                        <div key={u.uid} className="p-4 bg-white border border-stone-200 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400"><User size={20} /></div>
                            <div>
                              <p className="text-sm font-bold">{u.displayName}</p>
                              <p className="text-[10px] text-stone-500 uppercase font-bold">{u.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-stone-300 hover:text-stone-900"><SettingsIcon size={16} /></button>
                            {u.uid !== user.uid && (
                              <button 
                                onClick={() => deleteUser(u.uid)}
                                className="p-2 text-rose-300 hover:text-rose-600 transition-colors"
                                title="Eliminar Usuario"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-stone-100 rounded-3xl">
                  <Shield size={40} className="mx-auto text-stone-200 mb-4" />
                  <p className="text-stone-400 text-sm">Solo los administradores pueden gestionar usuarios.</p>
                </div>
              )}
            </section>
          </motion.div>
        );
      case 'notifications':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bell size={20} />
                Notificaciones del Sistema
              </h3>
              <div className="space-y-4">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div className={`p-2 rounded-lg ${
                      n.type === 'system_open' ? 'bg-emerald-100 text-emerald-600' :
                      n.type === 'system_close' ? 'bg-rose-100 text-rose-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <Activity size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-stone-400">{format(new Date(n.timestamp), 'd MMM, HH:mm', { locale: es })}</p>
                        <span className="text-[10px] text-stone-300">•</span>
                        <p className="text-[10px] text-stone-500 font-bold uppercase">{n.operatorName || 'SISTEMA'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && <p className="text-center text-stone-400 py-8">No hay notificaciones recientes.</p>}
              </div>
            </section>
          </motion.div>
        );
      case 'integrations':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Globe size={20} />
                Integraciones Externas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Servicios Gubernamentales</h4>
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Configurar</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">Enlaza tu sistema con las entidades tributarias para facturación electrónica automática.</p>
                  <button className="w-full py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <ExternalLink size={14} /> Conectar API
                  </button>
                </div>
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Empresas Privadas</h4>
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Configurar</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">Integración con servicios de delivery (iFood, 99Food) y proveedores de insumos.</p>
                  <button className="w-full py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <ExternalLink size={14} /> Gestionar Servicios
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        );
      case 'plan':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText size={20} />
                  Plan Actual y Facturación del Día
                </h3>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full uppercase">Enterprise Plan</span>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase text-stone-400">Comprobantes Emitidos Hoy</h4>
                <div className="bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase">
                        <th className="px-4 py-3">ID Venta</th>
                        <th className="px-4 py-3">Hora</th>
                        <th className="px-4 py-3">Operador</th>
                        <th className="px-4 py-3">Monto</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {todaySales.map(sale => (
                        <tr key={sale.id} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 text-xs font-mono">{sale.id?.substring(0, 8)}...</td>
                          <td className="px-4 py-3 text-xs">{format(new Date(sale.timestamp), 'HH:mm')}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-stone-600 uppercase">{sale.operatorName || 'Sistema'}</td>
                          <td className="px-4 py-3 text-xs font-bold">${sale.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[10px] uppercase font-bold text-stone-500">{sale.paymentMethod}</td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-stone-400 hover:text-stone-900"><Printer size={14} /></button>
                          </td>
                        </tr>
                      ))}
                      {todaySales.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400 text-xs">No se han emitido facturas hoy.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 px-2">Configuración</h3>
            <div className="space-y-1">
              {[
                { id: 'general', label: 'General', icon: Building },
                { id: 'payments', label: 'Pagos & Facturación', icon: CreditCard },
                { id: 'users', label: 'Usuarios & Permisos', icon: UsersIcon },
                { id: 'notifications', label: 'Notificaciones', icon: Bell },
                { id: 'integrations', label: 'Integraciones', icon: Globe },
                { id: 'plan', label: 'Plan Actual', icon: FileText },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    activeTab === item.id 
                      ? 'text-white bg-stone-900 shadow-lg' 
                      : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {renderTabContent()}
          </AnimatePresence>
        </div>
      </div>

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={handleValidationSuccess}
        title="Confirmar Eliminación de Usuario"
        description="Esta acción eliminará permanentemente al usuario del sistema. Se requiere validación de administrador para proceder."
      />
    </div>
  );
}
