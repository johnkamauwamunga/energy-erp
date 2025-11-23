// src/components/dashboards/common/debtTransfer/components/reports/SettlementActivityReport.jsx
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
  Alert,
  Timeline
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  TransactionOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const { RangePicker } = DatePicker;
const { Option } = Select;

const SettlementActivityReport = () => {
  const { state } = useApp();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [format, setFormat] = useState('json');

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = {
        format,
        startDate: dateRange[0]?.toISOString(),
        endDate: dateRange[1]?.toISOString()
      };
      
      const report = await debtTransferService.getSettlementActivityReport(params);
      setReportData(report);
    } catch (error) {
      console.error('Failed to load settlement activity report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [format, dateRange]);

  const getTransferCategoryColor = (category) => {
    const colors = {
      DEBT_SETTLEMENT: 'green',
      DEBT_TRANSFER: 'blue',
      ELECTRONIC_SETTLEMENT: 'purple',
      CROSS_STATION: 'orange'
    };
    return colors[category] || 'default';
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount) => (
        <strong style={{ color: '#52c41a' }}>
          KES {amount?.toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Debtor',
      dataIndex: 'debtorName',
      key: 'debtorName',
      width: 120
    },
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 100
    },
    {
      title: 'Recorded By',
      dataIndex: 'recordedBy',
      key: 'recordedBy',
      width: 120
    },
    {
      title: 'Category',
      dataIndex: 'transferCategory',
      key: 'transferCategory',
      width: 120,
      render: (category) => (
        <Tag color={getTransferCategoryColor(category)}>
          {category?.replace(/_/g, ' ')}
        </Tag>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    }
  ];

  const handleExport = () => {
    // Implement export functionality
    console.log('Export report');
  };

  // Mock data for demonstration
  const mockReport = {
    period: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    },
    totalSettlements: 45,
    totalAmount: 1250000,
    settlements: [
      {
        id: '1',
        date: new Date().toISOString(),
        amount: 50000,
        debtorName: 'John Doe',
        stationName: 'Nairobi Station',
        recordedBy: 'Jane Manager',
        transferCategory: 'CASH_SETTLEMENT',
        description: 'Cash payment - Receipt #123'
      },
      {
        id: '2',
        date: new Date().toISOString(),
        amount: 75000,
        debtorName: 'ABC Suppliers',
        stationName: 'Mombasa Station',
        recordedBy: 'John Attendant',
        transferCategory: 'BANK_SETTLEMENT',
        description: 'Bank transfer - Ref #456'
      }
    ]
  };

  const calculateDailyAverage = () => {
    const days = 30; // Default to 30 days
    return mockReport.totalAmount / days;
  };

  const getTopSettlements = () => {
    return [...mockReport.settlements]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const getCategoryBreakdown = () => {
    const categories = {};
    mockReport.settlements.forEach(settlement => {
      const category = settlement.transferCategory;
      categories[category] = (categories[category] || 0) + settlement.amount;
    });
    return categories;
  };

  return (
    <Card
      title={
        <Space>
          <TransactionOutlined />
          Settlement Activity Report
        </Space>
      }
      extra={
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 240 }}
          />
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
              title="Total Settlements"
              value={mockReport.totalSettlements}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Amount"
              value={mockReport.totalAmount}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Daily Average"
              value={calculateDailyAverage()}
              prefix="KES"
              valueStyle={{ color: '#faad14' }}
              formatter={value => Math.round(value).toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Avg Settlement"
              value={mockReport.totalAmount / mockReport.totalSettlements}
              prefix="KES"
              valueStyle={{ color: '#722ed1' }}
              formatter={value => Math.round(value).toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          {/* Settlements Table */}
          <Card 
            title="Recent Settlements" 
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Table
              columns={columns}
              dataSource={mockReport.settlements}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              rowKey="id"
              size="small"
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Top Settlements */}
          <Card 
            title="Top 5 Settlements" 
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Timeline>
              {getTopSettlements().map((settlement, index) => (
                <Timeline.Item
                  key={settlement.id}
                  color={index === 0 ? 'green' : 'blue'}
                >
                  <div>
                    <strong>KES {settlement.amount.toLocaleString()}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {settlement.debtorName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {new Date(settlement.date).toLocaleDateString()}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          {/* Category Breakdown */}
          <Card title="By Category" size="small">
            {Object.entries(getCategoryBreakdown()).map(([category, amount]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}>
                  <span style={{ fontSize: '12px' }}>
                    {category.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    KES {amount.toLocaleString()}
                  </span>
                </div>
                <Progress
                  percent={Math.round((amount / mockReport.totalAmount) * 100)}
                  size="small"
                  strokeColor={getTransferCategoryColor(category)}
                  showInfo={false}
                />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Card title="Performance Metrics" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <RiseOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {mockReport.totalSettlements}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Transactions This Period
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <BarChartOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                KES {calculateDailyAverage().toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Daily Collection Rate
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <FallOutlined style={{ fontSize: 24, color: '#ff4d4f', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                12%
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Reduction in Old Debt
              </div>
            </div>
          </Col>
        </Row>
      </Card>

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
        Period: {new Date(mockReport.period.startDate).toLocaleDateString()} - {new Date(mockReport.period.endDate).toLocaleDateString()}
      </div>
    </Card>
  );
};

export default SettlementActivityReport;