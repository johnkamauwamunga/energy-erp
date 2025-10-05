import React, { useState, useEffect } from 'react';
import { Select, Card, Badge, Avatar } from '../../../ui';
import { User, UserCheck, Users } from 'lucide-react';
import { userService } from '../../../../services/userService/userService';

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
      const stationUsers = await userService.getStationUsers(stationId);
      
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

  return (
    <div className="space-y-6">
      {/* Supervisor Selection */}
      <Card title="Assign Supervisor" className="p-6">
        <Select
          label="Shift Supervisor"
          value={data.supervisorId}
          onChange={handleSupervisorSelect}
          options={supervisors.map(sup => ({
            value: sup.id,
            label: `${sup.firstName} ${sup.lastName}`
          }))}
          icon={UserCheck}
          placeholder="Select a supervisor..."
          required
        />
        
        {data.supervisorId && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <Avatar 
                name={supervisors.find(s => s.id === data.supervisorId)?.firstName || ''}
                size="sm"
              />
              <div>
                <p className="font-semibold text-green-900">
                  {supervisors.find(s => s.id === data.supervisorId)?.firstName}{' '}
                  {supervisors.find(s => s.id === data.supervisorId)?.lastName}
                </p>
                <p className="text-green-700 text-sm">Supervisor assigned</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Attendants Selection */}
      <Card title="Select Attendants" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <span className="font-semibold">
            Available Attendants ({data.attendants.length} selected)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {attendants.map(attendant => (
            <div
              key={attendant.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                data.attendants.includes(attendant.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleAttendantSelection(attendant.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={attendant.firstName} size="sm" />
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
    </div>
  );
};

export default PersonnelStep