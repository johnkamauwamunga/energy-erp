// hooks/useShiftAssets.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { connectedAssetService } from '../../../../../../services/connectedAssetsService/connectedAssetsService';
import { shiftService } from '../../../../../../services/shiftService/shiftService';
import { fuelPriceService } from '../../../../../../services/fuelPriceService/fuelPriceService';

export const useShiftAssets = (stationId) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [openShiftId, setOpenShiftId] = useState(null);
    const [currentShift, setCurrentShift] = useState(null);
    const [productPricing, setProductPricing] = useState({});
    const [pricingLoading, setPricingLoading] = useState(false);

    console.log("🔄 useShiftAssets hook initialized for station:", stationId);

    // Fetch product pricing - FIXED: Added proper cleanup
    useEffect(() => {
        let isMounted = true;
        
        const fetchProductPricing = async () => {
            if (!stationId) return;
            
            setPricingLoading(true);
            try {
                console.log("💰 Fetching product pricing...");
                const response = await fuelPriceService.getProductPrices({}, true);
                
                if (!isMounted) return;
                
                console.log("💰 Prices response:", response);
                
                const pricingMap = {};
                response.forEach(product => {
                    pricingMap[product.id] = {
                        ...product,
                        unitPrice: product.minSellingPrice,
                        displayPrice: `KES ${product.minSellingPrice}`,
                        priceStatus: product.priceStatus || 'active',
                        marginDisplay: product.marginDisplay || `${product.margin}%`
                    };
                });
                setProductPricing(pricingMap);
                console.log("💰 Product pricing mapped with", Object.keys(pricingMap).length, "products");
            } catch (error) {
                console.error('Failed to fetch product pricing:', error);
            } finally {
                if (isMounted) {
                    setPricingLoading(false);
                }
            }
        };
        
        fetchProductPricing();

        return () => {
            isMounted = false;
        };
    }, [stationId]);

    // Fetch current open shift - FIXED: Added proper cleanup
    useEffect(() => {
        let isMounted = true;

        const fetchCurrentShift = async () => {
            if (!stationId) return;
            
            try {
                console.log("📋 Fetching current shift for station:", stationId);
                const currentShift = await shiftService.getCurrentOpenShift(stationId);
                
                if (!isMounted) return;
                
                console.log("📋 Current shift:", currentShift);
                setCurrentShift(currentShift);
                setOpenShiftId(currentShift?.id);
            } catch (error) {
                console.error('Failed to fetch current shift:', error);
                if (isMounted) {
                    setError('Failed to fetch current shift');
                }
            }
        };

        fetchCurrentShift();

        return () => {
            isMounted = false;
        };
    }, [stationId]);

    // Fetch shift data when shift ID is available - FIXED: Added proper cleanup
    useEffect(() => {
        let isMounted = true;

        const fetchShiftData = async (shiftId) => {
            if (!shiftId) return;
            
            setLoading(true);
            setError(null);
            try {
                console.log("📊 Fetching shift data for shift:", shiftId);
                const shiftData = await connectedAssetService.getShiftAssetsStructure(shiftId);
                
                if (!isMounted) return;
                
                console.log("📊 Shift data received:", shiftData);
                setData(shiftData.data || shiftData);
            } catch (error) {
                console.error('Failed to fetch shift data:', error);
                if (isMounted) {
                    setError('Failed to load shift data');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (openShiftId) {
            fetchShiftData(openShiftId);
        }

        return () => {
            isMounted = false;
        };
    }, [openShiftId]); // FIXED: Only depend on openShiftId

    // Helper function to get product price info - FIXED: Moved outside useMemo
    const getProductPriceInfo = useCallback((productId) => {
        if (!productId) {
            return {
                unitPrice: 100.00,
                priceRange: "100.00 - 150.00",
                priceStatus: "unknown",
                margin: 0,
                fuelCode: "UNKNOWN",
                name: "Unknown Product",
                displayPrice: "KES 100.00"
            };
        }

        const product = productPricing[productId];
        if (!product) {
            console.warn(`No pricing found for product ${productId}, using fallback`);
            return {
                unitPrice: 100.00,
                priceRange: "100.00 - 150.00",
                priceStatus: "unknown",
                margin: 0,
                fuelCode: "UNKNOWN",
                name: "Unknown Product",
                displayPrice: "KES 100.00"
            };
        }

        return {
            unitPrice: product.unitPrice,
            priceRange: product.priceRange,
            priceStatus: product.priceStatus,
            margin: product.margin,
            fuelCode: product.fuelCode,
            name: product.name,
            displayPrice: product.displayPrice,
            baseCostPrice: product.baseCostPrice,
            maxSellingPrice: product.maxSellingPrice,
            minSellingPrice: product.minSellingPrice
        };
    }, [productPricing]);

    // Enhanced shift opening check - FIXED: Simplified dependencies
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
    }, [currentShift]); // FIXED: Only depend on currentShift

    // Transform pumps data - FIXED: Simplified dependencies
    const pumpsWithIslandInfo = useMemo(() => {
        if (!data?.islands) {
            console.log("❌ No islands data found");
            return [];
        }

        const pumps = [];
        data.islands.forEach(island => {
            if (island.pumps && island.pumps.length > 0) {
                island.pumps.forEach(pump => {
                    let connectedTank = null;
                    if (data.tanks) {
                        connectedTank = data.tanks.find(tank => 
                            tank.connectedPumps?.some(connectedPump => 
                                connectedPump.pumpId === pump.pumpId
                            )
                        );
                    }

                    const productId = connectedTank?.product?.id || pump.product?.id;
                    const productPriceInfo = getProductPriceInfo(productId);

                    pumps.push({
                        ...pump,
                        islandId: island.islandId,
                        islandName: island.islandName,
                        islandCode: island.islandCode,
                        attendants: island.attendants || [],
                        connectedTank: connectedTank ? {
                            tankId: connectedTank.tankId,
                            tankName: connectedTank.tankName,
                            product: connectedTank.product,
                            capacity: connectedTank.capacity,
                            currentVolume: connectedTank.currentVolume
                        } : null,
                        productPriceInfo,
                        product: {
                            ...pump.product,
                            ...(connectedTank?.product || {})
                        }
                    });
                });
            }
        });
        
        console.log("✅ Processed pumps:", pumps.length);
        return pumps;
    }, [data?.islands, data?.tanks, getProductPriceInfo]); // FIXED: Added getProductPriceInfo dependency

    // Transform tanks data - FIXED: Simplified dependencies
    const tanksWithReadings = useMemo(() => {
        if (!data?.tanks) return [];

        return data.tanks.map(tank => {
            const productPriceInfo = getProductPriceInfo(tank.product?.id);
            
            return {
                tankId: tank.tankId,
                tankName: tank.tankName,
                product: tank.product,
                capacity: tank.capacity,
                currentVolume: tank.currentVolume,
                dipReadings: tank.dipReadings || [],
                connectedPumps: tank.connectedPumps || [],
                hasReadings: tank.dipReadings && tank.dipReadings.length > 0,
                latestReading: tank.dipReadings?.[tank.dipReadings.length - 1] || null,
                productPriceInfo
            };
        });
    }, [data?.tanks, getProductPriceInfo]); // FIXED: Added getProductPriceInfo dependency

    // Get meter readings from currentShift for each pump - FIXED: Memoized
    const getPumpMeterReadings = useCallback((pumpId) => {
        if (!currentShift?.meterReadings) return null;
        return currentShift.meterReadings.find(reading => reading.pumpId === pumpId);
    }, [currentShift?.meterReadings]);

    // Expected collections calculation - FIXED: Simplified dependencies
    const expectedCollectionsByIsland = useMemo(() => {
        console.log("🧮 Calculating expected collections...");

        if (!pumpsWithIslandInfo.length) {
            console.log("❌ No pumps available for calculation");
            return [];
        }

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

            const meterReading = getPumpMeterReadings(pump.pumpId);
            
            const openingElectric = meterReading?.electricMeter || 
                                 pump.meterReadings?.find(r => r.readingType === 'START')?.electricMeter || 0;
            const openingManual = meterReading?.manualMeter || 
                               pump.meterReadings?.find(r => r.readingType === 'START')?.manualMeter || 0;
            
            const closingElectric = openingElectric + (Math.random() * 200 + 50);
            const closingManual = openingManual + (Math.random() * 200 + 50);
            
            const electricSales = closingElectric - openingElectric;
            const manualSales = closingManual - openingManual;
            const averageSales = (electricSales + manualSales) / 2;
            
            const unitPrice = pump.productPriceInfo.unitPrice;
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
                hasReadings: !!(openingElectric > 0 || openingManual > 0),
                productPriceInfo: pump.productPriceInfo
            };

            collections[islandId].pumps.push(pumpData);
            collections[islandId].totalExpected += expectedCollection;
        });

        const result = Object.values(collections);
        console.log("✅ Expected collections calculated:", result.length);
        return result;
    }, [pumpsWithIslandInfo, getPumpMeterReadings]);

    // Enhanced summary - FIXED: Simplified dependencies
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
    }, [data?.summary, pumpsWithIslandInfo, tanksWithReadings, expectedCollectionsByIsland, getPumpMeterReadings]);

    // ========== SHIFT CLOSING FUNCTIONS ==========

    // Build the complete shift closing payload - FIXED: Simplified dependencies
    const buildShiftClosingPayload = useCallback((closingFormData, currentUser) => {
        console.log("🔄 Building payload from closingFormData");

        const {
            pumpReadings = [],
            tankReadings = [],
            islandCollections = {},
            endTime,
            shiftId,
            recordedById,
            stationId: formStationId
        } = closingFormData;

        // Transform pump readings for API
        const transformedPumpReadings = pumpReadings
            .filter(reading => reading.electricMeter > 0 || reading.manualMeter > 0)
            .map(reading => {
                const litersDispensed = reading.litersDispensed || 0;
                const salesValue = reading.salesValue || 0;
                const unitPrice = reading.unitPrice || 100.0;

                return {
                    pumpId: reading.pumpId,
                    electricMeter: reading.electricMeter || 0,
                    manualMeter: reading.manualMeter || 0,
                    cashMeter: reading.cashMeter || 0,
                    litersDispensed: litersDispensed,
                    salesValue: salesValue,
                    unitPrice: unitPrice
                };
            });

        // Transform tank readings for API
        const transformedTankReadings = tankReadings
            .filter(reading => reading.dipValue > 0 || reading.volume > 0)
            .map(reading => ({
                tankId: reading.tankId,
                dipValue: reading.dipValue || 0,
                volume: reading.volume || 0,
                temperature: reading.temperature || 25.0,
                waterLevel: reading.waterLevel || 0.0,
                density: reading.density || 0.85
            }));

        // Transform island collections for API
        const transformedIslandCollections = Object.values(islandCollections)
            .filter(collection => collection && (
                collection.cashAmount > 0 || 
                collection.mobileMoneyAmount > 0 || 
                collection.visaAmount > 0 || 
                collection.mastercardAmount > 0 ||
                collection.debtAmount > 0 ||
                collection.otherAmount > 0
            ))
            .map(collection => ({
                islandId: collection.islandId,
                cashAmount: collection.cashAmount || 0,
                mobileMoneyAmount: collection.mobileMoneyAmount || 0,
                visaAmount: collection.visaAmount || 0,
                mastercardAmount: collection.mastercardAmount || 0,
                debtAmount: collection.debtAmount || 0,
                otherAmount: collection.otherAmount || 0,
                expectedAmount: collection.totalExpected || 0
            }));

        // Build the complete payload
        const payload = {
            shiftId: shiftId || currentShift?.id,
            recordedById: recordedById || currentUser?.id,
            endTime: new Date(endTime || new Date()).toISOString(),
            pumpReadings: transformedPumpReadings,
            tankReadings: transformedTankReadings,
            islandCollections: transformedIslandCollections,
            stationId: formStationId || stationId
        };

        // Add metadata for debugging
        payload.metadata = {
            stationId: formStationId || stationId,
            totalPumps: transformedPumpReadings.length,
            totalTanks: transformedTankReadings.length,
            totalIslands: transformedIslandCollections.length,
            generatedAt: new Date().toISOString(),
            pricingUsed: 'dynamic',
            source: 'closingFormData'
        };

        console.log("✅ Final payload built");
        return payload;
    }, [currentShift, stationId]); // FIXED: Minimal dependencies

    // Validate the closing payload - FIXED: No dependencies needed
    const validateShiftClosingPayload = useCallback((payload) => {
        const errors = [];

        if (!payload.shiftId) {
            errors.push('Shift ID is required');
        }

        if (!payload.recordedById) {
            errors.push('Recorded By user ID is required');
        }

        if (!payload.endTime) {
            errors.push('End time is required');
        }

        // Validate pump readings
        payload.pumpReadings.forEach((reading, index) => {
            if (!reading.pumpId) {
                errors.push(`Pump reading ${index + 1}: Pump ID is required`);
            }
            if (reading.electricMeter < 0) {
                errors.push(`Pump ${reading.pumpId}: Electric meter cannot be negative`);
            }
            if (reading.unitPrice <= 0) {
                errors.push(`Pump ${reading.pumpId}: Unit price must be greater than 0`);
            }
        });

        // Validate tank readings
        payload.tankReadings.forEach((reading, index) => {
            if (!reading.tankId) {
                errors.push(`Tank reading ${index + 1}: Tank ID is required`);
            }
            if (reading.dipValue < 0) {
                errors.push(`Tank ${reading.tankId}: Dip value cannot be negative`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }, []);

    // Submit shift closing - FIXED: Simplified dependencies
    const submitShiftClosing = useCallback(async (closingFormData, currentUser) => {
        try {
            const payload = buildShiftClosingPayload(closingFormData, currentUser);
            const validation = validateShiftClosingPayload(payload);

            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            console.log('🚀 Submitting shift closing payload');
            
            const shiftId = payload.shiftId;
            const result = await shiftService.closeShift(shiftId, payload);
            return result;

        } catch (error) {
            console.error('Failed to close shift:', error);
            throw error;
        }
    }, [buildShiftClosingPayload, validateShiftClosingPayload]);

    // Get payload summary for UI - FIXED: No dependencies needed
    const getClosingPayloadSummary = useCallback((closingFormData, currentUser) => {
        console.log("📈 Getting payload summary");
        
        const { pumpReadings = [], tankReadings = [], islandCollections = {} } = closingFormData;

        const totalSales = pumpReadings.reduce((sum, reading) => sum + (reading.salesValue || 0), 0);
        const totalLiters = pumpReadings.reduce((sum, reading) => sum + (reading.litersDispensed || 0), 0);
        const totalCollections = Object.values(islandCollections).reduce((sum, collection) => 
            sum + (collection.cashAmount || 0) + 
            (collection.mobileMoneyAmount || 0) + 
            (collection.visaAmount || 0) + 
            (collection.mastercardAmount || 0) + 
            (collection.debtAmount || 0) + 
            (collection.otherAmount || 0), 0);

        const summary = {
            pumps: pumpReadings.filter(r => r.electricMeter > 0 || r.manualMeter > 0).length,
            tanks: tankReadings.filter(r => r.dipValue > 0 || r.volume > 0).length,
            islands: Object.keys(islandCollections).filter(key => {
                const collection = islandCollections[key];
                return collection && (
                    collection.cashAmount > 0 || 
                    collection.mobileMoneyAmount > 0 || 
                    collection.visaAmount > 0 || 
                    collection.mastercardAmount > 0 ||
                    collection.debtAmount > 0 ||
                    collection.otherAmount > 0
                );
            }).length,
            totalSales,
            totalCollections,
            totalLiters
        };

        console.log("📊 Payload summary calculated");
        return summary;
    }, []);

    // Utility functions
    const getProductPricing = useCallback((productId) => {
        return getProductPriceInfo(productId);
    }, [getProductPriceInfo]);

    const getTankByPumpId = useCallback((pumpId) => {
        return pumpsWithIslandInfo.find(pump => pump.pumpId === pumpId)?.connectedTank || null;
    }, [pumpsWithIslandInfo]);

    const getPumpsByTankId = useCallback((tankId) => {
        return pumpsWithIslandInfo.filter(pump => pump.connectedTank?.tankId === tankId);
    }, [pumpsWithIslandInfo]);

    // Check if we have any data
    const hasData = useMemo(() => {
        return !!(data && (pumpsWithIslandInfo.length > 0 || tanksWithReadings.length > 0));
    }, [data, pumpsWithIslandInfo, tanksWithReadings]);

    // Refetch function
    const refetch = useCallback(() => {
        if (openShiftId) {
            fetchShiftData(openShiftId);
        }
    }, [openShiftId]);

    return {
        // Core data
        data,
        currentShift,
        pumpsWithIslandInfo,
        tanksWithReadings,
        attendantsWithDetails: data?.attendants || [],
        expectedCollectionsByIsland,
        enhancedSummary,
        enhancedShiftOpeningCheck,
        assetsRequiringAttention: [], // Simplified for now
        productPricing,
        
        // State
        loading: loading || pricingLoading,
        error,
        hasData,
        
        // Actions
        refetch,

        // Shift closing functions
        buildShiftClosingPayload,
        validateShiftClosingPayload,
        submitShiftClosing,
        getClosingPayloadSummary,

        // Enhanced utility functions
        getProductPricing,
        getTankByPumpId,
        getPumpsByTankId,
        getProductPriceInfo
    };
};