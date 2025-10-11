// getShiftAssetsStructure.jsx
import React, { useState, useEffect } from 'react';
import { connectedAssetService } from '../../../../../services/connectedAssetsService/connectedAssetsService';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { useApp } from '../../../../../context/AppContext';

function ShiftData() {
    const { state } = useApp();
    const [shiftData, setShiftData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [openShiftId, setOpenShiftId] = useState(null);
    const currentStation = state.currentStation?.id;

    // States for different data types
    const [islandPumpReadings, setIslandPumpReadings] = useState([]);
    const [tankReadings, setTankReadings] = useState([]); // This will contain tanks with their dip readings
    const [shiftOpeningCheck, setShiftOpeningCheck] = useState(null);
    const [cashDenominations, setCashDenominations] = useState([]);
    const [totalCash, setTotalCash] = useState(0);

    useEffect(() => {
        if (currentStation) {
            const fetchCurrentShift = async (stationId) => {
                try {
                    const currentShift = await shiftService.getCurrentOpenShift(stationId);
                    console.log('Current Open Shift:', currentShift);
                    setOpenShiftId(currentShift?.id);
                } catch (error) {
                    console.error('Failed to fetch current shift:', error);
                    return null;
                }
            }
            fetchCurrentShift(currentStation);
        } else {
            console.log("no station id available", currentStation);
        }
    }, [currentStation]);

    useEffect(() => {
        if (currentStation && openShiftId) {
            fetchShiftData(openShiftId);
        }
    }, [openShiftId]);

    const fetchShiftData = async (shiftId) => {
        setLoading(true);
        setError(null);
        try {
            const data = await connectedAssetService.getShiftAssetsStructure(shiftId);
            setShiftData(data);
            
            // Transform pumps data to include island information
            const pumpsWithIslandInfo = transformPumpsData(data.islands || []);
            setIslandPumpReadings(pumpsWithIslandInfo);
            
            // Set tanks data - tanks already include dipReadings in the structure
            setTankReadings(data.tanks || []);
            
            setShiftOpeningCheck(data.shiftOpeningCheck || null);
            setCashDenominations(data.cashDenominations || []);
            setTotalCash(data.totalCash || 0);
            
            console.log('Fetched Shift Data:', data);
            console.log('Tanks with Readings:', data.tanks);
        } catch (error) {
            console.error('Failed to fetch shift data:', error);
            setError('Failed to load shift data');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to transform pumps data with island information
    const transformPumpsData = (islands) => {
        const pumpsWithIslandInfo = [];
        
        islands.forEach(island => {
            if (island.pumps && island.pumps.length > 0) {
                island.pumps.forEach(pump => {
                    pumpsWithIslandInfo.push({
                        ...pump,
                        islandId: island.islandId,
                        islandName: island.islandName,
                        islandCode: island.islandCode
                    });
                });
            }
        });
        
        return pumpsWithIslandInfo;
    };

    // Helper function to get reading type badge color
    const getReadingTypeColor = (readingType) => {
        switch (readingType) {
            case 'START': return 'blue';
            case 'END': return 'red';
            case 'INTERIM': return 'orange';
            default: return 'gray';
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!shiftData) return <div>No shift data available</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Shift Data - {shiftData.shift?.shiftNumber}</h2>
            <p>Status: <strong>{shiftData.shift?.status}</strong></p>
            
            {/* Pumps Section */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Pumps by Island:</h3>
                {islandPumpReadings.length === 0 ? (
                    <p>No pumps available</p>
                ) : (
                    islandPumpReadings.map((pump) => (
                        <div key={pump.pumpId} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '15px', borderRadius: '5px' }}>
                            <h4>🛢️ {pump.pumpName}</h4>
                            <p><strong>Island:</strong> {pump.islandName} ({pump.islandCode})</p>
                            <p><strong>Connected Tank:</strong> {pump.connectedTankId}</p>
                            
                            {/* Meter Readings */}
                            <div style={{ marginTop: '10px' }}>
                                <h5>Meter Readings:</h5>
                                {pump.meterReadings?.map(reading => (
                                    <div key={reading.id} style={{ 
                                        borderLeft: `4px solid ${getReadingTypeColor(reading.readingType)}`,
                                        padding: '10px',
                                        margin: '5px 0',
                                        backgroundColor: '#f9f9f9'
                                    }}>
                                        <p><strong>Type:</strong> 
                                            <span style={{ 
                                                color: getReadingTypeColor(reading.readingType),
                                                marginLeft: '5px'
                                            }}>
                                                {reading.readingType}
                                            </span>
                                        </p>
                                        <p><strong>Electric Meter:</strong> {reading.electricMeter}</p>
                                        <p><strong>Manual Meter:</strong> {reading.manualMeter}</p>
                                        <p><strong>Cash Meter:</strong> {reading.cashMeter}</p>
                                        <p><strong>Liters Dispensed:</strong> {reading.litersDispensed}</p>
                                        <p><strong>Recorded By:</strong> {reading.recordedBy?.name} at {new Date(reading.recordedAt).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tanks Section */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Tanks with Dip Readings:</h3>
                {tankReadings.length === 0 ? (
                    <p>No tanks available</p>
                ) : (
                    tankReadings.map((tank) => (
                        <div key={tank.tankId} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '15px', borderRadius: '5px' }}>
                            <h4>⛽ {tank.tankName}</h4>
                            <p><strong>Product:</strong> {tank.product?.name}</p>
                            <p><strong>Capacity:</strong> {tank.capacity} liters</p>
                            <p><strong>Current Volume:</strong> {tank.currentVolume} liters</p>
                            
                            {/* Dip Readings */}
                            <div style={{ marginTop: '10px' }}>
                                <h5>Dip Readings:</h5>
                                {tank.dipReadings?.length > 0 ? (
                                    tank.dipReadings.map(reading => (
                                        <div key={reading.id} style={{ 
                                            borderLeft: `4px solid ${getReadingTypeColor(reading.readingType)}`,
                                            padding: '10px',
                                            margin: '5px 0',
                                            backgroundColor: '#f9f9f9'
                                        }}>
                                            <p><strong>Type:</strong> 
                                                <span style={{ 
                                                    color: getReadingTypeColor(reading.readingType),
                                                    marginLeft: '5px'
                                                }}>
                                                    {reading.readingType}
                                                </span>
                                            </p>
                                            <p><strong>Dip Value:</strong> {reading.dipValue}</p>
                                            <p><strong>Volume:</strong> {reading.volume} liters</p>
                                            <p><strong>Temperature:</strong> {reading.temperature}°C</p>
                                            <p><strong>Water Level:</strong> {reading.waterLevel}</p>
                                            <p><strong>Density:</strong> {reading.density}</p>
                                            <p><strong>Recorded By:</strong> {reading.recordedBy?.name} at {new Date(reading.recordedAt).toLocaleString()}</p>
                                            <p><strong>Verified:</strong> {reading.isVerified ? 'Yes' : 'No'}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p>No dip readings available</p>
                                )}
                            </div>

                            {/* Connected Pumps */}
                            <div style={{ marginTop: '10px' }}>
                                <h5>Connected Pumps:</h5>
                                {tank.connectedPumps?.length > 0 ? (
                                    <ul>
                                        {tank.connectedPumps.map(pump => (
                                            <li key={pump.pumpId}>
                                                {pump.pumpName} ({pump.islandName})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No connected pumps</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Summary Section */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Shift Summary:</h3>
                {shiftData.summary && (
                    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
                        <p><strong>Total Islands:</strong> {shiftData.summary.totalIslands}</p>
                        <p><strong>Total Pumps:</strong> {shiftData.summary.totalPumps}</p>
                        <p><strong>Total Tanks:</strong> {shiftData.summary.totalTanks}</p>
                        <p><strong>Total Attendants:</strong> {shiftData.summary.totalAttendants}</p>
                        
                        <div style={{ marginTop: '10px' }}>
                            <h5>Reading Status:</h5>
                            <p>Pump Readings: {shiftData.summary.readingStatus.totalPumpReadings}</p>
                            <p>Tank Readings: {shiftData.summary.readingStatus.totalTankReadings}</p>
                            
                            <h6>Critical Readings Required:</h6>
                            <p>Pumps: {shiftData.summary.readingStatus.shiftCriticalReadings.pumps.start} start + {shiftData.summary.readingStatus.shiftCriticalReadings.pumps.end} end of {shiftData.summary.readingStatus.shiftCriticalReadings.pumps.totalRequired} total</p>
                            <p>Tanks: {shiftData.summary.readingStatus.shiftCriticalReadings.tanks.start} start + {shiftData.summary.readingStatus.shiftCriticalReadings.tanks.end} end of {shiftData.summary.readingStatus.shiftCriticalReadings.tanks.totalRequired} total</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Raw data for reference */}
            <details>
                <summary>Raw Shift Data</summary>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(shiftData, null, 2)}
                </pre>
            </details>
        </div>
    );
}

export default ShiftData;