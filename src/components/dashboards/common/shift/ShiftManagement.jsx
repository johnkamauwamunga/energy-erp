import React, { useState, useMemo } from 'react';
import { Button, Card, Select, Badge, Table } from '../../../ui';
import { useApp, useAppDispatch } from '../../../../context/AppContext';
import Shift360View from './Shift360View';
import CreateShiftModal from './CreateShiftModal';
import ShiftCloseReconciliation from './ShiftCloseReconcilliation';
import { formatDate, formatCurrency } from '../../../../utils/helpers';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ShiftManagement = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftToClose, setShiftToClose] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  
  // Sort and filter shifts with current shifts at the top
  const sortedAndFilteredShifts = useMemo(() => {
    const now = new Date();
    
    return state.shifts
      .filter(shift => {
        // Apply date filter
        const dateFilter = state.shiftFilters.date;
        const shiftDate = new Date(shift.startTime);
        
        if (dateFilter === 'daily') {
          return (
            shiftDate.getDate() === now.getDate() &&
            shiftDate.getMonth() === now.getMonth() &&
            shiftDate.getFullYear() === now.getFullYear()
          );
        }
        
        if (dateFilter === 'monthly') {
          return (
            shiftDate.getMonth() === now.getMonth() &&
            shiftDate.getFullYear() === now.getFullYear()
          );
        }
        
        if (dateFilter === 'yearly') {
          return shiftDate.getFullYear() === now.getFullYear();
        }
        
        return true;
      })
      .filter(shift => {
        // Apply status and supervisor filters
        if (state.shiftFilters.status && shift.status !== state.shiftFilters.status) 
          return false;
        if (state.shiftFilters.supervisor && shift.supervisorId !== state.shiftFilters.supervisor) 
          return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by status priority: active > pending > closed
        const statusOrder = { active: 0, pending: 1, closed: 2 };
        
        // If same status, sort by start time (newest first)
        if (statusOrder[a.status] === statusOrder[b.status]) {
          return new Date(b.startTime) - new Date(a.startTime);
        }
        
        return statusOrder[a.status] - statusOrder[b.status];
      });
  }, [state.shifts, state.shiftFilters]);

  // Get current active shifts (for summary display)
  const activeShifts = useMemo(() => {
    return sortedAndFilteredShifts.filter(shift => shift.status === 'active');
  }, [sortedAndFilteredShifts]);

  // Handle view shift
  const handleViewShift = (shift) => {
    setSelectedShift(shift);
    setIsViewModalOpen(true);
  };

  // Handle close shift
  const handleCloseShift = (shift) => {
    setShiftToClose(shift);
    setIsCloseModalOpen(true);
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF();
    const station = state.currentUser?.stationId 
      ? state.serviceStations.find(s => s.id === state.currentUser.stationId)
      : state.serviceStations[0];
    
    // Header
    doc.setFontSize(18);
    doc.text('Shift Management Report', 15, 15);
    doc.setFontSize(10);
    doc.text(`Report #: ${Math.floor(100000 + Math.random() * 900000)}`, 15, 22);
    doc.text(`Station: ${station?.name || 'N/A'}`, 15, 27);
    doc.text(`P.O. Box: ${station?.address?.postalCode || 'N/A'}`, 15, 32);
    doc.text(`Location: ${station?.location || 'N/A'}`, 15, 37);
    
    // Active Shifts Summary
    if (activeShifts.length > 0) {
      doc.setFontSize(12);
      doc.text('Active Shifts:', 15, 50);
      doc.setFontSize(10);
      
      activeShifts.forEach((shift, index) => {
        const supervisor = state.staff.supervisors.find(s => s.id === shift.supervisorId);
        const yPos = 55 + (index * 15);
        doc.text(`• ${formatDate(shift.startTime)} - ${supervisor?.name || 'N/A'}`, 20, yPos);
      });
    }
    
    // Table starts after active shifts summary
    const startY = activeShifts.length > 0 ? 55 + (activeShifts.length * 15) : 45;
    
    const tableData = sortedAndFilteredShifts.map(shift => {
      const supervisor = state.staff.supervisors.find(s => s.id === shift.supervisorId);
      
      // Calculate number of islands and attendants
      const islandsCount = shift.islands?.length || 0;
      let attendantsCount = 0;
      
      if (shift.islands) {
        attendantsCount = shift.islands.reduce((total, island) => 
          total + (island.attendants?.length || 0), 0
        );
      }
      
      return [
        formatDate(shift.startTime),
        formatDate(shift.endTime),
        shift.status,
        islandsCount,
        attendantsCount,
        supervisor?.name || 'N/A',
        formatCurrency(shift.totalSales || 0)
      ];
    });
    
    doc.autoTable({
      head: [['Start', 'End', 'Status', 'Islands', 'Attendants', 'Supervisor', 'Total Sales']],
      body: tableData,
      startY: startY,
      theme: 'grid'
    });
    
    // Disclaimer
    doc.setFontSize(8);
    doc.text('* This report is for internal use only and cannot be used for official financial reporting', 
      15, doc.lastAutoTable.finalY + 10);
    
    doc.save('shift-management-report.pdf');
  };

  // Define columns for the table
  const columns = [
    { 
      header: 'Shift Period', 
      render: (_, shift) => (
        <div className="min-w-[200px]">
          <div className="font-medium text-gray-900">
            {formatDate(shift.startTime, 'MMM DD, YYYY')}
          </div>
          <div className="text-sm text-gray-500">
            {formatDate(shift.startTime, 'HH:mm')} - {formatDate(shift.endTime, 'HH:mm')}
          </div>
        </div>
      ),
      cellClassName: 'p-3'
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value, shift) => (
        <div className="flex items-center gap-2">
          <Badge 
            variant={
              value === 'active' ? 'success' : 
              value === 'pending' ? 'warning' : 
              'default'
            }
            className="capitalize whitespace-nowrap"
          >
            {value}
          </Badge>
          {value === 'active' && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseShift(shift);
              }}
            >
              Close Shift
            </Button>
          )}
        </div>
      ),
      cellClassName: 'p-3'
    },
    { 
      header: 'Islands', 
      accessor: 'islandsCount',
      render: (value) => (
        <div className="text-center font-medium">{value}</div>
      ),
      cellClassName: 'p-3'
    },
    { 
      header: 'Attendants', 
      accessor: 'attendantsCount',
      render: (value) => (
        <div className="text-center font-medium">{value}</div>
      ),
      cellClassName: 'p-3'
    },
    { 
      header: 'Supervisor', 
      accessor: 'supervisor',
      cellClassName: 'p-3',
      render: (value, shift) => (
        <div className="min-w-[120px]">
          <div className="font-medium">{value}</div>
          {shift.status === 'active' && (
            <Badge variant="outline" className="text-xs mt-1">On Duty</Badge>
          )}
        </div>
      )
    },
    { 
      header: 'Total Sales', 
      accessor: 'totalSales',
      render: (value) => (
        <div className="text-right font-medium text-green-600">{formatCurrency(value)}</div>
      ),
      cellClassName: 'p-3'
    },
    { 
      header: 'Actions', 
      render: (_, shift) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => handleViewShift(shift)}
          >
            View Details
          </Button>
        </div>
      ),
      cellClassName: 'p-3'
    }
  ];

  // Prepare table data
  const tableData = sortedAndFilteredShifts.map(shift => {
    const supervisor = state.staff.supervisors.find(s => s.id === shift.supervisorId);
    
    // Calculate number of islands and attendants
    const islandsCount = shift.islands?.length || 0;
    let attendantsCount = 0;
    
    if (shift.islands) {
      attendantsCount = shift.islands.reduce((total, island) => 
        total + (island.attendants?.length || 0), 0
      );
    }
    
    return {
      ...shift,
      id: shift.id,
      startTime: shift.startTime, // Keep as date for formatting in render
      endTime: shift.endTime,
      status: shift.status,
      islandsCount,
      attendantsCount,
      supervisor: supervisor?.name || 'N/A',
      totalSales: shift.totalSales || 0
    };
  });

  return (
    <div className="space-y-6">
      {/* Current Active Shifts Summary */}
      {activeShifts.length > 0 && (
        <Card title="Current Active Shifts" className="bg-blue-50 border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeShifts.map((shift, index) => {
              const supervisor = state.staff.supervisors.find(s => s.id === shift.supervisorId);
              const totalIslands = shift.islands?.length || 0;
              const totalAttendants = shift.islands?.reduce((total, island) => 
                total + (island.attendants?.length || 0), 0
              ) || 0;
              
              return (
                <div key={shift.id} className="bg-white p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">Shift {index + 1}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(shift.startTime, 'MMM DD, YYYY HH:mm')}
                      </p>
                    </div>
                    <Badge variant="success" className="animate-pulse">Live</Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Supervisor:</span>
                      <span className="font-medium">{supervisor?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Islands:</span>
                      <span className="font-medium">{totalIslands}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attendants:</span>
                      <span className="font-medium">{totalAttendants}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewShift(shift)}
                      className="flex-1"
                    >
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleCloseShift(shift)}
                      className="flex-1"
                    >
                      Close Shift
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Shift Management Card */}
      <Card 
        title="Shift Management" 
        actions={
          <div className="flex items-center space-x-2">
            <Button 
              variant="cosmic"
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
            >
              Create Shift
            </Button>
            <Button 
              onClick={exportToPDF} 
              size="sm" 
              variant="outline"
            >
              Export PDF
            </Button>
          </div>
        }
      >
        {/* Compact filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filters:</span>
            <Select
              className="w-32 text-sm"
              value={state.shiftFilters.date}
              onChange={(e) => dispatch({ 
                type: 'SET_SHIFT_FILTERS', 
                payload: { ...state.shiftFilters, date: e.target.value } 
              })}
              options={[
                { value: 'all', label: 'All Dates' },
                { value: 'daily', label: 'Today' },
                { value: 'monthly', label: 'This Month' },
                { value: 'yearly', label: 'This Year' }
              ]}
            />
            
            <Select
              className="w-32 text-sm"
              value={state.shiftFilters.status}
              onChange={(e) => dispatch({ 
                type: 'SET_SHIFT_FILTERS', 
                payload: { ...state.shiftFilters, status: e.target.value } 
              })}
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'closed', label: 'Closed' }
              ]}
            />
            
            <Select
              className="w-40 text-sm"
              value={state.shiftFilters.supervisor}
              onChange={(e) => dispatch({ 
                type: 'SET_SHIFT_FILTERS', 
                payload: { ...state.shiftFilters, supervisor: e.target.value } 
              })}
              options={[
                { value: '', label: 'All Supervisors' },
                ...state.staff.supervisors.map(s => ({
                  value: s.id,
                  label: s.name
                }))
              ]}
            />
          </div>
          
          <div className="text-sm text-gray-600 ml-auto">
            Showing {tableData.length} shift{tableData.length !== 1 ? 's' : ''}
            {activeShifts.length > 0 && `, ${activeShifts.length} active`}
          </div>
        </div>

        <Table
          columns={columns}
          data={tableData}
          emptyMessage="No shifts found matching your filters"
        />
      </Card>
      
      {/* Modals */}
      {isViewModalOpen && selectedShift && (
        <Shift360View 
          shift={selectedShift}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedShift(null);
          }}
        />
      )}
      
      {isCloseModalOpen && shiftToClose && (
        <ShiftCloseReconciliation 
          shift={shiftToClose}
          onClose={() => {
            setIsCloseModalOpen(false);
            setShiftToClose(null);
          }}
        />
      )}
      
      {isCreateModalOpen && (
        <CreateShiftModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onShiftCreated={() => {
            setIsCreateModalOpen(false);
            // Optional: Refresh shifts data or show success message
          }}
        />
      )}
    </div>
  );
};

export default ShiftManagement;