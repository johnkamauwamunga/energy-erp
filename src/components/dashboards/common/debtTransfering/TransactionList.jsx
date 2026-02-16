// src/components/dashboards/common/debtTransfer/TransactionList.jsx
import React, { useState, useMemo } from 'react';
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
  Badge,
  Statistic,
  Popover,
  Alert,
  Empty,
  Divider
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  ScheduleOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LineChartOutlined,
  InfoCircleOutlined,
  SortDescendingOutlined,
  FileTextOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

// Import report generators
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text, Title } = Typography;
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
  currentStation,
  showSummaryCards = true
}) => {
  const [sortOrder, setSortOrder] = useState({
    field: 'transactionDate',
    order: 'descend'
  });

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
    setSortOrder({
      field: 'transactionDate',
      order: 'descend'
    });
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
    if (!transactions.length) return [];
    
    const shifts = transactions
      .map(t => t.shift?.shiftNumber)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    return shifts.map(shift => ({
      text: shift,
      value: shift
    }));
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!transactions.length) {
      return {
        totalAmount: 0,
        creditTotal: 0,
        debitTotal: 0,
        averageAmount: 0,
        settledCount: 0,
        outstandingCount: 0,
        debtorCount: 0,
        maxAmount: 0,
        minAmount: 0
      };
    }

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const creditTotal = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const debitTotal = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const settledCount = transactions.filter(t => t.status === 'SETTLED').length;
    const outstandingCount = transactions.filter(t => t.status === 'OUTSTANDING').length;
    const debtorNames = new Set(
      transactions
        .map(t => t.stationDebtorAccount?.debtor?.name || t.debtor?.name)
        .filter(Boolean)
    );

    return {
      totalAmount,
      creditTotal,
      debitTotal,
      averageAmount: totalAmount / transactions.length,
      settledCount,
      outstandingCount,
      debtorCount: debtorNames.size,
      maxAmount: Math.max(...transactions.map(t => Math.abs(t.amount))),
      minAmount: Math.min(...transactions.map(t => Math.abs(t.amount)))
    };
  }, [transactions]);

  // Enhanced transactions data for reporting WITH SEQUENTIAL NUMBERING
  const enhancedTransactions = useMemo(() => 
    transactions.map((transaction, index) => ({
      ...transaction,
      sequentialNumber: index + 1,
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
        'System',
      timestamp: new Date(transaction.transactionDate).getTime()
    })),
  [transactions]);

  // Sort transactions based on current sort order
  const sortedTransactions = useMemo(() => {
    const sorted = [...enhancedTransactions];
    
    if (sortOrder.field && sortOrder.order) {
      sorted.sort((a, b) => {
        let aValue = a[sortOrder.field];
        let bValue = b[sortOrder.field];
        
        // Handle nested properties
        if (sortOrder.field === 'debtorName') {
          aValue = a.stationDebtorAccount?.debtor?.name || a.debtor?.name;
          bValue = b.stationDebtorAccount?.debtor?.name || b.debtor?.name;
        }
        
        if (sortOrder.field === 'shiftNumber') {
          aValue = a.shift?.shiftNumber;
          bValue = b.shift?.shiftNumber;
        }
        
        if (sortOrder.field === 'transactionDate') {
          aValue = new Date(a.transactionDate).getTime();
          bValue = new Date(b.transactionDate).getTime();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (sortOrder.order === 'descend') {
            return bValue.localeCompare(aValue);
          } else {
            return aValue.localeCompare(bValue);
          }
        }
        
        if (sortOrder.order === 'descend') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    }
    
    return sorted;
  }, [enhancedTransactions, sortOrder]);

  // Transaction columns for table display - DEFAULT DESC ORDER
  const columns = [
    {
      title: '#',
      key: 'sequence',
      render: (_, __, index) => (
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {index + 1}
        </Text>
      ),
      width: 50,
      fixed: 'left'
    },
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <span style={{ fontSize: '11px' }}>{formatDate(date, true)}</span>
        </Tooltip>
      ),
      width: 150,
      sorter: (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Shift',
      key: 'shiftNumber',
      render: (_, record) => (
        <Badge 
          count={record.shift?.shiftNumber || 'N/A'} 
          style={{ 
            backgroundColor: '#1890ff',
            fontSize: '11px'
          }}
        />
      ),
      width: 80,
      filters: getUniqueShiftNumbers(),
      onFilter: (value, record) => record.shift?.shiftNumber === value,
      sorter: (a, b) => (b.shift?.shiftNumber || '').localeCompare(a.shift?.shiftNumber || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Debtor',
      key: 'debtor',
      render: (_, record) => (
        <Text strong style={{ fontSize: '12px' }}>
          {record.stationDebtorAccount?.debtor?.name || 
           record.debtor?.name || 
           'N/A'}
        </Text>
      ),
      width: 140,
      ellipsis: true,
      sorter: (a, b) => {
        const aName = (a.stationDebtorAccount?.debtor?.name || a.debtor?.name || '').toLowerCase();
        const bName = (b.stationDebtorAccount?.debtor?.name || b.debtor?.name || '').toLowerCase();
        return bName.localeCompare(aName);
      },
      defaultSortOrder: 'descend'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag 
          color={type === 'CREDIT' ? 'green' : 'red'}
          icon={type === 'CREDIT' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
        >
          {type}
        </Tag>
      ),
      width: 90,
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
          style={{ fontSize: '11px' }}
        />
      ),
      width: 120,
      filters: [
        { text: 'Outstanding', value: 'OUTSTANDING' },
        { text: 'Settled', value: 'SETTLED' },
        { text: 'Overdue', value: 'OVERDUE' },
        { text: 'Partially Paid', value: 'PARTIALLY_PAID' }
      ],
      onFilter: (value, record) => record.status === value,
      sorter: (a, b) => (b.status || '').localeCompare(a.status || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <Text 
          strong 
          type={record.type === 'CREDIT' ? 'success' : 'danger'}
          style={{ fontSize: '12px' }}
        >
          {formatCurrency(Math.abs(amount))}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Balance',
      dataIndex: 'newBalance',
      key: 'newBalance',
      render: (balance) => (
        <Text strong style={{ fontSize: '12px' }}>
          {formatCurrency(balance)}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => b.newBalance - a.newBalance,
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => (
        <Text style={{ fontSize: '11px' }}>
          {record.recordedBy ? 
            `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
            'System'
          }
        </Text>
      ),
      width: 120,
      sorter: (a, b) => {
        const aName = (a.recordedBy ? `${a.recordedBy.firstName} ${a.recordedBy.lastName}` : '').toLowerCase();
        const bName = (b.recordedBy ? `${b.recordedBy.firstName} ${b.recordedBy.lastName}` : '').toLowerCase();
        return bName.localeCompare(aName);
      },
      defaultSortOrder: 'descend'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 70,
      fixed: 'right',
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

  // Columns for export (optimized for reports) - WITH SEQUENTIAL NUMBERING
  const exportColumns = [
    {
      title: '#',
      key: 'sequence',
      render: (_, record, index) => index + 1,
      type: 'number',
      width: 50
    },
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => formatDate(date, true),
      type: 'datetime'
    },
    {
      title: 'Shift Number',
      key: 'shiftNumber',
      render: (_, record) => record.shift?.shiftNumber || 'N/A',
      type: 'text'
    },
    {
      title: 'Debtor',
      key: 'debtor',
      render: (_, record) => 
        record.stationDebtorAccount?.debtor?.name || 
        record.debtor?.name || 
        'N/A',
      type: 'text'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      type: 'text'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => status?.replace(/_/g, ' ') || 'N/A',
      type: 'status'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => Math.abs(amount),
      type: 'currency'
    },
    {
      title: 'Transaction Type',
      dataIndex: 'type',
      key: 'typeDisplay',
      render: (type) => type === 'CREDIT' ? 'Credit (Payment Received)' : 'Debit (Debt Incurred)',
      type: 'text'
    },
    {
      title: 'Balance After Transaction',
      dataIndex: 'newBalance',
      key: 'newBalance',
      render: (balance) => balance,
      type: 'currency'
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => 
        record.recordedBy ? 
          `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
          'System',
      type: 'text'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || 'N/A',
      type: 'text'
    },
    {
      title: 'Previous Balance',
      dataIndex: 'previousBalance',
      key: 'previousBalance',
      render: (balance) => balance || 0,
      type: 'currency'
    },
    {
      title: 'Transaction Value',
      dataIndex: 'amount',
      key: 'absoluteAmount',
      render: (amount) => Math.abs(amount),
      type: 'currency'
    }
  ];

  // Summary data for report header
  const summaryData = useMemo(() => ({
    'Total Transactions': enhancedTransactions.length,
    'Total Amount': formatCurrency(summaryStats.totalAmount),
    'Credit Total': formatCurrency(summaryStats.creditTotal),
    'Debit Total': formatCurrency(summaryStats.debitTotal),
    'Settled Count': summaryStats.settledCount,
    'Outstanding Count': summaryStats.outstandingCount,
    'Unique Debtors': summaryStats.debtorCount,
    'Average Transaction': formatCurrency(summaryStats.averageAmount),
    'Largest Transaction': formatCurrency(summaryStats.maxAmount),
    'Smallest Transaction': formatCurrency(summaryStats.minAmount)
  }), [enhancedTransactions, summaryStats]);

  const handleViewDetails = (transaction) => {
    console.log('View transaction details:', transaction);
    // Implement modal or drawer for details
  };

  // Handle table sort change
  const handleTableChange = (pagination, filters, sorter) => {
    setSortOrder({
      field: sorter.field,
      order: sorter.order
    });
  };

  // Main export handler
  const handleExport = (format) => {
    console.log(`Exporting ${enhancedTransactions.length} transactions as ${format}`);
  };

  // Render empty state - SIMPLIFIED like ShiftManagementTest
  const renderEmptyState = () => (
    <div style={{ 
      padding: '48px 0', 
      textAlign: 'center',
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Empty
        image={<InboxOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
        imageStyle={{ height: 80 }}
        description={
          <Space direction="vertical" size="small">
            <Text strong style={{ fontSize: 16 }}>No Transactions Found</Text>
            <Text type="secondary" style={{ fontSize: 14, maxWidth: 400 }}>
              {hasActiveFilters 
                ? 'No transactions match your current filters. Try adjusting your search criteria.'
                : 'There are no transactions to display at this time.'}
            </Text>
          </Space>
        }
      >
        {hasActiveFilters && (
          <Button 
            type="primary" 
            onClick={clearFilters}
            icon={<FilterOutlined />}
          >
            Clear Filters
          </Button>
        )}
      </Empty>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4}>Transaction History</Title>
        <Text type="secondary">
          View and manage all debt transactions for {currentStation?.name || 'company'}
        </Text>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Summary Cards - Only show if there are transactions */}
        {showSummaryCards && transactions.length > 0 && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Total Amount"
                  value={summaryStats.totalAmount}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#3f8600' }}
                  suffix={
                    <Tooltip title="Sum of all transaction amounts">
                      <InfoCircleOutlined style={{ color: '#999', marginLeft: 4 }} />
                    </Tooltip>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Credit Total"
                  value={summaryStats.creditTotal}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a' }}
                  suffix={<ArrowDownOutlined style={{ color: '#52c41a', marginRight: 4 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Debit Total"
                  value={summaryStats.debitTotal}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#cf1322' }}
                  suffix={<ArrowUpOutlined style={{ color: '#cf1322', marginRight: 4 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Transactions"
                  value={transactions.length}
                  suffix={`/ ${summaryStats.debtorCount} debtors`}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Filters Card */}
        {showFilters && (
          <Card 
            size="small" 
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <FilterOutlined />
                <Text>Filters & Export</Text>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="Refresh data">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={onRefresh}
                    loading={loading}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Clear all filters">
                  <Button
                    icon={<FilterOutlined />}
                    onClick={clearFilters}
                    size="small"
                    disabled={!hasActiveFilters}
                  >
                    Clear
                  </Button>
                </Tooltip>
              </Space>
            }
          >
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={6}>
                <Search
                  placeholder="Search debtor, description..."
                  onSearch={handleSearch}
                  onChange={(e) => !e.target.value && handleSearch('')}
                  allowClear
                  size="small"
                  disabled={loading}
                />
              </Col>
              <Col xs={24} sm={4}>
                <Select
                  placeholder="Type"
                  value={filters.type}
                  onChange={handleTypeChange}
                  style={{ width: '100%' }}
                  allowClear
                  size="small"
                  disabled={loading}
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
                  size="small"
                  disabled={loading}
                >
                  <Option value="OUTSTANDING">Outstanding</Option>
                  <Option value="SETTLED">Settled</Option>
                  <Option value="OVERDUE">Overdue</Option>
                  <Option value="PARTIALLY_PAID">Partially Paid</Option>
                </Select>
              </Col>
              <Col xs={24} sm={4}>
                <Select
                  placeholder="Shift"
                  value={filters.shiftNumber}
                  onChange={handleShiftChange}
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  size="small"
                  disabled={loading || transactions.length === 0}
                >
                  {getUniqueShiftNumbers().map(shift => (
                    <Option key={shift.value} value={shift.value}>
                      Shift {shift.text}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={6}>
                {/* Export Button */}
                <AdvancedReportGenerator
                  dataSource={enhancedTransactions}
                  columns={exportColumns}
                  title={`Transaction History Report - ${currentStation?.name || 'Company'} Level`}
                  fileName={`debt_transactions_${currentStation?.code || 'company'}_${new Date().toISOString().split('T')[0]}`}
                  summaryData={summaryData}
                  reportType="finance"
                  stationInfo={currentStation}
                  footerText={`Generated from Lynx Energy System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
                  showFooter={true}
                  enableCustomization={true}
                  onReportGenerate={handleExport}
                  disabled={transactions.length === 0}
                  showGrandTotals={false}
                  horizontalScroll={true}
                  maxVisibleColumns={10}
                  compactMode={true}
                  hideAdvancedButtons={false}
                />
              </Col>
            </Row>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div style={{ marginTop: 12 }}>
                <Space size={[0, 8]} wrap>
                  <Text type="secondary" style={{ fontSize: 12 }}>Active filters:</Text>
                  {Object.entries(filters).map(([key, value]) => {
                    if (!value) return null;
                    let displayValue = value;
                    if (key === 'type') displayValue = value === 'CREDIT' ? 'Credit' : 'Debit';
                    if (key === 'status') displayValue = value.replace(/_/g, ' ');
                    
                    return (
                      <Badge
                        key={key}
                        count={`${key}: ${displayValue}`}
                        style={{ 
                          backgroundColor: '#e6f7ff',
                          color: '#1890ff',
                          border: '1px solid #91d5ff',
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                        onClick={() => onFiltersChange({ ...filters, [key]: undefined })}
                      />
                    );
                  })}
                </Space>
              </div>
            )}
          </Card>
        )}

        {/* Main Content - Table or Empty State */}
        <Card size="small">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', minHeight: '400px' }}>
              <div style={{ marginBottom: 16 }}>
                <ReloadOutlined spin style={{ fontSize: 32, color: '#1890ff' }} />
              </div>
              <Text type="secondary">Loading transactions...</Text>
            </div>
          ) : transactions.length === 0 ? (
            renderEmptyState()
          ) : (
            <Table
              columns={columns}
              dataSource={sortedTransactions}
              rowKey="sequentialNumber"
              loading={loading}
              onChange={handleTableChange}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} transactions`,
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              size="small"
              scroll={{ x: 1200 }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <Space>
                        <SortDescendingOutlined style={{ color: '#1890ff' }} />
                        <Text strong>Sorted by: {sortOrder.field}</Text>
                        <Text type="secondary">({sortOrder.order === 'descend' ? 'Descending' : 'Ascending'})</Text>
                      </Space>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong>
                        Total: {formatCurrency(summaryStats.totalAmount)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={3}>
                      <Text type="secondary">
                        Showing {sortedTransactions.length} transactions 
                        {summaryStats.creditTotal > 0 && ` (${formatCurrency(summaryStats.creditTotal)} in credits)`}
                        {summaryStats.debitTotal > 0 && ` (${formatCurrency(summaryStats.debitTotal)} in debits)`}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      {/* Secondary Export Button */}
                      <AdvancedReportGenerator
                        dataSource={enhancedTransactions}
                        columns={exportColumns}
                        title={`Detailed Debt Transactions - ${currentStation?.name || 'Company'}`}
                        fileName={`detailed_transactions_${new Date().toISOString().split('T')[0]}`}
                        summaryData={summaryData}
                        reportType="finance"
                        showFooter={true}
                        customStyles={{
                          fontSize: 8,
                          rowHeight: 5,
                          alternateRowColors: true
                        }}
                        enableCustomization={false}
                      />
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          )}
        </Card>

        {/* Footer message when no data */}
        {transactions.length === 0 && !loading && hasActiveFilters && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Try adjusting your filters or clearing them to see more transactions.
            </Text>
          </div>
        )}
      </div>

      {/* Add CSS for better empty state */}
      <style>{`
        .ant-empty {
          margin: 0;
        }
        .ant-card-body {
          padding: ${transactions.length === 0 ? '0' : '24px'};
        }
      `}</style>
    </div>
  );
};

export default TransactionList;