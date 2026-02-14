// Updated StationUserManagement.jsx - with compact filters and simplified report columns

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Card, 
  Button, 
  Dropdown,
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
  Col,
  Typography,
  Badge,
  Input,
  Modal,
  Descriptions,
  Divider,
  Alert,
  Statistic,
  Progress
} from 'antd';
import { 
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  DownOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { formatDate } from '../../../../utils/helpers';
import { useApp } from '../../../../context/AppContext';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import AdvancedReportGenerator from '../../../dashboards/common/downloadable/AdvancedReportGenerator';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const StationUserManagement = () => {
  const { state } = useApp();
  const currentUser = state?.currentUser;
  const currentCompany = state?.currentCompany;
  const currentStation = state?.currentStation;
  
  const [activeTab, setActiveTab] = useState('managers');
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [stations, setStations] = useState([]);
  
  // COMPACT FILTERS - Reduced to essential only
  const [filters, setFilters] = useState({
    search: '',
    station: '',
    status: '',
    page: 1,
    limit: 20
  });

  // Report Generation States
  const [activeReport, setActiveReport] = useState(null); // 'all' or 'current'
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const reportGeneratorRef = useRef(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    onLeave: 0,
    managers: 0,
    supervisors: 0,
    attendants: 0,
    avgUsersPerStation: 0,
    recentlyAdded: 0
  });

  // Modals
  const [userDetailsModal, setUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false); // Toggle for advanced filters

  // Fetch stations and users on component mount
  useEffect(() => {
    fetchStations();
    fetchUsers();
  }, []);

  // Filter users when filters change
  useEffect(() => {
    filterUsers();
  }, [filters, allUsers, activeTab]);

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
      
      let usersArray = [];
      if (response.success && response.data) {
        usersArray = response.data || [];
      } else if (Array.isArray(response)) {
        usersArray = response;
      } else if (response.data && Array.isArray(response.data)) {
        usersArray = response.data;
      }
      
      // Process user data
      const processedUsers = usersArray.map(user => ({
        ...user,
        stationAssignments: user.stationAssignments || [],
        status: user.status || 'ACTIVE',
        primaryStation: user.stationAssignments?.[0] || null
      }));
      
      // Sort users by createdAt in DESC order by default
      const sortedUsers = [...processedUsers].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.joinDate || Date.now());
        const dateB = new Date(b.createdAt || b.joinDate || Date.now());
        return dateB - dateA;
      });
      
      setAllUsers(sortedUsers);
      calculateStats(sortedUsers);
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      message.error('Failed to load users');
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (users) => {
    const total = users.length;
    const active = users.filter(user => user.status === 'ACTIVE').length;
    const inactive = users.filter(user => user.status === 'INACTIVE').length;
    const suspended = users.filter(user => user.status === 'SUSPENDED').length;
    const onLeave = users.filter(user => user.status === 'ON_LEAVE').length;
    
    const managers = users.filter(user => user.role === 'STATION_MANAGER').length;
    const supervisors = users.filter(user => user.role === 'SUPERVISOR').length;
    const attendants = users.filter(user => user.role === 'ATTENDANT').length;
    
    // Calculate average users per station
    const stationUserCounts = {};
    users.forEach(user => {
      user.stationAssignments.forEach(assignment => {
        if (assignment.stationId) {
          stationUserCounts[assignment.stationId] = (stationUserCounts[assignment.stationId] || 0) + 1;
        }
      });
    });
    const avgUsersPerStation = Object.keys(stationUserCounts).length > 0 
      ? Object.values(stationUserCounts).reduce((a, b) => a + b, 0) / Object.keys(stationUserCounts).length 
      : 0;
    
    // Count recently added users (last 7 days)
    const recentlyAdded = users.filter(user => {
      const userDate = new Date(user.createdAt || user.joinDate || Date.now());
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return userDate >= sevenDaysAgo;
    }).length;

    setStats({ 
      total, 
      active, 
      inactive, 
      suspended, 
      onLeave,
      managers, 
      supervisors, 
      attendants,
      avgUsersPerStation: Math.round(avgUsersPerStation * 10) / 10,
      recentlyAdded
    });
  };

  // Filter users - simplified
  const filterUsers = () => {
    let filtered = [...allUsers];

    // Filter by search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(query)) ||
        (user.lastName && user.lastName.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.phoneNumber && user.phoneNumber.includes(query)) ||
        (user.employeeId && user.employeeId.toLowerCase().includes(query))
      );
    }

    // Filter by station if selected
    if (filters.station) {
      filtered = filtered.filter(user => 
        user.stationAssignments.some(assignment => 
          assignment.stationId === filters.station
        )
      );
    }

    // Filter by status if selected
    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
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

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      station: '',
      status: '',
      page: 1,
      limit: 20
    });
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
        return station ? `${station.name}` : assignment.stationName || 'Unknown Station';
      })
      .join(', ');
    
    if (user.stationAssignments.length > 2) {
      return `${stationNames} +${user.stationAssignments.length - 2} more`;
    }
    
    return stationNames;
  };

  // Get status color and icon
  const getStatusConfig = (status) => {
    const configMap = {
      'ACTIVE': { color: 'green', icon: <CheckCircleOutlined />, label: 'Active' },
      'INACTIVE': { color: 'red', icon: <CloseCircleOutlined />, label: 'Inactive' },
      'SUSPENDED': { color: 'orange', icon: <ClockCircleOutlined />, label: 'Suspended' },
      'ON_LEAVE': { color: 'blue', icon: <CalendarOutlined />, label: 'On Leave' }
    };
    return configMap[status] || { color: 'default', icon: <InfoCircleOutlined />, label: status };
  };

  // Get role display name and icon
  const getRoleConfig = (role) => {
    const configMap = {
      'STATION_MANAGER': { label: 'Station Manager', icon: <SafetyCertificateOutlined />, color: 'blue' },
      'SUPERVISOR': { label: 'Supervisor', icon: <SettingOutlined />, color: 'purple' },
      'ATTENDANT': { label: 'Attendant', icon: <UserOutlined />, color: 'green' },
      'COMPANY_ADMIN': { label: 'Company Admin', icon: <TeamOutlined />, color: 'red' },
      'SUPER_ADMIN': { label: 'Super Admin', icon: <SafetyCertificateOutlined />, color: 'gold' }
    };
    return configMap[role] || { label: role, icon: <UserOutlined />, color: 'default' };
  };

  // Table columns
  const getColumnDefinitions = () => {
    return [
      {
        title: '#',
        key: 'sequence',
        width: 60,
        fixed: 'left',
        render: (_, __, index) => {
          const sequentialNumber = ((filters.page - 1) * filters.limit) + index + 1;
          return (
            <Badge
              count={sequentialNumber}
              style={{ 
                backgroundColor: sequentialNumber <= 3 ? 
                  sequentialNumber === 1 ? '#f5222d' : 
                  sequentialNumber === 2 ? '#fa8c16' : 
                  '#52c41a' : '#d9d9d9'
              }}
            />
          );
        }
      },
      {
        title: 'User',
        key: 'name',
        width: 180,
        render: (user) => (
          <Space>
            <Avatar 
              style={{ 
                backgroundColor: getRoleConfig(user.role).color,
                color: '#fff'
              }}
              icon={getRoleConfig(user.role).icon}
            >
              {user.firstName?.[0]}{user.lastName?.[0]}
            </Avatar>
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: '12px' }}>
                {user.firstName} {user.lastName}
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {user.employeeId || 'N/A'}
              </Text>
            </Space>
          </Space>
        )
      },
      {
        title: 'Role',
        key: 'role',
        width: 140,
        render: (user) => {
          const roleConfig = getRoleConfig(user.role);
          return (
            <Tag color={roleConfig.color} icon={roleConfig.icon}>
              {roleConfig.label}
            </Tag>
          );
        }
      },
      {
        title: 'Contact',
        key: 'contact',
        width: 200,
        render: (user) => (
          <Space direction="vertical" size={2}>
            <Space>
              <MailOutlined style={{ fontSize: '12px', color: '#666' }} />
              <Text style={{ fontSize: '12px' }}>{user.email}</Text>
            </Space>
            <Space>
              <PhoneOutlined style={{ fontSize: '12px', color: '#666' }} />
              <Text style={{ fontSize: '12px' }}>
                {user.phoneNumber || 'N/A'}
              </Text>
            </Space>
          </Space>
        )
      },
      {
        title: 'Status',
        key: 'status',
        width: 100,
        render: (user) => {
          const statusConfig = getStatusConfig(user.status);
          return (
            <Tag color={statusConfig.color} icon={statusConfig.icon}>
              {statusConfig.label}
            </Tag>
          );
        }
      },
      {
        title: 'Join Date',
        key: 'joinDate',
        width: 120,
        render: (user) => (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '12px' }}>
              {formatDate(user.createdAt || user.joinDate)}
            </Text>
          </Space>
        )
      },
      {
        title: 'Station',
        key: 'station',
        width: 180,
        render: (user) => (
          <div style={{ fontSize: '12px' }}>
            {getStationName(user)}
          </div>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (user) => (
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedUser(user);
                setUserDetailsModal(true);
              }}
            />
          </Tooltip>
        )
      }
    ];
  };

  // ========== SIMPLIFIED REPORT GENERATION ==========

  // Prepare data for ALL users report - SIMPLIFIED COLUMNS as requested
  const prepareAllUsersExportData = () => {
    if (!allUsers || allUsers.length === 0) return [];
    
    return allUsers.map((user, index) => {
      return {
        '#': index + 1,
        'Join Date': formatDate(user.createdAt || user.joinDate),
        'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        'Role': getRoleConfig(user.role).label,
        'Email': user.email || 'N/A',
        'Phone': user.phoneNumber || 'N/A',
        'Status': getStatusConfig(user.status).label,
        'Station': getStationName(user)
      };
    });
  };

  // Prepare data for current tab report - SIMPLIFIED COLUMNS as requested
  const prepareTabExportData = () => {
    if (!filteredUsers || filteredUsers.length === 0) return [];
    
    return filteredUsers.map((user, index) => {
      return {
        '#': index + 1,
        'Join Date': formatDate(user.createdAt || user.joinDate),
        'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        'Role': getRoleConfig(user.role).label,
        'Email': user.email || 'N/A',
        'Phone': user.phoneNumber || 'N/A',
        'Status': getStatusConfig(user.status).label,
        'Station': getStationName(user)
      };
    });
  };

  // Calculate summary data for reports
  const calculateSummaryData = (users, type) => {
    if (!users || users.length === 0) return null;

    const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
    const activePercentage = ((activeUsers / users.length) * 100).toFixed(1);
    
    const tabName = activeTab === 'managers' ? 'Station Managers' : 
                   activeTab === 'supervisors' ? 'Supervisors' : 'Attendants';
    
    return {
      'Report Type': type === 'all' ? 'All Users Report' : `${tabName} Report`,
      'Total Records': users.length,
      'Active Users': `${activeUsers} (${activePercentage}%)`,
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE'),
      'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
      'Company': currentCompany?.name || 'All Companies'
    };
  };

  // Get columns for report - SIMPLIFIED as requested
  const getReportColumns = () => {
    return [
      { title: '#', dataIndex: '#', key: 'index', width: 60, type: 'number' },
      { title: 'Join Date', dataIndex: 'Join Date', key: 'joinDate', width: 120, type: 'date' },
      { title: 'Name', dataIndex: 'Name', key: 'name', width: 150, type: 'text' },
      { title: 'Role', dataIndex: 'Role', key: 'role', width: 120, type: 'text' },
      { title: 'Email', dataIndex: 'Email', key: 'email', width: 200, type: 'email' },
      { title: 'Phone', dataIndex: 'Phone', key: 'phone', width: 120, type: 'phone' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 100, type: 'status' },
      { title: 'Station', dataIndex: 'Station', key: 'station', width: 180, type: 'text' }
    ];
  };

  // Get report title based on type
  const getReportTitle = (type) => {
    const companyName = currentCompany?.name || "Lynx Energy System";
    const currentDate = new Date().toLocaleDateString('en-KE');
    
    if (type === 'all') {
      return `Complete Users Report - ${companyName} (${currentDate})`;
    } else {
      const tabName = activeTab === 'managers' ? 'Station Managers' : 
                     activeTab === 'supervisors' ? 'Supervisors' : 'Attendants';
      return `${tabName} Report - ${companyName} (${currentDate})`;
    }
  };

  // Get file name based on type
  const getFileName = (type) => {
    const companyCode = currentCompany?.code ? `_${currentCompany.code}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (type === 'all') {
      return `all_users_report${companyCode}_${dateStr}`;
    } else {
      return `${activeTab}_report${companyCode}_${dateStr}`;
    }
  };

  // Get footer text
  const getFooterText = () => {
    const generatedBy = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`;
    const timestamp = new Date().toLocaleString('en-KE');
    const company = currentCompany?.name || 'Lynx Energy System';
    
    return `Generated from ${company} | User: ${generatedBy} | ${timestamp}`;
  };

  // Handle export action - SIMPLIFIED
  const handleExportAction = (type) => {
    console.log('🚀 Export action triggered:', type);
    
    if (type === 'all') {
      if (allUsers.length === 0) {
        message.warning('No users available to export');
        return;
      }
      setActiveReport('all');
      setShowReportGenerator(true);
    } else {
      if (filteredUsers.length === 0) {
        message.warning(`No ${activeTab} available to export`);
        return;
      }
      setActiveReport('current');
      setShowReportGenerator(true);
    }
  };

  // Handle report generation completion
  const handleReportComplete = (format) => {
    console.log(`✅ Report generated as ${format}`);
    message.success(`Report generated successfully as ${format}`);
    setShowReportGenerator(false);
    setActiveReport(null);
  };

  // Get current report configuration
  const getCurrentReportConfig = () => {
    if (activeReport === 'all') {
      return {
        dataSource: prepareAllUsersExportData(),
        columns: getReportColumns(),
        summaryData: calculateSummaryData(allUsers, 'all'),
        title: getReportTitle('all'),
        fileName: getFileName('all')
      };
    } else if (activeReport === 'current') {
      return {
        dataSource: prepareTabExportData(),
        columns: getReportColumns(),
        summaryData: calculateSummaryData(filteredUsers, 'tab'),
        title: getReportTitle('tab'),
        fileName: getFileName('tab')
      };
    }
    return null;
  };

  // Handle table change
  const handleTableChange = (pagination) => {
    if (pagination.current !== filters.page) {
      handleFilterChange('page', pagination.current);
    }
    if (pagination.pageSize !== filters.limit) {
      handleFilterChange('limit', pagination.pageSize);
    }
  };

  // Get tab items with counts
  const getTabItems = () => {
    return {
      items: [
        {
          key: 'managers',
          label: (
            <Space>
              <SafetyCertificateOutlined />
              <span>Managers</span>
              <Badge count={stats.managers} style={{ backgroundColor: '#1890ff' }} />
            </Space>
          )
        },
        {
          key: 'supervisors',
          label: (
            <Space>
              <SettingOutlined />
              <span>Supervisors</span>
              <Badge count={stats.supervisors} style={{ backgroundColor: '#722ed1' }} />
            </Space>
          )
        },
        {
          key: 'attendants',
          label: (
            <Space>
              <UserOutlined />
              <span>Attendants</span>
              <Badge count={stats.attendants} style={{ backgroundColor: '#52c41a' }} />
            </Space>
          )
        }
      ]
    };
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <ShopOutlined /> Station User Management
          </Title>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchUsers}
              loading={isLoading}
              size="small"
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              size="small"
            >
              Add User
            </Button>
          </Space>
        </Col>
      </Row>

      {/* COMPACT STATISTICS - Row 1 */}
      <Row gutter={[8, 8]} style={{ marginBottom: '8px' }}>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" hoverable>
            <Statistic
              title="Total"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" hoverable>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" hoverable>
            <Statistic
              title="Managers"
              value={stats.managers}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" hoverable>
            <Statistic
              title="Supervisors"
              value={stats.supervisors}
              valueStyle={{ color: '#722ed1', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" hoverable>
            <Statistic
              title="Attendants"
              value={stats.attendants}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" hoverable>
            <Statistic
              title="Recent"
              value={stats.recentlyAdded}
              valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* COMPACT FILTERS - Only 3 essential filters */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search name, email, phone..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Station"
              value={filters.station}
              onChange={(value) => handleFilterChange('station', value)}
              allowClear
              size="small"
            >
              {stations.map(station => (
                <Option key={station.id} value={station.id}>
                  {station.code} - {station.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
              size="small"
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="SUSPENDED">Suspended</Option>
              <Option value="ON_LEAVE">On Leave</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && !filters.station && !filters.status}
                size="small"
              >
                Clear
              </Button>
              <Button 
                icon={<CompressOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                size="small"
              >
                {showFilters ? 'Hide' : 'More'}
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'all',
                    label: 'Export All Users Report',
                    icon: <TeamOutlined />,
                    disabled: allUsers.length === 0
                  },
                  {
                    key: 'current',
                    label: 'Export Current Tab Report',
                    icon: <FileTextOutlined />,
                    disabled: filteredUsers.length === 0
                  }
                ],
                onClick: ({ key }) => handleExportAction(key)
              }}
              placement="bottomRight"
            >
              <Button type="primary" icon={<DownloadOutlined />} size="small">
                Export <DownOutlined />
              </Button>
            </Dropdown>
          </Col>
        </Row>

        {/* Optional advanced filters (collapsed by default) */}
        {showFilters && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Per Page"
                  value={filters.limit}
                  onChange={(value) => handleFilterChange('limit', value)}
                  size="small"
                >
                  <Option value={10}>10 per page</Option>
                  <Option value={20}>20 per page</Option>
                  <Option value={50}>50 per page</Option>
                  <Option value={100}>100 per page</Option>
                </Select>
              </Col>
            </Row>
          </>
        )}
      </Card>

      {/* Main Content */}
      <Card size="small" bodyStyle={{ padding: '12px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems().items}
          size="small"
          style={{ marginBottom: '12px' }}
        />

        {/* Users Table */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
            <div style={{ marginTop: 8 }}>Loading users...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>No users found</Text>
                <Button type="link" onClick={clearFilters} size="small">
                  Clear filters
                </Button>
              </Space>
            }
          />
        ) : (
          <Table
            columns={getColumnDefinitions()}
            dataSource={filteredUsers}
            rowKey="id"
            size="small"
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              total: filteredUsers.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `${total} users`,
              pageSizeOptions: ['10', '20', '50', '100'],
              size: 'small'
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      {/* Visible Report Generator */}
      {showReportGenerator && activeReport && (
        <div 
          ref={reportGeneratorRef}
          style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px',
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: '300px'
          }}
        >
          <AdvancedReportGenerator
            key={`report-${activeReport}-${Date.now()}`}
            dataSource={getCurrentReportConfig()?.dataSource || []}
            columns={getCurrentReportConfig()?.columns || []}
            summaryData={getCurrentReportConfig()?.summaryData}
            title={getCurrentReportConfig()?.title || ''}
            fileName={getCurrentReportConfig()?.fileName || ''}
            reportType="users"
            companyName={currentCompany?.name || "Lynx Energy System"}
            stationInfo={currentStation ? {
              name: currentStation.name,
              code: currentStation.code,
              address: currentStation.address
            } : null}
            showFooter={true}
            footerText={getFooterText()}
            enableCustomization={true}
            includeLogo={false}
            showGrandTotals={false}
            onReportGenerate={(format) => {
              handleReportComplete(format);
            }}
            onSettingsSave={(settings) => {
              console.log('Settings saved:', settings);
            }}
          />
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <Button 
              type="link" 
              onClick={() => {
                setShowReportGenerator(false);
                setActiveReport(null);
              }}
              size="small"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      <Modal
        title="User Details"
        open={userDetailsModal}
        onCancel={() => setUserDetailsModal(false)}
        footer={[
          <Button key="close" onClick={() => setUserDetailsModal(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedUser && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name" span={2}>
              {selectedUser.firstName} {selectedUser.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Employee ID">
              {selectedUser.employeeId || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={getRoleConfig(selectedUser.role).color}>
                {getRoleConfig(selectedUser.role).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedUser.email}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {selectedUser.phoneNumber || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusConfig(selectedUser.status).color}>
                {getStatusConfig(selectedUser.status).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Join Date">
              {formatDate(selectedUser.createdAt || selectedUser.joinDate, 'datetime')}
            </Descriptions.Item>
            <Descriptions.Item label="Station" span={2}>
              {getStationName(selectedUser)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default StationUserManagement;