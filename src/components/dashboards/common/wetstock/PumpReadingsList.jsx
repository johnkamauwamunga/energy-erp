// src/components/dashboards/common/wetStock/PumpReadingsList.jsx
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
  Statistic,
  Descriptions,
  Divider,
  message
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
  DollarOutlined,
  DashboardOutlined,
  CarOutlined
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PumpReadingsList = ({ 
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

  // Process and group readings by shift and pump
  const { completeShifts, incompleteReadings } = useMemo(() => {
    if (!readings || readings.length === 0) {
      return { completeShifts: [], incompleteReadings: [] };
    }

    const groups = {};
    const incomplete = [];
    
    // Group by shiftId and pumpId
    readings.forEach(reading => {
      const key = `${reading.shiftId}_${reading.pumpId}`;
      
      if (!groups[key]) {
        groups[key] = {
          shiftId: reading.shiftId,
          pumpId: reading.pumpId,
          pump: reading.pump,
          shift: reading.shift,
          startReading: null,
          endReading: null,
          station: reading.pump?.asset?.station,
          product: reading.pump?.tank?.product,
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
        const litersDispensed = group.endReading.litersDispensed || 
                               (group.endReading.electricMeter - group.startReading.electricMeter);
        const salesValue = group.endReading.salesValue || 
                          (litersDispensed * (group.endReading.unitPrice || 0));
        
        complete.push({
          ...group,
          id: `complete_${index}`,
          sequence: index + 1,
          isComplete: true,
          litersDispensed: litersDispensed || 0,
          salesValue: salesValue || 0,
          startMeter: group.startReading.electricMeter,
          endMeter: group.endReading.electricMeter,
          startRecordedAt: group.startReading.recordedAt,
          endRecordedAt: group.endReading.recordedAt,
          startVerified: group.startReading.isVerified || false,
          endVerified: group.endReading.isVerified || false
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
            pumpName: group.pump?.asset?.name,
            stationName: group.station?.name,
            productName: group.product?.name,
            shiftNumber: group.shift?.shiftNumber
          });
        }
        if (group.endReading) {
          incomplete.push({
            ...group.endReading,
            id: `incomplete_end_${group.endReading.id}`,
            sequence: incomplete.length + 1,
            isComplete: false,
            readingType: 'END',
            pumpName: group.pump?.asset?.name,
            stationName: group.station?.name,
            productName: group.product?.name,
            shiftNumber: group.shift?.shiftNumber
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

  // Export data preparation
  const prepareExportData = () => {
    return displayData.map(item => {
      const baseData = {
        '#': item.sequence,
        'Shift Number': item.shiftNumber || item.shift?.shiftNumber || 'N/A',
        'Station': item.stationName || item.station?.name || 'N/A',
        'Pump': item.pumpName || item.pump?.asset?.name || 'N/A',
        'Product': item.productName || item.product?.name || 'N/A',
        'Status': item.isComplete ? 'Complete Shift' : `Incomplete (${item.readingType})`,
        'Recorded By': item.recordedBy ? 
          `${item.recordedBy.firstName} ${item.recordedBy.lastName}` : 
          item.recordedById || 'System',
        'Recorded At': formatDate(item.isComplete ? item.endRecordedAt : item.recordedAt, true)
      };

      if (item.isComplete) {
        return {
          ...baseData,
          'Start Meter': item.startMeter?.toLocaleString(),
          'End Meter': item.endMeter?.toLocaleString(),
          'Liters Dispensed': `${item.litersDispensed?.toFixed(2)} L`,
          'Sales Value': formatCurrency(item.salesValue),
          'Unit Price': formatCurrency(item.endReading?.unitPrice || 0),
          'Start Time': formatDate(item.startRecordedAt, true),
          'End Time': formatDate(item.endRecordedAt, true),
          'Start Verified': item.startVerified ? 'Yes' : 'No',
          'End Verified': item.endVerified ? 'Yes' : 'No'
        };
      } else {
        return {
          ...baseData,
          'Reading Type': item.readingType,
          'Electric Meter': item.electricMeter?.toLocaleString(),
          'Manual Meter': item.manualMeter?.toLocaleString(),
          'Cash Meter': item.cashMeter?.toLocaleString(),
          'Liters': item.litersDispensed ? `${item.litersDispensed} L` : 'N/A',
          'Sales': item.salesValue ? formatCurrency(item.salesValue) : 'N/A',
          'Unit Price': item.unitPrice ? formatCurrency(item.unitPrice) : 'N/A',
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
        title: 'Pump',
        dataIndex: 'Pump',
        key: 'pump',
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
        title: 'Start Meter',
        dataIndex: 'Start Meter',
        key: 'startMeter',
        width: 100,
        type: 'number'
      },
      {
        title: 'End Meter',
        dataIndex: 'End Meter',
        key: 'endMeter',
        width: 100,
        type: 'number'
      },
      {
        title: 'Liters Dispensed',
        dataIndex: 'Liters Dispensed',
        key: 'litersDispensed',
        width: 120,
        type: 'number'
      },
      {
        title: 'Sales Value',
        dataIndex: 'Sales Value',
        key: 'salesValue',
        width: 120,
        type: 'currency'
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
        title: 'Electric Meter',
        dataIndex: 'Electric Meter',
        key: 'electricMeter',
        width: 100,
        type: 'number'
      },
      {
        title: 'Liters',
        dataIndex: 'Liters',
        key: 'liters',
        width: 80,
        type: 'number'
      },
      {
        title: 'Sales',
        dataIndex: 'Sales',
        key: 'sales',
        width: 100,
        type: 'currency'
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
    const totalLiters = completeShifts.reduce((sum, shift) => sum + (shift.litersDispensed || 0), 0);
    const totalSales = completeShifts.reduce((sum, shift) => sum + (shift.salesValue || 0), 0);
    const avgLitersPerShift = totalComplete > 0 ? totalLiters / totalComplete : 0;
    
    return {
      'Total Records': displayData.length,
      'Complete Shifts': totalComplete,
      'Incomplete Readings': totalIncomplete,
      'Total Liters Dispensed': `${totalLiters.toFixed(2)} L`,
      'Total Sales Value': formatCurrency(totalSales),
      'Average Liters per Shift': `${avgLitersPerShift.toFixed(2)} L`,
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
      title: `Pump Meter Readings Report - ${currentStation?.name || currentCompany?.name || 'System'}`,
      fileName: `pump_readings_${new Date().toISOString().split('T')[0]}`,
      reportType: 'finance',
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

  // Handle report completion
  const handleReportComplete = (format) => {
    message.success(`Pump readings report generated successfully as ${format.toUpperCase()}!`);
    setReportModalVisible(false);
    setReportConfig(null);
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
      title: 'Shift',
      key: 'shift',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            #{record.shift?.shiftNumber || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {formatDate(record.endRecordedAt, 'date')}
          </Text>
        </Space>
      )
    },
    {
      title: 'Station & Pump',
      key: 'stationPump',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            {record.station?.name || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Pump: {record.pump?.asset?.name || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Product',
      key: 'product',
      width: 120,
      render: (_, record) => (
        <Tag color="blue">
          {record.product?.name || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Meter Readings',
      key: 'meterReadings',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '11px' }}>
            <Text type="secondary">Start:</Text> {record.startMeter?.toLocaleString() || 'N/A'}
          </Text>
          <Text style={{ fontSize: '11px' }}>
            <Text type="secondary">End:</Text> {record.endMeter?.toLocaleString() || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Dispensed',
      key: 'dispensed',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong type="success" style={{ fontSize: '12px' }}>
            {record.litersDispensed?.toFixed(2)} L
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {formatCurrency(record.salesValue)}
          </Text>
        </Space>
      )
    },
    {
      title: 'Time',
      key: 'time',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px' }}>
            End: {formatDate(record.endRecordedAt, 'time')}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Duration: {calculateDuration(record.startRecordedAt, record.endRecordedAt)}
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
      title: 'Shift',
      key: 'shift',
      width: 100,
      render: (_, record) => (
        <Text strong style={{ fontSize: '12px' }}>
          #{record.shiftNumber || 'N/A'}
        </Text>
      )
    },
    {
      title: 'Station & Pump',
      key: 'stationPump',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            {record.stationName || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Pump: {record.pumpName || 'N/A'}
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
      title: 'Meter Reading',
      key: 'meterReading',
      width: 120,
      render: (_, record) => (
        <Text strong style={{ fontSize: '12px' }}>
          {record.electricMeter?.toLocaleString() || 'N/A'}
        </Text>
      )
    },
    {
      title: 'Recorded At',
      key: 'recordedAt',
      width: 150,
      render: (_, record) => formatDate(record.recordedAt, true)
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      width: 120,
      render: (_, record) => (
        <Text style={{ fontSize: '11px' }}>
          {record.recordedBy ? 
            `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
            'System'
          }
        </Text>
      )
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
        title: 'Station & Pump',
        key: 'stationPump',
        width: 180,
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '12px' }}>
              {record.stationName || record.station?.name || 'N/A'}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Pump: {record.pumpName || record.pump?.asset?.name || 'N/A'}
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
        title: 'Reading',
        key: 'reading',
        width: 150,
        render: (_, record) => {
          if (record.isComplete) {
            return (
              <Space direction="vertical" size={0}>
                <Text style={{ fontSize: '11px' }}>
                  <Text type="secondary">Start:</Text> {record.startMeter?.toLocaleString()}
                </Text>
                <Text style={{ fontSize: '11px' }}>
                  <Text type="secondary">End:</Text> {record.endMeter?.toLocaleString()}
                </Text>
              </Space>
            );
          }
          return (
            <Text strong style={{ fontSize: '12px' }}>
              {record.electricMeter?.toLocaleString() || 'N/A'}
            </Text>
          );
        }
      },
      {
        title: 'Liters',
        key: 'liters',
        width: 100,
        render: (_, record) => {
          if (record.isComplete) {
            return (
              <Text strong type="success" style={{ fontSize: '12px' }}>
                {record.litersDispensed?.toFixed(2)} L
              </Text>
            );
          }
          return (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.litersDispensed ? `${record.litersDispensed} L` : 'N/A'}
            </Text>
          );
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
    const totalLiters = completeShifts.reduce((sum, r) => sum + (r.litersDispensed || 0), 0);
    const totalSales = completeShifts.reduce((sum, r) => sum + (r.salesValue || 0), 0);
    const avgLiters = complete > 0 ? totalLiters / complete : 0;
    
    return { complete, incomplete, totalLiters, totalSales, avgLiters };
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
            <CarOutlined />
            <span>Pump Reading Details</span>
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
          
          <Descriptions.Item label="Pump">
            {record.pumpName || record.pump?.asset?.name || 'N/A'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Product">
            <Tag color="blue">
              {record.productName || record.product?.name || 'N/A'}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="Status">
            <Badge 
              status={record.isComplete ? 'success' : 'warning'} 
              text={record.isComplete ? 'Complete Shift' : `Incomplete (${record.readingType})`}
            />
          </Descriptions.Item>
          
          {record.isComplete ? (
            <>
              <Descriptions.Item label="Start Reading">
                <Space direction="vertical" size={0}>
                  <Text strong>{record.startMeter?.toLocaleString() || 'N/A'}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatDate(record.startRecordedAt, true)}
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="End Reading">
                <Space direction="vertical" size={0}>
                  <Text strong>{record.endMeter?.toLocaleString() || 'N/A'}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatDate(record.endRecordedAt, true)}
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Liters Dispensed">
                <Text strong type="success">
                  {record.litersDispensed?.toFixed(2)} L
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Sales Value">
                <Text strong>
                  {formatCurrency(record.salesValue)}
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
              
              <Descriptions.Item label="Electric Meter">
                <Text strong>{record.electricMeter?.toLocaleString() || 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Manual Meter">
                <Text>{record.manualMeter?.toLocaleString() || 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Cash Meter">
                <Text>{record.cashMeter?.toLocaleString() || 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Liters Dispensed">
                <Text>{record.litersDispensed ? `${record.litersDispensed} L` : 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Sales Value">
                <Text>{record.salesValue ? formatCurrency(record.salesValue) : 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Unit Price">
                <Text>{record.unitPrice ? formatCurrency(record.unitPrice) : 'N/A'}</Text>
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
              <CarOutlined /> <strong>Total Liters:</strong> {stats.totalLiters.toFixed(2)} L
            </Text>
            <Text>
              <DollarOutlined /> <strong>Total Sales:</strong> {formatCurrency(stats.totalSales)}
            </Text>
            <Text>
              <CheckCircleOutlined /> <strong>Avg per Shift:</strong> {stats.avgLiters.toFixed(2)} L
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
                placeholder="Search shift, pump, station..."
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
        scroll={{ x: 1200 }}
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
                    Total Liters: {stats.totalLiters.toFixed(2)} L | 
                    Total Sales: {formatCurrency(stats.totalSales)}
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
            <span>Pump Readings Report Generator</span>
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
              key={`pump-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={handleReportComplete}
              onSettingsSave={(settings) => {
                console.log('Report settings saved:', settings);
                message.success('Report settings saved successfully!');
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

export default PumpReadingsList;