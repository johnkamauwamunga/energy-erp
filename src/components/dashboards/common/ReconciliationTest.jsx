// src/pages/tests/ReconciliationTest.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Typography, 
  Alert, 
  Spin, 
  Badge,
  Table,
  Select,
  Space,
  message,
  Tabs,
  Descriptions,
  Statistic,
  Divider,
  Tag,
  Timeline,
  Tooltip,
  Progress,
  Modal,
  Input,
  DatePicker,
  Collapse,
  Empty
} from 'antd';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  FileText,
  Filter,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  Printer,
  Clock,
  Shield,
  Fuel,
  Droplets,
  Truck,
  Settings,
  Info,
  ChevronRight,
  ChevronDown,
  Layers,
  PieChart,
  Activity,
  Zap,
  Plus,
  MinusCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Gauge,
  Thermometer,
  Beaker
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { reconciliationService, RECONCILIATION_STATUS, SHIFT_STATUS } from '../../../services/reconcilliationService/reconcilliationService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const ReconciliationTest = () => {
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [shiftsData, setShiftsData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [tankHistoryData, setTankHistoryData] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  
  const [selectedShiftId, setSelectedShiftId] = useState('2a4b2cbc-45d9-488b-8f9c-61ae766bc9bf');
  const [selectedTankId, setSelectedTankId] = useState('');
  const [dateRange, setDateRange] = useState(['2024-01-01', '2024-01-31']);
  const [activeTab, setActiveTab] = useState('shift');
  const [showRawData, setShowRawData] = useState(false);
  const [filters, setFilters] = useState({
    stationId: '',
    period: 'month',
    status: 'ALL',
    limit: 10,
    offset: 0
  });

  // Cache control
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);

  // ==================== DATA PROCESSING ====================

  /**
   * Process tank reconciliation data
   * For each tank:
   * - Opening volume = START reading
   * - Closing volume = END reading  
   * - Actual deduction = Opening - Closing
   * - Expected deduction = Sum of all connected pumps (electric end - start)
   * - Variance = Actual deduction - Expected deduction
   */
  const processTankReconciliation = (tankData) => {
    if (!tankData) return null;

    // Get opening and closing volumes from tank dip readings
    const openingReading = tankData.readings?.start;
    const closingReading = tankData.readings?.end;
    
    const openingVolume = openingReading?.volume || 0;
    const closingVolume = closingReading?.volume || 0;
    
    // Actual deduction from dip readings
    const actualDeduction = openingVolume - closingVolume;

    // Calculate expected deduction from connected pumps
    let expectedDeduction = 0;
    const pumpDetails = [];

    if (tankData.pumps && tankData.pumps.length > 0) {
      tankData.pumps.forEach(pump => {
        const pumpStart = pump.readings?.start?.electricMeter || 0;
        const pumpEnd = pump.readings?.end?.electricMeter || 0;
        const pumpDispensed = pumpEnd - pumpStart;
        
        expectedDeduction += pumpDispensed;
        
        pumpDetails.push({
          pumpName: pump.pump?.name || 'Unknown Pump',
          startMeter: pumpStart,
          endMeter: pumpEnd,
          dispensed: pumpDispensed,
          unitPrice: pump.readings?.end?.unitPrice || pump.readings?.start?.unitPrice || 0,
          salesValue: pump.readings?.end?.salesValue || 0
        });
      });
    }

    // Calculate variance
    const variance = actualDeduction - expectedDeduction;
    const variancePercentage = actualDeduction !== 0 
      ? ((variance / actualDeduction) * 100).toFixed(2)
      : 0;

    // Determine reconciliation status
    let status = 'EXCELLENT';
    const absVariance = Math.abs(variance);
    if (absVariance > 100) status = 'INVESTIGATE';
    else if (absVariance > 30) status = 'ACCEPTABLE';
    else if (absVariance > 10) status = 'GOOD';

    return {
      tankId: tankData.tank?.id,
      tankName: tankData.tank?.name,
      productName: tankData.tank?.product?.name || 'Unknown',
      capacity: tankData.tank?.capacity,
      
      // Volume readings
      openingVolume,
      closingVolume,
      actualDeduction,
      
      // Pump calculations
      expectedDeduction,
      pumpDetails,
      
      // Variance
      variance,
      variancePercentage,
      status,
      
      // Additional info
      hasOffload: tankData.offloads?.length > 0,
      offloadVolume: tankData.variances?.offloadVolume || 0,
      
      // Raw data for reference
      raw: tankData
    };
  };

  /**
   * Process complete shift reconciliation data
   */
  const processShiftData = (rawData) => {
    if (!rawData) return null;

    // Process each tank
    const processedTanks = (rawData.reconciliation?.tanks || []).map(tank => 
      processTankReconciliation(tank)
    );

    // Calculate shift totals
    const shiftTotals = processedTanks.reduce((acc, tank) => {
      acc.totalOpening += tank.openingVolume;
      acc.totalClosing += tank.closingVolume;
      acc.totalActualDeduction += tank.actualDeduction;
      acc.totalExpectedDeduction += tank.expectedDeduction;
      acc.totalVariance += tank.variance;
      acc.totalOffloadVolume += tank.offloadVolume || 0;
      
      // Count tanks by status
      acc.statusCount[tank.status] = (acc.statusCount[tank.status] || 0) + 1;
      
      return acc;
    }, {
      totalOpening: 0,
      totalClosing: 0,
      totalActualDeduction: 0,
      totalExpectedDeduction: 0,
      totalVariance: 0,
      totalOffloadVolume: 0,
      statusCount: {}
    });

    // Calculate overall variance percentage
    shiftTotals.variancePercentage = shiftTotals.totalActualDeduction !== 0
      ? ((shiftTotals.totalVariance / shiftTotals.totalActualDeduction) * 100).toFixed(2)
      : 0;

    // Determine shift reconciliation status
    let shiftStatus = 'RECONCILED';
    if (Math.abs(shiftTotals.totalVariance) > 100) shiftStatus = 'DISCREPANCY';
    else if (Math.abs(shiftTotals.totalVariance) > 30) shiftStatus = 'PARTIAL';

    return {
      shiftInfo: rawData.shift,
      verification: rawData.verification,
      metadata: rawData.reconciliation?.metadata,
      
      tanks: processedTanks,
      totals: shiftTotals,
      shiftStatus,
      
      raw: rawData
    };
  };

  // ==================== FETCH FUNCTIONS ====================

  const fetchShiftReconciliation = useCallback(async () => {
    if (!selectedShiftId) {
      message.warning('Please enter a shift ID');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      
      const result = await reconciliationService.getShiftReconciliation(
        selectedShiftId,
        {
          includeOffloads: true,
          includePumpDetails: true,
          calculateVariances: true
        },
        forceRefresh
      );
      
      const endTime = performance.now();
      
      console.log("🔍 RAW RECONCILIATION DATA:", result);
      
      // Process the data with our business logic
      const processed = processShiftData(result);
      console.log("✅ PROCESSED RECONCILIATION DATA:", processed);
      
      setData(result);
      setProcessedData(processed);
      
      message.success(`Shift reconciliation fetched in ${(endTime - startTime).toFixed(0)}ms`);
      
      if (!forceRefresh && cacheEnabled) {
        message.info('Data served from cache');
      }
    } catch (err) {
      setError(err.message);
      message.error(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedShiftId, forceRefresh, cacheEnabled]);

  // ==================== RENDER HELPERS ====================

  const getStatusBadge = (status) => {
    const badges = {
      'EXCELLENT': <Badge status="success" text="Excellent" />,
      'GOOD': <Badge status="processing" text="Good" />,
      'ACCEPTABLE': <Badge status="warning" text="Acceptable" />,
      'INVESTIGATE': <Badge status="error" text="Investigate" />,
      'RECONCILED': <Badge status="success" text="Reconciled" />,
      'PARTIAL': <Badge status="warning" text="Partial" />,
      'DISCREPANCY': <Badge status="error" text="Discrepancy" />,
      'OPEN': <Badge status="warning" text="Open" />,
      'CLOSED': <Badge status="processing" text="Closed" />,
      'VERIFIED': <Badge status="success" text="Verified" />
    };
    return badges[status] || <Badge status="default" text={status} />;
  };

  const formatVolume = (volume) => {
    if (volume === null || volume === undefined) return 'N/A';
    return `${volume.toLocaleString()} L`;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `KSh ${amount.toLocaleString()}`;
  };

  // ==================== TABLE COLUMNS ====================

  const tankColumns = [
    {
      title: 'Tank',
      dataIndex: 'tankName',
      key: 'tankName',
      fixed: 'left',
      width: 200,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" size="small">{record.productName}</Text>
        </Space>
      )
    },
    {
      title: 'Opening Volume',
      dataIndex: 'openingVolume',
      key: 'openingVolume',
      align: 'right',
      render: (vol) => (
        <Text strong>{formatVolume(vol)}</Text>
      )
    },
    {
      title: 'Closing Volume',
      dataIndex: 'closingVolume',
      key: 'closingVolume',
      align: 'right',
      render: (vol) => (
        <Text>{formatVolume(vol)}</Text>
      )
    },
    {
      title: 'Actual Deduction',
      dataIndex: 'actualDeduction',
      key: 'actualDeduction',
      align: 'right',
      render: (vol, record) => (
        <Space direction="vertical" size={0}>
          <Text type="danger">{formatVolume(vol)}</Text>
          <Text type="secondary" size="small">
            ({((vol / record.openingVolume) * 100).toFixed(1)}%)
          </Text>
        </Space>
      )
    },
    {
      title: 'Expected Deduction',
      dataIndex: 'expectedDeduction',
      key: 'expectedDeduction',
      align: 'right',
      render: (vol, record) => (
        <Space direction="vertical" size={0}>
          <Text type="success">{formatVolume(vol)}</Text>
          <Text type="secondary" size="small">
            (from {record.pumpDetails?.length || 0} pumps)
          </Text>
        </Space>
      )
    },
    {
      title: 'Variance',
      dataIndex: 'variance',
      key: 'variance',
      align: 'right',
      render: (val, record) => {
        const isPositive = val > 0;
        const color = Math.abs(val) < 10 ? 'green' : Math.abs(val) < 30 ? 'blue' : 'red';
        
        return (
          <Space direction="vertical" size={0}>
            <Text type={color} strong>
              {isPositive ? '+' : ''}{val.toFixed(1)} L
            </Text>
            <Text type="secondary" size="small">
              ({record.variancePercentage}%)
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Formula',
      key: 'formula',
      render: (_, record) => (
        <Tooltip title={`${record.openingVolume} - ${record.closingVolume} = ${record.actualDeduction} (Actual) | Pump total: ${record.expectedDeduction} (Expected)`}>
          <Info size={16} className="text-gray-400" />
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusBadge(status)
    }
  ];

  const pumpColumns = [
    {
      title: 'Pump',
      dataIndex: 'pumpName',
      key: 'pumpName',
    },
    {
      title: 'Start Meter',
      dataIndex: 'startMeter',
      key: 'startMeter',
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'End Meter',
      dataIndex: 'endMeter',
      key: 'endMeter',
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Dispensed',
      dataIndex: 'dispensed',
      key: 'dispensed',
      align: 'right',
      render: (val) => <Text strong>{val.toLocaleString()} L</Text>
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      title: 'Sales',
      dataIndex: 'salesValue',
      key: 'salesValue',
      align: 'right',
      render: (val) => formatCurrency(val)
    }
  ];

  // ==================== RENDER SECTIONS ====================

  const renderShiftReconciliation = () => (
    <div className="space-y-4">
      <Card size="small" className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Input
                placeholder="Enter Shift ID"
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                style={{ width: 400 }}
              />
              <Button 
                type="primary" 
                onClick={fetchShiftReconciliation}
                loading={loading}
                icon={<RefreshCw size={16} />}
              >
                Calculate Reconciliation
              </Button>
              <Button 
                onClick={() => handleExport('csv')}
                loading={exportLoading}
                icon={<Download size={16} />}
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {processedData && (
        <>
          {/* Shift Header */}
          <Card 
            title={
              <Space>
                <Clock size={20} />
                <span>Shift #{processedData.shiftInfo?.shiftNumber}</span>
                {getStatusBadge(processedData.shiftStatus)}
                {getStatusBadge(processedData.shiftInfo?.status)}
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary">{processedData.shiftInfo?.station?.name}</Text>
                <Divider type="vertical" />
                <Text type="secondary">Supervisor: {processedData.shiftInfo?.supervisor?.name}</Text>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic 
                  title="Start Time" 
                  value={new Date(processedData.shiftInfo?.startTime).toLocaleString()}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="End Time" 
                  value={processedData.shiftInfo?.endTime 
                    ? new Date(processedData.shiftInfo.endTime).toLocaleString() 
                    : 'Ongoing'}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Duration" 
                  value={processedData.shiftInfo?.duration || 'N/A'}
                  suffix="hours"
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Total Tanks" 
                  value={processedData.tanks?.length || 0}
                />
              </Col>
            </Row>
          </Card>

          {/* Reconciliation Summary Cards */}
          <Row gutter={16}>
            <Col span={8}>
              <Card className="bg-blue-50">
                <Statistic 
                  title="Total Opening Volume" 
                  value={processedData.totals?.totalOpening || 0}
                  suffix="L"
                  precision={0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="bg-orange-50">
                <Statistic 
                  title="Total Closing Volume" 
                  value={processedData.totals?.totalClosing || 0}
                  suffix="L"
                  precision={0}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="bg-purple-50">
                <Statistic 
                  title="Net Change" 
                  value={processedData.totals?.totalOpening - processedData.totals?.totalClosing || 0}
                  suffix="L"
                  precision={0}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Total Actual Deduction (Dip)"
                  value={processedData.totals?.totalActualDeduction || 0}
                  suffix="L"
                  precision={0}
                  valueStyle={{ color: '#cf1322' }}
                />
                <Text type="secondary">Opening - Closing</Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Total Expected Deduction (Pumps)"
                  value={processedData.totals?.totalExpectedDeduction || 0}
                  suffix="L"
                  precision={0}
                  valueStyle={{ color: '#389e0d' }}
                />
                <Text type="secondary">Sum of all pump sales</Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card className={Math.abs(processedData.totals?.totalVariance) < 30 ? 'bg-green-50' : 'bg-red-50'}>
                <Statistic 
                  title="Total Variance"
                  value={processedData.totals?.totalVariance || 0}
                  suffix="L"
                  precision={1}
                  valueStyle={{ 
                    color: Math.abs(processedData.totals?.totalVariance) < 30 ? '#389e0d' : '#cf1322',
                    fontWeight: 'bold'
                  }}
                />
                <Text>
                  Actual - Expected = {processedData.totals?.totalVariance?.toFixed(1)}L
                  ({processedData.totals?.variancePercentage}%)
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Detailed Formula Explanation */}
          <Card title="Reconciliation Formula" className="bg-gray-50">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space align="start" size="large">
                  <div className="p-3 bg-white rounded shadow-sm">
                    <Text strong>Step 1: Actual Deduction</Text>
                    <div className="mt-2">
                      <Text code>Opening Volume - Closing Volume</Text>
                    </div>
                  </div>
                  
                  <ChevronRight className="mt-3" />
                  
                  <div className="p-3 bg-white rounded shadow-sm">
                    <Text strong>Step 2: Expected Deduction</Text>
                    <div className="mt-2">
                      <Text code>∑(Pump End Meter - Pump Start Meter)</Text>
                    </div>
                  </div>
                  
                  <ChevronRight className="mt-3" />
                  
                  <div className="p-3 bg-white rounded shadow-sm">
                    <Text strong>Step 3: Variance</Text>
                    <div className="mt-2">
                      <Text code>Actual Deduction - Expected Deduction</Text>
                    </div>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Tanks Reconciliation Table */}
          <Card 
            title={
              <Space>
                <Droplets size={20} />
                <span>Tank Reconciliation Details</span>
              </Space>
            }
          >
            <Table 
              columns={tankColumns}
              dataSource={processedData.tanks}
              rowKey="tankId"
              pagination={false}
              scroll={{ x: 1200 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div className="p-3">
                    <Text strong className="block mb-2">Connected Pumps:</Text>
                    {record.pumpDetails?.length > 0 ? (
                      <Table 
                        columns={pumpColumns}
                        dataSource={record.pumpDetails}
                        pagination={false}
                        size="small"
                        rowKey={(r, i) => i}
                      />
                    ) : (
                      <Empty description="No pump data available" />
                    )}
                    
                    {record.hasOffload && (
                      <Alert
                        message="Offload Detected"
                        description={`Offload volume: ${record.offloadVolume}L`}
                        type="info"
                        showIcon
                        className="mt-3"
                      />
                    )}
                  </div>
                ),
                rowExpandable: (record) => record.pumpDetails?.length > 0 || record.hasOffload,
              }}
            />
          </Card>

          {/* Status Summary */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Reconciliation Status">
                <Space direction="vertical" className="w-full">
                  {Object.entries(processedData.totals?.statusCount || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      {getStatusBadge(status)}
                      <Text>{count} tank(s)</Text>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="Verification Status">
                <Space direction="vertical">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className={processedData.verification?.isFullyReconciled ? 'text-green-500' : 'text-gray-300'} />
                    <Text>Fully Reconciled: {processedData.verification?.isFullyReconciled ? 'Yes' : 'No'}</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className={processedData.verification?.missingReadings?.length > 0 ? 'text-yellow-500' : 'text-gray-300'} />
                    <Text>Missing Readings: {processedData.verification?.missingReadings?.length || 0}</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className={processedData.verification?.alerts?.length > 0 ? 'text-red-500' : 'text-gray-300'} />
                    <Text>Alerts: {processedData.verification?.alerts?.length || 0}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );

  // ... (other render functions remain similar but can be simplified for this test)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card 
        title={
          <Space>
            <Shield size={24} />
            <Title level={3} style={{ margin: 0 }}>Reconciliation Test</Title>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Toggle Cache">
              <Button 
                icon={cacheEnabled ? <CheckCircle size={16} /> : <XCircle size={16} />}
                onClick={() => setCacheEnabled(!cacheEnabled)}
                type={cacheEnabled ? 'primary' : 'default'}
              >
                Cache {cacheEnabled ? 'ON' : 'OFF'}
              </Button>
            </Tooltip>
            <Tooltip title="Force Refresh">
              <Button 
                icon={<RefreshCw size={16} />}
                onClick={() => setForceRefresh(!forceRefresh)}
                type={forceRefresh ? 'primary' : 'default'}
                danger={forceRefresh}
              >
                {forceRefresh ? 'Force Refresh ON' : 'Force Refresh OFF'}
              </Button>
            </Tooltip>
            <Button onClick={() => reconciliationService.clearCache()}>
              Clear Cache
            </Button>
          </Space>
        }
      >
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        {renderShiftReconciliation()}

        {loading && (
          <div className="text-center py-8">
            <Spin size="large" />
            <Text className="block mt-2">Calculating reconciliation...</Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReconciliationTest;