// src/components/dashboards/common/wetStock/ReconciliationList.jsx
import React, { useState } from 'react';
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
  Avatar
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import {Fuel} from 'lucide-react'
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
  currentStation
}) => {
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [printMode, setPrintMode] = useState(false);

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

  // Enhanced reconciliations data for reporting
  const enhancedReconciliations = reconciliations.map(reconciliation => ({
    ...reconciliation,
    formattedDate: formatDate(reconciliation.recordedAt, true),
    formattedTotalPumpDispensed: `${reconciliation.totalPumpDispensed.toFixed(2)} L`,
    formattedTotalTankReduction: `${reconciliation.totalTankReduction.toFixed(2)} L`,
    formattedTotalVariance: `${reconciliation.totalVariance.toFixed(2)} L`,
    formattedVariancePercentage: `${reconciliation.variancePercentage.toFixed(2)}%`,
    stationName: reconciliation.shift?.station?.name || 'N/A',
    shiftNumber: reconciliation.shift?.shiftNumber || 'N/A',
    supervisorName: reconciliation.shift?.supervisor ? 
      `${reconciliation.shift.supervisor.firstName} ${reconciliation.shift.supervisor.lastName}` : 
      'N/A',
    recordedByDisplay: reconciliation.recordedBy ? 
      `${reconciliation.recordedBy.firstName} ${reconciliation.recordedBy.lastName}` : 
      'System'
  }));

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
          </Card>

          {/* Basic Information */}
          <Collapse defaultActiveKey={['basic', 'tanks']}>
            <Panel header="Basic Information" key="basic">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Reconciliation ID">
                  {recon.id}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(recon.status)}>
                    {recon.status?.replace(/_/g, ' ')}
                  </Tag>
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
                <Descriptions.Item label="Tolerance Percentage">
                  {recon.tolerancePercentage}%
                </Descriptions.Item>
                <Descriptions.Item label="Variance Percentage" span={2}>
                  <Progress 
                    percent={Math.min(Math.abs(recon.variancePercentage), 100)} 
                    status={
                      Math.abs(recon.variancePercentage) <= recon.tolerancePercentage ? 'success' :
                      Math.abs(recon.variancePercentage) <= recon.tolerancePercentage * 2 ? 'normal' : 'exception'
                    }
                    format={percent => `${recon.variancePercentage.toFixed(2)}%`}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Notes" span={2}>
                  {recon.notes || 'No notes'}
                </Descriptions.Item>
              </Descriptions>
            </Panel>

            {/* Shift Information */}
            <Panel header="Shift Information" key="shift">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Shift ID">
                  {shift?.id}
                </Descriptions.Item>
                <Descriptions.Item label="Shift Number">
                  {shift?.shiftNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Start Time">
                  {formatDate(shift?.startTime, true)}
                </Descriptions.Item>
                <Descriptions.Item label="End Time">
                  {formatDate(shift?.endTime, true)}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={shift?.status === 'CLOSED' ? 'green' : 'orange'}>
                    {shift?.status}
                  </Tag>
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
              </Descriptions>
            </Panel>

            {/* Station & Company */}
            <Panel header="Station & Company Information" key="station">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Station Name">
                  {station?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Station Location">
                  {station?.location}
                </Descriptions.Item>
                <Descriptions.Item label="Station ID">
                  {station?.id}
                </Descriptions.Item>
                <Descriptions.Item label="Company">
                  {company?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Company Contact">
                  {company?.contactEmail} | {company?.phoneNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Company Address">
                  {company?.address}
                </Descriptions.Item>
              </Descriptions>
            </Panel>

            {/* Tank Reconciliations */}
            <Panel header={`Tank Reconciliations (${recon.tankReconciliations?.length || 0})`} key="tanks">
              {recon.tankReconciliations?.map((tankRec, index) => (
                <Card 
                  key={tankRec.id}
                  title={
                    <Space>
                      <Fuel />
                      <span>Tank: {tankRec.tank?.asset?.name}</span>
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
                            <div 
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor: tankRec.tank?.product?.colorCode || '#ccc',
                                borderRadius: '50%'
                              }}
                            />
                            {tankRec.tank?.product?.name} ({tankRec.tank?.product?.fuelCode})
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Opening Volume">
                          {parseFloat(tankRec.openingVolume).toFixed(2)} L
                        </Descriptions.Item>
                        <Descriptions.Item label="Closing Volume">
                          {parseFloat(tankRec.closingVolume).toFixed(2)} L
                        </Descriptions.Item>
                        <Descriptions.Item label="Tank Reduction">
                          {parseFloat(tankRec.tankReduction).toFixed(2)} L
                        </Descriptions.Item>
                        <Descriptions.Item label="Adjusted Reduction">
                          {parseFloat(tankRec.adjustedReduction).toFixed(2)} L
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Pump Dispensed">
                          {parseFloat(tankRec.totalPumpDispensed).toFixed(2)} L
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={12}>
                      <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Variance">
                          <Text 
                            strong 
                            type={Math.abs(parseFloat(tankRec.variance)) > 0 ? 'danger' : 'success'}
                          >
                            {parseFloat(tankRec.variance).toFixed(2)} L
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Variance Percentage">
                          <Text 
                            type={Math.abs(tankRec.variancePercentage) > tankRec.tolerancePercentage ? 'danger' : 'success'}
                          >
                            {tankRec.variancePercentage.toFixed(2)}%
                          </Text>
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
                        <Descriptions.Item label="Tolerance">
                          {tankRec.tolerancePercentage}%
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>

                  {/* Connected Pumps */}
                  <Divider orientation="left">Connected Pumps ({tankRec.connectedPumps?.length || 0})</Divider>
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
                              

                              <Text strong>Liters Dispensed: {pump.litersDispensed} L</Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />

                  {/* Tank Details */}
                  <Divider orientation="left">Tank Specifications</Divider>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Tank Capacity">
                      {tankRec.tank?.capacity} L
                    </Descriptions.Item>
                    <Descriptions.Item label="Current Mass">
                      {tankRec.tank?.currentMass} kg
                    </Descriptions.Item>
                    <Descriptions.Item label="Working Capacity">
                      {tankRec.tank?.workingCapacity || 'N/A'} L
                    </Descriptions.Item>
                    <Descriptions.Item label="Dead Stock">
                      {tankRec.tank?.deadStock} L
                    </Descriptions.Item>
                    <Descriptions.Item label="Tank Status">
                      <Tag color={tankRec.tank?.asset?.status === 'REGISTERED' ? 'green' : 'orange'}>
                        {tankRec.tank?.asset?.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Calibration">
                      {tankRec.tank?.lastCalibration ? 
                        formatDate(tankRec.tank.lastCalibration, true) : 'Not Calibrated'
                      }
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ))}
            </Panel>

            {/* Product Information */}
            <Panel header="Product Details" key="product">
              {recon.tankReconciliations?.map((tankRec, index) => (
                <Card 
                  key={tankRec.tank?.product?.id}
                  title={`Product: ${tankRec.tank?.product?.name}`}
                  style={{ marginBottom: 16 }}
                  size="small"
                >
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Product ID">
                      {tankRec.tank?.product?.id}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fuel Code">
                      {tankRec.tank?.product?.fuelCode}
                    </Descriptions.Item>
                    <Descriptions.Item label="Base Cost Price">
                      {formatCurrency(tankRec.tank?.product?.baseCostPrice)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Selling Price">
                      {formatCurrency(tankRec.tank?.product?.minSellingPrice)} - {formatCurrency(tankRec.tank?.product?.maxSellingPrice)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Flash Point">
                      {tankRec.tank?.product?.flashPoint}°C
                    </Descriptions.Item>
                    <Descriptions.Item label="Sulfur Content">
                      {tankRec.tank?.product?.sulfurContent}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Unit">
                      {tankRec.tank?.product?.unit}
                    </Descriptions.Item>
                    <Descriptions.Item label="Color Code">
                      <Space>
                        <div 
                          style={{
                            width: 16,
                            height: 16,
                            backgroundColor: tankRec.tank?.product?.colorCode,
                            border: '1px solid #d9d9d9'
                          }}
                        />
                        {tankRec.tank?.product?.colorCode}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ))}
            </Panel>
          </Collapse>
        </div>
      </Modal>
    );
  };

  // Reconciliation columns for table display
  const columns = [
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
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>#{record.shift?.shiftNumber || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.shift?.station?.name || 'N/A'}
          </Text>
        </Space>
      ),
      width: 120
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
      render: (value) => (
        <Text strong type={Math.abs(value) > 0 ? 'danger' : 'success'}>
          {value ? `${value.toFixed(2)} L` : '0.00 L'}
        </Text>
      ),
      width: 100,
      sorter: (a, b) => Math.abs(a.totalVariance || 0) - Math.abs(b.totalVariance || 0)
    },
    {
      title: 'Variance %',
      dataIndex: 'variancePercentage',
      key: 'variancePercentage',
      render: (percentage) => (
        <Progress 
          percent={Math.min(Math.abs(percentage), 100)} 
          size="small"
          status={
            Math.abs(percentage) <= 0.5 ? 'success' :
            Math.abs(percentage) <= 1.0 ? 'normal' : 'exception'
          }
          format={percent => `${percent.toFixed(1)}%`}
        />
      ),
      width: 120,
      sorter: (a, b) => Math.abs(a.variancePercentage || 0) - Math.abs(b.variancePercentage || 0)
    },
    {
      title: 'Tanks',
      key: 'tankCount',
      render: (_, record) => (
        <Text>
          {record.tankReconciliations?.length || 0}
        </Text>
      ),
      width: 80
    },
    {
      title: 'Recorded By',
      key: 'recordedBy',
      render: (_, record) => (
        <Text>
          {record.recordedBy ? 
            `${record.recordedBy.firstName} ${record.recordedBy.lastName}` : 
            'System'
          }
        </Text>
      ),
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
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

  // Columns for export
  const exportColumns = [
    // ... (keep your existing export columns)
  ];

  return (
    <div className="space-y-3">
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
                <AdvancedReportGenerator
                  dataSource={enhancedReconciliations}
                  columns={exportColumns}
                  title={`Wet Stock Reconciliation Report - ${currentStation ? 'Station' : 'Company'} Level`}
                  fileName={`reconciliations_${new Date().toISOString().split('T')[0]}`}
                  footerText={`Generated from Energy ERP System - ${currentUser ? `User: ${currentUser.firstName} ${currentUser.lastName}` : ''} - ${new Date().toLocaleDateString()}`}
                  showFooter={true}
                />
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Reconciliations Table */}
      <Table
        columns={columns}
        dataSource={reconciliations}
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
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <Text strong>Summary</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>
                  {reconciliations.filter(r => r.severity === 'NORMAL').length} normal
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={6}>
                <Text type="secondary">
                  {reconciliations.length} reconciliations found
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* Detail Modal */}
      {renderDetailModal()}

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