import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Badge,
  Typography,
  message,
  Row,
  Col,
  Statistic,
  Card,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  ShoppingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import { supplierService } from '../../../../../services/supplierService/supplierService';

const { Title, Text } = Typography;

const SupplierProductsModal = ({ visible, supplier, onCancel, onRefresh }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (supplier && visible) {
      fetchSupplierProducts();
    }
  }, [supplier, visible]);

  const fetchSupplierProducts = async () => {
    if (!supplier) return;
    
    setLoading(true);
    try {
      // Get supplier products
      const response = await supplierService.getSupplierProducts({
        supplierId: supplier.id
      });
      
      const productsData = response.data || response;
      setProducts(Array.isArray(productsData) ? productsData : []);
      
      // Calculate statistics
      calculateStats(productsData);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (productsData) => {
    const data = Array.isArray(productsData) ? productsData : [];
    
    const totalProducts = data.length;
    const activeProducts = data.filter(p => p.isAvailable).length;
    const primaryProducts = data.filter(p => p.isPrimary).length;
    const averagePrice = data.length > 0 
      ? data.reduce((sum, p) => sum + (p.costPrice || 0), 0) / data.length 
      : 0;

    setStats({
      totalProducts,
      activeProducts,
      primaryProducts,
      averagePrice: parseFloat(averagePrice.toFixed(2))
    });
  };

  const handleRemoveProduct = async (productId) => {
    Modal.confirm({
      title: 'Remove Product from Supplier',
      content: 'Are you sure you want to remove this product from the supplier?',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await supplierService.removeSupplierProduct(productId);
          message.success('Product removed successfully');
          fetchSupplierProducts();
          onRefresh?.();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.supplierProductName || record.product?.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            SKU: {record.supplierSku || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Cost Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (price) => (
        <Text strong style={{ color: '#52c41a' }}>
          KES {price?.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Availability',
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      render: (available) => (
        <Tag color={available ? 'green' : 'red'} icon={available ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {available ? 'Available' : 'Not Available'}
        </Tag>
      )
    },
    {
      title: 'Primary',
      dataIndex: 'isPrimary',
      key: 'isPrimary',
      render: (primary) => (
        primary ? <StarOutlined style={{ color: '#faad14' }} /> : null
      )
    },
    {
      title: 'Stock Status',
      dataIndex: 'stockStatus',
      key: 'stockStatus',
      render: (status) => {
        const statusConfig = {
          IN_STOCK: { color: 'green', text: 'In Stock' },
          LOW_STOCK: { color: 'orange', text: 'Low Stock' },
          OUT_OF_STOCK: { color: 'red', text: 'Out of Stock' }
        };
        const config = statusConfig[status] || { color: 'default', text: 'Unknown' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => message.info('Edit product functionality to be implemented')}
            />
          </Tooltip>
          <Popconfirm
            title="Remove this product?"
            description="This product will be removed from this supplier."
            onConfirm={() => handleRemoveProduct(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Remove">
              <Button 
                size="small" 
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (!supplier) return null;

  return (
    <Modal
      title={
        <Space>
          <ShoppingOutlined />
          <span>Products for {supplier.name}</span>
          <Badge 
            count={products.length} 
            showZero 
            color="blue" 
            style={{ marginLeft: 8 }}
          />
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      destroyOnClose
    >
      {/* Supplier Info */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Products"
              value={stats.totalProducts || 0}
              prefix={<ShoppingOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Active Products"
              value={stats.activeProducts || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Primary Products"
              value={stats.primaryProducts || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<StarOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Avg. Price"
              value={stats.averagePrice || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix="KES"
              precision={2}
            />
          </Col>
        </Row>
      </Card>

      {/* Products Table */}
      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true
        }}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <ShoppingOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <Text type="secondary">No products found for this supplier</Text>
            </div>
          )
        }}
      />

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }}>
          Close
        </Button>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => message.info('Add product functionality to be implemented')}
        >
          Add Product
        </Button>
      </div>
    </Modal>
  );
};

export default SupplierProductsModal;