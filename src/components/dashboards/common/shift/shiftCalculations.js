// shiftWizard/shiftCalculations.js
import { READING_TYPES } from './constants';

/**
 * Utility functions for shift data calculations
 */

export const calculateShiftTotals = (shift) => {
  const sales = shift.sales?.[0] || {};
  const collection = shift.shiftCollection || {};
  const meterReadings = shift.meterReadings || [];
  
  // Calculate fuel sales from meter readings
  const fuelSales = meterReadings
    .filter(reading => reading.readingType === 'END')
    .reduce((total, reading) => total + (reading.salesValue || 0), 0);
  
  // Calculate total liters dispensed
  const totalLiters = meterReadings
    .filter(reading => reading.readingType === 'END')
    .reduce((total, reading) => total + (reading.litersDispensed || 0), 0);

  // Calculate cash variance
  const expectedCash = sales.totalRevenue || 0;
  const actualCash = collection.totalCollected || 0;
  const cashVariance = actualCash - expectedCash;
  const cashVariancePercentage = expectedCash ? (cashVariance / expectedCash) * 100 : 0;

  return {
    totalRevenue: sales.totalRevenue || 0,
    totalFuelRevenue: sales.totalFuelRevenue || fuelSales,
    totalNonFuelRevenue: sales.totalNonFuelRevenue || 0,
    totalCollections: actualCash,
    totalLitersDispensed: totalLiters,
    variance: cashVariance,
    variancePercentage: cashVariancePercentage,
    expectedAmount: expectedCash,
    cashVariance,
    cashVariancePercentage
  };
};

export const calculatePumpMetrics = (meterReadings = []) => {
  const pumps = {};
  
  meterReadings.forEach(reading => {
    const pumpId = reading.pumpId;
    if (!pumps[pumpId]) {
      pumps[pumpId] = {
        id: pumpId,
        name: reading.pump?.asset?.name,
        product: reading.pump?.tank?.product?.name,
        startReading: null,
        endReading: null,
        sales: 0,
        liters: 0,
        electricMeterStart: null,
        electricMeterEnd: null,
        manualMeterStart: null,
        manualMeterEnd: null
      };
    }
    
    if (reading.readingType === 'START') {
      pumps[pumpId].startReading = reading;
      pumps[pumpId].electricMeterStart = reading.electricMeter;
      pumps[pumpId].manualMeterStart = reading.manualMeter;
    } else if (reading.readingType === 'END') {
      pumps[pumpId].endReading = reading;
      pumps[pumpId].electricMeterEnd = reading.electricMeter;
      pumps[pumpId].manualMeterEnd = reading.manualMeter;
      pumps[pumpId].sales += reading.salesValue || 0;
      pumps[pumpId].liters += reading.litersDispensed || 0;
    }
  });
  
  return Object.values(pumps);
};

export const calculateTankMetrics = (dipReadings = []) => {
  const tanks = {};
  
  dipReadings.forEach(reading => {
    const tankId = reading.tankId;
    if (!tanks[tankId]) {
      tanks[tankId] = {
        id: tankId,
        name: reading.tank?.asset?.name,
        product: reading.tank?.product?.name,
        startReading: null,
        endReading: null,
        volumeChange: 0,
        dipStart: null,
        dipEnd: null
      };
    }
    
    if (reading.readingType === 'START') {
      tanks[tankId].startReading = reading;
      tanks[tankId].dipStart = reading.dipValue;
    } else if (reading.readingType === 'END') {
      tanks[tankId].endReading = reading;
      tanks[tankId].dipEnd = reading.dipValue;
      const startVolume = tanks[tankId].startReading?.volume || 0;
      const endVolume = reading.volume || 0;
      tanks[tankId].volumeChange = endVolume - startVolume;
    }
  });
  
  return Object.values(tanks);
};

export const getShiftStatusInfo = (shift, formatShiftStatus) => {
  const openingCheck = shift.shiftOpeningCheck?.[0];
  
  const statusInfo = {
    isOpen: shift.status === 'OPEN',
    isClosed: shift.status === 'CLOSED',
    isUnderReview: shift.status === 'UNDER_REVIEW',
    isApproved: shift.status === 'APPROVED',
    openingChecks: openingCheck ? {
      hasInitialMeterReadings: openingCheck.hasInitialMeterReadings,
      hasInitialDipReadings: openingCheck.hasInitialDipReadings,
      hasAttendantsAssigned: openingCheck.hasAttendantsAssigned,
      hasNoOpenShifts: openingCheck.hasNoOpenShifts,
      hasValidPricing: openingCheck.hasValidPricing,
      hasAssetsConnected: openingCheck.hasAssetsConnected,
      checksPassed: openingCheck.checksPassed,
      validatedAt: openingCheck.validatedAt
    } : null
  };

  // Apply formatting if provided
  if (formatShiftStatus) {
    statusInfo.formattedStatus = formatShiftStatus(shift.status);
  } else {
    statusInfo.formattedStatus = {
      label: shift.status,
      color: 'default',
      variant: 'default'
    };
  }

  return statusInfo;
};

export const calculateIslandCollections = (islandCollections = []) => {
  return islandCollections.reduce((totals, collection) => ({
    cash: totals.cash + (collection.cashAmount || 0),
    mobileMoney: totals.mobileMoney + (collection.mobileMoneyAmount || 0),
    visa: totals.visa + (collection.visaAmount || 0),
    mastercard: totals.mastercard + (collection.mastercardAmount || 0),
    debt: totals.debt + (collection.debtAmount || 0),
    other: totals.other + (collection.otherAmount || 0),
    total: totals.total + (collection.totalCollected || 0)
  }), {
    cash: 0,
    mobileMoney: 0,
    visa: 0,
    mastercard: 0,
    debt: 0,
    other: 0,
    total: 0
  });
};

export const calculateReconciliationMetrics = (reconciliation) => {
  if (!reconciliation) return null;

  return {
    status: reconciliation.status,
    expectedQty: reconciliation.expectedQty,
    actualQty: reconciliation.actualQty,
    variance: reconciliation.variance,
    variancePct: reconciliation.variancePct,
    tankReconciliations: reconciliation.tankReconciliations || [],
    hasDiscrepancy: reconciliation.status === 'DISCREPANCY',
    isResolved: reconciliation.status === 'RESOLVED'
  };
};