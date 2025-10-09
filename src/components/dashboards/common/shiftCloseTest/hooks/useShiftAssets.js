// hooks/useShiftAssets.js
import { useState, useEffect, useMemo } from 'react';
import { connectedAssetService } from '../../../../../services/connectedAssetsService/connectedAssetsService';
import { shiftService } from '../../../../../services/shiftService/shiftService';

export const useShiftAssets = (stationId) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [openShiftId, setOpenShiftId] = useState(null);
    const [currentShift, setCurrentShift] = useState(null);

    console.log("this is the useAsset hook");

    // Fetch current open shift
    useEffect(() => {
        if (stationId) {
            console.log("this is the station ", stationId);
            const fetchCurrentShift = async () => {
                try {
                    const currentShift = await shiftService.getCurrentOpenShift(stationId);
                    console.log("this current shift, ", currentShift);
                    setCurrentShift(currentShift);
                    setOpenShiftId(currentShift?.id);
                } catch (error) {
                    console.error('Failed to fetch current shift:', error);
                    setError('Failed to fetch current shift');
                }
            };
            fetchCurrentShift();
        }
    }, [stationId]);

    // Fetch shift data when shift ID is available
    useEffect(() => {
        if (openShiftId) {
            fetchShiftData(openShiftId);
        }
    }, [openShiftId]);

    const fetchShiftData = async (shiftId) => {
        setLoading(true);
        setError(null);
        try {
            const shiftData = await connectedAssetService.getShiftAssetsStructure(shiftId);
            console.log("Shift data received:", shiftData);
            // Set the inner data object, not the entire response
            setData(shiftData.data || shiftData);
        } catch (error) {
            console.error('Failed to fetch shift data:', error);
            setError('Failed to load shift data');
        } finally {
            setLoading(false);
        }
    };

    // Enhanced shift opening check with shift number and price list
    const enhancedShiftOpeningCheck = useMemo(() => {
        if (!currentShift?.shiftOpeningCheck?.[0]) return null;

        const baseCheck = currentShift.shiftOpeningCheck[0];
        
        return {
            ...baseCheck,
            shiftNumber: currentShift.shiftNumber,
            priceList: {
                id: currentShift.priceListId,
                name: currentShift.priceList?.name,
                description: currentShift.priceList?.description,
                type: currentShift.priceList?.type,
                status: currentShift.priceList?.status,
                isActive: currentShift.priceList?.isActive,
                effectiveFrom: currentShift.priceList?.effectiveFrom,
                effectiveTo: currentShift.priceList?.effectiveTo,
                approvedAt: currentShift.priceList?.approvedAt,
                approvedById: currentShift.priceList?.approvedById,
                companyId: currentShift.priceList?.companyId,
                createdAt: currentShift.priceList?.createdAt,
                createdById: currentShift.priceList?.createdById,
                updatedAt: currentShift.priceList?.updatedAt
            }
        };
    }, [currentShift]);

    // Transform pumps data with island information
    const pumpsWithIslandInfo = useMemo(() => {
        if (!data?.islands) {
            console.log("No islands data found in:", data);
            return [];
        }

        const pumps = [];
        data.islands.forEach(island => {
            if (island.pumps && island.pumps.length > 0) {
                island.pumps.forEach(pump => {
                    pumps.push({
                        ...pump,
                        islandId: island.islandId,
                        islandName: island.islandName,
                        islandCode: island.islandCode,
                        attendants: island.attendants || []
                    });
                });
            }
        });
        console.log("Processed pumps with island info:", pumps);
        return pumps;
    }, [data?.islands]);

    // Transform tanks data with readings
    const tanksWithReadings = useMemo(() => {
        if (!data?.tanks) return [];

        return data.tanks.map(tank => ({
            tankId: tank.tankId,
            tankName: tank.tankName,
            product: tank.product,
            capacity: tank.capacity,
            currentVolume: tank.currentVolume,
            dipReadings: tank.dipReadings || [],
            connectedPumps: tank.connectedPumps || [],
            hasReadings: tank.dipReadings && tank.dipReadings.length > 0,
            latestReading: tank.dipReadings?.[tank.dipReadings.length - 1] || null
        }));
    }, [data?.tanks]);

    // Transform attendants with detailed information
    const attendantsWithDetails = useMemo(() => {
        if (!data?.attendants) {
            console.log("No attendants data found in:", data);
            return [];
        }

        const attendants = data.attendants.map(attendant => ({
            ...attendant,
            islandInfo: {
                islandId: attendant.islandId,
                islandName: attendant.islandName
            },
            shiftInfo: {
                shiftId: data.shift?.id,
                shiftNumber: data.shift?.shiftNumber,
                status: data.shift?.status
            }
        }));
        console.log("Processed attendants:", attendants);
        return attendants;
    }, [data?.attendants, data?.shift]);

    // Get meter readings from currentShift for each pump
    const getPumpMeterReadings = (pumpId) => {
        if (!currentShift?.meterReadings) return null;
        return currentShift.meterReadings.find(reading => reading.pumpId === pumpId);
    };

    // Expected collections calculation by island - FIXED VERSION
    const expectedCollectionsByIsland = useMemo(() => {
        console.log("Calculating expected collections...");
        console.log("Pumps with island info:", pumpsWithIslandInfo);
        console.log("Current shift meter readings:", currentShift?.meterReadings);

        if (!pumpsWithIslandInfo.length) {
            console.log("No pumps available for calculation");
            return [];
        }

        const HARDCODED_UNIT_PRICE = 100.00; // KSH 100.00
        const collections = {};
        
        pumpsWithIslandInfo.forEach(pump => {
            const islandId = pump.islandId;
            const islandName = pump.islandName;
            const islandCode = pump.islandCode;
            
            if (!collections[islandId]) {
                collections[islandId] = {
                    islandId,
                    islandName,
                    islandCode,
                    totalExpected: 0,
                    pumps: []
                };
            }

            // Get meter readings from currentShift - FIXED: Use pumpId from current pump
            const meterReading = getPumpMeterReadings(pump.pumpId);
            console.log(`Pump ${pump.pumpId} meter reading:`, meterReading);
            
            // Use actual readings from currentShift or fallback to pump data
            const openingElectric = meterReading?.electricMeter || 
                                 pump.meterReadings?.find(r => r.readingType === 'START')?.electricMeter || 0;
            const openingManual = meterReading?.manualMeter || 
                               pump.meterReadings?.find(r => r.readingType === 'START')?.manualMeter || 0;
            
            console.log(`Pump ${pump.pumpName} openings - Electric: ${openingElectric}, Manual: ${openingManual}`);
            
            // For demo - using dummy closing values (in real app, these would be user input)
            const closingElectric = openingElectric + (Math.random() * 200 + 50); // Random between 50-250
            const closingManual = openingManual + (Math.random() * 200 + 50); // Random between 50-250
            
            const electricSales = closingElectric - openingElectric;
            const manualSales = closingManual - openingManual;
            const averageSales = (electricSales + manualSales) / 2;
            
            // Use unit price from meter reading or hardcoded value
            const unitPrice = meterReading?.unitPrice || HARDCODED_UNIT_PRICE;
            
            const expectedCollection = averageSales * unitPrice;

            const pumpData = {
                pumpId: pump.pumpId,
                pumpName: pump.pumpName,
                product: pump.product,
                openingElectric,
                openingManual,
                closingElectric,
                closingManual,
                electricSales: Math.round(electricSales * 100) / 100,
                manualSales: Math.round(manualSales * 100) / 100,
                averageSales: Math.round(averageSales * 100) / 100,
                unitPrice,
                expectedCollection: Math.round(expectedCollection * 100) / 100,
                hasReadings: !!(openingElectric > 0 || openingManual > 0)
            };

            collections[islandId].pumps.push(pumpData);
            collections[islandId].totalExpected += expectedCollection;
        });

        const result = Object.values(collections);
        console.log("Final expected collections:", result);
        return result;
    }, [pumpsWithIslandInfo, currentShift?.meterReadings]);

    // Enhanced summary with expected collections
    const enhancedSummary = useMemo(() => {
        if (!data?.summary) return null;

        const totalPumpReadings = pumpsWithIslandInfo.reduce((total, pump) => 
            total + (getPumpMeterReadings(pump.pumpId) ? 1 : 0), 0);
        
        const totalTankReadings = tanksWithReadings.reduce((total, tank) => 
            total + (tank.dipReadings?.length || 0), 0);

        const criticalReadings = data.summary.readingStatus?.shiftCriticalReadings || {
            pumps: { start: 0, end: 0, totalRequired: 0 },
            tanks: { start: 0, end: 0, totalRequired: 0 }
        };

        const totalExpectedCollections = expectedCollectionsByIsland.reduce((total, island) => 
            total + island.totalExpected, 0);

        return {
            ...data.summary,
            computed: {
                totalPumpReadings,
                totalTankReadings,
                completionRate: {
                    pumps: Math.round((criticalReadings.pumps.start / criticalReadings.pumps.totalRequired) * 100) || 0,
                    tanks: Math.round((criticalReadings.tanks.start / criticalReadings.tanks.totalRequired) * 100) || 0
                },
                hasPendingReadings: criticalReadings.pumps.start < criticalReadings.pumps.totalRequired || 
                                  criticalReadings.tanks.start < criticalReadings.tanks.totalRequired,
                totalExpectedCollections,
                expectedCollectionsByIsland
            }
        };
    }, [data?.summary, pumpsWithIslandInfo, tanksWithReadings, expectedCollectionsByIsland]);

    // Assets requiring attention
    const assetsRequiringAttention = useMemo(() => {
        const attentionItems = [];

        // Check pumps without readings
        pumpsWithIslandInfo.forEach(pump => {
            const meterReading = getPumpMeterReadings(pump.pumpId);
            if (!meterReading) {
                attentionItems.push({
                    type: 'PUMP',
                    id: pump.pumpId,
                    name: pump.pumpName,
                    island: pump.islandName,
                    issue: 'No meter readings',
                    priority: 'HIGH'
                });
            }
        });

        // Check tanks without readings
        tanksWithReadings.forEach(tank => {
            if (!tank.dipReadings || tank.dipReadings.length === 0) {
                attentionItems.push({
                    type: 'TANK',
                    id: tank.tankId,
                    name: tank.tankName,
                    product: tank.product?.name,
                    issue: 'No dip readings',
                    priority: 'HIGH'
                });
            }
        });

        // Check for unverified readings
        tanksWithReadings.forEach(tank => {
            const unverifiedReadings = tank.dipReadings?.filter(reading => !reading.isVerified);
            if (unverifiedReadings && unverifiedReadings.length > 0) {
                attentionItems.push({
                    type: 'TANK_READING',
                    id: tank.tankId,
                    name: tank.tankName,
                    issue: `${unverifiedReadings.length} unverified reading(s)`,
                    priority: 'MEDIUM'
                });
            }
        });

        return attentionItems;
    }, [pumpsWithIslandInfo, tanksWithReadings]);

    // Check if we have any data
    const hasData = useMemo(() => {
        return !!(data && (pumpsWithIslandInfo.length > 0 || tanksWithReadings.length > 0 || attendantsWithDetails.length > 0));
    }, [data, pumpsWithIslandInfo, tanksWithReadings, attendantsWithDetails]);

    // Refetch function
    const refetch = () => {
        if (openShiftId) {
            fetchShiftData(openShiftId);
        }
    };

    return {
        // Core data
        data: data,
        currentShift,
        pumpsWithIslandInfo,
        tanksWithReadings,
        attendantsWithDetails,
        expectedCollectionsByIsland,
        enhancedSummary,
        enhancedShiftOpeningCheck,
        assetsRequiringAttention,
        
        // State
        loading,
        error,
        hasData,
        
        // Actions
        refetch
    };
};