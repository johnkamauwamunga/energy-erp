import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Table, 
  Tabs, 
  Tag,
  Pagination,
  Modal,
  Avatar,
  Space,
  Dropdown,
  Menu,
  message,
  Tooltip,
  Spin,
  Empty,
  Form
} from 'antd';
import { 
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  MoreOutlined,
  FilterOutlined,
  DownloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useApp } from '../../../context/AppContext';
import { userService } from '../../../services/userService/userService';
import CreateStaffModal from './users/CreateStaffModal';
import EditUserModal from './users/EditUserModal';
import ViewUserModal from './users/ViewUserModal';

const { Option } = Select;
const { TabPane } = Tabs;
const { Search } = Input;

const CompanyUserManagement = () => {
  const { state } = useApp();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    station: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [stations, setStations] = useState([]);
  const [form] = Form.useForm();

  // Load users and stations
  useEffect(() => {
    loadUsers();
    loadStations();
  }, [pagination.page, pagination.limit, filters, activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Build query filters properly
      const queryFilters = {
        page: pagination.page,
        limit: pagination.limit
      };

      // Add search filter if provided
      if (filters.search) {
        queryFilters.search = filters.search;
      }

      // Add role filter if provided
      if (filters.role) {
        queryFilters.role = filters.role;
      }

      // Add status filter if provided
      if (filters.status) {
        queryFilters.status = filters.status;
      }

      // Add station filter if provided
      if (filters.station) {
        queryFilters.station = filters.station;
      }

      // Override with active tab role if not 'all'
      if (activeTab !== 'all') {
        queryFilters.role = activeTab;
      }

      console.log('🟢 [UI] Loading users with filters:', queryFilters);

      const response = await userService.getUsers();

      console.log('The Users Users loaded:', response);
      
      if (response.success) {
        setUsers(response.data || []);
        setFilteredUsers(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.totalCount || 0,
          totalPages: response.pagination?.totalPages || 1
        }));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      message.error('Failed to load users');
      // Set empty data on error
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStations = async () => {
    try {
      // This would come from your station service
      // const response = await stationService.getCompanyStations();
      // setStations(response || []);
    } catch (error) {
      console.error('Failed to load stations:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (searchTerm) => {
    handleFilterChange('search', searchTerm);
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleUserCreated = () => {
    setIsCreateModalOpen(false);
    loadUsers();
    message.success('User created successfully');
  };

  const handleUserUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
    loadUsers();
    message.success('User updated successfully');
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleStatusToggle = async (user) => {
    setActionLoading(prev => ({ ...prev, [user.id]: true }));
    
    try {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await userService.updateUserStatus(user.id, newStatus);
      loadUsers();
      message.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Failed to update user status:', error);
      message.error('Failed to update user status');
    } finally {
      setActionLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const handleDeleteUser = async (user) => {
    Modal.confirm({
      title: `Delete User`,
      content: `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [user.id]: true }));
        
        try {
          await userService.deleteUser(user.id);
          loadUsers();
          message.success('User deleted successfully');
        } catch (error) {
          console.error('Failed to delete user:', error);
          message.error('Failed to delete user');
        } finally {
          setActionLoading(prev => ({ ...prev, [user.id]: false }));
        }
      }
    });
  };

  // Get role display name
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

  // Get status badge color
  const getStatusColor = (status) => {
    const colorMap = {
      'ACTIVE': 'green',
      'INACTIVE': 'red',
      'SUSPENDED': 'orange',
      'ON_LEAVE': 'blue'
    };
    return colorMap[status] || 'default';
  };

  // Get role badge color
  const getRoleColor = (role) => {
    const colorMap = {
      'SUPER_ADMIN': 'purple',
      'COMPANY_ADMIN': 'blue',
      'STATION_MANAGER': 'green',
      'SUPERVISOR': 'orange',
      'ATTENDANT': 'gray',
      'LINES_MANAGER': 'cyan'
    };
    return colorMap[role] || 'default';
  };

  // Filter users by role for tabs
  const getUsersByRole = (role) => {
    if (role === 'all') return filteredUsers;
    return filteredUsers.filter(user => user.role === role);
  };

  // Get station names for display
  const getStationNames = (user) => {
    if (!user.stationAssignments || user.stationAssignments.length === 0) {
      return 'No stations assigned';
    }
    
    const stationNames = user.stationAssignments
      .slice(0, 2)
      .map(sa => sa.stationName)
      .join(', ');
    
    if (user.stationAssignments.length > 2) {
      return `${stationNames} +${user.stationAssignments.length - 2} more`;
    }
    
    return stationNames;
  };

  // Role options for filter
  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'COMPANY_ADMIN', label: 'Company Admin' },
    { value: 'STATION_MANAGER', label: 'Station Manager' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ATTENDANT', label: 'Attendant' },
    { value: 'LINES_MANAGER', label: 'Lines Manager' }
  ];

  // Status options for filter
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'ON_LEAVE', label: 'On Leave' }
  ];

  // Tab configuration
  const getTabItems = () => {
    const items = [
      { key: 'all', label: `All Users (${filteredUsers.length})` },
      { key: 'STATION_MANAGER', label: `Managers (${getUsersByRole('STATION_MANAGER').length})` },
      { key: 'SUPERVISOR', label: `Supervisors (${getUsersByRole('SUPERVISOR').length})` },
      { key: 'ATTENDANT', label: `Attendants (${getUsersByRole('ATTENDANT').length})` },
      { key: 'COMPANY_ADMIN', label: `Admins (${getUsersByRole('COMPANY_ADMIN').length})` }
    ];

    // Add Super Admin tab only for super admins
    if (state.currentUser?.role === 'SUPER_ADMIN') {
      items.push({ 
        key: 'SUPER_ADMIN', 
        label: `Super Admins (${getUsersByRole('SUPER_ADMIN').length})` 
      });
    }

    return items;
  };

  // Table columns
  const columns = [
    {
      title: 'User',
      key: 'name',
      render: (user) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }}
            icon={<UserOutlined />}
          >
            {user.firstName?.[0]}{user.lastName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>{user.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      key: 'role',
      render: (user) => (
        <Tag color={getRoleColor(user.role)}>
          {getRoleDisplayName(user.role)}
        </Tag>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (user) => (
        <Tag color={getStatusColor(user.status)}>
          {user.status}
        </Tag>
      )
    },
    {
      title: 'Station Assignments',
      key: 'stations',
      render: (user) => (
        <div style={{ maxWidth: '200px' }}>
          <span style={{ fontSize: '12px' }}>
            {getStationNames(user)}
          </span>
        </div>
      )
    },
    {
      title: 'Created',
      key: 'created',
      render: (user) => (
        <div style={{ fontSize: '12px', color: '#666' }}>
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (user) => (
        <Space>
          <Tooltip title="View User">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewUser(user)}
            />
          </Tooltip>
          
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(user)}
            />
          </Tooltip>
          
          <Tooltip title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
            <Button
              type="text"
              icon={user.status === 'ACTIVE' ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              loading={actionLoading[user.id]}
              onClick={() => handleStatusToggle(user)}
              style={{ 
                color: user.status === 'ACTIVE' ? '#fa8c16' : '#52c41a' 
              }}
            />
          </Tooltip>

          {(state.currentUser?.role === 'SUPER_ADMIN' || user.role !== 'SUPER_ADMIN') && (
            <Tooltip title="Delete User">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={actionLoading[user.id]}
                onClick={() => handleDeleteUser(user)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            margin: 0, 
            color: '#262626' 
          }}>
            User Management
          </h1>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: '#666' 
          }}>
            Manage staff members and their station assignments
          </p>
        </div>
        
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalOpen(true)}
          style={{ alignSelf: 'flex-start' }}
        >
          Add New Staff
        </Button>
      </div>

      {/* Filters and Table Card */}
      <Card>
        {/* Filters */}
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            <div style={{ flex: 1 }}>
              <Search
                placeholder="Search users by name or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onSearch={handleSearch}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <Select
                value={filters.role}
                onChange={(value) => handleFilterChange('role', value)}
                style={{ minWidth: '150px' }}
                placeholder="All Roles"
                allowClear
              >
                {roleOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
              
              <Select
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                style={{ minWidth: '150px' }}
                placeholder="All Status"
                allowClear
              >
                {statusOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems()}
        />

        {/* Users Table */}
        <div>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '48px' 
            }}>
              <Spin size="large" />
              <span style={{ marginLeft: '8px', color: '#666' }}>
                Loading users...
              </span>
            </div>
          ) : getUsersByRole(activeTab).length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                filters.search || filters.role || filters.status 
                  ? "No users found matching your filters"
                  : "No users found"
              }
            >
              {!filters.search && !filters.role && !filters.status && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Add New Staff
                </Button>
              )}
            </Empty>
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={getUsersByRole(activeTab)}
                rowKey="id"
                pagination={false}
                scroll={{ x: 800 }}
              />
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ 
                  padding: '16px', 
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <Pagination
                    current={pagination.page}
                    total={pagination.total}
                    pageSize={pagination.limit}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total, range) => 
                      `${range[0]}-${range[1]} of ${total} items`
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Modals */}
  {/* Modals */}
      <CreateStaffModal
        isOpen={isCreateModalOpen}  // ✅ Use 'isOpen' to match the prop name
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      <EditUserModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />

      <ViewUserModal
        open={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};

export default CompanyUserManagement;