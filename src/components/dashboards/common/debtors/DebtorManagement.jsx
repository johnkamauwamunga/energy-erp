import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Tooltip,
  Input,
  Select,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Empty,
  Badge,
  Avatar,
  List,
  Descriptions,
  Spin,
  Typography
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  DollarOutlined,
  TransactionOutlined,
  CloseOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import { debtorService } from '../../../../services/debtorService/debtorService';
import { debtorTransactionService } from '../../../../services/debtorTransactionService/debtorTransactionService';
import UpdateDebtorModal from './modal/UpdateDebtorModal';
import DebtorDetailModal from './modal/DebtorDetailModal';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const { Option } = Select;
const { Search } = Input;
const { Title, Text } = Typography;

const DebtorsManagement = ({ onShowCreateModal }) => {
  const { state } = useApp();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    categoryId: undefined,
    isActive: undefined,
    isBlacklisted: undefined,
    hasCreditLimit: undefined,
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const stationId = state.currentStation?.id;
  const [currentStationId, setCurrentStationId] = useState(stationId);
  const tableRef = useRef();

  // Load debtors and categories
  const loadDebtors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await debtorService.getDebtors(filters);
      
      console.log("Debtors loaded:", result);
      if (result.debtors) {
        setDebtors(result.debtors);
        setPagination(result.pagination || {});
      } else {
        setDebtors(result);
        setPagination({});
      }
    } catch (error) {
      message.error(error.message || 'Failed to load debtors');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadCategories = async () => {
    try {
      const categoriesData = await debtorService.getActiveDebtorCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    loadDebtors();
    loadCategories();
  }, [loadDebtors]);

  // Load transactions for a specific debtor
  const loadDebtorTransactions = async (debtorId) => {
    console.log("Loading transactions for debtor:", debtorId, "station:", currentStationId);
    
    if (!currentStationId || !debtorId) {
      console.error('Missing required IDs:', { currentStationId, debtorId });
      message.error('Station ID and Debtor ID are required');
      return;
    }

    setTransactionsLoading(true);
    try {
      const result = await debtorTransactionService.getDebtorTransactions(
        currentStationId, 
        debtorId
      );
      console.log("Transactions loaded:", result);
      setTransactions(result.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      message.error(error.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handle view transactions - ALWAYS CLICKABLE
  const handleViewTransactions = async (debtor) => {
    console.log("View transactions clicked for:", debtor);
    
    if (!debtor || !debtor.id) {
      message.error('Invalid debtor data');
      return;
    }
    
    setSelectedDebtor(debtor);
    setShowTransactionsModal(true);
    
    try {
      await loadDebtorTransactions(debtor.id);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      message.error('Failed to load transactions');
    }
  };

  // Handle filter changes
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleTableChange = (pagination) => {
    setFilters(prev => ({ 
      ...prev, 
      page: pagination.current,
      limit: pagination.pageSize
    }));
  };

  // Handle debtor actions
  const handleViewDetails = (debtor) => {
    setSelectedDebtor(debtor);
    setShowDetailModal(true);
  };

  const handleEdit = (debtor) => {
    setSelectedDebtor(debtor);
    setShowUpdateModal(true);
  };

  const handleUpdateSuccess = () => {
    setShowUpdateModal(false);
    setSelectedDebtor(null);
    loadDebtors();
    message.success('Debtor updated successfully');
  };

  // Format debtor for display
  const formatDebtor = (debtor) => {
    return debtorService.formatDebtor(debtor);
  };

  // Get transaction count for a debtor
  const getTransactionCount = (debtor) => {
    const count = debtor.transactionCount || debtor.debtorTransactions?.length || 0;
    console.log(`Transaction count for ${debtor.name}:`, count);
    return count;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Format date for table
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date with time for detailed view
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate totals for transactions
  const calculateTotals = () => {
    const totalDebit = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalCredit = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const netAmount = totalCredit - totalDebit;

    return { totalDebit, totalCredit, netAmount };
  };

  // Calculate statistics for debtors
  const stats = {
    total: debtors.length,
    active: debtors.filter(debtor => debtor.isActive).length,
    blacklisted: debtors.filter(debtor => debtor.isBlacklisted).length,
    totalDebt: debtors.reduce((sum, debtor) => sum + (debtor.totalDebt || 0), 0),
    totalTransactions: debtors.reduce((sum, debtor) => sum + getTransactionCount(debtor), 0)
  };

  // Download as PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    const totals = calculateTotals();

    // Title
    doc.setFontSize(16);
    doc.text(`Transactions Report - ${selectedDebtor.name}`, 14, 15);
    
    // Subtitle
    doc.setFontSize(10);
    doc.text(`Station: ${state.currentStation?.name || 'N/A'} | Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    // Table data
    const tableColumn = ["Date", "Type", "Amount", "Description", "Status", "Shift"];
    const tableRows = transactions.map(transaction => [
      formatDate(transaction.transactionDate),
      transaction.type,
      formatCurrency(transaction.amount),
      transaction.description || 'N/A',
      transaction.status,
      transaction.shift?.shiftNumber || 'N/A'
    ]);

    // Add totals row
    tableRows.push([
      'TOTALS',
      'DEBIT',
      formatCurrency(totals.totalDebit),
      '',
      '',
      ''
    ]);
    tableRows.push([
      '',
      'CREDIT',
      formatCurrency(totals.totalCredit),
      '',
      '',
      ''
    ]);
    tableRows.push([
      '',
      'NET',
      formatCurrency(totals.netAmount),
      '',
      '',
      ''
    ]);

    // Add table to PDF
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Save PDF
    doc.save(`transactions-${selectedDebtor.name}-${new Date().toISOString().split('T')[0]}.pdf`);
    message.success('PDF downloaded successfully');
  };

  // Download as Excel
  const downloadExcel = () => {
    const totals = calculateTotals();
    
    const worksheetData = [
      ['Date', 'Type', 'Amount', 'Description', 'Status', 'Shift', 'Previous Balance', 'New Balance'],
      ...transactions.map(transaction => [
        formatDateTime(transaction.transactionDate),
        transaction.type,
        transaction.amount,
        transaction.description || 'N/A',
        transaction.status,
        transaction.shift?.shiftNumber || 'N/A',
        transaction.previousBalance,
        transaction.newBalance
      ]),
      ['', 'DEBIT TOTAL', totals.totalDebit, '', '', '', '', ''],
      ['', 'CREDIT TOTAL', totals.totalCredit, '', '', '', '', ''],
      ['', 'NET AMOUNT', totals.netAmount, '', '', '', '', '']
    ];

    const ws = utils.aoa_to_sheet(worksheetData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Transactions');
    writeFile(wb, `transactions-${selectedDebtor.name}-${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Excel file downloaded successfully');
  };

  // Transaction table columns
  const transactionColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'DEBIT' ? 'red' : 'green'}>
          {type}
        </Tag>
      ),
      filters: [
        { text: 'DEBIT', value: 'DEBIT' },
        { text: 'CREDIT', value: 'CREDIT' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount, record) => (
        <Text strong style={{ 
          color: record.type === 'DEBIT' ? '#ff4d4f' : '#52c41a'
        }}>
          {formatCurrency(amount)}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      render: (desc) => desc || 'No description'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={
          status === 'SETTLED' ? 'green' :
          status === 'OUTSTANDING' ? 'orange' : 'red'
        }>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'SETTLED', value: 'SETTLED' },
        { text: 'OUTSTANDING', value: 'OUTSTANDING' },
        { text: 'PENDING', value: 'PENDING' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      width: 80,
      render: (shift) => shift?.shiftNumber || 'N/A'
    },
    {
      title: 'Previous Balance',
      dataIndex: 'previousBalance',
      key: 'previousBalance',
      width: 120,
      render: (balance) => formatCurrency(balance)
    },
    {
      title: 'New Balance',
      dataIndex: 'newBalance',
      key: 'newBalance',
      width: 120,
      render: (balance) => formatCurrency(balance)
    }
  ];

  // Columns definition for main debtors table
  const columns = [
    {
      title: 'Debtor',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => {
        const formatted = formatDebtor(record);
        return (
          <Space>
            <Avatar 
              size="small" 
              style={{ 
                backgroundColor: record.category?.color || '#666666' 
              }}
              icon={<UserOutlined />}
            />
            <div>
              <div style={{ fontWeight: 500 }}>{name}</div>
              {record.code && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {record.code}
                </div>
              )}
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => (
        <Space>
          {category && (
            <>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: category.color || '#666666'
                }}
              />
              <span>{category.name}</span>
            </>
          )}
        </Space>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.contactPerson && (
            <div style={{ fontSize: '12px' }}>
              <UserOutlined /> {record.contactPerson}
            </div>
          )}
          {record.phone && (
            <div style={{ fontSize: '12px' }}>
              <PhoneOutlined /> {record.phone}
            </div>
          )}
          {record.email && (
            <div style={{ fontSize: '12px' }}>
              <MailOutlined /> {record.email}
            </div>
          )}
        </Space>
      )
    },
    {
      title: 'Credit/Debt',
      key: 'creditDebt',
      width: 150,
      render: (_, record) => {
        const formatted = formatDebtor(record);
        return (
          <Space direction="vertical" size={0}>
            <div style={{ fontSize: '12px' }}>
              <strong>Limit:</strong> {formatted.creditLimitDisplay}
            </div>
            <div style={{ fontSize: '12px' }}>
              <strong>Debt:</strong> {formatted.totalDebtDisplay}
            </div>
            {record.creditLimit && record.totalDebt && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {formatted.creditUtilization}
              </div>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Transactions',
      key: 'transactions',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const transactionCount = getTransactionCount(record);
        return (
          <Badge 
            count={transactionCount} 
            showZero 
            size="small"
            style={{ 
              backgroundColor: transactionCount > 0 ? '#1890ff' : '#d9d9d9' 
            }}
          >
            <Button 
              type="link" 
              size="small"
              style={{ 
                width: 24, 
                height: 24,
                padding: 0,
                minWidth: 'auto'
              }}
            />
          </Badge>
        );
      }
    },
    {
      title: 'Stations',
      dataIndex: 'stationCount',
      key: 'stationCount',
      width: 100,
      align: 'center',
      render: (count) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count || 0} station{count !== 1 ? 's' : ''}
        </Tag>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const formatted = formatDebtor(record);
        return (
          <Space direction="vertical" size={4}>
            <Tag color={formatted.statusColor}>
              {formatted.statusDisplay}
            </Tag>
            {record.isBlacklisted && (
              <Tag color="error">Blacklisted</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_, record) => {
        const formatted = formatDebtor(record);
        const transactionCount = getTransactionCount(record);
        
        return (
          <Space>
            {/* VIEW TRANSACTIONS BUTTON - ALWAYS CLICKABLE */}
            <Tooltip title={transactionCount > 0 ? "View Transactions" : "View Transactions (No transactions yet)"}>
              <Button
                type="link"
                icon={<TransactionOutlined />}
                onClick={() => handleViewTransactions(record)}
                style={{ 
                  color: transactionCount > 0 ? '#1890ff' : '#8c8c8c',
                  cursor: 'pointer'
                }}
                size="small"
              >
                {transactionCount > 0 && transactionCount}
              </Button>
            </Tooltip>

            <Tooltip title="View Details">
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(record)}
                size="small"
              />
            </Tooltip>

            <Tooltip title="Edit Debtor">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={updating}
                size="small"
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  // Transactions Modal Content with Table
  const TransactionsModalContent = () => {
    const totals = calculateTotals();

    if (transactionsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading transactions...</div>
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <Empty
          description="No transactions found for this debtor"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => loadDebtorTransactions(selectedDebtor.id)}>
            Try Again
          </Button>
        </Empty>
      );
    }

    return (
      <div>
        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="Total Debit"
                value={totals.totalDebit}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<DollarOutlined />}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="Total Credit"
                value={totals.totalCredit}
                valueStyle={{ color: '#52c41a' }}
                prefix={<DollarOutlined />}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="Net Amount"
                value={totals.netAmount}
                valueStyle={{ color: totals.netAmount >= 0 ? '#52c41a' : '#ff4d4f' }}
                prefix={<DollarOutlined />}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
        </Row>

        {/* Transactions Table */}
        <div ref={tableRef}>
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} transactions`
            }}
            scroll={{ x: 800 }}
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row style={{ background: '#fafafa' }}>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>TOTALS</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Space direction="vertical" size={0}>
                      <Text type="danger" strong>Debit: {formatCurrency(totals.totalDebit)}</Text>
                      <Text type="success" strong>Credit: {formatCurrency(totals.totalCredit)}</Text>
                      <Text strong>Net: {formatCurrency(totals.netAmount)}</Text>
                    </Space>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={5}>
                    <Text type="secondary">
                      {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} total
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Debtors"
              value={stats.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Transactions"
              value={stats.totalTransactions}
              valueStyle={{ color: '#1890ff' }}
              prefix={<TransactionOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Debt"
              value={stats.totalDebt}
              precision={2}
              prefix={<DollarOutlined />}
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={6}>
            <Search
              placeholder="Search debtors..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Category"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('categoryId', value)}
            >
              {categories.map(category => (
                <Option key={category.id} value={category.id}>
                  <Space>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: category.color || '#666666'
                      }}
                    />
                    {category.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('isActive', value)}
            >
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <Select
              placeholder="Blacklist"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('isBlacklisted', value)}
            >
              <Option value={true}>Blacklisted</Option>
              <Option value={false}>Clear</Option>
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <Select
              placeholder="Credit Limit"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('hasCreditLimit', value)}
            >
              <Option value={true}>Has Limit</Option>
              <Option value={false}>No Limit</Option>
            </Select>
          </Col>
          <Col xs={24} md={5}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onShowCreateModal}
              >
                New Debtor
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadDebtors}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Debtors Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={debtors}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page || 1,
            pageSize: pagination.limit || 10,
            total: pagination.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} debtors`
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                description="No debtors found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  onClick={onShowCreateModal}
                >
                  Create First Debtor
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* Modals */}
      {selectedDebtor && (
        <>
          <UpdateDebtorModal
            visible={showUpdateModal}
            debtor={selectedDebtor}
            categories={categories}
            onClose={() => {
              setShowUpdateModal(false);
              setSelectedDebtor(null);
            }}
            onSuccess={handleUpdateSuccess}
          />

          <DebtorDetailModal
            visible={showDetailModal}
            debtor={selectedDebtor}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedDebtor(null);
            }}
          />

          {/* Transactions Modal */}
          <Modal
            title={
              <Space>
                <TransactionOutlined />
                Transactions for {selectedDebtor?.name}
                <Tag color="blue">
                  Station: {state.currentStation?.name || 'N/A'}
                </Tag>
              </Space>
            }
            open={showTransactionsModal}
            onCancel={() => {
              setShowTransactionsModal(false);
              setSelectedDebtor(null);
              setTransactions([]);
            }}
            width={1200}
            style={{ top: 20 }}
            footer={[
              <Button 
                key="download-pdf"
                icon={<DownloadOutlined />}
                onClick={downloadPDF}
                disabled={transactions.length === 0}
              >
                Download PDF
              </Button>,
              <Button 
                key="download-excel"
                icon={<DownloadOutlined />}
                onClick={downloadExcel}
                disabled={transactions.length === 0}
              >
                Download Excel
              </Button>,
              <Button 
                key="close" 
                icon={<CloseOutlined />}
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedDebtor(null);
                  setTransactions([]);
                }}
              >
                Close
              </Button>
            ]}
          >
            <TransactionsModalContent />
          </Modal>
        </>
      )}
    </div>
  );
};

export default DebtorsManagement;