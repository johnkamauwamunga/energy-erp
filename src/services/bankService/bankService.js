// services/bankService/bankService.js
import { apiService } from '../apiService';

class BankService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // =====================
  // CORE UTILITIES
  // =====================

  handleResponse = (response) => {
    if (response.data?.success) {
      return response.data.data;
    }
    return response.data;
  };

  handleError = (error, defaultMessage) => {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error(defaultMessage);
  };

  buildQuery = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return params.toString();
  };

  // =====================
  // BANK MANAGEMENT
  // =====================

  createBank = async (bankData) => {
    try {
      const response = await apiService.post('/banks', bankData);
      this.clearCache('banks');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to create bank');
    }
  };

  getBanks = async (filters = {}) => {
    const cacheKey = `banks-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/banks?${query}` : '/banks';
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch banks');
    }
  };

  getBankById = async (bankId) => {
    const cacheKey = `bank-${bankId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/banks/${bankId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch bank');
    }
  };

  updateBank = async (bankId, updateData) => {
    try {
      const response = await apiService.patch(`/banks/${bankId}`, updateData);
      this.clearCache('banks');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to update bank');
    }
  };

  deleteBank = async (bankId) => {
    try {
      const response = await apiService.delete(`/banks/${bankId}`);
      this.clearCache('banks');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete bank');
    }
  };

  getActiveBanks = async () => {
    const cacheKey = 'active-banks';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/banks/active');
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch active banks');
    }
  };

  searchBanks = async (searchTerm, limit = 10) => {
    try {
      const response = await apiService.get(`/banks/search?search=${searchTerm}&limit=${limit}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to search banks');
    }
  };

  // =====================
  // BANK ACCOUNT MANAGEMENT
  // =====================

  createBankAccount = async (accountData) => {
    try {
      const response = await apiService.post('/bank-accounts', accountData);
      this.clearCache('bank-accounts');
      this.clearCache('balance-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to create bank account');
    }
  };

  getBankAccounts = async (filters = {}) => {
    const cacheKey = `bank-accounts-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(filters);
      const url = query ? `/bank-accounts?${query}` : '/bank-accounts';
      const response = await apiService.get(url);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch bank accounts');
    }
  };

  getBankAccountById = async (accountId) => {
    const cacheKey = `bank-account-${accountId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get(`/bank-accounts/${accountId}`);
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch bank account');
    }
  };

  updateBankAccount = async (accountId, updateData) => {
    try {
      const response = await apiService.patch(`/bank-accounts/${accountId}`, updateData);
      this.clearCache('bank-accounts');
      this.clearCache('balance-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to update bank account');
    }
  };

  deleteBankAccount = async (accountId) => {
    try {
      const response = await apiService.delete(`/bank-accounts/${accountId}`);
      this.clearCache('bank-accounts');
      this.clearCache('balance-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete bank account');
    }
  };

  setPrimaryBankAccount = async (accountId) => {
    try {
      const response = await apiService.patch(`/bank-accounts/${accountId}/set-primary`);
      this.clearCache('bank-accounts');
      this.clearCache('balance-summary');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to set primary account');
    }
  };

  getPrimaryBankAccount = async () => {
    const cacheKey = 'primary-bank-account';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/bank-accounts/primary');
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch primary bank account');
    }
  };

  getAccountBalanceSummary = async () => {
    const cacheKey = 'balance-summary';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get('/bank-accounts/summary/balance');
      const data = this.handleResponse(response);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch account balance summary');
    }
  };

  // =====================
  // UTILITIES
  // =====================

  clearCache = (pattern) => {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  };

  formatCurrency = (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  validateBank = (bankData) => {
    const errors = [];
    if (!bankData.name?.trim()) errors.push('Bank name is required');
    if (bankData.name && bankData.name.length < 2) errors.push('Bank name must be at least 2 characters');
    if (bankData.name && bankData.name.length > 100) errors.push('Bank name cannot exceed 100 characters');
    if (bankData.code && !/^[A-Z0-9-]+$/.test(bankData.code)) {
      errors.push('Bank code can only contain uppercase letters, numbers and hyphens');
    }
    if (!bankData.country?.trim()) errors.push('Country is required');
    return errors;
  };

  validateBankAccount = (accountData) => {
    const errors = [];
    if (!accountData.bankId) errors.push('Bank is required');
    if (!accountData.accountNumber?.trim()) errors.push('Account number is required');
    if (accountData.accountNumber && accountData.accountNumber.length < 5) errors.push('Account number must be at least 5 characters');
    if (accountData.accountNumber && !/^[0-9-]+$/.test(accountData.accountNumber)) {
      errors.push('Account number can only contain numbers and hyphens');
    }
    if (!accountData.accountName?.trim()) errors.push('Account name is required');
    if (accountData.accountName && accountData.accountName.length < 2) errors.push('Account name must be at least 2 characters');
    if (accountData.accountName && accountData.accountName.length > 200) errors.push('Account name cannot exceed 200 characters');
    if (accountData.branch && accountData.branch.length < 2) errors.push('Branch name must be at least 2 characters');
    if (accountData.branch && accountData.branch.length > 100) errors.push('Branch name cannot exceed 100 characters');
    if (accountData.openingBalance && accountData.openingBalance < -1000000) errors.push('Opening balance cannot be less than -1,000,000');
    if (accountData.openingBalance && accountData.openingBalance > 100000000) errors.push('Opening balance cannot exceed 100,000,000');
    return errors;
  };

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatBank = (bank) => {
    if (!bank) return null;
    
    return {
      ...bank,
      displayName: bank.code ? `${bank.name} (${bank.code})` : bank.name,
      accountCountDisplay: bank.accountCount ? `${bank.accountCount} account${bank.accountCount !== 1 ? 's' : ''}` : 'No accounts',
      statusDisplay: bank.isActive ? 'Active' : 'Inactive',
      statusColor: bank.isActive ? 'success' : 'error'
    };
  };

  formatBankAccount = (account) => {
    if (!account) return null;
    
    return {
      ...account,
      displayName: `${account.accountName} - ${account.accountNumber}`,
      bankDisplay: account.bank ? `${account.bank.name}${account.bank.code ? ` (${account.bank.code})` : ''}` : 'Unknown Bank',
      balanceDisplay: this.formatCurrency(account.currentBalance || 0, account.currency),
      statusDisplay: account.isActive ? 'Active' : 'Inactive',
      statusColor: account.isActive ? 'success' : 'error',
      primaryDisplay: account.isPrimary ? 'Primary' : 'Secondary',
      primaryColor: account.isPrimary ? 'primary' : 'default'
    };
  };

  getDefaultBankData = () => {
    return {
      name: '',
      code: '',
      country: 'Kenya',
      isActive: true
    };
  };

  getDefaultBankAccountData = () => {
    return {
      bankId: '',
      accountNumber: '',
      accountName: '',
      branch: '',
      currency: 'KES',
      openingBalance: 0,
      isPrimary: false,
      isActive: true
    };
  };
}

export const bankService = new BankService();
export default bankService;