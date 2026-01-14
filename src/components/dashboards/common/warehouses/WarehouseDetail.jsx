// pages/warehouse/warehouse/WarehouseDetail.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Tag, 
  Button,
  Descriptions,
  Statistic,
  Divider,
  List,
  Badge,
  Alert,
  Progress,
  Spin,
  Tabs
} from 'antd';
import { 
  ShopOutlined, 
  HomeOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
  BarChartOutlined,
  StockOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { warehouseService } from '../../../../services/warehouseService/warehouseService';
import WarehouseForm from './forms/WarehouseForm';
import WarehouseStock from './WarehouseStock';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const WarehouseDetail = ({ isOpen, onClose, warehouse, onWarehouseUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [warehouseDetail, setWarehouseDetail] = useState(null);
  const [stockSummary, setStockSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (isOpen && warehouse) {
      loadWarehouseDetail();
      loadStockSummary();
    }
  }, [isOpen, warehouse]);

  const loadWarehouseDetail = async () => {
    try {
      setLoading(true);
      const detail = await warehouseService.getWarehouseById(warehouse.id);
      setWarehouseDetail(detail);
    } catch (error) {
      console.error('Error loading warehouse details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockSummary = async () => {
    try {
      const summary = await warehouseService.getWarehouseStockSummary(warehouse.id);
      setStockSummary(summary);
    } catch (error) {
      console.error('Error loading stock summary:', error);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await warehouseService.deleteWarehouse(warehouse.id);
      onWarehouseUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseUpdated = () => {
    setShowEditModal(false);
    loadWarehouseDetail();
    onWarehouseUpdated();
  };

  if (!warehouseDetail) {
    return null;
  }

  const getStockStatusColor = () => {
    if (warehouseDetail.criticalItems > 0) return '#ff4d4f';
    if (warehouseDetail.lowStockItems > 0) return '#fa8c16';
    if (warehouseDetail.hasStock) return '#52c41a';
    return '#d9d9d9';
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <ShopOutlined />
            <span>Warehouse Details</span>
            <Badge 
              color={getStockStatusColor()} 
              text={
                warehouseDetail.criticalItems > 0 ? 'Critical' :
                warehouseDetail.lowStockItems > 0 ? 'Low Stock' :
                warehouseDetail.hasStock ? 'In Stock' : 'Empty'
              }
            />
          </Space>
        }
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={900}
        destroyOnClose
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div>
            {/* Header with Actions */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
              <Col>
                <Space direction="vertical" size={2}>
                  <Title level={3} style={{ margin: 0 }}>{warehouseDetail.name}</Title>
                  <Text type="secondary">{warehouseDetail.locationDisplay}</Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button 
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                  <Button 
                    icon={<DeleteOutlined />}
                    danger
                    onClick={handleDelete}
                    loading={loading}
                  >
                    Delete
                  </Button>
                </Space>
              </Col>
            </Row>

            {/* Tabs */}
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="Details" key="details">
                <WarehouseDetailsTab 
                  warehouseDetail={warehouseDetail}
                  stockSummary={stockSummary}
                />
              </TabPane>
              <TabPane tab="Stock" key="stock">
                <WarehouseStock warehouseId={warehouse.id} />
              </TabPane>
              <TabPane tab="Activity" key="activity">
                <ActivityTab warehouseId={warehouse.id} />
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>

      <WarehouseForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onWarehouseCreated={handleWarehouseUpdated}
        warehouse={warehouseDetail}
      />
    </>
  );
};

const WarehouseDetailsTab = ({ warehouseDetail, stockSummary }) => {
  return (
    <div>
      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <StatisticCard 
            title="Total Stock" 
            value={warehouseDetail.totalStock || 0} 
            color="#1890ff"
            icon={<DatabaseOutlined />}
            suffix="units"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatisticCard 
            title="Low Stock Items" 
            value={warehouseDetail.lowStockItems || 0} 
            color="#fa8c16"
            icon={<WarningOutlined />}
            suffix="items"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatisticCard 
            title="Critical Items" 
            value={warehouseDetail.criticalItems || 0} 
            color="#ff4d4f"
            icon={<AlertOutlined />}
            suffix="items"
          />
        </Col>
      </Row>

      {/* Warehouse Information */}
      <Card title="Warehouse Information" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Warehouse ID">
            {warehouseDetail.id}
          </Descriptions.Item>
          <Descriptions.Item label="Name">
            {warehouseDetail.name}
          </Descriptions.Item>
          <Descriptions.Item label="Station">
            {warehouseDetail.stationName ? (
              <Space>
                <HomeOutlined />
                <Text>{warehouseDetail.stationName}</Text>
                {warehouseDetail.station?.company && (
                  <Text type="secondary">
                    ({warehouseDetail.station.company.name})
                  </Text>
                )}
              </Space>
            ) : (
              <Tag color="default">Unassigned</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Company">
            <Space>
              <ShopOutlined />
              <Text>{warehouseDetail.companyName}</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Asset">
            {warehouseDetail.assetName ? (
              <Space>
                <DatabaseOutlined />
                <Text>{warehouseDetail.assetName}</Text>
                <Tag>{warehouseDetail.assetType}</Tag>
              </Space>
            ) : (
              <Tag color="default">No Asset</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            <Space>
              <CalendarOutlined />
              <Text>{warehouseDetail.createdAtFormatted}</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            <Space>
              <CalendarOutlined />
              <Text>{warehouseDetail.updatedAtFormatted}</Text>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Stock Summary */}
      {stockSummary && (
        <Card title="Stock Summary" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {stockSummary.lowStockItems && stockSummary.lowStockItems.length > 0 && (
              <Alert
                message="Low Stock Alert"
                description={`${stockSummary.lowStockItems.length} items need attention`}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic 
                  title="Total Products" 
                  value={stockSummary.summary?.totalProducts || 0}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Available Quantity" 
                  value={stockSummary.summary?.totalAvailableQty || 0}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
            </Row>

            {/* Stock by Status */}
            {stockSummary.summary?.byStatus && (
              <div>
                <Divider orientation="left">Stock by Status</Divider>
                <List
                  size="small"
                  dataSource={Object.entries(stockSummary.summary.byStatus)}
                  renderItem={([status, data]) => (
                    <List.Item>
                      <Space style={{ width: '100%' }} direction="vertical" size={2}>
                        <Row justify="space-between">
                          <Col>
                            <Tag color={
                              status === 'ACTIVE' ? 'success' :
                              status === 'LOW_STOCK' ? 'warning' :
                              status === 'CRITICAL' ? 'error' : 'default'
                            }>
                              {status}
                            </Tag>
                          </Col>
                          <Col>
                            <Text strong>{data.count} products</Text>
                          </Col>
                        </Row>
                        <Progress 
                          percent={Math.round((data.count / stockSummary.summary.totalProducts) * 100)}
                          size="small"
                          showInfo={false}
                        />
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

const ActivityTab = ({ warehouseId }) => {
  // This would fetch activity logs for the warehouse
  const activities = [];

  return (
    <Card>
      {activities.length > 0 ? (
        <List
          dataSource={activities}
          renderItem={activity => (
            <List.Item>
              <Space direction="vertical" size={2}>
                <Text>{activity.description}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(activity.timestamp).toLocaleString()}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      ) : (
        <Empty
          description="No activity found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

const StatisticCard = ({ title, value, color, icon, suffix }) => {
  return (
    <Card size="small">
      <Space direction="vertical" align="center" style={{ width: '100%' }}>
        {React.cloneElement(icon, { style: { color, fontSize: 24 } })}
        <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
        <Statistic 
          value={value} 
          valueStyle={{ fontSize: 20, fontWeight: 'bold', color }}
          suffix={suffix}
        />
      </Space>
    </Card>
  );
};

export default WarehouseDetail;