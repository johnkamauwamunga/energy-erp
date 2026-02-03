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
  Tabs,
  Divider,
  Empty,
  Dropdown,
  Progress
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  BarChartOutlined,
  ExportOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FireOutlined,
  DollarOutlined,
  CalculatorOutlined,
  UserOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { shiftReadingService } from '../../../../../services/shiftReadingService/shiftReadingService';
import dayjs from 'dayjs';
import AdvancedReportGenerator from '../../../common/downloadable/AdvancedReportGenerator';

const { Option } = Select;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const PumpMeterReadings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract shift and station data from navigation state
  const { shiftId, stationId, shiftNumber } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [pumpData, setPumpData] = useState([]);
  const [shiftInfo, setShiftInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  
  // Report states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  
  // View details modal
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingPump, setViewingPump] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    productFilter: 'all'
  });
  
  const fetchPumpReadings = async (id) => {
    if (!id) {
      message.error('Shift ID is required');
      return;
    }
    
    setLoading(true);
    try {
      const response = await shiftReadingService.getPumpReadingsSummary(id);
      console.log("the response data ", response.data);
      
      const { pumpsData, shiftData, summary } = response.data;
      
      setPumpData(pumpsData || []);
      setShiftInfo(shiftData);
      setSummary(summary);
      
      message.success(`Loaded ${pumpsData?.length || 0} pump readings`);
    } catch (error) {
      console.log("error ", error);
      message.error(`Failed to load pump readings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (shiftId) {
      fetchPumpReadings(shiftId);
    } else {
      message.warning('No shift data provided. Please select a shift first.');
      navigate(-1); // Go back if no shift data
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
  
  // Calculate differential
  const calculateDifferential = (start, end) => {
    if (start === undefined || end === undefined) return 0;
    return parseFloat(end) - parseFloat(start);
  };
  
  // Filtered pump data
  const filteredPumpData = useMemo(() => {
    let data = [...(pumpData || [])];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(pump =>
        pump.pumpInfo?.name?.toLowerCase().includes(searchLower) ||
        pump.pumpInfo?.tank?.product?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Product filter
    if (filters.productFilter !== 'all') {
      data = data.filter(pump =>
        pump.pumpInfo?.tank?.product?.id === filters.productFilter
      );
    }
    
    return data;
  }, [pumpData, filters]);
  
  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    if (!pumpData) return [];
    
    const productsMap = new Map();
    pumpData.forEach(pump => {
      const product = pump.pumpInfo?.tank?.product;
      if (product && product.id) {
        productsMap.set(product.id, product);
      }
    });
    
    return Array.from(productsMap.values());
  }, [pumpData]);
  
  // Table columns
  const pumpReadingsColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      fixed: 'left',
      render: (_, record, index) => (
        <div style={{ textAlign: 'center', fontWeight: '500' }}>
          {index + 1}
        </div>
      )
    },
    {
      title: 'Pump Name',
      key: 'pumpName',
      width: 120,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '13px' }}>
            <FireOutlined style={{ fontSize: '10px', marginRight: '4px', color: '#ff4d4f' }} />
            {record.pumpInfo?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Island: {record.pumpInfo?.island || 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'Product',
      key: 'product',
      width: 120,
      render: (_, record) => {
        const product = record.pumpInfo?.tank?.product;
        const colorCode = product?.colorCode || '#1890ff';
        
        return (
          <div>
            <div style={{ fontWeight: '500', fontSize: '12px' }}>
              <Tag color={colorCode} style={{ marginRight: '4px', fontSize: '8px', padding: '0 4px' }}>
                ●
              </Tag>
              {product?.name || 'Unknown'}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Code: {product?.fuelCode || 'N/A'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Unit Cost',
      key: 'unitCost',
      width: 90,
      align: 'right',
      render: (_, record) => {
        const unitPrice = record.readings?.endReading?.unitPrice || 
                         record.readings?.calculated?.unitPrice ||
                         record.pumpInfo?.tank?.product?.minSellingPrice;
        
        return (
          <div style={{ color: '#52c41a', fontWeight: '500', fontSize: '12px' }}>
            {formatCurrency(unitPrice || 0)}
          </div>
        );
      }
    },
    {
      title: 'Cash Meter',
      key: 'cashMeter',
      width: 140,
      children: [
        {
          title: 'Start',
          key: 'cashStart',
          width: 70,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontWeight: '500' }}>
              {record.readings?.startReading?.cashMeter?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          title: 'Closing',
          key: 'cashEnd',
          width: 70,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontWeight: '500', color: '#1890ff' }}>
              {record.readings?.endReading?.cashMeter?.toLocaleString() || '0'}
            </div>
          )
        }
      ]
    },
    {
      title: 'Manual Meter',
      key: 'manualMeter',
      width: 140,
      children: [
        {
          title: 'Start',
          key: 'manualStart',
          width: 70,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontWeight: '500' }}>
              {record.readings?.startReading?.manualMeter?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          title: 'Closing',
          key: 'manualEnd',
          width: 70,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontWeight: '500', color: '#1890ff' }}>
              {record.readings?.endReading?.manualMeter?.toLocaleString() || '0'}
            </div>
          )
        }
      ]
    },
    {
      title: 'Electric Meter',
      key: 'electricMeter',
      width: 140,
      children: [
        {
          title: 'Start',
          key: 'electricStart',
          width: 70,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontWeight: '500' }}>
              {record.readings?.startReading?.electricMeter?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          title: 'Closing',
          key: 'electricEnd',
          width: 70,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontWeight: '500', color: '#1890ff' }}>
              {record.readings?.endReading?.electricMeter?.toLocaleString() || '0'}
            </div>
          )
        }
      ]
    },
    {
      title: 'Liters Dispensed',
      key: 'litersDispensed',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#1890ff' }}>
            {formatVolume(record.readings?.calculated?.litersDispensed || 
                         record.readings?.endReading?.litersDispensed || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Diff: {calculateDifferential(
              record.readings?.startReading?.electricMeter,
              record.readings?.endReading?.electricMeter
            ).toLocaleString()}
          </div>
        </div>
      )
    },
    {
      title: 'Sales Value',
      key: 'salesValue',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <div style={{ fontWeight: '600', fontSize: '13px', color: '#cf1322' }}>
          {formatCurrency(record.readings?.calculated?.salesValue || 
                         record.readings?.endReading?.salesValue || 0)}
        </div>
      )
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      width: 120,
      render: (_, record) => {
        const recordedBy = record.readings?.endReading?.recordedBy || 
                          record.readings?.startReading?.recordedBy;
        
        return (
          <div>
            <div style={{ fontSize: '11px' }}>
              {recordedBy ? 
                `${recordedBy.firstName || ''} ${recordedBy.lastName || ''}`.trim() : 
                'N/A'}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {record.readings?.endReading?.recordedAt ? 
                formatDate(record.readings.endReading.recordedAt).split(' ')[1] : 
                'N/A'}
            </div>
          </div>
        );
      }
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
          onClick={() => {
            setViewingPump(record);
            setViewModalVisible(true);
          }}
        />
      )
    }
  ];
  
  // Handle view pump details
  const handleViewPumpDetails = (pump) => {
    setViewingPump(pump);
    setViewModalVisible(true);
  };
  
  // Generate report
  const generateReport = () => {
    if (!filteredPumpData.length) {
      message.warning('No data available to generate report');
      return;
    }
    
    const stationName = shiftInfo?.station?.name || 'Unknown Station';
    const shiftNum = shiftInfo?.shiftNumber || shiftNumber || 'Unknown Shift';
    
    const reportData = filteredPumpData.map((pump, index) => {
      const product = pump.pumpInfo?.tank?.product;
      const startReading = pump.readings?.startReading;
      const endReading = pump.readings?.endReading;
      const calculated = pump.readings?.calculated;
      
      return {
        '#': index + 1,
        'Pump Name': pump.pumpInfo?.name || 'Unknown',
        'Product': product?.name || 'Unknown',
        'Fuel Code': product?.fuelCode || 'N/A',
        'Unit Price': formatCurrency(endReading?.unitPrice || calculated?.unitPrice || 0),
        'Cash Start': startReading?.cashMeter || 0,
        'Cash Closing': endReading?.cashMeter || 0,
        'Cash Differential': calculated?.cashDifferential || calculateDifferential(startReading?.cashMeter, endReading?.cashMeter),
        'Manual Start': startReading?.manualMeter || 0,
        'Manual Closing': endReading?.manualMeter || 0,
        'Manual Differential': calculated?.manualDifferential || calculateDifferential(startReading?.manualMeter, endReading?.manualMeter),
        'Electric Start': startReading?.electricMeter || 0,
        'Electric Closing': endReading?.electricMeter || 0,
        'Electric Differential': calculated?.electricDifferential || calculateDifferential(startReading?.electricMeter, endReading?.electricMeter),
        'Liters Dispensed': formatVolume(endReading?.litersDispensed || calculated?.litersDispensed || 0),
        'Sales Value': formatCurrency(endReading?.salesValue || calculated?.salesValue || 0),
        'Recorded By': endReading?.recordedBy ? 
          `${endReading.recordedBy.firstName || ''} ${endReading.recordedBy.lastName || ''}`.trim() : 
          'N/A',
        'Recorded At': endReading?.recordedAt ? formatDate(endReading.recordedAt) : 'N/A'
      };
    });
    
    const summaryData = {
      'Station Name': stationName,
      'Shift Number': shiftNum,
      'Shift Status': shiftInfo?.status || 'N/A',
      'Start Time': shiftInfo?.startTime ? formatDate(shiftInfo.startTime) : 'N/A',
      'End Time': shiftInfo?.endTime ? formatDate(shiftInfo.endTime) : 'N/A',
      'Supervisor': shiftInfo?.supervisor ? 
        `${shiftInfo.supervisor.firstName} ${shiftInfo.supervisor.lastName}` : 'N/A',
      'Total Pumps': summary?.totalPumps || 0,
      'Total Liters Dispensed': formatVolume(summary?.totalLitersDispensed || 0),
      'Total Sales Value': formatCurrency(summary?.totalSalesValue || 0),
      'Average Unit Price': formatCurrency(summary?.avgUnitPrice || 0),
      'Products Count': summary?.productBreakdown?.length || 0,
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated At': new Date().toLocaleTimeString('en-KE')
    };
    
    const exportColumns = [
      { title: '#', dataIndex: '#', key: 'index', width: 50 },
      { title: 'Pump Name', dataIndex: 'Pump Name', key: 'pumpName', width: 120 },
      { title: 'Product', dataIndex: 'Product', key: 'product', width: 100 },
      { title: 'Fuel Code', dataIndex: 'Fuel Code', key: 'fuelCode', width: 80 },
      { title: 'Unit Price', dataIndex: 'Unit Price', key: 'unitPrice', width: 90, type: 'currency' },
      { title: 'Cash Start', dataIndex: 'Cash Start', key: 'cashStart', width: 80, type: 'number' },
      { title: 'Cash Closing', dataIndex: 'Cash Closing', key: 'cashEnd', width: 80, type: 'number' },
      { title: 'Cash Diff', dataIndex: 'Cash Differential', key: 'cashDiff', width: 80, type: 'number' },
      { title: 'Manual Start', dataIndex: 'Manual Start', key: 'manualStart', width: 80, type: 'number' },
      { title: 'Manual Closing', dataIndex: 'Manual Closing', key: 'manualEnd', width: 80, type: 'number' },
      { title: 'Manual Diff', dataIndex: 'Manual Differential', key: 'manualDiff', width: 80, type: 'number' },
      { title: 'Electric Start', dataIndex: 'Electric Start', key: 'electricStart', width: 80, type: 'number' },
      { title: 'Electric Closing', dataIndex: 'Electric Closing', key: 'electricEnd', width: 80, type: 'number' },
      { title: 'Electric Diff', dataIndex: 'Electric Differential', key: 'electricDiff', width: 80, type: 'number' },
      { title: 'Liters Dispensed', dataIndex: 'Liters Dispensed', key: 'litersDispensed', width: 90, type: 'volume' },
      { title: 'Sales Value', dataIndex: 'Sales Value', key: 'salesValue', width: 100, type: 'currency' },
      { title: 'Recorded By', dataIndex: 'Recorded By', key: 'recordedBy', width: 120 },
      { title: 'Recorded At', dataIndex: 'Recorded At', key: 'recordedAt', width: 120, type: 'datetime' }
    ];
    
    const title = `Pump Meter Readings - ${stationName} - Shift ${shiftNum}`;
    
    const config = {
      dataSource: reportData,
      columns: exportColumns,
      summaryData: summaryData,
      title: title,
      fileName: `pump_meter_readings_${stationName.replace(/\s+/g, '_')}_${shiftNum}_${new Date().toISOString().split('T')[0]}`,
      reportType: 'pump-readings',
      companyName: shiftInfo?.station?.company || "Lynx Energy System",
      stationInfo: shiftInfo?.station ? {
        name: shiftInfo.station.name,
        code: shiftInfo.station.code,
        address: shiftInfo.station.location
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | Station: ${stationName} | Shift: ${shiftNum} | ${new Date().toLocaleString('en-KE')}`,
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
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      productFilter: 'all'
    });
  };
  
  // Go back function
  const handleGoBack = () => {
    navigate(-1);
  };
  
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
    <div className="space-y-4">
      {/* Header with Back Button */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
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
                <Title level={2} style={{ margin: 0 }}>
                  <CalculatorOutlined /> Pump Meter Readings
                </Title>
              </Space>
              <Text type="secondary">
                Shift: <Tag color="blue">{shiftInfo?.shiftNumber || shiftNumber || 'N/A'}</Tag> | 
                Station: <Text strong>{shiftInfo?.station?.name || 'Unknown Station'}</Text> | 
                Status: <Tag color={shiftInfo?.status === 'CLOSED' ? 'green' : 'orange'}>
                  {shiftInfo?.status || 'UNKNOWN'}
                </Tag>
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
                        onClick: generateReport
                      },
                      {
                        key: 'refresh',
                        label: 'Refresh Data',
                        icon: <ReloadOutlined />,
                        onClick: () => fetchPumpReadings(shiftId)
                      }
                    ]
                  }}
                >
                  <Button icon={<DownloadOutlined />}>
                    Actions
                  </Button>
                </Dropdown>
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
              title="Total Pumps"
              value={summary?.totalPumps || 0}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Liters"
              value={summary?.totalLitersDispensed || 0}
              precision={2}
              suffix="L"
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Sales"
              value={summary?.totalSalesValue || 0}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#cf1322', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Avg Price/L"
              value={summary?.avgUnitPrice || 0}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#faad14', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Shift Duration"
              value={
                shiftInfo?.startTime && shiftInfo?.endTime ? 
                `${dayjs(shiftInfo.endTime).diff(dayjs(shiftInfo.startTime), 'hours')}h` : 
                'N/A'
              }
              valueStyle={{ color: '#722ed1', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Products"
              value={summary?.productBreakdown?.length || 0}
              valueStyle={{ color: '#13c2c2', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search pumps or products..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<SearchOutlined />}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by product"
              value={filters.productFilter}
              onChange={(value) => setFilters(prev => ({ ...prev, productFilter: value }))}
              allowClear
              size="small"
            >
              <Option value="all">All Products</Option>
              {uniqueProducts.map(product => (
                <Option key={product.id} value={product.id}>
                  <Tag color={product.colorCode || '#1890ff'} style={{ marginRight: '4px', fontSize: '8px', padding: '0 4px' }}>
                    ●
                  </Tag>
                  {product.name} ({product.fuelCode || 'N/A'})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && filters.productFilter === 'all'}
                size="small"
              >
                Clear Filters
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => fetchPumpReadings(shiftId)}
                loading={loading}
                size="small"
              >
                Refresh
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Button 
              icon={<FileTextOutlined />}
              onClick={generateReport}
              disabled={filteredPumpData.length === 0}
              type="primary"
              size="small"
              style={{ width: '100%' }}
            >
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>
      
      {/* Main Table */}
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Pump Readings Summary
            </Title>
            <Badge 
              count={filteredPumpData.length} 
              style={{ backgroundColor: '#1890ff' }} 
              showZero 
            />
            {filters.search && (
              <Text type="secondary">
                Filtered results for "{filters.search}"
              </Text>
            )}
          </Space>
        </div>
        
        {filteredPumpData.length === 0 ? (
          <Empty description="No pump readings found" />
        ) : (
          <Table
            columns={pumpReadingsColumns}
            dataSource={filteredPumpData}
            loading={loading}
            rowKey={(record) => record.pumpInfo?.id || Math.random()}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `Showing ${range[0]}-${range[1]} of ${total} pumps`,
              size: 'small'
            }}
            scroll={{ x: 1500 }}
            size="small"
            bordered
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 'bold', background: '#fafafa' }}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <div style={{ textAlign: 'center' }}>TOTALS</div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    {formatCurrency(summary?.avgUnitPrice || 0)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={6} align="right">
                    {/* Empty for meter columns */}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    <div style={{ color: '#1890ff', fontWeight: '600' }}>
                      {formatVolume(summary?.totalLitersDispensed || 0)}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    <div style={{ color: '#cf1322', fontWeight: '600' }}>
                      {formatCurrency(summary?.totalSalesValue || 0)}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} colSpan={2}>
                    {/* Empty for recorded by and actions */}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>
      
      {/* View Pump Details Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            Pump Reading Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingPump(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {viewingPump ? (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Pump Information</Title>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Pump Name:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.name || 'Unknown'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Pump ID:</Text>
                    <br />
                    <Text type="secondary">{viewingPump.pumpInfo?.id || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Island:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.island || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Connected Tank:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.tank?.asset?.name || 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Product Information</Title>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Product Name:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.tank?.product?.name || 'Unknown'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Fuel Code:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.tank?.product?.fuelCode || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Density:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.tank?.product?.density || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Unit:</Text>
                    <br />
                    <Text>{viewingPump.pumpInfo?.tank?.product?.unit || 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Start Reading</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>Cash Meter:</Text>
                    <br />
                    <Text>{viewingPump.readings?.startReading?.cashMeter?.toLocaleString() || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Manual Meter:</Text>
                    <br />
                    <Text>{viewingPump.readings?.startReading?.manualMeter?.toLocaleString() || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Electric Meter:</Text>
                    <br />
                    <Text>{viewingPump.readings?.startReading?.electricMeter?.toLocaleString() || '0'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded By:</Text>
                    <br />
                    <Text>
                      {viewingPump.readings?.startReading?.recordedBy ? 
                        `${viewingPump.readings.startReading.recordedBy.firstName || ''} 
                        ${viewingPump.readings.startReading.recordedBy.lastName || ''}`.trim() : 
                        'N/A'}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded At:</Text>
                    <br />
                    <Text>{viewingPump.readings?.startReading?.recordedAt ? 
                      formatDate(viewingPump.readings.startReading.recordedAt) : 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>End Reading</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>Cash Meter:</Text>
                    <br />
                    <Text>{viewingPump.readings?.endReading?.cashMeter?.toLocaleString() || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Manual Meter:</Text>
                    <br />
                    <Text>{viewingPump.readings?.endReading?.manualMeter?.toLocaleString() || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Electric Meter:</Text>
                    <br />
                    <Text>{viewingPump.readings?.endReading?.electricMeter?.toLocaleString() || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Liters Dispensed:</Text>
                    <br />
                    <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      {formatVolume(viewingPump.readings?.endReading?.litersDispensed || 0)}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Sales Value:</Text>
                    <br />
                    <Text style={{ color: '#cf1322', fontWeight: 'bold' }}>
                      {formatCurrency(viewingPump.readings?.endReading?.salesValue || 0)}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Unit Price:</Text>
                    <br />
                    <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      {formatCurrency(viewingPump.readings?.endReading?.unitPrice || 0)}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded By:</Text>
                    <br />
                    <Text>
                      {viewingPump.readings?.endReading?.recordedBy ? 
                        `${viewingPump.readings.endReading.recordedBy.firstName || ''} 
                        ${viewingPump.readings.endReading.recordedBy.lastName || ''}`.trim() : 
                        'N/A'}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded At:</Text>
                    <br />
                    <Text>{viewingPump.readings?.endReading?.recordedAt ? 
                      formatDate(viewingPump.readings.endReading.recordedAt) : 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Calculated Values</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>Cash Differential:</Text>
                    <br />
                    <Text>{viewingPump.readings?.calculated?.cashDifferential?.toLocaleString() || 
                      calculateDifferential(
                        viewingPump.readings?.startReading?.cashMeter,
                        viewingPump.readings?.endReading?.cashMeter
                      ).toLocaleString()}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Manual Differential:</Text>
                    <br />
                    <Text>{viewingPump.readings?.calculated?.manualDifferential?.toLocaleString() || 
                      calculateDifferential(
                        viewingPump.readings?.startReading?.manualMeter,
                        viewingPump.readings?.endReading?.manualMeter
                      ).toLocaleString()}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Electric Differential:</Text>
                    <br />
                    <Text>{viewingPump.readings?.calculated?.electricDifferential?.toLocaleString() || 
                      calculateDifferential(
                        viewingPump.readings?.startReading?.electricMeter,
                        viewingPump.readings?.endReading?.electricMeter
                      ).toLocaleString()}</Text>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">Loading pump details...</Text>
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
              key={`pump-readings-report-${Date.now()}`}
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

export default PumpMeterReadings;