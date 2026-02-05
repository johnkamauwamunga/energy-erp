// EnhancedSummaryModal.jsx (UPDATED WITH EXPENSE DISPLAY)
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
  Tag,
  Divider,
  List,
  Statistic,
  Progress,
  Tooltip,
  Badge,
  Descriptions,
  Collapse
} from 'antd';
import {
  FileText,
  CheckCircle,
  X,
  Send,
  Download,
  ArrowLeft,
  AlertCircle,
  Printer,
  FileDown,
  User,
  Building,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  Wallet,
  Receipt,
  Users,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Save,
  CheckSquare,
  AlertTriangle,
  Plus,
  Minus,
  Eye,
  EyeOff,
  FileCheck,
  FolderOpen,
  FileJson,
  FileSpreadsheet,
  Receipt as ReceiptIcon,
  FileWarning
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { shiftService } from '../../../../../services/shiftService/shiftService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import fileSystemService  from '../../../../../services/fileSystemService/fileSystemService';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Enhanced Summary Modal Component with Expense Display
const EnhancedSummaryModal = ({
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
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savePath, setSavePath] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showDebtorDetails, setShowDebtorDetails] = useState({});
  const [showExpenseDetails, setShowExpenseDetails] = useState({});
  const [saveResult, setSaveResult] = useState(null);

  const printRef = useRef();

  // Safe data extraction
  const islands = islandSalesData?.islands || [];
  const overallStats = islandSalesData?.overallStats || {};
  const apiPayload = islandSalesData?.apiPayload || {};
  const shiftId = islandSalesData?.shiftId;
  const shiftNumber = islandSalesData?.shiftNumber;
  const stateStationId = islandSalesData?.stationId;
  const stationName = islandSalesData?.stationName || state?.currentStation?.name || 'N/A';
  const stationCode = islandSalesData?.stationCode || state?.currentStation?.code || 'N/A';
  const currentUser = state.currentUser;
  const autoExpenses = islandSalesData?.autoExpenses || {}; // Get auto expenses details

  // Format date for filename
  const getFormattedDate = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
      time: now.toLocaleTimeString('en-GB', { hour12: false }).replace(/:/g, '-'),
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0')
    };
  };

  // Calculate debtor breakdown
  const debtorBreakdown = useMemo(() => {
    const debtorMap = new Map();
    
    islands.forEach(island => {
      const collections = island.collections || [];
      collections.forEach(collection => {
        if (collection && collection.type === 'debt' && collection.debtorName) {
          const debtorName = collection.debtorName;
          const debtorId = collection.debtorId;
          const debtorCode = collection.debtorCode;
          const amount = collection.amount || 0;
          const phone = collection.debtorPhone || '';
          
          if (!debtorMap.has(debtorId || debtorName)) {
            debtorMap.set(debtorId || debtorName, {
              id: debtorId,
              name: debtorName,
              code: debtorCode,
              phone: phone,
              total: 0,
              transactions: []
            });
          }
          
          const debtor = debtorMap.get(debtorId || debtorName);
          debtor.total += amount;
          debtor.transactions.push({
            island: island.islandName,
            amount: amount,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          });
        }
      });
    });
    
    return Array.from(debtorMap.values()).sort((a, b) => b.total - a.total);
  }, [islands]);

  // Calculate expense breakdown by island
  const expenseBreakdown = useMemo(() => {
    const breakdown = [];
    
    islands.forEach(island => {
      const autoExpenseDetails = island.autoExpenseDetails || [];
      const manualExpenses = island.manualExpenses || 0;
      const totalExpenses = island.totalExpenses || 0;
      
      if (totalExpenses > 0) {
        breakdown.push({
          islandName: island.islandName,
          islandId: island.islandId,
          autoExpenses: island.autoExpenses || 0,
          manualExpenses: manualExpenses,
          totalExpenses: totalExpenses,
          autoExpenseDetails: autoExpenseDetails,
          hasAutoExpenses: autoExpenseDetails.length > 0
        });
      }
    });
    
    return breakdown.sort((a, b) => b.totalExpenses - a.totalExpenses);
  }, [islands]);

  // Enhanced reconciliation data
  const reconciliationData = useMemo(() => {
    return islands.map((island, index) => {
      const cashDrops = island.cashCollection || 0;
      const debtCollections = island.collections?.filter(c => c && c.type === 'debt') || [];
      const cashCollections = island.collections?.filter(c => c && c.type === 'cash') || [];
      
      const totalDebts = debtCollections.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      const totalCashCollected = cashCollections.reduce((sum, cash) => sum + (cash.amount || 0), 0);
      
      const totalSales = island.totalActualSales || 0;
      const receipts = island.receipts || 0;
      const autoExpenses = island.autoExpenses || 0;
      const manualExpenses = island.manualExpenses || 0;
      const totalExpenses = autoExpenses + manualExpenses;
      
      const totalCollected = cashDrops + totalDebts + receipts - totalExpenses;
      const variance = totalSales - totalCollected;
      
      const shortageStatus = variance > 10 ? 'SHORT' : variance < -10 ? 'OVER' : 'BALANCED';
      
      return {
        key: index,
        islandName: island.islandName,
        islandId: island.islandId,
        attendants: island.attendants || [],
        totalSales: totalSales,
        receipts: receipts,
        autoExpenses: autoExpenses,
        manualExpenses: manualExpenses,
        totalExpenses: totalExpenses,
        cashDrops: cashDrops,
        cashCollections: totalCashCollected,
        totalDebts: totalDebts,
        debtCollections: debtCollections,
        totalCollected: totalCollected,
        variance: variance,
        shortageStatus: shortageStatus,
        shortagePosted: island.shortagePosted || false,
        isComplete: island.isComplete || false,
        collections: island.collections || [],
        autoExpenseDetails: island.autoExpenseDetails || []
      };
    });
  }, [islands]);

  // Calculate overall totals
  const overallTotals = useMemo(() => {
    const totalCashDrops = reconciliationData.reduce((sum, row) => sum + row.cashDrops, 0);
    const totalSales = reconciliationData.reduce((sum, row) => sum + row.totalSales, 0);
    const totalReceipts = reconciliationData.reduce((sum, row) => sum + row.receipts, 0);
    const totalAutoExpenses = reconciliationData.reduce((sum, row) => sum + row.autoExpenses, 0);
    const totalManualExpenses = reconciliationData.reduce((sum, row) => sum + row.manualExpenses, 0);
    const totalExpenses = totalAutoExpenses + totalManualExpenses;
    const totalVariance = reconciliationData.reduce((sum, row) => sum + row.variance, 0);
    const totalDebts = reconciliationData.reduce((sum, row) => sum + row.totalDebts, 0);
    const totalCashCollections = reconciliationData.reduce((sum, row) => sum + row.cashCollections, 0);
    
    const islandsWithShortage = reconciliationData.filter(row => row.shortageStatus === 'SHORT').length;
    const islandsWithOverage = reconciliationData.filter(row => row.shortageStatus === 'OVER').length;
    const islandsBalanced = reconciliationData.filter(row => row.shortageStatus === 'BALANCED').length;
    
    // Calculate total shortage/overage amounts
    const totalShortageAmount = reconciliationData
      .filter(row => row.variance > 10)
      .reduce((sum, row) => sum + row.variance, 0);
    
    const totalOverageAmount = Math.abs(reconciliationData
      .filter(row => row.variance < -10)
      .reduce((sum, row) => sum + row.variance, 0));
    
    return {
      totalCashDrops,
      totalSales,
      totalReceipts,
      totalAutoExpenses,
      totalManualExpenses,
      totalExpenses,
      totalVariance,
      totalDebts,
      totalCashCollections,
      totalCollected: totalCashDrops + totalDebts + totalReceipts - totalExpenses,
      islandsWithShortage,
      islandsWithOverage,
      islandsBalanced,
      totalShortageAmount,
      totalOverageAmount,
      totalIslands: reconciliationData.length
    };
  }, [reconciliationData]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const walletData = await bankingService.getStationWallet(stateStationId);
        const balance = walletData?.currentBalance || 0;
        setWalletBalance(balance);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance(0);
      }
    };
    
    if (stateStationId) {
      fetchWallet();
    }
  }, [stateStationId]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Prepare report data for file system
  const prepareReportData = () => {
    return {
      shiftId,
      shiftNumber,
      stationName,
      stationCode,
      islands: reconciliationData,
      overallStats: overallTotals,
      walletBalance,
      debtorBreakdown,
      expenseBreakdown,
      autoExpenses: autoExpenses,
      reconciliationNotes: reconciliationNotes.trim(),
      timestamp: new Date().toISOString(),
      generatedBy: `${currentUser?.firstName} ${currentUser?.lastName}`,
      generatedById: currentUser?.id
    };
  };

  // Main Reconciliation Table Columns
  const financialColumns = [
    {
      title: 'ISLAND',
      dataIndex: 'islandName',
      key: 'islandName',
      width: 140,
      fixed: 'left',
      render: (name, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '13px' }}>{name}</Text>
          {record.attendants.length > 0 && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {record.attendants.length} attendant(s)
            </Text>
          )}
          {record.autoExpenses > 0 && (
            <Tag size="small" color="orange" style={{ marginTop: 2 }}>
              Auto Exp: {formatCurrency(record.autoExpenses)}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'CASH DROPS',
      dataIndex: 'cashDrops',
      key: 'cashDrops',
      width: 120,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'DEBT COLLECTIONS',
      dataIndex: 'totalDebts',
      key: 'totalDebts',
      width: 130,
      align: 'right',
      render: (amount, record) => (
        <Space direction="vertical" size={0} align="end">
          <Text style={{ fontSize: '13px', color: '#722ed1' }}>
            {formatCurrency(amount)}
          </Text>
          {record.debtCollections.length > 0 && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {record.debtCollections.length} transaction(s)
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'EXPENSES',
      dataIndex: 'totalExpenses',
      key: 'totalExpenses',
      width: 130,
      align: 'right',
      render: (amount, record) => (
        <Space direction="vertical" size={0} align="end">
          <Text strong style={{ 
            fontSize: '13px', 
            color: amount > 0 ? '#ff4d4f' : '#52c41a',
            fontWeight: 'bold' 
          }}>
            {formatCurrency(amount)}
          </Text>
          {record.autoExpenses > 0 && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Auto: {formatCurrency(record.autoExpenses)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'SHORT/OVER',
      dataIndex: 'shortageStatus',
      key: 'shortageStatus',
      width: 110,
      align: 'center',
      render: (status, record) => {
        const color = status === 'SHORT' ? '#fa541c' : status === 'OVER' ? '#faad14' : '#52c41a';
        const text = status === 'SHORT' ? 'SHORT' : status === 'OVER' ? 'OVER' : 'BALANCED';
        const amount = Math.abs(record.variance);
        
        return (
          <Space direction="vertical" size={2} align="center">
            <Tag 
              color={color}
              style={{ 
                margin: 0, 
                fontWeight: 'bold',
                fontSize: '11px',
                minWidth: '70px',
                textAlign: 'center'
              }}
            >
              {text}
            </Tag>
            {amount > 0 && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {formatCurrency(amount)}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'VARIANCE',
      dataIndex: 'variance',
      key: 'variance',
      width: 120,
      align: 'right',
      render: (variance) => {
        const color = variance > 0 ? '#fa541c' : variance < 0 ? '#faad14' : '#52c41a';
        const icon = variance > 0 ? '-' : variance < 0 ? '+' : '';
        
        return (
          <Text strong style={{ 
            fontSize: '13px', 
            color: color,
            fontWeight: 'bold' 
          }}>
            {icon}{formatCurrency(Math.abs(variance))}
          </Text>
        );
      },
    },
  ];

  // Debtor Collections Table
  const debtorColumns = [
    {
      title: 'DEBTOR NAME',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name, record) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: '13px' }}>{name}</Text>
          {record.code && (
            <Text type="secondary" style={{ fontSize: '10px' }}>Code: {record.code}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'TOTAL COLLECTED',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ fontSize: '13px', color: '#722ed1' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'TRANSACTIONS',
      dataIndex: 'transactions',
      key: 'transactions',
      width: 100,
      align: 'center',
      render: (transactions) => (
        <Badge 
          count={transactions.length} 
          style={{ 
            backgroundColor: '#722ed1',
            fontWeight: 'bold'
          }}
        />
      ),
    },
  ];

  // Expense Breakdown Table
  const expenseColumns = [
    {
      title: 'ISLAND',
      dataIndex: 'islandName',
      key: 'islandName',
      width: 150,
      render: (name, record) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: '13px' }}>{name}</Text>
          {record.hasAutoExpenses && (
            <Tag size="small" color="orange" style={{ marginTop: 2 }}>
              {record.autoExpenseDetails.length} auto expense(s)
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'AUTO EXPENSES',
      dataIndex: 'autoExpenses',
      key: 'autoExpenses',
      width: 130,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ fontSize: '13px', color: '#fa8c16' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'MANUAL EXPENSES',
      dataIndex: 'manualExpenses',
      key: 'manualExpenses',
      width: 130,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ fontSize: '13px', color: '#ff4d4f' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'TOTAL EXPENSES',
      dataIndex: 'totalExpenses',
      key: 'totalExpenses',
      width: 130,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ 
          fontSize: '14px', 
          color: '#ff4d4f',
          fontWeight: 'bold' 
        }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
  ];

  // Save report using fileSystemService
  const saveReportToFileSystem = async () => {
    try {
      setGeneratingReport(true);
      
      // Prepare the report data
      const reportData = prepareReportData();
      
      // Save using fileSystemService
      const result = await fileSystemService.saveShiftCashSummary(reportData);
      
      if (result.success) {
        setSaveResult(result);
        setSavePath(result.file?.path || 'Report saved successfully');
        
        // Show success message
        message.success({
          content: 'Report saved successfully!',
          duration: 4,
          icon: <CheckCircle size={16} color="#52c41a" />
        });
        
        return result;
      } else {
        throw new Error(result.message || 'Failed to save report');
      }
      
    } catch (error) {
      console.error('Error saving report:', error);
      message.error(`Failed to save report: ${error.message}`);
      throw error;
    } finally {
      setGeneratingReport(false);
    }
  };

  // Enhanced PDF Generation with Expenses
  const generatePDF = async () => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new jsPDF('l', 'mm', 'a4');
        const formattedDate = getFormattedDate();
        const reportDate = new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const reportTime = new Date().toLocaleTimeString('en-GB');
        
        // Colors
        const primaryColor = [41, 128, 185];
        const secondaryColor = [52, 152, 219];
        const successColor = [39, 174, 96];
        const warningColor = [241, 196, 15];
        const dangerColor = [231, 76, 60];
        const expenseColor = [230, 126, 34];
        
        let yPosition = 25;
        const margin = 15;
        const pageWidth = doc.internal.pageSize.width;
        
        // ================= HEADER =================
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SHIFT CASH SUMMARY REPORT', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${stationName} - Shift #${shiftNumber}`, pageWidth / 2, 26, { align: 'center' });
        doc.text(`Report Date: ${reportDate} • ${reportTime}`, pageWidth / 2, 32, { align: 'center' });
        doc.text(`Generated by: ${currentUser?.firstName} ${currentUser?.lastName}`, pageWidth / 2, 38, { align: 'center' });
        
        yPosition = 55;
        
        // ================= SUMMARY STATS =================
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('SHIFT SUMMARY', margin, yPosition);
        yPosition += 8;
        
        const summaryData = [
          ['Total Sales', formatCurrency(overallTotals.totalSales)],
          ['Cash Drops', formatCurrency(overallTotals.totalCashDrops)],
          ['Debt Collections', formatCurrency(overallTotals.totalDebts)],
          ['Auto Expenses', formatCurrency(overallTotals.totalAutoExpenses)],
          ['Manual Expenses', formatCurrency(overallTotals.totalManualExpenses)],
          ['Total Expenses', formatCurrency(overallTotals.totalExpenses)],
          ['Total Variance', formatCurrency(Math.abs(overallTotals.totalVariance))],
          ['Status', overallTotals.totalVariance === 0 ? 'BALANCED' : overallTotals.totalVariance > 0 ? 'SHORT' : 'OVER']
        ];
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Metric', 'Amount']],
          body: summaryData,
          margin: { left: margin, right: margin },
          headStyles: { 
            fillColor: [...primaryColor],
            textColor: [255, 255, 255],
            fontSize: 10
          },
          bodyStyles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { cellWidth: 60, halign: 'right' }
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // ================= ISLAND RECONCILIATION TABLE =================
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('ISLAND RECONCILIATION', margin, yPosition);
        yPosition += 8;
        
        const islandTableData = reconciliationData.map(row => [
          row.islandName,
          formatCurrency(row.cashDrops),
          formatCurrency(row.totalDebts),
          formatCurrency(row.totalExpenses),
          row.shortageStatus,
          formatCurrency(Math.abs(row.variance)),
          row.shortagePosted ? 'Posted' : 'Complete'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Island', 'Cash Drops', 'Debt Collections', 'Expenses', 'Short/Over', 'Variance', 'Status']],
          body: islandTableData,
          margin: { left: margin, right: margin },
          headStyles: { 
            fillColor: [...secondaryColor],
            textColor: [255, 255, 255],
            fontSize: 9
          },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 40, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 30, halign: 'center' },
            5: { cellWidth: 35, halign: 'right' },
            6: { cellWidth: 30, halign: 'center' }
          }
        });
        
        // Add summary row
        doc.autoTable({
          startY: doc.lastAutoTable.finalY,
          body: [[
            'TOTAL',
            formatCurrency(overallTotals.totalCashDrops),
            formatCurrency(overallTotals.totalDebts),
            formatCurrency(overallTotals.totalExpenses),
            overallTotals.totalVariance === 0 ? 'BALANCED' : overallTotals.totalVariance > 0 ? 'SHORT' : 'OVER',
            formatCurrency(Math.abs(overallTotals.totalVariance)),
            `${overallTotals.islandsBalanced}/${overallTotals.totalIslands} Balanced`
          ]],
          styles: { 
            fontSize: 10,
            fontStyle: 'bold',
            fillColor: [240, 240, 240]
          },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 40, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 30, halign: 'center' },
            5: { cellWidth: 35, halign: 'right' },
            6: { cellWidth: 30, halign: 'center' }
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // ================= EXPENSE BREAKDOWN TABLE =================
        if (expenseBreakdown.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('EXPENSE BREAKDOWN', margin, yPosition);
          yPosition += 8;
          
          const expenseTableData = expenseBreakdown.map(row => [
            row.islandName,
            formatCurrency(row.autoExpenses),
            formatCurrency(row.manualExpenses),
            formatCurrency(row.totalExpenses)
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Island', 'Auto Expenses', 'Manual Expenses', 'Total Expenses']],
            body: expenseTableData,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [...expenseColor],
              textColor: [255, 255, 255],
              fontSize: 9
            },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 45, halign: 'right' },
              2: { cellWidth: 45, halign: 'right' },
              3: { cellWidth: 45, halign: 'right' }
            }
          });
          
          // Add expense summary
          doc.autoTable({
            startY: doc.lastAutoTable.finalY,
            body: [[
              'TOTAL EXPENSES',
              formatCurrency(overallTotals.totalAutoExpenses),
              formatCurrency(overallTotals.totalManualExpenses),
              formatCurrency(overallTotals.totalExpenses)
            ]],
            styles: { 
              fontSize: 10,
              fontStyle: 'bold',
              fillColor: [255, 243, 205]
            },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 45, halign: 'right' },
              2: { cellWidth: 45, halign: 'right' },
              3: { cellWidth: 45, halign: 'right' }
            }
          });
          
          yPosition = doc.lastAutoTable.finalY + 10;
        }
        
        // ================= DEBTOR COLLECTIONS TABLE =================
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DEBTOR COLLECTIONS', margin, yPosition);
        yPosition += 8;
        
        if (debtorBreakdown.length > 0) {
          const debtorTableData = debtorBreakdown.map(debtor => [
            debtor.name,
            debtor.code || 'N/A',
            formatCurrency(debtor.total),
            debtor.transactions.length
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Debtor Name', 'Code', 'Total Collected', 'Transactions']],
            body: debtorTableData,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [...successColor],
              textColor: [255, 255, 255],
              fontSize: 9
            },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 40 },
              2: { cellWidth: 50, halign: 'right' },
              3: { cellWidth: 30, halign: 'center' }
            }
          });
          
          // Add debtor summary
          doc.autoTable({
            startY: doc.lastAutoTable.finalY,
            body: [[
              'TOTAL DEBTORS',
              debtorBreakdown.length,
              formatCurrency(overallTotals.totalDebts),
              debtorBreakdown.reduce((sum, d) => sum + d.transactions.length, 0)
            ]],
            styles: { 
              fontSize: 10,
              fontStyle: 'bold',
              fillColor: [240, 240, 240]
            },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 40, halign: 'center' },
              2: { cellWidth: 50, halign: 'right' },
              3: { cellWidth: 30, halign: 'center' }
            }
          });
          
          yPosition = doc.lastAutoTable.finalY + 10;
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.text('No debt collections recorded for this shift.', margin, yPosition);
          yPosition += 10;
        }
        
        // ================= RECONCILIATION NOTES =================
        yPosition = Math.max(doc.lastAutoTable?.finalY || yPosition, yPosition) + 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RECONCILIATION NOTES', margin, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const notes = reconciliationNotes || 'No reconciliation notes provided.';
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 2 * margin);
        doc.text(splitNotes, margin, yPosition);
        
        // ================= FOOTER =================
        const footerY = doc.internal.pageSize.height - 20;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${reportDate} at ${reportTime}`, margin, footerY);
        doc.text(`Station: ${stationName} (${stationCode})`, pageWidth - margin, footerY, { align: 'right' });
        
        doc.text(`Page 1 of 1`, pageWidth / 2, footerY, { align: 'center' });
        
        // Generate blob
        const pdfBlob = doc.output('blob');
        resolve(pdfBlob);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handle download only (without submission)
  const handleDownloadOnly = async () => {
    try {
      setGeneratingReport(true);
      
      // Save report first
      const result = await saveReportToFileSystem();
      
      if (result.success) {
        // Export as JSON
        const reportData = prepareReportData();
        const exportResult = await fileSystemService.exportAsJson(reportData);
        
        if (exportResult.success) {
          message.success('Report saved and downloaded successfully!');
        }
        
        // Also generate and download PDF
        const pdfBlob = await generatePDF();
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cash_summary_${stationCode}_shift${shiftNumber}_${getFormattedDate().year}-${getFormattedDate().month}-${getFormattedDate().day}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error('Failed to download report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Export as JSON
  const handleExportJson = async () => {
    try {
      const reportData = prepareReportData();
      const result = await fileSystemService.exportAsJson(reportData);
      
      if (result.success) {
        message.success('Report exported as JSON successfully!');
      }
    } catch (error) {
      message.error('Failed to export JSON');
    }
  };

  // Export as CSV
  const handleExportCsv = async () => {
    try {
      const reportData = prepareReportData();
      const result = await fileSystemService.exportAsCsv(reportData);
      
      if (result.success) {
        message.success('Report exported as CSV successfully!');
      }
    } catch (error) {
      message.error('Failed to export CSV');
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    if (!reconciliationNotes.trim()) {
      message.warning('Please add reconciliation notes before submitting');
      return;
    }

    setSubmitting(true);
    
    try {
      // Save report to file system
      const saveResult = await saveReportToFileSystem();
      
      if (saveResult.success) {
        // Call parent function with report path
        await onSubmitShift(saveResult.file?.path);
        
        message.success('Shift submitted successfully with report!');
        
        // Close modal after successful submission
        setTimeout(() => onClose(), 1500);
      } else {
        throw new Error(saveResult.message || 'Failed to save report');
      }
      
    } catch (error) {
      console.error('Error in final submission:', error);
      message.error(`Failed to submit shift: ${error.message}`);
      
      // Show validation errors if available
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          message.error(`${err.field}: ${err.message}`);
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToShiftManagement = () => {
    onClose();
    navigate('/station-manager/dashboard');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileCheck size={24} color="#1890ff" />
          <div>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Shift Cash Summary</Title>
            <Space size={4}>
              <Tag color="blue">{stationName}</Tag>
              <Tag color="geekblue">Shift #{shiftNumber}</Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {getFormattedDate().date}
              </Text>
            </Space>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="95%"
      style={{ maxWidth: '1400px', top: 20 }}
      footer={null}
      closeIcon={<X size={18} />}
      className="summary-modal-enhanced"
    >
      <div ref={printRef}>
        {/* Summary Stats Header */}
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#e6f7ff', border: '2px solid #1890ff' }}>
              <Statistic
                title="Total Sales"
                value={overallTotals.totalSales}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}
                suffix={
                  <Badge 
                    count={overallTotals.totalIslands} 
                    style={{ 
                      backgroundColor: '#1890ff',
                      marginLeft: 4
                    }}
                    title="Islands"
                  />
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#f6ffed', border: '2px solid #52c41a' }}>
              <Statistic
                title="Cash Drops"
                value={overallTotals.totalCashDrops}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ 
              background: '#fff7e6',
              border: '2px solid #fa8c16'
            }}>
              <Statistic
                title="Total Expenses"
                value={overallTotals.totalExpenses}
                precision={0}
                prefix="KES"
                valueStyle={{ 
                  color: '#fa8c16',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                suffix={
                  overallTotals.totalAutoExpenses > 0 && (
                    <Tooltip title={`KES ${overallTotals.totalAutoExpenses} auto expenses`}>
                      <Badge 
                        count="Auto" 
                        style={{ 
                          backgroundColor: '#fa8c16',
                          marginLeft: 4
                        }}
                      />
                    </Tooltip>
                  )
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ 
              background: overallTotals.totalVariance >= 0 ? '#fff2e8' : '#fff7e6',
              border: `2px solid ${overallTotals.totalVariance >= 0 ? '#fa541c' : '#faad14'}`
            }}>
              <Statistic
                title={overallTotals.totalVariance >= 0 ? "Total Shortage" : "Total Overage"}
                value={Math.abs(overallTotals.totalVariance)}
                precision={0}
                prefix="KES"
                valueStyle={{ 
                  color: overallTotals.totalVariance >= 0 ? '#fa541c' : '#faad14',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Expense Breakdown Section */}
        {expenseBreakdown.length > 0 && (
          <Card
            title={
              <Space>
                <ReceiptIcon size={18} color="#fa8c16" />
                <Text strong>Expense Breakdown</Text>
                <Tag color="orange">{expenseBreakdown.length} Islands with Expenses</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Total: {formatCurrency(overallTotals.totalExpenses)}
                </Text>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={expenseColumns}
                dataSource={expenseBreakdown}
                pagination={false}
                size="middle"
                scroll={{ x: 600 }}
                style={{ minWidth: 600 }}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                      {record.hasAutoExpenses ? (
                        <>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Auto-Loaded Expenses ({record.autoExpenseDetails.length}):
                          </Text>
                          <List
                            size="small"
                            dataSource={record.autoExpenseDetails}
                            renderItem={(expense, idx) => (
                              <List.Item>
                                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: '12px' }}>
                                      {expense.title || expense.description || 'Expense'}
                                    </Text>
                                    <Text strong style={{ fontSize: '12px', color: '#fa8c16' }}>
                                      {formatCurrency(expense.amount)}
                                    </Text>
                                  </div>
                                  {expense.description && (
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      {expense.description}
                                    </Text>
                                  )}
                                  {expense.category && (
                                    <Tag size="small" color="blue" style={{ fontSize: '10px' }}>
                                      {expense.category}
                                    </Tag>
                                  )}
                                </Space>
                              </List.Item>
                            )}
                          />
                        </>
                      ) : (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          No auto-loaded expenses. All expenses were entered manually during shift closing.
                        </Text>
                      )}
                      
                      {record.manualExpenses > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Manual Expenses (Entered During Shift Closing):
                          </Text>
                          <Alert
                            message={`KES ${record.manualExpenses.toFixed(2)}`}
                            description="Manually entered expenses for this island."
                            type="info"
                            showIcon
                          />
                        </div>
                      )}
                    </div>
                  ),
                  rowExpandable: (record) => record.hasAutoExpenses || record.manualExpenses > 0,
                  expandedRowKeys: Object.keys(showExpenseDetails).filter(key => showExpenseDetails[key]),
                  onExpand: (expanded, record) => {
                    setShowExpenseDetails(prev => ({
                      ...prev,
                      [record.islandId || record.islandName]: expanded
                    }));
                  }
                }}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>TOTAL EXPENSES</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong style={{ color: '#fa8c16', fontSize: '14px' }}>
                          {formatCurrency(overallTotals.totalAutoExpenses)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong style={{ color: '#ff4d4f', fontSize: '14px' }}>
                          {formatCurrency(overallTotals.totalManualExpenses)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <Text strong style={{ color: '#ff4d4f', fontSize: '14px' }}>
                          {formatCurrency(overallTotals.totalExpenses)}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </Card>
        )}

        {/* Island Reconciliation Table */}
        <Card
          title={
            <Space>
              <Building size={18} />
              <Text strong>Island Reconciliation</Text>
              <Tag color="blue">{reconciliationData.length} Islands</Tag>
            </Space>
          }
          style={{ marginBottom: 24 }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={financialColumns}
              dataSource={reconciliationData}
              pagination={false}
              size="middle"
              scroll={{ x: 800 }}
              style={{ minWidth: 800 }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ 
                    background: '#fafafa', 
                    fontWeight: 'bold',
                    borderTop: '2px solid #d9d9d9'
                  }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong>TOTALS ({reconciliationData.length} Islands)</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                        {formatCurrency(overallTotals.totalCashDrops)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong style={{ color: '#722ed1', fontSize: '14px' }}>
                        {formatCurrency(overallTotals.totalDebts)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text strong style={{ color: '#ff4d4f', fontSize: '14px' }}>
                        {formatCurrency(overallTotals.totalExpenses)}
                      </Text>
                      {overallTotals.totalAutoExpenses > 0 && (
                        <div style={{ fontSize: '11px', color: '#fa8c16' }}>
                          (Auto: {formatCurrency(overallTotals.totalAutoExpenses)})
                        </div>
                      )}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <Tag color={
                        overallTotals.totalVariance === 0 ? 'green' : 
                        overallTotals.totalVariance > 0 ? 'red' : 'gold'
                      } style={{ fontWeight: 'bold' }}>
                        {overallTotals.totalVariance === 0 ? 'BALANCED' : 
                         overallTotals.totalVariance > 0 ? 'SHORT' : 'OVER'}
                      </Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text strong style={{ 
                        color: overallTotals.totalVariance === 0 ? '#52c41a' : 
                               overallTotals.totalVariance > 0 ? '#fa541c' : '#faad14',
                        fontSize: '14px'
                      }}>
                        {overallTotals.totalVariance >= 0 ? '-' : '+'}{formatCurrency(Math.abs(overallTotals.totalVariance))}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </Card>

        {/* Debtor Collections Table */}
        {debtorBreakdown.length > 0 && (
          <Card
            title={
              <Space>
                <Users size={18} color="#722ed1" />
                <Text strong>Debtor Collections</Text>
                <Tag color="purple">{debtorBreakdown.length} Debtors</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Total: {formatCurrency(overallTotals.totalDebts)}
                </Text>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={debtorColumns}
                dataSource={debtorBreakdown}
                pagination={false}
                size="middle"
                scroll={{ x: 600 }}
                style={{ minWidth: 600 }}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>Transaction Details:</Text>
                      <List
                        size="small"
                        dataSource={record.transactions}
                        renderItem={(transaction, idx) => (
                          <List.Item>
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: '12px' }}>{transaction.island}</Text>
                                <Text strong style={{ fontSize: '12px', color: '#722ed1' }}>
                                  {formatCurrency(transaction.amount)}
                                </Text>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  {transaction.date}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  {transaction.time}
                                </Text>
                              </div>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  ),
                  rowExpandable: (record) => record.transactions.length > 0,
                  expandedRowKeys: Object.keys(showDebtorDetails).filter(key => showDebtorDetails[key]),
                  onExpand: (expanded, record) => {
                    setShowDebtorDetails(prev => ({
                      ...prev,
                      [record.id || record.name]: expanded
                    }));
                  }
                }}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>TOTAL DEBT COLLECTIONS</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong style={{ color: '#722ed1', fontSize: '14px' }}>
                          {formatCurrency(overallTotals.totalDebts)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="center">
                        <Text strong>
                          {debtorBreakdown.reduce((sum, d) => sum + d.transactions.length, 0)} transactions
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </Card>
        )}

        {/* Cash Summary Section */}
        <Card
          title={
            <Space>
              <Wallet size={18} color="#52c41a" />
              <Text strong>Cash Summary Report</Text>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #f0f8ff, #e6f7ff)',
                  border: '1px solid #1890ff'
                }}
              >
                <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
                  <DollarSign size={16} /> Collection Summary
                </Title>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Cash Drops:</Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      {formatCurrency(overallTotals.totalCashDrops)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Debt Collections:</Text>
                    <Text strong style={{ color: '#722ed1' }}>
                      {formatCurrency(overallTotals.totalDebts)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Receipts:</Text>
                    <Text strong style={{ color: '#faad14' }}>
                      {formatCurrency(overallTotals.totalReceipts)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Auto Expenses:</Text>
                    <Text strong style={{ color: '#fa8c16' }}>
                      {formatCurrency(overallTotals.totalAutoExpenses)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Manual Expenses:</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {formatCurrency(overallTotals.totalManualExpenses)}
                    </Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>Net Collected:</Text>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      {formatCurrency(overallTotals.totalCollected)}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #fff7e6, #ffe7ba)',
                  border: '1px solid #faad14'
                }}
              >
                <Title level={5} style={{ color: '#fa8c16', marginBottom: 16 }}>
                  <CreditCard size={16} /> Station Wallet
                </Title>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Previous Balance:</Text>
                    <Text strong style={{ color: '#1890ff' }}>
                      {formatCurrency(walletBalance)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Sales Revenue:</Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      {formatCurrency(overallTotals.totalSales)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Total Expenses:</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {formatCurrency(overallTotals.totalExpenses)}
                    </Text>
                  </div>
                  <Progress
                    percent={Math.min(100, ((overallTotals.totalSales - overallTotals.totalExpenses) / (walletBalance + overallTotals.totalSales)) * 100)}
                    strokeColor={{
                      '0%': '#1890ff',
                      '50%': '#52c41a',
                      '100%': '#fa8c16',
                    }}
                    style={{ margin: '8px 0' }}
                  />
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>New Balance:</Text>
                    <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                      {formatCurrency(walletBalance + overallTotals.totalSales - overallTotals.totalExpenses)}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Reconciliation Notes */}
        <Card
          title={
            <Space>
              <FileText size={18} color="#1890ff" />
              <Text strong>Reconciliation Notes</Text>
              <Tag color={reconciliationNotes.trim() ? 'green' : 'red'}>
                {reconciliationNotes.trim() ? 'Completed' : 'Required'}
              </Tag>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Input.TextArea
            rows={4}
            placeholder="Enter detailed reconciliation notes, explanation of variances, expense details, special circumstances, or additional comments..."
            value={reconciliationNotes}
            onChange={(e) => setReconciliationNotes(e.target.value)}
            maxLength={500}
            style={{
              border: reconciliationNotes.trim() ? '2px solid #52c41a' : '2px solid #ff4d4f',
              borderRadius: '6px',
              fontSize: '14px',
              padding: '12px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {reconciliationNotes.length}/500 characters
            </Text>
            <Text type="secondary" style={{ fontSize: '12px', color: reconciliationNotes.trim() ? '#52c41a' : '#ff4d4f' }}>
              {reconciliationNotes.trim() ? '✓ Notes ready' : '✗ Notes required for submission'}
            </Text>
          </div>
        </Card>

        {/* Action Buttons */}
        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
              <Space>
                <Button
                  icon={<FileDown size={16} />}
                  onClick={handleDownloadOnly}
                  size="middle"
                  type="primary"
                  loading={generatingReport}
                  style={{
                    background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                    border: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  {generatingReport ? 'Generating...' : 'Save & Download'}
                </Button>
                <Button
                  icon={<Printer size={16} />}
                  onClick={() => window.print()}
                  size="middle"
                >
                  Print Preview
                </Button>
                <Button
                  icon={<FileJson size={16} />}
                  onClick={handleExportJson}
                  size="middle"
                >
                  JSON
                </Button>
                <Button
                  icon={<FileSpreadsheet size={16} />}
                  onClick={handleExportCsv}
                  size="middle"
                >
                  CSV
                </Button>
              </Space>
              
              <Space>
                <Button
                  onClick={onClose}
                  icon={<X size={16} />}
                  size="middle"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<Send size={16} />}
                  onClick={handleFinalSubmit}
                  loading={submitting}
                  disabled={!reconciliationNotes.trim() || !shiftId || submitting}
                  style={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                    border: 'none',
                    padding: '0 32px',
                    height: '40px',
                    fontSize: '15px'
                  }}
                  size="large"
                >
                  <Space size={6}>
                    <CheckCircle size={18} />
                    {submitting ? 'Submitting...' : 'Submit Shift & Save Report'}
                  </Space>
                </Button>
              </Space>
            </div>

            {/* File Path Display */}
            {saveResult && saveResult.success && (
              <Alert
                message="Report Saved Successfully"
                description={
                  <Space direction="vertical" size={2}>
                    <Text strong>File: {saveResult.file?.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Path: {saveResult.file?.path}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Size: {saveResult.file?.size} bytes
                    </Text>
                    {saveResult.metadata && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {saveResult.metadata.dataPoints?.islands} islands • {saveResult.metadata.dataPoints?.debtors} debtors • {saveResult.metadata.dataPoints?.totalTransactions} transactions • {overallTotals.totalAutoExpenses > 0 ? `${expenseBreakdown.length} islands with auto expenses` : 'No auto expenses'}
                        </Text>
                      </div>
                    )}
                  </Space>
                }
                type="success"
                showIcon
                icon={<FolderOpen size={16} />}
                action={
                  saveResult.file?.downloadUrl && (
                    <Button 
                      size="small" 
                      type="link"
                      href={saveResult.file.downloadUrl}
                      download={saveResult.file.name}
                    >
                      Download
                    </Button>
                  )
                }
              />
            )}

            {/* Submission Warnings */}
            {!reconciliationNotes.trim() && (
              <Alert
                message="Reconciliation Notes Required"
                description="Please add detailed reconciliation notes before submitting the shift report."
                type="warning"
                showIcon
              />
            )}
          </Space>
        </Card>
      </div>
    </Modal>
  );
};

export default EnhancedSummaryModal;