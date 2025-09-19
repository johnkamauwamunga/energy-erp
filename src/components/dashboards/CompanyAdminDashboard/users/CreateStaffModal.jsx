import React, { useState, useEffect } from 'react';
import { Input, Button, Select, MultiSelect } from '../../../ui';
import Dialog from '../../../ui/Dialog';
import { useApp } from '../../../../context/AppContext';
import { UserPlus } from 'lucide-react';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';

const CreateStaffModal = ({ isOpen, onClose, onUserCreated }) => {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ATTENDANT',
    status: 'ACTIVE',
    stationIds: [],
  });
  
  const [stations, setStations] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStations, setIsLoadingStations] = useState(false);

  // Load stations when modal opens
  useEffect(() => {
    const loadStations = async () => {
      if (isOpen) {
        setIsLoadingStations(true);
        try {
          const response = await stationService.getCompanyStations();
          setStations(response || []);
        } catch (error) {
          console.error('Failed to load stations:', error);
        } finally {
          setIsLoadingStations(false);
        }
      }
    };

    if (isOpen) {
      loadStations();
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'ATTENDANT',
        status: 'ACTIVE',
        stationIds: [],
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    
    // Role-specific validations
    if (formData.role !== 'SUPER_ADMIN' && formData.role !== 'COMPANY_ADMIN') {
      if (formData.stationIds.length === 0) {
        newErrors.stationIds = 'At least one station assignment is required';
      }
    }
    
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
      // Prepare data for API - create user first
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status,
        // Don't include stationIds in initial user creation
      };
      
      // Call the userService to create the user
      const response = await userService.createUser(userData, dispatch);
      
      if (response.success) {
        // If user was created successfully and station assignments are needed
        if (formData.stationIds.length > 0 && 
            formData.role !== 'SUPER_ADMIN' && 
            formData.role !== 'COMPANY_ADMIN') {
          
          // Assign user to selected stations
          for (const stationId of formData.stationIds) {
            try {
              await userService.assignUserToStation({
                userId: response.data.id,
                stationId: stationId,
                role: formData.role
              });
            } catch (assignmentError) {
              console.error(`Failed to assign user to station ${stationId}:`, assignmentError);
              // Continue with other assignments even if one fails
            }
          }
        }
        
        // Show success message with temp password if available
        if (response.data.tempPassword) {
          alert(`User created successfully! Temporary password: ${response.data.tempPassword}`);
        } else {
          alert('User created successfully!');
        }
        
        onUserCreated(); // Refetch users
        onClose();
      } else {
        setErrors({ general: response.message || 'Failed to create user' });
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create user';
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
    
    // Clear error when user provides input
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleStationChange = (selectedOptions) => {
    setFormData({
      ...formData,
      stationIds: selectedOptions.map(option => option.value)
    });
    
    // Clear error when user selects stations
    if (selectedOptions.length > 0 && errors.stationIds) {
      setErrors({ ...errors, stationIds: null });
    }
  };

  const roleOptions = [
    { value: 'STATION_MANAGER', label: 'Station Manager' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ATTENDANT', label: 'Attendant' }
  ];

  // Add company admin role if current user is super admin
  if (state.currentUser?.role === 'SUPER_ADMIN') {
    roleOptions.unshift(
      { value: 'COMPANY_ADMIN', label: 'Company Admin' },
      { value: 'SUPER_ADMIN', label: 'Super Admin' }
    );
  }

  // Determine if station assignment should be shown
  const showStationAssignment = 
    formData.role === 'STATION_MANAGER' || 
    formData.role === 'SUPERVISOR' || 
    formData.role === 'ATTENDANT';

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
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            required
            error={errors.firstName}
            placeholder="Enter first name"
          />
          
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            required
            error={errors.lastName}
            placeholder="Enter last name"
          />
          
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
            error={errors.email}
            placeholder="user@example.com"
          />
          
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            options={roleOptions}
            required
          />
          
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' }
            ]}
          />
         
     {showStationAssignment && (
  <div className="md:col-span-2">
    <MultiSelect
      label="Station Assignments"
      options={stations.map(station => ({
        value: station.id,
        label: `${station.name}`
      }))}
      value={formData.stationIds} // Just pass the array of IDs directly
      onChange={(e) => handleInputChange('stationIds', e.target.value)}
      isLoading={isLoadingStations}
      error={errors.stationIds}
      placeholder="Select stations (optional)"
      isRequired={false}
    />
    <p className="text-sm text-gray-500 mt-1">
      Select the stations this staff member will be assigned to (optional)
    </p>
  </div>
)}
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