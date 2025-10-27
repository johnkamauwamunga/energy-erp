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

  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  const [wizardMode, setWizardMode] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);

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

  useEffect(() => {
  const fetchCumulativeShifts = async() =>{
    try{
        const response =await shiftService.getShiftsByStationWithAssets(userStationId) 
        console.log("Cumulative shifts data",response);
    }catch(e){
  console.log("Error fetching cumulative shifts",e);
    }
  
  }

  fetchCumulativeShifts()
  },[userStationId])

  // Fetch shifts based on user role
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
          response = await shiftService.getAllShifts(queryParams);
          break;

        case 'company':
          response = await shiftService.getShiftsByCompany(
            scopeParams.companyId,
            queryParams
          );
          break;

        case 'station':
          response = await shiftService.getShiftsByStation(
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
      console.log('📊 Fetched shifts:', shiftsData);
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
  }, [getScopeParams, userRole, filters]);

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
        if (result && result.data) {
          console.log('✅ Open shift found via API:', result.data.shiftNumber);
          setHasOpenShift(true);
          setOpenShiftData(result.data);
          return;
        }
      } catch (apiError) {
        console.log('⚠️ API check failed, falling back to local check');
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

  // Initial data fetch
  useEffect(() => {
    fetchShifts();
  }, [currentUser]);

  // Handle open shift
  const handleOpenShift = () => {
    setWizardMode('open');
  };

  // Handle close shift
  const handleCloseShift = () => {
    if (openShiftData) {
      setSelectedShift(openShiftData);
      setWizardMode('close');
    }
  };

  // Handle shift creation success
  const handleShiftCreated = () => {
    setWizardMode(null);
    fetchShifts(); // Refresh data
  };

  // Handle shift closing success
  const handleShiftClosed = () => {
    setWizardMode(null);
    setSelectedShift(null);
    fetchShifts(); // Refresh data
  };

  // Handle cancel wizard
  const handleCancelWizard = () => {
    setWizardMode(null);
    setSelectedShift(null);
  };


  // Process shift data for the table
  const tableData = useMemo(() => {
    return shifts.map(shift => ({
      id: shift.id,
      shiftNumber: shift.shiftNumber,
      status: shift.status,
      startTime: shift.startTime,
      endTime: shift.endTime,
      supervisor: shift.supervisor,
      station: shift.station,
      
      // Collections data
      collections: shift.shiftCollection ? {
        total: shift.shiftCollection.totalCollected,
        cash: shift.shiftCollection.cashAmount,
        mobileMoney: shift.shiftCollection.mobileMoneyAmount,
        visa: shift.shiftCollection.visaAmount,
        mastercard: shift.shiftCollection.mastercardAmount,
        breakdown: shift.report?.paymentBreakdown
      } : null,
      
      // Tanks data
      tanks: shift.dipReadings?.reduce((acc, reading) => {
        const tankId = reading.tankId;
        if (!acc.find(t => t.tankId === tankId)) {
          acc.push({
            tankId,
            tankName: reading.tank?.assetId,
            product: reading.tank?.product,
            capacity: reading.tank?.capacity,
            currentVolume: reading.tank?.currentVolume,
            dipReadings: shift.dipReadings?.filter(r => r.tankId === tankId)
          });
        }
        return acc;
      }, []) || [],
      
      // Pumps data
      pumps: shift.meterReadings?.reduce((acc, reading) => {
        const pumpId = reading.pumpId;
        if (!acc.find(p => p.pumpId === pumpId)) {
          const startReading = shift.meterReadings?.find(r => 
            r.pumpId === pumpId && r.readingType === 'START'
          );
          const endReading = shift.meterReadings?.find(r => 
            r.pumpId === pumpId && r.readingType === 'END'
          );
          
          acc.push({
            pumpId,
            pumpName: reading.pump?.asset?.name,
            product: reading.pump?.tank?.product,
            totalVolume: endReading && startReading ? 
              endReading.electricMeter - startReading.electricMeter : 0,
            readings: shift.meterReadings?.filter(r => r.pumpId === pumpId)
          });
        }
        return acc;
      }, []) || [],
      
      // Attendants data
      attendants: shift.shiftIslandAttedant?.map(assignment => ({
        id: assignment.attendantId,
        name: `${assignment.attendant?.firstName} ${assignment.attendant?.lastName}`,
        email: assignment.attendant?.email,
        islandCode: assignment.island?.code,
        assignmentType: assignment.assignmentType,
        assignedAt: assignment.assignedAt
      })) || [],
      
      // Sales data
      sales: shift.sales?.[0] ? {
        totalRevenue: shift.sales[0].totalRevenue,
        fuelRevenue: shift.sales[0].totalFuelRevenue,
        productSales: []
      } : null,
      
      // Reconciliation data
      reconciliation: shift.reconciliation
    }));
  }, [shifts]);

  // Table columns configuration
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
      key: 'collections',
      header: 'Collections',
      accessor: 'collections.total',
      render: (value, rowData) => (
        <div 
          className="text-purple-600 cursor-pointer hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          KES {value ? value.toLocaleString() : '0'}
        </div>
      ),
      clickable: true,
      modalType: 'collections',
      modalTitle: (rowData) => `Shift ${rowData.shiftNumber} - Collections`,
      modalDataAccessor: 'collections'
    },
    {
      key: 'tanks',
      header: 'Tanks',
      accessor: 'tanks',
      render: (value) => (
        <div className="text-teal-600 cursor-pointer hover:underline font-medium">
          {value.length} tanks
        </div>
      ),
      clickable: true,
      modalType: 'tanks',
      modalTitle: 'Tank Operations',
      modalDataAccessor: 'tanks'
    },
    {
      key: 'pumps',
      header: 'Pumps',
      accessor: 'pumps',
      render: (value) => (
        <div className="text-orange-600 cursor-pointer hover:underline font-medium">
          {value.length} pumps
        </div>
      ),
      clickable: true,
      modalType: 'pumps',
      modalTitle: 'Pump Operations',
      modalDataAccessor: 'pumps'
    },
    {
      key: 'attendants',
      header: 'Attendants',
      accessor: 'attendants',
      render: (value) => (
        <div className="text-blue-600 cursor-pointer hover:underline font-medium">
          {value.length} staff
        </div>
      ),
      clickable: true,
      modalType: 'attendants',
      modalTitle: 'Attendant Assignments',
      modalDataAccessor: 'attendants'
    }
  ];

  // Expanded row content
  const renderExpandedContent = (rowData) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
        </div>
      </div>

      {/* Operations Summary */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">Operations Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{rowData.tanks.length}</div>
            <div className="text-sm text-blue-600">Tanks</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{rowData.pumps.length}</div>
            <div className="text-sm text-orange-600">Pumps</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{rowData.attendants.length}</div>
            <div className="text-sm text-green-600">Attendants</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              KES {rowData.collections?.total?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-purple-600">Collections</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">Quick Actions</h4>
        <div className="space-y-2">
               

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

      {/* Sales Summary */}
      {rowData.sales && (
        <div className="space-y-4 lg:col-span-2 xl:col-span-3">
          <h4 className="font-semibold text-gray-800 border-b pb-2">Sales Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
              <div className="text-2xl font-bold text-blue-800">
                KES {rowData.sales.totalRevenue?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Fuel Revenue</div>
              <div className="text-xl font-bold text-green-800">
                KES {rowData.sales.fuelRevenue?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Status</div>
              <div className="text-xl font-bold text-gray-800 capitalize">
                {rowData.status.toLowerCase()}
              </div>
            </div>
          </div>
        </div>
      )}
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
              !hasOpenShift ? (
                <button
                  onClick={handleOpenShift}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors"
                >
                  <span className="mr-2">➕</span>
                  Open Shift
                </button>
              ) : (
                <button
                  onClick={handleCloseShift}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center transition-colors"
                >
                  <span className="mr-2">🔒</span>
                  Close Shift
                </button>
              )
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
                onClick={handleCloseShift}
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

      {/* Role-based debug info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="flex flex-wrap gap-4">
          <span><strong>Role:</strong> {userRole}</span>
          <span><strong>Scope:</strong> {getScopeParams().scope}</span>
          {userStationId && <span><strong>Station ID:</strong> {userStationId}</span>}
          {userCompanyId && <span><strong>Company ID:</strong> {userCompanyId}</span>}
          <span><strong>Shifts Loaded:</strong> {shifts.length}</span>
        </div>
      </div>

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