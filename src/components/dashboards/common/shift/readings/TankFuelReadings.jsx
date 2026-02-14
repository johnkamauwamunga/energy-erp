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
  Typography,
  Tooltip,
  Badge,
  Empty,
  Dropdown,
  Divider
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  ColumnHeightOutlined,
  FilterFilled
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { shiftReadingService } from '../../../../../services/shiftReadingService/shiftReadingService';
import dayjs from 'dayjs';
import AdvancedReportGenerator from '../../../common/downloadable/AdvancedReportGenerator';

const { Option } = Select;
const { Text, Title } = Typography;

const TankFuelReadings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract shift and station data from navigation state
  const { shiftId, stationId, shiftNumber } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [tankData, setTankData] = useState([]);
  const [shiftInfo, setShiftInfo] = useState(null);
  
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

  // Table configuration
  const [tableConfig, setTableConfig] = useState({
    size: 'middle',
    density: 'comfortable'
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
      
      const { tanksData, shiftData } = response.data;
      
      setTankData(tanksData || []);
      setShiftInfo(shiftData);
      
      if (tanksData?.length > 0) {
        message.success(`Loaded ${tanksData.length} tank readings`);
      }
    } catch (error) {
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
      navigate(-1);
    }
  }, [shiftId]);
  
  // Format volume - show actual figures with thousand separators
  const formatVolume = (liters) => {
    if (liters === undefined || liters === null) return '0 L';
    
    const num = parseFloat(liters);
    
    // Format with thousand separators and 0 decimal places
    const formattedNumber = num.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return `${formattedNumber} L`;
  };
  
  // Format volume for display with 2 decimal places if needed
  const formatVolumeDetailed = (liters) => {
    if (liters === undefined || liters === null) return '0.00 L';
    
    const num = parseFloat(liters);
    
    // For display purposes, show 2 decimal places for better precision
    const formattedNumber = num.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${formattedNumber} L`;
  };
  
  // Calculate volume reduction percentage
  const calculateReductionPercentage = (startVolume, endVolume) => {
    if (!startVolume || startVolume === 0) return 0;
    const reduction = parseFloat(startVolume) - parseFloat(endVolume);
    return (reduction / parseFloat(startVolume)) * 100;
  };
  
  // Get tank status based on volume reduction
  const getTankStatus = (tank) => {
    const percentageReduction = tank.readings?.calculated?.percentageReduction || 
                                calculateReductionPercentage(
                                  tank.readings?.startReading?.volume,
                                  tank.readings?.endReading?.volume
                                );
    
    if (percentageReduction < 5) {
      return { status: 'low', text: 'Low', color: 'success', tagColor: 'green' };
    } else if (percentageReduction < 15) {
      return { status: 'normal', text: 'Normal', color: 'processing', tagColor: 'blue' };
    } else if (percentageReduction < 30) {
      return { status: 'high', text: 'High', color: 'warning', tagColor: 'orange' };
    } else {
      return { status: 'very-high', text: 'Very High', color: 'error', tagColor: 'red' };
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
        tank.tankInfo?.product?.name?.toLowerCase().includes(searchLower) ||
        tank.tankInfo?.product?.fuelCode?.toLowerCase().includes(searchLower)
      );
    }
    
    // Product filter
    if (filters.productFilter !== 'all') {
      data = data.filter(tank =>
        tank.tankInfo?.product?.id === filters.productFilter
      );
    }
    
    // Status filter
    if (filters.statusFilter !== 'all') {
      data = data.filter(tank => {
        const status = getTankStatus(tank);
        return status.status === filters.statusFilter;
      });
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
  
  // Generate report with simplified columns
  const generateReport = () => {
    if (!filteredTankData.length) {
      message.warning('No data available to generate report');
      return;
    }
    
    const stationName = shiftInfo?.station?.name || 'Unknown Station';
    const shiftNum = shiftInfo?.shiftNumber || shiftNumber || 'Unknown Shift';
    
    // Prepare report data with the requested columns
    const reportData = filteredTankData.map((tank, index) => {
      const product = tank.tankInfo?.product;
      const startReading = tank.readings?.startReading;
      const endReading = tank.readings?.endReading;
      const calculated = tank.readings?.calculated;
      const status = getTankStatus(tank);
      
      return {
        '#': index + 1,
        'Shift': shiftNum,
        'Tank': tank.tankInfo?.name || 'Unknown',
        'Product': product?.name || 'Unknown',
        'Opening (L)': startReading?.volume ? parseFloat(startReading.volume).toLocaleString('en-KE') : '0',
        'Closing (L)': endReading?.volume ? parseFloat(endReading.volume).toLocaleString('en-KE') : '0',
        'Reduction (L)': calculated?.volumeReduction ? parseFloat(calculated.volumeReduction).toLocaleString('en-KE') : '0',
        'Reduction %': `${(calculated?.percentageReduction || 
          calculateReductionPercentage(startReading?.volume, endReading?.volume)).toFixed(2)}%`,
        'Status': status.text
      };
    });
    
    // Summary data for metadata sheet
    const summaryData = {
      'Station Name': stationName,
      'Shift Number': shiftNum,
      'Shift Status': shiftInfo?.status || 'N/A',
      'Start Time': shiftInfo?.startTime ? dayjs(shiftInfo.startTime).format('DD/MM/YYYY HH:mm:ss') : 'N/A',
      'End Time': shiftInfo?.endTime ? dayjs(shiftInfo.endTime).format('DD/MM/YYYY HH:mm:ss') : 'N/A',
      'Total Tanks': filteredTankData.length,
      'Total Opening Volume': filteredTankData.reduce((sum, tank) => 
        sum + (parseFloat(tank.readings?.startReading?.volume) || 0), 0
      ).toLocaleString('en-KE') + ' L',
      'Total Closing Volume': filteredTankData.reduce((sum, tank) => 
        sum + (parseFloat(tank.readings?.endReading?.volume) || 0), 0
      ).toLocaleString('en-KE') + ' L',
      'Total Reduction': filteredTankData.reduce((sum, tank) => 
        sum + (parseFloat(tank.readings?.calculated?.volumeReduction) || 0), 0
      ).toLocaleString('en-KE') + ' L',
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated At': new Date().toLocaleTimeString('en-KE')
    };
    
    // Simplified columns as requested: shift, tank, product, opening, closing, reduction, status
    const exportColumns = [
      { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
      { title: 'Shift', dataIndex: 'Shift', key: 'shift', width: 100, type: 'text' },
      { title: 'Tank', dataIndex: 'Tank', key: 'tank', width: 120, type: 'text' },
      { title: 'Product', dataIndex: 'Product', key: 'product', width: 120, type: 'text' },
      { title: 'Opening (L)', dataIndex: 'Opening (L)', key: 'openingVolume', width: 120, type: 'volume' },
      { title: 'Closing (L)', dataIndex: 'Closing (L)', key: 'closingVolume', width: 120, type: 'volume' },
      { title: 'Reduction (L)', dataIndex: 'Reduction (L)', key: 'volumeReduction', width: 120, type: 'volume' },
      { title: 'Reduction %', dataIndex: 'Reduction %', key: 'percentageReduction', width: 100, type: 'percentage' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 100, type: 'text' }
    ];
    
    const title = `Tank Fuel Readings - ${stationName} - Shift ${shiftNum}`;
    
    const config = {
      dataSource: reportData,
      columns: exportColumns,
      summaryData: summaryData,
      title: title,
      fileName: `tank_fuel_readings_${stationName.replace(/\s+/g, '_')}_${shiftNum}_${new Date().toISOString().split('T')[0]}`,
      reportType: 'inventory', // Using inventory theme for fuel readings
      companyName: shiftInfo?.station?.company || "Fuel Management System",
      stationInfo: shiftInfo?.station ? {
        name: shiftInfo.station.name,
        code: shiftInfo.station.code,
        location: shiftInfo.station.location
      } : null,
      footerText: `Generated from Fuel Management System | Station: ${stationName} | Shift: ${shiftNum} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      showGrandTotals: false // Hide grand totals in table
    };
    
    setReportConfig(config);
    setReportTitle(title);
    setReportModalVisible(true);
  };
  
  const handleReportComplete = (format) => {
    message.success(`Report generated successfully as ${format.toUpperCase()}!`);
    setReportModalVisible(false);
    setReportConfig(null);
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
  
  // Optimized table columns - removed temperature column
  const tankReadingsColumns = [
    {
      title: 'Tank',
      dataIndex: 'tankInfo',
      key: 'tankName',
      width: 120,
      fixed: 'left',
      render: (tankInfo) => {
        const productColor = tankInfo?.product?.colorCode || '#1890ff';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: productColor,
                flexShrink: 0
              }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: '13px' }}>
                {tankInfo?.name || 'Unknown'}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {tankInfo?.product?.fuelCode || ''}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Product',
      dataIndex: 'tankInfo',
      key: 'product',
      width: 120,
      render: (tankInfo) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '13px' }}>
            {tankInfo?.product?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Density: {tankInfo?.product?.density || 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'Opening (L)',
      dataIndex: 'readings',
      key: 'openingVolume',
      width: 120,
      align: 'right',
      render: (readings) => (
        <div style={{ fontWeight: 600, fontSize: '13px' }}>
          {readings?.startReading?.volume ? parseFloat(readings.startReading.volume).toLocaleString('en-KE') : '0'}
        </div>
      )
    },
    {
      title: 'Closing (L)',
      dataIndex: 'readings',
      key: 'closingVolume',
      width: 120,
      align: 'right',
      render: (readings) => (
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1890ff' }}>
          {readings?.endReading?.volume ? parseFloat(readings.endReading.volume).toLocaleString('en-KE') : '0'}
        </div>
      )
    },
    {
      title: 'Reduction (L)',
      dataIndex: 'readings',
      key: 'volumeReduction',
      width: 130,
      align: 'right',
      render: (readings, record) => {
        const reduction = readings?.calculated?.volumeReduction || 0;
        const percentage = readings?.calculated?.percentageReduction || 
                          calculateReductionPercentage(
                            readings?.startReading?.volume,
                            readings?.endReading?.volume
                          );
        
        return (
          <div>
            <div style={{ 
              fontWeight: 600, 
              fontSize: '13px', 
              color: '#cf1322'
            }}>
              {parseFloat(reduction).toLocaleString('en-KE')}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {percentage.toFixed(1)}%
            </div>
          </div>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const status = getTankStatus(record);
        const percentage = record.readings?.calculated?.percentageReduction || 
                          calculateReductionPercentage(
                            record.readings?.startReading?.volume,
                            record.readings?.endReading?.volume
                          );
        
        return (
          <Tooltip title={`${percentage.toFixed(1)}% reduction`}>
            <Badge
              status={status.color}
              text={
                <span style={{ 
                  fontSize: '12px',
                  fontWeight: 500,
                  color: status.color === 'error' ? '#cf1322' : 
                        status.color === 'warning' ? '#fa8c16' : 
                        status.color === 'success' ? '#52c41a' : '#1890ff'
                }}>
                  {status.text}
                </span>
              }
            />
          </Tooltip>
        );
      }
    },
    {
      title: 'Verification',
      dataIndex: 'readings',
      key: 'verification',
      width: 100,
      align: 'center',
      render: (readings) => (
        <Tag color={readings?.endReading?.isVerified ? "success" : "warning"}>
          {readings?.endReading?.isVerified ? "Verified" : "Pending"}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Tooltip title="View details">
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            type="text"
            onClick={() => {
              setViewingTank(record);
              setViewModalVisible(true);
            }}
          />
        </Tooltip>
      )
    }
  ];
  
  // Table density styles
  const tableDensityStyles = {
    compact: { fontSize: '12px', padding: '8px 12px' },
    comfortable: { fontSize: '13px', padding: '12px 16px' },
    spacious: { fontSize: '14px', padding: '16px 20px' }
  };
  
  if (!shiftId) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Title level={4} type="secondary">No shift data provided</Title>
        <Button type="primary" onClick={handleGoBack} style={{ marginTop: 16 }}>
          Go Back to Shifts
        </Button>
      </div>
    );
  }
  
  return (
    <div style={{ 
      padding: 24, 
      maxWidth: '100%',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header Card */}
      <Card 
        style={{ 
          marginBottom: 16,
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={handleGoBack}
                type="text"
                size="large"
                style={{ padding: '4px 8px' }}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  <DatabaseOutlined style={{ marginRight: 8 }} />
                  Tank Fuel Readings
                </Title>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue" style={{ fontSize: '12px' }}>
                    Shift {shiftInfo?.shiftNumber || shiftNumber || 'N/A'}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: '13px' }}>
                    {shiftInfo?.station?.name || 'Unknown Station'}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space wrap>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => fetchTankReadings(shiftId)}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary"
                icon={<FileTextOutlined />}
                onClick={generateReport}
                disabled={filteredTankData.length === 0}
              >
                Generate Report
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* Filters Card */}
      <Card 
        style={{ 
          marginBottom: 16,
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Search tanks, products, or fuel codes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<SearchOutlined />}
              allowClear
              size="large"
              style={{ width: '100%' }}
            />
          </Col>
          
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Product"
              value={filters.productFilter}
              onChange={(value) => setFilters(prev => ({ ...prev, productFilter: value }))}
              size="large"
              allowClear
            >
              <Option value="all">All Products</Option>
              {uniqueProducts.map(product => (
                <Option key={product.id} value={product.id}>
                  <Space>
                    <div 
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: product.colorCode || '#1890ff'
                      }}
                    />
                    <span>{product.name}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.statusFilter}
              onChange={(value) => setFilters(prev => ({ ...prev, statusFilter: value }))}
              size="large"
              allowClear
            >
              <Option value="all">All Status</Option>
              <Option value="low">Low</Option>
              <Option value="normal">Normal</Option>
              <Option value="high">High</Option>
              <Option value="very-high">Very High</Option>
            </Select>
          </Col>
          
          <Col xs={24} md={6}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                icon={<FilterFilled />}
                onClick={clearFilters}
                disabled={!filters.search && filters.productFilter === 'all' && filters.statusFilter === 'all'}
                size="large"
              >
                Clear Filters
              </Button>
              
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'comfortable',
                      label: 'Comfortable',
                      icon: <ColumnHeightOutlined />,
                      onClick: () => setTableConfig(prev => ({ ...prev, density: 'comfortable' }))
                    },
                    {
                      key: 'compact',
                      label: 'Compact',
                      icon: <ColumnHeightOutlined />,
                      onClick: () => setTableConfig(prev => ({ ...prev, density: 'compact' }))
                    },
                    {
                      key: 'spacious',
                      label: 'Spacious',
                      icon: <ColumnHeightOutlined />,
                      onClick: () => setTableConfig(prev => ({ ...prev, density: 'spacious' }))
                    }
                  ]
                }}
                placement="bottomRight"
              >
                <Button icon={<SettingOutlined />} size="large">
                  Table Settings
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* Main Table Card */}
      <Card 
        style={{ 
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16,
          padding: '0 4px'
        }}>
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              Tank Readings (Litres)
            </Title>
            <Badge 
              count={filteredTankData.length} 
              style={{ 
                backgroundColor: '#722ed1',
                fontSize: '12px'
              }} 
            />
          </Space>
          
          <Text type="secondary">
            Showing {filteredTankData.length} of {tankData.length} tanks
          </Text>
        </div>
        
        {filteredTankData.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div style={{ marginBottom: 8 }}>No tank readings found</div>
                {tankData.length > 0 ? (
                  <Text type="secondary">Try adjusting your filters</Text>
                ) : (
                  <Text type="secondary">No data available for this shift</Text>
                )}
              </div>
            }
            style={{ padding: 40 }}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={tankReadingsColumns}
              dataSource={filteredTankData}
              loading={loading}
              rowKey={(record) => record.tankInfo?.id || Math.random()}
              size={tableConfig.size}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} items`,
                size: 'default',
                showQuickJumper: true,
                pageSizeOptions: ['10', '15', '20', '50']
              }}
              scroll={{ x: 1200 }}
              style={{ 
                ...tableDensityStyles[tableConfig.density],
                minWidth: '100%'
              }}
              bordered
              rowClassName={(record, index) => 
                index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
              }
              summary={(pageData) => {
                if (!pageData.length) return null;
                
                const totalOpening = pageData.reduce((sum, item) => 
                  sum + (parseFloat(item.readings?.startReading?.volume) || 0), 0
                );
                const totalClosing = pageData.reduce((sum, item) => 
                  sum + (parseFloat(item.readings?.endReading?.volume) || 0), 0
                );
                const totalReduction = pageData.reduce((sum, item) => 
                  sum + (parseFloat(item.readings?.calculated?.volumeReduction) || 0), 0
                );
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: '#fafafa',
                      fontSize: '13px'
                    }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Page Totals</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{totalOpening.toLocaleString('en-KE')} L</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <strong style={{ color: '#1890ff' }}>
                          {totalClosing.toLocaleString('en-KE')} L
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <strong style={{ color: '#cf1322' }}>
                          {totalReduction.toLocaleString('en-KE')} L
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} colSpan={4}>
                        {/* Empty cells for remaining columns */}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        )}
      </Card>
      
      {/* View Tank Details Modal */}
      <Modal
        title="Tank Reading Details"
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
        width={600}
        centered
      >
        {viewingTank ? (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div 
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: viewingTank.tankInfo?.product?.colorCode || '#1890ff'
                  }}
                />
                <Title level={4} style={{ margin: 0 }}>
                  {viewingTank.tankInfo?.name}
                </Title>
                <Tag color="blue">{viewingTank.tankInfo?.product?.name}</Tag>
              </div>
              <Text type="secondary">
                Fuel Code: {viewingTank.tankInfo?.product?.fuelCode}
              </Text>
            </div>
            
            <Divider />
            
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Opening Volume</Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {viewingTank.readings?.startReading?.volume ? 
                      parseFloat(viewingTank.readings.startReading.volume).toLocaleString('en-KE') : '0'} L
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Closing Volume</Text>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                    {viewingTank.readings?.endReading?.volume ? 
                      parseFloat(viewingTank.readings.endReading.volume).toLocaleString('en-KE') : '0'} L
                  </div>
                </div>
              </Col>
              
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Volume Reduction</Text>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#cf1322' }}>
                    {viewingTank.readings?.calculated?.volumeReduction ? 
                      parseFloat(viewingTank.readings.calculated.volumeReduction).toLocaleString('en-KE') : '0'} L
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Percentage Reduction</Text>
                  <div>
                    <Tag 
                      color={getTankStatus(viewingTank).tagColor}
                      style={{ fontSize: 14, padding: '4px 12px' }}
                    >
                      {(viewingTank.readings?.calculated?.percentageReduction || 0).toFixed(2)}%
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>
            
            <Divider />
            
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <Text strong>Tank Capacity:</Text>
                <div>
                  {viewingTank.tankInfo?.capacity?.toLocaleString() || '0'} L
                </div>
              </Col>
              <Col span={12}>
                <Text strong>Density:</Text>
                <div>
                  {viewingTank.readings?.endReading?.density || viewingTank.tankInfo?.product?.density || 'N/A'}
                </div>
              </Col>
              
              <Col span={12}>
                <Text strong>Connected Pumps:</Text>
                <div>
                  {viewingTank.tankInfo?.pumps?.length || 0}
                </div>
              </Col>
              <Col span={12}>
                <Text strong>Verification Status:</Text>
                <div>
                  <Tag color={viewingTank.readings?.endReading?.isVerified ? "success" : "warning"}>
                    {viewingTank.readings?.endReading?.isVerified ? "Verified" : "Pending"}
                  </Tag>
                </div>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">Loading tank details...</Text>
          </div>
        )}
      </Modal>
      
      {/* Report Generator Modal */}
      <Modal
        title={reportTitle}
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
            
            <div style={{ textAlign: 'right' }}>
              <Button 
                onClick={() => {
                  setReportModalVisible(false);
                  setReportConfig(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TankFuelReadings;