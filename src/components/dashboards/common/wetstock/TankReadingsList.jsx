// src/components/dashboards/common/wetStock/TankReadingsList.jsx
import React, { useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Tooltip,
  Card,
  Badge,
  Alert
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TankReadingsList = ({ 
  readings, 
  loading, 
  filters, 
  onFiltersChange, 
  onRefresh,
  showFilters = true,
  pagination = { pageSize: 10 },
  currentUser,
  currentStation
}) => {
  
  // Separate readings into complete and incomplete groups
  const { completeReadings, incompleteReadings } = useMemo(() => {
    const groups = {};
    const incomplete = [];
    
    // First, group by shiftId and tankId
    readings.forEach(reading => {
      const key = `${reading.shiftId}_${reading.tankId}`;
      
      if (!groups[key]) {
        groups[key] = {
          shiftId: reading.shiftId,
          tankId: reading.tankId,
          tank: reading.tank,
          shift: reading.shift,
          readings: []
        };
      }
      
      groups[key].readings.push(reading);
    });
    
    // Now separate complete vs incomplete
    const complete = [];
    
    Object.values(groups).forEach(group => {
      const startReading = group.readings.find(r => r.readingType === 'START');
      const endReading = group.readings.find(r => r.readingType === 'END');
      
      if (startReading && endReading) {
        // Complete shift - both START and END readings exist
        const volumeReduction = startReading.volume - endReading.volume;
        
        complete.push({
          ...group,
          startReading,
          endReading,
          isComplete: true,
          volumeReduction,
          startRecordedAt: startReading.recordedAt,
          endRecordedAt: endReading.recordedAt,
          recordedBy: startReading.recordedBy || endReading.recordedBy,
          startVerified: startReading.isVerified,
          endVerified: endReading.isVerified
        });
      } else {
        // Incomplete shift - push individual readings
        group.readings.forEach(reading => {
          incomplete.push({
            ...reading,
            isComplete: false,
            groupKey: `${group.shiftId}_${group.tankId}`
          });
        });
      }
    });
    
    return { completeReadings: complete, incompleteReadings: incomplete };
  }, [readings]);

  // Combine based on filter
  const displayData = useMemo(() => {
    if (filters.status === true) {
      return completeReadings;
    } else if (filters.status === false) {
      return incompleteReadings;
    }
    return [...completeReadings, ...incompleteReadings];
  }, [completeReadings, incompleteReadings, filters.status]);

  const handleSearch = (value) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleDateChange = (dates) => {
    onFiltersChange({
      ...filters,
      startDate: dates?.[0]?.toISOString(),
      endDate: dates?.[1]?.toISOString()
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  // Columns for complete readings (grouped view)
  const completeColumns = [
    {
      title: 'Shift Number',
      key: 'shiftNumber',
      render: (_, record) => (
        <Text strong>#{record.shift?.shiftNumber || 'N/A'}</Text>
      ),
      width: 100
    },
    {
      title: 'Tank',
      key: 'tank',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.tank?.asset?.name || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.tank?.asset?.station?.name || 'N/A'}
          </Text>
        </Space>
      ),
      width: 150
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <Text>{record.tank?.product?.name || 'N/A'}</Text>
      ),
      width: 120
    },
    {
      title: 'Start Volume',
      key: 'startVolume',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff' }}>
            {record.startReading?.volume?.toFixed(2)} L
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Dip: {record.startReading?.dipValue?.toFixed(2)} m
          </Text>
        </Space>
      ),
      width: 120
    },
    {
      title: 'End Volume',
      key: 'endVolume',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#52c41a' }}>
            {record.endReading?.volume?.toFixed(2)} L
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Dip: {record.endReading?.dipValue?.toFixed(2)} m
          </Text>
        </Space>
      ),
      width: 120
    },
    {
      title: 'Volume Reduction',
      dataIndex: 'volumeReduction',
      key: 'volumeReduction',
      render: (value) => (
        <Text strong type={value > 0 ? "success" : "secondary"}>
          {value ? `${value.toFixed(2)} L` : '0.00 L'}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => (a.volumeReduction || 0) - (b.volumeReduction || 0)
    },
    {
      title: 'Temperature',
      key: 'temperature',
      render: (_, record) => (
        <Text>
          {record.startReading?.temperature?.toFixed(1)}°C → {record.endReading?.temperature?.toFixed(1)}°C
        </Text>
      ),
      width: 120
    },
    {
      title: 'Water Level',
      key: 'waterLevel',
      render: (_, record) => (
        <Text type={record.startReading?.waterLevel > 0 ? "danger" : "secondary"}>
          {record.startReading?.waterLevel?.toFixed(2)} m → {record.endReading?.waterLevel?.toFixed(2)} m
        </Text>
      ),
      width: 120
    },
    {
      title: 'Verified',
      key: 'verified',
      render: (_, record) => (
        <Space>
          <Badge 
            status={record.startVerified ? 'success' : 'default'} 
            text="Start"
          />
          <Badge 
            status={record.endVerified ? 'success' : 'default'} 
            text="End"
          />
        </Space>
      ),
      width: 100
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Badge status="success" text="Complete" />
      ),
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewCompleteDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Columns for incomplete readings (individual view)
  const incompleteColumns = [
    {
      title: 'Shift Number',
      key: 'shiftNumber',
      render: (_, record) => (
        <Text strong>#{record.shift?.shiftNumber || 'N/A'}</Text>
      ),
      width: 100
    },
    {
      title: 'Tank',
      key: 'tank',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.tank?.asset?.name || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.tank?.asset?.station?.name || 'N/A'}
          </Text>
        </Space>
      ),
      width: 150
    },
    {
      title: 'Reading Type',
      dataIndex: 'readingType',
      key: 'readingType',
      render: (type) => (
        <Tag color={type === 'START' ? 'blue' : 'green'}>
          {type}
        </Tag>
      ),
      width: 100
    },
    {
      title: 'Dip Value',
      dataIndex: 'dipValue',
      key: 'dipValue',
      render: (value) => (
        <Text strong>
          {value ? `${value.toFixed(2)} m` : 'N/A'}
        </Text>
      ),
      width: 100
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      render: (value) => (
        <Text strong type="success">
          {value ? `${value.toFixed(2)} L` : 'N/A'}
        </Text>
      ),
      width: 100
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (value) => (
        <Text>
          {value ? `${value.toFixed(1)}°C` : 'N/A'}
        </Text>
      ),
      width: 100
    },
    {
      title: 'Water Level',
      dataIndex: 'waterLevel',
      key: 'waterLevel',
      render: (value) => (
        <Text type={value > 0 ? "danger" : "secondary"}>
          {value ? `${value.toFixed(2)} m` : 'N/A'}
        </Text>
      ),
      width: 100
    },
    {
      title: 'Recorded At',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (date) => formatDate(date, true),
      width: 150
    },
    {
      title: 'Verified',
      dataIndex: 'isVerified',
      key: 'isVerified',
      render: (verified) => (
        <Badge 
          status={verified ? 'success' : 'default'} 
          text={verified ? 'Yes' : 'No'}
        />
      ),
      width: 80
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Badge status="warning" text="Incomplete" />
      ),
      width: 100
    },
    {
      title: 'Missing',
      key: 'missing',
      render: (_, record) => (
        <Text type="secondary">
          {record.readingType === 'START' ? 'END reading' : 'START reading'}
        </Text>
      ),
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewIncompleteDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Dynamic columns based on filter
  const columns = useMemo(() => {
    if (filters.status === true) {
      return completeColumns;
    } else if (filters.status === false) {
      return incompleteColumns;
    }
    // Mixed view
    return [
      {
        title: 'Shift Number',
        key: 'shiftNumber',
        render: (_, record) => (
          <Text strong>#{record.shift?.shiftNumber || 'N/A'}</Text>
        ),
        width: 100
      },
      {
        title: 'Tank',
        key: 'tank',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{record.tank?.asset?.name || 'N/A'}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.tank?.asset?.station?.name || 'N/A'}
            </Text>
          </Space>
        ),
        width: 150
      },
      {
        title: 'Type',
        key: 'type',
        render: (_, record) => (
          record.isComplete ? (
            <Text type="success">Complete Shift</Text>
          ) : (
            <Tag color={record.readingType === 'START' ? 'blue' : 'green'}>
              {record.readingType}
            </Tag>
          )
        ),
        width: 120
      },
      {
        title: 'Volume',
        key: 'volume',
        render: (_, record) => {
          if (record.isComplete) {
            return (
              <Space direction="vertical" size={0}>
                <Text style={{ color: '#1890ff' }}>
                  Start: {record.startReading?.volume?.toFixed(2)} L
                </Text>
                <Text style={{ color: '#52c41a' }}>
                  End: {record.endReading?.volume?.toFixed(2)} L
                </Text>
                <Text strong type="success">
                  Reduction: {record.volumeReduction?.toFixed(2)} L
                </Text>
              </Space>
            );
          }
          return (
            <Text strong type="success">
              {record.volume?.toFixed(2)} L
            </Text>
          );
        },
        width: 150
      },
      {
        title: 'Dip Value',
        key: 'dipValue',
        render: (_, record) => {
          if (record.isComplete) {
            return (
              <Space>
                <Text style={{ color: '#1890ff' }}>
                  {record.startReading?.dipValue?.toFixed(2)} m
                </Text>
                <Text style={{ color: '#52c41a' }}>
                  {record.endReading?.dipValue?.toFixed(2)} m
                </Text>
              </Space>
            );
          }
          return (
            <Text strong>
              {record.dipValue?.toFixed(2)} m
            </Text>
          );
        },
        width: 120
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => (
          <Badge 
            status={record.isComplete ? 'success' : 'warning'} 
            text={record.isComplete ? 'Complete' : 'Incomplete'}
          />
        ),
        width: 100
      },
      {
        title: 'Recorded At',
        key: 'recordedAt',
        render: (_, record) => 
          formatDate(record.isComplete ? record.startRecordedAt : record.recordedAt, true),
        width: 150
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        render: (_, record) => (
          <Space>
            <Tooltip title="View Details">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => record.isComplete ? 
                  handleViewCompleteDetails(record) : 
                  handleViewIncompleteDetails(record)
                }
              />
            </Tooltip>
          </Space>
        )
      }
    ];
  }, [filters.status]);

  const handleViewCompleteDetails = (record) => {
    console.log('View complete tank shift details:', record);
    // Show both start and end readings for this tank in this shift
  };

  const handleViewIncompleteDetails = (record) => {
    console.log('View incomplete tank reading details:', record);
    // Show individual reading details
  };

  // Statistics
  const stats = useMemo(() => {
    const complete = completeReadings.length;
    const incomplete = incompleteReadings.length;
    const totalVolumeReduction = completeReadings.reduce((sum, r) => sum + (r.volumeReduction || 0), 0);
    
    return { complete, incomplete, totalVolumeReduction };
  }, [completeReadings, incompleteReadings]);

  return (
    <div className="space-y-3">
      {/* Statistics Alert */}
      <Alert
        message={
          <Space size="large">
            <Text>
              <strong>Complete Shifts:</strong> {stats.complete}
            </Text>
            <Text>
              <strong>Incomplete Readings:</strong> {stats.incomplete}
            </Text>
            <Text>
              <strong>Total Volume Reduction:</strong> {stats.totalVolumeReduction.toFixed(2)} L
            </Text>
          </Space>
        }
        type="info"
        showIcon
      />

      {/* Filters */}
      {showFilters && (
        <Card size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={6}>
              <Search
                placeholder="Search shift, tank, product..."
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                allowClear
              />
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="All Status"
                value={filters.status}
                onChange={handleStatusChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value={true}>Complete Shifts</Option>
                <Option value={false}>Incomplete Readings</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateChange}
                placeholder={['Start Date', 'End Date']}
              />
            </Col>
            <Col xs={24} sm={2}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  loading={loading}
                  size="small"
                />
                <Button
                  icon={<FilterOutlined />}
                  onClick={clearFilters}
                  size="small"
                >
                  Clear
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Readings Table */}
      <Table
        columns={columns}
        dataSource={displayData}
        rowKey={(record) => record.isComplete ? 
          `complete_${record.shiftId}_${record.tankId}` : 
          `incomplete_${record.id}`
        }
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} records`
        }}
        size="small"
        scroll={{ x: 1300 }}
      />
    </div>
  );
};

export default TankReadingsList;