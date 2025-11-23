// src/components/dashboards/common/debtTransfer/components/reports/CompanyDebtorsSummary.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Button,
  Progress,
  Space,
  Alert,
  List,
  Avatar
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  TeamOutlined,
  BankOutlined,
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const CompanyDebtorsSummary = () => {
  const { state } = useApp();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const summary = await debtTransferService.getCompanyDebtorsSummary();
      setSummaryData(summary);
    } catch (error) {
      console.error('Failed to load company debtors summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleExport = () => {
    // Implement export functionality
    console.log('Export summary');
  };

  // Mock data for demonstration
  const mockSummary = {
    totalActiveDebtors: 25,
    totalOutstandingDebt: 2450000,
    averageDebtPerDebtor: 98000,
    stationBreakdown: [
      {
        stationId: '1',
        stationName: 'Nairobi Station',
        totalDebt: 1200000,
        debtorCount: 12
      },
      {
        stationId: '2',
        stationName: 'Mombasa Station',
        totalDebt: 850000,
        debtorCount: 8
      },
      {
        stationId: '3',
        stationName: 'Kisumu Station',
        totalDebt: 400000,
        debtorCount: 5
      }
    ],
    categoryBreakdown: [
      {
        categoryId: '1',
        categoryName: 'Corporate Clients',
        isPaymentProcessor: false,
        debtorCount: 8
      },
      {
        categoryId: '2',
        categoryName: 'Individual Customers',
        isPaymentProcessor: false,
        debtorCount: 12
      },
      {
        categoryId: '3',
        categoryName: 'M-Pesa',
        isPaymentProcessor: true,
        debtorCount: 1
      },
      {
        categoryId: '4',
        categoryName: 'Bank Transfer',
        isPaymentProcessor: true,
        debtorCount: 1
      }
    ]
  };

  const getStationProgressColor = (percentage) => {
    if (percentage > 60) return '#ff4d4f';
    if (percentage > 30) return '#faad14';
    return '#52c41a';
  };

  const stationColumns = [
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 150,
      render: (text) => (
        <Space>
          <ShopOutlined />
          {text}
        </Space>
      )
    },
    {
      title: 'Debtors',
      dataIndex: 'debtorCount',
      key: 'debtorCount',
      width: 100,
      render: (count) => (
        <Tag color="blue">{count} debtors</Tag>
      )
    },
    {
      title: 'Total Debt',
      dataIndex: 'totalDebt',
      key: 'totalDebt',
      width: 120,
      render: (amount) => (
        <strong style={{ color: '#ff4d4f' }}>
          KES {amount?.toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Share of Total',
      key: 'percentage',
      width: 200,
      render: (_, record) => {
        const percentage = (record.totalDebt / mockSummary.totalOutstandingDebt) * 100;
        return (
          <Progress
            percent={Math.round(percentage)}
            strokeColor={getStationProgressColor(percentage)}
            size="small"
            format={percent => `${percent}%`}
          />
        );
      }
    },
    {
      title: 'Avg per Debtor',
      key: 'average',
      width: 120,
      render: (_, record) => (
        <span style={{ color: '#666' }}>
          KES {Math.round(record.totalDebt / record.debtorCount).toLocaleString()}
        </span>
      )
    }
  ];

  const categoryColumns = [
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 150,
      render: (text, record) => (
        <Space>
          {record.isPaymentProcessor ? (
            <BankOutlined style={{ color: '#52c41a' }} />
          ) : (
            <TeamOutlined />
          )}
          {text}
          {record.isPaymentProcessor && (
            <Tag color="green" size="small">Payment Method</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Debtors',
      dataIndex: 'debtorCount',
      key: 'debtorCount',
      width: 100,
      render: (count) => `${count} debtors`
    },
    {
      title: 'Percentage',
      key: 'percentage',
      width: 150,
      render: (_, record) => {
        const percentage = (record.debtorCount / mockSummary.totalActiveDebtors) * 100;
        return (
          <Progress
            percent={Math.round(percentage)}
            size="small"
            format={percent => `${percent}%`}
          />
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Active Debtors"
              value={mockSummary.totalActiveDebtors}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Outstanding Debt"
              value={mockSummary.totalOutstandingDebt}
              prefix="KES"
              valueStyle={{ color: '#ff4d4f' }}
              formatter={value => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Debt per Debtor"
              value={mockSummary.averageDebtPerDebtPerDebtor}
              prefix="KES"
              valueStyle={{ color: '#faad14' }}
              formatter={value => Math.round(value).toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Payment Methods"
              value={mockSummary.categoryBreakdown.filter(c => c.isPaymentProcessor).length}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Debt Concentration Alert */}
      <Alert
        message="Debt Concentration Analysis"
        description="Monitor stations with high debt concentrations to manage risk effectively."
        type="info"
        showIcon
      />

      <Row gutter={16}>
        <Col span={12}>
          {/* Station Breakdown */}
          <Card 
            title="Debt by Station" 
            extra={
              <Button 
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleExport}
              >
                Export
              </Button>
            }
            loading={loading}
          >
            <Table
              columns={stationColumns}
              dataSource={mockSummary.stationBreakdown}
              pagination={false}
              size="small"
              rowKey="stationId"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <strong>Total</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Tag color="blue">
                        {mockSummary.totalActiveDebtors} debtors
                      </Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong>KES {mockSummary.totalOutstandingDebt.toLocaleString()}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <Progress percent={100} size="small" status="active" />
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <span style={{ color: '#666' }}>
                        KES {Math.round(mockSummary.averageDebtPerDebtor).toLocaleString()}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col span={12}>
          {/* Category Breakdown */}
          <Card 
            title="Debtors by Category"
            loading={loading}
          >
            <Table
              columns={categoryColumns}
              dataSource={mockSummary.categoryBreakdown}
              pagination={false}
              size="small"
              rowKey="categoryId"
            />

            {/* Quick Stats */}
            <Card 
              title="Quick Stats" 
              size="small" 
              style={{ marginTop: 16 }}
            >
              <List
                size="small"
                dataSource={[
                  `Highest debt station: ${mockSummary.stationBreakdown[0]?.stationName} (KES ${mockSummary.stationBreakdown[0]?.totalDebt.toLocaleString()})`,
                  `Most common category: ${mockSummary.categoryBreakdown[0]?.categoryName} (${mockSummary.categoryBreakdown[0]?.debtorCount} debtors)`,
                  `Payment processors: ${mockSummary.categoryBreakdown.filter(c => c.isPaymentProcessor).length} available`,
                  `Debt distribution: ${Math.round((mockSummary.stationBreakdown[0]?.totalDebt / mockSummary.totalOutstandingDebt) * 100)}% in top station`
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar size="small" icon={<TeamOutlined />} />}
                      description={item}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Card>
        </Col>
      </Row>

      {/* Risk Assessment */}
      <Card title="Risk Assessment" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                color: '#ff4d4f',
                marginBottom: 8
              }}>
                <ArrowUpOutlined />
              </div>
              <div style={{ fontWeight: 'bold' }}>High Risk</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {mockSummary.stationBreakdown.filter(s => 
                  (s.totalDebt / mockSummary.totalOutstandingDebt) > 0.4
                ).length} stations
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                color: '#faad14',
                marginBottom: 8
              }}>
                <ArrowUpOutlined />
              </div>
              <div style={{ fontWeight: 'bold' }}>Medium Risk</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {mockSummary.stationBreakdown.filter(s => 
                  (s.totalDebt / mockSummary.totalOutstandingDebt) > 0.2 && 
                  (s.totalDebt / mockSummary.totalOutstandingDebt) <= 0.4
                ).length} stations
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                color: '#52c41a',
                marginBottom: 8
              }}>
                <ArrowDownOutlined />
              </div>
              <div style={{ fontWeight: 'bold' }}>Low Risk</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {mockSummary.stationBreakdown.filter(s => 
                  (s.totalDebt / mockSummary.totalOutstandingDebt) <= 0.2
                ).length} stations
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default CompanyDebtorsSummary;