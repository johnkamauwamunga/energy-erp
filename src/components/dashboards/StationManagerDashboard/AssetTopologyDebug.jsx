import React, { useEffect, useState } from 'react';
import { assetTopologyService } from '../../../services/assetTopologyService/assetTopologyService';
import { stationService } from '../../../services/stationService/stationService';
import { assetService } from '../../../services/assetService/assetService';
import { useApp } from '../../../context/AppContext';


const AssetTopologyDebug = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [debugData, setDebugData] = useState({
    comprehensiveTopology: null,
    islandsWithPumpsAndTanks: null,
    tanksWithPumpsAndProducts: null,
    pumpConnections: null,
    productDistribution: null,
    stationOverview: null
  });
  const [activeTab, setActiveTab] = useState('comprehensive');

  const companyId = state?.currentCompany?.id;
  const stationId = state?.currentStation?.id

  // Load stations
     useEffect(()=>{
      fetchAssets();
    }, []);
      
        // Fetch assets function
        const fetchAssets = async () => {
          if (!stationId) return;
          
          console.log('🔄 Starting assets fetch...');
          try {
            const allAssets = await assetService.getStationAssets(stationId);
            console.log('📦 Raw assets response:', allAssets);
            
            if (allAssets && Array.isArray(allAssets)) {
              console.log(`📊 Total assets: ${allAssets.length}`);
              
              // Filter only island assets
              const islandAssets = allAssets.filter(asset => asset.type === 'ISLAND');
              console.log(`🏝️ Found ${islandAssets.length} island assets:`, islandAssets);
              
              // Create mapping: assetId -> actual island id
              const mapping = {};
              
              islandAssets.forEach((islandAsset, index) => {
                console.log(`🔍 Processing island asset ${index + 1}:`, {
                  assetId: islandAsset.id,
                  assetName: islandAsset.name,
                  islandData: islandAsset.island
                });
                
                if (islandAsset.island && islandAsset.island.id) {
                  // Map: assetId (parent) -> actual island id
                  mapping[islandAsset.id] = islandAsset.island.id;
                  console.log(`🗺️ MAPPING CREATED: Asset ${islandAsset.id} -> Island ${islandAsset.island.id}`);
                } else {
                  console.warn(`⚠️ Island asset ${islandAsset.id} missing island data`);
                }
              });
              
            
              console.log('🗺️ FINAL ASSET TO ISLAND MAPPING:', mapping);
              
            } else {
              console.warn('❌ Assets response is not an array:', allAssets);
            }
          } catch (error) {
            console.error('❌ Error fetching assets:', error);
          } finally {
            console.log('🔄 Assets fetch completed');
          }
        };
  
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

  // Test comprehensive topology
  const testComprehensiveTopology = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing comprehensive topology for station: ${selectedStation}`);
      const result = await assetTopologyService.getComprehensiveStationTopology(selectedStation);
      console.log('✅ Comprehensive topology result:', result);
      setDebugData(prev => ({ ...prev, comprehensiveTopology: result }));
    } catch (error) {
      console.error('❌ Error testing comprehensive topology:', error);
      setError(`Failed to get comprehensive topology: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test islands with pumps and tanks
  const testIslandsWithPumpsAndTanks = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing islands with pumps and tanks for station: ${selectedStation}`);
      const result = await assetTopologyService.getIslandsWithPumpsAndTanks(selectedStation);
      console.log('✅ Islands with pumps and tanks result:', result);
      setDebugData(prev => ({ ...prev, islandsWithPumpsAndTanks: result }));
    } catch (error) {
      console.error('❌ Error testing islands with pumps and tanks:', error);
      setError(`Failed to get islands with pumps and tanks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test tanks with pumps and products
  const testTanksWithPumpsAndProducts = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing tanks with pumps and products for station: ${selectedStation}`);
      const result = await assetTopologyService.getTanksWithPumpsAndProducts(selectedStation);
      console.log('✅ Tanks with pumps and products result:', result);
      setDebugData(prev => ({ ...prev, tanksWithPumpsAndProducts: result }));
    } catch (error) {
      console.error('❌ Error testing tanks with pumps and products:', error);
      setError(`Failed to get tanks with pumps and products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test pump connections
  const testPumpConnections = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing pump connections for station: ${selectedStation}`);
      const result = await assetTopologyService.getPumpConnections(selectedStation);
      console.log('✅ Pump connections result:', result);
      setDebugData(prev => ({ ...prev, pumpConnections: result }));
    } catch (error) {
      console.error('❌ Error testing pump connections:', error);
      setError(`Failed to get pump connections: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test product distribution
  const testProductDistribution = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing product distribution for station: ${selectedStation}`);
      const result = await assetTopologyService.getProductDistribution(selectedStation);
      console.log('✅ Product distribution result:', result);
      setDebugData(prev => ({ ...prev, productDistribution: result }));
    } catch (error) {
      console.error('❌ Error testing product distribution:', error);
      setError(`Failed to get product distribution: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test station overview
  const testStationOverview = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Testing station overview for station: ${selectedStation}`);
      const result = await assetTopologyService.getStationOverview(selectedStation);
      console.log('✅ Station overview result:', result);
      setDebugData(prev => ({ ...prev, stationOverview: result }));
    } catch (error) {
      console.error('❌ Error testing station overview:', error);
      setError(`Failed to get station overview: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run all topology tests
  const runAllTopologyTests = async () => {
    if (!selectedStation) {
      setError('Please select a station first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🚀 Running all topology tests for station: ${selectedStation}`);
      
      const results = await Promise.allSettled([
        assetTopologyService.getComprehensiveStationTopology(selectedStation),
        assetTopologyService.getIslandsWithPumpsAndTanks(selectedStation),
        assetTopologyService.getTanksWithPumpsAndProducts(selectedStation),
        assetTopologyService.getPumpConnections(selectedStation),
        assetTopologyService.getProductDistribution(selectedStation),
        assetTopologyService.getStationOverview(selectedStation)
      ]);

      const [
        comprehensiveResult,
        islandsResult,
        tanksResult,
        pumpsResult,
        productsResult,
        overviewResult
      ] = results;

      setDebugData({
        comprehensiveTopology: comprehensiveResult.status === 'fulfilled' ? comprehensiveResult.value : { error: comprehensiveResult.reason?.message },
        islandsWithPumpsAndTanks: islandsResult.status === 'fulfilled' ? islandsResult.value : { error: islandsResult.reason?.message },
        tanksWithPumpsAndProducts: tanksResult.status === 'fulfilled' ? tanksResult.value : { error: tanksResult.reason?.message },
        pumpConnections: pumpsResult.status === 'fulfilled' ? pumpsResult.value : { error: pumpsResult.reason?.message },
        productDistribution: productsResult.status === 'fulfilled' ? productsResult.value : { error: productsResult.reason?.message },
        stationOverview: overviewResult.status === 'fulfilled' ? overviewResult.value : { error: overviewResult.reason?.message }
      });

      // Log results
      results.forEach((result, index) => {
        const testNames = ['Comprehensive', 'Islands', 'Tanks', 'Pumps', 'Products', 'Overview'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${testNames[index]} topology test successful:`, result.value);
        } else {
          console.error(`❌ ${testNames[index]} topology test failed:`, result.reason);
        }
      });

    } catch (error) {
      console.error('❌ Error running all topology tests:', error);
      setError(`Failed to run all topology tests: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load stations on component mount
  useEffect(() => {
    loadStations();
  }, []);

  // Render comprehensive topology data
  const renderComprehensiveTopology = () => {
    if (!debugData.comprehensiveTopology) return null;

    if (debugData.comprehensiveTopology.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.comprehensiveTopology.error}</div>;
    }

    const data = debugData.comprehensiveTopology.data || debugData.comprehensiveTopology;
    
    return (
      <div>
        <h4>Station: {data.station?.name}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>Islands</div>
            <div>{data.islands?.length || 0}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>Pumps</div>
            <div>{data.pumps?.length || 0}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>Tanks</div>
            <div>{data.tanks?.length || 0}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#fce4ec', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>Products</div>
            <div>{new Set(data.tanks?.map(tank => tank.product?.id).filter(Boolean)).size || 0}</div>
          </div>
        </div>

        {/* Overview Data */}
        {data.overview && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h5>Overview Metrics</h5>
            <pre>{JSON.stringify(data.overview, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  // Render islands with pumps and tanks
  const renderIslandsWithPumpsAndTanks = () => {
    if (!debugData.islandsWithPumpsAndTanks) return null;

    if (debugData.islandsWithPumpsAndTanks.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.islandsWithPumpsAndTanks.error}</div>;
    }

    const data = debugData.islandsWithPumpsAndTanks.data;
    
    return (
      <div>
        <h4>Islands Summary</h4>
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <strong>Total Islands:</strong> {data.summary?.totalIslands} | 
          <strong> With Pumps:</strong> {data.summary?.islandsWithPumps} | 
          <strong> Without Pumps:</strong> {data.summary?.islandsWithoutPumps}
        </div>

        {data.islands?.map((island, index) => (
          <div key={island.id} style={{
            padding: '15px',
            margin: '10px 0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
              {index + 1}. {island.name} ({island.code})
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <strong>Pumps:</strong> {island.summary?.totalPumps} | 
              <strong> Connected to Tanks:</strong> {island.summary?.pumpsWithTanks} | 
              <strong> With Products:</strong> {island.summary?.pumpsWithProducts}
            </div>

            {/* Pumps List */}
            {island.pumps?.map((pump, pumpIndex) => (
              <div key={pump.id} style={{
                padding: '8px',
                margin: '5px 0',
                border: '1px solid #eee',
                borderRadius: '4px',
                backgroundColor: pump.connectionStatus === 'FULLY_CONNECTED' ? '#e8f5e8' : 
                                pump.connectionStatus === 'PARTIALLY_CONNECTED' ? '#fff3cd' : '#ffebee'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  Pump {pumpIndex + 1}: {pump.name}
                </div>
                <div>Status: <span style={{ 
                  color: pump.connectionStatus === 'FULLY_CONNECTED' ? 'green' : 
                         pump.connectionStatus === 'PARTIALLY_CONNECTED' ? 'orange' : 'red'
                }}>{pump.connectionStatus}</span></div>
                <div>Product: {pump.product?.name || 'No product'}</div>
                {pump.tank && (
                  <div>Tank: {pump.tank.name} ({pump.tank.currentVolume}L / {pump.tank.capacity}L)</div>
                )}
              </div>
            ))}

            {/* Connected Tanks */}
            {island.connectedTanks?.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>Connected Tanks:</strong> {island.connectedTanks.map(tank => tank.name).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render tanks with pumps and products
  const renderTanksWithPumpsAndProducts = () => {
    if (!debugData.tanksWithPumpsAndProducts) return null;

    if (debugData.tanksWithPumpsAndProducts.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.tanksWithPumpsAndProducts.error}</div>;
    }

    const data = debugData.tanksWithPumpsAndProducts.data;
    
    return (
      <div>
        <h4>Tanks Summary</h4>
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          <strong>Total Tanks:</strong> {data.summary?.totalTanks} | 
          <strong> Capacity:</strong> {data.summary?.totalCapacity}L | 
          <strong> Volume:</strong> {data.summary?.totalVolume}L | 
          <strong> Utilization:</strong> {(data.summary?.averageUtilization * 100).toFixed(1)}%
        </div>

        {data.tanks?.map((tank, index) => (
          <div key={tank.id} style={{
            padding: '15px',
            margin: '10px 0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
              {index + 1}. {tank.name}
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <strong>Product:</strong> {tank.product?.name || 'No product'} | 
              <strong> Capacity:</strong> {tank.capacity}L | 
              <strong> Current:</strong> {tank.currentVolume}L | 
              <strong> Utilization:</strong> {Math.round((tank.utilization || 0) * 100)}%
            </div>

            {/* Pricing Info */}
            {tank.product?.pricing && (
              <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                <strong>Pricing:</strong> 
                <div>Base Cost: ${tank.product.pricing.baseCostPrice}</div>
                <div>Min Selling: ${tank.product.pricing.minSellingPrice}</div>
                <div>Max Selling: ${tank.product.pricing.maxSellingPrice}</div>
              </div>
            )}

            {/* Connected Pumps */}
            <div style={{ marginTop: '10px' }}>
              <strong>Connected Pumps ({tank.connectedPumps?.length || 0}):</strong>
              {tank.connectedPumps?.map((pump, pumpIndex) => (
                <div key={pump.id} style={{
                  padding: '5px',
                  margin: '3px 0',
                  border: '1px solid #eee',
                  borderRadius: '3px',
                  backgroundColor: 'white'
                }}>
                  {pumpIndex + 1}. {pump.name} 
                  {pump.island && ` → Island: ${pump.island.name}`}
                  {pump.product && ` → Product: ${pump.product.name}`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render pump connections
  const renderPumpConnections = () => {
    if (!debugData.pumpConnections) return null;

    if (debugData.pumpConnections.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.pumpConnections.error}</div>;
    }

    const data = debugData.pumpConnections.data;
    
    return (
      <div>
        <h4>Pump Connections Summary</h4>
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          <strong>Total Pumps:</strong> {data.summary?.totalPumps} | 
          <strong> Fully Connected:</strong> {data.summary?.fullyConnected} | 
          <strong> Partially Connected:</strong> {data.summary?.partiallyConnected} | 
          <strong> Disconnected:</strong> {data.summary?.disconnected}
        </div>

        {data.pumps?.map((pump, index) => (
          <div key={pump.id} style={{
            padding: '12px',
            margin: '8px 0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: pump.connectionStatus === 'FULLY_CONNECTED' ? '#e8f5e8' : 
                            pump.connectionStatus === 'PARTIALLY_CONNECTED' ? '#fff3cd' : '#ffebee'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              {index + 1}. {pump.name}
            </div>
            <div>Status: <strong>{pump.connectionStatus}</strong></div>
            <div>Product: {pump.product?.name || 'No product'}</div>
            <div>Island: {pump.island?.name || 'No island'}</div>
            <div>Tank: {pump.tank?.name || 'No tank'}</div>
            {pump.product?.pricing && (
              <div>Price Range: ${pump.product.pricing.minSellingPrice} - ${pump.product.pricing.maxSellingPrice}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render product distribution
  const renderProductDistribution = () => {
    if (!debugData.productDistribution) return null;

    if (debugData.productDistribution.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.productDistribution.error}</div>;
    }

    const data = debugData.productDistribution.data;
    
    return (
      <div>
        <h4>Product Distribution</h4>
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fce4ec', borderRadius: '4px' }}>
          <strong>Total Products:</strong> {data.summary?.totalProducts} | 
          <strong> Total Capacity:</strong> {data.summary?.totalCapacity}L | 
          <strong> Total Volume:</strong> {data.summary?.totalVolume}L | 
          <strong> Total Value:</strong> ${data.summary?.totalValue?.toFixed(2)}
        </div>

        {data.products?.map((product, index) => (
          <div key={product.id} style={{
            padding: '12px',
            margin: '8px 0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
              {index + 1}. {product.name} ({product.fuelCode})
            </div>
            <div>Tanks: {product.tanks} | Pumps: {product.pumps}</div>
            <div>Capacity: {product.totalCapacity}L | Current: {product.currentVolume}L</div>
            <div>Utilization: {Math.round(product.capacityUtilization)}%</div>
            {product.pricing && (
              <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#e8f5e8', borderRadius: '3px' }}>
                <strong>Pricing:</strong> Base: ${product.pricing.baseCostPrice} | 
                Min: ${product.pricing.minSellingPrice} | 
                Max: ${product.pricing.maxSellingPrice}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render station overview
  const renderStationOverview = () => {
    if (!debugData.stationOverview) return null;

    if (debugData.stationOverview.error) {
      return <div style={{ color: 'red' }}>Error: {debugData.stationOverview.error}</div>;
    }

    const data = debugData.stationOverview.data;
    
    return (
      <div>
        <h4>Station Overview: {data.station?.name}</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.overview?.totalIslands}</div>
            <div>Islands</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.overview?.totalPumps}</div>
            <div>Pumps</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.overview?.totalTanks}</div>
            <div>Tanks</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fce4ec', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.overview?.totalProducts}</div>
            <div>Products</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h5>Capacity & Volume</h5>
            <div>Total Capacity: {data.overview?.totalCapacity}L</div>
            <div>Current Volume: {data.overview?.currentVolume}L</div>
            <div>Overall Utilization: {Math.round((data.overview?.overallUtilization || 0) * 100)}%</div>
          </div>
          
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h5>Quick Stats</h5>
            <div>Islands with Pumps: {data.quickStats?.islandsWithPumps}</div>
            <div>Tanks with Pumps: {data.quickStats?.tanksWithPumps}</div>
            <div>Connected Assets: {data.quickStats?.connectedAssets}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading topology data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏗️ Asset Topology Service Debug Island Main</h1>
      
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
          onClick={runAllTopologyTests}
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
          🚀 Run All Topology Tests
        </button>
        
        <button 
          onClick={testComprehensiveTopology}
          disabled={!selectedStation || loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedStation && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          🏗️ Comprehensive Topology
        </button>
        
        <button 
          onClick={testIslandsWithPumpsAndTanks}
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
          🏝️ Islands & Pumps
        </button>
        
        <button 
          onClick={testTanksWithPumpsAndProducts}
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
          🛢️ Tanks & Products
        </button>
        
        <button 
          onClick={testPumpConnections}
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
          ⛽ Pump Connections
        </button>
      </div>

      {/* Results Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
          {['comprehensive', 'islands', 'tanks', 'pumps', 'products', 'overview'].map(tab => (
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

        {/* Tab Content */}
        <div style={{ minHeight: '400px' }}>
          {activeTab === 'comprehensive' && renderComprehensiveTopology()}
          {activeTab === 'islands' && renderIslandsWithPumpsAndTanks()}
          {activeTab === 'tanks' && renderTanksWithPumpsAndProducts()}
          {activeTab === 'pumps' && renderPumpConnections()}
          {activeTab === 'products' && renderProductDistribution()}
          {activeTab === 'overview' && renderStationOverview()}
        </div>
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

export default AssetTopologyDebug;