import React, { useRef, useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { Printer, FileText, CreditCard, QrCode, Settings, Trash2, Plus, User, Building, Database, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PaymentSettings } from '../types';
import { handleFirestoreError, OperationType } from '../utils';
import ValidationModal from './ValidationModal';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';

export default function Tools({ user }: { user: any }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS;
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    pixKeys: [],
    tedAccounts: []
  });
  const [newPixKey, setNewPixKey] = useState('');
  const [newTed, setNewTed] = useState({ bank: '', agency: '', account: '', owner: '' });
  const [selectedPix, setSelectedPix] = useState('');
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: 'INV-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    date: format(new Date(), 'yyyy-MM-dd'),
    sender: {
      name: 'RESTOMANAGER PRO S.A.',
      address: 'Calle Falsa 123, Ciudad',
      phone: '(555) 123-4567',
      email: 'contacto@restomanager.pro'
    },
    recipient: {
      name: t('tools.generic_client'),
      address: t('tools.client_address'),
      phone: '',
      email: ''
    },
    items: [
      { code: 'P001', name: t('tools.sample_item_1'), quantity: 2, unitPrice: 15.50, total: 31.00 },
      { code: 'P002', name: t('tools.sample_item_2'), quantity: 3, unitPrice: 3.00, total: 9.00 },
    ],
    notes: t('tools.thanks_note'),
    total: 40.00
  });

  const [newItem, setNewItem] = useState({ code: '', name: '', quantity: 1, unitPrice: 0 });
  const [isBackingUp, setIsBackingUp] = useState(false);

  const downloadBackup = async () => {
    setIsBackingUp(true);
    try {
      // Fetch all data
      const [salesSnap, finSnap, invTransSnap, inventorySnap] = await Promise.all([
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'financials')),
        getDocs(collection(db, 'inventoryTransactions')),
        getDocs(collection(db, 'inventory'))
      ]);

      const wb = XLSX.utils.book_new();

      // Sales Sheet
      const salesData = salesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ID: doc.id,
          [t('reports.date')]: format(new Date(data.timestamp), 'dd/MM/yyyy HH:mm'),
          [t('reports.value')]: data.amount,
          [t('sales.platform')]: data.platform,
          [t('sales.payment_method')]: data.paymentMethod,
          [t('reports.operator')]: data.operatorName || 'N/A',
          [t('sales.items')]: (data.items || []).map((i: any) => `${i.name} (x${i.quantity})`).join(', ')
        };
      });
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, t('nav.sales'));

      // Financials Sheet (Expenses, Payables, Receivables)
      const finData = finSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ID: doc.id,
          [t('financials.table.type')]: data.type,
          [t('financials.table.description')]: data.description,
          [t('inventory.invoice')]: data.invoiceNumber || 'N/A',
          [t('reports.value')]: data.amount,
          [t('financials.table.status')]: data.status,
          [t('financials.table.due_date')]: data.dueDate ? format(new Date(data.dueDate), 'dd/MM/yyyy') : 'N/A',
          [t('reports.date')]: format(new Date(data.timestamp), 'dd/MM/yyyy HH:mm'),
          [t('reports.operator')]: data.operatorName || 'N/A'
        };
      });
      const wsFin = XLSX.utils.json_to_sheet(finData);
      XLSX.utils.book_append_sheet(wb, wsFin, t('nav.financials'));

      // Inventory Transactions Sheet
      const invTransData = invTransSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ID: doc.id,
          Item_ID: data.itemId,
          [t('financials.table.type')]: data.type === 'entry' ? t('reports.entries') : t('reports.exits'),
          [t('reports.qty')]: data.quantity,
          [t('reports.unit_price')]: data.unitPrice || 0,
          [t('reports.total')]: data.totalValue || 0,
          [t('inventory.invoice')]: data.invoiceNumber || 'N/A',
          [t('reports.date')]: format(new Date(data.timestamp), 'dd/MM/yyyy HH:mm'),
          [t('reports.operator')]: data.operatorName || 'N/A'
        };
      });
      const wsInvTrans = XLSX.utils.json_to_sheet(invTransData);
      XLSX.utils.book_append_sheet(wb, wsInvTrans, t('inventory.movements'));

      // Inventory Catalog Sheet
      const inventoryData = inventorySnap.docs.map(doc => {
        const data = doc.data();
        return {
          ID: doc.id,
          [t('inventory.table.code')]: data.code || 'N/A',
          [t('inventory.table.product')]: data.name,
          [t('inventory.table.stock')]: data.quantity,
          [t('inventory.table.unit')]: data.unit,
          [t('inventory.table.min')]: data.minStock
        };
      });
      const wsInv = XLSX.utils.json_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(wb, wsInv, t('inventory.catalog'));

      // Generate and Download
      XLSX.writeFile(wb, `Backup_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'backup_generation');
    } finally {
      setIsBackingUp(false);
    }
  };

  const addInvoiceItem = () => {
    if (!newItem.name || newItem.unitPrice <= 0) return;
    const itemTotal = newItem.quantity * newItem.unitPrice;
    const updatedItems = [...invoiceData.items, { ...newItem, total: itemTotal }];
    const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    setInvoiceData({ ...invoiceData, items: updatedItems, total: newTotal });
    setNewItem({ code: '', name: '', quantity: 1, unitPrice: 0 });
  };

  const removeInvoiceItem = (index: number) => {
    const updatedItems = invoiceData.items.filter((_, i) => i !== index);
    const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    setInvoiceData({ ...invoiceData, items: updatedItems, total: newTotal });
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payments'), (snapshot) => {
      if (snapshot.exists()) {
        setPaymentSettings(snapshot.data() as PaymentSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/payments');
    });
    return () => unsub();
  }, []);

  const saveSettings = async (newSettings: PaymentSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'payments'), newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/payments');
    }
  };

  const addPixKey = () => {
    if (!newPixKey) return;
    const updated = { ...paymentSettings, pixKeys: [...paymentSettings.pixKeys, newPixKey] };
    saveSettings(updated);
    setNewPixKey('');
  };

  const removePixKey = (index: number) => {
    const updated = { ...paymentSettings, pixKeys: paymentSettings.pixKeys.filter((_, i) => i !== index) };
    saveSettings(updated);
  };

  const addTedAccount = () => {
    if (!newTed.bank || !newTed.account) return;
    const updated = { ...paymentSettings, tedAccounts: [...paymentSettings.tedAccounts, newTed] };
    saveSettings(updated);
    setNewTed({ bank: '', agency: '', account: '', owner: '' });
  };

  const removeTedAccount = (index: number) => {
    const updated = { ...paymentSettings, tedAccounts: paymentSettings.tedAccounts.filter((_, i) => i !== index) };
    saveSettings(updated);
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handlePrintClick = () => {
    setIsValidationOpen(true);
  };

  const onValidationSuccess = () => {
    handlePrint();
    setIsValidationOpen(false);
  };

  return (
    <div className="space-y-8">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: A4; margin: 0; }
          body { margin: 0; }
        }
      `}} />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Backup and General Tools */}
        <div className="xl:col-span-3">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-100 rounded-xl text-stone-900">
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t('tools.data_backup')}</h3>
                <p className="text-xs text-stone-500">{t('tools.data_backup_desc')}</p>
              </div>
            </div>
            <button 
              onClick={downloadBackup}
              disabled={isBackingUp}
              className="w-full md:w-auto px-8 py-3 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50"
            >
              {isBackingUp ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Download size={18} />
              )}
              {isBackingUp ? t('app.generating') : t('tools.download_excel')}
            </button>
          </div>
        </div>

        {/* Invoice Configuration */}
        <div className="xl:col-span-1 space-y-6 no-print">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} />
              {t('tools.invoice_config')}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('inventory.invoice')} Nº</label>
                  <input 
                    type="text" 
                    value={invoiceData.invoiceNumber}
                    onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.date')}</label>
                  <input 
                    type="date" 
                    value={invoiceData.date}
                    onChange={e => setInvoiceData({ ...invoiceData, date: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('tools.client')}</label>
                <input 
                  type="text" 
                  placeholder={t('tools.client_name')}
                  value={invoiceData.recipient.name}
                  onChange={e => setInvoiceData({ ...invoiceData, recipient: { ...invoiceData.recipient, name: e.target.value } })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs mb-2"
                />
                <input 
                  type="text" 
                  placeholder={t('settings.address')}
                  value={invoiceData.recipient.address}
                  onChange={e => setInvoiceData({ ...invoiceData, recipient: { ...invoiceData.recipient, address: e.target.value } })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-4 border-t border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">{t('tools.add_item')}</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input 
                    type="text" 
                    placeholder={t('inventory.table.product')}
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                  <input 
                    type="text" 
                    placeholder={t('inventory.table.code')}
                    value={newItem.code}
                    onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                    className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input 
                    type="number" 
                    placeholder={t('reports.qty')}
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                  <input 
                    type="number" 
                    placeholder={t('reports.unit_price')}
                    value={newItem.unitPrice}
                    onChange={e => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                    className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                  <button 
                    onClick={addInvoiceItem}
                    className="bg-stone-900 text-white rounded-lg flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {invoiceData.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] bg-stone-50 p-1 rounded border border-stone-100">
                      <span className="truncate flex-1">{item.name} x{item.quantity}</span>
                      <button onClick={() => removeInvoiceItem(i)} className="text-rose-500 ml-2">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('tools.notes')}</label>
                <textarea 
                  value={invoiceData.notes}
                  onChange={e => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs h-20 resize-none"
                />
              </div>

              <button 
                onClick={handlePrintClick}
                className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg"
              >
                <Printer size={18} />
                {t('tools.print_invoice')}
              </button>
            </div>
          </div>
        </div>

        {/* A4 Preview */}
        <div className="xl:col-span-2 bg-stone-100 p-4 md:p-8 rounded-2xl border border-stone-200 flex justify-center overflow-x-auto">
          <div 
            ref={receiptRef}
            className="bg-white shadow-2xl print:shadow-none"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '20mm',
              boxSizing: 'border-box',
              backgroundColor: 'white'
            }}
          >
            {/* A4 Content */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-3xl font-black text-stone-900 mb-2">{invoiceData.sender.name}</h1>
                <div className="text-xs text-stone-500 space-y-1">
                  <p>{invoiceData.sender.address}</p>
                  <p>Tel: {invoiceData.sender.phone}</p>
                  <p>Email: {invoiceData.sender.email}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-light text-stone-300 uppercase tracking-widest mb-4">{t('tools.invoice').toUpperCase()}</h2>
                <div className="space-y-1">
                  <p className="text-xs font-bold">Nº: <span className="text-stone-500 font-normal">{invoiceData.invoiceNumber}</span></p>
                  <p className="text-xs font-bold">{t('reports.date').toUpperCase()}: <span className="text-stone-500 font-normal">{invoiceData.date}</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">{t('tools.bill_to').toUpperCase()}</h3>
                <div className="text-sm space-y-1">
                  <p className="font-bold">{invoiceData.recipient.name}</p>
                  <p className="text-stone-500">{invoiceData.recipient.address}</p>
                  {invoiceData.recipient.phone && <p className="text-stone-500">Tel: {invoiceData.recipient.phone}</p>}
                </div>
              </div>
            </div>

            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-stone-900 text-left">
                  <th className="py-3 text-[10px] font-bold uppercase tracking-wider">{t('inventory.table.code').toUpperCase()}</th>
                  <th className="py-3 text-[10px] font-bold uppercase tracking-wider">{t('financials.table.description').toUpperCase()}</th>
                  <th className="py-3 text-[10px] font-bold uppercase tracking-wider text-right">{t('reports.qty').toUpperCase()}</th>
                  <th className="py-3 text-[10px] font-bold uppercase tracking-wider text-right">{t('reports.unit_price').toUpperCase()}</th>
                  <th className="py-3 text-[10px] font-bold uppercase tracking-wider text-right">{t('reports.total').toUpperCase()}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoiceData.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-4 text-xs font-mono text-stone-400">{item.code || '---'}</td>
                    <td className="py-4 text-xs font-medium">{item.name}</td>
                    <td className="py-4 text-xs text-right">{item.quantity}</td>
                    <td className="py-4 text-xs text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-4 text-xs text-right font-bold">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-start">
              <div className="w-1/2">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">{t('tools.notes').toUpperCase()}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{invoiceData.notes}</p>
              </div>
              <div className="w-1/3">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">{t('reports.subtotal')}</span>
                    <span>${invoiceData.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">{t('reports.taxes')} (0%)</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-stone-900">
                    <span className="text-sm font-bold">TOTAL</span>
                    <span className="text-2xl font-black">${invoiceData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-24 pt-12 border-t border-stone-100 flex justify-between items-end">
              <div className="text-center w-48">
                <div className="border-t border-stone-300 pt-2">
                  <p className="text-[10px] font-bold uppercase">{t('tools.authorized_signature')}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[8px] text-stone-400 uppercase mb-2">
                  <p>{t('reports.operator')}: {user.displayName || t('app.system')}</p>
                  <p>{t('reports.printed')}: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>
                <Barcode value={invoiceData.invoiceNumber} width={1} height={30} fontSize={8} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={onValidationSuccess}
        title={t('tools.validate_print')}
        description={t('tools.validate_print_desc')}
      />
    </div>
  );
}
