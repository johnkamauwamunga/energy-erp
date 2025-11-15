import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Tooltip,
  Input,
  Select,
  Switch,
  Modal,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Empty,
  Spin
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  FolderOpenOutlined // Add missing import
} from '@ant-design/icons';
import { debtorService } from '../../../../services/debtorService/debtorService';
import UpdateDebtorCategoryModal from './modal/UpdateDebtorCategoryModal';

const { Option } = Select;
const { Search } = Input;

const DebtorCategoriesManagement = ({ onShowCreateModal }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    isActive: undefined,
    isPaymentProcessor: undefined,
    requiresApproval: undefined,
    hasCreditLimit: undefined,
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Load categories
  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await debtorService.getDebtorCategories(filters);
      
      if (result.categories) {
        setCategories(result.categories);
        setPagination(result.pagination || {});
      } else {
        setCategories(result);
        setPagination({});
      }
    } catch (error) {
      message.error(error.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

  // Handle category actions
  const handleEdit = (category) => {
    setSelectedCategory(category);
    setShowUpdateModal(true);
  };

  const handleUpdateSuccess = () => {
    setShowUpdateModal(false);
    setSelectedCategory(null);
    loadCategories();
    message.success('Category updated successfully');
  };

  const handleStatusToggle = async (category) => {
    try {
      setUpdating(true);
      await debtorService.updateDebtorCategory(category.id, {
        isActive: !category.isActive
      });
      message.success(`Category ${!category.isActive ? 'activated' : 'deactivated'} successfully`);
      loadCategories();
    } catch (error) {
      message.error(error.message || 'Failed to update category status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (category) => {
    try {
      await debtorService.deleteDebtorCategory(category.id);
      message.success('Category deleted successfully');
      loadCategories();
    } catch (error) {
      message.error(error.message || 'Failed to delete category');
    }
  };

  const handleInitializeSystem = async () => {
    Modal.confirm({
      title: 'Initialize System Categories',
      icon: <ExclamationCircleOutlined />,
      content: 'This will create standard system categories for your company. This action cannot be undone.',
      okText: 'Initialize',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await debtorService.initializeSystemCategories();
          message.success('System categories initialized successfully');
          loadCategories();
        } catch (error) {
          message.error(error.message || 'Failed to initialize system categories');
        }
      }
    });
  };

  // Format category for display
  const formatCategory = (category) => {
    return debtorService.formatDebtorCategory(category);
  };

  // Columns definition
  const columns = [
    {
      title: 'Category',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => {
        const formatted = formatCategory(record);
        return (
          <Space>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: record.color || '#666666'
              }}
            />
            <span>{name}</span>
            {record.isSystem && (
              <Tag color="blue" size="small">System</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description) => description || '-'
    },
    {
      title: 'Settings',
      key: 'settings',
      width: 200,
      render: (_, record) => {
        const formatted = formatCategory(record);
        return (
          <Space size={[0, 4]} wrap>
            {record.isPaymentProcessor && (
              <Tooltip title="Payment Processor">
                <Tag color="green" size="small">💳</Tag>
              </Tooltip>
            )}
            {record.requiresApproval && (
              <Tooltip title="Requires Approval">
                <Tag color="orange" size="small">⏳</Tag>
              </Tooltip>
            )}
            {record.hasCreditLimit && (
              <Tooltip title="Credit Limit">
                <Tag color="blue" size="small">💰</Tag>
              </Tooltip>
            )}
            {!record.isPaymentProcessor && !record.requiresApproval && !record.hasCreditLimit && (
              <Tag color="default" size="small">Standard</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Debtors',
      dataIndex: 'debtorCount',
      key: 'debtorCount',
      width: 100,
      align: 'center',
      render: (count, record) => {
        const formatted = formatCategory(record);
        return (
          <Tooltip title={`${count} debtors in this category`}>
            <Tag color={count > 0 ? 'blue' : 'default'}>
              {formatted.debtorCountDisplay}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive, record) => {
        const formatted = formatCategory(record);
        return (
          <Tag color={formatted.statusColor}>
            {formatted.statusDisplay}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => {
        const formatted = formatCategory(record);
        return (
          <Space>
            <Tooltip title="Edit Category">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={updating}
              />
            </Tooltip>

            <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
              <Switch
                size="small"
                checked={record.isActive}
                onChange={() => handleStatusToggle(record)}
                disabled={record.isSystem || updating}
              />
            </Tooltip>

            {!record.isSystem && (
              <Popconfirm
                title="Delete Category"
                description="Are you sure you want to delete this category? This action cannot be undone."
                onConfirm={() => handleDelete(record)}
                okText="Yes"
                cancelText="No"
                disabled={record.debtorCount > 0}
              >
                <Tooltip 
                  title={
                    record.debtorCount > 0 
                      ? 'Cannot delete category with debtors' 
                      : 'Delete Category'
                  }
                >
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={record.debtorCount > 0 || updating}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  // Statistics
  const stats = {
    total: categories.length,
    active: categories.filter(cat => cat.isActive).length,
    system: categories.filter(cat => cat.isSystem).length,
    withDebtors: categories.filter(cat => cat.debtorCount > 0).length
  };

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Categories"
              value={stats.total}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="System"
              value={stats.system}
              prefix={<InfoCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="With Debtors"
              value={stats.withDebtors}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={8}>
            <Search
              placeholder="Search categories..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={4}>
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
          <Col xs={12} md={4}>
            <Select
              placeholder="Type"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('isPaymentProcessor', value)}
            >
              <Option value={true}>Payment Processor</Option>
              <Option value={false}>Regular</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onShowCreateModal}
              >
                New Category
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadCategories}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                onClick={handleInitializeSystem}
              >
                Initialize System
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Categories Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page || 1,
            pageSize: pagination.limit || 10,
            total: pagination.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} categories`
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                description="No categories found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  onClick={onShowCreateModal}
                >
                  Create First Category
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* Update Modal */}
      {selectedCategory && (
        <UpdateDebtorCategoryModal
          visible={showUpdateModal}
          category={selectedCategory}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedCategory(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default DebtorCategoriesManagement;