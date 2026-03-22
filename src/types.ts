export type UserRole = 'admin' | 'staff';
export type Platform = 'in-store' | 'iFood' | '99food';
export type TransactionType = 'entry' | 'exit';
export type FinancialType = 'income' | 'expense' | 'payable' | 'receivable';
export type ClosureType = 'daily' | 'decadal' | 'monthly' | 'annual';
export type PaymentMethod = 'pix' | 'cash' | 'ted';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
  password?: string;
  phone?: string;
  address?: string;
  permissions?: string[];
}

export interface SaleItem {
  code?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id?: string;
  amount: number;
  platform: Platform;
  paymentMethod: PaymentMethod;
  pixKeyUsed?: string;
  items: SaleItem[];
  timestamp: string;
  createdBy: string;
  operatorName?: string;
  sender?: string;
  recipient?: string;
}

export interface PaymentSettings {
  id?: string;
  pixKeys: string[];
  tedAccounts: {
    bank: string;
    agency: string;
    account: string;
    owner: string;
  }[];
}

export interface InventoryItem {
  id?: string;
  code?: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
  supplierId?: string;
}

export interface InventoryTransaction {
  id?: string;
  itemId: string;
  type: TransactionType;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  invoiceNumber?: string;
  timestamp: string;
  operatorName?: string;
  createdBy: string;
}

export interface FinancialRecord {
  id?: string;
  type: FinancialType;
  amount: number;
  description: string;
  dueDate?: string;
  status: 'pending' | 'paid';
  timestamp: string;
  operatorName?: string;
  createdBy: string;
}

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
}

export interface GeneralSettings {
  darkMode: boolean;
  openSaleOnStart: boolean;
  closeOnRestaurantClose: boolean;
  isSystemOpen?: boolean;
}

export interface NotificationLog {
  id?: string;
  type: 'system_open' | 'system_close' | 'receipt_generated' | 'invoice_generated' | 'payment_received';
  message: string;
  timestamp: string;
  operatorName?: string;
}

export interface Integration {
  id?: string;
  provider: string;
  type: 'government' | 'private';
  status: 'active' | 'inactive';
  apiKey?: string;
  endpoint?: string;
}

export interface Closure {
  id?: string;
  type: ClosureType;
  startDate: string;
  endDate: string;
  totalSales: number;
  totalExpenses: number;
  totalInventoryEntries: number;
  totalInventoryExits: number;
  totalSalesItems: number;
  netProfit: number;
  timestamp: string;
  operatorName?: string;
  createdBy: string;
}
