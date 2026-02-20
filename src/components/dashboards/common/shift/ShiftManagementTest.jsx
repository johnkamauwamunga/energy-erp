// src/components/dashboards/common/shiftManagement/ShiftManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Alert, 
  Tag, 
  Badge, 
  Tabs,
  Row,
  Col,
  Statistic,
  message,
  Typography,
  Divider,
  List,
  Descriptions,
  Progress,
  Tooltip,
  Modal,
  Steps,
  notification,
  Popconfirm,
  Dropdown,
  Menu
} from 'antd';
import { 
  Gauge, 
  Fuel, 
  Zap, 
  Droplets,
  CheckCircle,
  Play,
  Square,
  RefreshCw,
  User,
  MapPin,
  Clock,
  Calendar,
  Eye,
  BarChart3,
  AlertTriangle,
  Edit,
  Trash2,
  SkipForward,
  MoreVertical,
  ChevronRight,
  Loader2,
  PlusCircle,
  PauseCircle,
  Download,
  Users,
  Settings,
  FileText,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../context/AppContext';
import { shiftFetchService } from '../../../../services/shiftFetchService/shiftFetchService';
import ShiftCreationWizard from './shiftOpen/ShiftCreationWizard';
import CloseWizard from './closeDev/IntegratedShiftClose';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Step } = Steps;

const ShiftManagementTest = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const currentUser = state.currentUser;
  const userStationId = state.currentStation?.id;

  // State management
  const [wizardMode, setWizardMode] = useState(null);
  const [hasOpenShift, setHasOpenShift] = useState(false);
  const [hasPendingShift, setHasPendingShift] = useState(false);
  const [checkingShift, setCheckingShift] = useState(true);
  const [openShiftData, setOpenShiftData] = useState(null);
  const [pendingShiftData, setPendingShiftData] = useState(null);
  
  // State for shifts history table
  const [shiftsHistory, setShiftsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resumeShiftId, setResumeShiftId] = useState(null);
  const [abortingShift, setAbortingShift] = useState(false);
  const [attendantsModalVisible, setAttendantsModalVisible] = useState(false);
  const [selectedShiftForAttendants, setSelectedShiftForAttendants] = useState(null);

  // Load all shifts on component mount
  useEffect(() => {
    if (userStationId) {
      fetchAllShifts();
    }
  }, [userStationId]);

  // Fetch all shifts using shiftFetchService
  const fetchAllShifts = async () => {
    if (!userStationId) {
      setCheckingShift(false);
      return;
    }
    
    setCheckingShift(true);
    setLoadingHistory(true);
    
    try {
      console.log(`🔍 [ShiftManagement] Fetching all shifts for station: ${userStationId}`);
      
      const response = await shiftFetchService.getAllShiftsForStation(userStationId, {
        page: 1,
        limit: 100,
        sortBy: 'startTime',
        sortOrder: 'desc'
      });
      
      if (response.success) {
        const shifts = response.data.shifts || [];
        console.log(`✅ [ShiftManagement] Loaded ${shifts.length} shifts`);
        
        // Update shifts history
        setShiftsHistory(shifts);
        
        // Check for OPEN shift
        const openShift = shifts.find(shift => shift.status === 'OPEN');
        if (openShift) {
          setHasOpenShift(true);
          setOpenShiftData(openShift);
          console.log(`🚦 Open shift found: ${openShift.shiftNumber}`);
        } else {
          setHasOpenShift(false);
          setOpenShiftData(null);
          console.log(`🚦 No open shift found`);
        }
        
        // Check for PENDING shift
        const pendingShift = shifts.find(shift => shift.status === 'PENDING' && !shift.endTime);
        if (pendingShift) {
          setHasPendingShift(true);
          setPendingShiftData(pendingShift);
          console.log(`⏳ Pending shift found: ${pendingShift.shiftNumber}`);
        } else {
          setHasPendingShift(false);
          setPendingShiftData(null);
        }
        
      } else {
        message.error('Failed to fetch shifts');
        setShiftsHistory([]);
      }
    } catch (error) {
      console.error('❌ Error fetching shifts:', error);
      message.error(error.message || 'Failed to fetch shifts');
      setShiftsHistory([]);
    } finally {
      setCheckingShift(false);
      setLoadingHistory(false);
    }
  };

  // Fetch current open shift using shiftFetchService
  const fetchCurrentOpenShift = async () => {
    if (!userStationId) return;
    
    try {
      console.log(`🔍 [ShiftManagement] Fetching current open shift for station: ${userStationId}`);
      
      const response = await shiftFetchService.getCurrentOpenShiftForStation(userStationId);
      
      if (response.success) {
        if (response.data.hasOpenShift) {
          setHasOpenShift(true);
          setOpenShiftData(response.data.shift);
          console.log(`✅ Current open shift: ${response.data.shift.shiftNumber}`);
        } else {
          setHasOpenShift(false);
          setOpenShiftData(null);
          console.log('ℹ️ No open shift found');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching open shift:', error);
      setHasOpenShift(false);
      setOpenShiftData(null);
    }
  };

  // Fetch shift details using shiftFetchService
  const fetchShiftDetails = async (shiftId) => {
    try {
      console.log(`🔍 [ShiftManagement] Fetching details for shift: ${shiftId}`);
      
      const response = await shiftFetchService.getShiftDetails(shiftId, true); // Include readings
      
      if (response.success) {
        return response.data;
      } else {
        message.error('Failed to fetch shift details');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching shift details:', error);
      message.error(error.message || 'Failed to fetch shift details');
      return null;
    }
  };

  // Handle close shift
  const handleCloseShift = async (closeData) => {
    try {
      if (!openShiftData?.id) {
        message.error('No shift ID available for closing');
        return;
      }

      console.log(`🚀 [ShiftManagement] Closing shift with ID: ${openShiftData.id}`);
      
      // Here you would call the close shift API
      // For now, we'll just refresh the data
      await fetchAllShifts();
      
      setWizardMode(null);
      message.success('Shift closed successfully');
    } catch (err) {
      console.error("❌ Failed to close shift:", err);
      message.error('Failed to close shift');
    }
  };

  // Handle wizard cancel
  const handleCancelWizard = () => {
    setWizardMode(null);
    setResumeShiftId(null);
  };

  // Refresh all shifts data
  const refreshAllShifts = async () => {
    message.info('Refreshing shift data...');
    await fetchAllShifts();
    await fetchCurrentOpenShift();
    message.success('Shift data refreshed');
  };

  // Direct close shift handler
  const handleDirectCloseShift = (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) {
      message.warning('Shift not found');
      return;
    }
    
    console.log(`🎯 [ShiftManagement] Starting shift close process for: ${shift.shiftNumber}`);
    setOpenShiftData(shift); // Set as the shift to close
    setWizardMode('close');
  };

  // Handle aborting a pending shift
  const handleAbortShift = async (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) return;
    
    Modal.confirm({
      title: 'Abort Incomplete Shift',
      content: (
        <Space direction="vertical">
          <Text>Are you sure you want to abort shift #{shift.shiftNumber}?</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This shift was created but not fully started. All incomplete data will be lost.
          </Text>
        </Space>
      ),
      okText: 'Yes, Abort Shift',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        setAbortingShift(true);
        try {
          // Call abort shift API through shiftFetchService
          // Note: You may need to add an abortShift method to shiftFetchService
          // For now, we'll just update local state
          await fetchAllShifts();
          
          message.success(`Shift #${shift.shiftNumber} aborted successfully`);
        } catch (error) {
          console.error('Failed to abort shift:', error);
          message.error('Failed to abort shift');
        } finally {
          setAbortingShift(false);
        }
      }
    });
  };

  // Handle resuming a pending shift
  const handleResumeShift = (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) {
      message.error('Shift not found');
      return;
    }
    
    console.log(`🔄 [ShiftManagement] Resuming shift setup: ${shift.shiftNumber}`);
    setResumeShiftId(shift.id);
    setWizardMode('open');
  };

  // Start a brand new shift
  const handleStartNewShift = () => {
    setResumeShiftId(null);
    setWizardMode('open');
  };

  // Handle wizard success
  const handleWizardSuccess = (result) => {
    setWizardMode(null);
    setResumeShiftId(null);
    refreshAllShifts();
    
    if (result?.shiftNumber) {
      message.success(`Shift ${result.shiftNumber} setup completed successfully`);
    }
  };

  // View shift reconciliation
  const handleViewReconciliation = async (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) {
      message.error('Shift not found');
      return;
    }
    
    try {
      const shiftDetails = await fetchShiftDetails(shiftId);
      if (!shiftDetails) return;
      
      Modal.info({
        title: `Shift Reconciliation - ${shift.shiftNumber}`,
        width: 1000,
        content: (
          <div>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Total Sales">
                {shiftDetails.summary?.productSales || 0} L
              </Descriptions.Item>
              <Descriptions.Item label="Total Collections">
                {shiftDetails.summary?.collections || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Total Variance">
                <Tag color={Math.abs(shiftDetails.summary?.variance || 0) < 50 ? 'green' : 'red'}>
                  {shiftDetails.summary?.variance?.toLocaleString() || 0} L
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            <Text type="secondary">
              Detailed reconciliation report would appear here with tank-by-tank analysis.
            </Text>
          </div>
        ),
        onOk() {},
      });
    } catch (error) {
      message.error('Failed to load reconciliation data');
    }
  };

  // View shift details
  const handleViewShiftDetails = async (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) {
      message.error('Shift not found');
      return;
    }
    
    try {
      const shiftDetails = await fetchShiftDetails(shiftId);
      if (!shiftDetails) return;
      
      Modal.info({
        title: `Shift ${shift.shiftNumber} Details`,
        width: 700,
        content: (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Shift Number">{shiftDetails.shiftNumber}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(shiftDetails.status)}>
                {getStatusDisplay(shiftDetails.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Start Time">
              {formatDateForReport(shiftDetails.startTime)}
            </Descriptions.Item>
            <Descriptions.Item label="End Time">
              {shiftDetails.endTime ? formatDateForReport(shiftDetails.endTime) : 'Ongoing'}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {getShiftDuration(shiftDetails)}
            </Descriptions.Item>
            <Descriptions.Item label="Supervisor">
              {shiftDetails.supervisor?.firstName} {shiftDetails.supervisor?.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {shiftDetails.station?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Islands" span={2}>
              {shiftDetails.details?.islands?.join(', ') || 'No islands assigned'}
            </Descriptions.Item>
            <Descriptions.Item label="Tank Readings" span={2}>
              {shiftDetails.summary?.tankReadings || 0} readings
            </Descriptions.Item>
            <Descriptions.Item label="Pump Readings" span={2}>
              {shiftDetails.summary?.pumpReadings || 0} readings
            </Descriptions.Item>
            <Descriptions.Item label="Attendants" span={2}>
              {shiftDetails.summary?.attendants || 0} attendants
            </Descriptions.Item>
          </Descriptions>
        ),
        onOk() {},
      });
    } catch (error) {
      message.error('Failed to load shift details');
    }
  };

  // Show attendants modal
  const handleShowAttendants = async (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) {
      message.error('Shift not found');
      return;
    }
    
    try {
      const shiftDetails = await fetchShiftDetails(shiftId);
      if (!shiftDetails) return;
      
      setSelectedShiftForAttendants(shiftDetails);
      setAttendantsModalVisible(true);
    } catch (error) {
      message.error('Failed to load attendants information');
    }
  };

// In ShiftManagementTest.jsx, update the navigation functions:
const handleNavigateToPumpReadings = (shiftId) => {
  if (!shiftId || !userStationId) {
    message.warning('Shift ID or Station ID missing');
    return;
  }
  
  const shift = shiftsHistory.find(s => s.id === shiftId);
  
  // Navigate with state
  navigate('/readings/pump-meter-readings', {
    state: {
      shiftId,
      stationId: userStationId,
      shiftNumber: shift?.shiftNumber || 'Unknown',
      shiftData: shift
    }
  });
};

const handleNavigateToReconcilliations = (shiftId) => {
  if (!shiftId || !userStationId) {
    message.warning('Shift ID or Station ID missing');
    return;
  }
  
  const shift = shiftsHistory.find(s => s.id === shiftId);
  
  // Navigate with state
  navigate('/readings/reconcilliation-readings', {
    state: {
      shiftId,
      stationId: userStationId,
      shiftNumber: shift?.shiftNumber || 'Unknown',
      shiftData: shift
    }
  });
};

const handleNavigateToTankReadings = (shiftId) => {
  if (!shiftId || !userStationId) {
    message.warning('Shift ID or Station ID missing');
    return;
  }
   const shift = shiftsHistory.find(s => s.id === shiftId);
  
  navigate('/readings/tank-readings', {
    state: {
      shiftId,
      stationId: userStationId,
      shiftNumber: shift?.shiftNumber || 'Unknown',
      shiftData: shift
    }
  });
};

  // Calculate shift duration
  const getShiftDuration = useCallback((shift) => {
    if (!shift?.startTime) return '0h 0m';
    
    try {
      const startTime = new Date(shift.startTime);
      const endTime = shift.endTime ? new Date(shift.endTime) : new Date();
      const diffMs = endTime - startTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours === 0) return `${minutes}m`;
      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'N/A';
    }
  }, []);

  // Format date for reports
  const formatDateForReport = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status display
  const getStatusDisplay = (status) => {
    const statusMap = {
      'OPEN': 'Open',
      'PENDING': 'Pending',
      'CLOSED': 'Closed',
      'ABORTED': 'Aborted',
      'CANCELLED': 'Cancelled',
      'UNDER_REVIEW': 'Under Review',
      'APPROVED': 'Approved'
    };
    return statusMap[status] || status;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colorMap = {
      'OPEN': 'green',
      'PENDING': 'orange',
      'CLOSED': 'blue',
      'ABORTED': 'red',
      'CANCELLED': 'red',
      'UNDER_REVIEW': 'gold',
      'APPROVED': 'cyan'
    };
    return colorMap[status] || 'default';
  };

      // Enhanced shifts data for reporting - Minimal version
const enhancedShifts = useMemo(() => 
  shiftsHistory.map((shift, index) => ({
    ...shift,
    sequentialNumber: index + 1,
    
    // For display/export
    exportStatus: getStatusDisplay(shift.status),
    exportSupervisor: shift.supervisor ? 
      `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : 
      'Unassigned',
    exportStartTime: formatDateForReport(shift.startTime),
    exportEndTime: formatDateForReport(shift.endTime),
    exportDuration: getShiftDuration(shift),
    
    // Keep original status for reference
    statusDisplay: getStatusDisplay(shift.status),
    statusColor: getStatusColor(shift.status),
    supervisorName: shift.supervisor ? 
      `${shift.supervisor.firstName} ${shift.supervisor.lastName}` : 
      'Unassigned',
    formattedStartTime: formatDateForReport(shift.startTime),
    formattedEndTime: formatDateForReport(shift.endTime),
    duration: getShiftDuration(shift),
    
    // Flags
    isOpen: shift.status === 'OPEN',
    isPending: shift.status === 'PENDING',
    isClosed: shift.status === 'CLOSED'
  })),
[shiftsHistory]);

  // Filter shifts based on search term
  const filteredShifts = useMemo(() => {
    if (!searchTerm) return enhancedShifts;
    
    const term = searchTerm.toLowerCase();
    return enhancedShifts.filter(shift => 
      shift.shiftNumber?.toLowerCase().includes(term) ||
      shift.supervisorName?.toLowerCase().includes(term) ||
      shift.statusDisplay?.toLowerCase().includes(term) ||
      shift.stationName?.toLowerCase().includes(term)
    );
  }, [enhancedShifts, searchTerm]);

  // Summary data for report header
  const summaryData = useMemo(() => {
    const totalShifts = enhancedShifts.length;
    const openShifts = enhancedShifts.filter(s => s.isOpen).length;
    const pendingShifts = enhancedShifts.filter(s => s.isPending).length;
    const closedShifts = enhancedShifts.filter(s => s.isClosed).length;

    return {
      'Total Shifts': totalShifts,
      'Open Shifts': openShifts,
      'Pending Shifts': pendingShifts,
      'Closed Shifts': closedShifts,
      'Station': state.currentStation?.name || 'Unknown',
      'Report Generated': new Date().toLocaleString()
    };
  }, [enhancedShifts, state.currentStation]);
      
  // Export columns for shift reports - SIMPLIFIED VERSION
const exportColumns = [
  {
    title: 'Shift #',
    dataIndex: 'shiftNumber',
    key: 'shiftNumber',
    type: 'text',
    width: 100
  },
  {
    title: 'Status',
    dataIndex: 'statusDisplay',  // Using the pre-formatted status
    key: 'status',
    type: 'status',
    width: 100
  },
  {
    title: 'Supervisor',
    dataIndex: 'supervisorName',  // Using the pre-formatted supervisor name
    key: 'supervisor',
    type: 'text',
    width: 150
  },
  {
    title: 'Start Time',
    dataIndex: 'formattedStartTime',  // Using the pre-formatted date
    key: 'startTime',
    type: 'datetime',
    width: 150
  },
  {
    title: 'End Time',
    dataIndex: 'formattedEndTime',  // Using the pre-formatted date
    key: 'endTime',
    type: 'datetime',
    width: 150
  },
  {
    title: 'Duration',
    dataIndex: 'duration',  // Using the pre-formatted duration
    key: 'duration',
    type: 'text',
    width: 100
  }
];
  // ========== MAIN RENDER FUNCTIONS ==========

  // Columns for shifts history table
  const shiftHistoryColumns = [
    {
      title: 'Shift #',
      dataIndex: 'shiftNumber',
      key: 'shiftNumber',
      width: 120,
      render: (number, record) => (
        <Space>
          <Text strong>{number}</Text>
          {record.status === 'OPEN' && <Badge status="processing" />}
          {record.status === 'PENDING' && <Badge status="warning" />}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusDisplay(status)}
        </Tag>
      )
    },
    {
      title: 'Supervisor',
      key: 'supervisor',
      width: 150,
      render: (_, record) => (
        <Space>
          <User size={14} />
          {record.supervisorName}
        </Space>
      )
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
      render: (time) => formatDateForReport(time)
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 150,
      render: (time) => time ? formatDateForReport(time) : '-'
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (_, record) => getShiftDuration(record)
    },
    {
      title: 'Readings',
      key: 'readings',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Pump Readings">
            <Badge 
              count={record.pumpReadingsCount || 0} 
              showZero 
              size="small" 
              style={{ backgroundColor: '#52c41a' }}
            />
          </Tooltip>
          <Fuel size={12} />
          <Tooltip title="Tank Readings">
            <Badge 
              count={record.tankReadingsCount || 0} 
              showZero 
              size="small" 
              style={{ backgroundColor: '#1890ff' }}
            />
          </Tooltip>
          <Droplets size={12} />
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_, record) => {
        const isOpenShift = record.status === 'OPEN';
        
        return (
          <Space>
            {/* View Details Button */}
            <Tooltip title="View Details">
              <Button 
                icon={<Eye size={14} />} 
                size="small"
                onClick={() => handleViewShiftDetails(record.id)}
              />
            </Tooltip>
            
            {/* Close Shift Button for OPEN shifts */}
            {isOpenShift && (
              <Tooltip title="Close Shift">
                <Button 
                  type="primary" 
                  danger
                  size="small"
                  icon={<Square size={14} />}
                  onClick={() => handleDirectCloseShift(record.id)}
                >
                  Close
                </Button>
              </Tooltip>
            )}
            
            {/* More Actions Dropdown */}
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="pump-readings"
                    icon={<Fuel size={14} />}
                    onClick={() => handleNavigateToPumpReadings(record.id)}
                  >
                    Pump Meter Readings
                  </Menu.Item>
                  <Menu.Item 
                    key="tank-readings"
                    icon={<Droplets size={14} />}
                    onClick={() => handleNavigateToTankReadings(record.id)}
                  >
                    Tank Readings
                  </Menu.Item>
                  <Menu.Item 
                    key="attendants"
                    icon={<Users size={14} />}
                    onClick={() => handleShowAttendants(record.id)}
                  >
                    View Attendants
                  </Menu.Item>
                  <Menu.Item 
                    key="reconcilliations"
                    icon={<Users size={14} />}
                    onClick={() => handleNavigateToReconcilliations(record.id)}
                  >
                    View Reconcilliation
                  </Menu.Item>
                  <Menu.Divider />
                  {/* <Menu.Item 
                    key="reconciliation"
                    icon={<BarChart3 size={14} />}
                    onClick={() => handleViewReconciliation(record.id)}
                    disabled={record.status === 'OPEN' || record.status === 'PENDING'}
                  >
                    View Reconciliation
                  </Menu.Item> */}
                  <Menu.Divider />
                  {record.status === 'PENDING' && (
                    <Menu.Item 
                      key="resume"
                      icon={<Play size={14} />}
                      onClick={() => handleResumeShift(record.id)}
                    >
                      Resume Setup
                    </Menu.Item>
                  )}
                  {record.status === 'PENDING' && (
                    <Menu.Item 
                      key="abort"
                      icon={<Trash2 size={14} />}
                      danger
                      onClick={() => handleAbortShift(record.id)}
                    >
                      Abort Shift
                    </Menu.Item>
                  )}
                </Menu>
              }
              placement="bottomRight"
              trigger={['click']}
            >
              <Button 
                size="small" 
                icon={<MoreVertical size={14} />}
              />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  // ========== WIZARD MODES ==========
  
  if (wizardMode === 'open') {
    return (
      <ShiftCreationWizard
        onClose={handleCancelWizard}
        onSuccess={handleWizardSuccess}
        stationId={userStationId}
        currentUser={currentUser}
        existingShiftId={resumeShiftId}
      />
    );
  }

  if (wizardMode === 'close') {
    return (
      <CloseWizard
        onClose={handleCancelWizard}
        onSuccess={handleCloseShift}
        shift={openShiftData}
        stationId={userStationId}
        currentUser={currentUser}
      />
    );
  }

  // ========== MAIN VIEW ==========

  if (checkingShift && loadingHistory) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '400px',
        padding: '40px'
      }}>
        <Loader2 size={48} className="spin" style={{ 
          color: '#1890ff',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px'
        }} />
        <Title level={4} style={{ marginBottom: '8px' }}>
          Shift Management
        </Title>
        <Text type="secondary">
          Loading shift information...
        </Text>
      </div>
    );
  }

  // Check if we have any pending or open shifts
  const pendingShifts = enhancedShifts.filter(s => s.status === 'PENDING');
  const openShifts = enhancedShifts.filter(s => s.status === 'OPEN');

  // Main export handler
  const handleExport = (format) => {
    console.log(`Exporting ${enhancedShifts.length} shifts as ${format}`);
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={4}>Shift Management</Title>
        <Text type="secondary">
          Managing shifts for {state.currentStation?.name || 'station'}
        </Text>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Quick Actions Card */}
        <Card>
          <Row gutter={[16, 16]} align="middle">
            <Col span={16}>
              <Space direction="vertical" size="small">
                <Text strong>Shift Operations</Text>
                <Text type="secondary">
                  {openShifts.length > 0 
                    ? `There is an active shift #${openShifts[0]?.shiftNumber}`
                    : 'No active shift. You can open a new shift.'
                  }
                </Text>
              </Space>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Space>
                {/* ALWAYS show Open Shift button */}
                <Button 
                  type="primary" 
                  icon={<PlusCircle size={16} />}
                  onClick={handleStartNewShift}
                  style={{ 
                    background: pendingShifts.length > 0 ? '#fa8c16' : '#1890ff',
                    borderColor: pendingShifts.length > 0 ? '#fa8c16' : '#1890ff'
                  }}
                >
                  {pendingShifts.length > 0 ? 'Start New Shift' : 'Open Shift'}
                </Button>
                
                {/* Show Resume button if there are pending shifts */}
                {pendingShifts.length > 0 && (
                  <Button 
                    type="default"
                    icon={<Play size={16} />}
                    onClick={() => handleResumeShift(pendingShifts[0].id)}
                    style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                  >
                    Resume Incomplete ({pendingShifts.length})
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Status Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Active Shifts"
                value={openShifts.length}
                valueStyle={{ color: openShifts.length > 0 ? '#52c41a' : '#d9d9d9' }}
                prefix={<Play size={16} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Incomplete Shifts"
                value={pendingShifts.length}
                valueStyle={{ color: pendingShifts.length > 0 ? '#fa8c16' : '#d9d9d9' }}
                prefix={<PauseCircle size={16} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Shifts"
                value={enhancedShifts.length}
                prefix={<Clock size={16} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Closed Today"
                value={enhancedShifts.filter(s => 
                  s.status === 'CLOSED' && 
                  s.endTime && 
                  new Date(s.endTime).toDateString() === new Date().toDateString()
                ).length}
                prefix={<CheckCircle size={16} />}
              />
            </Card>
          </Col>
        </Row>

        {/* SHIFTS HISTORY TABLE */}
        <Card 
          title={
            <Space>
              <Clock size={16} />
              <Text>All Shifts</Text>
              <Badge 
                count={enhancedShifts.length} 
                showZero 
                style={{ 
                  backgroundColor: openShifts.length > 0 ? '#52c41a' : 
                    pendingShifts.length > 0 ? '#fa8c16' : '#1890ff'
                }} 
              />
            </Space>
          }
          extra={
            <Space>
              <Search
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 250 }}
                allowClear
                enterButton={<Search size={14} />}
              />
              <Tooltip title="Refresh Data">
                <Button 
                  icon={<RefreshCw size={14} />} 
                  onClick={refreshAllShifts}
                  loading={loadingHistory}
                  size="small"
                />
              </Tooltip>
              {/* Export Button */}
{/* Export Button - With exactly the columns you specified */}
      <AdvancedReportGenerator
        dataSource={enhancedShifts}
        columns={exportColumns}
        title={`Shift Management Report - ${state.currentStation?.name || 'System'}`}
        fileName={`shifts_report_${new Date().toISOString().split('T')[0]}`}
        summaryData={{
          'Total Shifts': enhancedShifts.length,
          'Open Shifts': enhancedShifts.filter(s => s.status === 'OPEN').length,
          'Pending Shifts': enhancedShifts.filter(s => s.status === 'PENDING').length,
          'Closed Shifts': enhancedShifts.filter(s => s.status === 'CLOSED').length,
          'Station': state.currentStation?.name || 'Unknown',
          'Report Generated': new Date().toLocaleString()
        }}
        reportType="operations"
        stationInfo={state.currentStation}
        footerText={`Generated from Lynx Energy System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''}`}
        showFooter={true}
        enableCustomization={true}
        onReportGenerate={handleExport}
        // NEW: Control grand totals (not needed for shift reports)
        showGrandTotals={false}
        // NEW: Enable horizontal scrolling for better viewing
        horizontalScroll={true}
        maxVisibleColumns={10}
        // NEW: Clean UI without advanced buttons
        compactMode={true}
        hideAdvancedButtons={false}
      />
            </Space>
          }
        >
          <Table
            columns={shiftHistoryColumns}
            dataSource={filteredShifts}
            rowKey="id"
            loading={loadingHistory}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} shifts`
            }}
            size="middle"
            scroll={{ x: 1200 }}
            rowClassName={(record) => {
              if (record.status === 'OPEN') return 'open-shift-row';
              if (record.status === 'PENDING') return 'pending-shift-row';
              return '';
            }}
          />
          
          {/* Incomplete Shift Notice */}
          {pendingShifts.length > 0 && (
            <Alert
              message="Incomplete Shifts"
              description={
                <Space direction="vertical" size="small">
                  <Text>
                    You have {pendingShifts.length} shift{pendingShifts.length > 1 ? 's' : ''} 
                    that {pendingShifts.length > 1 ? 'were' : 'was'} created but not fully started.
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Click "Resume" on the shift record to complete the setup, or "Abort" to cancel it.
                  </Text>
                </Space>
              }
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
              action={
                <Space>
                  <Button 
                    size="small" 
                    onClick={() => handleResumeShift(pendingShifts[0].id)}
                  >
                    Resume Oldest
                  </Button>
                  <Button 
                    size="small" 
                    onClick={handleStartNewShift}
                  >
                    Start New Instead
                  </Button>
                </Space>
              }
            />
          )}
        </Card>
      </div>

      {/* Attendants Modal */}
      <Modal
        title={
          <Space>
            <Users size={16} />
            <Text>Shift Attendants - {selectedShiftForAttendants?.shiftNumber}</Text>
          </Space>
        }
        open={attendantsModalVisible}
        onCancel={() => setAttendantsModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setAttendantsModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedShiftForAttendants && (
          <div>
            {/* Supervisor Information */}
            <Descriptions bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Shift Number">
                {selectedShiftForAttendants.shiftNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Supervisor">
                {selectedShiftForAttendants.supervisor?.firstName} {selectedShiftForAttendants.supervisor?.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Shift Status">
                <Tag color={getStatusColor(selectedShiftForAttendants.status)}>
                  {getStatusDisplay(selectedShiftForAttendants.status)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Attendants Table */}
            <Table
              title={() => (
                <Space>
                  <Text strong>Assigned Attendants</Text>
                  <Badge 
                    count={selectedShiftForAttendants.summary?.attendants || 0} 
                    showZero 
                    style={{ backgroundColor: '#1890ff' }}
                  />
                </Space>
              )}
              dataSource={selectedShiftForAttendants.details?.islandAssignments || []}
              columns={[
                {
                  title: 'Attendant Name',
                  dataIndex: 'attendant',
                  key: 'attendant',
                  width: 200
                },
                {
                  title: 'Island Code',
                  dataIndex: 'islandCode',
                  key: 'islandCode',
                  width: 150,
                  render: (code) => <Tag color="blue">{code}</Tag>
                },
                {
                  title: 'Assignment Type',
                  dataIndex: 'assignmentType',
                  key: 'assignmentType',
                  width: 150,
                  render: (type) => (
                    <Tag color={type === 'PRIMARY' ? 'green' : 'orange'}>
                      {type}
                    </Tag>
                  )
                }
              ]}
              size="small"
              pagination={false}
              locale={{ emptyText: 'No attendants assigned to this shift' }}
            />

            {/* Islands Summary */}
            {selectedShiftForAttendants.details?.islands && (
              <div style={{ marginTop: 16 }}>
                <Text strong>Assigned Islands: </Text>
                <Space size={4} wrap>
                  {selectedShiftForAttendants.details.islands.map((island, index) => (
                    <Tag key={index} color="blue">
                      {island}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Debug Info - Development only */}
      {process.env.NODE_ENV === 'development' && (
        <Card 
          title="Debug Information" 
          style={{ marginTop: 24, maxWidth: 1400, margin: '24px auto 0' }}
          size="small"
        >
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="Open Shifts">
              {openShifts.length}
            </Descriptions.Item>
            <Descriptions.Item label="Pending Shifts">
              {pendingShifts.length}
            </Descriptions.Item>
            <Descriptions.Item label="Total Shifts">
              {enhancedShifts.length}
            </Descriptions.Item>
            <Descriptions.Item label="Station ID">
              {userStationId || 'Not set'}
            </Descriptions.Item>
            <Descriptions.Item label="Current Open Shift">
              {openShifts[0]?.shiftNumber || 'None'}
            </Descriptions.Item>
            <Descriptions.Item label="Service Used">
              shiftFetchService
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Add CSS for table row styling */}
      <style>{`
        .open-shift-row {
          background-color: rgba(82, 196, 26, 0.05);
        }
        .open-shift-row:hover {
          background-color: rgba(82, 196, 26, 0.1);
        }
        .pending-shift-row {
          background-color: rgba(250, 140, 22, 0.05);
        }
        .pending-shift-row:hover {
          background-color: rgba(250, 140, 22, 0.1);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ShiftManagementTest;