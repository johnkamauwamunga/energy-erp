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

  // Load opening readings from open shift endpoint
  useEffect(() => {
    if (currentStationId) {
      loadOpenShiftData();
    }
  }, [currentStationId]);


  const loadOpenShiftData = async () => {
  if (!currentStationId) return;
  
  setLoading(true);
  try {
    console.log('🔄 Loading open shift data with product information...');

    // Load ALL data in parallel
    const [openShiftData, mapping, topologyData] = await Promise.all([
      shiftService.getOpenShift(currentStationId),
      islandPumpMappingService.getIslandPumpMapping(currentStationId),
      assetTopologyService.getIslandsWithPumpsAndTanks(currentStationId)
    ]);

    console.log('📋 Open shift data:', openShiftData);
    console.log('🗺️ Island mapping:', mapping);
    console.log('⛽ Topology with products:', topologyData);

    if (!openShiftData) {
      message.error('No open shift found for this station');
      return;
    }

    setShiftData(openShiftData);
    setIslandMapping(mapping);

    // 🎯 CREATE ISLAND-ATTENDANT MAPPING WITH PROPER DATA
    console.log('=== 👥 ISLAND ATTENDANTS ANALYSIS ===');
    console.log('shiftIslandAttendant array:', openShiftData.shiftIslandAttendant);
    
    const attendantsByIsland = {};
    (openShiftData.shiftIslandAttendant || []).forEach((assignment, index) => {
      console.log(`Assignment ${index}:`, assignment);
      
      if (assignment.islandId && assignment.attendant) {
        if (!attendantsByIsland[assignment.islandId]) {
          attendantsByIsland[assignment.islandId] = [];
        }
        
        const attendantInfo = {
          id: assignment.attendant.id,
          firstName: assignment.attendant.firstName,
          lastName: assignment.attendant.lastName,
          assignmentType: assignment.assignmentType,
          // Include any other relevant fields that might be needed
          attendantId: assignment.attendantId,
          assignmentId: assignment.id
        };
        
        attendantsByIsland[assignment.islandId].push(attendantInfo);
        console.log(`✅ Added attendant to island ${assignment.islandId}:`, attendantInfo);
      } else {
        console.warn(`⚠️ Skipping assignment ${index} - missing islandId or attendant:`, {
          hasIslandId: !!assignment.islandId,
          hasAttendant: !!assignment.attendant,
          islandId: assignment.islandId,
          attendant: assignment.attendant
        });
      }
    });

    console.log('🏝️ Final attendantsByIsland mapping:', attendantsByIsland);
    setIslandAttendants(attendantsByIsland);

    // Create a map of pumps with their product information from topology
    const pumpProductMap = new Map();
    const topologyIslands = topologyData.data?.islands || topologyData.islands || [];
    
    console.log('🔍 Analyzing topology islands structure...');
    topologyIslands.forEach((island, islandIndex) => {
      console.log(`Island ${islandIndex}:`, island);
      if (island.pumps && Array.isArray(island.pumps)) {
        island.pumps.forEach((pump, pumpIndex) => {
          console.log(`Pump ${pumpIndex} in island:`, pump);
          if (pump.product) {
            // Use pump.id (not pump.pumpId) as the key
            pumpProductMap.set(pump.id, {
              productId: pump.product.id,
              product: pump.product,
              unitPrice: pump.product.baseCostPrice || pump.product.minSellingPrice || 0
            });
            console.log(`✅ Added product mapping for pump ${pump.id}:`, pump.product.name);
          } else {
            console.log(`❌ Pump ${pump.id} has no product`);
          }
        });
      }
    });

    console.log('🧮 Final pump product map:', Array.from(pumpProductMap.entries()));

    // Transform pump readings - NOW WITH PRODUCT INFO
    const transformedPumps = (openShiftData.meterReadings || []).map(meterReading => {
      console.log(`Processing pump ${meterReading.pumpId}:`, meterReading);
      
      // Get product info from our map - use meterReading.pumpId to lookup
      const productInfo = pumpProductMap.get(meterReading.pumpId);
      console.log(`Product info for ${meterReading.pumpId}:`, productInfo);

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
          
          console.log(`🏝️ Pump ${meterReading.pumpId} assigned to island:`, {
            islandId: islandId,
            islandName: pumpIslandName,
            attendantsCount: islandAttendants.length,
            attendants: islandAttendants
          });
          break;
        }
      }

      // Use product info from topology, fallback to shift data
      const finalProductInfo = productInfo || {
        productId: meterReading.pump?.product?.id,
        product: meterReading.pump?.product || { name: 'Fuel' },
        unitPrice: meterReading.unitPrice || 0
      };

      console.log(`🎯 Final product info for ${meterReading.pumpId}:`, finalProductInfo);

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
        islandAttendants: islandAttendants // Add attendants to each pump for reference
      };
    });

    // Transform tank readings (unchanged)
    const transformedTanks = (openShiftData.dipReadings || []).map(dipReading => ({
      id: dipReading.tankId,
      tankId: dipReading.tankId,
      name: dipReading.tank?.asset?.name || `Tank ${dipReading.tankId.slice(0, 8)}`,
      product: dipReading.tank?.product || { name: 'Fuel' },
      capacity: dipReading.tank?.capacity || 10000,
      openingVolume: dipReading.volume || 0,
      openingDipValue: dipReading.dipValue || 0,
      closingVolume: '',
      closingDipValue: 2.5,
    }));

    setPumps(transformedPumps);
    setTanks(transformedTanks);
    setAutoFilled(true);
    
    console.log('✅ Final transformed pumps WITH PRODUCTS:', transformedPumps);
    console.log(`✅ Loaded ${transformedPumps.length} pumps and ${transformedTanks.length} tanks`);
    console.log('🏝️ Island attendants summary:', {
      totalAssignments: openShiftData.shiftIslandAttendant?.length || 0,
      islandsWithAttendants: Object.keys(attendantsByIsland).length,
      totalAttendants: Object.values(attendantsByIsland).flat().length,
      attendantsByIsland: attendantsByIsland
    });
    
  } catch (error) {
    console.error('❌ Error loading open shift readings:', error);
    message.error('Failed to load open shift readings');
  } finally {
    setLoading(false);
  }
};
 

// const loadOpenShiftData = async () => {
//   if (!currentStationId) return;
  
//   setLoading(true);
//   try {
//     console.log('🔄 Loading open shift data with product information...');

//     // Load ALL data in parallel
//     const [openShiftData, mapping, topologyData] = await Promise.all([
//       shiftService.getOpenShift(currentStationId),
//       islandPumpMappingService.getIslandPumpMapping(currentStationId),
//       assetTopologyService.getIslandsWithPumpsAndTanks(currentStationId)
//     ]);

//     console.log('📋 Open shift data:', openShiftData);
//     console.log('🗺️ Island mapping:', mapping);
//     console.log('⛽ Topology with products:', topologyData);

//     if (!openShiftData) {
//       message.error('No open shift found for this station');
//       return;
//     }

//     setShiftData(openShiftData);
//     setIslandMapping(mapping);

//     // Create a map of pumps with their product information from topology
//     const pumpProductMap = new Map();
//     const topologyIslands = topologyData.data?.islands || topologyData.islands || [];
    
//     console.log('🔍 Analyzing topology islands structure...');
//     topologyIslands.forEach((island, islandIndex) => {
//       console.log(`Island ${islandIndex}:`, island);
//       if (island.pumps && Array.isArray(island.pumps)) {
//         island.pumps.forEach((pump, pumpIndex) => {
//           console.log(`Pump ${pumpIndex} in island:`, pump);
//           if (pump.product) {
//             // Use pump.id (not pump.pumpId) as the key
//             pumpProductMap.set(pump.id, {
//               productId: pump.product.id,
//               product: pump.product,
//               unitPrice: pump.product.baseCostPrice || pump.product.minSellingPrice || 0
//             });
//             console.log(`✅ Added product mapping for pump ${pump.id}:`, pump.product.name);
//           } else {
//             console.log(`❌ Pump ${pump.id} has no product`);
//           }
//         });
//       }
//     });

//     console.log('🧮 Final pump product map:', Array.from(pumpProductMap.entries()));

//     // Transform pump readings - NOW WITH PRODUCT INFO
//     const transformedPumps = (openShiftData.meterReadings || []).map(meterReading => {
//       console.log(`Processing pump ${meterReading.pumpId}:`, meterReading);
      
//       // Get product info from our map - use meterReading.pumpId to lookup
//       const productInfo = pumpProductMap.get(meterReading.pumpId);
//       console.log(`Product info for ${meterReading.pumpId}:`, productInfo);

//       // Find which island this pump belongs to
//       let pumpIslandId = null;
//       let pumpIslandName = 'Unassigned';
      
//       for (const [islandId, pumpIds] of Object.entries(mapping)) {
//         if (pumpIds.includes(meterReading.pumpId)) {
//           pumpIslandId = islandId;
//           const islandAssignment = openShiftData.shiftIslandAttendant?.find(
//             assignment => assignment.islandId === islandId
//           );
//           pumpIslandName = islandAssignment?.island?.code || `Island ${islandId.slice(0, 8)}`;
//           break;
//         }
//       }

//       // Use product info from topology, fallback to shift data
//       const finalProductInfo = productInfo || {
//         productId: meterReading.pump?.product?.id,
//         product: meterReading.pump?.product || { name: 'Fuel' },
//         unitPrice: meterReading.unitPrice || 0
//       };

//       console.log(`🎯 Final product info for ${meterReading.pumpId}:`, finalProductInfo);

//       return {
//         id: meterReading.pumpId,
//         pumpId: meterReading.pumpId,
//         productId: finalProductInfo.productId,
//         name: meterReading.pump?.asset?.name || `Pump ${meterReading.pumpId.slice(0, 8)}`,
//         product: finalProductInfo.product,
//         openingElectricMeter: meterReading.electricMeter || 0,
//         openingManualMeter: meterReading.manualMeter || 0,
//         openingCashMeter: meterReading.cashMeter || 0,
//         unitPrice: finalProductInfo.unitPrice,
//         closingElectricMeter: '',
//         closingManualMeter: '',
//         closingCashMeter: '',
//         islandId: pumpIslandId,
//         islandName: pumpIslandName
//       };
//     });

//     // Transform tank readings (unchanged)
//     const transformedTanks = (openShiftData.dipReadings || []).map(dipReading => ({
//       id: dipReading.tankId,
//       tankId: dipReading.tankId,
//       name: dipReading.tank?.asset?.name || `Tank ${dipReading.tankId.slice(0, 8)}`,
//       product: dipReading.tank?.product || { name: 'Fuel' },
//       capacity: dipReading.tank?.capacity || 10000,
//       openingVolume: dipReading.volume || 0,
//       openingDipValue: dipReading.dipValue || 0,
//       closingVolume: '',
//       closingDipValue: 2.5,
//     }));

//     setPumps(transformedPumps);
//     setTanks(transformedTanks);
//     setAutoFilled(true);
    
//     console.log('✅ Final transformed pumps WITH PRODUCTS:', transformedPumps);
//     console.log(`✅ Loaded ${transformedPumps.length} pumps and ${transformedTanks.length} tanks`);
    
