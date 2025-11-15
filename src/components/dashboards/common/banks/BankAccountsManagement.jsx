// components/BankManagement/BankAccountsManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Popconfirm,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Switch
} from 'antd';
import {
  CreditCardOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
  BankOutlined
} from '@ant-design/icons';
import { bankService } from '../../../../services/bankService/bankService';

const { Option } = Select;

const BankAccountsManagement = ({ onShowCreateModal }) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    bankId: '',
    isActive: '',
    isPrimary: ''
  });
  const [banks, setBanks] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm] = Form.useForm();

  // Load data
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const result = await bankService.getBankAccounts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setAccounts(result.accounts || result || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || result.total || 0
      }));
    } catch (error) {
      message.error('Failed to load bank accounts');
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const bankList = await bankService.getActiveBanks();
      setBanks(bankList);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadBanks();
  }, [filters, pagination.page, pagination.limit]);

  // Handle actions
  const handleEdit = (account) => {
    setEditingAccount(account);
    editForm.setFieldsValue({
      accountName: account.accountName,
      branch: account.branch,
      currency: account.currency,
      isActive: account.isActive,
      isPrimary: account.isPrimary
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      await bankService.updateBankAccount(editingAccount.id, values);
      message.success('Bank account updated successfully');
      setEditModalVisible(false);
      setEditingAccount(null);
      loadAccounts();
    } catch (error) {
      message.error(error.message || 'Failed to update bank account');
    }
  };

  const handleDelete = async (accountId) => {
    try {
      await bankService.deleteBankAccount(accountId);
      message.success('Bank account deleted successfully');
      loadAccounts();
    } catch (error) {
      message.error(error.message || 'Failed to delete bank account');
    }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      await bankService.setPrimaryBankAccount(accountId);
      message.success('Primary account set successfully');
      loadAccounts();
    } catch (error) {
      message.error(error.message || 'Failed to set primary account');
    }
  };

  const handleStatusToggle = async (accountId, currentStatus) => {
    try {
      await bankService.updateBankAccount(accountId, { isActive: !currentStatus });
      message.success(`Account ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadAccounts();
    } catch (error) {
      message.error(error.message || 'Failed to update account status');
    }
  };

  // Columns
  const columns = [
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      key: 'accountName',
      render: (name, record) => (
        <Space>
          <CreditCardOutlined />
          <span>{name}</span>
          {record.isPrimary && (
            <Tooltip title="Primary Account">
              <StarFilled style={{ color: '#fadb14' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Account Number',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      render: (number) => (
        <Tooltip title="Click to reveal">
          <span style={{ fontFamily: 'monospace' }}>
            ••••{number?.slice(-4) || '****'}
          </span>
        </Tooltip>
      )
    },
    {
      title: 'Bank',
      dataIndex: ['bank', 'name'],
      key: 'bank',
      render: (name, record) => (
        <Space>
          <BankOutlined />
          {name || 'Unknown Bank'}
          {record.bank?.code && (
            <Tag color="blue" size="small">
              {record.bank.code}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      render: (branch) => branch || '-'
    },
    {
      title: 'Balance',
      dataIndex: 'currentBalance',
      key: 'balance',
      render: (balance, record) => (
        <span style={{ 
          color: balance >= 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {bankService.formatCurrency(balance, record.currency)}
        </span>
      )
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency) => <Tag>{currency}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {!record.isPrimary && (
            <Tooltip title="Set as Primary">
              <Button 
                icon={<StarOutlined />} 
                size="small"
                onClick={() => handleSetPrimary(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
            <Button 
              size="small"
              type={record.isActive ? 'default' : 'primary'}
              danger={record.isActive}
              onClick={() => handleStatusToggle(record.id, record.isActive)}
            >
              {record.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Tooltip>
          <Popconfirm
            title="Delete Account"
            description="Are you sure you want to delete this bank account? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.isPrimary || (record.transactionCount > 0)}
          >
            <Tooltip 
              title={
                record.isPrimary ? 
                  "Cannot delete primary account" :
                record.transactionCount > 0 ?
                  "Cannot delete account with transaction history" :
                  "Delete account"
              }
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                disabled={record.isPrimary || (record.transactionCount > 0)}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Statistics
  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter(a => a.isActive).length;
    const primary = accounts.find(a => a.isPrimary);
    const totalBalance = accounts.reduce((sum, account) => sum + (account.currentBalance || 0), 0);
    
    return { total, active, primary, totalBalance };
  }, [accounts]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                <CreditCardOutlined /> Bank Accounts Management
              </h2>
              <p style={{ margin: 0, color: '#666' }}>
                Manage company bank accounts and balances
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadAccounts}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onShowCreateModal}
                >
                  New Account
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Accounts"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Active Accounts"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Primary Account"
              value={stats.primary ? 'Set' : 'Not Set'}
              valueStyle={{ color: stats.primary ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Balance"
              value={stats.totalBalance}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search accounts..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Bank"
              value={filters.bankId}
              onChange={(value) => setFilters(prev => ({ ...prev, bankId: value }))}
              allowClear
              loading={banks.length === 0}
            >
              {banks.map(bank => (
                <Option key={bank.id} value={bank.id}>
                  {bank.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.isActive}
              onChange={(value) => setFilters(prev => ({ ...prev, isActive: value }))}
              allowClear
            >
              <Option value="true">Active</Option>
              <Option value="false">Inactive</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Primary"
              value={filters.isPrimary}
              onChange={(value) => setFilters(prev => ({ ...prev, isPrimary: value }))}
              allowClear
            >
              <Option value="true">Primary</Option>
              <Option value="false">Secondary</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Accounts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={accounts}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} accounts`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, page, limit: pageSize }));
            }
          }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Edit Bank Account
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingAccount(null);
        }}
        onOk={() => editForm.submit()}
        okText="Update Account"
        cancelText="Cancel"
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="accountName"
            label="Account Name"
            rules={[
              { required: true, message: 'Please enter account name' },
              { min: 2, message: 'Account name must be at least 2 characters' }
            ]}
          >
            <Input prefix={<CreditCardOutlined />} />
          </Form.Item>

          <Form.Item
            name="branch"
            label="Branch"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true, message: 'Please select currency' }]}
          >
            <Select>
              <Option value="KES">Kenyan Shilling (KES)</Option>
              <Option value="USD">US Dollar (USD)</Option>
              <Option value="EUR">Euro (EUR)</Option>
              <Option value="GBP">British Pound (GBP)</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Status"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isPrimary"
                label="Primary"
                valuePropName="checked"
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default BankAccountsManagement;