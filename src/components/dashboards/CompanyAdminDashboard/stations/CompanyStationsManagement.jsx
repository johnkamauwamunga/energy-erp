import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Spin,
  Alert,
  Empty,
  Tooltip,
  Typography,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Building2, MapPin, Calendar } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { stationService } from '../../../../services/stationService/stationService';
import CreateStationsModal from './CreateStationsModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { confirm } = Modal;

const CompanyStationsManagement = () => {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch stations from the backend
  const fetchStations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let response;
      if (state.currentUser?.role === 'superadmin') {
        response = await stationService.getCompanyStations();
      } else {
        response = await stationService.getCompanyStations();
      }
      
      const stationsData = response.success ? response.data : response;
      
      if (!Array.isArray(stationsData)) {
        throw new Error('Invalid response format from server');
      }
      
      // Add validation to ensure all stations have required fields
      const transformedStations = stationsData
        .filter(station => station && station.id) // Filter out undefined or stations without id
        .map(station => ({
          id: station.id,
          name: station.name || 'Unnamed Station',
          location: station.location || 'No location',
          companyId: station.companyId,
          createdAt: station.createdAt || new Date().toISOString(),
          updatedAt: station.updatedAt || new Date().toISOString(),
          warehousesCount: station.warehouses ? station.warehouses.length : 0,
          companyName: station.companyId
        }));
      
      dispatch({ type: 'SET_STATIONS', payload: transformedStations });
      message.success('Stations updated successfully');
      
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      const errorMessage = error.message || 'Failed to fetch stations';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a station
  const handleDeleteStation = async (stationId) => {
    try {
      setDeletingId(stationId);
      const response = await stationService.deleteStation(stationId);
      
      const isSuccess = response.success;
      
      if (isSuccess) {
        dispatch({ type: 'DELETE_STATION', payload: stationId });
        message.success('Station deleted successfully');
        setRefreshKey(prev => prev + 1);
      } else {
        throw new Error(response.message || 'Failed to delete station');
      }
    } catch (error) {
      console.error('Failed to delete station:', error);
      message.error(error.message || 'Failed to delete station');
    } finally {
      setDeletingId(null);
    }
  };

  // Confirm before deleting
  const confirmDelete = (station) => {
    if (!station?.id) {
      message.error('Invalid station data');
      return;
    }

    confirm({
      title: 'Delete Station',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${station.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        handleDeleteStation(station.id);
      }
    });
  };

  // Handle creating a new station
  const handleCreateStation = () => {
    setEditingStation(null);
    setIsCreateModalOpen(true);
  };

  // Handle editing a station
  const handleEditStation = (station) => {
    if (!station?.id) {
      message.error('Invalid station data');
      return;
    }
    setEditingStation(station);
    setIsCreateModalOpen(true);
  };

  // Close the modal and refresh data if needed
  const handleCloseModal = (shouldRefresh = false) => {
    setIsCreateModalOpen(false);
    setEditingStation(null);
    if (shouldRefresh) {
      fetchStations();
      setRefreshKey(prev => prev + 1);
    }
  };

  // Handle successful station creation/update
  const handleStationSuccess = () => {
    handleCloseModal(true);
  };

  useEffect(() => {
    fetchStations();
  }, [refreshKey]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return dayjs(dateString).format('MMM D, YYYY');
  };

  // Use serviceStations from state with validation
  const stations = (state.serviceStations || []).filter(station => 
    station && station.id && typeof station === 'object'
  );

  console.log("Validated stations:", stations);

  // Table columns configuration
  const columns = [
    {
      title: 'Station',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => {
        if (!record) return null;
        
        return (
          <Space>
            <div style={{
              width: 32,
              height: 32,
              backgroundColor: '#e6f7ff',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 style={{ color: '#1890ff' }} />
            </div>
            <div>
              <Text strong>{name || 'Unnamed Station'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ID: {record.id || 'N/A'}
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 200,
      render: (location, record) => {
        if (!record) return null;
        
        return (
          location ? (
            <Space>
              <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
              <Text>{location}</Text>
            </Space>
          ) : (
            <Text type="secondary" italic>No location set</Text>
          )
        );
      }
    },
    {
      title: 'Warehouses',
      dataIndex: 'warehousesCount',
      key: 'warehousesCount',
      width: 120,
      render: (count, record) => {
        if (!record) return null;
        
        return (
          <Tag color="blue">
            {count || 0} warehouse{(count || 0) !== 1 ? 's' : ''}
          </Tag>
        );
      }
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date, record) => {
        if (!record) return null;
        
        return (
          <Space>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <Text>{formatDate(date)}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => {
        if (!record?.id) return null;
        
        return (
          <Space size="small">
            <Tooltip title="View Station">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => console.log('View station:', record.id)}
              />
            </Tooltip>
            <Tooltip title="Edit Station">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEditStation(record)}
              />
            </Tooltip>
            <Tooltip title="Delete Station">
              <Button 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                loading={deletingId === record.id}
                onClick={() => confirmDelete(record)}
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  if (isLoading) {
    return (
      <div style={{ 
        padding: 24, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400 
      }}>
        <Spin size="large" tip="Loading stations..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Error Display */}
      {error && (
        <Alert
          message="Error loading stations"
          description={error}
          type="error"
          action={
            <Button size="small" onClick={fetchStations}>
              Try Again
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        {/* Header Section */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>Station Management</Title>
            <Text type="secondary">Manage all stations in your company</Text>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchStations}
                loading={isLoading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateStation}
              >
                New Station
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Stations Table */}
        <Table
          columns={columns}
          dataSource={stations.map(station => ({ ...station, key: station.id }))}
          loading={isLoading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No stations found"
              >
                <Button type="primary" onClick={handleCreateStation}>
                  Create Your First Station
                </Button>
              </Empty>
            )
          }}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} stations`
          }}
        />
      </Card>

      {/* Create/Edit Station Modal */}
      <CreateStationsModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleStationSuccess}
        editingStation={editingStation}
        refreshStations={fetchStations}
      />
    </div>
  );
};

export default CompanyStationsManagement;