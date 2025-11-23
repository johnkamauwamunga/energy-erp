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
  Form
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  EyeOutlined 
} from '@ant-design/icons';

import { debtTransferService } from '../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../context/AppContext';

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

  const loadTransfers = async () => {
    setLoading(true);
    try {
      // This would call a service method to get account transfers
      // For now, we'll simulate data based on your backend structure
      const response = await debtTransferService.getAccountTransfers({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      });
      
      setTransfers(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0
      }));
    } catch (error) {
      console.error('Failed to load transfers:', error);
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
      CROSS_STATION: 'orange'
    };
    return colors[category] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      COMPLETED: 'success',
      PENDING: 'processing',
      REVERSED: 'error',
      FAILED: 'error'
    };
    return colors[status] || 'default';
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
      title: 'Date',
      dataIndex: 'transferDate',
      key: 'transferDate',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'From Account',
      dataIndex: 'fromAccountName',
      key: 'fromAccountName',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <small style={{ color: '#666' }}>
            {record.fromAccountType.replace('_', ' ')}
          </small>
        </div>
      )
    },
    {
      title: 'To Account',
      dataIndex: 'toAccountName',
      key: 'toAccountName',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <small style={{ color: '#666' }}>
            {record.toAccountType.replace('_', ' ')}
          </small>
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
          KES {amount?.toLocaleString()}
        </strong>
      )
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
      )
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
      )
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
      dataIndex: 'reference',
      key: 'reference',
      width: 120,
      render: (ref) => ref || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
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
    // Implement view details modal
    console.log('View transfer details:', transfer);
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Export transfers');
  };

  // Mock data for demonstration
  const mockTransfers = [
    {
      id: '1',
      transferNumber: 'DTR-2024-0001',
      transferDate: new Date().toISOString(),
      fromAccountType: 'DEBTOR_ACCOUNT',
      fromAccountName: 'John Doe',
      toAccountType: 'STATION_WALLET',
      toAccountName: 'Nairobi Station Wallet',
      amount: 5000,
      transferCategory: 'DEBT_SETTLEMENT',
      status: 'COMPLETED',
      station: { name: 'Nairobi Station' },
      reference: 'MPESA123'
    },
    {
      id: '2',
      transferNumber: 'DTR-2024-0002',
      transferDate: new Date().toISOString(),
      fromAccountType: 'DEBTOR_ACCOUNT',
      fromAccountName: 'Jane Smith',
      toAccountType: 'BANK_ACCOUNT',
      toAccountName: 'Equity Bank - 123456789',
      amount: 15000,
      transferCategory: 'ELECTRONIC_SETTLEMENT',
      status: 'COMPLETED',
      station: { name: 'Mombasa Station' },
      reference: 'BANK456'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card size="small">
        <Form layout="inline">
          <Form.Item label="Search">
            <Input
              placeholder="Search transfers..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          
          <Form.Item label="Category">
            <Select
              value={filters.transferCategory}
              onChange={(value) => handleFilterChange('transferCategory', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="DEBT_SETTLEMENT">Debt Settlement</Option>
              <Option value="DEBT_TRANSFER">Debt Transfer</Option>
              <Option value="ELECTRONIC_SETTLEMENT">Electronic</Option>
              <Option value="CROSS_STATION">Cross Station</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Status">
            <Select
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="COMPLETED">Completed</Option>
              <Option value="PENDING">Pending</Option>
              <Option value="REVERSED">Reversed</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Date Range">
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={loadTransfers}
              >
                Search
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
              >
                Reset
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Transfers"
              value={pagination.total}
              prefix={<ReloadOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={transfers.reduce((sum, t) => sum + (t.amount || 0), 0)}
              prefix="KES"
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={transfers.filter(t => t.status === 'COMPLETED').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={transfers.filter(t => t.status === 'PENDING').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Transfers Table */}
      <Card title="Account Transfers">
        <Table
          columns={columns}
          dataSource={mockTransfers} // Replace with transfers when API is ready
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} transfers`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          rowKey="id"
        />
      </Card>
    </div>
  );
};

export default TransferList;