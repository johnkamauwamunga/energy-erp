import React from 'react';
import {
  Card,
  Alert,
  Row,
  Col,
  Statistic,
  Descriptions,
  Table,
  Tag,
  Space,
  Typography,
  Collapse,
  Button
} from 'antd';
import {
  FileTextOutlined,
  CreditCardOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  SyncOutlined,
  TeamOutlined,
  FilterOutlined,
  EyeOutlined,
  BugOutlined,
  CodeOutlined,
  DatabaseOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// Debug component to show what data we're actually receiving
const DebugInfo = ({ closingData, closingPayload, payloadSummary, validation }) => (
  <Collapse 
    ghost 
    size="small" 
    style={{ marginBottom: 16, backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
  >
    <Panel 
      header={
        <Space>
          <BugOutlined style={{ color: '#faad14' }} />
          <Text strong style={{ color: '#856404' }}>Debug Information - Why Submit Might Be Disabled</Text>
        </Space>
      } 
      key="1"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Text strong>closingData:</Text> {!!closingData ? '✅' : '❌'}
          </Col>
          <Col span={6}>
            <Text strong>Pump Readings:</Text> {closingData?.pumpReadings?.length || 0}
          </Col>
          <Col span={6}>
            <Text strong>Tank Readings:</Text> {closingData?.tankReadings?.length || 0}
          </Col>
          <Col span={6}>
            <Text strong>Islands:</Text> {Object.keys(closingData?.islandCollections || {}).length}
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={6}>
            <Text strong>closingPayload:</Text> {!!closingPayload ? '✅' : '❌'}
          </Col>
          <Col span={6}>
            <Text strong>payloadSummary:</Text> {!!payloadSummary ? '✅' : '❌'}
          </Col>
          <Col span={6}>
            <Text strong>Validation:</Text> {validation?.isValid ? '✅' : '❌'}
          </Col>
          <Col span={6}>
            <Text strong>Shift ID:</Text> {closingData?.shiftId ? '✅' : '❌'}
          </Col>
        </Row>

        {/* Validation Details */}
        {!validation.isValid && (
          <Alert
            type="warning"
            message="Validation Failed - This is why submit is disabled"
            description={
              <ul>
                {validation.errors?.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            style={{ width: '100%' }}
          />
        )}

        {/* Data Quality Check */}
        <Card size="small" title="Data Quality Check" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>Pumps with Readings:</Text>{' '}
              <Tag color={closingData?.pumpReadings?.some(p => p.electricMeter > 0) ? 'green' : 'red'}>
                {closingData?.pumpReadings?.filter(p => p.electricMeter > 0).length || 0}
              </Tag>
            </Col>
            <Col span={8}>
              <Text strong>Tanks with Readings:</Text>{' '}
              <Tag color={closingData?.tankReadings?.some(t => t.dipValue > 0) ? 'green' : 'red'}>
                {closingData?.tankReadings?.filter(t => t.dipValue > 0).length || 0}
              </Tag>
            </Col>
            <Col span={8}>
              <Text strong>Islands with Collections:</Text>{' '}
              <Tag color={Object.values(closingData?.islandCollections || {}).some(i => i.cashAmount > 0) ? 'green' : 'red'}>
                {Object.values(closingData?.islandCollections || {}).filter(i => i.cashAmount > 0).length || 0}
              </Tag>
            </Col>
          </Row>
        </Card>

        {/* Raw Data Preview */}
        <div style={{ marginTop: 8 }}>
          <Text strong>Raw closingData Structure:</Text>
          <div style={{ backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, marginTop: 4 }}>
            <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '200px', margin: 0 }}>
              {JSON.stringify({
                shiftId: closingData?.shiftId,
                recordedById: closingData?.recordedById,
                pumpReadings: closingData?.pumpReadings?.map(p => ({
                  pumpId: p.pumpId,
                  electricMeter: p.electricMeter,
                  manualMeter: p.manualMeter,
                  salesValue: p.salesValue
                })),
                tankReadings: closingData?.tankReadings?.map(t => ({
                  tankId: t.tankId,
                  dipValue: t.dipValue,
                  volume: t.volume
                })),
                islandCollections: Object.keys(closingData?.islandCollections || {}).map(key => ({
                  islandId: key,
                  cashAmount: closingData.islandCollections[key]?.cashAmount,
                  debtAmount: closingData.islandCollections[key]?.debtAmount
                }))
              }, null, 2)}
            </pre>
          </div>
        </div>
      </Space>
    </Panel>
  </Collapse>
);

// Test Submit Button Component
const TestSubmitButton = ({ onTestSubmit, closingData }) => {
  const [loading, setLoading] = React.useState(false);

  const handleTestSubmit = async () => {
    setLoading(true);
    console.log('🧪 TEST SUBMIT - Data being submitted:', closingData);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log('✅ TEST SUBMIT - Would normally call API with:', {
        shiftId: closingData?.shiftId,
        pumpReadings: closingData?.pumpReadings?.length,
        tankReadings: closingData?.tankReadings?.length,
        islandCollections: Object.keys(closingData?.islandCollections || {}).length
      });
      
      if (onTestSubmit) {
        onTestSubmit();
      }
    }, 1000);
  };

  return (
    <Button 
      type="dashed" 
      icon={<PlayCircleOutlined />}
      loading={loading}
      onClick={handleTestSubmit}
      style={{ marginBottom: 16 }}
    >
      Test Submit (Bypass Validation)
    </Button>
  );
};

const ClosingSummaryStep = ({ closingData, closingPayload, payloadSummary, validation, onTestSubmit }) => {
  console.log('🔍 SUMMARY STEP - Received props:', {
    closingData: closingData ? {
      pumpReadings: closingData.pumpReadings?.length,
      tankReadings: closingData.tankReadings?.length,
      islandCollections: Object.keys(closingData.islandCollections || {}).length,
      shiftId: closingData.shiftId
    } : 'NO DATA',
    closingPayload: !!closingPayload,
    payloadSummary: !!payloadSummary,
    validation: validation,
    isValid: validation?.isValid
  });

  // If no closing data at all, show critical error
  if (!closingData) {
    return (
      <Alert
        message="Critical Error: No Closing Data"
        description="The closing data is completely empty. Please go back to previous steps and ensure all data is entered."
        type="error"
        showIcon
        icon={<CloseCircleOutlined />}
        style={{ marginBottom: 16 }}
      />
    );
  }

  // Calculate comprehensive summary data - FIXED: Handle empty data gracefully
  const calculateComprehensiveSummary = () => {
    // Always use payloadSummary if available (from hook)
    if (payloadSummary) {
      console.log('📊 Using payloadSummary from hook:', payloadSummary);
      return payloadSummary;
    }

    console.log('📊 Calculating summary from closingData');
    
    // Fallback calculation with better error handling
    const pumps = closingData.pumpReadings?.filter(p => p.electricMeter > 0 || p.manualMeter > 0).length || 0;
    const tanks = closingData.tankReadings?.filter(t => t.dipValue > 0 || t.volume > 0).length || 0;
    const islands = Object.keys(closingData.islandCollections || {}).length;

    const totalSales = closingData.pumpReadings?.reduce((sum, pump) => 
      sum + (parseFloat(pump.salesValue) || 0), 0) || 0;

    const totalLiters = closingData.pumpReadings?.reduce((sum, pump) => 
      sum + (parseFloat(pump.litersDispensed) || 0), 0) || 0;

    const totalCollections = Object.values(closingData.islandCollections || {}).reduce((sum, island) => {
      return sum + 
        (parseFloat(island.cashAmount) || 0) +
        (parseFloat(island.mobileMoneyAmount) || 0) +
        (parseFloat(island.visaAmount) || 0) +
        (parseFloat(island.mastercardAmount) || 0) +
        (parseFloat(island.debtAmount) || 0) +
        (parseFloat(island.otherAmount) || 0);
    }, 0);

    const summary = {
      pumps,
      tanks,
      islands,
      totalSales,
      totalLiters,
      totalCollections
    };

    console.log('📊 Calculated summary:', summary);
    return summary;
  };

  const summary = calculateComprehensiveSummary();
  const variance = summary.totalSales - summary.totalCollections;
  const variancePercent = summary.totalSales > 0 ? (Math.abs(variance) / summary.totalSales) * 100 : 0;

  // Island collections breakdown
  const islandCollectionsData = Object.entries(closingData.islandCollections || {}).map(([islandId, collection]) => {
    const totalCollected = 
      (parseFloat(collection.cashAmount) || 0) +
      (parseFloat(collection.mobileMoneyAmount) || 0) +
      (parseFloat(collection.visaAmount) || 0) +
      (parseFloat(collection.mastercardAmount) || 0) +
      (parseFloat(collection.debtAmount) || 0) +
      (parseFloat(collection.otherAmount) || 0);
    
    const variance = totalCollected - (parseFloat(collection.totalExpected) || 0);
    
    return {
      key: islandId,
      islandName: collection.islandName,
      expected: parseFloat(collection.totalExpected) || 0,
      collected: totalCollected,
      variance: variance,
      status: Math.abs(variance) <= 4 ? 'exact' : variance > 0 ? 'over' : 'under'
    };
  });

  // Payment method breakdown
  const paymentMethodsData = [
    {
      method: 'Cash',
      amount: Object.values(closingData.islandCollections || {}).reduce((sum, island) => sum + (parseFloat(island.cashAmount) || 0), 0)
    },
    {
      method: 'Mobile Money',
      amount: Object.values(closingData.islandCollections || {}).reduce((sum, island) => sum + (parseFloat(island.mobileMoneyAmount) || 0), 0)
    },
    {
      method: 'Visa',
      amount: Object.values(closingData.islandCollections || {}).reduce((sum, island) => sum + (parseFloat(island.visaAmount) || 0), 0)
    },
    {
      method: 'MasterCard',
      amount: Object.values(closingData.islandCollections || {}).reduce((sum, island) => sum + (parseFloat(island.mastercardAmount) || 0), 0)
    },
    {
      method: 'Debt',
      amount: Object.values(closingData.islandCollections || {}).reduce((sum, island) => sum + (parseFloat(island.debtAmount) || 0), 0)
    },
    {
      method: 'Other',
      amount: Object.values(closingData.islandCollections || {}).reduce((sum, island) => sum + (parseFloat(island.otherAmount) || 0), 0)
    }
  ].filter(item => item.amount > 0);

  const islandColumns = [
    {
      title: 'Island',
      dataIndex: 'islandName',
      key: 'islandName',
    },
    {
      title: 'Expected (KES)',
      dataIndex: 'expected',
      key: 'expected',
      align: 'right',
      render: (amount) => (
        <Text strong>KES {amount.toFixed(0)}</Text>
      )
    },
    {
      title: 'Collected (KES)',
      dataIndex: 'collected',
      key: 'collected',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>KES {amount.toFixed(0)}</Text>
      )
    },
    {
      title: 'Variance',
      dataIndex: 'variance',
      key: 'variance',
      align: 'right',
      render: (variance, record) => {
        const color = record.status === 'exact' ? 'green' : record.status === 'over' ? 'orange' : 'red';
        const text = record.status === 'exact' ? '✓ Exact' : 
                   record.status === 'over' ? `+${Math.abs(variance).toFixed(0)}` : 
                   `-${Math.abs(variance).toFixed(0)}`;
        return (
          <Tag color={color}>
            {text}
          </Tag>
        );
      }
    }
  ];

  const paymentColumns = [
    {
      title: 'Payment Method',
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: 'Amount (KES)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount) => (
        <Text strong>KES {amount.toFixed(0)}</Text>
      )
    },
    {
      title: 'Percentage',
      key: 'percentage',
      align: 'right',
      render: (_, record) => {
        const percentage = summary.totalCollections > 0 ? (record.amount / summary.totalCollections) * 100 : 0;
        return (
          <Text type="secondary">{percentage.toFixed(1)}%</Text>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Debug Information */}
      <DebugInfo 
        closingData={closingData}
        closingPayload={closingPayload}
        payloadSummary={payloadSummary}
        validation={validation}
      />

      {/* Test Submit Button */}
      <TestSubmitButton 
        onTestSubmit={onTestSubmit}
        closingData={closingData}
      />

      {/* Validation Status */}
      {validation?.isValid ? (
        <Alert
          message="All checks passed!"
          description="Your shift closing data is ready to be submitted."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Alert
          message="Validation Issues Found"
          description={
            <div>
              <Text>The submit button is disabled because:</Text>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
                {validation?.errors?.map((error, index) => (
                  <li key={index}>{error}</li>
                )) || ['Unknown validation error']}
              </ul>
            </div>
          }
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Main Summary Statistics */}
      <Card 
        title={
          <Space>
            <FileTextOutlined />
            Shift Closing Summary
          </Space>
        } 
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="Pumps"
              value={summary.pumps}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Tanks"
              value={summary.tanks}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Islands"
              value={summary.islands}
              prefix={<FilterOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Total Sales"
              value={summary.totalSales}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#722ed1' }}
              prefix={<CreditCardOutlined />}
            />
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={8}>
            <Statistic
              title="Total Liters Dispensed"
              value={summary.totalLiters}
              precision={1}
              suffix="L"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Total Collections"
              value={summary.totalCollections}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Variance"
              value={Math.abs(variance)}
              precision={0}
              prefix={variance >= 0 ? '+' : '-'}
              suffix="KES"
              valueStyle={{ 
                color: Math.abs(variance) <= 4 ? '#52c41a' : variance > 0 ? '#fa8c16' : '#f5222d' 
              }}
            />
            {summary.totalSales > 0 && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {variancePercent.toFixed(1)}% {variance > 0 ? 'surplus' : 'shortage'}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Tag 
                    color={Math.abs(variance) <= 4 ? "success" : variance > 0 ? "warning" : "error"}
                  >
                    {Math.abs(variance) <= 4 ? "Within Tolerance" : variance > 0 ? "Over Collection" : "Short Collection"}
                  </Tag>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Island Collections Breakdown */}
        {islandCollectionsData.length > 0 && (
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <EyeOutlined />
                  Island Collections Breakdown
                </Space>
              } 
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={islandColumns}
                dataSource={islandCollectionsData}
                pagination={false}
                size="small"
                scroll={{ x: true }}
              />
            </Card>
          </Col>
        )}

        {/* Payment Methods Breakdown */}
        {paymentMethodsData.length > 0 && (
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <CreditCardOutlined />
                  Payment Methods Summary
                </Space>
              } 
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={paymentColumns}
                dataSource={paymentMethodsData}
                pagination={false}
                size="small"
                scroll={{ x: true }}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                      <Table.Summary.Cell index={0}>
                        <Text strong>Total Collections</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                          KES {summary.totalCollections.toFixed(0)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <Text strong>100%</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Additional Details */}
      <Card title="Additional Information" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Shift ID">
            {closingData.shiftId || 'Not set'}
          </Descriptions.Item>
          <Descriptions.Item label="Recorded By">
            <Space>
              <UserOutlined />
              User #{closingData.recordedById || 'Not set'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="End Time">
            {closingData.endTime ? new Date(closingData.endTime).toLocaleString() : 'Not set'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={validation?.isValid ? "success" : "error"}>
              {validation?.isValid ? "Ready to Close" : "Needs Attention"}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Raw Payload Preview */}
      <Card 
        title={
          <Space>
            <SearchOutlined />
            Payload Preview
          </Space>
        }
      >
        <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 6 }}>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px', margin: 0 }}>
            {JSON.stringify(closingPayload, null, 2)}
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default ClosingSummaryStep;