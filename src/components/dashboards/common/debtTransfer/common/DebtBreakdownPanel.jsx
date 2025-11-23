// src/components/dashboards/common/debtTransfer/components/common/DebtBreakdownPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Progress,
  Space,
  Button,
  Statistic,
  Row,
  Col,
  Alert,
  Empty
} from 'antd';
import {
  ShopOutlined,
  DollarOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';

const DebtBreakdownPanel = ({ debtorId, companyId }) => {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadBreakdown = async () => {
    if (!debtorId) return;
    
    setLoading(true);
    try {
      const data = await debtTransferService.getDebtorDebtBreakdown(debtorId, companyId);
      setBreakdown(data);
    } catch (error) {
      console.error('Failed to load debt breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBreakdown();
  }, [debtorId, companyId]);

  // Calculate concentration warning
  const renderConcentrationWarning = () => {
    if (!breakdown || !breakdown.stationDebts || breakdown.stationDebts.length <= 1) {
      return null;
    }

    const highestStation = breakdown.stationDebts.reduce((max, station) => 
      station.currentDebt > max.currentDebt ? station : max
    );
    const concentration = (highestStation.currentDebt / breakdown.totalDebt) * 100;
    
    if (concentration > 60) {
      return (
        <Alert
          message="High Debt Concentration"
          description={`${highestStation.stationName} accounts for ${Math.round(concentration)}% of total debt. Consider reallocating payments.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    
    return null;
  };

  const columns = [
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
      title: 'Current Debt',
      dataIndex: 'currentDebt',
      key: 'currentDebt',
      width: 120,
      render: (amount) => (
        <strong style={{ color: amount > 0 ? '#ff4d4f' : '#52c41a' }}>
          KES {amount?.toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Share of Total',
      key: 'percentage',
      width: 200,
      render: (_, record) => {
        if (!breakdown || breakdown.totalDebt === 0) return null;
        
        const percentage = (record.currentDebt / breakdown.totalDebt) * 100;
        return (
          <Progress
            percent={Math.round(percentage)}
            size="small"
            strokeColor={percentage > 50 ? '#ff4d4f' : percentage > 20 ? '#faad14' : '#52c41a'}
            format={percent => `${percent}%`}
          />
        );
      }
    },
    {
      title: 'Oldest Debt',
      dataIndex: 'oldestTransactionDate',
      key: 'oldestTransactionDate',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Transactions',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 100,
      render: (count) => (
        <Tag color="blue">{count} records</Tag>
      )
    }
  ];

  if (!debtorId) {
    return (
      <Card title="Debt Breakdown">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select a debtor to view debt breakdown"
        />
      </Card>
    );
  }

  // Mock data for demonstration
  const mockBreakdown = {
    debtorId: '1',
    debtorName: 'John Doe',
    debtorCode: 'D001',
    totalDebt: 65000,
    hasMultipleStations: true,
    stationDebts: [
      {
        stationId: '1',
        stationName: 'Nairobi Station',
        currentDebt: 35000,
        oldestTransactionDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        transactionCount: 8
      },
      {
        stationId: '2',
        stationName: 'Mombasa Station',
        currentDebt: 20000,
        oldestTransactionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        transactionCount: 5
      },
      {
        stationId: '3',
        stationName: 'Kisumu Station',
        currentDebt: 10000,
        oldestTransactionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        transactionCount: 3
      }
    ]
  };

  const displayData = breakdown || mockBreakdown;
  const stationDebts = displayData.stationDebts || [];
  const totalDebt = displayData.totalDebt || 0;

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          Debt Breakdown by Station
          {displayData.hasMultipleStations && (
            <Tag color="orange">Multiple Stations</Tag>
          )}
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />}
          onClick={loadBreakdown}
          loading={loading}
          size="small"
        >
          Refresh
        </Button>
      }
      loading={loading}
    >
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="Total Outstanding Debt"
            value={totalDebt}
            prefix="KES"
            valueStyle={{ color: '#ff4d4f' }}
            formatter={value => value.toLocaleString()}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Stations with Debt"
            value={stationDebts.length}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Average per Station"
            value={stationDebts.length > 0 ? totalDebt / stationDebts.length : 0}
            prefix="KES"
            valueStyle={{ color: '#faad14' }}
            formatter={value => Math.round(value).toLocaleString()}
          />
        </Col>
      </Row>

      {/* Concentration Warning */}
      {renderConcentrationWarning()}

      {/* Stations Table */}
      <Table
        columns={columns}
        dataSource={stationDebts}
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
                <strong style={{ color: '#ff4d4f' }}>
                  KES {totalDebt.toLocaleString()}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <Progress percent={100} size="small" status="active" />
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={2}>
                <Space>
                  <CalendarOutlined />
                  Across {stationDebts.length} stations
                </Space>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* Allocation Recommendations */}
      {displayData.hasMultipleStations && (
        <Alert
          message="Payment Allocation"
          description="When making payments, consider using cross-station settlement to allocate funds across multiple stations efficiently."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default DebtBreakdownPanel;