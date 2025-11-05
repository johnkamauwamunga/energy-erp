import React, { useState, useEffect } from 'react';
import { Input, Button, Select, MultiSelect, Tabs, TabPanel } from '../../../ui';
import Dialog from '../../../ui/Dialog';
import { useApp } from '../../../../context/AppContext';
import { Edit, User, MapPin } from 'lucide-react';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    status: '',
    
    // Station Assignments
    stationAssignments: [],
    newStationId: '',
    newStationRole: 'ATTENDANT'
  });
  
  const [stations, setStations] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Load data when modal opens or user changes
  useEffect(() => {
    const loadData = async () => {
      if (isOpen && user) {
        setIsLoadingStations(true);
        setIsLoadingAssignments(true);
        
        try {
          // Load stations
          const stationsResponse = await stationService.getCompanyStations();
          setStations(stationsResponse || []);
          
          // Load user's current assignments
          const assignmentsResponse = await userService.getUserStationAssignments(user.id);
          setUserAssignments(assignmentsResponse.data || []);
          
          // Set form data
          setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            role: user.role || '',
            status: user.status || 'ACTIVE',
            stationAssignments: assignmentsResponse.data || [],
            newStationId: '',
            newStationRole: 'ATTENDANT'
          });
          
        } catch (error) {
          console.error('Failed to load data:', error);
        } finally {
          setIsLoadingStations(false);
          setIsLoadingAssignments(false);
        }
      }
    };

    if (isOpen) {
      loadData();
      setErrors({});
      setSuccessMessage('');
      setActiveTab('personal');
    }
  }, [isOpen, user]);

  const validatePersonalInfo = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    return newErrors;
  };

  const handleUpdatePersonalInfo = async (e) => {
    e.preventDefault();
    const validationErrors = validatePersonalInfo();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status
      };
      
      console.log('🟢 [UPDATE USER] Sending data:', updateData);
      
      const response = await userService.updateUser(user.id, updateData);

      if (response.success) {
        setSuccessMessage('User information updated successfully!');
        onUserUpdated();
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrors({ general: response.message || 'Failed to update user' });
      }
    } catch (error) {
      console.error('❌ [UPDATE USER] Failed to update user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user';
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStationAssignment = async () => {
    if (!formData.newStationId) {
      setErrors({ stations: 'Please select a station' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await userService.assignUserToStation(
        user.id,
        formData.newStationId,
        formData.newStationRole
      );

      if (response.success) {
        setSuccessMessage('User assigned to station successfully!');
        
        // Refresh assignments
        const assignmentsResponse = await userService.getUserStationAssignments(user.id);
        setUserAssignments(assignmentsResponse.data || []);
        setFormData(prev => ({
          ...prev,
          stationAssignments: assignmentsResponse.data || [],
          newStationId: '',
          newStationRole: 'ATTENDANT'
        }));
        
        onUserUpdated();
      } else {
        setErrors({ stations: response.message || 'Failed to assign station' });
      }
    } catch (error) {
      console.error('❌ [STATION ASSIGN] Failed to assign station:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign station';
      setErrors({ stations: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStationAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this station assignment?')) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await userService.unassignUserFromStation(user.id, assignmentId);

      if (response.success) {
        setSuccessMessage('Station assignment removed successfully!');
        
        // Refresh assignments
        const assignmentsResponse = await userService.getUserStationAssignments(user.id);
        setUserAssignments(assignmentsResponse.data || []);
        setFormData(prev => ({
          ...prev,
          stationAssignments: assignmentsResponse.data || []
        }));
        
        onUserUpdated();
      } else {
        setErrors({ stations: response.message || 'Failed to remove assignment' });
      }
    } catch (error) {
      console.error('❌ [STATION UNASSIGN] Failed to remove assignment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove assignment';
      setErrors({ stations: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user provides input
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
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

  // Get available stations (stations user is not already assigned to)
  const availableStations = stations.filter(station => 
    !userAssignments.some(assignment => assignment.stationId === station.id)
  );

  const canHaveStations = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(formData.role);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit User - ${user?.firstName} ${user?.lastName}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 mb-4 text-green-700 bg-green-100 rounded-lg">
            {successMessage}
          </div>
        )}

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: 'personal', label: 'Personal Info', icon: User },
            { value: 'stations', label: 'Station Assignments', icon: MapPin }
          ]}
        />

        {/* Personal Info Tab */}
        <TabPanel value="personal" activeValue={activeTab}>
          <form onSubmit={handleUpdatePersonalInfo} className="space-y-4">
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
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'SUSPENDED', label: 'Suspended' }
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
                icon={Edit}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </TabPanel>

        {/* Station Assignments Tab */}
        <TabPanel value="stations" activeValue={activeTab}>
          <div className="space-y-6">
            {/* Current Assignments */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Current Station Assignments</h3>
              
              {isLoadingAssignments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading assignments...</p>
                </div>
              ) : userAssignments.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No station assignments</p>
                  {!canHaveStations && (
                    <p className="text-sm text-gray-400 mt-1">
                      {formData.role} role does not support station assignments
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {userAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{assignment.station?.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {assignment.role.toLowerCase()} • Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveStationAssignment(assignment.id)}
                        disabled={isSubmitting}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Assignment */}
            {canHaveStations && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Add New Station Assignment</h3>
                
                {errors.stations && (
                  <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
                    {errors.stations}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Station"
                    value={formData.newStationId}
                    onChange={(e) => handleInputChange('newStationId', e.target.value)}
                    options={availableStations.map(station => ({
                      value: station.id,
                      label: station.name
                    }))}
                    disabled={isLoadingStations || availableStations.length === 0}
                    placeholder={availableStations.length === 0 ? "No available stations" : "Select station"}
                  />
                  
                  <Select
                    label="Role at Station"
                    value={formData.newStationRole}
                    onChange={(e) => handleInputChange('newStationRole', e.target.value)}
                    options={[
                      { value: 'STATION_MANAGER', label: 'Station Manager' },
                      { value: 'SUPERVISOR', label: 'Supervisor' },
                      { value: 'ATTENDANT', label: 'Attendant' }
                    ]}
                  />
                </div>

                {availableStations.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    User is already assigned to all available stations
                  </p>
                )}

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handleAddStationAssignment}
                    disabled={!formData.newStationId || isSubmitting || availableStations.length === 0}
                    loading={isSubmitting}
                  >
                    Add Assignment
                  </Button>
                </div>
              </div>
            )}

            {!canHaveStations && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-700">
                  {formData.role === 'COMPANY_ADMIN' 
                    ? 'Company Admins have access to all stations automatically'
                    : 'Super Admins have system-wide access to all stations'
                  }
                </p>
              </div>
            )}
          </div>
        </TabPanel>
      </div>
    </Dialog>
  );
};

export default EditUserModal;