import { apiService } from '../apiService';

export const financeService = {
  // =====================
  // HEALTH & TEST ENDPOINTS
  // =====================

  /**
   * Health check for finance module
   */
  healthCheck: async () => {
    try {
      const response = await apiService.get('/finance/health');
      return response;
    } catch (error) {
      console.error('Finance health check failed:', error);
      throw error;
    }
  },

  /**
   * Test endpoint for development
   */
  testEndpoint: async () => {
    try {
      const response = await apiService.get('/finance/test');
      return response;
    } catch (error) {
      console.error('Finance test endpoint failed:', error);
      throw error;
    }
  },

  // =====================
  // COMPANY FINANCIAL OVERVIEW
  // =====================

  /**
   * Get comprehensive financial overview for a company
   */
  getCompanyFinancialOverview: async (companyId) => {
    try {
      const response = await apiService.get(`/finance/company/${companyId}/overview`);

      console.log("check companies finances ",response);
      return response; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch financial overview for company ${companyId}:`, error);
      throw error;
    }
  },

  // =====================
  // STATION WALLETS
  // =====================

  /**
   * Get all station wallets for a company
   */
  getCompanyStationWallets: async (companyId) => {
    try {
      const response = await apiService.get(`/finance/company/${companyId}/wallets`);
          console.log("check companies station wallets ",response);
      return response; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch station wallets for company ${companyId}:`, error);
      throw error;
    }
  },

  /**
   * Get transactions for a specific wallet
   */
  getWalletTransactions: async (walletId) => {
    try {
      const response = await apiService.get(`/finance/wallets/${walletId}/transactions`);
         console.log("check companies station wallet transactions ",response);
      return response; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch transactions for wallet ${walletId}:`, error);
      throw error;
    }
  },

  // =====================
  // BANK ACCOCOUNTS
  // =====================

  /**
   * Get all bank accounts for a company
   */
  getCompanyBankAccounts: async (companyId) => {
    try {
      const response = await apiService.get(`/finance/company/${companyId}/bank-accounts`);

        console.log("check companies bank accounts ",response);
      return response; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch bank accounts for company ${companyId}:`, error);
      throw error;
    }
  },

  /**
   * Get transactions for a specific bank account
   */
  getBankAccountTransactions: async (accountId) => {
    try {
      const response = await apiService.get(`/finance/bank-accounts/${accountId}/transactions`);
        console.log("check companies bank account transactions ",response);
      return response.data; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch transactions for bank account ${accountId}:`, error);
      throw error;
    }
  },

  // =====================
  // SUPPLIER ACCOUNTS
  // =====================

  /**
   * Get all supplier accounts for a company
   */
  getCompanySupplierAccounts: async (companyId) => {
    try {
      const response = await apiService.get(`/finance/company/${companyId}/supplier-accounts`);
        console.log("check supplier accounts  ",response);
      return response; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch supplier accounts for company ${companyId}:`, error);
      throw error;
    }
  },

  /**
   * Get transactions for a specific supplier account
   */
  getSupplierAccountTransactions: async (accountId) => {
    try {
      const response = await apiService.get(`/finance/supplier-accounts/${accountId}/transactions`);
        console.log("check supplier account transactions ",response);
      return response; // Extract the actual data
    } catch (error) {
      console.error(`Failed to fetch transactions for supplier account ${accountId}:`, error);
      throw error;
    }
  }
};