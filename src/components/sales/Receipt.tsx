import React from 'react';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { motion } from 'motion/react';
import Barcode from 'react-barcode';
import { Sale } from '../../types';

interface ReceiptProps {
  sale: Sale;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, onClose }) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS;

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
            <span>{format(new Date(sale.timestamp), 'dd/MM/yyyy', { locale: dateLocale })}</span>
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

export default Receipt;
