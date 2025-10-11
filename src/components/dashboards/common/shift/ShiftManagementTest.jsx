import React, { useState } from 'react';
import useShiftData, { useOpenShiftMonitor, useCompanyShiftData } from './hook/useShiftData';
import { useApp } from '../../../../context/AppContext';

const ShiftManagementTest = () => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const stationId = currentUser?.stationId;
  const userRole = currentUser?.role || 'station';

  // State for filters and view mode
  const [viewMode, setViewMode] = useState('station'); // 'station' | 'company' | 'open'
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    productId: '',
    stationId: ''
  });

  // Hook instances for different views
  const stationData = useShiftData(stationId, filters, userRole);
  const openShiftData = useOpenShiftMonitor(stationId, userRole);
  const companyData = useCompanyShiftData(filters);

  // Determine which data to display
  const displayData = viewMode === 'company' ? companyData : 
                    viewMode === 'open' ? openShiftData : 
                    stationData;

  // Helper function for reading type colors
  const getReadingTypeColor = (readingType) => {
    switch (readingType) {
      case 'START': return '#28a745'; // Green
      case 'END': return '#dc3545';   // Red
      default: return '#6c757d';      // Gray
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (displayData.loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Shift Data...</h2>
        <p>Please wait while we fetch the latest shift information.</p>
      </div>
    );
  }

  if (displayData.error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error Loading Data</h2>
        <p>{displayData.error}</p>
        <button onClick={displayData.refetch} style={{ padding: '10px 20px', marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header and Controls */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #ddd', paddingBottom: '20px' }}>
        <h1>🚀 Shift Management Test Dashboard</h1>
        
        {/* View Mode Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>View Mode:</label>
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            style={{ padding: '8px', marginRight: '20px' }}
          >
            <option value="station">Station View</option>
            <option value="company">Company View</option>
            <option value="open">Open Shift Monitor</option>
          </select>

          <button onClick={displayData.refetch} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Refresh Data
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{ padding: '5px' }}
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>

          <input 
            type="date" 
            value={filters.startDate} 
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            placeholder="Start Date"
            style={{ padding: '5px' }}
          />

          <input 
            type="date" 
            value={filters.endDate} 
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            placeholder="End Date"
            style={{ padding: '5px' }}
          />

          {viewMode === 'company' && (
            <select 
              value={filters.stationId} 
              onChange={(e) => setFilters(prev => ({ ...prev, stationId: e.target.value }))}
              style={{ padding: '5px' }}
            >
              <option value="">All Stations</option>
              {companyData.allStations?.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Open Shift Alert */}
      {displayData.hasOpenShift && (
        <div style={{ 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb', 
          color: '#155724', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>⚠️ Open Shift Detected</h3>
          <p>There is currently an open shift that needs attention.</p>
        </div>
      )}

      {/* Summary Statistics */}
      {displayData.summaryStats && (
        <div style={{ marginBottom: '30px' }}>
          <h2>📊 Summary Statistics</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
              <h3 style={{ color: '#007bff', margin: '0' }}>{displayData.summaryStats.totalShifts}</h3>
              <p style={{ margin: '5px 0 0 0' }}>Total Shifts</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
              <h3 style={{ color: '#28a745', margin: '0' }}>{displayData.summaryStats.activeShifts}</h3>
              <p style={{ margin: '5px 0 0 0' }}>Active Shifts</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
              <h3 style={{ color: '#6c757d', margin: '0' }}>{displayData.summaryStats.totalRevenue.toLocaleString()}</h3>
              <p style={{ margin: '5px 0 0 0' }}>Total Revenue</p>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
              <h3 style={{ color: '#17a2b8', margin: '0' }}>{displayData.summaryStats.totalFuelVolume.toLocaleString()}</h3>
              <p style={{ margin: '5px 0 0 0' }}>Total Volume (L)</p>
            </div>
          </div>
        </div>
      )}

      {/* Company Overview */}
      {viewMode === 'company' && displayData.companyOverview && (
        <div style={{ marginBottom: '30px' }}>
          <h2>🏢 Company Overview</h2>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <p><strong>Total Stations:</strong> {displayData.companyOverview.totalStations}</p>
            <p><strong>Total Shifts:</strong> {displayData.companyOverview.totalShifts}</p>
            <p><strong>Open Shifts:</strong> {displayData.companyOverview.openShifts}</p>
            
            <h4>Station Performance:</h4>
            {displayData.companyOverview.stations.map(station => (
              <div key={station.stationId} style={{ 
                border: '1px solid #eee', 
                margin: '10px 0', 
                padding: '10px',
                borderRadius: '3px'
              }}>
                <h5>{station.stationName}</h5>
                <p>Location: {station.location} | Shifts: {station.totalShifts} | Revenue: {station.totalRevenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Shift Data */}
      {viewMode === 'open' && displayData.openShift && (
        <div style={{ marginBottom: '30px' }}>
          <h2>🟢 Open Shift Details</h2>
          <div style={{ border: '1px solid #28a745', padding: '15px', borderRadius: '5px' }}>
            <h3>Shift #{displayData.openShift.shiftNumber}</h3>
            <p><strong>Started:</strong> {formatDate(displayData.openShift.startTime)}</p>
            <p><strong>Supervisor:</strong> {displayData.openShift.supervisor?.firstName} {displayData.openShift.supervisor?.lastName}</p>
            
            {/* Start Meter Readings */}
            <div style={{ marginTop: '20px' }}>
              <h4>Start Meter Readings:</h4>
              {displayData.openShift.startMeterReadings?.length > 0 ? (
                displayData.openShift.startMeterReadings.map(reading => (
                  <div key={reading.id} style={{ 
                    borderLeft: '4px solid #28a745',
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <p><strong>Pump:</strong> {reading.pumpName}</p>
                    <p><strong>Electric Meter:</strong> {reading.electricMeter}</p>
                    <p><strong>Product:</strong> {reading.product?.name}</p>
                    <p><strong>Recorded:</strong> {formatDate(reading.recordedAt)} by {reading.recordedBy?.firstName}</p>
                  </div>
                ))
              ) : (
                <p>No start meter readings available</p>
              )}
            </div>

            {/* Start Dip Readings */}
            <div style={{ marginTop: '20px' }}>
              <h4>Start Dip Readings:</h4>
              {displayData.openShift.startDipReadings?.length > 0 ? (
                displayData.openShift.startDipReadings.map(reading => (
                  <div key={reading.id} style={{ 
                    borderLeft: '4px solid #28a745',
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <p><strong>Tank:</strong> {reading.tankName}</p>
                    <p><strong>Dip Value:</strong> {reading.dipValue}</p>
                    <p><strong>Volume:</strong> {reading.volume} L</p>
                    <p><strong>Product:</strong> {reading.product?.name}</p>
                    <p><strong>Recorded:</strong> {formatDate(reading.recordedAt)} by {reading.recordedBy?.firstName}</p>
                  </div>
                ))
              ) : (
                <p>No start dip readings available</p>
              )}
            </div>

            {/* Island Assignments */}
            <div style={{ marginTop: '20px' }}>
              <h4>Island Assignments:</h4>
              {displayData.openShift.islandAssignments?.length > 0 ? (
                displayData.openShift.islandAssignments.map(assignment => (
                  <div key={assignment.id} style={{ 
                    border: '1px solid #ddd',
                    padding: '10px',
                    margin: '5px 0',
                    borderRadius: '3px'
                  }}>
                    <p><strong>Island:</strong> {assignment.islandCode}</p>
                    <p><strong>Attendant:</strong> {assignment.attendantName}</p>
                    <p><strong>Assigned:</strong> {formatDate(assignment.assignedAt)}</p>
                  </div>
                ))
              ) : (
                <p>No island assignments available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Sales */}
      {displayData.productSales && displayData.productSales.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>📈 Product Sales Analysis</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {displayData.productSales.map(product => (
              <div key={product.productId} style={{ 
                border: '1px solid #ddd', 
                padding: '15px', 
                borderRadius: '5px',
                borderLeft: `4px solid ${product.colorCode || '#007bff'}`
              }}>
                <h4 style={{ color: product.colorCode || '#007bff', margin: '0 0 10px 0' }}>
                  {product.productName}
                </h4>
                <p><strong>Total Volume:</strong> {product.totalVolume.toLocaleString()} {product.unit}</p>
                <p><strong>Total Revenue:</strong> {product.totalRevenue.toLocaleString()}</p>
                <p><strong>Average Price:</strong> {(product.totalRevenue / product.totalVolume).toFixed(2)} per {product.unit}</p>
                <p><strong>Stations:</strong> {product.stationCount} | <strong>Tanks:</strong> {product.tankCount} | <strong>Pumps:</strong> {product.pumpCount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shift Operations */}
      {displayData.shiftOperations && displayData.shiftOperations.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>⚙️ Shift Operations</h2>
          {displayData.shiftOperations.map(shift => (
            <div key={shift.id} style={{ 
              border: '1px solid #ddd', 
              margin: '15px 0', 
              padding: '15px', 
              borderRadius: '5px'
            }}>
              <h3>Shift #{shift.shiftNumber} - {shift.status}</h3>
              <p><strong>Station:</strong> {shift.station?.name} | <strong>Supervisor:</strong> {shift.supervisor?.firstName} {shift.supervisor?.lastName}</p>
              <p><strong>Time:</strong> {formatDate(shift.startTime)} to {formatDate(shift.endTime)}</p>

              {/* Pump Operations */}
              <div style={{ marginTop: '15px' }}>
                <h4>Pump Operations:</h4>
                {Object.values(shift.pumpOperations).length > 0 ? (
                  Object.values(shift.pumpOperations).map(pump => (
                    <div key={pump.pumpId} style={{ 
                      border: '1px solid #eee',
                      padding: '10px',
                      margin: '5px 0',
                      borderRadius: '3px'
                    }}>
                      <p><strong>Pump:</strong> {pump.pumpName}</p>
                      <p><strong>Readings:</strong> Start: {pump.startReading} → End: {pump.endReading}</p>
                      <p><strong>Total Volume:</strong> {pump.totalVolume} L</p>
                      <p><strong>Product:</strong> {pump.product?.name}</p>
                    </div>
                  ))
                ) : (
                  <p>No pump operations data</p>
                )}
              </div>

              {/* Tank Operations */}
              <div style={{ marginTop: '15px' }}>
                <h4>Tank Operations:</h4>
                {Object.values(shift.tankOperations).length > 0 ? (
                  Object.values(shift.tankOperations).map(tank => (
                    <div key={tank.tankId} style={{ 
                      border: '1px solid #eee',
                      padding: '10px',
                      margin: '5px 0',
                      borderRadius: '3px'
                    }}>
                      <p><strong>Tank:</strong> {tank.tankName}</p>
                      <p><strong>Product:</strong> {tank.product?.name}</p>
                      <p><strong>Dip Readings:</strong> Start: {tank.startDip} → End: {tank.endDip}</p>
                      <p><strong>Density:</strong> {tank.density} | <strong>Temperature:</strong> {tank.temperature}°C</p>
                    </div>
                  ))
                ) : (
                  <p>No tank operations data</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw Data for Debugging */}
      <details style={{ marginTop: '30px' }}>
        <summary style={{ cursor: 'pointer', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #ddd' }}>
          🔍 Raw Data (for debugging)
        </summary>
        <pre style={{ 
          fontSize: '12px', 
          overflow: 'auto', 
          backgroundColor: '#f8f9fa', 
          padding: '15px',
          border: '1px solid #ddd',
          marginTop: '0'
        }}>
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </details>

      {/* No Data Message */}
      {!displayData.loading && !displayData.error && displayData.totalCount === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          <h3>No shift data found</h3>
          <p>Try adjusting your filters or check if there are any shifts in the system.</p>
        </div>
      )}
    </div>
  );
};

export default ShiftManagementTest;