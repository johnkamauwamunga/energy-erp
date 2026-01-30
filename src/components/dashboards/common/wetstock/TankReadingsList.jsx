// src/components/dashboards/common/wetStock/TankReadingsList.jsx
import React, { useMemo, useState } from 'react';
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
  Alert,
  Modal,
  Descriptions,
  Divider,
  Progress
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ShopOutlined,
  DatabaseOutlined,
  FireTwoTone
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text, Title } = Typography;
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
  currentStation,
  currentCompany
}) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  
  // Process and group readings by shift and tank
  const { groupedReadings, completeShifts, incompleteReadings } = useMemo(() => {
    if (!readings || readings.length === 0) {
      return { groupedReadings: [], completeShifts: [], incompleteReadings: [] };
    }

    const groups = {};
    const incomplete = [];
    
    // Group by shiftId and tankId
    readings.forEach(reading => {
      const key = `${reading.shiftId}_${reading.tankId}`;
      
      if (!groups[key]) {
        groups[key] = {
          shiftId: reading.shiftId,
          tankId: reading.tankId,
          tank: reading.tank,
          shift: reading.shift,
          startReading: null,
          endReading: null,
          station: reading.tank?.asset?.station,
          product: reading.tank?.product,
          recordedBy: reading.recordedBy
        };
      }
      
      // Add reading based on type
      if (reading.readingType === 'START') {
        groups[key].startReading = reading;
      } else if (reading.readingType === 'END') {
        groups[key].endReading = reading;
      }
    });
    
    // Separate complete and incomplete
    const complete = [];
    Object.values(groups).forEach((group, index) => {
      if (group.startReading && group.endReading) {
        // Complete shift
        const volumeReduction = group.startReading.volume - group.endReading.volume;
        const dipReduction = group.startReading.dipValue - group.endReading.dipValue;
        const tempChange = group.endReading.temperature - group.startReading.temperature;
        
        complete.push({
          ...group,
          id: `complete_${index}`,
          sequence: index + 1,
          isComplete: true,
          volumeReduction: Math.max(volumeReduction, 0),
          dipReduction: Math.max(dipReduction, 0),
          tempChange,
          startVolume: group.startReading.volume,
          endVolume: group.endReading.volume,
          startDip: group.startReading.dipValue,
          endDip: group.endReading.dipValue,
          startTemp: group.startReading.temperature,
          endTemp: group.endReading.temperature,
          startWater: group.startReading.waterLevel,
          endWater: group.endReading.waterLevel,
          startRecordedAt: group.startReading.recordedAt,
          endRecordedAt: group.endReading.recordedAt,
          startVerified: group.startReading.isVerified || false,
          endVerified: group.endReading.isVerified || false,
          startDensity: group.startReading.density,
          endDensity: group.endReading.density
        });
      } else {
        // Incomplete - add individual readings
        if (group.startReading) {
          incomplete.push({
            ...group.startReading,
            id: `incomplete_start_${group.startReading.id}`,
            sequence: incomplete.length + 1,
            isComplete: false,
            readingType: 'START',
            tankName: group.tank?.asset?.name,
            stationName: group.station?.name,
            productName: group.product?.name,
            shiftNumber: group.shift?.shiftNumber,
            capacity: group.tank?.capacity
          });
        }
        if (group.endReading) {
          incomplete.push({
            ...group.endReading,
            id: `incomplete_end_${group.endReading.id}`,
            sequence: incomplete.length + 1,
            isComplete: false,
            readingType: 'END',
            tankName: group.tank?.asset?.name,
            stationName: group.station?.name,
            productName: group.product?.name,
            shiftNumber: group.shift?.shiftNumber,
            capacity: group.tank?.capacity
          });
        }
      }
    });
    
    // Sort complete shifts by date (newest first)
    complete.sort((a, b) => new Date(b.endRecordedAt) - new Date(a.endRecordedAt));
    
    // Add sequence numbers
    complete.forEach((item, index) => {
      item.sequence = index + 1;
    });
    incomplete.forEach((item, index) => {
      item.sequence = index + 1;
    });
    
    return {
      groupedReadings: groups,
      completeShifts: complete,
      incompleteReadings: incomplete
    };
  }, [readings]);

  // Filter display data
  const displayData = useMemo(() => {
    if (filters.status === true) {
      return completeShifts;
    } else if (filters.status === false) {
      return incompleteReadings;
    }
    return [...completeShifts, ...incompleteReadings];
  }, [completeShifts, incompleteReadings, filters.status]);

  // Filter handlers
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

  // View details
  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // Calculate tank utilization percentage
  const calculateUtilization = (currentVolume, capacity) => {
    if (!currentVolume || !capacity || capacity === 0) return 0;
    return (currentVolume / capacity) * 100;
  };

  // Export data preparation
  const prepareExportData = () => {
    return displayData.map(item => {
      const baseData = {
        '#': item.sequence,
        'Shift Number': item.shiftNumber || item.shift?.shiftNumber || 'N/A',
        'Station': item.stationName || item.station?.name || 'N/A',
        'Tank': item.tankName || item.tank?.asset?.name || 'N/A',
        'Product': item.productName || item.product?.name || 'N/A',
        'Status': item.isComplete ? 'Complete Shift' : `Incomplete (${item.readingType})`,
        'Recorded By': item.recordedBy ? 
          `${item.recordedBy.firstName} ${item.recordedBy.lastName}` : 
          item.recordedById || 'System',
        'Recorded At': formatDate(item.isComplete ? item.endRecordedAt : item.recordedAt, true),
        'Tank Capacity': item.capacity ? `${item.capacity} L` : 'N/A'
      };

      if (item.isComplete) {
        const utilizationStart = calculateUtilization(item.startVolume, item.tank?.capacity);
        const utilizationEnd = calculateUtilization(item.endVolume, item.tank?.capacity);
        
        return {
          ...baseData,
          'Start Volume': `${item.startVolume?.toFixed(2)} L`,
          'End Volume': `${item.endVolume?.toFixed(2)} L`,
          'Volume Reduction': `${item.volumeReduction?.toFixed(2)} L`,
          'Start Dip': `${item.startDip?.toFixed(2)} m`,
          'End Dip': `${item.endDip?.toFixed(2)} m`,
          'Dip Reduction': `${item.dipReduction?.toFixed(2)} m`,
          'Start Temperature': `${item.startTemp?.toFixed(1)}°C`,
          'End Temperature': `${item.endTemp?.toFixed(1)}°C`,
          'Temperature Change': `${item.tempChange?.toFixed(1)}°C`,
          'Start Water Level': `${item.startWater?.toFixed(2)} m`,
          'End Water Level': `${item.endWater?.toFixed(2)} m`,
          'Start Utilization': `${utilizationStart.toFixed(1)}%`,
          'End Utilization': `${utilizationEnd.toFixed(1)}%`,
          'Start Density': item.startDensity?.toFixed(3) || 'N/A',
          'End Density': item.endDensity?.toFixed(3) || 'N/A',
          'Start Time': formatDate(item.startRecordedAt, true),
          'End Time': formatDate(item.endRecordedAt, true),
          'Start Verified': item.startVerified ? 'Yes' : 'No',
          'End Verified': item.endVerified ? 'Yes' : 'No'
        };
      } else {
        const utilization = calculateUtilization(item.volume, item.capacity);
        
        return {
          ...baseData,
          'Reading Type': item.readingType,
          'Dip Value': `${item.dipValue?.toFixed(2)} m`,
          'Volume': `${item.volume?.toFixed(2)} L`,
          'Temperature': `${item.temperature?.toFixed(1)}°C`,
          'Water Level': `${item.waterLevel?.toFixed(2)} m`,
          'Density': item.density?.toFixed(3) || 'N/A',
          'Utilization': `${utilization.toFixed(1)}%`,
          'Verified': item.isVerified ? 'Yes' : 'No'
        };
      }
    });
  };

  // Export columns
  const getExportColumns = () => {
    const baseColumns = [
      {
        title: '#',
        dataIndex: '#',
        key: 'sequence',
        width: 60,
        type: 'number'
      },
      {
        title: 'Shift Number',
        dataIndex: 'Shift Number',
        key: 'shiftNumber',
        width: 120,
        type: 'text'
      },
      {
        title: 'Station',
        dataIndex: 'Station',
        key: 'station',
        width: 150,
        type: 'text'
      },
      {
        title: 'Tank',
        dataIndex: 'Tank',
        key: 'tank',
        width: 120,
        type: 'text'
      },
      {
        title: 'Product',
        dataIndex: 'Product',
        key: 'product',
        width: 120,
        type: 'text'
      },
      {
        title: 'Status',
        dataIndex: 'Status',
        key: 'status',
        width: 120,
        type: 'status'
      }
    ];

    const completeColumns = [
      ...baseColumns,
      {
        title: 'Start Volume',
        dataIndex: 'Start Volume',
        key: 'startVolume',
        width: 100,
        type: 'number'
      },
      {
        title: 'End Volume',
        dataIndex: 'End Volume',
        key: 'endVolume',
        width: 100,
        type: 'number'
      },
      {
        title: 'Volume Reduction',
        dataIndex: 'Volume Reduction',
        key: 'volumeReduction',
        width: 120,
        type: 'number'
      },
      {
        title: 'Temperature',
        dataIndex: 'Temperature Change',
        key: 'temperature',
        width: 100,
        type: 'number'
      },
      {
        title: 'Utilization',
        dataIndex: 'End Utilization',
        key: 'utilization',
        width: 100,
        type: 'percentage'
      },
      {
        title: 'Recorded By',
        dataIndex: 'Recorded By',
        key: 'recordedBy',
        width: 150,
        type: 'text'
      },
      {
        title: 'End Time',
        dataIndex: 'End Time',
        key: 'endTime',
        width: 150,
        type: 'datetime'
      }
    ];

    const incompleteColumns = [
      ...baseColumns,
      {
        title: 'Reading Type',
        dataIndex: 'Reading Type',
        key: 'readingType',
        width: 100,
        type: 'text'
      },
      {
        title: 'Volume',
        dataIndex: 'Volume',
        key: 'volume',
        width: 100,
        type: 'number'
      },
      {
        title: 'Dip Value',
        dataIndex: 'Dip Value',
        key: 'dipValue',
        width: 100,
        type: 'number'
      },
      {
        title: 'Temperature',
        dataIndex: 'Temperature',
        key: 'temperature',
        width: 100,
        type: 'number'
      },
      {
        title: 'Utilization',
        dataIndex: 'Utilization',
        key: 'utilization',
        width: 100,
        type: 'percentage'
      },
      {
        title: 'Recorded At',
        dataIndex: 'Recorded At',
        key: 'recordedAt',
        width: 150,
        type: 'datetime'
      }
    ];

    return filters.status === true ? completeColumns : 
           filters.status === false ? incompleteColumns : baseColumns;
  };

  // Calculate summary data
  const calculateSummaryData = () => {
    const totalComplete = completeShifts.length;
    const totalIncomplete = incompleteReadings.length;
    const totalVolumeReduction = completeShifts.reduce((sum, shift) => sum + (shift.volumeReduction || 0), 0);
    const totalCapacity = completeShifts.reduce((sum, shift) => sum + (shift.tank?.capacity || 0), 0);
    const avgUtilization = completeShifts.length > 0 ? 
      completeShifts.reduce((sum, shift) => {
        const endUtil = calculateUtilization(shift.endVolume, shift.tank?.capacity);
        return sum + endUtil;
      }, 0) / completeShifts.length : 0;
    
    return {
      'Total Records': displayData.length,
      'Complete Shifts': totalComplete,
      'Incomplete Readings': totalIncomplete,
      'Total Volume Reduction': `${totalVolumeReduction.toFixed(2)} L`,
      'Total Tank Capacity': `${totalCapacity.toFixed(0)} L`,
      'Average Utilization': `${avgUtilization.toFixed(1)}%`,
      'Station': currentStation?.name || 'All Stations',
      'Company': currentCompany?.name || 'All Companies',
      'Report Date': new Date().toLocaleDateString('en-KE'),
      'Generated By': currentUser ? 
        `${currentUser.firstName} ${currentUser.lastName}` : 'System',
      'User Role': currentUser?.role || 'N/A'
    };
  };

  // Handle report generation
  const handleGenerateReport = () => {
    const exportData = prepareExportData();
    if (exportData.length === 0) {
      message.warning('No data available to generate report');
      return;
    }

    const config = {
      dataSource: exportData,
      columns: getExportColumns(),
      summaryData: calculateSummaryData(),
      title: `Tank Dip Readings Report - ${currentStation?.name || currentCompany?.name || 'System'}`,
      fileName: `tank_readings_${new Date().toISOString().split('T')[0]}`,
      reportType: 'inventory',
      companyName: currentCompany?.name || "Lynx Energy System",
      stationInfo: currentStation ? {
        name: currentStation.name,
        code: currentStation.code,
        address: currentStation.location
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | Station: ${currentStation?.name || 'All'} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true
    };

    setReportConfig(config);
    setReportModalVisible(true);
  };

  // Columns for complete shifts table
  const completeColumns = [
    {
      title: '#',
      key: 'sequence',
      width: 60,
      render: (_, record) => (
        <Badge 
          count={record.sequence} 
          style={{ 
            backgroundColor: record.sequence <= 3 ? 
              record.sequence === 1 ? '#f5222d' : 
              record.sequence === 2 ? '#fa8c16' : 
              '#52c41a' : '#1890ff'
          }}
        />
      )
    },
    {
      title: 'Station & Tank',
      key: 'stationTank',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            {record.station?.name || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Tank: {record.tank?.asset?.name || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Product',
      key: 'product',
      width: 120,
      render: (_, record) => (
        <Tag color={record.product?.fuelCode === 'PMS' ? 'green' : 'blue'}>
          {record.product?.name || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Volume',
      key: 'volume',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '11px' }}>
            <Text type="secondary">Start:</Text> {record.startVolume?.toFixed(2)} L
          </Text>
          <Text style={{ fontSize: '11px' }}>
            <Text type="secondary">End:</Text> {record.endVolume?.toFixed(2)} L
          </Text>
          <Text strong type="success" style={{ fontSize: '12px' }}>
            Reduction: {record.volumeReduction?.toFixed(2)} L
          </Text>
        </Space>
      )
    },
    {
      title: 'Dip',
      key: 'dip',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px' }}>
            {record.startDip?.toFixed(2)} → {record.endDip?.toFixed(2)} m
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Δ: {record.dipReduction?.toFixed(2)} m
          </Text>
        </Space>
      )
    },
    {
      title: 'Utilization',
      key: 'utilization',
      width: 120,
      render: (_, record) => {
        const startUtil = calculateUtilization(record.startVolume, record.tank?.capacity);
        const endUtil = calculateUtilization(record.endVolume, record.tank?.capacity);
        
        return (
          <Space direction="vertical" size={0}>
            <Progress 
              percent={endUtil} 
              size="small" 
              status={endUtil > 80 ? 'exception' : endUtil > 60 ? 'normal' : 'success'}
              format={percent => `${percent.toFixed(0)}%`}
            />
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {startUtil.toFixed(0)}% → {endUtil.toFixed(0)}%
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Temperature',
      key: 'temperature',
      width: 100,
      render: (_, record) => (
        <Space>
          <FireTwoTone style={{ color: record.tempChange > 0 ? '#ff4d4f' : '#52c41a' }} />
          <Text style={{ fontSize: '11px' }}>
            {record.endTemp?.toFixed(1)}°C
          </Text>
        </Space>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: () => (
        <Badge status="success" text="Complete" />
      )
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
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Columns for incomplete readings
  const incompleteColumns = [
    {
      title: '#',
      key: 'sequence',
      width: 60,
      render: (_, record) => (
        <Badge 
          count={record.sequence} 
          style={{ backgroundColor: '#faad14' }}
        />
      )
    },
    {
      title: 'Station & Tank',
      key: 'stationTank',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            {record.stationName || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Tank: {record.tankName || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Type',
      key: 'readingType',
      width: 100,
      render: (_, record) => (
        <Tag color={record.readingType === 'START' ? 'blue' : 'green'}>
          {record.readingType}
        </Tag>
      )
    },
    {
      title: 'Volume',
      key: 'volume',
      width: 100,
      render: (_, record) => (
        <Text strong style={{ fontSize: '12px' }}>
          {record.volume?.toFixed(2)} L
        </Text>
      )
    },
    {
      title: 'Dip',
      key: 'dip',
      width: 80,
      render: (_, record) => (
        <Text style={{ fontSize: '11px' }}>
          {record.dipValue?.toFixed(2)} m
        </Text>
      )
    },
    {
      title: 'Utilization',
      key: 'utilization',
      width: 100,
      render: (_, record) => {
        const utilization = calculateUtilization(record.volume, record.capacity);
        return (
          <Progress 
            percent={utilization} 
            size="small" 
            status={utilization > 80 ? 'exception' : utilization > 60 ? 'normal' : 'success'}
            showInfo={false}
          />
        );
      }
    },
    {
      title: 'Recorded At',
      key: 'recordedAt',
      width: 150,
      render: (_, record) => formatDate(record.recordedAt, true)
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: () => (
        <Badge status="warning" text="Incomplete" />
      )
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
              onClick={() => handleViewDetails(record)}
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
    
    // Mixed view columns
    return [
      {
        title: '#',
        key: 'sequence',
        width: 60,
        render: (_, record) => (
          <Badge 
            count={record.sequence} 
            style={{ 
              backgroundColor: record.isComplete ? 
                (record.sequence <= 3 ? 
                  record.sequence === 1 ? '#f5222d' : 
                  record.sequence === 2 ? '#fa8c16' : 
                  '#52c41a' : '#1890ff') : 
                '#faad14'
            }}
          />
        )
      },
      {
        title: 'Shift',
        key: 'shift',
        width: 100,
        render: (_, record) => (
          <Text strong style={{ fontSize: '12px' }}>
            #{record.shiftNumber || record.shift?.shiftNumber || 'N/A'}
          </Text>
        )
      },
      {
        title: 'Station & Tank',
        key: 'stationTank',
        width: 180,
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '12px' }}>
              {record.stationName || record.station?.name || 'N/A'}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Tank: {record.tankName || record.tank?.asset?.name || 'N/A'}
            </Text>
          </Space>
        )
      },
      {
        title: 'Type',
        key: 'type',
        width: 120,
        render: (_, record) => (
          record.isComplete ? (
            <Text type="success" style={{ fontSize: '11px' }}>Complete Shift</Text>
          ) : (
            <Tag color={record.readingType === 'START' ? 'blue' : 'green'}>
              {record.readingType}
            </Tag>
          )
        )
      },
      {
        title: 'Volume',
        key: 'volume',
        width: 150,
        render: (_, record) => {
          if (record.isComplete) {
            return (
              <Space direction="vertical" size={0}>
                <Text style={{ fontSize: '11px' }}>
                  <Text type="secondary">Start:</Text> {record.startVolume?.toFixed(2)} L
                </Text>
                <Text style={{ fontSize: '11px' }}>
                  <Text type="secondary">End:</Text> {record.endVolume?.toFixed(2)} L
                </Text>
                <Text strong type="success" style={{ fontSize: '12px' }}>
                  Reduction: {record.volumeReduction?.toFixed(2)} L
                </Text>
              </Space>
            );
          }
          return (
            <Text strong style={{ fontSize: '12px' }}>
              {record.volume?.toFixed(2)} L
            </Text>
          );
        }
      },
      {
        title: 'Utilization',
        key: 'utilization',
        width: 100,
        render: (_, record) => {
          if (record.isComplete) {
            const endUtil = calculateUtilization(record.endVolume, record.tank?.capacity);
            return (
              <Progress 
                percent={endUtil} 
                size="small" 
                status={endUtil > 80 ? 'exception' : endUtil > 60 ? 'normal' : 'success'}
                showInfo={false}
              />
            );
          } else {
            const utilization = calculateUtilization(record.volume, record.capacity);
            return (
              <Progress 
                percent={utilization} 
                size="small" 
                status={utilization > 80 ? 'exception' : utilization > 60 ? 'normal' : 'success'}
                showInfo={false}
              />
            );
          }
        }
      },
      {
        title: 'Status',
        key: 'status',
        width: 100,
        render: (_, record) => (
          <Badge 
            status={record.isComplete ? 'success' : 'warning'} 
            text={record.isComplete ? 'Complete' : 'Incomplete'}
          />
        )
      },
      {
        title: 'Recorded At',
        key: 'recordedAt',
        width: 150,
        render: (_, record) => 
          formatDate(record.isComplete ? record.endRecordedAt : record.recordedAt, true)
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
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
          </Space>
        )
      }
    ];
  }, [filters.status]);

  // Statistics
  const stats = useMemo(() => {
    const complete = completeShifts.length;
    const incomplete = incompleteReadings.length;
    const totalVolumeReduction = completeShifts.reduce((sum, r) => sum + (r.volumeReduction || 0), 0);
    const totalCapacity = completeShifts.reduce((sum, r) => sum + (r.tank?.capacity || 0), 0);
    const avgUtilization = complete > 0 ? 
      completeShifts.reduce((sum, r) => {
        const util = calculateUtilization(r.endVolume, r.tank?.capacity);
        return sum + util;
      }, 0) / complete : 0;
    
    return { complete, incomplete, totalVolumeReduction, totalCapacity, avgUtilization };
  }, [completeShifts, incompleteReadings]);

  // Calculate duration between two dates
  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedRecord) return null;
    
    const record = selectedRecord;
    
    return (
      <Modal
        title={
          <Space>
            <DatabaseOutlined />
            <span>Tank Reading Details</span>
            <Tag color={record.isComplete ? 'green' : 'orange'}>
              {record.isComplete ? 'Complete Shift' : `Incomplete (${record.readingType})`}
            </Tag>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Shift Number" span={2}>
            <Text strong>#{record.shiftNumber || record.shift?.shiftNumber || 'N/A'}</Text>
          </Descriptions.Item>
          
          <Descriptions.Item label="Station">
            {record.stationName || record.station?.name || 'N/A'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Tank">
            {record.tankName || record.tank?.asset?.name || 'N/A'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Product">
            <Tag color={record.product?.fuelCode === 'PMS' ? 'green' : 'blue'}>
              {record.productName || record.product?.name || 'N/A'}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="Tank Capacity">
            {record.tank?.capacity ? `${record.tank.capacity} L` : 'N/A'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Status">
            <Badge 
              status={record.isComplete ? 'success' : 'warning'} 
              text={record.isComplete ? 'Complete Shift' : `Incomplete (${record.readingType})`}
            />
          </Descriptions.Item>
          
          {record.isComplete ? (
            <>
              <Descriptions.Item label="Start Volume">
                <Space direction="vertical" size={0}>
                  <Text strong>{record.startVolume?.toFixed(2)} L</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Dip: {record.startDip?.toFixed(2)} m
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {calculateUtilization(record.startVolume, record.tank?.capacity).toFixed(1)}% utilization
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="End Volume">
                <Space direction="vertical" size={0}>
                  <Text strong>{record.endVolume?.toFixed(2)} L</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Dip: {record.endDip?.toFixed(2)} m
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {calculateUtilization(record.endVolume, record.tank?.capacity).toFixed(1)}% utilization
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Volume Reduction">
                <Text strong type="success">
                  {record.volumeReduction?.toFixed(2)} L
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Dip reduction: {record.dipReduction?.toFixed(2)} m
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Temperature">
                <Space>
                  <FireTwoTone />
                  <Text>
                    {record.startTemp?.toFixed(1)}°C → {record.endTemp?.toFixed(1)}°C
                  </Text>
                  <Text type={record.tempChange > 0 ? "danger" : "success"}>
                    (Δ {record.tempChange?.toFixed(1)}°C)
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Water Level">
                <Text type={record.endWater > 0 ? "danger" : "secondary"}>
                  {record.startWater?.toFixed(2)} m → {record.endWater?.toFixed(2)} m
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Density">
                <Text>
                  {record.startDensity?.toFixed(3)} → {record.endDensity?.toFixed(3)}
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Duration">
                {calculateDuration(record.startRecordedAt, record.endRecordedAt)}
              </Descriptions.Item>
              
              <Descriptions.Item label="Recorded By">
                {record.recordedBy ? 
                  `${record.recordedBy.firstName} ${record.recordedBy.lastName} (${record.recordedBy.email})` : 
                  'System'
                }
              </Descriptions.Item>
            </>
          ) : (
            <>
              <Descriptions.Item label="Reading Type">
                <Tag color={record.readingType === 'START' ? 'blue' : 'green'}>
                  {record.readingType}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Volume">
                <Text strong>{record.volume?.toFixed(2)} L</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {calculateUtilization(record.volume, record.capacity).toFixed(1)}% utilization
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Dip Value">
                <Text>{record.dipValue?.toFixed(2)} m</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Temperature">
                <Space>
                  <FireTwoTone />
                  <Text>{record.temperature?.toFixed(1)}°C</Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Water Level">
                <Text type={record.waterLevel > 0 ? "danger" : "secondary"}>
                  {record.waterLevel?.toFixed(2)} m
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Density">
                <Text>{record.density?.toFixed(3)}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Recorded At">
                {formatDate(record.recordedAt, true)}
              </Descriptions.Item>
              
              <Descriptions.Item label="Recorded By">
                {record.recordedBy ? 
                  `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
                  'System'
                }
              </Descriptions.Item>
              
              <Descriptions.Item label="Verified">
                <Badge status={record.isVerified ? 'success' : 'default'} text={record.isVerified ? 'Yes' : 'No'} />
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Modal>
    );
  };

  return (
    <div className="space-y-3">
      {/* Statistics Alert */}
      <Alert
        message={
          <Space size="large" wrap>
            <Text>
              <ShopOutlined /> <strong>Complete Shifts:</strong> {stats.complete}
            </Text>
            <Text>
              <ExclamationCircleOutlined /> <strong>Incomplete Readings:</strong> {stats.incomplete}
            </Text>
            <Text>
              <DatabaseOutlined /> <strong>Total Reduction:</strong> {stats.totalVolumeReduction.toFixed(2)} L
            </Text>
            <Text>
              <DatabaseOutlined /> <strong>Total Capacity:</strong> {stats.totalCapacity.toFixed(0)} L
            </Text>
            <Text>
              <CheckCircleOutlined /> <strong>Avg Utilization:</strong> {stats.avgUtilization.toFixed(1)}%
            </Text>
          </Space>
        }
        type="info"
        showIcon
        action={
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={handleGenerateReport}
            disabled={displayData.length === 0}
          >
            Generate Report
          </Button>
        }
      />

      {/* Filters */}
      {showFilters && (
        <Card size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={6}>
              <Search
                placeholder="Search shift, tank, station..."
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
            <Col xs={24} sm={10}>
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
                <Button
                  icon={<FileTextOutlined />}
                  onClick={handleGenerateReport}
                  disabled={displayData.length === 0}
                  size="small"
                >
                  Report
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
        rowKey="id"
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
        summary={() => {
          if (displayData.length === 0) return null;
          
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>TOTAL ({displayData.length} records)</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} colSpan={3}>
                  <Text type="secondary">
                    Complete: {stats.complete} | Incomplete: {stats.incomplete}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={3}>
                  <Text type="secondary">
                    Total Reduction: {stats.totalVolumeReduction.toFixed(2)} L | 
                    Avg Utilization: {stats.avgUtilization.toFixed(1)}%
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Report Generator Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Tank Readings Report Generator</span>
            <Tag color="blue">{displayData.length} records</Tag>
          </Space>
        }
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          setReportConfig(null);
        }}
        width="90%"
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
      >
        {reportConfig && (
          <div style={{ padding: '20px 0' }}>
            <AdvancedReportGenerator
              key={`tank-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={(format) => {
                console.log(`✅ Tank report generated as ${format}`);
                message.success(`Tank readings report generated as ${format}`);
              }}
              onSettingsSave={(settings) => {
                console.log('Report settings saved:', settings);
              }}
            />
            
            <Divider />
            
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button 
                onClick={() => {
                  setReportModalVisible(false);
                  setReportConfig(null);
                }}
              >
                Close
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TankReadingsList;