// src/components/dashboards/common/wetStock/ReconciliationList.jsx
import React, { useState, useMemo } from 'react';
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
  Progress,
  Modal,
  Descriptions,
  Divider,
  Collapse,
  Statistic,
  List,
  Avatar,
  Alert
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  DashboardOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ShopOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import {Fuel, AlertTriangle, CheckCircle} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const ReconciliationList = ({ 
  reconciliations, 
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);

  // Process reconciliations with sequential numbering
  const processedReconciliations = useMemo(() => {
    return reconciliations.map((recon, index) => ({
      ...recon,
      sequence: index + 1,
      formattedDate: formatDate(recon.recordedAt, true),
      stationName: recon.shift?.station?.name || 'N/A',
      shiftNumber: recon.shift?.shiftNumber || 'N/A',
      supervisorName: recon.shift?.supervisor ? 
        `${recon.shift.supervisor.firstName} ${recon.shift.supervisor.lastName}` : 
        'N/A',
      recordedByDisplay: recon.recordedBy ? 
        `${recon.recordedBy.firstName} ${recon.recordedBy.lastName}` : 
        'System',
      totalTanks: recon.tankReconciliations?.length || 0
    }));
  }, [reconciliations]);

  // Filter handlers
  const handleSearch = (value) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleSeverityChange = (value) => {
    onFiltersChange({ ...filters, severity: value });
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

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'orange',
      IN_PROGRESS: 'blue',
      COMPLETED: 'green',
      DISCREPANCY: 'red',
      RESOLVED: 'cyan'
    };
    return colors[status] || 'default';
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = {
      NORMAL: 'green',
      WARNING: 'orange',
      CRITICAL: 'red'
    };
    return colors[severity] || 'default';
  };

  // Export data preparation
  const prepareExportData = () => {
    return processedReconciliations.map(recon => {
      const baseData = {
        '#': recon.sequence,
        'Reconciliation ID': recon.id,
        'Recorded At': recon.formattedDate,
        'Shift Number': recon.shiftNumber,
        'Station': recon.stationName,
        'Supervisor': recon.supervisorName,
        'Status': recon.status?.replace(/_/g, ' '),
        'Severity': recon.severity,
        'Total Tanks': recon.totalTanks,
        'Recorded By': recon.recordedByDisplay,
        'Tolerance': `${recon.tolerancePercentage}%`,
        'Resolved At': recon.resolvedAt ? formatDate(recon.resolvedAt, true) : 'Not Resolved'
      };

      // Add tank details if available
      if (recon.tankReconciliations && recon.tankReconciliations.length > 0) {
        recon.tankReconciliations.forEach((tankRec, index) => {
          baseData[`Tank ${index + 1}`] = tankRec.tank?.asset?.name || 'N/A';
          baseData[`Tank ${index + 1} Product`] = tankRec.tank?.product?.name || 'N/A';
          baseData[`Tank ${index + 1} Opening`] = `${parseFloat(tankRec.openingVolume).toFixed(2)} L`;
          baseData[`Tank ${index + 1} Closing`] = `${parseFloat(tankRec.closingVolume).toFixed(2)} L`;
          baseData[`Tank ${index + 1} Reduction`] = `${parseFloat(tankRec.tankReduction).toFixed(2)} L`;
          baseData[`Tank ${index + 1} Dispensed`] = `${parseFloat(tankRec.totalPumpDispensed).toFixed(2)} L`;
          baseData[`Tank ${index + 1} Variance`] = `${parseFloat(tankRec.variance).toFixed(2)} L`;
          baseData[`Tank ${index + 1} Variance %`] = `${tankRec.variancePercentage.toFixed(2)}%`;
          baseData[`Tank ${index + 1} Severity`] = tankRec.severity;
        });
      }

      return {
        ...baseData,
        'Total Pump Dispensed': `${recon.totalPumpDispensed?.toFixed(2)} L`,
        'Total Tank Reduction': `${recon.totalTankReduction?.toFixed(2)} L`,
        'Total Variance': `${recon.totalVariance?.toFixed(2)} L`,
        'Variance Percentage': `${recon.variancePercentage?.toFixed(2)}%`,
        'Notes': recon.notes || 'No notes'
      };
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
        title: 'Recorded At',
        dataIndex: 'Recorded At',
        key: 'recordedAt',
        width: 150,
        type: 'datetime'
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
        title: 'Status',
        dataIndex: 'Status',
        key: 'status',
        width: 100,
        type: 'status'
      },
      {
        title: 'Severity',
        dataIndex: 'Severity',
        key: 'severity',
        width: 100,
        type: 'status'
      }
    ];

    const tankColumns = [];
    // Add tank columns for up to 3 tanks (to keep export manageable)
    for (let i = 1; i <= 3; i++) {
      tankColumns.push(
        {
          title: `Tank ${i}`,
          dataIndex: `Tank ${i}`,
          key: `tank${i}`,
          width: 100,
          type: 'text'
        },
        {
          title: `Variance ${i}`,
          dataIndex: `Tank ${i} Variance`,
          key: `variance${i}`,
          width: 100,
          type: 'number'
        }
      );
    }

    return [
      ...baseColumns,
      ...tankColumns,
      {
        title: 'Total Variance',
        dataIndex: 'Total Variance',
        key: 'totalVariance',
        width: 120,
        type: 'number'
      },
      {
        title: 'Variance %',
        dataIndex: 'Variance Percentage',
        key: 'variancePercentage',
        width: 100,
        type: 'percentage'
      },
      {
        title: 'Recorded By',
        dataIndex: 'Recorded By',
        key: 'recordedBy',
        width: 150,
        type: 'text'
      }
    ];
  };

  // Calculate summary data
  const calculateSummaryData = () => {
    const totalRecords = processedReconciliations.length;
    const normalCount = processedReconciliations.filter(r => r.severity === 'NORMAL').length;
    const warningCount = processedReconciliations.filter(r => r.severity === 'WARNING').length;
    const criticalCount = processedReconciliations.filter(r => r.severity === 'CRITICAL').length;
    const completedCount = processedReconciliations.filter(r => r.status === 'COMPLETED').length;
    
    const totalPumpDispensed = processedReconciliations.reduce((sum, r) => sum + (r.totalPumpDispensed || 0), 0);
    const totalTankReduction = processedReconciliations.reduce((sum, r) => sum + (r.totalTankReduction || 0), 0);
    const totalVariance = processedReconciliations.reduce((sum, r) => sum + Math.abs(r.totalVariance || 0), 0);
    const avgVariancePercentage = totalRecords > 0 ? 
      processedReconciliations.reduce((sum, r) => sum + Math.abs(r.variancePercentage || 0), 0) / totalRecords : 0;
    
    return {
      'Total Reconciliations': totalRecords,
      'Normal Severity': normalCount,
      'Warning Severity': warningCount,
      'Critical Severity': criticalCount,
      'Completed': completedCount,
      'Total Pump Dispensed': `${totalPumpDispensed.toFixed(2)} L`,
      'Total Tank Reduction': `${totalTankReduction.toFixed(2)} L`,
      'Total Absolute Variance': `${totalVariance.toFixed(2)} L`,
      'Average Variance %': `${avgVariancePercentage.toFixed(2)}%`,
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
      title: `Wet Stock Reconciliation Report - ${currentStation?.name || currentCompany?.name || 'System'}`,
      fileName: `reconciliations_${new Date().toISOString().split('T')[0]}`,
      reportType: 'audit',
      companyName: currentCompany?.name || "Lynx Energy System",
      stationInfo: currentStation ? {
        name: currentStation.name,
        code: currentStation.code,
        address: currentStation.location
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | Station: ${currentStation?.name || 'All'} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      requireApproval: true,
      enableAuditTrail: true
    };

    setReportConfig(config);
    setReportModalVisible(true);
  };

  const handleViewDetails = (reconciliation) => {
    setSelectedReconciliation(reconciliation);
    setDetailModalVisible(true);
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 500);
  };

  // Reconciliation columns for table display
  const columns = [
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
      title: 'Recorded At',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (date) => formatDate(date, true),
      width: 150,
      sorter: (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
    },
    {
      title: 'Shift',
      key: 'shift',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>
            #{record.shift?.shiftNumber || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {record.shift?.station?.name || 'N/A'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.replace(/_/g, ' ')}
        </Tag>
      ),
      width: 120,
      filters: [
        { text: 'Pending', value: 'PENDING' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Completed', value: 'COMPLETED' },
        { text: 'Discrepancy', value: 'DISCREPANCY' },
        { text: 'Resolved', value: 'RESOLVED' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Badge 
          status={getSeverityColor(severity)} 
          text={severity}
        />
      ),
      width: 100,
      filters: [
        { text: 'Normal', value: 'NORMAL' },
        { text: 'Warning', value: 'WARNING' },
        { text: 'Critical', value: 'CRITICAL' }
      ],
      onFilter: (value, record) => record.severity === value
    },
    {
      title: 'Pump Dispensed',
      dataIndex: 'totalPumpDispensed',
      key: 'totalPumpDispensed',
      render: (value) => (
        <Text strong>
          {value ? `${value.toFixed(2)} L` : 'N/A'}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => (a.totalPumpDispensed || 0) - (b.totalPumpDispensed || 0)
    },
    {
      title: 'Tank Reduction',
      dataIndex: 'totalTankReduction',
      key: 'totalTankReduction',
      render: (value) => (
        <Text>
          {value ? `${value.toFixed(2)} L` : 'N/A'}
        </Text>
      ),
      width: 120,
      sorter: (a, b) => (a.totalTankReduction || 0) - (b.totalTankReduction || 0)
    },
    {
      title: 'Variance',
      dataIndex: 'totalVariance',
      key: 'totalVariance',
      render: (value) => {
        const absValue = Math.abs(value || 0);
        const isPositive = (value || 0) >= 0;
        
        return (
          <Space>
            {isPositive ? <CheckCircle style={{ color: '#52c41a', width: 14 }} /> : 
                         <AlertTriangle style={{ color: '#ff4d4f', width: 14 }} />}
            <Text strong type={absValue > 0 ? 'danger' : 'success'}>
              {value ? `${value.toFixed(2)} L` : '0.00 L'}
            </Text>
          </Space>
        );
      },
      width: 120,
      sorter: (a, b) => Math.abs(a.totalVariance || 0) - Math.abs(b.totalVariance || 0)
    },
    {
      title: 'Variance %',
      dataIndex: 'variancePercentage',
      key: 'variancePercentage',
      render: (percentage) => {
        const absPercentage = Math.abs(percentage || 0);
        const tolerance = 0.5; // Default tolerance
        
        return (
          <Progress 
            percent={Math.min(absPercentage, 100)} 
            size="small"
            status={
              absPercentage <= tolerance ? 'success' :
              absPercentage <= tolerance * 2 ? 'normal' : 'exception'
            }
            format={percent => `${percent.toFixed(1)}%`}
          />
        );
      },
      width: 120,
      sorter: (a, b) => Math.abs(a.variancePercentage || 0) - Math.abs(b.variancePercentage || 0)
    },
    {
      title: 'Tanks',
      key: 'tankCount',
      width: 80,
      render: (_, record) => (
        <Badge 
          count={record.tankReconciliations?.length || 0} 
          style={{ backgroundColor: '#1890ff' }}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Detailed Report">
            <Button 
              type="primary" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            >
              View
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  // Statistics
  const stats = useMemo(() => {
    const total = processedReconciliations.length;
    const normal = processedReconciliations.filter(r => r.severity === 'NORMAL').length;
    const warning = processedReconciliations.filter(r => r.severity === 'WARNING').length;
    const critical = processedReconciliations.filter(r => r.severity === 'CRITICAL').length;
    const totalVariance = processedReconciliations.reduce((sum, r) => sum + Math.abs(r.totalVariance || 0), 0);
    const avgVariance = total > 0 ? totalVariance / total : 0;
    
    return { total, normal, warning, critical, totalVariance, avgVariance };
  }, [processedReconciliations]);

  // Detailed View Modal
  const renderDetailModal = () => {
    if (!selectedReconciliation) return null;

    const recon = selectedReconciliation;
    const shift = recon.shift;
    const station = shift?.station;
    const company = station?.company;

    return (
      <Modal
        title={
          <Space>
            <DashboardOutlined />
            <span>Reconciliation Details</span>
            <Tag color={getSeverityColor(recon.severity)}>
              {recon.severity}
            </Tag>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1200}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Report
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div className={printMode ? "print-mode" : ""}>
          {/* Header Section */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Total Pump Dispensed"
                  value={recon.totalPumpDispensed}
                  suffix="L"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total Tank Reduction"
                  value={recon.totalTankReduction}
                  suffix="L"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total Variance"
                  value={recon.totalVariance}
                  suffix="L"
                  valueStyle={{ 
                    color: Math.abs(recon.totalVariance) > 0 ? '#ff4d4f' : '#52c41a' 
                  }}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Statistic
                  title="Variance Percentage"
                  value={Math.abs(recon.variancePercentage)}
                  suffix="%"
                  valueStyle={{ 
                    color: Math.abs(recon.variancePercentage) > recon.tolerancePercentage ? '#ff4d4f' : '#52c41a' 
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Tolerance"
                  value={recon.tolerancePercentage}
                  suffix="%"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Basic Information */}
          <Collapse defaultActiveKey={['basic', 'tanks']}>
            <Panel header="Basic Information" key="basic">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Reconciliation ID">
                  {recon.id}
                </Descriptions.Item>
                <Descriptions.Item label="Sequence #">
                  <Badge count={recon.sequence} style={{ backgroundColor: '#1890ff' }} />
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(recon.status)}>
                    {recon.status?.replace(/_/g, ' ')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <Badge 
                    status={getSeverityColor(recon.severity)} 
                    text={recon.severity}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Recorded At">
                  {formatDate(recon.recordedAt, true)}
                </Descriptions.Item>
                <Descriptions.Item label="Recorded By">
                  {recon.recordedBy ? 
                    `${recon.recordedBy.firstName} ${recon.recordedBy.lastName} (${recon.recordedBy.email})` : 
                    'System'
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Resolved At">
                  {recon.resolvedAt ? formatDate(recon.resolvedAt, true) : 'Not Resolved'}
                </Descriptions.Item>
                <Descriptions.Item label="Tolerance">
                  {recon.tolerancePercentage}%
                </Descriptions.Item>
                <Descriptions.Item label="Notes" span={2}>
                  {recon.notes || 'No notes'}
                </Descriptions.Item>
              </Descriptions>
            </Panel>

            {/* Shift Information */}
            <Panel header="Shift Information" key="shift">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Shift Number">
                  <Text strong>#{shift?.shiftNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Shift Status">
                  <Tag color={shift?.status === 'CLOSED' ? 'green' : 'orange'}>
                    {shift?.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Start Time">
                  {formatDate(shift?.startTime, true)}
                </Descriptions.Item>
                <Descriptions.Item label="End Time">
                  {formatDate(shift?.endTime, true)}
                </Descriptions.Item>
                <Descriptions.Item label="Supervisor">
                  {shift?.supervisor ? 
                    `${shift.supervisor.firstName} ${shift.supervisor.lastName} (${shift.supervisor.email})` : 
                    'N/A'
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Start Verified At">
                  {shift?.startVerifiedAt ? formatDate(shift.startVerifiedAt, true) : 'Not Verified'}
                </Descriptions.Item>
                <Descriptions.Item label="End Verified At">
                  {shift?.endVerifiedAt ? formatDate(shift.endVerifiedAt, true) : 'Not Verified'}
                </Descriptions.Item>
                <Descriptions.Item label="Station">
                  {station?.name} ({station?.location})
                </Descriptions.Item>
                <Descriptions.Item label="Company">
                  {company?.name}
                </Descriptions.Item>
              </Descriptions>
            </Panel>

            {/* Tank Reconciliations */}
            <Panel header={`Tank Reconciliations (${recon.tankReconciliations?.length || 0})`} key="tanks">
              {recon.tankReconciliations?.map((tankRec, index) => {
                const tank = tankRec.tank;
                const product = tank?.product;
                const varianceAbs = Math.abs(parseFloat(tankRec.variance));
                const variancePct = Math.abs(tankRec.variancePercentage);
                
                return (
                  <Card 
                    key={tankRec.id}
                    title={
                      <Space>
                        <Fuel />
                        <span>
                          Tank #{index + 1}: {tank?.asset?.name || 'Unknown Tank'}
                        </span>
                        <Tag color={getSeverityColor(tankRec.severity)}>
                          {tankRec.severity}
                        </Tag>
                        <Tag color={tankRec.isWithinTolerance ? 'green' : 'red'}>
                          {tankRec.isWithinTolerance ? 'Within Tolerance' : 'Outside Tolerance'}
                        </Tag>
                      </Space>
                    }
                    style={{ marginBottom: 16 }}
                    size="small"
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Descriptions bordered column={1} size="small">
                          <Descriptions.Item label="Product">
                            <Space>
                              {product?.colorCode && (
                                <div 
                                  style={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: product.colorCode,
                                    borderRadius: '50%'
                                  }}
                                />
                              )}
                              <Text strong>{product?.name} ({product?.fuelCode})</Text>
                            </Space>
                          </Descriptions.Item>
                          <Descriptions.Item label="Opening Volume">
                            <Text strong>{parseFloat(tankRec.openingVolume).toFixed(2)} L</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Closing Volume">
                            <Text strong>{parseFloat(tankRec.closingVolume).toFixed(2)} L</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Tank Reduction">
                            <Text type="success">
                              {parseFloat(tankRec.tankReduction).toFixed(2)} L
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Total Pump Dispensed">
                            <Text>{parseFloat(tankRec.totalPumpDispensed).toFixed(2)} L</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Adjusted Reduction">
                            <Text type="secondary">
                              {parseFloat(tankRec.adjustedReduction).toFixed(2)} L
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col span={12}>
                        <Descriptions bordered column={1} size="small">
                          <Descriptions.Item label="Variance">
                            <Space>
                              {parseFloat(tankRec.variance) >= 0 ? 
                                <CheckCircle style={{ color: '#52c41a', width: 14 }} /> : 
                                <AlertTriangle style={{ color: '#ff4d4f', width: 14 }} />}
                              <Text 
                                strong 
                                type={varianceAbs > 0 ? 'danger' : 'success'}
                              >
                                {parseFloat(tankRec.variance).toFixed(2)} L
                              </Text>
                            </Space>
                          </Descriptions.Item>
                          <Descriptions.Item label="Variance Percentage">
                            <Progress 
                              percent={Math.min(variancePct, 100)} 
                              size="small"
                              status={variancePct > tankRec.tolerancePercentage ? 'exception' : 'success'}
                              format={percent => `${variancePct.toFixed(2)}%`}
                            />
                          </Descriptions.Item>
                          <Descriptions.Item label="Tolerance">
                            {tankRec.tolerancePercentage}%
                          </Descriptions.Item>
                          <Descriptions.Item label="Temperature">
                            {tankRec.avgTemperature}°C
                          </Descriptions.Item>
                          <Descriptions.Item label="Water Level">
                            {parseFloat(tankRec.waterLevel).toFixed(2)} m
                          </Descriptions.Item>
                          <Descriptions.Item label="Temp Correction Factor">
                            {tankRec.tempCorrectionFactor}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                    </Row>

                    {/* Connected Pumps */}
                    {tankRec.connectedPumps && tankRec.connectedPumps.length > 0 && (
                      <>
                        <Divider orientation="left">
                          Connected Pumps ({tankRec.connectedPumps.length})
                        </Divider>
                        <List
                          size="small"
                          dataSource={tankRec.connectedPumps || []}
                          renderItem={(pump, pumpIndex) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={<Fuel />}
                                title={`Pump ${pumpIndex + 1}`}
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text>Island: {pump.islandCode || 'N/A'}</Text>
                                    <Text strong>Liters Dispensed: {pump.litersDispensed} L</Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </>
                    )}

                    {/* Tank Specifications */}
                    <Divider orientation="left">Tank Specifications</Divider>
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Tank Capacity">
                        {tank?.capacity} L
                      </Descriptions.Item>
                      <Descriptions.Item label="Current Volume">
                        {tank?.currentVolume} L
                      </Descriptions.Item>
                      <Descriptions.Item label="Current Mass">
                        {tank?.currentMass} kg
                      </Descriptions.Item>
                      <Descriptions.Item label="Dead Stock">
                        {tank?.deadStock} L
                      </Descriptions.Item>
                      <Descriptions.Item label="Working Capacity">
                        {tank?.workingCapacity || 'N/A'} L
                      </Descriptions.Item>
                      <Descriptions.Item label="Tank Status">
                        <Tag color={tank?.asset?.status === 'REGISTERED' ? 'green' : 'orange'}>
                          {tank?.asset?.status}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                );
              })}
            </Panel>
          </Collapse>
        </div>
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
              <SafetyCertificateOutlined /> <strong>Total Reconciliations:</strong> {stats.total}
            </Text>
            <Text>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> <strong>Normal:</strong> {stats.normal}
            </Text>
            <Text>
              <ExclamationCircleOutlined style={{ color: '#faad14' }} /> <strong>Warning:</strong> {stats.warning}
            </Text>
            <Text>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> <strong>Critical:</strong> {stats.critical}
            </Text>
            <Text>
              <DashboardOutlined /> <strong>Total Variance:</strong> {stats.totalVariance.toFixed(2)} L
            </Text>
            <Text>
              <ShopOutlined /> <strong>Avg Variance:</strong> {stats.avgVariance.toFixed(2)} L
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
            disabled={processedReconciliations.length === 0}
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
                placeholder="Search shift, station..."
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                allowClear
              />
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Status"
                value={filters.status}
                onChange={handleStatusChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="PENDING">Pending</Option>
                <Option value="IN_PROGRESS">In Progress</Option>
                <Option value="COMPLETED">Completed</Option>
                <Option value="DISCREPANCY">Discrepancy</Option>
                <Option value="RESOLVED">Resolved</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Severity"
                value={filters.severity}
                onChange={handleSeverityChange}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="NORMAL">Normal</Option>
                <Option value="WARNING">Warning</Option>
                <Option value="CRITICAL">Critical</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateChange}
                placeholder={['Start Date', 'End Date']}
              />
            </Col>
            <Col xs={24} sm={6}>
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
                  disabled={processedReconciliations.length === 0}
                  size="small"
                >
                  Report
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Reconciliations Table */}
      <Table
        columns={columns}
        dataSource={processedReconciliations}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} reconciliations`
        }}
        size="small"
        scroll={{ x: 1300 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0} colSpan={4}>
                <Text strong>TOTAL ({processedReconciliations.length} reconciliations)</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={3}>
                <Text type="secondary">
                  Normal: {stats.normal} | Warning: {stats.warning} | Critical: {stats.critical}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={4}>
                <Text type="secondary">
                  Total Variance: {stats.totalVariance.toFixed(2)} L | 
                  Avg Variance: {stats.avgVariance.toFixed(2)} L
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Report Generator Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Reconciliation Report Generator</span>
            <Tag color="blue">{processedReconciliations.length} records</Tag>
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
              key={`reconciliation-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={(format) => {
                console.log(`✅ Reconciliation report generated as ${format}`);
                message.success(`Reconciliation report generated as ${format}`);
              }}
              onSettingsSave={(settings) => {
                console.log('Report settings saved:', settings);
              }}
              onReportApprove={(approvalData) => {
                console.log('Report approved:', approvalData);
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

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .ant-modal-body {
            padding: 0;
          }
          .ant-modal-footer {
            display: none;
          }
          .print-mode {
            font-size: 12px;
          }
          .print-mode .ant-card {
            margin-bottom: 8px;
          }
          .print-mode .ant-collapse-item {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default ReconciliationList;