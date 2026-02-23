// src/pages/shifts/ReconciliationReadings.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
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
  Progress,
  Alert,
  Spin
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FireOutlined,
  DollarOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  DiffOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import {reconciliationService, RECONCILIATION_STATUS, SHIFT_STATUS } from '../../../../../services/reconcilliationService/reconcilliationService';
import { shiftReadingService } from '../../../../../services/shiftReadingService/shiftReadingService';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Option } = Select;
const { Text, Title } = Typography;

const ReconciliationReadings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract shift and station data from navigation state
  const { shiftId, stationId, shiftNumber } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [shiftInfo, setShiftInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pumpReadings, setPumpReadings] = useState([]);
  
  // Report states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  
  // View details modal
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTank, setViewingTank] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    productFilter: 'all',
    statusFilter: 'all'
  });
  
  // ==================== DATA PROCESSING ====================

  /**
   * Process tank reconciliation data
   * For each tank:
   * - Opening volume = START reading
   * - Addition = Fuel added during shift (default 0)
   * - Total = Opening + Addition
   * - Expected Closing = Total - Sales
   * - Dip Closing = END reading
   * - Sales = Sum of all connected pumps (electric end - start)
   * - Variance = Dip Closing - Expected Closing
   */
  const processTankReconciliation = (tankData) => {
    if (!tankData) return null;

    // Get opening and closing volumes from tank dip readings
    const openingReading = tankData.readings?.start;
    const closingReading = tankData.readings?.end;
    
    const openingVolume = openingReading?.volume || 0;
    const closingVolume = closingReading?.volume || 0;
    
    // Addition (default 0, could come from offloads)
    let addition = 0;
    if (tankData.offloads && tankData.offloads.length > 0) {
      addition = tankData.offloads.reduce((sum, offload) => sum + (offload.actualVolume || 0), 0);
    }
    
    // Total = Opening + Addition
    const totalVolume = openingVolume + addition;
    
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
          pumpId: pump.pump?.id,
          startMeter: pumpStart,
          endMeter: pumpEnd,
          dispensed: pumpDispensed,
          unitPrice: pump.readings?.end?.unitPrice || pump.readings?.start?.unitPrice || 0,
          salesValue: pump.readings?.end?.salesValue || 0,
          startReading: pump.readings?.start,
          endReading: pump.readings?.end
        });
      });
    }

    // Expected Closing = Total - Sales
    const expectedClosing = totalVolume - expectedDeduction;
    
    // Variance = Dip Closing - Expected Closing
    const variance = closingVolume - expectedClosing;

    // Determine reconciliation status
    let status = 'EXCELLENT';
    let statusColor = 'success';
    const absVariance = Math.abs(variance);
    if (absVariance > 100) {
      status = 'INVESTIGATE';
      statusColor = 'error';
    } else if (absVariance > 30) {
      status = 'ACCEPTABLE';
      statusColor = 'warning';
    } else if (absVariance > 10) {
      status = 'GOOD';
      statusColor = 'processing';
    }

    return {
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
      actualDeduction,
      
      // Pump calculations
      expectedDeduction,
      pumpDetails,
      pumpCount: pumpDetails.length,
      
      // Variance
      variance,
      
      status,
      statusColor,
      
      // Additional info
      hasOffload: tankData.offloads?.length > 0,
      offloadVolume: addition,
      offloads: tankData.offloads || [],
      
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
      acc.totalAddition += tank.addition;
      acc.totalVolume += tank.totalVolume;
      acc.totalExpectedClosing += tank.expectedClosing;
      acc.totalClosing += tank.closingVolume;
      acc.totalActualDeduction += tank.actualDeduction;
      acc.totalExpectedDeduction += tank.expectedDeduction;
      acc.totalVariance += tank.variance;
      acc.totalOffloadVolume += tank.offloadVolume || 0;
      acc.totalPumps += tank.pumpCount;
      
      // Count tanks by status
      acc.statusCount[tank.status] = (acc.statusCount[tank.status] || 0) + 1;
      
      return acc;
    }, {
      totalOpening: 0,
      totalAddition: 0,
      totalVolume: 0,
      totalExpectedClosing: 0,
      totalClosing: 0,
      totalActualDeduction: 0,
      totalExpectedDeduction: 0,
      totalVariance: 0,
      totalOffloadVolume: 0,
      totalPumps: 0,
      statusCount: {}
    });

    // Determine shift reconciliation status
    let shiftStatus = 'RECONCILED';
    let shiftStatusColor = 'success';
    if (Math.abs(shiftTotals.totalVariance) > 100) {
      shiftStatus = 'DISCREPANCY';
      shiftStatusColor = 'error';
    } else if (Math.abs(shiftTotals.totalVariance) > 30) {
      shiftStatus = 'PARTIAL';
      shiftStatusColor = 'warning';
    }

    return {
      shiftInfo: rawData.shift,
      verification: rawData.verification,
      metadata: rawData.reconciliation?.metadata,
      
      tanks: processedTanks,
      totals: shiftTotals,
      shiftStatus,
      shiftStatusColor,
      
      raw: rawData
    };
  };

  // ==================== FETCH FUNCTIONS ====================

  const fetchReconciliationData = async (id) => {
    if (!id) {
      message.error('Shift ID is required');
      return;
    }
    
    setLoading(true);
    try {
      // Fetch reconciliation data
      const result = await reconciliationService.getShiftReconciliation(
        id,
        {
          includeOffloads: true,
          includePumpDetails: true,
          calculateVariances: true
        }
      );
      
      console.log("🔍 RAW RECONCILIATION DATA:", result);
      
      // Process the data with our business logic
      const processed = processShiftData(result);
      console.log("✅ PROCESSED RECONCILIATION DATA:", processed);
      
      setData(result);
      setProcessedData(processed);
      setShiftInfo(result.shift);
      setSummary(result.reconciliation?.summary);
      
      // Also fetch pump readings for reference
      try {
        const pumpResponse = await shiftReadingService.getPumpReadingsSummary(id);
        setPumpReadings(pumpResponse.data?.pumpsData || []);
      } catch (pumpError) {
        console.log("Could not fetch pump readings separately", pumpError);
      }
      
      message.success(`Loaded reconciliation for shift ${result.shift?.shiftNumber || id}`);
    } catch (error) {
      console.log("error ", error);
      message.error(`Failed to load reconciliation data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (shiftId) {
      fetchReconciliationData(shiftId);
    } else {
      message.warning('No shift data provided. Please select a shift first.');
      navigate(-1);
    }
  }, [shiftId]);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm:ss');
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'KES 0.00';
    return `KES ${parseFloat(amount).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  
  // Format volume
  const formatVolume = (liters) => {
    if (liters === undefined || liters === null) return '0.00 L';
    return `${parseFloat(liters).toLocaleString('en-KE', {
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
        tank.productName?.toLowerCase().includes(searchLower)
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
  
  // ==================== TABLE COLUMNS ====================

  const tankColumns = [
    {
      title: 'Tank',
      key: 'tankName',
      width: 150,
      fixed: 'left',
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
        <div style={{ fontSize: '11px', fontWeight: '500' }}>
          {vol.toLocaleString()} L
        </div>
      )
    },
    {
      title: 'Addition',
      dataIndex: 'addition',
      key: 'addition',
      width: 80,
      align: 'right',
      render: (vol) => (
        <div style={{ fontSize: '11px', fontWeight: '500', color: vol > 0 ? '#52c41a' : '#999' }}>
          {vol.toLocaleString()} L
        </div>
      )
    },
    {
      title: 'Total',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      width: 80,
      align: 'right',
      render: (vol) => (
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#722ed1' }}>
          {vol.toLocaleString()} L
        </div>
      )
    },
        {
      title: 'Sales',
      dataIndex: 'expectedDeduction',
      key: 'expectedDeduction',
      width: 100,
      align: 'right',
      render: (vol, record) => (
        <Tooltip title={`From ${record.pumpCount} connected pump(s)`}>
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
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
            {record.expectedClosing.toLocaleString()} L
          </div>
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
        <div style={{ fontSize: '11px', fontWeight: '500', color: '#cf1322' }}>
          {vol.toLocaleString()} L
        </div>
      )
    },

    {
      title: 'Variance',
      key: 'variance',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const color = Math.abs(record.variance) < 10 ? '#389e0d' : Math.abs(record.variance) < 30 ? '#1890ff' : '#cf1322';
        
        return (
          <div style={{ fontSize: '11px', fontWeight: '700', color }}>
            {record.variance.toFixed(1)} L
          </div>
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

  // ==================== PDF GENERATION ====================

  const generatePDF = () => {
    if (!processedData) {
      message.warning('No data to generate PDF');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const stationName = processedData.shiftInfo?.station?.name || 'Unknown Station';
      const shiftNum = processedData.shiftInfo?.shiftNumber || shiftNumber || 'Unknown';
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Shift Reconciliation Report`, pageWidth / 2, 15, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${stationName} - Shift #${shiftNum}`, pageWidth / 2, 22, { align: 'center' });

      // Shift Info
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      let yPos = 30;
      
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
      doc.text(`Start Time: ${formatDate(processedData.shiftInfo?.startTime)}`, 14, yPos + 5);
      doc.text(`End Time: ${formatDate(processedData.shiftInfo?.endTime)}`, 14, yPos + 10);
      doc.text(`Supervisor: ${processedData.shiftInfo?.supervisor?.name || 'N/A'}`, 140, yPos);
      doc.text(`Status: ${processedData.shiftInfo?.status || 'N/A'}`, 140, yPos + 5);

      // Summary Statistics
      yPos = 45;
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, pageWidth - 28, 25, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Opening:', 20, yPos + 5);
      doc.text(`${processedData.totals?.totalOpening?.toLocaleString()} L`, 45, yPos + 5);
      
      doc.text('Addition:', 80, yPos + 5);
      doc.text(`${processedData.totals?.totalAddition?.toLocaleString()} L`, 105, yPos + 5);
      
      doc.text('Total:', 140, yPos + 5);
      doc.text(`${processedData.totals?.totalVolume?.toLocaleString()} L`, 165, yPos + 5);
      
      doc.text('Expected Closing:', 20, yPos + 13);
      doc.text(`${processedData.totals?.totalExpectedClosing?.toLocaleString()} L`, 55, yPos + 13);
      
      doc.text('Dip Closing:', 100, yPos + 13);
      doc.text(`${processedData.totals?.totalClosing?.toLocaleString()} L`, 135, yPos + 13);
      
      doc.text('Sales:', 170, yPos + 13);
      doc.text(`${processedData.totals?.totalExpectedDeduction?.toLocaleString()} L`, 195, yPos + 13);
      
      doc.text('Variance:', 20, yPos + 21);
      doc.setTextColor(Math.abs(processedData.totals?.totalVariance) < 30 ? 0 : 255, 
                       Math.abs(processedData.totals?.totalVariance) < 30 ? 128 : 0, 
                       0);
      doc.text(`${processedData.totals?.totalVariance?.toFixed(1)} L`, 45, yPos + 21);

      // Tanks Table
      yPos = 75;
      const tableData = processedData.tanks.map((tank, index) => [
        tank.tankName,
        tank.productName,
        tank.openingVolume.toLocaleString(),
        tank.addition.toLocaleString(),
        tank.totalVolume.toLocaleString(),
        tank.expectedClosing.toLocaleString(),
        tank.closingVolume.toLocaleString(),
        tank.expectedDeduction.toLocaleString(),
        `${tank.variance.toFixed(1)} L`,
        tank.status,
        tank.pumpCount.toString()
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Tank', 'Product', 'Opening', 'Addition', 'Total', 'Expected Closing', 'Dip Closing', 'Sales', 'Variance', 'Status', 'Pumps']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 20, halign: 'right' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 25 },
          10: { cellWidth: 15, halign: 'center' }
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
      doc.save(`reconciliation_${stationName.replace(/\s+/g, '_')}_${shiftNum}_${new Date().toISOString().split('T')[0]}.pdf`);
      message.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error('Failed to generate PDF');
    }
  };

  // Handle view tank details
  const handleViewTankDetails = (tank) => {
    setViewingTank(tank);
    setViewModalVisible(true);
  };
  
  // Generate report
  const generateReport = () => {
    if (!processedData?.tanks?.length) {
      message.warning('No data available to generate report');
      return;
    }
    
    const stationName = processedData.shiftInfo?.station?.name || 'Unknown Station';
    const shiftNum = processedData.shiftInfo?.shiftNumber || shiftNumber || 'Unknown Shift';
    
    // Create report data
    const reportData = processedData.tanks.map((tank, index) => ({
      '#': index + 1,
      'Shift': shiftNum,
      'Station': stationName,
      'Tank': tank.tankName,
      'Product': tank.productName,
      'Opening (L)': tank.openingVolume,
      'Addition (L)': tank.addition,
      'Total (L)': tank.totalVolume,
      'Expected Closing (L)': tank.expectedClosing,
      'Dip Closing (L)': tank.closingVolume,
      'Sales (L)': tank.expectedDeduction,
      'Variance (L)': tank.variance,
      'Pumps': tank.pumpCount,
      'Status': tank.status
    }));
    
    // Summary data
    const summaryData = {
      'Station Name': stationName,
      'Shift Number': shiftNum,
      'Shift Status': processedData.shiftInfo?.status || 'N/A',
      'Start Time': processedData.shiftInfo?.startTime ? formatDate(processedData.shiftInfo.startTime) : 'N/A',
      'End Time': processedData.shiftInfo?.endTime ? formatDate(processedData.shiftInfo.endTime) : 'N/A',
      'Supervisor': processedData.shiftInfo?.supervisor?.name || 'N/A',
      'Total Tanks': processedData.tanks.length,
      'Total Opening': formatVolume(processedData.totals?.totalOpening || 0),
      'Total Addition': formatVolume(processedData.totals?.totalAddition || 0),
      'Total Volume': formatVolume(processedData.totals?.totalVolume || 0),
      'Total Expected Closing': formatVolume(processedData.totals?.totalExpectedClosing || 0),
      'Total Dip Closing': formatVolume(processedData.totals?.totalClosing || 0),
      'Total Sales': formatVolume(processedData.totals?.totalExpectedDeduction || 0),
      'Total Variance': `${processedData.totals?.totalVariance?.toFixed(1)} L`,
      'Total Offloads': formatVolume(processedData.totals?.totalOffloadVolume || 0),
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated At': new Date().toLocaleTimeString('en-KE')
    };
    
    const exportColumns = [
      { title: '#', dataIndex: '#', key: 'index', width: 40, type: 'number' },
      { title: 'Shift', dataIndex: 'Shift', key: 'shift', width: 80, type: 'text' },
      { title: 'Station', dataIndex: 'Station', key: 'station', width: 100, type: 'text' },
      { title: 'Tank', dataIndex: 'Tank', key: 'tank', width: 100, type: 'text' },
      { title: 'Product', dataIndex: 'Product', key: 'product', width: 80, type: 'text' },
      { title: 'Opening (L)', dataIndex: 'Opening (L)', key: 'opening', width: 70, type: 'volume' },
      { title: 'Addition (L)', dataIndex: 'Addition (L)', key: 'addition', width: 70, type: 'volume' },
      { title: 'Total (L)', dataIndex: 'Total (L)', key: 'total', width: 70, type: 'volume' },
      { title: 'Expected Closing (L)', dataIndex: 'Expected Closing (L)', key: 'expectedClosing', width: 80, type: 'volume' },
      { title: 'Dip Closing (L)', dataIndex: 'Dip Closing (L)', key: 'dipClosing', width: 80, type: 'volume' },
      { title: 'Sales (L)', dataIndex: 'Sales (L)', key: 'sales', width: 70, type: 'volume' },
      { title: 'Variance (L)', dataIndex: 'Variance (L)', key: 'variance', width: 70, type: 'volume' },
      { title: 'Pumps', dataIndex: 'Pumps', key: 'pumps', width: 50, type: 'number' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 80, type: 'text' }
    ];
    
    const title = `Shift Reconciliation - ${stationName} - Shift ${shiftNum}`;
    
    const config = {
      dataSource: reportData,
      columns: exportColumns,
      summaryData: summaryData,
      title: title,
      fileName: `reconciliation_${stationName.replace(/\s+/g, '_')}_${shiftNum}_${new Date().toISOString().split('T')[0]}`,
      reportType: 'reconciliation',
      companyName: "Lynx Energy System",
      stationInfo: processedData.shiftInfo?.station ? {
        name: processedData.shiftInfo.station.name,
        address: processedData.shiftInfo.station.location
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | Station: ${stationName} | Shift: ${shiftNum} | ${new Date().toLocaleString('en-KE')}`,
      showGrandTotals: true,
      grandTotals: {
        'Opening (L)': processedData.totals?.totalOpening || 0,
        'Addition (L)': processedData.totals?.totalAddition || 0,
        'Total (L)': processedData.totals?.totalVolume || 0,
        'Expected Closing (L)': processedData.totals?.totalExpectedClosing || 0,
        'Dip Closing (L)': processedData.totals?.totalClosing || 0,
        'Sales (L)': processedData.totals?.totalExpectedDeduction || 0,
        'Variance (L)': processedData.totals?.totalVariance || 0
      }
    };
    
    setReportConfig(config);
    setReportTitle(title);
    setReportModalVisible(true);
  };
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      productFilter: 'all',
      statusFilter: 'all'
    });
  };
  
  // Go back function
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Calculate total width for responsive check
  const tableWidth = useMemo(() => {
    return tankColumns.reduce((total, col) => {
      return total + (col.width || 0);
    }, 400); // Base width
  }, []);
  
  if (!shiftId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <HistoryOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
          <Text type="secondary">
            No shift data provided. Please select a shift first.
          </Text>
          <div style={{ marginTop: '16px' }}>
            <Button type="primary" onClick={handleGoBack}>
              Go Back
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4" style={{ padding: '16px' }}>
      {/* Header with Back Button */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={14}>
            <div>
              <Space size="middle" align="center" style={{ marginBottom: '8px' }}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={handleGoBack}
                  type="text"
                  size="small"
                >
                  Back
                </Button>
                <Title level={2} style={{ margin: 0, fontSize: '20px' }}>
                  <DiffOutlined /> Shift Reconciliation
                </Title>
              </Space>
              <Space wrap>
                <Text type="secondary">
                  Shift: <Tag color="blue">{processedData?.shiftInfo?.shiftNumber || shiftNumber || 'N/A'}</Tag>
                </Text>
                <Text type="secondary">
                  Station: <Text strong>{processedData?.shiftInfo?.station?.name || 'Unknown Station'}</Text>
                </Text>
                <Text type="secondary">
                  Status: 
                  <Badge 
                    status={processedData?.shiftStatusColor || 'default'} 
                    text={processedData?.shiftStatus || processedData?.shiftInfo?.status || 'UNKNOWN'} 
                    style={{ marginLeft: '4px' }}
                  />
                </Text>
              </Space>
            </div>
          </Col>
          <Col xs={24} md={10}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={generatePDF}
                  type="primary"
                  ghost
                >
                  PDF
                </Button>
              </Col>
              <Col>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'report',
                        label: 'Advanced Report',
                        icon: <FileTextOutlined />,
                        onClick: generateReport
                      },
                      {
                        key: 'refresh',
                        label: 'Refresh Data',
                        icon: <ReloadOutlined />,
                        onClick: () => fetchReconciliationData(shiftId)
                      }
                    ]
                  }}
                >
                  <Button icon={<DownloadOutlined />}>
                    Export
                  </Button>
                </Dropdown>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>
      
      {/* Statistics Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#e6f7ff' }}>
            <Statistic
              title="Total Tanks"
              value={processedData?.tanks?.length || 0}
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#f6ffed' }}>
            <Statistic
              title="Total Pumps"
              value={processedData?.totals?.totalPumps || 0}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              prefix={<CalculatorOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#fff7e6' }}>
            <Statistic
              title="Opening"
              value={processedData?.totals?.totalOpening || 0}
              precision={0}
              valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
              suffix="L"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#f6ffed' }}>
            <Statistic
              title="Addition"
              value={processedData?.totals?.totalAddition || 0}
              precision={0}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              suffix="L"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#f9f0ff' }}>
            <Statistic
              title="Total Volume"
              value={processedData?.totals?.totalVolume || 0}
              precision={0}
              valueStyle={{ color: '#722ed1', fontSize: '20px' }}
              suffix="L"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#fff1f0' }}>
            <Statistic
              title="Dip Closing"
              value={processedData?.totals?.totalClosing || 0}
              precision={0}
              valueStyle={{ color: '#f5222d', fontSize: '20px' }}
              suffix="L"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card size="small" style={{ height: '100%', background: '#f6ffed' }}>
            <Statistic
              title="Sales"
              value={processedData?.totals?.totalExpectedDeduction || 0}
              precision={0}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              suffix="L"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={3}>
          <Card 
            size="small" 
            style={{ 
              height: '100%', 
              background: Math.abs(processedData?.totals?.totalVariance || 0) < 30 ? '#f6ffed' : '#fff2f0'
            }}
          >
            <Statistic
              title="Variance"
              value={processedData?.totals?.totalVariance || 0}
              precision={1}
              valueStyle={{ 
                color: Math.abs(processedData?.totals?.totalVariance || 0) < 30 ? '#52c41a' : '#f5222d',
                fontSize: '20px',
                fontWeight: 'bold'
              }}
              suffix="L"
            />
          </Card>
        </Col>
      </Row>
      
      {/* Compact Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search tank or product..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<SearchOutlined />}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Product"
              value={filters.productFilter}
              onChange={(value) => setFilters(prev => ({ ...prev, productFilter: value }))}
              allowClear
              size="small"
            >
              <Option value="all">All Products</Option>
              {uniqueProducts.map(product => (
                <Option key={product} value={product}>
                  {product}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.statusFilter}
              onChange={(value) => setFilters(prev => ({ ...prev, statusFilter: value }))}
              allowClear
              size="small"
            >
              <Option value="all">All Status</Option>
              {uniqueStatuses.map(status => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4} md={3}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && filters.productFilter === 'all' && filters.statusFilter === 'all'}
                size="small"
              >
                Clear
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => fetchReconciliationData(shiftId)}
                loading={loading}
                size="small"
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* Main Table */}
      <Card bodyStyle={{ padding: '12px' }}>
        <div style={{ marginBottom: '12px' }}>
          <Space>
            <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
              Tank Reconciliation Details
            </Title>
            <Badge 
              count={filteredTankData.length} 
              style={{ backgroundColor: '#1890ff', fontSize: '10px' }} 
              showZero 
            />
            {filters.search && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Filtered for "{filters.search}"
              </Text>
            )}
          </Space>
        </div>
        
        {filteredTankData.length === 0 ? (
          <Empty description="No tank reconciliation data found" />
        ) : (
          <Table
            columns={tankColumns}
            dataSource={filteredTankData}
            loading={loading}
            rowKey="tankId"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: false,
              showTotal: (total, range) => (
                <span style={{ fontSize: '12px' }}>
                  {range[0]}-{range[1]} of {total}
                </span>
              ),
              size: 'small',
              simple: true
            }}
            scroll={{ x: tableWidth }}
            size="small"
            bordered
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '12px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      Connected Pumps ({record.pumpDetails?.length || 0})
                    </Text>
                  </div>
                  
                  {record.pumpDetails?.length > 0 ? (
                    <Table
                      columns={pumpDetailColumns}
                      dataSource={record.pumpDetails}
                      pagination={false}
                      size="small"
                      rowKey={(r, i) => i}
                      summary={() => (
                        <Table.Summary fixed>
                          <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                            <Table.Summary.Cell index={0} colSpan={3} align="right">
                              <Text strong>Pump Total:</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              <Text strong type="success">
                                {record.expectedDeduction.toLocaleString()} L
                              </Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} colSpan={2}>
                              {/* Empty for other columns */}
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  ) : (
                    <Empty description="No pump data available for this tank" />
                  )}
                  
                  {record.hasOffload && (
                    <Alert
                      message="Offload Detected"
                      description={
                        <div>
                          <Text>Offload Volume: <Text strong>{formatVolume(record.offloadVolume)}</Text></Text>
                          <div style={{ marginTop: '8px' }}>
                            {record.offloads?.map((offload, idx) => (
                              <Tag key={idx} color="purple">
                                {offload.receivingNumber || 'Offload'} - {formatVolume(offload.actualVolume)}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      }
                      type="info"
                      showIcon
                      style={{ marginTop: '12px' }}
                    />
                  )}
                </div>
              ),
              expandIcon: ({ expanded, onExpand, record }) => (
                <Button
                  type="text"
                  size="small"
                  icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
                  onClick={(e) => onExpand(record, e)}
                />
              ),
              rowExpandable: (record) => record.pumpDetails?.length > 0 || record.hasOffload,
            }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ 
                  fontWeight: 'bold', 
                  background: '#f0f5ff',
                  fontSize: '12px'
                }}>
                  <Table.Summary.Cell index={0} colSpan={2} align="right">
                    <Text strong>TOTALS ({filteredTankData.length} tanks):</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong>{processedData?.totals?.totalOpening?.toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong style={{ color: '#52c41a' }}>{processedData?.totals?.totalAddition?.toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong style={{ color: '#722ed1' }}>{processedData?.totals?.totalVolume?.toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong style={{ color: '#1890ff' }}>{processedData?.totals?.totalExpectedClosing?.toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong type="danger">{processedData?.totals?.totalClosing?.toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <Text strong type="success">{processedData?.totals?.totalExpectedDeduction?.toLocaleString()} L</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <Text 
                      strong 
                      type={Math.abs(processedData?.totals?.totalVariance) < 30 ? 'success' : 'danger'}
                    >
                      {processedData?.totals?.totalVariance?.toFixed(1)} L
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} colSpan={3}>
                    {/* Empty for status, pumps, and actions */}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>
      
      {/* Verification Status Card */}
      {processedData?.verification && (
        <Row gutter={16}>
          <Col span={24}>
            <Card size="small" title="Verification Status">
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircleOutlined style={{ color: processedData.verification?.isFullyReconciled ? '#52c41a' : '#d9d9d9', fontSize: '16px' }} />
                    <Text>Fully Reconciled: {processedData.verification?.isFullyReconciled ? 'Yes' : 'No'}</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WarningOutlined style={{ color: processedData.verification?.missingReadings?.length > 0 ? '#faad14' : '#d9d9d9', fontSize: '16px' }} />
                    <Text>Missing Readings: {processedData.verification?.missingReadings?.length || 0}</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <InfoCircleOutlined style={{ color: processedData.verification?.alerts?.length > 0 ? '#f5222d' : '#d9d9d9', fontSize: '16px' }} />
                    <Text>Alerts: {processedData.verification?.alerts?.length || 0}</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}
      
      {/* View Tank Details Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            Tank Reconciliation Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingTank(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={900}
      >
        {viewingTank ? (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Tank Information</Title>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Tank Name:</Text>
                    <br />
                    <Text>{viewingTank.tankName || 'Unknown'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Product:</Text>
                    <br />
                    <Tag color={viewingTank.productColor}>{viewingTank.productName}</Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Capacity:</Text>
                    <br />
                    <Text>{formatVolume(viewingTank.capacity)}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text>
                    <br />
                    <Badge status={viewingTank.statusColor} text={viewingTank.status} />
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Divider orientation="left">Volume Readings</Divider>
                <Row gutter={[16, 8]}>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#fff7e6' }}>
                      <Statistic 
                        title="Opening" 
                        value={viewingTank.openingVolume}
                        suffix="L"
                        precision={0}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#f6ffed' }}>
                      <Statistic 
                        title="Addition" 
                        value={viewingTank.addition}
                        suffix="L"
                        precision={0}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#f9f0ff' }}>
                      <Statistic 
                        title="Total" 
                        value={viewingTank.totalVolume}
                        suffix="L"
                        precision={0}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#e6f7ff' }}>
                      <Statistic 
                        title="Expected Closing" 
                        value={viewingTank.expectedClosing}
                        suffix="L"
                        precision={0}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[16, 8]} style={{ marginTop: '8px' }}>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#fff1f0' }}>
                      <Statistic 
                        title="Dip Closing" 
                        value={viewingTank.closingVolume}
                        suffix="L"
                        precision={0}
                        valueStyle={{ color: '#f5222d' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#f6ffed' }}>
                      <Statistic 
                        title="Sales" 
                        value={viewingTank.expectedDeduction}
                        suffix="L"
                        precision={0}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ background: Math.abs(viewingTank.variance) < 30 ? '#f6ffed' : '#fff2f0' }}>
                      <Statistic 
                        title="Variance" 
                        value={viewingTank.variance}
                        suffix="L"
                        precision={1}
                        valueStyle={{ 
                          color: Math.abs(viewingTank.variance) < 30 ? '#52c41a' : '#f5222d',
                          fontWeight: 'bold'
                        }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Divider orientation="left">Connected Pumps</Divider>
                {viewingTank.pumpDetails?.length > 0 ? (
                  <Table
                    columns={pumpDetailColumns}
                    dataSource={viewingTank.pumpDetails}
                    pagination={false}
                    size="small"
                    rowKey={(r, i) => i}
                  />
                ) : (
                  <Empty description="No pump data available" />
                )}
              </Col>
              
              {viewingTank.hasOffload && (
                <Col span={24}>
                  <Divider orientation="left">Offload Information</Divider>
                  <Alert
                    message="Offload Detected"
                    description={
                      <div>
                        <Text>Offload Volume: <Text strong>{formatVolume(viewingTank.offloadVolume)}</Text></Text>
                        {viewingTank.offloads?.map((offload, idx) => (
                          <Card key={idx} size="small" style={{ marginTop: '8px' }}>
                            <Row gutter={[8, 8]}>
                              <Col span={12}>
                                <Text type="secondary">Receiving #:</Text>
                                <br />
                                <Text>{offload.receivingNumber || 'N/A'}</Text>
                              </Col>
                              <Col span={12}>
                                <Text type="secondary">Actual Volume:</Text>
                                <br />
                                <Text strong>{formatVolume(offload.actualVolume)}</Text>
                              </Col>
                              <Col span={12}>
                                <Text type="secondary">Driver:</Text>
                                <br />
                                <Text>{offload.driverName || 'N/A'}</Text>
                              </Col>
                              <Col span={12}>
                                <Text type="secondary">Status:</Text>
                                <br />
                                <Tag color={offload.status === 'COMPLETED' ? 'green' : 'orange'}>
                                  {offload.status}
                                </Tag>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </Col>
              )}
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReconciliationReadings;