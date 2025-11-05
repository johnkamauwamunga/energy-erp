import React from 'react';
import Dialog from '../../../ui/Dialog';
import { Badge } from '../../../ui';
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar,
  Shield,
  Eye
} from 'lucide-react';

const ViewUserModal = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'SUPER_ADMIN': 'Super Admin',
      'COMPANY_ADMIN': 'Company Admin',
      'STATION_MANAGER': 'Station Manager',
      'SUPERVISOR': 'Supervisor',
      'ATTENDANT': 'Attendant',
      'LINES_MANAGER': 'Lines Manager'
    };
    return roleMap[role] || role;
  };

  const getStatusVariant = (status) => {
    const variantMap = {
      'ACTIVE': 'success',
      'INACTIVE': 'secondary',
      'SUSPENDED': 'warning',
      'ON_LEAVE': 'info'
    };
    return variantMap[status] || 'secondary';
  };

  const getRoleVariant = (role) => {
    const variantMap = {
      'SUPER_ADMIN': 'purple',
      'COMPANY_ADMIN': 'blue',
      'STATION_MANAGER': 'green',
      'SUPERVISOR': 'orange',
      'ATTENDANT': 'gray',
      'LINES_MANAGER': 'indigo'
    };
    return variantMap[role] || 'gray';
  };

  const canHaveStations = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(user.role);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="md"
    >
      <div className="space-y-6">
        {/* User Header */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-xl font-bold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={getRoleVariant(user.role)}>
                {getRoleDisplayName(user.role)}
              </Badge>
              <Badge variant={getStatusVariant(user.status)}>
                {user.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-gray-600">
            <Mail className="h-5 w-5" />
            <span>{user.email}</span>
          </div>

          <div className="flex items-center space-x-3 text-gray-600">
            <Shield className="h-5 w-5" />
            <span>Role: {getRoleDisplayName(user.role)}</span>
          </div>

          <div className="flex items-center space-x-3 text-gray-600">
            <Calendar className="h-5 w-5" />
            <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Station Assignments */}
        {canHaveStations && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Station Assignments
            </h3>
            
            {user.stationAssignments && user.stationAssignments.length > 0 ? (
              <div className="space-y-2">
                {user.stationAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{assignment.stationName}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {assignment.role.toLowerCase()} • Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getRoleVariant(assignment.role)}>
                      {assignment.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <MapPin className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-gray-500 mt-2">No station assignments</p>
              </div>
            )}
          </div>
        )}

        {!canHaveStations && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-700">
              {user.role === 'COMPANY_ADMIN' 
                ? 'Company Admins have access to all stations in the company'
                : 'Super Admins have system-wide access to all stations'
              }
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default ViewUserModal;