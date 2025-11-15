// ReadingsStep.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Input, 
  Space, 
  Alert, 
  Badge, 
  Tabs,
  Row,
  Col,
  Statistic,
  message,
  Typography,
  Button,
  Divider
} from 'antd';
import { 
  Gauge, 
  Fuel, 
  Zap, 
  Droplets,
  CheckCircle,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { useApp } from '../../../../../context/AppContext';

const { Text, Title } = Typography;

const ReadingsStep = ({ 
  stationId,
  shiftInfo,
  onProceedToIslandSales
}) => {
  const { state } = useApp();
  const currentStationId = stationId || state?.currentStation?.id;

  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [activeTab, setActiveTab] = useState('pumps');
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);

  console.log('📊 ReadingsStep mounted with station:', currentStationId);

  // Load opening readings
  useEffect(() => {
    if (currentStationId) {
      loadOpeningReadingsData();
    }
  }, [currentStationId]);

  const loadOpeningReadingsData = async () => {
    if (!currentStationId) return;
    
    setLoading(true);
    try {
      const [pumpsResult, tanksResult] = await Promise.all([
        shiftService.getStationPumpsWithLastEndReadings(currentStationId),
        shiftService.getStationTanksWithLastEndReadings(currentStationId)
      ]);

      const transformedPumps = (pumpsResult?.pumps || []).map(pumpItem => ({
        id: pumpItem.pump.id,
        name: pumpItem.pump.name,
        product: pumpItem.pump.tank?.product || pumpItem.pump.product,
        openingElectricMeter: pumpItem.lastEndReading?.electricMeter || 0,
        openingManualMeter: pumpItem.lastEndReading?.manualMeter || 0,
        openingCashMeter: pumpItem.lastEndReading?.cashMeter || 0,
        openingUnitPrice: pumpItem.lastEndReading?.unitPrice || 0,
        closingElectricMeter: '',
        closingManualMeter: '',
        closingCashMeter: '',
        closingUnitPrice: pumpItem.lastEndReading?.unitPrice || 0,
      }));

      const transformedTanks = (tanksResult?.tanks || []).map(tankItem => ({
        id: tankItem.tank.id,
        name: tankItem.tank.name,
        product: tankItem.tank.product,
        capacity: tankItem.tank.capacity,
        openingVolume: tankItem.lastEndReading?.volume || 0,
        openingDipValue: tankItem.lastEndReading?.dipValue || 0,
        closingVolume: '',
        closingDipValue: '',
      }));

      setPumps(transformedPumps);
      setTanks(transformedTanks);
      setAutoFilled(true);
      
      console.log(`✅ Loaded ${transformedPumps.length} pumps and ${transformedTanks.length} tanks`);
      
    } catch (error) {
      console.error('❌ Error loading readings:', error);
      message.error('Failed to load opening readings');
    } finally {
      setLoading(false);
    }
  };

  const handlePumpReadingChange = (pumpId, field, value) => {
    const updatedPumps = pumps.map(pump => 
      pump.id === pumpId ? { ...pump, [field]: value } : pump
    );
    setPumps(updatedPumps);
  };

  const handleTankReadingChange = (tankId, field, value) => {
    const updatedTanks = tanks.map(tank => 
      tank.id === tankId ? { ...tank, [field]: value } : tank
    );
    setTanks(updatedTanks);
  };

  // Calculate statistics
  const pumpStats = useMemo(() => ({
    total: pumps.length,
    completed: pumps.filter(p => p.closingElectricMeter && p.closingManualMeter && p.closingCashMeter).length,
    totalLiters: pumps.reduce((sum, pump) => {
      const opening = parseFloat(pump.openingElectricMeter) || 0;
      const closing = parseFloat(pump.closingElectricMeter) || 0;
      return sum + Math.max(0, closing - opening);
    }, 0)
  }), [pumps]);

  const tankStats = useMemo(() => ({
    total: tanks.length,
    completed: tanks.filter(t => t.closingVolume && t.closingDipValue).length,
  }), [tanks]);

  const allReadingsComplete = pumpStats.completed === pumpStats.total && 
                              tankStats.completed === tankStats.total;

  const handleProceedToIslandSales = () => {
    const readingsData = {
      allPumps: pumps,
      allTanks: tanks,
      pumpReadings: pumps.map(pump => ({
        pumpId: pump.id,
        openingElectricMeter: pump.openingElectricMeter,
        closingElectricMeter: pump.closingElectricMeter || 0,
        openingManualMeter: pump.openingManualMeter,
        closingManualMeter: pump.closingManualMeter || 0,
        openingCashMeter: pump.openingCashMeter,
        closingCashMeter: pump.closingCashMeter || 0,
        unitPrice: pump.openingUnitPrice
      })),
      tankReadings: tanks.map(tank => ({
        tankId: tank.id,
        openingVolume: tank.openingVolume,
        closingVolume: tank.closingVolume || 0,
        openingDipValue: tank.openingDipValue,
        closingDipValue: tank.closingDipValue || 0
      }))
    };

    console.log('🚀 Proceeding to Island Sales with data:', readingsData);
    onProceedToIslandSales?.(readingsData);
  };

  // Enhanced Pump Columns with better visibility
  const pumpColumns = [
    {
      title: 'PUMP DETAILS',
      key: 'pump',
      width: 150,
      render: (_, pump) => (
        <Space size={6} direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={16} color="#faad14" />
            <Text strong style={{ fontSize: '13px' }}>{pump.name}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {pump.product?.name || 'Fuel'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'ELECTRIC METER',
      key: 'electric',
      width: 160,
      render: (_, pump) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#e6f7ff', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
              {pump.openingElectricMeter || '0.000'}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div>
          </div>
          <Input
            size="middle"
            type="number"
            step="0.001"
            value={pump.closingElectricMeter}
            onChange={(e) => handlePumpReadingChange(pump.id, 'closingElectricMeter', e.target.value)}
            placeholder="Enter closing"
            style={{ 
              width: '100%', 
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          />
        </Space>
      ),
    },
    {
      title: 'MANUAL METER',
      key: 'manual',
      width: 160,
      render: (_, pump) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#f6ffed', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
              {pump.openingManualMeter || '0.000'}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div>
          </div>
          <Input
            size="middle"
            type="number"
            step="0.001"
            value={pump.closingManualMeter}
            onChange={(e) => handlePumpReadingChange(pump.id, 'closingManualMeter', e.target.value)}
            placeholder="Enter closing"
            style={{ 
              width: '100%', 
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          />
        </Space>
      ),
    },
    {
      title: 'CASH METER',
      key: 'cash',
      width: 160,
      render: (_, pump) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#fff7e6', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#fa8c16' }}>
              {pump.openingCashMeter || '0.000'}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div>
          </div>
          <Input
            size="middle"
            type="number"
            step="0.001"
            value={pump.closingCashMeter}
            onChange={(e) => handlePumpReadingChange(pump.id, 'closingCashMeter', e.target.value)}
            placeholder="Enter closing"
            style={{ 
              width: '100%', 
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          />
        </Space>
      ),
    },
    {
      title: 'UNIT PRICE',
      key: 'price',
      width: 120,
      render: (_, pump) => (
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <Text strong style={{ fontSize: '13px', color: '#722ed1' }}>
            {pump.openingUnitPrice || '0.00'}
          </Text>
          <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>KES/L</div>
        </div>
      ),
    },
  ];

  // Enhanced Tank Columns with better visibility
  const tankColumns = [
    {
      title: 'TANK DETAILS',
      key: 'tank',
      width: 180,
      render: (_, tank) => (
        <Space size={6} direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Droplets size={16} color="#1890ff" />
            <Text strong style={{ fontSize: '13px' }}>{tank.name}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {tank.product?.name || 'Fuel'} • {tank.capacity?.toLocaleString()}L
          </Text>
        </Space>
      ),
    },
    {
      title: 'VOLUME (LITERS)',
      key: 'volume',
      width: 180,
      render: (_, tank) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#e6f7ff', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
              {tank.openingVolume || '0.000'}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div>
          </div>
          <Input
            size="middle"
            type="number"
            step="0.001"
            value={tank.closingVolume}
            onChange={(e) => handleTankReadingChange(tank.id, 'closingVolume', e.target.value)}
            placeholder="Enter closing volume"
            style={{ 
              width: '100%', 
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          />
        </Space>
      ),
    },
    {
      title: 'DIP VALUE',
      key: 'dip',
      width: 180,
      render: (_, tank) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#f6ffed', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
              {tank.openingDipValue || '0.000'}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div>
          </div>
          <Input
            size="middle"
            type="number"
            step="0.001"
            value={tank.closingDipValue}
            onChange={(e) => handleTankReadingChange(tank.id, 'closingDipValue', e.target.value)}
            placeholder="Enter closing dip"
            style={{ 
              width: '100%', 
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          📊 Shift Closing - Readings Collection
        </Title>
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          padding: '12px 16px', 
          backgroundColor: '#f0f8ff', 
          borderRadius: '6px',
          fontSize: '13px'
        }}>
          <div><strong>Station:</strong> {state?.currentStation?.name}</div>
          <div><strong>Shift:</strong> {shiftInfo?.shiftNumber || 'Current Shift'}</div>
          <div><strong>Station ID:</strong> {currentStationId?.slice(0, 8)}...</div>
        </div>
      </div>

      {/* Auto-fill Status */}
      {autoFilled && (
        <Alert
          message="✅ Opening Readings Loaded Successfully"
          description={`${pumps.length} pumps and ${tanks.length} tanks ready for closing readings`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Quick Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Pumps Ready"
              value={`${pumpStats.completed}/${pumpStats.total}`}
              prefix={<CheckCircle size={14} />}
              valueStyle={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: pumpStats.completed === pumpStats.total ? '#3f8600' : '#faad14' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Liters Dispensed"
              value={pumpStats.totalLiters}
              precision={1}
              suffix="L"
              prefix={<Droplets size={14} />}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Tanks Ready"
              value={`${tankStats.completed}/${tankStats.total}`}
              prefix={<CheckCircle size={14} />}
              valueStyle={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: tankStats.completed === tankStats.total ? '#3f8600' : '#faad14' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            size="small" 
            bodyStyle={{ 
              padding: '12px', 
              textAlign: 'center',
              backgroundColor: allReadingsComplete ? '#f6ffed' : '#fff7e6'
            }}
          >
            <Statistic
              title="Overall Status"
              value={allReadingsComplete ? "READY" : "IN PROGRESS"}
              valueStyle={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: allReadingsComplete ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Readings Tabs */}
      <Card 
        bodyStyle={{ padding: '16px' }}
        style={{ marginBottom: 20 }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'pumps',
              label: (
                <Space size={6}>
                  <Gauge size={16} />
                  <Text strong>Pump Meters</Text>
                  <Badge 
                    count={pumpStats.completed} 
                    showZero 
                    style={{ 
                      backgroundColor: pumpStats.completed === pumpStats.total ? '#52c41a' : '#faad14',
                      fontWeight: 'bold'
                    }} 
                  />
                </Space>
              ),
              children: (
                <Table
                  columns={pumpColumns}
                  dataSource={pumps}
                  pagination={false}
                  size="middle"
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 800 }}
                  style={{ fontSize: '12px' }}
                />
              )
            },
            {
              key: 'tanks',
              label: (
                <Space size={6}>
                  <Fuel size={16} />
                  <Text strong>Tank Readings</Text>
                  <Badge 
                    count={tankStats.completed} 
                    showZero 
                    style={{ 
                      backgroundColor: tankStats.completed === tankStats.total ? '#52c41a' : '#faad14',
                      fontWeight: 'bold'
                    }} 
                  />
                </Space>
              ),
              children: (
                <Table
                  columns={tankColumns}
                  dataSource={tanks}
                  pagination={false}
                  size="middle"
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 600 }}
                  style={{ fontSize: '12px' }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* Action Button */}
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Button 
          type="primary"
          size="large"
          icon={<Calculator size={16} />}
          onClick={handleProceedToIslandSales}
          disabled={!allReadingsComplete}
          style={{ 
            height: '48px',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '0 32px'
          }}
        >
          {allReadingsComplete ? (
            <Space size={8}>
              <ArrowRight size={16} />
              PROCEED TO ISLAND SALES
              <ArrowRight size={16} />
            </Space>
          ) : (
            `COMPLETE ALL READINGS (${pumpStats.completed}/${pumpStats.total} pumps, ${tankStats.completed}/${tankStats.total} tanks)`
          )}
        </Button>
        
        {!allReadingsComplete && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Please complete all closing readings before proceeding
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingsStep;