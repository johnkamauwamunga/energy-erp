import React from 'react';
import { Card, Alert, Badge, Table } from '../../../ui';
import { CheckCircle, Fuel, Zap, DollarSign, AlertTriangle } from 'lucide-react';

const OffloadSummaryStep = ({ purchaseData, offloadData }) => {
  const safeOffloadData = offloadData || {};
  const tankOffloads = safeOffloadData.tankOffloads || [];
  const pumpSales = safeOffloadData.pumpSales || [];

  const totalExpectedVolume = tankOffloads.reduce((sum, tank) => 
    sum + (tank.expectedVolume || 0), 0
  );
  
  const totalActualVolume = tankOffloads.reduce((sum, tank) => 
    sum + (tank.actualVolume || 0), 0
  );
  
  const totalVariance = totalActualVolume - totalExpectedVolume;
  const variancePercentage = totalExpectedVolume > 0 ? (totalVariance / totalExpectedVolume) * 100 : 0;

  const totalSalesDuringOffload = pumpSales.reduce((sum, sale) => 
    sum + (sale.litersSold || 0), 0
  );

  const getTankStatus = (tank) => {
    const hasBeforeReadings = tank.dipBefore && tank.pumpReadingsBefore && tank.pumpReadingsBefore.length > 0;
    const hasAfterReadings = tank.dipAfter && tank.pumpReadingsAfter && tank.pumpReadingsAfter.length > 0;
    const hasVolume = tank.actualVolume > 0;
    
    if (hasBeforeReadings && hasAfterReadings && hasVolume) {
      return { status: 'complete', label: '✓', variant: 'success' };
    } else if (hasBeforeReadings && !hasAfterReadings) {
      return { status: 'in-progress', label: '⋯', variant: 'warning' };
    } else {
      return { status: 'incomplete', label: '✗', variant: 'error' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant={totalVariance === 0 ? "success" : "warning"} className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          {totalVariance === 0 ? (
            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {totalVariance === 0 ? 'Offload Complete' : 'Variance Detected'}
            </p>
            <p>
              {totalVariance === 0 
                ? 'All fuel offloaded according to plan.'
                : `${totalVariance}L (${variancePercentage.toFixed(1)}%) variance detected.`
              }
            </p>
          </div>
        </div>
      </Alert>

      {/* Compact Volume Summary */}
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Fuel className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-xs">Expected</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{totalExpectedVolume}L</p>
        </div>

        <div className="bg-green-50 p-3 rounded border border-green-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="font-semibold text-xs">Actual</span>
          </div>
          <p className="text-lg font-bold text-green-600">{totalActualVolume}L</p>
        </div>

        <div className="bg-orange-50 p-3 rounded border border-orange-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            <span className="font-semibold text-xs">Variance</span>
          </div>
          <p className={`text-lg font-bold ${
            totalVariance === 0 ? 'text-gray-600' : 
            totalVariance > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {totalVariance}L
          </p>
        </div>

        <div className="bg-purple-50 p-3 rounded border border-purple-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3 h-3 text-purple-600" />
            <span className="font-semibold text-xs">Sales</span>
          </div>
          <p className="text-lg font-bold text-purple-600">{totalSalesDuringOffload}L</p>
        </div>
      </div>

      {/* Compact Tank Breakdown */}
      {tankOffloads.length > 0 ? (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Tank Breakdown</h3>
          <div className="overflow-x-auto">
            <Table size="sm">
              <thead>
                <tr>
                  <th className="text-xs">Tank</th>
                  <th className="text-xs">Expected</th>
                  <th className="text-xs">Actual</th>
                  <th className="text-xs">Var</th>
                  <th className="text-xs">Status</th>
                  <th className="text-xs">Sales</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {tankOffloads.map(tank => {
                  const status = getTankStatus(tank);
                  const tankVariance = (tank.actualVolume || 0) - (tank.expectedVolume || 0);
                  const tankSales = pumpSales
                    .filter(sale => sale.tankId === tank.tankId)
                    .reduce((sum, sale) => sum + (sale.litersSold || 0), 0);
                  
                  return (
                    <tr key={tank.tankId}>
                      <td className="font-medium truncate max-w-20">{tank.tankName}</td>
                      <td>{(tank.expectedVolume || 0).toLocaleString()}L</td>
                      <td>{(tank.actualVolume || 0).toLocaleString()}L</td>
                      <td>
                        <span className={
                          tankVariance === 0 ? 'text-gray-600' :
                          tankVariance > 0 ? 'text-green-600' : 'text-red-600'
                        }>
                          {tankVariance}L
                        </span>
                      </td>
                      <td>
                        <Badge variant={status.variant} size="sm">{status.label}</Badge>
                      </td>
                      <td>{tankSales}L</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="text-center py-4 text-gray-500 text-xs">
            No tank offloads recorded yet.
          </div>
        </Card>
      )}

      {/* Compact Sales During Offload */}
      {totalSalesDuringOffload > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Sales During Offload</h3>
          <div className="overflow-x-auto">
            <Table size="sm">
              <thead>
                <tr>
                  <th className="text-xs">Pump</th>
                  <th className="text-xs">Tank</th>
                  <th className="text-xs">Liters</th>
                  <th className="text-xs">Value</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {pumpSales.map((sale, index) => (
                  <tr key={index}>
                    <td className="font-medium truncate max-w-16">{sale.pumpName}</td>
                    <td className="truncate max-w-16">
                      {tankOffloads.find(t => t.tankId === sale.tankId)?.tankName || 'Unknown'}
                    </td>
                    <td>{(sale.litersSold || 0).toLocaleString()}L</td>
                    <td>KES {(sale.salesValue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Compact Notes */}
      {safeOffloadData.notes && (
        <div className="bg-gray-50 rounded-lg p-3 border text-xs">
          <p className="font-medium text-gray-700 mb-1">Notes</p>
          <p className="text-gray-600">{safeOffloadData.notes}</p>
        </div>
      )}
    </div>
  );
};

export default OffloadSummaryStep;