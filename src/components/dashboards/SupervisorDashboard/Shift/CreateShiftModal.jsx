import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Card, Input } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { Plus, X, User, MapPin, Clock, UserCheck } from 'lucide-react';
import clsx from 'clsx';

const CreateShiftModal = ({ onClose }) => {
  const { state } = useApp();
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [shiftDetails, setShiftDetails] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    endTime: '',
    supervisorId: ''
  });
  const [currentPostings, setCurrentPostings] = useState({});
  const [selectedAttendantIds, setSelectedAttendantIds] = useState([]);
  
  // Get current station from logged-in user
  const currentStation = state.currentUser?.stationId;
  
  // Filter islands by current station
  const stationIslands = state.islands.filter(
    island => island.stationId === currentStation
  );
  
  // Get unattached attendants
  const systemUnattachedAttendants = state.staff.attendants.filter(attendant => {
    if (attendant.stationId !== currentStation) return false;
    
    const isInActiveShift = state.shifts.some(shift => 
      shift.status === 'active' && 
      shift.attendants.some(a => a.id === attendant.id)
    );
    
    return !isInActiveShift;
  });

  // Get all assigned attendant IDs in current session
  const assignedAttendantIds = new Set();
  Object.values(assignments).forEach(islandAssignments => {
    islandAssignments.forEach(a => assignedAttendantIds.add(a.attendantId));
  });

  // Filter out attendants already assigned
  const unattachedAttendants = systemUnattachedAttendants.filter(
    attendant => !assignedAttendantIds.has(attendant.id)
  );

  // Set default end time (1 hour from now)
  useEffect(() => {
    const now = new Date();
    const endTime = new Date(now.setHours(now.getHours() + 1)).toISOString().slice(0, 16);
    setShiftDetails(prev => ({ ...prev, endTime }));
  }, []);

  // Handle island selection
  const handleSelectIsland = (islandId) => {
    const island = stationIslands.find(i => i.id === islandId);
    setSelectedIsland(island);
  };

  // Handle attendant selection
  const toggleAttendantSelection = (attendantId) => {
    setSelectedAttendantIds(prev => {
      if (prev.includes(attendantId)) {
        return prev.filter(id => id !== attendantId);
      } else {
        return [...prev, attendantId];
      }
    });
  };

  // Handle posting assignment
  const handlePostingChange = (attendantId, posting) => {
    setCurrentPostings(prev => ({
      ...prev,
      [attendantId]: posting
    }));
  };

  // Assign selected attendants to island
  const assignToIsland = () => {
    if (!selectedIsland || selectedAttendantIds.length === 0) return;
    
    const newAssignments = selectedAttendantIds.map(id => ({
      attendantId: id,
      posting: currentPostings[id] || 'Not assigned'
    }));
    
    setAssignments(prev => ({
      ...prev,
      [selectedIsland.id]: [
        ...(prev[selectedIsland.id] || []),
        ...newAssignments
      ]
    }));
    
    // Reset selection
    setSelectedAttendantIds([]);
    setCurrentPostings({});
  };

  // Remove attendant from assignment
  const removeAssignment = (islandId, attendantId) => {
    setAssignments(prev => {
      const updated = { ...prev };
      if (updated[islandId]) {
        updated[islandId] = updated[islandId].filter(a => a.attendantId !== attendantId);
        if (updated[islandId].length === 0) {
          delete updated[islandId];
        }
      }
      return updated;
    });
  };

  // Handle shift creation
  const createShift = () => {
    const timestamp = Date.now();
    
    const shifts = Object.entries(assignments).map(([islandId, attendants], index) => ({
      id: `SHIFT_${timestamp}_${index}`,
      stationId: currentStation,
      islandId,
      startTime: shiftDetails.startTime,
      endTime: shiftDetails.endTime,
      status: 'pending',
      supervisorId: shiftDetails.supervisorId,
      attendants: attendants.map(a => ({
        id: a.attendantId,
        posting: a.posting,
        totalSales: 0
      }))
    }));
    
    console.log('Created shifts:', shifts);
    onClose();
  };

  const hasAssignments = Object.keys(assignments).length > 0;
  const isFormValid = hasAssignments && 
                     shiftDetails.startTime && 
                     shiftDetails.endTime && 
                     shiftDetails.supervisorId;

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Shift" size="2xl">
      <div className="space-y-6">
        {/* Island Selection Section */}
        <Card title="1. Select Allocation Point">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Service Island"
              options={[
                { value: '', label: 'Select an island' },
                ...stationIslands.map(island => ({
                  value: island.id,
                  label: island.name
                }))
              ]}
              value={selectedIsland?.id || ''}
              onChange={(e) => handleSelectIsland(e.target.value)}
              icon={MapPin}
            />
            
            {selectedIsland && (
              <div className="flex items-end">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex-1">
                  <div className="text-sm text-blue-700">Selected Island</div>
                  <div className="font-medium">{selectedIsland.name}</div>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Attendant Assignment Section */}
        {selectedIsland && (
          <Card title="2. Assign Attendants">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Available Attendants */}
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Available Attendants ({unattachedAttendants.length})
                </h3>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {unattachedAttendants.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      All attendants have been assigned
                    </div>
                  ) : (
                    unattachedAttendants.map(attendant => (
                      <div 
                        key={attendant.id}
                        className={clsx(
                          "p-3 rounded-lg border transition-all cursor-pointer",
                          selectedAttendantIds.includes(attendant.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => toggleAttendantSelection(attendant.id)}
                      >
                        <div className="font-medium">{attendant.name}</div>
                        <div className="text-sm text-gray-600">{attendant.email}</div>
                        
                        {selectedAttendantIds.includes(attendant.id) && (
                          <div className="mt-2">
                            <Input
                              label="Posting Assignment"
                              placeholder="e.g., Dispenser 1"
                              value={currentPostings[attendant.id] || ''}
                              onChange={(e) => handlePostingChange(attendant.id, e.target.value)}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                <Button
                  onClick={assignToIsland}
                  disabled={selectedAttendantIds.length === 0}
                  className="mt-4 w-full"
                  icon={Plus}
                >
                  Assign to {selectedIsland.name}
                </Button>
              </div>
              
              {/* Current Assignments */}
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Current Assignments
                </h3>
                
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {Object.entries(assignments).map(([islandId, attendants]) => {
                    const island = stationIslands.find(i => i.id === islandId);
                    return (
                      <div key={islandId} className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-3 py-2 font-medium border-b">
                          {island?.name || 'Unknown Island'}
                        </div>
                        <div className="divide-y">
                          {attendants.map(({ attendantId, posting }) => {
                            const attendant = state.staff.attendants.find(a => a.id === attendantId);
                            return (
                              <div key={attendantId} className="px-3 py-2 flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{attendant?.name}</div>
                                  <div className="text-sm text-gray-600">
                                    Posting: {posting}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => removeAssignment(islandId, attendantId)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {!hasAssignments && (
                    <div className="text-center py-6 text-gray-500">
                      No attendants assigned yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Shift Details Section */}
        <Card title="3. Schedule Shift">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Time"
              type="datetime-local"
              value={shiftDetails.startTime}
              onChange={e => setShiftDetails({
                ...shiftDetails,
                startTime: e.target.value
              })}
              icon={Clock}
            />
            
            <Input
              label="End Time"
              type="datetime-local"
              value={shiftDetails.endTime}
              onChange={e => setShiftDetails({
                ...shiftDetails,
                endTime: e.target.value
              })}
              icon={Clock}
            />
            
            <Select
              label="Supervisor In Charge"
              value={shiftDetails.supervisorId}
              onChange={e => setShiftDetails({
                ...shiftDetails,
                supervisorId: e.target.value
              })}
              options={[
                { value: '', label: 'Select Supervisor' },
                ...state.staff.supervisors
                  .filter(s => s.stationId === currentStation)
                  .map(supervisor => ({
                    value: supervisor.id,
                    label: supervisor.name
                  }))
              ]}
              icon={User}
            />
          </div>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={createShift}
            disabled={!isFormValid}
          >
            Create Shift
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateShiftModal;