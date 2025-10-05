// components/shifts/ShiftOpeningForm.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Card, Button, Input, Select, Alert } from '../../../ui';
import { User, Clock, PlayCircle, Users } from 'lucide-react';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { userService } from '../../../../services/userService/userService';
import { assetService } from '../../../../services/assetService/assetService';
import { useApp } from '../../../../context/AppContext';

const ShiftOpeningForm = ({ isOpen, onClose, onShiftOpened }) => {
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    supervisorId: '',
    stationId: '',
    shiftType: 'MORNING', // MORNING, EVENING, NIGHT
    attendants: [],
    openingNotes: ''
  });
  const [attendants, setAttendants] = useState([]);
  const [errors, setErrors] = useState({});
  const [supervisor, setSupervisor]= useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);



  const shiftTypes = [
    { value: 'MORNING', label: 'Morning Shift (6:00 AM - 2:00 PM)' },
    { value: 'EVENING', label: 'Evening Shift (2:00 PM - 10:00 PM)' },
    { value: 'NIGHT', label: 'Night Shift (10:00 PM - 6:00 AM)' }
  ];



const fetchUsers = async () => {
  setIsLoading(true);
  try {
    const response = await userService.getUsers({}, dispatch);
    console.log("✅ Users loaded successfully:", response);
    setAllUsers(response);

    // set supervisors & attendants right after fetching
    setSupervisor(response.filter(user => user.role === "SUPERVISOR"));
    setAttendants(response.filter(user => user.role === "ATTENDANT"));

  } catch (error) {
    console.error("❌ Failed to fetch users:", error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  fetchUsers();
}, []);

console.log("attedants ", attendants)
console.log("supervisors ", supervisor)
 

  const validateForm = () => {
    const newErrors = {};
    if (!formData.supervisorId) newErrors.supervisorId = 'Supervisor is required';
    if (!formData.stationId) newErrors.stationId = 'Station is required';
    if (!formData.shiftType) newErrors.shiftType = 'Shift type is required';
    if (formData.attendants.length === 0) newErrors.attendants = 'At least one attendant is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenShift = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const shiftData = {
        ...formData,
        openedById: user.id,
        startTime: new Date().toISOString(),
        status: 'OPEN'
      };

      const newShift = await shiftService.openShift(shiftData);
      onShiftOpened(newShift);
      onClose();
      
      // Reset form
      setFormData({
        supervisorId: '',
        stationId: '',
        shiftType: 'MORNING',
        attendants: [],
        openingNotes: ''
      });
    } catch (error) {
      console.error('Failed to open shift:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open New Shift"
      size="lg"
    >
      <div className="space-y-6">
        <Alert variant="info">
          Opening a new shift will initialize all required readings and assign attendants.
        </Alert>

        {/* Shift Basic Information */}
        <Card title="Shift Information" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Shift Type *"
              options={shiftTypes}
              value={formData.shiftType}
              onChange={(value) => setFormData(prev => ({ ...prev, shiftType: value }))}
              error={errors.shiftType}
              icon={Clock}
            />
            
            <Select
              label="Supervisor *"
              options={[]} // Would be populated with actual supervisors
              value={formData.supervisorId}
              onChange={(value) => setFormData(prev => ({ ...prev, supervisorId: value }))}
              error={errors.supervisorId}
              icon={User}
            />
            
            <Select
              label="Station *"
              options={[]} // Would be populated with stations
              value={formData.stationId}
              onChange={(value) => setFormData(prev => ({ ...prev, stationId: value }))}
              error={errors.stationId}
              icon={Users}
            />
          </div>
        </Card>

        {/* Attendant Assignment */}
        <Card title="Attendant Assignment" className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Assign Attendants *
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {/* Open attendant selection modal */}}
                icon={Users}
              >
                Add Attendants
              </Button>
            </div>
            
            {errors.attendants && (
              <p className="text-red-500 text-sm">{errors.attendants}</p>
            )}

            {/* Selected Attendants List */}
            <div className="space-y-2">
              {formData.attendants.map(attendant => (
                <div key={attendant.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{attendant.firstName} {attendant.lastName}</div>
                    <div className="text-sm text-gray-600">{attendant.position}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      attendants: prev.attendants.filter(a => a.id !== attendant.id)
                    }))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Opening Notes */}
        <Card title="Opening Notes" className="p-4">
          <Input
            label="Additional Notes"
            type="textarea"
            value={formData.openingNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, openingNotes: e.target.value }))}
            placeholder="Any special instructions or notes for this shift..."
            rows={3}
          />
        </Card>

        {/* Error Display */}
        {errors.submit && (
          <Alert variant="error">
            {errors.submit}
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleOpenShift}
            loading={loading}
            disabled={loading}
            icon={PlayCircle}
          >
            Open Shift
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShiftOpeningForm;