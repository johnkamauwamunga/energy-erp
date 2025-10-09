// shiftWizard/shiftTransformers.js
import { 
  calculateShiftTotals, 
  calculatePumpMetrics, 
  calculateTankMetrics,
  getShiftStatusInfo,
  calculateIslandCollections,
  calculateReconciliationMetrics
} from './shiftCalculations';
import { VIEW_TYPES } from './constants';

/**
 * Transform raw shift API data into structured, consumable format
 */

export const transformShiftData = (rawShiftData, formatShiftStatus) => {
  if (!rawShiftData?.shifts) {
    return {
      shifts: [],
      summary: {},
      pagination: {},
      processedAt: new Date().toISOString()
    };
  }

  const processedShifts = rawShiftData.shifts.map(shift => 
    transformSingleShift(shift, formatShiftStatus)
  );
  
  return {
    shifts: processedShifts,
    summary: rawShiftData.summary || {},
    pagination: rawShiftData.pagination || {},
    processedAt: new Date().toISOString(),
    metadata: {
      totalProcessed: processedShifts.length,
      hasOpenShifts: processedShifts.some(s => s.statusInfo.isOpen),
      hasVariances: processedShifts.some(s => s.quality.hasVariance),
      hasDiscrepancies: processedShifts.some(s => s.quality.hasDiscrepancies)
    }
  };
};

export const transformSingleShift = (shift, formatShiftStatus) => {
  if (!shift || !shift.id) {
    console.warn('Invalid shift data provided to transformSingleShift');
    return null;
  }

  const totals = calculateShiftTotals(shift);
  const statusInfo = getShiftStatusInfo(shift, formatShiftStatus);
  const financials = extractFinancialData(shift);
  const personnel = extractPersonnelData(shift);
  const assets = extractAssetData(shift);
  const reconciliation = calculateReconciliationMetrics(shift.reconciliation);

  return {
    // Basic shift info
    id: shift.id,
    shiftNumber: shift.shiftNumber,
    status: shift.status,
    startTime: shift.startTime,
    endTime: shift.endTime,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
    startVerifiedAt: shift.startVerifiedAt,
    endVerifiedAt: shift.endVerifiedAt,
    
    // Station info
    station: {
      id: shift.station?.id,
      name: shift.station?.name,
      location: shift.station?.location,
      company: shift.station?.company
    },
    
    // Supervisor info
    supervisor: {
      id: shift.supervisor?.id,
      name: `${shift.supervisor?.firstName || ''} ${shift.supervisor?.lastName || ''}`.trim(),
      email: shift.supervisor?.email,
      firstName: shift.supervisor?.firstName,
      lastName: shift.supervisor?.lastName
    },
    
    // Pricing
    priceList: shift.priceList,
    
    // Calculated totals
    totals,
    
    // Status and readiness
    statusInfo,
    
    // Financial data
    financials,
    
    // Personnel assignments
    personnel,
    
    // Asset information
    assets,
    
    // Reconciliation data
    reconciliation,
    
    // Quality metrics
    quality: {
      hasVariance: totals.variance !== 0,
      variancePercentage: totals.variancePercentage,
      reconciliationStatus: shift.reconciliation?.status,
      openingChecksPassed: shift.shiftOpeningCheck?.[0]?.checksPassed || false,
      hasDiscrepancies: shift.reconciliation?.status === 'DISCREPANCY',
      isFullyReconciled: shift.reconciliation?.status === 'RECONCILED'
    },
    
    // Collections and sales
    collections: {
      shift: shift.shiftCollection,
      islands: shift.islandCollections || [],
      sales: shift.sales?.[0],
      productSales: shift.productSale || [],
      nonFuelStocks: shift.nonFuelStocks || []
    },
    
    // Reports
    report: shift.report,
    
    // Additional data
    shiftOpeningCheck: shift.shiftOpeningCheck,
    fuelOffload: shift.fuelOffload || [],
    pumpSalesDuringOffload: shift.pumpsalesDuringOffload || [],
    stockings: shift.stockings || [],
    fuelMovements: shift.fuelMovements || [],
    
    // Raw data for advanced processing (optional)
    _raw: process.env.NODE_ENV === 'development' ? shift : undefined
  };
};

const extractFinancialData = (shift) => {
  const collection = shift.shiftCollection || {};
  const islandCollections = shift.islandCollections || [];
  const islandTotals = calculateIslandCollections(islandCollections);

  return {
    cashAmount: collection.cashAmount || 0,
    mobileMoneyAmount: collection.mobileMoneyAmount || 0,
    visaAmount: collection.visaAmount || 0,
    mastercardAmount: collection.mastercardAmount || 0,
    debtAmount: collection.debtAmount || 0,
    otherAmount: collection.otherAmount || 0,
    totalCollected: collection.totalCollected || 0,
    expectedAmount: collection.expectedAmount || 0,
    variance: collection.variance || 0,
    variancePercentage: collection.variancePercentage || 0,
    status: collection.status,
    islandBreakdown: islandCollections.map(ic => ({
      id: ic.id,
      islandId: ic.islandId,
      islandCode: ic.island?.code,
      attendantId: ic.attendantId,
      attendantName: `${ic.attendant?.firstName} ${ic.attendant?.lastName}`,
      cashAmount: ic.cashAmount,
      mobileMoneyAmount: ic.mobileMoneyAmount,
      visaAmount: ic.visaAmount,
      mastercardAmount: ic.mastercardAmount,
      debtAmount: ic.debtAmount,
      otherAmount: ic.otherAmount,
      totalCollected: ic.totalCollected,
      expectedAmount: ic.expectedAmount,
      variance: ic.variance,
      variancePercentage: ic.variancePercentage,
      status: ic.status
    })),
    islandTotals
  };
};

const extractPersonnelData = (shift) => {
  const attendants = shift.shiftIslandAttedant || [];
  
  const uniqueAttendants = Array.from(new Set(attendants.map(a => a.attendantId)))
    .map(id => {
      const attendantData = attendants.find(a => a.attendantId === id);
      return {
        id: attendantData.attendantId,
        name: `${attendantData.attendant?.firstName} ${attendantData.attendant?.lastName}`,
        email: attendantData.attendant?.email,
        firstName: attendantData.attendant?.firstName,
        lastName: attendantData.attendant?.lastName
      };
    });

  return {
    supervisor: shift.supervisor ? {
      id: shift.supervisor.id,
      name: `${shift.supervisor.firstName} ${shift.supervisor.lastName}`,
      email: shift.supervisor.email,
      firstName: shift.supervisor.firstName,
      lastName: shift.supervisor.lastName
    } : null,
    attendants: uniqueAttendants,
    islandAssignments: attendants.map(sia => ({
      id: sia.id,
      attendantId: sia.attendantId,
      attendantName: `${sia.attendant?.firstName} ${sia.attendant?.lastName}`,
      islandId: sia.islandId,
      islandCode: sia.island?.code,
      assignmentType: sia.assignmentType,
      assignedAt: sia.assignedAt
    })),
    totalAttendants: uniqueAttendants.length
  };
};

const extractAssetData = (shift) => {
  const meterReadings = shift.meterReadings || [];
  const dipReadings = shift.dipReadings || [];
  
  return {
    pumps: calculatePumpMetrics(meterReadings),
    tanks: calculateTankMetrics(dipReadings),
    islands: Array.from(new Set(shift.shiftIslandAttedant?.map(sia => sia.islandId) || [])).map(islandId => {
      const islandData = shift.shiftIslandAttedant.find(sia => sia.islandId === islandId);
      return {
        id: islandId,
        code: islandData?.island?.code,
        name: islandData?.island?.name,
        attendants: shift.shiftIslandAttedant
          .filter(a => a.islandId === islandId)
          .map(a => ({
            id: a.attendantId,
            name: `${a.attendant?.firstName} ${a.attendant?.lastName}`,
            assignmentType: a.assignmentType
          }))
      };
    }),
    meterReadings,
    dipReadings
  };
};

// Specialized transformers for specific views
export const transformForListView = (shift) => ({
  id: shift.id,
  shiftNumber: shift.shiftNumber,
  status: shift.status,
  startTime: shift.startTime,
  endTime: shift.endTime,
  stationName: shift.station?.name,
  supervisorName: `${shift.supervisor?.firstName} ${shift.supervisor?.lastName}`,
  totalRevenue: shift.totals?.totalRevenue || 0,
  totalCollections: shift.totals?.totalCollections || 0,
  variance: shift.totals?.variance || 0,
  variancePercentage: shift.totals?.variancePercentage || 0,
  hasVariance: shift.quality?.hasVariance || false,
  statusInfo: shift.statusInfo,
  duration: shift.endTime 
    ? new Date(shift.endTime) - new Date(shift.startTime)
    : null
});

export const transformForDashboard = (shift) => ({
  id: shift.id,
  shiftNumber: shift.shiftNumber,
  status: shift.status,
  startTime: shift.startTime,
  stationName: shift.station?.name,
  supervisorName: `${shift.supervisor?.firstName} ${shift.supervisor?.lastName}`,
  totalRevenue: shift.totals?.totalRevenue || 0,
  totalLiters: shift.totals?.totalLitersDispensed || 0,
  totalCollections: shift.totals?.totalCollections || 0,
  attendantsCount: shift.personnel?.totalAttendants || 0,
  isOpen: shift.statusInfo?.isOpen || false,
  hasVariance: shift.quality?.hasVariance || false,
  pumpsCount: shift.assets?.pumps?.length || 0
});

export const transformForSummary = (shift) => ({
  id: shift.id,
  shiftNumber: shift.shiftNumber,
  status: shift.status,
  startTime: shift.startTime,
  endTime: shift.endTime,
  stationName: shift.station?.name,
  totals: shift.totals,
  financials: shift.financials,
  quality: shift.quality,
  statusInfo: shift.statusInfo
});

// Batch transformation for multiple shifts
export const transformShiftsByViewType = (shifts, viewType, formatShiftStatus) => {
  if (!shifts || !shifts.length) return [];

  const transformer = {
    [VIEW_TYPES.LIST]: transformForListView,
    [VIEW_TYPES.DASHBOARD]: transformForDashboard,
    [VIEW_TYPES.SUMMARY]: transformForSummary,
    [VIEW_TYPES.FULL]: (shift) => transformSingleShift(shift, formatShiftStatus)
  }[viewType] || transformForListView;

  return shifts.map(transformer);
};