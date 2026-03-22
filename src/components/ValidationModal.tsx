import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, X, Lock, User as UserIcon } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  title: string;
  description: string;
}

export default function ValidationModal({ isOpen, onClose, onSuccess, title, description }: ValidationModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Master code check for administrator
      if (password === '931216') {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'admin'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as User;
          onSuccess(userData);
          onClose();
          setPassword('');
          setLoading(false);
          return;
        }
      }

      // Standard validation for other users
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('password', '==', password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as User;
        onSuccess(userData);
        onClose();
        setPassword('');
      } else {
        setError('Código de autorización incorrecto');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Error al validar credenciales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200"
      >
        <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Shield size={20} className="text-stone-300" />
            </div>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">Validación de Seguridad</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <p className="text-sm text-stone-500 mb-8 text-center leading-relaxed">
            {description}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Código de Autorización</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 outline-none transition-all"
                  placeholder="Ingrese el código"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-rose-500 text-center font-medium"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Confirmar Operación'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
