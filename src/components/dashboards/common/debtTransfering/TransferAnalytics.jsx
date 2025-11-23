// src/components/dashboards/common/debtTransfer/TransferAnalytics.jsx
import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Alert,
  List,
  Typography,
  Tag,
  Progress,
  Empty
} from 'antd';
import {
  TransactionOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../services/debtTransferService/debtTransferService';

const { Title, Text } = Typography;

const TransferAnalytics = ({ transactions }) => {
  // Add proper error handling and null checks
  let metrics = null;
  let insights = null;
  
  try {
    if (debtTransferService.calculateSettlementMetrics) {
      metrics = debtTransferService.calculateSettlementMetrics({ transactions });
    }
    if (debtTransferService.generateSettlementInsights) {
      insights = debtTransferService.generateSettlementInsights({}, { transactions });
    }
  } catch (error) {
    console.error('Error in analytics service calls:', error);
    return (
      <Alert
        message="Error Loading Analytics"
        description="There was an error loading the analytics data. Please try again later."
        type="error"
        showIcon
      />
    );
  }

  // Check if metrics is valid and has data
  if (!metrics || !transactions || transactions.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No transaction data available for analytics"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Settlements"
              value={metrics.totalSettlements || 0}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Amount"
              value={metrics.totalAmount || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Settlement"
              value={metrics.averageSettlement || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Settlement Type Breakdown */}
      {metrics.settlementsByType && Object.keys(metrics.settlementsByType).length > 0 && (
        <Card title="Settlement Type Distribution" size="small">
          <Row gutter={[16, 16]}>
            {Object.entries(metrics.settlementsByType).map(([type, amount]) => {
              const totalAmount = metrics.totalAmount || 1; // Avoid division by zero
              const percentage = ((amount / totalAmount) * 100).toFixed(1);
              return (
                <Col xs={24} sm={8} key={type}>
                  <Card size="small">
                    <div className="space-y-2">
                      <Text strong>{type}</Text>
                      <Progress 
                        percent={parseFloat(percentage) || 0} 
                        size="small"
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                      />
                      <Text type="secondary">
                        KES {(amount || 0).toLocaleString()} ({percentage}%)
                      </Text>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* Insights & Recommendations */}
      {insights && insights.insights && insights.insights.length > 0 && (
        <Card title="Insights & Recommendations" size="small">
          <List
            dataSource={insights.insights}
            renderItem={(insight, index) => (
              <List.Item key={index}>
                <Alert
                  message={insight.title || 'Insight'}
                  description={
                    <div>
                      <Text>{insight.message || ''}</Text>
                      {insight.suggestion && (
                        <>
                          <br />
                          <Text type="secondary">
                            <strong>Suggestion:</strong> {insight.suggestion}
                          </Text>
                        </>
                      )}
                    </div>
                  }
                  type={insight.severity || 'info'}
                  showIcon
                  style={{ width: '100%' }}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Health Score */}
      {insights && insights.healthScore !== undefined && insights.healthScore !== null && (
        <Card title="Collection Health Score" size="small">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8}>
              <Progress
                type="circle"
                percent={Math.min(Math.max(insights.healthScore || 0, 0), 100)}
                format={percent => `${percent}%`}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '50%': '#faad14',
                  '100%': '#52c41a',
                }}
              />
            </Col>
            <Col xs={24} sm={16}>
              <div className="space-y-2">
                <Title level={5}>Recommendation</Title>
                <Text>{insights.recommendation || 'No specific recommendations available.'}</Text>
                <br />
                <br />
                <Title level={5}>Settlement Efficiency</Title>
                <Text>
                  {(insights.analysis?.settlementEfficiency?.toFixed(1) || '0')}% of debt is being collected
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default TransferAnalytics;