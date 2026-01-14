// pages/warehouse/warehouse/WarehouseStock.jsx
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
  Badge,
  Progress,
  Alert,
  Statistic,
  Select,
  Empty,
  Spin
} from 'antd';
import { 
  DatabaseOutlined,
  SearchOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  BarChartOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { warehouseService } from '../../../../services/warehouseService/warehouseService';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const WarehouseStock = ({ warehouseId }) => {
  const [loading, setLoading] = useState(false);
  const [stockSummary, setStockSummary] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    expiringSoon: false,
    belowMin: false
  });

  useEffect(() => {
    if (warehouseId) {
      fetchStockData();
    }
  }, [warehouseId]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      
      // Fetch stock summary
      const summary = await warehouseService.getWarehouseStockSummary(warehouseId);
      setStockSummary(summary);
      
      // Combine all stock items
      const allItems = [];
      
      // Add low stock items
      if (summary.lowStockItems && Array.isArray(summary.lowStockItems)) {
        allItems.push(...summary.lowStockItems);
      }
      
      // Add expiring soon items
      if (summary.expiringSoonItems && Array.isArray(summary.expiringSoonItems)) {
        allItems.push(...summary.expiringSoonItems);
      }
      
      // Format all items
      const formattedItems = allItems.map(item => warehouseService.formatStockItem(item));
      
      // Remove duplicates by ID
      const uniqueItems = Array.from(
        new Map(formattedItems.map(item => [item.id, item])).values()
      );
      
      setStockItems(uniqueItems);
      setFilteredItems(uniqueItems);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search and filters
  useEffect(() => {
    let result = stockItems;
    
    if (searchText) {
      result = result.filter(item =>
        item.productName?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.productCode?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (filters.status) {
      result = result.filter(item => item.stockStatus === filters.status);
    }
    
    if (filters.expiringSoon) {
      result = result.filter(item => item.isExpiringSoon);
    }
    
    if (filters.belowMin) {
      result = result.filter(item => item.isBelowMinStock);
    }
    
    setFilteredItems(result);
  }, [searchText, filters, stockItems]);

  // Table columns
  const columns = [
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.productName || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.productCode || 'N/A'} • {record.category || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Batch Number',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 120,
      render: (batch) => batch || 'N/A'
    },
    {
      title: 'Stock Status',
      dataIndex: 'stockStatus',
      key: 'stockStatus',
      width: 120,
      render: (status, record) => {
        const getStatusConfig = () => {
          switch (status) {
            case 'CRITICAL':
              return { color: 'error', text: 'Critical', icon: <WarningOutlined /> };
            case 'LOW_STOCK':
              return { color: 'warning', text: 'Low Stock', icon: <WarningOutlined /> };
            case 'IN_STOCK':
              return { color: 'success', text: 'In Stock', icon: <CheckCircleOutlined /> };
            case 'OUT_OF_STOCK':
              return { color: 'default', text: 'Out of Stock' };
            default:
              return { color: 'default', text: status };
          }
        };
        
        const config = getStatusConfig();
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Quantity',
      dataIndex: 'availableQty',
      key: 'availableQty',
      width: 120,
      sorter: (a, b) => a.availableQty - b.availableQty,
      render: (qty, record) => {
        const percentage = record.maxStock 
          ? Math.round((qty / record.maxStock) * 100)
          : null;
        
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{qty}</Text>
            {percentage !== null && (
              <Progress 
                percent={percentage} 
                size="small" 
                showInfo={false}
                strokeColor={
                  percentage < 20 ? '#ff4d4f' :
                  percentage < 50 ? '#fa8c16' : '#52c41a'
                }
              />
            )}
          </Space>
        );
      }
    },
    {
      title: 'Min/Reorder',
      key: 'thresholds',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Min: {record.minStock || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Reorder: {record.reorderPoint || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDateFormatted',
      key: 'expiry',
      width: 100,
      render: (date, record) => (
        <Space direction="vertical" size={2}>
          <Text>{date || 'No expiry'}</Text>
          {record.isExpiringSoon && (
            <Badge dot color="warning" />
          )}
        </Space>
      )
    },
    {
      title: 'Location',
      dataIndex: 'storageLocation',
      key: 'location',
      width: 120,
      render: (location) => location || 'N/A'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Warehouse Stock</Title>
          <Text type="secondary">
            Monitor stock levels and inventory status
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Summary Cards */}
      {stockSummary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard 
              title="Total Products" 
              value={stockSummary.summary?.totalProducts || 0} 
              color="#1890ff"
              icon={<DatabaseOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard 
              title="Available Quantity" 
              value={stockSummary.summary?.totalAvailableQty || 0} 
              color="#52c41a"
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard 
              title="Low Stock" 
              value={stockSummary.summary?.lowStockCount || 0} 
              color="#fa8c16"
              icon={<WarningOutlined />}
              badgeColor="warning"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard 
              title="Expiring Soon" 
              value={stockSummary.summary?.expiringSoonCount || 0} 
              color="#ff4d4f"
              icon={<CalendarOutlined />}
              badgeColor="error"
            />
          </Col>
        </Row>
      )}

      {/* Alerts */}
      {stockSummary?.requiresAttention && (
        <Alert
          message="Attention Required"
          description="Some items need immediate attention due to low stock or approaching expiry."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Search and Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Search products..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              enterButton={false}
            />
          </Col>
          <Col>
            <Space>
              <Select
                placeholder="Status"
                allowClear
                style={{ width: 120 }}
                value={filters.status}
                onChange={(value) => setFilters({...filters, status: value})}
              >
                <Option value="CRITICAL">Critical</Option>
                <Option value="LOW_STOCK">Low Stock</Option>
                <Option value="IN_STOCK">In Stock</Option>
                <Option value="OUT_OF_STOCK">Out of Stock</Option>
              </Select>
              
              <Select
                placeholder="Filter"
                allowClear
                style={{ width: 120 }}
                value={filters.expiringSoon ? 'expiring' : filters.belowMin ? 'below_min' : null}
                onChange={(value) => setFilters({
                  ...filters, 
                  expiringSoon: value === 'expiring',
                  belowMin: value === 'below_min'
                })}
              >
                <Option value="expiring">Expiring Soon</Option>
                <Option value="below_min">Below Min Stock</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stock Items Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No stock items found"
              />
            )
          }}
        />
      </Card>
    </div>
  );
};

const StatisticCard = ({ title, value, color, icon, badgeColor }) => {
  return (
    <Card size="small">
      <Space direction="vertical" align="center" style={{ width: '100%' }}>
        <Row justify="center" align="middle" style={{ position: 'relative' }}>
          {React.cloneElement(icon, { style: { color, fontSize: 24 } })}
          {badgeColor && (
            <Badge 
              color={badgeColor} 
              style={{ 
                position: 'absolute', 
                top: -4, 
                right: -4 
              }} 
            />
          )}
        </Row>
        <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
        <Statistic 
          value={value} 
          valueStyle={{ fontSize: 20, fontWeight: 'bold', color }}
        />
      </Space>
    </Card>
  );
};

export default WarehouseStock;