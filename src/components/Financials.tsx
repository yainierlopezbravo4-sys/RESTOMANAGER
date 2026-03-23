import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FinancialRecord, FinancialType } from '../types';
import { Plus, DollarSign, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../utils';

export default function Financials({ user }: { user: any }) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [type, setType] = useState<FinancialType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'financials'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'financials');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'financials'), {
        type,
        amount: Number(amount),
        description,
        dueDate: dueDate || null,
        invoiceNumber: invoiceNumber || null,
        status: type === 'payable' || type === 'receivable' ? 'pending' : 'paid',
        timestamp: new Date().toISOString(),
        operatorName: user.displayName,
        createdBy: user.uid,
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'financials');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (record: FinancialRecord) => {
    if (!record.id) return;
    try {
      await updateDoc(doc(db, 'financials', record.id), {
        status: record.status === 'pending' ? 'paid' : 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'financials');
    }
  };

  const resetForm = () => {
    setAmount(''); setDescription(''); setDueDate(''); setType('expense'); setInvoiceNumber('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-lg"
          >
            <Plus size={20} />
            Nuevo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Vencimiento</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{record.description}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-stone-400">{format(new Date(record.timestamp), 'd MMM', { locale: es })}</p>
                      {record.invoiceNumber && (
                        <>
                          <span className="text-[10px] text-stone-300">•</span>
                          <p className="text-[10px] text-stone-500 font-medium uppercase">Fact: {record.invoiceNumber}</p>
                        </>
                      )}
                      <span className="text-[10px] text-stone-300">•</span>
                      <p className="text-[10px] text-stone-500 font-medium uppercase">Op: {record.operatorName || 'Sistema'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      record.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                      record.type === 'expense' ? 'bg-rose-100 text-rose-600' :
                      record.type === 'payable' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">
                    {record.dueDate ? format(new Date(record.dueDate), 'd MMM, yyyy', { locale: es }) : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-stone-900">
                    ${record.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleStatus(record)}
                      className={`p-2 rounded-lg transition-colors ${
                        record.status === 'paid' ? 'text-emerald-500 bg-emerald-50' : 'text-stone-300 hover:text-stone-900'
                      }`}
                    >
                      {record.status === 'paid' ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Resumen</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Por Pagar</span>
                <span className="font-bold text-rose-600">
                  ${records.filter(r => r.type === 'payable' && r.status === 'pending').reduce((s, r) => s + r.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Por Cobrar</span>
                <span className="font-bold text-blue-600">
                  ${records.filter(r => r.type === 'receivable' && r.status === 'pending').reduce((s, r) => s + r.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Nuevo Registro Financiero</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['income', 'expense', 'payable', 'receivable'] as FinancialType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        type === t 
                          ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                          : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required />
              </div>
              {type === 'expense' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nº Factura (Opcional)</label>
                  <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" />
                </div>
              )}
              {(type === 'payable' || type === 'receivable') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Vencimiento</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required />
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold mt-4 shadow-lg">
                {loading ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
