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
  message,
  Typography,
  Tooltip
} from 'antd';
import { 
  Gauge, 
  Fuel, 
  Zap, 
  Droplets,
  CheckCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { useApp } from '../../../../../context/AppContext';

const { TabPane } = Tabs;
const { Text } = Typography;

// Constants for reading status
const READING_STATUS = {
  MISSING: { status: 'missing', text: 'Not Entered', color: 'red' },
  AUTO_FILLED: { status: 'auto-filled', text: 'Auto-filled', color: 'blue' },
  MANUAL: { status: 'manual', text: 'Manual Entry', color: 'green' }
};

const ReadingsStep = ({ 
  stationId,
  shiftId,
  readingsData,
  shiftInfo,
  personnelData,
  onUpdateReadings,
  readingType = "START"
}) => {
  const { state } = useApp();
  const currentStationId = stationId || state?.currentStation?.id;

  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [activeTab, setActiveTab] = useState('pumps');
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  // Log all received props for debugging
  useEffect(() => {
    console.log('📥 ReadingsStep received props:', {
      stationId: currentStationId,
      shiftId,
      readingType,
      personnelData,
      shiftInfo,
      initialReadingsData: readingsData
    });
  }, [currentStationId, shiftId, readingType, personnelData, shiftInfo]);

  // Enhanced auto-populate with proper data preservation
  useEffect(() => {
    if (currentStationId && shiftId) {
      // Check if we already have data to preserve it
      const hasExistingData = readingsData?.allPumps?.length > 0 || readingsData?.allTanks?.length > 0;
      
      if (!hasExistingData) {
        loadReadingsData();
      } else {
        // Preserve existing data
        console.log('🔄 Preserving existing readings data');
        setPumps(readingsData.allPumps || []);
        setTanks(readingsData.allTanks || []);
        setAutoFilled(true);
      }
    }
  }, [currentStationId, shiftId, readingsData]);

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
    if (!currentStationId || !shiftId) {
      message.error('Station ID and Shift ID are required');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`🔄 Loading ${readingType} readings data for shift: ${shiftId}`);
      
      const [pumpsResult, tanksResult] = await Promise.all([
        shiftService.getStationPumpsWithLastEndReadings(currentStationId),
        shiftService.getStationTanksWithLastEndReadings(currentStationId)
      ]);
      
      console.log('📊 Raw pumps data:', pumpsResult);
      console.log('📊 Raw tanks data:', tanksResult);

      // Transform pumps data with proper reading types and data preservation
      const transformedPumps = (pumpsResult?.pumps || []).map(pumpItem => {
        const pump = pumpItem.pump;
        const lastReading = pumpItem.lastEndReading;
        
        // Check if we have existing data for this pump to preserve manual entries
        const existingPump = readingsData?.allPumps?.find(p => p.id === pump.id);
        
        const pumpData = {
          // Pump info
          id: pump.id,
          name: pump.name,
          stationLabel: pump.stationLabel,
          tank: pump.tank,
          product: pump.tank?.product || pump.product,
          island: pump.island,
          
          // Previous readings (for display reference)
          previousElectricMeter: lastReading?.electricMeter,
          previousManualMeter: lastReading?.manualMeter,
          previousCashMeter: lastReading?.cashMeter,
          previousUnitPrice: lastReading?.unitPrice,
          hasPreviousReading: lastReading !== null,
          
          // Current readings - preserve existing or auto-fill
          electricMeter: existingPump?.electricMeter || lastReading?.electricMeter || '',
          manualMeter: existingPump?.manualMeter || lastReading?.manualMeter || '',
          cashMeter: existingPump?.cashMeter || lastReading?.cashMeter || '',
          unitPrice: existingPump?.unitPrice || lastReading?.unitPrice || '',
          readingType: readingType,
          source: existingPump ? existingPump.source : (lastReading ? 'PREVIOUS_SHIFT' : 'MANUAL_ENTRY'),
          recordedAt: existingPump?.recordedAt || new Date().toISOString()
        };

        return pumpData;
      });

      // ========== 🔧 UPDATED AREA: Tank transformation with currentVolume fix ==========
      // Transform tanks data with proper reading types and currentVolume
      const transformedTanks = (tanksResult?.tanks || []).map(tankItem => {
        const tank = tankItem.tank;
        const lastReading = tankItem.lastEndReading;
        
        // Check if we have existing data for this tank to preserve manual entries
        const existingTank = readingsData?.allTanks?.find(t => t.id === tank.id);
        
        // ✅ CRITICAL FIX: Ensure currentVolume is always set
        const currentVolume = existingTank?.currentVolume || 
                             lastReading?.currentVolume || 
                             lastReading?.volume || 
                             '';
        
        const tankData = {
          // Tank info
          id: tank.id,
          name: tank.name,
          stationLabel: tank.stationLabel,
          capacity: tank.capacity,
          maxCapacity: tank.maxCapacity,
          product: tank.product,
          
          // Previous readings (for display reference)
          previousVolume: lastReading?.volume,
          previousCurrentVolume: lastReading?.currentVolume,
          previousTemperature: lastReading?.temperature,
          previousWaterLevel: lastReading?.waterLevel,
          previousDipValue: lastReading?.dipValue,
          hasPreviousReading: lastReading !== null,
          
          // Current readings - preserve existing or auto-fill
          volume: existingTank?.volume || lastReading?.volume || '',
          currentVolume: currentVolume, // ✅ ALWAYS SET - FIXED UNDEFINED ISSUE
          temperature: existingTank?.temperature || lastReading?.temperature || 25,
          waterLevel: existingTank?.waterLevel || lastReading?.waterLevel || 0,
          dipValue: existingTank?.dipValue || lastReading?.dipValue || 0,
          density: existingTank?.density || lastReading?.density || 0.8,
          readingType: readingType,
          source: existingTank ? existingTank.source : (lastReading ? 'PREVIOUS_SHIFT' : 'MANUAL_ENTRY'),
          recordedAt: existingTank?.recordedAt || new Date().toISOString(),
          isVerified: readingType === 'START'
        };

        return tankData;
      });

      setPumps(transformedPumps);
      setTanks(transformedTanks);
      setLastSync(new Date());

      // Update parent with complete data including all required fields
      updateParentReadings(transformedPumps, transformedTanks);
      setAutoFilled(true);
      
      const autoFilledPumps = transformedPumps.filter(p => p.source === 'PREVIOUS_SHIFT').length;
      const autoFilledTanks = transformedTanks.filter(t => t.source === 'PREVIOUS_SHIFT').length;
      
      console.log(`✅ ${readingType} readings loaded: ${autoFilledPumps} pumps and ${autoFilledTanks} tanks auto-filled`);
      message.success(`Readings loaded: ${transformedPumps.length} pumps, ${transformedTanks.length} tanks`);
      
    } catch (error) {
      console.error(`❌ Error loading ${readingType} readings:`, error);
      message.error(`Failed to load ${readingType.toLowerCase()} readings data`);
    } finally {
      setLoading(false);
    }
  };

  // ========== 🔧 UPDATED AREA: Centralized function to update parent with currentVolume fix ==========
  const updateParentReadings = useCallback((updatedPumps, updatedTanks) => {
    const pumpReadings = (updatedPumps || pumps).map(pump => ({
      pumpId: pump.id,
      electricMeter: parseFloat(pump.electricMeter) || 0,
      manualMeter: parseFloat(pump.manualMeter) || 0,
      cashMeter: parseFloat(pump.cashMeter) || 0,
      unitPrice: parseFloat(pump.unitPrice) || 0,
      readingType: pump.readingType,
      source: pump.source,
      recordedAt: pump.recordedAt
    }));

    const tankReadings = (updatedTanks || tanks).map(tank => {
      // ✅ CRITICAL FIX: Ensure currentVolume is always a number, not undefined
      const currentVolume = parseFloat(tank.currentVolume) || parseFloat(tank.volume) || 0;
      
      return {
        tankId: tank.id,
        dipValue: parseFloat(tank.dipValue) || 0,
        volume: parseFloat(tank.volume) || 0,
        currentVolume: currentVolume, // ✅ ALWAYS A NUMBER - FIXED VALIDATION ERROR
        temperature: parseFloat(tank.temperature) || 25,
        waterLevel: parseFloat(tank.waterLevel) || 0,
        density: parseFloat(tank.density) || 0.8,
        readingType: tank.readingType,
        source: tank.source,
        recordedAt: tank.recordedAt,
        isVerified: tank.isVerified
      };
    });

    console.log('📤 Updated tank readings with currentVolume:', tankReadings.map(t => ({
      tankId: t.tankId,
      volume: t.volume,
      currentVolume: t.currentVolume
    })));

    onUpdateReadings({
      allPumps: updatedPumps || pumps,
      allTanks: updatedTanks || tanks,
      pumpReadings,
      tankReadings
    });
  }, [pumps, tanks, onUpdateReadings]);

  const handlePumpReadingChange = useCallback((pumpId, field, value) => {
    const updatedPumps = pumps.map(pump => 
      pump.id === pumpId 
        ? { 
            ...pump, 
            [field]: value, 
            source: 'MANUAL_ENTRY',
            readingType: readingType,
            recordedAt: new Date().toISOString()
          }
        : pump
    );

    setPumps(updatedPumps);
    updateParentReadings(updatedPumps, null);
  }, [pumps, readingType, updateParentReadings]);

  // ========== 🔧 UPDATED AREA: Tank reading change handler with currentVolume fix ==========
  const handleTankReadingChange = useCallback((tankId, field, value) => {
    const updatedTanks = tanks.map(tank => {
      if (tank.id !== tankId) return tank;
      
      const updatedTank = { 
        ...tank, 
        [field]: value, 
        source: 'MANUAL_ENTRY',
        readingType: readingType,
        recordedAt: new Date().toISOString()
      };
      
      // ✅ CRITICAL: Auto-sync volume and currentVolume for opening readings
      if (field === 'volume') {
        updatedTank.currentVolume = value;
      }
      if (field === 'currentVolume' && readingType === 'START') {
        updatedTank.volume = value;
      }
      
      // ✅ DOUBLE CHECK: Ensure currentVolume is never undefined
      if (updatedTank.currentVolume === undefined || updatedTank.currentVolume === '') {
        updatedTank.currentVolume = updatedTank.volume || '0';
      }
      
      return updatedTank;
    });

    setTanks(updatedTanks);
    updateParentReadings(null, updatedTanks);
  }, [tanks, readingType, updateParentReadings]);

  const handleRefreshReadings = () => {
    loadReadingsData();
  };

  // ========== 🔧 UPDATED AREA: Debug function to check currentVolume issues ==========
  const debugCurrentVolume = useCallback(() => {
    console.log('🔍 Debug currentVolume in tanks:');
    tanks.forEach(tank => {
      console.log(`Tank ${tank.id}:`, {
        volume: tank.volume,
        currentVolume: tank.currentVolume,
        typeVolume: typeof tank.volume,
        typeCurrentVolume: typeof tank.currentVolume
      });
    });
  }, [tanks]);

  // Statistics with useMemo for performance
  const pumpStats = useMemo(() => ({
    total: pumps.length,
    withReadings: pumps.filter(p => 
      p.electricMeter !== '' && p.manualMeter !== '' && p.cashMeter !== ''
    ).length,
    autoFilled: pumps.filter(p => p.source === 'PREVIOUS_SHIFT').length,
    manualEntry: pumps.filter(p => p.source === 'MANUAL_ENTRY').length,
    newPumps: pumps.filter(p => !p.hasPreviousReading).length,
    complete: pumps.filter(p => 
      p.electricMeter !== '' && p.manualMeter !== '' && p.cashMeter !== ''
    ).length
  }), [pumps]);

  const tankStats = useMemo(() => {
    const tanksWithReadings = tanks.filter(t => t.volume !== '');
    return {
      total: tanks.length,
      withReadings: tanksWithReadings.length,
      autoFilled: tanks.filter(t => t.source === 'PREVIOUS_SHIFT').length,
      manualEntry: tanks.filter(t => t.source === 'MANUAL_ENTRY').length,
      newTanks: tanks.filter(t => !t.hasPreviousReading).length,
      complete: tanksWithReadings.length
    };
  }, [tanks]);

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
          <Space direction="vertical" size={2}>
            <Space>
              <Zap size={16} color="#faad14" />
              <div>
                <div style={{ fontWeight: 'bold' }}>{pump.name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {pump.product?.name || 'No Product'} 
                </div>
              </div>
            </Space>
            <Space size={4}>
              {pump.hasPreviousReading && (
                <Tag color="blue" style={{ fontSize: 10 }}>
                  Has Previous
                </Tag>
              )}
              <Tag color={status.color} style={{ fontSize: 10 }}>
                {status.text}
              </Tag>
            </Space>
          </Space>
        );
      },
      width: 250
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
              status={!pump.electricMeter ? 'error' : ''}
            />
            {pump.previousElectricMeter && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {pump.previousElectricMeter}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Manual Meter',
      key: 'manual',
      render: (_, pump) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={pump.manualMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'manualMeter', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              status={!pump.manualMeter ? 'error' : ''}
            />
            {pump.previousManualMeter && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {pump.previousManualMeter}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Cash Meter',
      key: 'cash',
      render: (_, pump) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={pump.cashMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'cashMeter', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              status={!pump.cashMeter ? 'error' : ''}
            />
            {pump.previousCashMeter && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {pump.previousCashMeter}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      render: (_, pump) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.01"
              value={pump.unitPrice}
              onChange={(e) => handlePumpReadingChange(pump.id, 'unitPrice', e.target.value)}
              placeholder="150.00"
              style={{ width: 100 }}
            />
            {pump.previousUnitPrice && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {pump.previousUnitPrice}
              </Text>
            )}
          </Space>
        );
      }
    }
  ];

  // Enhanced tank columns
  const tankColumns = [
    {
      title: 'Tank Details',
      key: 'details',
      render: (_, tank) => {
        const status = getTankReadingStatus(tank);
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <Droplets size={16} color="#1890ff" />
              <div>
                <div style={{ fontWeight: 'bold' }}>{tank.name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {tank.product?.name || 'No Product'} 
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  Capacity: {tank.capacity?.toLocaleString()}L
                </div>
              </div>
            </Space>
            <Space size={4}>
              {tank.hasPreviousReading && (
                <Tag color="blue" style={{ fontSize: 10 }}>
                  Has Previous
                </Tag>
              )}
              <Tag color={status.color} style={{ fontSize: 10 }}>
                {status.text}
              </Tag>
            </Space>
          </Space>
        );
      },
      width: 250
    },
    {
      title: (
        <Tooltip title="Volume and Current Volume are synchronized for opening readings">
          <Space>
            Volume (L)
            <Info size={12} />
          </Space>
        </Tooltip>
      ),
      key: 'volume',
      render: (_, tank) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={tank.volume}
              onChange={(e) => handleTankReadingChange(tank.id, 'volume', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              status={!tank.volume ? 'error' : ''}
            />
            {tank.previousVolume && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {tank.previousVolume}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Current Volume (L)',
      key: 'currentVolume',
      render: (_, tank) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.001"
              value={tank.currentVolume}
              onChange={(e) => handleTankReadingChange(tank.id, 'currentVolume', e.target.value)}
              placeholder="0.000"
              style={{ width: 120 }}
              status={!tank.currentVolume ? 'error' : ''}
            />
            {tank.previousCurrentVolume && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {tank.previousCurrentVolume}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Temperature (°C)',
      key: 'temperature',
      render: (_, tank) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.1"
              value={tank.temperature}
              onChange={(e) => handleTankReadingChange(tank.id, 'temperature', e.target.value)}
              style={{ width: 100 }}
            />
            {tank.previousTemperature && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {tank.previousTemperature}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Water Level',
      key: 'waterLevel',
      render: (_, tank) => {
        return (
          <Space direction="vertical" size={4}>
            <Input
              type="number"
              step="0.01"
              value={tank.waterLevel}
              onChange={(e) => handleTankReadingChange(tank.id, 'waterLevel', e.target.value)}
              style={{ width: 100 }}
            />
            {tank.previousWaterLevel && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Prev: {tank.previousWaterLevel}
              </Text>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Enhanced Station & Shift Info */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 8]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={0}>
              <Text strong>Station: {state?.currentStation?.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Shift: <code>{shiftId}</code> • Reading Type: 
                <Tag color={readingType === 'START' ? 'green' : 'blue'} style={{ marginLeft: 8 }}>
                  {readingType}
                </Tag>
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<RefreshCw size={14} />} 
                onClick={handleRefreshReadings}
                size="small"
                loading={loading}
              >
                Refresh
              </Button>
              {/* ========== 🔧 UPDATED AREA: Debug button for currentVolume issues ========== */}
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  size="small"
                  onClick={debugCurrentVolume}
                  type="dashed"
                >
                  Debug CurrentVolume
                </Button>
              )}
              {lastSync && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Synced: {lastSync.toLocaleTimeString()}
                </Text>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Auto-fill Status */}
      {autoFilled && (
        <Alert
          message="Readings Loaded Successfully"
          description={
            <div>
              <div>
                {pumpStats.autoFilled} pumps and {tankStats.autoFilled} tanks auto-filled from previous shift.
              </div>
              <div>
                {pumpStats.manualEntry} manual pump entries and {tankStats.manualEntry} manual tank entries.
              </div>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Statistics Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Pumps"
              value={pumpStats.total}
              prefix={<Zap size={16} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Pumps Ready"
              value={pumpStats.complete}
              suffix={`/ ${pumpStats.total}`}
              prefix={<CheckCircle size={16} />}
              valueStyle={{ color: pumpStats.complete === pumpStats.total ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Tanks"
              value={tankStats.total}
              prefix={<Droplets size={16} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Tanks Ready"
              value={tankStats.complete}
              suffix={`/ ${tankStats.total}`}
              prefix={<CheckCircle size={16} />}
              valueStyle={{ color: tankStats.complete === tankStats.total ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Auto-filled"
              value={pumpStats.autoFilled + tankStats.autoFilled}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Manual Entry"
              value={pumpStats.manualEntry + tankStats.manualEntry}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Readings Tabs */}
      <Card 
        size="small" 
        title={
          <Space>
            {readingType === 'START' ? 'Opening' : 'Closing'} Readings
            <Badge 
              count={pumpStats.complete + tankStats.complete} 
              showZero 
              style={{ 
                backgroundColor: (pumpStats.complete + tankStats.complete) === (pumpStats.total + tankStats.total) ? '#52c41a' : '#faad14' 
              }} 
            />
          </Space>
        }
      >
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
                    count={pumpStats.complete} 
                    showZero 
                    style={{ 
                      backgroundColor: pumpStats.complete === pumpStats.total ? '#52c41a' : '#faad14' 
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
                    count={tankStats.complete} 
                    showZero 
                    style={{ 
                      backgroundColor: tankStats.complete === tankStats.total ? '#52c41a' : '#faad14' 
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
                  scroll={{ x: 1300 }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* Validation Status */}
      {!canProceedToNext && (
        <Alert
          message="Complete All Readings Required"
          description={`Please ensure all ${pumps.length} pumps and ${tanks.length} tanks have readings before proceeding. Missing: ${pumpStats.total - pumpStats.complete} pumps, ${tankStats.total - tankStats.complete} tanks.`}
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {/* Data Preservation Notice */}
      <Alert
        message="Data Auto-saved"
        description="All changes are automatically saved. You can navigate between steps without losing data."
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default ReadingsStep;