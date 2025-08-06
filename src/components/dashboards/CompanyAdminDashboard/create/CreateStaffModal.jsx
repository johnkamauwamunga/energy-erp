import React, { useState, useEffect } from 'react';
import { Input, Button, Select } from '../../../ui';
import Dialog from '../../../ui/Dialog';
import { useApp } from '../../../../context/AppContext';
import { User, UserPlus, X } from 'lucide-react';

const CreateStaffModal = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'attendant',
    status: 'active',
    shift: 'morning',
    companyId: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'attendant',
        status: 'active',
        shift: 'morning',
        companyId: state.currentCompany?.id || state.companies[0]?.id || '',
      });
      setErrors({});
    }
  }, [isOpen, state.companies, state.currentCompany]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.companyId) newErrors.companyId = 'Company is required';
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
      const roleMap = {
        manager: 'stationManagers',
        attendant: 'attendants',
        supervisor: 'supervisors'
      };
      
      const roleCategory = roleMap[formData.role];
      
      const newStaff = {
        id: `STAFF_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...formData,
        permissions: getPermissionsForRole(formData.role),
        joinDate: new Date().toISOString().split('T')[0],
        stationId: null, // Initially unattached
      };

      // Dispatch action to add staff
      dispatch({
        type: 'ADD_STAFF',
        payload: {
          role: roleCategory,
          staff: newStaff
        }
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create staff:', error);
      setErrors({ general: error.message || 'Failed to create staff' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPermissionsForRole = (role) => {
    switch(role) {
      case 'manager': return ['STATION_OPERATIONS'];
      case 'supervisor': return ['SHIFT_MANAGEMENT'];
      case 'attendant': return ['SALES_RECORDING'];
      default: return [];
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
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            error={errors.name}
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
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            required
            error={errors.phone}
          />
          
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            options={[
              { value: 'manager', label: 'Station Manager' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'attendant', label: 'Attendant' }
            ]}
          />
          
          {formData.role === 'supervisor' && (
            <Select
              label="Shift"
              value={formData.shift}
              onChange={(e) => setFormData({...formData, shift: e.target.value})}
              options={[
                { value: 'morning', label: 'Morning Shift' },
                { value: 'afternoon', label: 'Afternoon Shift' },
                { value: 'night', label: 'Night Shift' }
              ]}
            />
          )}
          
          
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
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