// SummaryModal.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Card,
  Table,
  Space,
  Alert,
  Row,
  Col,
  Typography,
  Button,
  Input,
  message,
  Result
} from 'antd';
import {
  FileText,
  CheckCircle,
  X,
  Send,
  Calculator,
  Download,
  ArrowLeft,
  AlertCircle,
  Printer,
  FileDown,
  User,
  Building,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { shiftService } from '../../../../../services/shiftService/shiftService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text } = Typography;

// Response Modal Component - FIXED SYNTAX
const ResponseModal = ({
  visible,
  onClose,
  type,
  shiftData,
  error,
  onBackToShifts,
  onBackToSales
}) => {
  const isSuccess = type === 'success';
  const shiftNumber = shiftData?.shift?.shiftNumber || 'N/A';
  const stationName = shiftData?.shift?.station?.name || 'Station';
  const timestamp = shiftData?.timestamp ? new Date(shiftData.timestamp).toLocaleString() : new Date().toLocaleString();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={550}
      closable={true}
      centered
    >
      <Result
        status={isSuccess ? 'success' : 'error'}
        title={
          <Text strong style={{ fontSize: '20px' }}>
            {isSuccess ? 'Shift Closed Successfully!' : 'Failed to Close Shift'}
          </Text>
        }
        subTitle={
          <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
            {isSuccess ? (
              <>
                <Text>{stationName} • {shiftNumber}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Closed at: {timestamp}
                </Text>
              </>
            ) : (
              <>
                <Text>{error?.message || 'An unexpected error occurred'}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Please try again or contact support if the problem persists.
                </Text>
              </>
            )}
          </Space>
        }
        icon={isSuccess ? <CheckCircle size={64} color="#52c41a" /> : <AlertCircle size={64} color="#ff4d4f" />}
        extra={
          <Space size="middle">
            {isSuccess ? (
              <Button
                type="primary"
                icon={<ArrowLeft size={16} />}
                onClick={onBackToShifts}
                size="large"
                style={{ fontWeight: 'bold' }}
              >
                Back to Shift Management
              </Button>
            ) : (
              <>
                <Button
                  icon={<ArrowLeft size={16} />}
                  onClick={onBackToSales}
                  size="large"
                >
                  Back to Sales Step
                </Button>
                <Button
                  type="primary"
                  onClick={onClose}
                  size="large"
                >
                  Try Again
                </Button>
              </>
            )}
          </Space>
        }
      />
    </Modal>
  );
};