//   } catch (error) {
//     console.error('❌ Error loading open shift readings:', error);
//     message.error('Failed to load open shift readings');
//   } finally {
//     setLoading(false);
//   }
// };

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

  // Calculate statistics with CORRECT sales calculation
  const pumpStats = useMemo(() => {
    const total = pumps.length;
    const completed = pumps.filter(p => p.closingElectricMeter && p.closingManualMeter && p.closingCashMeter).length;
    
    const totalLiters = pumps.reduce((sum, pump) => {
      const opening = parseFloat(pump.openingElectricMeter) || 0;
      const closing = parseFloat(pump.closingElectricMeter) || 0;
      return sum + Math.max(0, closing - opening);
    }, 0);

    // CORRECT SALES CALCULATION: (Closing Electric - Opening Electric) × Unit Price
    const totalSales = pumps.reduce((sum, pump) => {
      const opening = parseFloat(pump.openingElectricMeter) || 0;
      const closing = parseFloat(pump.closingElectricMeter) || 0;
      const unitPrice = parseFloat(pump.unitPrice) || 0;
      const liters = Math.max(0, closing - opening);
      return sum + (liters * unitPrice);
    }, 0);

    return { total, completed, totalLiters, totalSales };
  }, [pumps]);

  const tankStats = useMemo(() => ({
    total: tanks.length,
    completed: tanks.filter(t => t.closingVolume).length,
  }), [tanks]);

  // Group pumps by island for the next step
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
    const openingElectric = parseFloat(pump.openingElectricMeter) || 0;
    const closingElectric = parseFloat(pump.closingElectricMeter) || 0;
    const openingManual = parseFloat(pump.openingManualMeter) || 0;
    const closingManual = parseFloat(pump.closingManualMeter) || 0;
    const openingCash = parseFloat(pump.openingCashMeter) || 0;
    const closingCash = parseFloat(pump.closingCashMeter) || 0;
    const unitPrice = parseFloat(pump.unitPrice) || 0;
    const litersDispensed = Math.max(0, closingElectric - openingElectric);
    const salesValue = litersDispensed * unitPrice;

    return {
      pumpId: pump.pumpId,
      productId: pump.productId,
      electricMeter: closingElectric,
      manualMeter: closingManual,
      cashMeter: closingCash,
      litersDispensed: litersDispensed,
      salesValue: salesValue,
      unitPrice: unitPrice
    };
  });

  // Prepare tank readings for API payload
  const tankReadingsPayload = tanks.map(tank => ({
    tankId: tank.tankId,
    dipValue: tank.closingDipValue,
    volume: parseFloat(tank.closingVolume) || 0,
    temperature: 28.5, // Default values
    waterLevel: 0.1,
    density: 0.85
  }));

  // 🎯 CRITICAL: Prepare structured data for IslandSalesStep WITH ATTENDANTS
  const islandSalesData = {
    shiftId: shiftData?.id,
    stationId: currentStationId,
    shiftNumber: shiftData?.shiftNumber,
    supervisor: shiftData?.supervisor,
    
    // Include pump and tank readings for final payload
    pumpReadings: pumpReadingsPayload,
    tankReadings: tankReadingsPayload,
    
    // 🏝️ Group by island with attendants and calculated expected sales
    islands: Object.entries(pumpsByIsland).map(([islandKey, islandData]) => {
      // Get attendants for this specific island
      const islandAttendantList = islandAttendants[islandData.islandId] || [];
      
      console.log(`🏝️ Preparing island ${islandData.islandId}:`, {
        islandName: islandData.islandName,
        attendantsCount: islandAttendantList.length,
        attendants: islandAttendantList,
        pumpsCount: islandData.pumps.length
      });

      const islandPumps = islandData.pumps.map(pump => {
        const openingElectric = parseFloat(pump.openingElectricMeter) || 0;
        const closingElectric = parseFloat(pump.closingElectricMeter) || 0;
        const unitPrice = parseFloat(pump.unitPrice) || 0;
        const litersDispensed = Math.max(0, closingElectric - openingElectric);
        const expectedSales = litersDispensed * unitPrice;

        return {
          pumpId: pump.pumpId,
          pumpName: pump.name,
          product: pump.product,
          openingElectricMeter: openingElectric,
          closingElectricMeter: closingElectric,
          openingManualMeter: parseFloat(pump.openingManualMeter) || 0,
          closingManualMeter: parseFloat(pump.closingManualMeter) || 0,
          openingCashMeter: parseFloat(pump.openingCashMeter) || 0,
          closingCashMeter: parseFloat(pump.closingCashMeter) || 0,
          unitPrice: unitPrice,
          litersDispensed: litersDispensed,
          expectedSales: expectedSales,
          actualSales: 0, // To be filled in IslandSalesStep
          difference: 0    // To be calculated in IslandSalesStep
        };
      });

      const totalExpectedSales = islandPumps.reduce((sum, pump) => sum + pump.expectedSales, 0);

      return {
        islandId: islandData.islandId,
        islandName: islandData.islandName,
        // 🎯 PASS THE ACTUAL ATTENDANTS DATA
        attendants: islandAttendantList,
        pumps: islandPumps,
        totalExpectedSales: totalExpectedSales,
        totalActualSales: 0, // To be filled in IslandSalesStep
        totalDifference: 0   // To be calculated in IslandSalesStep
      };
    }),

    // Summary data
    summary: {
      totalPumps: pumps.length,
      totalLiters: pumpStats.totalLiters,
      totalExpectedSales: pumpStats.totalSales,
      totalIslands: Object.keys(pumpsByIsland).length,
      // 🎯 Add attendants summary
      totalAttendants: Object.values(islandAttendants).flat().length,
      islandsWithAttendants: Object.keys(islandAttendants).length
    }
  };

  console.log('🚀 Proceeding to Island Sales with structured data:', islandSalesData);
  console.log('👥 Attendants data being passed:', {
    totalAttendants: islandSalesData.summary.totalAttendants,
    islandsWithAttendants: islandSalesData.summary.islandsWithAttendants,
    islands: islandSalesData.islands.map(island => ({
      islandId: island.islandId,
      islandName: island.islandName,
      attendantsCount: island.attendants.length,
      attendants: island.attendants
    }))
  });
  
  onProceedToIslandSales?.(islandSalesData);
};

