import React, { useState, useEffect } from 'react';
import { Building2, Plus, Eye, Edit, RefreshCw, Trash2, Mail, Phone, Calendar } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { companyService } from '../../../services/companyService/companyService';

const CompanyManagement = ({ onCreateCompany, onEditCompany }) => {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch companies from the backend
  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await companyService.getCompanies();
      
      // Handle both response formats
      let companiesData = [];
      
      if (Array.isArray(response)) {
        companiesData = response;
      } else if (response.success && Array.isArray(response.data)) {
        companiesData = response.data;
      } else {
        throw new Error('Invalid response format from server');
      }
      
      // Transform the backend response
      const transformedCompanies = companiesData.map(company => ({
        id: company.id,
        name: company.name,
        email: company.admin?.email,
        phone: company.phoneNumber,
        address: company.address,
        subscriptionPlan: company.subscriptionPlan,
        status: 'active',
        joinDate: new Date(company.createdAt).toISOString().split('T')[0],
        stationsCount: 0,
        logo: '/api/logos/default-company.png',
        admin: company.admin,
        createdAt: company.createdAt
      }));
      
      // Update global state
      dispatch({ type: 'SET_COMPANIES', payload: transformedCompanies });
      
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setError(error.message || 'Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a company
  const handleDeleteCompany = async (companyId) => {
    try {
      setDeletingId(companyId);
      const response = await companyService.deleteCompany(companyId);
      
      // Handle both response formats
      const isSuccess = response.success || (response && response.message);
      
      if (isSuccess) {
        // Remove company from state
        dispatch({ 
          type: 'SET_COMPANIES', 
          payload: state.companies.filter(company => company.id !== companyId) 
        });
      } else {
        throw new Error(response.message || 'Failed to delete company');
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
      alert(error.message || 'Failed to delete company');
    } finally {
      setDeletingId(null);
    }
  };

  // Confirm before deleting
  const confirmDelete = (company) => {
    if (window.confirm(`Are you sure you want to delete ${company.name}? This action cannot be undone.`)) {
      handleDeleteCompany(company.id);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-600">
              <p className="font-medium">Error loading companies</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button 
            onClick={fetchCompanies} 
            variant="secondary" 
            size="sm" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Management</h3>
            <p className="text-gray-600">Manage all registered companies</p>
          </div>
          <Button onClick={onCreateCompany} icon={Plus} variant="cosmic">
            Create New Company
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Company Management</h3>
          <p className="text-sm text-gray-600">Manage all registered companies</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={fetchCompanies} 
            variant="secondary" 
            icon={RefreshCw}
            size="sm"
          >
            Refresh
          </Button>
          <Button onClick={onCreateCompany} icon={Plus} variant="cosmic" size="sm">
            New Company
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {state.companies.map(company => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{company.name}</div>
                        <div className="text-xs text-gray-500 truncate">{company.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-700">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="truncate text-xs">{company.email}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="truncate text-xs">{company.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      company.subscriptionPlan === 'enterprise' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {company.subscriptionPlan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      company.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center text-gray-500 text-xs">
                      <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                      {formatDate(company.createdAt)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-1">
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        icon={Eye}
                        onClick={() => console.log('View company:', company.id)}
                      />
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        icon={Edit}
                        onClick={() => onEditCompany(company)}
                      />
                      <Button 
                        size="xs" 
                        variant="danger" 
                        icon={Trash2}
                        loading={deletingId === company.id}
                        onClick={() => confirmDelete(company)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {state.companies.length === 0 && (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No companies found</p>
            <Button 
              onClick={onCreateCompany} 
              variant="cosmic" 
              size="sm"
              className="mt-3"
            >
              Create Your First Company
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;