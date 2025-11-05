import React, { useEffect, useState } from 'react'
import { stationService } from '../../../services/stationService/stationService'
import { userService } from '../../../services/userService/userService'
import { supplierService } from '../../../services/supplierService/supplierService'
import { debtorService } from '../../../services/debtorService/debtorService'
import { purchaseService } from '../../../services/purchaseService/purchaseService'
import { fuelService } from '../../../services/fuelService/fuelService'
import { useApp } from '../../../context/AppContext'

const Debug = () => {
  const { state } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [subTypes, setSubTypes] = useState([])
  const [purchases, setPurchases] = useState([])
  const [stats, setStats] = useState({})
  const [suppliers, setSuppliers] = useState([])
  const [debts, setDebts] = useState(null)
  const [debtors, setDebtors] = useState([])
  const [pagination, setPagination] = useState({})
  const [allUsers, setAllUsers] = useState([])
  const [stations, setStations] = useState([])

  const companyId = state?.currentCompany?.id

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [productsData, categoriesData, subTypesData] = await Promise.all([
        fuelService.getFuelProducts(),
        fuelService.getFuelCategories(),
        fuelService.getFuelSubTypes()
      ])

      setProducts(productsData?.products || productsData || [])
      setCategories(categoriesData || [])
      setSubTypes(subTypesData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      setError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadPurchases = async () => {
    try {
      const purchasesData = await purchaseService.getPurchases()
      const purchasesArray = purchasesData.purchases || purchasesData.data || purchasesData || []
      setPurchases(purchasesArray)
    } catch (error) {
      console.error('Failed to load purchases:', error)
      setPurchases([])
    }
  }

  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getSuppliers(true)
      const suppliersArray = suppliersData.suppliers || suppliersData.data || suppliersData || []
      setSuppliers(suppliersArray)
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      setSuppliers([])
    }
  }

  const loadStations = async () => {
    try {
      const stationsData = await stationService.getCompanyStations();
      console.log("stations herein",stationsData)
      const stationsArray = stationsData.stations || stationsData.data || stationsData || []
      setStations(stationsArray)
    } catch (error) {
      console.error('Failed to load stations:', error)
      setStations([])
    }
  }

  const fetchDebts = async () => {
    setLoading(true)
    try {
      const result = await debtorService.getDebtors()
      const debtorsData = result.debtors || result.data || result || []
      
      console.log("📦 Debts with debtors response:", debtorsData)
      setDebtors(debtorsData)

      // Extract all debt transactions from debtors
      const allDebts = []
      
      debtorsData.forEach(debtor => {
        if (debtor.transactions) {
          debtor.transactions.forEach(transaction => {
            if (transaction.type === 'DEBT_INCURRED') {
              allDebts.push({
                ...transaction,
                debtor: debtor,
                station: transaction.stationDebtorAccount?.station
              })
            }
          })
        }
        
        if (debtor.stationAccounts) {
          debtor.stationAccounts.forEach(account => {
            if (account.transactions) {
              account.transactions.forEach(transaction => {
                if (transaction.type === 'DEBT_INCURRED') {
                  allDebts.push({
                    ...transaction,
                    debtor: debtor,
                    station: account.station
                  })
                }
              })
            }
          })
        }
      })
      
      setDebts(allDebts)
      setPagination({
        page: 1,
        limit: 10,
        totalCount: allDebts.length,
        totalPages: Math.ceil(allDebts.length / 10)
      })
      
    } catch (error) {
      console.error('❌ Failed to fetch debts:', error)
      setDebts([])
      setDebtors([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await userService.getUsers()
      setAllUsers(response)
    } catch (error) {
      console.error('❌ Failed to fetch users:', error)
    }
  }

  const refreshAll = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadData(),
        loadPurchases(),
        loadSuppliers(),
        loadStations(),
        fetchDebts(),
        fetchUsers()
      ])
    } catch (error) {
      console.error('Failed to refresh all data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
  }, [])

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
        <div className="loading">Loading debug data...</div>
      </div>
    )
  }

  return (
    <div className="debug-container" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🚀 System Debug Dashboard</h1>
        <button 
          onClick={refreshAll}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
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

      <div style={{ marginBottom: '10px', color: '#666' }}>
        Company ID: <strong>{companyId || 'Not set'}</strong>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Summary Cards */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>📊 System Summary</h3>
          <div style={{ lineHeight: '1.8' }}>
            <div>🏢 Companies: <strong>1</strong></div>
            <div>⛽ Stations: <strong>{stations.length}</strong></div>
            <div>👥 Users: <strong>{allUsers.length}</strong></div>
            <div>🛒 Products: <strong>{products.length}</strong></div>
            <div>📦 Purchases: <strong>{purchases.length}</strong></div>
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <h3>💰 Financial Summary</h3>
          <div style={{ lineHeight: '1.8' }}>
            <div>👤 Debtors: <strong>{debtors.length}</strong></div>
            <div>📝 Debt Records: <strong>{debts?.length || 0}</strong></div>
            <div>🏪 Suppliers: <strong>{suppliers.length}</strong></div>
            <div>📋 Categories: <strong>{categories.length}</strong></div>
            <div>🏷️ Sub-types: <strong>{subTypes.length}</strong></div>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

        {/* Debtors Section */}
        <section style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '8px',
          border: '1px solid #c8e6c9'
        }}>
          <h2>👤 Debtors ({debtors.length})</h2>
          {debtors.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {debtors.slice(0, 10).map((debtor, index) => (
                <div key={debtor.id} style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {index + 1}. {debtor.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    📞 {debtor.phone} | 📧 {debtor.email || 'No email'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#d32f2f', marginTop: '5px' }}>
                    💰 Total Debt: {formatCurrency(debtor.totalDebt)} | 
                    📊 Transactions: {debtor.totalOutstandingTransactions || 0}
                  </div>
                  {debtor.contactPerson && (
                    <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                      Contact: {debtor.contactPerson}
                    </div>
                  )}
                </div>
              ))}
              {debtors.length > 10 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  ... and {debtors.length - 10} more debtors
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No debtors found
            </div>
          )}
        </section>

        {/* Suppliers Section */}
        <section style={{ 
          padding: '20px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <h2>🏪 Suppliers ({suppliers.length})</h2>
          {suppliers.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {suppliers.slice(0, 10).map((supplier, index) => (
                <div key={supplier.id} style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {index + 1}. {supplier.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    📞 {supplier.phone} | 📧 {supplier.email || 'No email'}
                  </div>
                  {supplier.contactPerson && (
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      Contact: {supplier.contactPerson}
                    </div>
                  )}
                </div>
              ))}
              {suppliers.length > 10 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  ... and {suppliers.length - 10} more suppliers
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No suppliers found
            </div>
          )}
        </section>

        {/* Products Section */}
        <section style={{ 
          padding: '20px', 
          backgroundColor: '#f3e5f5', 
          borderRadius: '8px',
          border: '1px solid #e1bee7'
        }}>
          <h2>🛒 Products ({products.length})</h2>
          {products.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {products.slice(0, 10).map((product, index) => (
                <div key={product.id} style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {index + 1}. {product.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Category: {product.category || 'N/A'} | 
                    Price: {formatCurrency(product.price)}
                  </div>
                  {product.description && (
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                      {product.description}
                    </div>
                  )}
                </div>
              ))}
              {products.length > 10 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  ... and {products.length - 10} more products
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No products found
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
          <h2>📦 Purchases ({purchases.length})</h2>
          {purchases.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {purchases.slice(0, 10).map((purchase, index) => (
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
                    }}>{purchase.status || 'unknown'}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                    Date: {new Date(purchase.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {purchases.length > 10 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  ... and {purchases.length - 10} more purchases
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No purchases found
            </div>
          )}
        </section>

        {/* Users Section */}
        <section style={{ 
          padding: '20px', 
          backgroundColor: '#e0f2f1', 
          borderRadius: '8px',
          border: '1px solid #b2dfdb'
        }}>
          <h2>👥 Users ({allUsers.length})</h2>
          {allUsers.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {allUsers.slice(0, 10).map((user, index) => (
                <div key={user.id} style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {index + 1}. {user.name || user.username}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    📧 {user.email} | 📞 {user.phone || 'No phone'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                    Role: {user.role || 'N/A'} | Status: {user.isActive ? '✅ Active' : '❌ Inactive'}
                  </div>
                </div>
              ))}
              {allUsers.length > 10 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  ... and {allUsers.length - 10} more users
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No users found
            </div>
          )}
        </section>

        {/* Stations Section */}
        <section style={{ 
          padding: '20px', 
          backgroundColor: '#fce4ec', 
          borderRadius: '8px',
          border: '1px solid #f8bbd9'
        }}>
          <h2>⛽ Stations ({stations.length})</h2>
          {stations.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {stations.slice(0, 10).map((station, index) => (
                <div key={station.id} style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {index + 1}. {station.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    📍 {station.location || 'No location'} | 
                    Status: {station.isActive ? '✅ Active' : '❌ Inactive'}
                  </div>
                  {station.contactEmail && (
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                      📧 {station.contactEmail}
                    </div>
                  )}
                </div>
              ))}
              {stations.length > 10 && (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  ... and {stations.length - 10} more stations
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No stations found
            </div>
          )}
        </section>

      </div>

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

export default Debug