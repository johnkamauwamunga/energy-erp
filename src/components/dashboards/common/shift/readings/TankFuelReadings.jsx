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
  Progress,
  Alert
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
  DatabaseOutlined,
  FireOutlined,
  DollarOutlined,
  CalculatorOutlined,
  UserOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  DashboardOutlined,
  LineChartOutlined,
  PercentageOutlined,
  ArrowsAltOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { shiftReadingService } from '../../../../../services/shiftReadingService/shiftReadingService';
import dayjs from 'dayjs';
import AdvancedReportGenerator from '../../../common/downloadable/AdvancedReportGenerator';

const { Option } = Select;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const TankFuelReadings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract shift and station data from navigation state
  const { shiftId, stationId, shiftNumber } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [tankData, setTankData] = useState([]);
  const [shiftInfo, setShiftInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  
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
    productFilter: 'all'
  });

  // Fetch tank readings function
  const fetchTankReadings = async (id) => {
    if (!id) {
      message.error('Shift ID is required');
      return;
    }
    
    setLoading(true);
    try {
      const response = await shiftReadingService.getTankReadingsSummary(id);
      console.log("tank response summary ", response.data);
      
      const { tanksData, shiftData, summary } = response.data;
      
      setTankData(tanksData || []);
      setShiftInfo(shiftData);
      setSummary(summary);
      
      message.success(`Loaded ${tanksData?.length || 0} tank readings`);
    } catch (error) {
      console.log("error ", error);
      message.error(`Failed to load tank readings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (shiftId) {
      fetchTankReadings(shiftId);
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
  
  // Calculate volume reduction percentage
  const calculateReductionPercentage = (startVolume, endVolume) => {
    if (!startVolume || startVolume === 0) return 0;
    const reduction = parseFloat(startVolume) - parseFloat(endVolume);
    return (reduction / parseFloat(startVolume)) * 100;
  };
  
  // Get tank status based on volume reduction
  const getTankStatus = (tank) => {
    const startVolume = tank.readings?.startReading?.volume || 0;
    const endVolume = tank.readings?.endReading?.volume || 0;
    const reduction = startVolume - endVolume;
    const percentageReduction = tank.readings?.calculated?.percentageReduction || 
                                calculateReductionPercentage(startVolume, endVolume);
    
    if (percentageReduction < 5) {
      return { status: 'low', text: 'Low Dispensing', color: 'green' };
    } else if (percentageReduction < 15) {
      return { status: 'normal', text: 'Normal', color: 'blue' };
    } else if (percentageReduction < 30) {
      return { status: 'high', text: 'High Dispensing', color: 'orange' };
    } else {
      return { status: 'very-high', text: 'Very High', color: 'red' };
    }
  };
  
  // Filtered tank data
  const filteredTankData = useMemo(() => {
    let data = [...(tankData || [])];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(tank =>
        tank.tankInfo?.name?.toLowerCase().includes(searchLower) ||
        tank.tankInfo?.product?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Product filter
    if (filters.productFilter !== 'all') {
      data = data.filter(tank =>
        tank.tankInfo?.product?.id === filters.productFilter
      );
    }
    
    return data;
  }, [tankData, filters]);
  
  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    if (!tankData) return [];
    
    const productsMap = new Map();
    tankData.forEach(tank => {
      const product = tank.tankInfo?.product;
      if (product && product.id) {
        productsMap.set(product.id, product);
      }
    });
    
    return Array.from(productsMap.values());
  }, [tankData]);
  
  // Calculate total reduction
  const totalReduction = useMemo(() => {
    return filteredTankData.reduce((total, tank) => {
      const reduction = tank.readings?.calculated?.volumeReduction || 0;
      return total + parseFloat(reduction);
    }, 0);
  }, [filteredTankData]);
  
  // Calculate total closing volume
  const totalClosingVolume = useMemo(() => {
    return filteredTankData.reduce((total, tank) => {
      const volume = tank.readings?.endReading?.volume || 0;
      return total + parseFloat(volume);
    }, 0);
  }, [filteredTankData]);
  
  // Calculate total opening volume
  const totalOpeningVolume = useMemo(() => {
    return filteredTankData.reduce((total, tank) => {
      const volume = tank.readings?.startReading?.volume || 0;
      return total + parseFloat(volume);
    }, 0);
  }, [filteredTankData]);
  
  // Table columns
  const tankReadingsColumns = [
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
      title: 'Tank Name',
      key: 'tankName',
      width: 130,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '13px' }}>
            <DatabaseOutlined style={{ fontSize: '10px', marginRight: '4px', color: '#722ed1' }} />
            {record.tankInfo?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Capacity: {record.tankInfo?.capacity?.toLocaleString() || '0'} L
          </div>
        </div>
      )
    },
    {
      title: 'Product',
      key: 'product',
      width: 130,
      render: (_, record) => {
        const product = record.tankInfo?.product;
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
      title: 'Opening Volume',
      key: 'openingVolume',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <div style={{ fontWeight: '500', fontSize: '12px' }}>
          {formatVolume(record.readings?.startReading?.volume || 0)}
        </div>
      )
    },
    {
      title: 'Closing Volume',
      key: 'closingVolume',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <div style={{ fontWeight: '500', fontSize: '12px', color: '#1890ff' }}>
          {formatVolume(record.readings?.endReading?.volume || 0)}
        </div>
      )
    },
    {
      title: 'Volume Reduction',
      key: 'volumeReduction',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const reduction = record.readings?.calculated?.volumeReduction || 0;
        return (
          <div>
            <div style={{ fontWeight: '600', fontSize: '13px', color: '#cf1322' }}>
              {formatVolume(reduction)}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Density: {record.readings?.calculated?.densityChange || record.readings?.endReading?.density || 'N/A'}
            </div>
          </div>
        );
      }
    },
    {
      title: '% Reduction',
      key: 'percentageReduction',
      width: 90,
      align: 'right',
      render: (_, record) => {
        const percentage = record.readings?.calculated?.percentageReduction || 
                          calculateReductionPercentage(
                            record.readings?.startReading?.volume,
                            record.readings?.endReading?.volume
                          );
        const status = getTankStatus(record);
        
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag 
              color={status.color} 
              style={{ 
                margin: 0, 
                padding: '2px 8px', 
                fontSize: '11px',
                fontWeight: '600'
              }}
            >
              {percentage.toFixed(2)}%
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Temperature',
      key: 'temperature',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            Start: {record.readings?.startReading?.temperature || 'N/A'}°C
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            End: {record.readings?.endReading?.temperature || 'N/A'}°C
          </div>
        </div>
      )
    },
    {
      title: 'Connected Pumps',
      key: 'connectedPumps',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <Tag color="blue" style={{ margin: 0 }}>
            {record.tankInfo?.pumps?.length || 0}
          </Tag>
          <div style={{ fontSize: '10px', color: '#666' }}>
            pumps
          </div>
        </div>
      )
    },
    {
      title: 'Verification',
      key: 'verification',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <Badge 
            status={record.readings?.endReading?.isVerified ? "success" : "warning"} 
            text={
              <span style={{ fontSize: '11px' }}>
                {record.readings?.endReading?.isVerified ? 'Verified' : 'Pending'}
              </span>
            } 
          />
        </div>
      )
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      width: 120,
      render: (_, record) => {
        const recordedBy = record.readings?.endReading?.recordedBy;
        
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
            setViewingTank(record);
            setViewModalVisible(true);
          }}
        />
      )
    }
  ];
  
  // Generate report
  const generateReport = () => {
    if (!filteredTankData.length) {
      message.warning('No data available to generate report');
      return;
    }
    
    const stationName = shiftInfo?.station?.name || 'Unknown Station';
    const shiftNum = shiftInfo?.shiftNumber || shiftNumber || 'Unknown Shift';
    
    const reportData = filteredTankData.map((tank, index) => {
      const product = tank.tankInfo?.product;
      const startReading = tank.readings?.startReading;
      const endReading = tank.readings?.endReading;
      const calculated = tank.readings?.calculated;
      const status = getTankStatus(tank);
      
      return {
        '#': index + 1,
        'Tank Name': tank.tankInfo?.name || 'Unknown',
        'Product': product?.name || 'Unknown',
        'Fuel Code': product?.fuelCode || 'N/A',
        'Tank Capacity': tank.tankInfo?.capacity ? `${tank.tankInfo.capacity} L` : 'N/A',
        'Opening Volume': formatVolume(startReading?.volume || 0),
        'Closing Volume': formatVolume(endReading?.volume || 0),
        'Volume Reduction': formatVolume(calculated?.volumeReduction || 0),
        'Percentage Reduction': `${(calculated?.percentageReduction || 
          calculateReductionPercentage(startReading?.volume, endReading?.volume)).toFixed(2)}%`,
        'Density': calculated?.densityChange || endReading?.density || 'N/A',
        'Temperature': `${startReading?.temperature || 'N/A'}°C → ${endReading?.temperature || 'N/A'}°C`,
        'Water Level': `${startReading?.waterLevel || 0} → ${endReading?.waterLevel || 0}`,
        'Connected Pumps': tank.tankInfo?.pumps?.length || 0,
        'Status': status.text,
        'Verification': endReading?.isVerified ? 'Verified' : 'Pending',
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
      'Total Tanks': summary?.totalTanks || 0,
      'Total Opening Volume': formatVolume(totalOpeningVolume),
      'Total Closing Volume': formatVolume(totalClosingVolume),
      'Total Volume Reduction': formatVolume(totalReduction),
      'Average % Reduction': `${(summary?.totalTanks ? totalReduction / totalOpeningVolume * 100 : 0).toFixed(2)}%`,
      'Products Count': summary?.productBreakdown?.length || 0,
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated At': new Date().toLocaleTimeString('en-KE')
    };
    
    const exportColumns = [
      { title: '#', dataIndex: '#', key: 'index', width: 50 },
      { title: 'Tank Name', dataIndex: 'Tank Name', key: 'tankName', width: 120 },
      { title: 'Product', dataIndex: 'Product', key: 'product', width: 100 },
      { title: 'Fuel Code', dataIndex: 'Fuel Code', key: 'fuelCode', width: 80 },
      { title: 'Capacity', dataIndex: 'Tank Capacity', key: 'capacity', width: 80 },
      { title: 'Opening Volume', dataIndex: 'Opening Volume', key: 'openingVolume', width: 90, type: 'volume' },
      { title: 'Closing Volume', dataIndex: 'Closing Volume', key: 'closingVolume', width: 90, type: 'volume' },
      { title: 'Volume Reduction', dataIndex: 'Volume Reduction', key: 'volumeReduction', width: 90, type: 'volume' },
      { title: '% Reduction', dataIndex: 'Percentage Reduction', key: 'percentageReduction', width: 80 },
      { title: 'Density', dataIndex: 'Density', key: 'density', width: 70 },
      { title: 'Temperature', dataIndex: 'Temperature', key: 'temperature', width: 100 },
      { title: 'Water Level', dataIndex: 'Water Level', key: 'waterLevel', width: 80 },
      { title: 'Pumps', dataIndex: 'Connected Pumps', key: 'pumps', width: 60, type: 'number' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 80 },
      { title: 'Verification', dataIndex: 'Verification', key: 'verification', width: 80 },
      { title: 'Recorded By', dataIndex: 'Recorded By', key: 'recordedBy', width: 120 },
      { title: 'Recorded At', dataIndex: 'Recorded At', key: 'recordedAt', width: 120, type: 'datetime' }
    ];
    
    const title = `Tank Fuel Readings - ${stationName} - Shift ${shiftNum}`;
    
    const config = {
      dataSource: reportData,
      columns: exportColumns,
      summaryData: summaryData,
      title: title,
      fileName: `tank_fuel_readings_${stationName.replace(/\s+/g, '_')}_${shiftNum}_${new Date().toISOString().split('T')[0]}`,
      reportType: 'tank-readings',
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
                  <DatabaseOutlined /> Tank Fuel Readings
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
                        onClick: () => fetchTankReadings(shiftId)
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
              title="Total Tanks"
              value={summary?.totalTanks || 0}
              valueStyle={{ color: '#722ed1', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Opening Volume"
              value={totalOpeningVolume || 0}
              precision={2}
              suffix="L"
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Closing Volume"
              value={totalClosingVolume || 0}
              precision={2}
              suffix="L"
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Reduction"
              value={totalReduction || 0}
              precision={2}
              suffix="L"
              valueStyle={{ color: '#cf1322', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Avg Reduction"
              value={summary?.totalTanks ? (totalReduction / summary.totalTanks).toFixed(2) : 0}
              precision={2}
              suffix="L"
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
              valueStyle={{ color: '#13c2c2', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Product Breakdown */}
      {summary?.productBreakdown && summary.productBreakdown.length > 0 && (
        <Card size="small">
          <Title level={5} style={{ marginBottom: '16px' }}>
            <BarChartOutlined /> Product Breakdown
          </Title>
          <Row gutter={[8, 8]}>
            {summary.productBreakdown.map((product, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Card size="small" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Tag color={product.colorCode || '#1890ff'} style={{ marginRight: '8px', fontSize: '8px', padding: '0 4px' }}>
                      ●
                    </Tag>
                    <Text strong>{product.productName}</Text>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <div>Tanks: <Tag color="blue">{product.tankCount}</Tag></div>
                    <div>Reduction: <Text strong>{formatVolume(product.totalReduction)}</Text></div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
      
      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search tanks or products..."
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
                onClick={() => fetchTankReadings(shiftId)}
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
              disabled={filteredTankData.length === 0}
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
              Tank Readings Summary
            </Title>
            <Badge 
              count={filteredTankData.length} 
              style={{ backgroundColor: '#722ed1' }} 
              showZero 
            />
            {filters.search && (
              <Text type="secondary">
                Filtered results for "{filters.search}"
              </Text>
            )}
          </Space>
        </div>
        
        {filteredTankData.length === 0 ? (
          <Empty description="No tank readings found" />
        ) : (
          <Table
            columns={tankReadingsColumns}
            dataSource={filteredTankData}
            loading={loading}
            rowKey={(record) => record.tankInfo?.id || Math.random()}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `Showing ${range[0]}-${range[1]} of ${total} tanks`,
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
                    <div style={{ fontWeight: '600' }}>
                      {formatVolume(totalOpeningVolume)}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <div style={{ fontWeight: '600', color: '#1890ff' }}>
                      {formatVolume(totalClosingVolume)}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <div style={{ fontWeight: '600', color: '#cf1322' }}>
                      {formatVolume(totalReduction)}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <div style={{ textAlign: 'center' }}>
                      <Tag color="volcano" style={{ margin: 0, fontWeight: '600' }}>
                        {summary?.totalTanks ? (totalReduction / totalOpeningVolume * 100).toFixed(2) : 0}%
                      </Tag>
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} colSpan={7}>
                    {/* Empty for remaining columns */}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>
      
      {/* View Tank Details Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            Tank Reading Details
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
        width={800}
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
                    <Text>{viewingTank.tankInfo?.name || 'Unknown'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Tank ID:</Text>
                    <br />
                    <Text type="secondary">{viewingTank.tankInfo?.id || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Capacity:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.capacity?.toLocaleString() || '0'} L</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Current Volume:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.currentVolume?.toLocaleString() || '0'} L</Text>
                  </Col>
                  <Col span={24}>
                    <Text strong>Station Label:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.stationLabel || 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Product Information</Title>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Product Name:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.product?.name || 'Unknown'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Fuel Code:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.product?.fuelCode || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Density:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.product?.density || 'N/A'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Unit:</Text>
                    <br />
                    <Text>{viewingTank.tankInfo?.product?.unit || 'N/A'}</Text>
                  </Col>
                  <Col span={24}>
                    <Text strong>Color Code:</Text>
                    <br />
                    <Tag color={viewingTank.tankInfo?.product?.colorCode || '#1890ff'}>
                      {viewingTank.tankInfo?.product?.colorCode || '#1890ff'}
                    </Tag>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Connected Pumps</Title>
                {viewingTank.tankInfo?.pumps && viewingTank.tankInfo.pumps.length > 0 ? (
                  <Row gutter={[8, 8]}>
                    {viewingTank.tankInfo.pumps.map((pump, index) => (
                      <Col span={24} key={pump.id || index}>
                        <Card size="small" style={{ background: '#fafafa' }}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col span={8}>
                              <Text strong>Pump:</Text>
                              <br />
                              <Text>{pump.asset?.name || 'Unknown'}</Text>
                            </Col>
                            <Col span={8}>
                              <Text strong>Status:</Text>
                              <br />
                              <Tag color={pump.connectionStatus === 'FULLY_CONNECTED' ? 'success' : 'warning'}>
                                {pump.connectionStatus}
                              </Tag>
                            </Col>
                            <Col span={8}>
                              <Text strong>Created:</Text>
                              <br />
                              <Text>{pump.createdAt ? formatDate(pump.createdAt) : 'N/A'}</Text>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Alert message="No pumps connected to this tank" type="info" showIcon />
                )}
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Start Reading</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>Volume:</Text>
                    <br />
                    <Text style={{ fontWeight: 'bold' }}>
                      {formatVolume(viewingTank.readings?.startReading?.volume || 0)}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Dip Value:</Text>
                    <br />
                    <Text>{viewingTank.readings?.startReading?.dipValue || 'N/A'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Temperature:</Text>
                    <br />
                    <Text>{viewingTank.readings?.startReading?.temperature || 'N/A'}°C</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Water Level:</Text>
                    <br />
                    <Text>{viewingTank.readings?.startReading?.waterLevel || 0}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Density:</Text>
                    <br />
                    <Text>{viewingTank.readings?.startReading?.density || 'N/A'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Verified:</Text>
                    <br />
                    <Badge 
                      status={viewingTank.readings?.startReading?.isVerified ? "success" : "warning"} 
                      text={viewingTank.readings?.startReading?.isVerified ? 'Yes' : 'No'} 
                    />
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded By:</Text>
                    <br />
                    <Text>
                      {viewingTank.readings?.startReading?.recordedBy ? 
                        `${viewingTank.readings.startReading.recordedBy.firstName || ''} 
                        ${viewingTank.readings.startReading.recordedBy.lastName || ''}`.trim() : 
                        'N/A'}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded At:</Text>
                    <br />
                    <Text>{viewingTank.readings?.startReading?.recordedAt ? 
                      formatDate(viewingTank.readings.startReading.recordedAt) : 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>End Reading</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>Volume:</Text>
                    <br />
                    <Text style={{ fontWeight: 'bold', color: '#1890ff' }}>
                      {formatVolume(viewingTank.readings?.endReading?.volume || 0)}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Dip Value:</Text>
                    <br />
                    <Text>{viewingTank.readings?.endReading?.dipValue || 'N/A'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Temperature:</Text>
                    <br />
                    <Text>{viewingTank.readings?.endReading?.temperature || 'N/A'}°C</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Water Level:</Text>
                    <br />
                    <Text>{viewingTank.readings?.endReading?.waterLevel || 0}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Density:</Text>
                    <br />
                    <Text>{viewingTank.readings?.endReading?.density || 'N/A'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Verified:</Text>
                    <br />
                    <Badge 
                      status={viewingTank.readings?.endReading?.isVerified ? "success" : "warning"} 
                      text={viewingTank.readings?.endReading?.isVerified ? 'Yes' : 'No'} 
                    />
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded By:</Text>
                    <br />
                    <Text>
                      {viewingTank.readings?.endReading?.recordedBy ? 
                        `${viewingTank.readings.endReading.recordedBy.firstName || ''} 
                        ${viewingTank.readings.endReading.recordedBy.lastName || ''}`.trim() : 
                        'N/A'}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Recorded At:</Text>
                    <br />
                    <Text>{viewingTank.readings?.endReading?.recordedAt ? 
                      formatDate(viewingTank.readings.endReading.recordedAt) : 'N/A'}</Text>
                  </Col>
                </Row>
              </Col>
              
              <Col span={24}>
                <Title level={4} style={{ marginBottom: 16 }}>Calculated Values</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>Volume Reduction:</Text>
                    <br />
                    <Text style={{ color: '#cf1322', fontWeight: 'bold' }}>
                      {formatVolume(viewingTank.readings?.calculated?.volumeReduction || 0)}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Percentage Reduction:</Text>
                    <br />
                    <Tag color={getTankStatus(viewingTank).color} style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {(viewingTank.readings?.calculated?.percentageReduction || 0).toFixed(2)}%
                    </Tag>
                  </Col>
                  <Col span={8}>
                    <Text strong>Density Change:</Text>
                    <br />
                    <Text>{viewingTank.readings?.calculated?.densityChange || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Temperature Change:</Text>
                    <br />
                    <Text>{viewingTank.readings?.calculated?.temperatureChange || '0'}°C</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Water Level Change:</Text>
                    <br />
                    <Text>{viewingTank.readings?.calculated?.waterLevelChange || '0'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Status:</Text>
                    <br />
                    <Tag color={getTankStatus(viewingTank).color}>
                      {getTankStatus(viewingTank).text}
                    </Tag>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">Loading tank details...</Text>
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
              key={`tank-readings-report-${Date.now()}`}
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

export default TankFuelReadings;