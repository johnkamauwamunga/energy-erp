import React, { useState, useEffect } from 'react';
import { Input, Button } from '../../ui';
import Dialog from '../../ui/Dialog';
import { companyService } from '../../../services/companyService/companyService';

const EditStationsModal = ({ isOpen, onClose, company }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    phoneNumber: '',
    address: '',
    timeZone: 'UTC',
    currency: 'USD',
    subscriptionPlan: 'subscription',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with company data
  useEffect(() => {
    if (company && isOpen) {
      setFormData({
        name: company.name || '',
        contactEmail: company.email || '',
        phoneNumber: company.phone || '',
        address: company.address || '',
        timeZone: 'UTC',
        currency: 'USD',
        subscriptionPlan: company.subscriptionPlan || 'subscription',
      });
      setErrors({});
    }
  }, [company, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Email is invalid';
    }
    return newErrors;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
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
      };

      // Remove undefined values
      Object.keys(companyData).forEach(key => {
        if (companyData[key] === undefined) {
          delete companyData[key];
        }
      });

      // Call the API service
      const response = await companyService.updateCompany(company.id, companyData);
      
      if (response.success || response.id) {
        alert('Company updated successfully!');
        onClose(true); // Pass true to indicate success
      } else {
        throw new Error(response.message || 'Failed to update company');
      }
    } catch (error) {
      console.error('Failed to update company:', error);
      
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.message.includes('Company name already exists')) {
        setErrors({ general: 'Company name already exists' });
      } else {
        setErrors({ general: error.message || 'Failed to update company' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Company"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg text-sm">
            {errors.general}
          </div>
        )}

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
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="subscription">Subscription</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        
        <div className="flex justify-end pt-4 space-x-3">
          <Button 
            type="button"
            variant="secondary"
            onClick={() => onClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="cosmic"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Company'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditStationsModal;