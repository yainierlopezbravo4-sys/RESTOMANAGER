import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Closure, Sale, FinancialRecord, ClosureType } from '../types';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../utils';
import ValidationModal from './ValidationModal';

export default function Reports({ user }: { user: any }) {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [type, setType] = useState<ClosureType>('monthly');

  useEffect(() => {
    const q = query(collection(db, 'closures'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClosures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Closure)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'closures');
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateClick = () => {
    setIsValidationOpen(true);
  };

  const generateClosure = async (validatedUser: any) => {
    let startDate, endDate;
    const now = new Date();

    if (type === 'daily') {
      startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    } else if (type === 'decadal') {
      startDate = subDays(now, 10).toISOString();
      endDate = now.toISOString();
    } else if (type === 'monthly') {
      startDate = startOfMonth(now).toISOString();
      endDate = endOfMonth(now).toISOString();
    } else {
      startDate = startOfYear(now).toISOString();
      endDate = endOfYear(now).toISOString();
    }

    // Fetch data for the period
    let salesSnap, finSnap, invSnap;
    try {
      salesSnap = await getDocs(query(collection(db, 'sales'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate)));
      finSnap = await getDocs(query(collection(db, 'financials'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate)));
      invSnap = await getDocs(query(collection(db, 'inventoryTransactions'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate)));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'reports_generation');
      return;
    }

    const totalSales = salesSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    const totalSalesItems = salesSnap.docs.reduce((sum, doc) => {
      const items = doc.data().items || [];
      return sum + items.reduce((s: number, i: any) => s + i.quantity, 0);
    }, 0);
    const totalExpenses = finSnap.docs.filter(doc => doc.data().type === 'expense').reduce((sum, doc) => sum + doc.data().amount, 0);
    const totalInventoryEntries = invSnap.docs.filter(doc => doc.data().type === 'entry').reduce((sum, doc) => sum + doc.data().quantity, 0);
    const totalInventoryExits = invSnap.docs.filter(doc => doc.data().type === 'exit').reduce((sum, doc) => sum + doc.data().quantity, 0);

    try {
      await addDoc(collection(db, 'closures'), {
        type,
        startDate,
        endDate,
        totalSales,
        totalExpenses,
        totalInventoryEntries,
        totalInventoryExits,
        totalSalesItems,
        netProfit: totalSales - totalExpenses,
        timestamp: new Date().toISOString(),
        operatorName: user.displayName,
        createdBy: user.uid,
      });
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'closures');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-lg"
        >
          <PieChart size={20} />
          Generar Cierre
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {closures.map((closure) => (
          <div key={closure.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-100 rounded-xl">
                <FileText size={24} className="text-stone-600" />
              </div>
              <div>
                <h4 className="font-bold capitalize">Cierre {closure.type}</h4>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-stone-500">
                    {format(new Date(closure.startDate), 'd MMM', { locale: es })} - {format(new Date(closure.endDate), 'd MMM, yyyy', { locale: es })}
                  </p>
                  <span className="text-[10px] text-stone-300">•</span>
                  <p className="text-[10px] text-stone-500 font-medium uppercase">Op: {closure.operatorName || 'Sistema'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1 max-w-5xl">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Ventas ($)</p>
                <p className="text-sm font-bold text-emerald-600">${closure.totalSales.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Items Vendidos</p>
                <p className="text-sm font-bold text-stone-600">{closure.totalSalesItems || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Gastos</p>
                <p className="text-sm font-bold text-rose-600">${closure.totalExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Entradas Almacén</p>
                <p className="text-sm font-bold text-blue-600">{closure.totalInventoryEntries || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Salidas Almacén</p>
                <p className="text-sm font-bold text-orange-600">{closure.totalInventoryExits || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Neto</p>
                <p className="text-sm font-bold text-stone-900">${closure.netProfit.toLocaleString()}</p>
              </div>
            </div>

            <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
              <Download size={20} />
            </button>
          </div>
        ))}

        {closures.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-stone-300 text-center">
            <Calendar size={48} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-500">No hay cierres generados aún.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6">Generar Nuevo Cierre</h3>
            <div className="space-y-4">
              <p className="text-sm text-stone-500">Selecciona el periodo para el cierre financiero automático.</p>
              <div className="grid grid-cols-1 gap-2">
                {(['daily', 'decadal', 'monthly', 'annual'] as ClosureType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      type === t ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="font-bold capitalize">{t === 'daily' ? 'Diario' : t === 'decadal' ? 'Decadal' : t === 'monthly' ? 'Mensual' : 'Anual'}</p>
                    <p className={`text-xs ${type === t ? 'text-stone-300' : 'text-stone-500'}`}>
                      {t === 'daily' ? 'Hoy' : t === 'decadal' ? 'Últimos 10 días' : t === 'monthly' ? 'Mes actual' : 'Año actual'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold border border-stone-200 hover:bg-stone-50">Cancelar</button>
                <button onClick={handleGenerateClick} className="flex-1 py-3 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800">Generar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={generateClosure}
        title="Validar Generación de Cierre"
        description="Se requiere el código de autorización del administrador para generar un nuevo cierre financiero."
      />
    </div>
  );
}
