import React, { useState, useEffect } from 'react';
import { Select, Card, Badge, Avatar, Alert, Button } from '../../../../ui';
import { User, UserCheck, Users, Info, Save } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';
import { userService } from '../../../../../services/userService/userService';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { useApp } from '../../../../../context/AppContext';

const PersonnelStep = ({ data, onChange, stationId, shiftId }) => {
  const { state } = useApp();

  const [supervisors, setSupervisors] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [myAttedants, setMyAttedants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentStation = state.currentStation?.id;

  // Load attendants from localStorage on component mount
  useEffect(() => {
    const savedAttendants = localStorage.getItem('currentShiftAttendants');
    if (savedAttendants) {
      try {
        const parsedAttendants = JSON.parse(savedAttendants);
        console.log('📥 Loaded attendants from localStorage:', parsedAttendants);
        onChange({ attendants: parsedAttendants });
      } catch (e) {
        console.error('❌ Error loading attendants from localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
  }, [stationId]);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      const stationUsers = await mockServices.userService.getStationUsers(stationId);
      const supervisorsList = stationUsers.filter(user => 
        user.role === 'SUPERVISOR' && user.status === 'ACTIVE'
      );
      const attendantsList = stationUsers.filter(user => 
        user.role === 'ATTENDANT' && user.status === 'ACTIVE'
      );
      setSupervisors(supervisorsList);
      setAttendants(attendantsList);
    } catch (error) {
      console.error('Failed to fetch personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAttedants = async() => {
      try {
        const response = await userService.getStationAttendants(currentStation)
        console.log("station attedants are ", response)
        setMyAttedants(response);
      } catch(e) {
        console.log("error fetching attedants ", e)
      }
    }

    fetchAttedants();
  }, [currentStation]);

  console.log("shift id ", shiftId);

  const toggleAttendantSelection = (attendant) => {
    const isSelected = data.attendants.some(a => a.id === attendant.id);
    const updatedAttendants = isSelected
      ? data.attendants.filter(a => a.id !== attendant.id)
      : [...data.attendants, attendant]; // Store the full object, not just ID
    
    // Update parent state
    onChange({ attendants: updatedAttendants });
    
    // Save to localStorage
    localStorage.setItem('currentShiftAttendants', JSON.stringify(updatedAttendants));
    console.log('💾 Saved attendants to localStorage:', updatedAttendants);
  };

  const isAttendantSelected = (attendantId) => {
    return data.attendants.some(a => a.id === attendantId);
  };

  const getSelectedSupervisor = () => {
    return supervisors.find(s => s.id === data.supervisorId);
  };

  // Save personnel assignments to shift
  const handleSavePersonnel = async () => {
    if (!shiftId) {
      setSaveError('No shift ID available. Please create shift first.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Extract only attendant IDs for the API call
      const attendantIds = data.attendants.map(attendant => attendant.id);
      
      const personnelData = {
        shiftId: shiftId,
        supervisorId: data.supervisorId,
        attendantIds: attendantIds
      };

      console.log('💾 Saving personnel to shift:', personnelData);
      
      // Call your shift service to update personnel
      const result = await shiftService.updateShiftPersonnel(shiftId, personnelData);
      console.log('✅ Personnel saved successfully:', result);
      
      setSaveSuccess(true);
      
      // Auto-clear success message
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to save personnel:', error);
      setSaveError(error.message || 'Failed to save personnel assignments');
    } finally {
      setSaving(false);
    }
  };

  // Clear attendants from localStorage
  const clearAttendants = () => {
    localStorage.removeItem('currentShiftAttendants');
    onChange({ attendants: [] });
    console.log('🗑️ Cleared attendants from localStorage');
  };

  return (
    <div className="space-y-4">
      {/* Shift ID Display */}
      {shiftId && (
        <Alert variant="info" className="text-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Assigning personnel to Shift:</span>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded">
              {shiftId}
            </code>
          </div>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-center">
          <p className="text-xs font-semibold text-blue-700">Available</p>
          <p className="text-lg font-bold text-blue-900">{myAttedants.length}</p>
          <p className="text-xs text-blue-600">Attendants</p>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-200 text-center">
          <p className="text-xs font-semibold text-green-700">Selected</p>
          <p className="text-lg font-bold text-green-900">{data.attendants.length}</p>
          <p className="text-xs text-green-600">For Shift</p>
        </div>
        <div className="bg-purple-50 p-3 rounded border border-purple-200 text-center">
          <p className="text-xs font-semibold text-purple-700">Progress</p>
          <p className="text-lg font-bold text-purple-900">
            {myAttedants.length > 0 
              ? `${Math.round((data.attendants.length / myAttedants.length) * 100)}%`
              : '0%'
            }
          </p>
          <p className="text-xs text-purple-600">Complete</p>
        </div>
        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
          <p className="text-xs font-semibold text-gray-700">Actions</p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAttendants}
            disabled={data.attendants.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Attendants Selection - Compact */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm">
              Attendants ({data.attendants.length} selected of {myAttedants.length})
            </span>
          </div>
          {data.attendants.length > 0 && (
            <Badge variant="success" size="sm">
              {data.attendants.length} selected
            </Badge>
          )}
        </div>

        <Alert variant="info" className="mb-3 text-xs" size="sm">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p>Select attendants for this shift. Island assignments come next.</p>
          </div>
        </Alert>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {myAttedants.map(attendant => (
            <div
              key={attendant.id}
              className={`p-2 border rounded-md cursor-pointer transition-colors ${
                isAttendantSelected(attendant.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => toggleAttendantSelection(attendant)}
            >
              <div className="flex items-center gap-2">
                <Avatar 
                  name={attendant.firstName} 
                  size="xs"
                  className={isAttendantSelected(attendant.id) 
                    ? 'bg-blue-100 text-blue-800 text-xs' 
                    : 'bg-gray-100 text-xs'
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {attendant.firstName} {attendant.lastName}
                  </p>
                  <p className="text-gray-600 text-xs truncate">{attendant.email}</p>
                </div>
                {isAttendantSelected(attendant.id) && (
                  <Badge variant="success" size="sm" className="flex-shrink-0">
                    ✓
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {myAttedants.length === 0 && !loading && (
          <div className="text-center py-4 text-gray-500">
            <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No active attendants found</p>
          </div>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-between items-center pt-4">
        <div className="text-xs text-gray-500">
          {data.attendants.length > 0 && (
            <span>
              💾 {data.attendants.length} attendants saved to localStorage
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={clearAttendants}
            disabled={data.attendants.length === 0}
          >
            Clear
          </Button>
          <Button
            onClick={handleSavePersonnel}
            disabled={!shiftId || saving || data.attendants.length === 0}
            loading={saving}
            icon={Save}
            size="md"
          >
            {saving ? 'Saving Personnel...' : 'Save to Shift'}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {saveError && (
        <Alert variant="error" className="text-sm" size="sm">
          {saveError}
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert variant="success" className="text-sm" size="sm">
          Personnel assignments saved successfully!
        </Alert>
      )}

      {/* Selected Attendants Preview */}
      {data.attendants.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Selected Attendants</span>
            <Badge variant="success">
              Ready for Island Assignment
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {data.attendants.map(attendant => (
              <div key={attendant.id} className="flex items-center gap-2 p-1">
                <Avatar 
                  name={attendant.firstName} 
                  size="xs"
                  className="bg-blue-100 text-blue-800"
                />
                <span className="truncate">
                  {attendant.firstName} {attendant.lastName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelStep;