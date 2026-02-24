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
  ExportOutlined,
  FolderOutlined,
  CompressOutlined
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
  const [compactView, setCompactView] = useState(true);
  
  // Modal states
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTank, setViewingTank] = useState(null);
  const [offloadModalVisible, setOffloadModalVisible] = useState(false);
  const [viewingOffloads, setViewingOffloads] = useState([]);
  const [selectedTankOffloads, setSelectedTankOffloads] = useState(null);
  
  // Group by date state
  const [groupedByDate, setGroupedByDate] = useState({});
  
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
    limit: 1000,
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
    totalAbsVariance: 0,
    totalOffloads: 0,
    totalOffloadVolume: 0,
    tanksToInvestigate: 0,
    reconciliationRate: 0
  });

  // ==================== PROCESSING FUNCTIONS ====================

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
        driverPhone: offload.driverPhone || 'N/A',
        dipBefore: offload.dipBeforeVolume || 0,
        dipAfter: offload.dipAfterVolume || 0,
        temperature: offload.temperature,
        density: offload.density,
        status: offload.status,
        createdAt: offload.createdAt,
        createdBy: offload.createdBy?.name,
        tankName: tankData.tank?.name,
        shiftNumber: shiftInfo?.shiftNumber,
        stationName: shiftInfo?.station?.name
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

    // Get date for grouping
    const shiftDate = shiftInfo?.startTime ? dayjs(shiftInfo.startTime).format('YYYY-MM-DD') : 'Unknown';
    const displayDate = shiftInfo?.startTime ? dayjs(shiftInfo.startTime).format('DD/MM/YYYY') : 'Unknown';

    return {
      // Shift info for grouping
      shiftId: shiftInfo?.id,
      shiftNumber: shiftInfo?.shiftNumber,
      shiftStartTime: shiftInfo?.startTime,
      shiftEndTime: shiftInfo?.endTime,
      shiftDate,
      displayDate,
      stationName: shiftInfo?.station?.name,
      stationId: shiftInfo?.station?.id,
      supervisor: shiftInfo?.supervisor?.name,
      shiftStatus: shiftInfo?.status,
      
      // Tank info
      tankId: tankData.tank?.id,
      tankName: tankData.tank?.name,
      stationLabel: tankData.tank?.stationLabel,
      productName: tankData.tank?.product?.name || 'Unknown',
      productColor: tankData.tank?.product?.colorCode || '#1890ff',
      capacity: tankData.tank?.capacity,
      
      // Volume readings
      openingVolume,
      addition,
      totalVolume,
      expectedClosing,
      closingVolume,
      expectedDeduction,
      
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
      offloadDetails: offloadDetails,
      
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
    if (!rawData?.shifts) return { tanks: [], shifts: [], groupedByDate: {} };

    const allTanks = [];
    const shiftSummaries = [];
    const grouped = {};
    let totalOffloadDetails = [];

    // Process each shift
    rawData.shifts.forEach(shift => {
      const shiftInfo = shift.shift;
      const tanks = shift.reconciliation?.tanks || [];
      
      // Process each tank in this shift
      tanks.forEach(tank => {
        const processedTank = processTankReconciliation(tank, shiftInfo);
        if (processedTank) {
          allTanks.push(processedTank);
          
          // Collect offload details
          if (processedTank.offloadDetails && processedTank.offloadDetails.length > 0) {
            totalOffloadDetails.push(...processedTank.offloadDetails);
          }
          
          // Group by date
          const date = processedTank.shiftDate;
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(processedTank);
        }
      });

      // Create shift summary with offload tracking
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
          
          // Store offload details for this shift
          if (processed.offloadDetails && processed.offloadDetails.length > 0) {
            if (!acc.offloadDetails) acc.offloadDetails = [];
            acc.offloadDetails.push(...processed.offloadDetails);
          }
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
        tanksToInvestigate: 0,
        offloadDetails: []
      });

      shiftSummaries.push({
        shiftId: shiftInfo?.id,
        shiftNumber: shiftInfo?.shiftNumber,
        stationName: shiftInfo?.station?.name,
        startTime: shiftInfo?.startTime,
        endTime: shiftInfo?.endTime,
        status: shiftInfo?.status,
        supervisor: shiftInfo?.supervisor?.name,
        date: shiftInfo?.startTime ? dayjs(shiftInfo.startTime).format('DD/MM/YYYY') : 'Unknown',
        ...shiftTotals,
        reconciliationRate: shiftTotals.tankCount > 0 
          ? ((shiftTotals.tankCount - shiftTotals.tanksToInvestigate) / shiftTotals.tankCount * 100).toFixed(1)
          : 0
      });
    });

    // Sort dates in descending order (newest first)
    const sortedGrouped = {};
    Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .forEach(key => {
        sortedGrouped[key] = grouped[key];
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

    setGroupedByDate(sortedGrouped);

    return {
      tanks: allTanks,
      shifts: shiftSummaries,
      groupedByDate: sortedGrouped,
      allOffloads: totalOffloadDetails,
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
      
      const response = await reconciliationService.getShiftsByDateRange(params);
      
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
  }, [filters.period, filters.fromDate, filters.toDate, filters.status, filters.stationId]);

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

  const handleViewOffloads = (offloadDetails, record) => {
    setViewingOffloads(offloadDetails);
    setSelectedTankOffloads(record);
    setOffloadModalVisible(true);
  };

  // Format functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'KES 0.00';
    return `KES ${parseFloat(amount).toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatVolume = (liters) => {
    if (liters === undefined || liters === null) return '0';
    const absLiters = Math.abs(liters);
    return `${absLiters.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatVariance = (variance) => {
    if (variance === undefined || variance === null) return '0';
    const sign = variance > 0 ? '+' : '';
    return `${sign}${variance.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
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
    
    // Sort by date (newest first) and then by shift
    return data.sort((a, b) => {
      if (a.shiftDate !== b.shiftDate) {
        return b.shiftDate.localeCompare(a.shiftDate);
      }
      return (a.shiftNumber || '').localeCompare(b.shiftNumber || '');
    });
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

  // ==================== COMPACT TABLE COLUMNS (Removed last 3 columns) ====================

  const compactColumns = [
    {
      title: 'Date',
      key: 'date',
      width: 100,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          <div style={{ fontWeight: '500' }}>{record.displayDate}</div>
          <div style={{ fontSize: '10px', color: '#666' }}>#{record.shiftNumber}</div>
        </div>
      )
    },
    {
      title: 'Station',
      key: 'station',
      width: 110,
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          <div style={{ fontWeight: '500' }}>{record.stationName || 'N/A'}</div>
          <div style={{ fontSize: '10px', color: '#666' }}>{record.supervisor || ''}</div>
        </div>
      )
    },
    {
      title: 'Tank',
      key: 'tankName',
      width: 90,
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          <div style={{ fontWeight: '500' }}>{record.tankName || 'N/A'}</div>
          <div style={{ fontSize: '10px', color: '#666' }}>{record.productName}</div>
        </div>
      )
    },
    {
      title: 'Open',
      dataIndex: 'openingVolume',
      key: 'openingVolume',
      width: 55,
      align: 'right',
      render: (vol) => (
        <Tooltip title={`START: ${vol.toLocaleString()} L`}>
          <div style={{ fontSize: '11px', fontWeight: '500' }}>{formatVolume(vol)}</div>
        </Tooltip>
      )
    },
    {
      title: 'Add',
      dataIndex: 'addition',
      key: 'addition',
      width: 90,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={record.hasOffload ? `Offload: ${vol.toLocaleString()} L` : 'No offload'}>
          <div 
            style={{ 
              fontSize: '11px', 
              fontWeight: '500', 
              color: vol > 0 ? '#52c41a' : '#999',
              cursor: record.hasOffload ? 'pointer' : 'default',
              textDecoration: record.hasOffload ? 'underline dotted' : 'none'
            }}
            onClick={record.hasOffload ? (e) => {
              e.stopPropagation();
              handleViewOffloads(record.offloadDetails, record);
            } : undefined}
          >
            {vol > 0 ? `+${formatVolume(vol)}` : '0'}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Total',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      width: 55,
      align: 'right',
      render: (vol) => (
        <Tooltip title={`Opening + Addition: ${vol.toLocaleString()} L`}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#722ed1' }}>
            {formatVolume(vol)}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Sales',
      dataIndex: 'expectedDeduction',
      key: 'expectedDeduction',
      width: 55,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={`From ${record.pumpCount} pump(s)`}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#389e0d' }}>
            {formatVolume(vol)}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Exp Closing',
      key: 'expectedClosing',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Tooltip title={`Expected: ${record.expectedClosing.toLocaleString()} L`}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
            {formatVolume(record.expectedClosing)}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Closing Dip',
      dataIndex: 'closingVolume',
      key: 'closingVolume',
      width: 150,
      align: 'right',
      render: (vol) => (
        <Tooltip title={`END: ${vol.toLocaleString()} L`}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#cf1322' }}>
            {formatVolume(vol)}
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
        
        return (
          <Tooltip title={`${record.variancePercentage}% of expected`}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '700', 
              color,
              background: record.absVariance > 100 ? '#fff2f0' : 'transparent',
              padding: '2px 2px',
              borderRadius: '4px'
            }}>
              {formatVariance(record.variance)}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: 55,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            type="text"
            style={{ fontSize: '11px' }}
            onClick={() => {
              setViewingTank(record);
              setViewModalVisible(true);
            }}
          />
        </Tooltip>
      )
    }
  ];

  // ==================== STANDARD COLUMNS (Removed last 3 columns) ====================

  const standardColumns = [
    {
      title: 'Date',
      key: 'date',
      width: 100,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            {record.displayDate}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            #{record.shiftNumber}
          </div>
        </div>
      )
    },
    {
      title: 'Station',
      key: 'station',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            {record.stationName || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {record.supervisor || ''}
          </div>
        </div>
      )
    },
    {
      title: 'Tank',
      key: 'tankName',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            <FireOutlined style={{ fontSize: '9px', marginRight: '3px', color: '#ff4d4f' }} />
            {record.tankName || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.2' }}>
            {record.productName}
          </div>
        </div>
      )
    },
    {
      title: 'Opening',
      dataIndex: 'openingVolume',
      key: 'openingVolume',
      width: 70,
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
      width: 70,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={record.hasOffload ? `Offload: ${vol.toLocaleString()} L` : 'No offload'}>
          <div 
            style={{ 
              fontSize: '11px', 
              fontWeight: '500', 
              color: vol > 0 ? '#52c41a' : '#999',
              cursor: record.hasOffload ? 'pointer' : 'default',
              textDecoration: record.hasOffload ? 'underline dotted' : 'none'
            }}
            onClick={record.hasOffload ? (e) => {
              e.stopPropagation();
              handleViewOffloads(record.offloadDetails, record);
            } : undefined}
          >
            {vol > 0 ? `+${vol.toLocaleString()} L` : '0 L'}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Total',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      width: 70,
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
      width: 70,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={`From ${record.pumpCount} pump(s)`}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#389e0d' }}>
            {vol.toLocaleString()} L
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Expected',
      key: 'expectedClosing',
      width: 70,
      align: 'right',
      render: (_, record) => (
        <Tooltip title="Total - Sales">
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
            {record.expectedClosing.toLocaleString()} L
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Dip',
      dataIndex: 'closingVolume',
      key: 'closingVolume',
      width: 70,
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
      width: 80,
      align: 'right',
      render: (_, record) => {
        const color = record.absVariance < 10 ? '#389e0d' : 
                     record.absVariance < 30 ? '#1890ff' : 
                     record.absVariance < 100 ? '#fa8c16' : '#cf1322';
        const sign = record.variance > 0 ? '+' : '';
        
        return (
          <Tooltip title={`${record.variancePercentage}% of expected`}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '700', 
              color,
              background: record.absVariance > 100 ? '#fff2f0' : 'transparent',
              padding: '2px 4px',
              borderRadius: '4px'
            }}>
              {sign}{record.variance.toFixed(0)} L
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_, record) => (
        <Badge 
          status={record.statusColor} 
          text={record.status} 
          style={{ fontSize: '10px' }}
        />
      )
    },
    {
      title: 'Offloads',
      key: 'offloadIndicator',
      width: 60,
      align: 'center',
      render: (_, record) => record.hasOffload ? (
        <Tooltip title={`${record.offloadCount} offload(s) • ${formatVolume(record.offloadVolume)} L`}>
          <Tag 
            color="green" 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handleViewOffloads(record.offloadDetails, record);
            }}
          >
            <TruckOutlined /> {record.offloadCount}
          </Tag>
        </Tooltip>
      ) : (
        <Tag color="default">0</Tag>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      fixed: 'right',
      render: (_, record) => (
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
      )
    }
  ];

  const pumpDetailColumns = [
    {
      title: 'Pump',
      dataIndex: 'pumpName',
      key: 'pumpName',
      width: 100,
    },
    {
      title: 'Start',
      dataIndex: 'startMeter',
      key: 'startMeter',
      width: 70,
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'End',
      dataIndex: 'endMeter',
      key: 'endMeter',
      width: 70,
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Dispensed',
      dataIndex: 'dispensed',
      key: 'dispensed',
      width: 80,
      align: 'right',
      render: (val) => <Text strong>{val.toLocaleString()} L</Text>
    },
    {
      title: 'Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 70,
      align: 'right',
      render: (val) => formatCurrency(val)
    },
    {
      title: 'Sales',
      dataIndex: 'salesValue',
      key: 'salesValue',
      width: 80,
      align: 'right',
      render: (val) => formatCurrency(val)
    }
  ];

  const offloadColumns = [
    {
      title: 'Receiving #',
      dataIndex: 'receivingNumber',
      key: 'receivingNumber',
      width: 100,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierInvoice',
      key: 'supplierInvoice',
      width: 100,
    },
    {
      title: 'Company',
      dataIndex: 'deliveryCompany',
      key: 'deliveryCompany',
      width: 120,
    },
    {
      title: 'Driver',
      dataIndex: 'driverName',
      key: 'driverName',
      width: 100,
    },
    {
      title: 'Dip Before',
      dataIndex: 'dipBefore',
      key: 'dipBefore',
      width: 70,
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Dip After',
      dataIndex: 'dipAfter',
      key: 'dipAfter',
      width: 70,
      align: 'right',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Volume',
      dataIndex: 'actualVolume',
      key: 'actualVolume',
      width: 80,
      align: 'right',
      render: (val) => <Text strong>{val.toLocaleString()} L</Text>
    },
    {
      title: 'Temp',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 50,
      align: 'right',
      render: (val) => val ? val + '°C' : 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'COMPLETED' ? 'green' : status === 'PENDING' ? 'orange' : 'blue'} style={{ fontSize: '10px' }}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 80,
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
      const margin = 14; // Consistent margins

      // Title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Comprehensive Reconciliation Report`, pageWidth / 2, 15, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${fromDate} - ${toDate}`, pageWidth / 2, 22, { align: 'center' });

      // Summary Statistics - Compact with margins
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      let yPos = 30;
      
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      doc.text(`Shifts: ${stats.totalShifts} | Tanks: ${stats.totalTanks} | Offloads: ${stats.totalOffloads}`, pageWidth - margin - 100, yPos);
      
      yPos = 38;
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
      
      doc.setFontSize(8);
      doc.text('Open:', margin + 6, yPos + 5);
      doc.text(`${formatVolume(stats.totalOpening)}`, margin + 16, yPos + 5);
      
      doc.text('Add:', margin + 36, yPos + 5);
      doc.text(`${formatVolume(stats.totalAddition)}`, margin + 46, yPos + 5);
      
      doc.text('Total:', margin + 66, yPos + 5);
      doc.text(`${formatVolume(stats.totalVolume)}`, margin + 76, yPos + 5);
      
      doc.text('Sales:', margin + 96, yPos + 5);
      doc.text(`${formatVolume(stats.totalSales)}`, margin + 106, yPos + 5);
      
      doc.text('Exp:', margin + 126, yPos + 5);
      doc.text(`${formatVolume(stats.totalVolume - stats.totalSales)}`, margin + 136, yPos + 5);
      
      doc.text('Dip:', margin + 156, yPos + 5);
      doc.text(`${formatVolume(stats.totalVolume - stats.totalSales + stats.totalVariance)}`, margin + 166, yPos + 5);
      
      const varianceColor = stats.totalAbsVariance < 30 ? [0,128,0] : 
                           stats.totalAbsVariance < 100 ? [250,140,22] : [255,0,0];
      doc.setTextColor(varianceColor[0], varianceColor[1], varianceColor[2]);
      doc.text('Var:', margin + 186, yPos + 5);
      doc.text(`${stats.totalVariance > 0 ? '+' : ''}${formatVolume(stats.totalVariance)}`, margin + 196, yPos + 5);
      
      doc.setTextColor(0, 0, 0);
      doc.text(`Rate: ${stats.reconciliationRate}%`, margin + 216, yPos + 5);

      // Tanks Table with Compact Format and margins
      yPos = 65;
      
      const tableData = filteredTankData.map(tank => [
        tank.displayDate,
        tank.shiftNumber,
        tank.stationName?.substring(0, 10) || '',
        tank.tankName?.substring(0, 12) || '',
        tank.productName?.substring(0, 8) || '',
        formatVolume(tank.openingVolume),
        tank.addition > 0 ? `+${formatVolume(tank.addition)}` : '0',
        formatVolume(tank.totalVolume),
        formatVolume(tank.expectedDeduction),
        formatVolume(tank.expectedClosing),
        formatVolume(tank.closingVolume),
        `${tank.variance > 0 ? '+' : ''}${formatVolume(tank.variance)}`,
        tank.status.substring(0, 4),
        tank.hasOffload ? 'Y' : 'N'
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['Date', 'Shift', 'Station', 'Tank', 'Prod', 'Open', 'Add', 'Total', 'Sales', 'Exp', 'Dip', 'Var', 'Stat', 'Off']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontSize: 7 },
        bodyStyles: { fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 15 },
          2: { cellWidth: 18 },
          3: { cellWidth: 20 },
          4: { cellWidth: 15 },
          5: { cellWidth: 12, halign: 'right' },
          6: { cellWidth: 12, halign: 'right' },
          7: { cellWidth: 12, halign: 'right' },
          8: { cellWidth: 12, halign: 'right' },
          9: { cellWidth: 12, halign: 'right' },
          10: { cellWidth: 12, halign: 'right' },
          11: { cellWidth: 15, halign: 'right' },
          12: { cellWidth: 12 },
          13: { cellWidth: 8, halign: 'center' }
        },
        didDrawPage: (data) => {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Generated from Lynx Energy System | Page ${doc.internal.getNumberOfPages()}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
          );
        }
      });

      doc.save(`reconciliation_${filters.fromDate}_to_${filters.toDate}.pdf`);
      message.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF error:', error);
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
        'Date', 'Shift', 'Station', 'Supervisor', 'Tank', 'Product',
        'Opening', 'Addition', 'Total', 'Sales', 'Expected', 'Dip', 'Variance',
        'Var%', 'Status', 'Offloads', 'Off Vol', 'Sales Value'
      ];

      const csvData = filteredTankData.map(tank => [
        tank.displayDate,
        tank.shiftNumber,
        tank.stationName,
        tank.supervisor || 'N/A',
        tank.tankName,
        tank.productName,
        tank.openingVolume,
        tank.addition,
        tank.totalVolume,
        tank.expectedDeduction,
        tank.expectedClosing,
        tank.closingVolume,
        tank.variance,
        tank.variancePercentage,
        tank.status,
        tank.offloadCount,
        tank.offloadVolume,
        tank.totalSalesValue
      ]);

      csvData.unshift(headers);

      const csvString = csvData.map(row => 
        row.map(cell => {
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `reconciliation_${filters.fromDate}_to_${filters.toDate}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('CSV exported!');
    } catch (error) {
      console.error('CSV error:', error);
      message.error('Failed to export CSV');
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderSummaryStats = () => (
    <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#f0f5ff', padding: '8px' }}>
          <Statistic
            title="Shifts"
            value={stats.totalShifts}
            prefix={<CalendarOutlined />}
            valueStyle={{ fontSize: '18px' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#f6ffed', padding: '8px' }}>
          <Statistic
            title="Tanks"
            value={stats.totalTanks}
            prefix={<FireOutlined />}
            valueStyle={{ fontSize: '18px' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#fff7e6', padding: '8px' }}>
          <Statistic
            title="Opening"
            value={stats.totalOpening}
            suffix="L"
            valueStyle={{ fontSize: '18px' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#f6ffed', padding: '8px' }}>
          <Statistic
            title="Addition"
            value={stats.totalAddition}
            suffix="L"
            valueStyle={{ fontSize: '18px' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#f9f0ff', padding: '8px' }}>
          <Statistic
            title="Total"
            value={stats.totalVolume}
            suffix="L"
            valueStyle={{ fontSize: '18px' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#e6f7ff', padding: '8px' }}>
          <Statistic
            title="Sales"
            value={stats.totalSales}
            suffix="L"
            valueStyle={{ fontSize: '18px' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#fff2f0', padding: '8px' }}>
          <Statistic
            title="Variance"
            value={stats.totalVariance}
            precision={0}
            suffix="L"
            valueStyle={{ 
              color: stats.totalAbsVariance < 30 ? '#52c41a' : 
                     stats.totalAbsVariance < 100 ? '#fa8c16' : '#cf1322',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
            prefix={stats.totalVariance > 0 ? '+' : ''}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={3}>
        <Card size="small" bordered={false} style={{ background: '#fff1f0', padding: '8px' }}>
          <Statistic
            title="Investigate"
            value={stats.tanksToInvestigate}
            prefix={<AlertOutlined />}
            valueStyle={{ color: stats.tanksToInvestigate > 0 ? '#cf1322' : '#52c41a', fontSize: '18px' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16, padding: '8px' }}>
      <Row gutter={[8, 8]} align="middle">
        <Col xs={24} sm={24} md={8} lg={10}>
          <Space size={4} wrap>
            <Select 
              value={filters.period} 
              onChange={handlePeriodChange}
              style={{ width: 80 }}
              size="small"
            >
              <Option value="today">Today</Option>
              <Option value="yesterday">Yest</Option>
              <Option value="week">7d</Option>
              <Option value="month">30d</Option>
              <Option value="quarter">90d</Option>
              <Option value="year">Year</Option>
            </Select>
            <RangePicker 
              onChange={handleDateRangeChange}
              value={[dayjs(filters.fromDate), dayjs(filters.toDate)]}
              format="YYYY-MM-DD"
              size="small"
              style={{ width: 200 }}
              allowClear={false}
            />
          </Space>
        </Col>
        
        <Col xs={24} sm={12} md={4} lg={3}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            size="small"
            allowClear
          />
        </Col>
        
        <Col xs={12} sm={6} md={3} lg={2}>
          <Select
            placeholder="Product"
            value={filters.productFilter}
            onChange={(val) => setFilters(prev => ({ ...prev, productFilter: val }))}
            style={{ width: '100%' }}
            size="small"
            allowClear={false}
          >
            <Option value="all">All</Option>
            {uniqueProducts.map(product => (
              <Option key={product} value={product}>{product.substring(0, 8)}</Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={12} sm={6} md={3} lg={2}>
          <Select
            placeholder="Status"
            value={filters.statusFilter}
            onChange={(val) => setFilters(prev => ({ ...prev, statusFilter: val }))}
            style={{ width: '100%' }}
            size="small"
            allowClear={false}
          >
            <Option value="all">All</Option>
            {uniqueStatuses.map(status => (
              <Option key={status} value={status}>{status.substring(0, 4)}</Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={12} sm={6} md={3} lg={2}>
          <Button 
            type={filters.showOnlyIssues ? "primary" : "default"}
            danger={filters.showOnlyIssues}
            icon={<WarningOutlined />}
            onClick={() => setFilters(prev => ({ ...prev, showOnlyIssues: !prev.showOnlyIssues }))}
            size="small"
            block
          >
            Issues
          </Button>
        </Col>
        
        <Col xs={12} sm={6} md={3} lg={3}>
          <Space size={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => fetchComprehensiveData()}
              size="small"
            >
              Refresh
            </Button>
            <Button 
              icon={compactView ? <FileTextOutlined /> : <CompressOutlined />} 
              onClick={() => setCompactView(!compactView)}
              size="small"
              title={compactView ? "Standard View" : "Compact View"}
            />
            <Dropdown 
              menu={{
                items: [
                  {
                    key: 'pdf',
                    icon: <FileTextOutlined />,
                    label: 'PDF',
                    onClick: generatePDF
                  },
                  {
                    key: 'csv',
                    icon: <DownloadOutlined />,
                    label: 'CSV',
                    onClick: exportCSV
                  }
                ]
              }}
              placement="bottomRight"
            >
              <Button icon={<ExportOutlined />} size="small">
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
        <Space size={4}>
          <FireOutlined style={{ color: '#ff4d4f' }} />
          <span style={{ fontSize: '14px' }}>{viewingTank?.tankName}</span>
          <Tag color={viewingTank?.productColor} style={{ fontSize: '11px' }}>{viewingTank?.productName}</Tag>
          <Badge status={viewingTank?.statusColor} text={viewingTank?.status} />
        </Space>
      }
      open={viewModalVisible}
      onCancel={() => setViewModalVisible(false)}
      width={900}
      footer={[
        <Button key="close" size="small" onClick={() => setViewModalVisible(false)}>
          Close
        </Button>
      ]}
    >
      {viewingTank && (
        <div style={{ margin: '0 8px' }}>
          {/* Shift Info */}
          <Card size="small" style={{ marginBottom: 12, background: '#f5f5f5', fontSize: '12px' }}>
            <Row gutter={12}>
              <Col span={8}>
                <Text type="secondary">Shift:</Text>
                <div><Text strong>#{viewingTank.shiftNumber}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Station:</Text>
                <div><Text strong>{viewingTank.stationName}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Date:</Text>
                <div><Text strong>{viewingTank.displayDate}</Text></div>
              </Col>
            </Row>
          </Card>

          {/* Reconciliation Summary - Compact */}
          <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
            <Col span={6}>
              <Card size="small" style={{ background: '#e6f7ff', padding: '8px' }}>
                <Statistic 
                  title="Opening" 
                  value={viewingTank.openingVolume} 
                  suffix="L"
                  valueStyle={{ fontSize: '14px' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#f6ffed', padding: '8px' }}>
                <Statistic 
                  title="Addition" 
                  value={viewingTank.addition} 
                  suffix="L"
                  valueStyle={{ fontSize: '14px' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#f9f0ff', padding: '8px' }}>
                <Statistic 
                  title="Total" 
                  value={viewingTank.totalVolume} 
                  suffix="L"
                  valueStyle={{ fontSize: '14px' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: '#fff7e6', padding: '8px' }}>
                <Statistic 
                  title="Sales" 
                  value={viewingTank.expectedDeduction} 
                  suffix="L"
                  valueStyle={{ fontSize: '14px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Variance Breakdown - Compact */}
          <Card size="small" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Reconciliation</div>
            <Row gutter={8}>
              <Col span={12}>
                <Text type="secondary">Opening:</Text> <Text strong>{formatVolume(viewingTank.openingVolume)} L</Text><br />
                <Text type="secondary">+ Addition:</Text> <Text strong type="success">{viewingTank.addition > 0 ? `+${formatVolume(viewingTank.addition)}` : '0'} L</Text><br />
                <Text type="secondary">= Total:</Text> <Text strong>{formatVolume(viewingTank.totalVolume)} L</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">- Sales:</Text> <Text strong type="danger">{formatVolume(viewingTank.expectedDeduction)} L</Text><br />
                <Text type="secondary">= Expected:</Text> <Text strong style={{ color: '#1890ff' }}>{formatVolume(viewingTank.expectedClosing)} L</Text><br />
                <Text type="secondary">vs Dip:</Text> <Text strong style={{ color: '#cf1322' }}>{formatVolume(viewingTank.closingVolume)} L</Text>
              </Col>
              <Col span={24} style={{ marginTop: '8px' }}>
                <Divider style={{ margin: '4px 0' }} />
                <Text type="secondary">Variance:</Text>
                <Text strong style={{ 
                  color: viewingTank.absVariance < 10 ? '#52c41a' : 
                         viewingTank.absVariance < 30 ? '#1890ff' : 
                         viewingTank.absVariance < 100 ? '#fa8c16' : '#cf1322',
                  fontSize: '16px',
                  marginLeft: '8px'
                }}>
                  {formatVariance(viewingTank.variance)} L
                </Text>
                <Text type="secondary"> ({viewingTank.variancePercentage}%)</Text>
              </Col>
            </Row>
          </Card>

          {/* Offload Details if exists */}
          {viewingTank.hasOffload && (
            <Card size="small" style={{ marginBottom: 12, borderColor: '#52c41a' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                <TruckOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                Offloads ({viewingTank.offloadCount})
              </div>
              <Table 
                columns={offloadColumns}
                dataSource={viewingTank.offloadDetails}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 800 }}
              />
            </Card>
          )}

          {/* Pumps Details */}
          {viewingTank.pumpDetails.length > 0 && (
            <Card size="small" title={`Pumps (${viewingTank.pumpDetails.length})`} style={{ fontSize: '12px' }}>
              <Table 
                columns={pumpDetailColumns}
                dataSource={viewingTank.pumpDetails}
                rowKey="pumpId"
                size="small"
                pagination={false}
                scroll={{ x: 500 }}
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
        <Space size={4}>
          <TruckOutlined style={{ color: '#52c41a' }} />
          <span>Offload Details</span>
          {selectedTankOffloads && (
            <Tag color="blue">{selectedTankOffloads.tankName}</Tag>
          )}
        </Space>
      }
      open={offloadModalVisible}
      onCancel={() => {
        setOffloadModalVisible(false);
        setViewingOffloads([]);
        setSelectedTankOffloads(null);
      }}
      width={1000}
      footer={[
        <Button key="close" size="small" onClick={() => {
          setOffloadModalVisible(false);
          setViewingOffloads([]);
          setSelectedTankOffloads(null);
        }}>
          Close
        </Button>
      ]}
    >
      <div style={{ margin: '0 8px' }}>
        {viewingOffloads.length > 0 ? (
          <Table 
            columns={offloadColumns}
            dataSource={viewingOffloads}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 1000 }}
          />
        ) : (
          <Empty description="No offload details available" />
        )}
      </div>
    </Modal>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 8px'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          <DiffOutlined style={{ marginRight: 8 }} />
          Comprehensive Reconciliation
        </Title>
        <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => navigate(-1)}>
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
          <Space size={8} style={{ paddingLeft: '8px' }}>
            <FolderOutlined />
            <span style={{ fontSize: '13px' }}>Tank Details</span>
            <Tag color="blue" style={{ fontSize: '11px' }}>{filteredTankData.length} records</Tag>
            {stats.totalOffloads > 0 && (
              <Tag color="green" icon={<TruckOutlined />} style={{ fontSize: '11px' }}>
                {stats.totalOffloads} offloads
              </Tag>
            )}
          </Space>
        }
        extra={
          <Text type="secondary" style={{ fontSize: '11px', paddingRight: '8px' }}>
            {Object.keys(groupedByDate).length} days • {processedData?.shifts?.length || 0} shifts
          </Text>
        }
        bodyStyle={{ padding: '12px' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin size="small" />
            <div style={{ marginTop: 8, fontSize: '12px' }}>Loading...</div>
          </div>
        ) : filteredTankData.length === 0 ? (
          <Empty description="No data found" />
        ) : (
          <Table 
            columns={compactView ? compactColumns : standardColumns}
            dataSource={filteredTankData}
            rowKey={(record) => `${record.shiftId}-${record.tankId}`}
            size="small"
            scroll={{ x: compactView ? 900 : 1100 }}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showTotal: (total) => `${total} tanks`,
              size: 'small'
            }}
            style={{ margin: '0 4px' }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#f5f5f5', fontSize: '11px' }}>
                  <Table.Summary.Cell index={0} colSpan={compactView ? 3 : 4}>
                    <Text strong style={{ marginLeft: '8px' }}>Totals:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 3 : 4} align="right">
                    <Text strong>{formatVolume(filteredTankData.reduce((sum, t) => sum + t.openingVolume, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 4 : 5} align="right">
                    <Text strong type="success">+{formatVolume(filteredTankData.reduce((sum, t) => sum + t.addition, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 5 : 6} align="right">
                    <Text strong style={{ color: '#722ed1' }}>{formatVolume(filteredTankData.reduce((sum, t) => sum + t.totalVolume, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 6 : 7} align="right">
                    <Text strong>{formatVolume(filteredTankData.reduce((sum, t) => sum + t.expectedDeduction, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 7 : 8} align="right">
                    <Text strong style={{ color: '#1890ff' }}>{formatVolume(filteredTankData.reduce((sum, t) => sum + t.expectedClosing, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 8 : 9} align="right">
                    <Text strong style={{ color: '#cf1322' }}>{formatVolume(filteredTankData.reduce((sum, t) => sum + t.closingVolume, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 9 : 10} align="right">
                    <Text strong style={{ 
                      color: filteredTankData.reduce((sum, t) => sum + Math.abs(t.variance), 0) < 100 ? '#52c41a' : '#cf1322'
                    }}>
                      {filteredTankData.reduce((sum, t) => sum + t.variance, 0) > 0 ? '+' : ''}
                      {formatVolume(filteredTankData.reduce((sum, t) => sum + t.variance, 0))}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={compactView ? 10 : 11} colSpan={compactView ? 3 : 3}>
                    {/* Empty */}
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