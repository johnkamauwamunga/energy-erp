// src/components/shift/ShiftManagementTable.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  Input,
  Select,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  DatePicker,
  Modal,
  Form,
  Progress,
  Divider,
  Popconfirm,
  message,
  Tabs,
  Empty
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExportOutlined,
  CalculatorOutlined,
  ReconciliationOutlined,
  SafetyCertificateOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { shiftService, SHIFT_STATUS, RECONCILIATION_STATUS } from '../../../services/shiftService';
import { assetService } from '../../../services/assetService';
import { wetStockService } from '../../../services/wetStockService';
import { useApp } from '../../../context/AppContext';
import ShiftDetailsModal from './ShiftDetailsModal';
import ReconciliationModal from './ReconciliationModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;
const { TabPane } = Tabs;

const ShiftManagementTable = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0
  });
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tankId: '',
    dateRange: null,
    page: 1,
    limit: 20,
    sortBy: 'startTime',
    sortOrder: 'desc'
  });

  const currentStation = state.currentStation?.id;
  const currentCompany = state.currentCompany?.id;
  const userRole = state.user?.role;

  // Fetch shifts and tanks data
  const fetchData = async () => {
    if (!currentStation && !currentCompany) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching shifts with filters:", filters);
      
      // Build filters for API
      const apiFilters = shiftService.buildShiftFilters({
        stationId: currentStation,
        companyId: currentCompany,
        status: filters.status,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString(),
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        includeAssets: true,
        includeReadings: true
      });

      let shiftsData;
      if (currentStation) {
        shiftsData = await shiftService.getShiftsByStationWithAssets(currentStation, apiFilters);
      } else if (currentCompany) {
        shiftsData = await shiftService.getShiftsByCompanyWithAssets(currentCompany, apiFilters);
      }

      // Transform the data for display
      const transformedData = shiftService.transformShiftData(shiftsData, true);
      const shiftsList = transformedData?.data?.shifts || transformedData?.shifts || [];
      
      console.log(`✅ Retrieved ${shiftsList.length} shifts`);
      
      setShifts(Array.isArray(shiftsList) ? shiftsList : []);
      setPagination({
        page: transformedData?.pagination?.page || 1,
        limit: transformedData?.pagination?.limit || 20,
        totalCount: transformedData?.pagination?.totalCount || 0,
        totalPages: transformedData?.pagination?.totalPages || 0
      });

      // Fetch tanks for filter
      await fetchTanks();

    } catch (error) {
      console.error('❌ Failed to fetch shifts:', error);
      message.error(error.message || 'Failed to fetch shifts');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tanks for the current station/company
  const fetchTanks = async () => {
    try {
      let tanksData;
      if (currentStation) {
        const assets = await assetService.getStationAssets(currentStation);
        // Extract tanks from assets
        const stationTanks = extractTanksFromAssets(assets);
        setTanks(stationTanks);
      } else if (currentCompany) {
        const assets = await assetService.getCompanyAssets(currentCompany);
        const companyTanks = extractTanksFromAssets(assets);
        setTanks(companyTanks);
      }
    } catch (error) {
      console.error('Failed to fetch tanks:', error);
      setTanks([]);
    }
  };

  // Extract tanks from assets data
  const extractTanksFromAssets = (assets) => {
    if (!assets?.data) return [];
    
    const tanks = [];
    
    // Handle different response structures
    const assetsList = assets.data.assets || assets.data || assets;
    
    assetsList.forEach(station => {
      if (station.tanks) {
        station.tanks.forEach(tank => {
          tanks.push({
            id: tank.id,
            name: tank.asset?.name || tank.name,
            productName: tank.product?.name,
            capacity: tank.capacity,
            currentVolume: tank.currentVolume
          });
        });
      }
    });
    
    return tanks;
  };

  useEffect(() => {
    fetchData();
  }, [currentStation, currentCompany, filters.page, filters.limit, filters.status, filters.dateRange]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle table pagination
  const handleTableChange = (newPagination, filters, sorter) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize,
      sortBy: sorter.field || 'startTime',
      sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc'
    }));
  };

  // Status configuration
  const getStatusConfig = (status) => {
    const config = {
      'OPEN': { color: 'green', label: 'Open', badge: 'success', icon: <ClockCircleOutlined /> },
      'CLOSED': { color: 'blue', label: 'Closed', badge: 'processing', icon: <CheckCircleOutlined /> },
      'UNDER_REVIEW': { color: 'orange', label: 'Under Review', badge: 'warning', icon: <SafetyCertificateOutlined /> },
      'APPROVED': { color: 'purple', label: 'Approved', badge: 'default', icon: <SafetyCertificateOutlined /> }
    };
    return config[status] || config.CLOSED;
  };

  // Reconciliation status configuration
  const getReconciliationConfig = (status) => {
    const config = {
      'COMPLETED': { color: 'green', label: 'Completed', badge: 'success' },
      'DISCREPANCY': { color: 'red', label: 'Discrepancy', badge: 'error' },
      'UNDER_REVIEW': { color: 'orange', label: 'Under Review', badge: 'warning' },
      'PENDING': { color: 'blue', label: 'Pending', badge: 'default' },
      'IN_PROGRESS': { color: 'blue', label: 'In Progress', badge: 'processing' }
    };
    return config[status] || config.PENDING;
  };

  // Calculate variance percentage
  const calculateVariancePercentage = (shift) => {
    const totalRevenue = shift.totalRevenue || 0;
    const totalCollections = shift.totalCollections || 0;
    
    if (totalRevenue === 0) return 0;
    
    return Math.abs(((totalCollections - totalRevenue) / totalRevenue) * 100);
  };

  // Check if shift has critical variance
  const hasCriticalVariance = (shift) => {
    const variancePercentage = calculateVariancePercentage(shift);
    return variancePercentage > 5; // 5% threshold for critical variance
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Format volume
  const formatVolume = (liters) => {
    return `${new Intl.NumberFormat('en-US').format(liters || 0)}L`;
  };

  // Calculate completion percentage for open shifts
  const calculateCompletionPercentage = (shift) => {
    if (shift.status !== 'OPEN') return 100;
    
    const totalAssets = (shift.metrics?.totalPumps || 0) + (shift.metrics?.totalTanks || 0);
    const completedReadings = (shift.recentReadingsCount || 0);
    
    if (totalAssets === 0) return 0;
    
    return Math.min(Math.round((completedReadings / totalAssets) * 100), 100);
  };

  // Main table columns
  const columns = [
    {
      title: 'Shift #',
      dataIndex: 'shiftNumber',
      key: 'shiftNumber',
      width: 100,
      fixed: 'left',
      sorter: true,
      render: (shiftNumber, record) => (
        <div>
          <Text strong>#{shiftNumber}</Text>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.stationName}
          </div>
        </div>
      )
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisorName',
      key: 'supervisorName',
      width: 150,
      render: (supervisor) => supervisor || 'Unassigned'
    },
    {
      title: 'Time Range',
      key: 'timeRange',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            <Text strong>Start: </Text>
            {record.startTime ? new Date(record.startTime).toLocaleString() : 'N/A'}
          </div>
          {record.endTime && (
            <div style={{ fontSize: '12px' }}>
              <Text strong>End: </Text>
              {new Date(record.endTime).toLocaleString()}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (_, record) => {
        if (!record.startTime) return 'N/A';
        
        const start = new Date(record.startTime);
        const end = record.endTime ? new Date(record.endTime) : new Date();
        const durationMs = end - start;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      filters: [
        { text: 'Open', value: 'OPEN' },
        { text: 'Closed', value: 'CLOSED' },
        { text: 'Under Review', value: 'UNDER_REVIEW' },
        { text: 'Approved', value: 'APPROVED' }
      ],
      render: (status, record) => {
        const config = getStatusConfig(status);
        
        if (status === 'OPEN') {
          const completion = calculateCompletionPercentage(record);
          return (
            <div>
              <Badge {...config} text={config.label} />
              <Progress 
                percent={completion} 
                size="small" 
                style={{ marginTop: 4, width: 80 }}
                showInfo={false}
              />
            </div>
          );
        }
        
        return <Badge {...config} text={config.label} />;
      }
    },
    {
      title: 'Reconciliation',
      key: 'reconciliation',
      width: 140,
      render: (_, record) => {
        const status = record.reconciliationStatus || 'PENDING';
        const config = getReconciliationConfig(status);
        
        return (
          <div>
            <Badge {...config} text={config.label} />
            {record.hasDiscrepancies && (
              <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                Critical Variance
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Financials',
      key: 'financials',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            <Text strong>Revenue: </Text>
            {formatCurrency(record.totalRevenue)}
          </div>
          <div style={{ fontSize: '12px' }}>
            <Text strong>Collections: </Text>
            {formatCurrency(record.totalCollections)}
          </div>
          {record.totalRevenue > 0 && (
            <div style={{ 
              fontSize: '11px', 
              color: hasCriticalVariance(record) ? '#ff4d4f' : '#52c41a'
            }}>
              Variance: {calculateVariancePercentage(record).toFixed(1)}%
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Metrics',
      key: 'metrics',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>👥 {record.metrics?.totalAttendants || 0} attendants</div>
          <div>⛽ {record.metrics?.totalPumps || 0} pumps</div>
          <div>🛢️ {record.metrics?.totalTanks || 0} tanks</div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" direction="vertical">
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewDetails(record)}
              >
                Details
              </Button>
            </Tooltip>
            
            {record.status === 'CLOSED' && (
              <Tooltip title="Wet Stock Reconciliation">
                <Button 
                  icon={<CalculatorOutlined />}
                  size="small"
                  type={record.reconciliationStatus === 'PENDING' ? 'primary' : 'default'}
                  danger={record.hasDiscrepancies}
                  onClick={() => handleReconciliation(record)}
                >
                  Reconcile
                </Button>
              </Tooltip>
            )}
          </Space>
          
          <Space size="small">
            <Tooltip title="Generate Report">
              <Button 
                icon={<FileTextOutlined />} 
                size="small"
                onClick={() => handleGenerateReport(record)}
              >
                Report
              </Button>
            </Tooltip>
            
            {userRole === 'SUPER_ADMIN' && record.status === 'UNDER_REVIEW' && (
              <Tooltip title="Approve Shift">
                <Button 
                  icon={<CheckCircleOutlined />}
                  size="small"
                  type="primary"
                  onClick={() => handleApproveShift(record)}
                >
                  Approve
                </Button>
              </Tooltip>
            )}
          </Space>
        </Space>
      )
    }
  ];

  // Action handlers
  const handleViewDetails = (shift) => {
    setSelectedShift(shift);
    setShowDetails(true);
  };

  const handleReconciliation = async (shift) => {
    try {
      // Check if reconciliation already exists
      const reconciliation = await wetStockService.getWetStockReconciliation(shift.id);
      
      if (reconciliation.data) {
        setSelectedShift({ ...shift, reconciliation: reconciliation.data });
      } else {
        setSelectedShift(shift);
      }
      
      setShowReconciliation(true);
    } catch (error) {
      // If no reconciliation exists, proceed with the shift
      setSelectedShift(shift);
      setShowReconciliation(true);
    }
  };

  const handleGenerateReport = async (shift) => {
    setGeneratingReport(true);
    try {
      // Generate comprehensive shift report
      await generateShiftReport(shift);
      message.success('Shift report generated successfully');
    } catch (error) {
      console.error('Failed to generate report:', error);
      message.error('Failed to generate shift report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleApproveShift = async (shift) => {
    try {
      // Implement shift approval logic
      message.success(`Shift ${shift.shiftNumber} approved successfully`);
      fetchData(); // Refresh data
    } catch (error) {
      message.error('Failed to approve shift');
    }
  };

  // Report generation functions
  const generateShiftReport = async (shift) => {
    // Generate PDF report with charts
    await generatePDFReport(shift);
    
    // Also generate Excel report
    await generateExcelReport(shift);
  };

  const generatePDFReport = async (shift) => {
    // Implementation for PDF generation with charts
    console.log('Generating PDF report for shift:', shift.id);
    
    // This would integrate with a PDF generation service
    // For now, we'll create a simple download
    const reportData = {
      shiftNumber: shift.shiftNumber,
      stationName: shift.stationName,
      supervisorName: shift.supervisorName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      totalRevenue: shift.totalRevenue,
      totalCollections: shift.totalCollections,
      variance: calculateVariancePercentage(shift),
      metrics: shift.metrics
    };
    
    // Create a simple text file as placeholder
    const content = `Shift Report - #${shift.shiftNumber}
    
Station: ${shift.stationName}
Supervisor: ${shift.supervisorName}
Period: ${new Date(shift.startTime).toLocaleString()} - ${shift.endTime ? new Date(shift.endTime).toLocaleString() : 'Ongoing'}
Status: ${shift.status}

FINANCIAL SUMMARY:
Total Revenue: ${formatCurrency(shift.totalRevenue)}
Total Collections: ${formatCurrency(shift.totalCollections)}
Variance: ${calculateVariancePercentage(shift).toFixed(2)}%

OPERATIONAL METRICS:
Attendants: ${shift.metrics?.totalAttendants || 0}
Pumps: ${shift.metrics?.totalPumps || 0}
Tanks: ${shift.metrics?.totalTanks || 0}

Generated on: ${new Date().toLocaleString()}
    `;
    
    downloadFile(content, `shift-report-${shift.shiftNumber}.txt`, 'text/plain');
  };

  const generateExcelReport = async (shift) => {
    // Implementation for Excel generation
    console.log('Generating Excel report for shift:', shift.id);
    
    // Placeholder for Excel generation
    message.info('Excel report generation would be implemented here');
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Bulk operations
  const handleBulkReconciliation = async () => {
    const closedShifts = shifts.filter(s => s.status === 'CLOSED' && s.reconciliationStatus === 'PENDING');
    
    if (closedShifts.length === 0) {
      message.info('No shifts pending reconciliation');
      return;
    }

    Modal.confirm({
      title: 'Bulk Reconciliation',
      content: `Start wet stock reconciliation for ${closedShifts.length} closed shifts?`,
      onOk: async () => {
        try {
          const results = await wetStockService.bulkCalculateReconciliations(
            closedShifts.map(s => s.id)
          );
          
          message.success(`Bulk reconciliation completed: ${results.successful} successful, ${results.failed} failed`);
          fetchData(); // Refresh data
        } catch (error) {
          message.error('Failed to perform bulk reconciliation');
        }
      }
    });
  };

  const handleExportAll = async () => {
    setGeneratingReport(true);
    try {
      // Export all shifts data
      const exportData = shifts.map(shift => ({
        'Shift Number': shift.shiftNumber,
        'Station': shift.stationName,
        'Supervisor': shift.supervisorName,
        'Start Time': new Date(shift.startTime).toLocaleString(),
        'End Time': shift.endTime ? new Date(shift.endTime).toLocaleString() : 'N/A',
        'Status': shift.status,
        'Revenue': shift.totalRevenue,
        'Collections': shift.totalCollections,
        'Variance %': calculateVariancePercentage(shift).toFixed(2),
        'Attendants': shift.metrics?.totalAttendants || 0,
        'Pumps': shift.metrics?.totalPumps || 0,
        'Reconciliation Status': shift.reconciliationStatus
      }));
      
      const csvContent = convertToCSV(exportData);
      downloadFile(csvContent, 'shifts-export.csv', 'text/csv');
      message.success('Data exported successfully');
    } catch (error) {
      message.error('Failed to export data');
    } finally {
      setGeneratingReport(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  // Statistics calculation
  const statistics = useMemo(() => {
    const totalShifts = shifts.length;
    const openShifts = shifts.filter(s => s.status === 'OPEN').length;
    const closedShifts = shifts.filter(s => s.status === 'CLOSED').length;
    const underReviewShifts = shifts.filter(s => s.status === 'UNDER_REVIEW').length;
    
    const totalRevenue = shifts.reduce((sum, shift) => sum + (shift.totalRevenue || 0), 0);
    const totalCollections = shifts.reduce((sum, shift) => sum + (shift.totalCollections || 0), 0);
    const shiftsWithDiscrepancies = shifts.filter(s => s.hasDiscrepancies).length;
    
    return {
      totalShifts,
      openShifts,
      closedShifts,
      underReviewShifts,
      totalRevenue,
      totalCollections,
      shiftsWithDiscrepancies,
      collectionEfficiency: totalRevenue > 0 ? (totalCollections / totalRevenue) * 100 : 0
    };
  }, [shifts]);

  if (!currentStation && !currentCompany) {
    return (
      <Alert
        message="No Station or Company Selected"
        description="Please select a station or company to manage shifts."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <Card>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>Shift Management</Title>
            <Text type="secondary">
              Manage and monitor shifts for {currentStation ? state.currentStation?.name : state.currentCompany?.name}
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportAll}
                loading={generatingReport}
              >
                Export All
              </Button>
              <Button
                icon={<CalculatorOutlined />}
                onClick={handleBulkReconciliation}
                type="primary"
              >
                Bulk Reconcile
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={16}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Shifts"
              value={statistics.totalShifts}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Open Shifts"
              value={statistics.openShifts}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Closed Shifts"
              value={statistics.closedShifts}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Under Review"
              value={statistics.underReviewShifts}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Revenue"
              value={statistics.totalRevenue}
              formatter={value => formatCurrency(value)}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Collection Efficiency"
              value={statistics.collectionEfficiency}
              suffix="%"
              valueStyle={{ 
                color: statistics.collectionEfficiency >= 95 ? '#52c41a' : 
                       statistics.collectionEfficiency >= 90 ? '#faad14' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search by shift number or supervisor..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              onSearch={fetchData}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange({ status: value })}
              allowClear
            >
              <Option value="OPEN">Open</Option>
              <Option value="CLOSED">Closed</Option>
              <Option value="UNDER_REVIEW">Under Review</Option>
              <Option value="APPROVED">Approved</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Tank"
              value={filters.tankId}
              onChange={(value) => handleFilterChange({ tankId: value })}
              allowClear
            >
              {tanks.map(tank => (
                <Option key={tank.id} value={tank.id}>
                  {tank.name} ({tank.productName})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange({ dateRange: dates })}
              showTime
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button 
                icon={<SearchOutlined />}
                onClick={fetchData}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  handleFilterChange({
                    search: '',
                    status: '',
                    tankId: '',
                    dateRange: null,
                    page: 1
                  });
                }}
              >
                Clear
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Shifts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={shifts}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} shifts`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: loading ? 
              'Loading shifts...' : 
              filters.search || filters.status ? 
                'No shifts match your filters' : 
                'No shifts found. Create a new shift to get started.'
          }}
        />
      </Card>

      {/* Modals */}
      {showDetails && selectedShift && (
        <ShiftDetailsModal
          shift={selectedShift}
          visible={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedShift(null);
          }}
          onRefresh={fetchData}
        />
      )}

      {showReconciliation && selectedShift && (
        <ReconciliationModal
          shift={selectedShift}
          visible={showReconciliation}
          onClose={() => {
            setShowReconciliation(false);
            setSelectedShift(null);
          }}
          onComplete={() => {
            setShowReconciliation(false);
            setSelectedShift(null);
            fetchData(); // Refresh data
          }}
        />
      )}
    </div>
  );
};

export default ShiftManagementTable;