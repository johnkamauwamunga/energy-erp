// src/components/dashboards/common/debtTransfer/components/management/TransferList.jsx
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Tag, 
  Space, 
  Button, 
  Input, 
  DatePicker, 
  Card, 
  Statistic,
  Row,
  Col,
  Select,
  Form,
  message,
  Modal,
  Descriptions
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  EyeOutlined,
  UserOutlined
} from '@ant-design/icons';

import { debtTransferService } from '../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../context/AppContext';

// Add report generator imports
import ReportGenerator from '../../../../common/downloadable/ReportGenerator';
import AdvancedReportGenerator from '../../../../common/downloadable/AdvancedReportGenerator';

const { RangePicker } = DatePicker;
const { Option } = Select;

const TransferList = () => {
  const { state } = useApp();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    transferCategory: '',
    status: '',
    dateRange: []
  });
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const currentUser = state.currentUser;
  const currentStation = state.currentUser?.stationId;

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };

      // Add date range filters if provided
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0]?.format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1]?.format('YYYY-MM-DD');
      }

      const response = await debtTransferService.getAccountTransfers(params);
      
      if (response.success) {
        setTransfers(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || response.total || 0
        }));
      } else {
        message.error(response.message || 'Failed to load transfers');
      }
    } catch (error) {
      console.error('Failed to load transfers:', error);
      message.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [pagination.current, pagination.pageSize, filters]);

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      transferCategory: '',
      status: '',
      dateRange: []
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getTransferCategoryColor = (category) => {
    const colors = {
      DEBT_SETTLEMENT: 'green',
      DEBT_TRANSFER: 'blue',
      ELECTRONIC_SETTLEMENT: 'purple',
      CROSS_STATION: 'orange',
      INTER_STATION: 'cyan'
    };
    return colors[category] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      COMPLETED: 'success',
      PENDING: 'processing',
      REVERSED: 'error',
      FAILED: 'error',
      CANCELLED: 'default'
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'KES 0';
    return `KES ${amount.toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      title: 'Transfer Number',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      width: 150,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'From Account',
      dataIndex: 'fromAccount',
      key: 'fromAccount',
      width: 180,
      render: (account, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{account?.accountName || record.fromAccountName}</div>
          <small style={{ color: '#666' }}>
            {account?.accountType?.replace(/_/g, ' ') || record.fromAccountType?.replace(/_/g, ' ')}
          </small>
          {account?.accountNumber && (
            <div style={{ fontSize: '11px', color: '#999' }}>
              {account.accountNumber}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'To Account',
      dataIndex: 'toAccount',
      key: 'toAccount',
      width: 180,
      render: (account, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{account?.accountName || record.toAccountName}</div>
          <small style={{ color: '#666' }}>
            {account?.accountType?.replace(/_/g, ' ') || record.toAccountType?.replace(/_/g, ' ')}
          </small>
          {account?.accountNumber && (
            <div style={{ fontSize: '11px', color: '#999' }}>
              {account.accountNumber}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <strong style={{ color: '#1890ff' }}>
          {formatCurrency(amount)}
        </strong>
      ),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Category',
      dataIndex: 'transferCategory',
      key: 'transferCategory',
      width: 150,
      render: (category) => (
        <Tag color={getTransferCategoryColor(category)}>
          {category?.replace(/_/g, ' ')}
        </Tag>
      ),
      filters: [
        { text: 'Debt Settlement', value: 'DEBT_SETTLEMENT' },
        { text: 'Debt Transfer', value: 'DEBT_TRANSFER' },
        { text: 'Electronic Settlement', value: 'ELECTRONIC_SETTLEMENT' },
        { text: 'Cross Station', value: 'CROSS_STATION' },
      ],
      onFilter: (value, record) => record.transferCategory === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Completed', value: 'COMPLETED' },
        { text: 'Pending', value: 'PENDING' },
        { text: 'Reversed', value: 'REVERSED' },
        { text: 'Failed', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Station',
      dataIndex: 'station',
      key: 'station',
      width: 120,
      render: (station) => station?.name || 'N/A'
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 120,
      render: (ref) => ref ? <Tag color="blue">{ref}</Tag> : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            View
          </Button>
        </Space>
      )
    }
  ];

  const handleViewDetails = (transfer) => {
    setSelectedTransfer(transfer);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedTransfer(null);
  };

  // Calculate statistics from actual data
  const totalAmount = transfers.reduce((sum, t) => sum + (t.amount || 0), 0);
  const completedCount = transfers.filter(t => t.status === 'COMPLETED').length;
  const pendingCount = transfers.filter(t => t.status === 'PENDING').length;
  const reversedCount = transfers.filter(t => t.status === 'REVERSED').length;

  // Enhanced transfer data for better reporting
  const enhancedTransfers = transfers.map(transfer => ({
    ...transfer,
    formattedDate: formatDateTime(transfer.createdAt),
    formattedAmount: formatCurrency(transfer.amount),
    formattedCategory: transfer.transferCategory?.replace(/_/g, ' '),
    stationName: transfer.station?.name || 'N/A',
    fromAccountDisplay: transfer.fromAccount?.accountName || transfer.fromAccountName,
    toAccountDisplay: transfer.toAccount?.accountName || transfer.toAccountName
  }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card size="small">
        <Form layout="inline">
          <Form.Item label="Search">
            <Input
              placeholder="Search by transfer number, reference..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Form.Item>
          
          <Form.Item label="Category">
            <Select
              value={filters.transferCategory}
              onChange={(value) => handleFilterChange('transferCategory', value)}
              style={{ width: 180 }}
              allowClear
              placeholder="All Categories"
            >
              <Option value="DEBT_SETTLEMENT">Debt Settlement</Option>
              <Option value="DEBT_TRANSFER">Debt Transfer</Option>
              <Option value="ELECTRONIC_SETTLEMENT">Electronic Settlement</Option>
              <Option value="CROSS_STATION">Cross Station</Option>
              <Option value="INTER_STATION">Inter Station</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Status">
            <Select
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: 130 }}
              allowClear
              placeholder="All Status"
            >
              <Option value="COMPLETED">Completed</Option>
              <Option value="PENDING">Pending</Option>
              <Option value="REVERSED">Reversed</Option>
              <Option value="FAILED">Failed</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Date Range">
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              style={{ width: 240 }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={loadTransfers}
                loading={loading}
              >
                Search
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
                disabled={loading}
              >
                Reset
              </Button>
              {/* ADDED DOWNLOAD BUTTON */}
              <AdvancedReportGenerator
                dataSource={enhancedTransfers}
                columns={columns}
                title={`Debt Transfer Report - ${currentStation ? 'Station' : 'Company'} Level`}
                fileName={`debt_transfers_${new Date().toISOString().split('T')[0]}`}
                footerText={`Generated from Energy ERP System - User: ${currentUser?.firstName} ${currentUser?.lastName} - ${new Date().toLocaleDateString()}`}
                showFooter={true}
              />
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Statistics */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Transfers"
              value={pagination.total}
              prefix={<ReloadOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Amount"
              value={totalAmount}
              prefix="KES"
              formatter={value => value.toLocaleString()}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={completedCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Pending/Reversed"
              value={pendingCount + reversedCount}
              valueStyle={{ color: pendingCount + reversedCount > 0 ? '#faad14' : '#d9d9d9' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Transfers Table */}
      <Card 
        title={
          <Space>
            <ReloadOutlined />
            Account Transfers
            <Tag color="blue">{pagination.total}</Tag>
          </Space>
        }
        extra={
          <AdvancedReportGenerator
            dataSource={enhancedTransfers}
            columns={columns}
            title={`Debt Transfer Report - ${currentStation ? 'Station' : 'Company'} Level`}
            fileName={`debt_transfers_${new Date().toISOString().split('T')[0]}`}
            footerText={`Generated from Energy ERP System - User: ${currentUser?.firstName} ${currentUser?.lastName} - ${new Date().toLocaleDateString()}`}
            showFooter={true}
          />
        }
      >
        <Table
          columns={columns}
          dataSource={enhancedTransfers}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} transfers`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          rowKey="id"
          size="middle"
        />
      </Card>

      {/* Transfer Details Modal */}
      <Modal
        title="Transfer Details"
        open={detailModalVisible}
        onCancel={handleCloseDetailModal}
        footer={[
          <Button key="close" onClick={handleCloseDetailModal}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedTransfer && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Transfer Number">
              <strong>{selectedTransfer.transferNumber}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Date & Time">
              {formatDateTime(selectedTransfer.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {formatCurrency(selectedTransfer.amount)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag color={getTransferCategoryColor(selectedTransfer.transferCategory)}>
                {selectedTransfer.transferCategory?.replace(/_/g, ' ')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedTransfer.status)}>
                {selectedTransfer.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="From Account">
              <div>
                <strong>{selectedTransfer.fromAccount?.accountName || selectedTransfer.fromAccountName}</strong>
                <br />
                <small style={{ color: '#666' }}>
                  {selectedTransfer.fromAccount?.accountType?.replace(/_/g, ' ') || selectedTransfer.fromAccountType?.replace(/_/g, ' ')}
                </small>
                {selectedTransfer.fromAccount?.accountNumber && (
                  <div>Account: {selectedTransfer.fromAccount.accountNumber}</div>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="To Account">
              <div>
                <strong>{selectedTransfer.toAccount?.accountName || selectedTransfer.toAccountName}</strong>
                <br />
                <small style={{ color: '#666' }}>
                  {selectedTransfer.toAccount?.accountType?.replace(/_/g, ' ') || selectedTransfer.toAccountType?.replace(/_/g, ' ')}
                </small>
                {selectedTransfer.toAccount?.accountNumber && (
                  <div>Account: {selectedTransfer.toAccount.accountNumber}</div>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Reference">
              {selectedTransfer.referenceNumber || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Station">
              {selectedTransfer.station?.name || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedTransfer.description || 'No description provided'}
            </Descriptions.Item>
            {selectedTransfer.createdBy && (
              <Descriptions.Item label="Created By">
                <Space>
                  <UserOutlined />
                  <span>
                    {selectedTransfer.createdBy.firstName} {selectedTransfer.createdBy.lastName}
                  </span>
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default TransferList;