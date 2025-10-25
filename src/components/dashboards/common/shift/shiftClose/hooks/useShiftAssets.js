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

    console.log("this is the useAsset hook");

    // Fetch product pricing
    useEffect(() => {
        const fetchProductPricing = async () => {
            setPricingLoading(true);
            try {
                console.log("💰 Fetching product pricing...");
                const response = await fuelPriceService.getProductPrices({}, true);
                console.log("💰 Prices response:", response);
                
                // Convert array to object for easy lookup by product ID
                const pricingMap = {};
                response.forEach(product => {
                    pricingMap[product.id] = {
                        ...product,
                        unitPrice: product.minSellingPrice, // Use min selling price as default
                        displayPrice: `KES ${product.minSellingPrice}`,
                        priceStatus: product.priceStatus || 'active',
                        marginDisplay: product.marginDisplay || `${product.margin}%`
                    };
                });
                setProductPricing(pricingMap);
                console.log("💰 Product pricing mapped with", Object.keys(pricingMap).length, "products");
            } catch (error) {
                console.error('Failed to fetch product pricing:', error);
                // Don't set error state - we can fallback to default pricing
            } finally {
                setPricingLoading(false);
            }
        };
        
        if (stationId) {
            fetchProductPricing();
        }
    }, [stationId]);

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

    // Helper function to get product price info
    const getProductPriceInfo = (productId) => {
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

    // Transform pumps data with island information, tank relationships, and product pricing
    const pumpsWithIslandInfo = useMemo(() => {
        if (!data?.islands) {
            console.log("No islands data found in:", data);
            return [];
        }

        const pumps = [];
        data.islands.forEach(island => {
            if (island.pumps && island.pumps.length > 0) {
                island.pumps.forEach(pump => {
                    // Find the connected tank for this pump
                    let connectedTank = null;
                    if (data.tanks) {
                        connectedTank = data.tanks.find(tank => 
                            tank.connectedPumps?.some(connectedPump => 
                                connectedPump.pumpId === pump.pumpId
                            )
                        );
                    }

                    // Use pump product or tank product (tank product takes precedence)
                    const productId = connectedTank?.product?.id || pump.product?.id;
                    const productPriceInfo = getProductPriceInfo(productId);

                    pumps.push({
                        ...pump,
                        islandId: island.islandId,
                        islandName: island.islandName,
                        islandCode: island.islandCode,
                        attendants: island.attendants || [],
                        
                        // Enhanced with tank relationships
                        connectedTank: connectedTank ? {
                            tankId: connectedTank.tankId,
                            tankName: connectedTank.tankName,
                            product: connectedTank.product,
                            capacity: connectedTank.capacity,
                            currentVolume: connectedTank.currentVolume
                        } : null,
                        
                        // Enhanced with dynamic pricing
                        productPriceInfo,
                        
                        // Original product info (for backward compatibility)
                        product: {
                            ...pump.product,
                            // Override with tank product if available
                            ...(connectedTank?.product || {})
                        }
                    });
                });
            }
        });
        
        console.log("Processed pumps with island info, tank relationships, and pricing:", pumps);
        return pumps;
    }, [data?.islands, data?.tanks, productPricing]);

    // Transform tanks data with readings and connected pumps info
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
    }, [data?.tanks, productPricing]);

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

    // Expected collections calculation by island with DYNAMIC PRICING
    const expectedCollectionsByIsland = useMemo(() => {
        console.log("Calculating expected collections with dynamic pricing...");
        console.log("Pumps with island info:", pumpsWithIslandInfo);
        console.log("Current shift meter readings:", currentShift?.meterReadings);

        if (!pumpsWithIslandInfo.length) {
            console.log("No pumps available for calculation");
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

            // Get meter readings from currentShift
            const meterReading = getPumpMeterReadings(pump.pumpId);
            console.log(`Pump ${pump.pumpId} meter reading:`, meterReading);
            
            // Use actual readings from currentShift or fallback to pump data
            const openingElectric = meterReading?.electricMeter || 
                                 pump.meterReadings?.find(r => r.readingType === 'START')?.electricMeter || 0;
            const openingManual = meterReading?.manualMeter || 
                               pump.meterReadings?.find(r => r.readingType === 'START')?.manualMeter || 0;
            
            console.log(`Pump ${pump.pumpName} openings - Electric: ${openingElectric}, Manual: ${openingManual}`);
            
            // For demo - using dummy closing values (in real app, these would be user input)
            const closingElectric = openingElectric + (Math.random() * 200 + 50);
            const closingManual = openingManual + (Math.random() * 200 + 50);
            
            const electricSales = closingElectric - openingElectric;
            const manualSales = closingManual - openingManual;
            const averageSales = (electricSales + manualSales) / 2;
            
            // USE DYNAMIC PRICING FROM PRODUCT
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
                unitPrice, // DYNAMIC PRICING
                expectedCollection: Math.round(expectedCollection * 100) / 100,
                hasReadings: !!(openingElectric > 0 || openingManual > 0),
                productPriceInfo: pump.productPriceInfo // Include full pricing info
            };

            collections[islandId].pumps.push(pumpData);
            collections[islandId].totalExpected += expectedCollection;
        });

        const result = Object.values(collections);
        console.log("Final expected collections with dynamic pricing:", result);
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
                    product: pump.product?.name,
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

    // ========== SHIFT CLOSING FUNCTIONS ==========

    // Build the complete shift closing payload with DYNAMIC PRICING
    const buildShiftClosingPayload = useCallback((closingFormData, currentUser) => {
        const {
            pumpReadings = [],
            tankReadings = [],
            islandCollections = {},
            endTime
        } = closingFormData;

        // Transform pump readings for API
        const transformedPumpReadings = pumpReadings
            .filter(reading => reading.electricMeter > 0)
            .map(reading => {
                const pump = pumpsWithIslandInfo.find(p => p.pumpId === reading.pumpId);
                const startReading = pump?.meterReadings?.find(r => r.readingType === 'START');
                
                // Calculate liters dispensed if not provided
                const calculatedLiters = reading.litersDispensed || 
                    (reading.electricMeter - (startReading?.electricMeter || 0));
                
                // Use DYNAMIC PRICING from product
                const unitPrice = pump?.productPriceInfo?.unitPrice || reading.unitPrice || 100.0;
                
                // Calculate sales value if not provided
                const calculatedSales = reading.salesValue || 
                    (calculatedLiters * unitPrice);

                return {
                    pumpId: reading.pumpId,
                    electricMeter: reading.electricMeter || 0,
                    manualMeter: reading.manualMeter || 0,
                    cashMeter: reading.cashMeter || 0,
                    litersDispensed: calculatedLiters,
                    salesValue: calculatedSales,
                    unitPrice: unitPrice // DYNAMIC PRICING
                };
            });

        // Transform tank readings for API
        const transformedTankReadings = tankReadings
            .filter(reading => reading.dipValue > 0)
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
            .filter(collection => 
                collection.cashAmount > 0 || 
                collection.mobileMoneyAmount > 0 || 
                collection.visaAmount > 0 || 
                collection.mastercardAmount > 0 ||
                collection.debtAmount > 0 ||
                collection.otherAmount > 0
            )
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
            shiftId: currentShift?.id,
            recordedById: currentUser?.id,
            endTime: new Date(endTime).toISOString(),
            pumpReadings: transformedPumpReadings,
            tankReadings: transformedTankReadings,
            islandCollections: transformedIslandCollections
        };

        // Add metadata for debugging
        payload.metadata = {
            stationId: stationId,
            totalPumps: transformedPumpReadings.length,
            totalTanks: transformedTankReadings.length,
            totalIslands: transformedIslandCollections.length,
            generatedAt: new Date().toISOString(),
            pricingUsed: 'dynamic' // Indicate that dynamic pricing was used
        };

        return payload;
    }, [currentShift, pumpsWithIslandInfo, stationId]);

    // Validate the closing payload
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

    // Submit shift closing
    const submitShiftClosing = useCallback(async (closingFormData, currentUser) => {
        try {
            const payload = buildShiftClosingPayload(closingFormData, currentUser);
            const validation = validateShiftClosingPayload(payload);

            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            console.log('Submitting shift closing payload:', payload);
            
            const shiftId = payload.shiftId;
            const result = await shiftService.closeShift(shiftId, payload);
            return result;

        } catch (error) {
            console.error('Failed to close shift:', error);
            throw error;
        }
    }, [buildShiftClosingPayload, validateShiftClosingPayload]);

    // Get payload summary for UI
    const getClosingPayloadSummary = useCallback((closingFormData, currentUser) => {
        const payload = buildShiftClosingPayload(closingFormData, currentUser);
        
        return {
            pumps: payload.pumpReadings.length,
            tanks: payload.tankReadings.length,
            islands: payload.islandCollections.length,
            totalSales: payload.pumpReadings.reduce((sum, reading) => sum + (reading.salesValue || 0), 0),
            totalCollections: payload.islandCollections.reduce((sum, collection) => 
                sum + (collection.cashAmount || 0) + 
                (collection.mobileMoneyAmount || 0) + 
                (collection.visaAmount || 0) + 
                (collection.mastercardAmount || 0) + 
                (collection.debtAmount || 0) + 
                (collection.otherAmount || 0), 0),
            totalLiters: payload.pumpReadings.reduce((sum, reading) => sum + (reading.litersDispensed || 0), 0)
        };
    }, [buildShiftClosingPayload]);

    // Get product pricing for a specific product
    const getProductPricing = useCallback((productId) => {
        return getProductPriceInfo(productId);
    }, []);

    // Find tank by pump ID
    const getTankByPumpId = useCallback((pumpId) => {
        return pumpsWithIslandInfo.find(pump => pump.pumpId === pumpId)?.connectedTank || null;
    }, [pumpsWithIslandInfo]);

    // Find pumps by tank ID
    const getPumpsByTankId = useCallback((tankId) => {
        return pumpsWithIslandInfo.filter(pump => pump.connectedTank?.tankId === tankId);
    }, [pumpsWithIslandInfo]);

    return {
        // Core data
        data,
        currentShift,
        pumpsWithIslandInfo,
        tanksWithReadings,
        attendantsWithDetails,
        expectedCollectionsByIsland,
        enhancedSummary,
        enhancedShiftOpeningCheck,
        assetsRequiringAttention,
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