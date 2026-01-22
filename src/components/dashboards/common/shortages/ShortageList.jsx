// src/components/Shortages/ShortageList.jsx - UPDATED
import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Dropdown,
  Typography,
  Badge,
  Modal,
  Descriptions,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Input,
  Select,
  DatePicker,
  Tooltip,
  Avatar,
  message,
  Popconfirm
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  HistoryOutlined,
  DownloadOutlined,
  FilterOutlined,
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  BankOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../../services/shortageService/shortageService';
import { useApp } from '../../../../context/AppContext';
import ShortageDeductionModal from './ShortageDeductionModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Helper function to extract staff information from nested structure
const getStaffInfo = (shortage) => {
  if (!shortage) return { name: 'Unknown', station: 'Unknown' };
  
  // Try to get from nested structure
  const staffAccount = shortage.ledger?.staffAccount;
  const user = staffAccount?.user;
  const station = staffAccount?.station;
  
  const staffName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
    : shortage.staffDisplayName || 'Unknown Staff';
  
  const stationName = station?.name || shortage.stationDisplayName || 'Unknown Station';
  
  return { name: staffName, station: stationName };
};

// Helper function to format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'Ksh 0';
  return `Ksh ${Number(amount).toLocaleString()}`;
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
};

// Helper function to get severity badge color
const getSeverityColor = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'red';
    case 'HIGH': return 'orange';
    case 'MODERATE': return 'gold';
    case 'MINOR': return 'blue';
    default: return 'default';
  }
};

// Helper function to get status badge color
const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE': return 'red';
    case 'PARTIALLY_DEDUCTED': return 'orange';
    case 'FULLY_DEDUCTED': return 'green';
    default: return 'default';
  }
};

// Helper function to get status display text
const getStatusDisplay = (status) => {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'PARTIALLY_DEDUCTED': return 'Partially Deducted';
    case 'FULLY_DEDUCTED': return 'Fully Deducted';
    default: return status || 'Unknown';
  }
};

// Helper function to get severity display text
const getSeverityDisplay = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'Critical';
    case 'HIGH': return 'High';
    case 'MODERATE': return 'Moderate';
    case 'MINOR': return 'Minor';
    default: return severity || 'Unknown';
  }
};

// Helper function to get shortage type display
const getShortageTypeDisplay = (type) => {
  switch (type) {
    case 'CASH': return 'Cash';
    case 'PRODUCT': return 'Product';
    case 'EQUIPMENT': return 'Equipment';
    case 'OTHER': return 'Other';
    default: return type || 'Unknown';
  }
};

// Helper function to calculate days until due
const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  
  try {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch {
    return null;
  }
};

