import React, { useState } from 'react';
import { Button, Card, Tabs, Tab, Badge } from '../../ui';
import CreateStaffModal from './create/CreateStaffModal';
import StaffAttachmentsTab from '../../features/assets/StaffAttachmentsTab';
import { User, UserPlus, Link } from 'lucide-react';
import { formatDate } from '../../../utils/helpers';
import { useApp } from '../../../context/AppContext';

const CompanyUserManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('managers');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Corrected staff types to match your state structure
  const staffTypes = {
    managers: state.staff?.stationManagers || [],
    supervisors: state.staff?.supervisors || [],
    attendants: state.staff?.attendants || []
  };
  
  const currentStaff = staffTypes[activeTab] || [];

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Status', accessor: 'status' },
    { header: 'Joined', accessor: 'joinDate' },
    ...(activeTab === 'supervisors' ? [{ header: 'Shift', accessor: 'shift' }] : []),
    { header: 'Station', accessor: 'station' },
    { header: 'Actions', accessor: 'actions' }
  ];

  const renderStaffRow = (staff) => {
    let stationInfo = '';
    if (staff.stationId) {
      const station = state.serviceStations.find(s => s.id === staff.stationId);
      stationInfo = station ? `${station.code} - ${station.name}` : 'Unknown Station';
    }
    
    return (
      <tr key={staff.id} className="hover:bg-gray-50">
        <td className="p-3">{staff.name}</td>
        <td className="p-3">{staff.email}</td>
        <td className="p-3">{staff.phone}</td>
        <td className="p-3">
          <Badge 
            variant={staff.status === 'active' ? 'success' : 'warning'}
            className="capitalize"
          >
            {staff.status}
          </Badge>
        </td>
        <td className="p-3">{formatDate(staff.joinDate)}</td>
        {activeTab === 'supervisors' && (
          <td className="p-3 capitalize">{staff.shift}</td>
        )}
        <td className="p-3">{stationInfo || 'Not assigned'}</td>
        <td className="p-3">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => console.log('Edit', staff.id)}
          >
            Edit
          </Button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <Card
        title="Company User Management"
        actions={
          <Button 
            variant="cosmic" 
            icon={UserPlus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add New Staff
          </Button>
        }
      >
                <div className="flex flex-right space-x-3">
      <Button 
            variant="cosmic" 
            icon={UserPlus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add New Staff
          </Button>
          </div>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="managers" icon={User}>
            Managers ({staffTypes.managers.length})
          </Tab>
          <Tab value="supervisors" icon={User}>
            Supervisors ({staffTypes.supervisors.length})
          </Tab>
          <Tab value="attendants" icon={User}>
            Attendants ({staffTypes.attendants.length})
          </Tab>
          <Tab value="attachments" icon={Link}>
            Station Assignments
          </Tab>
        </Tabs>
        
        {activeTab === 'attachments' ? (
          <StaffAttachmentsTab />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {columns.map(column => (
                      <th 
                        key={column.accessor} 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStaff.map(staff => {
                    // Find station info for each staff member
                    let stationInfo = '';
                    if (staff.stationId) {
                      const station = state.serviceStations.find(s => s.id === staff.stationId);
                      stationInfo = station ? `${station.name}` : 'N/A';
                    }
                    
                    return (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="p-3">{staff.name}</td>
                        <td className="p-3">{staff.email}</td>
                        <td className="p-3">{staff.phone}</td>
                        <td className="p-3">
                          <Badge 
                            variant={staff.status === 'active' ? 'success' : 'warning'}
                            className="capitalize"
                          >
                            {staff.status}
                          </Badge>
                        </td>
                        <td className="p-3">{formatDate(staff.joinDate)}</td>
                        {activeTab === 'supervisors' && (
                          <td className="p-3 capitalize">{staff.shift}</td>
                        )}
                        <td className="p-3">{stationInfo || 'Not assigned'}</td>
                        <td className="p-3">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => console.log('Edit', staff.id)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {currentStaff.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No {activeTab} found
              </div>
            )}
          </div>
        )}
      </Card>
      
      <CreateStaffModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
};

export default CompanyUserManagement;