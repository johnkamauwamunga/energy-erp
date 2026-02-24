// src/pages/tests/ShiftsListTest.jsx
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
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Typography,
  Divider,
  Empty,
  Spin,
  Alert,
  Progress,
  Tabs,
  Descriptions,
  Modal
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  CalendarOutlined,
  BarChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TruckOutlined,
  DollarOutlined,
  LineChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { reconciliationService } from '../../../services/reconcilliationService/reconcilliationService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ReconciliationTest = () => {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [shiftsData, setShiftsData] = useState(null);
  const [filters, setFilters] = useState({
    period: 'week',
    fromDate: dayjs().subtract(7, 'days').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    status: 'ALL',
    limit: 20,
    offset: 0,
    includeDetails: true
  });
  
  const [stats, setStats] = useState({
    totalShifts: 0,
    completedShifts: 0,
    openShifts: 0,
    totalVariance: 0,
    totalOffloads: 0,
    totalSales: 0,
    reconciliationRate: 0
  });
  
  const [selectedShift, setSelectedShift] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // ==================== FETCH SHIFTS ====================

  const fetchShifts = async (resetOffset = true) => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        offset: resetOffset ? 0 : filters.offset
      };
      
      console.log("🔍 Fetching shifts with filters:", params);
      
      const response = await reconciliationService.getShiftsByDateRange(params);
      
      console.log("✅ Shifts data received:", response);
      
      setShiftsData(response);
      
      // Calculate statistics from response
      if (response?.summary) {
        setStats({
          totalShifts: response.summary.totalShifts || 0,
          completedShifts: response.summary.completedShifts || 0,
          openShifts: response.summary.openShifts || 0,
          totalVariance: response.totals?.totalVariance || 0,
          totalOffloads: response.summary.totalOffloads || 0,
          totalSales: response.summary.totalSales || 0,
          totalLiters: response.summary.totalLiters || 0,
          reconciliationRate: response.summary.completedShifts ? 
            ((response.summary.completedShifts / response.summary.totalShifts) * 100).toFixed(1) : 0
        });
      }
      
      message.success(`Loaded ${response?.shifts?.length || 0} shifts`);
    } catch (error) {
      console.error("❌ Error fetching shifts:", error);
      message.error(`Failed to load shifts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
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

  const handleStatusChange = (status) => {
    setFilters(prev => ({ ...prev, status, offset: 0 }));
  };

  const handlePageChange = (page, pageSize) => {
    setFilters(prev => ({ 
      ...prev, 
      offset: (page - 1) * (prev.limit || 20)
    }));
    fetchShifts(false);
  };

  const handleViewShift = (shift) => {
    // Navigate to shift details or open modal
    if (shift.shift?.id) {
      navigate(`/shifts/reconciliation/${shift.shift.id}`, {
        state: {
          shiftId: shift.shift.id,
          shiftNumber: shift.shift.shiftNumber,
          stationId: shift.shift.station?.id
        }
      });
    } else {
      setSelectedShift(shift);
      setDetailModalVisible(true);
    }
  };

  const handleExport = () => {
    // Generate CSV of shifts
    if (!shiftsData?.shifts) return;
    
    const csvData = shiftsData.shifts.map(shift => ({
      'Shift Number': shift.shift?.shiftNumber || shift.shiftNumber,
      'Station': shift.shift?.station?.name || shift.station?.name,
      'Date': dayjs(shift.shift?.startTime || shift.startTime).format('DD/MM/YYYY'),
      'Start Time': dayjs(shift.shift?.startTime || shift.startTime).format('HH:mm'),
      'End Time': shift.shift?.endTime ? dayjs(shift.shift.endTime).format('HH:mm') : 'Ongoing',
      'Status': shift.shift?.status || shift.status,
      'Tanks': shift.reconciliation?.tanks?.length || 0,
      'Total Dispensed': shift.reconciliation?.summary?.totals?.dispensed || 0,
      'Total Variance': shift.reconciliation?.summary?.totals?.variance || 0,
      'Reconciliation Rate': shift.reconciliation?.summary?.reconciliationRate || 0,
      'Offloads': shift.reconciliation?.summary?.offloadSummary?.totalOffloads || 0,
      'Alerts': shift.verification?.alerts?.length || 0
    }));
    
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shifts_${filters.fromDate}_to_${filters.toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    message.success('Export completed');
  };

  // ==================== FORMATTERS ====================

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const formatVolume = (liters) => {
    if (liters === undefined || liters === null) return '0 L';
    return `${liters.toLocaleString()} L`;
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'KES 0';
    return `KES ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: { color: 'processing', text: 'Open' },
      CLOSED: { color: 'success', text: 'Closed' },
      VERIFIED: { color: 'purple', text: 'Verified' },
      RECONCILED: { color: 'green', text: 'Reconciled' },
      DISCREPANCY: { color: 'error', text: 'Discrepancy' }
    };
    return badges[status] || { color: 'default', text: status };
  };

  const getVarianceColor = (variance) => {
    const absVariance = Math.abs(variance || 0);
    if (absVariance < 10) return 'green';
    if (absVariance < 30) return 'blue';
    if (absVariance < 100) return 'orange';
    return 'red';
  };

  // ==================== TABLE COLUMNS ====================

  const columns = [
    {
      title: 'Shift',
      key: 'shift',
      width: 150,
      fixed: 'left',
      render: (_, record) => {
        const shift = record.shift || record;
        return (
          <Space direction="vertical" size={0}>
            <Text strong>#{shift.shiftNumber}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {shift.station?.name || 'Unknown Station'}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      width: 180,
      render: (_, record) => {
        const shift = record.shift || record;
        return (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(shift.startTime).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {dayjs(shift.startTime).format('HH:mm')} - {shift.endTime ? dayjs(shift.endTime).format('HH:mm') : 'Ongoing'}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const shift = record.shift || record;
        const badge = getStatusBadge(shift.status);
        return <Badge status={badge.color} text={badge.text} />;
      }
    },
    {
      title: 'Supervisor',
      key: 'supervisor',
      width: 120,
      render: (_, record) => {
        const shift = record.shift || record;
        return shift.supervisor?.name || 'N/A';
      }
    },
    {
      title: 'Tanks',
      key: 'tanks',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const count = record.reconciliation?.tanks?.length || 
                     record._count?.dipReadings || 0;
        return <Tag color="blue">{count}</Tag>;
      }
    },
    {
      title: 'Total Dispensed',
      key: 'dispensed',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const value = record.reconciliation?.summary?.totals?.dispensed ||
                     record.summary?.totals?.dispensed || 0;
        return (
          <Tooltip title={formatCurrency(record.reconciliation?.metadata?.sales?.totals?.totalRevenue || 0)}>
            <Text>{formatVolume(value)}</Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Total Variance',
      key: 'variance',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const value = record.reconciliation?.summary?.totals?.variance ||
                     record.summary?.totals?.variance || 0;
        const color = getVarianceColor(value);
        return (
          <Text style={{ color, fontWeight: 'bold' }}>
            {value > 0 ? '+' : ''}{value.toFixed(1)} L
          </Text>
        );
      }
    },
    {
      title: 'Reconciliation',
      key: 'reconciliationRate',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const rate = record.reconciliation?.summary?.reconciliationRate ||
                    record.summary?.reconciliationRate || 0;
        return (
          <Progress 
            type="circle" 
            percent={rate} 
            size={40}
            format={(percent) => `${percent}%`}
            status={rate > 80 ? 'success' : rate > 50 ? 'normal' : 'exception'}
          />
        );
      }
    },
    {
      title: 'Offloads',
      key: 'offloads',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const count = record.reconciliation?.summary?.offloadSummary?.totalOffloads ||
                     record.summary?.offloadSummary?.totalOffloads || 0;
        return count > 0 ? (
          <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
        ) : <Text type="secondary">0</Text>;
      }
    },
    {
      title: 'Alerts',
      key: 'alerts',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const count = record.verification?.alerts?.length || 0;
        return count > 0 ? (
          <Badge count={count} style={{ backgroundColor: '#f5222d' }} />
        ) : <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewShift(record)}
        >
          View
        </Button>
      )
    }
  ];

  // ==================== RENDER ====================

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <BarChartOutlined /> Shift Reconciliation List
            </Title>
            <Text type="secondary">
              View and analyze all shifts within selected date range
            </Text>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => fetchShifts()}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={!shiftsData?.shifts?.length}
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filters.period}
              onChange={handlePeriodChange}
            >
              <Option value="today">Today</Option>
              <Option value="yesterday">Yesterday</Option>
              <Option value="week">Last 7 Days</Option>
              <Option value="month">Last 30 Days</Option>
              <Option value="quarter">Last 90 Days</Option>
              <Option value="year">Last Year</Option>
              <Option value="custom">Custom Range</Option>
            </Select>
          </Col>
          
          <Col xs={24} md={8}>
            <RangePicker 
              style={{ width: '100%' }}
              value={[
                filters.fromDate ? dayjs(filters.fromDate) : null,
                filters.toDate ? dayjs(filters.toDate) : null
              ]}
              onChange={handleDateRangeChange}
              disabled={filters.period !== 'custom'}
            />
          </Col>
          
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filters.status}
              onChange={handleStatusChange}
              placeholder="Status"
            >
              <Option value="ALL">All Status</Option>
              <Option value="OPEN">Open</Option>
              <Option value="CLOSED">Closed</Option>
              <Option value="VERIFIED">Verified</Option>
            </Select>
          </Col>
          
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filters.limit}
              onChange={(val) => setFilters(prev => ({ ...prev, limit: val, offset: 0 }))}
            >
              <Option value={10}>10 per page</Option>
              <Option value={20}>20 per page</Option>
              <Option value={50}>50 per page</Option>
              <Option value={100}>100 per page</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      {shiftsData?.summary && (
        <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#e6f7ff' }}>
              <Statistic
                title="Total Shifts"
                value={stats.totalShifts}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#f6ffed' }}>
              <Statistic
                title="Completed"
                value={stats.completedShifts}
                suffix={`/ ${stats.totalShifts}`}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#fff7e6' }}>
              <Statistic
                title="Open Shifts"
                value={stats.openShifts}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#f9f0ff' }}>
              <Statistic
                title="Total Offloads"
                value={stats.totalOffloads}
                prefix={<TruckOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#f6ffed' }}>
              <Statistic
                title="Total Sales"
                value={formatCurrency(stats.totalSales)}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#fff1f0' }}>
              <Statistic
                title="Total Variance"
                value={formatVolume(stats.totalVariance)}
                valueStyle={{ color: getVarianceColor(stats.totalVariance) }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Table */}
      <Card>
        {loading && !shiftsData ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">Loading shifts...</Text>
            </div>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={shiftsData?.shifts || []}
              rowKey={(record) => record.shift?.id || record.id || Math.random()}
              loading={loading}
              pagination={{
                current: Math.floor(filters.offset / filters.limit) + 1,
                pageSize: filters.limit,
                total: shiftsData?.pagination?.totalCount || 0,
                onChange: handlePageChange,
                showSizeChanger: false,
                showTotal: (total, range) => (
                  <span>
                    {range[0]}-{range[1]} of {total} shifts
                  </span>
                )
              }}
              scroll={{ x: 1300 }}
              size="middle"
              expandable={{
                expandedRowRender: (record) => {
                  const summary = record.reconciliation?.summary || record.summary;
                  const verification = record.verification;
                  
                  if (!summary) return null;
                  
                  return (
                    <div style={{ padding: '12px' }}>
                      <Row gutter={[16, 16]}>
                        <Col span={6}>
                          <Statistic 
                            title="Tank Decrease"
                            value={formatVolume(summary.totals?.tankDecrease)}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic 
                            title="Offload Volume"
                            value={formatVolume(summary.totals?.offloadVolume)}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic 
                            title="Net Decrease"
                            value={formatVolume(summary.totals?.netDecrease)}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic 
                            title="Reconciliation Rate"
                            value={summary.reconciliationRate || 0}
                            suffix="%"
                            precision={1}
                          />
                        </Col>
                      </Row>
                      
                      {verification?.alerts?.length > 0 && (
                        <Alert
                          message={`${verification.alerts.length} Alert(s)`}
                          description={
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                              {verification.alerts.slice(0, 3).map((alert, idx) => (
                                <li key={idx}>
                                  <Text type={alert.severity === 'HIGH' ? 'danger' : 'warning'}>
                                    {alert.message}
                                  </Text>
                                </li>
                              ))}
                              {verification.alerts.length > 3 && (
                                <li>...and {verification.alerts.length - 3} more</li>
                              )}
                            </ul>
                          }
                          type="warning"
                          showIcon
                          style={{ marginTop: '12px' }}
                        />
                      )}
                    </div>
                  );
                },
                rowExpandable: (record) => 
                  record.reconciliation?.summary || record.summary
              }}
            />
            
            {shiftsData?.summary && (
              <div style={{ marginTop: '16px' }}>
                <Divider orientation="left">Summary</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <Text type="secondary">Average per shift:</Text>
                  </Col>
                  <Col span={4}>
                    <Text>Offloads: {shiftsData.summary.averagePerShift?.offloads}</Text>
                  </Col>
                  <Col span={4}>
                    <Text>Readings: {shiftsData.summary.averagePerShift?.readings}</Text>
                  </Col>
                  <Col span={4}>
                    <Text>Sales: {formatCurrency(shiftsData.summary.averagePerShift?.sales)}</Text>
                  </Col>
                  <Col span={4}>
                    <Text>Liters: {formatVolume(shiftsData.summary.averagePerShift?.liters)}</Text>
                  </Col>
                </Row>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Shift Detail Modal (for when navigation isn't available) */}
      <Modal
        title={`Shift #${selectedShift?.shift?.shiftNumber || selectedShift?.shiftNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="view" 
            type="primary"
            onClick={() => {
              const shift = selectedShift?.shift || selectedShift;
              if (shift?.id) {
                navigate(`/shifts/reconciliation/${shift.id}`, {
                  state: {
                    shiftId: shift.id,
                    shiftNumber: shift.shiftNumber,
                    stationId: shift.station?.id
                  }
                });
              }
              setDetailModalVisible(false);
            }}
          >
            Full Details
          </Button>
        ]}
        width={600}
      >
        {selectedShift && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Shift Number">
              {selectedShift.shift?.shiftNumber || selectedShift.shiftNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {selectedShift.shift?.station?.name || selectedShift.station?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Supervisor">
              {selectedShift.shift?.supervisor?.name || selectedShift.supervisor?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Start Time">
              {formatDate(selectedShift.shift?.startTime || selectedShift.startTime)}
            </Descriptions.Item>
            <Descriptions.Item label="End Time">
              {selectedShift.shift?.endTime ? formatDate(selectedShift.shift.endTime) : 'Ongoing'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge {...getStatusBadge(selectedShift.shift?.status || selectedShift.status)} />
            </Descriptions.Item>
            <Descriptions.Item label="Total Dispensed">
              {formatVolume(selectedShift.reconciliation?.summary?.totals?.dispensed || 
                           selectedShift.summary?.totals?.dispensed)}
            </Descriptions.Item>
            <Descriptions.Item label="Total Variance">
              <Text style={{ color: getVarianceColor(selectedShift.reconciliation?.summary?.totals?.variance) }}>
                {formatVolume(selectedShift.reconciliation?.summary?.totals?.variance)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Offloads">
              {selectedShift.reconciliation?.summary?.offloadSummary?.totalOffloads || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Alerts">
              {selectedShift.verification?.alerts?.length || 0}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ReconciliationTest;