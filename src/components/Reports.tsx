import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Closure, Sale, FinancialRecord, ClosureType } from '../types';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, PieChart, Printer, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../utils';
import ValidationModal from './ValidationModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { BusinessSettings } from '../types';
import { useTranslation } from 'react-i18next';

export default function Reports({ user }: { user: any }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS;
  const [closures, setClosures] = useState<Closure[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
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

    // Fetch business settings for PDF header
    const fetchBusinessSettings = async () => {
      try {
        const docSnap = await getDoc(firestoreDoc(db, 'settings', 'business'));
        if (docSnap.exists()) {
          setBusinessSettings(docSnap.data() as BusinessSettings);
        }
      } catch (error) {
        console.error("Error fetching business settings:", error);
      }
    };
    fetchBusinessSettings();

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
    let salesSnap, finSnap, invTransSnap, inventorySnap;
    try {
      salesSnap = await getDocs(query(collection(db, 'sales'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate)));
      finSnap = await getDocs(query(collection(db, 'financials'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate)));
      invTransSnap = await getDocs(query(collection(db, 'inventoryTransactions'), where('timestamp', '>=', startDate), where('timestamp', '<=', endDate)));
      inventorySnap = await getDocs(collection(db, 'inventory'));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'reports_generation');
      return;
    }

    // Process Sales Details
    const salesMap = new Map<string, any>();
    salesSnap.docs.forEach(doc => {
      const data = doc.data();
      (data.items || []).forEach((item: any) => {
        const key = item.code || item.name;
        if (salesMap.has(key)) {
          const existing = salesMap.get(key);
          existing.quantity += item.quantity;
          existing.total += item.quantity * item.price;
        } else {
          salesMap.set(key, {
            code: item.code || 'N/A',
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price
          });
        }
      });
    });
    const salesDetails = Array.from(salesMap.values());

    // Process Expense Details
    const financialExpenses = finSnap.docs
      .filter(doc => doc.data().type === 'expense')
      .map(doc => ({
        invoiceNumber: doc.data().invoiceNumber || 'N/A',
        description: doc.data().description,
        amount: doc.data().amount,
        timestamp: doc.data().timestamp
      }));

    const inventoryPurchases = invTransSnap.docs
      .filter(doc => doc.data().type === 'entry' && doc.data().totalValue > 0)
      .map(doc => {
        const data = doc.data();
        const item = inventorySnap.docs.find(i => i.id === data.itemId)?.data();
        return {
          invoiceNumber: data.invoiceNumber || 'N/A',
          description: `${t('inventory.purchase')}: ${item?.name || t('inventory.product')} (${data.quantity} x $${data.unitPrice})`,
          amount: data.totalValue,
          timestamp: data.timestamp
        };
      });

    const expenseDetails = [...financialExpenses, ...inventoryPurchases];

    // Process Inventory Details
    const inventoryDetails = inventorySnap.docs.map(doc => {
      const item = doc.data();
      const itemId = doc.id;
      const transactions = invTransSnap.docs.filter(t => t.data().itemId === itemId);
      const entries = transactions.filter(t => t.data().type === 'entry').reduce((sum, t) => sum + t.data().quantity, 0);
      const exits = transactions.filter(t => t.data().type === 'exit').reduce((sum, t) => sum + t.data().quantity, 0);
      
      const currentBalance = item.quantity;
      const previousBalance = currentBalance - entries + exits;

      return {
        code: item.code || 'N/A',
        name: item.name,
        previousBalance,
        entries,
        exits,
        currentBalance
      };
    });

    // Process Accounts
    const accountsPayable = finSnap.docs
      .filter(doc => doc.data().type === 'payable')
      .map(doc => ({
        description: doc.data().description,
        amount: doc.data().amount,
        dueDate: doc.data().dueDate,
        status: doc.data().status
      }));

    const accountsReceivable = finSnap.docs
      .filter(doc => doc.data().type === 'receivable')
      .map(doc => ({
        description: doc.data().description,
        amount: doc.data().amount,
        dueDate: doc.data().dueDate,
        status: doc.data().status
      }));

    const totalSales = salesSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    const totalSalesItems = salesSnap.docs.reduce((sum, doc) => {
      const items = doc.data().items || [];
      return sum + items.reduce((s: number, i: any) => s + i.quantity, 0);
    }, 0);
    
    const financialExpensesTotal = finSnap.docs.filter(doc => doc.data().type === 'expense').reduce((sum, doc) => sum + doc.data().amount, 0);
    const inventoryPurchasesTotal = invTransSnap.docs.filter(doc => doc.data().type === 'entry').reduce((sum, doc) => sum + (doc.data().totalValue || 0), 0);
    const totalExpenses = financialExpensesTotal + inventoryPurchasesTotal;

    const totalInventoryEntries = invTransSnap.docs.filter(doc => doc.data().type === 'entry').reduce((sum, doc) => sum + doc.data().quantity, 0);
    const totalInventoryExits = invTransSnap.docs.filter(doc => doc.data().type === 'exit').reduce((sum, doc) => sum + doc.data().quantity, 0);

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
        salesDetails,
        expenseDetails,
        inventoryDetails,
        accountsPayable,
        accountsReceivable,
        timestamp: new Date().toISOString(),
        operatorName: user.displayName,
        createdBy: user.uid,
      });
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'closures');
    }
  };

  const generatePDF = (closure: Closure, action: 'save' | 'preview' = 'save') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Set Font to Courier
    doc.setFont('courier', 'normal');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(28, 25, 23); // stone-900
    doc.text(businessSettings?.name || 'RestoManager Pro', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108); // stone-500
    if (businessSettings?.address) doc.text(businessSettings.address, pageWidth / 2, 26, { align: 'center' });
    if (businessSettings?.phone) doc.text(`Tel: ${businessSettings.phone}`, pageWidth / 2, 31, { align: 'center' });
    
    doc.setDrawColor(231, 229, 228); // stone-200
    doc.line(20, 38, pageWidth - 20, 38);

    // Title
    doc.setFontSize(14);
    doc.setTextColor(28, 25, 23);
    const closureTitle = `${t('reports.closure').toUpperCase()} ${t(`reports.types.${closure.type}`).toUpperCase()}`;
    doc.text(closureTitle, 20, 50);

    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    const period = `${format(new Date(closure.startDate), 'd MMMM yyyy', { locale: dateLocale })} - ${format(new Date(closure.endDate), 'd MMMM yyyy', { locale: dateLocale })}`;
    doc.text(`${t('reports.period')}: ${period}`, 20, 56);
    doc.text(`${t('reports.generated_at')}: ${format(new Date(closure.timestamp), 'd MMM yyyy, HH:mm', { locale: dateLocale })}`, 20, 61);
    doc.text(`${t('reports.operator')}: ${closure.operatorName || t('app.system')}`, 20, 66);

    // Financial Summary Table
    autoTable(doc, {
      startY: 75,
      head: [[t('reports.concept'), t('reports.value')]],
      body: [
        [t('reports.total_sales'), `$${closure.totalSales.toLocaleString()}`],
        [t('reports.total_expenses'), `$${closure.totalExpenses.toLocaleString()}`],
        [t('reports.net_profit'), `$${closure.netProfit.toLocaleString()}`],
      ],
      theme: 'striped',
      styles: { font: 'courier' },
      headStyles: { fillColor: [28, 25, 23], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    // Detailed Sales Table
    if (closure.salesDetails && closure.salesDetails.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(28, 25, 23);
      doc.text(t('reports.sales_detail').toUpperCase(), 20, (doc as any).lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [[t('inventory.table.code'), t('inventory.table.product'), t('reports.qty'), t('reports.unit_price'), t('reports.total')]],
        body: closure.salesDetails.map(s => [
          s.code,
          s.name,
          s.quantity,
          `$${s.price.toLocaleString()}`,
          `$${s.total.toLocaleString()}`
        ]),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 8 },
        headStyles: { fillColor: [68, 64, 60] },
        columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      });
    }

    // Detailed Expenses Table
    if (closure.expenseDetails && closure.expenseDetails.length > 0) {
      doc.addPage();
      doc.setFont('courier', 'normal');
      doc.setFontSize(12);
      doc.text(t('reports.expenses_detail').toUpperCase(), 20, 20);

      autoTable(doc, {
        startY: 25,
        head: [[t('inventory.invoice'), t('financials.table.description'), t('reports.date'), t('reports.value')]],
        body: closure.expenseDetails.map(e => [
          e.invoiceNumber || 'N/A',
          e.description,
          format(new Date(e.timestamp), 'dd/MM/yy'),
          `$${e.amount.toLocaleString()}`
        ]),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 8 },
        headStyles: { fillColor: [68, 64, 60] },
        columnStyles: { 3: { halign: 'right' } },
      });
    }

    // Detailed Inventory Table
    if (closure.inventoryDetails && closure.inventoryDetails.length > 0) {
      doc.addPage();
      doc.setFont('courier', 'normal');
      doc.setFontSize(12);
      doc.text(t('reports.inventory_detail').toUpperCase(), 20, 20);

      autoTable(doc, {
        startY: 25,
        head: [[t('inventory.table.code'), t('inventory.table.product'), t('reports.prev_stock'), t('reports.entries'), t('reports.exits'), t('reports.curr_stock')]],
        body: closure.inventoryDetails.map(i => [
          i.code,
          i.name,
          i.previousBalance,
          i.entries,
          i.exits,
          i.currentBalance
        ]),
        theme: 'grid',
        styles: { font: 'courier', fontSize: 8 },
        headStyles: { fillColor: [68, 64, 60] },
        columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
      });
    }

    // Accounts Payable/Receivable
    if ((closure.accountsPayable && closure.accountsPayable.length > 0) || (closure.accountsReceivable && closure.accountsReceivable.length > 0)) {
      doc.addPage();
      doc.setFont('courier', 'normal');
      
      if (closure.accountsPayable && closure.accountsPayable.length > 0) {
        doc.setFontSize(12);
        doc.text(t('financials.to_pay').toUpperCase(), 20, 20);
        autoTable(doc, {
          startY: 25,
          head: [[t('financials.table.description'), t('financials.table.due_date'), t('financials.table.status'), t('financials.table.amount')]],
          body: closure.accountsPayable.map(a => [
            a.description,
            a.dueDate ? format(new Date(a.dueDate), 'dd/MM/yy') : 'N/A',
            a.status === 'paid' ? t('financials.paid') : t('financials.pending'),
            `$${a.amount.toLocaleString()}`
          ]),
          theme: 'grid',
          styles: { font: 'courier', fontSize: 8 },
          headStyles: { fillColor: [153, 27, 27] }, // rose-800
          columnStyles: { 3: { halign: 'right' } },
        });
      }

      if (closure.accountsReceivable && closure.accountsReceivable.length > 0) {
        const startY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 20;
        doc.setFontSize(12);
        doc.text(t('financials.to_collect').toUpperCase(), 20, startY);
        autoTable(doc, {
          startY: startY + 5,
          head: [[t('financials.table.description'), t('financials.table.due_date'), t('financials.table.status'), t('financials.table.amount')]],
          body: closure.accountsReceivable.map(a => [
            a.description,
            a.dueDate ? format(new Date(a.dueDate), 'dd/MM/yy') : 'N/A',
            a.status === 'paid' ? t('financials.collected') : t('financials.pending'),
            `$${a.amount.toLocaleString()}`
          ]),
          theme: 'grid',
          styles: { font: 'courier', fontSize: 8 },
          headStyles: { fillColor: [21, 128, 61] }, // emerald-700
          columnStyles: { 3: { halign: 'right' } },
        });
      }
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(168, 162, 158); // stone-400
    doc.text(t('reports.auto_generated'), pageWidth / 2, footerY, { align: 'center' });

    // Action
    if (action === 'save') {
      doc.save(`cierre_${closure.type}_${format(new Date(closure.timestamp), 'yyyyMMdd_HHmm')}.pdf`);
    } else {
      window.open(doc.output('bloburl'), '_blank');
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
          {t('reports.generate_closure')}
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
                <h4 className="font-bold capitalize">{t('reports.closure')} {t(`reports.types.${closure.type}`)}</h4>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-stone-500">
                    {format(new Date(closure.startDate), 'd MMM', { locale: dateLocale })} - {format(new Date(closure.endDate), 'd MMM, yyyy', { locale: dateLocale })}
                  </p>
                  <span className="text-[10px] text-stone-300">•</span>
                  <p className="text-[10px] text-stone-500 font-medium uppercase">Op: {closure.operatorName || t('app.system')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1 max-w-5xl">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.total_sales')} ($)</p>
                <p className="text-sm font-bold text-emerald-600">${closure.totalSales.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.sold_items')}</p>
                <p className="text-sm font-bold text-stone-600">{closure.totalSalesItems || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.total_expenses')}</p>
                <p className="text-sm font-bold text-rose-600">${closure.totalExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.entries')}</p>
                <p className="text-sm font-bold text-blue-600">{closure.totalInventoryEntries || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.exits')}</p>
                <p className="text-sm font-bold text-orange-600">{closure.totalInventoryExits || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('reports.net_profit')}</p>
                <p className="text-sm font-bold text-stone-900">${closure.netProfit.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => generatePDF(closure)}
                className="p-2 text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1"
                title={t('reports.download_pdf')}
              >
                <Download size={20} />
              </button>
              <button 
                onClick={() => generatePDF(closure, 'preview')}
                className="p-2 text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1"
                title={t('reports.preview_print')}
              >
                <Printer size={20} />
              </button>
            </div>
          </div>
        ))}

        {closures.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-stone-300 text-center">
            <Calendar size={48} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-500">{t('reports.no_closures')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6">{t('reports.generate_new_closure')}</h3>
            <div className="space-y-4">
              <p className="text-sm text-stone-500">{t('reports.select_period_desc')}</p>
              <div className="grid grid-cols-1 gap-2">
                {(['daily', 'decadal', 'monthly', 'annual'] as ClosureType[]).map((t_key) => (
                  <button
                    key={t_key}
                    onClick={() => setType(t_key)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      type === t_key ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="font-bold capitalize">{t(`reports.types.${t_key}`)}</p>
                    <p className={`text-xs ${type === t_key ? 'text-stone-300' : 'text-stone-500'}`}>
                      {t(`reports.periods.${t_key}`)}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold border border-stone-200 hover:bg-stone-50">{t('app.cancel')}</button>
                <button onClick={handleGenerateClick} className="flex-1 py-3 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800">{t('reports.generate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={generateClosure}
        title={t('reports.validate_generation')}
        description={t('reports.validation_desc')}
      />
    </div>
  );
}
