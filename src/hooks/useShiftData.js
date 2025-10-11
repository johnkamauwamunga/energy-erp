import { useState, useEffect, useMemo } from 'react';
import { shiftService } from '../services/shiftService/shiftService';
import { loggerService } from '../services/loggerService/loggerService';

export const useShiftData = (stationId, filters = {}, userRole = 'ATTENDANT') => {
  const [shifts, setShifts] = useState([]);
  const [openShift, setOpenShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allStations, setAllStations] = useState([]);

  // Determine data scope based on user role
  const dataScope = useMemo(() => {
    switch (userRole) {
      case 'SUPER_ADMIN':
      case 'COMPANY_ADMIN':
        return 'company';
      case 'STATION_MANAGER':
      case 'LINES_MANAGER': 
      case 'SUPERVISOR':
      case 'ATTENDANT':
        return 'station';
      default:
        return 'station';
    }
  }, [userRole, stationId]);

  // Fetch all shifts data - using only shiftService.getAllShifts()
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        loggerService.log('INFO', 'Fetching shifts data started', { 
          stationId, 
          dataScope,
          userRole,
          filters 
        });

        // Always use getAllShifts() - filter client-side based on scope
        const response = await shiftService.getAllShifts();
        
        // Handle both array and object response structures
        const allShiftsData = Array.isArray(response) ? response : response.shifts || [];
        
        // Filter shifts based on data scope
        let filteredShifts = allShiftsData;
        
        if (dataScope === 'station' && stationId) {
          // Station-level: filter by stationId
          filteredShifts = allShiftsData.filter(shift => 
            shift.stationId === stationId
          );
        }
        // For company scope, we use all shifts without filtering by station
        
        setShifts(filteredShifts);

        // Find open shift in the filtered data
        const currentOpenShift = filteredShifts.find(shift => 
          shift.status === 'OPEN' || shift.status === 'ACTIVE'
        );
        setOpenShift(currentOpenShift || null);

        // Extract unique stations for company view
        if (dataScope === 'company') {
          const uniqueStations = [];
          const stationMap = new Map();
          
          allShiftsData.forEach(shift => {
            if (shift.station && !stationMap.has(shift.station.id)) {
              stationMap.set(shift.station.id, true);
              uniqueStations.push(shift.station);
            }
          });
          
          setAllStations(uniqueStations);
        }

        loggerService.log('INFO', 'Shifts data fetched successfully', {
          stationId,
          dataScope,
          totalShifts: allShiftsData.length,
          filteredShifts: filteredShifts.length,
          hasOpenShift: !!currentOpenShift,
          openShiftId: currentOpenShift?.id,
          filters
        });

      } catch (err) {
        const errorMsg = `Failed to fetch shifts: ${err.message}`;
        setError(errorMsg);
        loggerService.log('ERROR', errorMsg, {
          stationId,
          dataScope,
          error: err.message,
          filters
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [stationId, dataScope, userRole, JSON.stringify(filters)]);

  // OPEN SHIFT SPECIFIC DATA
  const openShiftData = useMemo(() => {
    if (!openShift) return null;

    return {
      // Basic shift info
      id: openShift.id,
      shiftNumber: openShift.shiftNumber,
      startTime: openShift.startTime,
      supervisor: openShift.supervisor,
      station: openShift.station,
      
      // Start meter readings only (for open shift)
      startMeterReadings: openShift.meterReadings?.filter(reading => 
        reading.readingType === 'START'
      ).map(reading => ({
        id: reading.id,
        pumpId: reading.pumpId,
        pumpName: reading.pump?.asset?.name,
        electricMeter: reading.electricMeter,
        cashMeter: reading.cashMeter,
        manualMeter: reading.manualMeter,
        unitPrice: reading.unitPrice,
        recordedAt: reading.recordedAt,
        recordedBy: reading.recordedBy,
        tank: reading.pump?.tank,
        product: reading.pump?.tank?.product
      })) || [],
      
      // Start dip readings only (for open shift)
      startDipReadings: openShift.dipReadings?.filter(reading => 
        reading.readingType === 'START'
      ).map(reading => ({
        id: reading.id,
        tankId: reading.tankId,
        tankName: reading.tank?.assetId,
        dipValue: reading.dipValue,
        density: reading.density,
        volume: reading.volume,
        temperature: reading.temperature,
        waterLevel: reading.waterLevel,
        recordedAt: reading.recordedAt,
        recordedBy: reading.recordedBy,
        product: reading.tank?.product
      })) || [],
      
      // Current island assignments
      islandAssignments: openShift.shiftIslandAttedant?.map(assignment => ({
        id: assignment.id,
        islandId: assignment.islandId,
        islandCode: assignment.island?.code,
        attendantId: assignment.attendantId,
        attendantName: `${assignment.attendant?.firstName} ${assignment.attendant?.lastName}`,
        assignmentType: assignment.assignmentType,
        assignedAt: assignment.assignedAt
      })) || [],
      
      // Opening checks validation
      openingChecks: openShift.shiftOpeningCheck?.[0] || {},
      
      // Current price list
      priceList: openShift.priceList,
      
      // Real-time status
      currentStatus: {
        hasStartReadings: openShift.meterReadings?.some(r => r.readingType === 'START') && 
                         openShift.dipReadings?.some(r => r.readingType === 'START'),
        hasAttendantsAssigned: (openShift.shiftIslandAttedant?.length || 0) > 0,
        hasOpeningChecks: openShift.shiftOpeningCheck?.length > 0,
        isValidForOperations: openShift.shiftOpeningCheck?.[0]?.checksPassed || false
      }
    };
  }, [openShift]);

  // 1. PRODUCT SALES ANALYSIS (Multi-scope support)
  const productSales = useMemo(() => {
    const salesByProduct = new Map();

    shifts.forEach(shift => {
      const shiftInfo = {
        shiftId: shift.id,
        shiftNumber: shift.shiftNumber,
        stationId: shift.stationId,
        stationName: shift.station?.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status
      };

      // Process meter readings for volume calculation
      shift.meterReadings?.forEach(reading => {
        if (reading.readingType === 'END') {
          const startReading = shift.meterReadings?.find(r => 
            r.pumpId === reading.pumpId && 
            r.readingType === 'START'
          );

          if (startReading && reading.electricMeter !== undefined && 
              startReading.electricMeter !== undefined) {
            
            const volume = reading.electricMeter - startReading.electricMeter;
            const tank = reading.pump?.tank;
            const product = tank?.product;
            
            if (product && volume > 0) {
              const productId = product.id;
              const unitPrice = reading.unitPrice || 0;
              const revenue = volume * unitPrice;

              if (!salesByProduct.has(productId)) {
                salesByProduct.set(productId, {
                  productId,
                  productName: product.name,
                  productType: product.type,
                  unit: product.unit,
                  colorCode: product.colorCode,
                  totalVolume: 0,
                  totalRevenue: 0,
                  unitPrice: unitPrice,
                  shifts: [],
                  stations: new Set(),
                  tanks: new Set(),
                  pumps: new Set()
                });
              }

              const productData = salesByProduct.get(productId);
              productData.totalVolume += volume;
              productData.totalRevenue += revenue;
              productData.stations.add(shift.stationId);
              productData.tanks.add(tank?.id);
              productData.pumps.add(reading.pumpId);
              
              // Add shift info if not already present
              if (!productData.shifts.some(s => s.shiftId === shift.id)) {
                productData.shifts.push(shiftInfo);
              }
            }
          }
        }
      });
    });

    return Array.from(salesByProduct.values()).map(productData => ({
      ...productData,
      stationCount: productData.stations.size,
      tankCount: productData.tanks.size,
      pumpCount: productData.pumps.size
    }));
  }, [shifts]);

  // 2. SHIFT OPERATIONS SUMMARY (Multi-scope support)
  const shiftOperations = useMemo(() => {
    return shifts.map(shift => ({
      id: shift.id,
      shiftNumber: shift.shiftNumber,
      status: shift.status,
      startTime: shift.startTime,
      endTime: shift.endTime,
      supervisor: shift.supervisor,
      station: shift.station,
      stationId: shift.stationId,
      
      // Scope indicator
      scope: dataScope,
      
      // Pump operations
      pumpOperations: shift.meterReadings?.reduce((acc, reading) => {
        const pumpId = reading.pumpId;
        if (!acc[pumpId]) {
          acc[pumpId] = {
            pumpId,
            pumpName: reading.pump?.asset?.name,
            startReading: null,
            endReading: null,
            totalVolume: 0,
            recordedBy: null,
            product: reading.pump?.tank?.product
          };
        }

        if (reading.readingType === 'START') {
          acc[pumpId].startReading = reading.electricMeter;
          acc[pumpId].recordedBy = reading.recordedBy;
        } else if (reading.readingType === 'END') {
          acc[pumpId].endReading = reading.electricMeter;
        }

        if (acc[pumpId].startReading && acc[pumpId].endReading) {
          acc[pumpId].totalVolume = acc[pumpId].endReading - acc[pumpId].startReading;
        }

        return acc;
      }, {}),

      // Tank operations
      tankOperations: shift.dipReadings?.reduce((acc, reading) => {
        const tankId = reading.tankId;
        if (!acc[tankId]) {
          acc[tankId] = {
            tankId,
            tankName: reading.tank?.assetId,
            product: reading.tank?.product,
            startDip: null,
            endDip: null,
            density: reading.density,
            temperature: reading.temperature,
            recordedBy: null
          };
        }

        if (reading.readingType === 'START') {
          acc[tankId].startDip = reading.dipValue;
          acc[tankId].recordedBy = reading.recordedBy;
        } else if (reading.readingType === 'END') {
          acc[tankId].endDip = reading.dipValue;
        }

        return acc;
      }, {}),

      // Opening checks
      openingChecks: shift.shiftOpeningCheck?.[0] || {}
    }));
  }, [shifts, dataScope]);

  // 3. COMPANY-LEVEL OVERVIEW DATA
  const companyOverview = useMemo(() => {
    if (dataScope !== 'company') return null;

    const stationStats = new Map();

    shifts.forEach(shift => {
      const stationId = shift.stationId;
      if (!stationStats.has(stationId)) {
        const station = allStations.find(s => s.id === stationId) || shift.station;
        stationStats.set(stationId, {
          stationId,
          stationName: station?.name,
          location: station?.location,
          totalShifts: 0,
          openShifts: 0,
          totalRevenue: 0,
          totalVolume: 0,
          totalCollections: 0,
          shifts: []
        });
      }

      const stationData = stationStats.get(stationId);
      stationData.totalShifts++;
      if (shift.status === 'OPEN' || shift.status === 'ACTIVE') {
        stationData.openShifts++;
      }
      stationData.totalRevenue += shift.sales?.[0]?.totalRevenue || 0;
      stationData.totalVolume += shift.sales?.[0]?.totalFuelQuantity || 0;
      stationData.totalCollections += shift.shiftCollection?.totalCollected || 0;
      stationData.shifts.push(shift.id);
    });

    return {
      totalStations: stationStats.size,
      totalShifts: shifts.length,
      openShifts: shifts.filter(s => s.status === 'OPEN' || s.status === 'ACTIVE').length,
      stations: Array.from(stationStats.values()),
      summary: {
        totalRevenue: shifts.reduce((sum, shift) => 
          sum + (shift.sales?.[0]?.totalRevenue || 0), 0
        ),
        totalVolume: shifts.reduce((sum, shift) => 
          sum + (shift.sales?.[0]?.totalFuelQuantity || 0), 0
        ),
        totalCollections: shifts.reduce((sum, shift) => 
          sum + (shift.shiftCollection?.totalCollected || 0), 0
        )
      }
    };
  }, [shifts, dataScope, allStations]);

  // 4. FILTERED DATA BASED ON SCOPE AND FILTERS
  const filteredData = useMemo(() => {
    let filteredShifts = [...shifts];

    // Apply status filter
    if (filters.status) {
      filteredShifts = filteredShifts.filter(shift => 
        shift.status === filters.status
      );
    }

    // Apply date range filter
    if (filters.startDate && filters.endDate) {
      filteredShifts = filteredShifts.filter(shift => {
        const shiftDate = new Date(shift.startTime);
        return shiftDate >= new Date(filters.startDate) && 
               shiftDate <= new Date(filters.endDate);
      });
    }

    // Apply product filter
    if (filters.productId) {
      filteredShifts = filteredShifts.filter(shift => 
        shift.meterReadings?.some(reading => 
          reading.pump?.tank?.product?.id === filters.productId
        )
      );
    }

    // Apply station filter (for company view)
    if (dataScope === 'company' && filters.stationId) {
      filteredShifts = filteredShifts.filter(shift => 
        shift.stationId === filters.stationId
      );
    }

    return filteredShifts;
  }, [shifts, filters, dataScope]);

  // 5. SUMMARY STATISTICS (Scope-aware)
  const summaryStats = useMemo(() => {
    const totalShifts = shifts.length;
    const activeShifts = shifts.filter(s => 
      s.status === 'ACTIVE' || s.status === 'OPEN'
    ).length;
    const closedShifts = shifts.filter(s => s.status === 'CLOSED').length;

    const totalRevenue = shifts.reduce((sum, shift) => 
      sum + (shift.sales?.[0]?.totalRevenue || 0), 0
    );

    const totalFuelVolume = shifts.reduce((sum, shift) => 
      sum + (shift.sales?.[0]?.totalFuelQuantity || 0), 0
    );

    const totalCollections = shifts.reduce((sum, shift) => 
      sum + (shift.shiftCollection?.totalCollected || 0), 0
    );

    return {
      dataScope,
      totalShifts,
      activeShifts,
      closedShifts,
      totalRevenue,
      totalFuelVolume,
      totalCollections,
      averageRevenue: totalRevenue / totalShifts || 0,
      averageVolume: totalFuelVolume / totalShifts || 0,
      hasOpenShift: !!openShift
    };
  }, [shifts, openShift, dataScope]);

  // Refetch function
  const refetch = async () => {
    setLoading(true);
    try {
      const response = await shiftService.getAllShifts();
      const allShiftsData = Array.isArray(response) ? response : response.shifts || [];
      
      // Re-apply filtering based on scope
      let filteredShifts = allShiftsData;
      if (dataScope === 'station' && stationId) {
        filteredShifts = allShiftsData.filter(shift => 
          shift.stationId === stationId
        );
      }
      
      setShifts(filteredShifts);
      
      const currentOpenShift = filteredShifts.find(shift => 
        shift.status === 'OPEN' || shift.status === 'ACTIVE'
      );
      setOpenShift(currentOpenShift || null);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    // Raw data
    shifts: filteredData,
    openShift,
    
    // Processed data
    productSales,
    shiftOperations,
    openShiftData,
    companyOverview,
    
    // Summary data
    summaryStats,
    
    // Scope information
    dataScope,
    allStations,
    
    // State
    loading,
    error,
    
    // Actions
    refetch,
    
    // Metadata
    totalCount: filteredData.length,
    hasData: filteredData.length > 0 && !loading && !error,
    hasOpenShift: !!openShift
  };
};

// Specialized hook for open shift monitoring
export const useOpenShiftMonitor = (stationId, userRole) => {
  const { openShiftData, loading, error, refetch } = useShiftData(
    stationId, 
    { status: 'OPEN' }, 
    userRole
  );

  return {
    openShift: openShiftData,
    loading,
    error,
    refetch,
    hasOpenShift: !!openShiftData
  };
};

// Company-level hook for SUPER_ADMIN and COMPANY_ADMIN
export const useCompanyShiftData = (filters = {}) => {
  return useShiftData(null, filters, 'COMPANY_ADMIN');
};

// Station-level hook for STATION_MANAGER, SUPERVISOR, ATTENDANT
export const useStationShiftData = (stationId, filters = {}, userRole = 'STATION_MANAGER') => {
  return useShiftData(stationId, filters, userRole);
};

export default useShiftData;