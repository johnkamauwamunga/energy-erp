import React, { useState, useEffect } from 'react';
import { Button, Card, Tabs, Tab, Badge } from '../../ui';
import CreateStaffModal from './users/CreateStaffModal';
import StaffAttachmentsTab from '../../features/assets/StaffAttachmentsTab';
import { User, UserPlus, Link } from 'lucide-react';
import { formatDate } from '../../../utils/helpers';
import { useApp } from '../../../context/AppContext';
import { userService } from '../../../services/userService/userService';

const CompanyUserManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('managers');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userService.getUsers();

      console.log("user responses  ",response)
      // Assuming the response structure is { success: true, data: users }
      dispatch({ type: 'SET_USERS', payload: response.data });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users by role
  const staffTypes = {
    managers: state.users.filter(user => user.role === 'STATION_MANAGER'),
    supervisors: state.users.filter(user => user.role === 'SUPERVISOR'),
    attendants: state.users.filter(user => user.role === 'ATTENDANT')
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
        <td className="p-3">{staff.firstName} {staff.lastName}</td>
        <td className="p-3">{staff.email}</td>
        <td className="p-3">{staff.phoneNumber || 'N/A'}</td>
        <td className="p-3">
          <Badge 
            variant={staff.status === 'ACTIVE' ? 'success' : 'warning'}
            className="capitalize"
          >
            {staff.status.toLowerCase()}
          </Badge>
        </td>
        <td className="p-3">{formatDate(staff.createdAt)}</td>
        {activeTab === 'supervisors' && (
          <td className="p-3 capitalize">{staff.shift || 'N/A'}</td>
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
                  {currentStaff.map(staff => renderStaffRow(staff))}
                </tbody>
              </table>
            </div>
            {currentStaff.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No {activeTab} found
              </div>
            )}
            {isLoading && (
              <div className="text-center py-8 text-gray-500">
                Loading...
              </div>
            )}
          </div>
        )}
      </Card>
      
      <CreateStaffModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onUserCreated={fetchUsers} // Refetch users after creation
      />
    </div>
  );
};

export default CompanyUserManagement;