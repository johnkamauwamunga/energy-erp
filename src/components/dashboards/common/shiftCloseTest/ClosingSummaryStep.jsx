import React from 'react';
import { Card, Table, Badge, Alert, Progress } from '../../../ui';
import { CheckCircle, FileText, DollarSign, Zap, Fuel, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { closingCalculations } from './dummyDataForClosing';

const ClosingSummaryStep = ({ shiftData, closingData }) => {
  const { shiftIslandAttedant } = shiftData;
  const { pumpReadings, tankReadings, islandCollections } = closingData;

  // Calculate totals
  const totalSales = pumpReadings.reduce((sum, reading) => sum + (reading.salesValue || 0), 0);
  const totalCollections = islandCollections.reduce((sum, collection) => 
    sum + closingCalculations.calculateTotalCollected(collection), 0
  );
  const totalVariance = totalCollections - totalSales;
  const variancePercentage = closingCalculations.calculateVariance(totalSales, totalCollections);

  // Calculate fuel reconciliation
  const totalFuelDispensed = pumpReadings.reduce((sum, reading) => sum + (reading.litersDispensed || 0), 0);
  const totalTankVolumeChange = tankReadings.reduce((sum, reading) => {
    const startReading = shiftData.dipReadings.find(dr => dr.tankId === reading.tankId);
    return sum + (startReading ? (reading.volume - startReading.volume) : 0);
  }, 0);

  const fuelReconciliationVariance = totalTankVolumeChange + totalFuelDispensed; // Should be close to 0

  const getIslandName = (islandId) => {
    const assignment = shiftIslandAttedant.find(a => a.islandId === islandId);
    return assignment?.island.name || 'Unknown Island';
  };

  const getPumpName = (pumpId) => {
    const reading = shiftData.meterReadings.find(mr => mr.pumpId === pumpId);
    return reading?.pump?.asset.name || 'Unknown Pump';
  };

  const getTankName = (tankId) => {
    const reading = shiftData.dipReadings.find(dr => dr.tankId === tankId);
    return reading?.tank?.asset.name || 'Unknown Tank';
  };

  const getVarianceStatus = (variance, percentage) => {
    if (Math.abs(percentage) <= 1) return { status: 'exact', color: 'green' };
    if (variance > 0) return { status: 'over', color: 'orange' };
    return { status: 'under', color: 'red' };
  };

  const cashVariance = getVarianceStatus(totalVariance, variancePercentage);
  const fuelVariance = getVarianceStatus(fuelReconciliationVariance, 0);

  return (
    <div className="space-y-6">
      <Alert variant="success">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <div>
            <h4 className="font-semibold">Ready to Close Shift</h4>
            <p>Review all closing data below before finalizing the shift.</p>
          </div>
        </div>
      </Alert>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Fuel Sales</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            KES {totalSales.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">{totalFuelDispensed.toFixed(2)} L</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="font-semibold">Collections</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            KES {totalCollections.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">{islandCollections.length} islands</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {cashVariance.status === 'exact' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {cashVariance.status === 'over' && <TrendingUp className="w-5 h-5 text-orange-600" />}
            {cashVariance.status === 'under' && <TrendingDown className="w-5 h-5 text-red-600" />}
            <span className="font-semibold">Cash Variance</span>
          </div>
          <p className={`text-2xl font-bold ${
            cashVariance.color === 'green' ? 'text-green-600' :
            cashVariance.color === 'orange' ? 'text-orange-600' : 'text-red-600'
          }`}>
            KES {totalVariance.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">{variancePercentage.toFixed(2)}%</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-purple-600" />
            <span className="font-semibold">Fuel Variance</span>
          </div>
          <p className={`text-xl font-bold ${
            Math.abs(fuelReconciliationVariance) < 10 ? 'text-green-600' : 'text-orange-600'
          }`}>
            {fuelReconciliationVariance.toFixed(2)} L
          </p>
          <p className="text-sm text-gray-600">Reconciliation</p>
        </Card>
      </div>

      {/* Pump Sales Summary */}
      <Card title="Pump Sales Summary" className="p-6">
        <Table>
          <thead>
            <tr>
              <th>Pump</th>
              <th>Island</th>
              <th>Liters Dispensed</th>
              <th>Sales Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pumpReadings.map((reading, index) => {
              const pump = shiftData.meterReadings.find(mr => mr.pumpId === reading.pumpId);
              const islandId = pump?.pump?.islandId;
              
              return (
                <tr key={index}>
                  <td className="font-medium">{getPumpName(reading.pumpId)}</td>
                  <td>{islandId ? getIslandName(islandId) : 'N/A'}</td>
                  <td>{reading.litersDispensed?.toFixed(2) || '0.00'} L</td>
                  <td>KES {(reading.salesValue || 0).toFixed(2)}</td>
                  <td>
                    <Badge variant={reading.electricMeter > 0 ? "success" : "warning"}>
                      {reading.electricMeter > 0 ? "Recorded" : "Missing"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        {pumpReadings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No pump readings recorded</p>
          </div>
        )}
      </Card>

      {/* Tank Readings Summary */}
      <Card title="Tank Readings Summary" className="p-6">
        <Table>
          <thead>
            <tr>
              <th>Tank</th>
              <th>START Dip</th>
              <th>END Dip</th>
              <th>Volume Change</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tankReadings.map((reading, index) => {
              const startReading = shiftData.dipReadings.find(dr => dr.tankId === reading.tankId);
              const volumeChange = startReading ? reading.volume - startReading.volume : 0;
              
              return (
                <tr key={index}>
                  <td className="font-medium">{getTankName(reading.tankId)}</td>
                  <td>{startReading?.dipValue?.toFixed(2) || '0.00'} m</td>
                  <td>{reading.dipValue?.toFixed(2) || '0.00'} m</td>
                  <td className={volumeChange < 0 ? 'text-red-600' : 'text-green-600'}>
                    {volumeChange.toFixed(2)} L
                  </td>
                  <td>
                    <Badge variant={reading.dipValue > 0 ? "success" : "warning"}>
                      {reading.dipValue > 0 ? "Recorded" : "Missing"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        {tankReadings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Fuel className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No tank readings recorded</p>
          </div>
        )}
      </Card>

      {/* Collections Summary */}
      <Card title="Collections Summary" className="p-6">
        <Table>
          <thead>
            <tr>
              <th>Island</th>
              <th>Attendant</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {islandCollections.map((collection, index) => {
              const assignment = shiftIslandAttedant.find(a => a.islandId === collection.islandId);
              const expected = collection.expectedAmount || 0;
              const actual = closingCalculations.calculateTotalCollected(collection);
              const variance = actual - expected;
              const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
              const varianceInfo = getVarianceStatus(variance, variancePercent);

              return (
                <tr key={index}>
                  <td className="font-medium">{getIslandName(collection.islandId)}</td>
                  <td>
                    {assignment ? 
                      `${assignment.attendant.firstName} ${assignment.attendant.lastName}` : 
                      'N/A'
                    }
                  </td>
                  <td>KES {expected.toFixed(2)}</td>
                  <td>KES {actual.toFixed(2)}</td>
                  <td className={
                    varianceInfo.color === 'green' ? 'text-green-600' :
                    varianceInfo.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                  }>
                    KES {variance.toFixed(2)} ({variancePercent.toFixed(2)}%)
                  </td>
                  <td>
                    <Badge variant={actual > 0 ? "success" : "warning"}>
                      {actual > 0 ? "Recorded" : "Missing"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        {islandCollections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No collections recorded</p>
          </div>
        )}
      </Card>

      {/* Final Summary Card */}
      <Card title="Closing Summary" className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Sales</p>
            <p className="text-2xl font-bold text-green-600">KES {totalSales.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Collections</p>
            <p className="text-2xl font-bold text-blue-600">KES {totalCollections.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Cash Variance</p>
            <p className={`text-xl font-bold ${
              cashVariance.color === 'green' ? 'text-green-600' :
              cashVariance.color === 'orange' ? 'text-orange-600' : 'text-red-600'
            }`}>
              KES {totalVariance.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Fuel Variance</p>
            <p className={`text-xl font-bold ${
              Math.abs(fuelReconciliationVariance) < 10 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {fuelReconciliationVariance.toFixed(2)} L
            </p>
          </div>
        </div>

        {/* Overall Status */}
        <div className="mt-6 p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Overall Closing Status</p>
              <p className="text-sm text-gray-600">
                {pumpReadings.length} pumps • {tankReadings.length} tanks • {islandCollections.length} islands
              </p>
            </div>
            <Badge variant={
              pumpReadings.length > 0 && tankReadings.length > 0 && islandCollections.length > 0 ? 
              "success" : "warning"
            }>
              {pumpReadings.length > 0 && tankReadings.length > 0 && islandCollections.length > 0 ?
                "Ready to Close" : "Incomplete"
              }
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ClosingSummaryStep;