//   const handleProceedToIslandSales = () => {
//     // Prepare pump readings for API payload
//     const pumpReadingsPayload = pumps.map(pump => {
//       const openingElectric = parseFloat(pump.openingElectricMeter) || 0;
//       const closingElectric = parseFloat(pump.closingElectricMeter) || 0;
//       const openingManual = parseFloat(pump.openingManualMeter) || 0;
//       const closingManual = parseFloat(pump.closingManualMeter) || 0;
//       const openingCash = parseFloat(pump.openingCashMeter) || 0;
//       const closingCash = parseFloat(pump.closingCashMeter) || 0;
//       const unitPrice = parseFloat(pump.unitPrice) || 0;
//       const litersDispensed = Math.max(0, closingElectric - openingElectric);
//       const salesValue = litersDispensed * unitPrice;

//       return {
//         pumpId: pump.pumpId,
//         productId: pump.productId,
//         electricMeter: closingElectric,
//         manualMeter: closingManual,
//         cashMeter: closingCash,
//         litersDispensed: litersDispensed,
//         salesValue: salesValue,
//         unitPrice: unitPrice
//       };
//     });

//     // Prepare tank readings for API payload
//     const tankReadingsPayload = tanks.map(tank => ({
//       tankId: tank.tankId,
//       dipValue: tank.closingDipValue,
//       volume: parseFloat(tank.closingVolume) || 0,
//       temperature: 28.5, // Default values
//       waterLevel: 0.1,
//       density: 0.85
//     }));

//     // Prepare structured data for IslandSalesStep
//     const islandSalesData = {
//       shiftId: shiftData?.id,
//       stationId: currentStationId,
//       shiftNumber: shiftData?.shiftNumber,
//       supervisor: shiftData?.supervisor,
      
//       // Include pump and tank readings for final payload
//       pumpReadings: pumpReadingsPayload,
//       tankReadings: tankReadingsPayload,
      
//       // Group by island with calculated expected sales
//       islands: Object.entries(pumpsByIsland).map(([islandKey, islandData]) => {
//         const islandAttendantList = islandAttendants[islandData.islandId] || [];
        
//         const islandPumps = islandData.pumps.map(pump => {
//           const openingElectric = parseFloat(pump.openingElectricMeter) || 0;
//           const closingElectric = parseFloat(pump.closingElectricMeter) || 0;
//           const unitPrice = parseFloat(pump.unitPrice) || 0;
//           const litersDispensed = Math.max(0, closingElectric - openingElectric);
//           const expectedSales = litersDispensed * unitPrice;

//           return {
//             pumpId: pump.pumpId,
//             pumpName: pump.name,
//             product: pump.product,
//             openingElectricMeter: openingElectric,
//             closingElectricMeter: closingElectric,
//             openingManualMeter: parseFloat(pump.openingManualMeter) || 0,
//             closingManualMeter: parseFloat(pump.closingManualMeter) || 0,
//             openingCashMeter: parseFloat(pump.openingCashMeter) || 0,
//             closingCashMeter: parseFloat(pump.closingCashMeter) || 0,
//             unitPrice: unitPrice,
//             litersDispensed: litersDispensed,
//             expectedSales: expectedSales,
//             actualSales: 0, // To be filled in IslandSalesStep
//             difference: 0    // To be calculated in IslandSalesStep
//           };
//         });

//         const totalExpectedSales = islandPumps.reduce((sum, pump) => sum + pump.expectedSales, 0);

//         return {
//           islandId: islandData.islandId,
//           islandName: islandData.islandName,
//           attendants: islandAttendantList,
//           pumps: islandPumps,
//           totalExpectedSales: totalExpectedSales,
//           totalActualSales: 0, // To be filled in IslandSalesStep
//           totalDifference: 0   // To be calculated in IslandSalesStep
//         };
//       }),

//       // Summary data
//       summary: {
//         totalPumps: pumps.length,
//         totalLiters: pumpStats.totalLiters,
//         totalExpectedSales: pumpStats.totalSales,
//         totalIslands: Object.keys(pumpsByIsland).length
//       }
//     };

