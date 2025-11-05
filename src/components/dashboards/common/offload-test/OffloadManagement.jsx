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
  FileTextOutlined
} from '@ant-design/icons';
import { fuelOffloadService, offloadFormatters } from '../../../../services/offloadService/offloadService';

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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [showWizard, setShowWizard] = useState(false);
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tankId: '',
    productId: '',
    dateRange: null,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const currentStation = state.currentStation?.id;

  // Fetch offload records using getOffloadsByStation
  const fetchOffloads = async () => {
    if (!currentStation) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching offloads with filters:", filters);
      
      // Use getOffloadsByStation with filters
      const result = await fuelOffloadService.getOffloadsByStation(filters);
      
      console.log("📦 Offloads response:", result);
      
      // Handle the response structure from getOffloadsByStation
      const offloadsData = result.offloads || [];
      const paginationData = result.pagination || {};
      
      console.log(`✅ Retrieved ${offloadsData.length} offloads`);
      
      setOffloads(Array.isArray(offloadsData) ? offloadsData : []);
      setPagination({
        page: paginationData.page || 1,
        limit: paginationData.limit || 10,
        totalCount: paginationData.totalCount || 0,
        totalPages: paginationData.totalPages || 0
      });
    } catch (error) {
      console.error('❌ Failed to fetch offloads:', error);
      setOffloads([]);
      setPagination({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffloads();
  }, [currentStation, filters.page, filters.limit, filters.status, filters.dateRange]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize
    }));
  };

  const getStatusConfig = (status) => {
    const config = {
      'COMPLETED': { color: 'green', label: 'Completed', badge: 'success' },
      'IN_PROGRESS': { color: 'orange', label: 'In Progress', badge: 'processing' },
      'DRAFT': { color: 'default', label: 'Draft', badge: 'default' },
      'CANCELLED': { color: 'red', label: 'Cancelled', badge: 'error' },
      'PENDING': { color: 'blue', label: 'Pending', badge: 'warning' }
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
      title: 'Purchase #',
      dataIndex: ['purchaseReceiving', 'purchase', 'purchaseNumber'],
      key: 'purchaseNumber',
      width: 130,
      render: (purchaseNumber) => purchaseNumber || 'N/A'
    },
    {
      title: 'Supplier',
      dataIndex: ['purchaseReceiving', 'purchase', 'supplier', 'name'],
      key: 'supplier',
      width: 150,
      render: (supplierName) => supplierName || 'N/A'
    },
    {
      title: 'Tank',
      dataIndex: ['tank', 'asset', 'name'],
      key: 'tank',
      width: 100,
      render: (tankName) => tankName || 'N/A'
    },
    {
      title: 'Product',
      dataIndex: ['product', 'name'],
      key: 'product',
      width: 150,
      render: (productName) => productName || 'N/A'
    },
    {
      title: 'Expected',
      dataIndex: 'expectedVolume',
      key: 'expected',
      width: 100,
      render: (volume) => `${(volume || 0).toLocaleString()}L`
    },
    {
      title: 'Actual',
      dataIndex: 'actualVolume',
      key: 'actual',
      width: 100,
      render: (volume) => `${(volume || 0).toLocaleString()}L`
    },
    {
      title: 'Variance',
      dataIndex: 'variance',
      key: 'variance',
      width: 120,
      render: (variance) => {
        const config = getVarianceStatus(variance || 0);
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

  // Format offloads for display
  const formattedOffloads = offloads.map(offload => {
    try {
      return offloadFormatters.formatOffloadForDisplay(offload);
    } catch (error) {
      console.error('Error formatting offload:', error, offload);
      return offload; // Return original if formatting fails
    }
  });

  // Statistics
  const stats = {
    total: pagination.totalCount,
    completed: formattedOffloads.filter(o => o.status === 'COMPLETED').length,
    inProgress: formattedOffloads.filter(o => o.status === 'IN_PROGRESS').length,
    totalVolume: formattedOffloads.reduce((sum, o) => sum + (o.actualVolume || 0), 0)
  };

  // Simple Offload Details Modal
  const OffloadDetailsModal = ({ offload, visible, onClose }) => {
    if (!offload) return null;

    const formattedOffload = offloadFormatters.formatOffloadForDisplay(offload);

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
                <p><strong>Purchase #:</strong> {formattedOffload.purchaseNumber}</p>
                <p><strong>Supplier:</strong> {formattedOffload.supplierName}</p>
                <p><strong>Tank:</strong> {formattedOffload.tankName}</p>
                <p><strong>Product:</strong> {formattedOffload.productName}</p>
                <p><strong>Status:</strong> {formattedOffload.statusDisplay}</p>
                <p><strong>Created:</strong> {formattedOffload.formattedCreatedAt}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Quantities">
                <p><strong>Expected:</strong> {formattedOffload.displayVolume}</p>
                <p><strong>Actual:</strong> {formattedOffload.displayVolume}</p>
                <p><strong>Variance:</strong> {formattedOffload.displayVariance}</p>
                <p><strong>Sales During Offload:</strong> {formattedOffload.salesDuringOffload || 0}L</p>
              </Card>
            </Col>
          </Row>

          {/* Dip Readings */}
          {offload.tankDipReadings && offload.tankDipReadings.length > 0 && (
            <Card size="small" title="Dip Readings">
              <Table
                dataSource={offload.tankDipReadings}
                pagination={false}
                size="small"
                columns={[
                  { 
                    title: 'Type', 
                    dataIndex: 'readingType', 
                    key: 'readingType',
                    render: (type) => {
                      const typeMap = {
                        'OFFLOAD_BEFORE': 'Before Offload',
                        'OFFLOAD_AFTER': 'After Offload'
                      };
                      return typeMap[type] || type;
                    }
                  },
                  { title: 'Dip Value', dataIndex: 'dipValue', key: 'dipValue' },
                  { title: 'Volume', dataIndex: 'volume', key: 'volume', render: vol => `${vol}L` },
                  { title: 'Temperature', dataIndex: 'temperature', key: 'temperature', render: temp => temp ? `${temp}°C` : 'N/A' },
                  { title: 'Water Level', dataIndex: 'waterLevel', key: 'waterLevel', render: level => level ? `${level}cm` : 'N/A' }
                ]}
              />
            </Card>
          )}

          {/* Pump Readings */}
          {offload.pumpMeterReadings && offload.pumpMeterReadings.length > 0 && (
            <Card size="small" title="Pump Meter Readings">
              <Table
                dataSource={offload.pumpMeterReadings}
                pagination={false}
                size="small"
                columns={[
                  { 
                    title: 'Type', 
                    dataIndex: 'readingType', 
                    key: 'readingType',
                    render: (type) => {
                      const typeMap = {
                        'OFFLOAD_BEFORE': 'Before Offload',
                        'OFFLOAD_AFTER': 'After Offload'
                      };
                      return typeMap[type] || type;
                    }
                  },
                  { 
                    title: 'Pump', 
                    key: 'pump',
                    render: (_, reading) => reading.pump?.asset?.name || 'N/A'
                  },
                  { title: 'Electric Meter', dataIndex: 'electricMeter', key: 'electricMeter' },
                  { title: 'Manual Meter', dataIndex: 'manualMeter', key: 'manualMeter' },
                  { title: 'Cash Meter', dataIndex: 'cashMeter', key: 'cashMeter' }
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
              placeholder="Search by purchase #..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              onSearch={fetchOffloads}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange({ status: value })}
              allowClear
            >
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
              onChange={(dates) => handleFilterChange({ dateRange: dates })}
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
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  // Reset filters
                  handleFilterChange({
                    search: '',
                    status: '',
                    dateRange: null,
                    page: 1
                  });
                }}
              >
                Clear Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Debug Info */}
      <Card size="small">
        <Text type="secondary">
          Debug: Station ID: {currentStation} | Showing {formattedOffloads.length} of {pagination.totalCount} offloads
        </Text>
      </Card>

      {/* Offloads Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={formattedOffloads}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} offload records`
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: loading ? 
              'Loading offload records...' : 
              filters.search || filters.status ? 
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