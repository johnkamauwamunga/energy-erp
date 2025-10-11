// components/SalesManagement/SalesManagement.jsx
import React, { useState, useMemo } from 'react';
import { MultiTable } from '../../../ui';
import useShiftData from '../../../../hooks/useShiftData';
import { useApp } from '../../../../context/AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesManagement = () => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const stationId = currentUser?.stationId;
  const userRole = currentUser?.role || 'ATTENDANT';

  const [filters, setFilters] = useState({
    period: 'daily', // daily, weekly, monthly, custom
    startDate: new Date(),
    endDate: new Date(),
    view: 'shifts' // shifts, products, islands, overview
  });

  const { shifts, loading, error, refetch, productSales } = useShiftData(
    stationId, 
    filters, 
    userRole
  );

  // Process sales data for different views
  const processedData = useMemo(() => {
    if (!shifts.length) return { shifts: [], products: [], islands: [], overview: [] };

    // Process shift sales data
    const shiftSales = shifts.map(shift => ({
      id: shift.id,
      shiftNumber: shift.shiftNumber,
      date: new Date(shift.startTime).toLocaleDateString(),
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      supervisor: shift.supervisor,
      station: shift.station,
      
      // Sales data
      totalRevenue: shift.sales?.[0]?.totalRevenue || 0,
      fuelRevenue: shift.sales?.[0]?.totalFuelRevenue || 0,
      nonFuelRevenue: shift.sales?.[0]?.totalNonFuelRevenue || 0,
      fuelVolume: shift.sales?.[0]?.totalFuelQuantity || 0,
      
      // Collections
      collections: shift.shiftCollection?.totalCollected || 0,
      cashCollections: shift.shiftCollection?.cashAmount || 0,
      mobileCollections: shift.shiftCollection?.mobileMoneyAmount || 0,
      
      // Product sales (from meter readings)
      productSales: shift.meterReadings?.reduce((acc, reading) => {
        if (reading.readingType === 'END') {
          const startReading = shift.meterReadings?.find(r => 
            r.pumpId === reading.pumpId && r.readingType === 'START'
          );
          
          if (startReading && reading.electricMeter && startReading.electricMeter) {
            const volume = reading.electricMeter - startReading.electricMeter;
            const product = reading.pump?.tank?.product;
            
            if (product) {
              const existing = acc.find(p => p.productId === product.id);
              if (existing) {
                existing.volume += volume;
                existing.revenue += volume * (reading.unitPrice || 0);
              } else {
                acc.push({
                  productId: product.id,
                  productName: product.name,
                  productType: product.type,
                  colorCode: product.colorCode,
                  volume: volume,
                  revenue: volume * (reading.unitPrice || 0)
                });
              }
            }
          }
        }
        return acc;
      }, []) || []
    }));

    // Group by date for overview
    const groupByDate = (data) => {
      const grouped = {};
      data.forEach(shift => {
        const date = new Date(shift.startTime).toDateString();
        if (!grouped[date]) {
          grouped[date] = {
            date,
            totalRevenue: 0,
            fuelRevenue: 0,
            nonFuelRevenue: 0,
            totalVolume: 0,
            shiftCount: 0,
            collections: 0,
            shifts: []
          };
        }
        grouped[date].totalRevenue += shift.totalRevenue || 0;
        grouped[date].fuelRevenue += shift.fuelRevenue || 0;
        grouped[date].nonFuelRevenue += shift.nonFuelRevenue || 0;
        grouped[date].totalVolume += shift.fuelVolume || 0;
        grouped[date].collections += shift.collections || 0;
        grouped[date].shiftCount++;
        grouped[date].shifts.push(shift);
      });
      return Object.values(grouped);
    };

    // Group by island
    const groupByIsland = (data) => {
      const islandMap = new Map();
      
      data.forEach(shift => {
        shift.islandCollections?.forEach(collection => {
          const islandId = collection.islandId;
          if (!islandMap.has(islandId)) {
            islandMap.set(islandId, {
              islandId,
              islandCode: collection.island?.code || `ISLAND_${islandId}`,
              totalRevenue: 0,
              collections: 0,
              shiftCount: 0
            });
          }
          
          const islandData = islandMap.get(islandId);
          islandData.collections += collection.cashAmount || 0;
          islandData.shiftCount++;
        });

        // Get sales by island from payment breakdown
        if (shift.report?.paymentBreakdown) {
          Object.entries(shift.report.paymentBreakdown).forEach(([islandId, breakdown]) => {
            if (!islandMap.has(islandId)) {
              islandMap.set(islandId, {
                islandId,
                islandCode: `ISLAND_${islandId}`,
                totalRevenue: 0,
                collections: 0,
                shiftCount: 0
              });
            }
            
            const islandData = islandMap.get(islandId);
            islandData.totalRevenue += breakdown.expectedAmount || 0;
            islandData.collections += breakdown.totalCollected || 0;
          });
        }
      });

      return Array.from(islandMap.values());
    };

    return {
      shifts: shiftSales,
      products: productSales || [],
      islands: groupByIsland(shifts),
      overview: groupByDate(shiftSales)
    };
  }, [shifts, productSales]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const currentData = processedData[filters.view] || [];
    
    const totalRevenue = currentData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    const totalVolume = currentData.reduce((sum, item) => sum + (item.totalVolume || item.fuelVolume || 0), 0);
    const totalCollections = currentData.reduce((sum, item) => sum + (item.collections || 0), 0);
    const totalShifts = currentData.reduce((sum, item) => sum + (item.shiftCount || 1), 0);

    return {
      totalRevenue,
      totalVolume,
      totalCollections,
      totalShifts,
      avgRevenuePerShift: totalShifts > 0 ? totalRevenue / totalShifts : 0,
      collectionEfficiency: totalRevenue > 0 ? (totalCollections / totalRevenue) * 100 : 0
    };
  }, [processedData, filters.view]);

  // PDF Generation Function
  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const companyName = state.currentCompany?.name || 'Energy ERP';
      const stationName = state.currentStation?.name || 'All Stations';
      
      // Purple theme - RGB: [128, 0, 128]
      const headerColor = [128, 0, 128];
      
      // Report Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(companyName, 15, 15);
      
      doc.setFontSize(14);
      doc.text(stationName, 15, 22);
      
      // Report Title
      doc.setFontSize(18);
      doc.setTextColor(...headerColor);
      doc.text(`${filters.view.charAt(0).toUpperCase() + filters.view.slice(1)} Sales Report`, 15, 32);
      
      // Report Details
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Report Period: ${filters.period}`, 15, 38);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 43);
      doc.text(`Total Records: ${processedData[filters.view]?.length || 0}`, 15, 48);
      
      // Horizontal line separator
      doc.setDrawColor(...headerColor);
      doc.setLineWidth(0.3);
      doc.line(15, 52, doc.internal.pageSize.width - 15, 52);
      
      // Generate table based on view type
      let tableData = [];
      let headers = [];

      switch (filters.view) {
        case 'shifts':
          headers = ['Shift #', 'Date', 'Status', 'Revenue', 'Volume', 'Collections'];
          tableData = processedData.shifts.map(shift => [
            `#${shift.shiftNumber}`,
            shift.date,
            shift.status,
            `KES ${shift.totalRevenue?.toLocaleString() || '0'}`,
            `${shift.fuelVolume?.toLocaleString() || '0'} L`,
            `KES ${shift.collections?.toLocaleString() || '0'}`
          ]);
          break;
          
        case 'products':
          headers = ['Product', 'Volume Sold', 'Revenue', 'Stations', 'Pumps'];
          tableData = processedData.products.map(product => [
            product.productName,
            `${product.totalVolume?.toLocaleString() || '0'} L`,
            `KES ${product.totalRevenue?.toLocaleString() || '0'}`,
            product.stationCount?.toString() || '0',
            product.pumpCount?.toString() || '0'
          ]);
          break;
          
        case 'islands':
          headers = ['Island', 'Shifts', 'Revenue', 'Collections', 'Efficiency'];
          tableData = processedData.islands.map(island => [
            island.islandCode,
            island.shiftCount?.toString() || '0',
            `KES ${island.totalRevenue?.toLocaleString() || '0'}`,
            `KES ${island.collections?.toLocaleString() || '0'}`,
            `${island.totalRevenue > 0 ? ((island.collections / island.totalRevenue) * 100).toFixed(1) : '0'}%`
          ]);
          break;
          
        case 'overview':
          headers = ['Date', 'Shifts', 'Revenue', 'Volume', 'Collections', 'Efficiency'];
          tableData = processedData.overview.map(day => [
            day.date,
            day.shiftCount?.toString() || '0',
            `KES ${day.totalRevenue?.toLocaleString() || '0'}`,
            `${day.totalVolume?.toLocaleString() || '0'} L`,
            `KES ${day.collections?.toLocaleString() || '0'}`,
            `${day.totalRevenue > 0 ? ((day.collections / day.totalRevenue) * 100).toFixed(1) : '0'}%`
          ]);
          break;
      }

      // Add totals row
      if (tableData.length > 0) {
        let totalsRow = ['TOTAL', '', '', '', '', ''];
        
        switch (filters.view) {
          case 'shifts':
            totalsRow = [
              '',
              `${summaryStats.totalShifts} shifts`,
              `KES ${summaryStats.totalRevenue.toLocaleString()}`,
              `${summaryStats.totalVolume.toLocaleString()} L`,
              `KES ${summaryStats.totalCollections.toLocaleString()}`,
              `${summaryStats.collectionEfficiency.toFixed(1)}%`
            ];
            break;
          case 'products':
            totalsRow = [
              '',
              `${summaryStats.totalVolume.toLocaleString()} L`,
              `KES ${summaryStats.totalRevenue.toLocaleString()}`,
              '',
              ''
            ];
            break;
          case 'islands':
          case 'overview':
            totalsRow = [
              '',
              `${summaryStats.totalShifts} shifts`,
              `KES ${summaryStats.totalRevenue.toLocaleString()}`,
              `${summaryStats.totalVolume.toLocaleString()} L`,
              `KES ${summaryStats.totalCollections.toLocaleString()}`,
              `${summaryStats.collectionEfficiency.toFixed(1)}%`
            ];
            break;
        }
        
        tableData.push(totalsRow);
      }

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 55,
        theme: 'grid',
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          valign: 'middle',
          halign: 'left',
          textColor: [40, 40, 40]
        },
        headStyles: {
          fillColor: headerColor,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          // Right align numeric columns
          ...(filters.view === 'shifts' && {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          }),
          ...(filters.view === 'products' && {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
          }),
          ...(filters.view === 'islands' && {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
          }),
          ...(filters.view === 'overview' && {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          })
        },
        didDrawPage: function (data) {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${data.pageNumber}`, 
                  data.settings.margin.left, 
                  doc.internal.pageSize.height - 10);
        }
      });
      
      // Add summary section
      const finalY = doc.lastAutoTable.finalY + 10;
      if (finalY < doc.internal.pageSize.height - 30) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...headerColor);
        doc.text('SUMMARY', 15, finalY);
        
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        
        let yPos = finalY + 7;
        doc.text(`Total Revenue: KES ${summaryStats.totalRevenue.toLocaleString()}`, 15, yPos);
        yPos += 5;
        doc.text(`Fuel Volume: ${summaryStats.totalVolume.toLocaleString()} L`, 15, yPos);
        yPos += 5;
        doc.text(`Collections: KES ${summaryStats.totalCollections.toLocaleString()}`, 15, yPos);
        yPos += 5;
        doc.text(`Collection Efficiency: ${summaryStats.collectionEfficiency.toFixed(1)}%`, 15, yPos);
        
        if (filters.view === 'shifts' || filters.view === 'overview') {
          yPos += 5;
          doc.text(`Average per Shift: KES ${summaryStats.avgRevenuePerShift.toLocaleString()}`, 15, yPos);
        }
      }
      
      // Save the PDF
      const filename = `${companyName}_${filters.view}_Sales_Report.pdf`.replace(/\s+/g, '_');
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  // Columns for different views
  const getColumns = (viewType) => {
    const baseColumns = {
      shifts: [
        {
          key: 'shift-number',
          header: 'Shift #',
          accessor: 'shiftNumber',
          className: 'font-medium text-gray-900'
        },
        {
          key: 'date',
          header: 'Date',
          accessor: 'date'
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
          key: 'total-revenue',
          header: 'Revenue',
          accessor: 'totalRevenue',
          render: (value) => (
            <div className="text-green-600 font-semibold">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'fuel-volume',
          header: 'Volume',
          accessor: 'fuelVolume',
          render: (value) => `${value?.toLocaleString() || '0'} L`
        },
        {
          key: 'collections',
          header: 'Collections',
          accessor: 'collections',
          render: (value) => (
            <div className="text-purple-600 font-medium">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'efficiency',
          header: 'Efficiency',
          accessor: 'collections',
          render: (value, row) => {
            const efficiency = row.totalRevenue > 0 ? (value / row.totalRevenue) * 100 : 0;
            return (
              <div className="flex items-center">
                <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full ${
                      efficiency > 95 ? 'bg-green-500' : 
                      efficiency > 85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(efficiency, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm">{efficiency.toFixed(1)}%</span>
              </div>
            );
          }
        }
      ],
      products: [
        {
          key: 'product-name',
          header: 'Product',
          accessor: 'productName',
          className: 'font-medium text-gray-900',
          render: (value, row) => (
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: row.colorCode || '#6B7280' }}
              ></div>
              {value}
            </div>
          )
        },
        {
          key: 'total-volume',
          header: 'Volume Sold',
          accessor: 'totalVolume',
          render: (value) => (
            <div className="text-blue-600 font-semibold">
              {value?.toLocaleString() || '0'} L
            </div>
          )
        },
        {
          key: 'total-revenue',
          header: 'Revenue',
          accessor: 'totalRevenue',
          render: (value) => (
            <div className="text-green-600 font-semibold">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'station-count',
          header: 'Stations',
          accessor: 'stationCount',
          render: (value) => (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
              {value} stations
            </span>
          )
        },
        {
          key: 'pump-count',
          header: 'Pumps',
          accessor: 'pumpCount',
          render: (value) => (
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
              {value} pumps
            </span>
          )
        },
        {
          key: 'avg-price',
          header: 'Avg Price/L',
          accessor: 'totalRevenue',
          render: (value, row) => {
            const avgPrice = row.totalVolume > 0 ? value / row.totalVolume : 0;
            return `KES ${avgPrice.toFixed(2)}`;
          }
        }
      ],
      islands: [
        {
          key: 'island-code',
          header: 'Island',
          accessor: 'islandCode',
          className: 'font-medium text-gray-900'
        },
        {
          key: 'shift-count',
          header: 'Shifts',
          accessor: 'shiftCount',
          render: (value) => (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {value} shifts
            </span>
          )
        },
        {
          key: 'total-revenue',
          header: 'Revenue',
          accessor: 'totalRevenue',
          render: (value) => (
            <div className="text-green-600 font-semibold">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'collections',
          header: 'Collections',
          accessor: 'collections',
          render: (value) => (
            <div className="text-purple-600 font-medium">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'efficiency',
          header: 'Efficiency',
          accessor: 'collections',
          render: (value, row) => {
            const efficiency = row.totalRevenue > 0 ? (value / row.totalRevenue) * 100 : 0;
            return (
              <div className="flex items-center">
                <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full ${
                      efficiency > 95 ? 'bg-green-500' : 
                      efficiency > 85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(efficiency, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm">{efficiency.toFixed(1)}%</span>
              </div>
            );
          }
        }
      ],
      overview: [
        {
          key: 'date',
          header: 'Date',
          accessor: 'date',
          className: 'font-medium text-gray-900'
        },
        {
          key: 'shift-count',
          header: 'Shifts',
          accessor: 'shiftCount',
          render: (value) => (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {value} shifts
            </span>
          )
        },
        {
          key: 'total-revenue',
          header: 'Revenue',
          accessor: 'totalRevenue',
          render: (value) => (
            <div className="text-green-600 font-semibold">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'total-volume',
          header: 'Volume',
          accessor: 'totalVolume',
          render: (value) => (
            <div className="text-blue-600">
              {value?.toLocaleString() || '0'} L
            </div>
          )
        },
        {
          key: 'collections',
          header: 'Collections',
          accessor: 'collections',
          render: (value) => (
            <div className="text-purple-600 font-medium">
              KES {value?.toLocaleString() || '0'}
            </div>
          )
        },
        {
          key: 'efficiency',
          header: 'Efficiency',
          accessor: 'collections',
          render: (value, row) => {
            const efficiency = row.totalRevenue > 0 ? (value / row.totalRevenue) * 100 : 0;
            return `${efficiency.toFixed(1)}%`;
          }
        }
      ]
    };

    return baseColumns[viewType] || baseColumns.shifts;
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-lg mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Sales Data</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={refetch}
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
            <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive sales analytics with PDF export capabilities
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <span className="mr-2">📊</span>
              Export PDF
            </button>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <span className="mr-2">🔄</span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['shifts', 'products', 'islands', 'overview'].map((viewType) => (
            <button
              key={viewType}
              onClick={() => setFilters(prev => ({ ...prev, view: viewType }))}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                filters.view === viewType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {viewType}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select 
              value={filters.period}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Add more filters as needed */}
        </div>
      </div>

      {/* Summary Statistics */}
      {!loading && processedData[filters.view]?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              KES {summaryStats.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalVolume.toLocaleString()} L
            </div>
            <div className="text-sm text-gray-600">Fuel Volume</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              KES {summaryStats.totalCollections.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Collections</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.collectionEfficiency.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Collection Rate</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <MultiTable
        columns={getColumns(filters.view)}
        data={processedData[filters.view] || []}
        paginate={true}
        pageSize={10}
        responsiveBreakpoint="md"
        className="shadow-lg border-0"
        headerClass="bg-gradient-to-r from-blue-50 to-indigo-50"
        rowClass="hover:bg-blue-50 transition-colors duration-150 border-b border-gray-200"
        loading={loading}
        emptyMessage={`No ${filters.view} data found. Try adjusting your filters.`}
      />
    </div>
  );
};

export default SalesManagement;