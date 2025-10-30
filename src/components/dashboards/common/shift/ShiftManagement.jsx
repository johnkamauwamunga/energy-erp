// components/ShiftManagement/ShiftManagement.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MultiTable } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import { shiftService } from '../../../../services/shiftService/shiftService';
import ShiftCreationWizard from './shiftOpen/ShiftCreationWizard';
import ShiftClosingWizard from './shiftClose/ShiftClosingWizard';

const ShiftManagement = () => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const userRole = currentUser?.role || 'ATTENDANT';
  const userCompanyId = currentUser?.companyId || state.currentCompany?.id;
  const userStationId = currentUser?.stationId || state.currentStation?.id;

  // State management
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasOpenShift, setHasOpenShift] = useState(false);
  const [openShiftData, setOpenShiftData] = useState(null);
  const [cumulativeData, setCumulativeData] = useState(null);

  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  const [wizardMode, setWizardMode] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);

  // ========== EVENT HANDLERS - DEFINED FIRST ==========

  // Handle open shift
  const handleOpenShift = () => {
    console.log("🔄 Opening shift wizard");
    setWizardMode('open');
  };

  // Handle close shift
  const handleCloseShift = () => {
    console.log("🔄 Handling close shift, openShiftData:", openShiftData);
    if (openShiftData) {
      setSelectedShift(openShiftData);
      setWizardMode('close');
    } else {
      console.error("❌ No open shift data available to close");
      // Try to refetch open shift data
      checkOpenShift();
    }
  };

  // Handle shift creation success
  const handleShiftCreated = () => {
    console.log("✅ Shift created successfully");
    setWizardMode(null);
    fetchShifts(); // Refresh data
  };

  // Handle shift closing success
  const handleShiftClosed = () => {
    console.log("✅ Shift closed successfully");
    setWizardMode(null);
    setSelectedShift(null);
    setHasOpenShift(false);
    setOpenShiftData(null);
    fetchShifts(); // Refresh data
  };

  // Handle cancel wizard
  const handleCancelWizard = () => {
    console.log("❌ Wizard cancelled");
    setWizardMode(null);
    setSelectedShift(null);
  };

  // Determine scope based on user role
  const getScopeParams = useCallback(() => {
    console.log('🔑 Determining scope for role:', userRole);
    
    switch (userRole) {
      case 'SUPER_ADMIN':
        return { scope: 'all' };
      
      case 'COMPANY_ADMIN':
        return { 
          scope: 'company', 
          companyId: userCompanyId 
        };
      
      case 'STATION_MANAGER':
      case 'SUPERVISOR':
      case 'LINES_MANAGER':
        return { 
          scope: 'station', 
          stationId: userStationId 
        };
      
      case 'ATTENDANT':
        return { 
          scope: 'attendant', 
          attendantId: currentUser?.id 
        };
      
      default:
        return { scope: 'station', stationId: userStationId };
    }
  }, [userRole, currentUser, userCompanyId, userStationId]);

  // Check for open shift in current station
  const checkOpenShift = useCallback(async (shiftsData = null) => {
    if (!['STATION_MANAGER', 'SUPERVISOR', 'LINES_MANAGER'].includes(userRole)) {
      return;
    }

    const stationId = userStationId;
    if (!stationId) {
      console.log('🚫 No station ID for open shift check');
      return;
    }

    try {
      console.log('🔍 Checking open shift for station:', stationId);
      
      // Method 1: Try API first
      try {
        const result = await shiftService.getCurrentOpenShift(stationId);
        console.log("🔍 Open shift API result:", result);
        
        if (result && result.data) {
          console.log('✅ Open shift found via API:', result.data.shiftNumber);
          setHasOpenShift(true);
          setOpenShiftData(result.data);
          return;
        } else {
          console.log('✅ No open shift found via API');
          setHasOpenShift(false);
          setOpenShiftData(null);
        }
      } catch (apiError) {
        console.log('⚠️ API check failed, falling back to local check:', apiError);
      }

      // Method 2: Check local shifts data
      const shiftsToCheck = shiftsData || shifts;
      const openShift = shiftsToCheck.find(shift => 
        shift.stationId === stationId && 
        (shift.status === 'OPEN' || shift.status === 'ACTIVE')
      );

      if (openShift) {
        console.log('✅ Open shift found in local data:', openShift.shiftNumber);
        setHasOpenShift(true);
        setOpenShiftData(openShift);
      } else {
        console.log('✅ No open shift found');
        setHasOpenShift(false);
        setOpenShiftData(null);
      }

    } catch (err) {
      console.error('❌ Failed to check open shift:', err);
      setHasOpenShift(false);
      setOpenShiftData(null);
    }
  }, [userRole, userStationId, shifts]);

  // Fetch cumulative shifts with assets
  useEffect(() => {
    const fetchCumulativeShifts = async() => {
      try {
        const response = await shiftService.getShiftsByStationWithAssets(userStationId);
        console.log("📊 Cumulative shifts data with assets:", response);
        setCumulativeData(response);
        
        // Also set the shifts for the table
        if (response?.shifts) {
          setShifts(response?.shifts);
        }

        // Check for open shift separately
        await checkOpenShift(response?.shifts);

      } catch (e) {
        console.log("❌ Error fetching cumulative shifts:", e);
        setError(e.message || 'Failed to load shift data');
      }
    }

    if (userStationId) {
      fetchCumulativeShifts();
    }
  }, [userStationId, checkOpenShift]);

  // Fetch shifts based on user role (fallback method)
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      const queryParams = {
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: 1,
        limit: 1000
      };

      const scopeParams = getScopeParams();
      console.log('📡 Fetching shifts with scope:', scopeParams);

      switch (scopeParams.scope) {
        case 'all':
          response = await shiftService.getAllShiftsWithAssets(queryParams);
          break;

        case 'company':
          response = await shiftService.getShiftsByCompanyWithAssets(
            scopeParams.companyId,
            queryParams
          );
          break;

        case 'station':
          response = await shiftService.getShiftsByStationWithAssets(
            scopeParams.stationId,
            queryParams
          );
          break;

        case 'attendant':
          response = await shiftService.getShiftsByAttendant(
            scopeParams.attendantId,
            queryParams
          );
          break;

        default:
          response = { data: { shifts: [] } };
      }

      // Handle different response structures
      const shiftsData = response.shifts || response.data?.shifts || [];
      console.log('📊 Fetched shifts with assets:', shiftsData);
      setShifts(shiftsData);

      // Check for open shift (only for station-level roles)
      if (['STATION_MANAGER', 'SUPERVISOR', 'LINES_MANAGER'].includes(userRole)) {
        await checkOpenShift(shiftsData);
      }

    } catch (err) {
      console.error('❌ Failed to fetch shifts:', err);
      setError(err.message || 'Failed to load shift data');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [getScopeParams, userRole, filters, checkOpenShift]);

  // Enhanced shift data processing with asset relationships and null safety
  const processShiftData = useCallback((shift) => {
    // Extract asset relationships
    const assetChain = shiftService.extractAssetChain({ data: { shift } });
    const assetSummary = shiftService.getAssetSummary({ data: { shift } });

    // Safely handle collections data
    const collections = shift.shiftCollection ? {
      total: shift.shiftCollection.totalCollected || 0,
      cash: shift.shiftCollection.cashAmount || 0,
      mobileMoney: shift.shiftCollection.mobileMoneyAmount || 0,
      visa: shift.shiftCollection.visaAmount || 0,
      mastercard: shift.shiftCollection.mastercardAmount || 0,
      debt: shift.shiftCollection.debtAmount || 0,
      other: shift.shiftCollection.otherAmount || 0,
      expectedAmount: shift.shiftCollection.expectedAmount || 0,
      variance: shift.shiftCollection.variance || 0,
      variancePercentage: shift.shiftCollection.variancePercentage || 0
    } : null;

    // Safely handle sales data
    const sales = shift.sales?.[0] ? {
      totalRevenue: shift.sales[0].totalRevenue || 0,
      fuelRevenue: shift.sales[0].totalFuelRevenue || 0,
      nonFuelRevenue: shift.sales[0].totalNonFuelRevenue || 0,
      totalQuantity: shift.sales[0].totalQuantity || 0,
      productSales: shift.productSale || []
    } : null;

    // Safely handle reconciliation data
    const reconciliation = shift.reconciliation ? {
      ...shift.reconciliation,
      variance: shift.reconciliation.variance || 0,
      variancePct: shift.reconciliation.variancePct || 0,
      expectedQty: shift.reconciliation.expectedQty || 0,
      actualQty: shift.reconciliation.actualQty || 0
    } : null;

    return {
      id: shift.id,
      shiftNumber: shift.shiftNumber,
      status: shift.status,
      startTime: shift.startTime,
      endTime: shift.endTime,
      supervisor: shift.supervisor,
      station: shift.station,
      
      // Enhanced collections data with null safety
      collections: collections,
      
      // Enhanced tanks data with asset relationships
      tanks: shift.dipReadings?.map(reading => {
        const tank = reading.tank;
        const asset = tank?.asset;
        
        return {
          tankId: reading.tankId,
          tankName: asset?.name || `Tank ${reading.tankId?.slice(-4) || 'N/A'}`,
          product: tank?.product,
          capacity: tank?.capacity || 0,
          currentVolume: reading.volume || 0,
          dipValue: reading.dipValue || 0,
          temperature: reading.temperature || 0,
          waterLevel: reading.waterLevel || 0,
          asset: asset,
          readings: [reading]
        };
      }) || [],
      
      // Enhanced pumps data with asset relationships
      pumps: shift.meterReadings?.reduce((acc, reading) => {
        const pump = reading.pump;
        const existingPump = acc.find(p => p.pumpId === reading.pumpId);
        
        if (!existingPump) {
          const asset = pump?.asset;
          const tank = pump?.tank;
          const island = pump?.island;
          
          const startReading = shift.meterReadings?.find(r => 
            r.pumpId === reading.pumpId && r.readingType === 'START'
          );
          const endReading = shift.meterReadings?.find(r => 
            r.pumpId === reading.pumpId && r.readingType === 'END'
          );
          
          acc.push({
            pumpId: reading.pumpId,
            pumpName: asset?.name || `Pump ${reading.pumpId?.slice(-4) || 'N/A'}`,
            product: pump?.product,
            island: island,
            tank: tank,
            asset: asset,
            totalVolume: endReading && startReading ? 
              (endReading.litersDispensed || (endReading.electricMeter - startReading.electricMeter)) : 0,
            salesValue: endReading?.salesValue || 0,
            unitPrice: endReading?.unitPrice || 0,
            readings: shift.meterReadings?.filter(r => r.pumpId === reading.pumpId) || []
          });
        }
        return acc;
      }, []) || [],
      
      // Enhanced attendants data
      attendants: shift.shiftIslandAttendant?.map(assignment => ({
        id: assignment.attendantId,
        name: `${assignment.attendant?.firstName || ''} ${assignment.attendant?.lastName || ''}`.trim() || 'Unknown',
        email: assignment.attendant?.email,
        island: assignment.island,
        assignmentType: assignment.assignmentType,
        assignedAt: assignment.createdAt
      })) || [],
      
      // Enhanced sales data with null safety
      sales: sales,
      
      // Enhanced reconciliation data
      reconciliation: reconciliation,
      
      // Asset relationships
      assetChain: assetChain,
      assetSummary: assetSummary,
      
      // Additional data from the shift
      shiftOpeningCheck: shift.shiftOpeningCheck?.[0],
      nonFuelStocks: shift.nonFuelStocks || [],
      islandCollections: shift.islandCollections || []
    };
  }, []);

  // Process shift data for the table
  const tableData = useMemo(() => {
    return shifts.map(shift => processShiftData(shift));
  }, [shifts, processShiftData]);

  // Enhanced columns with asset information and null safety
  const columns = [
    {
      key: 'shift-number',
      header: 'Shift #',
      accessor: 'shiftNumber',
      className: 'font-medium text-gray-900'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'OPEN' ? 'bg-green-100 text-green-800' :
          value === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
          value === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'supervisor',
      header: 'Supervisor',
      accessor: 'supervisor',
      render: (value) => value ? `${value.firstName} ${value.lastName}` : 'N/A'
    },
    // Show station column for SUPER_ADMIN and COMPANY_ADMIN
    ...(userRole === 'SUPER_ADMIN' || userRole === 'COMPANY_ADMIN' ? [{
      key: 'station',
      header: 'Station',
      accessor: 'station',
      render: (value) => value?.name || 'N/A'
    }] : []),
    {
      key: 'date',
      header: 'Date',
      accessor: 'startTime',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'assets',
      header: 'Assets',
      accessor: 'assetSummary',
      render: (value) => (
        <div className="text-blue-600 cursor-pointer hover:underline font-medium">
          {value ? `${value.totalPumps || 0}P ${value.totalTanks || 0}T` : '0P 0T'}
        </div>
      ),
      clickable: true,
      modalType: 'assets',
      modalTitle: (rowData) => `Shift ${rowData.shiftNumber} - Asset Overview`,
      modalDataAccessor: 'assetChain'
    },
    {
      key: 'collections',
      header: 'Collections',
      accessor: 'collections.total',
      render: (value, rowData) => (
        <div 
          className="text-purple-600 cursor-pointer hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          KES {value ? value.toLocaleString() : '0'}
          {rowData.collections?.variance !== undefined && rowData.collections.variance !== 0 && (
            <span className={`ml-1 text-xs ${rowData.collections.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rowData.collections.variance > 0 ? '+' : ''}{rowData.collections.variance}
            </span>
          )}
        </div>
      ),
      clickable: true,
      modalType: 'collections',
      modalTitle: (rowData) => `Shift ${rowData.shiftNumber} - Collections`,
      modalDataAccessor: 'collections'
    },
    {
      key: 'sales',
      header: 'Sales',
      accessor: 'sales.totalRevenue',
      render: (value, rowData) => (
        <div className="text-green-600 cursor-pointer hover:underline font-medium">
          KES {value ? value.toLocaleString() : '0'}
        </div>
      ),
      clickable: true,
      modalType: 'sales',
      modalTitle: (rowData) => `Shift ${rowData.shiftNumber} - Sales Summary`,
      modalDataAccessor: 'sales'
    },
    {
      key: 'attendants',
      header: 'Staff',
      accessor: 'attendants',
      render: (value) => (
        <div className="text-orange-600 cursor-pointer hover:underline font-medium">
          {value?.length || 0} staff
        </div>
      ),
      clickable: true,
      modalType: 'attendants',
      modalTitle: 'Attendant Assignments',
      modalDataAccessor: 'attendants'
    }
  ];

  // Enhanced expanded row content with asset data and null safety
  const renderExpandedContent = (rowData) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
      {/* Shift Overview */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">Shift Overview</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Number:</span>
            <span className="font-medium">{rowData.shiftNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Supervisor:</span>
            <span className="font-medium">
              {rowData.supervisor ? `${rowData.supervisor.firstName} ${rowData.supervisor.lastName}` : 'N/A'}
            </span>
          </div>
          {(userRole === 'SUPER_ADMIN' || userRole === 'COMPANY_ADMIN') && (
            <div className="flex justify-between">
              <span className="text-gray-600">Station:</span>
              <span className="font-medium">{rowData.station?.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Start Time:</span>
            <span className="font-medium">{new Date(rowData.startTime).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">End Time:</span>
            <span className="font-medium">
              {rowData.endTime ? new Date(rowData.endTime).toLocaleString() : 'Not ended'}
            </span>
          </div>
          {rowData.shiftOpeningCheck && (
            <div className="flex justify-between">
              <span className="text-gray-600">Opening Status:</span>
              <span className={`font-medium ${
                rowData.shiftOpeningCheck.checksPassed ? 'text-green-600' : 'text-red-600'
              }`}>
                {rowData.shiftOpeningCheck.checksPassed ? '✅ Passed' : '❌ Failed'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Asset Summary */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">Asset Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{rowData.tanks?.length || 0}</div>
            <div className="text-sm text-blue-600">Tanks</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{rowData.pumps?.length || 0}</div>
            <div className="text-sm text-orange-600">Pumps</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{rowData.attendants?.length || 0}</div>
            <div className="text-sm text-green-600">Attendants</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              {rowData.assetSummary?.products?.length || 0}
            </div>
            <div className="text-sm text-purple-600">Products</div>
          </div>
        </div>
        
        {/* Asset Connections */}
        {rowData.assetChain?.connections && rowData.assetChain.connections.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium text-gray-700 mb-2">Asset Connections:</h5>
            <div className="space-y-1 text-sm">
              {rowData.assetChain.connections.slice(0, 3).map((conn, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  {conn.source?.name || 'Unknown'} → {conn.target?.name || 'Unknown'}
                </div>
              ))}
              {rowData.assetChain.connections.length > 3 && (
                <div className="text-gray-500 text-xs">
                  +{rowData.assetChain.connections.length - 3} more connections
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">Financial Summary</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Sales:</span>
            <span className="font-medium text-green-600">
              KES {rowData.sales?.totalRevenue?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Collections:</span>
            <span className="font-medium text-purple-600">
              KES {rowData.collections?.total?.toLocaleString() || '0'}
            </span>
          </div>
          {rowData.collections && rowData.collections.variance !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Collection Variance:</span>
              <span className={`font-medium ${
                rowData.collections.variance > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {rowData.collections.variance > 0 ? '+' : ''}
                KES {rowData.collections.variance?.toLocaleString() || '0'}
              </span>
            </div>
          )}
          {rowData.reconciliation && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fuel Variance:</span>
              <span className={`font-medium ${
                rowData.reconciliation.variance > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {rowData.reconciliation.variance > 0 ? '+' : ''}
                {rowData.reconciliation.variance}L
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 space-y-2">
          <button 
            className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 flex items-center"
            onClick={() => console.log('View full report', rowData)}
          >
            <span className="mr-2">📊</span>
            View Full Shift Report
          </button>
          <button 
            className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg text-sm text-green-700 flex items-center"
            onClick={() => console.log('Export data', rowData)}
          >
            <span className="mr-2">📥</span>
            Export Shift Data
          </button>
          {/* Only show Close Shift button for station-level roles on open shifts in their station */}
          {['STATION_MANAGER', 'SUPERVISOR', 'LINES_MANAGER'].includes(userRole) && 
           rowData.status === 'OPEN' && 
           rowData.station?.id === userStationId && (
            <button 
              className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg text-sm text-red-700 flex items-center"
              onClick={() => {
                console.log("🔄 Close Shift clicked from expanded content");
                setSelectedShift(rowData);
                setWizardMode('close');
              }}
            >
              <span className="mr-2">🔒</span>
              Close Shift
            </button>
          )}
          {rowData.status === 'CLOSED' && (
            <button 
              className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm text-purple-700 flex items-center"
              onClick={() => console.log('Reconcile', rowData)}
            >
              <span className="mr-2">⚖️</span>
              View Reconciliation
            </button>
          )}
        </div>
      </div>

      {/* Detailed Asset Information */}
      <div className="lg:col-span-2 xl:col-span-3 space-y-6">
        {/* Pumps Summary */}
        {rowData.pumps && rowData.pumps.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 border-b pb-2">Pump Operations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rowData.pumps.slice(0, 6).map((pump, index) => (
                <div key={pump.pumpId || index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-800">{pump.pumpName}</h5>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {pump.product?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volume:</span>
                      <span className="font-medium">{(pump.totalVolume || 0).toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-medium text-green-600">
                        KES {(pump.salesValue || 0).toLocaleString()}
                      </span>
                    </div>
                    {pump.island && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Island:</span>
                        <span className="font-medium">{pump.island.code}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {rowData.pumps.length > 6 && (
              <div className="text-center text-gray-500 text-sm">
                +{rowData.pumps.length - 6} more pumps
              </div>
            )}
          </div>
        )}

        {/* Tanks Summary */}
        {rowData.tanks && rowData.tanks.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 border-b pb-2">Tank Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rowData.tanks.slice(0, 6).map((tank, index) => (
                <div key={tank.tankId || index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-800">{tank.tankName}</h5>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {tank.product?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Volume:</span>
                      <span className="font-medium">{(tank.currentVolume || 0).toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{(tank.capacity || 0).toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dip Reading:</span>
                      <span className="font-medium">{(tank.dipValue || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {rowData.tanks.length > 6 && (
              <div className="text-center text-gray-500 text-sm">
                +{rowData.tanks.length - 6} more tanks
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ========== WIZARD MODES ==========
  
  if (wizardMode === 'open') {
    return (
      <ShiftCreationWizard
        onClose={handleCancelWizard}
        onSuccess={handleShiftCreated}
        stationId={userStationId}
        currentUser={currentUser}
      />
    );
  }

  if (wizardMode === 'close') {
    console.log("🔄 Rendering ShiftClosingWizard with data:", selectedShift || openShiftData);
    return (
      <ShiftClosingWizard
        onClose={handleCancelWizard}
        onSuccess={handleShiftClosed}
        shift={selectedShift || openShiftData}
        stationId={userStationId}
        currentUser={currentUser}
      />
    );
  }

  // ========== NORMAL TABLE MODE ==========

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-lg mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Shift Data</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchShifts}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'SUPER_ADMIN' && 'All shifts across all companies and stations'}
              {userRole === 'COMPANY_ADMIN' && `All shifts in your company (${state.currentCompany?.name})`}
              {['STATION_MANAGER', 'SUPERVISOR', 'LINES_MANAGER'].includes(userRole) && `Shifts for ${state.currentStation?.name}`}
              {userRole === 'ATTENDANT' && 'Your assigned shifts'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {/* Status Filter */}
            <select 
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Open/Close Shift buttons - Only for station-level roles */}
            {['STATION_MANAGER', 'SUPERVISOR', 'LINES_MANAGER'].includes(userRole) && (
              <div className="flex items-center space-x-3">
                {/* Always show Open Shift button */}
                <button
                  onClick={handleOpenShift}
                  disabled={hasOpenShift} // Disable if there's already an open shift
                  className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                    hasOpenShift 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <span className="mr-2">➕</span>
                  Open Shift
                </button>

                {/* Show Close Shift button only when there's an open shift */}
                {hasOpenShift && (
                  <button
                    onClick={() => {
                      console.log("🔄 Close Shift clicked from header, hasOpenShift:", hasOpenShift, "openShiftData:", openShiftData);
                      handleCloseShift();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center transition-colors"
                  >
                    <span className="mr-2">🔒</span>
                    Close Shift
                  </button>
                )}
              </div>
            )}
            
            <button
              onClick={fetchShifts}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors disabled:opacity-50"
            >
              <span className="mr-2">🔄</span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Open Shift Alert - Only for station-level roles */}
      {['STATION_MANAGER', 'SUPERVISOR', 'LINES_MANAGER'].includes(userRole) && 
       hasOpenShift && openShiftData && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-600 text-lg mr-3">⚠️</div>
              <div className="flex-1">
                <h3 className="text-yellow-800 font-medium">Open Shift Active</h3>
                <p className="text-yellow-700 text-sm">
                  Shift #{openShiftData.shiftNumber} is currently open. 
                  Started at {new Date(openShiftData.startTime).toLocaleString()}
                  {openShiftData.supervisor && ` by ${openShiftData.supervisor.firstName} ${openShiftData.supervisor.lastName}`}
                </p>
              </div>
              <button
                onClick={() => {
                  console.log("🔄 Close Shift clicked from alert");
                  handleCloseShift();
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Close Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {!loading && shifts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{shifts.length}</div>
            <div className="text-sm text-gray-600">Total Shifts</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {shifts.filter(s => s.status === 'OPEN' || s.status === 'ACTIVE').length}
            </div>
            <div className="text-sm text-gray-600">Active Shifts</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              KES {shifts.reduce((sum, shift) => sum + (shift.shiftCollection?.totalCollected || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Collections</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {shifts.reduce((sum, shift) => sum + (shift.meterReadings?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Readings</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <MultiTable
        columns={columns}
        data={tableData}
        expandable={true}
        renderExpandedContent={renderExpandedContent}
        paginate={true}
        pageSize={10}
        responsiveBreakpoint="md"
        className="shadow-lg border-0"
        headerClass="bg-gradient-to-r from-blue-50 to-indigo-50"
        rowClass="hover:bg-blue-50 transition-colors duration-150 border-b border-gray-200"
        loading={loading}
        emptyMessage="No shift data found. Try adjusting your filters or check if there are any shifts in the system."
      />
    </div>
  );
};

export default ShiftManagement;