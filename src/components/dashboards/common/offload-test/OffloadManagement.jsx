// src/components/offload/OffloadManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  Input,
  Select,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  DatePicker,
  Modal
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { fuelOffloadService } from '../../../../services/offloadService/offloadService';
import { useApp } from '../../../../context/AppContext';
import FuelOffloadWizard from './FuelOffloadWizard';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

const OffloadManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [offloads, setOffloads] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: null
  });

  const currentStation = state.currentStation?.id;

  // Fetch offload records
  const fetchOffloads = async () => {
    if (!currentStation) return;
    
    setLoading(true);
    try {
      // Use getOffloads with station filter instead of getOffloadsByStation
      const response = await fuelOffloadService.getOffloads({
        stationId: currentStation,
        ...filters,
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      console.log("offload response ", response);
      
      // Handle different response structures
      const offloadsData = response.offloads || response.data || response || [];
      setOffloads(Array.isArray(offloadsData) ? offloadsData : []);
    } catch (error) {
      console.error('Failed to fetch offloads:', error);
      setOffloads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffloads();
  }, [currentStation]);

  const getStatusConfig = (status) => {
    const config = {
      'DRAFT': { color: 'default', label: 'Draft', badge: 'default' },
      'IN_PROGRESS': { color: 'orange', label: 'In Progress', badge: 'processing' },
      'COMPLETED': { color: 'green', label: 'Completed', badge: 'success' },
      'CANCELLED': { color: 'red', label: 'Cancelled', badge: 'error' }
    };
    return config[status] || config.DRAFT;
  };

  const getVarianceStatus = (variance) => {
    if (variance === 0) return { color: 'green', label: 'Exact' };
    if (variance > 0) return { color: 'blue', label: `+${variance}L Over` };
    return { color: 'orange', label: `${variance}L Short` };
  };

  const columns = [
    {
      title: 'Offload ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id) => <Text code>{id?.substring(0, 8) || 'N/A'}...</Text>
    },
    {
      title: 'Purchase #',
      dataIndex: 'purchase',
      key: 'purchaseNumber',
      width: 130,
      render: (purchase) => purchase?.purchaseNumber || 'N/A'
    },
    {
      title: 'Tanks',
      key: 'tanks',
      width: 100,
      render: (_, record) => (
        <Badge count={record.tankOffloads?.length || 0} showZero>
          <Text>Tanks</Text>
        </Badge>
      )
    },
    {
      title: 'Expected Qty',
      dataIndex: 'totalExpectedVolume',
      key: 'expected',
      width: 120,
      render: (volume) => `${(volume || 0).toLocaleString()}L`
    },
    {
      title: 'Actual Qty',
      dataIndex: 'totalActualVolume',
      key: 'actual',
      width: 120,
      render: (volume) => `${(volume || 0).toLocaleString()}L`
    },
    {
      title: 'Variance',
      key: 'variance',
      width: 120,
      render: (_, record) => {
        const expected = record.totalExpectedVolume || 0;
        const actual = record.totalActualVolume || 0;
        const variance = actual - expected;
        const config = getVarianceStatus(variance);
        
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const config = getStatusConfig(status);
        return <Badge status={config.badge} text={config.label} />;
      }
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => setSelectedOffload(record)}
            />
          </Tooltip>
          <Tooltip title="View Report">
            <Button 
              icon={<FileTextOutlined />} 
              size="small"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Statistics
  const stats = {
    total: offloads.length,
    completed: offloads.filter(o => o.status === 'COMPLETED').length,
    inProgress: offloads.filter(o => o.status === 'IN_PROGRESS').length,
    totalVolume: offloads.reduce((sum, o) => sum + (o.totalActualVolume || 0), 0)
  };

  // Simple Offload Details Modal
  const OffloadDetailsModal = ({ offload, visible, onClose }) => {
    if (!offload) return null;

    return (
      <Modal
        title="Offload Details"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
        width={800}
      >
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="Basic Information">
                <p><strong>Offload ID:</strong> {offload.id}</p>
                <p><strong>Purchase #:</strong> {offload.purchase?.purchaseNumber || 'N/A'}</p>
                <p><strong>Status:</strong> {getStatusConfig(offload.status).label}</p>
                <p><strong>Created:</strong> {offload.createdAt ? new Date(offload.createdAt).toLocaleString() : 'N/A'}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Quantities">
                <p><strong>Expected:</strong> {(offload.totalExpectedVolume || 0).toLocaleString()}L</p>
                <p><strong>Actual:</strong> {(offload.totalActualVolume || 0).toLocaleString()}L</p>
                <p><strong>Variance:</strong> 
                  <Tag color={getVarianceStatus((offload.totalActualVolume || 0) - (offload.totalExpectedVolume || 0)).color}>
                    {((offload.totalActualVolume || 0) - (offload.totalExpectedVolume || 0)).toLocaleString()}L
                  </Tag>
                </p>
              </Card>
            </Col>
          </Row>

          {offload.tankOffloads && offload.tankOffloads.length > 0 && (
            <Card size="small" title="Tank Allocations">
              <Table
                dataSource={offload.tankOffloads}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Tank', dataIndex: 'tankName', key: 'tankName' },
                  { title: 'Expected', key: 'expected', render: (_, tank) => (tank.expectedVolume || 0).toLocaleString() + 'L' },
                  { title: 'Actual', key: 'actual', render: (_, tank) => (tank.actualVolume || 0).toLocaleString() + 'L' },
                  { 
                    title: 'Variance', 
                    key: 'variance', 
                    render: (_, tank) => {
                      const variance = (tank.actualVolume || 0) - (tank.expectedVolume || 0);
                      return (
                        <Tag color={getVarianceStatus(variance).color}>
                          {variance.toLocaleString()}L
                        </Tag>
                      );
                    }
                  }
                ]}
              />
            </Card>
          )}
        </div>
      </Modal>
    );
  };

  if (!currentStation) {
    return (
      <Alert
        message="No Station Selected"
        description="Please select a station to manage fuel offloads."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with New Offload Button */}
      <Card>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>Fuel Offload Management</Title>
            <Text type="secondary">
              Manage fuel deliveries and offload processes for {state.currentStation?.name}
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setShowWizard(true)}
            >
              New Fuel Offload
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Offloads"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Volume"
              value={stats.totalVolume}
              suffix="Liters"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search offloads..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onSearch={fetchOffloads}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="all">All Statuses</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="IN_PROGRESS">In Progress</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
            />
          </Col>
          <Col span={8}>
            <Space>
              <Button 
                icon={<SearchOutlined />}
                onClick={fetchOffloads}
                loading={loading}
              >
                Refresh
              </Button>
              <Button icon={<FilterOutlined />}>
                More Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Offloads Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={offloads}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} offload records`
          }}
          locale={{
            emptyText: loading ? 
              'Loading offload records...' : 
              filters.search || filters.status !== 'all' ? 
                'No offloads match your filters' : 
                'No offload records found. Start a new fuel offload process.'
          }}
        />
      </Card>

      {/* Offload Wizard Modal */}
      {showWizard && (
        <FuelOffloadWizard
          visible={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={(result) => {
            setShowWizard(false);
            fetchOffloads(); // Refresh the list
          }}
          stationId={currentStation}
        />
      )}

      {/* Offload Details Modal */}
      {selectedOffload && (
        <OffloadDetailsModal
          offload={selectedOffload}
          visible={!!selectedOffload}
          onClose={() => setSelectedOffload(null)}
        />
      )}
    </div>
  );
};

export default OffloadManagement;