import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole } from '../types';
import { UserPlus, Shield, Mail, Trash2, Edit2, Search, X, Check, User as UserIcon, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../utils';
import ValidationModal from './ValidationModal';
import { useTranslation } from 'react-i18next';

export default function Users({ currentUser }: { currentUser: any }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'staff' as UserRole,
  });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidationOpen(true);
  };

  const processUserAction = async (validatedAdmin: any) => {
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.uid), {
          displayName: formData.displayName,
          email: formData.email,
          role: formData.role,
          ...(formData.password && { password: formData.password }),
          updatedAt: new Date().toISOString(),
          updatedBy: validatedAdmin.uid
        });
        toast.success(t('users.success_update'));
      } else {
        // Check if email already exists
        const emailCheck = query(collection(db, 'users'), where('email', '==', formData.email));
        const emailSnap = await getDocs(emailCheck);
        
        if (!emailSnap.empty) {
          toast.error(t('users.error_email_exists'));
          return;
        }

        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: new Date().toISOString(),
          createdBy: validatedAdmin.uid
        });
        toast.success(t('users.success_create'));
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingUser ? OperationType.UPDATE : OperationType.CREATE, 'users');
    }
  };

  const handleDelete = async (userToDelete: User) => {
    if (userToDelete.uid === currentUser.uid) {
      toast.error(t('users.error_delete_self'));
      return;
    }

    if (window.confirm(t('users.confirm_delete', { name: userToDelete.displayName }))) {
      try {
        await deleteDoc(doc(db, 'users', userToDelete.uid));
        toast.success(t('users.success_delete'));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'users');
      }
    }
  };

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        displayName: user.displayName,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        displayName: '',
        email: '',
        password: '',
        role: 'staff',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      password: '',
      role: 'staff',
    });
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder={t('users.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-stone-900 transition-all"
          />
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-lg"
        >
          <UserPlus size={20} />
          {t('users.add_user')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('users.table.user')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('users.table.role')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('users.table.status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">{t('app.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{user.displayName}</p>
                        <p className="text-xs text-stone-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                      {user.role === 'admin' ? t('users.roles.admin') : t('users.roles.staff')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {t('users.active')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
                        title={t('app.edit')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title={t('app.delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-stone-400">
            <UserIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p>{t('users.no_users_found')}</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">{editingUser ? t('users.edit_user') : t('users.new_user')}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('users.form.name')}</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('users.form.email')}</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                    placeholder="joao@restomanager.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    {editingUser ? t('users.form.new_password') : t('users.form.password')}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  {editingUser && <p className="text-[10px] text-stone-400">{t('users.form.password_hint')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('users.form.role')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['admin', 'staff'] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role })}
                        className={`p-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${
                          formData.role === role 
                            ? 'bg-stone-900 border-stone-900 text-white' 
                            : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-400'
                        }`}
                      >
                        {role === 'admin' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        {t(`users.roles.${role}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl font-bold border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-lg"
                >
                  {editingUser ? t('app.save') : t('users.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSuccess={processUserAction}
        title={t('users.validate_action')}
        description={t('users.validation_desc')}
      />
    </div>
  );
}
