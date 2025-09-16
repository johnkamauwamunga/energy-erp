import React, { useState } from 'react';
import { Button, Card, Select, Badge, Table } from '../../../ui';
import { useApp } from '../../../../context/AppContext';
import CreateOffloadModal from './CreateOffloadModal';
import Offload360View from './Offload360View';
import { formatDate, formatCurrency } from '../../../../utils/helpers';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const OffloadManagement = () => {
  const { state, dispatch } = useApp();
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Safely access offloads with fallback to empty array
  const offloads = state.offloads || [];
  const offloadFilters = state.offloadFilters || { date: 'all', tank: '', supplier: '' };
  
  // Filter offloads by current station if user is station-specific
  const stationOffloads = state.currentStation
    ? offloads.filter(offload => offload.stationId === state.currentStation.id)
    : offloads;
  
  // Apply filters to offloads
  const filteredOffloads = stationOffloads.filter(offload => {
    const dateFilter = offloadFilters.date;
    const now = new Date();
    const offloadDate = new Date(offload.startTime);
    
    if (dateFilter === 'daily') {
      return (
        offloadDate.getDate() === now.getDate() &&
        offloadDate.getMonth() === now.getMonth() &&
        offloadDate.getFullYear() === now.getFullYear()
      );
    }
    
    if (dateFilter === 'monthly') {
      return (
        offloadDate.getMonth() === now.getMonth() &&
        offloadDate.getFullYear() === now.getFullYear()
      );
    }
    
    if (dateFilter === 'yearly') {
      return offloadDate.getFullYear() === now.getFullYear();
    }
    
    return true;
  }).filter(offload => {
    if (offloadFilters.tank && offload.tankId !== offloadFilters.tank) 
      return false;
    if (offloadFilters.supplier && offload.energyCompanyId !== offloadFilters.supplier) 
      return false;
    return true;
  });

  // Handle view offload
  const handleViewOffload = (offload) => {
    setSelectedOffload(offload);
    setIsViewModalOpen(true);
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    dispatch({ 
      type: 'SET_OFFLOAD_FILTERS', 
      payload: { ...offloadFilters, [filterType]: value } 
    });
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF();
    const station = state.currentUser?.stationId 
      ? state.serviceStations.find(s => s.id === state.currentUser.stationId)
      : state.serviceStations[0];
    
    // Header
    doc.setFontSize(18);
    doc.text('Offload Management Report', 15, 15);
    doc.setFontSize(10);
    doc.text(`Report #: ${Math.floor(100000 + Math.random() * 900000)}`, 15, 22);
    doc.text(`Station: ${station?.name || 'N/A'}`, 15, 27);
    doc.text(`P.O. Box: ${station?.address?.postalCode || 'N/A'}`, 15, 32);
    doc.text(`Location: ${station?.location || 'N/A'}`, 15, 37);
    
    // Table
    const tableData = filteredOffloads.map(offload => {
      const tank = state.assets.tanks.find(t => t.id === offload.tankId);
      const supplier = state.suppliers.find(s => s.id === offload.energyCompanyId);
      
      return [
        formatDate(offload.startTime),
        offload.deliveryNoteNumber,
        tank?.name || 'N/A',
        supplier?.name || 'N/A',
        `${offload.actualVolume}L`,
        `${offload.dipBefore} → ${offload.dipAfter}${tank?.unit || ''}`,
        formatCurrency(offload.salesDuringOffload || 0)
      ];
    });
    
    doc.autoTable({
      head: [['Date', 'Note #', 'Tank', 'Supplier', 'Volume', 'Dip Change', 'Sales During']],
      body: tableData,
      startY: 45,
      theme: 'grid'
    });
    
    // Disclaimer
    doc.setFontSize(8);
    doc.text('* This report is for internal use only and cannot be used for official financial reporting', 
      15, doc.lastAutoTable.finalY + 10);
    
    doc.save('offload-management-report.pdf');
  };

  // Define columns for the table
  const columns = [
    { 
      header: 'Date', 
      accessor: 'date',
      cellClassName: 'p-3'
    },
    { 
      header: 'Delivery Note', 
      accessor: 'deliveryNote',
      cellClassName: 'p-3'
    },
    { 
      header: 'Tank', 
      accessor: 'tank',
      cellClassName: 'p-3'
    },
    { 
      header: 'Supplier', 
      accessor: 'supplier',
      cellClassName: 'p-3'
    },
    { 
      header: 'Volume', 
      accessor: 'volume',
      cellClassName: 'p-3'
    },
    { 
      header: 'Dip Change', 
      accessor: 'dipChange',
      cellClassName: 'p-3'
    },
    { 
      header: 'Sales During', 
      accessor: 'salesDuring',
      cellClassName: 'p-3'
    },
    { 
      header: 'Actions', 
      render: (_, offload) => (
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => handleViewOffload(offload)}
        >
          View Details
        </Button>
      ),
      cellClassName: 'p-3'
    }
  ];

  // Prepare table data
  const tableData = filteredOffloads.map(offload => {
    const tank = state.assets.tanks.find(t => t.id === offload.tankId);
    const supplier = state.suppliers.find(s => s.id === offload.energyCompanyId);
    
    return {
      ...offload,
      date: formatDate(offload.startTime),
      deliveryNote: offload.deliveryNoteNumber,
      tank: tank ? `${tank.name} (${tank.fuelType})` : 'N/A',
      supplier: supplier?.name || 'N/A',
      volume: `${offload.actualVolume}L`,
      dipChange: `${offload.dipBefore} → ${offload.dipAfter}${tank?.unit || ''}`,
      salesDuring: formatCurrency(offload.salesDuringOffload || 0)
    };
  });

  return (
    <Card 
      title="Fuel Offload Management" 
      actions={
        <div className="flex items-center space-x-2">
          <Button 
            variant="cosmic"
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="ml-auto"
          >
            Record Offload
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
            value={offloadFilters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            options={[
              { value: 'all', label: 'All Dates' },
              { value: 'daily', label: 'Daily' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' }
            ]}
          />
          
          <Select
            className="w-32 text-sm"
            value={offloadFilters.tank}
            onChange={(e) => handleFilterChange('tank', e.target.value)}
            options={[
              { value: '', label: 'All Tanks' },
              ...state.assets.tanks.filter(t => t.stationId === state.currentStation?.id)
                .map(tank => ({
                  value: tank.id,
                  label: tank.name
                }))
            ]}
          />
          
          <Select
            className="w-40 text-sm"
            value={offloadFilters.supplier}
            onChange={(e) => handleFilterChange('supplier', e.target.value)}
            options={[
              { value: '', label: 'All Suppliers' },
              ...state.suppliers.filter(s => s.type === 'energy').map(supplier => ({
                value: supplier.id,
                label: supplier.name
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
      
      {isViewModalOpen && selectedOffload && (
        <Offload360View 
          offload={selectedOffload}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
      
      {isCreateModalOpen && (
        <CreateOffloadModal 
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </Card>
  );
};

export default OffloadManagement;