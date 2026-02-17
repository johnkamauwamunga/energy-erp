// src/components/dashboards/common/debtTransfer/TransactionList.jsx
import React, { useState, useMemo, useEffect } from 'react';
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
  Divider,
  Modal,
  Descriptions,
  message
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
  InboxOutlined,
  CloseOutlined,
  UserOutlined,
  BankOutlined,
  ClockCircleOutlined,
  TagOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import dayjs from 'dayjs';

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
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);

  // Get unique debtors from transactions
  const uniqueDebtors = useMemo(() => {
    const debtorsMap = new Map();
    
    transactions.forEach(t => {
      const debtor = t.stationDebtorAccount?.debtor || t.debtor;
      if (debtor && debtor.id && !debtorsMap.has(debtor.id)) {
        debtorsMap.set(debtor.id, {
          id: debtor.id,
          name: debtor.name,
          code: debtor.code,
          description: debtor.description
        });
      }
    });
    
    return Array.from(debtorsMap.values());
  }, [transactions]);

  // Check if transaction is from today
  const isToday = (dateString) => {
    const today = dayjs().startOf('day');
    const transactionDate = dayjs(dateString).startOf('day');
    return transactionDate.isSame(today);
  };

  // Filter transactions by selected debtor
  const filteredTransactions = useMemo(() => {
    if (!selectedDebtor) return transactions;
    
    return transactions.filter(t => {
      const debtorId = t.stationDebtorAccount?.debtor?.id || t.debtor?.id;
      return debtorId === selectedDebtor;
    });
  }, [transactions, selectedDebtor]);

  // Enhanced transactions with sequential numbering
  const enhancedTransactions = useMemo(() => 
    filteredTransactions.map((transaction, index) => ({
      ...transaction,
      sequentialNumber: index + 1,
      formattedDate: formatDate(transaction.transactionDate, true),
      formattedAmount: formatCurrency(Math.abs(transaction.amount)),
      formattedNewBalance: formatCurrency(transaction.newBalance),
      formattedPreviousBalance: formatCurrency(transaction.previousBalance),
      formattedStatus: transaction.status?.replace(/_/g, ' ') || 'N/A',
      debtorName: transaction.stationDebtorAccount?.debtor?.name || 
                  transaction.debtor?.name || 
                  'N/A',
      debtorCode: transaction.stationDebtorAccount?.debtor?.code || 
                  transaction.debtor?.code,
      shiftNumber: transaction.shift?.shiftNumber || 'N/A',
      shiftStartTime: transaction.shift?.startTime,
      recordedByDisplay: transaction.recordedBy ? 
        `${transaction.recordedBy.firstName} ${transaction.recordedBy.lastName}` : 
        'System',
      stationName: transaction.stationDebtorAccount?.station?.name || 
                   transaction.station?.name || 
                   'N/A',
      timestamp: new Date(transaction.transactionDate).getTime(),
      isToday: isToday(transaction.transactionDate)
    })),
  [filteredTransactions]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...enhancedTransactions];
    
    if (sortOrder.field && sortOrder.order) {
      sorted.sort((a, b) => {
        let aValue = a[sortOrder.field];
        let bValue = b[sortOrder.field];
        
        if (sortOrder.field === 'debtorName') {
          aValue = a.debtorName;
          bValue = b.debtorName;
        }
        
        if (sortOrder.field === 'shiftNumber') {
          aValue = a.shiftNumber;
          bValue = b.shiftNumber;
        }
        
        if (sortOrder.field === 'transactionDate') {
          aValue = a.timestamp;
          bValue = b.timestamp;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder.order === 'descend' 
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        }
        
        return sortOrder.order === 'descend' 
          ? bValue - aValue
          : aValue - bValue;
      });
    }
    
    return sorted;
  }, [enhancedTransactions, sortOrder]);

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

  const handleDebtorChange = (debtorId) => {
    setSelectedDebtor(debtorId);
    // Also update parent filters if needed
    onFiltersChange({ ...filters, debtorId });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setSelectedDebtor(null);
    setSortOrder({
      field: 'transactionDate',
      order: 'descend'
    });
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsModalVisible(true);
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

  // Get transaction type icon
  const getTypeIcon = (type) => {
    return type === 'CREDIT' ? <ArrowDownOutlined /> : <ArrowUpOutlined />;
  };

  // Row className for highlighting
  const rowClassName = (record) => {
    return record.isToday ? 'highlight-today' : '';
  };

  // Columns for the table
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
      render: (date, record) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space direction="vertical" size={0}>
            <Text strong={record.isToday} style={{ fontSize: '11px' }}>
              {formatDate(date, true)}
            </Text>
            {record.isToday && (
              <Badge count="Today" style={{ backgroundColor: '#52c41a', fontSize: '9px' }} />
            )}
          </Space>
        </Tooltip>
      ),
      width: 150,
      sorter: true,
      defaultSortOrder: 'descend'
    },
    {
      title: 'Debtor',
      key: 'debtor',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            {record.debtorName}
          </Text>
          {record.debtorCode && (
            <Tag color="blue" style={{ fontSize: '9px', marginTop: '2px' }}>
              {record.debtorCode}
            </Tag>
          )}
        </Space>
      ),
      width: 160,
      sorter: true
    },
    {
      title: 'Station',
      key: 'station',
      render: (_, record) => (
        <Tooltip title={`Station ID: ${record.stationDebtorAccount?.stationId || record.stationId}`}>
          <Text style={{ fontSize: '11px' }}>{record.stationName}</Text>
        </Tooltip>
      ),
      width: 130,
      sorter: true
    },
    {
      title: 'Shift',
      key: 'shift',
      render: (_, record) => (
        <Tooltip title={record.shiftStartTime ? `Started: ${formatDate(record.shiftStartTime, true)}` : ''}>
          <Badge 
            count={record.shiftNumber} 
            style={{ 
              backgroundColor: '#1890ff',
              fontSize: '10px'
            }}
          />
        </Tooltip>
      ),
      width: 100,
      sorter: true
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag 
          color={type === 'CREDIT' ? 'green' : 'red'}
          icon={getTypeIcon(type)}
          style={{ fontSize: '11px' }}
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
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <Text 
          strong 
          type={record.type === 'CREDIT' ? 'success' : 'danger'}
          style={{ fontSize: '12px' }}
        >
          {record.type === 'CREDIT' ? '-' : '+'} {formatCurrency(Math.abs(amount))}
        </Text>
      ),
      width: 120,
      sorter: true
    },
    {
      title: 'Balance',
      dataIndex: 'newBalance',
      key: 'newBalance',
      render: (balance, record) => (
        <Tooltip title={`Previous: ${formatCurrency(record.previousBalance)}`}>
          <Text strong style={{ fontSize: '12px' }}>
            {formatCurrency(balance)}
          </Text>
        </Tooltip>
      ),
      width: 120,
      sorter: true
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
      width: 110,
      filters: [
        { text: 'Outstanding', value: 'OUTSTANDING' },
        { text: 'Settled', value: 'SETTLED' },
        { text: 'Overdue', value: 'OVERDUE' },
        { text: 'Partially Paid', value: 'PARTIALLY_PAID' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => (
        <Text style={{ fontSize: '11px' }}>
          {record.recordedByDisplay}
        </Text>
      ),
      width: 120,
      sorter: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 70,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewDetails(record)}
          />
        </Tooltip>
      )
    }
  ];

  // Columns for export
  const exportColumns = [
    {
      title: '#',
      key: 'sequence',
      render: (_, record, index) => index + 1,
      type: 'number'
    },
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'date',
      render: (date) => formatDate(date, true),
      type: 'datetime'
    },
    {
      title: 'Debtor Name',
      key: 'debtorName',
      render: (_, record) => record.debtorName,
      type: 'text'
    },
    {
      title: 'Debtor Code',
      key: 'debtorCode',
      render: (_, record) => record.debtorCode || 'N/A',
      type: 'text'
    },
    {
      title: 'Station',
      key: 'station',
      render: (_, record) => record.stationName,
      type: 'text'
    },
    {
      title: 'Shift Number',
      key: 'shiftNumber',
      render: (_, record) => record.shiftNumber,
      type: 'text'
    },
    {
      title: 'Transaction Type',
      dataIndex: 'type',
      key: 'type',
      type: 'text'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => Math.abs(amount),
      type: 'currency'
    },
    {
      title: 'Previous Balance',
      dataIndex: 'previousBalance',
      key: 'previousBalance',
      render: (balance) => balance || 0,
      type: 'currency'
    },
    {
      title: 'New Balance',
      dataIndex: 'newBalance',
      key: 'newBalance',
      render: (balance) => balance,
      type: 'currency'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => status?.replace(/_/g, ' ') || 'N/A',
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
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => record.recordedByDisplay,
      type: 'text'
    },
    {
      title: 'Collection Reference',
      key: 'collectionRef',
      render: (_, record) => {
        if (record.islandCollectionId) return `Island: ${record.islandCollectionId}`;
        if (record.shiftCollectionId) return `Shift: ${record.shiftCollectionId}`;
        if (record.accountTransferId) return `Transfer: ${record.accountTransferId}`;
        return 'N/A';
      },
      type: 'text'
    }
  ];

  // Summary data
  const summaryStats = useMemo(() => {
    if (!filteredTransactions.length) return null;

    const totalAmount = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const creditTotal = filteredTransactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const debitTotal = filteredTransactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalAmount,
      creditTotal,
      debitTotal,
      transactionCount: filteredTransactions.length,
      debtorCount: uniqueDebtors.length
    };
  }, [filteredTransactions, uniqueDebtors]);

  // Handle table sort change
  const handleTableChange = (pagination, filters, sorter) => {
    setSortOrder({
      field: sorter.field,
      order: sorter.order
    });
  };

  // Render empty state
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
        description={
          <Space direction="vertical" size="small">
            <Text strong style={{ fontSize: 16 }}>No Transactions Found</Text>
            <Text type="secondary" style={{ fontSize: 14, maxWidth: 400 }}>
              {selectedDebtor || Object.keys(filters).length > 0
                ? 'No transactions match your current filters. Try adjusting your search criteria.'
                : 'There are no transactions to display at this time.'}
            </Text>
          </Space>
        }
      >
        {(selectedDebtor || Object.keys(filters).length > 0) && (
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
        {/* Summary Cards */}
        {showSummaryCards && summaryStats && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Total Amount"
                  value={summaryStats.totalAmount}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#3f8600' }}
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
                  suffix={<ArrowDownOutlined style={{ color: '#52c41a' }} />}
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
                  suffix={<ArrowUpOutlined style={{ color: '#cf1322' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="Transactions"
                  value={summaryStats.transactionCount}
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
                    disabled={!selectedDebtor && Object.keys(filters).length === 0}
                  >
                    Clear
                  </Button>
                </Tooltip>
              </Space>
            }
          >
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={5}>
                <Search
                  placeholder="Search description..."
                  onSearch={handleSearch}
                  onChange={(e) => !e.target.value && handleSearch('')}
                  allowClear
                  size="small"
                />
              </Col>
              <Col xs={24} sm={5}>
                <Select
                  placeholder="Filter by Debtor"
                  value={selectedDebtor}
                  onChange={handleDebtorChange}
                  style={{ width: '100%' }}
                  allowClear
                  size="small"
                  showSearch
                  optionFilterProp="children"
                >
                  {uniqueDebtors.map(debtor => (
                    <Option key={debtor.id} value={debtor.id}>
                      {debtor.name} {debtor.code ? `(${debtor.code})` : ''}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={4}>
                <Select
                  placeholder="Type"
                  value={filters.type}
                  onChange={handleTypeChange}
                  style={{ width: '100%' }}
                  allowClear
                  size="small"
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
                >
                  <Option value="OUTSTANDING">Outstanding</Option>
                  <Option value="SETTLED">Settled</Option>
                  <Option value="OVERDUE">Overdue</Option>
                </Select>
              </Col>
              <Col xs={24} sm={6}>
                <RangePicker
                  style={{ width: '100%' }}
                  onChange={handleDateChange}
                  size="small"
                  placeholder={['Start Date', 'End Date']}
                />
              </Col>
            </Row>

            {/* Export Button */}
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <AdvancedReportGenerator
                dataSource={enhancedTransactions}
                columns={exportColumns}
                title={`Debt Transaction Report - ${selectedDebtor ? 
                  uniqueDebtors.find(d => d.id === selectedDebtor)?.name : 
                  'All Debtors'}`}
                fileName={`debt_transactions_${dayjs().format('YYYYMMDD_HHmmss')}`}
                summaryData={{
                  'Total Transactions': enhancedTransactions.length,
                  'Total Amount': formatCurrency(summaryStats?.totalAmount || 0),
                  'Credit Total': formatCurrency(summaryStats?.creditTotal || 0),
                  'Debit Total': formatCurrency(summaryStats?.debitTotal || 0),
                  ...(selectedDebtor && {
                    'Selected Debtor': uniqueDebtors.find(d => d.id === selectedDebtor)?.name
                  })
                }}
                reportType="finance"
                stationInfo={currentStation}
                footerText={`Generated from Lynx Energy System - ${currentUser ? 
                  `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - 
                  ${new Date().toLocaleDateString()}`}
                disabled={enhancedTransactions.length === 0}
              />
            </div>

            {/* Active Filters Display */}
            {(selectedDebtor || Object.keys(filters).length > 0) && (
              <div style={{ marginTop: 12 }}>
                <Space size={[0, 8]} wrap>
                  <Text type="secondary" style={{ fontSize: 12 }}>Active filters:</Text>
                  
                  {selectedDebtor && (
                    <Badge
                      count={`Debtor: ${uniqueDebtors.find(d => d.id === selectedDebtor)?.name}`}
                      style={{ 
                        backgroundColor: '#e6f7ff',
                        color: '#1890ff',
                        border: '1px solid #91d5ff',
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedDebtor(null)}
                    />
                  )}
                  
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

        {/* Transactions Table */}
        <Card size="small">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <ReloadOutlined spin style={{ fontSize: 32, color: '#1890ff' }} />
              <div style={{ marginTop: 16 }}>Loading transactions...</div>
            </div>
          ) : enhancedTransactions.length === 0 ? (
            renderEmptyState()
          ) : (
            <Table
              columns={columns}
              dataSource={sortedTransactions}
              rowKey="id"
              loading={loading}
              onChange={handleTableChange}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} transactions`,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              size="small"
              scroll={{ x: 1500 }}
              rowClassName={rowClassName}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <Space>
                        <SortDescendingOutlined style={{ color: '#1890ff' }} />
                        <Text strong>Sorted by: {sortOrder.field}</Text>
                        <Text type="secondary">
                          ({sortOrder.order === 'descend' ? 'Descending' : 'Ascending'})
                        </Text>
                      </Space>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} colSpan={6}>
                      <Text type="secondary">
                        Showing {sortedTransactions.length} transactions 
                        {summaryStats && ` • Total: ${formatCurrency(summaryStats.totalAmount)}`}
                        {selectedDebtor && ` • Filtered by: ${uniqueDebtors.find(d => d.id === selectedDebtor)?.name}`}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          )}
        </Card>
      </div>

      {/* Transaction Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Transaction Details</span>
            {selectedTransaction?.isToday && (
              <Badge count="Today" style={{ backgroundColor: '#52c41a' }} />
            )}
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="export" 
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => {
              // Export single transaction as PDF
              message.info('Export functionality coming soon');
            }}
          >
            Export PDF
          </Button>
        ]}
        width={800}
      >
        {selectedTransaction && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Status Banner */}
            <Alert
              message={
                <Space>
                  <Badge status={getStatusColor(selectedTransaction.status)} />
                  <Text strong>Status: {selectedTransaction.formattedStatus}</Text>
                </Space>
              }
              type={selectedTransaction.status === 'SETTLED' ? 'success' : 'info'}
              showIcon
            />

            {/* Transaction Summary Cards */}
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Amount"
                    value={Math.abs(selectedTransaction.amount)}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ 
                      color: selectedTransaction.type === 'CREDIT' ? '#52c41a' : '#cf1322' 
                    }}
                    suffix={selectedTransaction.type === 'CREDIT' ? '(Credit)' : '(Debit)'}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Previous Balance"
                    value={selectedTransaction.previousBalance}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#8c8c8c' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="New Balance"
                    value={selectedTransaction.newBalance}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Transaction Details */}
            <Card size="small" title="Transaction Information">
              <Descriptions column={2} size="small">
                {/* <Descriptions.Item label="Transaction ID">
                  <Text copyable>{selectedTransaction.id}</Text>
                </Descriptions.Item> */}
                <Descriptions.Item label="Date & Time">
                  {formatDate(selectedTransaction.transactionDate, true)}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color={selectedTransaction.type === 'CREDIT' ? 'green' : 'red'}>
                    {selectedTransaction.type}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {selectedTransaction.description || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Debtor">
                  <Space>
                    <UserOutlined />
                    {selectedTransaction.debtorName}
                    {selectedTransaction.debtorCode && (
                      <Tag color="blue">{selectedTransaction.debtorCode}</Tag>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Station">
                  <Space>
                    <BankOutlined />
                    {selectedTransaction.stationName}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Account Details */}
            <Card size="small" title="Account Information">
              <Descriptions column={2} size="small">
                {/* <Descriptions.Item label="Account ID">
                  <Text copyable>{selectedTransaction.stationDebtorAccountId}</Text>
                </Descriptions.Item> */}
                <Descriptions.Item label="Current Debt">
                  {formatCurrency(selectedTransaction.stationDebtorAccount?.currentDebt || 0)}
                </Descriptions.Item>
                <Descriptions.Item label="Debtor Description">
                  {selectedTransaction.stationDebtorAccount?.debtor?.description || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Credit Limit">
                  {selectedTransaction.stationDebtorAccount?.debtor?.hasCreditLimit ? 
                    formatCurrency(selectedTransaction.stationDebtorAccount?.debtor?.creditLimit) : 
                    'No Limit'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Shift Details */}
            <Card size="small" title="Shift Information">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Shift Number">
                  {selectedTransaction.shiftNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Shift Start">
                  {selectedTransaction.shiftStartTime ? 
                    formatDate(selectedTransaction.shiftStartTime, true) : 
                    'N/A'}
                </Descriptions.Item>
                {/* <Descriptions.Item label="Shift ID">
                  <Text copyable>{selectedTransaction.shiftId}</Text>
                </Descriptions.Item> */}
              </Descriptions>
            </Card>

            {/* Collection References */}
            {/* {(selectedTransaction.islandCollectionId || 
              selectedTransaction.shiftCollectionId || 
              selectedTransaction.accountTransferId) && (
              <Card size="small" title="Collection References">
                <Descriptions column={1} size="small">
                  {selectedTransaction.islandCollectionId && (
                    <Descriptions.Item label="Island Collection ID">
                      <Text copyable>{selectedTransaction.islandCollectionId}</Text>
                    </Descriptions.Item>
                  )}
                  {selectedTransaction.shiftCollectionId && (
                    <Descriptions.Item label="Shift Collection ID">
                      <Text copyable>{selectedTransaction.shiftCollectionId}</Text>
                    </Descriptions.Item>
                  )}
                  {selectedTransaction.accountTransferId && (
                    <Descriptions.Item label="Account Transfer ID">
                      <Text copyable>{selectedTransaction.accountTransferId}</Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )} */}

            {/* Audit Information */}
            <Card size="small" title="Audit Information">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Recorded By">
                  <Space>
                    <UserOutlined />
                    {selectedTransaction.recordedByDisplay}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  <Space>
                    <ClockCircleOutlined />
                    {formatDate(selectedTransaction.createdAt, true)}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Updated At">
                  {formatDate(selectedTransaction.updatedAt, true)}
                </Descriptions.Item>
                {/* <Descriptions.Item label="Company ID">
                  <Text copyable>{selectedTransaction.companyId}</Text>
                </Descriptions.Item> */}
              </Descriptions>
            </Card>
          </Space>
        )}
      </Modal>

      {/* Styles */}
      <style>{`
        .highlight-today {
          background-color: #f6ffed !important;
          border-left: 3px solid #52c41a;
          animation: highlightPulse 2s ease-in-out;
        }
        
        .highlight-today:hover td {
          background-color: #d9f7be !important;
        }
        
        @keyframes highlightPulse {
          0% { background-color: #f6ffed; }
          50% { background-color: #b7eb8f; }
          100% { background-color: #f6ffed; }
        }

        .ant-empty {
          margin: 0;
        }
        .ant-card-body {
          padding: ${enhancedTransactions.length === 0 ? '0' : '24px'};
        }
      `}</style>
    </div>
  );
};

export default TransactionList;