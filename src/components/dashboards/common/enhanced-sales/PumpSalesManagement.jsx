import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  DatePicker,
  Badge,
  Typography,
  Tabs,
  Progress,
  Divider,
  Empty,
  Dropdown
} from 'antd';
import {
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  ShopOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ProductOutlined,
  FireOutlined,
  DashboardOutlined,
  LineChartOutlined,
  ExportOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { enhancedSalesService, GROUPING_TYPES, PERIOD_TYPES } from '../../../../services/enhancedSalesService/enhancedSalesService';
import { useApp } from '../../../../context/AppContext';

// Import AdvancedReportGenerator (adjust path as needed)
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const PumpSalesManagement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [shiftPerformance, setShiftPerformance] = useState([]);
  const [salesTrends, setSalesTrends] = useState({});
  const [activeTab, setActiveTab] = useState('pump-sales');
  
  // Report states for each tab
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  
  const [filters, setFilters] = useState({
    search: '',
    groupBy: '',
    period: PERIOD_TYPES.DAILY,
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    if (!userStationId) {
      message.warning('Please select a station first');
      return;
    }

    setLoading(true);
    try {
      const baseFilters = {
        stationId: userStationId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy,
        page: pagination.page,
        limit: pagination.limit
      };

      switch (activeTab) {
        case 'pump-sales':
          const pumpSalesResult = await enhancedSalesService.getCalculatedPumpSales(baseFilters);
          setSalesData(pumpSalesResult.data || []);
          setPagination(prev => ({
            ...prev,
            total: pumpSalesResult.pagination?.total || pumpSalesResult.data?.length || 0
          }));
          break;

        case 'product-sales':
          const productResult = await enhancedSalesService.getProductPerformance(baseFilters);
          setProductPerformance(productResult.data || []);
          break;

        case 'shift-performance':
          const shiftResult = await enhancedSalesService.getShiftPerformance(baseFilters);
          setShiftPerformance(shiftResult.data || []);
          break;

        case 'sales-trends':
          const trendsResult = await enhancedSalesService.getSalesTrends(baseFilters);
          setSalesTrends(trendsResult.data || {});
          break;

        default:
          break;
      }
    } catch (error) {
      message.error(`Failed to load ${activeTab.replace('-', ' ')} data: ${error.message}`);
      console.error(`❌ Error loading ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  }, [userStationId, activeTab, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle view details
  const handleViewDetails = (record) => {
    setViewingRecord(record);
    setViewModalVisible(true);
  };

  // Handle date range change
  const handleDateRangeChange = (dates, dateStrings) => {
    setFilters(prev => ({
      ...prev,
      startDate: dateStrings[0] || '',
      endDate: dateStrings[1] || '',
      page: 1
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      groupBy: '',
      period: PERIOD_TYPES.DAILY,
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
    setPagination({
      page: 1,
      limit: 20,
      total: 0
    });
  };

  // ==================== REPORT GENERATION ====================

  const generateReportForCurrentTab = () => {
    let dataSource = [];
    let columns = [];
    let title = '';
    
    switch (activeTab) {
      case 'pump-sales':
        dataSource = salesData;
        columns = getPumpSalesExportColumns();
        title = `Pump Sales Report - ${state.currentStation?.name || 'All Stations'}`;
        break;
      case 'product-sales':
        dataSource = productPerformance;
        columns = getProductPerformanceExportColumns();
        title = `Product Performance Report - ${state.currentStation?.name || 'All Stations'}`;
        break;
      case 'shift-performance':
        dataSource = shiftPerformance;
        columns = getShiftPerformanceExportColumns();
        title = `Shift Performance Report - ${state.currentStation?.name || 'All Stations'}`;
        break;
      default:
        return;
    }
    
    if (dataSource.length === 0) {
      message.warning('No data available to generate report');
      return;
    }
    
    const exportData = prepareExportData(dataSource, activeTab);
    const summaryData = calculateSummaryData(dataSource, activeTab);
    
    const config = {
      dataSource: exportData,
      columns: columns,
      summaryData: summaryData,
      title: title,
      fileName: `${activeTab}_report_${new Date().toISOString().split('T')[0]}`,
      reportType: 'sales',
      companyName: state.currentCompany?.name || "Lynx Energy System",
      stationInfo: state.currentStation ? {
        name: state.currentStation.name,
        code: state.currentStation.code,
        address: state.currentStation.location
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | Station: ${state.currentStation?.name || 'All'} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true
    };
    
    setReportConfig(config);
    setReportTitle(title);
    setReportModalVisible(true);
  };

  const handleReportComplete = (format) => {
    message.success(`${reportTitle} generated successfully as ${format.toUpperCase()}!`);
    setReportModalVisible(false);
    setReportConfig(null);
  };

  // Prepare export data for each tab
  const prepareExportData = (data, tab) => {
    switch (tab) {
      case 'pump-sales':
        return data.map(item => ({
          'Pump Name': item.pump?.asset?.name || item.pump?.name || 'Unknown',
          'Product': item.product?.name || 'Unknown',
          'Fuel Code': item.product?.fuelCode || 'N/A',
          'Shift Number': item.shift?.shiftNumber || 'N/A',
          'Revenue': enhancedSalesService.formatCurrency(item.salesData?.salesValue || 0),
          'Volume (L)': enhancedSalesService.formatVolume(item.salesData?.litersDispensed || 0),
          'Unit Price': enhancedSalesService.formatCurrency(item.salesData?.unitPrice || 0),
          'Opening Meter': item.salesData?.openingMeter || 0,
          'Closing Meter': item.salesData?.closingMeter || 0,
          'Station': item.station?.name || 'Unknown',
          'Calculated At': enhancedSalesService.formatDate(item.salesData?.calculatedAt)
        }));
        
      case 'product-sales':
        return data.map(item => ({
          'Product Name': item.product?.name || 'Unknown',
          'Fuel Code': item.product?.fuelCode || 'N/A',
          'Total Revenue': enhancedSalesService.formatCurrency(item.metrics?.totalRevenue || 0),
          'Total Volume (L)': enhancedSalesService.formatVolume(item.metrics?.totalLiters || 0),
          'Average Price/L': enhancedSalesService.formatCurrency(item.metrics?.averagePrice || 0),
          'Pump Count': item.metrics?.pumpCount || 0,
          'Shift Count': item.metrics?.shiftCount || 0,
          'Sales Records': item.sales?.length || 0
        }));
        
      case 'shift-performance':
        return data.map(item => ({
          'Shift Number': item.shift?.shiftNumber || 'Unknown',
          'Start Time': enhancedSalesService.formatDate(item.shift?.startTime),
          'Supervisor': item.shift?.supervisor ? 
            `${item.shift.supervisor.firstName} ${item.shift.supervisor.lastName}` : 'N/A',
          'Total Revenue': enhancedSalesService.formatCurrency(item.metrics?.totalRevenue || 0),
          'Total Volume (L)': enhancedSalesService.formatVolume(item.metrics?.totalLiters || 0),
          'Average per Pump': enhancedSalesService.formatCurrency(item.metrics?.averageRevenuePerPump || 0),
          'Active Pumps': item.metrics?.pumpCount || 0,
          'Products Sold': item.metrics?.productCount || 0,
          'Sales Records': item.sales?.length || 0
        }));
        
      default:
        return [];
    }
  };

  // Calculate summary data for each tab
  const calculateSummaryData = (data, tab) => {
    const baseSummary = {
      'Station': state.currentStation?.name || 'All Stations',
      'Company': state.currentCompany?.name || 'All Companies',
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated By': state.currentUser ? 
        `${state.currentUser.firstName} ${state.currentUser.lastName}` : 'System',
      'User Role': state.currentUser?.role || 'N/A',
      'Total Records': data.length
    };
    
    switch (tab) {
      case 'pump-sales':
        const pumpSalesSummary = {
          ...baseSummary,
          'Total Revenue': enhancedSalesService.formatCurrency(
            data.reduce((sum, item) => sum + (item.salesData?.salesValue || 0), 0)
          ),
          'Total Volume (L)': enhancedSalesService.formatVolume(
            data.reduce((sum, item) => sum + (item.salesData?.litersDispensed || 0), 0)
          ),
          'Unique Pumps': [...new Set(data.map(item => item.pump?.id).filter(Boolean))].length,
          'Unique Products': [...new Set(data.map(item => item.product?.id).filter(Boolean))].length
        };
        return pumpSalesSummary;
        
      case 'product-sales':
        const productSummary = {
          ...baseSummary,
          'Total Revenue': enhancedSalesService.formatCurrency(
            data.reduce((sum, item) => sum + (item.metrics?.totalRevenue || 0), 0)
          ),
          'Total Volume (L)': enhancedSalesService.formatVolume(
            data.reduce((sum, item) => sum + (item.metrics?.totalLiters || 0), 0)
          ),
          'Product Count': data.length
        };
        return productSummary;
        
      case 'shift-performance':
        const shiftSummary = {
          ...baseSummary,
          'Total Revenue': enhancedSalesService.formatCurrency(
            data.reduce((sum, item) => sum + (item.metrics?.totalRevenue || 0), 0)
          ),
          'Total Volume (L)': enhancedSalesService.formatVolume(
            data.reduce((sum, item) => sum + (item.metrics?.totalLiters || 0), 0)
          ),
          'Shift Count': data.length,
          'Average Revenue per Shift': enhancedSalesService.formatCurrency(
            data.reduce((sum, item) => sum + (item.metrics?.totalRevenue || 0), 0) / data.length || 0
          )
        };
        return shiftSummary;
        
      default:
        return baseSummary;
    }
  };

  // Get export columns for each tab
  const getPumpSalesExportColumns = () => [
    { title: 'Pump Name', dataIndex: 'Pump Name', key: 'pumpName', width: 120 },
    { title: 'Product', dataIndex: 'Product', key: 'product', width: 100 },
    { title: 'Fuel Code', dataIndex: 'Fuel Code', key: 'fuelCode', width: 80 },
    { title: 'Shift Number', dataIndex: 'Shift Number', key: 'shiftNumber', width: 80 },
    { title: 'Revenue', dataIndex: 'Revenue', key: 'revenue', width: 100, type: 'currency' },
    { title: 'Volume (L)', dataIndex: 'Volume (L)', key: 'volume', width: 80, type: 'number' },
    { title: 'Unit Price', dataIndex: 'Unit Price', key: 'unitPrice', width: 80, type: 'currency' },
    { title: 'Opening Meter', dataIndex: 'Opening Meter', key: 'openingMeter', width: 80, type: 'number' },
    { title: 'Closing Meter', dataIndex: 'Closing Meter', key: 'closingMeter', width: 80, type: 'number' },
    { title: 'Station', dataIndex: 'Station', key: 'station', width: 120 },
    { title: 'Calculated At', dataIndex: 'Calculated At', key: 'calculatedAt', width: 120, type: 'datetime' }
  ];

  const getProductPerformanceExportColumns = () => [
    { title: 'Product Name', dataIndex: 'Product Name', key: 'productName', width: 120 },
    { title: 'Fuel Code', dataIndex: 'Fuel Code', key: 'fuelCode', width: 80 },
    { title: 'Total Revenue', dataIndex: 'Total Revenue', key: 'totalRevenue', width: 100, type: 'currency' },
    { title: 'Total Volume (L)', dataIndex: 'Total Volume (L)', key: 'totalVolume', width: 80, type: 'number' },
    { title: 'Average Price/L', dataIndex: 'Average Price/L', key: 'averagePrice', width: 80, type: 'currency' },
    { title: 'Pump Count', dataIndex: 'Pump Count', key: 'pumpCount', width: 60, type: 'number' },
    { title: 'Shift Count', dataIndex: 'Shift Count', key: 'shiftCount', width: 60, type: 'number' },
    { title: 'Sales Records', dataIndex: 'Sales Records', key: 'salesRecords', width: 60, type: 'number' }
  ];

  const getShiftPerformanceExportColumns = () => [
    { title: 'Shift Number', dataIndex: 'Shift Number', key: 'shiftNumber', width: 80 },
    { title: 'Start Time', dataIndex: 'Start Time', key: 'startTime', width: 120, type: 'datetime' },
    { title: 'Supervisor', dataIndex: 'Supervisor', key: 'supervisor', width: 120 },
    { title: 'Total Revenue', dataIndex: 'Total Revenue', key: 'totalRevenue', width: 100, type: 'currency' },
    { title: 'Total Volume (L)', dataIndex: 'Total Volume (L)', key: 'totalVolume', width: 80, type: 'number' },
    { title: 'Average per Pump', dataIndex: 'Average per Pump', key: 'avgPerPump', width: 80, type: 'currency' },
    { title: 'Active Pumps', dataIndex: 'Active Pumps', key: 'activePumps', width: 60, type: 'number' },
    { title: 'Products Sold', dataIndex: 'Products Sold', key: 'productsSold', width: 60, type: 'number' },
    { title: 'Sales Records', dataIndex: 'Sales Records', key: 'salesRecords', width: 60, type: 'number' }
  ];

  // Statistics for dashboard
  const stats = useMemo(() => {
    let dataSource = [];
    
    switch (activeTab) {
      case 'pump-sales':
        dataSource = salesData;
        break;
      case 'product-sales':
        dataSource = productPerformance;
        break;
      case 'shift-performance':
        dataSource = shiftPerformance;
        break;
      default:
        dataSource = salesData;
    }

    const totalRevenue = dataSource.reduce((sum, item) => {
      if (item.type === 'product' || item.type === 'shift') {
        return sum + (item.metrics?.totalRevenue || 0);
      }
      return sum + (item.salesData?.salesValue || item.metrics?.totalRevenue || 0);
    }, 0);
    
    const totalLiters = dataSource.reduce((sum, item) => {
      if (item.type === 'product' || item.type === 'shift') {
        return sum + (item.metrics?.totalLiters || 0);
      }
      return sum + (item.salesData?.litersDispensed || item.metrics?.totalLiters || 0);
    }, 0);
    
    const uniquePumps = [...new Set(dataSource.map(item => {
      const pump = item.pump || (item.sales?.[0]?.pump);
      return pump?.id;
    }).filter(Boolean))].length;

    const uniqueProducts = [...new Set(dataSource.map(item => {
      const product = item.product || (item.sales?.[0]?.product);
      return product?.id;
    }).filter(Boolean))].length;

    const uniqueShifts = [...new Set(dataSource.map(item => {
      const shift = item.shift || (item.sales?.[0]?.shift);
      return shift?.id;
    }).filter(Boolean))].length;

    return {
      totalRevenue,
      totalLiters,
      uniquePumps,
      uniqueProducts,
      uniqueShifts,
      averagePrice: totalLiters > 0 ? totalRevenue / totalLiters : 0,
      recordCount: dataSource.length
    };
  }, [salesData, productPerformance, shiftPerformance, activeTab]);

  // ==================== OPTIMIZED TABLE COLUMNS ====================

  const pumpSalesColumns = [
    {
      title: 'Pump',
      dataIndex: 'pump',
      key: 'pump',
      width: 140,
      fixed: 'left',
      render: (pump) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '13px' }}>
            <FireOutlined style={{ fontSize: '10px', marginRight: '4px', color: '#ff4d4f' }} />
            {pump?.asset?.name || pump?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {pump?.asset?.stationLabel || pump?.label || ''}
          </div>
        </div>
      )
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      width: 100,
      render: (product) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>{product?.name || 'Unknown'}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{product?.fuelCode || 'N/A'}</div>
        </div>
      )
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      width: 80,
      render: (shift) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '500', fontSize: '13px', color: '#1890ff' }}>
            #{shift?.shiftNumber || '-'}
          </div>
        </div>
      )
    },
    {
      title: 'Revenue',
      key: 'revenue',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#cf1322' }}>
            {enhancedSalesService.formatCurrency(record.salesData?.salesValue || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {enhancedSalesService.formatVolume(record.salesData?.litersDispensed || 0)}
          </div>
        </div>
      )
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <div style={{ color: '#52c41a', fontWeight: '500', fontSize: '12px' }}>
          {enhancedSalesService.formatCurrency(record.salesData?.unitPrice || 0)}/L
        </div>
      )
    },
    {
      title: 'Meters',
      key: 'meters',
      width: 110,
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          <div>Open: {record.salesData?.openingMeter || 0}</div>
          <div>Close: {record.salesData?.closingMeter || 0}</div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          icon={<EyeOutlined />} 
          size="small"
          type="text"
          onClick={() => handleViewDetails(record)}
        />
      )
    }
  ];

  const productPerformanceColumns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      width: 140,
      fixed: 'left',
      render: (product) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '13px' }}>
            <ProductOutlined style={{ fontSize: '10px', marginRight: '4px', color: '#1890ff' }} />
            {product?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>Code: {product?.fuelCode || 'N/A'}</div>
        </div>
      )
    },
    {
      title: 'Revenue',
      key: 'revenue',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#cf1322' }}>
            {enhancedSalesService.formatCurrency(record.metrics?.totalRevenue || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {enhancedSalesService.formatVolume(record.metrics?.totalLiters || 0)}
          </div>
        </div>
      )
    },
    {
      title: 'Avg Price',
      key: 'avgPrice',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <div style={{ color: '#52c41a', fontWeight: '500', fontSize: '12px' }}>
          {enhancedSalesService.formatCurrency(record.metrics?.averagePrice || 0)}/L
        </div>
      )
    },
    {
      title: 'Pumps/Shifts',
      key: 'counts',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          <div>Pumps: <Badge count={record.metrics?.pumpCount || 0} style={{ backgroundColor: '#1890ff' }} /></div>
          <div>Shifts: <Badge count={record.metrics?.shiftCount || 0} style={{ backgroundColor: '#52c41a' }} /></div>
        </div>
      )
    },
    {
      title: 'Market Share',
      key: 'share',
      width: 120,
      render: (_, record) => {
        const totalRevenue = productPerformance.reduce((sum, r) => sum + (r.metrics?.totalRevenue || 0), 0);
        const share = totalRevenue > 0 ? ((record.metrics?.totalRevenue || 0) / totalRevenue) * 100 : 0;
        
        return (
          <div>
            <Progress 
              percent={Math.round(share)} 
              size="small" 
              strokeColor={record === productPerformance[0] ? '#52c41a' : '#1890ff'}
              style={{ marginBottom: '4px' }}
            />
            <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
              {Math.round(share)}%
            </div>
          </div>
        );
      }
    }
  ];

  const shiftPerformanceColumns = [
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      width: 140,
      fixed: 'left',
      render: (shift) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '13px', color: '#1890ff' }}>
            🕐 #{shift?.shiftNumber || 'Unknown'}
          </div>
          {shift?.startTime && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              {enhancedSalesService.formatDate(shift.startTime)}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Revenue',
      key: 'revenue',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#cf1322' }}>
            {enhancedSalesService.formatCurrency(record.metrics?.totalRevenue || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {enhancedSalesService.formatVolume(record.metrics?.totalLiters || 0)}
          </div>
        </div>
      )
    },
    {
      title: 'Avg/Pump',
      key: 'avgPerPump',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <div style={{ color: '#52c41a', fontWeight: '500', fontSize: '12px' }}>
          {enhancedSalesService.formatCurrency(record.metrics?.averageRevenuePerPump || 0)}
        </div>
      )
    },
    {
      title: 'Activity',
      key: 'activity',
      width: 120,
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          <div>
            Pumps: <Badge count={record.metrics?.pumpCount || 0} style={{ backgroundColor: '#1890ff' }} />
          </div>
          <div>
            Products: <Badge count={record.metrics?.productCount || 0} style={{ backgroundColor: '#52c41a' }} />
          </div>
          <div>
            Records: <Badge count={record.sales?.length || 0} style={{ backgroundColor: '#faad14' }} />
          </div>
        </div>
      )
    },
    {
      title: 'Supervisor',
      key: 'supervisor',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: '11px' }}>
          {record.shift?.supervisor ? 
            `${record.shift.supervisor.firstName} ${record.shift.supervisor.lastName}` : 
            'N/A'
          }
        </div>
      )
    }
  ];

  // Chart Components (keep as is)
  const ProductSalesChart = () => {
    if (!productPerformance.length) {
      return (
        <Card>
          <Empty description="No product performance data available" />
        </Card>
      );
    }

    return (
      <Card title="Product Sales Performance" extra={<BarChartOutlined />}>
        <Row gutter={[16, 16]}>
          {productPerformance.slice(0, 8).map((product, index) => {
            const metrics = product.metrics || {};
            const totalRevenue = productPerformance.reduce((sum, r) => sum + (r.metrics?.totalRevenue || 0), 0);
            const share = totalRevenue > 0 ? ((metrics.totalRevenue || 0) / totalRevenue) * 100 : 0;
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.product?.id || index}>
                <Card size="small">
                  <div>
                    <Text strong ellipsis={{ tooltip: product.product?.name }}>
                      {product.product?.name || 'Unknown Product'}
                    </Text>
                    <Progress 
                      percent={Math.min(100, share)} 
                      strokeColor={index === 0 ? '#52c41a' : '#1890ff'}
                      style={{ margin: '8px 0' }}
                    />
                    <Text strong style={{ color: '#cf1322' }}>
                      {enhancedSalesService.formatCurrency(metrics.totalRevenue || 0)}
                    </Text>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {enhancedSalesService.formatVolume(metrics.totalLiters || 0)}
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  const RevenueTrendsChart = () => {
    if (!salesTrends.dates || !salesTrends.series) {
      return (
        <Card>
          <Empty description="No sales trends data available" />
        </Card>
      );
    }

    return (
      <Card title="Revenue Trends Over Time" extra={<LineChartOutlined />}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Text strong>Revenue Trends by Date</Text>
              <div style={{ marginTop: '10px' }}>
                {salesTrends.dates?.slice(0, 10).map((date, index) => (
                  <div key={date} style={{ 
                    marginBottom: '8px', 
                    padding: '8px', 
                    background: 'white', 
                    borderRadius: '4px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Space>
                      <CalendarOutlined />
                      <Text>{date}</Text>
                      <Text strong>
                        {enhancedSalesService.formatCurrency(
                          salesTrends.series?.[0]?.data?.[index] || 0
                        )}
                      </Text>
                    </Space>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  if (!userStationId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <DashboardOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
          <Text type="secondary">
            Please select a station to view sales data
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <DashboardOutlined /> Sales Analytics Dashboard
              </Title>
              <Text type="secondary">
                Comprehensive sales analysis for {state.currentStation?.name}
              </Text>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'report',
                        label: 'Generate Report',
                        icon: <FileTextOutlined />,
                        onClick: generateReportForCurrentTab
                      },
                      {
                        key: 'export',
                        label: 'Export Data',
                        icon: <ExportOutlined />,
                        onClick: () => {
                          enhancedSalesService.exportToCSV(
                            { data: salesData }, 
                            `sales-data-${state.currentStation?.name}-${new Date().toISOString().split('T')[0]}`
                          );
                          message.success('Data exported successfully');
                        }
                      }
                    ]
                  }}
                >
                  <Button icon={<DownloadOutlined />}>
                    Export
                  </Button>
                </Dropdown>
              </Col>
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadData}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#cf1322', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Volume"
              value={stats.totalLiters}
              precision={2}
              suffix="L"
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Active Pumps"
              value={stats.uniquePumps}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Products Sold"
              value={stats.uniqueProducts}
              valueStyle={{ color: '#faad14', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Shifts Analyzed"
              value={stats.uniqueShifts}
              valueStyle={{ color: '#722ed1', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Avg Price/L"
              value={stats.averagePrice}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#13c2c2', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Group By"
              value={filters.groupBy}
              onChange={(value) => handleFilterChange('groupBy', value)}
              allowClear
              size="small"
            >
              <Option value={GROUPING_TYPES.PRODUCT}>By Product</Option>
              <Option value={GROUPING_TYPES.SHIFT}>By Shift</Option>
              <Option value={GROUPING_TYPES.PRODUCT_SHIFT}>Product per Shift</Option>
              <Option value={GROUPING_TYPES.PUMP}>By Pump</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Period"
              value={filters.period}
              onChange={(value) => handleFilterChange('period', value)}
              size="small"
            >
              <Option value={PERIOD_TYPES.DAILY}>Daily</Option>
              <Option value={PERIOD_TYPES.WEEKLY}>Weekly</Option>
              <Option value={PERIOD_TYPES.MONTHLY}>Monthly</Option>
              <Option value={PERIOD_TYPES.QUARTERLY}>Quarterly</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              size="small"
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && !filters.groupBy && !filters.startDate}
                size="small"
              >
                Clear Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
          tabBarExtraContent={
            <Button 
              icon={<FileTextOutlined />}
              onClick={generateReportForCurrentTab}
              size="small"
            >
              Generate Report
            </Button>
          }
        >
          <TabPane 
            tab={
              <span>
                <FireOutlined />
                Pump Sales
                {salesData.length > 0 && (
                  <Badge count={salesData.length} style={{ marginLeft: 6 }} size="small" />
                )}
              </span>
            } 
            key="pump-sales"
          >
            <Table
              columns={pumpSalesColumns}
              dataSource={salesData}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} sales records`,
                size: 'small',
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ 
                    ...prev, 
                    page, 
                    limit: pageSize 
                  }));
                  handleFilterChange('page', page);
                  handleFilterChange('limit', pageSize);
                }
              }}
              scroll={{ x: 800 }}
              size="small"
              bordered
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <ProductOutlined />
                Product Performance
                {productPerformance.length > 0 && (
                  <Badge count={productPerformance.length} style={{ marginLeft: 6 }} size="small" />
                )}
              </span>
            } 
            key="product-sales"
          >
            <Table
              columns={productPerformanceColumns}
              dataSource={productPerformance}
              loading={loading}
              rowKey={record => record.product?.id || record.id}
              pagination={false}
              scroll={{ x: 700 }}
              size="small"
              bordered
            />
            
            <Divider />
            
            <ProductSalesChart />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CalendarOutlined />
                Shift Performance
                {shiftPerformance.length > 0 && (
                  <Badge count={shiftPerformance.length} style={{ marginLeft: 6 }} size="small" />
                )}
              </span>
            } 
            key="shift-performance"
          >
            <Table
              columns={shiftPerformanceColumns}
              dataSource={shiftPerformance}
              loading={loading}
              rowKey={record => record.shift?.id || record.id}
              pagination={false}
              scroll={{ x: 700 }}
              size="small"
              bordered
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Analytics & Trends
              </span>
            } 
            key="sales-trends"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ProductSalesChart />
              </Col>
              <Col xs={24} lg={12}>
                <RevenueTrendsChart />
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* View Details Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            Sales Record Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingRecord(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {viewingRecord ? (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={4} style={{ marginBottom: 16 }}>Pump Information</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Pump Name:</Text>
                  <br />
                  <Text>{viewingRecord.pump?.asset?.name || viewingRecord.pump?.name || 'Unknown'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Connection Status:</Text>
                  <br />
                  <Tag color={viewingRecord.pump?.connectionStatus === 'FULLY_CONNECTED' ? 'green' : 'orange'}>
                    {viewingRecord.pump?.connectionStatus || 'UNKNOWN'}
                  </Tag>
                </Col>
              </Row>
            </Col>

            <Col span={24}>
              <Title level={4} style={{ marginBottom: 16 }}>Product Information</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Product Name:</Text>
                  <br />
                  <Text>{viewingRecord.product?.name || 'Unknown'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Fuel Code:</Text>
                  <br />
                  <Text>{viewingRecord.product?.fuelCode || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Unit Price:</Text>
                  <br />
                  <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    {enhancedSalesService.formatCurrency(viewingRecord.product?.minSellingPrice || 0)}/L
                  </Text>
                </Col>
              </Row>
            </Col>

            <Col span={24}>
              <Title level={4} style={{ marginBottom: 16 }}>Sales Data</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Total Revenue:</Text>
                  <br />
                  <Text strong style={{ color: '#cf1322' }}>
                    {enhancedSalesService.formatCurrency(viewingRecord.salesData?.salesValue || 0)}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Liters Dispensed:</Text>
                  <br />
                  <Text>
                    {enhancedSalesService.formatVolume(viewingRecord.salesData?.litersDispensed || 0)}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Unit Price:</Text>
                  <br />
                  <Text style={{ color: '#52c41a' }}>
                    {enhancedSalesService.formatCurrency(viewingRecord.salesData?.unitPrice || 0)}/L
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Meter Readings:</Text>
                  <br />
                  <Text>
                    {viewingRecord.salesData?.openingMeter || 0} → {viewingRecord.salesData?.closingMeter || 0}
                  </Text>
                </Col>
              </Row>
            </Col>
          </Row>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">Loading record details...</Text>
          </div>
        )}
      </Modal>

      {/* Report Generator Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>{reportTitle}</span>
            <Tag color="blue">{reportConfig?.dataSource?.length || 0} records</Tag>
          </Space>
        }
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          setReportConfig(null);
        }}
        width="90%"
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
      >
        {reportConfig && (
          <div style={{ padding: '20px 0' }}>
            <AdvancedReportGenerator
              key={`sales-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={handleReportComplete}
              onSettingsSave={(settings) => {
                console.log('Report settings saved:', settings);
                message.success('Report settings saved successfully!');
              }}
            />
            
            <Divider />
            
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button 
                onClick={() => {
                  setReportModalVisible(false);
                  setReportConfig(null);
                }}
              >
                Close
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PumpSalesManagement;