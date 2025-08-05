import React, { useState, useEffect } from 'react';
import { Input, Button } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../../context/AppContext';
import { addCompany } from '../../../context/AppContext/actions';

const CreateCompanyModal = ({ isOpen, onClose }) => {
  const { dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('company');
  const [formData, setFormData] = useState({
    // Company data
    name: '',
    email: '',
    phone: '',
    address: '',
    subscriptionPlan: 'professional',
    
    // Admin user data
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: 'admin123', // Default password
    adminRole: 'company_admin',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('company');
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        subscriptionPlan: 'professional',
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: 'admin123',
        adminRole: 'company_admin',
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateCompany = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    return newErrors;
  };

  const validateAdmin = () => {
    const newErrors = {};
    if (!formData.adminName.trim()) newErrors.adminName = 'Admin name is required';
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Email is invalid';
    }
    if (!formData.adminPassword) newErrors.adminPassword = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate both tabs
    const companyErrors = validateCompany();
    const adminErrors = validateAdmin();
    const allErrors = {...companyErrors, ...adminErrors};
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate company ID
      const companyId = `COMP_${Date.now()}`;
      
      // Create company object
      const newCompany = {
        id: companyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        subscriptionPlan: formData.subscriptionPlan,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        stationsCount: 0, // Initial value
        logo: '/api/logos/default-company.png' // Default logo
      };

      // Create admin user
      const adminId = `CADM_${Date.now()}`;
      const newAdmin = {
        id: adminId,
        companyId: companyId,
        name: formData.adminName,
        email: formData.adminEmail,
        password: formData.adminPassword,
        phone: formData.adminPhone || '+254 700 000 000',
        role: formData.adminRole,
        permissions: ['ALL_SYSTEMS'],
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0]
      };

      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dispatch actions to add company and admin
      dispatch(addCompany(newCompany));
      // You'll need to create an ADD_USER action in your context
      // dispatch(addUser(newAdmin)); 
      
      console.log('Company created:', newCompany);
      console.log('Admin created:', newAdmin);
      
      onClose();
    } catch (error) {
      console.error('Failed to create company:', error);
      setErrors({ general: error.message || 'Failed to create company' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCompanyTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
      
      <Input
        label="Company Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
        placeholder="Enter company name"
        error={errors.name}
      />
      
      <Input
        label="Company Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
        placeholder="Enter company email"
        error={errors.email}
      />
      
      <Input
        label="Phone Number"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        placeholder="Enter phone number"
        error={errors.phone}
      />
      
      <Input
        label="Address"
        value={formData.address}
        onChange={(e) => setFormData({...formData, address: e.target.value})}
        placeholder="Enter company address"
        error={errors.address}
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subscription Plan
        </label>
        <select
          value={formData.subscriptionPlan}
          onChange={(e) => setFormData({...formData, subscriptionPlan: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="basic">Basic</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button 
          variant="cosmic"
          onClick={() => setActiveTab('admin')}
        >
          Next: Admin Details
        </Button>
      </div>
    </div>
  );

  const renderAdminTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin User Information</h3>
      
      <Input
        label="Admin Name"
        value={formData.adminName}
        onChange={(e) => setFormData({...formData, adminName: e.target.value})}
        required
        placeholder="Enter admin full name"
        error={errors.adminName}
      />
      
      <Input
        label="Admin Email"
        type="email"
        value={formData.adminEmail}
        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
        required
        placeholder="Enter admin email"
        error={errors.adminEmail}
      />
      
      <Input
        label="Admin Phone"
        value={formData.adminPhone}
        onChange={(e) => setFormData({...formData, adminPhone: e.target.value})}
        placeholder="Enter admin phone number"
        error={errors.adminPhone}
      />
      
      <Input
        label="Password"
        type="password"
        value={formData.adminPassword}
        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
        required
        placeholder="Enter password"
        error={errors.adminPassword}
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Role
        </label>
        <select
          value={formData.adminRole}
          onChange={(e) => setFormData({...formData, adminRole: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="super_admin">Super Admin</option>
          <option value="company_admin">Company Admin</option>
        </select>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          variant="secondary"
          onClick={() => setActiveTab('company')}
          disabled={isSubmitting}
        >
          Back to Company
        </Button>
        <Button 
          type="submit" 
          variant="cosmic"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Company & Admin'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Company"
      size="md"
    >
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4">
          <button
            type="button"
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('company')}
          >
            Company Details
          </button>
          <button
            type="button"
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Account
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
            {errors.general}
          </div>
        )}
        
        {activeTab === 'company' ? renderCompanyTab() : renderAdminTab()}
      </form>
    </Dialog>
  );
};

export default CreateCompanyModal;