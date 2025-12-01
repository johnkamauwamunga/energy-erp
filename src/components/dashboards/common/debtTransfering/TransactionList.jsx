// src/components/dashboards/common/debtTransfer/TransactionList.jsx
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
  ScheduleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

// Import report generators
import ReportGenerator from '../../common/downloadable/ReportGenerator';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TransactionList = ({ 
  transactions, 
  loading, 
  filters, 
  onFiltersChange, 
  onRefresh,
  showFilters = true,
  pagination = { pageSize: 10 },
  currentUser,
  currentStation
}) => {
  
  const handleSearch = (value) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleTypeChange = (value) => {
    onFiltersChange({ ...filters, type: value });
  };

  const handleStatusChange = (value) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleShiftChange = (value) => {
    onFiltersChange({ ...filters, shiftNumber: value });
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
      OUTSTANDING: 'orange',
      SETTLED: 'green',
      OVERDUE: 'red',
      PARTIALLY_PAID: 'blue'
    };
    return colors[status] || 'default';
  };

  // Get unique shift numbers from transactions
  const getUniqueShiftNumbers = () => {
    const shifts = transactions
      .map(t => t.shift?.shiftNumber)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    return shifts.map(shift => ({
      text: shift,
      value: shift
    }));
  };

  // Enhanced transactions data for reporting
  const enhancedTransactions = transactions.map(transaction => ({
    ...transaction,
    formattedDate: formatDate(transaction.transactionDate, true),
    formattedAmount: formatCurrency(Math.abs(transaction.amount)),
    formattedNewBalance: formatCurrency(transaction.newBalance),
    formattedStatus: transaction.status?.replace(/_/g, ' ') || 'N/A',
    debtorName: transaction.stationDebtorAccount?.debtor?.name || 
                transaction.debtor?.name || 
                'N/A',
    shiftNumber: transaction.shift?.shiftNumber || 'N/A',
    recordedByDisplay: transaction.recordedBy ? 
      `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}` : 
      'System'
  }));

  // Transaction columns for table display
  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => formatDate(date, true),
      width: 150,
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Shift Number',
      key: 'shiftNumber',
      render: (_, record) => (
        <Tag icon={<ScheduleOutlined />} color="blue">
          {record.shift?.shiftNumber || 'N/A'}
        </Tag>
      ),
      width: 130,
      filters: getUniqueShiftNumbers(),
      onFilter: (value, record) => record.shift?.shiftNumber === value
    },
    {
      title: 'Debtor',
      key: 'debtor',
      render: (_, record) => (
        <Text strong>
          {record.stationDebtorAccount?.debtor?.name || 
           record.debtor?.name || 
           'N/A'}
        </Text>
      ),
       width: 140,
      ellipsis: true
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'CREDIT' ? 'green' : 'red'}>
          {type}
        </Tag>
      ),
      width: 100,
      filters: [
        { text: 'Credit', value: 'CREDIT' },
        { text: 'Debit', value: 'DEBIT' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={getStatusColor(status)} 
          text={status?.replace(/_/g, ' ') || 'N/A'}
        />
      ),
      width: 120,
      filters: [
        { text: 'Outstanding', value: 'OUTSTANDING' },
        { text: 'Settled', value: 'SETTLED' },
        { text: 'Overdue', value: 'OVERDUE' },
        { text: 'Partially Paid', value: 'PARTIALLY_PAID' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <Text 
          strong 
          type={record.type === 'CREDIT' ? 'success' : 'danger'}
        >
          {formatCurrency(Math.abs(amount))}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => Math.abs(a.amount) - Math.abs(b.amount)
    },
    {
      title: 'Balance After',
      dataIndex: 'newBalance',
      key: 'newBalance',
      render: (balance) => (
        <Text strong>
          {formatCurrency(balance)}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => a.newBalance - b.newBalance
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => (
        <Text>
          {record.recordedBy ? 
            `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
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
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
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

  // Columns for export (simplified for better PDF/Excel format)
  const exportColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => formatDate(date, true)
    },
    {
      title: 'Shift Number',
      key: 'shiftNumber',
      render: (_, record) => record.shift?.shiftNumber || 'N/A'
    },
    {
      title: 'Debtor',
      key: 'debtor',
      render: (_, record) => 
        record.stationDebtorAccount?.debtor?.name || 
        record.debtor?.name || 
        'N/A'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => status?.replace(/_/g, ' ') || 'N/A'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <span style={{ 
          color: record.type === 'CREDIT' ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {formatCurrency(Math.abs(amount))}
        </span>
      )
    },
    {
      title: 'Balance After',
      dataIndex: 'newBalance',
      key: 'newBalance',
      render: (balance) => formatCurrency(balance)
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => 
        record.recordedBy ? 
          `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
          'System'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || 'N/A'
    }
  ];

  const handleViewDetails = (transaction) => {
    console.log('View transaction details:', transaction);
    // Implement view details logic
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      {showFilters && (
        <Card size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={6}>
              <Search
                placeholder="Search debtor, description..."
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                allowClear
              />
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Type"
                value={filters.type}
                onChange={handleTypeChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="CREDIT">Credit</Option>
                <Option value="DEBIT">Debit</Option>
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
                <Option value="OUTSTANDING">Outstanding</Option>
                <Option value="SETTLED">Settled</Option>
                <Option value="OVERDUE">Overdue</Option>
                <Option value="PARTIALLY_PAID">Partially Paid</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Shift Number"
                value={filters.shiftNumber}
                onChange={handleShiftChange}
                style={{ width: '100%' }}
                allowClear
                showSearch
              >
                {getUniqueShiftNumbers().map(shift => (
                  <Option key={shift.value} value={shift.value}>
                    {shift.text}
                  </Option>
                ))}
              </Select>
            </Col>
            {/* <Col xs={24} sm={4}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateChange}
                placeholder={['Start Date', 'End Date']}
              />
            </Col> */}
            <Col xs={24} sm={2}>
              <Space>
                {/* <Button
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
                </Button> */}
                {/* Export Button */}
                <AdvancedReportGenerator
                  dataSource={enhancedTransactions}
                  columns={exportColumns}
                  title={`Transaction History - ${currentStation ? 'Station' : 'Company'} Level`}
                  fileName={`transactions_${new Date().toISOString().split('T')[0]}`}
                  footerText={`Generated from Energy ERP System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
                  showFooter={true}
                />
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Transactions Table */}
      <Table
        columns={columns}
        dataSource={transactions}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} transactions`
        }}
        size="small"
        scroll={{ x: 1200 }}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>
                  {formatCurrency(transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0))}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={5}>
                <Text type="secondary">
                  {transactions.length} transactions found
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                {/* Export button in table summary */}
                <AdvancedReportGenerator
                  dataSource={enhancedTransactions}
                  columns={exportColumns}
                  title={`Debt Transactions Report - ${currentStation ? 'Station' : 'Company'} Level`}
                  fileName={`debt_transactions_${new Date().toISOString().split('T')[0]}`}
                  footerText={`Generated from Energy ERP System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
                  showFooter={true}
                />
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default TransactionList;