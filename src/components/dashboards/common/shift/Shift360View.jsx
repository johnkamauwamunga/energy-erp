import React, { useState } from 'react';
import { Modal, Table, Badge, Button, Card, Tabs } from '../../../ui';
import { formatDate, formatCurrency, formatDateTime } from '../../../../utils/helpers';
import { useApp } from '../../../../context/AppContext';
import ShiftCloseReconciliation from './ShiftCloseReconcilliation';
import { Droplets, Gauge, Package, Users, BarChart3 } from 'lucide-react';

const Shift360View = ({ shift, onClose }) => {
  const { state } = useApp();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  
  // Safe data access with fallbacks
  const staff = state.staff || {};
  const supervisors = staff.supervisors || [];
  const attendants = staff.attendants || [];
  const serviceStations = state.serviceStations || [];
  const priceLists = state.priceLists || [];
  const warehouses = state.warehouses || [];
  const assets = state.assets || {};
  const tanks = assets.tanks || [];
  const pumps = assets.pumps || [];
  const islands = state.islands || [];
  
  // Find supervisor with safety check
  const supervisor = supervisors.find(s => s.id === shift.supervisorId);
  
  // Find station with safety check
  const station = serviceStations.find(s => s.id === shift.stationId);
  
  // Get price list with safety check
  const priceList = priceLists.find(pl => pl.id === shift.priceListId);
  
  // Get warehouse items for the station with safety checks
  const warehouse = warehouses.find(w => w.stationId === shift.stationId);
  const warehouseItems = warehouse?.nonFuelItems || [];
  
  // Calculate total sales with safety check
  const totalSales = shift.sales?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
  
  // Get unique islands from attendants with safety checks
  const shiftIslands = [...new Set((shift.attendants || []).map(a => a.islandId))].map(islandId => 
    islands.find(i => i.id === islandId)
  ).filter(Boolean);

  // Get opening and closing tank readings with safety checks
  const openingTankReadings = (shift.tankReadings || []).filter(r => r.readingType === 'START');
  const closingTankReadings = (shift.tankReadings || []).filter(r => r.readingType === 'END');
  
  // Get opening and closing pump readings with safety checks
  const openingPumpReadings = (shift.pumpReadings || []).filter(r => r.readingType === 'START');
  const closingPumpReadings = (shift.pumpReadings || []).filter(r => r.readingType === 'END');

  // Calculate fuel sold by tank with safety checks
  const fuelSalesByTank = {};
  (shift.sales || []).forEach(sale => {
    const pump = pumps.find(p => p.id === sale.pumpId);
    if (pump && pump.tankId) {
      if (!fuelSalesByTank[pump.tankId]) {
        fuelSalesByTank[pump.tankId] = 0;
      }
      fuelSalesByTank[pump.tankId] += sale.quantity || 0;
    }
  });

  // Calculate tank variances with safety checks
  const tankVariances = {};
  openingTankReadings.forEach(opening => {
    const closing = closingTankReadings.find(c => c.tankId === opening.tankId);
    const sold = fuelSalesByTank[opening.tankId] || 0;
    
    if (closing) {
      const expectedClosing = (opening.value || 0) - sold;
      tankVariances[opening.tankId] = (closing.value || 0) - expectedClosing;
    }
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={`Shift #${shift.id}`} size="2xl">
      <div className="space-y-6">
        {/* Tabs for different views */}
        <Tabs
          value={selectedTab}
          onChange={setSelectedTab}
          tabs={[
            { value: 'overview', label: 'Overview', icon: BarChart3 },
            { value: 'tanks', label: 'Tank Readings', icon: Droplets },
            { value: 'pumps', label: 'Pump Readings', icon: Gauge },
            { value: 'inventory', label: 'Inventory', icon: Package },
            { value: 'attendants', label: 'Attendants', icon: Users }
          ]}
        />
        
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Shift header info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Shift Date</h3>
                <p className="text-lg font-medium">{formatDate(shift.startTime)}</p>
                <p className="text-sm text-gray-600">
                  {formatDateTime(shift.startTime, 'HH:mm')} - {formatDateTime(shift.endTime, 'HH:mm')}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <Badge 
                  variant={
                    shift.status === 'active' ? 'success' : 
                    shift.status === 'closed' ? 'default' : 'warning'
                  }
                  className="text-lg capitalize"
                >
                  {shift.status}
                </Badge>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Supervisor In Charge</h3>
                <p className="text-lg font-medium">{supervisor?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600">{supervisor?.phone || ''}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Service Station</h3>
                <p className="text-lg font-medium">{station?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600">{station?.location || ''}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Price List</h3>
                <p className="text-lg font-medium">{priceList?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600">Effective: {priceList ? formatDate(priceList.effectiveDate) : 'N/A'}</p>
              </div>
            </div>
            
            {/* Tank Summary */}
            {openingTankReadings.length > 0 && (
              <Card title="Tank Summary">
                <Table
                  columns={[
                    { header: 'Tank', accessor: 'tank' },
                    { header: 'Product', accessor: 'product' },
                    { header: 'Opening (L)', accessor: 'opening' },
                    { header: 'Closing (L)', accessor: 'closing' },
                    { header: 'Sold (L)', accessor: 'sold' },
                    { header: 'Variance (L)', accessor: 'variance' }
                  ]}
                  data={openingTankReadings.map(opening => {
                    const tank = tanks.find(t => t.id === opening.tankId);
                    const closing = closingTankReadings.find(c => c.tankId === opening.tankId);
                    const sold = fuelSalesByTank[opening.tankId] || 0;
                    const variance = tankVariances[opening.tankId] || 0;
                    
                    return {
                      tank: tank?.code || 'Unknown',
                      product: tank?.productType || 'Unknown',
                      opening: (opening.value || 0).toLocaleString(),
                      closing: (closing?.value || 0).toLocaleString(),
                      sold: sold.toLocaleString(),
                      variance: (
                        <span className={variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : 'text-gray-600'}>
                          {variance.toLocaleString()}
                        </span>
                      )
                    };
                  })}
                />
              </Card>
            )}
            
            {/* Sales Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Total Shift Sales</h3>
                <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
              </div>
              
              {shift.collections && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Cash Collected</div>
                    <div className="text-lg font-medium">{formatCurrency(shift.collections.cash || 0)}</div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Credit Collected</div>
                    <div className="text-lg font-medium">{formatCurrency(shift.collections.credit || 0)}</div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Other Collected</div>
                    <div className="text-lg font-medium">{formatCurrency(shift.collections.other || 0)}</div>
                  </div>
                </div>
              )}
            </div>
            
            {shift.status === 'active' && (
              <div className="flex justify-center pt-4">
                <Button 
                  size="lg"
                  onClick={() => setIsReconciliationOpen(true)}
                >
                  Close Shift
                </Button>
              </div>
            )}
          </>
        )}
        
        {/* Tank Readings Tab */}
        {selectedTab === 'tanks' && (
          <Card title="Tank Dip Readings">
            <Table
              columns={[
                { header: 'Tank', accessor: 'tank' },
                { header: 'Product', accessor: 'product' },
                { header: 'Reading Type', accessor: 'type' },
                { header: 'Dip Value (L)', accessor: 'value' },
                { header: 'Temperature (°C)', accessor: 'temperature' },
                { header: 'Recorded By', accessor: 'recordedBy' },
                { header: 'Time', accessor: 'time' }
              ]}
              data={(shift.tankReadings || []).map(reading => {
                const tank = tanks.find(t => t.id === reading.tankId);
                const recordedBy = supervisors.find(s => s.id === reading.recordedById) || 
                                 attendants.find(a => a.id === reading.recordedById);
                
                return {
                  tank: tank?.code || 'Unknown',
                  product: tank?.productType || 'Unknown',
                  type: (
                    <Badge variant={reading.readingType === 'START' ? 'default' : 'success'}>
                      {reading.readingType}
                    </Badge>
                  ),
                  value: (reading.value || 0).toLocaleString(),
                  temperature: reading.temperature || 'N/A',
                  recordedBy: recordedBy?.name || 'Unknown',
                  time: formatDateTime(reading.timestamp || (reading.readingType === 'START' ? shift.startTime : shift.endTime))
                };
              })}
            />
          </Card>
        )}
        
        {/* Pump Readings Tab */}
        {selectedTab === 'pumps' && (
          <Card title="Pump Meter Readings">
            <Table
              columns={[
                { header: 'Pump', accessor: 'pump' },
                { header: 'Meter Type', accessor: 'type' },
                { header: 'Reading Type', accessor: 'readingType' },
                { header: 'Value', accessor: 'value' },
                { header: 'Recorded By', accessor: 'recordedBy' }
              ]}
              data={(shift.pumpReadings || []).map(reading => {
                const pump = pumps.find(p => p.id === reading.pumpId);
                const recordedBy = supervisors.find(s => s.id === reading.recordedById) || 
                                 attendants.find(a => a.id === reading.recordedById);
                
                return {
                  pump: pump?.code || 'Unknown',
                  type: (
                    <Badge variant={
                      reading.meterType === 'ELECTRIC' ? 'primary' : 
                      reading.meterType === 'CASH' ? 'success' : 'default'
                    }>
                      {reading.meterType}
                    </Badge>
                  ),
                  readingType: (
                    <Badge variant={reading.readingType === 'START' ? 'default' : 'success'}>
                      {reading.readingType}
                    </Badge>
                  ),
                  value: (reading.value || 0).toLocaleString(),
                  recordedBy: recordedBy?.name || 'Unknown'
                };
              })}
            />
          </Card>
        )}
        
        {/* Inventory Tab */}
        {selectedTab === 'inventory' && shift.nonFuelStocks?.length > 0 && (
          <Card title="Non-Fuel Inventory">
            <Table
              columns={[
                { header: 'Product', accessor: 'product' },
                { header: 'Island', accessor: 'island' },
                { header: 'Opening Stock', accessor: 'opening' },
                { header: 'Closing Stock', accessor: 'closing' },
                { header: 'Sold', accessor: 'sold' },
                { header: 'Variance', accessor: 'variance' }
              ]}
              data={(shift.nonFuelStocks || []).map(stock => {
                const product = warehouseItems.find(i => i.itemId === stock.productId);
                const island = islands.find(i => i.id === stock.islandId);
                const variance = (stock.systemSoldQty || 0) - (stock.soldQuantity || 0);
                
                return {
                  product: product?.name || stock.productId,
                  island: island?.name || 'Unknown',
                  opening: stock.openingStock || 0,
                  closing: stock.closingStock || 0,
                  sold: stock.soldQuantity || 0,
                  variance: (
                    <span className={variance !== 0 ? 'text-red-600' : 'text-green-600'}>
                      {variance}
                    </span>
                  )
                };
              })}
            />
          </Card>
        )}
        
        {/* Attendants Tab */}
        {selectedTab === 'attendants' && shift.attendants?.length > 0 && (
          <Card title="Attendant Assignments">
            <Table
              columns={[
                { header: 'Name', accessor: 'name' },
                { header: 'Island', accessor: 'island' },
                { header: 'Posting', accessor: 'posting' },
                { header: 'Total Sales', accessor: 'sales' }
              ]}
              data={(shift.attendants || []).map(assignment => {
                // Handle both object and string ID formats
                const attendantId = typeof assignment === 'object' ? assignment.id : assignment;
                const islandId = typeof assignment === 'object' ? assignment.islandId : null;
                
                const attendant = attendants.find(a => a.id === attendantId);
                const island = islands.find(i => i.id === islandId);
                
                return {
                  name: attendant?.name || 'Unknown',
                  island: island?.name || 'Unknown',
                  posting: assignment.posting || 'N/A',
                  sales: formatCurrency(assignment.totalSales || 0)
                };
              })}
            />
          </Card>
        )}
      </div>
      
      {isReconciliationOpen && (
        <ShiftCloseReconciliation 
          shift={shift}
          onClose={() => {
            setIsReconciliationOpen(false);
            onClose(); // Also close the 360 view
          }}
        />
      )}
    </Modal>
  );
};

export default Shift360View;