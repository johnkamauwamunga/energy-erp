import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Alert, 
  Tag, 
  Badge, 
  Tabs,
  Row,
  Col,
  Statistic,
  message
} from 'antd';
import { 
  Gauge, 
  Fuel, 
  Zap, 
  Droplets,
  CheckCircle
} from 'lucide-react';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { useApp } from '../../../../../context/AppContext';

const { TabPane } = Tabs;

// Constants for reading status
const READING_STATUS = {
  MISSING: { status: 'missing', text: 'Not Entered', color: 'red' },
  AUTO_FILLED: { status: 'auto-filled', text: 'Auto-filled', color: 'blue' },
  MANUAL: { status: 'manual', text: 'Manual Entry', color: 'green' }
};

const ReadingsStep = ({ 
  stationId,
  readingsData,
  shiftInfo,
  onUpdateReadings
}) => {
  const { state } = useApp();
  const currentStationId = stationId || state?.currentStation?.id;

  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [activeTab, setActiveTab] = useState('pumps');
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);

  // Auto-populate readings when component mounts
  useEffect(() => {
    if (currentStationId) {
      loadReadingsData();
    }
  }, [currentStationId]);

  const getPumpReadingStatus = useCallback((pump) => {
    if (!pump.electricMeter && !pump.manualMeter && !pump.cashMeter) {
      return READING_STATUS.MISSING;
    }
    
    if (pump.source === 'PREVIOUS_SHIFT') {
      return READING_STATUS.AUTO_FILLED;
    }
    
    return READING_STATUS.MANUAL;
  }, []);

  const getTankReadingStatus = useCallback((tank) => {
    if (!tank.volume && tank.volume !== 0) {
      return READING_STATUS.MISSING;
    }
    
    if (tank.source === 'PREVIOUS_SHIFT') {
      return READING_STATUS.AUTO_FILLED;
    }
    
    return READING_STATUS.MANUAL;
  }, []);

  const loadReadingsData = async () => {
    if (!currentStationId) {
      message.error('Station ID is required');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`🔄 Loading readings data for station: ${currentStationId}`);
      
      // Fetch pumps and tanks with last readings
      const [pumpsResult, tanksResult] = await Promise.all([
        shiftService.getStationPumpsWithLastEndReadings(currentStationId),
        shiftService.getStationTanksWithLastEndReadings(currentStationId)
      ]);
      
      console.log('📊 Pumps data:', pumpsResult);
      console.log('📊 Tanks data:', tanksResult);

      const rawPumpsData = pumpsResult?.pumps || [];
      const rawTanksData = tanksResult?.tanks || [];

      // Transform pumps data
      const transformedPumps = rawPumpsData.map(pumpItem => {
        const pump = pumpItem.pump;
        const lastReading = pumpItem.lastEndReading;
        
        // Create pump object with previous readings as opening readings
        const pumpData = {
          // Pump info
          id: pump.id,
          name: pump.name,
          tank: pump.tank,
          product: pump.tank?.product || pump.product,
          
          // Previous readings (for display reference)
          previousElectricMeter: lastReading?.electricMeter,
          previousManualMeter: lastReading?.manualMeter,
          previousCashMeter: lastReading?.cashMeter,
          previousUnitPrice: lastReading?.unitPrice,
          hasPreviousReading: lastReading !== null,
          
          // Current opening readings (auto-filled from previous shift's end readings)
          electricMeter: lastReading?.electricMeter || '',
          manualMeter: lastReading?.manualMeter || '',
          cashMeter: lastReading?.cashMeter || '',
          unitPrice: lastReading?.unitPrice || '',
          source: lastReading ? 'PREVIOUS_SHIFT' : 'MANUAL_ENTRY'
        };

        return pumpData;
      });

      // Transform tanks data
      const transformedTanks = rawTanksData.map(tankItem => {
        const tank = tankItem.tank;
        const lastReading = tankItem.lastEndReading;
        
        // Create tank object with previous readings as opening readings
        const tankData = {
          // Tank info
          id: tank.id,
          name: tank.name,
          capacity: tank.capacity,
          product: tank.product,
          
          // Previous readings (for display reference)
          previousVolume: lastReading?.volume,
          previousTemperature: lastReading?.temperature,
          previousWaterLevel: lastReading?.waterLevel,
          previousDipValue: lastReading?.dipValue,
          hasPreviousReading: lastReading !== null,
          
          // Current opening readings (auto-filled from previous shift's end readings)
          volume: lastReading?.volume || '',
          temperature: lastReading?.temperature || 25,
          waterLevel: lastReading?.waterLevel || 0,
          dipValue: lastReading?.dipValue || 0,
          source: lastReading ? 'PREVIOUS_SHIFT' : 'MANUAL_ENTRY'
        };

        return tankData;
      });

      setPumps(transformedPumps);
      setTanks(transformedTanks);

      // Update parent with all pumps and tanks data
      onUpdateReadings({
        allPumps: transformedPumps,
        allTanks: transformedTanks,
        pumpReadings: transformedPumps.map(pump => ({
          pumpId: pump.id,
          electricMeter: pump.electricMeter || 0,
          manualMeter: pump.manualMeter || 0,
          cashMeter: pump.cashMeter || 0,
          unitPrice: pump.unitPrice || 0,
          source: pump.source
        })),
        tankReadings: transformedTanks.map(tank => ({
          tankId: tank.id,
          volume: tank.volume || 0,
          temperature: tank.temperature || 25,
          waterLevel: tank.waterLevel || 0,
          dipValue: tank.dipValue || 0,
          source: tank.source
        }))
      });

      setAutoFilled(true);
      
      const autoFilledPumps = transformedPumps.filter(p => p.source === 'PREVIOUS_SHIFT').length;
      const autoFilledTanks = transformedTanks.filter(t => t.source === 'PREVIOUS_SHIFT').length;
      
      console.log(`✅ All readings auto-populated: ${autoFilledPumps} pumps and ${autoFilledTanks} tanks filled from previous shift`);
      
    } catch (error) {
      console.error('❌ Error loading readings data:', error);
      message.error('Failed to load station readings data');
    } finally {
      setLoading(false);
    }
  };

  const handlePumpReadingChange = useCallback((pumpId, field, value) => {
    // Handle empty input
    if (value === '') {
      const updatedPumps = pumps.map(pump => 
        pump.id === pumpId 
          ? { ...pump, [field]: '', source: 'MANUAL_ENTRY' }
          : pump
      );
      
      setPumps(updatedPumps);

      // Update parent with all readings
      onUpdateReadings({
        pumpReadings: updatedPumps.map(pump => ({
          pumpId: pump.id,
          electricMeter: pump.electricMeter || 0,
          manualMeter: pump.manualMeter || 0,
          cashMeter: pump.cashMeter || 0,
          unitPrice: pump.unitPrice || 0,
          source: pump.source
        })),
        allPumps: updatedPumps,
        allTanks: tanks // Keep existing tanks
      });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      console.log('⚠️ Invalid number for pump reading:', value);
      return;
    }

    // Update local state
    const updatedPumps = pumps.map(pump => 
      pump.id === pumpId 
        ? { ...pump, [field]: value, source: 'MANUAL_ENTRY' }
        : pump
    );

    setPumps(updatedPumps);

    // Update parent component
    onUpdateReadings({
      pumpReadings: updatedPumps.map(pump => ({
        pumpId: pump.id,
        electricMeter: pump.electricMeter || 0,
        manualMeter: pump.manualMeter || 0,
        cashMeter: pump.cashMeter || 0,
        unitPrice: pump.unitPrice || 0,
        source: pump.source
      })),
      allPumps: updatedPumps,
      allTanks: tanks // Keep existing tanks
    });
  }, [pumps, tanks, onUpdateReadings]);

  const handleTankReadingChange = useCallback((tankId, field, value) => {
    // Handle empty input
    if (value === '') {
      const updatedTanks = tanks.map(tank => 
        tank.id === tankId 
          ? { ...tank, [field]: '', source: 'MANUAL_ENTRY' }
          : tank
      );
      
      setTanks(updatedTanks);

      // Update parent with all readings
      onUpdateReadings({
        tankReadings: updatedTanks.map(tank => ({
          tankId: tank.id,
          volume: tank.volume || 0,
          temperature: tank.temperature || 25,
          waterLevel: tank.waterLevel || 0,
          dipValue: tank.dipValue || 0,
          source: tank.source
        })),
        allPumps: pumps, // Keep existing pumps
        allTanks: updatedTanks
      });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      console.log('⚠️ Invalid number for tank reading:', value);
      return;
    }

    // Update local state
    const updatedTanks = tanks.map(tank => 
      tank.id === tankId 
        ? { ...tank, [field]: value, source: 'MANUAL_ENTRY' }
        : tank
    );

    setTanks(updatedTanks);

    // Update parent component
    onUpdateReadings({
      tankReadings: updatedTanks.map(tank => ({
        tankId: tank.id,
        volume: tank.volume || 0,
        temperature: tank.temperature || 25,
        waterLevel: tank.waterLevel || 0,
        dipValue: tank.dipValue || 0,
        source: tank.source
      })),
      allPumps: pumps, // Keep existing pumps
      allTanks: updatedTanks
    });
  }, [tanks, pumps, onUpdateReadings]);

  // Statistics with useMemo for performance
  const pumpStats = useMemo(() => ({
    total: pumps.length,
    withReadings: pumps.filter(p => 
      p.electricMeter !== '' && p.manualMeter !== '' && p.cashMeter !== ''
    ).length,
    autoFilled: pumps.filter(p => p.source === 'PREVIOUS_SHIFT').length,
    manualEntry: pumps.filter(p => p.source === 'MANUAL_ENTRY').length,
    newPumps: pumps.filter(p => !p.hasPreviousReading).length
  }), [pumps]);

  const tankStats = useMemo(() => ({
    total: tanks.length,
    withReadings: tanks.filter(t => t.volume !== '').length,
    autoFilled: tanks.filter(t => t.source === 'PREVIOUS_SHIFT').length,
    manualEntry: tanks.filter(t => t.source === 'MANUAL_ENTRY').length,
    newTanks: tanks.filter(t => !t.hasPreviousReading).length
  }), [tanks]);

  const canProceedToNext = pumpStats.withReadings === pumpStats.total && 
                          tankStats.withReadings === tankStats.total;

  // Enhanced pump columns
  const pumpColumns = [
    {
      title: 'Pump Details',
      key: 'details',
      render: (_, pump) => {
        const status = getPumpReadingStatus(pump);
        return (
          <Space>
            <Zap size={16} color="#faad14" />
            <div>
              <div style={{ fontWeight: 'bold' }}>{pump.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {pump.product?.name || 'No Product'} 
              </div>
              {pump.tank && (
                <div style={{ fontSize: 11, color: '#999' }}>
                  Tank: {pump.tank.name}
                </div>
              )}
              {pump.hasPreviousReading && (
                <Tag color="blue" style={{ fontSize: 10, marginTop: 2 }}>
                  Has Previous Reading
                </Tag>
              )}
            </div>
          </Space>
        );
      },
      width: 300
    },
    {
      title: 'Electric Meter',
      key: 'electric',
      render: (_, pump) => {
        const status = getPumpReadingStatus(pump);
        
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={pump.electricMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'electricMeter', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              aria-label={`Electric meter reading for ${pump.name}`}
            />
            <Tag color={status.color} style={{ margin: 0, fontSize: 10 }}>
              {status.text}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Manual Meter',
      key: 'manual',
      render: (_, pump) => {
        const status = getPumpReadingStatus(pump);
        
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={pump.manualMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'manualMeter', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              aria-label={`Manual meter reading for ${pump.name}`}
            />
            <Tag color={status.color} style={{ margin: 0, fontSize: 10 }}>
              {status.text}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Cash Meter',
      key: 'cash',
      render: (_, pump) => {
        const status = getPumpReadingStatus(pump);
        
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={pump.cashMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'cashMeter', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              aria-label={`Cash meter reading for ${pump.name}`}
            />
          </Space>
        );
      }
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      render: (_, pump) => {
        return (
          <Input
            type="number"
            step="0.01"
            value={pump.unitPrice}
            onChange={(e) => handlePumpReadingChange(pump.id, 'unitPrice', e.target.value)}
            placeholder="150.00"
            style={{ width: 100 }}
            aria-label={`Unit price for ${pump.name}`}
          />
        );
      }
    }
  ];

  // Tank columns
  const tankColumns = [
    {
      title: 'Tank Details',
      key: 'details',
      render: (_, tank) => {
        const status = getTankReadingStatus(tank);
        return (
          <Space>
            <Droplets size={16} color="#1890ff" />
            <div>
              <div style={{ fontWeight: 'bold' }}>{tank.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {tank.product?.name || 'No Product'} • {tank.capacity?.toLocaleString()}L
              </div>
            </div>
          </Space>
        );
      },
      width: 300
    },
    {
      title: 'Volume (L)',
      key: 'volume',
      render: (_, tank) => {
        const status = getTankReadingStatus(tank);
        
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={tank.volume}
              onChange={(e) => handleTankReadingChange(tank.id, 'volume', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              aria-label={`Volume reading for ${tank.name}`}
            />
          </Space>
        );
      }
    },
    {
      title: 'Temperature (°C)',
      key: 'temperature',
      render: (_, tank) => {
        return (
          <Input
            type="number"
            step="0.1"
            value={tank.temperature}
            style={{ width: 100 }}
            disabled
            aria-label={`Temperature for ${tank.name}`}
          />
        );
      }
    },
    {
      title: 'Water Level',
      key: 'waterLevel',
      render: (_, tank) => {
        return (
          <Input
            type="number"
            step="0.01"
            value={tank.waterLevel}
            style={{ width: 100 }}
            disabled
            aria-label={`Water level for ${tank.name}`}
          />
        );
      }
    },
    {
      title: 'Dip Value',
      key: 'dipValue',
      render: (_, tank) => {
        return (
          <Input
            type="number"
            step="0.01"
            value={tank.dipValue}
            style={{ width: 100 }}
            disabled
            aria-label={`Dip value for ${tank.name}`}
          />
        );
      }
    }
  ];

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Station Info */}
      <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
        <strong>Station:</strong> {state?.currentStation?.name} | <strong>ID:</strong> {currentStationId}
        {shiftInfo?.shiftId && (
          <span style={{ marginLeft: 16 }}>
            <strong>Shift:</strong> {shiftInfo.shiftNumber || shiftInfo.shiftId}
          </span>
        )}
      </div>

      {/* Auto-fill Status */}
      {autoFilled && (
        <Alert
          message="Readings Auto-populated"
          description={`${pumpStats.autoFilled} pumps and ${tankStats.autoFilled} tanks filled from previous shift. ${pumpStats.newPumps} new pumps and ${tankStats.newTanks} new tanks require manual entry.`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Statistics Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Pumps"
              value={pumpStats.total}
              prefix={<Zap size={16} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Pumps Ready"
              value={pumpStats.withReadings}
              suffix={`/ ${pumpStats.total}`}
              prefix={<CheckCircle size={16} />}
              valueStyle={{ color: pumpStats.withReadings === pumpStats.total ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Tanks"
              value={tankStats.total}
              prefix={<Droplets size={16} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Tanks Ready"
              value={tankStats.withReadings}
              suffix={`/ ${tankStats.total}`}
              prefix={<CheckCircle size={16} />}
              valueStyle={{ color: tankStats.withReadings === tankStats.total ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Readings Tabs */}
      <Card size="small">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'pumps',
              label: (
                <Space>
                  <Gauge size={16} />
                  Pump Meters
                  <Badge 
                    count={pumpStats.withReadings} 
                    showZero 
                    style={{ 
                      backgroundColor: pumpStats.withReadings === pumpStats.total ? '#52c41a' : '#faad14' 
                    }} 
                  />
                </Space>
              ),
              children: (
                <Table
                  columns={pumpColumns}
                  dataSource={pumps}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  loading={loading}
                  locale={{ emptyText: 'No pumps found' }}
                  scroll={{ x: 1200 }}
                />
              )
            },
            {
              key: 'tanks',
              label: (
                <Space>
                  <Fuel size={16} />
                  Tank Volume
                  <Badge 
                    count={tankStats.withReadings} 
                    showZero 
                    style={{ 
                      backgroundColor: tankStats.withReadings === tankStats.total ? '#52c41a' : '#faad14' 
                    }} 
                  />
                </Space>
              ),
              children: (
                <Table
                  columns={tankColumns}
                  dataSource={tanks}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  loading={loading}
                  locale={{ emptyText: 'No tanks found' }}
                  scroll={{ x: 800 }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* Validation Status */}
      {!canProceedToNext && (
        <Alert
          message="Readings Required"
          description="Please ensure all pump and tank readings are entered before proceeding."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default ReadingsStep;