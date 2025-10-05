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
    <div className="space-y-4">
      {/* Supervisor Selection - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-sm">Shift Supervisor</span>
        </div>

        <Select
          value={data.supervisorId}
          onChange={handleSupervisorSelect}
          options={supervisors.map(sup => ({
            value: sup.id,
            label: `${sup.firstName} ${sup.lastName}`
          }))}
          placeholder="Select supervisor..."
          required
          size="sm"
        />
        
        {data.supervisorId && (
          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2">
              <Avatar 
                name={getSelectedSupervisor()?.firstName || ''}
                size="xs"
                className="bg-green-100 text-green-800 text-xs"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900 text-sm truncate">
                  {getSelectedSupervisor()?.firstName} {getSelectedSupervisor()?.lastName}
                </p>
                <p className="text-green-700 text-xs truncate">{getSelectedSupervisor()?.email}</p>
              </div>
              <Badge variant="success" size="sm">
                Supervisor
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Attendants Selection - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm">
            Attendants ({data.attendants.length} selected)
          </span>
        </div>

        <Alert variant="info" className="mb-3 text-xs" size="sm">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p>Select attendants for this shift. Island assignments come next.</p>
          </div>
        </Alert>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {attendants.map(attendant => (
            <div
              key={attendant.id}
              className={`p-2 border rounded-md cursor-pointer transition-colors ${
                data.attendants.includes(attendant.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => toggleAttendantSelection(attendant.id)}
            >
              <div className="flex items-center gap-2">
                <Avatar 
                  name={attendant.firstName} 
                  size="xs"
                  className={data.attendants.includes(attendant.id) 
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
                {data.attendants.includes(attendant.id) && (
                  <Badge variant="success" size="sm" className="flex-shrink-0">
                    ✓
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {attendants.length === 0 && !loading && (
          <div className="text-center py-4 text-gray-500">
            <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No active attendants found</p>
          </div>
        )}
      </Card>

      {/* Compact Summary */}
      {(data.supervisorId || data.attendants.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-3 border">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {data.supervisorId && (
              <div>
                <p className="font-semibold text-gray-600">Supervisor</p>
                <p className="text-gray-900 truncate">
                  {getSelectedSupervisor()?.firstName} {getSelectedSupervisor()?.lastName}
                </p>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-600">Attendants</p>
              <p className="text-gray-900">{data.attendants.length} selected</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelStep;