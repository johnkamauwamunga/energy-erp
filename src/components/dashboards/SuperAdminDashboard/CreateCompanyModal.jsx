import React, { useState, useEffect } from 'react';
import { Input, Button } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../../context/AppContext';
import { addCompany } from '../../../context/AppContext/actions';
import { companyService } from '../../../services/companyService/companyService';

const CreateCompanyModal = ({ isOpen, onClose }) => {
  const { dispatch, state } = useApp();
  const [activeTab, setActiveTab] = useState('company');
  const [formData, setFormData] = useState({
    // Company data
    name: '',
    contactEmail: '',
    phoneNumber: '',
    address: '',
    timeZone: 'UTC',
    currency: 'USD',
    subscriptionPlan: 'subscription',
    
    // Admin user data (nested object)
    admin: {
      email: '',
      firstName: '',
      lastName: '',
      password: ''
    }
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('company');
      setFormData({
        name: '',
        contactEmail: '',
        phoneNumber: '',
        address: '',
        timeZone: 'UTC',
        currency: 'USD',
        subscriptionPlan: 'subscription',
        admin: {
          email: '',
          firstName: '',
          lastName: '',
          password: ''
        }
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateCompany = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Email is invalid';
    }
    return newErrors;
  };

  const validateAdmin = () => {
    const newErrors = {};
    if (!formData.admin.firstName.trim()) newErrors.adminFirstName = 'First name is required';
    if (!formData.admin.lastName.trim()) newErrors.adminLastName = 'Last name is required';
    if (!formData.admin.email.trim()) {
      newErrors.adminEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.admin.email)) {
      newErrors.adminEmail = 'Email is invalid';
    }
    if (formData.admin.password && formData.admin.password.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    }
    return newErrors;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdminInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      admin: {
        ...prev.admin,
        [field]: value
      }
    }));
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
      // Prepare data for backend API
      const companyData = {
        name: formData.name,
        contactEmail: formData.contactEmail || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        address: formData.address || undefined,
        timeZone: formData.timeZone,
        currency: formData.currency,
        subscriptionPlan: formData.subscriptionPlan,
        admin: {
          email: formData.admin.email,
          firstName: formData.admin.firstName,
          lastName: formData.admin.lastName,
          password: formData.admin.password || undefined
        }
      };

      // Remove undefined values
      Object.keys(companyData).forEach(key => {
        if (companyData[key] === undefined) {
          delete companyData[key];
        }
      });

      // Call the API service
      const response = await companyService.createCompany(companyData);

      console.log('Create company response:', response);
      
     if (response?.id) {
      // Add to context
      dispatch(addCompany(response));

      // Success message
      alert(`Company "${response.name}" created successfully!`);

      onClose();
    } else {
        throw new Error(response.message || 'Failed to create company');
      }
    } catch (error) {
      console.error('Failed to create company:', error);
      
      // Handle specific error cases
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.message.includes('Company name already exists')) {
        setErrors({ general: 'Company name already exists' });
      } else {
        setErrors({ general: error.message || 'Failed to create company' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCompanyTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
      
      <Input
        label="Company Name *"
        value={formData.name}
        onChange={(e) => handleInputChange('name', e.target.value)}
        required
        placeholder="Enter company name"
        error={errors.name}
      />
      
      <Input
        label="Contact Email"
        type="email"
        value={formData.contactEmail}
        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
        placeholder="Enter company contact email"
        error={errors.contactEmail}
      />
      
      <Input
        label="Phone Number"
        value={formData.phoneNumber}
        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
        placeholder="Enter phone number"
      />
      
      <Input
        label="Address"
        value={formData.address}
        onChange={(e) => handleInputChange('address', e.target.value)}
        placeholder="Enter company address"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Zone
          </label>
          <select
            value={formData.timeZone}
            onChange={(e) => handleInputChange('timeZone', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">GMT</option>
            <option value="Asia/Kolkata">IST</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="KES">KES (KSh)</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subscription Plan
        </label>
        <select
          value={formData.subscriptionPlan}
          onChange={(e) => handleInputChange('subscriptionPlan', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="subscription">Subscription</option>
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
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name *"
          value={formData.admin.firstName}
          onChange={(e) => handleAdminInputChange('firstName', e.target.value)}
          required
          placeholder="Enter first name"
          error={errors.adminFirstName}
        />
        
        <Input
          label="Last Name *"
          value={formData.admin.lastName}
          onChange={(e) => handleAdminInputChange('lastName', e.target.value)}
          required
          placeholder="Enter last name"
          error={errors.adminLastName}
        />
      </div>
      
      <Input
        label="Email *"
        type="email"
        value={formData.admin.email}
        onChange={(e) => handleAdminInputChange('email', e.target.value)}
        required
        placeholder="Enter admin email"
        error={errors.adminEmail}
      />
      
      <Input
        label="Password"
        type="password"
        value={formData.admin.password}
        onChange={(e) => handleAdminInputChange('password', e.target.value)}
        placeholder="Enter password (min 8 characters)"
        error={errors.adminPassword}
        helpText="If not provided, will use default password: Admin@123"
      />
      
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