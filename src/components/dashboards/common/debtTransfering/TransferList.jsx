// src/components/dashboards/common/debtTransfer/TransferList.jsx
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
  Alert,
  Popover
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  BankOutlined,
  WalletOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SortDescendingOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

// Import report generators
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text, Title } = Typography;
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
  pagination = { pageSize: 10 },
  currentUser,
  currentStation,
  showSummaryCards = true
}) => {
  const [sortOrder, setSortOrder] = useState({
    field: 'transferDate',
    order: 'descend'
  });

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
    setSortOrder({
      field: 'transferDate',
      order: 'descend'
    });
  };

  // Get status color and icon
  const getStatusConfig = (status) => {
    const configs = {
      COMPLETED: { 
        color: 'green', 
        icon: <CheckCircleOutlined />,
        text: 'Completed'
      },
      PENDING: { 
        color: 'orange', 
        icon: <ClockCircleOutlined />,
        text: 'Pending'
      },
      FAILED: { 
        color: 'red', 
        icon: <CloseCircleOutlined />,
        text: 'Failed'
      },
      CANCELLED: { 
        color: 'red', 
        icon: <CloseCircleOutlined />,
        text: 'Cancelled'
      },
      PROCESSING: { 
        color: 'blue', 
        icon: <ClockCircleOutlined />,
        text: 'Processing'
      }
    };
    return configs[status] || { color: 'default', icon: null, text: status };
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      CASH_TO_BANK: 'blue',
      BANK_TO_CASH: 'green',
      DEBT_SETTLEMENT: 'purple',
      INTER_ACCOUNT: 'orange',
      INTER_STATION: 'cyan',
      INTER_COMPANY: 'magenta'
    };
    return colors[category] || 'default';
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      CASH_TO_BANK: <WalletOutlined />,
      BANK_TO_CASH: <BankOutlined />,
      DEBT_SETTLEMENT: <LineChartOutlined />,
      INTER_ACCOUNT: <ArrowRightOutlined />,
      INTER_STATION: <ArrowRightOutlined />,
      INTER_COMPANY: <ArrowRightOutlined />
    };
    return icons[category] || <ArrowRightOutlined />;
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!transfers.length) {
      return {
        totalAmount: 0,
        completedAmount: 0,
        pendingAmount: 0,
        failedAmount: 0,
        averageAmount: 0,
        completedCount: 0,
        pendingCount: 0,
        failedCount: 0
      };
    }

    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    const completedAmount = transfers
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingAmount = transfers
      .filter(t => t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0);
    const failedAmount = transfers
      .filter(t => t.status === 'FAILED' || t.status === 'CANCELLED')
      .reduce((sum, t) => sum + t.amount, 0);
    const completedCount = transfers.filter(t => t.status === 'COMPLETED').length;
    const pendingCount = transfers.filter(t => t.status === 'PENDING').length;
    const failedCount = transfers.filter(t => t.status === 'FAILED' || t.status === 'CANCELLED').length;

    return {
      totalAmount,
      completedAmount,
      pendingAmount,
      failedAmount,
      averageAmount: totalAmount / transfers.length,
      completedCount,
      pendingCount,
      failedCount,
      maxAmount: Math.max(...transfers.map(t => t.amount)),
      minAmount: Math.min(...transfers.map(t => t.amount)),
      uniqueCategories: new Set(transfers.map(t => t.transferCategory)).size
    };
  }, [transfers]);

  // Enhanced transfers data for reporting WITH SEQUENTIAL NUMBERING
  const enhancedTransfers = useMemo(() => 
    transfers.map((transfer, index) => ({
      ...transfer,
      // Add sequential number instead of ID
      sequentialNumber: index + 1,
      formattedDate: formatDate(transfer.transferDate, true),
      formattedAmount: transfer.amount,
      formattedCategory: transfer.transferCategory?.replace(/_/g, ' '),
      formattedStatus: transfer.status,
      transactionModeDisplay: transfer.bankTransaction?.transactionMode || 'N/A',
      createdByDisplay: transfer.createdBy ? 
        `${transfer.createdBy.firstName} ${transfer.createdBy.lastName}` : 
        'System',
      fromAccountDisplay: transfer.fromAccountName || 
                         transfer.fromAccount?.accountName || 
                         'N/A',
      toAccountDisplay: transfer.toAccountName || 
                       transfer.toAccount?.accountName || 
                       'N/A',
      timestamp: new Date(transfer.transferDate).getTime(),
      statusConfig: getStatusConfig(transfer.status)
    })),
  [transfers]);

  // Sort transfers based on current sort order
  const sortedTransfers = useMemo(() => {
    const sorted = [...enhancedTransfers];
    
    if (sortOrder.field && sortOrder.order) {
      sorted.sort((a, b) => {
        let aValue = a[sortOrder.field];
        let bValue = b[sortOrder.field];
        
        // Handle special fields
        if (sortOrder.field === 'transferDate') {
          aValue = new Date(a.transferDate).getTime();
          bValue = new Date(b.transferDate).getTime();
        }
        
        if (sortOrder.field === 'fromAccountDisplay') {
          aValue = a.fromAccountDisplay?.toLowerCase() || '';
          bValue = b.fromAccountDisplay?.toLowerCase() || '';
        }
        
        if (sortOrder.field === 'toAccountDisplay') {
          aValue = a.toAccountDisplay?.toLowerCase() || '';
          bValue = b.toAccountDisplay?.toLowerCase() || '';
        }
        
        if (sortOrder.order === 'descend') {
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return bValue.localeCompare(aValue);
          }
          return bValue - aValue;
        } else {
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue);
          }
          return aValue - bValue;
        }
      });
    }
    
    return sorted;
  }, [enhancedTransfers, sortOrder]);

  // Transfer columns for table display - DEFAULT DESC ORDER
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
      title: 'Transfer Date',
      dataIndex: 'transferDate',
      key: 'transferDate',
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <span style={{ fontSize: '11px' }}>{formatDate(date, true)}</span>
        </Tooltip>
      ),
      width: 150,
      sorter: (a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime(),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Transfer No.',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      render: (number) => (
        <Text strong style={{ fontSize: '12px' }} code>
          {number}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => b.transferNumber?.localeCompare(a.transferNumber || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong type="success" style={{ fontSize: '12px' }}>
          {formatCurrency(amount)}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => b.amount - a.amount,
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend']
    },
    {
      title: (
        <Space>
          <ArrowRightOutlined style={{ transform: 'rotate(-90deg)' }} />
          <span>From Account</span>
        </Space>
      ),
      key: 'fromAccount',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '11px' }}>
            {record.fromAccountDisplay}
          </Text>
          {record.fromAccountType && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {record.fromAccountType}
            </Text>
          )}
        </Space>
      ),
      ellipsis: true,
      width: 160,
      sorter: (a, b) => b.fromAccountDisplay?.localeCompare(a.fromAccountDisplay || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: (
        <Space>
          <ArrowRightOutlined style={{ transform: 'rotate(90deg)' }} />
          <span>To Account</span>
        </Space>
      ),
      key: 'toAccount',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '11px' }}>
            {record.toAccountDisplay}
          </Text>
          {record.toAccountType && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {record.toAccountType}
            </Text>
          )}
        </Space>
      ),
      ellipsis: true,
      width: 160,
      sorter: (a, b) => b.toAccountDisplay?.localeCompare(a.toAccountDisplay || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Category',
      dataIndex: 'transferCategory',
      key: 'transferCategory',
      render: (category) => (
        <Tag 
          color={getCategoryColor(category)}
          icon={getCategoryIcon(category)}
          style={{ fontSize: '11px', padding: '0 8px' }}
        >
          {category?.replace(/_/g, ' ')}
        </Tag>
      ),
      width: 140,
      filters: [
        { text: 'Cash to Bank', value: 'CASH_TO_BANK' },
        { text: 'Bank to Cash', value: 'BANK_TO_CASH' },
        { text: 'Debt Settlement', value: 'DEBT_SETTLEMENT' },
        { text: 'Inter Account', value: 'INTER_ACCOUNT' },
        { text: 'Inter Station', value: 'INTER_STATION' },
        { text: 'Inter Company', value: 'INTER_COMPANY' }
      ],
      onFilter: (value, record) => record.transferCategory === value,
      sorter: (a, b) => b.transferCategory?.localeCompare(a.transferCategory || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const config = getStatusConfig(status);
        return (
          <Badge 
            status={config.color} 
            text={
              <Space size={4}>
                {config.icon}
                <span style={{ fontSize: '11px' }}>{config.text}</span>
              </Space>
            }
          />
        );
      },
      width: 120,
      filters: [
        { text: 'Completed', value: 'COMPLETED' },
        { text: 'Pending', value: 'PENDING' },
        { text: 'Failed', value: 'FAILED' },
        { text: 'Processing', value: 'PROCESSING' },
        { text: 'Cancelled', value: 'CANCELLED' }
      ],
      onFilter: (value, record) => record.status === value,
      sorter: (a, b) => b.status?.localeCompare(a.status || ''),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Transaction Mode',
      key: 'transactionMode',
      render: (_, record) => (
        <Tag style={{ fontSize: '10px' }}>
          {record.bankTransaction?.transactionMode || 'N/A'}
        </Tag>
      ),
      width: 110,
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
          <Text style={{ fontSize: '11px' }}>
            {text || 'N/A'}
          </Text>
        </Tooltip>
      ),
      width: 150
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (text) => (
        <Text type="secondary" code style={{ fontSize: '10px' }}>
          {text || 'N/A'}
        </Text>
      ),
      width: 100
    },
    {
      title: 'Created By',
      key: 'createdBy',
      render: (_, record) => (
        <Text style={{ fontSize: '11px' }}>
          {record.createdBy ? 
            `${record.createdBy.firstName} ${record.createdBy.lastName}` : 
            'System'
          }
        </Text>
      ),
      width: 120,
      sorter: (a, b) => {
        const aName = (a.createdBy ? `${a.createdBy.firstName} ${a.createdBy.lastName}` : '').toLowerCase();
        const bName = (b.createdBy ? `${b.createdBy.firstName} ${b.createdBy.lastName}` : '').toLowerCase();
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

  // Columns for export (optimized for reports) - WITH SEQUENTIAL NUMBERING
  const exportColumns = [
    {
      title: '#',  // Sequence number
      key: 'sequence',
      render: (_, record, index) => index + 1,
      type: 'number',
      width: 50
    },
    {
      title: 'Transfer Number',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      type: 'text'
    },
    {
      title: 'Transfer Date',
      dataIndex: 'transferDate',
      key: 'transferDate',
      render: (date) => formatDate(date, true),
      type: 'datetime'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => amount,
      type: 'currency'
    },
    {
      title: 'From Account',
      dataIndex: 'fromAccountName',
      key: 'fromAccountName',
      render: (_, record) => record.fromAccountDisplay,
      type: 'text'
    },
    {
      title: 'To Account',
      dataIndex: 'toAccountName',
      key: 'toAccountName',
      render: (_, record) => record.toAccountDisplay,
      type: 'text'
    },
    {
      title: 'Category',
      dataIndex: 'transferCategory',
      key: 'transferCategory',
      render: (category) => category?.replace(/_/g, ' '),
      type: 'text'
    },
    {
      title: 'Category Description',
      dataIndex: 'transferCategory',
      key: 'categoryDescription',
      render: (category) => {
        const descriptions = {
          'CASH_TO_BANK': 'Cash Deposit to Bank Account',
          'BANK_TO_CASH': 'Bank Withdrawal to Cash',
          'DEBT_SETTLEMENT': 'Debt Payment Settlement',
          'INTER_ACCOUNT': 'Transfer Between Accounts',
          'INTER_STATION': 'Transfer Between Stations',
          'INTER_COMPANY': 'Transfer Between Companies'
        };
        return descriptions[category] || category;
      },
      type: 'text'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      type: 'status'
    },
    {
      title: 'Transaction Mode',
      key: 'transactionMode',
      render: (_, record) => record.bankTransaction?.transactionMode || 'N/A',
      type: 'text'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      type: 'text'
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      type: 'text'
    },
    {
      title: 'Created By',
      key: 'createdBy',
      render: (_, record) => record.createdBy ? 
        `${record.createdBy.firstName} ${record.createdBy.lastName}` : 
        'System',
      type: 'text'
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? formatDate(date, true) : 'N/A',
      type: 'datetime'
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => date ? formatDate(date, true) : 'N/A',
      type: 'datetime'
    }
  ];

  // Summary data for report header
  const summaryData = {
    'Total Transfers': enhancedTransfers.length,
    'Total Amount': formatCurrency(summaryStats.totalAmount),
    'Completed Amount': formatCurrency(summaryStats.completedAmount),
    'Pending Amount': formatCurrency(summaryStats.pendingAmount),
    'Failed Amount': formatCurrency(summaryStats.failedAmount),
    'Completed Transfers': summaryStats.completedCount,
    'Pending Transfers': summaryStats.pendingCount,
    'Failed Transfers': summaryStats.failedCount,
    'Average Transfer': formatCurrency(summaryStats.averageAmount),
    'Unique Categories': summaryStats.uniqueCategories
  };

  const handleViewDetails = (transfer) => {
    console.log('View transfer details:', transfer);
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
    console.log(`Exporting ${enhancedTransfers.length} transfers as ${format}`);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {showSummaryCards && transfers.length > 0 && (
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Transfers"
                value={summaryStats.totalAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#1890ff' }}
                suffix={
                  <Tooltip title="Sum of all transfer amounts">
                    <InfoCircleOutlined style={{ color: '#999', marginLeft: 4 }} />
                  </Tooltip>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={summaryStats.completedAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#52c41a' }}
                suffix={`/ ${summaryStats.completedCount} transfers`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Pending"
                value={summaryStats.pendingAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#faad14' }}
                suffix={`/ ${summaryStats.pendingCount} transfers`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Average Transfer"
                value={summaryStats.averageAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#722ed1' }}
                suffix={`/ ${transfers.length} transfers`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      {showFilters && (
        <Card size="small" title="Filters & Export">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={6}>
              <Search
                placeholder="Search transfer number, reference..."
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                allowClear
                size="small"
              />
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Category"
                value={filters.transferCategory}
                onChange={handleCategoryChange}
                style={{ width: '100%' }}
                allowClear
                size="small"
              >
                <Option value="CASH_TO_BANK">Cash to Bank</Option>
                <Option value="BANK_TO_CASH">Bank to Cash</Option>
                <Option value="DEBT_SETTLEMENT">Debt Settlement</Option>
                <Option value="INTER_ACCOUNT">Inter Account</Option>
                <Option value="INTER_STATION">Inter Station</Option>
                <Option value="INTER_COMPANY">Inter Company</Option>
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
                <Option value="COMPLETED">Completed</Option>
                <Option value="PENDING">Pending</Option>
                <Option value="FAILED">Failed</Option>
                <Option value="PROCESSING">Processing</Option>
                <Option value="CANCELLED">Cancelled</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Transaction Mode"
                value={filters.transactionMode}
                onChange={handleTransactionModeChange}
                style={{ width: '100%' }}
                allowClear
                size="small"
              >
                <Option value="CASH">Cash</Option>
                <Option value="BANK_TRANSFER">Bank Transfer</Option>
                <Option value="MOBILE_MONEY">Mobile Money</Option>
                <Option value="CHEQUE">Cheque</Option>
                <Option value="POS">POS</Option>
                <Option value="OTHER">Other</Option>
              </Select>
            </Col>
            <Col xs={24} sm={6}>
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
                
                {/* Main Export Button */}
                <AdvancedReportGenerator
                  dataSource={enhancedTransfers}
                  columns={exportColumns}
                  title={`Transfer History Report - ${currentStation?.name || 'Company'} Level`}
                  fileName={`debt_transfers_${currentStation?.code || 'company'}_${new Date().toISOString().split('T')[0]}`}
                  summaryData={summaryData}
                  reportType="finance"
                  stationInfo={currentStation}
                  footerText={`Generated from Lynx Energy System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
                  showFooter={true}
                  enableCustomization={true}
                  onReportGenerate={handleExport}
                />
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Data Info Alert */}
      {transfers.length === 0 && !loading && (
        <Alert
          message="No Transfers Found"
          description="There are no transfers matching your current filters."
          type="info"
          showIcon
          action={
            <Button size="small" onClick={clearFilters}>
              Clear Filters
            </Button>
          }
        />
      )}

      {/* Transfers Table */}
      <Card size="small">
        <Table
          columns={columns}
          dataSource={sortedTransfers}
          rowKey="sequentialNumber"  // Changed from "id" to use sequential numbering
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} transfers`,
            defaultPageSize: 10,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          size="small"
          scroll={{ x: 1500 }}
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
                  <Text strong type="success">
                    Total: {formatCurrency(summaryStats.totalAmount)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={7}>
                  <Text type="secondary">
                    Showing {sortedTransfers.length} transfers ({summaryStats.completedCount} completed, {summaryStats.pendingCount} pending)
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  {/* Secondary Export Button */}
                  <AdvancedReportGenerator
                    dataSource={enhancedTransfers}
                    columns={exportColumns}
                    title={`Detailed Transfer Report - ${currentStation?.name || 'Company'}`}
                    fileName={`detailed_transfers_${new Date().toISOString().split('T')[0]}`}
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
      </Card>
    </div>
  );
};

export default TransferList;