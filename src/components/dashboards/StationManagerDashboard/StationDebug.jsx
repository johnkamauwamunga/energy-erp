import React, { useEffect, useState } from 'react';
import { shiftService } from '../../../services/shiftService/shiftService';
import { stationService } from '../../../services/stationService/stationService';
import { useApp } from '../../../context/AppContext';

const StationDebug = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [debugData, setDebugData] = useState({
    stationPumps: null,
    stationTanks: null,
    openShift: null,
    currentShift: null,
    previousShift: null,
    allShifts: null,
    shiftDetails: null
  });
  const [activeTab, setActiveTab] = useState('stations');

  const companyId = state?.currentCompany?.id;

  // Load stations
  const loadStations = async () => {
    try {
      const stationsData = await stationService.getCompanyStations();
      const stationsArray = stationsData.stations || stationsData.data || stationsData || [];
      setStations(stationsArray);
      
      if (stationsArray.length > 0 && !selectedStation) {
        setSelectedStation(stationsArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
      setStations([]);
    }
  };

  // Test station pumps with last readings
  const testStationPumps = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing station pumps for station: ${selectedStation}`);
      const result = await shiftService.getStationPumpsWithLastEndReadings(selectedStation);
      console.log('✅ Station pumps result:', result);
      setDebugData(prev => ({ ...prev, stationPumps: result }));
    } catch (error) {
      console.error('❌ Error testing station pumps:', error);
      setError(`Failed to get station pumps: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test station tanks with last readings
  const testStationTanks = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing station tanks for station: ${selectedStation}`);
      const result = await shiftService.getStationTanksWithLastEndReadings(selectedStation);
      console.log('✅ Station tanks result:', result);
      setDebugData(prev => ({ ...prev, stationTanks: result }));
    } catch (error) {
      console.error('❌ Error testing station tanks:', error);
      setError(`Failed to get station tanks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test open shift
  const testOpenShift = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing open shift for station: ${selectedStation}`);
      const result = await shiftService.getOpenShift(selectedStation);
      console.log('✅ Open shift result:', result);
      setDebugData(prev => ({ ...prev, openShift: result }));
      
      if (result?.shift?.id) {
        setSelectedShift(result.shift.id);
      }
    } catch (error) {
      console.error('❌ Error testing open shift:', error);
      setError(`Failed to get open shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test current shift
  const testCurrentShift = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing current shift for station: ${selectedStation}`);
      const result = await shiftService.getCurrentShift(selectedStation);
      console.log('✅ Current shift result:', result);
      setDebugData(prev => ({ ...prev, currentShift: result }));
    } catch (error) {
      console.error('❌ Error testing current shift:', error);
      setError(`Failed to get current shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test previous shift
  const testPreviousShift = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing previous shift for station: ${selectedStation}`);
      const result = await shiftService.getPreviousClosedShift(selectedStation);
      console.log('✅ Previous shift result:', result);
      setDebugData(prev => ({ ...prev, previousShift: result }));
    } catch (error) {
      console.error('❌ Error testing previous shift:', error);
      setError(`Failed to get previous shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test all shifts
  const testAllShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Testing all shifts');
      const result = await shiftService.getAllShifts({ limit: 10 });
      console.log('✅ All shifts result:', result);
      setDebugData(prev => ({ ...prev, allShifts: result }));
    } catch (error) {
      console.error('❌ Error testing all shifts:', error);
      setError(`Failed to get all shifts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test shift details
  const testShiftDetails = async () => {
    if (!selectedShift) {
      setError('Please select a shift first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing shift details for shift: ${selectedShift}`);
      const result = await shiftService.getShiftById(selectedShift);
      console.log('✅ Shift details result:', result);
      setDebugData(prev => ({ ...prev, shiftDetails: result }));
    } catch (error) {
      console.error('❌ Error testing shift details:', error);
      setError(`Failed to get shift details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run all tests for selected station
  const runAllStationTests = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🚀 Running all tests for station: ${selectedStation}`);
      
      const results = await Promise.allSettled([
        shiftService.getStationPumpsWithLastEndReadings(selectedStation),
        shiftService.getStationTanksWithLastEndReadings(selectedStation),
        shiftService.getOpenShift(selectedStation),
        shiftService.getCurrentShift(selectedStation),
        shiftService.getPreviousClosedShift(selectedStation)
      ]);

      const [pumpsResult, tanksResult, openShiftResult, currentShiftResult, previousShiftResult] = results;

      setDebugData({
        stationPumps: pumpsResult.status === 'fulfilled' ? pumpsResult.value : { error: pumpsResult.reason?.message },
        stationTanks: tanksResult.status === 'fulfilled' ? tanksResult.value : { error: tanksResult.reason?.message },
        openShift: openShiftResult.status === 'fulfilled' ? openShiftResult.value : { error: openShiftResult.reason?.message },
        currentShift: currentShiftResult.status === 'fulfilled' ? currentShiftResult.value : { error: currentShiftResult.reason?.message },
        previousShift: previousShiftResult.status === 'fulfilled' ? previousShiftResult.value : { error: previousShiftResult.reason?.message },
        allShifts: debugData.allShifts,
        shiftDetails: debugData.shiftDetails
      });

      // Log results
      results.forEach((result, index) => {
        const testNames = ['Pumps', 'Tanks', 'Open Shift', 'Current Shift', 'Previous Shift'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${testNames[index]} test successful:`, result.value);
        } else {
          console.error(`❌ ${testNames[index]} test failed:`, result.reason);
        }
      });

    } catch (error) {
      console.error('❌ Error running all tests:', error);
      setError(`Failed to run all tests: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load stations on component mount
  useEffect(() => {
    loadStations();
  }, []);

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  // Render pumps data
  const renderPumpsData = () => {
    if (!debugData.stationPumps) return null;

    if (debugData.stationPumps.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.stationPumps.error}</div>;
    }

    const pumps = Array.isArray(debugData.stationPumps) ? debugData.stationPumps : debugData.stationPumps.data || [];

    return (
      <div>
        <h4>Pumps Found: {pumps.length}</h4>
        {pumps.map((item, index) => (
          <div key={item.pump?.id || index} style={{
            padding: '10px',
            margin: '10px 0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              {item.pump?.name} ({item.pump?.stationLabel})
            </div>
            <div>Product: {item.pump?.product?.name || 'No product'}</div>
            <div>Island: {item.pump?.island?.name || 'No island'}</div>
            <div>Connection: {item.pump?.connectionStatus}</div>
            
            {item.lastEndReading ? (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold' }}>Last END Reading:</div>
                <div>Electric Meter: {item.lastEndReading.electricMeter || 'N/A'}</div>
                <div>Manual Meter: {item.lastEndReading.manualMeter || 'N/A'}</div>
                <div>Cash Meter: {item.lastEndReading.cashMeter || 'N/A'}</div>
                <div>Liters: {item.lastEndReading.litersDispensed || 'N/A'}</div>
                <div>Sales: {formatCurrency(item.lastEndReading.salesValue)}</div>
                <div>Recorded: {new Date(item.lastEndReading.recordedAt).toLocaleString()}</div>
              </div>
            ) : (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#c62828' }}>
                No END readings found
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render tanks data
  const renderTanksData = () => {
    if (!debugData.stationTanks) return null;

    if (debugData.stationTanks.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.stationTanks.error}</div>;
    }

    const tanks = Array.isArray(debugData.stationTanks) ? debugData.stationTanks : debugData.stationTanks.data || [];

    return (
      <div>
        <h4>Tanks Found: {tanks.length}</h4>
        {tanks.map((item, index) => (
          <div key={item.tank?.id || index} style={{
            padding: '10px',
            margin: '10px 0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              {item.tank?.name} ({item.tank?.stationLabel})
            </div>
            <div>Capacity: {item.tank?.capacity}L</div>
            <div>Current Volume: {item.tank?.currentVolume}L</div>
            <div>Product: {item.tank?.product?.name || 'No product'}</div>
            <div>Pumps Connected: {item.tank?.pumps?.length || 0}</div>
            
            {item.lastEndReading ? (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold' }}>Last END Reading:</div>
                <div>Dip Value: {item.lastEndReading.dipValue || 'N/A'}</div>
                <div>Volume: {item.lastEndReading.volume || 'N/A'}L</div>
                <div>Temperature: {item.lastEndReading.temperature || 'N/A'}°C</div>
                <div>Water Level: {item.lastEndReading.waterLevel || 'N/A'}</div>
                <div>Recorded: {new Date(item.lastEndReading.recordedAt).toLocaleString()}</div>
              </div>
            ) : (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
                No END readings found
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render shift data
  const renderShiftData = (shiftData, title) => {
    if (!shiftData) return null;

    if (shiftData.error) {
      return <div style={{ color: 'red' }}>Error: {shiftData.error}</div>;
    }

    const shift = shiftData.shift || shiftData;
    
    return (
      <div style={{
        padding: '15px',
        margin: '10px 0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f0f8ff'
      }}>
        <h4>{title}</h4>
        <div><strong>Shift #{shift.shiftNumber}</strong></div>
        <div>Status: <span style={{ 
          color: shift.status === 'OPEN' ? 'green' : 
                 shift.status === 'CLOSED' ? 'blue' : 'orange'
        }}>{shift.status}</span></div>
        <div>Supervisor: {shift.supervisor?.firstName} {shift.supervisor?.lastName}</div>
        <div>Start: {new Date(shift.startTime).toLocaleString()}</div>
        {shift.endTime && <div>End: {new Date(shift.endTime).toLocaleString()}</div>}
        <div>Pump Readings: {shift.pumpMeterReadings?.length || 0}</div>
        <div>Tank Readings: {shift.tankDipReadings?.length || 0}</div>
        <div>Attendants: {shift.shiftIslandAttendant?.length || 0}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading debug data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Shift Service Debug Dashboard</h1>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ⚠️ Error: {error}
        </div>
      )}

      {/* Station Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select Station:
        </label>
        <select 
          value={selectedStation} 
          onChange={(e) => setSelectedStation(e.target.value)}
          style={{ 
            padding: '8px', 
            marginRight: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '200px'
          }}
        >
          <option value="">Select a station</option>
          {stations.map(station => (
            <option key={station.id} value={station.id}>
              {station.name} ({station.location})
            </option>
          ))}
        </select>
        
        <span style={{ color: '#666', marginLeft: '10px' }}>
          {stations.length} stations available
        </span>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={runAllStationTests}
          disabled={!selectedStation || loading}
          style={{
            padding: '10px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStation && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          🚀 Run All Station Tests
        </button>
        
        <button 
          onClick={testStationPumps}
          disabled={!selectedStation || loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStation && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          ⛽ Test Station Pumps
        </button>
        
        <button 
          onClick={testStationTanks}
          disabled={!selectedStation || loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStation && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          🛢️ Test Station Tanks
        </button>
        
        <button 
          onClick={testOpenShift}
          disabled={!selectedStation || loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStation && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          📋 Test Open Shift
        </button>
        
        <button 
          onClick={testAllShifts}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !loading ? 'pointer' : 'not-allowed'
          }}
        >
          📊 Test All Shifts
        </button>
      </div>

      {/* Results Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
          {['stations', 'shifts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
                color: activeTab === tab ? 'white' : '#007bff',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #007bff' : 'none',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Station Results */}
        {activeTab === 'stations' && (
          <div>
            <h3>Station Assets & Readings</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Pumps Column */}
              <div>
                <h4>Pumps with Last END Readings</h4>
                {debugData.stationPumps ? renderPumpsData() : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    No pump data loaded yet. Click "Test Station Pumps" to load data.
                  </div>
                )}
              </div>

              {/* Tanks Column */}
              <div>
                <h4>Tanks with Last END Readings</h4>
                {debugData.stationTanks ? renderTanksData() : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    No tank data loaded yet. Click "Test Station Tanks" to load data.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shift Results */}
        {activeTab === 'shifts' && (
          <div>
            <h3>Shift Management</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {renderShiftData(debugData.openShift, 'Open Shift')}
              {renderShiftData(debugData.currentShift, 'Current Shift')}
              {renderShiftData(debugData.previousShift, 'Previous Shift')}
            </div>

            {/* All Shifts */}
            {debugData.allShifts && (
              <div style={{ marginTop: '20px' }}>
                <h4>All Shifts ({debugData.allShifts.shifts?.length || debugData.allShifts.length || 0})</h4>
                {debugData.allShifts.shifts?.map(shift => (
                  <div key={shift.id} style={{
                    padding: '10px',
                    margin: '5px 0',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <div>
                      <strong>Shift #{shift.shiftNumber}</strong> - {shift.status}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(shift.startTime).toLocaleString()} 
                      {shift.endTime && ` to ${new Date(shift.endTime).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raw Data View */}
      <details style={{ marginTop: '30px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          📋 Raw Debug Data (for development)
        </summary>
        <pre style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '400px',
          fontSize: '12px'
        }}>
          {JSON.stringify(debugData, null, 2)}
        </pre>
      </details>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        Last updated: {new Date().toLocaleString()} | 
        Company ID: {companyId || 'Not set'} | 
        Selected Station: {selectedStation || 'None'}
      </div>
    </div>
  );
};

export default StationDebug;