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
import AdvancedReportGenerator from '../../downloadable/AdvancedReportGenerator';

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
  
  // Optimized table columns to fit without horizontal scroll
  const pumpReadingsColumns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      fixed: 'left',
      render: (_, record, index) => (
        <div style={{ textAlign: 'center', fontWeight: '500', fontSize: '12px' }}>
          {index + 1}
        </div>
      )
    },
    {
      title: 'Pump',
      key: 'pumpName',
      width: 100,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            <FireOutlined style={{ fontSize: '9px', marginRight: '3px', color: '#ff4d4f' }} />
            {record.pumpInfo?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.2' }}>
            {record.pumpInfo?.island || ''}
          </div>
        </div>
      )
    },
    {
      title: 'Product',
      key: 'product',
      width: 100,
      render: (_, record) => {
        const product = record.pumpInfo?.tank?.product;
        const colorCode = product?.colorCode || '#1890ff';
        
        return (
          <div>
            <div style={{ fontWeight: '500', fontSize: '11px', lineHeight: '1.2' }}>
              <Tag color={colorCode} style={{ 
                marginRight: '3px', 
                fontSize: '7px', 
                padding: '0 3px',
                lineHeight: '1.2'
              }}>
                ●
              </Tag>
              {product?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.2' }}>
              {product?.fuelCode || ''}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Unit Price',
      key: 'unitCost',
      width: 75,
      align: 'right',
      render: (_, record) => {
        const unitPrice = record.readings?.endReading?.unitPrice || 
                         record.readings?.calculated?.unitPrice ||
                         record.pumpInfo?.tank?.product?.minSellingPrice;
        
        return (
          <div style={{ color: '#52c41a', fontWeight: '500', fontSize: '11px' }}>
            {parseFloat(unitPrice || 0).toFixed(2)}
          </div>
        );
      }
    },
    {
      title: 'Cash Meter',
      key: 'cashMeter',
      width: 100,
      children: [
        {
          title: 'Start',
          key: 'cashStart',
          width: 50,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontSize: '11px', fontWeight: '500' }}>
              {(record.readings?.startReading?.cashMeter || 0).toLocaleString()}
            </div>
          )
        },
        {
          title: 'End',
          key: 'cashEnd',
          width: 50,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
              {(record.readings?.endReading?.cashMeter || 0).toLocaleString()}
            </div>
          )
        }
      ]
    },
    {
      title: 'Manual Meter',
      key: 'manualMeter',
      width: 100,
      children: [
        {
          title: 'Start',
          key: 'manualStart',
          width: 50,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontSize: '11px', fontWeight: '500' }}>
              {(record.readings?.startReading?.manualMeter || 0).toLocaleString()}
            </div>
          )
        },
        {
          title: 'End',
          key: 'manualEnd',
          width: 50,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
              {(record.readings?.endReading?.manualMeter || 0).toLocaleString()}
            </div>
          )
        }
      ]
    },
    {
      title: 'Electric Meter',
      key: 'electricMeter',
      width: 100,
      children: [
        {
          title: 'Start',
          key: 'electricStart',
          width: 50,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontSize: '11px', fontWeight: '500' }}>
              {(record.readings?.startReading?.electricMeter || 0).toLocaleString()}
            </div>
          )
        },
        {
          title: 'End',
          key: 'electricEnd',
          width: 50,
          align: 'right',
          render: (_, record) => (
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#1890ff' }}>
              {(record.readings?.endReading?.electricMeter || 0).toLocaleString()}
            </div>
          )
        }
      ]
    },
    {
      title: 'Liters',
      key: 'litersDispensed',
      width: 70,
      align: 'right',
      render: (_, record) => (
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#1890ff' }}>
          {parseFloat(record.readings?.calculated?.litersDispensed || 
                     record.readings?.endReading?.litersDispensed || 0).toFixed(2)}
        </div>
      )
    },
    {
      title: 'Sales',
      key: 'salesValue',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#cf1322' }}>
          {parseFloat(record.readings?.calculated?.salesValue || 
                     record.readings?.endReading?.salesValue || 0).toFixed(2)}
        </div>
      )
    },
    {
      title: 'Recorded',
      key: 'recordedBy',
      width: 90,
      render: (_, record) => {
        const recordedBy = record.readings?.endReading?.recordedBy || 
                          record.readings?.startReading?.recordedBy;
        
        return (
          <div>
            <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
              {recordedBy ? 
                `${recordedBy.firstName?.charAt(0) || ''}${recordedBy.lastName?.charAt(0) || ''}`.toUpperCase() : 
                'N/A'}
            </div>
            <div style={{ fontSize: '9px', color: '#666', lineHeight: '1.2' }}>
              {recordedBy ? 
                `${recordedBy.firstName?.split(' ')[0] || ''}`.substring(0, 6) : ''}
            </div>
          </div>
        );
      }
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
  
  // Generate report with EXACT columns requested
  const generateReport = () => {
    if (!filteredPumpData.length) {
      message.warning('No data available to generate report');
      return;
    }
    
    const stationName = shiftInfo?.station?.name || 'Unknown Station';
    const shiftNum = shiftInfo?.shiftNumber || shiftNumber || 'Unknown Shift';
    
    // Create report data with the EXACT columns requested:
    // shift, station, pump, product, unit price, cash(start, end), manual(start, end), electric(start, end), liters, sales
    const reportData = filteredPumpData.map((pump, index) => {
      const product = pump.pumpInfo?.tank?.product;
      const startReading = pump.readings?.startReading;
      const endReading = pump.readings?.endReading;
      const calculated = pump.readings?.calculated;
      
      return {
        '#': index + 1,
        'Shift': shiftNum,
        'Station': stationName,
        'Pump': pump.pumpInfo?.name || 'Unknown',
        'Product': product?.name || 'Unknown',
        'Unit Price (KES)': endReading?.unitPrice || calculated?.unitPrice || 0,
        'Cash Start': startReading?.cashMeter || 0,
        'Cash End': endReading?.cashMeter || 0,
        'Manual Start': startReading?.manualMeter || 0,
        'Manual End': endReading?.manualMeter || 0,
        'Electric Start': startReading?.electricMeter || 0,
        'Electric End': endReading?.electricMeter || 0,
        'Liters (L)': endReading?.litersDispensed || calculated?.litersDispensed || 0,
        'Sales (KES)': endReading?.salesValue || calculated?.salesValue || 0,
        'Recorded By': endReading?.recordedBy ? 
          `${endReading.recordedBy.firstName || ''} ${endReading.recordedBy.lastName || ''}`.trim() : 
          'N/A',
        'Recorded At': endReading?.recordedAt ? formatDate(endReading.recordedAt) : 'N/A'
      };
    });
    
    // Summary data for metadata (not shown in table)
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
    
    // EXACT columns as requested, with proper typing
    const exportColumns = [
      { title: 'Shift', dataIndex: 'Shift', key: 'shift', width: 100, type: 'text' },
      { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' },
      { title: 'Pump', dataIndex: 'Pump', key: 'pump', width: 100, type: 'text' },
      { title: 'Product', dataIndex: 'Product', key: 'product', width: 120, type: 'text' },
      { title: 'Unit Price (KES)', dataIndex: 'Unit Price (KES)', key: 'unitPrice', width: 90, type: 'currency' },
      { title: 'Cash Start', dataIndex: 'Cash Start', key: 'cashStart', width: 80, type: 'number' },
      { title: 'Cash End', dataIndex: 'Cash End', key: 'cashEnd', width: 80, type: 'number' },
      { title: 'Manual Start', dataIndex: 'Manual Start', key: 'manualStart', width: 80, type: 'number' },
      { title: 'Manual End', dataIndex: 'Manual End', key: 'manualEnd', width: 80, type: 'number' },
      { title: 'Electric Start', dataIndex: 'Electric Start', key: 'electricStart', width: 80, type: 'number' },
      { title: 'Electric End', dataIndex: 'Electric End', key: 'electricEnd', width: 80, type: 'number' },
      { title: 'Liters (L)', dataIndex: 'Liters (L)', key: 'liters', width: 80, type: 'volume' },
      { title: 'Sales (KES)', dataIndex: 'Sales (KES)', key: 'sales', width: 90, type: 'currency' }
    ];
    
    const title = `Pump Meter Readings - ${stationName} - Shift ${shiftNum}`;
    
    const config = {
      dataSource: reportData,
      columns: exportColumns,
      summaryData: summaryData,
      title: title,
      fileName: `pump_readings_${stationName.replace(/\s+/g, '_')}_${shiftNum}_${new Date().toISOString().split('T')[0]}`,
      reportType: 'pump-readings',
      companyName: shiftInfo?.station?.company || "Lynx Energy System",
      stationInfo: shiftInfo?.station ? {
        name: shiftInfo.station.name,
        code: shiftInfo.station.code,
        address: shiftInfo.station.location
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | Station: ${stationName} | Shift: ${shiftNum} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      // IMPORTANT: Hide grand totals for this report
      showGrandTotals: false
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
  
  // Calculate total width for responsive check
  const tableWidth = useMemo(() => {
    return pumpReadingsColumns.reduce((total, col) => {
      return total + (col.width || 0) + (col.children ? col.children.reduce((childTotal, child) => childTotal + (child.width || 0), 0) : 0);
    }, 0);
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
      
      {/* Statistics - Reduced to 4 cards for better space */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Pumps"
              value={summary?.totalPumps || 0}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
              suffix={<span style={{ fontSize: '12px' }}>units</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Liters"
              value={summary?.totalLitersDispensed || 0}
              precision={0}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
              suffix={<span style={{ fontSize: '12px' }}>L</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Sales"
              value={summary?.totalSalesValue || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#cf1322', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Avg/L"
              value={summary?.avgUnitPrice || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#faad14', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Compact Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={10} md={6}>
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<SearchOutlined />}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={12} sm={7} md={5}>
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
                <Option key={product.id} value={product.id}>
                  <span style={{ fontSize: '11px' }}>
                    <Tag color={product.colorCode || '#1890ff'} style={{ 
                      marginRight: '3px', 
                      fontSize: '7px', 
                      padding: '0 3px',
                      lineHeight: '1.2'
                    }}>
                      ●
                    </Tag>
                    {product.fuelCode || 'N/A'}
                  </span>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={7} md={4}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={clearFilters}
                disabled={!filters.search && filters.productFilter === 'all'}
                size="small"
              >
                Clear
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
        </Row>
      </Card>
      
      {/* Main Table - Optimized for no horizontal scroll */}
      <Card bodyStyle={{ padding: '12px' }}>
        <div style={{ marginBottom: '12px' }}>
          <Space>
            <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
              Pump Readings
            </Title>
            <Badge 
              count={filteredPumpData.length} 
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
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ 
                  fontWeight: 'bold', 
                  background: '#fafafa',
                  fontSize: '12px'
                }}>
                  <Table.Summary.Cell index={0} colSpan={4} align="center">
                    TOTALS ({filteredPumpData.length} pumps)
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} colSpan={6} align="right">
                    {/* Empty for meter columns */}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <div style={{ color: '#cf1322', fontWeight: '600', fontSize: '12px' }}>
                      {formatCurrency(summary?.totalSalesValue || 0)}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} colSpan={2}>
                    {/* Empty for recorded and actions */}
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