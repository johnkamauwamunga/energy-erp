import React from 'react';
import { Card, Alert, Badge, Table } from '../../../ui';
import { CheckCircle, Fuel, Zap, DollarSign, AlertTriangle } from 'lucide-react';

const OffloadSummaryStep = ({ purchaseData, offloadData }) => {
  // Safe data access with defaults
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
      return { status: 'complete', label: 'Complete', variant: 'success' };
    } else if (hasBeforeReadings && !hasAfterReadings) {
      return { status: 'in-progress', label: 'Before Only', variant: 'warning' };
    } else {
      return { status: 'incomplete', label: 'Incomplete', variant: 'error' };
    }
  };

  return (
    <div className="space-y-6">
      <Alert variant={totalVariance === 0 ? "success" : "warning"}>
        <div className="flex items-start gap-3">
          {totalVariance === 0 ? (
            <CheckCircle className="w-5 h-5 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 mt-0.5" />
          )}
          <div>
            <h4 className="font-semibold mb-1">
              {totalVariance === 0 ? 'Offload Complete' : 'Variance Detected'}
            </h4>
            <p className="text-sm">
              {totalVariance === 0 
                ? 'All fuel has been offloaded according to plan with no variances.'
                : `There is a variance of ${totalVariance}L (${variancePercentage.toFixed(2)}%) between expected and actual volumes.`
              }
            </p>
          </div>
        </div>
      </Alert>

      {/* Volume Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Expected</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalExpectedVolume}L</p>
          <p className="text-sm text-gray-600">Total ordered volume</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold">Actual</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalActualVolume}L</p>
          <p className="text-sm text-gray-600">Offloaded volume</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-semibold">Variance</span>
          </div>
          <p className={`text-2xl font-bold ${
            totalVariance === 0 ? 'text-gray-600' : 
            totalVariance > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {totalVariance}L
          </p>
          <p className="text-sm text-gray-600">
            {variancePercentage.toFixed(2)}% {totalVariance > 0 ? 'over' : 'under'}
          </p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <span className="font-semibold">Sales</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{totalSalesDuringOffload}L</p>
          <p className="text-sm text-gray-600">During offload</p>
        </Card>
      </div>

      {/* Tank Breakdown */}
      {tankOffloads.length > 0 ? (
        <Card title="Tank Offload Breakdown" className="p-6">
          <Table>
            <thead>
              <tr>
                <th>Tank</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Sales During</th>
              </tr>
            </thead>
            <tbody>
              {tankOffloads.map(tank => {
                const status = getTankStatus(tank);
                const tankVariance = (tank.actualVolume || 0) - (tank.expectedVolume || 0);
                const tankSales = pumpSales
                  .filter(sale => sale.tankId === tank.tankId)
                  .reduce((sum, sale) => sum + (sale.litersSold || 0), 0);
                
                return (
                  <tr key={tank.tankId}>
                    <td className="font-medium">{tank.tankName}</td>
                    <td>{tank.expectedVolume || 0}L</td>
                    <td>{tank.actualVolume || 0}L</td>
                    <td>
                      <span className={
                        tankVariance === 0 ? 'text-gray-600' :
                        tankVariance > 0 ? 'text-green-600' : 'text-red-600'
                      }>
                        {tankVariance}L
                      </span>
                    </td>
                    <td>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td>{tankSales}L</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card title="Tank Offload Breakdown" className="p-6">
          <div className="text-center py-8 text-gray-500">
            No tank offloads recorded yet.
          </div>
        </Card>
      )}

      {/* Sales During Offload */}
      {totalSalesDuringOffload > 0 && (
        <Card title="Sales During Offload" className="p-6">
          <Table>
            <thead>
              <tr>
                <th>Pump</th>
                <th>Tank</th>
                <th>Liters Sold</th>
                <th>Sales Value</th>
              </tr>
            </thead>
            <tbody>
              {pumpSales.map((sale, index) => (
                <tr key={index}>
                  <td className="font-medium">{sale.pumpName}</td>
                  <td>
                    {tankOffloads.find(t => t.tankId === sale.tankId)?.tankName || 'Unknown Tank'}
                  </td>
                  <td>{sale.litersSold || 0}L</td>
                  <td>KES {sale.salesValue || 0}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Final Notes */}
      <Card title="Offload Notes" className="p-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Additional notes:</p>
          <p className="text-gray-800">{safeOffloadData.notes || 'No notes provided'}</p>
        </div>
      </Card>
    </div>
  );
};

export default OffloadSummaryStep;