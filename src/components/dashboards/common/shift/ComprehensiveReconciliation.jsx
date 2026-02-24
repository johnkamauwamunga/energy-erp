// src/pages/reports/ComprehensiveReconciliation.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Typography,
  Divider,
  Empty,
  Dropdown,
  Alert,
  Spin,
  Progress,
  Timeline,
  List,
  Avatar,
  Tabs
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FireOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  DiffOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  MinusOutlined,
  AlertOutlined,
  TruckOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { reconciliationService } from '../../../../services/reconcilliationService/reconcilliationService';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const ComprehensiveReconciliation = () => {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [shiftsData, setShiftsData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [expandedShift, setExpandedShift] = useState(null);
  
  // Modal states
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTank, setViewingTank] = useState(null);
  const [offloadModalVisible, setOffloadModalVisible] = useState(false);
  const [viewingOffloads, setViewingOffloads] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    period: 'week',
    fromDate: dayjs().subtract(7, 'days').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    status: 'ALL',
    stationId: null,
    search: '',
    productFilter: 'all',
    statusFilter: 'all',
    showOnlyIssues: false,
    limit: 100,
    offset: 0
  });
  
  // Summary stats
  const [stats, setStats] = useState({
    totalShifts: 0,
    totalTanks: 0,
    totalPumps: 0,
    totalOpening: 0,
    totalAddition: 0,
    totalVolume: 0,
    totalSales: 0,
    totalVariance: 0,
    totalOffloads: 0,
    totalOffloadVolume: 0,
    tanksToInvestigate: 0,
    reconciliationRate: 0
  });

  // ==================== YOUR CORE LOGIC - EXACTLY FROM RECONCILIATION READINGS ====================

  /**
   * Process tank reconciliation data - IDENTICAL to ReconciliationReadings
   */
  const processTankReconciliation = (tankData, shiftInfo) => {
    if (!tankData) return null;

    // Get opening and closing volumes from tank dip readings
    const openingReading = tankData.readings?.start;
    const closingReading = tankData.readings?.end;
    
    const openingVolume = openingReading?.volume || 0;
    const closingVolume = closingReading?.volume || 0;
    
    // Addition = OFFLOAD_AFTER - OFFLOAD_BEFORE (or 0 if no offload)
    let addition = 0;
    let offloadDetails = [];
    
    if (tankData.offloads && tankData.offloads.length > 0) {
      addition = tankData.offloads.reduce((sum, offload) => sum + (offload.actualVolume || 0), 0);
      
      // Capture offload details for display
      offloadDetails = tankData.offloads.map(offload => ({
        id: offload.id,
        actualVolume: offload.actualVolume || 0,
        expectedVolume: offload.expectedVolume || 0,
        receivingNumber: offload.receivingNumber || 'N/A',
        supplierInvoice: offload.supplierInvoiceNumber || 'N/A',
        deliveryCompany: offload.deliveryCompany || 'N/A',
        driverName: offload.driverName || 'N/A',
        dipBefore: offload.dipBeforeVolume || 0,
        dipAfter: offload.dipAfterVolume || 0,
        temperature: offload.temperature,
        density: offload.density,
        status: offload.status,
        createdAt: offload.createdAt,
        createdBy: offload.createdBy?.name
      }));
    }
    
    // Total = Opening + Addition
    const totalVolume = openingVolume + addition;
    
    // Calculate expected deduction from connected pumps
    let expectedDeduction = 0;
    let totalSalesValue = 0;
    const pumpDetails = [];

    if (tankData.pumps && tankData.pumps.length > 0) {
      tankData.pumps.forEach(pump => {
        const pumpStart = pump.readings?.start?.electricMeter || 0;
        const pumpEnd = pump.readings?.end?.electricMeter || 0;
        const pumpDispensed = pumpEnd - pumpStart;
        
        expectedDeduction += pumpDispensed;
        
        const salesValue = pump.readings?.end?.salesValue || 0;
        totalSalesValue += salesValue;
        
        pumpDetails.push({
          pumpName: pump.pump?.name || 'Unknown Pump',
          pumpId: pump.pump?.id,
          startMeter: pumpStart,
          endMeter: pumpEnd,
          dispensed: pumpDispensed,
          unitPrice: pump.readings?.end?.unitPrice || pump.readings?.start?.unitPrice || 0,
          salesValue: salesValue,
          startReading: pump.readings?.start,
          endReading: pump.readings?.end
        });
      });
    }

    // Expected Closing = Total - Sales
    const expectedClosing = totalVolume - expectedDeduction;
    
    // Variance = Dip Closing - Expected Closing
    const variance = closingVolume - expectedClosing;
    const absVariance = Math.abs(variance);
    
    // Determine reconciliation status based on variance
    let status = 'EXCELLENT';
    let statusColor = 'success';
    let statusIcon = <CheckCircleOutlined />;
    
    if (absVariance > 100) {
      status = 'INVESTIGATE';
      statusColor = 'error';
      statusIcon = <WarningOutlined />;
    } else if (absVariance > 30) {
      status = 'ACCEPTABLE';
      statusColor = 'warning';
      statusIcon = <InfoCircleOutlined />;
    } else if (absVariance > 10) {
      status = 'GOOD';
      statusColor = 'processing';
      statusIcon = <CheckCircleOutlined />;
    }

    // Calculate variance percentage for context
    const variancePercentage = expectedClosing > 0 
      ? (absVariance / expectedClosing * 100).toFixed(1) 
      : 0;

    return {
      // Shift info for grouping
      shiftId: shiftInfo?.id,
      shiftNumber: shiftInfo?.shiftNumber,
      shiftStartTime: shiftInfo?.startTime,
      shiftEndTime: shiftInfo?.endTime,
      stationName: shiftInfo?.station?.name,
      stationId: shiftInfo?.station?.id,
      supervisor: shiftInfo?.supervisor?.name,
      
      // Tank info
      tankId: tankData.tank?.id,
      tankName: tankData.tank?.name,
      stationLabel: tankData.tank?.stationLabel,
      productName: tankData.tank?.product?.name || 'Unknown',
      productColor: tankData.tank?.product?.colorCode || '#1890ff',
      capacity: tankData.tank?.capacity,
      
      // Volume readings - YOUR FORMULA
      openingVolume,                    // START reading
      addition,                          // OFFLOAD_AFTER - OFFLOAD_BEFORE (or 0)
      totalVolume,                       // Opening + Addition
      expectedClosing,                   // Total - Sales
      closingVolume,                     // END reading
      expectedDeduction,                  // Sales from pumps
      
      // Variance
      variance,
      absVariance,
      variancePercentage,
      
      status,
      statusColor,
      statusIcon,
      
      // Additional info
      hasOffload: tankData.offloads?.length > 0,
      offloadVolume: addition,
      offloadCount: tankData.offloads?.length || 0,
      offloadDetails,
      
      // Pump info
      pumpDetails,
      pumpCount: pumpDetails.length,
      totalSalesValue,
      
      // Verification status
      hasCompleteReadings: tankData.reconciliation?.hasCompleteReadings || false,
      reconciliationStatus: tankData.reconciliation?.status,
      
      // Raw data for reference
      raw: tankData
    };
  };

  /**
   * Process all shifts data - aggregates all tanks from all shifts
   */
  const processAllShiftsData = (rawData) => {
    if (!rawData?.shifts) return { tanks: [], shifts: [] };

    const allTanks = [];
    const shiftSummaries = [];

    // Process each shift
    rawData.shifts.forEach(shift => {
      const shiftInfo = shift.shift;
      const tanks = shift.reconciliation?.tanks || [];
      
      // Process each tank in this shift
      tanks.forEach(tank => {
        const processedTank = processTankReconciliation(tank, shiftInfo);
        if (processedTank) {
          allTanks.push(processedTank);
        }
      });

      // Create shift summary
      const shiftTotals = tanks.reduce((acc, tank) => {
        const processed = processTankReconciliation(tank, shiftInfo);
        if (processed) {
          acc.totalOpening += processed.openingVolume;
          acc.totalAddition += processed.addition;
          acc.totalVolume += processed.totalVolume;
          acc.totalSales += processed.expectedDeduction;
          acc.totalVariance += processed.variance;
          acc.totalAbsVariance += processed.absVariance;
          acc.totalOffloadVolume += processed.offloadVolume || 0;
          acc.totalOffloadCount += processed.offloadCount || 0;
          acc.totalPumps += processed.pumpCount;
          acc.tankCount++;
          if (processed.status === 'INVESTIGATE') acc.tanksToInvestigate++;
        }
        return acc;
      }, {
        totalOpening: 0,
        totalAddition: 0,
        totalVolume: 0,
        totalSales: 0,
        totalVariance: 0,
        totalAbsVariance: 0,
        totalOffloadVolume: 0,
        totalOffloadCount: 0,
        totalPumps: 0,
        tankCount: 0,
        tanksToInvestigate: 0
      });

      shiftSummaries.push({
        shiftId: shiftInfo?.id,
        shiftNumber: shiftInfo?.shiftNumber,
        stationName: shiftInfo?.station?.name,
        startTime: shiftInfo?.startTime,
        endTime: shiftInfo?.endTime,
        status: shiftInfo?.status,
        supervisor: shiftInfo?.supervisor?.name,
        ...shiftTotals,
        reconciliationRate: shiftTotals.tankCount > 0 
          ? ((shiftTotals.tankCount - shiftTotals.tanksToInvestigate) / shiftTotals.tankCount * 100).toFixed(1)
          : 0
      });
    });

    // Calculate overall statistics
    const overallStats = allTanks.reduce((acc, tank) => {
      acc.totalOpening += tank.openingVolume;
      acc.totalAddition += tank.addition;
      acc.totalVolume += tank.totalVolume;
      acc.totalSales += tank.expectedDeduction;
      acc.totalVariance += tank.variance;
      acc.totalAbsVariance += tank.absVariance;
      acc.totalOffloadVolume += tank.offloadVolume || 0;
      acc.totalOffloadCount += tank.offloadCount || 0;
      acc.totalPumps += tank.pumpCount;
      acc.tankCount++;
      if (tank.status === 'INVESTIGATE') acc.tanksToInvestigate++;
      return acc;
    }, {
      totalOpening: 0,
      totalAddition: 0,
      totalVolume: 0,
      totalSales: 0,
      totalVariance: 0,
      totalAbsVariance: 0,
      totalOffloadVolume: 0,
      totalOffloadCount: 0,
      totalPumps: 0,
      tankCount: 0,
      tanksToInvestigate: 0
    });

    setStats({
      totalShifts: rawData.shifts.length,
      totalTanks: overallStats.tankCount,
      totalPumps: overallStats.totalPumps,
      totalOpening: overallStats.totalOpening,
      totalAddition: overallStats.totalAddition,
      totalVolume: overallStats.totalVolume,
      totalSales: overallStats.totalSales,
      totalVariance: overallStats.totalVariance,
      totalAbsVariance: overallStats.totalAbsVariance,
      totalOffloads: overallStats.totalOffloadCount,
      totalOffloadVolume: overallStats.totalOffloadVolume,
      tanksToInvestigate: overallStats.tanksToInvestigate,
      reconciliationRate: overallStats.tankCount > 0
        ? ((overallStats.tankCount - overallStats.tanksToInvestigate) / overallStats.tankCount * 100).toFixed(1)
        : 0
    });

    return {
      tanks: allTanks,
      shifts: shiftSummaries,
      raw: rawData
    };
  };

  // ==================== FETCH FUNCTIONS ====================

  const fetchComprehensiveData = async (resetOffset = true) => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        offset: resetOffset ? 0 : filters.offset,
        includeDetails: true
      };
      
      console.log("🔍 Fetching comprehensive reconciliation:", params);
      
      const response = await reconciliationService.getShiftsByDateRange(params);
      
      console.log("✅ Comprehensive data received:", response);
      
      setShiftsData(response);
      
      // Process all tanks from all shifts
      const processed = processAllShiftsData(response);
      setProcessedData(processed);
      
      message.success(`Loaded ${response?.shifts?.length || 0} shifts with ${processed.tanks.length} tanks`);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      message.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComprehensiveData();
  }, [filters.period, filters.fromDate, filters.toDate, filters.status]);

  // ==================== HANDLERS ====================

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        period: 'custom',
        fromDate: dates[0].format('YYYY-MM-DD'),
        toDate: dates[1].format('YYYY-MM-DD')
      }));
    }
  };

  const handlePeriodChange = (period) => {
    const now = dayjs();
    let fromDate, toDate;
    
    switch(period) {
      case 'today':
        fromDate = now.format('YYYY-MM-DD');
        toDate = now.format('YYYY-MM-DD');
        break;
      case 'yesterday':
        fromDate = now.subtract(1, 'day').format('YYYY-MM-DD');
        toDate = now.subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'week':
        fromDate = now.subtract(7, 'days').format('YYYY-MM-DD');
        toDate = now.format('YYYY-MM-DD');
        break;
      case 'month':
        fromDate = now.subtract(30, 'days').format('YYYY-MM-DD');
        toDate = now.format('YYYY-MM-DD');
        break;
      case 'quarter':
        fromDate = now.subtract(90, 'days').format('YYYY-MM-DD');
        toDate = now.format('YYYY-MM-DD');
        break;
      case 'year':
        fromDate = now.subtract(365, 'days').format('YYYY-MM-DD');
        toDate = now.format('YYYY-MM-DD');
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      period,
      fromDate,
      toDate,
      offset: 0
    }));
  };

  // Format functions - IDENTICAL to ReconciliationReadings
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'KES 0.00';
    return `KES ${parseFloat(amount).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatVolume = (liters) => {
    if (liters === undefined || liters === null) return '0.00 L';
    const absLiters = Math.abs(liters);
    return `${absLiters.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} L`;
  };

  const formatVariance = (variance) => {
    if (variance === undefined || variance === null) return '0.00 L';
    const sign = variance > 0 ? '+' : '';
    return `${sign}${variance.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} L`;
  };

  // Filtered tank data
  const filteredTankData = useMemo(() => {
    if (!processedData?.tanks) return [];
    
    let data = [...processedData.tanks];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(tank =>
        tank.tankName?.toLowerCase().includes(searchLower) ||
        tank.productName?.toLowerCase().includes(searchLower) ||
        tank.shiftNumber?.toLowerCase().includes(searchLower) ||
        tank.stationName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Product filter
    if (filters.productFilter !== 'all') {
      data = data.filter(tank =>
        tank.productName === filters.productFilter
      );
    }
    
    // Status filter
    if (filters.statusFilter !== 'all') {
      data = data.filter(tank =>
        tank.status === filters.statusFilter
      );
    }
    
    // Show only issues filter
    if (filters.showOnlyIssues) {
      data = data.filter(tank => 
        tank.status === 'INVESTIGATE' || tank.absVariance > 30
      );
    }
    
    return data;
  }, [processedData, filters]);

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    if (!processedData?.tanks) return [];
    return [...new Set(processedData.tanks.map(t => t.productName))];
  }, [processedData]);

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    if (!processedData?.tanks) return [];
    return [...new Set(processedData.tanks.map(t => t.status))];
  }, [processedData]);

  // ==================== TABLE COLUMNS - EXACTLY FROM RECONCILIATION READINGS ====================

  const tankColumns = [
    {
      title: 'Shift',
      key: 'shift',
      width: 120,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            <Tag color="blue">#{record.shiftNumber}</Tag>
          </div>
          <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.2' }}>
            {record.stationName || ''}
          </div>
          <div style={{ fontSize: '9px', color: '#999' }}>
            {dayjs(record.shiftStartTime).format('DD/MM HH:mm')}
          </div>
        </div>
      )
    },
    {
      title: 'Tank',
      key: 'tankName',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            <FireOutlined style={{ fontSize: '9px', marginRight: '3px', color: '#ff4d4f' }} />
            {record.tankName || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.2' }}>
            {record.stationLabel || ''}
          </div>
        </div>
      )
    },
    {
      title: 'Product',
      key: 'product',
      width: 100,
      render: (_, record) => {
        return (
          <div>
            <div style={{ fontWeight: '500', fontSize: '11px', lineHeight: '1.2' }}>
              <Tag color={record.productColor} style={{ 
                marginRight: '3px', 
                fontSize: '7px', 
                padding: '0 3px',
                lineHeight: '1.2'
              }}>
                ●
              </Tag>
              {record.productName || 'N/A'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Opening',
      dataIndex: 'openingVolume',
      key: 'openingVolume',
      width: 80,
      align: 'right',
      render: (vol) => (
        <Tooltip title="START reading">
          <div style={{ fontSize: '11px', fontWeight: '500' }}>
            {vol.toLocaleString()} L
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Addition',
      dataIndex: 'addition',
      key: 'addition',
      width: 80,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={record.hasOffload ? `Offload: ${formatVolume(vol)}` : 'No offload'}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: vol > 0 ? '#52c41a' : '#999',
            cursor: record.hasOffload ? 'pointer' : 'default'
          }}
          onClick={record.hasOffload ? (e) => {
            e.stopPropagation();
            setViewingOffloads(record.offloadDetails);
            setOffloadModalVisible(true);
          } : undefined}>
            {vol > 0 ? `+${vol.toLocaleString()} L` : '0 L'}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Total',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      width: 80,
      align: 'right',
      render: (vol) => (
        <Tooltip title="Opening + Addition">
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#722ed1' }}>
            {vol.toLocaleString()} L
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Sales',
      dataIndex: 'expectedDeduction',
      key: 'expectedDeduction',
      width: 100,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={`From ${record.pumpCount} connected pump(s) • ${formatCurrency(record.totalSalesValue)}`}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#389e0d' }}>
            {vol.toLocaleString()} L
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Expected Closing',
      key: 'expectedClosing',
      width: 100,
      align: 'right',
      render: (_, record) => {
        return (
          <Tooltip title="Total - Sales">
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
              {record.expectedClosing.toLocaleString()} L
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Dip Closing',
      dataIndex: 'closingVolume',
      key: 'closingVolume',
      width: 80,
      align: 'right',
      render: (vol) => (
        <Tooltip title="END reading">
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#cf1322' }}>
            {vol.toLocaleString()} L
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Variance',
      key: 'variance',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const color = record.absVariance < 10 ? '#389e0d' : 
                     record.absVariance < 30 ? '#1890ff' : 
                     record.absVariance < 100 ? '#fa8c16' : '#cf1322';
        const sign = record.variance > 0 ? '+' : '';
        
        return (
          <Tooltip title={`${record.variancePercentage}% of expected closing`}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '700', 
              color,
              background: record.absVariance > 100 ? '#fff2f0' : 'transparent',
              padding: '2px 4px',
              borderRadius: '4px'
            }}>
              {sign}{record.variance.toFixed(1)} L
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 90,
      render: (_, record) => (
        <Badge 
          status={record.statusColor} 
          text={record.status} 
          style={{ fontSize: '10px' }}
        />
      )
    },
    {
      title: 'Pumps',
      key: 'pumpCount',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Tag color="blue">{record.pumpCount}</Tag>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              type="text"
              style={{ fontSize: '12px' }}
              onClick={() => {
                setViewingTank(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>
          {record.hasOffload && (
            <Tooltip title="View Offload Details">
              <Button 
                icon={<TruckOutlined />} 
                size="small"
                type="text"
                style={{ fontSize: '12px', color: '#52c41a' }}
                onClick={() => {
                  setViewingOffloads(record.offloadDetails);
                  setOffloadModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const pumpDetailColumns = [
    {
      title: 'Pump',
      dataIndex: 'pumpName',
      key: 'pumpName',
      width: 120,
    },
    {
      title: 'Start Meter',
      dataIndex: 'startMeter',
      key: 'startMeter',
      width: 90,
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'End Meter',
      dataIndex: 'endMeter',
      key: 'endMeter',
      width: 90,
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Dispensed',
      dataIndex: 'dispensed',
      key: 'dispensed',
      width: 90,
      align: 'right',
      render: (val) => <Text strong>{val.toLocaleString()} L</Text>
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 90,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      title: 'Sales',
      dataIndex: 'salesValue',
      key: 'salesValue',
      width: 100,
      align: 'right',
      render: (val) => formatCurrency(val)
    }
  ];

  const offloadColumns = [
    {
      title: 'Receiving #',
      dataIndex: 'receivingNumber',
      key: 'receivingNumber',
      width: 120,
    },
    {
      title: 'Supplier Invoice',
      dataIndex: 'supplierInvoice',
      key: 'supplierInvoice',
      width: 120,
    },
    {
      title: 'Delivery Company',
      dataIndex: 'deliveryCompany',
      key: 'deliveryCompany',
      width: 150,
    },
    {
      title: 'Driver',
      dataIndex: 'driverName',
      key: 'driverName',
      width: 120,
    },
    {
      title: 'Dip Before',
      dataIndex: 'dipBefore',
      key: 'dipBefore',
      width: 90,
      align: 'right',
      render: (val) => val.toLocaleString() + ' L'
    },
    {
      title: 'Dip After',
      dataIndex: 'dipAfter',
      key: 'dipAfter',
      width: 90,
      align: 'right',
      render: (val) => val.toLocaleString() + ' L'
    },
    {
      title: 'Actual Volume',
      dataIndex: 'actualVolume',
      key: 'actualVolume',
      width: 100,
      align: 'right',
      render: (val) => <Text strong>{val.toLocaleString()} L</Text>
    },
    {
      title: 'Expected Volume',
      dataIndex: 'expectedVolume',
      key: 'expectedVolume',
      width: 100,
      align: 'right',
      render: (val) => val.toLocaleString() + ' L'
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 90,
      align: 'right',
      render: (val) => val ? val + '°C' : 'N/A'
    },
    {
      title: 'Density',
      dataIndex: 'density',
      key: 'density',
      width: 80,
      align: 'right',
      render: (val) => val || 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'COMPLETED' ? 'green' : status === 'PENDING' ? 'orange' : 'blue'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 120,
    }
  ];

  // ==================== PDF GENERATION ====================

  const generatePDF = () => {
    if (!filteredTankData.length) {
      message.warning('No data to generate PDF');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const fromDate = dayjs(filters.fromDate).format('DD/MM/YYYY');
      const toDate = dayjs(filters.toDate).format('DD/MM/YYYY');

      // Title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Comprehensive Reconciliation Report`, pageWidth / 2, 15, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${fromDate} - ${toDate}`, pageWidth / 2, 22, { align: 'center' });

      // Summary Statistics
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      let yPos = 30;
      
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
      doc.text(`Total Shifts: ${stats.totalShifts}`, 140, yPos);
      
      yPos = 40;
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, pageWidth - 28, 30, 'F');
      
      doc.setFontSize(9);
      doc.text('Total Opening:', 20, yPos + 5);
      doc.text(`${stats.totalOpening.toLocaleString()} L`, 45, yPos + 5);
      
      doc.text('Total Addition:', 80, yPos + 5);
      doc.text(`${stats.totalAddition.toLocaleString()} L`, 105, yPos + 5);
      
      doc.text('Total Volume:', 140, yPos + 5);
      doc.text(`${stats.totalVolume.toLocaleString()} L`, 165, yPos + 5);
      
      doc.text('Total Sales:', 200, yPos + 5);
      doc.text(`${stats.totalSales.toLocaleString()} L`, 225, yPos + 5);
      
      doc.text('Total Variance:', 20, yPos + 13);
      const varianceColor = stats.totalAbsVariance < 30 ? [0,128,0] : 
                           stats.totalAbsVariance < 100 ? [250,140,22] : [255,0,0];
      doc.setTextColor(varianceColor[0], varianceColor[1], varianceColor[2]);
      const varianceSign = stats.totalVariance > 0 ? '+' : '';
      doc.text(`${varianceSign}${stats.totalVariance.toFixed(1)} L`, 45, yPos + 13);
      
      doc.setTextColor(0, 0, 0);
      doc.text('Offloads:', 80, yPos + 13);
      doc.text(`${stats.totalOffloads} (${stats.totalOffloadVolume.toLocaleString()} L)`, 105, yPos + 13);
      
      doc.text('Reconciliation Rate:', 140, yPos + 13);
      doc.text(`${stats.reconciliationRate}%`, 185, yPos + 13);
      
      doc.text('Tanks to Investigate:', 200, yPos + 13);
      doc.setTextColor(stats.tanksToInvestigate > 0 ? 255 : 0, 
                       stats.tanksToInvestigate > 0 ? 0 : 128, 0);
      doc.text(`${stats.tanksToInvestigate}`, 250, yPos + 13);

      // Tanks Table
      yPos = 75;
      const tableData = filteredTankData.map((tank) => [
        tank.shiftNumber || '',
        tank.tankName || '',
        tank.productName || '',
        tank.openingVolume.toLocaleString(),
        tank.addition > 0 ? `+${tank.addition.toLocaleString()}` : '0',
        tank.totalVolume.toLocaleString(),
        tank.expectedDeduction.toLocaleString(),
        tank.expectedClosing.toLocaleString(),
        tank.closingVolume.toLocaleString(),
        `${tank.variance > 0 ? '+' : ''}${tank.variance.toFixed(1)} L`,
        tank.status,
        tank.pumpCount.toString(),
        tank.hasOffload ? 'Yes' : 'No'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Shift', 'Tank', 'Product', 'Opening', 'Add', 'Total', 'Sales', 'Expected', 'Dip', 'Variance', 'Status', 'Pumps', 'Offload']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontSize: 7 },
        bodyStyles: { fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 22 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15, halign: 'right' },
          4: { cellWidth: 15, halign: 'right' },
          5: { cellWidth: 15, halign: 'right' },
          6: { cellWidth: 15, halign: 'right' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 15, halign: 'right' },
          9: { cellWidth: 18, halign: 'right' },
          10: { cellWidth: 18 },
          11: { cellWidth: 10, halign: 'center' },
          12: { cellWidth: 10, halign: 'center' }
        }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated from Lynx Energy System | ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`comprehensive_reconciliation_${filters.fromDate}_to_${filters.toDate}.pdf`);
      message.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error('Failed to generate PDF');
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!filteredTankData.length) {
      message.warning('No data to export');
      return;
    }

    try {
      const headers = [
        'Shift Number', 'Station', 'Date', 'Supervisor', 'Tank', 'Product',
        'Opening (L)', 'Addition (L)', 'Total (L)', 'Sales (L)',
        'Expected Closing (L)', 'Dip Closing (L)', 'Variance (L)',
        'Variance %', 'Status', 'Pumps', 'Offload Count', 'Offload Volume (L)',
        'Sales Value (KES)'
      ];

      const csvData = filteredTankData.map(tank => [
        tank.shiftNumber,
        tank.stationName,
        dayjs(tank.shiftStartTime).format('DD/MM/YYYY HH:mm'),
        tank.supervisor || 'N/A',
        tank.tankName,
        tank.productName,
        tank.openingVolume.toFixed(2),
        tank.addition.toFixed(2),
        tank.totalVolume.toFixed(2),
        tank.expectedDeduction.toFixed(2),
        tank.expectedClosing.toFixed(2),
        tank.closingVolume.toFixed(2),
        tank.variance.toFixed(2),
        tank.variancePercentage,
        tank.status,
        tank.pumpCount,
        tank.offloadCount,
        tank.offloadVolume.toFixed(2),
        tank.totalSalesValue.toFixed(2)
      ]);

      // Add headers at the beginning
      csvData.unshift(headers);

      // Convert to CSV string
      const csvString = csvData.map(row => 
        row.map(cell => {
          // Escape commas and quotes
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ).join('\n');

      // Create download link
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `comprehensive_reconciliation_${filters.fromDate}_to_${filters.toDate}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('CSV exported successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      message.error('Failed to export CSV');
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderSummaryStats = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Card size="small" bordered={false} style={{ background: '#f0f5ff' }}>
          <Statistic
            title="Total Shifts"
            value={stats.totalShifts}
            prefix={<CalendarOutlined />}
            valueStyle={{ color: '#1890ff', fontSize: '20px' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Card size="small" bordered={false} style={{ background: '#f6ffed' }}>
          <Statistic
            title="Total Tanks"
            value={stats.totalTanks}
            prefix={<FireOutlined />}
            valueStyle={{ color: '#52c41a', fontSize: '20px' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Card size="small" bordered={false} style={{ background: '#fff7e6' }}>
          <Statistic
            title="Total Volume"
            value={stats.totalVolume}
            precision={0}
            suffix="L"
            prefix={<CalculatorOutlined />}
            valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Card size="small" bordered={false} style={{ background: '#f9f0ff' }}>
          <Statistic
            title="Total Sales"
            value={stats.totalSales}
            precision={0}
            suffix="L"
            prefix={<BarChartOutlined />}
            valueStyle={{ color: '#722ed1', fontSize: '20px' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Card size="small" bordered={false} style={{ background: stats.tanksToInvestigate > 0 ? '#fff2f0' : '#f6ffed' }}>
          <Statistic
            title="To Investigate"
            value={stats.tanksToInvestigate}
            prefix={<AlertOutlined />}
            valueStyle={{ color: stats.tanksToInvestigate > 0 ? '#cf1322' : '#52c41a', fontSize: '20px' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6} lg={4}>
        <Card size="small" bordered={false} style={{ background: '#e6f7ff' }}>
          <Statistic
            title="Reconciliation Rate"
            value={stats.reconciliationRate}
            precision={1}
            suffix="%"
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#1890ff', fontSize: '20px' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={24} md={6} lg={8}>
          <Space>
            <Select 
              value={filters.period} 
              onChange={handlePeriodChange}
              style={{ width: 100 }}
              size="middle"
            >
              <Option value="today">Today</Option>
              <Option value="yesterday">Yesterday</Option>
              <Option value="week">Last 7 days</Option>
              <Option value="month">Last 30 days</Option>
              <Option value="quarter">Last 90 days</Option>
              <Option value="year">Last year</Option>
            </Select>
            <RangePicker 
              onChange={handleDateRangeChange}
              value={[dayjs(filters.fromDate), dayjs(filters.toDate)]}
              format="YYYY-MM-DD"
              size="middle"
              style={{ width: 220 }}
              allowClear={false}
            />
          </Space>
        </Col>
        
        <Col xs={24} sm={12} md={6} lg={4}>
          <Input
            placeholder="Search tanks/products"
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            size="middle"
            allowClear
          />
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={3}>
          <Select
            placeholder="Product"
            value={filters.productFilter}
            onChange={(val) => setFilters(prev => ({ ...prev, productFilter: val }))}
            style={{ width: '100%' }}
            size="middle"
            allowClear={false}
          >
            <Option value="all">All Products</Option>
            {uniqueProducts.map(product => (
              <Option key={product} value={product}>{product}</Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={3}>
          <Select
            placeholder="Status"
            value={filters.statusFilter}
            onChange={(val) => setFilters(prev => ({ ...prev, statusFilter: val }))}
            style={{ width: '100%' }}
            size="middle"
            allowClear={false}
          >
            <Option value="all">All Status</Option>
            {uniqueStatuses.map(status => (
              <Option key={status} value={status}>{status}</Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={3}>
          <Button 
            type={filters.showOnlyIssues ? "primary" : "default"}
            danger={filters.showOnlyIssues}
            icon={<WarningOutlined />}
            onClick={() => setFilters(prev => ({ ...prev, showOnlyIssues: !prev.showOnlyIssues }))}
            size="middle"
          >
            Issues Only
          </Button>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={3}>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => fetchComprehensiveData()}
              size="middle"
            >
              Refresh
            </Button>
            <Dropdown 
              menu={{
                items: [
                  {
                    key: 'pdf',
                    icon: <FileTextOutlined />,
                    label: 'Export as PDF',
                    onClick: generatePDF
                  },
                  {
                    key: 'csv',
                    icon: <DownloadOutlined />,
                    label: 'Export as CSV',
                    onClick: exportCSV
                  }
                ]
              }}
              placement="bottomRight"
            >
              <Button icon={<ExportOutlined />} size="middle">
                Export
              </Button>
            </Dropdown>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderTankDetailModal = () => (
    <Modal
      title={
        <Space>
          <FireOutlined style={{ color: '#ff4d4f' }} />
          <span>Tank Details: {viewingTank?.tankName}</span>
          <Tag color={viewingTank?.productColor}>{viewingTank?.productName}</Tag>
          <Badge status={viewingTank?.statusColor} text={viewingTank?.status} />
        </Space>
      }
      open={viewModalVisible}
      onCancel={() => setViewModalVisible(false)}
      width={1000}
      footer={[
        <Button key="close" onClick={() => setViewModalVisible(false)}>
          Close
        </Button>
      ]}
    >
      {viewingTank && (
        <div>
          {/* Shift Info */}
          <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">Shift:</Text>
                <div><Text strong>#{viewingTank.shiftNumber}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Station:</Text>
                <div><Text strong>{viewingTank.stationName}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Supervisor:</Text>
                <div><Text strong>{viewingTank.supervisor || 'N/A'}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Start Time:</Text>
                <div><Text>{formatDate(viewingTank.shiftStartTime)}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">End Time:</Text>
                <div><Text>{formatDate(viewingTank.shiftEndTime)}</Text></div>
              </Col>
            </Row>
          </Card>

          {/* Reconciliation Summary */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small" style={{ background: '#e6f7ff' }}>
                <Statistic 
                  title="Opening Volume" 
                  value={viewingTank.openingVolume} 
                  suffix="L"
                  valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#f6ffed' }}>
                <Statistic 
                  title="Addition" 
                  value={viewingTank.addition} 
                  suffix="L"
                  valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#fff7e6' }}>
                <Statistic 
                  title="Sales" 
                  value={viewingTank.expectedDeduction} 
                  suffix="L"
                  valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#f9f0ff' }}>
                <Statistic 
                  title="Closing Volume" 
                  value={viewingTank.closingVolume} 
                  suffix="L"
                  valueStyle={{ color: '#722ed1', fontSize: '18px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Variance Breakdown */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>Reconciliation Breakdown</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">Opening Volume:</Text>
                <div><Text strong>{formatVolume(viewingTank.openingVolume)}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">+ Addition:</Text>
                <div><Text strong type="success">{viewingTank.addition > 0 ? `+${formatVolume(viewingTank.addition)}` : '0 L'}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">= Total Volume:</Text>
                <div><Text strong style={{ color: '#722ed1' }}>{formatVolume(viewingTank.totalVolume)}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">- Sales:</Text>
                <div><Text strong type="danger">{formatVolume(viewingTank.expectedDeduction)}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">= Expected Closing:</Text>
                <div><Text strong style={{ color: '#1890ff' }}>{formatVolume(viewingTank.expectedClosing)}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">vs Dip Closing:</Text>
                <div><Text strong style={{ color: '#cf1322' }}>{formatVolume(viewingTank.closingVolume)}</Text></div>
              </Col>
              <Col span={24}>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary">Variance:</Text>
                <div>
                  <Text strong style={{ 
                    color: viewingTank.absVariance < 10 ? '#52c41a' : 
                           viewingTank.absVariance < 30 ? '#1890ff' : 
                           viewingTank.absVariance < 100 ? '#fa8c16' : '#cf1322',
                    fontSize: '20px'
                  }}>
                    {formatVariance(viewingTank.variance)}
                  </Text>
                  <Text type="secondary"> ({viewingTank.variancePercentage}% of expected)</Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Pumps Details */}
          {viewingTank.pumpDetails.length > 0 && (
            <Card size="small" title={`Connected Pumps (${viewingTank.pumpDetails.length})`}>
              <Table 
                columns={pumpDetailColumns}
                dataSource={viewingTank.pumpDetails}
                rowKey="pumpId"
                size="small"
                pagination={false}
                scroll={{ x: 600 }}
              />
            </Card>
          )}
        </div>
      )}
    </Modal>
  );

  const renderOffloadModal = () => (
    <Modal
      title={
        <Space>
          <TruckOutlined style={{ color: '#52c41a' }} />
          <span>Offload Details</span>
        </Space>
      }
      open={offloadModalVisible}
      onCancel={() => setOffloadModalVisible(false)}
      width={1200}
      footer={[
        <Button key="close" onClick={() => setOffloadModalVisible(false)}>
          Close
        </Button>
      ]}
    >
      <Table 
        columns={offloadColumns}
        dataSource={viewingOffloads}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 1500 }}
      />
    </Modal>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          <DiffOutlined style={{ marginRight: 8 }} />
          Comprehensive Reconciliation
        </Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {/* Summary Stats */}
      {renderSummaryStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Main Table */}
      <Card 
        size="small"
        title={
          <Space>
            <FileTextOutlined />
            <span>Tank Reconciliation Details</span>
            <Tag color="blue">{filteredTankData.length} records</Tag>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">
              Showing {filteredTankData.length} of {processedData?.tanks?.length || 0} tanks
            </Text>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading reconciliation data...</div>
          </div>
        ) : filteredTankData.length === 0 ? (
          <Empty description="No reconciliation data found for selected period" />
        ) : (
          <Table 
            columns={tankColumns}
            dataSource={filteredTankData}
            rowKey={(record) => `${record.shiftId}-${record.tankId}`}
            size="small"
            scroll={{ x: 1500 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} tanks`
            }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Totals:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{filteredTankData.reduce((sum, t) => sum + t.openingVolume, 0).toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong type="success">+{filteredTankData.reduce((sum, t) => sum + t.addition, 0).toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong style={{ color: '#722ed1' }}>{filteredTankData.reduce((sum, t) => sum + t.totalVolume, 0).toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <Text strong>{filteredTankData.reduce((sum, t) => sum + t.expectedDeduction, 0).toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <Text strong style={{ color: '#1890ff' }}>{filteredTankData.reduce((sum, t) => sum + t.expectedClosing, 0).toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    <Text strong style={{ color: '#cf1322' }}>{filteredTankData.reduce((sum, t) => sum + t.closingVolume, 0).toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    <Text strong style={{ 
                      color: filteredTankData.reduce((sum, t) => sum + Math.abs(t.variance), 0) < 100 ? '#52c41a' : '#cf1322'
                    }}>
                      {filteredTankData.reduce((sum, t) => sum + t.variance, 0) > 0 ? '+' : ''}
                      {filteredTankData.reduce((sum, t) => sum + t.variance, 0).toFixed(1)} L
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} colSpan={4}>
                    {/* Empty cells for remaining columns */}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>

      {/* Modals */}
      {renderTankDetailModal()}
      {renderOffloadModal()}
    </div>
  );
};

export default ComprehensiveReconciliation;