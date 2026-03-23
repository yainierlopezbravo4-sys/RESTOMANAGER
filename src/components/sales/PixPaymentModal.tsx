import React from 'react';
import { QrCode, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Sale } from '../../types';

interface PixPaymentModalProps {
  sale: Sale;
  onContinue: () => void;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ sale, onContinue }) => {
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

export default PixPaymentModal;
