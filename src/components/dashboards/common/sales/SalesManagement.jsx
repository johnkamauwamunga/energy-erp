// src/components/sales/SalesManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Select, DatePicker } from '../../../ui';
import { DollarSign, Download, Filter, Calendar } from 'lucide-react';
import { formatDate, formatCurrency } from '../../../../utils/helpers';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { useApp } from '../../../../context/AppContext';

// Mock Sales Data Generator
const generateSalesData = (stationId) => {
  const serviceStations = [
    {
      id: 'JOSKA',
      dailyTarget: 400000,
      monthlyTarget: 12000000
    },
    {
      id: 'KITENGELA',
      dailyTarget: 350000,
      monthlyTarget: 10500000
    },
    {
      id: 'NAIROBI_WEST',
      dailyTarget: 450000,
      monthlyTarget: 13500000
    },
    {
      id: 'THIKA',
      dailyTarget: 380000,
      monthlyTarget: 11400000
    }
  ];

  const baseRatios = {
    petrol: 0.48,
    diesel: 0.415,
    kerosene: 0.077,
    nonFuel: 0.029
  };
  
  const salesData = [];
  let recordCount = 1;
  
  // Determine which stations to generate data for
  const stationsToGenerate = stationId 
    ? serviceStations.filter(s => s.id === stationId)
    : serviceStations;
  
  stationsToGenerate.forEach(station => {
    for (let day = 1; day <= 31; day++) {
      const dateStr = day.toString().padStart(2, '0');
      const date = `2025-08-${dateStr}`;
      
      // Daily variation (80-120% of daily target)
      const dailyFactor = 0.8 + (Math.random() * 0.4);
      const dailyTotal = station.dailyTarget * dailyFactor;
      
      // Generate two shifts per day
      for (let shift = 1; shift <= 2; shift++) {
        // Shift timing configuration
        const shiftTimes = shift === 1 
          ? { from: 'T08:00:00', to: 'T16:00:00' } 
          : { from: 'T16:00:00', to: 'T23:59:59' };
        
        // Shift total (45-55% of daily total)
        const shiftFactor = 0.45 + (Math.random() * 0.1);
        let shiftTotal = dailyTotal * shiftFactor;
        
        // Apply weekday/weekend variation
        const weekday = new Date(date).getDay();
        if (weekday === 0 || weekday === 6) { // Weekend
          shiftTotal *= 0.7 + (Math.random() * 0.3); // 70-100% of normal
        } else { // Weekday
          shiftTotal *= 0.9 + (Math.random() * 0.2); // 90-110% of normal
        }
        
        // Calculate product sales with variations
        const products = {};
        let calculatedTotal = 0;
        
        Object.keys(baseRatios).forEach(product => {
          // Apply random variation (85-115%)
          const variation = 0.85 + (Math.random() * 0.3);
          const productSales = shiftTotal * baseRatios[product] * variation;
          products[product] = parseFloat(productSales.toFixed(2));
          calculatedTotal += products[product];
        });
        
        // Adjust for rounding discrepancies
        const adjustment = shiftTotal - calculatedTotal;
        products.petrol += adjustment;
        products.petrol = parseFloat(products.petrol.toFixed(2));
        products.total = parseFloat(shiftTotal.toFixed(2));
        
        // Create sales record
        salesData.push({
          id: `sale${recordCount++}`,
          stationId: station.id,
          shiftId: `shift${shift}`,
          fromDate: new Date(`${date}${shiftTimes.from}`),
          toDate: new Date(`${date}${shiftTimes.to}`),
          petrol: products.petrol,
          diesel: products.diesel,
          kerosene: products.kerosene,
          nonFuel: products.nonFuel,
          total: products.total
        });
      }
    }
  });
  
  return salesData;
};

