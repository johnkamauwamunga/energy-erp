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
  Modal
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
  BarChart3
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
    getShiftStatus
  } = useShift(userStationId);

  const [wizardMode, setWizardMode] = useState(null);
  const [supervisorId, setSupervisorId] = useState('');
  const [hasOpenShift, setHasOpenShift] = useState(false);
  const [checkingShift, setCheckingShift] = useState(true);
  const [openShiftData, setOpenShiftData] = useState(null);
  
  // New state for shifts history table
  const [shiftsHistory, setShiftsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check for open shift and load shifts history
  useEffect(() => {
    console.log("🔍 Checking for open shift...", userStationId);
    
    const fetchOpenShift = async () => {
      if (!userStationId) {
        setCheckingShift(false);
        return;
      }
      
      setCheckingShift(true);
      try {
        console.log("🔍 Calling shiftService.getOpenShift...");
        const result = await shiftService.getOpenShift(userStationId);
        console.log("✅ Open shift check result:", result);
        
        if (result && result.status === "OPEN") {
          setHasOpenShift(true);
          setOpenShiftData(result);
          console.log("🚦 Open shift found:", result.shiftNumber);
        } else {
          setHasOpenShift(false);
          setOpenShiftData(null);
          console.log("🚦 No open shift found");
        }
      } catch (error) {
        console.error("❌ Error checking open shift:", error);
        setHasOpenShift(false);
        setOpenShiftData(null);
        message.error('Failed to check shift status');
      } finally {
        setCheckingShift(false);
      }
    };

    const loadShiftsHistory = async () => {
      if (!userStationId) return;
      
      setLoadingHistory(true);
      try {
        console.log("📊 Loading shifts history...");
        const shiftsData = await operationsService.getShifts({
          stationId: userStationId,
          limit: 50,
          page: 1
        });
        
        // Handle the response - it's an array directly, not wrapped in data.shifts
        console.log("✅ Shifts history response:", shiftsData);
        const shiftsArray = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.shifts || []);
        console.log("✅ Shifts history loaded:", shiftsArray.length, "shifts");
        setShiftsHistory(shiftsArray);
      } catch (error) {
        console.error("❌ Error loading shifts history:", error);
        message.error('Failed to load shifts history');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchOpenShift();
    loadShiftsHistory();
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
      
      // Refresh shifts history after closing
      loadShiftsHistory();
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

  // Re-check open shift status and refresh history
  const checkOpenShiftStatus = async () => {
    if (!userStationId) return;
    
    setCheckingShift(true);
    try {
      const [openShiftResult] = await Promise.all([
        shiftService.getOpenShift(userStationId),
        loadShiftsHistory() // Refresh history as well
      ]);
      
      if (openShiftResult && openShiftResult.status === "OPEN") {
        setHasOpenShift(true);
        setOpenShiftData(openShiftResult);
        message.success('Shift status refreshed');
      } else {
        setHasOpenShift(false);
        setOpenShiftData(null);
      }
    } catch (error) {
      console.error("Error re-checking shift status:", error);
      setHasOpenShift(false);
      setOpenShiftData(null);
      message.error('Failed to refresh shift status');
    } finally {
      setCheckingShift(false);
    }
  };

  // Load shifts history
  const loadShiftsHistory = async () => {
    if (!userStationId) return;
    
    setLoadingHistory(true);
    try {
      const shiftsData = await operationsService.getShifts({
        stationId: userStationId,
        limit: 50,
        page: 1
      });
      
      // Handle the response structure
      const shiftsArray = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.shifts || []);
      setShiftsHistory(shiftsArray);
    } catch (error) {
      console.error("Error loading shifts history:", error);
      message.error('Failed to load shifts history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Direct close shift handler
  const handleDirectCloseShift = () => {
    if (!hasOpenShift || !openShiftData) {
      message.warning('No open shift available to close');
      return;
    }
    
    console.log("🎯 Starting shift close process for:", openShiftData.shiftNumber);
    setWizardMode('close');
  };

  // View shift reconciliation
  const handleViewReconciliation = async (shift) => {
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
  const handleViewShiftDetails = async (shift) => {
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

  // Memoized calculations for current shift performance
  const shiftStats = useMemo(() => {
    if (!openShiftData) return null;

    return {
      totalTanks: openShiftData._count?.dipReadings || 0,
      totalPumps: openShiftData._count?.meterReadings || 0,
      totalAttendants: openShiftData._count?.shiftIslandAttendant || 0,
      startTime: new Date(openShiftData.startTime).toLocaleString(),
      duration: getShiftDuration(openShiftData),
      supervisor: openShiftData.supervisor ? 
        `${openShiftData.supervisor.firstName} ${openShiftData.supervisor.lastName}` : 
        'Unknown'
    };
  }, [openShiftData, getShiftDuration]);

  // Columns for shifts history table
  const shiftHistoryColumns = [
    {
      title: 'Shift Number',
      dataIndex: 'shiftNumber',
      key: 'shiftNumber',
      render: (number, record) => (
        <Space>
          <Text strong>{number}</Text>
          {record.status === 'OPEN' && <Badge status="processing" />}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={operationsService.getStatusColor(status)}>
          {operationsService.getStatusDisplay(status)}
        </Tag>
      )
    },
    {
      title: 'Supervisor',
      key: 'supervisor',
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
      render: (time) => new Date(time).toLocaleString()
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => getShiftDuration(record)
    },
    {
      title: 'Readings',
      key: 'readings',
      render: (_, record) => (
        <Space>
          <Badge count={record._count?.dipReadings || 0} showZero size="small" />
          <Droplets size={12} />
          <Badge count={record._count?.meterReadings || 0} showZero size="small" />
          <Fuel size={12} />
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<Eye size={14} />} 
              size="small"
              onClick={() => handleViewShiftDetails(record)}
            />
          </Tooltip>
          <Tooltip title="View Reconciliation">
            <Button 
              icon={<BarChart3 size={14} />} 
              size="small"
              onClick={() => handleViewReconciliation(record)}
              disabled={record.status === 'OPEN'}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // ========== WIZARD MODES ==========
  
  if (wizardMode === 'open') {
    return (
      <ShiftCreationWizard
        onClose={handleCancelWizard}
        onSuccess={() => {
          handleCancelWizard();
          checkOpenShiftStatus();
        }}
        stationId={userStationId}
        currentUser={currentUser}
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
      <div style={{ padding: 24 }}>
        <Card style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <RefreshCw size={32} className="ant-spin" />
          </div>
          <Title level={3}>Checking Shift Status</Title>
          <Text type="secondary">Looking for active shifts at your station</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>Shift Management</Title>
        <Text type="secondary">
          {hasOpenShift ? 'Manage current shift operations' : 'Start new shift operations'}
        </Text>
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
        
        {/* Quick Actions Card */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={12}>
              <Space direction="vertical" size="small">
                <Title level={4} style={{ margin: 0 }}>
                  Shift Operations
                </Title>
                <Text type="secondary">
                  {hasOpenShift ? 
                    `Current Shift: ${openShiftData?.shiftNumber}` : 
                    'No active shift running'
                  }
                </Text>
              </Space>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                {hasOpenShift ? (
                  <Button 
                    type="primary" 
                    danger 
                    icon={<Square size={16} />}
                    onClick={handleDirectCloseShift}
                    loading={loading}
                  >
                    Close Shift
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    icon={<Play size={16} />}
                    onClick={() => setWizardMode('open')}
                    disabled={loading}
                  >
                    Start New Shift
                  </Button>
                )}
                <Button 
                  icon={<RefreshCw size={14} />}
                  onClick={checkOpenShiftStatus}
                  loading={checkingShift || loadingHistory}
                >
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* SHIFTS HISTORY TABLE - Always show the history */}
        <Card 
          title={
            <Space>
              <Clock size={16} />
              Shift History
              <Badge count={shiftsHistory.length} showZero />
            </Space>
          }
          extra={
            <Search
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 250 }}
            />
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
          />
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
            <Descriptions.Item label="Has Open Shift">
              {hasOpenShift ? 'Yes' : 'No'}
            </Descriptions.Item>
            <Descriptions.Item label="Open Shift ID">
              {openShiftData?.id || 'None'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Shifts in History">
              {shiftsHistory.length}
            </Descriptions.Item>
            <Descriptions.Item label="Open Shift in History">
              {shiftsHistory.find(s => s.status === 'OPEN') ? 'Yes' : 'No'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default ShiftManagement;