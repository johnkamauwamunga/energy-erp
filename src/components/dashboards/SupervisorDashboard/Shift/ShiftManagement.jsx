import React, { useState } from 'react';
import { Button, Card, Select, Badge, Table } from '../../../ui';
import { useApp, useAppDispatch } from '../../../../context/AppContext';
import Shift360View from './Shift360View';
import CreateShiftModal from './CreateShiftModal';
import { formatDate } from '../../../../utils/helpers';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ShiftManagement = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const [selectedShift, setSelectedShift] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Apply filters to shifts
  const filteredShifts = state.shifts.filter(shift => {
    const dateFilter = state.shiftFilters.date;
    const now = new Date();
    
    if (dateFilter === 'daily') {
      const shiftDate = new Date(shift.startTime);
      return (
        shiftDate.getDate() === now.getDate() &&
        shiftDate.getMonth() === now.getMonth() &&
        shiftDate.getFullYear() === now.getFullYear()
      );
    }
    
    if (dateFilter === 'monthly') {
      const shiftDate = new Date(shift.startTime);
      return (
        shiftDate.getMonth() === now.getMonth() &&
        shiftDate.getFullYear() === now.getFullYear()
      );
    }
    
    if (dateFilter === 'yearly') {
      const shiftDate = new Date(shift.startTime);
      return shiftDate.getFullYear() === now.getFullYear();
    }
    
    return true;
  }).filter(shift => {
    if (state.shiftFilters.status && shift.status !== state.shiftFilters.status) 
      return false;
    if (state.shiftFilters.supervisor && shift.supervisorId !== state.shiftFilters.supervisor) 
      return false;
    return true;
  });

  // Handle view shift
  const handleViewShift = (shift) => {
    setSelectedShift(shift);
    setIsViewModalOpen(true);
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
    
    // Table
    const tableData = filteredShifts.map(shift => {
      const supervisor = state.staff.supervisors.find(s => s.id === shift.supervisorId);
      return [
        formatDate(shift.startTime),
        formatDate(shift.endTime),
        shift.status,
        shift.islands?.length || 0,
        shift.attendants?.length || 0,
        supervisor?.name || 'N/A',
        `Ksh ${shift.totalSales?.toFixed(2) || '0.00'}`
      ];
    });
    
    doc.autoTable({
      head: [['Start', 'End', 'Status', 'Islands', 'Attendants', 'Supervisor', 'Total Sales']],
      body: tableData,
      startY: 45,
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
      header: 'Shift From', 
      accessor: 'startTime',
      cellClassName: 'p-3'
    },
    { 
      header: 'Shift To', 
      accessor: 'endTime',
      cellClassName: 'p-3'
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value) => (
        <Badge 
          variant={value === 'active' ? 'success' : value === 'closed' ? 'default' : 'warning'}
          className="capitalize"
        >
          {value}
        </Badge>
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
      cellClassName: 'p-3'
    },
    { 
      header: 'Actions', 
      render: (_, shift) => (
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => handleViewShift(shift)}
        >
          View Details
        </Button>
      ),
      cellClassName: 'p-3'
    }
  ];

  // Prepare table data
  const tableData = filteredShifts.map(shift => {
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
      startTime: formatDate(shift.startTime),
      endTime: formatDate(shift.endTime),
      status: shift.status,
      islandsCount,
      attendantsCount,
      supervisor: supervisor?.name || 'N/A'
    };
  });

  return (
    <Card 
      title="Shift Management" 
      actions={
        <div className="flex items-center space-x-2">
          <Button 
            variant="cosmic"
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="ml-auto"
          >
            Add Shift
          </Button>
        </div>
      }
    >
      {/* Compact filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-2 bg-gray-50 rounded-lg">
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
              { value: 'daily', label: 'Daily' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' }
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
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
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
        
        <Button 
          onClick={exportToPDF} 
          size="sm" 
          variant="outline"
          className="ml-auto"
        >
          Export PDF
        </Button>
      </div>

      <Table
        columns={columns}
        data={tableData}
      />
      
      {isViewModalOpen && selectedShift && (
        <Shift360View 
          shift={selectedShift}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
      
      {isCreateModalOpen && (
        <CreateShiftModal 
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </Card>
  );
};

export default ShiftManagement;