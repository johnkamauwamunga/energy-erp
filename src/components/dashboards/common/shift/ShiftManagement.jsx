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
  Dropdown
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
  PauseCircle
} from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { useShift } from '../../../../hooks/useShift';
import ShiftCreationWizard from './shiftOpen/ShiftCreationWizard';
import CloseWizard from './shiftClose/CloseWizard';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { operationsService } from '../../../../services/operationService/operationService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Step } = Steps;

const ShiftManagement = () => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const userStationId = state.currentStation?.id;

  const {
    currentShift,
    shiftData,
    loading,
    error,
    createShift,
    openShift,
    closeShift,
    updateShiftData,
    clearError,
    checkActiveShift,
    canOpenShift,
    canCloseShift,
    getShiftStatus,
    abortIncompleteShift
  } = useShift(userStationId);

  const [wizardMode, setWizardMode] = useState(null);
  const [supervisorId, setSupervisorId] = useState('');
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

  // Safe wrapper for fetching open shift that handles "not found" gracefully
  const fetchOpenShiftSafe = async (stationId) => {
    try {
      const result = await shiftService.getOpenShift(stationId);
      return result;
    } catch (error) {
      // Check if this is a "no open shift" error
      const errorMessage = error.message || '';
      const isNotFoundError = 
        error.response?.status === 404 ||
        errorMessage.includes('404') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('No open shift') ||
        errorMessage.includes('open shift');
      
      if (isNotFoundError) {
        console.log(`ℹ️ No open shift found for station ${stationId}`);
        return null; // Return null for "not found"
      }
      
      // Re-throw actual errors
      console.error(`❌ Error fetching open shift for station ${stationId}:`, error);
      throw error;
    }
  };

  // Check for open and pending shifts
  useEffect(() => {
    console.log("🔍 Checking for shifts...", userStationId);
    
    const fetchShifts = async () => {
      if (!userStationId) {
        setCheckingShift(false);
        return;
      }
      
      setCheckingShift(true);
      try {
        // Fetch data with individual error handling
        let openShiftResult = null;
        let shiftsHistoryResult = null;
        
        // Fetch open shift with safe wrapper
        try {
          openShiftResult = await fetchOpenShiftSafe(userStationId);
        } catch (openShiftError) {
          console.log("⚠️ Could not fetch open shift:", openShiftError.message);
          // Don't throw - continue to fetch history
        }
        
        // Fetch shift history
        try {
          shiftsHistoryResult = await operationsService.getShifts({
            stationId: userStationId,
            limit: 50,
            page: 1,
            status: 'ALL'
          });
        } catch (historyError) {
          console.error("❌ Error fetching shift history:", historyError);
          // Still continue, we'll have empty history
          shiftsHistoryResult = { shifts: [] };
        }

        console.log("✅ Shifts check results:", {
          openShift: openShiftResult ? `Found: ${openShiftResult.shiftNumber}` : 'Not found',
          historyCount: Array.isArray(shiftsHistoryResult) ? 
            shiftsHistoryResult.length : 
            (shiftsHistoryResult?.shifts?.length || 0)
        });

        // Check for OPEN shift (fully started)
        if (openShiftResult && openShiftResult.status === "OPEN") {
          setHasOpenShift(true);
          setOpenShiftData(openShiftResult);
          setHasPendingShift(false);
          setPendingShiftData(null);
          console.log("🚦 Open shift found:", openShiftResult.shiftNumber);
        } else {
          setHasOpenShift(false);
          setOpenShiftData(null);
          console.log("🚦 No open shift found - this is OK");
        }

        // Check for PENDING shift (created but not fully opened)
        const shiftsArray = Array.isArray(shiftsHistoryResult) ? 
          shiftsHistoryResult : 
          (shiftsHistoryResult?.shifts || []);

        const pendingShift = shiftsArray.find(shift => 
          shift.status === 'PENDING' && !shift.endTime
        );

        if (pendingShift) {
          setHasPendingShift(true);
          setPendingShiftData(pendingShift);
          console.log("⏳ Pending shift found:", pendingShift.shiftNumber);
        } else {
          setHasPendingShift(false);
          setPendingShiftData(null);
        }

        // Update history
        setShiftsHistory(shiftsArray);

      } catch (error) {
        console.error("❌ Unexpected error checking shifts:", error);
        message.error('Failed to check shift status');
      } finally {
        setCheckingShift(false);
      }
    };

    fetchShifts();
  }, [userStationId]);

  // Handle shift creation
  const handleCreateShift = async () => {
    if (!supervisorId || !userStationId) {
      return;
    }

    try {
      const shiftPayload = {
        stationId: userStationId,
        supervisorId: supervisorId
      };

      await createShift(shiftPayload);
    } catch (err) {
      // Error handled in hook
    }
  };

  // Handle close shift
  const handleCloseShift = async (closeData) => {
    try {
      if (!openShiftData?.id) {
        message.error('No shift ID available for closing');
        return;
      }

      console.log("🚀 Closing shift with ID:", openShiftData.id);
      await closeShift(openShiftData.id, closeData);
      setWizardMode(null);
      setHasOpenShift(false);
      setOpenShiftData(null);
      
      // Refresh shifts after closing
      await refreshAllShifts();
      message.success('Shift closed successfully');
    } catch (err) {
      console.error("❌ Failed to close shift:", err);
      message.error('Failed to close shift');
    }
  };

  // Handle wizard cancel
  const handleCancelWizard = () => {
    setWizardMode(null);
  };

  // Refresh all shifts data
  const refreshAllShifts = async () => {
    if (!userStationId) return;
    
    setCheckingShift(true);
    setLoadingHistory(true);
    try {
      let openShiftResult = null;
      let shiftsHistoryResult = null;
      
      // Fetch open shift with safe wrapper
      try {
        openShiftResult = await fetchOpenShiftSafe(userStationId);
      } catch (openShiftError) {
        console.log("⚠️ Could not refresh open shift:", openShiftError.message);
      }
      
      // Fetch shift history
      try {
        shiftsHistoryResult = await operationsService.getShifts({
          stationId: userStationId,
          limit: 50,
          page: 1,
          status: 'ALL'
        });
      } catch (historyError) {
        console.error("❌ Error refreshing shift history:", historyError);
        shiftsHistoryResult = { shifts: [] };
      }

      // Update open shift
      if (openShiftResult && openShiftResult.status === "OPEN") {
        setHasOpenShift(true);
        setOpenShiftData(openShiftResult);
        setHasPendingShift(false);
        setPendingShiftData(null);
      } else {
        setHasOpenShift(false);
        setOpenShiftData(null);
      }

      // Update pending shift
      const shiftsArray = Array.isArray(shiftsHistoryResult) ? 
        shiftsHistoryResult : 
        (shiftsHistoryResult?.shifts || []);

      const pendingShift = shiftsArray.find(shift => 
        shift.status === 'PENDING' && !shift.endTime
      );

      if (pendingShift) {
        setHasPendingShift(true);
        setPendingShiftData(pendingShift);
      } else {
        setHasPendingShift(false);
        setPendingShiftData(null);
      }

      // Update history
      setShiftsHistory(shiftsArray);

      message.success('Shift data refreshed');
    } catch (error) {
      console.error("Error refreshing shifts:", error);
      message.error('Failed to refresh shift data');
    } finally {
      setCheckingShift(false);
      setLoadingHistory(false);
    }
  };

  // Direct close shift handler
  const handleDirectCloseShift = (shiftId) => {
    const shift = shiftsHistory.find(s => s.id === shiftId);
    if (!shift) {
      message.warning('Shift not found');
      return;
    }
    
    console.log("🎯 Starting shift close process for:", shift.shiftNumber);
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
          // Call abort function from useShift hook
          if (abortIncompleteShift) {
            await abortIncompleteShift(shift.id);
          } else {
            // Fallback: manually update shift status or delete
            await shiftService.updateShiftStatus(shift.id, 'ABORTED');
          }
          
          message.success(`Shift #${shift.shiftNumber} aborted successfully`);
          
          // Refresh data
          await refreshAllShifts();
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
    
    console.log("🔄 Resuming shift setup:", shift.shiftNumber);
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
      const reconciliationData = await operationsService.getShiftReconciliation(shift.id);
      Modal.info({
        title: `Shift Reconciliation - ${shift.shiftNumber}`,
        width: 1000,
        content: (
          <div>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Total Tanks">
                {reconciliationData?.summary?.totalTanksReconciled || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Tanks with Variance">
                {reconciliationData?.summary?.tanksWithVariance || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Total Variance">
                <Tag color={Math.abs(reconciliationData?.summary?.totalVariance) < 50 ? 'green' : 'red'}>
                  {reconciliationData?.summary?.totalVariance?.toLocaleString() || 0} L
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            {reconciliationData?.tankReconciliations?.length > 0 && (
              <Table
                dataSource={reconciliationData.tankReconciliations}
                columns={[
                  { title: 'Tank', dataIndex: ['tank', 'name'], key: 'tankName' },
                  { title: 'Product', dataIndex: ['product', 'name'], key: 'product' },
                  { 
                    title: 'Variance', 
                    key: 'variance',
                    render: (_, record) => (
                      <Tag color={Math.abs(record.wetStock?.variance) < 10 ? 'green' : 'red'}>
                        {record.wetStock?.variance?.toLocaleString()} L
                      </Tag>
                    )
                  },
                  { 
                    title: 'Variance %', 
                    key: 'variancePercentage',
                    render: (_, record) => `${record.wetStock?.variancePercentage?.toFixed(2)}%`
                  }
                ]}
                size="small"
                pagination={false}
              />
            )}
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
      const shiftDetails = await operationsService.getShiftById(shift.id);
      Modal.info({
        title: `Shift ${shift.shiftNumber} Details`,
        width: 700,
        content: (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Shift Number">{shiftDetails.shiftNumber}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={operationsService.getStatusColor(shiftDetails.status)}>
                {operationsService.getStatusDisplay(shiftDetails.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Start Time">
              {new Date(shiftDetails.startTime).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="End Time">
              {shiftDetails.endTime ? new Date(shiftDetails.endTime).toLocaleString() : 'Ongoing'}
            </Descriptions.Item>
            <Descriptions.Item label="Supervisor">
              {shiftDetails.supervisor?.firstName} {shiftDetails.supervisor?.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {shiftDetails.station?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Tank Readings" span={2}>
              {shiftDetails._count?.dipReadings || 0} readings
            </Descriptions.Item>
            <Descriptions.Item label="Pump Readings" span={2}>
              {shiftDetails._count?.meterReadings || 0} readings
            </Descriptions.Item>
            <Descriptions.Item label="Attendants" span={2}>
              {shiftDetails._count?.shiftIslandAttendant || 0} attendants
            </Descriptions.Item>
          </Descriptions>
        ),
        onOk() {},
      });
    } catch (error) {
      message.error('Failed to load shift details');
    }
  };

  // Filter shifts based on search term
  const filteredShifts = useMemo(() => {
    if (!searchTerm) return shiftsHistory;
    
    return shiftsHistory.filter(shift => 
      shift.shiftNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.supervisor?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.supervisor?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shiftsHistory, searchTerm]);

  // Calculate shift duration
  const getShiftDuration = useCallback((shift) => {
    if (!shift?.startTime) return '0h 0m';
    
    const startTime = new Date(shift.startTime);
    const endTime = shift.endTime ? new Date(shift.endTime) : new Date();
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }, []);

  // Get completion status for pending shift
  const getPendingShiftStatus = useCallback((shift) => {
    if (!shift || shift.status !== 'PENDING') return null;
    
    const attendants = shift._count?.shiftIslandAttendant || 0;
    const tankReadings = shift._count?.dipReadings || 0;
    const pumpReadings = shift._count?.meterReadings || 0;
    
    const stepsCompleted = [
      attendants > 0,
      tankReadings > 0,
      pumpReadings > 0
    ].filter(Boolean).length;
    
    const totalSteps = 3; // Personnel, Tank Readings, Pump Readings
    
    return {
      progress: Math.round((stepsCompleted / totalSteps) * 100),
      stepsCompleted,
      totalSteps,
      attendants,
      tankReadings,
      pumpReadings
    };
  }, []);

  // Columns for shifts history table
  const shiftHistoryColumns = [
    {
      title: 'Shift Number',
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
      render: (status, record) => {
        const statusDisplay = operationsService.getStatusDisplay(status);
        const statusColor = operationsService.getStatusColor(status);
        
        if (status === 'PENDING') {
          const progress = getPendingShiftStatus(record);
          return (
            <Space direction="vertical" size={2}>
              <Tag color={statusColor}>
                {statusDisplay}
              </Tag>
              {progress && (
                <Progress 
                  percent={progress.progress} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#fa8c16"
                />
              )}
            </Space>
          );
        }
        
        return <Tag color={statusColor}>{statusDisplay}</Tag>;
      }
    },
    {
      title: 'Supervisor',
      key: 'supervisor',
      width: 150,
      render: (_, record) => (
        <Space>
          <User size={14} />
          {record.supervisor ? 
            `${record.supervisor.firstName} ${record.supervisor.lastName}` : 
            'Unknown'
          }
        </Space>
      )
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 150,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
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
        <Space>
          <Badge 
            count={record._count?.dipReadings || 0} 
            showZero 
            size="small" 
            style={{ backgroundColor: '#1890ff' }}
          />
          <Droplets size={12} />
          <Badge 
            count={record._count?.meterReadings || 0} 
            showZero 
            size="small" 
            style={{ backgroundColor: '#52c41a' }}
          />
          <Fuel size={12} />
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const isOpenShift = record.status === 'OPEN';
        const isPendingShift = record.status === 'PENDING';
        
        return (
          <Space>
            <Tooltip title="View Details">
              <Button 
                icon={<Eye size={14} />} 
                size="small"
                onClick={() => handleViewShiftDetails(record.id)}
              />
            </Tooltip>
            
            {/* For OPEN shifts: Show Close button */}
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
            
            {/* For PENDING shifts: Show Resume button */}
            {isPendingShift && (
              <Tooltip title="Resume Shift Setup">
                <Button 
                  type="primary"
                  size="small"
                  icon={<Play size={14} />}
                  onClick={() => handleResumeShift(record.id)}
                >
                  Resume
                </Button>
              </Tooltip>
            )}
            
            {/* Additional actions dropdown */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'reconciliation',
                    label: 'View Reconciliation',
                    icon: <BarChart3 size={14} />,
                    onClick: () => handleViewReconciliation(record.id),
                    disabled: record.status === 'OPEN' || record.status === 'PENDING'
                  },
                  {
                    key: 'refresh',
                    label: 'Refresh Data',
                    icon: <RefreshCw size={14} />,
                    onClick: refreshAllShifts
                  },
                  isPendingShift && {
                    key: 'abort',
                    label: 'Abort Shift',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => handleAbortShift(record.id)
                  }
                ].filter(Boolean)
              }}
              placement="bottomRight"
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
        existingShiftId={resumeShiftId} // Pass existing shift ID if resuming
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

  if (checkingShift) {
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
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // Check if we have any pending shifts
  const pendingShifts = shiftsHistory.filter(s => s.status === 'PENDING');
  const openShifts = shiftsHistory.filter(s => s.status === 'OPEN');

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={4}>Shift Management</Title>
      </div>

      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 24, maxWidth: 1200, margin: '0 auto 24px' }}
          action={
            <Button size="small" type="text" onClick={clearError}>
              Dismiss
            </Button>
          }
        />
      )}

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Quick Actions Card - ALWAYS SHOW OPEN SHIFT BUTTON */}
        <Card>
          <Row gutter={[16, 16]} align="middle">
            <Col span={16}>
              {/* Optional: Add station info or welcome message here */}
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Space>
                {/* ALWAYS show Open Shift button */}
                <Button 
                  type="primary" 
                  icon={<PlusCircle size={16} />}
                  onClick={handleStartNewShift}
                  disabled={loading}
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
                value={shiftsHistory.length}
                prefix={<Clock size={16} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Closed Today"
                value={shiftsHistory.filter(s => 
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
              All Shifts
              <Badge 
                count={shiftsHistory.length} 
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
              <Button 
                icon={<RefreshCw size={14} />} 
                onClick={refreshAllShifts}
                loading={loadingHistory}
                size="small"
              >
                Refresh
              </Button>
              <Search
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 250 }}
                allowClear
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

      {/* Debug Info - Development only */}
      {process.env.NODE_ENV === 'development' && (
        <Card 
          title="Debug Information" 
          style={{ marginTop: 24, maxWidth: 1200, margin: '24px auto 0' }}
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
              {shiftsHistory.length}
            </Descriptions.Item>
            <Descriptions.Item label="Open Shift IDs">
              {openShifts.map(s => s.shiftNumber).join(', ') || 'None'}
            </Descriptions.Item>
            <Descriptions.Item label="Pending Shift IDs">
              {pendingShifts.map(s => s.shiftNumber).join(', ') || 'None'}
            </Descriptions.Item>
            <Descriptions.Item label="Can Create New">
              {openShifts.length === 0 ? 'Yes' : 'No (has open shift)'}
            </Descriptions.Item>
            <Descriptions.Item label="Station ID">
              {userStationId || 'Not set'}
            </Descriptions.Item>
            <Descriptions.Item label="Has Open Shift API Error">
              {hasOpenShift ? 'No (found open shift)' : 'Yes (or error)'}
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
      `}</style>
    </div>
  );
};

export default ShiftManagement;