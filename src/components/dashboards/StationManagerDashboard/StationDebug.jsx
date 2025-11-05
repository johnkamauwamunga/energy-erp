import React, { useEffect, useState } from 'react'
import { stationService } from '../../../services/stationService/stationService'
import { userService } from '../../../services/userService/userService'
import { supplierService } from '../../../services/supplierService/supplierService'
import { debtorService } from '../../../services/debtorService/debtorService'
import { purchaseService } from '../../../services/purchaseService/purchaseService'
import { fuelService } from '../../../services/fuelService/fuelService'
import { assetService } from '../../../services/assetService/assetService'
import { fuelOffloadService } from '../../../services/offloadService/offloadService'
import { useApp } from '../../../context/AppContext'
import { useShiftAssets } from '../common/shift/shiftClose/hooks/useShiftAssets'

const StationDebug = () => {
  const { state } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stationData, setStationData] = useState({
    assets: [],
    debtors: [],
    offloads: [],
    users: [],
    purchases: []
  })

  const companyId = state?.currentCompany?.id;
  const stationId = state?.currentStation?.id;
  const currentStation = state?.currentStation;

  // Use shift hook - only call if stationId exists
  const {
    currentShift,
    loading: shiftLoading
  } = useShiftAssets(stationId);

  const shiftId = currentShift?.id;

  // Helper function to safely get string value from object properties
  const getSafeString = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') {
      // If it's an object with name property, use that
      if (value.name) return value.name;
      // If it's an object with id, use that
      if (value.id) return String(value.id);
      // Otherwise stringify the object
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Load station-specific data - only when stationId is available
  const loadStationData = async () => {
    if (!stationId) {
      console.log("No station ID available, skipping data load");
      return;
    }

    try {
      setLoading(true)
      setError('')

      console.log("Loading data for station:", stationId);

      const [
        debtorsData,
        offloadsData,
        usersData,
        purchasesData
      ] = await Promise.all([
        debtorService.getDebtors({ stationId }).catch(err => {
          console.error('Failed to load station debtors:', err)
          return { debtors: [] }
        }),
        fuelOffloadService.getOffloadsByStation({ stationId }).catch(err => {
          console.error('Failed to load station offloads:', err)
          return { offloads: [] }
        }),
        userService.getUsers({ stationId }).catch(err => {
          console.error('Failed to load station users:', err)
          return { users: [] }
        }),
        purchaseService.getPurchases({ stationId }).catch(err => {
          console.error('Failed to load station purchases:', err)
          return { purchases: [] }
        })
      ])

      // For assets, we need to handle the 403 error - use getAssets with station filter instead
      let assetsData = { assets: [] };
      try {
        // Try to get assets for the current user's station context
        const allAssets = await assetService.getAssets();
        assetsData.assets = Array.isArray(allAssets) ? allAssets : 
                           allAssets?.data || allAssets?.assets || [];
        
        // Filter assets by station ID if we have the data
        if (assetsData.assets.length > 0) {
          assetsData.assets = assetsData.assets.filter(asset => 
            asset.stationId === stationId
          );
        }
      } catch (assetsError) {
        console.warn('Could not load station assets:', assetsError.message);
        assetsData.assets = [];
      }

      setStationData({
        assets: assetsData?.assets || [],
        debtors: debtorsData?.debtors || debtorsData?.data || debtorsData || [],
        offloads: offloadsData?.offloads || offloadsData?.data || offloadsData || [],
        users: usersData?.users || usersData?.data || usersData || [],
        purchases: purchasesData?.purchases || purchasesData?.data || purchasesData || []
      })

      console.log("Station data loaded successfully:", {
        assets: stationData.assets.length,
        debtors: stationData.debtors.length,
        offloads: stationData.offloads.length,
        users: stationData.users.length,
        purchases: stationData.purchases.length
      });

    } catch (error) {
      console.error('Failed to load station data:', error)
      setError(error.message || 'Failed to load station data')
    } finally {
      setLoading(false)
    }
  }

  const refreshAll = async () => {
    if (stationId) {
      await loadStationData()
    }
  }

  useEffect(() => {
    if (stationId) {
      console.log("Station ID detected, loading data...");
      loadStationData()
    } else {
      console.log("No station ID available");
      setStationData({
        assets: [],
        debtors: [],
        offloads: [],
        users: [],
        purchases: []
      })
    }
  }, [stationId])

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="debug-container">
        <div className="loading">Loading station debug data...</div>
      </div>
    )
  }

  return (
    <div className="debug-container" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🚀 Station Debug Dashboard</h1>
        <button 
          onClick={refreshAll}
          disabled={!stationId}
          style={{
            padding: '8px 16px',
            backgroundColor: stationId ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: stationId ? 'pointer' : 'not-allowed'
          }}
        >
          🔄 Refresh All
        </button>
      </div>

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

      <div style={{ marginBottom: '20px', color: '#666' }}>
        <div>Company ID: <strong>{companyId || 'Not set'}</strong></div>
        <div>Station ID: <strong>{stationId || 'Not set'}</strong></div>
        <div>Station Name: <strong>{currentStation?.name || 'Not set'}</strong></div>
      </div>

      {!stationId ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          color: '#856404'
        }}>
          <h3>⚠️ No Station Selected</h3>
          <p>Please select a station from the main navigation to view station-specific data.</p>
        </div>
      ) : (
        <>
          {/* Current Shift Info */}
          <div style={{ 
            padding: '15px', 
            backgroundColor: shiftId ? '#e8f5e8' : '#fff3cd',
            borderRadius: '8px',
            border: `1px solid ${shiftId ? '#c8e6c9' : '#ffeaa7'}`,
            marginBottom: '20px'
          }}>
            <h3>🕒 Current Shift</h3>
            {shiftLoading ? (
              <div>Loading shift information...</div>
            ) : shiftId ? (
              <div style={{ lineHeight: '1.8' }}>
                <div><strong>Shift ID:</strong> {currentShift.id}</div>
                <div><strong>Status:</strong> {currentShift.status || 'Active'}</div>
                <div><strong>Start Time:</strong> {currentShift.startTime ? new Date(currentShift.startTime).toLocaleString() : 'N/A'}</div>
                {currentShift.endTime && (
                  <div><strong>End Time:</strong> {new Date(currentShift.endTime).toLocaleString()}</div>
                )}
              </div>
            ) : (
              <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                ⚠️ No current shift active for this station
              </div>
            )}
          </div>

          {/* Station Summary */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h3>📊 Station Summary - {currentStation?.name}</h3>
              <div style={{ lineHeight: '1.8' }}>
                <div>📍 Location: <strong>{currentStation?.location || 'Not specified'}</strong></div>
                <div>📧 Email: <strong>{currentStation?.contactEmail || 'Not specified'}</strong></div>
                <div>📞 Phone: <strong>{currentStation?.contactPhone || 'Not specified'}</strong></div>
                <div>Status: <strong>{currentStation?.isActive ? '✅ Active' : '❌ Inactive'}</strong></div>
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '8px',
              border: '1px solid #ffeaa7'
            }}>
              <h3>📈 Station Metrics</h3>
              <div style={{ lineHeight: '1.8' }}>
                <div>🏢 Assets: <strong>{stationData.assets.length}</strong></div>
                <div>👤 Debtors: <strong>{stationData.debtors.length}</strong></div>
                <div>⛽ Offloads: <strong>{stationData.offloads.length}</strong></div>
                <div>👥 Staff: <strong>{stationData.users.length}</strong></div>
                <div>📦 Purchases: <strong>{stationData.purchases.length}</strong></div>
              </div>
            </div>
          </div>

          {/* Detailed Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

            {/* Assets Section */}
            <section style={{ 
              padding: '20px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '8px',
              border: '1px solid #c8e6c9'
            }}>
              <h2>🏢 Station Assets ({stationData.assets.length})</h2>
              {stationData.assets.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {stationData.assets.slice(0, 10).map((asset, index) => (
                    <div key={asset.id} style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {index + 1}. {getSafeString(asset.name, `Asset ${asset.id}`)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Type: {getSafeString(asset.type)} | Status: {getSafeString(asset.status)}
                      </div>
                      {asset.description && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                          {getSafeString(asset.description)}
                        </div>
                      )}
                    </div>
                  ))}
                  {stationData.assets.length > 10 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      ... and {stationData.assets.length - 10} more assets
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No assets found for this station
                </div>
              )}
            </section>

            {/* Debtors Section */}
            <section style={{ 
              padding: '20px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '8px',
              border: '1px solid #bbdefb'
            }}>
              <h2>👤 Station Debtors ({stationData.debtors.length})</h2>
              {stationData.debtors.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {stationData.debtors.slice(0, 10).map((debtor, index) => (
                    <div key={debtor.id} style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {index + 1}. {getSafeString(debtor.name)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        📞 {getSafeString(debtor.phone)} | 📧 {getSafeString(debtor.email, 'No email')}
                      </div>
                      <div style={{ fontSize: '14px', color: '#d32f2f', marginTop: '5px' }}>
                        💰 Total Debt: {formatCurrency(debtor.totalDebt)} | 
                        📊 Transactions: {debtor.totalOutstandingTransactions || 0}
                      </div>
                    </div>
                  ))}
                  {stationData.debtors.length > 10 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      ... and {stationData.debtors.length - 10} more debtors
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No debtors found for this station
                </div>
              )}
            </section>

            {/* Offloads Section */}
            <section style={{ 
              padding: '20px', 
              backgroundColor: '#f3e5f5', 
              borderRadius: '8px',
              border: '1px solid #e1bee7'
            }}>
              <h2>⛽ Fuel Offloads ({stationData.offloads.length})</h2>
              {stationData.offloads.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {stationData.offloads.slice(0, 10).map((offload, index) => (
                    <div key={offload.id} style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {index + 1}. Offload #{offload.id?.slice(-8) || 'N/A'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Product: {getSafeString(offload.product)} | 
                        Quantity: {offload.quantity || 0}L
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                        Date: {offload.createdAt ? new Date(offload.createdAt).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                  ))}
                  {stationData.offloads.length > 10 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      ... and {stationData.offloads.length - 10} more offloads
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No fuel offloads found for this station
                </div>
              )}
            </section>

            {/* Staff Section */}
            <section style={{ 
              padding: '20px', 
              backgroundColor: '#e0f2f1', 
              borderRadius: '8px',
              border: '1px solid #b2dfdb'
            }}>
              <h2>👥 Station Staff ({stationData.users.length})</h2>
              {stationData.users.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {stationData.users.slice(0, 10).map((user, index) => (
                    <div key={user.id} style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {index + 1}. {getSafeString(user.name || user.username)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        📧 {getSafeString(user.email)} | 📞 {getSafeString(user.phone, 'No phone')}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                        Role: {getSafeString(user.role)} | Status: {user.isActive ? '✅ Active' : '❌ Inactive'}
                      </div>
                    </div>
                  ))}
                  {stationData.users.length > 10 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      ... and {stationData.users.length - 10} more staff
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No staff found for this station
                </div>
              )}
            </section>

            {/* Purchases Section */}
            <section style={{ 
              padding: '20px', 
              backgroundColor: '#fff8e1', 
              borderRadius: '8px',
              border: '1px solid #ffecb3'
            }}>
              <h2>📦 Station Purchases ({stationData.purchases.length})</h2>
              {stationData.purchases.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {stationData.purchases.slice(0, 10).map((purchase, index) => (
                    <div key={purchase.id} style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {index + 1}. Purchase #{purchase.id?.slice(-8) || 'N/A'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Amount: {formatCurrency(purchase.totalAmount)} | 
                        Status: <span style={{ 
                          color: purchase.status === 'completed' ? '#2e7d32' : 
                                 purchase.status === 'pending' ? '#f57c00' : '#757575'
                        }}>{getSafeString(purchase.status, 'unknown')}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                        Date: {purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                  ))}
                  {stationData.purchases.length > 10 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      ... and {stationData.purchases.length - 10} more purchases
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No purchases found for this station
                </div>
              )}
            </section>

          </div>
        </>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  )
}

export default StationDebug