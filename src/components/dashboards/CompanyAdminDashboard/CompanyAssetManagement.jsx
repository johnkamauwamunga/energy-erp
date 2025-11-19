import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Row,
  Col,
  Typography,
  Divider,
  Alert,
  Tabs,
  Statistic,
  Grid,
  Dropdown,
  Menu,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ShopOutlined,
  BuildOutlined,
  LinkOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useApp } from '../../../context/AppContext';
import CreateAssetModal from './CreateAssetModal';
import AssetAttachmentsTab from '../../features/assets/AssetAttachmentsTab';
import { assetService } from '../../../services/assetService/assetService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { useBreakpoint } = Grid;
const { confirm } = Modal;

const CompanyAssetManagement = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assetType, setAssetType] = useState('');
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const screens = useBreakpoint();

  const assetTypes = [
    { key: 'STORAGE_TANK', label: 'Tanks', icon: DatabaseOutlined, color: 'blue' },
    { key: 'FUEL_PUMP', label: 'Pumps', icon: ThunderboltOutlined, color: 'orange' },
    { key: 'ISLAND', label: 'Islands', icon: ShopOutlined, color: 'green' },
    { key: 'WAREHOUSE', label: 'Warehouses', icon: BuildOutlined, color: 'purple' },
  ];

  // Load assets from backend
  const loadAssetsFromBackend = async () => {
    try {
      setLoading(true);
      setError('');
      
      const currentUser = state.currentUser;
      let assetsData;
      
      if (currentUser.role === 'SUPER_ADMIN') {
        assetsData = await assetService.getAssets();
      } else if (currentUser.role === 'COMPANY_ADMIN' || currentUser.role === 'COMPANY_MANAGER') {
        if (!currentUser.companyId) {
          throw new Error('Company ID not found for user');
        }
        assetsData = await assetService.getCompanyAssets(currentUser.companyId);
      } else if (currentUser.role === 'STATION_MANAGER' || currentUser.role === 'SUPERVISOR') {
        if (!currentUser.stationId) {
          throw new Error('Station ID not found for user');
        }
        assetsData = await assetService.getStationAssets(currentUser.stationId);
      } else {
        assetsData = await assetService.getAssets();
      }
      
      setAssets(assetsData || []);
      dispatch({ type: 'SET_ASSETS', payload: assetsData || [] });
    } catch (error) {
      console.error('Failed to load assets:', error);
      setError(error.message || 'Failed to load assets. Please try again.');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetsFromBackend();
  }, [retryCount]);

  const openCreateModal = (type) => {
    if (!canCreateAssets()) {
      setError('You do not have permission to create assets');
      return;
    }
    setAssetType(type);
    setIsCreateModalOpen(true);
  };

  const handleAssetCreated = () => {
    loadAssetsFromBackend();
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const getStatusConfig = (status) => {
    const statusConfig = {
      'ASSIGNED': { color: 'green', text: 'Assigned' },
      'OPERATIONAL': { color: 'blue', text: 'Operational' },
      'MAINTENANCE': { color: 'orange', text: 'Maintenance' },
      'DECOMMISSIONED': { color: 'red', text: 'Decommissioned' },
      'REGISTERED': { color: 'default', text: 'Registered' }
    };
    return statusConfig[status] || { color: 'default', text: status };
  };

  const getAssetIcon = (type) => {
    const assetType = assetTypes.find(t => t.key === type);
    return assetType ? React.createElement(assetType.icon, { 
      style: { color: assetType.color } 
    }) : <DatabaseOutlined />;
  };

  const getAssetCount = (tabKey) => {
    if (!assets || !Array.isArray(assets)) return 0;
    if (tabKey === 'all') return assets.length;
    return assets.filter(a => a.type === tabKey).length;
  };

  const canCreateAssets = () => {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(state.currentUser.role);
  };

  const handleDeleteAsset = (asset) => {
    confirm({
      title: 'Are you sure you want to delete this asset?',
      icon: <ExclamationCircleOutlined />,
      content: `This will permanently delete ${asset.name} (${asset.type.replace('_', ' ')}).`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await assetService.deleteAsset(asset.id);
          loadAssetsFromBackend();
        } catch (error) {
          setError(error.message || 'Failed to delete asset');
        }
      },
    });
  };

  // Filter assets based on search and filters
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchQuery || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesTab = activeTab === 'all' || asset.type === activeTab;
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  // Table columns
  const columns = [
    {
      title: 'Asset',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          {getAssetIcon(record.type)}
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color="blue">
          {type.replace('_', ' ')}
        </Tag>
      ),
      responsive: ['md'],
    },
    {
      title: 'Capacity',
      dataIndex: 'tank',
      key: 'capacity',
      render: (tank) => (
        <Text>
          {tank?.capacity ? `${tank.capacity} L` : 'N/A'}
        </Text>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Station',
      dataIndex: 'station',
      key: 'station',
      render: (station, record) => (
        <Text>
          {station ? station.name : record.stationId ? 'Unknown Station' : 'Unassigned'}
        </Text>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Company',
      dataIndex: 'companyId',
      key: 'company',
      render: (companyId) => (
        <Text>
          {state.currentUser.role === 'SUPER_ADMIN' && companyId 
            ? `Company ${companyId.substring(0, 8)}...` 
            : '-'}
        </Text>
      ),
      responsive: ['xl'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              onClick={() => handleDeleteAsset(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Mobile card view
  const renderMobileCard = (asset) => (
    <Card key={asset.id} size="small" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space direction="vertical" size="small" style={{ flex: 1 }}>
          <Space>
            {getAssetIcon(asset.type)}
            <div>
              <Text strong>{asset.name}</Text>
              <div>
                <Tag size="small" color="blue">
                  {asset.type.replace('_', ' ')}
                </Tag>
                <Tag size="small" color={getStatusConfig(asset.status).color}>
                  {getStatusConfig(asset.status).text}
                </Tag>
              </div>
            </div>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {asset.id.substring(0, 8)}...
          </Text>
          {asset.tank?.capacity && (
            <Text>Capacity: {asset.tank.capacity} L</Text>
          )}
          <Text>
            Station: {asset.station ? asset.station.name : 'Unassigned'}
          </Text>
        </Space>
        <Dropdown
          menu={{
            items: [
              { key: 'view', label: 'View', icon: <EyeOutlined /> },
              { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
              { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true },
            ],
            onClick: ({ key }) => {
              if (key === 'delete') handleDeleteAsset(asset);
            }
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && assets.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, flexDirection: 'column' }}>
        <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
        <Title level={4}>Failed to load assets</Title>
        <Text type="secondary" style={{ marginBottom: 16 }}>{error}</Text>
        <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: screens.xs ? 16 : 24 }}>
      {/* Header Section */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Assets Management</Title>
          <Text type="secondary">
            {state.currentUser.role === 'SUPER_ADMIN' 
              ? 'All assets across all companies' 
              : state.currentUser.role === 'COMPANY_ADMIN' || state.currentUser.role === 'COMPANY_MANAGER' 
                ? 'Your company assets' 
                : 'Assets assigned to your station'
            }
          </Text>
        </Col>
        {canCreateAssets() && (
          <Col>
            <Dropdown
              menu={{
                items: assetTypes.map(type => ({
                  key: type.key,
                  label: `Add ${type.label}`,
                  icon: React.createElement(type.icon),
                })),
                onClick: ({ key }) => openCreateModal(key)
              }}
              trigger={['click']}
            >
              <Button type="primary" icon={<PlusOutlined />} size={screens.xs ? 'middle' : 'large'}>
                {screens.xs ? 'Add' : 'Add Asset'}
              </Button>
            </Dropdown>
          </Col>
        )}
      </Row>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="warning"
          showIcon
          closable
          action={
            <Button size="small" type="text" onClick={handleRetry}>
              <ReloadOutlined /> Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Stats Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {assetTypes.map(type => (
          <Col xs={12} sm={6} key={type.key}>
            <Card size="small">
              <Statistic
                title={type.label}
                value={getAssetCount(type.key)}
                prefix={React.createElement(type.icon, { style: { color: type.color } })}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Search and Filter Bar */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search assets..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">All Status</Option>
              <Option value="REGISTERED">Registered</Option>
              <Option value="OPERATIONAL">Operational</Option>
              <Option value="MAINTENANCE">Maintenance</Option>
              <Option value="DECOMMISSIONED">Decommissioned</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadAssetsFromBackend}
              style={{ width: '100%' }}
            >
              {screens.xs ? '' : 'Refresh'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type={screens.xs ? "card" : "line"}
          items={[
            {
              key: 'all',
              label: (
                <span>
                  <DatabaseOutlined />
                  {!screens.xs && ' All Assets'} ({getAssetCount('all')})
                </span>
              ),
            },
            ...assetTypes.map(type => ({
              key: type.key,
              label: (
                <span>
                  {React.createElement(type.icon)}
                  {!screens.xs && ` ${type.label}`} ({getAssetCount(type.key)})
                </span>
              ),
            })),
            {
              key: 'attachments',
              label: (
                <span>
                  <LinkOutlined />
                  {!screens.xs && ' Attachments'}
                </span>
              ),
            }
          ]}
        />

        {activeTab === 'attachments' ? (
          <AssetAttachmentsTab />
        ) : screens.xs ? (
          <div style={{ marginTop: 16 }}>
            {filteredAssets.length > 0 ? (
              filteredAssets.map(renderMobileCard)
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchQuery || statusFilter !== 'all' 
                    ? 'No assets match your search criteria' 
                    : `No ${activeTab === 'all' ? 'assets' : 'assets found'}`
                }
              />
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredAssets}
            rowKey="id"
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} items`
            }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    searchQuery || statusFilter !== 'all' 
                      ? 'No assets match your search criteria' 
                      : `No ${activeTab === 'all' ? 'assets' : 'assets found'}`
                  }
                />
              )
            }}
          />
        )}
      </Card>

      {/* Create Asset Modal */}
      <CreateAssetModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        assetType={assetType}
        onAssetCreated={handleAssetCreated}
        user={state.currentUser}
      />
    </div>
  );
};

export default CompanyAssetManagement;