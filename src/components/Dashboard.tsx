import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Sale, FinancialRecord, InventoryItem } from '../types';
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingBag, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../utils';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS;
  const [sales, setSales] = useState<Sale[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = startOfDay(new Date()).toISOString();
    
    const salesQuery = query(
      collection(db, 'sales'),
      where('timestamp', '>=', today),
      orderBy('timestamp', 'desc')
    );

    const finQuery = query(
      collection(db, 'financials'),
      where('timestamp', '>=', today)
    );

    const invQuery = query(collection(db, 'inventory'));

    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales_dashboard');
    });

    const unsubFin = onSnapshot(finQuery, (snapshot) => {
      setFinancials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'financials_dashboard');
    });

    const unsubInv = onSnapshot(invQuery, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory_dashboard');
    });

    return () => {
      unsubSales();
      unsubFin();
      unsubInv();
    };
  }, []);

  const dailyRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const dailyExpenses = financials
    .filter(f => f.type === 'expense')
    .reduce((sum, f) => sum + f.amount, 0);
  const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

  const stats = [
    {
      label: t('dashboard.daily_revenue'),
      value: `$${dailyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: '+12.5%',
      trendUp: true
    },
    {
      label: t('dashboard.daily_expenses'),
      value: `$${dailyExpenses.toLocaleString()}`,
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      trend: '-2.4%',
      trendUp: false
    },
    {
      label: t('dashboard.total_sales'),
      value: sales.length.toString(),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: '+5',
      trendUp: true
    },
    {
      label: t('dashboard.low_stock'),
      value: lowStockItems.length.toString(),
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: lowStockItems.length > 0 ? t('dashboard.action_required') : t('dashboard.all_good'),
      trendUp: false
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <p className="text-stone-500 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-stone-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-xl">
                <Clock size={20} className="text-stone-600" />
              </div>
              <h3 className="font-bold text-stone-900">{t('dashboard.recent_sales')}</h3>
            </div>
          </div>
          <div className="divide-y divide-stone-50">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-xs">
                    {sale.paymentMethod.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">
                      {sale.items.map(i => i.name).join(', ').substring(0, 30)}...
                    </p>
                    <p className="text-xs text-stone-500">
                      {format(new Date(sale.timestamp), 'HH:mm', { locale: dateLocale })} • {t(`sales.payment_methods.${sale.paymentMethod}`)}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-emerald-600">${sale.amount.toLocaleString()}</p>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="p-8 text-center text-stone-400">
                <p className="text-sm">{t('dashboard.no_sales_today')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-stone-900">{t('dashboard.stock_alerts')}</h3>
            </div>
            <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
              {lowStockItems.length} {t('dashboard.items')}
            </span>
          </div>
          <div className="divide-y divide-stone-50">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{item.name}</p>
                    <p className="text-xs text-stone-500">{t('inventory.table.code')}: {item.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600">{item.quantity} {item.unit}</p>
                  <p className="text-[10px] text-stone-400 uppercase font-bold">{t('inventory.table.min')}: {item.minStock}</p>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="p-8 text-center text-stone-400">
                <p className="text-sm">{t('dashboard.stock_all_good')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
