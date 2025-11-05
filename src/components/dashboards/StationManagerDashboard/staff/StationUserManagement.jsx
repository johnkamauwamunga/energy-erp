import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Tabs, 
  Tag,
  Avatar,
  Space,
  message,
  Tooltip,
  Spin,
  Empty,
  Select,
  Row,
  Col
} from 'antd';
import { 
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { formatDate } from '../../../../utils/helpers';
import { useApp } from '../../../../context/AppContext';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';

const { TabPane } = Tabs;
const { Option } = Select;

const StationUserManagement = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('managers');
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');

  // Fetch stations and users on component mount
  useEffect(() => {
    fetchStations();
    fetchUsers();
  }, []);

  // Filter users when station selection changes
  useEffect(() => {
    filterUsersByStation();
  }, [selectedStation, allUsers, activeTab]);

  const fetchStations = async () => {
    try {
      const response = await stationService.getCompanyStations();
      setStations(response || []);
    } catch (error) {
      console.error('❌ Failed to fetch stations:', error);
      message.error('Failed to load stations');
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userService.getUsers();
      console.log("✅ Users loaded successfully:", response);
      
      if (response.success) {
        setAllUsers(response.data || []);
      } else {
        message.error('Failed to fetch users');
        setAllUsers([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      message.error('Failed to load users');
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users by station and role
  const filterUsersByStation = () => {
    let filtered = allUsers;

    // Filter by station if selected
    if (selectedStation) {
      filtered = filtered.filter(user => 
        user.stationAssignments?.some(assignment => 
          assignment.stationId === selectedStation
        )
      );
    }

    // Filter by role based on active tab
    const roleMap = {
      'managers': 'STATION_MANAGER',
      'supervisors': 'SUPERVISOR',
      'attendants': 'ATTENDANT'
    };

    const currentRole = roleMap[activeTab];
    if (currentRole) {
      filtered = filtered.filter(user => user.role === currentRole);
    }

    setFilteredUsers(filtered);
  };

  // Get station name from stationId
  const getStationName = (user) => {
    if (!user.stationAssignments || user.stationAssignments.length === 0) {
      return 'Not assigned';
    }
    
    const stationNames = user.stationAssignments
      .slice(0, 2)
      .map(assignment => {
        const station = stations.find(s => s.id === assignment.stationId);
        return station ? `${station.name}` : 'Unknown Station';
      })
      .join(', ');
    
    if (user.stationAssignments.length > 2) {
      return `${stationNames} +${user.stationAssignments.length - 2} more`;
    }
    
    return stationNames;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colorMap = {
      'ACTIVE': 'green',
      'INACTIVE': 'red',
      'SUSPENDED': 'orange',
      'ON_LEAVE': 'blue'
    };
    return colorMap[status] || 'default';
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'STATION_MANAGER': 'Station Manager',
      'SUPERVISOR': 'Supervisor',
      'ATTENDANT': 'Attendant',
      'COMPANY_ADMIN': 'Company Admin',
      'SUPER_ADMIN': 'Super Admin'
    };
    return roleMap[role] || role;
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
            <div style={{ color: '#666', fontSize: '12px' }}>
              {getRoleDisplayName(user.role)}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Email',
      key: 'email',
      render: (user) => (
        <div style={{ fontSize: '14px' }}>{user.email}</div>
      )
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (user) => (
        <div style={{ fontSize: '14px' }}>
          {user.phoneNumber || 'N/A'}
        </div>
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
      title: 'Joined Date',
      key: 'joinDate',
      render: (user) => (
        <div style={{ fontSize: '14px' }}>
          {formatDate(user.createdAt)}
        </div>
      )
    },
    {
      title: 'Station',
      key: 'station',
      render: (user) => (
        <div style={{ maxWidth: '200px' }}>
          <span style={{ fontSize: '14px' }}>
            {getStationName(user)}
          </span>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (user) => (
        <Space>
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => console.log('Edit', user.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Add shift column for supervisors
  const supervisorColumns = [
    ...columns.slice(0, 5), // All columns except station and actions
    {
      title: 'Shift',
      key: 'shift',
      render: (user) => (
        <div style={{ fontSize: '14px' }}>
          {user.shift || 'N/A'}
        </div>
      )
    },
    ...columns.slice(5) // Station and actions columns
  ];

  const getCurrentColumns = () => {
    return activeTab === 'supervisors' ? supervisorColumns : columns;
  };

  const getTabItems = () => {
    const roleCounts = {
      managers: allUsers.filter(user => user.role === 'STATION_MANAGER').length,
      supervisors: allUsers.filter(user => user.role === 'SUPERVISOR').length,
      attendants: allUsers.filter(user => user.role === 'ATTENDANT').length
    };

    return [
      {
        key: 'managers',
        label: (
          <span>
            <SafetyCertificateOutlined />
            Managers ({roleCounts.managers})
          </span>
        )
      },
      {
        key: 'supervisors',
        label: (
          <span>
            <SettingOutlined />
            Supervisors ({roleCounts.supervisors})
          </span>
        )
      },
      {
        key: 'attendants',
        label: (
          <span>
            <UserOutlined />
            Attendants ({roleCounts.attendants})
          </span>
        )
      }
    ];
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <ShopOutlined />
            Station User Management
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
          >
            Add New Staff
          </Button>
        }
      >
        {/* Station Filter */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={8}>
            <Select
              value={selectedStation}
              onChange={setSelectedStation}
              placeholder="Filter by station"
              style={{ width: '100%' }}
              allowClear
            >
              {stations.map(station => (
                <Option key={station.id} value={station.id}>
                  {station.code} - {station.name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems()}
        />

        {/* Users Table */}
        <div style={{ marginTop: '16px' }}>
          {isLoading ? (
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
          ) : filteredUsers.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                selectedStation 
                  ? `No ${activeTab} found for selected station`
                  : `No ${activeTab} found`
              }
            />
          ) : (
            <Table
              columns={getCurrentColumns()}
              dataSource={filteredUsers}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} items`
              }}
              scroll={{ x: 800 }}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default StationUserManagement;