// Updated StationUserManagement.jsx - with direct report triggering

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
  DatePicker,
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
  DownOutlined
} from '@ant-design/icons';
import { formatDate } from '../../../../utils/helpers';
import { useApp } from '../../../../context/AppContext';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';
import AdvancedReportGenerator from '../../../dashboards/common/downloadable/AdvancedReportGenerator';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;

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
  
  // Enhanced filters
  const [filters, setFilters] = useState({
    station: '',
    status: '',
    searchQuery: '',
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    sortBy: 'createdAt',
    sortOrder: 'desc',
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

  // Fetch stations and users on component mount
  useEffect(() => {
    fetchStations();
    fetchUsers();
  }, []);

  // Filter users when filters change
  useEffect(() => {
    filterUsers();
  }, [filters, allUsers, activeTab]);

  // Trigger report generation when showReportGenerator changes
  useEffect(() => {
    if (showReportGenerator && reportGeneratorRef.current) {
      // Simulate a click on the AdvancedReportGenerator button
      setTimeout(() => {
        const reportButton = reportGeneratorRef.current?.querySelector('.ant-btn');
        if (reportButton) {
          console.log('🖱️ Clicking report generator button');
          reportButton.click();
        }
      }, 100);
    }
  }, [showReportGenerator]);

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
        // Ensure stationAssignments is always an array
        stationAssignments: user.stationAssignments || [],
        // Ensure status has a default
        status: user.status || 'ACTIVE',
        // Extract first station assignment details
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
      setStats({
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

  // Filter users by station and role
  const filterUsers = () => {
    let filtered = [...allUsers];

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

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(query)) ||
        (user.lastName && user.lastName.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.phoneNumber && user.phoneNumber.includes(query)) ||
        (user.employeeId && user.employeeId.toLowerCase().includes(query))
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

    // Sort filtered users
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy] || '';
      const bValue = b[filters.sortBy] || '';
      
      if (filters.sortBy === 'createdAt' || filters.sortBy === 'joinDate') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return filters.sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      return 0;
    });

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

  // Handle date range change
  const handleDateRangeChange = (dates, dateStrings) => {
    if (dates) {
      handleFilterChange('startDate', dateStrings[0]);
      handleFilterChange('endDate', dateStrings[1]);
    }
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

  // Get station code from stationId
  const getStationCode = (user) => {
    if (!user.stationAssignments || user.stationAssignments.length === 0) {
      return 'N/A';
    }
    
    const stationCodes = user.stationAssignments
      .map(assignment => {
        const station = stations.find(s => s.id === assignment.stationId);
        return station ? station.code : 'N/A';
      })
      .filter(code => code !== 'N/A')
      .join(', ');
    
    return stationCodes || 'N/A';
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

  // Enhanced column definitions with sequential numbering
  const getColumnDefinitions = () => {
    const commonColumns = [
      {
        title: '#',
        key: 'sequence',
        width: 60,
        fixed: 'left',
        type: 'number',
        render: (_, __, index) => {
          const page = filters.page || 1;
          const pageSize = filters.limit || 20;
          const sequentialNumber = ((page - 1) * pageSize) + index + 1;
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
        type: 'text',
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
        ),
        sorter: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      },
      {
        title: 'Role',
        key: 'role',
        width: 140,
        type: 'status',
        render: (user) => {
          const roleConfig = getRoleConfig(user.role);
          return (
            <Tag color={roleConfig.color} icon={roleConfig.icon}>
              {roleConfig.label}
            </Tag>
          );
        },
        filters: [
          { text: 'Station Manager', value: 'STATION_MANAGER' },
          { text: 'Supervisor', value: 'SUPERVISOR' },
          { text: 'Attendant', value: 'ATTENDANT' }
        ]
      },
      {
        title: 'Contact',
        key: 'contact',
        width: 200,
        type: 'text',
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
        width: 120,
        type: 'status',
        render: (user) => {
          const statusConfig = getStatusConfig(user.status);
          return (
            <Tag color={statusConfig.color} icon={statusConfig.icon}>
              {statusConfig.label}
            </Tag>
          );
        },
        filters: [
          { text: 'Active', value: 'ACTIVE' },
          { text: 'Inactive', value: 'INACTIVE' },
          { text: 'Suspended', value: 'SUSPENDED' },
          { text: 'On Leave', value: 'ON_LEAVE' }
        ]
      },
      {
        title: 'Joined Date',
        key: 'joinDate',
        width: 140,
        type: 'date',
        render: (user) => (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '12px' }}>
              {formatDate(user.createdAt || user.joinDate)}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {formatDate(user.createdAt || user.joinDate, 'time')}
            </Text>
          </Space>
        ),
        sorter: (a, b) => new Date(a.createdAt || a.joinDate) - new Date(b.createdAt || b.joinDate),
        defaultSortOrder: 'descend'
      },
      {
        title: 'Station',
        key: 'station',
        width: 200,
        type: 'text',
        render: (user) => (
          <Space direction="vertical" size={2} style={{ maxWidth: '180px' }}>
            <Text style={{ fontSize: '12px' }}>
              {getStationName(user)}
            </Text>
            {user.stationAssignments && user.stationAssignments.length > 0 && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {user.stationAssignments.length} assignment(s)
              </Text>
            )}
          </Space>
        )
      }
    ];

    // Add shift column for supervisors
    const supervisorColumns = [
      ...commonColumns.slice(0, 5),
      {
        title: 'Shift',
        key: 'shift',
        width: 100,
        type: 'text',
        render: (user) => (
          <div style={{ fontSize: '12px' }}>
            {user.shift || 'N/A'}
          </div>
        )
      },
      ...commonColumns.slice(5)
    ];

    return activeTab === 'supervisors' ? supervisorColumns : commonColumns;
  };

  // Add actions column
  const getColumnsWithActions = () => {
    const baseColumns = getColumnDefinitions();
    
    return [
      ...baseColumns,
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (user) => (
          <Space size="small">
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
            <Tooltip title="Edit User">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => console.log('Edit', user.id)}
              />
            </Tooltip>
          </Space>
        )
      }
    ];
  };

  // ========== REPORT GENERATION FUNCTIONS ==========

  // Prepare data for ALL users report (unified)
  const prepareAllUsersExportData = () => {
    if (!allUsers || allUsers.length === 0) return [];
    
    return allUsers.map((user, index) => {
      // Get station information
      const stationNames = getStationName(user);
      const stationCodes = getStationCode(user);
      
      return {
        sequence: index + 1,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        employeeId: user.employeeId || 'N/A',
        role: getRoleConfig(user.role).label,
        email: user.email || 'N/A',
        phone: user.phoneNumber || 'N/A',
        status: getStatusConfig(user.status).label,
        joinDate: formatDate(user.createdAt || user.joinDate),
        joinDateTime: user.createdAt || user.joinDate,
        stationNames: stationNames,
        stationCodes: stationCodes,
        assignmentsCount: user.stationAssignments?.length || 0,
        shift: user.shift || 'N/A',
        statusCode: user.status,
        roleCode: user.role,
        createdAt: user.createdAt || user.joinDate,
        companyId: user.companyId,
        userId: user.id
      };
    });
  };

  // Calculate summary data for ALL users report
  const calculateAllUsersSummaryData = () => {
    if (!allUsers || allUsers.length === 0) return null;

    const totals = {
      totalRecords: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'ACTIVE').length,
      managers: allUsers.filter(u => u.role === 'STATION_MANAGER').length,
      supervisors: allUsers.filter(u => u.role === 'SUPERVISOR').length,
      attendants: allUsers.filter(u => u.role === 'ATTENDANT').length,
      recentlyAdded: allUsers.filter(u => {
        const userDate = new Date(u.createdAt || u.joinDate || Date.now());
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return userDate >= thirtyDaysAgo;
      }).length
    };
    
    // Calculate percentages
    const activePercentage = totals.totalRecords > 0 ? (totals.activeUsers / totals.totalRecords * 100) : 0;
    const managerPercentage = totals.totalRecords > 0 ? (totals.managers / totals.totalRecords * 100) : 0;
    const supervisorPercentage = totals.totalRecords > 0 ? (totals.supervisors / totals.totalRecords * 100) : 0;
    const attendantPercentage = totals.totalRecords > 0 ? (totals.attendants / totals.totalRecords * 100) : 0;
    
    // Create summary object with display values
    const summaryData = {
      'Total Users': totals.totalRecords,
      'Active Users': `${totals.activeUsers} (${activePercentage.toFixed(1)}%)`,
      'Inactive Users': `${stats.inactive} (${((stats.inactive / totals.totalRecords) * 100).toFixed(1)}%)`,
      'Station Managers': `${totals.managers} (${managerPercentage.toFixed(1)}%)`,
      'Supervisors': `${totals.supervisors} (${supervisorPercentage.toFixed(1)}%)`,
      'Attendants': `${totals.attendants} (${attendantPercentage.toFixed(1)}%)`,
      'Recently Added (30 days)': totals.recentlyAdded,
      'Average per Station': stats.avgUsersPerStation,
      'Total Stations': stations.length,
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE'),
      'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
      'User Role': currentUser?.role || 'N/A'
    };
    
    return summaryData;
  };

  // Get columns for ALL users report
  const getAllUsersExportColumns = () => {
    return [
      {
        title: '#',
        dataIndex: 'sequence',
        key: 'sequence',
        width: 60,
        type: 'number'
      },
      {
        title: 'Full Name',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        type: 'text'
      },
      {
        title: 'Employee ID',
        dataIndex: 'employeeId',
        key: 'employeeId',
        width: 120,
        type: 'text'
      },
      {
        title: 'Role',
        dataIndex: 'role',
        key: 'role',
        width: 120,
        type: 'status'
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        type: 'email'
      },
      {
        title: 'Phone',
        dataIndex: 'phone',
        key: 'phone',
        width: 120,
        type: 'phone'
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        type: 'status'
      },
      {
        title: 'Join Date',
        dataIndex: 'joinDate',
        key: 'joinDate',
        width: 120,
        type: 'date'
      },
      {
        title: 'Station(s)',
        dataIndex: 'stationNames',
        key: 'stationNames',
        width: 180,
        type: 'text'
      },
      {
        title: 'Station Code(s)',
        dataIndex: 'stationCodes',
        key: 'stationCodes',
        width: 120,
        type: 'text'
      },
      {
        title: 'Assignments',
        dataIndex: 'assignmentsCount',
        key: 'assignmentsCount',
        width: 100,
        type: 'number'
      }
    ];
  };

  // Prepare data for current tab report
  const prepareTabExportData = () => {
    if (!filteredUsers || filteredUsers.length === 0) return [];
    
    return filteredUsers.map((user, index) => {
      const stationNames = getStationName(user);
      const stationCodes = getStationCode(user);
      
      return {
        sequence: index + 1,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        employeeId: user.employeeId || 'N/A',
        role: getRoleConfig(user.role).label,
        email: user.email || 'N/A',
        phone: user.phoneNumber || 'N/A',
        status: getStatusConfig(user.status).label,
        joinDate: formatDate(user.createdAt || user.joinDate),
        stationNames: stationNames,
        stationCodes: stationCodes,
        assignmentsCount: user.stationAssignments?.length || 0,
        shift: user.shift || 'N/A',
        statusCode: user.status,
        roleCode: user.role,
        createdAt: user.createdAt || user.joinDate,
        userId: user.id
      };
    });
  };

  // Calculate summary for current tab
  const calculateTabSummaryData = () => {
    if (!filteredUsers || filteredUsers.length === 0) return null;

    const totals = {
      totalRecords: filteredUsers.length,
      activeUsers: filteredUsers.filter(u => u.status === 'ACTIVE').length,
      recentlyAdded: filteredUsers.filter(u => {
        const userDate = new Date(u.createdAt || u.joinDate || Date.now());
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return userDate >= thirtyDaysAgo;
      }).length
    };
    
    const activePercentage = totals.totalRecords > 0 ? (totals.activeUsers / totals.totalRecords * 100) : 0;
    const tabName = activeTab === 'managers' ? 'Station Managers' : 
                   activeTab === 'supervisors' ? 'Supervisors' : 'Attendants';
    
    const summaryData = {
      [`Total ${tabName}`]: totals.totalRecords,
      [`Active ${tabName}`]: `${totals.activeUsers} (${activePercentage.toFixed(1)}%)`,
      'Recently Added (30 days)': totals.recentlyAdded,
      'Report Type': `${tabName} Report`,
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE'),
      'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
      'Company': currentCompany?.name || 'All Companies',
      'Current Station': currentStation?.name || 'All Stations'
    };
    
    if (filters.station) {
      const selectedStation = stations.find(s => s.id === filters.station);
      if (selectedStation) {
        summaryData['Filtered Station'] = `${selectedStation.code} - ${selectedStation.name}`;
      }
    }
    
    if (filters.status) {
      summaryData['Filtered Status'] = getStatusConfig(filters.status).label;
    }
    
    return summaryData;
  };

  // Get columns for tab report
  const getTabExportColumns = () => {
    const baseColumns = [
      {
        title: '#',
        dataIndex: 'sequence',
        key: 'sequence',
        width: 60,
        type: 'number'
      },
      {
        title: 'Full Name',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        type: 'text'
      },
      {
        title: 'Employee ID',
        dataIndex: 'employeeId',
        key: 'employeeId',
        width: 120,
        type: 'text'
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        type: 'email'
      },
      {
        title: 'Phone',
        dataIndex: 'phone',
        key: 'phone',
        width: 120,
        type: 'phone'
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        type: 'status'
      },
      {
        title: 'Join Date',
        dataIndex: 'joinDate',
        key: 'joinDate',
        width: 120,
        type: 'date'
      },
      {
        title: 'Station(s)',
        dataIndex: 'stationNames',
        key: 'stationNames',
        width: 180,
        type: 'text'
      },
      {
        title: 'Assignments',
        dataIndex: 'assignmentsCount',
        key: 'assignmentsCount',
        width: 100,
        type: 'number'
      }
    ];

    // Add shift column for supervisors
    if (activeTab === 'supervisors') {
      baseColumns.splice(6, 0, {
        title: 'Shift',
        dataIndex: 'shift',
        key: 'shift',
        width: 100,
        type: 'text'
      });
    }

    return baseColumns;
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
      return `complete_users_report${companyCode}_${dateStr}`;
    } else {
      const stationCode = filters.station ? `_${stations.find(s => s.id === filters.station)?.code || 'filtered'}` : '';
      return `${activeTab}_report${stationCode}${companyCode}_${dateStr}`;
    }
  };

  // Get footer text
  const getFooterText = () => {
    const generatedBy = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`;
    const timestamp = new Date().toLocaleString('en-KE');
    const company = currentCompany?.name || 'Lynx Energy System';
    
    return `Generated from ${company} | User: ${generatedBy} | ${timestamp}`;
  };

  // Handle table sort change
  const handleTableChange = (pagination, _, sorter) => {
    if (sorter.field || sorter.columnKey) {
      const sortField = sorter.field || sorter.columnKey;
      handleFilterChange('sortBy', sortField);
      handleFilterChange('sortOrder', sorter.order === 'ascend' ? 'asc' : 'desc');
    }
    
    if (pagination.current !== filters.page) {
      handleFilterChange('page', pagination.current);
    }
    
    if (pagination.pageSize !== filters.limit) {
      handleFilterChange('limit', pagination.pageSize);
    }
  };

  // Get tab items with counts
  const getTabItems = () => {
    const items = [
      {
        key: 'managers',
        label: (
          <Space>
            <SafetyCertificateOutlined />
            <span>Managers</span>
            <Badge 
              count={stats.managers} 
              style={{ backgroundColor: '#1890ff' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'supervisors',
        label: (
          <Space>
            <SettingOutlined />
            <span>Supervisors</span>
            <Badge 
              count={stats.supervisors} 
              style={{ backgroundColor: '#722ed1' }}
              overflowCount={999}
            />
          </Space>
        )
      },
      {
        key: 'attendants',
        label: (
          <Space>
            <UserOutlined />
            <span>Attendants</span>
            <Badge 
              count={stats.attendants} 
              style={{ backgroundColor: '#52c41a' }}
              overflowCount={999}
            />
          </Space>
        )
      }
    ];
    return { items };
  };

  // Handle export action - SIMPLIFIED VERSION
  const handleExportAction = (type) => {
    console.log('🚀 Export action triggered:', type);
    
    if (type === 'all') {
      if (allUsers.length === 0) {
        message.warning('No users available to export');
        return;
      }
      console.log('📊 Setting active report to "all"');
      setActiveReport('all');
      setShowReportGenerator(true);
    } else {
      if (filteredUsers.length === 0) {
        message.warning(`No ${activeTab} available to export`);
        return;
      }
      console.log('📊 Setting active report to "current"');
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

  // Get current report configuration based on activeReport
  const getCurrentReportConfig = () => {
    if (activeReport === 'all') {
      return {
        dataSource: prepareAllUsersExportData(),
        columns: getAllUsersExportColumns(),
        summaryData: calculateAllUsersSummaryData(),
        title: getReportTitle('all'),
        fileName: getFileName('all')
      };
    } else if (activeReport === 'current') {
      return {
        dataSource: prepareTabExportData(),
        columns: getTabExportColumns(),
        summaryData: calculateTabSummaryData(),
        title: getReportTitle('tab'),
        fileName: getFileName('tab')
      };
    }
    return null;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ShopOutlined /> Station User Management
        </Title>
        <Text type="secondary">
          Manage station staff, assign roles, and track user activity
        </Text>
      </Space>

      {/* Action Buttons */}
      <Space style={{ margin: '24px 0' }} wrap>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
        >
          Add New Staff
        </Button>
        
        {/* Export Dropdown */}
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
          placement="bottomLeft"
          trigger={['click']}
        >
          <Button type="primary" icon={<DownloadOutlined />}>
            Export Reports <DownOutlined />
          </Button>
        </Dropdown>
        
        <Button 
          icon={<ReloadOutlined />}
          onClick={fetchUsers}
          loading={isLoading}
        >
          Refresh
        </Button>
      </Space>

      {/* Statistics Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Users"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary">
              Active: {stats.active} ({((stats.active / stats.total) * 100 || 0).toFixed(1)}%)
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Active Users"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={((stats.active / stats.total) * 100) || 0} 
              size="small" 
              status="active"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Recent Additions"
              value={stats.recentlyAdded}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <Text type="secondary">Last 7 days</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Avg per Station"
              value={stats.avgUsersPerStation}
              precision={1}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">Average staff per station</Text>
          </Card>
        </Col>
      </Row>

      {/* Status Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card size="small" title="User Status Summary">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="green" style={{ marginBottom: 8 }}>
                    Active
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.active}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="red" style={{ marginBottom: 8 }}>
                    Inactive
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.inactive}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="orange" style={{ marginBottom: 8 }}>
                    Suspended
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.suspended}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="blue" style={{ marginBottom: 8 }}>
                    On Leave
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.onLeave}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="blue" style={{ marginBottom: 8 }}>
                    Managers
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.managers}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="purple" style={{ marginBottom: 8 }}>
                    Supervisors
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.supervisors}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="green" style={{ marginBottom: 8 }}>
                    Attendants
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.attendants}</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="gold" style={{ marginBottom: 8 }}>
                    Total
                  </Tag>
                  <Text strong style={{ fontSize: '18px' }}>{stats.total}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: '24px' }} size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search users..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              onSearch={() => filterUsers()}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by station"
              value={filters.station}
              onChange={(value) => handleFilterChange('station', value)}
              allowClear
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
              placeholder="Filter by status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="SUSPENDED">Suspended</Option>
              <Option value="ON_LEAVE">On Leave</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Sort Order"
              value={filters.sortOrder}
              onChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <Option value="desc">Newest First (DESC)</Option>
              <Option value="asc">Oldest First (ASC)</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Per Page"
              value={filters.limit}
              onChange={(value) => handleFilterChange('limit', value)}
            >
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
          </Col>
        </Row>
        
        <Divider style={{ margin: '16px 0' }} />
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Date Range</Text>
              <RangePicker
                value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems().items}
          style={{ marginBottom: '16px' }}
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
                <Space direction="vertical">
                  <Text>
                    {filters.searchQuery || filters.station || filters.status
                      ? 'No users match your search criteria'
                      : `No ${activeTab} found`}
                  </Text>
                  <Button type="link" onClick={() => {
                    handleFilterChange('searchQuery', '');
                    handleFilterChange('station', '');
                    handleFilterChange('status', '');
                  }}>
                    Clear filters
                  </Button>
                </Space>
              }
            />
          ) : (
            <Table
              columns={getColumnsWithActions()}
              dataSource={filteredUsers}
              rowKey="id"
              pagination={{
                current: filters.page,
                pageSize: filters.limit,
                total: filteredUsers.length,
                onChange: (page, pageSize) => {
                  handleFilterChange('page', page);
                  if (pageSize !== filters.limit) {
                    handleFilterChange('limit', pageSize);
                  }
                },
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} users (Sorted: ${filters.sortBy} ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'})`
              }}
              onChange={handleTableChange}
              scroll={{ x: 1200 }}
              summary={() => {
                if (filteredUsers.length === 0) return null;
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <Text strong>TOTAL ({filteredUsers.length} users)</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} colSpan={2}>
                        <Text type="secondary">
                          Active: {stats.active} | 
                          Managers: {stats.managers} | 
                          Supervisors: {stats.supervisors} | 
                          Attendants: {stats.attendants}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} colSpan={5}>
                        <Text type="secondary">
                          Sorted by: {filters.sortBy} ({filters.sortOrder === 'desc' ? 'Descending' : 'Ascending'})
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          )}
        </div>
      </Card>

      {/* Info Section */}
      {filteredUsers.length > 0 && (
        <Alert
          message="User Management Information"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                • Total {activeTab}: <Text strong>{filteredUsers.length}</Text>
              </Text>
              <Text>
                • Active users: <Text strong>{stats.active}</Text> ({((stats.active / stats.total) * 100 || 0).toFixed(1)}%)
              </Text>
              <Text>
                • Average users per station: <Text strong>{stats.avgUsersPerStation}</Text>
              </Text>
              <Text>
                • Recently added (7 days): <Text strong>{stats.recentlyAdded}</Text>
              </Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

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
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
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
        width={700}
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
            <Descriptions.Item label="Joined Date">
              {formatDate(selectedUser.createdAt || selectedUser.joinDate, 'datetime')}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Stations" span={2}>
              {getStationName(selectedUser)}
            </Descriptions.Item>
            {selectedUser.shift && (
              <Descriptions.Item label="Shift">
                {selectedUser.shift}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default StationUserManagement;