const ShortageList = ({
  scope = 'station', // 'my', 'station', 'company', 'all'
  title = 'Shortages',
  showFilters = true,
  showActions = true,
  height = 600,
  onRefresh
}) => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [shortages, setShortages] = useState([]);
  const [selectedShortage, setSelectedShortage] = useState(null);
  const [modalVisible, setModalVisible] = useState({
    details: false,
    deduction: false,
    edit: false
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    shortageType: '',
    severity: '',
    responsibleParty: '',
    hasOutstanding: '',
    startDate: null,
    endDate: null,
    sortBy: 'shortageDate',
    sortOrder: 'desc'
  });

  const currentUser = state?.currentUser;
  const currentStation = state?.currentStation;

  // Fetch shortages based on scope
  const fetchShortages = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      
      const filterParams = {
        page,
        limit: pageSize,
        ...filters
      };
      
      // Clean up filters
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] === '' || filterParams[key] === null || filterParams[key] === undefined) {
          delete filterParams[key];
        }
      });
      
      let result;
      switch (scope) {
        case 'my':
          result = await shortageService.getMyShortages(filterParams);
          break;
        case 'station':
          result = await shortageService.getStationShortages(filterParams);
          break;
        case 'company':
          result = await shortageService.getCompanyShortages(filterParams);
          break;
        case 'all':
          result = await shortageService.getAllShortages(filterParams);
          break;
        default:
          result = await shortageService.getStationShortages(filterParams);
      }
      
      setShortages(result?.shortages || []);
      setPagination({
        current: page,
        pageSize,
        total: result?.pagination?.total || 0
      });
      
    } catch (error) {
      console.error('Error fetching shortages:', error);
      message.error(error.message || 'Failed to fetch shortages');
      setShortages([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    fetchShortages(newPagination.current, newPagination.pageSize);
  };

  // Apply filters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchShortages(1, pagination.pageSize);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchShortages();
  }, [scope]);

  // Handle refresh
  const handleRefresh = () => {
    fetchShortages(pagination.current, pagination.pageSize);
    if (onRefresh) onRefresh();
  };

  // Handle create deduction
  const handleCreateDeduction = (shortage) => {
    setSelectedShortage(shortage);
    setModalVisible(prev => ({ ...prev, deduction: true }));
  };

  // Handle view details
  const handleViewDetails = (shortage) => {
    setSelectedShortage(shortage);
    setModalVisible(prev => ({ ...prev, details: true }));
  };

  // Handle delete shortage
  const handleDeleteShortage = async (shortageId) => {
    try {
      setLoading(true);
      await shortageService.deleteShortage(shortageId);
      message.success('Shortage deleted successfully');
      fetchShortages(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Error deleting shortage:', error);
      message.error(error.message || 'Failed to delete shortage');
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      await shortageService.exportShortages(filters);
      message.success('Export started successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      message.error(error.message || 'Failed to export');
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (record) => {
        const staffInfo = getStaffInfo(record);
        return (
          <Space>
            <Avatar 
              size="small" 
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            >
              {staffInfo.name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <Text strong style={{ display: 'block' }}>
                {staffInfo.name}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {staffInfo.station}
              </Text>
            </div>
          </Space>
        );
      },
      sorter: (a, b) => {
        const aName = getStaffInfo(a).name;
        const bName = getStaffInfo(b).name;
        return aName.localeCompare(bName);
      }
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (record) => {
        const amountRemaining = record.amountRemaining || 0;
        const totalDeducted = (record.amount || 0) - amountRemaining;
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '16px' }}>
              {formatCurrency(record.amount)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Remaining: {formatCurrency(amountRemaining)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Paid: {formatCurrency(totalDeducted)}
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0)
    },
    {
      title: 'Details',
      key: 'details',
      render: (record) => {
        const daysUntilDue = getDaysUntilDue(record.dueDate);
        const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{record.description?.substring(0, 50)}...</Text>
            <Space size={4}>
              <Tag color="blue" size="small">
                {getShortageTypeDisplay(record.shortageType)}
              </Tag>
              <Tag color={getSeverityColor(record.severity)} size="small">
                {getSeverityDisplay(record.severity)}
              </Tag>
              {isOverdue && (
                <Tag color="red" size="small">Overdue</Tag>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatDate(record.shortageDate || record.createdAt)}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (record) => {
        const daysUntilDue = getDaysUntilDue(record.dueDate);
        const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
        
        return (
          <Space direction="vertical" size={2}>
            <Tag color={getStatusColor(record.status)} style={{ margin: 0 }}>
              {getStatusDisplay(record.status)}
            </Tag>
            {record.dueDate && (
              <Tag 
                color={isOverdue ? 'red' : (daysUntilDue <= 3 ? 'orange' : 'green')}
                size="small"
              >
                {isOverdue 
                  ? `Overdue ${Math.abs(daysUntilDue)}d` 
                  : `${daysUntilDue}d left`}
              </Tag>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'Partially Deducted', value: 'PARTIALLY_DEDUCTED' },
        { text: 'Fully Deducted', value: 'FULLY_DEDUCTED' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record) => {
        const amountRemaining = record.amountRemaining || 0;
        const canAddDeduction = amountRemaining > 0;
        
        return (
          <Space size="small">
            <Tooltip title="View Details">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            
            {canAddDeduction && (
              <Tooltip title="Add Deduction">
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => handleCreateDeduction(record)}
                />
              </Tooltip>
            )}
            
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'deductions',
                    label: 'View Deductions',
                    icon: <HistoryOutlined />,
                    onClick: () => {
                      // Navigate to deductions
                      setSelectedShortage(record);
                      // Could open a deductions modal here
                      message.info('Deductions history feature coming soon');
                    }
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditOutlined />,
                    disabled: true, // Temporarily disabled
                    onClick: () => {
                      message.info('Edit feature coming soon');
                    }
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    disabled: record.status !== 'ACTIVE', // Only allow deletion of active shortages
                    onClick: () => {
                      Modal.confirm({
                        title: 'Delete Shortage',
                        content: 'Are you sure you want to delete this shortage? This action cannot be undone.',
                        okText: 'Delete',
                        okType: 'danger',
                        cancelText: 'Cancel',
                        onOk: () => handleDeleteShortage(record.id)
                      });
                    }
                  }
                ]
              }}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  // Filter component
  const FilterSection = () => (
    <Card size="small" className="mb-4">
      <Row gutter={[8, 8]}>
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="Search descriptions..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Status"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            allowClear
          >
            <Option value="ACTIVE">Active</Option>
            <Option value="PARTIALLY_DEDUCTED">Partially Deducted</Option>
            <Option value="FULLY_DEDUCTED">Fully Deducted</Option>
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Type"
            value={filters.shortageType}
            onChange={(value) => setFilters(prev => ({ ...prev, shortageType: value }))}
            allowClear
          >
            {shortageService.SHORTAGE_TYPES?.map(type => (
              <Option key={type} value={type}>
                {getShortageTypeDisplay(type)}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Severity"
            value={filters.severity}
            onChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
            allowClear
          >
            {shortageService.SHORTAGE_SEVERITY?.map(severity => (
              <Option key={severity} value={severity}>
                {getSeverityDisplay(severity)}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Outstanding"
            value={filters.hasOutstanding}
            onChange={(value) => setFilters(prev => ({ ...prev, hasOutstanding: value }))}
            allowClear
          >
            <Option value="true">Has Outstanding</Option>
            <Option value="false">Fully Paid</Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['Start Date', 'End Date']}
            value={[filters.startDate, filters.endDate]}
            onChange={(dates) => {
              setFilters(prev => ({
                ...prev,
                startDate: dates?.[0] || null,
                endDate: dates?.[1] || null
              }));
            }}
            format="YYYY-MM-DD"
          />
        </Col>
      </Row>
    </Card>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0">
          <TeamOutlined className="mr-2" />
          {title} ({shortages.length})
        </Title>
        <Space>
          <Tooltip title="Refresh">
            <Button
              icon={<SearchOutlined />}
              onClick={handleRefresh}
              loading={loading}
            />
          </Tooltip>
          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Filters */}
      {showFilters && <FilterSection />}

      {/* Statistics Summary */}
      {shortages.length > 0 && (
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Amount"
                value={shortages.reduce((sum, s) => sum + (s.amount || 0), 0)}
                prefix="Ksh"
                valueStyle={{ fontSize: '16px' }}
                formatter={(value) => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Outstanding"
                value={shortages.reduce((sum, s) => sum + (s.amountRemaining || 0), 0)}
                prefix="Ksh"
                valueStyle={{ color: '#ff4d4f', fontSize: '16px' }}
                formatter={(value) => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Active"
                value={shortages.filter(s => s.status === 'ACTIVE').length}
                valueStyle={{ fontSize: '16px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Overdue"
                value={shortages.filter(s => {
                  const days = getDaysUntilDue(s.dueDate);
                  return days !== null && days < 0;
                }).length}
                valueStyle={{ color: '#ff4d4f', fontSize: '16px' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={shortages}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `Showing ${range[0]}-${range[1]} of ${total} shortages`
        }}
        onChange={handleTableChange}
        scroll={{ y: height }}
      />

      {/* Modals */}
      {/* Details Modal - UPDATED */}
      <Modal
        title="Shortage Details"
        open={modalVisible.details}
        onCancel={() => setModalVisible(prev => ({ ...prev, details: false }))}
        width={700}
        footer={null}
      >
        {selectedShortage && (() => {
          const staffInfo = getStaffInfo(selectedShortage);
          const daysUntilDue = getDaysUntilDue(selectedShortage.dueDate);
          const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
          const amountRemaining = selectedShortage.amountRemaining || 0;
          const totalDeducted = (selectedShortage.amount || 0) - amountRemaining;
          
          return (
            <div>
              <Descriptions title="Basic Information" bordered column={2}>
                <Descriptions.Item label="Staff Member" span={2}>
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>{staffInfo.name}</Text>
                      <br />
                      <Text type="secondary">{staffInfo.station}</Text>
                    </div>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                  <Space direction="vertical">
                    <Text strong style={{ fontSize: '18px' }}>
                      {formatCurrency(selectedShortage.amount)}
                    </Text>
                    <Text type="secondary">
                      Remaining: {formatCurrency(amountRemaining)}
                    </Text>
                    <Text type="secondary">
                      Paid: {formatCurrency(totalDeducted)}
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(selectedShortage.status)}>
                    {getStatusDisplay(selectedShortage.status)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color="blue">
                    {getShortageTypeDisplay(selectedShortage.shortageType)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <Tag color={getSeverityColor(selectedShortage.severity)}>
                    {getSeverityDisplay(selectedShortage.severity)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Responsible Party">
                  {selectedShortage.responsibleParty || 'ATTENDANT'}
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  {selectedShortage.description || 'No description'}
                </Descriptions.Item>
                <Descriptions.Item label="Comments" span={2}>
                  {selectedShortage.comments || 'No comments'}
                </Descriptions.Item>
                <Descriptions.Item label="Shortage Date">
                  {formatDate(selectedShortage.shortageDate || selectedShortage.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Due Date">
                  <Space direction="vertical">
                    <Text>{formatDate(selectedShortage.dueDate)}</Text>
                    {selectedShortage.dueDate && (
                      <Tag color={isOverdue ? 'red' : 'green'}>
                        {isOverdue 
                          ? `Overdue ${Math.abs(daysUntilDue)} days` 
                          : `${daysUntilDue} days left`}
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </div>
          );
        })()}
      </Modal>

      {/* Deduction Modal */}
      <ShortageDeductionModal
        visible={modalVisible.deduction}
        onCancel={() => setModalVisible(prev => ({ ...prev, deduction: false }))}
        onSuccess={() => {
          fetchShortages(pagination.current, pagination.pageSize);
          setModalVisible(prev => ({ ...prev, deduction: false }));
        }}
        shortage={selectedShortage}
        currentUser={currentUser}
      />
    </div>
  );
};

export default ShortageList;