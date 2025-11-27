// financeDebug.js - Fixed import path
import { financeService } from '../../../services/financeService/financeService'; // ✅ Fixed import path

export const financeDebug = {
  /**
   * Test all finance endpoints with provided IDs
   */
  testAllEndpoints: async (ids = {}) => {
    const {
      companyId,
      walletId,
      bankAccountId, 
      supplierAccountId
    } = ids;

    console.log('🧪 FINANCE MODULE DEBUG TEST');
    console.log('=============================');

    const results = {};

    try {
      // 1. Health Check
      console.log('\n1. Testing Health Check...');
      results.health = await financeService.healthCheck();
      console.log('✅ Health Check:', results.health);

      // 2. Test Endpoint
      console.log('\n2. Testing Test Endpoint...');
      results.test = await financeService.testEndpoint();
      console.log('✅ Test Endpoint:', results.test);

      // 3. Company Financial Overview (requires companyId)
      if (companyId) {
        console.log(`\n3. Testing Company Financial Overview (companyId: ${companyId})...`);
        results.overview = await financeService.getCompanyFinancialOverview(companyId);
        console.log('✅ Financial Overview:', results.overview);
      } else {
        console.log('❌ Skipping Financial Overview - companyId required');
        results.overview = { error: 'companyId required' };
      }

      // 4. Company Station Wallets (requires companyId)
      if (companyId) {
        console.log(`\n4. Testing Company Station Wallets (companyId: ${companyId})...`);
        results.stationWallets = await financeService.getCompanyStationWallets(companyId);
        console.log('✅ Station Wallets:', results.stationWallets);
      } else {
        console.log('❌ Skipping Station Wallets - companyId required');
        results.stationWallets = { error: 'companyId required' };
      }

      // 5. Company Bank Accounts (requires companyId)
      if (companyId) {
        console.log(`\n5. Testing Company Bank Accounts (companyId: ${companyId})...`);
        results.bankAccounts = await financeService.getCompanyBankAccounts(companyId);
        console.log('✅ Bank Accounts:', results.bankAccounts);
      } else {
        console.log('❌ Skipping Bank Accounts - companyId required');
        results.bankAccounts = { error: 'companyId required' };
      }

      // 6. Company Supplier Accounts (requires companyId)
      if (companyId) {
        console.log(`\n6. Testing Company Supplier Accounts (companyId: ${companyId})...`);
        results.supplierAccounts = await financeService.getCompanySupplierAccounts(companyId);
        console.log('✅ Supplier Accounts:', results.supplierAccounts);
      } else {
        console.log('❌ Skipping Supplier Accounts - companyId required');
        results.supplierAccounts = { error: 'companyId required' };
      }

      // 7. Wallet Transactions (requires walletId)
      if (walletId) {
        console.log(`\n7. Testing Wallet Transactions (walletId: ${walletId})...`);
        results.walletTransactions = await financeService.getWalletTransactions(walletId);
        console.log('✅ Wallet Transactions:', results.walletTransactions);
      } else {
        console.log('❌ Skipping Wallet Transactions - walletId required');
        results.walletTransactions = { error: 'walletId required' };
      }

      // 8. Bank Account Transactions (requires bankAccountId)
      if (bankAccountId) {
        console.log(`\n8. Testing Bank Account Transactions (bankAccountId: ${bankAccountId})...`);
        results.bankTransactions = await financeService.getBankAccountTransactions(bankAccountId);
        console.log('✅ Bank Transactions:', results.bankTransactions);
      } else {
        console.log('❌ Skipping Bank Transactions - bankAccountId required');
        results.bankTransactions = { error: 'bankAccountId required' };
      }

      // 9. Supplier Account Transactions (requires supplierAccountId)
      if (supplierAccountId) {
        console.log(`\n9. Testing Supplier Account Transactions (supplierAccountId: ${supplierAccountId})...`);
        results.supplierTransactions = await financeService.getSupplierAccountTransactions(supplierAccountId);
        console.log('✅ Supplier Transactions:', results.supplierTransactions);
      } else {
        console.log('❌ Skipping Supplier Transactions - supplierAccountId required');
        results.supplierTransactions = { error: 'supplierAccountId required' };
      }

      console.log('\n🎉 DEBUG TEST COMPLETED SUCCESSFULLY!');
      return results;

    } catch (error) {
      console.error('💥 DEBUG TEST FAILED:', error);
      throw error;
    }
  },

  /**
   * Test specific endpoint with ID
   */
  testEndpointById: async (endpoint, id) => {
    console.log(`🧪 Testing ${endpoint} with ID: ${id}`);
    
    try {
      let result;
      
      switch (endpoint) {
        case 'walletTransactions':
          result = await financeService.getWalletTransactions(id);
          break;
        case 'bankAccountTransactions':
          result = await financeService.getBankAccountTransactions(id);
          break;
        case 'supplierAccountTransactions':
          result = await financeService.getSupplierAccountTransactions(id);
          break;
        case 'companyOverview':
          result = await financeService.getCompanyFinancialOverview(id);
          break;
        case 'companyWallets':
          result = await financeService.getCompanyStationWallets(id);
          break;
        case 'companyBankAccounts':
          result = await financeService.getCompanyBankAccounts(id);
          break;
        case 'companySupplierAccounts':
          result = await financeService.getCompanySupplierAccounts(id);
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }
      
      console.log(`✅ ${endpoint}:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ ${endpoint} failed:`, error);
      throw error;
    }
  },

  /**
   * Quick test with minimal input
   */
  quickTest: async (companyId) => {
    return await financeDebug.testAllEndpoints({ companyId });
  },

  /**
   * Get available endpoints and their required parameters
   */
  getEndpointsInfo: () => {
    return {
      endpoints: [
        {
          name: 'Company Financial Overview',
          method: 'GET',
          path: '/finance/company/:companyId/overview',
          required: ['companyId'],
          description: 'Get comprehensive financial overview for a company'
        },
        {
          name: 'Company Station Wallets', 
          method: 'GET',
          path: '/finance/company/:companyId/wallets',
          required: ['companyId'],
          description: 'Get all station wallets for a company'
        },
        {
          name: 'Company Bank Accounts',
          method: 'GET', 
          path: '/finance/company/:companyId/bank-accounts',
          required: ['companyId'],
          description: 'Get all bank accounts for a company'
        },
        {
          name: 'Company Supplier Accounts',
          method: 'GET',
          path: '/finance/company/:companyId/supplier-accounts', 
          required: ['companyId'],
          description: 'Get all supplier accounts for a company'
        },
        {
          name: 'Wallet Transactions',
          method: 'GET',
          path: '/finance/wallets/:walletId/transactions',
          required: ['walletId'],
          description: 'Get transactions for a specific wallet'
        },
        {
          name: 'Bank Account Transactions',
          method: 'GET',
          path: '/finance/bank-accounts/:accountId/transactions',
          required: ['bankAccountId'],
          description: 'Get transactions for a specific bank account'
        },
        {
          name: 'Supplier Account Transactions',
          method: 'GET',
          path: '/finance/supplier-accounts/:accountId/transactions',
          required: ['supplierAccountId'],
          description: 'Get transactions for a specific supplier account'
        }
      ]
    };
  }
};

export default financeDebug; // ✅ Added default export for flexibility