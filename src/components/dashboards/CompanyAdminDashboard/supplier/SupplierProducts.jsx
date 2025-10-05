import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  message,
  Card,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  StarOutlined
} from '@ant-design/icons';
import { supplierService } from '../../../services/supplierService';
import { fuelService } from '../../../services/fuelService';
import CreateSupplierProductModal from './CreateSupplierProductModal';

const SupplierProducts = ({ visible, supplier, onCancel, onRefresh }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);
  const [supplierStats, setSupplierStats] = useState({});

  const fetchSupplierProducts = async () => {
    if (!supplier) return;
    
    setLoading(true);
    try {
      const [productsData, performanceData] = await Promise.all([
        supplierService.getSupplierProducts({ supplierId: supplier.id }),
        supplierService.getSupplierPerformance(supplier.id)
      ]);
      
      setProducts(productsData);
      setSupplierStats(performanceData?.metrics || {});
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && supplier) {
      fetchSupplierProducts();
    }
  }, [visible, supplier]);

  const handleAddProduct = () => {
    setCreateProductModalVisible(true);
  };

  const handleRemoveProduct = async (productId) => {
    try {
      await supplierService.removeSupplierProduct(productId);
      message.success('Product removed from supplier');
      fetchSupplierProducts();
      onRefresh?.();
    } catch (error) {
      message.error(error.message);
    }
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      render: (product, record) => (
        <div>
          <div className="product-name">
            {record.supplierProductName || product?.name}
          </div>
          <div className="product-code text-muted">
            {product?.fuelCode} • {record.supplierSku}
          </div>
        </div>
      )
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, record) => {
        const categoryPath = supplierService.formatSupplierProduct(record).categoryPath;
        return <span>{categoryPath}</span>;
      }
    },
    {
      title: 'Cost Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      align: 'right',
      render: (price, record) => (
        <div>
          <div className="price">{price?.toLocaleString()} {record.currency}</div>
          {record.minOrderQty && (
            <div className="text-muted small">Min: {record.minOrderQty}L</div>
          )}
        </div>
      )
    },
    {
      title: 'Availability',
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      align: 'center',
      render: (available) => (
        <Tag color={available ? 'green' : 'red'}>
          {available ? 'Available' : 'Unavailable'}
        </Tag>
      )
    },
    {
      title: 'Primary',
      dataIndex: 'isPrimary',
      key: 'isPrimary',
      align: 'center',
      render: (primary) =>
        primary && <Tag color="gold" icon={<StarOutlined />}>Primary</Tag>
    },
    {
      title: 'Lead Time',
      dataIndex: 'leadTime',
      key: 'leadTime',
      align: 'center',
      render: (time) => time ? `${time} days` : '-'
    },
    {
      title: 'Status',
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
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button type="link" icon={<EditOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Remove">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleRemoveProduct(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  if (!supplier) return null;

  return (
    <Modal
      title={
        <div>
          <ShoppingOutlined style={{ marginRight: 8 }} />
          {supplier.name} - Products
          <Tag color="blue" style={{ marginLeft: 8 }}>
            {supplier.code}
          </Tag>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={null}
    >
      {/* Supplier Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Products"
              value={supplierStats.activeProducts || products.length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Primary Products"
              value={supplierStats.primaryProducts || products.filter(p => p.isPrimary).length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Purchases"
              value={supplierStats.totalPurchases || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Quality Rating"
              value={supplierStats.qualityRating || 0}
              precision={1}
              suffix="/5"
            />
          </Card>
        </Col>
      </Row>

      {/* Products Table */}
      <Card
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddProduct}
          >
            Add Product
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create Product Modal */}
      <CreateSupplierProductModal
        visible={createProductModalVisible}
        supplier={supplier}
        onCancel={() => setCreateProductModalVisible(false)}
        onSuccess={() => {
          setCreateProductModalVisible(false);
          fetchSupplierProducts();
          onRefresh?.();
          message.success('Product added to supplier successfully');
        }}
      />
    </Modal>
  );
};

export default SupplierProducts;