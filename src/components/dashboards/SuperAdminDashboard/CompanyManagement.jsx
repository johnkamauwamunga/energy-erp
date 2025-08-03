import React from 'react';
import { Building2, Plus, Eye, Edit } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';

const CompanyManagement = ({ onCreateCompany }) => {
  const { state } = useApp();
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Management</h3>
          <p className="text-gray-600">Manage all registered companies</p>
        </div>
        <Button onClick={onCreateCompany} icon={Plus} variant="cosmic">
          Create New Company
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Company</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Stations</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Plan</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Created</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {state.companies.map(company => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-500">{company.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <div className="text-gray-900">{company.email}</div>
                      <div className="text-gray-500">{company.phone}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{company.stationsCount}</div>
                      <div className="text-xs text-gray-500">stations</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      company.subscriptionPlan === 'enterprise' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {company.subscriptionPlan}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      company.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">
                    {company.createdAt}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary" icon={Eye}>
                        View
                      </Button>
                      <Button size="sm" variant="secondary" icon={Edit}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;