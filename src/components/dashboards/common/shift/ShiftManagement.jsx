// ShiftManagement.jsx
import React, { useState, useEffect } from 'react';
import { shiftService } from '../../services/shiftService';
import { 
  useAllShifts, 
  useShiftById, 
  useCurrentOpenShift,
  useShiftWithFilter,
  useShiftManager 
} from '../useShiftService';
import { useShiftStructure } from '../shiftWizard/useShiftStructure';
import { useApp } from '../../context/AppContext';

function ShiftManagement() {
    const { state } = useApp();
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [viewType, setViewType] = useState('full');
    const currentStation = state.currentStation?.id;

    // Use the shift service hooks
    const allShifts = useAllShifts(
        { stationId: currentStation, limit: 10 },
        { viewType: 'list', includeRaw: true }
    );

    const currentOpenShift = useCurrentOpenShift(currentStation, {
        includeRaw: true,
        autoFetch: !!currentStation
    });

    const selectedShift = useShiftById(selectedShiftId, {
        includeRaw: true,
        autoFetch: !!selectedShiftId
    });

    const shiftManager = useShiftManager();

    // Log all the data for debugging
    useEffect(() => {
        console.log('=== SHIFT MANAGEMENT DATA ===');
        console.log('All Shifts:', allShifts);
        console.log('Current Open Shift:', currentOpenShift);
        console.log('Selected Shift:', selectedShift);
        console.log('Shift Manager:', shiftManager);
    }, [allShifts.data, currentOpenShift.data, selectedShift.data]);

    // Log when data changes
    useEffect(() => {
        if (allShifts.data) {
            console.log('🔄 All Shifts Updated:', {
                count: allShifts.data.shifts?.length,
                summary: allShifts.data.summary,
                metadata: allShifts.metadata
            });
        }
    }, [allShifts.data]);

    useEffect(() => {
        if (currentOpenShift.data) {
            console.log('🔄 Current Open Shift Updated:', currentOpenShift.data);
        }
    }, [currentOpenShift.data]);

    useEffect(() => {
        if (selectedShift.data) {
            console.log('🔄 Selected Shift Updated:', selectedShift.data);
        }
    }, [selectedShift.data]);

    const handleShiftSelect = (shiftId) => {
        setSelectedShiftId(shiftId);
    };

    const handleViewTypeChange = (type) => {
        setViewType(type);
    };

    const renderShiftCard = (shift) => {
        return (
            <div key={shift.id} style={{ 
                border: '1px solid #ddd', 
                margin: '10px 0', 
                padding: '15px', 
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                cursor: 'pointer'
            }}
            onClick={() => handleShiftSelect(shift.id)}>
                <h4>Shift #{shift.shiftNumber}</h4>
                <p><strong>Status:</strong> 
                    <span style={{ 
                        color: shift.statusInfo?.formattedStatus?.color === 'success' ? 'green' : 
                               shift.statusInfo?.formattedStatus?.color === 'warning' ? 'orange' : 'gray',
                        marginLeft: '5px'
                    }}>
                        {shift.statusInfo?.formattedStatus?.label || shift.status}
                    </span>
                </p>
                <p><strong>Start:</strong> {new Date(shift.startTime).toLocaleString()}</p>
                <p><strong>End:</strong> {shift.endTime ? new Date(shift.endTime).toLocaleString() : 'Not ended'}</p>
                <p><strong>Revenue:</strong> ${shift.totalRevenue || 0}</p>
                <p><strong>Collections:</strong> ${shift.totalCollections || 0}</p>
                <p><strong>Variance:</strong> 
                    <span style={{ color: shift.variance !== 0 ? 'red' : 'green' }}>
                        ${shift.variance || 0} ({shift.variancePercentage?.toFixed(2)}%)
                    </span>
                </p>
            </div>
        );
    };

    const renderShiftDetails = (shift) => {
        if (!shift) return null;

        return (
            <div style={{ border: '2px solid #007acc', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
                <h3>📊 Shift #{shift.shiftNumber} - Detailed View</h3>
                
                {/* Basic Information */}
                <div style={{ marginBottom: '20px' }}>
                    <h4>Basic Information</h4>
                    <p><strong>Station:</strong> {shift.station?.name}</p>
                    <p><strong>Supervisor:</strong> {shift.supervisor?.name}</p>
                    <p><strong>Duration:</strong> {shift.startTime} to {shift.endTime || 'Ongoing'}</p>
                    <p><strong>Price List:</strong> {shift.priceList?.name}</p>
                </div>

                {/* Financial Summary */}
                <div style={{ marginBottom: '20px' }}>
                    <h4>💰 Financial Summary</h4>
                    <p><strong>Total Revenue:</strong> ${shift.totals?.totalRevenue}</p>
                    <p><strong>Fuel Revenue:</strong> ${shift.totals?.totalFuelRevenue}</p>
                    <p><strong>Non-Fuel Revenue:</strong> ${shift.totals?.totalNonFuelRevenue}</p>
                    <p><strong>Total Collections:</strong> ${shift.totals?.totalCollections}</p>
                    <p><strong>Expected Amount:</strong> ${shift.totals?.expectedAmount}</p>
                    <p><strong>Variance:</strong> 
                        <span style={{ color: shift.totals?.variance !== 0 ? 'red' : 'green' }}>
                            ${shift.totals?.variance} ({shift.totals?.variancePercentage?.toFixed(2)}%)
                        </span>
                    </p>
                </div>

                {/* Personnel */}
                <div style={{ marginBottom: '20px' }}>
                    <h4>👥 Personnel</h4>
                    <p><strong>Supervisor:</strong> {shift.personnel?.supervisor?.name}</p>
                    <p><strong>Attendants:</strong> {shift.personnel?.totalAttendants}</p>
                    {shift.personnel?.attendants?.map(attendant => (
                        <div key={attendant.id} style={{ marginLeft: '20px' }}>
                            • {attendant.name} ({attendant.email})
                        </div>
                    ))}
                </div>

                {/* Assets */}
                <div style={{ marginBottom: '20px' }}>
                    <h4>🔧 Assets</h4>
                    <p><strong>Pumps:</strong> {shift.assets?.pumps?.length}</p>
                    <p><strong>Tanks:</strong> {shift.assets?.tanks?.length}</p>
                    <p><strong>Islands:</strong> {shift.assets?.islands?.length}</p>
                    
                    {/* Pump Details */}
                    <h5>Pump Activity:</h5>
                    {shift.assets?.pumps?.map(pump => (
                        <div key={pump.id} style={{ marginLeft: '20px', borderLeft: '3px solid #007acc', paddingLeft: '10px', marginBottom: '10px' }}>
                            <p><strong>{pump.name}</strong> - {pump.product}</p>
                            <p>Sales: ${pump.sales} | Liters: {pump.liters}L</p>
                            <p>Start: {pump.electricMeterStart} | End: {pump.electricMeterEnd}</p>
                        </div>
                    ))}

                    {/* Tank Details */}
                    <h5>Tank Levels:</h5>
                    {shift.assets?.tanks?.map(tank => (
                        <div key={tank.id} style={{ marginLeft: '20px', borderLeft: '3px solid #28a745', paddingLeft: '10px', marginBottom: '10px' }}>
                            <p><strong>{tank.name}</strong> - {tank.product}</p>
                            <p>Volume Change: {tank.volumeChange}L</p>
                            <p>Dip Start: {tank.dipStart} | Dip End: {tank.dipEnd}</p>
                        </div>
                    ))}
                </div>

                {/* Collections */}
                <div style={{ marginBottom: '20px' }}>
                    <h4>💵 Collections</h4>
                    <p><strong>Cash:</strong> ${shift.financials?.cashAmount}</p>
                    <p><strong>Mobile Money:</strong> ${shift.financials?.mobileMoneyAmount}</p>
                    <p><strong>Cards:</strong> ${(shift.financials?.visaAmount || 0) + (shift.financials?.mastercardAmount || 0)}</p>
                    <p><strong>Total Collected:</strong> ${shift.financials?.totalCollected}</p>
                    
                    <h5>Island Breakdown:</h5>
                    {shift.financials?.islandBreakdown?.map(island => (
                        <div key={island.islandId} style={{ marginLeft: '20px', marginBottom: '10px' }}>
                            <p><strong>{island.islandCode}</strong> - {island.attendantName}</p>
                            <p>Cash: ${island.cashAmount} | Mobile: ${island.mobileMoneyAmount} | Total: ${island.totalCollected}</p>
                        </div>
                    ))}
                </div>

                {/* Quality Metrics */}
                <div style={{ marginBottom: '20px' }}>
                    <h4>📈 Quality Metrics</h4>
                    <p><strong>Opening Checks Passed:</strong> {shift.quality?.openingChecksPassed ? '✅' : '❌'}</p>
                    <p><strong>Has Variance:</strong> {shift.quality?.hasVariance ? '⚠️ Yes' : '✅ No'}</p>
                    <p><strong>Has Discrepancies:</strong> {shift.quality?.hasDiscrepancies ? '🚨 Yes' : '✅ No'}</p>
                    <p><strong>Reconciliation Status:</strong> {shift.reconciliation?.status || 'N/A'}</p>
                </div>

                {/* Opening Checks */}
                {shift.shiftOpeningCheck && (
                    <div style={{ marginBottom: '20px' }}>
                        <h4>🔍 Opening Checks</h4>
                        {shift.shiftOpeningCheck.map(check => (
                            <div key={check.id}>
                                <p>✅ Meter Readings: {check.hasInitialMeterReadings ? 'Complete' : 'Missing'}</p>
                                <p>✅ Dip Readings: {check.hasInitialDipReadings ? 'Complete' : 'Missing'}</p>
                                <p>✅ Attendants: {check.hasAttendantsAssigned ? 'Assigned' : 'Missing'}</p>
                                <p>✅ No Open Shifts: {check.hasNoOpenShifts ? 'Clear' : 'Conflict'}</p>
                                <p>✅ Valid Pricing: {check.hasValidPricing ? 'Set' : 'Missing'}</p>
                                <p>✅ Assets Connected: {check.hasAssetsConnected ? 'Connected' : 'Disconnected'}</p>
                                <p><strong>All Checks Passed:</strong> {check.checksPassed ? '✅' : '❌'}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Raw Data Toggle */}
                <details>
                    <summary>Raw Shift Data (Debug)</summary>
                    <pre style={{ 
                        fontSize: '10px', 
                        overflow: 'auto', 
                        maxHeight: '400px',
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '4px'
                    }}>
                        {JSON.stringify(shift, null, 2)}
                    </pre>
                </details>
            </div>
        );
    };

    if (allShifts.loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>🔄 Loading Shift Data...</h2>
                <p>Fetching shift information from the server</p>
            </div>
        );
    }

    if (allShifts.error) {
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                <h2>❌ Error Loading Shift Data</h2>
                <p>{allShifts.error.message}</p>
                <button onClick={() => allShifts.refetch()}>Retry</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>🎯 Shift Management Dashboard</h1>
            
            {/* Station Info */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <h3>Current Station: {state.currentStation?.name || 'No Station Selected'}</h3>
                <p>Station ID: {currentStation || 'N/A'}</p>
            </div>

            {/* View Controls */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                    onClick={() => handleViewTypeChange('full')}
                    style={{ backgroundColor: viewType === 'full' ? '#007acc' : '#f0f0f0' }}
                >
                    Full View
                </button>
                <button 
                    onClick={() => handleViewTypeChange('list')}
                    style={{ backgroundColor: viewType === 'list' ? '#007acc' : '#f0f0f0' }}
                >
                    List View
                </button>
                <button 
                    onClick={() => handleViewTypeChange('summary')}
                    style={{ backgroundColor: viewType === 'summary' ? '#007acc' : '#f0f0f0' }}
                >
                    Summary View
                </button>
                <button onClick={() => allShifts.refetch(true)}>
                    🔄 Refresh Data
                </button>
            </div>

            {/* Current Open Shift */}
            {currentOpenShift.data && (
                <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <h3>🚦 Currently Open Shift</h3>
                    {renderShiftCard(currentOpenShift.data)}
                    <button 
                        onClick={() => handleShiftSelect(currentOpenShift.data.id)}
                        style={{ marginTop: '10px' }}
                    >
                        View Details
                    </button>
                </div>
            )}

            {/* All Shifts List */}
            <div style={{ marginBottom: '30px' }}>
                <h3>📋 All Shifts ({allShifts.data?.shifts?.length || 0})</h3>
                
                {/* Summary Stats */}
                {allShifts.data?.summary && (
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                            <strong>Total Revenue:</strong> ${allShifts.data.summary.financials?.totalRevenue}
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                            <strong>Total Collections:</strong> ${allShifts.data.summary.financials?.totalCollections}
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                            <strong>Shifts with Variances:</strong> {allShifts.data.summary.quality?.shiftsWithVariances}
                        </div>
                    </div>
                )}

                {/* Shifts List */}
                {allShifts.data?.shifts?.map(shift => renderShiftCard(shift))}
                
                {(!allShifts.data?.shifts || allShifts.data.shifts.length === 0) && (
                    <p>No shifts found for this station.</p>
                )}
            </div>

            {/* Selected Shift Details */}
            {selectedShift.data && (
                <div>
                    <h3>🔍 Selected Shift Details</h3>
                    {selectedShift.loading && <p>Loading shift details...</p>}
                    {selectedShift.error && <p style={{ color: 'red' }}>Error: {selectedShift.error.message}</p>}
                    {selectedShift.data && renderShiftDetails(selectedShift.data)}
                </div>
            )}

            {/* Debug Information */}
            <details style={{ marginTop: '30px' }}>
                <summary>🛠️ Debug Information</summary>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4>All Shifts State</h4>
                        <pre style={{ fontSize: '10px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                            {JSON.stringify({
                                loading: allShifts.loading,
                                error: allShifts.error?.message,
                                dataCount: allShifts.data?.shifts?.length,
                                metadata: allShifts.metadata
                            }, null, 2)}
                        </pre>
                    </div>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4>Current Open Shift State</h4>
                        <pre style={{ fontSize: '10px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                            {JSON.stringify({
                                loading: currentOpenShift.loading,
                                error: currentOpenShift.error?.message,
                                hasData: !!currentOpenShift.data,
                                shiftId: currentOpenShift.data?.id
                            }, null, 2)}
                        </pre>
                    </div>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4>Selected Shift State</h4>
                        <pre style={{ fontSize: '10px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                            {JSON.stringify({
                                loading: selectedShift.loading,
                                error: selectedShift.error?.message,
                                hasData: !!selectedShift.data,
                                shiftId: selectedShift.data?.id
                            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </details>
        </div>
    );
}

export default ShiftManagement;