// components/BankManagement/BanksManagement.jsx
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
  BankOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { bankService } from '../../../../services/bankService/bankService';

const { Option } = Select;

const BanksManagement = ({ onShowCreateModal }) => {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    isActive: ''
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [editForm] = Form.useForm();

  // Load banks
  const loadBanks = async () => {
    setLoading(true);
    try {
      const result = await bankService.getBanks({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setBanks(result.banks || result || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || result.total || 0
      }));
    } catch (error) {
      message.error('Failed to load banks');
      console.error('Error loading banks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
  }, [filters, pagination.page, pagination.limit]);

  // Handle edit
  const handleEdit = (bank) => {
    setEditingBank(bank);
    editForm.setFieldsValue({
      name: bank.name,
      code: bank.code,
      country: bank.country,
      isActive: bank.isActive
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      await bankService.updateBank(editingBank.id, values);
      message.success('Bank updated successfully');
      setEditModalVisible(false);
      setEditingBank(null);
      loadBanks();
    } catch (error) {
      message.error(error.message || 'Failed to update bank');
    }
  };

  // Handle delete
  const handleDelete = async (bankId) => {
    try {
      await bankService.deleteBank(bankId);
      message.success('Bank deleted successfully');
      loadBanks();
    } catch (error) {
      message.error(error.message || 'Failed to delete bank');
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (bankId, currentStatus) => {
    try {
      await bankService.updateBank(bankId, { isActive: !currentStatus });
      message.success(`Bank ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadBanks();
    } catch (error) {
      message.error(error.message || 'Failed to update bank status');
    }
  };

  // Columns
  const columns = [
    {
      title: 'Bank Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <BankOutlined />
          <span>{name}</span>
        </Space>
      )
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code) => code ? <Tag color="blue">{code}</Tag> : '-'
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (country) => <Tag>{country}</Tag>
    },
    {
      title: 'Accounts',
      dataIndex: 'accountCount',
      key: 'accountCount',
      render: (count) => (
        <Tooltip title={`${count} linked accounts`}>
          <Tag color={count > 0 ? 'green' : 'default'}>
            {count || 0} accounts
          </Tag>
        </Tooltip>
      )
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
            title="Delete Bank"
            description="Are you sure you want to delete this bank? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.accountCount > 0}
          >
            <Tooltip 
              title={record.accountCount > 0 ? 
                "Cannot delete bank with linked accounts" : 
                "Delete bank"
              }
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                disabled={record.accountCount > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Statistics
  const stats = useMemo(() => {
    const total = banks.length;
    const active = banks.filter(b => b.isActive).length;
    const withAccounts = banks.filter(b => b.accountCount > 0).length;
    
    return { total, active, withAccounts };
  }, [banks]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                <BankOutlined /> Banks Management
              </h2>
              <p style={{ margin: 0, color: '#666' }}>
                Manage bank institutions and their details
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadBanks}
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
                  New Bank
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={8} md={8}>
          <Card size="small">
            <Statistic
              title="Total Banks"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={8} md={8}>
          <Card size="small">
            <Statistic
              title="Active Banks"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8} md={8}>
          <Card size="small">
            <Statistic
              title="With Accounts"
              value={stats.withAccounts}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search banks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Country"
              value={filters.country}
              onChange={(value) => setFilters(prev => ({ ...prev, country: value }))}
              allowClear
            >
              <Option value="Kenya">Kenya</Option>
              <Option value="Uganda">Uganda</Option>
              <Option value="Tanzania">Tanzania</Option>
              <Option value="Rwanda">Rwanda</Option>
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
        </Row>
      </Card>

      {/* Banks Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={banks}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} banks`,
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
            Edit Bank
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingBank(null);
        }}
        onOk={() => editForm.submit()}
        okText="Update Bank"
        cancelText="Cancel"
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="name"
            label="Bank Name"
            rules={[
              { required: true, message: 'Please enter bank name' },
              { min: 2, message: 'Bank name must be at least 2 characters' }
            ]}
          >
            <Input prefix={<BankOutlined />} />
          </Form.Item>

          <Form.Item
            name="code"
            label="Bank Code"
            rules={[
              {
                pattern: /^[A-Z0-9-]+$/,
                message: 'Bank code can only contain uppercase letters, numbers and hyphens'
              }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="country"
            label="Country"
            rules={[{ required: true, message: 'Please select country' }]}
          >
            <Select>
              <Option value="Kenya">Kenya</Option>
              <Option value="Uganda">Uganda</Option>
              <Option value="Tanzania">Tanzania</Option>
              <Option value="Rwanda">Rwanda</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BanksManagement;