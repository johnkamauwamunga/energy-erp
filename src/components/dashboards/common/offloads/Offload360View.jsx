import React from 'react';
import { Modal, Table, Badge, Button, Card } from '../../../ui';
import { formatDate } from '../../../../utils/helpers';
import { useApp } from '../../../../context/AppContext';

const Offload360View = ({ offload, onClose }) => {
  const { state } = useApp();
  
  // Find tank
  const tank = state.assets.tanks.find(t => t.id === offload.tankId);
  
  // Find energy company
  const energyCompany = state.suppliers.find(s => s.id === offload.energyCompanyId);
  
  // Get pumps connected to this tank
  const tankPumps = state.assets.pumps.filter(pump => pump.tankId === offload.tankId);
  
  // Calculate sales for each pump during offload
  const pumpSales = tankPumps.map(pump => {
    const before = offload.pumpsBefore[pump.id] || {};
    const after = offload.pumpsAfter[pump.id] || {};
    
    const electricSales = (after.electric || 0) - (before.electric || 0);
    const cashSales = (after.cash || 0) - (before.cash || 0);
    const manualSales = (after.manual || 0) - (before.manual || 0);
    const totalSales = electricSales + cashSales + manualSales;
    
    return {
      pump,
      before,
      after,
      electricSales,
      cashSales,
      manualSales,
      totalSales
    };
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={`Offload #${offload.deliveryNoteNumber}`} size="2xl">
      <div className="space-y-6">
        {/* Offload header info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Offload Date</h3>
            <p className="text-lg font-medium">{formatDate(offload.startTime)}</p>
            <p className="text-sm text-gray-600">
              {formatDate(offload.startTime, 'HH:mm')} - {formatDate(offload.endTime, 'HH:mm')}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Badge 
              variant="success"
              className="text-lg"
            >
              Completed
            </Badge>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Driver & Vehicle</h3>
            <p className="text-lg font-medium">{offload.driverName}</p>
            <p className="text-sm text-gray-600">{offload.vehiclePlate}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-500">Tank Information</h3>
            <p className="text-lg font-medium">{tank?.name || 'N/A'} ({tank?.fuelType || 'N/A'})</p>
            <p className="text-sm text-blue-600">
              Dip: {offload.dipBefore}{tank?.unit || ''} → {offload.dipAfter}{tank?.unit || ''}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-500">Energy Company</h3>
            <p className="text-lg font-medium">{energyCompany?.name || 'N/A'}</p>
            <p className="text-sm text-green-600">Delivery Note: {offload.deliveryNoteNumber}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-500">Expected Volume</h3>
            <p className="text-2xl font-bold">{offload.expectedVolume}L</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-500">Actual Volume</h3>
            <p className="text-2xl font-bold">{offload.actualVolume}L</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-500">Variance</h3>
            <p className="text-2xl font-bold">{(offload.actualVolume - offload.expectedVolume).toFixed(2)}L</p>
          </div>
        </div>
        
        {/* Pump Readings Before */}
        <Card title="Pump Readings Before Offload">
          <Table
            columns={[
              { header: 'Pump', accessor: 'pump' },
              { header: 'Electric Meter', accessor: 'electric' },
              { header: 'Cash Meter', accessor: 'cash' },
              { header: 'Manual Meter', accessor: 'manual' }
            ]}
            data={pumpSales.map(item => ({
              pump: item.pump.code,
              electric: item.before.electric || 0,
              cash: item.before.cash || 0,
              manual: item.before.manual || 0
            }))}
          />
        </Card>
        
        {/* Pump Readings After */}
        <Card title="Pump Readings After Offload">
          <Table
            columns={[
              { header: 'Pump', accessor: 'pump' },
              { header: 'Electric Meter', accessor: 'electric' },
              { header: 'Cash Meter', accessor: 'cash' },
              { header: 'Manual Meter', accessor: 'manual' },
              { header: 'Sales During', accessor: 'sales' }
            ]}
            data={pumpSales.map(item => ({
              pump: item.pump.code,
              electric: item.after.electric || 0,
              cash: item.after.cash || 0,
              manual: item.after.manual || 0,
              sales: `${item.totalSales.toFixed(2)}L`
            }))}
          />
        </Card>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Total Sales During Offload</h3>
            <p className="text-2xl font-bold text-blue-700">{offload.salesDuringOffload.toFixed(2)}L</p>
          </div>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Offload360View;