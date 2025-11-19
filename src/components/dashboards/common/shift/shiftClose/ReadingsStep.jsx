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
  Divider,
  Select
} from 'antd';
import { 
  Gauge, 
  Fuel, 
  Zap, 
  Droplets,
  CheckCircle,
  Calculator,
  ArrowRight,
  User,
  Clock,
  Users
} from 'lucide-react';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { islandPumpMappingService } from '../../../../../services/assetTopologyService/islandPumpMappingService';
import { assetTopologyService } from '../../../../../services/assetTopologyService/assetTopologyService';

import { useApp } from '../../../../../context/AppContext';

const { Text, Title } = Typography;
const { Option } = Select;

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
  const [shiftData, setShiftData] = useState(null);
  const [islandMapping, setIslandMapping] = useState(null);
  const [islandAttendants, setIslandAttendants] = useState({});
  
  // Global meter selection for ALL pumps
  const [globalMeterType, setGlobalMeterType] = useState('electric');

  // Load opening readings from open shift endpoint
  useEffect(() => {
    if (currentStationId) {
      loadOpenShiftData();
    }
  }, [currentStationId]);

  // FIXED: Only recalculate on blur (when user finishes entering data)
  const recalculateOtherMeters = useCallback((pumpId, selectedMeterType, enteredValue) => {
    if (!enteredValue || enteredValue === '') return;
    
    setPumps(prevPumps => {
      return prevPumps.map(pump => {
        if (pump.id !== pumpId) return pump;
        
        const openingElectric = parseFloat(pump.openingElectricMeter) || 0;
        const openingManual = parseFloat(pump.openingManualMeter) || 0;
        const openingCash = parseFloat(pump.openingCashMeter) || 0;
        const unitPrice = parseFloat(pump.unitPrice) || 0;
        
        const enteredValueNum = parseFloat(enteredValue) || 0;
        
        let litersDispensed = 0;
        let closingElectric = parseFloat(pump.closingElectricMeter) || openingElectric;
        let closingManual = parseFloat(pump.closingManualMeter) || openingManual;
        let closingCash = parseFloat(pump.closingCashMeter) || openingCash;
        
        // Set the entered value first
        switch (selectedMeterType) {
          case 'electric':
            closingElectric = enteredValueNum;
            litersDispensed = Math.max(0, closingElectric - openingElectric);
            closingManual = openingManual + litersDispensed;
            closingCash = openingCash + (litersDispensed * unitPrice);
            break;
            
          case 'manual':
            closingManual = enteredValueNum;
            litersDispensed = Math.max(0, closingManual - openingManual);
            closingElectric = openingElectric + litersDispensed;
            closingCash = openingCash + (litersDispensed * unitPrice);
            break;
            
          case 'cash':
            closingCash = enteredValueNum;
            const cashDifference = Math.max(0, closingCash - openingCash);
            litersDispensed = unitPrice > 0 ? cashDifference / unitPrice : 0;
            closingElectric = openingElectric + litersDispensed;
            closingManual = openingManual + litersDispensed;
            break;
            
          default:
            return pump;
        }
        
        return {
          ...pump,
          closingElectricMeter: closingElectric.toFixed(3),
          closingManualMeter: closingManual.toFixed(3),
          closingCashMeter: closingCash.toFixed(2)
        };
      });
    });
  }, []);

  const handleGlobalMeterTypeChange = (newMeterType) => {
    setGlobalMeterType(newMeterType);
  };

  const loadOpenShiftData = async () => {
    if (!currentStationId) return;
    
    setLoading(true);
    try {
      const [openShiftData, mapping, topologyData] = await Promise.all([
        shiftService.getOpenShift(currentStationId),
        islandPumpMappingService.getIslandPumpMapping(currentStationId),
        assetTopologyService.getIslandsWithPumpsAndTanks(currentStationId)
      ]);

      if (!openShiftData) {
        message.error('No open shift found for this station');
        return;
      }

      setShiftData(openShiftData);
      setIslandMapping(mapping);

      // Create island-attendant mapping
      const attendantsByIsland = {};
      (openShiftData.shiftIslandAttendant || []).forEach((assignment) => {
        if (assignment.islandId && assignment.attendant) {
          if (!attendantsByIsland[assignment.islandId]) {
            attendantsByIsland[assignment.islandId] = [];
          }
          
          const attendantInfo = {
            id: assignment.attendant.id,
            firstName: assignment.attendant.firstName,
            lastName: assignment.attendant.lastName,
            assignmentType: assignment.assignmentType,
            attendantId: assignment.attendantId,
            assignmentId: assignment.id
          };
          
          attendantsByIsland[assignment.islandId].push(attendantInfo);
        }
      });

      setIslandAttendants(attendantsByIsland);

      // Create pump product map from topology
      const pumpProductMap = new Map();
      const topologyIslands = topologyData.data?.islands || topologyData.islands || [];
      
      topologyIslands.forEach((island) => {
        if (island.pumps && Array.isArray(island.pumps)) {
          island.pumps.forEach((pump) => {
            if (pump.product) {
              pumpProductMap.set(pump.id, {
                productId: pump.product.id,
                product: pump.product,
                unitPrice: pump.product.baseCostPrice || pump.product.minSellingPrice || 0
              });
            }
          });
        }
      });

      // Transform pump readings
      const transformedPumps = (openShiftData.meterReadings || []).map(meterReading => {
        const productInfo = pumpProductMap.get(meterReading.pumpId);

        // Find which island this pump belongs to
        let pumpIslandId = null;
        let pumpIslandName = 'Unassigned';
        let islandAttendants = [];
        
        for (const [islandId, pumpIds] of Object.entries(mapping)) {
          if (pumpIds.includes(meterReading.pumpId)) {
            pumpIslandId = islandId;
            const islandAssignment = openShiftData.shiftIslandAttendant?.find(
              assignment => assignment.islandId === islandId
            );
            pumpIslandName = islandAssignment?.island?.code || `Island ${islandId.slice(0, 8)}`;
            islandAttendants = attendantsByIsland[islandId] || [];
            break;
          }
        }

        const finalProductInfo = productInfo || {
          productId: meterReading.pump?.product?.id,
          product: meterReading.pump?.product || { name: 'Fuel' },
          unitPrice: meterReading.unitPrice || 0
        };

        return {
          id: meterReading.pumpId,
          pumpId: meterReading.pumpId,
          productId: finalProductInfo.productId,
          name: meterReading.pump?.asset?.name || `Pump ${meterReading.pumpId.slice(0, 8)}`,
          product: finalProductInfo.product,
          openingElectricMeter: meterReading.electricMeter || 0,
          openingManualMeter: meterReading.manualMeter || 0,
          openingCashMeter: meterReading.cashMeter || 0,
          unitPrice: finalProductInfo.unitPrice,
          closingElectricMeter: '',
          closingManualMeter: '',
          closingCashMeter: '',
          islandId: pumpIslandId,
          islandName: pumpIslandName,
          islandAttendants: islandAttendants
        };
      });

      // Transform tank readings
      const transformedTanks = (openShiftData.dipReadings || []).map(dipReading => ({
        id: dipReading.tankId,
        tankId: dipReading.tankId,
        name: dipReading.tank?.asset?.name || `Tank ${dipReading.tankId.slice(0, 8)}`,
        product: dipReading.tank?.product || { name: 'Fuel' },
        capacity: dipReading.tank?.capacity || 10000,
        openingVolume: dipReading.volume || 0,
        openingDipValue: dipReading.dipValue || 0,
        openingCurrentVolume: dipReading.currentVolume || dipReading.volume || 0,
        closingVolume: '',
        closingDipValue: 2.5,
        closingCurrentVolume: ''
      }));

      setPumps(transformedPumps);
      setTanks(transformedTanks);
      setAutoFilled(true);
      
    } catch (error) {
      console.error('❌ Error loading open shift readings:', error);
      message.error('Failed to load open shift readings');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Handle input change without any calculations - just update the value
  const handlePumpReadingChange = (pumpId, field, value) => {
    setPumps(prev => prev.map(pump => 
      pump.id === pumpId ? { ...pump, [field]: value } : pump
    ));
  };

  // FIXED: Only recalculate on blur (when user leaves the field)
  const handlePumpReadingBlur = (pumpId, field, value) => {
    const fieldMeterType = field.replace('closing', '').replace('Meter', '').toLowerCase();
    
    // Only recalculate if this is the selected meter type and we have a value
    if (fieldMeterType === globalMeterType && value && value !== '') {
      recalculateOtherMeters(pumpId, globalMeterType, value);
    }
  };

  const handleTankReadingChange = (tankId, field, value) => {
    const updatedTanks = tanks.map(tank => {
      if (tank.id === tankId) {
        const updatedTank = { ...tank, [field]: value };
        
        if (field === 'closingVolume' && value) {
          const openingVolume = parseFloat(tank.openingCurrentVolume) || parseFloat(tank.openingVolume) || 0;
          const closingVolume = parseFloat(value) || 0;
          updatedTank.closingCurrentVolume = closingVolume;
        }
        
        return updatedTank;
      }
      return tank;
    });
    
    setTanks(updatedTanks);
  };

  // Calculate statistics based on GLOBAL meter selection
  const pumpStats = useMemo(() => {
    const total = pumps.length;
    
    // Completion based on selected global meter
    const completed = pumps.filter(p => {
      const closingField = `closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`;
      return p[closingField] && p[closingField] !== '';
    }).length;
    
    const totalLiters = pumps.reduce((sum, pump) => {
      const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const unitPrice = parseFloat(pump.unitPrice) || 0;
      
      let liters = 0;
      if (globalMeterType === 'cash') {
        liters = unitPrice > 0 ? Math.max(0, (closing - opening) / unitPrice) : 0;
      } else {
        liters = Math.max(0, closing - opening);
      }
      
      return sum + liters;
    }, 0);

    const totalSales = pumps.reduce((sum, pump) => {
      const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const unitPrice = parseFloat(pump.unitPrice) || 0;
      
      let sales = 0;
      if (globalMeterType === 'cash') {
        sales = Math.max(0, closing - opening);
      } else {
        const liters = Math.max(0, closing - opening);
        sales = liters * unitPrice;
      }
      
      return sum + sales;
    }, 0);

    return { total, completed, totalLiters, totalSales };
  }, [pumps, globalMeterType]);

  const tankStats = useMemo(() => ({
    total: tanks.length,
    completed: tanks.filter(t => t.closingVolume).length,
  }), [tanks]);

  const pumpsByIsland = useMemo(() => {
    const grouped = {};
    pumps.forEach(pump => {
      const islandKey = pump.islandId || 'unassigned';
      if (!grouped[islandKey]) {
        grouped[islandKey] = {
          islandId: pump.islandId,
          islandName: pump.islandName,
          pumps: []
        };
      }
      grouped[islandKey].pumps.push(pump);
    });
    return grouped;
  }, [pumps]);

  const allReadingsComplete = pumpStats.completed === pumpStats.total && 
                              tankStats.completed === tankStats.total;

  const handleProceedToIslandSales = () => {
    // Prepare pump readings for API payload
    const pumpReadingsPayload = pumps.map(pump => {
      const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const unitPrice = parseFloat(pump.unitPrice) || 0;
      
      let litersDispensed = 0;
      let salesValue = 0;
      
      if (globalMeterType === 'cash') {
        salesValue = Math.max(0, closing - opening);
        litersDispensed = unitPrice > 0 ? salesValue / unitPrice : 0;
      } else {
        litersDispensed = Math.max(0, closing - opening);
        salesValue = litersDispensed * unitPrice;
      }

      return {
        pumpId: pump.pumpId,
        productId: pump.productId,
        electricMeter: parseFloat(pump.closingElectricMeter) || 0,
        manualMeter: parseFloat(pump.closingManualMeter) || 0,
        cashMeter: parseFloat(pump.closingCashMeter) || 0,
        litersDispensed: litersDispensed,
        salesValue: salesValue,
        unitPrice: unitPrice,
        meterUsed: globalMeterType
      };
    });

    // Prepare tank readings for API payload
    const tankReadingsPayload = tanks.map(tank => {
      const closingVolume = parseFloat(tank.closingVolume) || 0;
      const currentVolume = parseFloat(tank.closingCurrentVolume) || closingVolume;
      
      return {
        tankId: tank.tankId,
        dipValue: tank.closingDipValue,
        volume: closingVolume,
        currentVolume: currentVolume,
        temperature: 28.5,
        waterLevel: 0.1,
        density: 0.85
      };
    });

    // Prepare structured data for IslandSalesStep
    const islandSalesData = {
      shiftId: shiftData?.id,
      stationId: currentStationId,
      shiftNumber: shiftData?.shiftNumber,
      supervisor: shiftData?.supervisor,
      meterTypeUsed: globalMeterType,
      
      pumpReadings: pumpReadingsPayload,
      tankReadings: tankReadingsPayload,
      
      islands: Object.entries(pumpsByIsland).map(([islandKey, islandData]) => {
        const islandAttendantList = islandAttendants[islandData.islandId] || [];
        
        const islandPumps = islandData.pumps.map(pump => {
          const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
          const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
          const unitPrice = parseFloat(pump.unitPrice) || 0;
          
          let litersDispensed = 0;
          let expectedSales = 0;
          
          if (globalMeterType === 'cash') {
            expectedSales = Math.max(0, closing - opening);
            litersDispensed = unitPrice > 0 ? expectedSales / unitPrice : 0;
          } else {
            litersDispensed = Math.max(0, closing - opening);
            expectedSales = litersDispensed * unitPrice;
          }

          return {
            pumpId: pump.pumpId,
            pumpName: pump.name,
            product: pump.product,
            openingElectricMeter: parseFloat(pump.openingElectricMeter) || 0,
            closingElectricMeter: parseFloat(pump.closingElectricMeter) || 0,
            openingManualMeter: parseFloat(pump.openingManualMeter) || 0,
            closingManualMeter: parseFloat(pump.closingManualMeter) || 0,
            openingCashMeter: parseFloat(pump.openingCashMeter) || 0,
            closingCashMeter: parseFloat(pump.closingCashMeter) || 0,
            unitPrice: unitPrice,
            litersDispensed: litersDispensed,
            expectedSales: expectedSales,
            actualSales: 0,
            difference: 0,
            meterUsed: globalMeterType
          };
        });

        const totalExpectedSales = islandPumps.reduce((sum, pump) => sum + pump.expectedSales, 0);

        return {
          islandId: islandData.islandId,
          islandName: islandData.islandName,
          attendants: islandAttendantList,
          pumps: islandPumps,
          totalExpectedSales: totalExpectedSales,
          totalActualSales: 0,
          totalDifference: 0
        };
      }),

      summary: {
        totalPumps: pumps.length,
        totalLiters: pumpStats.totalLiters,
        totalExpectedSales: pumpStats.totalSales,
        totalIslands: Object.keys(pumpsByIsland).length,
        totalAttendants: Object.values(islandAttendants).flat().length,
        islandsWithAttendants: Object.keys(islandAttendants).length,
        meterTypeUsed: globalMeterType
      }
    };

    console.log('🚀 Proceeding to Island Sales with GLOBAL meter type:', globalMeterType);
    onProceedToIslandSales?.(islandSalesData);
  };

  // COMPACT Pump columns with single cell design and BLUR handling
  const pumpColumns = [
    {
      title: 'PUMP DETAILS',
      key: 'pump',
      width: 160,
      fixed: 'left',
      render: (_, pump) => (
        <Space size={4} direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={14} color="#faad14" />
            <Text strong style={{ fontSize: '12px' }}>{pump.name}</Text>
          </div>
          <div style={{ 
            padding: '1px 4px', 
            backgroundColor: pump.islandId ? '#e6f7ff' : '#fff2e8',
            borderRadius: '2px',
            fontSize: '9px',
            textAlign: 'center'
          }}>
            {pump.islandName}
          </div>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {pump.product?.name || 'Fuel'}
          </Text>
          <Text type="secondary" style={{ fontSize: '9px', color: '#1890ff' }}>
            KES {pump.unitPrice?.toFixed(2)}/L
          </Text>
        </Space>
      ),
    },
    {
      title: 'ELECTRIC METER',
      key: 'electric',
      width: 120,
      render: (_, pump) => {
        const isSelected = globalMeterType === 'electric';
        return (
          <div style={{ 
            padding: '4px',
            backgroundColor: isSelected ? '#f0f8ff' : 'transparent',
            borderRadius: '4px',
            border: isSelected ? '1px solid #1890ff' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
              <Text strong style={{ fontSize: '11px', color: '#1890ff', fontWeight: '700' }}>
                {parseFloat(pump.openingElectricMeter).toFixed(3)}
              </Text>
            </div>
            <Input
              size="small"
              type="number"
              step="0.001"
              value={pump.closingElectricMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'closingElectricMeter', e.target.value)}
              onBlur={(e) => handlePumpReadingBlur(pump.id, 'closingElectricMeter', e.target.value)}
              placeholder="Closing"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                height: '26px',
                textAlign: 'center',
                fontWeight: '600',
                border: '1px solid #d9d9d9'
              }}
            />
          </div>
        );
      },
    },
    {
      title: 'MANUAL METER',
      key: 'manual',
      width: 120,
      render: (_, pump) => {
        const isSelected = globalMeterType === 'manual';
        return (
          <div style={{ 
            padding: '4px',
            backgroundColor: isSelected ? '#f6ffed' : 'transparent',
            borderRadius: '4px',
            border: isSelected ? '1px solid #52c41a' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
              <Text strong style={{ fontSize: '11px', color: '#52c41a', fontWeight: '700' }}>
                {parseFloat(pump.openingManualMeter).toFixed(3)}
              </Text>
            </div>
            <Input
              size="small"
              type="number"
              step="0.001"
              value={pump.closingManualMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'closingManualMeter', e.target.value)}
              onBlur={(e) => handlePumpReadingBlur(pump.id, 'closingManualMeter', e.target.value)}
              placeholder="Closing"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                height: '26px',
                textAlign: 'center',
                fontWeight: '600',
                border: '1px solid #d9d9d9'
              }}
            />
          </div>
        );
      },
    },
    {
      title: 'CASH METER',
      key: 'cash',
      width: 120,
      render: (_, pump) => {
        const isSelected = globalMeterType === 'cash';
        return (
          <div style={{ 
            padding: '4px',
            backgroundColor: isSelected ? '#fff7e6' : 'transparent',
            borderRadius: '4px',
            border: isSelected ? '1px solid #fa8c16' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
              <Text strong style={{ fontSize: '11px', color: '#fa8c16', fontWeight: '700' }}>
                {parseFloat(pump.openingCashMeter).toFixed(2)}
              </Text>
            </div>
            <Input
              size="small"
              type="number"
              step="0.01"
              value={pump.closingCashMeter}
              onChange={(e) => handlePumpReadingChange(pump.id, 'closingCashMeter', e.target.value)}
              onBlur={(e) => handlePumpReadingBlur(pump.id, 'closingCashMeter', e.target.value)}
              placeholder="Closing"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                height: '26px',
                textAlign: 'center',
                fontWeight: '600',
                border: '1px solid #d9d9d9'
              }}
            />
          </div>
        );
      },
    },
    {
      title: 'SALES',
      key: 'sales',
      width: 100,
      render: (_, pump) => {
        const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
        const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
        const unitPrice = parseFloat(pump.unitPrice) || 0;
        
        let liters = 0;
        let sales = 0;
        
        if (globalMeterType === 'cash') {
          sales = Math.max(0, closing - opening);
          liters = unitPrice > 0 ? sales / unitPrice : 0;
        } else {
          liters = Math.max(0, closing - opening);
          sales = liters * unitPrice;
        }

        return (
          <div style={{ textAlign: 'center', padding: '4px' }}>
            <Text strong style={{ fontSize: '12px', color: '#722ed1', fontWeight: '700' }}>
              KES {sales.toFixed(2)}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>
              {liters.toFixed(1)}L
            </div>
          </div>
        );
      },
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 80,
      render: (_, pump) => {
        const closingField = `closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`;
        const isComplete = pump[closingField] && pump[closingField] !== '';
        
        return (
          <div style={{ textAlign: 'center' }}>
            {isComplete ? (
              <Badge status="success" text="" />
            ) : (
              <Badge status="processing" text="" />
            )}
          </div>
        );
      },
    },
  ];

  // Tank columns with the same compact design
  const tankColumns = [
    {
      title: 'TANK DETAILS',
      key: 'tank',
      width: 150,
      render: (_, tank) => (
        <Space size={4} direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Droplets size={14} color="#1890ff" />
            <Text strong style={{ fontSize: '12px' }}>{tank.name}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {tank.product?.name || 'Fuel'}
          </Text>
          <Text type="secondary" style={{ fontSize: '9px' }}>
            {tank.capacity?.toLocaleString()}L
          </Text>
        </Space>
      ),
    },
    {
      title: 'VOLUME',
      key: 'volume',
      width: 140,
      render: (_, tank) => {
        const openingVolume = parseFloat(tank.openingCurrentVolume || tank.openingVolume) || 0;
        const closingVolume = parseFloat(tank.closingVolume) || 0;
        const currentVolume = parseFloat(tank.closingCurrentVolume) || closingVolume;
        
        return (
          <div style={{ padding: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
              <Text strong style={{ fontSize: '11px', color: '#1890ff', fontWeight: '700' }}>
                {openingVolume.toFixed(1)}L
              </Text>
            </div>
            <Input
              size="small"
              type="number"
              step="0.1"
              value={tank.closingVolume}
              onChange={(e) => handleTankReadingChange(tank.id, 'closingVolume', e.target.value)}
              placeholder="Closing volume"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                height: '26px',
                textAlign: 'center',
                fontWeight: '600',
                border: '1px solid #d9d9d9'
              }}
            />
          </div>
        );
      },
    },
    {
      title: 'CURRENT VOL',
      key: 'currentVolume',
      width: 120,
      render: (_, tank) => {
        const closingVolume = parseFloat(tank.closingVolume) || 0;
        const currentVolume = parseFloat(tank.closingCurrentVolume) || closingVolume;
        
        return (
          <div style={{ padding: '4px' }}>
            <Input
              size="small"
              type="number"
              step="0.1"
              value={tank.closingCurrentVolume}
              onChange={(e) => handleTankReadingChange(tank.id, 'closingCurrentVolume', e.target.value)}
              placeholder="Current vol"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                height: '26px',
                textAlign: 'center',
                fontWeight: '600',
                border: '2px solid #722ed1'
              }}
            />
            {tank.closingCurrentVolume && (
              <Text style={{ fontSize: '9px', color: '#722ed1', textAlign: 'center', marginTop: '2px', fontWeight: '600' }}>
                {currentVolume !== closingVolume ? 'Manual' : 'Auto'}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'DIP VALUE',
      key: 'dip',
      width: 100,
      render: (_, tank) => (
        <div style={{ padding: '4px', textAlign: 'center' }}>
          <div style={{ marginBottom: '2px' }}>
            <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
            <Text strong style={{ fontSize: '11px', color: '#52c41a', display: 'block', fontWeight: '700' }}>
              {parseFloat(tank.openingDipValue).toFixed(3)}
            </Text>
          </div>
          <div style={{ 
            padding: '2px 4px', 
            backgroundColor: '#f9f0ff', 
            borderRadius: '2px',
            border: '1px dashed #d3adf7'
          }}>
            <Text strong style={{ fontSize: '11px', color: '#722ed1', fontWeight: '700' }}>
              {tank.closingDipValue}
            </Text>
            <div style={{ fontSize: '8px', color: '#666' }}>Closing</div>
          </div>
        </div>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 80,
      render: (_, tank) => {
        const hasClosingVolume = !!tank.closingVolume;
        const hasCurrentVolume = !!tank.closingCurrentVolume;
        
        let status = 'processing';
        
        if (hasClosingVolume && hasCurrentVolume) {
          status = 'success';
        } else if (hasClosingVolume && !hasCurrentVolume) {
          status = 'warning';
        }
        
        return (
          <div style={{ textAlign: 'center' }}>
            <Badge status={status} text="" />
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          📊 Shift Closing - Readings Collection
        </Title>
        
        {/* Global Meter Selection */}
        <Card 
          size="small" 
          style={{ marginBottom: 12 }}
          bodyStyle={{ padding: '8px 12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: '13px' }}>Meter Calculation Method:</Text>
            <Select
              value={globalMeterType}
              onChange={handleGlobalMeterTypeChange}
              style={{ width: 160 }}
              size="small"
            >
              <Option value="electric">⚡ Electric Meter</Option>
              <Option value="manual">📝 Manual Meter</Option>
              <Option value="cash">💰 Cash Meter</Option>
            </Select>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {globalMeterType === 'electric' && 'Liters = Closing Electric - Opening Electric'}
              {globalMeterType === 'manual' && 'Liters = Closing Manual - Opening Manual'}  
              {globalMeterType === 'cash' && 'Liters = (Closing Cash - Opening Cash) ÷ Unit Price'}
            </Text>
          </div>
        </Card>

        {/* Enhanced Shift Info */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          padding: '12px', 
          backgroundColor: '#f0f8ff', 
          borderRadius: '6px',
          fontSize: '12px',
          marginBottom: 12,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} color="#1890ff" />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Supervisor</div>
              <div style={{ fontSize: '11px' }}>{shiftData?.supervisor?.firstName} {shiftData?.supervisor?.lastName}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#52c41a" />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Shift</div>
              <div style={{ fontSize: '11px' }}>{shiftData?.shiftNumber || shiftInfo?.shiftNumber || 'Current Shift'}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="#faad14" />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Attendants</div>
              <div style={{ fontSize: '11px' }}>{shiftData?.shiftIslandAttendant?.length || 0} assigned</div>
            </div>
          </div>
          
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Station</div>
            <div style={{ fontSize: '11px' }}>{state?.currentStation?.name}</div>
          </div>
        </div>
      </div>

      {/* Auto-fill Status */}
      {autoFilled && (
        <Alert
          message="✅ Opening Readings Loaded from Open Shift"
          description={`Successfully loaded ${pumps.length} pumps and ${tanks.length} tanks with opening readings`}
          type="success"
          showIcon
          style={{ marginBottom: 12, fontSize: '12px' }}
          size="small"
        />
      )}

      {/* Quick Stats */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Pumps Ready"
              value={`${pumpStats.completed}/${pumpStats.total}`}
              prefix={<CheckCircle size={12} />}
              valueStyle={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: pumpStats.completed === pumpStats.total ? '#3f8600' : '#faad14' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Liters Dispensed"
              value={pumpStats.totalLiters}
              precision={1}
              suffix="L"
              prefix={<Droplets size={12} />}
              valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Expected Sales"
              value={pumpStats.totalSales}
              precision={2}
              prefix="KES"
              valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            size="small" 
            bodyStyle={{ 
              padding: '8px', 
              textAlign: 'center',
              backgroundColor: allReadingsComplete ? '#f6ffed' : '#fff7e6'
            }}
          >
            <Statistic
              title="Overall Status"
              value={allReadingsComplete ? "READY" : "IN PROGRESS"}
              valueStyle={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: allReadingsComplete ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {/* Readings Tabs */}
      <Card 
        bodyStyle={{ padding: '12px' }}
        style={{ marginBottom: 16 }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="small"
          items={[
            {
              key: 'pumps',
              label: (
                <Space size={4}>
                  <Gauge size={14} />
                  <Text strong style={{ fontSize: '12px' }}>Pump Meters</Text>
                  <Badge 
                    count={pumpStats.completed} 
                    showZero 
                    size="small"
                    style={{ 
                      backgroundColor: pumpStats.completed === pumpStats.total ? '#52c41a' : '#faad14',
                      fontWeight: 'bold'
                    }} 
                  />
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    message={`Using ${globalMeterType.toUpperCase()} Meter for Calculations`}
                    description={
                      globalMeterType === 'electric' 
                        ? 'Sales = (Closing - Opening) × Unit Price'
                        : globalMeterType === 'manual'
                        ? 'Sales = (Closing - Opening) × Unit Price'  
                        : 'Liters = (Closing - Opening) ÷ Unit Price'
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 12, fontSize: '11px' }}
                    size="small"
                  />
                  <Table
                    columns={pumpColumns}
                    dataSource={pumps}
                    pagination={false}
                    size="small"
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 800 }}
                    style={{ fontSize: '11px' }}
                    className="compact-table"
                  />
                </div>
              )
            },
            {
              key: 'tanks',
              label: (
                <Space size={4}>
                  <Fuel size={14} />
                  <Text strong style={{ fontSize: '12px' }}>Tank Readings</Text>
                  <Badge 
                    count={tankStats.completed} 
                    showZero 
                    size="small"
                    style={{ 
                      backgroundColor: tankStats.completed === tankStats.total ? '#52c41a' : '#faad14',
                      fontWeight: 'bold'
                    }} 
                  />
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    message="Tank Volume Recording"
                    description="Enter closing volume to calculate current inventory levels"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12, fontSize: '11px' }}
                    size="small"
                  />
                  <Table
                    columns={tankColumns}
                    dataSource={tanks}
                    pagination={false}
                    size="small"
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 600 }}
                    style={{ fontSize: '11px' }}
                    className="compact-table"
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Action Button */}
      <div style={{ 
        textAlign: 'center', 
        padding: '16px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Button 
          type="primary"
          size="middle"
          icon={<Calculator size={14} />}
          onClick={handleProceedToIslandSales}
          disabled={!allReadingsComplete}
          style={{ 
            height: '40px',
            fontSize: '14px',
            fontWeight: 'bold',
            padding: '0 24px'
          }}
        >
          {allReadingsComplete ? (
            <Space size={6}>
              <ArrowRight size={14} />
              PROCEED TO ISLAND SALES
              <ArrowRight size={14} />
            </Space>
          ) : (
            `COMPLETE READINGS (${pumpStats.completed}/${pumpStats.total} pumps, ${tankStats.completed}/${tankStats.total} tanks)`
          )}
        </Button>
        
        {!allReadingsComplete && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Please complete all closing readings before proceeding
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingsStep;