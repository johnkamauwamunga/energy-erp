// src/components/dashboards/common/debtTransfer/components/management/DebtorTransactionsList.jsx
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
  Alert
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../context/AppContext';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DebtorTransactionsList = ({ debtorId }) => {
  const { state } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    dateRange: []
  });

  const loadTransactions = async () => {
    setLoading(true);
    try {
    //   const response = await debtTransferService.getDebtorTransactions({
    //     debtorId: debtorId,
    //     page: pagination.current,
    //     limit: pagination.pageSize,
    //     ...filters
    //   });

     const response = await debtTransferService.getDebtorTransactions();

     console.log("fetch transactions response", response);
      
      setTransactions(response.data?.transactions || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debtorId) {
      loadTransactions();
    }
  }, [debtorId, pagination.current, pagination.pageSize, filters]);

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
      type: '',
      dateRange: []
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      DEBIT: 'red',
      CREDIT: 'green'
    };
    return colors[type] || 'default';
  };

  const getAmountDisplay = (amount, type) => {
    const isCredit = type === 'CREDIT';
    const formattedAmount = Math.abs(amount).toLocaleString();
    return (
      <div style={{ 
        color: isCredit ? '#52c41a' : '#ff4d4f',
        fontWeight: 'bold'
      }}>
        {isCredit ? '-' : '+'} KES {formattedAmount}
        {isCredit ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
      </div>
    );
  };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 150,
      render: (date) => (
        <div>
          <div>{new Date(date).toLocaleDateString()}</div>
          <small style={{ color: '#666' }}>
            {new Date(date).toLocaleTimeString()}
          </small>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={getTransactionTypeColor(type)}>
          {type}
        </Tag>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount, record) => getAmountDisplay(amount, record.type)
    },
    {
      title: 'Previous Balance',
      dataIndex: 'previousBalance',
      key: 'previousBalance',
      width: 120,
      render: (balance) => `KES ${balance?.toLocaleString() || 0}`
    },
    {
      title: 'New Balance',
      dataIndex: 'newBalance',
      key: 'newBalance',
      width: 120,
      render: (balance) => `KES ${balance?.toLocaleString() || 0}`
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Station',
      dataIndex: 'station',
      key: 'station',
      width: 120,
      render: (station) => station?.name || 'N/A'
    },
    {
      title: 'Recorded By',
      dataIndex: 'recordedBy',
      key: 'recordedBy',
      width: 120,
      render: (user) => 
        user ? `${user.firstName} ${user.lastName}` : 'System'
    },
    {
      title: 'Transfer Ref',
      dataIndex: 'accountTransfer',
      key: 'accountTransfer',
      width: 120,
      render: (transfer) => 
        transfer ? (
          <Tag color="blue">{transfer.transferNumber}</Tag>
        ) : (
          '-'
        )
    }
  ];

  const handleExport = () => {
    // Implement export functionality
    console.log('Export transactions');
  };

  const calculateSummary = () => {
    const credits = transactions.filter(t => t.type === 'CREDIT');
    const debits = transactions.filter(t => t.type === 'DEBIT');
    
    const totalCredits = credits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalDebits = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return { totalCredits, totalDebits };
  };

  const { totalCredits, totalDebits } = calculateSummary();

  // Mock data for demonstration
  const mockTransactions = [
    {
      id: '1',
      transactionDate: new Date().toISOString(),
      type: 'DEBIT',
      amount: 10000,
      previousBalance: 0,
      newBalance: 10000,
      description: 'Fuel purchase - Invoice #123',
      station: { name: 'Nairobi Station' },
      recordedBy: { firstName: 'John', lastName: 'Attendant' },
      accountTransfer: null
    },
    {
      id: '2',
      transactionDate: new Date().toISOString(),
      type: 'CREDIT',
      amount: -5000,
      previousBalance: 10000,
      newBalance: 5000,
      description: 'Cash settlement - Receipt #456',
      station: { name: 'Nairobi Station' },
      recordedBy: { firstName: 'Jane', lastName: 'Manager' },
      accountTransfer: { transferNumber: 'DTR-2024-0001' }
    }
  ];

  if (!debtorId) {
    return (
      <Card>
        <Alert
          message="No Debtor Selected"
          description="Please select a debtor from the action buttons above to view their transaction history."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card size="small">
        <Form layout="inline">
          <Form.Item label="Search">
            <Input
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          
          <Form.Item label="Type">
            <Select
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="DEBIT">Debit</Option>
              <Option value="CREDIT">Credit</Option>
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
                onClick={loadTransactions}
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

      {/* Summary Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={pagination.total}
              prefix={<ReloadOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Payments (Credit)"
              value={totalCredits}
              valueStyle={{ color: '#52c41a' }}
              prefix="KES"
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Charges (Debit)"
              value={totalDebits}
              valueStyle={{ color: '#ff4d4f' }}
              prefix="KES"
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Net Balance"
              value={totalDebits - totalCredits}
              valueStyle={{ 
                color: (totalDebits - totalCredits) >= 0 ? '#ff4d4f' : '#52c41a' 
              }}
              prefix="KES"
              formatter={value => Math.abs(value).toLocaleString()}
              suffix={totalDebits - totalCredits >= 0 ? 'Due' : 'Credit'}
            />
          </Card>
        </Col>
      </Row>

      {/* Transactions Table */}
      <Card 
        title="Debtor Transactions"
        extra={
          <Space>
            <Button 
              size="small" 
              icon={<InfoCircleOutlined />}
              onClick={() => console.log('Show transaction help')}
            >
              Help
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={mockTransactions} // Replace with transactions when API is ready
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} transactions`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          rowKey="id"
        />
      </Card>
    </div>
  );
};

export default DebtorTransactionsList;