const SummaryModal = ({
  visible,
  onClose,
  onSubmitShift,
  islandSalesData,
  loading = false
}) => {
  const navigate = useNavigate();
  const { state } = useApp();
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [responseType, setResponseType] = useState('success');
  const [walletBalance, setWalletBalance] = useState(0);
  const [newWalletBalance, setNewWalletBalance] = useState(0);

  const printRef = useRef();

  // Safe data extraction
  const islands = islandSalesData?.islands || [];
  const overallStats = islandSalesData?.overallStats || {};
  const apiPayload = islandSalesData?.apiPayload || {};
  const shiftId = islandSalesData?.shiftId;
  const shiftNumber = islandSalesData?.shiftNumber;
  const stateStationId = state.currentStation?.id;
  const currentUser = state.currentUser;
  const stationName = state?.currentStation?.name || 'N/A';

  // Calculate totals for reconciliation table - FIXED VERSION
  const reconciliationData = useMemo(() => {
    return islands.map((island, index) => {
      const cashDrops = island.cashCollection || 0;
      const debtCollections = island.collections?.filter(c => c && c.type === 'debt') || [];
      
      // Calculate total debt amount
      const totalDebts = debtCollections.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      
      // Group debt by debtor for display
      const debtByDebtor = debtCollections.reduce((acc, debt) => {
        const debtorName = debt.debtorName || `Debtor ${debt.debtorId?.slice(0, 8)}`;
        if (!acc[debtorName]) {
          acc[debtorName] = 0;
        }
        acc[debtorName] += debt.amount || 0;
        return acc;
      }, {});

      // FIXED: Calculate variance correctly
      const totalSales = island.totalActualSales || 0;
      const receipts = island.receipts || 0;
      const expenses = island.expenses || 0;
      
      // Total collected = Cash Drops + Debt Collections + Receipts - Expenses
      const totalCollected = cashDrops + totalDebts + receipts - expenses;
      
      // Variance = Total Sales - Total Collected
      const variance = totalSales - totalCollected;

      return {
        key: index,
        islandName: island.islandName,
        attendants: island.attendants?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'No attendants',
        totalSales: totalSales,
        receipts: receipts,
        expenses: expenses,
        cashDrops: cashDrops,
        totalDebts: totalDebts,
        debtCollections: debtByDebtor,
        totalCollected: totalCollected,
        variance: variance,
        isComplete: island.isComplete || false
      };
    });
  }, [islands]);

  // Calculate overall totals - UPDATED
  const overallTotals = useMemo(() => {
    const totalCashDrops = reconciliationData.reduce((sum, row) => sum + row.cashDrops, 0);
    const totalSales = reconciliationData.reduce((sum, row) => sum + row.totalSales, 0);
    const totalReceipts = reconciliationData.reduce((sum, row) => sum + row.receipts, 0);
    const totalExpenses = reconciliationData.reduce((sum, row) => sum + row.expenses, 0);
    const totalVariance = reconciliationData.reduce((sum, row) => sum + row.variance, 0);
    const totalDebts = reconciliationData.reduce((sum, row) => sum + row.totalDebts, 0);

    return {
      totalCashDrops,
      totalSales,
      totalReceipts,
      totalExpenses,
      totalVariance,
      totalDebts,
      totalCollected: totalCashDrops + totalDebts + totalReceipts - totalExpenses
    };
  }, [reconciliationData]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const walletData = await bankingService.getStationWallet(stateStationId);
        const balance = walletData?.currentBalance || 0;
        setWalletBalance(balance);
        
        const actualCollection = overallTotals.totalSales;
        setNewWalletBalance(balance + actualCollection);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance(0);
        setNewWalletBalance(0);
      }
    };
    
    if (stateStationId) {
      fetchWallet();
    }
  }, [stateStationId, overallTotals]);

  // Cash Reconciliation Breakdown - UPDATED
  const cashReconciliation = useMemo(() => {
    const totalSales = overallTotals.totalSales;
    const totalDebts = overallTotals.totalDebts;
    const totalReceipts = overallTotals.totalReceipts;
    const totalExpenses = overallTotals.totalExpenses;
    const totalDrops = overallTotals.totalCashDrops;
    
    // FIXED: Actual Collection = Total Sales (this should match the calculated total collected)
    const actualCollection = totalSales;
    const totalCollected = totalDrops + totalDebts + totalReceipts - totalExpenses;
    const totalVariance = totalSales - totalCollected;
    
    return {
      totalSales,
      totalDebts,
      totalReceipts,
      totalExpenses,
      totalDrops,
      actualCollection,
      totalCollected,
      totalVariance,
      walletBalance,
      newWalletBalance: walletBalance + actualCollection
    };
  }, [overallTotals, walletBalance]);

