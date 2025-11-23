// src/components/dashboards/common/debtTransfer/TransferList.jsx
import React from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Tooltip,
  Card,
  Badge
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  BankOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TransferList = ({ 
  transfers, 
  loading, 
  filters, 
  onFiltersChange, 
  onRefresh,
  showFilters = true,
  pagination = { pageSize: 10 }
}) => {
  
  const handleSearch = (value) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleCategoryChange = (value) => {
    onFiltersChange({ ...filters, transferCategory: value });
  };

  const handleStatusChange = (value) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleTransactionModeChange = (value) => {
    onFiltersChange({ ...filters, transactionMode: value });
  };

  const handleDateChange = (dates) => {
    onFiltersChange({
      ...filters,
      startDate: dates?.[0]?.toISOString(),
      endDate: dates?.[1]?.toISOString()
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      COMPLETED: 'green',
      PENDING: 'orange',
      FAILED: 'red',
      CANCELLED: 'red',
      PROCESSING: 'blue'
    };
    return colors[status] || 'default';
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      CASH_TO_BANK: 'blue',
      BANK_TO_CASH: 'green',
      DEBT_SETTLEMENT: 'purple',
      INTER_ACCOUNT: 'orange'
    };
    return colors[category] || 'default';
  };

  // Transfer columns
  const columns = [
    {
      title: 'Transfer Date',
      dataIndex: 'transferDate',
      key: 'transferDate',
      render: (date) => formatDate(date, true),
      width: 150,
      sorter: (a, b) => new Date(a.transferDate) - new Date(b.transferDate)
    },
    {
      title: 'Transfer Number',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      render: (number) => (
        <Text strong code>
          {number}
        </Text>
      ),
      width: 140
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong type="success">
          {formatCurrency(amount)}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'From Account',
      key: 'fromAccount',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.fromAccountName}
          </Text>
          {/* <Text type="secondary" size="small">
            {record.fromAccountType?.replace(/_/g, ' ')}
          </Text> */}
        </Space>
      ),
      ellipsis: true,
      width: 160
    },
    {
      title: 'To Account',
      key: 'toAccount',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.toAccountName}
          </Text>
          {/* <Text type="secondary" size="small">
            {record.toAccountType?.replace(/_/g, ' ')}
          </Text> */}
        </Space>
      ),
      ellipsis: true,
      width: 190
    },
    {
      title: 'Category',
      dataIndex: 'transferCategory',
      key: 'transferCategory',
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {category?.replace(/_/g, ' ')}
        </Tag>
      ),
      width: 170,
      filters: [
        { text: 'Cash to Bank', value: 'CASH_TO_BANK' },
        { text: 'Bank to Cash', value: 'BANK_TO_CASH' },
        { text: 'Debt Settlement', value: 'DEBT_SETTLEMENT' },
        { text: 'Inter Account', value: 'INTER_ACCOUNT' }
      ],
      onFilter: (value, record) => record.transferCategory === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={getStatusColor(status)} 
          text={status}
        />
      ),
      width: 120,
      filters: [
        { text: 'Completed', value: 'COMPLETED' },
        { text: 'Pending', value: 'PENDING' },
        { text: 'Failed', value: 'FAILED' },
        { text: 'Processing', value: 'PROCESSING' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Transaction Mode',
      key: 'transactionMode',
      render: (_, record) => (
        <Tag>
          {record.bankTransaction?.transactionMode || 'N/A'}
        </Tag>
      ),
      width: 120,
      filters: [
        { text: 'Cash', value: 'CASH' },
        { text: 'Bank Transfer', value: 'BANK_TRANSFER' },
        { text: 'Mobile Money', value: 'MOBILE_MONEY' },
        { text: 'Cheque', value: 'CHEQUE' }
      ],
      onFilter: (value, record) => 
        record.bankTransaction?.transactionMode === value
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || 'N/A'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (text) => (
        <Text type="secondary" code>
          {text || 'N/A'}
        </Text>
      ),
      width: 120
    },
    {
      title: 'Created By',
      key: 'createdBy',
      render: (_, record) => (
        <Text>
          {record.createdBy ? 
            `${record.createdBy.firstName} ${record.createdBy.lastName}` : 
            'System'
          }
        </Text>
      ),
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Transfer Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const handleViewDetails = (transfer) => {
    console.log('View transfer details:', transfer);
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      {showFilters && (
        <Card size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={6}>
              <Search
                placeholder="Search transfer number, reference..."
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                allowClear
              />
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Category"
                value={filters.transferCategory}
                onChange={handleCategoryChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="CASH_TO_BANK">Cash to Bank</Option>
                <Option value="BANK_TO_CASH">Bank to Cash</Option>
                <Option value="DEBT_SETTLEMENT">Debt Settlement</Option>
                <Option value="INTER_ACCOUNT">Inter Account</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Status"
                value={filters.status}
                onChange={handleStatusChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="COMPLETED">Completed</Option>
                <Option value="PENDING">Pending</Option>
                <Option value="FAILED">Failed</Option>
                <Option value="PROCESSING">Processing</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Transaction Mode"
                value={filters.transactionMode}
                onChange={handleTransactionModeChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="CASH">Cash</Option>
                <Option value="BANK_TRANSFER">Bank Transfer</Option>
                <Option value="MOBILE_MONEY">Mobile Money</Option>
                <Option value="CHEQUE">Cheque</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateChange}
                placeholder={['Start Date', 'End Date']}
              />
            </Col>
            <Col xs={24} sm={2}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  loading={loading}
                  size="small"
                />
                <Button
                  icon={<FilterOutlined />}
                  onClick={clearFilters}
                  size="small"
                >
                  Clear
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Transfers Table */}
      <Table
        columns={columns}
        dataSource={transfers}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} transfers`
        }}
        size="small"
        scroll={{ x: 1500 }}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong type="success">
                  {formatCurrency(transfers.reduce((sum, transfer) => sum + transfer.amount, 0))}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={9}>
                <Text type="secondary">
                  {transfers.length} transfers found
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default TransferList;