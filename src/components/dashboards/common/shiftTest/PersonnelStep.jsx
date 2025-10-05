import React, { useState, useEffect } from 'react';
import { Select, Card, Badge, Avatar, Alert } from '../../../ui';
import { User, UserCheck, Users, Info } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';

const PersonnelStep = ({ data, onChange, stationId }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPersonnel();
  }, [stationId]);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      // Use mock service
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

  const handleSupervisorSelect = (supervisorId) => {
    onChange({ supervisorId });
  };

  const toggleAttendantSelection = (attendantId) => {
    const isSelected = data.attendants.includes(attendantId);
    const updatedAttendants = isSelected
      ? data.attendants.filter(id => id !== attendantId)
      : [...data.attendants, attendantId];
    
    onChange({ attendants: updatedAttendants });
  };

  const getSelectedSupervisor = () => {
    return supervisors.find(s => s.id === data.supervisorId);
  };

  return (
    <div className="space-y-6">
      {/* Supervisor Selection */}
      <Card title="Assign Supervisor" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Select Shift Supervisor</span>
        </div>

        <Select
          label="Supervisor"
          value={data.supervisorId}
          onChange={handleSupervisorSelect}
          options={supervisors.map(sup => ({
            value: sup.id,
            label: `${sup.firstName} ${sup.lastName}`
          }))}
          placeholder="Select a supervisor..."
          required
        />
        
        {data.supervisorId && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <Avatar 
                name={getSelectedSupervisor()?.firstName || ''}
                size="sm"
                className="bg-green-100 text-green-800"
              />
              <div className="flex-1">
                <p className="font-semibold text-green-900">
                  {getSelectedSupervisor()?.firstName} {getSelectedSupervisor()?.lastName}
                </p>
                <p className="text-green-700 text-sm">{getSelectedSupervisor()?.email}</p>
                <p className="text-green-600 text-xs">{getSelectedSupervisor()?.phone}</p>
              </div>
              <Badge variant="success" className="text-xs">
                Supervisor
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Attendants Selection */}
      <Card title="Select Attendants" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">
            Available Attendants ({data.attendants.length} selected)
          </span>
        </div>

        <Alert variant="info" className="mb-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm">
                Select attendants who will be working this shift. You'll assign them to specific islands in the next step.
              </p>
            </div>
          </div>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {attendants.map(attendant => (
            <div
              key={attendant.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                data.attendants.includes(attendant.id)
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => toggleAttendantSelection(attendant.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar 
                    name={attendant.firstName} 
                    size="sm"
                    className={data.attendants.includes(attendant.id) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}
                  />
                  <div>
                    <p className="font-medium">
                      {attendant.firstName} {attendant.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{attendant.email}</p>
                  </div>
                </div>
                
                {data.attendants.includes(attendant.id) && (
                  <Badge variant="success" className="text-xs">
                    Selected
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {attendants.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No active attendants found for this station</p>
          </div>
        )}
      </Card>

      {/* Selection Summary */}
      {(data.supervisorId || data.attendants.length > 0) && (
        <Card title="Assignment Summary" className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {data.supervisorId && (
              <div>
                <p className="font-semibold text-gray-700">Supervisor</p>
                <p className="text-gray-900">
                  {getSelectedSupervisor()?.firstName} {getSelectedSupervisor()?.lastName}
                </p>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-700">Attendants Selected</p>
              <p className="text-gray-900">{data.attendants.length} attendants</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PersonnelStep;