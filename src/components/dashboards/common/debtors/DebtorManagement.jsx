// src/components/debtor/DebtorManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Progress,
  Grid,
  Avatar,
  Switch
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  ShopOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../services/debtorService/debtorService';
import { useApp } from '../../../../context/AppContext';
import CreateDebtorModal from './modal/CreateDebtorModal';
import EditDebtorModal from './modal/EditDebtorModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const DebtorManagement = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [showCreateDebtorModal, setShowCreateDebtorModal] = useState(false);
  const [showEditDebtorModal, setShowEditDebtorModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [debtorDetails, setDebtorDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    minDebt: '',
    maxDebt: '',
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const currentCompany = state.currentUser?.companyId;

  // Fetch all debtors
  const fetchDebtors = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching debtors with filters:", filters);
      
      const result = await debtorService.getDebtors({
        ...filters,
        includeStatistics: true
      });
      
      console.log("📦 Debtors response:", result);
      
      const debtorsData = result.debtors || result.data || result || [];
      setDebtors(debtorsData);
      
      setPagination({
        page: result.page || 1,
        limit: result.limit || 10,
        totalCount: result.totalCount || debtorsData.length,
        totalPages: result.totalPages || Math.ceil(debtorsData.length / 10)
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch debtors:', error);
      message.error('Failed to load debtors');
      setDebtors([]);
      setPagination({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch debtor statistics
  const [statistics, setStatistics] = useState(null);
  const fetchStatistics = async () => {
    try {
      const stats = await debtorService.getDebtorStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchDebtors();
    fetchStatistics();
  }, [currentCompany, filters.page, filters.limit, filters.status]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize
    }));
  };

  // Handle actions
  const handleEditDebtor = useCallback((debtor) => {
    setSelectedDebtor(debtor);
    setShowEditDebtorModal(true);
  }, []);

  const handleViewDetails = useCallback((debtor) => {
    setDebtorDetails(debtor);
    setShowDetailsModal(true);
  }, []);

  const handleToggleStatus = async (debtorId, currentStatus) => {
    try {
      await debtorService.updateDebtorStatus(debtorId, !currentStatus);
      message.success(`Debtor ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchDebtors();
      fetchStatistics();
    } catch (error) {
      message.error('Failed to update debtor status');
    }
  };

  const handleDeleteDebtor = async (debtorId) => {
    try {
      await debtorService.deleteDebtor(debtorId);
      message.success('Debtor deleted successfully');
      fetchDebtors();
      fetchStatistics();
    } catch (error) {
      message.error('Failed to delete debtor');
    }
  };

  // Status configurations
  const getDebtorStatusConfig = useCallback((debtor) => {
    if (!debtor.isActive) {
      return { color: 'red', label: 'Inactive', badge: 'error' };
    }
    
    if (debtor.totalDebt > 10000) {
      return { color: 'red', label: 'High Debt', badge: 'error' };
    } else if (debtor.totalDebt > 5000) {
      return { color: 'orange', label: 'Medium Debt', badge: 'warning' };
    } else if (debtor.totalDebt > 0) {
      return { color: 'blue', label: 'Active', badge: 'processing' };
    } else {
      return { color: 'green', label: 'No Debt', badge: 'success' };
    }
  }, []);

  // Responsive columns configuration
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Debtor',
        dataIndex: 'name',
        key: 'name',
        width: screens.xs ? 140 : 200,
        render: (name, record) => (
          <Space>
            <Avatar 
              size={screens.xs ? 32 : 40} 
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: screens.xs ? '14px' : '16px' }}>
                {name}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.contactPerson}
              </Text>
            </Space>
          </Space>
        ),
        fixed: screens.xs ? 'left' : false,
        sorter: (a, b) => a.name.localeCompare(b.name)
      },
      {
        title: 'Contact',
        key: 'contact',
        width: screens.xs ? 120 : 180,
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PhoneOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
              <Text style={{ fontSize: '12px' }}>{record.phone}</Text>
            </div>
            {record.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MailOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                <Text style={{ fontSize: '12px' }}>{record.email}</Text>
              </div>
            )}
          </Space>
        ),
        responsive: ['md']
      },
      {
        title: 'Total Debt',
        dataIndex: 'totalDebt',
        key: 'totalDebt',
        width: screens.xs ? 90 : 120,
        render: (amount) => (
          <Text strong type={amount > 0 ? "danger" : "success"}>
            {debtorService.formatCurrency(amount)}
          </Text>
        ),
        sorter: (a, b) => a.totalDebt - b.totalDebt
      },
      {
        title: 'Stations',
        dataIndex: 'totalStations',
        key: 'totalStations',
        width: screens.xs ? 80 : 100,
        render: (count, record) => (
          <Space>
            <ShopOutlined style={{ color: '#1890ff' }} />
            <Text>{count || record.stationAccounts?.length || 0}</Text>
          </Space>
        ),
        responsive: ['sm'],
        sorter: (a, b) => (a.totalStations || 0) - (b.totalStations || 0)
      },
      {
        title: 'Outstanding',
        dataIndex: 'totalOutstandingTransactions',
        key: 'outstanding',
        width: screens.xs ? 80 : 100,
        render: (count) => (
          <Badge 
            count={count} 
            showZero 
            style={{ backgroundColor: count > 0 ? '#faad14' : '#52c41a' }}
          />
        ),
        responsive: ['md']
      },
      {
        title: 'Status',
        key: 'status',
        width: screens.xs ? 90 : 130,
        render: (_, record) => {
          const config = getDebtorStatusConfig(record);
          return (
            <Space>
              <Switch
                size="small"
                checked={record.isActive}
                onChange={(checked) => handleToggleStatus(record.id, !checked)}
              />
              {screens.xs ? (
                <Badge status={config.badge} />
              ) : (
                <Badge status={config.badge} text={config.label} />
              )}
            </Space>
          );
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        width: screens.xs ? 100 : 150,
        fixed: screens.xs ? 'right' : false,
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            <Tooltip title="Edit Debtor">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                type="primary"
                onClick={() => handleEditDebtor(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete Debtor"
              description="Are you sure you want to delete this debtor? This action cannot be undone."
              onConfirm={() => handleDeleteDebtor(record.id)}
              okText="Yes"
              cancelText="No"
              okType="danger"
            >
              <Tooltip title="Delete">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                  disabled={record.totalDebt > 0}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    ];

    return baseColumns;
  }, [screens, getDebtorStatusConfig, handleEditDebtor, handleViewDetails, handleToggleStatus, handleDeleteDebtor]);

  // Format debtors for display
  const formattedDebtors = useMemo(() => 
    debtors.map(debtor => ({
      ...debtor,
      key: debtor.id
    })), 
    [debtors]
  );

  // Statistics calculations
  const stats = useMemo(() => {
    const total = pagination.totalCount;
    const active = debtors.filter(d => d.isActive).length;
    const inactive = debtors.filter(d => !d.isActive).length;
    const withDebt = debtors.filter(d => d.totalDebt > 0).length;
    const totalOutstanding = debtors.reduce((sum, debtor) => sum + debtor.totalDebt, 0);

    return { total, active, inactive, withDebt, totalOutstanding };
  }, [debtors, pagination.totalCount]);

  // Debt distribution analysis
  const debtDistribution = useMemo(() => {
    return {
      noDebt: debtors.filter(d => d.totalDebt === 0).length,
      lowDebt: debtors.filter(d => d.totalDebt > 0 && d.totalDebt <= 5000).length,
      mediumDebt: debtors.filter(d => d.totalDebt > 5000 && d.totalDebt <= 10000).length,
      highDebt: debtors.filter(d => d.totalDebt > 10000).length
    };
  }, [debtors]);

  // Export functionality
  const handleExportDebtors = useCallback(() => {
    debtorService.downloadDebtorsCSV(debtors, `debtors_export_${new Date().toISOString().split('T')[0]}.csv`);
    message.success('Debtors exported successfully');
  }, [debtors]);

  // Debtor Details Modal
  const DebtorDetailsModal = ({ debtor, visible, onClose }) => {
    if (!debtor) return null;

    const statusConfig = getDebtorStatusConfig(debtor);

    return (
      <Modal
        title={`Debtor Details - ${debtor.name}`}
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          <Button 
            key="edit" 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => {
              onClose();
              handleEditDebtor(debtor);
            }}
          >
            Edit Debtor
          </Button>
        ]}
        width={screens.xs ? '90%' : 700}
      >
        <div className="space-y-4">
          {/* Basic Information */}
          <Card size="small" title="Basic Information">
            <Descriptions column={screens.xs ? 1 : 2} size="small">
              <Descriptions.Item label="Debtor Name">
                <Text strong>{debtor.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">
                {debtor.contactPerson || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <Space>
                  <PhoneOutlined />
                  {debtor.phone}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <Space>
                  <MailOutlined />
                  {debtor.email || 'N/A'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={statusConfig.badge} text={statusConfig.label} />
              </Descriptions.Item>
              <Descriptions.Item label="Active">
                {debtor.isActive ? (
                  <Tag icon={<CheckCircleOutlined />} color="green">Active</Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="red">Inactive</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Financial Summary */}
          <Card size="small" title="Financial Summary">
            <Row gutter={16}>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Total Debt"
                  value={debtor.totalDebt}
                  formatter={value => debtorService.formatCurrency(value)}
                  valueStyle={{ 
                    color: debtor.totalDebt > 0 ? '#cf1322' : '#52c41a',
                    fontSize: screens.xs ? '14px' : '16px'
                  }}
                  prefix={<DollarOutlined />}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Stations"
                  value={debtor.totalStations || debtor.stationAccounts?.length || 0}
                  valueStyle={{ color: '#1890ff', fontSize: screens.xs ? '14px' : '16px' }}
                  prefix={<ShopOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Outstanding"
                  value={debtor.totalOutstandingTransactions || 0}
                  valueStyle={{ color: '#faad14', fontSize: screens.xs ? '14px' : '16px' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Station Accounts */}
          {(debtor.stationAccounts && debtor.stationAccounts.length > 0) && (
            <Card size="small" title="Station Accounts">
              <Space direction="vertical" style={{ width: '100%' }}>
                {debtor.stationAccounts.map((account, index) => (
                  <Card key={account.id || index} size="small" type="inner">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Station">
                        {account.station?.name || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Account Balance">
                        <Text type={account.balance > 0 ? "danger" : "success"}>
                          {debtorService.formatCurrency(account.balance || 0)}
                        </Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ))}
              </Space>
            </Card>
          )}

          {/* Additional Information */}
          <Card size="small" title="Additional Information">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Created">
                {new Date(debtor.createdAt).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {new Date(debtor.updatedAt).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Company ID">
                <Text code>{debtor.companyId}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </Modal>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <UserOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
      <div style={{ color: '#8c8c8c', fontSize: '16px', marginBottom: '8px' }}>
        No debtors found
      </div>
      <div style={{ color: '#bfbfbf', fontSize: '14px', marginBottom: '24px' }}>
        {filters.search || filters.status ? 
          'Try adjusting your filters to see more results' : 
          'Get started by creating your first debtor'
        }
      </div>
      {!(filters.search || filters.status) && (
        <Button 
          type="primary" 
          icon={<UserAddOutlined />}
          onClick={() => setShowCreateDebtorModal(true)}
          size="large"
        >
          Create First Debtor
        </Button>
      )}
    </div>
  );

  if (!currentCompany) {
    return (
      <Alert
        message="No Company Context"
        description="Please ensure you are logged into a company account."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '20px' : '24px' }}>
                Debtor Management
              </Title>
              <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '14px' }}>
                Manage your debtors and track their financial status
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify={screens.md ? "end" : "start"}>
              <Col xs={12} sm={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchDebtors}
                  loading={loading}
                  block={screens.xs}
                >
                  {screens.sm && 'Refresh'}
                </Button>
              </Col>
              <Col xs={12} sm={8}>
                <Button
                  onClick={handleExportDebtors}
                  disabled={debtors.length === 0}
                  block={screens.xs}
                >
                  Export CSV
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setShowCreateDebtorModal(true)}
                  block
                  size={screens.xs ? "middle" : "large"}
                >
                  Add Debtor
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Total Debtors"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="With Debt"
              value={stats.withDebt}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Total Outstanding"
              value={debtorService.formatCurrency(stats.totalOutstanding)}
              valueStyle={{ color: '#cf1322' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Debt Distribution */}
      <Card title="Debt Distribution" size="small">
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #52c41a' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="No Debt"
                value={debtDistribution.noDebt}
                valueStyle={{ color: '#52c41a', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #1890ff' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="Low Debt"
                value={debtDistribution.lowDebt}
                valueStyle={{ color: '#1890ff', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #faad14' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="Medium Debt"
                value={debtDistribution.mediumDebt}
                valueStyle={{ color: '#faad14', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #cf1322' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="High Debt"
                value={debtDistribution.highDebt}
                valueStyle={{ color: '#cf1322', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by name, phone, email..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              prefix={<SearchOutlined />}
              size="large"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange({ status: value })}
              allowClear
              size="large"
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="with_debt">With Debt</Option>
              <Option value="no_debt">No Debt</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Debt Range"
              value={filters.debtRange}
              onChange={(value) => handleFilterChange({ debtRange: value })}
              allowClear
              size="large"
            >
              <Option value="no_debt">No Debt</Option>
              <Option value="low">Low (≤ 5K)</Option>
              <Option value="medium">Medium (5K-10K)</Option>
              <Option value="high">High (>10K)</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Space>
              <Button 
                icon={<SearchOutlined />}
                onClick={fetchDebtors}
                loading={loading}
                type="primary"
                size="large"
                block={screens.xs}
              >
                {screens.sm && 'Search'}
              </Button>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  handleFilterChange({
                    search: '',
                    status: '',
                    debtRange: '',
                    page: 1
                  });
                }}
                size="large"
                block={screens.xs}
              >
                {screens.sm && 'Reset'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Debtors Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={formattedDebtors}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} debtors`,
            size: screens.xs ? 'small' : 'default',
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          scroll={{ x: screens.xs ? 800 : 1200 }}
          locale={{ emptyText: <EmptyState /> }}
          size={screens.xs ? 'small' : 'middle'}
        />
      </Card>

      {/* Modals */}
      <CreateDebtorModal
        visible={showCreateDebtorModal}
        onClose={() => setShowCreateDebtorModal(false)}
        onSuccess={() => {
          setShowCreateDebtorModal(false);
          fetchDebtors();
          fetchStatistics();
          message.success('Debtor created successfully');
        }}
      />

      <EditDebtorModal
        visible={showEditDebtorModal}
        onClose={() => {
          setShowEditDebtorModal(false);
          setSelectedDebtor(null);
        }}
        onSuccess={() => {
          setShowEditDebtorModal(false);
          setSelectedDebtor(null);
          fetchDebtors();
          fetchStatistics();
          message.success('Debtor updated successfully');
        }}
        debtor={selectedDebtor}
      />

      {/* Debtor Details Modal */}
      {debtorDetails && (
        <DebtorDetailsModal
          debtor={debtorDetails}
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setDebtorDetails(null);
          }}
        />
      )}

            {/* Modals */}
            {/* <CreateDebtorModal
              visible={showCreateDebtorModal}
              onClose={() => setShowCreateDebtorModal(false)}
              onSuccess={() => {
                setShowCreateDebtorModal(false);
                fetchDebts();
                fetchStatistics();
                message.success('Debtor created successfully');
              }}
            /> */}
    </div>
  );
};

export default DebtorManagement;