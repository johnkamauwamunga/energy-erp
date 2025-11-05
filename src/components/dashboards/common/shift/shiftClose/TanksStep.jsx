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
  Space,
  Typography
} from 'antd';
import {
  DashboardOutlined,
  WifiOutlined,
  CheckCircleOutlined,
  RightOutlined,
  ContainerOutlined,
  CalculatorOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TanksStep = ({ tanksWithReadings, closingData, onChange }) => {
  const [activeTankTab, setActiveTankTab] = useState('');
  const [selectedTankId, setSelectedTankId] = useState(null);
  
  const { tankReadings } = closingData;

  // SIMPLE LINEAR RELATIONSHIP: dipValue = volume / 10000
  const calculateHeightFromVolume = (volume) => {
    return volume / 10000; // 10,000L = 1 meter
  };

  // SIMPLE LINEAR RELATIONSHIP: volume = dipValue * 10000
  const calculateVolumeFromHeight = (height) => {
    return height * 10000; // 1 meter = 10,000L
  };

  const enhancedTanks = React.useMemo(() => {
    return tanksWithReadings?.map(tank => {
      const closingReading = tankReadings?.find(tr => tr.tankId === tank.tankId) || {};
      
      // Auto-calculate dip value if volume is provided but dip is not
      let autoCalculatedDip = closingReading.dipValue;
      if (closingReading.volume > 0 && !closingReading.dipValue) {
        autoCalculatedDip = calculateHeightFromVolume(closingReading.volume);
      }
      
      return {
        ...tank,
        closingReading: {
          ...closingReading,
          dipValue: autoCalculatedDip || closingReading.dipValue
        },
        isCompleted: tankReadings?.some(tr => 
          tr.tankId === tank.tankId && tr.dipValue > 0 && tr.volume > 0
        )
      };
    }) || [];
  }, [tanksWithReadings, tankReadings]);

  useEffect(() => {
    if (enhancedTanks?.length > 0 && !activeTankTab) {
      setActiveTankTab(enhancedTanks[0].tankId);
      if (!selectedTankId) {
        setSelectedTankId(enhancedTanks[0].tankId);
      }
    }
  }, [enhancedTanks, activeTankTab, selectedTankId]);

  const handleTankReadingUpdate = (tankId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    
    const existingReadingIndex = tankReadings.findIndex(reading => reading.tankId === tankId);
    const tank = enhancedTanks.find(t => t.tankId === tankId);
    
    let updatedReading = {};
    
    if (existingReadingIndex >= 0) {
      updatedReading = {
        ...tankReadings[existingReadingIndex],
        [field]: numericValue
      };
    } else {
      const startReading = tank?.latestReading;
      updatedReading = {
        tankId,
        tankName: tank?.tankName,
        productName: tank?.product?.name,
        dipValue: field === 'dipValue' ? numericValue : 0,
        volume: field === 'volume' ? numericValue : 0,
        temperature: field === 'temperature' ? numericValue : (startReading?.temperature || 25),
        waterLevel: field === 'waterLevel' ? numericValue : (startReading?.waterLevel || 0),
        density: field === 'density' ? numericValue : (startReading?.density || 0.85)
      };
    }

    // Auto-calculate related values using simple linear relationship
    if (field === 'volume' && numericValue > 0) {
      // If volume is entered, auto-calculate dip value: dip = volume / 10000
      updatedReading.dipValue = calculateHeightFromVolume(numericValue);
    } else if (field === 'dipValue' && numericValue > 0) {
      // If dip value is entered, auto-calculate volume: volume = dip * 10000
      updatedReading.volume = calculateVolumeFromHeight(numericValue);
    }

    let updatedReadings;
    if (existingReadingIndex >= 0) {
      updatedReadings = tankReadings.map(reading =>
        reading.tankId === tankId ? updatedReading : reading
      );
    } else {
      updatedReadings = [...tankReadings, updatedReading];
    }

    onChange({ tankReadings: updatedReadings });
  };

  const getSelectedTank = () => {
    return enhancedTanks.find(tank => tank.tankId === selectedTankId);
  };

  const calculateVolumeChange = (startVolume, endVolume) => {
    return endVolume - startVolume;
  };

  const calculateTotalVolumeChange = () => {
    return tankReadings.reduce((total, reading) => {
      const tank = enhancedTanks?.find(t => t.tankId === reading.tankId);
      const startVolume = tank?.latestReading?.volume || 0;
      if (reading.volume > 0) {
        return total + (reading.volume - startVolume);
      }
      return total;
    }, 0);
  };

  const handleNextTank = () => {
    const currentIndex = enhancedTanks.findIndex(tank => tank.tankId === selectedTankId);
    
    if (currentIndex < enhancedTanks.length - 1) {
      const nextTankId = enhancedTanks[currentIndex + 1].tankId;
      setSelectedTankId(nextTankId);
      setActiveTankTab(nextTankId);
    }
  };

  if (!enhancedTanks?.length) {
    return (
      <Alert
        message="No Tank Readings"
        description="There are no tank dip readings for this shift. Please contact your supervisor."
        type="warning"
        showIcon
      />
    );
  }

  const selectedTank = getSelectedTank();
  const startReading = selectedTank?.latestReading;
  const closingReading = selectedTank?.closingReading || {};

  return (
    <div style={{ padding: 24 }}>
      <Alert
        message="Record Tank END Dip Readings"
        description="Enter volume or dip readings. The other value will be auto-calculated using simple conversion (10,000L = 1 meter)."
        type="info"
        showIcon
        icon={<WifiOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* Volume Change Summary */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Total Volume Change</Text>
          <Title 
            level={2} 
            style={{ 
              color: calculateTotalVolumeChange() < 0 ? '#ff4d4f' : '#fa8c16',
              margin: 0
            }}
          >
            {calculateTotalVolumeChange().toLocaleString()}L
          </Title>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left Panel - Tanks List */}
        <Col xs={24} lg={8}>
          <Card size="small">
            <Tabs
              activeKey={activeTankTab}
              onChange={setActiveTankTab}
              size="small"
              type="card"
            >
              {enhancedTanks.map(tank => (
                <TabPane
                  key={tank.tankId}
                  tab={
                    <Space direction="vertical" size={0}>
                      <Text ellipsis style={{ maxWidth: 120 }}>
                        {tank.tankName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {tank.isCompleted ? '✓' : '⋯'}
                      </Text>
                    </Space>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {enhancedTanks.map(tank => (
                      <Card
                        key={tank.tankId}
                        size="small"
                        style={{
                          border: selectedTankId === tank.tankId ? '2px solid #1890ff' : undefined,
                          backgroundColor: tank.isCompleted ? '#f6ffed' : undefined
                        }}
                        bodyStyle={{ padding: 12 }}
                        onClick={() => {
                          setSelectedTankId(tank.tankId);
                          setActiveTankTab(tank.tankId);
                        }}
                      >
                        <Space>
                          <DashboardOutlined style={{ 
                            color: tank.isCompleted ? '#52c41a' : '#d9d9d9' 
                          }} />
                          <Space direction="vertical" size={0} style={{ flex: 1 }}>
                            <Text strong>{tank.tankName}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {tank.product?.name || 'Diesel'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Capacity: {(tank.capacity || 0).toLocaleString()}L
                            </Text>
                          </Space>
                          {tank.isCompleted && (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          )}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </TabPane>
              ))}
            </Tabs>
          </Card>
        </Col>

        {/* Right Panel - Tank Reading Form */}
        <Col xs={24} lg={16}>
          {selectedTank ? (
            <Card 
              title={
                <Space>
                  <DashboardOutlined />
                  {selectedTank.tankName}
                </Space>
              }
              extra={
                <Tag color={selectedTank.isCompleted ? "green" : "orange"}>
                  {selectedTank.isCompleted ? "Completed" : "Pending"}
                </Tag>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {/* Auto-calculation Info */}
                <Alert
                  message="AUTO-CALCULATION ACTIVE"
                  description="Enter either Volume or Dip Value. The other will be automatically calculated using simple conversion (10,000L = 1 meter)."
                  type="info"
                  showIcon
                  icon={<CalculatorOutlined />}
                />

                {/* Opening Readings */}
                {startReading && (
                  <Card size="small" title={
                    <Space>
                      <ContainerOutlined />
                      OPENING DIP READINGS
                    </Space>
                  }>
                    <Row gutter={16}>
                      <Col xs={12} md={6}>
                        <Statistic
                          title="Dip Value"
                          value={startReading.dipValue}
                          suffix="m"
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <Statistic
                          title="Volume"
                          value={startReading.volume}
                          suffix="L"
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <Statistic
                          title="Temperature"
                          value={startReading.temperature || 25}
                          suffix="°C"
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <Statistic
                          title="Water Level"
                          value={startReading.waterLevel || 0}
                          suffix="m"
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                    </Row>
                  </Card>
                )}

                {/* Closing Readings Form */}
                <Card size="small" title={
                  <Space>
                    <WifiOutlined />
                    CLOSING DIP READINGS
                  </Space>
                }>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Input
                        addonBefore="Volume"
                        addonAfter="L"
                        type="number"
                        value={closingReading.volume || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(selectedTank.tankId, 'volume', e.target.value)
                        }
                        placeholder="100000"
                        size="large"
                      />
                      <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                        Enter volume to auto-calculate dip value (100,000L = 10m)
                      </Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Input
                        addonBefore="Dip Value"
                        addonAfter="m"
                        type="number"
                        step="0.001"
                        value={closingReading.dipValue || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(selectedTank.tankId, 'dipValue', e.target.value)
                        }
                        placeholder="10.000"
                        size="large"
                      />
                      <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                        Enter dip value to auto-calculate volume (10m = 100,000L)
                      </Text>
                    </Col>
                    <Col xs={24} md={12}>
                      <Input
                        addonBefore="Temperature"
                        addonAfter="°C"
                        type="number"
                        step="0.1"
                        value={closingReading.temperature || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(selectedTank.tankId, 'temperature', e.target.value)
                        }
                        placeholder="25.0"
                        size="large"
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Input
                        addonBefore="Water Level"
                        addonAfter="m"
                        type="number"
                        step="0.01"
                        value={closingReading.waterLevel || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(selectedTank.tankId, 'waterLevel', e.target.value)
                        }
                        placeholder="0.00"
                        size="large"
                      />
                    </Col>
                    <Col xs={24}>
                      <Input
                        addonBefore="Density"
                        type="number"
                        step="0.001"
                        value={closingReading.density || ''}
                        onChange={(e) => 
                          handleTankReadingUpdate(selectedTank.tankId, 'density', e.target.value)
                        }
                        placeholder="0.850"
                        size="large"
                      />
                    </Col>
                  </Row>

                  {/* Auto-calculation Result */}
                  {(closingReading.volume > 0 || closingReading.dipValue > 0) && (
                    <Card 
                      size="small" 
                      style={{ marginTop: 16, backgroundColor: '#f0f8ff' }}
                      title="AUTO-CALCULATION RESULT"
                    >
                      <Row gutter={16}>
                        <Col xs={12}>
                          <Statistic
                            title="Volume"
                            value={closingReading.volume || 0}
                            suffix="L"
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Col>
                        <Col xs={12}>
                          <Statistic
                            title="Dip Value"
                            value={closingReading.dipValue || 0}
                            suffix="m"
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                      </Row>
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Conversion: 10,000L = 1 meter
                        </Text>
                      </div>
                    </Card>
                  )}

                  {/* Volume Change Calculation */}
                  {closingReading.volume > 0 && startReading && (
                    <Card 
                      size="small" 
                      style={{ marginTop: 16, backgroundColor: '#f6ffed' }}
                      title="VOLUME CHANGE ANALYSIS"
                    >
                      <Row gutter={16}>
                        <Col xs={8}>
                          <Statistic
                            title="Opening Volume"
                            value={startReading.volume}
                            suffix="L"
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col xs={8}>
                          <Statistic
                            title="Closing Volume"
                            value={closingReading.volume}
                            suffix="L"
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Col>
                        <Col xs={8}>
                          <Statistic
                            title="Volume Change"
                            value={calculateVolumeChange(startReading.volume, closingReading.volume)}
                            suffix="L"
                            valueStyle={{ 
                              color: calculateVolumeChange(startReading.volume, closingReading.volume) < 0 
                                ? '#ff4d4f' 
                                : '#52c41a' 
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  )}

                  {/* Next Tank Button */}
                  <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button type="primary" onClick={handleNextTank}>
                      Next Tank <RightOutlined />
                    </Button>
                  </div>
                </Card>
              </Space>
            </Card>
          ) : (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <DashboardOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <Title level={4} type="secondary">Select a Tank</Title>
              <Text type="secondary">Choose a tank from the left panel to enter closing dip readings</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TanksStep;