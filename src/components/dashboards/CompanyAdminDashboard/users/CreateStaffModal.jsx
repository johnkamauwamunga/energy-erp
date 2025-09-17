import React, { useState, useEffect } from 'react';
import { Input, Button, Select } from '../../../ui';
import Dialog from '../../../ui/Dialog';
import { useApp } from '../../../../context/AppContext';
import { UserPlus } from 'lucide-react';
import { userService } from '../../../../services/userService/userService';

const CreateStaffModal = ({ isOpen, onClose, onUserCreated }) => {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'ATTENDANT',
    status: 'ACTIVE',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        role: 'ATTENDANT',
        status: 'ACTIVE',
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone is required';
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
      // Call the userService to create the user
      const response = await userService.createUser(formData);
      
      if (response.success) {
        // Dispatch to add the user to the state
        dispatch({ type: 'ADD_USER', payload: response.data });
        onUserCreated(); // Refetch users
        onClose();
      } else {
        setErrors({ general: response.message });
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      setErrors({ general: error.message || 'Failed to create user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Staff Member"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
            {errors.general}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required
            error={errors.firstName}
          />
          
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required
            error={errors.lastName}
          />
          
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            error={errors.email}
          />
          
          <Input
            label="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
            required
            error={errors.phoneNumber}
          />
          
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            options={[
              { value: 'STATION_MANAGER', label: 'Station Manager' },
              { value: 'SUPERVISOR', label: 'Supervisor' },
              { value: 'ATTENDANT', label: 'Attendant' }
            ]}
          />
          
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' }
            ]}
          />
        </div>
        
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
            icon={UserPlus}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Register Staff'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateStaffModal;