// src/components/dashboards/common/debtTransfer/components/reports/DebtAgingReport.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Button,
  DatePicker,
  Select,
  Space,
  Progress,
  Alert
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const { Option } = Select;

const DebtAgingReport = () => {
  const { state } = useApp();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('json');

  const loadReport = async () => {
    setLoading(true);
    try {
      const report = await debtTransferService.getDebtAgingReport(format);
      setReportData(report);
    } catch (error) {
      console.error('Failed to load debt aging report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [format]);

  const getAgingBucketColor = (bucket) => {
    const colors = {
      current: 'green',
      days31_60: 'blue',
      days61_90: 'orange',
      over90: 'red'
    };
    return colors[bucket] || 'default';
  };

  const getAgingBucketLabel = (bucket) => {
    const labels = {
      current: 'Current (0-30 days)',
      days31_60: '31-60 Days',
      days61_90: '61-90 Days',
      over90: 'Over 90 Days'
    };
    return labels[bucket] || bucket;
  };

  const columns = [
    {
      title: 'Debtor Name',
      dataIndex: 'debtorName',
      key: 'debtorName',
      width: 150,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <small style={{ color: '#666' }}>{record.debtorCode}</small>
        </div>
      )
    },
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 120
    },
    {
      title: 'Current Debt',
      dataIndex: 'currentDebt',
      key: 'currentDebt',
      width: 120,
      render: (amount) => (
        <strong style={{ color: '#1890ff' }}>
          KES {amount?.toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Age (Days)',
      dataIndex: 'ageInDays',
      key: 'ageInDays',
      width: 100,
      render: (days) => (
        <Tag color={days > 90 ? 'red' : days > 60 ? 'orange' : days > 30 ? 'blue' : 'green'}>
          {days} days
        </Tag>
      )
    },
    {
      title: 'Aging Bucket',
      dataIndex: 'agingBucket',
      key: 'agingBucket',
      width: 120,
      render: (bucket) => (
        <Tag color={getAgingBucketColor(bucket)}>
          {getAgingBucketLabel(bucket)}
        </Tag>
      )
    },
    {
      title: 'Oldest Transaction',
      dataIndex: 'oldestTransactionDate',
      key: 'oldestTransactionDate',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    }
  ];

  const handleExport = () => {
    // Implement export functionality
    console.log('Export report');
  };

  // Mock data for demonstration
  const mockReport = {
    generatedAt: new Date().toISOString(),
    totalOutstandingDebt: 245000,
    totalDebtors: 15,
    agingBuckets: {
      current: 85000,
      days31_60: 65000,
      days61_90: 45000,
      over90: 50000
    },
    agingDetails: [
      {
        debtorId: '1',
        debtorName: 'John Doe',
        debtorCode: 'D001',
        stationName: 'Nairobi Station',
        currentDebt: 15000,
        ageInDays: 25,
        agingBucket: 'current',
        oldestTransactionDate: new Date().toISOString()
      },
      {
        debtorId: '2',
        debtorName: 'Jane Smith',
        debtorCode: 'D002',
        stationName: 'Mombasa Station',
        currentDebt: 35000,
        ageInDays: 75,
        agingBucket: 'days61_90',
        oldestTransactionDate: new Date().toISOString()
      }
    ]
  };

  const totalDebt = mockReport.totalOutstandingDebt;
  const agingBuckets = mockReport.agingBuckets;

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          Debt Aging Report
        </Space>
      }
      extra={
        <Space>
          <Select
            value={format}
            onChange={setFormat}
            style={{ width: 120 }}
          >
            <Option value="json">View</Option>
            <Option value="csv">CSV</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />}
            onClick={loadReport}
            loading={loading}
          >
            Refresh
          </Button>
          <Button 
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Space>
      }
      loading={loading}
    >
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Outstanding Debt"
              value={totalDebt}
              prefix="KES"
              valueStyle={{ color: '#ff4d4f' }}
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Debtors"
              value={mockReport.totalDebtors}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Average Debt Age"
              value={45}
              suffix="days"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Overdue (>90 days)"
              value={agingBuckets.over90}
              prefix="KES"
              valueStyle={{ color: '#ff4d4f' }}
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      {/* Aging Bucket Progress */}
      <Card size="small" title="Debt Aging Distribution" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {Object.entries(agingBuckets).map(([bucket, amount]) => {
            const percentage = totalDebt > 0 ? (amount / totalDebt) * 100 : 0;
            return (
              <Col span={6} key={bucket}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={getAgingBucketColor(bucket)}>
                      {getAgingBucketLabel(bucket)}
                    </Tag>
                  </div>
                  <Progress
                    type="circle"
                    percent={Math.round(percentage)}
                    width={80}
                    strokeColor={getAgingBucketColor(bucket)}
                    format={() => (
                      <div style={{ fontSize: '12px' }}>
                        KES {(amount / 1000).toFixed(0)}K
                      </div>
                    )}
                  />
                  <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                    {Math.round(percentage)}% of total
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* High Risk Alert */}
      {agingBuckets.over90 > 0 && (
        <Alert
          message="High-Risk Debt Detected"
          description={`KES ${agingBuckets.over90.toLocaleString()} in debts are over 90 days old. Consider aggressive collection efforts or write-offs.`}
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Aging Details Table */}
      <Table
        columns={columns}
        dataSource={mockReport.agingDetails}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
        rowKey="debtorId"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>KES {totalDebt.toLocaleString()}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={3} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* Report Footer */}
      <div style={{ 
        marginTop: 16, 
        padding: '8px 16px', 
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Report generated: {new Date(mockReport.generatedAt).toLocaleString()}
      </div>
    </Card>
  );
};

export default DebtAgingReport;