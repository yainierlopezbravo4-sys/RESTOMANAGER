import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem, InventoryTransaction } from '../types';
import { Plus, Package, ArrowUp, ArrowDown, Search, Truck, History } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../utils';
import ValidationModal from './ValidationModal';

export default function Inventory({ user }: { user: any }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'item' | 'transaction'>('item');
  
  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('un');
  const [minStock, setMinStock] = useState('5');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [txType, setTxType] = useState<'entry' | 'exit'>('entry');
  const [txQty, setTxQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [invoice, setInvoice] = useState('');
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribeItems = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    const unsubscribeTx = onSnapshot(collection(db, 'inventoryTransactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventoryTransactions');
    });

    return () => {
      unsubscribeItems();
      unsubscribeTx();
    };
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    const uPrice = Number(unitPrice);
    const tVal = Number(totalValue) || (qty * uPrice);

    setPendingData({
      type: 'new_item',
      code,
      name,
      quantity: qty,
      unit,
      minStock: Number(minStock),
      unitPrice: uPrice,
      totalValue: tVal
    });
    setIsValidationOpen(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !txQty) return;

    const qty = Number(txQty);
    const uPrice = Number(unitPrice);
    const tVal = Number(totalValue) || (qty * uPrice);
    const item = items.find(i => i.id === selectedItemId);

    setPendingData({
      type: 'transaction',
      itemId: selectedItemId,
      txType,
      quantity: qty,
      unitPrice: txType === 'entry' ? uPrice : 0,
      totalValue: txType === 'entry' ? tVal : 0,
      invoice,
      itemName: item?.name
    });
    setIsValidationOpen(true);
  };

  const handleValidationSuccess = async (validatedUser: any) => {
    if (!pendingData) return;
    setLoading(true);
    const toastId = toast.loading("Procesando inventario...");

    try {
      if (pendingData.type === 'new_item') {
        const { code, name, quantity, unit, minStock, unitPrice, totalValue } = pendingData;
        const itemRef = await addDoc(collection(db, 'inventory'), {
          code,
          name,
          quantity,
          unit,
          minStock,
        });

        if (quantity > 0) {
          // Record transaction
          await addDoc(collection(db, 'inventoryTransactions'), {
            itemId: itemRef.id,
            type: 'entry',
            quantity,
            unitPrice,
            totalValue,
            timestamp: new Date().toISOString(),
            operatorName: validatedUser.displayName,
            createdBy: validatedUser.uid,
          });

          // Record expense
          await addDoc(collection(db, 'financials'), {
            type: 'expense',
            amount: totalValue,
            description: `Stock inicial: ${name}`,
            status: 'paid',
            timestamp: new Date().toISOString(),
            operatorName: validatedUser.displayName,
            createdBy: validatedUser.uid,
          });
        }
      } else if (pendingData.type === 'transaction') {
        const { itemId, txType, quantity, unitPrice, totalValue, invoice, itemName } = pendingData;
        const finalQty = txType === 'entry' ? quantity : -quantity;

        await addDoc(collection(db, 'inventoryTransactions'), {
          itemId,
          type: txType,
          quantity,
          unitPrice,
          totalValue,
          invoiceNumber: invoice,
          timestamp: new Date().toISOString(),
          operatorName: validatedUser.displayName,
          createdBy: validatedUser.uid,
        });

        if (txType === 'entry' && totalValue > 0) {
          // Record expense
          await addDoc(collection(db, 'financials'), {
            type: 'expense',
            amount: totalValue,
            description: `Compra inventario: ${itemName || 'Producto'}`,
            status: 'paid',
            timestamp: new Date().toISOString(),
            operatorName: validatedUser.displayName,
            createdBy: validatedUser.uid,
          });
        }

        await updateDoc(doc(db, 'inventory', itemId), {
          quantity: increment(finalQty)
        });
      }

      toast.success("Inventario actualizado con éxito", { id: toastId });
      setIsModalOpen(false);
      resetForm();
      setPendingData(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
      toast.error("Error al actualizar el inventario", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode(''); setName(''); setQuantity(''); setUnit('un'); setMinStock('5');
    setSelectedItemId(''); setTxQty(''); setInvoice('');
    setUnitPrice(''); setTotalValue('');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={() => { setModalType('item'); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-lg"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
          <button 
            onClick={() => { setModalType('transaction'); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-white border border-stone-200 text-stone-900 px-4 py-2 rounded-xl hover:bg-stone-50 transition-all"
          >
            <History size={20} />
            Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Package size={20} />
            Existencias Actuales
          </h3>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-stone-500">{item.code || '-'}</td>
                    <td className="px-6 py-4 font-medium">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold">{item.quantity}</span> {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      {item.quantity <= item.minStock ? (
                        <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-600 rounded-full">Bajo Stock</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History size={20} />
            Últimos Movimientos
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
            {transactions.slice(0, 8).map((tx) => {
              const item = items.find(i => i.id === tx.itemId);
              return (
                <div key={tx.id} className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${tx.type === 'entry' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {tx.type === 'entry' ? <ArrowDown size={16} className="text-emerald-600" /> : <ArrowUp size={16} className="text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item?.name || 'Desconocido'}</p>
                    <p className="text-[10px] text-stone-500 font-medium uppercase">Op: {tx.operatorName || 'Sistema'}</p>
                    <p className="text-xs text-stone-400">
                      {format(new Date(tx.timestamp), 'd MMM, HH:mm', { locale: es })}
                      {tx.totalValue ? ` • $${tx.totalValue.toLocaleString()}` : ''}
                    </p>
                  </div>
                  <div className={`text-sm font-bold ${tx.type === 'entry' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.type === 'entry' ? '+' : '-'}{tx.quantity}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{modalType === 'item' ? 'Nuevo Producto' : 'Registrar Movimiento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            {modalType === 'item' ? (
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Código</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" placeholder="INT-001" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Stock Inicial</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unidad</label>
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg">
                      <option value="un">Unidades</option>
                      <option value="kg">Kilos</option>
                      <option value="lt">Litros</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio Unitario</label>
                    <input 
                      type="number" 
                      value={unitPrice} 
                      onChange={e => {
                        setUnitPrice(e.target.value);
                        if (quantity) setTotalValue((Number(quantity) * Number(e.target.value)).toString());
                      }} 
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor Total</label>
                    <input 
                      type="number" 
                      value={totalValue} 
                      onChange={e => setTotalValue(e.target.value)} 
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold">Guardar Producto</button>
              </form>
            ) : (
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Producto</label>
                  <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required>
                    <option value="">Seleccionar...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <select value={txType} onChange={e => setTxType(e.target.value as any)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg">
                      <option value="entry">Entrada (Factura)</option>
                      <option value="exit">Salida (Pedido)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cantidad</label>
                    <input type="number" value={txQty} onChange={e => setTxQty(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" required />
                  </div>
                </div>
                {txType === 'entry' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Precio Unitario</label>
                        <input 
                          type="number" 
                          value={unitPrice} 
                          onChange={e => {
                            setUnitPrice(e.target.value);
                            if (txQty) setTotalValue((Number(txQty) * Number(e.target.value)).toString());
                          }} 
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor Total</label>
                        <input 
                          type="number" 
                          value={totalValue} 
                          onChange={e => setTotalValue(e.target.value)} 
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nº Factura</label>
                      <input type="text" value={invoice} onChange={e => setInvoice(e.target.value)} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg" />
                    </div>
                  </>
                )}
                <button type="submit" className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold">Registrar Movimiento</button>
              </form>
            )}
          </motion.div>
        </div>
      )}

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={handleValidationSuccess}
        title="Confirmar Movimiento"
        description={pendingData?.type === 'new_item' 
          ? `Vas a registrar un nuevo producto: ${pendingData.name} con un stock inicial de ${pendingData.quantity} ${pendingData.unit}.`
          : `Vas a registrar una ${pendingData?.txType === 'entry' ? 'ENTRADA' : 'SALIDA'} de ${pendingData?.quantity} unidades para el producto: ${pendingData?.itemName}.`}
      />
    </div>
  );
}
