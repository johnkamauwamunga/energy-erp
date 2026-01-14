// pages/warehouse/warehouse/WarehouseList.jsx
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Button, 
  Input, 
  Tag,
  Dropdown,
  Menu,
  Modal,
  message,
  Badge,
  Tooltip,
  Popconfirm,
  Select,
  Empty,
  Spin
} from 'antd';
import { 
  ShopOutlined, 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  HomeOutlined,
  DatabaseOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  MoreOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { warehouseService, warehouseCache } from '../../../../services/warehouseService/warehouseService';
import WarehouseForm from './forms/WarehouseForm';
import WarehouseDetail from './WarehouseDetail';
import BulkAssignModal from './BulkAssignModal';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const WarehouseList = () => {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [filters, setFilters] = useState({
    status: null,
    hasStock: null,
    assigned: null
  });

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      
      // Check cache first
      const cached = warehouseCache.getAll();
      if (cached && !warehouseCache.isStale(cached.timestamp)) {
        setWarehouses(cached.data);
        setFilteredWarehouses(cached.data);
      } else {
        const data = await warehouseService.getWarehouses();
        console.log('Te manin data for warehouse: :', data);
        setWarehouses(data);
        setFilteredWarehouses(data);
        // Update cache
        if (data && data.length > 0) {
          warehouseCache.setAll(data);
        }
      }
    } catch (error) {
      message.error(error.message || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Handle search
  useEffect(() => {
    let result = warehouses;
    
    if (searchText) {
      result = result.filter(warehouse =>
        warehouse.name.toLowerCase().includes(searchText.toLowerCase()) ||
        warehouse.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
        warehouse.stationName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (filters.status) {
      if (filters.status === 'with_stock') {
        result = result.filter(w => w.hasStock);
      } else if (filters.status === 'empty') {
        result = result.filter(w => !w.hasStock);
      }
    }
    
    if (filters.assigned !== null) {
      result = result.filter(w => w.isAssignedToStation === filters.assigned);
    }
    
    if (filters.hasStock !== null) {
      result = result.filter(w => w.totalStock > 0 === filters.hasStock);
    }
    
    setFilteredWarehouses(result);
  }, [searchText, filters, warehouses]);

  // Handle warehouse actions
  const handleView = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDetailModal(true);
  };

  const handleEdit = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowCreateModal(true);
  };

  const handleDelete = async (warehouseId) => {
    try {
      setLoading(true);
      await warehouseService.deleteWarehouse(warehouseId);
      message.success('Warehouse deleted successfully');
      
      // Clear cache for this warehouse
      warehouseCache.clearWarehouse(warehouseId);
      
      // Refresh list
      fetchWarehouses();
    } catch (error) {
      message.error(error.message || 'Failed to delete warehouse');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      message.warning('Please select warehouses to delete');
      return;
    }

    Modal.confirm({
      title: 'Confirm Bulk Delete',
      content: `Are you sure you want to delete ${selectedRows.length} warehouses?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          const deletePromises = selectedRows.map(warehouse =>
            warehouseService.deleteWarehouse(warehouse.id)
          );
          
          await Promise.all(deletePromises);
          message.success(`${selectedRows.length} warehouses deleted successfully`);
          
          // Clear cache for deleted warehouses
          selectedRows.forEach(warehouse => {
            warehouseCache.clearWarehouse(warehouse.id);
          });
          
          // Refresh list and clear selection
          setSelectedRows([]);
          fetchWarehouses();
        } catch (error) {
          message.error(error.message || 'Failed to delete warehouses');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkAssign = () => {
    if (selectedRows.length === 0) {
      message.warning('Please select warehouses to assign');
      return;
    }
    setShowBulkAssignModal(true);
  };

  const handleBulkAssignComplete = () => {
    setShowBulkAssignModal(false);
    setSelectedRows([]);
    fetchWarehouses();
  };

  const handleExport = () => {
    const exportData = warehouseService.prepareWarehousesExport(selectedRows.length > 0 ? selectedRows : warehouses);
    // Implement CSV export logic here
    console.log('Export data:', exportData);
    message.success('Export ready');
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.locationDisplay}
          </Text>
        </Space>
      )
    },
    {
      title: 'Stock Status',
      dataIndex: 'stockStatus',
      key: 'stockStatus',
      width: 120,
      render: (status, record) => {
        if (record.criticalItems > 0) {
          return <Tag color="error">Critical ({record.criticalItems})</Tag>;
        }
        if (record.lowStockItems > 0) {
          return <Tag color="warning">Low Stock ({record.lowStockItems})</Tag>;
        }
        if (record.hasStock) {
          return <Tag color="success">In Stock ({record.totalStock})</Tag>;
        }
        return <Tag>Empty</Tag>;
      }
    },
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 150,
      render: (text) => text || <Text type="secondary">Unassigned</Text>
    },
    {
      title: 'Asset',
      dataIndex: 'assetName',
      key: 'assetName',
      width: 150,
      render: (text) => text || <Text type="secondary">None</Text>
    },
    {
      title: 'Created',
      dataIndex: 'createdAtFormatted',
      key: 'createdAt',
      width: 100,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item 
                key="view" 
                icon={<EyeOutlined />}
                onClick={() => handleView(record)}
              >
                View Details
              </Menu.Item>
              <Menu.Item 
                key="edit" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                Edit
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                key="delete" 
                icon={<DeleteOutlined />}
                danger
              >
                <Popconfirm
                  title="Delete Warehouse"
                  description="Are you sure you want to delete this warehouse?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  Delete
                </Popconfirm>
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  // Filter dropdown
  const filterMenu = (
    <Menu>
      <Menu.ItemGroup title="Stock Status">
        <Menu.Item 
          key="with_stock"
          onClick={() => setFilters({...filters, status: 'with_stock'})}
        >
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>With Stock</span>
          </Space>
        </Menu.Item>
        <Menu.Item 
          key="empty"
          onClick={() => setFilters({...filters, status: 'empty'})}
        >
          <Space>
            <WarningOutlined style={{ color: '#fa8c16' }} />
            <span>Empty</span>
          </Space>
        </Menu.Item>
      </Menu.ItemGroup>
      <Menu.ItemGroup title="Assignment">
        <Menu.Item 
          key="assigned"
          onClick={() => setFilters({...filters, assigned: true})}
        >
          <Space>
            <HomeOutlined />
            <span>Assigned to Station</span>
          </Space>
        </Menu.Item>
        <Menu.Item 
          key="unassigned"
          onClick={() => setFilters({...filters, assigned: false})}
        >
          <Space>
            <ShopOutlined />
            <span>Unassigned</span>
          </Space>
        </Menu.Item>
      </Menu.ItemGroup>
      <Menu.Divider />
      <Menu.Item 
        key="clear"
        onClick={() => setFilters({ status: null, hasStock: null, assigned: null })}
      >
        Clear Filters
      </Menu.Item>
    </Menu>
  );

  return (
    <div>
      {/* Header with Actions */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Warehouses</Title>
          <Text type="secondary">
            Manage all warehouses and their assignments
          </Text>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<PlusOutlined />} 
              type="primary"
              onClick={() => {
                setSelectedWarehouse(null);
                setShowCreateModal(true);
              }}
            >
              New Warehouse
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Search warehouses..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              enterButton={false}
            />
          </Col>
          <Col>
            <Space>
              <Dropdown overlay={filterMenu} trigger={['click']}>
                <Button icon={<FilterOutlined />}>
                  Filters
                  {Object.values(filters).some(f => f !== null) && (
                    <Badge dot style={{ marginLeft: 4 }} />
                  )}
                </Button>
              </Dropdown>
              
              {selectedRows.length > 0 && (
                <>
                  <Dropdown.Button
                    type="primary"
                    menu={{
                      items: [
                        {
                          key: 'assign',
                          label: 'Assign to Station',
                          icon: <HomeOutlined />,
                          onClick: handleBulkAssign
                        },
                        {
                          key: 'delete',
                          label: 'Delete Selected',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: handleBulkDelete
                        }
                      ]
                    }}
                  >
                    {selectedRows.length} Selected
                  </Dropdown.Button>
                </>
              )}
            </Space>
          </Col>
        </Row>

        {/* Active filters display */}
        {Object.values(filters).some(f => f !== null) && (
          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space wrap>
                {filters.status && (
                  <Tag 
                    closable 
                    onClose={() => setFilters({...filters, status: null})}
                  >
                    Status: {filters.status === 'with_stock' ? 'With Stock' : 'Empty'}
                  </Tag>
                )}
                {filters.assigned !== null && (
                  <Tag 
                    closable 
                    onClose={() => setFilters({...filters, assigned: null})}
                  >
                    {filters.assigned ? 'Assigned' : 'Unassigned'}
                  </Tag>
                )}
                {filters.hasStock !== null && (
                  <Tag 
                    closable 
                    onClose={() => setFilters({...filters, hasStock: null})}
                  >
                    {filters.hasStock ? 'Has Stock' : 'No Stock'}
                  </Tag>
                )}
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => setFilters({ status: null, hasStock: null, assigned: null })}
                >
                  Clear All
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      {/* Warehouses Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredWarehouses}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedRows.map(row => row.id),
            onChange: (_, selectedRows) => setSelectedRows(selectedRows),
            getCheckboxProps: (record) => ({
              disabled: record.stockStatus === 'critical'
            })
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} warehouses`
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No warehouses found"
              >
                <Button 
                  type="primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Warehouse
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* Modals */}
      <WarehouseForm
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedWarehouse(null);
        }}
        onWarehouseCreated={fetchWarehouses}
        warehouse={selectedWarehouse}
      />

      <WarehouseDetail
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedWarehouse(null);
        }}
        warehouse={selectedWarehouse}
        onWarehouseUpdated={fetchWarehouses}
      />

      <BulkAssignModal
        isOpen={showBulkAssignModal}
        onClose={() => setShowBulkAssignModal(false)}
        warehouseIds={selectedRows.map(row => row.id)}
        onAssignComplete={handleBulkAssignComplete}
      />
    </div>
  );
};

export default WarehouseList;