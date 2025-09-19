import React, { useState, useEffect } from 'react';
import { Button, Card, Select } from '../../ui';
import Alert from '../../ui/Alert'; // Updated import for our new Alert component
import { useApp } from '../../../context/AppContext';
import { User, X, Link } from 'lucide-react';
import { stationService } from '../../../services/stationService/stationService';
import { userService } from '../../../services/userService/userService';
import clsx from 'clsx';

const StaffAttachmentsTab = () => {
  const { state, dispatch } = useApp();
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState({
    managers: [],
    attendants: [],
    supervisors: []
  });
  const [assignments, setAssignments] = useState([]);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationError, setStationError] = useState('');
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' // 'info', 'success', 'warning', or 'error'
  });

  // Close alert function
  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  // Show alert function
  const showAlert = (title, message, type = 'info') => {
    setAlert({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Load stations when component mounts
  const loadStations = async () => {
    try {
      setLoadingStations(true);
      setStationError('');

      // Fetch stations for the company
      const response = await stationService.getCompanyStations();

      if (response) {
        setStations(response);
      } else {
        setStationError('Failed to load stations');
        showAlert('Error', 'Failed to load stations', 'error');
      }
    } catch (err) {
      console.error('❌ Failed to fetch stations:', err);
      setStationError(err.message || 'Failed to fetch stations');
      showAlert('Error', err.message || 'Failed to fetch stations', 'error');
    } finally {
      setLoadingStations(false);
    }
  };

  // Load assignments when station is selected
  const loadAssignments = async () => {
    if (!selectedStation) return;
    
    try {
      setIsLoadingAssignments(true);
      const response = await userService.getStationAssignments(selectedStation.id);
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      showAlert('Error', 'Failed to load station assignments', 'error');
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // Fetch users on component mount
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userService.getUsers({}, dispatch);
      console.log("✅ Users loaded successfully:", response);
      setAllUsers(response);
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      showAlert('Error', 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    loadStations();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [selectedStation]);

  // Get staff by role from Redux state
  const getStaffByRole = (role) => {
    return allUsers.filter(user => user.role === role);
  };

  // Get unattached staff (not assigned to any station)
  const unattachedManagers = getStaffByRole('STATION_MANAGER').filter(manager => 
    !assignments.some(a => a.userId === manager.id)
  );
  
  const unattachedAttendants = getStaffByRole('ATTENDANT').filter(attendant => 
    !assignments.some(a => a.userId === attendant.id)
  );
  
  const unattachedSupervisors = getStaffByRole('SUPERVISOR').filter(supervisor => 
    !assignments.some(a => a.userId === supervisor.id)
  );
  
  // Get staff attached to selected station
  const stationManagers = assignments.filter(a => 
    a.role === 'STATION_MANAGER'
  );
  
  const stationAttendants = assignments.filter(a => 
    a.role === 'ATTENDANT'
  );
  
  const stationSupervisors = assignments.filter(a => 
    a.role === 'SUPERVISOR'
  );
  
  const handleSelectStaff = (staffId, staffType) => {
    if (!selectedStation) return;
    
    setSelectedStaff(prev => ({
      ...prev,
      [staffType]: prev[staffType].includes(staffId)
        ? prev[staffType].filter(id => id !== staffId)
        : [...prev[staffType], staffId]
    }));
  };
  
  const handleBulkAttach = async () => {
    if (!selectedStation) return;
    
    try {
      // Prepare bulk assignment data
      const roleMap = {
        managers: 'STATION_MANAGER',
        attendants: 'ATTENDANT',
        supervisors: 'SUPERVISOR'
      };
      
      const assignmentsData = [];
      
      // Create assignment objects for each selected staff
      Object.entries(selectedStaff).forEach(([staffType, staffIds]) => {
        if (staffIds.length > 0) {
          staffIds.forEach(staffId => {
            assignmentsData.push({
              userId: staffId,
              role: roleMap[staffType]
            });
          });
        }
      });
      
      if (assignmentsData.length === 0) return;
      
      // Call the bulk assignment API
      const response = await userService.assignUsersBulk({
        stationId: selectedStation.id,
        assignments: assignmentsData
      });
      
      // Show success message with details
      showAlert(
        'Success', 
        `Successfully assigned ${response.successCount} staff members.${response.errorCount > 0 ? ` ${response.errorCount} assignments failed.` : ''}`,
        'success'
      );
      
      // Refresh assignments
      await loadAssignments();
      
      // Clear selection
      setSelectedStaff({
        managers: [],
        attendants: [],
        supervisors: []
      });
      
    } catch (error) {
      console.error('Failed to assign staff to station:', error);
      showAlert(
        'Error', 
        error.message || 'Failed to assign staff to station. Please try again.', 
        'error'
      );
    }
  };
  
  const handleDetachStaff = async (assignmentId) => {
    try {
      await userService.unassignUserFromStation(assignmentId);
      
      // Refresh assignments
      await loadAssignments();
      
      // Show success message
      showAlert('Success', 'Staff successfully removed from station!', 'success');
      
    } catch (error) {
      console.error('Failed to remove staff from station:', error);
      showAlert(
        'Error', 
        error.message || 'Failed to remove staff from station. Please try again.', 
        'error'
      );
    }
  };

  // Check if any staff are selected
  const hasSelectedStaff = Object.values(selectedStaff).some(arr => arr.length > 0);
  const totalSelected = Object.values(selectedStaff).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Alert Component */}
      <Alert
        isOpen={alert.isOpen}
        onClose={closeAlert}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        duration={5000}
      />
      
      <Card title="Select Station" className="mb-6">
        <Select
          label="Service Station"
          options={stations.map(station => ({
            value: station.id,
            label: station.name
          }))}
          value={selectedStation?.id || ''}
          onChange={(e) => {
            const stationId = e.target.value;
            const station = stations.find(s => s.id === stationId);
            setSelectedStation(station || null);
            setSelectedStaff({ managers: [], attendants: [], supervisors: [] });
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
                        <div className="font-medium">{manager.firstName} {manager.lastName}</div>
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
                        <div className="font-medium">{supervisor.firstName} {supervisor.lastName}</div>
                        <div className="text-sm text-gray-500">
                          Supervisor
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
                        <div className="font-medium">{attendant.firstName} {attendant.lastName}</div>
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
            title={`Staff Attached to ${selectedStation.name}`}
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
                    stationManagers.map(assignment => (
                      <div 
                        key={assignment.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          <div>
                            <div className="font-medium">{assignment.user.firstName} {assignment.user.lastName}</div>
                            <div className="text-sm text-gray-500">Manager</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachStaff(assignment.id)}
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
                    stationSupervisors.map(assignment => (
                      <div 
                        key={assignment.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-yellow-500" />
                          <div>
                            <div className="font-medium">{assignment.user.firstName} {assignment.user.lastName}</div>
                            <div className="text-sm text-gray-500">Supervisor</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachStaff(assignment.id)}
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
                    stationAttendants.map(assignment => (
                      <div 
                        key={assignment.id} 
                        className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-green-500" />
                          <div>
                            <div className="font-medium">{assignment.user.firstName} {assignment.user.lastName}</div>
                            <div className="text-sm text-gray-500">Attendant</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDetachStaff(assignment.id)}
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