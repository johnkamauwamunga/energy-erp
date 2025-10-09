import React,{useState, useEffect} from 'react';
import { Card, Table, Badge, Alert, Progress } from '../../../ui';
import { CheckCircle, FileText, DollarSign, Zap, Fuel, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { closingCalculations } from './dummyDataForClosing';
import {connectedAssetService} from '../../../../services/connectedAssetsService/connectedAssetsService'


const ClosingSummaryStep = ({ shiftData, closingData }) => {
  const { shiftIslandAttedant } = shiftData;
  const { pumpReadings, tankReadings, islandCollections } = closingData;
  const [assetsData, setAssetsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
    useEffect(() => {
      const fetchConnectedAssets = async () => {
        const currentShiftId = 'f8df7044-ede7-4941-a311-27b4f03b2895';
        
        setLoading(true);
        setError(null);
  
        try {
          console.log('🔄 Fetching connected assets for shift:', currentShiftId);
          
          const result = await connectedAssetService.getShiftAssetsStructure(currentShiftId);
          
          console.log('✅ Connected assets for shift:', result);
          
          // Validate the response structure
          if (!result) {
            throw new Error('No data received from server');
          }
  
          if (result.success === false) {
            throw new Error(result.message || 'Failed to fetch assets');
          }
  
          // Handle nested data structure (success: true, data: {...})
          const data = result.data || result;
          
          if (!data) {
            throw new Error('Invalid data structure received');
          }
  
          setAssetsData(data);
          
          // Log specific parts for debugging
          console.log('📊 Shift Summary:', data.summary);
          console.log('🏝️ Islands:', data.islands?.length);
          console.log('⛽ Pumps:', data.pumps?.length || data.islands?.flatMap(i => i.pumps).length);
          console.log('🛢️ Tanks:', data.tanks?.length);
          console.log('👥 Attendants:', data.attendants?.length);
  
        } catch (err) {
          console.error('❌ Failed to get assets:', err);
          setError(err.message || 'An unexpected error occurred');
          
          // You can also show a user-friendly message
          // setError('Unable to load shift assets. Please try again.');
        } finally {
          setLoading(false);
        }
      };
  
      fetchConnectedAssets();
    }, []); // Empty dependency array means this runs once on mount
  

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
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant="success" className="text-sm" size="sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <div>
            <p className="font-medium">Ready to Close Shift</p>
            <p>Review all closing data before finalizing.</p>
          </div>
        </div>
      </Alert>

      {/* Compact Key Metrics */}
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-xs">Sales</span>
          </div>
          <p className="text-lg font-bold text-blue-600">
            KES {totalSales.toFixed(0)}
          </p>
          <p className="text-xs text-gray-600">{totalFuelDispensed.toFixed(0)}L</p>
        </div>

        <div className="bg-green-50 p-3 rounded border border-green-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3 h-3 text-green-600" />
            <span className="font-semibold text-xs">Collections</span>
          </div>
          <p className="text-lg font-bold text-green-600">
            KES {totalCollections.toFixed(0)}
          </p>
          <p className="text-xs text-gray-600">{islandCollections.length} islands</p>
        </div>

        <div className="bg-orange-50 p-3 rounded border border-orange-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {cashVariance.status === 'exact' && <CheckCircle className="w-3 h-3 text-green-600" />}
            {cashVariance.status === 'over' && <TrendingUp className="w-3 h-3 text-orange-600" />}
            {cashVariance.status === 'under' && <TrendingDown className="w-3 h-3 text-red-600" />}
            <span className="font-semibold text-xs">Cash Var</span>
          </div>
          <p className={`text-lg font-bold ${
            cashVariance.color === 'green' ? 'text-green-600' :
            cashVariance.color === 'orange' ? 'text-orange-600' : 'text-red-600'
          }`}>
            KES {totalVariance.toFixed(0)}
          </p>
          <p className="text-xs text-gray-600">{variancePercentage.toFixed(1)}%</p>
        </div>

        <div className="bg-purple-50 p-3 rounded border border-purple-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Fuel className="w-3 h-3 text-purple-600" />
            <span className="font-semibold text-xs">Fuel Var</span>
          </div>
          <p className={`text-base font-bold ${
            Math.abs(fuelReconciliationVariance) < 10 ? 'text-green-600' : 'text-orange-600'
          }`}>
            {fuelReconciliationVariance.toFixed(0)}L
          </p>
          <p className="text-xs text-gray-600">Recon</p>
        </div>
      </div>

      {/* Compact Pump Sales Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Pump Sales ({pumpReadings.length})
        </h3>
        <div className="overflow-x-auto">
          <Table size="sm">
            <thead>
              <tr>
                <th className="text-xs">Pump</th>
                <th className="text-xs">Island</th>
                <th className="text-xs">Liters</th>
                <th className="text-xs">Sales</th>
                <th className="text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {pumpReadings.map((reading, index) => {
                const pump = shiftData.meterReadings.find(mr => mr.pumpId === reading.pumpId);
                const islandId = pump?.pump?.islandId;
                
                return (
                  <tr key={index}>
                    <td className="font-medium truncate max-w-16">{getPumpName(reading.pumpId)}</td>
                    <td className="truncate max-w-16">{islandId ? getIslandName(islandId) : 'N/A'}</td>
                    <td>{(reading.litersDispensed || 0).toFixed(0)}L</td>
                    <td>KES {(reading.salesValue || 0).toFixed(0)}</td>
                    <td>
                      <Badge variant={reading.electricMeter > 0 ? "success" : "warning"} size="sm">
                        {reading.electricMeter > 0 ? "✓" : "⋯"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        
        {pumpReadings.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">
            <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No pump readings</p>
          </div>
        )}
      </Card>

      {/* Compact Tank Readings Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
          <Fuel className="w-3 h-3" />
          Tank Readings ({tankReadings.length})
        </h3>
        <div className="overflow-x-auto">
          <Table size="sm">
            <thead>
              <tr>
                <th className="text-xs">Tank</th>
                <th className="text-xs">START</th>
                <th className="text-xs">END</th>
                <th className="text-xs">Change</th>
                <th className="text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {tankReadings.map((reading, index) => {
                const startReading = shiftData.dipReadings.find(dr => dr.tankId === reading.tankId);
                const volumeChange = startReading ? reading.volume - startReading.volume : 0;
                
                return (
                  <tr key={index}>
                    <td className="font-medium truncate max-w-16">{getTankName(reading.tankId)}</td>
                    <td>{(startReading?.dipValue || 0).toFixed(1)}m</td>
                    <td>{(reading.dipValue || 0).toFixed(1)}m</td>
                    <td className={volumeChange < 0 ? 'text-red-600' : 'text-green-600'}>
                      {volumeChange.toFixed(0)}L
                    </td>
                    <td>
                      <Badge variant={reading.dipValue > 0 ? "success" : "warning"} size="sm">
                        {reading.dipValue > 0 ? "✓" : "⋯"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        
        {tankReadings.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">
            <Fuel className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No tank readings</p>
          </div>
        )}
      </Card>

      {/* Compact Collections Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Collections ({islandCollections.length})
        </h3>
        <div className="overflow-x-auto">
          <Table size="sm">
            <thead>
              <tr>
                <th className="text-xs">Island</th>
                <th className="text-xs">Expected</th>
                <th className="text-xs">Actual</th>
                <th className="text-xs">Variance</th>
                <th className="text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {islandCollections.map((collection, index) => {
                const expected = collection.expectedAmount || 0;
                const actual = closingCalculations.calculateTotalCollected(collection);
                const variance = actual - expected;
                const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
                const varianceInfo = getVarianceStatus(variance, variancePercent);

                return (
                  <tr key={index}>
                    <td className="font-medium truncate max-w-16">{getIslandName(collection.islandId)}</td>
                    <td>KES {expected.toFixed(0)}</td>
                    <td>KES {actual.toFixed(0)}</td>
                    <td className={
                      varianceInfo.color === 'green' ? 'text-green-600' :
                      varianceInfo.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                    }>
                      KES {variance.toFixed(0)}
                    </td>
                    <td>
                      <Badge variant={actual > 0 ? "success" : "warning"} size="sm">
                        {actual > 0 ? "✓" : "⋯"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        
        {islandCollections.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No collections</p>
          </div>
        )}
      </Card>

      {/* Compact Final Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <p className="text-gray-600 mb-1">Sales</p>
            <p className="text-lg font-bold text-green-600">KES {totalSales.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Collections</p>
            <p className="text-lg font-bold text-blue-600">KES {totalCollections.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Cash Var</p>
            <p className={`text-base font-bold ${
              cashVariance.color === 'green' ? 'text-green-600' :
              cashVariance.color === 'orange' ? 'text-orange-600' : 'text-red-600'
            }`}>
              KES {totalVariance.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Fuel Var</p>
            <p className={`text-base font-bold ${
              Math.abs(fuelReconciliationVariance) < 10 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {fuelReconciliationVariance.toFixed(0)}L
            </p>
          </div>
        </div>

        {/* Compact Overall Status */}
        <div className="mt-4 p-3 bg-white rounded border text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Overall Status</p>
              <p className="text-gray-600">
                {pumpReadings.length}P • {tankReadings.length}T • {islandCollections.length}I
              </p>
            </div>
            <Badge variant={
              pumpReadings.length > 0 && tankReadings.length > 0 && islandCollections.length > 0 ? 
              "success" : "warning"
            } size="sm">
              {pumpReadings.length > 0 && tankReadings.length > 0 && islandCollections.length > 0 ?
                "Ready" : "Incomplete"
              }
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClosingSummaryStep;