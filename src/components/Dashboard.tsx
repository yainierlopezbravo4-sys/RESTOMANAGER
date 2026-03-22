import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils';
import { Sale, FinancialRecord, InventoryItem, GeneralSettings } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Power,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import ValidationModal from './ValidationModal';

export default function Dashboard({ user }: { user: any }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  useEffect(() => {
    const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales');
    });

    const finQuery = query(collection(db, 'financials'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeFin = onSnapshot(finQuery, (snapshot) => {
      setFinancials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'financials');
    });

    const invQuery = query(collection(db, 'inventory'), where('quantity', '<=', 10)); // Simple low stock check
    const unsubscribeInv = onSnapshot(invQuery, (snapshot) => {
      setLowStock(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    const unsubGeneral = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) setGeneralSettings(snapshot.data() as GeneralSettings);
    });

    return () => {
      unsubscribeSales();
      unsubscribeFin();
      unsubscribeInv();
      unsubGeneral();
    };
  }, []);

  const toggleSystemStatus = async () => {
    if (!generalSettings) return;
    setIsValidationOpen(true);
  };

  const handleValidationSuccess = async (validatedUser: any) => {
    if (!generalSettings) return;
    
    const newStatus = !generalSettings.isSystemOpen;
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        ...generalSettings,
        isSystemOpen: newStatus
      });

      // Log notification
      await addDoc(collection(db, 'notifications'), {
        type: newStatus ? 'system_open' : 'system_close',
        message: `El sistema ha sido ${newStatus ? 'ABIERTO' : 'CERRADO'} por el usuario: ${validatedUser.displayName}.`,
        timestamp: new Date().toISOString(),
        operatorName: validatedUser.displayName
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
    }
  };

  const todaySales = sales.filter(s => new Date(s.timestamp) >= startOfDay(new Date()));
  const totalToday = todaySales.reduce((sum, s) => sum + s.amount, 0);

  const todayExpenses = financials.filter(f => f.type === 'expense' && new Date(f.timestamp) >= startOfDay(new Date()));
  const totalExpensesToday = todayExpenses.reduce((sum, f) => sum + f.amount, 0);

  const pendingPayables = financials.filter(f => f.type === 'payable' && f.status === 'pending');
  const totalPayables = pendingPayables.reduce((sum, f) => sum + f.amount, 0);

  const pendingReceivables = financials.filter(f => f.type === 'receivable' && f.status === 'pending');
  const totalReceivables = pendingReceivables.reduce((sum, f) => sum + f.amount, 0);

  // Chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const daySales = sales.filter(s => format(new Date(s.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    const dayExpenses = financials.filter(f => f.type === 'expense' && format(new Date(f.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    return {
      name: format(date, 'EEE', { locale: es }),
      ventas: daySales.reduce((sum, s) => sum + s.amount, 0),
      gastos: dayExpenses.reduce((sum, f) => sum + f.amount, 0)
    };
  }).reverse();

  return (
    <div className="space-y-8">
      {/* System Control & Stats Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Estado del Sistema</h3>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${generalSettings?.isSystemOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {generalSettings?.isSystemOpen ? 'Abierto' : 'Cerrado'}
              </div>
            </div>
            <p className="text-sm text-stone-500 mb-6">
              {generalSettings?.isSystemOpen 
                ? 'El sistema está operativo. Las ventas y movimientos están habilitados.' 
                : 'El sistema está cerrado. No se permiten nuevas operaciones hasta la apertura.'}
            </p>
          </div>
          <button 
            onClick={toggleSystemStatus}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold transition-all shadow-lg ${
              generalSettings?.isSystemOpen 
                ? 'bg-rose-500 text-white hover:bg-rose-600' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            <Power size={20} />
            {generalSettings?.isSystemOpen ? 'Cerrar Sistema' : 'Abrir Sistema'}
          </button>
        </div>

        <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            title="Ventas Hoy" 
            value={`$${totalToday.toLocaleString()}`} 
            icon={TrendingUp} 
            color="bg-emerald-500"
            trend={`${todaySales.length} pedidos`}
          />
          {user.role === 'admin' && (
            <StatCard 
              title="Gastos Hoy" 
              value={`$${totalExpensesToday.toLocaleString()}`} 
              icon={TrendingDown} 
              color="bg-rose-500"
              trend={`${todayExpenses.length} registros`}
            />
          )}
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Por Pagar" 
            value={`$${totalPayables.toLocaleString()}`} 
            icon={ArrowUpRight} 
            color="bg-amber-500"
            trend={`${pendingPayables.length} facturas`}
          />
          <StatCard 
            title="Por Cobrar" 
            value={`$${totalReceivables.toLocaleString()}`} 
            icon={ArrowDownLeft} 
            color="bg-blue-500"
            trend={`${pendingReceivables.length} pendientes`}
          />
          <StatCard 
            title="Stock Bajo" 
            value={lowStock.length.toString()} 
            icon={AlertTriangle} 
            color="bg-stone-500"
            trend="Requiere atención"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className={`${user.role === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-6 rounded-2xl border border-stone-200 shadow-sm`}>
          <h3 className="text-lg font-bold mb-6">Ventas {user.role === 'admin' ? 'vs Gastos' : ''} (7 días)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="ventas" fill="#1c1917" radius={[4, 4, 0, 0]} />
                {user.role === 'admin' && <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        {user.role === 'admin' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Actividad Reciente</h3>
            <div className="space-y-6">
              {[
                ...sales.slice(0, 5).map(s => ({ ...s, activityType: 'sale' })),
                ...financials.filter(f => f.type === 'expense').slice(0, 5).map(f => ({ ...f, activityType: 'expense' }))
              ]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 8)
              .map((activity: any) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    activity.activityType === 'sale' 
                      ? (activity.platform === 'in-store' ? 'bg-stone-100' : 'bg-orange-100')
                      : 'bg-rose-100'
                  }`}>
                    {activity.activityType === 'sale' ? (
                      <ShoppingCart size={18} className={activity.platform === 'in-store' ? 'text-stone-600' : 'text-orange-600'} />
                    ) : (
                      <TrendingDown size={18} className="text-rose-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {activity.activityType === 'sale' ? `Venta ${activity.platform}` : activity.description}
                    </p>
                    <p className="text-xs text-stone-500">{format(new Date(activity.timestamp), 'HH:mm')}</p>
                  </div>
                  <div className={`text-sm font-bold ${activity.activityType === 'expense' ? 'text-rose-600' : ''}`}>
                    {activity.activityType === 'expense' ? '-' : ''}${activity.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              {sales.length === 0 && financials.length === 0 && (
                <p className="text-center text-stone-400 py-8">No hay actividad reciente</p>
              )}
            </div>
          </div>
        )}
      </div>

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={handleValidationSuccess}
        title={generalSettings?.isSystemOpen ? 'Cierre de Sistema' : 'Apertura de Sistema'}
        description={generalSettings?.isSystemOpen 
          ? 'Para cerrar el sistema y finalizar las operaciones del día, por favor ingrese sus credenciales.' 
          : 'Para abrir el sistema e iniciar las operaciones, por favor ingrese sus credenciales.'}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} text-white`}>
          <Icon size={24} />
        </div>
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h4 className="text-2xl font-bold tracking-tight">{value}</h4>
          <p className="text-xs text-stone-500 mt-1">{trend}</p>
        </div>
      </div>
    </div>
  );
}

function ShoppingCart({ size, className }: any) {
  return <TrendingUp size={size} className={className} />;
}
