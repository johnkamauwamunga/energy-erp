import React, { useState, useEffect } from 'react';
import { Input, Button } from '../../ui';
import Dialog from '../../ui/Dialog';
import { useApp } from '../../../context/AppContext';
import { addAsset } from '../../../context/AppContext/actions';
import { Fuel, Zap, Package, Loader } from 'lucide-react';

const CreateAssetModal = ({ isOpen, onClose, assetType: propAssetType = 'tank' }) => {
  const { state, dispatch } = useApp();
  const [assetType, setAssetType] = useState(propAssetType);
  const [formData, setFormData] = useState({
    code: '',
    companyId: '',
    capacity: '',
    productType: 'Diesel',
    name: '', // For islands
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset form when modal opens or asset type changes
  useEffect(() => {
    if (isOpen) {
      setAssetType(propAssetType);
      setFormData({
        code: '',
        companyId: state.currentCompany?.id || state.companies[0]?.id || '',
        capacity: '',
        productType: 'Diesel',
        name: '',
      });
      setErrors({});
      setIsInitialized(true);
    } else {
      setIsInitialized(false);
    }
  }, [isOpen, propAssetType, state.companies, state.currentCompany]);

  const validate = () => {
    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = 'Asset code is required';
    if (!formData.companyId) newErrors.companyId = 'Company is required';
    
    if (assetType === 'tank') {
      if (!formData.capacity) newErrors.capacity = 'Capacity is required';
      if (!formData.productType) newErrors.productType = 'Product type is required';
    }
    
    // Removed island validation for pumps
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create asset object
      const newAsset = {
        id: `${assetType.toUpperCase()}_${Date.now()}`,
        type: assetType,
        code: formData.code,
        companyId: formData.companyId,
        createdAt: new Date().toISOString().split('T')[0],
        ...(assetType === 'tank' && {
          capacity: Number(formData.capacity),
          productType: formData.productType
        }),
        // Removed island fields for pumps
        ...(assetType === 'island' && {
          name: formData.name
        })
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Dispatch action to add asset
      dispatch(addAsset(newAsset));
      
      onClose();
    } catch (error) {
      console.error('Failed to create asset:', error);
      setErrors({ general: error.message || 'Failed to create asset' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormFields = () => {
    if (!assetType) return null;
    
    switch (assetType) {
      case 'tank':
        return (
          <>
            <Input
              label="Tank Code"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              required
              placeholder="e.g., T-001"
              error={errors.code}
              icon={Fuel}
            />
            
            <Input
              label="Capacity (Liters)"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              required
              placeholder="Enter capacity"
              error={errors.capacity}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Type
              </label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({...formData, productType: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="Kerosene">Kerosene</option>
                <option value="LPG">LPG</option>
              </select>
              {errors.productType && (
                <p className="mt-1 text-sm text-red-600">{errors.productType}</p>
              )}
            </div>
          </>
        );
      
      case 'pump':
        return (
          <>
            <Input
              label="Pump Code"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              required
              placeholder="e.g., P-001"
              error={errors.code}
              icon={Zap}
            />
            <div className="text-sm text-gray-500 mt-1">
              <p>Note: Island assignment will be done later in pump configuration</p>
            </div>
          </>
        );
      
      case 'island':
        return (
          <>
            <Input
              label="Island Code"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              required
              placeholder="e.g., I-001"
              error={errors.code}
              icon={Package}
            />
            
            <Input
              label="Island Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter island name"
              error={errors.name}
            />
          </>
        );
      
      default:
        return (
          <div className="text-center py-8">
            <Loader className="w-12 h-12 mx-auto animate-spin text-blue-500" />
            <p className="mt-4 text-gray-600">Loading asset type...</p>
          </div>
        );
    }
  };

  // Get asset type name with fallback
  const assetTypeName = assetType 
    ? `${assetType.charAt(0).toUpperCase() + assetType.slice(1)}`
    : 'Asset';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Register New ${assetTypeName}`}
      size="md"
    >
      {!isInitialized ? (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 mx-auto animate-spin text-blue-500" />
          <p className="mt-4 text-gray-600">Initializing form...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
              {errors.general}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <select
              value={formData.companyId}
              onChange={(e) => setFormData({...formData, companyId: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {state.companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>
            )}
          </div>
          
          {renderFormFields()}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={onClose}
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
              {isSubmitting ? 'Creating...' : 'Register Asset'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};

export default CreateAssetModal;