// Get all unique debtor names for columns - UPDATED
const debtColumns = useMemo(() => {
  const allDebtors = new Set();
  reconciliationData.forEach(row => {
    Object.keys(row.debtCollections || {}).forEach(debtor => {
      allDebtors.add(debtor);
    });
  });

  return Array.from(allDebtors).map(debtor => ({
    title: debtor,
    dataIndex: ['debtCollections', debtor],
    key: debtor,
    width: 120,
    align: 'right',
    render: (amount) => amount ? (
      <Text strong style={{ color: '#faad14' }}>
        KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
      </Text>
    ) : null
  }));
}, [reconciliationData]);

  // Professional PDF Download in Landscape - BEAUTIFUL VERSION
  const handleDownloadPDF = () => {
    try {
      // Use landscape orientation
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Set document properties
      doc.setProperties({
        title: `Shift Finance Reconciliation - ${shiftNumber}`,
        subject: 'Daily Finance Reconciliation Report',
        author: `${currentUser?.firstName} ${currentUser?.lastName}`,
        creator: 'Fuel Management System'
      });

      // Colors
      const primaryColor = [41, 128, 185];    // Blue
      const secondaryColor = [52, 152, 219];  // Light Blue
      const accentColor = [46, 204, 113];     // Green
      const warningColor = [231, 76, 60];     // Red
      const darkColor = [44, 62, 80];         // Dark Blue
      const lightColor = [236, 240, 241];     // Light Gray

      let yPosition = 25;

      // Beautiful Header with background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 297, 40, 'F');
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SHIFT FINANCE RECONCILIATION REPORT', 148, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Daily Financial Operations Summary', 148, 22, { align: 'center' });

      // Station and Shift Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Station: ${stationName}`, 20, 32);
      doc.text(`Shift: ${shiftNumber}`, 148, 32, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 277, 32, { align: 'right' });

      yPosition = 50;

      // Summary Stats Box
      doc.setFillColor(...lightColor);
      doc.roundedRect(20, yPosition, 257, 20, 3, 3, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('FINANCIAL OVERVIEW', 30, yPosition + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      doc.text(`Total Sales: KES ${overallTotals.totalSales.toFixed(2)}`, 90, yPosition + 8);
      doc.text(`Cash Drops: KES ${overallTotals.totalCashDrops.toFixed(2)}`, 150, yPosition + 8);
      doc.text(`Total Variance: KES ${overallTotals.totalVariance.toFixed(2)}`, 210, yPosition + 8);
      
      // Color code variance
      if (overallTotals.totalVariance >= 0) {
        doc.setTextColor(...accentColor);
      } else {
        doc.setTextColor(...warningColor);
      }
      doc.text(`Variance: KES ${Math.abs(overallTotals.totalVariance).toFixed(2)}`, 210, yPosition + 8);
      doc.setTextColor(0, 0, 0);

      yPosition += 35;

      // Main Reconciliation Table Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('ISLAND RECONCILIATION DETAILS', 20, yPosition);

      yPosition += 8;

      // Get all unique debtor names for PDF table
      const allDebtors = new Set();
      reconciliationData.forEach(row => {
        Object.keys(row.debtCollections || {}).forEach(debtor => {
          allDebtors.add(debtor);
        });
      });
      const debtorList = Array.from(allDebtors);

      // Prepare table headers including debt columns
      const tableHeaders = [
        'Island', 
        'Attendants', 
        'Total Sales', 
        ...debtorList,  // Add all debtors as columns
        'Receipts', 
        'Expenses', 
        'Cash Drops', 
        'Variance'
      ];

      // Prepare table data
      const tableData = reconciliationData.map(row => {
        const baseData = [
          row.islandName,
          row.attendants,
          `KES ${row.totalSales.toFixed(2)}`
        ];

        // Add debtor amounts for this row
        const debtorAmounts = debtorList.map(debtor => 
          row.debtCollections[debtor] ? `KES ${row.debtCollections[debtor].toFixed(2)}` : ''
        );

        const restData = [
          ...debtorAmounts,
          `KES ${row.receipts.toFixed(2)}`,
          `KES ${row.expenses.toFixed(2)}`,
          `KES ${row.cashDrops.toFixed(2)}`,
          `KES ${row.variance.toFixed(2)}`
        ];

        return [...baseData, ...restData];
      });

      // Add main table with AutoTable
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPosition,
        styles: { 
          fontSize: 7,
          cellPadding: 3,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [0, 0, 0]
        },
        headStyles: { 
          fillColor: [...darkColor],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          lineWidth: 0.1,
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        },
        margin: { top: yPosition },
        tableWidth: 'wrap'
      });

      // Total row for main table
      const finalY = doc.lastAutoTable.finalY + 3;
      
      // Calculate totals for each debtor
      const debtorTotals = debtorList.map(debtor => 
        reconciliationData.reduce((sum, row) => sum + (row.debtCollections[debtor] || 0), 0)
      );

      const totalRow = [
        'TOTAL',
        '',
        `KES ${overallTotals.totalSales.toFixed(2)}`,
        ...debtorTotals.map(total => total > 0 ? `KES ${total.toFixed(2)}` : ''),
        `KES ${overallTotals.totalReceipts.toFixed(2)}`,
        `KES ${overallTotals.totalExpenses.toFixed(2)}`,
        `KES ${overallTotals.totalCashDrops.toFixed(2)}`,
        `KES ${overallTotals.totalVariance.toFixed(2)}`
      ];

      autoTable(doc, {
        body: [totalRow],
        startY: finalY,
        styles: {
          fontSize: 8,
          fontStyle: 'bold',
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2
        },
        margin: { top: finalY }
      });

      // Financial Summary Section
      const financialSummaryY = doc.lastAutoTable.finalY + 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('FINANCIAL SUMMARY BREAKDOWN', 20, financialSummaryY);

      // Financial summary table
      const summaryData = [
        ['TOTAL SALES', `KES ${cashReconciliation.totalSales.toFixed(2)}`],
        ['TOTAL DEBTS: ', `KES ${cashReconciliation.totalDebts.toFixed(2)}`],
        ['TOTAL RECEIPTS', `KES ${cashReconciliation.totalReceipts.toFixed(2)}`],
        ['SUB TOTAL', `KES ${(cashReconciliation.totalSales + cashReconciliation.totalReceipts).toFixed(2)}`],
        ['TOTAL EXPENSES', `KES ${cashReconciliation.totalExpenses.toFixed(2)}`],
        ['ACTUAL COLLECTION', `KES ${cashReconciliation.actualCollection.toFixed(2)}`],
        ['CASH DROPS', `KES ${cashReconciliation.totalDrops.toFixed(2)}`],
        ['STATION WALLET (BEFORE)', `KES ${cashReconciliation.walletBalance.toFixed(2)}`],
        ['NEW WALLET BALANCE', `KES ${cashReconciliation.newWalletBalance.toFixed(2)}`]
      ];

      autoTable(doc, {
        body: summaryData,
        startY: financialSummaryY + 8,
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [...secondaryColor],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' }
        },
        theme: 'grid',
        tableWidth: 150,
        margin: { left: 20 }
      });

      // Reconciliation Notes
      const notesY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('RECONCILIATION NOTES & COMMENTS', 20, notesY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      if (reconciliationNotes.trim()) {
        const splitNotes = doc.splitTextToSize(reconciliationNotes, 250);
        doc.text(splitNotes, 20, notesY + 7);
      } else {
        doc.text('No reconciliation notes provided for this shift.', 20, notesY + 7);
      }

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFillColor(...darkColor);
      doc.rect(0, pageHeight - 20, 297, 20, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(255, 255, 255);
      doc.text(`Generated on ${new Date().toLocaleString()} by ${currentUser?.firstName} ${currentUser?.lastName}`, 20, pageHeight - 12);
      doc.text(`Shift Finance Reconciliation Report - ${stationName}`, 148, pageHeight - 12, { align: 'center' });
      doc.text(`Page 1 of 1`, 277, pageHeight - 12, { align: 'right' });

      // Save the PDF
      doc.save(`shift-finance-reconciliation-${shiftNumber}.pdf`);
      message.success('Beautiful PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF report');
    }
  };

  // Download as Excel (CSV) - UPDATED WITH DEBT COLUMNS
  const handleDownloadExcel = () => {
    try {
      // Get all unique debtor names for CSV
      const allDebtors = new Set();
      reconciliationData.forEach(row => {
        Object.keys(row.debtCollections || {}).forEach(debtor => {
          allDebtors.add(debtor);
        });
      });
      const debtorList = Array.from(allDebtors);

      const headers = [
        'Island', 
        'Attendants', 
        'Total Sales', 
        ...debtorList,  // Add debt columns
        'Receipts', 
        'Expenses', 
        'Cash Drops', 
        'Variance'
      ];

      const csvData = reconciliationData.map(row => {
        const baseData = [
          `"${row.islandName}"`,
          `"${row.attendants}"`,
          row.totalSales
        ];

        // Add debtor amounts
        const debtorAmounts = debtorList.map(debtor => 
          row.debtCollections[debtor] || 0
        );

        const restData = [
          ...debtorAmounts,
          row.receipts,
          row.expenses,
          row.cashDrops,
          row.variance
        ];

        return [...baseData, ...restData];
      });

      // Add total row
      const debtorTotals = debtorList.map(debtor => 
        reconciliationData.reduce((sum, row) => sum + (row.debtCollections[debtor] || 0), 0)
      );

      csvData.push([
        '"TOTAL"',
        '""',
        overallTotals.totalSales,
        ...debtorTotals,
        overallTotals.totalReceipts,
        overallTotals.totalExpenses,
        overallTotals.totalCashDrops,
        overallTotals.totalVariance
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shift-finance-reconciliation-${shiftNumber}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Excel (CSV) downloaded successfully');
    } catch (error) {
      console.error('Error generating CSV:', error);
      message.error('Failed to generate Excel file');
    }
  };

  // Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Shift Finance Reconciliation - ${shiftNumber}</title>
          <style>
            @media print {
              body { 
                font-family: Arial, sans-serif; 
                margin: 15mm;
                color: #000;
                font-size: 12px;
              }
              .no-print { display: none !important; }
              @page {
                size: landscape;
                margin: 15mm;
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #000;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 3px solid #2c3e50; 
              padding-bottom: 15px; 
              background: linear-gradient(135deg, #2980b9, #2c3e50);
              color: white;
              padding: 20px;
              border-radius: 8px;
            }
            .document-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 20px;
              padding: 15px;
              background-color: #ecf0f1;
              border-radius: 6px;
              border-left: 4px solid #3498db;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
              font-size: 10px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #bdc3c7; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #2c3e50; 
              color: white;
              font-weight: bold; 
            }
            .summary { 
              margin-top: 20px; 
              padding: 20px; 
              border: 2px solid #3498db; 
              border-radius: 8px;
              background-color: #f8f9fa;
            }
            .text-right { text-align: right; }
            .total-row { 
              font-weight: bold; 
              background-color: #ecf0f1; 
            }
            .positive { color: #27ae60; font-weight: bold; }
            .negative { color: #e74c3c; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

// Main Reconciliation Table Columns - UPDATED WITH LOCALESTRING FORMATTING
const financialColumns = [
  {
    title: 'ISLAND',
    dataIndex: 'islandName',
    key: 'islandName',
    width: 120,
    fixed: 'left',
    render: (name) => (
      <Text strong>{name}</Text>
    ),
  },
  {
    title: 'ATTENDANT(S)',
    dataIndex: 'attendants',
    key: 'attendants',
    width: 150,
    render: (attendants) => (
      <Text>{attendants}</Text>
    ),
  },
  {
    title: 'TOTAL SALES',
    dataIndex: 'totalSales',
    key: 'totalSales',
    width: 120,
    align: 'right',
    render: (amount) => (
      <Text strong>
        KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
      </Text>
    ),
  },
  ...debtColumns,
  {
    title: 'RECEIPTS',
    dataIndex: 'receipts',
    key: 'receipts',
    width: 100,
    align: 'right',
    render: (amount) => (
      <Text>
        KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
      </Text>
    ),
  },
  {
    title: 'EXPENSES',
    dataIndex: 'expenses',
    key: 'expenses',
    width: 100,
    align: 'right',
    render: (amount) => (
      <Text>
        KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
      </Text>
    ),
  },
  {
    title: 'CASH DROPS',
    dataIndex: 'cashDrops',
    key: 'cashDrops',
    width: 120,
    align: 'right',
    render: (amount) => (
      <Text strong>
        KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
      </Text>
    ),
  },
  {
    title: 'VARIANCE',
    dataIndex: 'variance',
    key: 'variance',
    width: 120,
    align: 'right',
    render: (variance) => {
      const isPositive = variance >= 0;
      return (
        <Text strong style={{ color: isPositive ? '#52c41a' : '#fa541c' }}>
          {isPositive ? '+' : ''}KES {variance?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </Text>
      );
    },
  },
];

  // Handle shift submission using shiftService
  const handleSubmitShift = async () => {
    if (!reconciliationNotes.trim()) {
      message.warning('Please add reconciliation notes before submitting');
      return;
    }

    if (!shiftId) {
      message.error('Shift ID is missing. Cannot submit shift.');
      return;
    }

    setSubmitting(true);

    try {
      const finalPayload = {
        ...apiPayload,
        reconciliationNotes: reconciliationNotes.trim(),
        submittedAt: new Date().toISOString()
      };

      console.log('🚀 Submitting shift with payload:', finalPayload);
      
      const response = await shiftService.closeShift(shiftId, finalPayload);
      
      console.log('✅ Shift closed successfully:', response);
      
      setResponseData(response);
      setResponseType('success');
      setResponseModalVisible(true);
      
      if (onSubmitShift) {
        await onSubmitShift(response);
      }
      
    } catch (error) {
      console.error('❌ Error submitting shift:', error);
      
      setResponseData({ error });
      setResponseType('error');
      setResponseModalVisible(true);
      
    } finally {
      setSubmitting(false);
    }
  };

  // Handle navigation to shift management
  const handleBackToShiftManagement = () => {
    setResponseModalVisible(false);
    onClose();
    navigate('/station-manager/dashboard');
  };

  // Handle back to sales step (for errors)
  const handleBackToSalesStep = () => {
    setResponseModalVisible(false);
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <FileText size={20} />
            <Title level={4} style={{ margin: 0 }}>Shift Finance Reconciliation Report</Title>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width="95%"
        style={{ maxWidth: '1400px', top: 20 }}
        footer={null}
        closeIcon={<X size={18} />}
      >
        <div ref={printRef} style={{ padding: '8px 0', color: '#000' }}>
          {/* Document Header */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: 20, 
            borderBottom: '3px solid #2c3e50', 
            paddingBottom: 15,
            background: 'linear-gradient(135deg, #2980b9, #2c3e50)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <Title level={2} style={{ margin: 0, color: 'white' }}>SHIFT FINANCE RECONCILIATION REPORT</Title>
            <Text strong style={{ fontSize: '16px', color: 'white' }}>Daily Financial Operations Summary</Text>
            <div style={{ marginTop: 10 }}>
              <Space size="large">
                <Space>
                  <Building size={16} />
                  <Text strong style={{ color: 'white' }}>{stationName}</Text>
                </Space>
                <Space>
                  <FileText size={16} />
                  <Text strong style={{ color: 'white' }}>Shift: {shiftNumber}</Text>
                </Space>
                <Space>
                  <Calendar size={16} />
                  <Text strong style={{ color: 'white' }}>{new Date().toLocaleDateString()}</Text>
                </Space>
              </Space>
            </div>
          </div>

        
  {/* Document Information */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: 20, 
          padding: '15px', 
          backgroundColor: '#ecf0f1', 
          border: '1px solid #bdc3c7',
          borderRadius: '6px',
          borderLeft: '4px solid #3498db'
        }}>
          <div>
            <Space direction="vertical" size={2}>
              <Space>
              
                <Text strong>Reconciled By:</Text>
                <Text>{currentUser?.firstName} {currentUser?.lastName}</Text>
              </Space>
              <Space>
                
                <Text strong>Total Islands:</Text>
                <Text>{islands.length}</Text>
              </Space>
            </Space>
          </div>
          <div>
            <Space direction="vertical" size={2}>
              <Space>
              
                <Text strong>Total Sales:</Text>
                <Text strong>KES {overallTotals.totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </Space>
              <Space>
               
                <Text strong>Overall Variance:</Text>
                <Text strong style={{ color: overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c' }}>
                  {overallTotals.totalVariance >= 0 ? '+' : ''}KES {Math.abs(overallTotals.totalVariance).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </Space>
            </Space>
          </div>
        </div>
          {/* Main Reconciliation Table */}
          <Card 
            title={
              <Text strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                ISLAND RECONCILIATION DETAILS
              </Text>
            }
            bodyStyle={{ padding: 0 }}
            style={{ marginBottom: 20, border: '1px solid #bdc3c7' }}
          >
            <Table
              columns={financialColumns}
              dataSource={reconciliationData}
              pagination={false}
              size="middle"
              scroll={{ x: 1200 }}
              style={{ color: '#000' }}
          summary={() => (
        <Table.Summary>
          <Table.Summary.Row style={{ background: '#ecf0f1', fontWeight: 'bold' }}>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong>TOTAL</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <Text strong>KES {overallTotals.totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Table.Summary.Cell>
            
            {debtColumns.map((column, index) => {
              const debtorTotal = reconciliationData.reduce((sum, row) => 
                sum + (row.debtCollections[column.title] || 0), 0
              );
              return (
                <Table.Summary.Cell key={index} index={index + 2} align="right">
                  {debtorTotal > 0 && (
                    <Text strong>KES {debtorTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  )}
                </Table.Summary.Cell>
              );
            })}
            
            <Table.Summary.Cell index={debtColumns.length + 2} align="right">
              <Text strong>KES {overallTotals.totalReceipts.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={debtColumns.length + 3} align="right">
              <Text strong>KES {overallTotals.totalExpenses.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={debtColumns.length + 4} align="right">
              <Text strong>KES {overallTotals.totalCashDrops.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={debtColumns.length + 5} align="right">
              <Text strong style={{ color: overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c' }}>
                {overallTotals.totalVariance >= 0 ? '+' : ''}KES {Math.abs(overallTotals.totalVariance).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
         )}
            />
          </Card>

       {/* Financial Summary Section */}
        <Row gutter={[16, 16]}>
          <Col span={16}>
            {/* Additional data tables can go here if needed */}
          </Col>
          <Col span={8}>
            <Card 
              title={
                <Text strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                  FINANCIAL SUMMARY BREAKDOWN
                </Text>
              }
              bodyStyle={{ padding: '16px' }}
              style={{ 
                border: '2px solid #3498db',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6' }}>
                      <Text strong>Total Sales:</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      <Text strong>KES {cashReconciliation.totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6' }}>
                      <Space>
                        <CreditCard size={12} />
                        <Text>Total Debts: </Text>
                      </Space>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      <Text style={{ color: '#faad14' }}>KES {cashReconciliation.totalDebts.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6' }}>
                      <Text>Total Receipts:</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      <Text>KES {cashReconciliation.totalReceipts.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '2px solid #2c3e50' }}>
                      <Text strong>Sub Total:</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '2px solid #2c3e50', textAlign: 'right' }}>
                      <Text strong>
                        KES {(cashReconciliation.totalSales + cashReconciliation.totalReceipts).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6' }}>
                      <Text>Total Expenses:</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      <Text>KES {cashReconciliation.totalExpenses.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '2px solid #1890ff' }}>
                      <Text strong>Actual Collection:</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '2px solid #1890ff', textAlign: 'right' }}>
                      <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                        KES {cashReconciliation.actualCollection.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 0 8px 0', borderBottom: '1px solid #dee2e6' }}>
                      <Text>Cash Drops:</Text>
                    </td>
                    <td style={{ padding: '12px 0 8px 0', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      <Text>KES {cashReconciliation.totalDrops.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6' }}>
                      <Text>Station Wallet (Before):</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      <Text>KES {cashReconciliation.walletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', borderTop: '2px solid #52c41a' }}>
                      <Text strong>New Wallet Balance:</Text>
                    </td>
                    <td style={{ padding: '8px 0', borderTop: '2px solid #52c41a', textAlign: 'right' }}>
                      <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                        KES {cashReconciliation.newWalletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: '#e8f5e8', 
                border: '1px solid #52c41a',
                borderRadius: '6px'
              }}>
                <Text type="secondary" style={{ fontSize: '11px', color: '#2c3e50' }}>
                  <strong>Calculation:</strong> Actual Collection = Total Sales<br/>
                  <strong>Variance:</strong> Total Sales - (Cash Drops + Debts + Receipts - Expenses)<br/>
                  <strong>New Balance:</strong> Station Wallet + Actual Collection
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
          {/* Reconciliation Notes */}
          <Card 
            title={
              <Text strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                <FileText size={16} style={{ marginRight: 8 }} />
                RECONCILIATION NOTES & COMMENTS
              </Text>
            }
            style={{ marginTop: 20 }}
            bodyStyle={{ padding: '16px' }}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter detailed reconciliation notes, explanation of variances, special circumstances, or additional comments..."
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              maxLength={500}
              style={{ 
                border: '2px solid #3498db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <Text type="secondary" style={{ fontSize: '11px', color: '#666', display: 'block', marginTop: 8 }}>
              {reconciliationNotes.length}/500 characters
            </Text>
          </Card>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: 20,
            paddingTop: 20,
            borderTop: '3px solid #2c3e50'
          }}>
            <Space>
              <Button 
                icon={<FileDown size={14} />}
                onClick={handleDownloadPDF}
                size="middle"
                type="primary"
                style={{ 
                  background: 'linear-gradient(135deg, #2980b9, #2c3e50)',
                  border: 'none',
                  fontWeight: 'bold'
                }}
              >
                Download Beautiful PDF
              </Button>
              <Button 
                icon={<FileText size={14} />}
                onClick={handleDownloadExcel}
                size="middle"
                style={{ fontWeight: 'bold' }}
              >
                Download Excel
              </Button>
              <Button 
                icon={<Printer size={14} />}
                onClick={handlePrint}
                size="middle"
                style={{ fontWeight: 'bold' }}
              >
                Print Report
              </Button>
              
              <Button 
                onClick={onClose}
                icon={<X size={14} />}
                size="middle"
                disabled={submitting}
                style={{ fontWeight: 'bold' }}
              >
                Cancel
              </Button>
            </Space>
            
            <Button 
              type="primary"
              icon={<Send size={14} />}
              onClick={handleSubmitShift}
              loading={submitting}
              disabled={!reconciliationNotes.trim() || !shiftId}
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: '#52c41a',
                border: 'none',
                padding: '0 24px',
                height: '40px'
              }}
              size="middle"
            >
              <Space size={4}>
                <CheckCircle size={16} />
                Submit Shift Report
              </Space>
            </Button>
          </div>

          {/* Submission Warnings */}
          {!reconciliationNotes.trim() && (
            <Alert
              message="Reconciliation Notes Required"
              description="Please add detailed reconciliation notes before submitting the shift report."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {!shiftId && (
            <Alert
              message="Missing Shift Information"
              description="Unable to submit shift report without valid shift data."
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      </Modal>

      {/* Response Modal */}
      <ResponseModal
        visible={responseModalVisible}
        onClose={() => setResponseModalVisible(false)}
        type={responseType}
        shiftData={responseData}
        error={responseData?.error}
        onBackToShifts={handleBackToShiftManagement}
        onBackToSales={handleBackToSalesStep}
      />
    </>
  );
};

export default SummaryModal;