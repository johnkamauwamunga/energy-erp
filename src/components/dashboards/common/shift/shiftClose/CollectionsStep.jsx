import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Input,
  Tag,
  Alert,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  Table
} from 'antd';
import {
  DollarCircleOutlined,
  CalculatorOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const CollectionsStep = ({ closingData, onChange }) => {
  const [activeIslandTab, setActiveIslandTab] = useState('');
  const { islandCollections } = closingData;

  useEffect(() => {
    if (islandCollections && Object.keys(islandCollections).length > 0 && !activeIslandTab) {
      const firstIslandId = Object.keys(islandCollections)[0];
      setActiveIslandTab(firstIslandId);
    }
  }, [islandCollections, activeIslandTab]);

  const calculateTotalCollected = (collection) => {
    if (!collection) return 0;
    
    return (
      (collection.cashAmount || 0) +
      (collection.mobileMoneyAmount || 0) +
      (collection.visaAmount || 0) +
      (collection.mastercardAmount || 0) +
      (collection.debtAmount || 0) +
      (collection.otherAmount || 0)
    );
  };

  const calculateExpectedAmount = (islandId) => {
    const collection = islandCollections?.[islandId];
    return collection?.totalExpected || 0;
  };

  const getVarianceStatus = (expected, actual) => {
    const variance = Math.abs(actual - expected);
    if (variance <= 4) return 'exact';
    if (actual > expected) return 'over';
    return 'under';
  };

  const getVarianceDetails = (expected, actual) => {
    const varianceAmount = actual - expected;
    const variancePercent = expected > 0 ? (Math.abs(varianceAmount) / expected) * 100 : 0;
    
    return {
      amount: Math.abs(varianceAmount),
      percent: variancePercent,
      isOver: varianceAmount > 0
    };
  };

  const handleCollectionUpdate = (islandId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    
    const currentIslandData = islandCollections?.[islandId] || {};
    const islandExpectedData = islandCollections?.[islandId] || {};
    
    const updatedCollections = {
      ...islandCollections,
      [islandId]: {
        ...currentIslandData,
        islandId: islandId,
        islandName: currentIslandData.islandName || islandExpectedData.islandName,
        islandCode: currentIslandData.islandCode || islandExpectedData.islandCode,
        totalExpected: currentIslandData.totalExpected || islandExpectedData.totalExpected,
        pumpCollections: currentIslandData.pumpCollections || islandExpectedData.pumpCollections,
        [field]: numericValue
      }
    };

    onChange({ islandCollections: updatedCollections });
  };

  const getCurrentIslandCollection = () => {
    return islandCollections?.[activeIslandTab] || {};
  };

  const getIslandCompletionStatus = (islandId) => {
    const collection = islandCollections?.[islandId];
    if (!collection) return false;
    
    const totalCollected = calculateTotalCollected(collection);
    return totalCollected > 0;
  };

  const calculateGrandTotals = () => {
    let totalExpected = 0;
    let totalCollected = 0;

    if (islandCollections) {
      Object.values(islandCollections).forEach(collection => {
        totalExpected += collection.totalExpected || 0;
        totalCollected += calculateTotalCollected(collection);
      });
    }

    return { totalExpected, totalCollected };
  };

  const { totalExpected, totalCollected } = calculateGrandTotals();
  const grandVariance = getVarianceStatus(totalExpected, totalCollected);
  const grandVarianceDetails = getVarianceDetails(totalExpected, totalCollected);

  // Table data for progress summary
  const progressData = Object.entries(islandCollections || {}).map(([islandId, collection]) => {
    const expected = calculateExpectedAmount(islandId);
    const actual = calculateTotalCollected(collection);
    const varianceStatus = getVarianceStatus(expected, actual);
    const isCompleted = getIslandCompletionStatus(islandId);
    const varianceDetails = getVarianceDetails(expected, actual);

    return {
      key: islandId,
      islandName: collection.islandName,
      expected,
      actual,
      varianceStatus,
      isCompleted,
      varianceDetails
    };
  });

  const progressColumns = [
    {
      title: 'Island',
      dataIndex: 'islandName',
      key: 'islandName',
    },
    {
      title: 'Expected',
      dataIndex: 'expected',
      key: 'expected',
      render: (value) => `KES ${value.toFixed(0)}`,
    },
    {
      title: 'Collected',
      dataIndex: 'actual',
      key: 'actual',
      render: (value, record) => (
        <Text strong style={{ color: record.isCompleted ? '#52c41a' : '#faad14' }}>
          KES {value.toFixed(0)}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (!record.isCompleted) {
          return <Tag color="orange">Pending</Tag>;
        }
        
        const colors = {
          exact: 'green',
          over: 'orange',
          under: 'red'
        };
        
        const icons = {
          exact: <CheckCircleOutlined />,
          over: <RiseOutlined />,
          under: <FallOutlined />
        };
        
        const texts = {
          exact: 'Exact',
          over: `+${record.varianceDetails.amount.toFixed(0)}`,
          under: `-${record.varianceDetails.amount.toFixed(0)}`
        };
        
        return (
          <Tag color={colors[record.varianceStatus]} icon={icons[record.varianceStatus]}>
            {texts[record.varianceStatus]}
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Alert
        message="Record Island Collections"
        description="Enter actual collections. Compare with expected amounts from pump sales using system unit prices."
        type="info"
        showIcon
        icon={<CalculatorOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* Grand Total Summary */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={8}>
            <Statistic
              title="Total Expected"
              value={totalExpected}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Total Collected"
              value={totalCollected}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Variance"
              value={grandVarianceDetails.amount}
              precision={0}
              prefix={grandVariance === 'over' ? '+' : '-'}
              suffix="KES"
              valueStyle={{ 
                color: grandVariance === 'exact' ? '#52c41a' : 
                       grandVariance === 'over' ? '#fa8c16' : '#f5222d' 
              }}
            />
            {grandVariance !== 'exact' && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Text type="secondary">
                  ({grandVarianceDetails.percent.toFixed(1)}% {grandVariance === 'over' ? 'surplus' : 'shortage'})
                </Text>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left Panel - Collections Input */}
        <Col xs={24} lg={12}>
          <Card size="small">
            {islandCollections && Object.keys(islandCollections).length > 0 ? (
              <Tabs
                activeKey={activeIslandTab}
                onChange={setActiveIslandTab}
                size="small"
                type="card"
              >
                {Object.entries(islandCollections).map(([islandId, collection]) => {
                  const isCompleted = getIslandCompletionStatus(islandId);
                  const expected = calculateExpectedAmount(islandId);
                  const actual = calculateTotalCollected(collection);
                  const varianceStatus = getVarianceStatus(expected, actual);

                  return (
                    <TabPane
                      key={islandId}
                      tab={
                        <Space direction="vertical" size={0}>
                          <Text ellipsis style={{ maxWidth: 120 }}>
                            {collection.islandName}
                          </Text>
                          <Space size="small">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {isCompleted ? '✓' : '⋯'}
                            </Text>
                            {isCompleted && varianceStatus === 'exact' && (
                              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                            )}
                            {isCompleted && varianceStatus !== 'exact' && (
                              varianceStatus === 'over' ? 
                                <RiseOutlined style={{ color: '#fa8c16', fontSize: 12 }} /> :
                                <FallOutlined style={{ color: '#f5222d', fontSize: 12 }} />
                            )}
                          </Space>
                        </Space>
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={16}>
                        {/* Expected Collection */}
                        <Card size="small" title="Expected Collection (From Pump Sales)">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>Total Expected: KES {(collection.totalExpected || 0).toFixed(0)}</Text>
                            {collection.pumpCollections?.map(pump => (
                              <div key={pump.pumpId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {pump.pumpName}:
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  KES {pump.expectedCollection?.toFixed(0) || '0'} @ KES {pump.unitPrice}/L
                                </Text>
                              </div>
                            ))}
                          </Space>
                        </Card>

                        {/* Actual Collections Input */}
                        <Card size="small" title="Actual Collections">
                          <Row gutter={[8, 8]}>
                            <Col xs={12}>
                              <Input
                                addonBefore="Cash"
                                type="number"
                                value={getCurrentIslandCollection().cashAmount || ''}
                                onChange={(e) => 
                                  handleCollectionUpdate(activeIslandTab, 'cashAmount', e.target.value)
                                }
                                placeholder="0"
                                size="small"
                              />
                            </Col>
                            <Col xs={12}>
                              <Input
                                addonBefore="Mobile Money"
                                type="number"
                                value={getCurrentIslandCollection().mobileMoneyAmount || ''}
                                onChange={(e) => 
                                  handleCollectionUpdate(activeIslandTab, 'mobileMoneyAmount', e.target.value)
                                }
                                placeholder="0"
                                size="small"
                              />
                            </Col>
                            <Col xs={12}>
                              <Input
                                addonBefore="Visa"
                                type="number"
                                value={getCurrentIslandCollection().visaAmount || ''}
                                onChange={(e) => 
                                  handleCollectionUpdate(activeIslandTab, 'visaAmount', e.target.value)
                                }
                                placeholder="0"
                                size="small"
                              />
                            </Col>
                            <Col xs={12}>
                              <Input
                                addonBefore="MasterCard"
                                type="number"
                                value={getCurrentIslandCollection().mastercardAmount || ''}
                                onChange={(e) => 
                                  handleCollectionUpdate(activeIslandTab, 'mastercardAmount', e.target.value)
                                }
                                placeholder="0"
                                size="small"
                              />
                            </Col>
                            <Col xs={12}>
                              <Input
                                addonBefore="Debt"
                                type="number"
                                value={getCurrentIslandCollection().debtAmount || ''}
                                onChange={(e) => 
                                  handleCollectionUpdate(activeIslandTab, 'debtAmount', e.target.value)
                                }
                                placeholder="0"
                                size="small"
                              />
                            </Col>
                            <Col xs={12}>
                              <Input
                                addonBefore="Other"
                                type="number"
                                value={getCurrentIslandCollection().otherAmount || ''}
                                onChange={(e) => 
                                  handleCollectionUpdate(activeIslandTab, 'otherAmount', e.target.value)
                                }
                                placeholder="0"
                                size="small"
                              />
                            </Col>
                          </Row>

                          {/* Total Collected Display */}
                          {calculateTotalCollected(getCurrentIslandCollection()) > 0 && (
                            <div style={{ 
                              marginTop: 16, 
                              padding: 8, 
                              backgroundColor: '#f6ffed', 
                              borderRadius: 6,
                              textAlign: 'center'
                            }}>
                              <Text strong style={{ color: '#52c41a' }}>
                                Total Collected: KES {calculateTotalCollected(getCurrentIslandCollection()).toFixed(0)}
                              </Text>
                            </div>
                          )}
                        </Card>

                        {/* Variance Display */}
                        {collection.totalExpected > 0 && calculateTotalCollected(collection) > 0 && (
                          <Alert
                            message="Variance Analysis"
                            description={
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text>Expected:</Text>
                                  <Text strong>KES {(collection.totalExpected || 0).toFixed(0)}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text>Actual:</Text>
                                  <Text strong>KES {calculateTotalCollected(collection).toFixed(0)}</Text>
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  borderTop: '1px solid #d9d9d9',
                                  paddingTop: 4
                                }}>
                                  <Text>Difference:</Text>
                                  <Text strong style={{
                                    color: getVarianceStatus(
                                      collection.totalExpected,
                                      calculateTotalCollected(collection)
                                    ) === 'exact' ? '#52c41a' : 
                                    getVarianceStatus(
                                      collection.totalExpected,
                                      calculateTotalCollected(collection)
                                    ) === 'over' ? '#fa8c16' : '#f5222d'
                                  }}>
                                    {getVarianceStatus(
                                      collection.totalExpected,
                                      calculateTotalCollected(collection)
                                    ) === 'over' ? '+' : '-'}
                                    KES {getVarianceDetails(
                                      collection.totalExpected,
                                      calculateTotalCollected(collection)
                                    ).amount.toFixed(0)}
                                  </Text>
                                </div>
                              </Space>
                            }
                            type={
                              getVarianceStatus(
                                collection.totalExpected,
                                calculateTotalCollected(collection)
                              ) === 'exact' ? 'success' : 
                              getVarianceStatus(
                                collection.totalExpected,
                                calculateTotalCollected(collection)
                              ) === 'over' ? 'warning' : 'error'
                            }
                            showIcon
                          />
                        )}
                      </Space>
                    </TabPane>
                  );
                })}
              </Tabs>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <ExclamationCircleOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 16 }} />
                <Title level={4} type="secondary">No Island Collections Data</Title>
                <Text type="secondary">Complete pump readings to see expected collections</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Right Panel - Progress Summary */}
        <Col xs={24} lg={12}>
          <Card size="small" title="Progress Summary">
            <Table
              columns={progressColumns}
              dataSource={progressData}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CollectionsStep;