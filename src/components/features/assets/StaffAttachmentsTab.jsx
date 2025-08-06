import React, { useState } from 'react';
import { Button, Card, Select } from '../../ui';
import { useApp } from '../../../context/AppContext';
import { User, X, Link } from 'lucide-react';
import clsx from 'clsx';

const StaffAttachmentsTab = () => {
  const { state, dispatch } = useApp();
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState({
    managers: [],
    attendants: [],
    supervisors: []
  });
  
  // Get unattached staff
  const unattachedManagers = state.staff?.stationManagers?.filter(manager => !manager.stationId) || [];
  const unattachedAttendants = state.staff?.attendants?.filter(attendant => !attendant.stationId) || [];
  const unattachedSupervisors = state.staff?.supervisors?.filter(supervisor => !supervisor.stationId) || [];
  
  // Get staff attached to selected station
  const stationManagers = state.staff?.stationManagers?.filter(manager => 
    manager.stationId === selectedStation?.id
  ) || [];
  
  const stationAttendants = state.staff?.attendants?.filter(attendant => 
    attendant.stationId === selectedStation?.id
  ) || [];
  
  const stationSupervisors = state.staff?.supervisors?.filter(supervisor => 
    supervisor.stationId === selectedStation?.id
  ) || [];
  
  const handleSelectStaff = (staffId, staffType) => {
    if (!selectedStation) return;
    
    setSelectedStaff(prev => ({
      ...prev,
      [staffType]: prev[staffType].includes(staffId)
        ? prev[staffType].filter(id => id !== staffId)
        : [...prev[staffType], staffId]
    }));
  };
  
  const handleBulkAttach = () => {
    if (!selectedStation) return;
    
    // Attach all selected staff
    Object.entries(selectedStaff).forEach(([staffType, staffIds]) => {
      const roleMap = {
        managers: 'stationManagers',
        attendants: 'attendants',
        supervisors: 'supervisors'
      };
      
      const roleCategory = roleMap[staffType];
      
      staffIds.forEach(staffId => {
        dispatch({
          type: 'ATTACH_STAFF_TO_STATION',
          payload: {
            stationId: selectedStation.id,
            staffId,
            role: roleCategory
          }
        });
      });
    });
    
    // Clear selection
    setSelectedStaff({
      managers: [],
      attendants: [],
      supervisors: []
    });
  };
  
  const handleDetachStaff = (staffId, staffType) => {
    const roleMap = {
      managers: 'stationManagers',
      attendants: 'attendants',
      supervisors: 'supervisors'
    };
    
    dispatch({
      type: 'DETACH_STAFF_FROM_STATION',
      payload: {
        staffId,
        role: roleMap[staffType]
      }
    });
  };

  // Check if any staff are selected
  const hasSelectedStaff = Object.values(selectedStaff).some(arr => arr.length > 0);
  const totalSelected = Object.values(selectedStaff).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      <Card title="Select Station" className="mb-6">
        <Select
          label="Service Station"
          options={state.serviceStations.map(station => ({
            value: station.id,
            label: `${station.code ? station.code + ' - ' : ''}${station.name}`
          }))}
          value={selectedStation?.id || ''}
          onChange={(e) => {
            const stationId = e.target.value;
            const station = state.serviceStations.find(s => s.id === stationId);
            setSelectedStation(station || null);
            // Clear selection when station changes
            setSelectedStaff({
              managers: [],
              attendants: [],
              supervisors: []
            });
          }}
          placeholder="Select a station"
        />
      </Card>
      
      {selectedStation ? (
        <>
          {/* Bulk Attach Button */}
          <div className="flex justify-end mb-4">
            <Button
              variant="cosmic"
              icon={Link}
              onClick={handleBulkAttach}
              disabled={!hasSelectedStaff}
              className="transition-all"
            >
              Attach Selected Staff ({totalSelected})
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Unattached Managers */}
            <Card title="Available Managers" icon={User}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedManagers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached managers</p>
                ) : (
                  unattachedManagers.map(manager => (
                    <div 
                      key={manager.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedStaff.managers.includes(manager.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleSelectStaff(manager.id, 'managers')}
                    >
                      <div>
                        <div className="font-medium">{manager.name}</div>
                        <div className="text-sm text-gray-500">
                          Manager
                        </div>
                      </div>
                      <div className="flex items-center">
                        {selectedStaff.managers.includes(manager.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedStaff.managers.includes(manager.id) ? "primary" : "outline"}
                        >
                          {selectedStaff.managers.includes(manager.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            {/* Unattached Supervisors */}
            <Card title="Available Supervisors" icon={User}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedSupervisors.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached supervisors</p>
                ) : (
                  unattachedSupervisors.map(supervisor => (
                    <div 
                      key={supervisor.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedStaff.supervisors.includes(supervisor.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleSelectStaff(supervisor.id, 'supervisors')}
                    >
                      <div>
                        <div className="font-medium">{supervisor.name}</div>
                        <div className="text-sm text-gray-500">
                          {supervisor.shift} Shift
                        </div>
                      </div>
                      <div className="flex items-center">
                        {selectedStaff.supervisors.includes(supervisor.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedStaff.supervisors.includes(supervisor.id) ? "primary" : "outline"}
                        >
                          {selectedStaff.supervisors.includes(supervisor.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            {/* Unattached Attendants */}
            <Card title="Available Attendants" icon={User}>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2">
                {unattachedAttendants.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No unattached attendants</p>
                ) : (
                  unattachedAttendants.map(attendant => (
                    <div 
                      key={attendant.id} 
                      className={clsx(
                        "flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all",
                        selectedStaff.attendants.includes(attendant.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => handleSelectStaff(attendant.id, 'attendants')}
                    >
                      <div>
                        <div className="font-medium">{attendant.name}</div>
                        <div className="text-sm text-gray-500">Attendant</div>
                      </div>
                      <div className="flex items-center">
                        {selectedStaff.attendants.includes(attendant.id) && (
                          <span className="text-blue-500 mr-2">Selected</span>
                        )}
                        <Button 
                          size="sm" 
                          variant={selectedStaff.attendants.includes(attendant.id) ? "primary" : "outline"}
                        >
                          {selectedStaff.attendants.includes(attendant.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
          
          {/* Attached Staff */}
          <Card 
            title={`Staff Attached to ${selectedStation.name || selectedStation.code || 'Station'}`}
            headerClass="bg-blue-50"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Attached Managers */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700 mb-2">Managers</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                  {stationManagers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No managers attached</p>
                  ) : (
                    stationManagers.map(manager => (
                      <div 
                        key={manager.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          <div>
                            <div className="font-medium">{manager.name}</div>
                            <div className="text-sm text-gray-500">Manager</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachStaff(manager.id, 'managers')}
                          title="Detach manager"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Attached Supervisors */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700 mb-2">Supervisors</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                  {stationSupervisors.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No supervisors attached</p>
                  ) : (
                    stationSupervisors.map(supervisor => (
                      <div 
                        key={supervisor.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-yellow-500" />
                          <div>
                            <div className="font-medium">{supervisor.name}</div>
                            <div className="text-sm text-gray-500 capitalize">
                              {supervisor.shift} Supervisor
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachStaff(supervisor.id, 'supervisors')}
                          title="Detach supervisor"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Attached Attendants */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700 mb-2">Attendants</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                  {stationAttendants.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No attendants attached</p>
                  ) : (
                    stationAttendants.map(attendant => (
                      <div 
                        key={attendant.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-green-500" />
                          <div>
                            <div className="font-medium">{attendant.name}</div>
                            <div className="text-sm text-gray-500">Attendant</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachStaff(attendant.id, 'attendants')}
                          title="Detach attendant"
                          className="p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="text-center py-10">
            <div className="text-gray-400 mb-2">Select a station to manage its staff</div>
            <div className="text-sm text-gray-500">
              Assign managers, supervisors, and attendants to service stations
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StaffAttachmentsTab;