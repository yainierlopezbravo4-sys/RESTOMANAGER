import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Sale, Platform, SaleItem, PaymentMethod, PaymentSettings } from '../types';
import { Plus, ShoppingCart, Smartphone, Store, Search, Filter, Printer, Eye, Trash2, Calendar, X, CreditCard, Banknote, QrCode, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../utils';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { doc, getDoc } from 'firebase/firestore';
import ValidationModal from './ValidationModal';

const PixPaymentModal = ({ sale, onContinue }: { sale: Sale; onContinue: () => void }) => {
  const pixPayload = `pix://${sale.pixKeyUsed}?amount=${sale.amount}&id=${sale.id}`;

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-stone-900 p-6 text-white text-center">
          <QrCode size={40} className="mx-auto mb-2 text-stone-400" />
          <h3 className="text-xl font-bold">Pago con Pix</h3>
          <p className="text-stone-400 text-xs mt-1">Escanea el código para completar el pago</p>
        </div>
        
        <div className="p-8 flex flex-col items-center gap-6">
          <div className="bg-stone-50 p-6 rounded-2xl border-2 border-stone-100 shadow-inner">
            <QRCodeSVG value={pixPayload} size={200} />
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Monto a Pagar</p>
            <p className="text-3xl font-black text-stone-900">${sale.amount.toLocaleString()}</p>
          </div>

          <div className="w-full p-3 bg-stone-50 rounded-xl border border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Llave Pix</p>
            <p className="text-xs font-mono break-all text-stone-600">{sale.pixKeyUsed}</p>
          </div>

          <button 
            onClick={onContinue}
            className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            Generar Comprobante
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Receipt = ({ sale, onClose }: { sale: Sale; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-[350px] font-mono text-[10px] text-stone-900 relative"
      >
        <div className="text-center mb-4 border-b border-dashed border-stone-300 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-tighter">{sale.sender || 'RestoManager Pro'}</h2>
          <p className="text-[8px] text-stone-500 mt-1">Factura de Venta / Comprobante</p>
        </div>

        <div className="space-y-1 mb-4">
          <div className="flex justify-between">
            <span>FECHA:</span>
            <span>{format(new Date(sale.timestamp), 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span>HORA:</span>
            <span>{format(new Date(sale.timestamp), 'HH:mm:ss')}</span>
          </div>
          <div className="flex justify-between">
            <span>DESTINATARIO:</span>
            <span className="uppercase truncate max-w-[150px]">{sale.recipient || 'CLIENTE FINAL'}</span>
          </div>
          <div className="flex justify-between">
            <span>MÉTODO PAGO:</span>
            <span className="uppercase font-bold">{sale.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>ID:</span>
            <span className="text-[8px]">{sale.id}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 mt-1 pt-1">
            <span>OPERADOR:</span>
            <span className="uppercase font-bold">{sale.operatorName || 'SISTEMA'}</span>
          </div>
        </div>

        <div className="border-y border-dashed border-stone-300 py-2 mb-4">
          <div className="flex justify-between font-bold mb-1">
            <span className="w-1/2">ITEM</span>
            <span className="w-1/6 text-right">CANT</span>
            <span className="w-1/3 text-right">TOTAL</span>
          </div>
          {sale.items && sale.items.length > 0 ? (
            sale.items.map((item, i) => (
              <div key={i} className="mb-1">
                <div className="flex justify-between">
                  <span className="w-1/2 truncate">{item.name}</span>
                  <span className="w-1/6 text-right">{item.quantity}</span>
                  <span className="w-1/3 text-right">${(item.price * item.quantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[8px] text-stone-500">
                  <span>Cód: {item.code || 'N/A'}</span>
                  <span>Unit: ${item.price.toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex justify-between">
              <span>VENTA GENERAL</span>
              <span>${sale.amount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between text-sm font-bold mb-6">
          <span>TOTAL:</span>
          <span>${sale.amount.toLocaleString()}</span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-[8px] text-stone-400 text-center">Rastreable hasta el lugar de origen</p>
          <div className="bg-white p-2 border border-stone-100 rounded">
            <Barcode 
              value={sale.id || '00000000'} 
              width={1} 
              height={40} 
              fontSize={8}
              background="transparent"
            />
          </div>
          <div className="text-[7px] text-stone-400 text-center mt-2">
            <p>IMPRESO EL: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            <p>OPERADOR: {sale.operatorName || 'SISTEMA'}</p>
          </div>
        </div>

        <div className="mt-8 flex gap-2 no-print">
          <button 
            onClick={() => window.print()}
            className="flex-1 bg-stone-900 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-xs"
          >
            <Printer size={14} />
            Imprimir
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-stone-100 text-stone-900 py-2 rounded-lg font-bold text-xs"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function Sales({ user }: { user: any }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [platform, setPlatform] = useState<Platform>('in-store');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedPixKey, setSelectedPixKey] = useState('');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [sender, setSender] = useState('RestoManager Pro');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState<Sale | null>(null);
  const [showPixModal, setShowPixModal] = useState<Sale | null>(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [pendingSaleData, setPendingSaleData] = useState<any>(null);
  
  // New sale item state
  const [newItems, setNewItems] = useState<SaleItem[]>([]);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(100));

    if (startDate || endDate) {
      const constraints: any[] = [orderBy('timestamp', 'desc'), limit(100)];
      if (startDate) {
        constraints.push(where('timestamp', '>=', new Date(startDate).toISOString()));
      }
      if (endDate) {
        // Add one day to end date to include the whole day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        constraints.push(where('timestamp', '<=', end.toISOString()));
      }
      q = query(collection(db, 'sales'), ...constraints);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sales'));

    // Fetch payment settings
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'payments'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as PaymentSettings;
          setPaymentSettings(data);
          if (data.pixKeys.length > 0) setSelectedPixKey(data.pixKeys[0]);
        }
      } catch (error) {
        console.error('Error fetching payment settings:', error);
      }
    };
    fetchSettings();

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = newItems.length > 0 
      ? newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      : Number(amount);

    if (!finalAmount || isNaN(finalAmount)) return;

    setPendingSaleData({
      amount: finalAmount,
      platform,
      paymentMethod,
      sender,
      recipient,
      timestamp: new Date().toISOString(),
      createdBy: user.uid,
      operatorName: user.displayName,
      items: newItems,
      ...(paymentMethod === 'pix' && { pixKeyUsed: selectedPixKey })
    });
    setIsValidationOpen(true);
  };

  const handleValidationSuccess = async (validatedUser: any) => {
    if (!pendingSaleData) return;

    setLoading(true);
    try {
      const saleData = {
        ...pendingSaleData,
        operatorName: validatedUser.displayName,
        createdBy: validatedUser.uid
      };
      const docRef = await addDoc(collection(db, 'sales'), saleData);
      const saleWithId = { id: docRef.id, ...saleData };
      
      if (paymentMethod === 'pix') {
        setShowPixModal(saleWithId);
      } else {
        setShowReceipt(saleWithId);
      }
      
      setIsModalOpen(false);
      setAmount('');
      setNewItems([]);
      setPendingSaleData(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sales');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!itemName || !itemPrice) return;
    setNewItems([...newItems, {
      code: itemCode,
      name: itemName,
      quantity: Number(itemQty),
      price: Number(itemPrice)
    }]);
    setItemCode('');
    setItemName('');
    setItemQty('1');
    setItemPrice('');
  };

  const removeItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar ventas..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            <Filter size={20} />
          </button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-lg whitespace-nowrap"
        >
          <Plus size={20} />
          Registrar Venta
        </button>
      </div>

      {showFilters && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Fecha Inicio</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Fecha Fin</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-all text-sm font-bold"
            >
              <X size={14} />
              Limpiar
            </button>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Fecha / Hora</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Plataforma</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium">{format(new Date(sale.timestamp), 'd MMM, yyyy', { locale: es })}</p>
                  <p className="text-xs text-stone-400">{format(new Date(sale.timestamp), 'HH:mm')}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {sale.platform === 'in-store' ? <Store size={16} className="text-stone-500" /> : <Smartphone size={16} className="text-orange-500" />}
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      sale.platform === 'in-store' ? 'bg-stone-100 text-stone-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {sale.platform}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-stone-900">${sale.amount.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                      title="Ver Detalles"
                    >
                      <Eye size={18} />
                    </button>
                    <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                      <Printer size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="p-12 text-center">
            <ShoppingCart size={48} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-500">No se han registrado ventas aún.</p>
          </div>
        )}
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
              <h3 className="text-xl font-bold">Nueva Venta</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Remitente</label>
                  <input 
                    type="text" 
                    value={sender}
                    onChange={e => setSender(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Destinatario</label>
                  <input 
                    type="text" 
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-stone-700">Items (Opcional)</label>
                  <span className="text-xs text-stone-400">Agrega productos para detalle</span>
                </div>
                
                <div className="grid grid-cols-12 gap-2">
                  <input 
                    type="text" 
                    placeholder="Cód"
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    className="col-span-2 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  />
                  <input 
                    type="text" 
                    placeholder="Producto"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    className="col-span-3 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  />
                  <input 
                    type="number" 
                    placeholder="Cant"
                    value={itemQty}
                    onChange={e => setItemQty(e.target.value)}
                    className="col-span-2 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  />
                  <input 
                    type="number" 
                    placeholder="Precio"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value)}
                    className="col-span-3 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  />
                  <button 
                    type="button"
                    onClick={addItem}
                    className="col-span-2 flex items-center justify-center bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {newItems.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {newItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-lg border border-stone-100">
                        <span className="font-medium flex-1">
                          {item.code && <span className="text-[10px] text-stone-400 mr-1">[{item.code}]</span>}
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-bold mr-3">${(item.price * item.quantity).toLocaleString()}</span>
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {newItems.length > 0 ? 'Total Calculado' : 'Monto Total Manual'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={newItems.length > 0 ? newItems.reduce((s, i) => s + (i.price * i.quantity), 0) : amount}
                    onChange={(e) => setAmount(e.target.value)}
                    readOnly={newItems.length > 0}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all text-lg font-bold ${
                      newItems.length > 0 ? 'bg-stone-100 border-transparent text-stone-500' : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Plataforma</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['in-store', 'iFood', '99food'] as Platform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        platform === p 
                          ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                          : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                      paymentMethod === 'cash' ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-500'
                    }`}
                  >
                    <Banknote size={16} />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                      paymentMethod === 'pix' ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-500'
                    }`}
                  >
                    <QrCode size={16} />
                    Pix
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ted')}
                    className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                      paymentMethod === 'ted' ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-500'
                    }`}
                  >
                    <CreditCard size={16} />
                    TED
                  </button>
                </div>
              </div>

              {paymentMethod === 'pix' && paymentSettings && paymentSettings.pixKeys.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Llave Pix para Cobro</label>
                  <select 
                    value={selectedPixKey}
                    onChange={e => setSelectedPixKey(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                  >
                    {paymentSettings.pixKeys.map((key, i) => (
                      <option key={i} value={key}>{key}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Confirmar Venta'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Detalle de Venta</h3>
                <p className="text-stone-400 text-xs mt-1">ID: {selectedSale.id}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowReceipt(selectedSale)}
                  className="p-2 text-stone-400 hover:text-white transition-colors"
                  title="Imprimir Comprobante"
                >
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelectedSale(null)} className="text-stone-400 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Fecha y Hora</p>
                  <p className="text-sm font-semibold">
                    {format(new Date(selectedSale.timestamp), "d 'de' MMMM, HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Plataforma</p>
                  <div className="flex items-center gap-2">
                    {selectedSale.platform === 'in-store' ? <Store size={14} /> : <Smartphone size={14} />}
                    <span className="text-sm font-semibold capitalize">{selectedSale.platform}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Método de Pago</p>
                  <div className="flex items-center gap-2">
                    {selectedSale.paymentMethod === 'cash' && <Banknote size={14} />}
                    {selectedSale.paymentMethod === 'pix' && <QrCode size={14} />}
                    {selectedSale.paymentMethod === 'ted' && <CreditCard size={14} />}
                    <span className="text-sm font-semibold capitalize">{selectedSale.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Productos</p>
                {selectedSale.items && selectedSale.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSale.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                        <div>
                          <p className="text-sm font-bold">
                            {item.code && <span className="text-[10px] text-stone-400 mr-2 font-mono">[{item.code}]</span>}
                            {item.name}
                          </p>
                          <p className="text-xs text-stone-500">Cantidad: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold">${(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-stone-50 p-6 rounded-xl text-center border border-dashed border-stone-200">
                    <p className="text-sm text-stone-400 italic">No hay items detallados para esta venta</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-stone-200 flex items-center justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-black text-stone-900">${selectedSale.amount.toLocaleString()}</span>
              </div>

              <button 
                onClick={() => setSelectedSale(null)}
                className="w-full bg-stone-100 text-stone-900 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Receipt Modal */}
      {showReceipt && (
        <Receipt sale={showReceipt} onClose={() => setShowReceipt(null)} />
      )}
      {/* Pix Modal */}
      {showPixModal && (
        <PixPaymentModal 
          sale={showPixModal} 
          onContinue={() => {
            setShowReceipt(showPixModal);
            setShowPixModal(null);
          }} 
        />
      )}

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={handleValidationSuccess}
        title="Confirmar Venta"
        description="Para finalizar el registro de esta venta, por favor ingrese sus credenciales de validación."
      />
    </div>
  );
}
