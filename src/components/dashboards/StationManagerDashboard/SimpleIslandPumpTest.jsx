import React, { useEffect, useState } from 'react';
import { islandPumpMappingService } from '../../../services/assetTopologyService/islandPumpMappingService';
import { assetTopologyService } from '../../../services/assetTopologyService/assetTopologyService';
import { stationService } from '../../../services/stationService/stationService';
import { assetService } from '../../../services/assetService/assetService';

const SimpleIslandPumpTest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [debugData, setDebugData] = useState(null);

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

  // Get comprehensive debug data
  const getComprehensiveDebug = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Starting comprehensive debug...');
      
      const debugResults = {
        timestamp: new Date().toISOString(),
        stationId: selectedStation,
        steps: {}
      };

      // STEP 1: Get raw station assets
      console.log('📋 STEP 1: Getting station assets...');
      try {
        const stationAssets = await assetService.getStationAssets(selectedStation);
        debugResults.steps.stationAssets = {
          rawResponse: stationAssets,
          islands: stationAssets?.filter(asset => asset.type === 'ISLAND') || [],
          pumps: stationAssets?.filter(asset => asset.type === 'PUMP') || [],
          tanks: stationAssets?.filter(asset => asset.type === 'TANK') || [],
        };
        console.log('✅ Station assets:', debugResults.steps.stationAssets);
      } catch (assetError) {
        debugResults.steps.stationAssets = { error: assetError.message };
        console.error('❌ Station assets error:', assetError);
      }

      // STEP 2: Get comprehensive topology
      console.log('🗺️ STEP 2: Getting comprehensive topology...');
      try {
        const comprehensiveTopology = await assetTopologyService.getComprehensiveStationTopology(selectedStation);
        debugResults.steps.comprehensiveTopology = {
          rawResponse: comprehensiveTopology,
          structure: {
            hasData: !!comprehensiveTopology,
            hasDataProperty: !!comprehensiveTopology?.data,
            keys: comprehensiveTopology ? Object.keys(comprehensiveTopology) : [],
            dataKeys: comprehensiveTopology?.data ? Object.keys(comprehensiveTopology.data) : []
          },
          islands: comprehensiveTopology?.data?.islands || comprehensiveTopology?.islands || [],
          pumps: comprehensiveTopology?.data?.pumps || comprehensiveTopology?.pumps || [],
          tanks: comprehensiveTopology?.data?.tanks || comprehensiveTopology?.tanks || [],
          station: comprehensiveTopology?.data?.station || comprehensiveTopology?.station || {}
        };
        console.log('✅ Comprehensive topology:', debugResults.steps.comprehensiveTopology);
      } catch (topologyError) {
        debugResults.steps.comprehensiveTopology = { error: topologyError.message };
        console.error('❌ Comprehensive topology error:', topologyError);
      }

      // STEP 3: Get islands with pumps and tanks
      console.log('🏝️ STEP 3: Getting islands with pumps and tanks...');
      try {
        const islandsWithPumps = await assetTopologyService.getIslandsWithPumpsAndTanks(selectedStation);
        debugResults.steps.islandsWithPumpsAndTanks = {
          rawResponse: islandsWithPumps,
          structure: {
            hasData: !!islandsWithPumps,
            hasDataProperty: !!islandsWithPumps?.data,
            keys: islandsWithPumps ? Object.keys(islandsWithPumps) : [],
            dataKeys: islandsWithPumps?.data ? Object.keys(islandsWithPumps.data) : []
          },
          islands: islandsWithPumps?.data?.islands || islandsWithPumps?.islands || [],
          islandsWithPumps: islandsWithPumps?.data?.islandsWithPumps || islandsWithPumps?.islandsWithPumps || [],
          summary: islandsWithPumps?.data?.summary || islandsWithPumps?.summary || {}
        };

        // Detailed analysis of pumps and products
        if (debugResults.steps.islandsWithPumpsAndTanks.islands.length > 0) {
          debugResults.steps.islandsWithPumpsAndTanks.detailedAnalysis = debugResults.steps.islandsWithPumpsAndTanks.islands.map(island => ({
            islandId: island.id,
            islandName: island.name,
            pumpCount: island.pumps?.length || 0,
            pumps: island.pumps?.map(pump => ({
              pumpId: pump.id,
              pumpName: pump.name,
              hasProduct: !!pump.product,
              product: pump.product,
              productSource: pump.productSource,
              hasTank: !!pump.tank,
              tank: pump.tank ? {
                tankId: pump.tank.id,
                tankName: pump.tank.name,
                tankProduct: pump.tank.product
              } : null,
              connectionStatus: pump.connectionStatus
            })) || []
          }));
        }
        console.log('✅ Islands with pumps:', debugResults.steps.islandsWithPumpsAndTanks);
      } catch (islandsError) {
        debugResults.steps.islandsWithPumpsAndTanks = { error: islandsError.message };
        console.error('❌ Islands with pumps error:', islandsError);
      }

      // STEP 4: Get tanks with pumps and products
      console.log('🛢️ STEP 4: Getting tanks with pumps and products...');
      try {
        const tanksWithPumps = await assetTopologyService.getTanksWithPumpsAndProducts(selectedStation);
        debugResults.steps.tanksWithPumpsAndProducts = {
          rawResponse: tanksWithPumps,
          structure: {
            hasData: !!tanksWithPumps,
            hasDataProperty: !!tanksWithPumps?.data,
            keys: tanksWithPumps ? Object.keys(tanksWithPumps) : [],
            dataKeys: tanksWithPumps?.data ? Object.keys(tanksWithPumps.data) : []
          },
          tanks: tanksWithPumps?.data?.tanks || tanksWithPumps?.tanks || [],
          summary: tanksWithPumps?.data?.summary || tanksWithPumps?.summary || {}
        };

        // Detailed analysis of tanks and products
        if (debugResults.steps.tanksWithPumpsAndProducts.tanks.length > 0) {
          debugResults.steps.tanksWithPumpsAndProducts.detailedAnalysis = debugResults.steps.tanksWithPumpsAndProducts.tanks.map(tank => ({
            tankId: tank.id,
            tankName: tank.name,
            product: tank.product,
            connectedPumps: tank.connectedPumps?.map(pump => ({
              pumpId: pump.id,
              pumpName: pump.name,
              hasProduct: !!pump.product,
              product: pump.product,
              island: pump.island
            })) || []
          }));
        }
        console.log('✅ Tanks with pumps:', debugResults.steps.tanksWithPumpsAndProducts);
      } catch (tanksError) {
        debugResults.steps.tanksWithPumpsAndProducts = { error: tanksError.message };
        console.error('❌ Tanks with pumps error:', tanksError);
      }

      // STEP 5: Get pump connections
      console.log('⛽ STEP 5: Getting pump connections...');
      try {
        const pumpConnections = await assetTopologyService.getPumpConnections(selectedStation);
        debugResults.steps.pumpConnections = {
          rawResponse: pumpConnections,
          structure: {
            hasData: !!pumpConnections,
            hasDataProperty: !!pumpConnections?.data,
            keys: pumpConnections ? Object.keys(pumpConnections) : [],
            dataKeys: pumpConnections?.data ? Object.keys(pumpConnections.data) : []
          },
          pumps: pumpConnections?.data?.pumps || pumpConnections?.pumps || [],
          summary: pumpConnections?.data?.summary || pumpConnections?.summary || {}
        };

        // Product analysis for pumps
        if (debugResults.steps.pumpConnections.pumps.length > 0) {
          const pumpsWithProducts = debugResults.steps.pumpConnections.pumps.filter(pump => pump.product);
          const pumpsWithoutProducts = debugResults.steps.pumpConnections.pumps.filter(pump => !pump.product);
          
          debugResults.steps.pumpConnections.productAnalysis = {
            totalPumps: debugResults.steps.pumpConnections.pumps.length,
            pumpsWithProducts: pumpsWithProducts.length,
            pumpsWithoutProducts: pumpsWithoutProducts.length,
            products: [...new Set(pumpsWithProducts.map(pump => pump.product?.name).filter(Boolean))],
            samplePumpWithProduct: pumpsWithProducts[0] || null,
            samplePumpWithoutProduct: pumpsWithoutProducts[0] || null
          };
        }
        console.log('✅ Pump connections:', debugResults.steps.pumpConnections);
      } catch (pumpError) {
        debugResults.steps.pumpConnections = { error: pumpError.message };
        console.error('❌ Pump connections error:', pumpError);
      }

      // STEP 6: Get final island-pump mapping
      console.log('🏝️⛽ STEP 6: Getting final island-pump mapping...');
      try {
        const finalMapping = await islandPumpMappingService.getIslandPumpMapping(selectedStation);
        debugResults.steps.finalMapping = {
          rawResponse: finalMapping,
          structure: {
            type: typeof finalMapping,
            isObject: typeof finalMapping === 'object',
            keys: finalMapping ? Object.keys(finalMapping) : [],
            islandCount: finalMapping ? Object.keys(finalMapping).length : 0,
            totalPumps: finalMapping ? Object.values(finalMapping).flat().length : 0
          },
          mapping: finalMapping
        };
        console.log('✅ Final mapping:', debugResults.steps.finalMapping);
      } catch (mappingError) {
        debugResults.steps.finalMapping = { error: mappingError.message };
        console.error('❌ Final mapping error:', mappingError);
      }

      // STEP 7: Summary analysis
      debugResults.summary = {
        totalSteps: Object.keys(debugResults.steps).length,
        successfulSteps: Object.values(debugResults.steps).filter(step => !step.error).length,
        failedSteps: Object.values(debugResults.steps).filter(step => step.error).length,
        productAvailability: {
          fromPumpConnections: debugResults.steps.pumpConnections?.productAnalysis?.pumpsWithProducts || 0,
          fromIslandsWithPumps: debugResults.steps.islandsWithPumpsAndTanks?.islands?.reduce((sum, island) => 
            sum + (island.pumps?.filter(pump => pump.product).length || 0), 0) || 0,
          fromTanksWithPumps: debugResults.steps.tanksWithPumpsAndProducts?.tanks?.reduce((sum, tank) => 
            sum + (tank.connectedPumps?.filter(pump => pump.product).length || 0), 0) || 0
        }
      };

      setDebugData(debugResults);
      console.log('🎉 Comprehensive debug completed!', debugResults);

    } catch (error) {
      console.error('❌ Comprehensive debug error:', error);
      setError(`Comprehensive debug failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render debug data
  const renderDebugData = () => {
    if (!debugData) return null;

    return (
      <div style={{ marginTop: '30px' }}>
        <h2>🔍 Comprehensive Debug Results</h2>
        
        {/* Summary */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>📊 Summary</h3>
          <p><strong>Station:</strong> {debugData.stationId}</p>
          <p><strong>Timestamp:</strong> {debugData.timestamp}</p>
          <p><strong>Steps Completed:</strong> {debugData.summary.successfulSteps}/{debugData.summary.totalSteps}</p>
          <p><strong>Pumps with Products:</strong> {debugData.summary.productAvailability.fromPumpConnections}</p>
        </div>

        {/* Step by Step Results */}
        {Object.entries(debugData.steps).map(([stepName, stepData]) => (
          <div key={stepName} style={{ 
            marginBottom: '25px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px'
          }}>
            <h3 style={{ 
              color: stepData.error ? '#f44336' : '#4CAF50',
              marginBottom: '15px'
            }}>
              {stepData.error ? '❌' : '✅'} {stepName}
            </h3>

            {stepData.error ? (
              <div style={{ color: '#f44336', padding: '10px', backgroundColor: '#ffebee' }}>
                Error: {stepData.error}
              </div>
            ) : (
              <div>
                {/* Structure Info */}
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5' }}>
                  <strong>Structure:</strong> {JSON.stringify(stepData.structure, null, 2)}
                </div>

                {/* Detailed Analysis if available */}
                {stepData.detailedAnalysis && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4>Detailed Analysis:</h4>
                    <pre style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '10px' }}>
                      {JSON.stringify(stepData.detailedAnalysis, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Raw Data */}
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    📋 Raw Response Data
                  </summary>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '400px',
                    fontSize: '10px'
                  }}>
                    {JSON.stringify(stepData.rawResponse, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}

        {/* Final Mapping Display */}
        {debugData.steps.finalMapping && !debugData.steps.finalMapping.error && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <h3>🏝️⛽ Final Island-Pump Mapping</h3>
            <p><strong>Islands:</strong> {debugData.steps.finalMapping.structure.islandCount}</p>
            <p><strong>Total Pumps:</strong> {debugData.steps.finalMapping.structure.totalPumps}</p>
            
            {Object.entries(debugData.steps.finalMapping.mapping).map(([islandId, pumpIds]) => (
              <div key={islandId} style={{
                padding: '10px',
                margin: '10px 0',
                border: '1px solid #4CAF50',
                borderRadius: '4px',
                backgroundColor: '#f1f8e9'
              }}>
                <strong>🏝️ Island:</strong> <code>{islandId}</code>
                <div style={{ marginLeft: '20px' }}>
                  <strong>Pumps ({pumpIds.length}):</strong>
                  {pumpIds.map(pumpId => (
                    <div key={pumpId} style={{ padding: '2px 5px' }}>
                      ⛽ <code>{pumpId}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadStations();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔍 Comprehensive Island-Pump Debug</h1>
      <p style={{ color: '#666' }}>
        This debug component will show ALL raw responses to help identify where product information is getting lost.
      </p>
      
      {error && (
        <div style={{ 
          color: '#f44336', 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#ffebee',
          borderRadius: '4px'
        }}>
          ❌ Error: {error}
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
            padding: '10px', 
            marginRight: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '300px',
            fontSize: '14px'
          }}
        >
          <option value="">Select a station</option>
          {stations.map(station => (
            <option key={station.id} value={station.id}>
              {station.name} ({station.location}) - {station.id}
            </option>
          ))}
        </select>
      </div>

      {/* Action Button */}
      <button 
        onClick={getComprehensiveDebug}
        disabled={!selectedStation || loading}
        style={{
          padding: '12px 24px',
          backgroundColor: selectedStation && !loading ? '#2196F3' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedStation && !loading ? 'pointer' : 'not-allowed',
          marginBottom: '20px',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '🔄 Running Comprehensive Debug...' : '🔍 Run Comprehensive Debug'}
      </button>

      {loading && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ⚡ Debug in progress... Check browser console for real-time logs
        </div>
      )}

      {/* Results */}
      {renderDebugData()}
    </div>
  );
};

export default SimpleIslandPumpTest;