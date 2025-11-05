import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Input,
  Tag,
  Alert,
  Button,
  Row,
  Col,
  Statistic,
  Divider,
  Space,
  Typography
} from 'antd';
import {
  ThunderboltOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  RightOutlined,
  DashboardOutlined,
  LockOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const IslandPumpsStep = ({ pumpsWithIslandInfo, expectedCollectionsByIsland, closingData, onChange }) => {
  const [activeIslandTab, setActiveIslandTab] = useState('');
  const [selectedPumpId, setSelectedPumpId] = useState(null);

  const { pumpReadings } = closingData;

  const hasValidPricing = (pump) => {
    return pump.productPriceInfo?.unitPrice && 
           pump.productPriceInfo.unitPrice !== 100.00 && 
           pump.productPriceInfo.priceStatus !== 'unknown';
  };

  // Group pumps by island
  const pumpsByIsland = React.useMemo(() => {
    const grouped = {};
    
    pumpsWithIslandInfo.forEach(pump => {
      const islandId = pump.islandId;
      if (!grouped[islandId]) {
        grouped[islandId] = {
          islandId: islandId,
          islandName: pump.islandName,
          islandCode: pump.islandCode,
          pumps: []
        };
      }
      
      const islandExpectedData = expectedCollectionsByIsland.find(island => island.islandId === islandId);
      const pumpExpectedData = islandExpectedData?.pumps?.find(p => p.pumpId === pump.pumpId);
      
      const systemUnitPrice = pump.productPriceInfo?.unitPrice || 100.00;
      
      grouped[islandId].pumps.push({
        ...pump,
        closingReading: pumpReadings?.find(pr => pr.pumpId === pump.pumpId) || {},
        isCompleted: pumpReadings?.some(pr => pr.pumpId === pump.pumpId && pr.electricMeter > 0),
        expectedData: pumpExpectedData,
        dynamicUnitPrice: systemUnitPrice,
        hasValidPricing: hasValidPricing(pump),
        systemUnitPrice: systemUnitPrice
      });
    });
    
    return grouped;
  }, [pumpsWithIslandInfo, pumpReadings, expectedCollectionsByIsland]);

  // Set first island and pump as active
  useEffect(() => {
    const islandIds = Object.keys(pumpsByIsland);
    if (islandIds.length > 0 && !activeIslandTab) {
      setActiveIslandTab(islandIds[0]);
      const firstIslandPumps = pumpsByIsland[islandIds[0]]?.pumps || [];
      if (firstIslandPumps.length > 0 && !selectedPumpId) {
        setSelectedPumpId(firstIslandPumps[0].pumpId);
      }
    }
  }, [pumpsByIsland, activeIslandTab, selectedPumpId]);

  // Calculate expected collections - ALWAYS USE SYSTEM UNIT PRICE
  const calculateIslandCollections = React.useMemo(() => {
    const collections = {};
    
    Object.values(pumpsByIsland).forEach(island => {
      let islandTotal = 0;
      const pumpCollections = [];
      
      island.pumps.forEach(pump => {
        const closingReading = pumpReadings.find(pr => pr.pumpId === pump.pumpId);
        const startReading = pump.meterReadings?.find(r => r.readingType === 'START');
        
        if (startReading && closingReading && closingReading.electricMeter > 0) {
          const openingElectric = startReading.electricMeter || 0;
          const openingManual = startReading.manualMeter || 0;
          const closingElectric = closingReading.electricMeter || 0;
          const closingManual = closingReading.manualMeter || 0;
          
          const electricSales = closingElectric - openingElectric;
          const manualSales = closingManual - openingManual;
          const averageSales = (electricSales + manualSales) / 2;
          
          // ALWAYS USE SYSTEM UNIT PRICE for expected collections
          const unitPrice = pump.systemUnitPrice || 100.00;
          const expectedCollection = averageSales * unitPrice;
          
          islandTotal += expectedCollection;
          
          pumpCollections.push({
            pumpId: pump.pumpId,
            pumpName: pump.pumpName,
            expectedCollection: Math.round(expectedCollection * 100) / 100,
            unitPrice: unitPrice
          });
        }
      });
      
      collections[island.islandId] = {
        islandId: island.islandId,
        islandName: island.islandName,
        totalExpected: Math.round(islandTotal * 100) / 100,
        pumpCollections: pumpCollections
      };
    });
    
    return collections;
  }, [pumpsByIsland, pumpReadings]);

  // Pass collections to parent
  useEffect(() => {
    if (Object.keys(calculateIslandCollections).length > 0) {
      onChange({ islandCollections: calculateIslandCollections });
    }
  }, [calculateIslandCollections, onChange]);

  const handlePumpReadingUpdate = (pumpId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    
    const existingReadingIndex = pumpReadings.findIndex(reading => reading.pumpId === pumpId);
    
    let updatedReadings;
    if (existingReadingIndex >= 0) {
      updatedReadings = [...pumpReadings];
      const currentReading = updatedReadings[existingReadingIndex];
      
      // ALWAYS use system unit price for calculations
      const pump = pumpsWithIslandInfo.find(p => p.pumpId === pumpId);
      const systemUnitPrice = pump?.productPriceInfo?.unitPrice || 100.00;
      
      updatedReadings[existingReadingIndex] = {
        ...currentReading,
        [field]: numericValue,
        unitPrice: systemUnitPrice // Force system unit price
      };
    } else {
      const pump = pumpsWithIslandInfo.find(p => p.pumpId === pumpId);
      const startReading = pump?.meterReadings?.find(r => r.readingType === 'START');
      
      // ALWAYS use system unit price for new readings
      const systemUnitPrice = pump?.productPriceInfo?.unitPrice || 100.00;
      
      updatedReadings = [
        ...pumpReadings,
        {
          pumpId,
          pumpName: pump?.pumpName,
          productName: pump?.product?.name,
          electricMeter: field === 'electricMeter' ? numericValue : 0,
          manualMeter: field === 'manualMeter' ? numericValue : 0,
          cashMeter: field === 'cashMeter' ? numericValue : 0,
          unitPrice: systemUnitPrice,
          litersDispensed: 0,
          salesValue: 0,
          hasValidPricing: hasValidPricing(pump)
        }
      ];
    }

    // Auto-calculate liters and sales
    if (field === 'electricMeter' || field === 'manualMeter') {
      const readingIndex = updatedReadings.findIndex(r => r.pumpId === pumpId);
      if (readingIndex !== -1) {
        const reading = updatedReadings[readingIndex];
        const pump = pumpsWithIslandInfo.find(p => p.pumpId === pumpId);
        const startReading = pump?.meterReadings?.find(r => r.readingType === 'START');
        
        if (startReading && reading.electricMeter > 0) {
          const litersDispensed = Math.max(0, reading.electricMeter - startReading.electricMeter);
          const salesValue = litersDispensed * reading.unitPrice;
          
          updatedReadings[readingIndex] = {
            ...reading,
            litersDispensed: litersDispensed,
            salesValue: salesValue
          };
        }
      }
    }

    onChange({ pumpReadings: updatedReadings });
  };

  const getCurrentIsland = () => {
    return pumpsByIsland[activeIslandTab];
  };

  const getSelectedPump = () => {
    return getCurrentIsland()?.pumps.find(pump => pump.pumpId === selectedPumpId);
  };

  const getPumpCompletionStatus = (islandId) => {
    const islandPumps = pumpsByIsland[islandId]?.pumps || [];
    const completedPumps = islandPumps.filter(pump => pump.isCompleted).length;
    return { completed: completedPumps, total: islandPumps.length };
  };

  const calculateTotalSales = () => {
    return pumpReadings.reduce((total, reading) => total + (reading.salesValue || 0), 0);
  };

  const calculateTotalLiters = () => {
    return pumpReadings.reduce((total, reading) => total + (reading.litersDispensed || 0), 0);
  };

  const calculateTotalExpectedCollections = () => {
    return Object.values(calculateIslandCollections).reduce((total, island) => 
      total + (island.totalExpected || 0), 0
    );
  };

  const handleNextPump = () => {
    const currentIslandPumps = getCurrentIsland()?.pumps || [];
    const currentIndex = currentIslandPumps.findIndex(pump => pump.pumpId === selectedPumpId);
    
    if (currentIndex < currentIslandPumps.length - 1) {
      setSelectedPumpId(currentIslandPumps[currentIndex + 1].pumpId);
    } else {
      const islandIds = Object.keys(pumpsByIsland);
      const currentIslandIndex = islandIds.indexOf(activeIslandTab);
      
      if (currentIslandIndex < islandIds.length - 1) {
        const nextIslandId = islandIds[currentIslandIndex + 1];
        setActiveIslandTab(nextIslandId);
        const nextIslandPumps = pumpsByIsland[nextIslandId]?.pumps || [];
        if (nextIslandPumps.length > 0) {
          setSelectedPumpId(nextIslandPumps[0].pumpId);
        }
      }
    }
  };

  if (!pumpsWithIslandInfo?.length) {
    return (
      <Alert
        message="No Pumps Available"
        description="There are no pumps assigned to this shift. Please contact your supervisor."
        type="warning"
        showIcon
      />
    );
  }

  const selectedPump = getSelectedPump();
  const startReading = selectedPump?.meterReadings?.find(r => r.readingType === 'START');
  const closingReading = selectedPump?.closingReading || {};
  const hasPricing = selectedPump?.hasValidPricing;
  const systemPrice = selectedPump?.productPriceInfo?.unitPrice;

  return (
    <div style={{ padding: 24 }}>
      <Alert
        message="Record Pump END Readings"
        description="Enter END meter readings. Liters and sales will be auto-calculated using system unit price."
        type="info"
        showIcon
        icon={<CalculatorOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* Sales Summary */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={8}>
            <Statistic
              title="Total Liters"
              value={calculateTotalLiters()}
              precision={1}
              suffix="L"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Actual Sales"
              value={calculateTotalSales()}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Expected Collections"
              value={calculateTotalExpectedCollections()}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left Panel - Islands and Pumps */}
        <Col xs={24} lg={8}>
          <Card size="small">
            <Tabs
              activeKey={activeIslandTab}
              onChange={setActiveIslandTab}
              size="small"
              type="card"
            >
              {Object.entries(pumpsByIsland).map(([islandId, islandData]) => {
                const status = getPumpCompletionStatus(islandId);
                return (
                  <TabPane
                    key={islandId}
                    tab={
                      <Space direction="vertical" size={0}>
                        <Text ellipsis style={{ maxWidth: 120 }}>
                          {islandData.islandName || islandData.islandCode}
                        </Text>
                        <Space size="small">
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {status.completed}/{status.total}
                          </Text>
                          {status.completed === status.total && status.total > 0 && (
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                          )}
                        </Space>
                      </Space>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {islandData.pumps.map(pump => (
                        <Card
                          key={pump.pumpId}
                          size="small"
                          style={{
                            border: selectedPumpId === pump.pumpId ? '2px solid #1890ff' : undefined,
                            backgroundColor: pump.isCompleted ? '#f6ffed' : undefined
                          }}
                          bodyStyle={{ padding: 12 }}
                          onClick={() => setSelectedPumpId(pump.pumpId)}
                        >
                          <Space>
                            <DashboardOutlined style={{ 
                              color: pump.isCompleted ? '#52c41a' : '#d9d9d9' 
                            }} />
                            <Space direction="vertical" size={0} style={{ flex: 1 }}>
                              <Text strong>{pump.pumpName}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {pump.product?.name || 'Diesel'}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                Price: KES {pump.systemUnitPrice}
                              </Text>
                              {!pump.hasValidPricing && (
                                <Space size={4}>
                                  <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 10 }} />
                                  <Text type="warning" style={{ fontSize: 10 }}>Check pricing</Text>
                                </Space>
                              )}
                            </Space>
                            {pump.isCompleted && (
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            )}
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  </TabPane>
                );
              })}
            </Tabs>
          </Card>
        </Col>

        {/* Right Panel - Pump Reading Form */}
        <Col xs={24} lg={16}>
          {selectedPump ? (
            <Card 
              title={
                <Space>
                  <ThunderboltOutlined />
                  {selectedPump.pumpName}
                </Space>
              }
              extra={
                <Tag color={selectedPump.isCompleted ? "green" : "orange"}>
                  {selectedPump.isCompleted ? "Completed" : "Pending"}
                </Tag>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {/* Product Pricing */}
                <Alert
                  message="PRODUCT PRICING"
                  description={
                    <Space direction="vertical">
                      <Text>
                        {selectedPump.product?.name || 'Unknown Product'} 
                        {selectedPump.productPriceInfo?.fuelCode && ` (${selectedPump.productPriceInfo.fuelCode})`}
                      </Text>
                      <Space direction="vertical" size={0}>
                        <Text strong>System Price: KES {systemPrice}</Text>
                        <Text type="success">All calculations use system price</Text>
                      </Space>
                    </Space>
                  }
                  type={hasPricing ? "success" : "warning"}
                  showIcon
                />

                {/* Opening Readings */}
                {startReading && (
                  <Card size="small" title="OPENING READINGS">
                    <Row gutter={16}>
                      <Col xs={8}>
                        <Statistic
                          title="Electric Meter"
                          value={startReading.electricMeter || 0}
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col xs={8}>
                        <Statistic
                          title="Manual Meter"
                          value={startReading.manualMeter || 0}
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col xs={8}>
                        <Statistic
                          title="Cash Meter"
                          value={startReading.cashMeter || 0}
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                    </Row>
                  </Card>
                )}

                {/* Closing Readings Form */}
                <Card size="small" title="CLOSING READINGS">
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Input
                        addonBefore="Electric"
                        type="number"
                        value={closingReading.electricMeter || ''}
                        onChange={(e) => 
                          handlePumpReadingUpdate(selectedPump.pumpId, 'electricMeter', e.target.value)
                        }
                        placeholder="END reading"
                        size="large"
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Input
                        addonBefore="Manual"
                        type="number"
                        value={closingReading.manualMeter || ''}
                        onChange={(e) => 
                          handlePumpReadingUpdate(selectedPump.pumpId, 'manualMeter', e.target.value)
                        }
                        placeholder="END reading"
                        size="large"
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Input
                        addonBefore="Cash"
                        type="number"
                        value={closingReading.cashMeter || ''}
                        onChange={(e) => 
                          handlePumpReadingUpdate(selectedPump.pumpId, 'cashMeter', e.target.value)
                        }
                        placeholder="END reading"
                        size="large"
                      />
                    </Col>
                  </Row>

                  {/* Unit Price Information */}
                  <Divider />
                  <Alert
                    message="UNIT PRICE INFORMATION"
                    description={
                      <Space direction="vertical">
                        <Text strong>System Price: KES {systemPrice}</Text>
                        <Text type="success">All sales calculations use the system price automatically</Text>
                      </Space>
                    }
                    type="info"
                    showIcon
                  />

                  {/* Calculated Values */}
                  {(closingReading.litersDispensed > 0 || closingReading.salesValue > 0) && (
                    <>
                      <Divider />
                      <Row gutter={16}>
                        <Col xs={12}>
                          <Statistic
                            title="Liters Dispensed"
                            value={closingReading.litersDispensed}
                            precision={1}
                            suffix="L"
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col xs={12}>
                          <Statistic
                            title="Sales Value"
                            value={closingReading.salesValue}
                            precision={0}
                            prefix="KES"
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Col>
                      </Row>
                    </>
                  )}

                  {/* Next Pump Button */}
                  <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button type="primary" onClick={handleNextPump}>
                      Next Pump <RightOutlined />
                    </Button>
                  </div>
                </Card>
              </Space>
            </Card>
          ) : (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <Title level={4} type="secondary">Select a Pump</Title>
              <Text type="secondary">Choose a pump from the left panel to enter closing readings</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default IslandPumpsStep;