const SalesManagement = () => {
  const { state } = useApp();
  const [filter, setFilter] = useState('daily');
  const [startDate, setStartDate] = useState(new Date(2025, 7, 7)); // Aug 7, 2025
  const [endDate, setEndDate] = useState(new Date(2025, 7, 31)); // Aug 31, 2025
  const [filteredData, setFilteredData] = useState([]);

  // Generate mock sales data for the current station
  const salesData = useMemo(() => {
    return generateSalesData(state.currentStation?.id);
  }, [state.currentStation?.id]);

  useEffect(() => {
    applyFilters();
  }, [filter, startDate, endDate, salesData]);

  const applyFilters = () => {
    let result = [...salesData];
    
    // Filter by date range
    if (filter === 'custom') {
      result = result.filter(sale => 
        sale.fromDate >= startDate && sale.toDate <= endDate
      );
    } else if (filter === 'daily') {
      const dayStart = new Date(startDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(startDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      result = result.filter(sale => 
        sale.fromDate >= dayStart && sale.toDate <= dayEnd
      );
    } else if (filter === 'monthly') {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      result = result.filter(sale => 
        sale.fromDate >= monthStart && sale.toDate <= monthEnd
      );
    } else if (filter === 'yearly') {
      const yearStart = new Date(startDate.getFullYear(), 0, 1);
      const yearEnd = new Date(startDate.getFullYear(), 11, 31);
      result = result.filter(sale => 
        sale.fromDate >= yearStart && sale.toDate <= yearEnd
      );
    }
    
    setFilteredData(result);
  };

  const calculateTotals = () => {
    return filteredData.reduce((totals, sale) => {
      return {
        petrol: totals.petrol + sale.petrol,
        diesel: totals.diesel + sale.diesel,
        kerosene: totals.kerosene + sale.kerosene,
        nonFuel: totals.nonFuel + sale.nonFuel,
        total: totals.total + sale.total
      };
    }, { petrol: 0, diesel: 0, kerosene: 0, nonFuel: 0, total: 0 });
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const companyName = state.currentCompany?.name || 'Company Name';
      const stationName = state.currentStation?.name || 'Station Name';
      const totals = calculateTotals();
      
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
      doc.text('Sales Report', 15, 32);
      
      // Report Details
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Report Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 15, 38);
      doc.text(`Generated: ${formatDate(new Date())}`, 15, 43);
      
      // Horizontal line separator
      doc.setDrawColor(...headerColor);
      doc.setLineWidth(0.3);
      doc.line(15, 46, doc.internal.pageSize.width - 15, 46);
      
      // Prepare table data
      const tableData = filteredData.map(sale => [
        formatDate(sale.fromDate, 'MM/dd/yyyy HH:mm'),
        formatDate(sale.toDate, 'MM/dd/yyyy HH:mm'),
        formatCurrency(sale.petrol, false),
        formatCurrency(sale.diesel, false),
        formatCurrency(sale.kerosene, false),
        formatCurrency(sale.nonFuel, false),
        formatCurrency(sale.total, false)
      ]);
      
      // Add totals row
      tableData.push([
        'TOTAL',
        '',
        formatCurrency(totals.petrol, false),
        formatCurrency(totals.diesel, false),
        formatCurrency(totals.kerosene, false),
        formatCurrency(totals.nonFuel, false),
        formatCurrency(totals.total, false)
      ]);
      
      // Generate table
      autoTable(doc, {
        head: [['Start Time', 'End Time', 'Petrol', 'Diesel', 'Kerosene', 'Non-Fuel', 'Total']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        styles: { 
          fontSize: 10,
          cellPadding: 3,
          valign: 'middle',
          halign: 'right',
          textColor: [40, 40, 40]
        },
        headStyles: {
          fillColor: headerColor,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 25 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
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
      
      // Add totals section below the table
      const finalY = doc.lastAutoTable.finalY + 10;
      if (finalY < doc.internal.pageSize.height - 30) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...headerColor);
        doc.text('SUMMARY TOTALS', 15, finalY);
        
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.text(`Petrol: ${formatCurrency(totals.petrol)}`, 15, finalY + 7);
        doc.text(`Diesel: ${formatCurrency(totals.diesel)}`, 15, finalY + 14);
        doc.text(`Kerosene: ${formatCurrency(totals.kerosene)}`, 15, finalY + 21);
        doc.text(`Non-Fuel: ${formatCurrency(totals.nonFuel)}`, 15, finalY + 28);
        
        doc.setFontSize(14);
        doc.setTextColor(...headerColor);
        doc.text(`TOTAL SALES: ${formatCurrency(totals.total)}`, 
                doc.internal.pageSize.width - 15, 
                finalY + 28, 
                { align: 'right' });
      }
      
      // Save the PDF
      doc.save(`${companyName}_${stationName}_Sales_Report.pdf`.replace(/\s+/g, '_'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  const columns = [
    { 
      header: 'Shift Start', 
      accessor: 'fromDate',
      render: (value) => formatDate(value, 'MM/dd/yyyy HH:mm')
    },
    { 
      header: 'Shift End', 
      accessor: 'toDate',
      render: (value) => formatDate(value, 'MM/dd/yyyy HH:mm')
    },
    { 
      header: 'Petrol', 
      accessor: 'petrol',
      render: (value) => formatCurrency(value),
      cellClassName: 'text-right'
    },
    { 
      header: 'Diesel', 
      accessor: 'diesel',
      render: (value) => formatCurrency(value),
      cellClassName: 'text-right'
    },
    { 
      header: 'Kerosene', 
      accessor: 'kerosene',
      render: (value) => formatCurrency(value),
      cellClassName: 'text-right'
    },
    { 
      header: 'Non-Fuel', 
      accessor: 'nonFuel',
      render: (value) => formatCurrency(value),
      cellClassName: 'text-right'
    },
    { 
      header: 'Total', 
      accessor: 'total',
      render: (value) => (
        <span className="font-semibold text-blue-700">
          {formatCurrency(value)}
        </span>
      ),
      cellClassName: 'text-right'
    }
  ];

  const totals = calculateTotals();

  return (
    <Card 
      title="Sales Report" 
      icon={DollarSign}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Filter size={16} className="text-gray-500" />
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              className="border-0 bg-transparent"
            />
          </div>
          
          {filter === 'custom' && (
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
              <Calendar size={16} className="text-gray-500" />
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="border-0 bg-transparent"
              />
              <span className="text-gray-400">to</span>
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="border-0 bg-transparent"
              />
            </div>
          )}
          
          <Button 
            variant="cosmic" 
            onClick={downloadPDF}
            icon={Download}
          >
            Export PDF
          </Button>
        </div>
      }
    >
      <Table
        columns={columns}
        data={filteredData}
        emptyMessage={
          <div className="text-center py-10">
            <div className="text-gray-500 mb-2">No sales data found</div>
            <p className="text-sm text-gray-400">
              Try adjusting your filters or check back later
            </p>
          </div>
        }
      />
      
      {/* Totals Section */}
      {filteredData.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-2">
              <div className="text-sm text-gray-500">Reporting Period</div>
              <div className="font-medium">
                {formatDate(startDate)} - {formatDate(endDate)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Petrol</div>
              <div className="font-semibold text-blue-700">
                {formatCurrency(totals.petrol)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Diesel</div>
              <div className="font-semibold text-blue-700">
                {formatCurrency(totals.diesel)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Kerosene</div>
              <div className="font-semibold text-blue-700">
                {formatCurrency(totals.kerosene)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Total</div>
              <div className="font-bold text-lg text-blue-800">
                {formatCurrency(totals.total)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SalesManagement;