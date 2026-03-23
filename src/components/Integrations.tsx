import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TaxIntegration, DeliveryIntegration } from '../types';
import { Globe, Truck, Shield, Settings, Plus, Trash2, CheckCircle, XCircle, ExternalLink, RefreshCw, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function Integrations({ user }: { user: any }) {
  const { t } = useTranslation();
  const [taxIntegrations, setTaxIntegrations] = useState<TaxIntegration[]>([]);
  const [deliveryIntegrations, setDeliveryIntegrations] = useState<DeliveryIntegration[]>([]);
  const [activeTab, setActiveTab] = useState<'tax' | 'delivery'>('tax');
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [taxForm, setTaxForm] = useState<Partial<TaxIntegration>>({
    country: '',
    entityName: '',
    apiUrl: '',
    apiKey: '',
    apiSecret: '',
    status: 'inactive'
  });

  const [deliveryForm, setDeliveryForm] = useState<Partial<DeliveryIntegration>>({
    platform: 'iFood',
    clientId: '',
    clientSecret: '',
    merchantId: '',
    autoAcceptOrders: false,
    status: 'disconnected'
  });

  useEffect(() => {
    const unsubTax = onSnapshot(collection(db, 'taxIntegrations'), (snapshot) => {
      setTaxIntegrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaxIntegration)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'taxIntegrations');
    });

    const unsubDelivery = onSnapshot(collection(db, 'deliveryIntegrations'), (snapshot) => {
      setDeliveryIntegrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryIntegration)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'deliveryIntegrations');
    });

    return () => {
      unsubTax();
      unsubDelivery();
    };
  }, []);

  const handleTaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'taxIntegrations'), {
        ...taxForm,
        status: 'inactive',
        lastSync: null
      });
      setIsTaxModalOpen(false);
      setTaxForm({ country: '', entityName: '', apiUrl: '', apiKey: '', apiSecret: '', status: 'inactive' });
      toast.success(t('integrations.tax_success'));
    } catch (error) {
      toast.error(t('integrations.tax_error'));
      handleFirestoreError(error, OperationType.CREATE, 'taxIntegrations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'deliveryIntegrations'), {
        ...deliveryForm,
        status: 'disconnected'
      });
      setIsDeliveryModalOpen(false);
      setDeliveryForm({ platform: 'iFood', clientId: '', clientSecret: '', merchantId: '', autoAcceptOrders: false, status: 'disconnected' });
      toast.success(t('integrations.delivery_success'));
    } catch (error) {
      toast.error(t('integrations.delivery_error'));
      handleFirestoreError(error, OperationType.CREATE, 'deliveryIntegrations');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaxStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'taxIntegrations', id), {
        status: currentStatus === 'active' ? 'inactive' : 'active',
        lastSync: new Date().toISOString()
      });
      toast.success(t('integrations.status_changed', { status: currentStatus === 'active' ? t('integrations.inactive') : t('integrations.active') }));
    } catch (error) {
      toast.error(t('integrations.status_error'));
      handleFirestoreError(error, OperationType.UPDATE, 'taxIntegrations');
    }
  };

  const testTaxConnection = async (id: string) => {
    toast.loading(t('integrations.testing_connection'), { id: 'test-tax' });
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (Math.random() > 0.2) {
        await updateDoc(doc(db, 'taxIntegrations', id), {
          lastSync: new Date().toISOString()
        });
        toast.success(t('integrations.test_success'), { id: 'test-tax' });
      } else {
        throw new Error('Timeout de conexión');
      }
    } catch (error) {
      toast.error(t('integrations.test_error'), { id: 'test-tax' });
    }
  };

  const deleteTax = async (id: string) => {
    if (!confirm(t('integrations.confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'taxIntegrations', id));
      toast.success(t('integrations.deleted_success'));
    } catch (error) {
      toast.error(t('integrations.deleted_error'));
      handleFirestoreError(error, OperationType.DELETE, 'taxIntegrations');
    }
  };

  const connectDelivery = async (id: string) => {
    setLoading(true);
    toast.loading(t('integrations.connecting_platform'), { id: 'connect-delivery' });
    try {
      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      await updateDoc(doc(db, 'deliveryIntegrations', id), {
        status: 'connected',
        accessToken: 'mock_token_' + Math.random().toString(36).substring(7),
        tokenExpiresAt: new Date(Date.now() + 3600000).toISOString()
      });
      toast.success(t('integrations.platform_connected'), { id: 'connect-delivery' });
    } catch (error) {
      toast.error(t('integrations.platform_error'), { id: 'connect-delivery' });
      handleFirestoreError(error, OperationType.UPDATE, 'deliveryIntegrations');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoAccept = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'deliveryIntegrations', id), {
        autoAcceptOrders: !current
      });
      toast.success(t('integrations.auto_accept_changed', { status: !current ? t('integrations.active') : t('integrations.inactive') }));
    } catch (error) {
      toast.error(t('integrations.config_error'));
      handleFirestoreError(error, OperationType.UPDATE, 'deliveryIntegrations');
    }
  };

  const deleteDelivery = async (id: string) => {
    if (!confirm(t('integrations.confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'deliveryIntegrations', id));
      toast.success(t('integrations.platform_deleted'));
    } catch (error) {
      toast.error(t('integrations.platform_delete_error'));
      handleFirestoreError(error, OperationType.DELETE, 'deliveryIntegrations');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight">{t('integrations.title')}</h2>
          <p className="text-stone-500 text-sm">{t('integrations.description')}</p>
        </div>
        <div className="flex bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tax' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t('integrations.tabs.tax')}
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'delivery' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t('integrations.tabs.delivery')}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tax' ? (
          <motion.div
            key="tax"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <button
                onClick={() => setIsTaxModalOpen(true)}
                className="h-48 border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center gap-4 text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-all group"
              >
                <div className="p-4 bg-stone-50 rounded-2xl group-hover:bg-stone-100 transition-colors">
                  <Plus size={32} />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">{t('integrations.new_tax_entity')}</span>
              </button>

              {taxIntegrations.map((integration) => (
                <div key={integration.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-stone-100 rounded-2xl text-stone-900">
                        <Globe size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleTaxStatus(integration.id!, integration.status)} className={`p-2 rounded-xl transition-colors ${integration.status === 'active' ? 'text-emerald-500 bg-emerald-50' : 'text-stone-300 bg-stone-50 hover:text-stone-900'}`}>
                          {integration.status === 'active' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                        </button>
                        <button onClick={() => deleteTax(integration.id!)} className="p-2 text-stone-300 hover:text-rose-500 bg-stone-50 rounded-xl transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{integration.entityName}</h3>
                      <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">{integration.country}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg">
                        <Globe size={12} />
                        <span className="truncate">{integration.apiUrl}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg">
                        <Key size={12} />
                        <span>API Key: ••••••••</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      {integration.lastSync ? `${t('integrations.synced')}: ${format(new Date(integration.lastSync), 'dd/MM HH:mm')}` : t('integrations.not_synced')}
                    </span>
                    <button 
                      onClick={() => testTaxConnection(integration.id!)}
                      className="text-[10px] font-bold uppercase text-stone-900 flex items-center gap-1 hover:underline"
                    >
                      {t('integrations.test')} <RefreshCw size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="delivery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <button
                onClick={() => setIsDeliveryModalOpen(true)}
                className="h-48 border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center gap-4 text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-all group"
              >
                <div className="p-4 bg-stone-50 rounded-2xl group-hover:bg-stone-100 transition-colors">
                  <Plus size={32} />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">{t('integrations.new_delivery_platform')}</span>
              </button>

              {deliveryIntegrations.map((integration) => (
                <div key={integration.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-stone-100 rounded-2xl text-stone-900">
                        <Truck size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => integration.status !== 'connected' && connectDelivery(integration.id!)}
                          disabled={loading}
                          className={`p-2 rounded-xl transition-colors ${integration.status === 'connected' ? 'text-emerald-500 bg-emerald-50' : 'text-stone-300 bg-stone-50 hover:text-stone-900'}`}
                        >
                          {integration.status === 'connected' ? <CheckCircle size={20} /> : <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />}
                        </button>
                        <button onClick={() => deleteDelivery(integration.id!)} className="p-2 text-stone-300 hover:text-rose-500 bg-stone-50 rounded-xl transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{integration.platform}</h3>
                      <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Merchant ID: {integration.merchantId || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${integration.status === 'connected' ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                      <span className="text-[10px] font-bold uppercase text-stone-500">{integration.status === 'connected' ? t('integrations.connected') : t('integrations.disconnected')}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-bold text-stone-500 uppercase">{t('integrations.auto_accept')}</span>
                      <button
                        onClick={() => toggleAutoAccept(integration.id!, integration.autoAcceptOrders)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${integration.autoAcceptOrders ? 'bg-stone-900' : 'bg-stone-200'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${integration.autoAcceptOrders ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-stone-100">
                    <button 
                      disabled={integration.status !== 'connected'}
                      className="w-full py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-800 transition-all disabled:opacity-50"
                    >
                      {t('integrations.manage_orders')} <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tax Modal */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('integrations.new_tax_entity')}</h3>
              <button onClick={() => setIsTaxModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleTaxSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('integrations.form.country')}</label>
                  <input
                    type="text"
                    required
                    value={taxForm.country}
                    onChange={e => setTaxForm({ ...taxForm, country: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                    placeholder="Ej: Brasil"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('integrations.form.entity')}</label>
                  <input
                    type="text"
                    required
                    value={taxForm.entityName}
                    onChange={e => setTaxForm({ ...taxForm, entityName: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                    placeholder="Ej: Receita Federal"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('integrations.form.api_endpoint')}</label>
                <input
                  type="url"
                  required
                  value={taxForm.apiUrl}
                  onChange={e => setTaxForm({ ...taxForm, apiUrl: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                  placeholder="https://api.tax.gov/v1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">API Key</label>
                <input
                  type="password"
                  required
                  value={taxForm.apiKey}
                  onChange={e => setTaxForm({ ...taxForm, apiKey: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">API Secret ({t('app.optional')})</label>
                <input
                  type="password"
                  value={taxForm.apiSecret}
                  onChange={e => setTaxForm({ ...taxForm, apiSecret: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-stone-900 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg hover:bg-stone-800 transition-all disabled:opacity-50"
              >
                {loading ? t('app.saving') : t('integrations.save_config')}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delivery Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('integrations.new_delivery_platform')}</h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleDeliverySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('integrations.form.platform')}</label>
                <select
                  value={deliveryForm.platform}
                  onChange={e => setDeliveryForm({ ...deliveryForm, platform: e.target.value as any })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                >
                  <option value="iFood">iFood</option>
                  <option value="99food">99Food</option>
                  <option value="Uber Eats">Uber Eats</option>
                  <option value="Rappi">Rappi</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Client ID</label>
                  <input
                    type="text"
                    required
                    value={deliveryForm.clientId}
                    onChange={e => setDeliveryForm({ ...deliveryForm, clientId: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Merchant ID</label>
                  <input
                    type="text"
                    required
                    value={deliveryForm.merchantId}
                    onChange={e => setDeliveryForm({ ...deliveryForm, merchantId: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Client Secret</label>
                <input
                  type="password"
                  required
                  value={deliveryForm.clientSecret}
                  onChange={e => setDeliveryForm({ ...deliveryForm, clientSecret: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div>
                  <p className="text-xs font-bold uppercase">{t('integrations.auto_accept')}</p>
                  <p className="text-[10px] text-stone-400">{t('integrations.auto_accept_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeliveryForm({ ...deliveryForm, autoAcceptOrders: !deliveryForm.autoAcceptOrders })}
                  className={`w-12 h-6 rounded-full relative transition-colors ${deliveryForm.autoAcceptOrders ? 'bg-stone-900' : 'bg-stone-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${deliveryForm.autoAcceptOrders ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-stone-900 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg hover:bg-stone-800 transition-all disabled:opacity-50"
              >
                {loading ? t('integrations.connecting') : t('integrations.connect_platform')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
