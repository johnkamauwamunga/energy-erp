import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Statistic,
  message,
  Modal,
  Form,
  Divider,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { supplierService } from '../../services/supplierService';
import { fuelService } from '../../services/fuelService';
import CreateSupplierModal from './components/CreateSupplierModal';
import SupplierProducts from './components/SupplierProducts';
import './SupplierManagement.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    supplierType: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Fetch suppliers and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppliersData, statsData] = await Promise.all([
        supplierService.getSuppliers(filters),
        supplierService.getSupplierStats()
      ]);
      
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle supplier actions
  const handleViewProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setProductsModalVisible(true);
  };

  const handleEditSupplier = (supplier) => {
    // Implementation for edit supplier
    message.info('Edit supplier functionality to be implemented');
  };

  const handleDeleteSupplier = async (supplier) => {
    Modal.confirm({
      title: 'Delete Supplier',
      content: `Are you sure you want to delete ${supplier.name}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await supplierService.deleteSupplier(supplier.id);
          message.success('Supplier deleted successfully');
          fetchData();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  // Table columns
  const columns = [
    {
      title: 'Supplier Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Supplier Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <div>
          <div className="supplier-name">{name}</div>
          <div className="supplier-contact">{record.contactPerson}</div>
        </div>
      )
    },
    {
      title: 'Contact Info',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email}</div>
          <div>{record.phone}</div>
        </div>
      )
    },
    {
      title: 'Location',
      dataIndex: 'city',
      key: 'city',
      render: (city, record) => (
        <div>
          <div>{city}</div>
          <div className="text-muted">{record.country}</div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'supplierType',
      key: 'supplierType',
      filters: [
        { text: 'Fuel Wholesaler', value: 'FUEL_WHOLESALER' },
        { text: 'Refinery', value: 'FUEL_REFINERY' },
        { text: 'Oil Company', value: 'OIL_COMPANY' },
        { text: 'Distributor', value: 'DISTRIBUTOR' },
        { text: 'Retail Supplier', value: 'RETAIL_SUPPLIER' },
      ],
      onFilter: (value, record) => record.supplierType === value,
      render: (type) => {
        const typeConfig = {
          FUEL_WHOLESALER: { color: 'blue', text: 'Fuel Wholesaler' },
          FUEL_REFINERY: { color: 'volcano', text: 'Refinery' },
          OIL_COMPANY: { color: 'orange', text: 'Oil Company' },
          DISTRIBUTOR: { color: 'green', text: 'Distributor' },
          RETAIL_SUPPLIER: { color: 'purple', text: 'Retail Supplier' },
          EQUIPMENT_VENDOR: { color: 'cyan', text: 'Equipment Vendor' },
          SERVICE_PROVIDER: { color: 'geekblue', text: 'Service Provider' },
          GENERAL_SUPPLIER: { color: 'gray', text: 'General Supplier' }
        };
        
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'Inactive', value: 'INACTIVE' },
        { text: 'On Hold', value: 'ON_HOLD' },
        { text: 'Blacklisted', value: 'BLACKLISTED' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        const statusConfig = {
          ACTIVE: { color: 'green', text: 'Active' },
          INACTIVE: { color: 'red', text: 'Inactive' },
          ON_HOLD: { color: 'orange', text: 'On Hold' },
          BLACKLISTED: { color: 'red', text: 'Blacklisted' }
        };
        
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Products',
      dataIndex: 'supplierProducts',
      key: 'products',
      align: 'center',
      render: (products) => (
        <Tag color={products && products.length > 0 ? 'blue' : 'default'}>
          {products ? products.length : 0} products
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Products">
            <Button
              type="link"
              icon={<ShoppingOutlined />}
              onClick={() => handleViewProducts(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditSupplier(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteSupplier(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Filtered and sorted data
  const filteredSuppliers = useMemo(() => {
    let data = [...suppliers];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(supplier => 
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.code.toLowerCase().includes(searchLower) ||
        supplier.contactPerson?.toLowerCase().includes(searchLower) ||
        supplier.email?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status) {
      data = data.filter(supplier => supplier.status === filters.status);
    }

    // Type filter
    if (filters.supplierType) {
      data = data.filter(supplier => supplier.supplierType === filters.supplierType);
    }

    // Sorting
    data.sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];
      
      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return data;
  }, [suppliers, filters]);

  return (
    <div className="supplier-management">
      {/* Statistics Cards */}
      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Suppliers"
              value={stats.totalSuppliers || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Suppliers"
              value={stats.activeSuppliers || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Suppliers with Products"
              value={stats.suppliersWithProducts || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="On Hold"
              value={stats.onHoldSuppliers || 0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card className="filters-card">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search suppliers..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              size="large"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="ON_HOLD">On Hold</Option>
              <Option value="BLACKLISTED">Blacklisted</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Supplier Type"
              allowClear
              style={{ width: '100%' }}
              size="large"
              value={filters.supplierType}
              onChange={(value) => handleFilterChange('supplierType', value)}
            >
              <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
              <Option value="FUEL_REFINERY">Refinery</Option>
              <Option value="OIL_COMPANY">Oil Company</Option>
              <Option value="DISTRIBUTOR">Distributor</Option>
              <Option value="RETAIL_SUPPLIER">Retail Supplier</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Sort By"
              style={{ width: '100%' }}
              size="large"
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
            >
              <Option value="name">Name</Option>
              <Option value="code">Code</Option>
              <Option value="createdAt">Date Added</Option>
            </Select>
          </Col>
          <Col span={2}>
            <Select
              style={{ width: '100%' }}
              size="large"
              value={filters.sortOrder}
              onChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <Option value="asc">ASC</Option>
              <Option value="desc">DESC</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              block
              onClick={() => setCreateModalVisible(true)}
            >
              Add Supplier
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Suppliers Table */}
      <Card
        title={`Suppliers (${filteredSuppliers.length})`}
        extra={
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilters({
              search: '',
              status: '',
              supplierType: '',
              sortBy: 'name',
              sortOrder: 'asc'
            })}
          >
            Clear Filters
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredSuppliers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} suppliers`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Modals */}
      <CreateSupplierModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchData();
          message.success('Supplier created successfully');
        }}
      />

      <SupplierProducts
        visible={productsModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setProductsModalVisible(false);
          setSelectedSupplier(null);
        }}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default SupplierManagement;