import React, { useState, useEffect } from 'react';
import { Input, Button } from '../../../ui';
import Dialog from '../../../ui/Dialog';
import { useApp } from '../../../../context/AppContext';
import { stationService } from '../../../../services/stationService/stationService';

const CreateStationsModal = ({ isOpen, onClose, editingStation }) => {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    warehouseName: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens or when editingStation changes
  useEffect(() => {
    if (isOpen) {
      if (editingStation) {
        // Prefill form for editing
        setFormData({
          name: editingStation.name || '',
          location: editingStation.location || '',
          warehouseName: '' // You might need to adjust this based on your data structure
        });
      } else {
        // Reset form for creation
        setFormData({
          name: '',
          location: '',
          warehouseName: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editingStation]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Station name is required';
    if (formData.name.trim().length < 2) newErrors.name = 'Station name must be at least 2 characters';
    return newErrors;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      let response;
      
      if (editingStation) {
        // Update existing station
        response = await stationService.updateStation(editingStation.id, formData);
        
        if (response.success) {
          // Dispatch update action
          dispatch({ type: 'UPDATE_STATION', payload: response.data });
          alert(`Station "${response.data.name}" updated successfully!`);
          onClose();
        } else {
          throw new Error(response.message || 'Failed to update station');
        }
      } else {
        // Create new station
        response = await stationService.createStation(formData);

        console.log("station created must be ",response)
        
        if (response.id) {
          // Dispatch add action
          dispatch({ type: 'ADD_STATION', payload: response.data });
          alert(`Station "${response.name}" created successfully!`);
          onClose();
        } else {
          throw new Error(response.message || 'Failed to create station');
        }
      }
    } catch (error) {
      console.error(`Failed to ${editingStation ? 'update' : 'create'} station:`, error);
      
      // Handle specific error cases
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.message.includes('already exists')) {
        setErrors({ name: error.message });
      } else {
        setErrors({ general: error.message || `Failed to ${editingStation ? 'update' : 'create'} station` });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingStation ? 'Edit Station' : 'Create New Station'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg text-sm">
            {errors.general}
          </div>
        )}
        
        <Input
          label="Station Name *"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
          placeholder="Enter station name"
          error={errors.name}
          disabled={isSubmitting}
        />
        
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          placeholder="Enter station location"
          disabled={isSubmitting}
        />
        
        <Input
          label="Warehouse Name"
          value={formData.warehouseName}
          onChange={(e) => handleInputChange('warehouseName', e.target.value)}
          placeholder="Enter warehouse name (optional)"
          helpText="If provided, a warehouse will be created with this name for the station"
          disabled={isSubmitting}
        />
        
        <div className="flex justify-end pt-4 space-x-2">
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
            {isSubmitting 
              ? `${editingStation ? 'Updating...' : 'Creating...'}` 
              : `${editingStation ? 'Update' : 'Create'} Station`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateStationsModal;