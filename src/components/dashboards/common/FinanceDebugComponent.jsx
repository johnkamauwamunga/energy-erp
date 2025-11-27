// FinanceDebug.jsx - Proper React Component
import React, { useState } from 'react';
import { Button } from '../../ui';
import { financeDebug } from './finaceDebug'; // ✅ Fixed import path

const FinanceDebugComponent = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testConfig, setTestConfig] = useState({
    companyId: '9161c1a5-ea78-42c7-bc86-1bec0feac7db', // Pre-filled with your actual ID
    walletId: 'e496ff43-237b-4fa8-9204-338301374e20',
    bankAccountId: '2407351e-0d0c-46e2-85be-e959b775a7f6',
    supplierAccountId: '625d5961-5f6e-43c4-9b24-c1d4e765abf9'
  });

  const runDebugTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const debugResults = await financeDebug.testAllEndpoints(testConfig);
      setResults(debugResults);
    } catch (err) {
      setError(err.message || 'Debug test failed');
      console.error('Debug test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runQuickTest = async () => {
    if (!testConfig.companyId) {
      setError('Company ID is required for quick test');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const debugResults = await financeDebug.quickTest(testConfig.companyId);
      setResults(debugResults);
    } catch (err) {
      setError(err.message || 'Quick test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setTestConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Finance Module Debug</h2>
      
      {/* Test Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company ID *
            </label>
            <input
              type="text"
              value={testConfig.companyId}
              onChange={(e) => handleInputChange('companyId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter company ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet ID
            </label>
            <input
              type="text"
              value={testConfig.walletId}
              onChange={(e) => handleInputChange('walletId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter wallet ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Account ID
            </label>
            <input
              type="text"
              value={testConfig.bankAccountId}
              onChange={(e) => handleInputChange('bankAccountId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter bank account ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Account ID
            </label>
            <input
              type="text"
              value={testConfig.supplierAccountId}
              onChange={(e) => handleInputChange('supplierAccountId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter supplier account ID"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          onClick={runQuickTest}
          disabled={loading || !testConfig.companyId}
          variant="primary"
        >
          {loading ? 'Testing...' : 'Quick Test (Company Only)'}
        </Button>
        
        <Button
          onClick={runDebugTest}
          disabled={loading}
          variant="secondary"
        >
          {loading ? 'Testing...' : 'Full Debug Test'}
        </Button>
        
        <Button
          onClick={clearResults}
          variant="outline"
        >
          Clear Results
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-red-800 font-semibold">Error:</h4>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Debug Results</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            <pre>{JSON.stringify(results, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Endpoint Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Available Endpoints</h3>
        <div className="text-sm text-gray-700">
          <p>Use this debug tool to test all finance module endpoints.</p>
          <p className="mt-1">
            <strong>Quick Test:</strong> Tests company-level endpoints only (requires Company ID)
          </p>
          <p className="mt-1">
            <strong>Full Debug Test:</strong> Tests all endpoints with provided IDs
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceDebugComponent;