// src/components/shift/Shift360View.jsx
import React, { useState } from 'react';
import { Modal, Table, Badge, Button, Card } from '../../../ui';
import { formatDate, formatCurrency } from '../../../../utils/helpers';
import { useApp } from '../../../../context/AppContext';
import ShiftCloseReconciliation from './ShiftCloseReconcilliation';

const Shift360View = ({ shift, onClose }) => {
  const { state } = useApp();
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  
  // Find supervisor
  const supervisor = state.staff.supervisors.find(s => s.id === shift.supervisorId);
  
  // Find station
  const station = state.serviceStations.find(s => s.id === shift.stationId);
  
  // Calculate total sales
  const totalSales = shift.attendants.reduce((sum, attendant) => 
    sum + (attendant.totalSales || 0), 0
  );

  // Get islands for this shift
  const shiftIslands = state.islands.filter(island => 
    shift.islands?.includes(island.id)
  );

  // Get attendants for selected island
  const islandAttendants = shift.attendants.filter(attendant => 
    attendant.islandId === selectedIsland?.id
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={`Shift #${shift.id}`} size="2xl">
      <div className="space-y-6">
        {/* Shift header info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Shift Date</h3>
            <p className="text-lg font-medium">{formatDate(shift.startTime)}</p>
            <p className="text-sm text-gray-600">
              {formatDate(shift.startTime, 'HH:mm')} - {formatDate(shift.endTime, 'HH:mm')}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Badge 
              variant={
                shift.status === 'active' ? 'success' : 
                shift.status === 'closed' ? 'default' : 'warning'
              }
              className="text-lg capitalize"
            >
              {shift.status}
            </Badge>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Supervisor In Charge</h3>
            <p className="text-lg font-medium">{supervisor?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600">{supervisor?.phone || ''}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Service Station</h3>
            <p className="text-lg font-medium">{station?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600">{station?.location || ''}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Attendants</h3>
            <p className="text-lg font-medium">{shift.attendants.length}</p>
            <p className="text-sm text-gray-600">{shiftIslands.length} islands</p>
          </div>
        </div>
        
        {/* Islands Table */}
        <div>
          <h3 className="text-lg font-medium mb-4">Allocation Points</h3>
          <Table
            columns={[
              { header: 'Island', accessor: 'name' },
              { header: 'Attendants', accessor: 'attendantsCount' },
              { header: 'Status', accessor: 'status' },
              { header: 'Actions', accessor: 'actions' }
            ]}
            data={shiftIslands.map(island => {
              const islandAttendants = shift.attendants.filter(a => a.islandId === island.id);
              const status = island.status || 'active';
              
              return {
                ...island,
                name: island.name,
                attendantsCount: islandAttendants.length,
                status: (
                  <Badge 
                    variant={status === 'active' ? 'success' : 'default'}
                    className="capitalize"
                  >
                    {status}
                  </Badge>
                ),
                actions: (
                  <Button 
                    size="sm"
                    onClick={() => setSelectedIsland(selectedIsland?.id === island.id ? null : island)}
                  >
                    {selectedIsland?.id === island.id ? 'Hide' : 'View'} Attendants
                  </Button>
                )
              };
            })}
          />
        </div>
        
        {/* Show attendants for selected island */}
        {selectedIsland && (
          <Card title={`Attendants at ${selectedIsland.name}`}>
            <Table
              columns={[
                { header: 'Name', accessor: 'name' },
                { header: 'Posting', accessor: 'posting' },
                { header: 'Total Sales', accessor: 'sales' }
              ]}
              data={islandAttendants.map(attendant => {
                const staff = state.staff.attendants.find(a => a.id === attendant.id);
                return {
                  name: staff?.name || 'Unknown',
                  posting: attendant.posting || 'N/A',
                  sales: formatCurrency(attendant.totalSales || 0)
                };
              })}
            />
          </Card>
        )}
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Total Shift Sales</h3>
            <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
          </div>
        </div>
        
        {shift.status === 'active' && (
          <div className="flex justify-center pt-4">
            <Button 
              size="lg"
              onClick={() => setIsReconciliationOpen(true)}
            >
              Close Shift
            </Button>
          </div>
        )}
      </div>
      
      {isReconciliationOpen && (
        <ShiftCloseReconciliation 
          shift={shift}
          onClose={() => {
            setIsReconciliationOpen(false);
            onClose(); // Also close the 360 view
          }}
        />
      )}
    </Modal>
  );
};

export default Shift360View;