//     console.log('🚀 Proceeding to Island Sales with structured data:', islandSalesData);
//     onProceedToIslandSales?.(islandSalesData);
//   };

  // Pump Columns (unchanged - same as your original)
  const pumpColumns = [
    {
      title: 'ISLAND & PUMP DETAILS',
      key: 'pump',
      width: 200,
      render: (_, pump) => (
        <Space size={6} direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={16} color="#faad14" />
            <Text strong style={{ fontSize: '13px' }}>{pump.name}</Text>
          </div>
          <div style={{ 
            padding: '2px 6px', 
            backgroundColor: pump.islandId ? '#e6f7ff' : '#fff2e8',
            borderRadius: '3px',
            fontSize: '10px'
          }}>
         {pump.islandName}
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {pump.product?.name || 'Fuel'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px', color: '#1890ff' }}>
            KES {pump.unitPrice?.toFixed(2)}/L
          </Text>
        </Space>
      ),
    },
    {
      title: 'ELECTRIC METER',
      key: 'electric',
      width: 140,
      render: (_, pump) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#e6f7ff', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
              {parseFloat(pump.openingElectricMeter).toFixed(3)}
            </Text>
            {/* <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div> */}
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
      width: 140,
      render: (_, pump) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#f6ffed', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
              {parseFloat(pump.openingManualMeter).toFixed(3)}
            </Text>
            {/* <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div> */}
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
      width: 140,
      render: (_, pump) => (
        <Space size={8} direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '6px 8px', 
            backgroundColor: '#fff7e6', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#fa8c16' }}>
              {parseFloat(pump.openingCashMeter).toFixed(3)}
            </Text>
            {/* <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING</div> */}
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
      title: 'CALCULATED SALES',
      key: 'sales',
      width: 120,
      render: (_, pump) => {
        const opening = parseFloat(pump.openingElectricMeter) || 0;
        const closing = parseFloat(pump.closingElectricMeter) || 0;
        const unitPrice = parseFloat(pump.unitPrice) || 0;
        const liters = Math.max(0, closing - opening);
        const sales = liters * unitPrice;

        return (
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#f9f0ff', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '12px', color: '#722ed1' }}>
              KES {sales.toFixed(2)}
            </Text>
            <div style={{ fontSize: '9px', color: '#666', marginTop: 2 }}>
              {liters.toFixed(1)}L
            </div>
          </div>
        );
      },
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 100,
      render: (_, pump) => (
        <div style={{ textAlign: 'center' }}>
          {pump.closingElectricMeter && pump.closingManualMeter && pump.closingCashMeter ? (
            <Badge status="success" text="Complete" />
          ) : (
            <Badge status="processing" text="Pending" />
          )}
        </div>
      ),
    },
  ];

  // Tank Columns (unchanged)
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
              {parseFloat(tank.openingVolume).toFixed(3)}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING VOLUME</div>
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
      title: 'DIP VALUE (METER)',
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
              {parseFloat(tank.openingDipValue).toFixed(3)}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>OPENING DIP</div>
          </div>
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#f9f0ff', 
            borderRadius: '4px',
            textAlign: 'center',
            border: '1px dashed #d3adf7'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#722ed1' }}>
              {tank.closingDipValue}
            </Text>
            <div style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>CLOSING DIP (AUTO)</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 100,
      render: (_, tank) => (
        <div style={{ textAlign: 'center' }}>
          {tank.closingVolume ? (
            <Badge status="success" text="Complete" />
          ) : (
            <Badge status="processing" text="Pending" />
          )}
        </div>
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
        
        {/* Enhanced Shift Info */}
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          padding: '16px', 
          backgroundColor: '#f0f8ff', 
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="#1890ff" />
            <div>
              <div style={{ fontWeight: 'bold' }}>Supervisor</div>
              <div>{shiftData?.supervisor?.firstName} {shiftData?.supervisor?.lastName}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="#52c41a" />
            <div>
              <div style={{ fontWeight: 'bold' }}>Shift</div>
              <div>{shiftData?.shiftNumber || shiftInfo?.shiftNumber || 'Current Shift'}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#faad14" />
            <div>
              <div style={{ fontWeight: 'bold' }}>Attendants</div>
              <div>{shiftData?.shiftIslandAttendant?.length || 0} assigned</div>
            </div>
          </div>
          
          <div>
            <div style={{ fontWeight: 'bold' }}>Station</div>
            <div>{state?.currentStation?.name}</div>
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
              title="Expected Sales"
              value={pumpStats.totalSales}
              precision={2}
              prefix="KES"
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}
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
                <div>
                  <Alert
                    message="Sales Calculation"
                    description="Expected Sales = (Closing Electric Meter - Opening Electric Meter) × Unit Price"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    columns={pumpColumns}
                    dataSource={pumps}
                    pagination={false}
                    size="middle"
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1000 }}
                    style={{ fontSize: '12px' }}
                  />
                </div>
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
                <div>
                  <Alert
                    message="Tank Dip Values"
                    description="Closing dip values are automatically set to 2.5 meters. Only closing volume needs to be entered."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    columns={tankColumns}
                    dataSource={tanks}
                    pagination={false}
                    size="middle"
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 700 }}
                    style={{ fontSize: '12px' }}
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