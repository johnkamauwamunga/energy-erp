// EnhancedSummaryModal.jsx (FIXED - Enhanced PDF with multi-page support)
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

// Enhanced Summary Modal Component with updated shortage-only logic
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
  const [validationErrors, setValidationErrors] = useState([]);

  const printRef = useRef();

  // Safe data extraction with fallbacks
  const islands = islandSalesData?.islands || [];
  const overallStats = islandSalesData?.overallStats || {};
  const apiPayload = islandSalesData?.apiPayload || {};
  const shiftId = islandSalesData?.shiftId;
  const shiftNumber = islandSalesData?.shiftNumber;
  const stateStationId = islandSalesData?.stationId;
  const stationName = islandSalesData?.stationName || state?.currentStation?.name || 'N/A';
  const stationCode = islandSalesData?.stationCode || state?.currentStation?.code || 'N/A';
  const currentUser = state.currentUser;
  const autoExpenses = islandSalesData?.autoExpenses || {};

  // Format date for filename
  const getFormattedDate = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
      time: now.toLocaleTimeString('en-GB', { hour12: false }).replace(/:/g, '-'),
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
      fullDate: now.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      fullTime: now.toLocaleTimeString('en-GB')
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
          key: island.islandId || island.islandName,
          islandName: island.islandName,
          islandId: island.islandId,
          autoExpenses: island.autoExpenses || 0,
          manualExpenses: manualExpenses,
          totalExpenses: totalExpenses,
          autoExpenseDetails: autoExpenseDetails,
          hasAutoExpenses: autoExpenseDetails.length > 0,
          hasManualExpenses: manualExpenses > 0
        });
      }
    });
    
    return breakdown.sort((a, b) => b.totalExpenses - a.totalExpenses);
  }, [islands]);

  // ========== MODIFIED RECONCILIATION DATA - Only shortages ==========
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
      
      // ========== MODIFIED: Only track shortage (when expected > collected) ==========
      // If collected >= expected, shortage is 0
      const expectedTotal = totalSales + receipts - totalExpenses;
      const shortageAmount = expectedTotal > totalCollected ? expectedTotal - totalCollected : 0;
      
      const status = shortageAmount > 10 ? 'SHORT' : 'OK';
      const statusDisplay = shortageAmount === 0 ? 'Complete ✓' : shortageAmount > 10 ? 'Shortage' : 'Minor (<10)';
      
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
        expectedTotal: expectedTotal,
        shortageAmount: shortageAmount, // Only > 0 when collected < expected
        status: status,
        statusDisplay: statusDisplay,
        shortagePosted: island.shortagePosted || false,
        isComplete: island.isComplete || false,
        collections: island.collections || [],
        autoExpenseDetails: island.autoExpenseDetails || []
      };
    });
  }, [islands]);

  // ========== MODIFIED OVERALL TOTALS - Only shortages ==========
  const overallTotals = useMemo(() => {
    const totalCashDrops = reconciliationData.reduce((sum, row) => sum + row.cashDrops, 0);
    const totalSales = reconciliationData.reduce((sum, row) => sum + row.totalSales, 0);
    const totalReceipts = reconciliationData.reduce((sum, row) => sum + row.receipts, 0);
    const totalAutoExpenses = reconciliationData.reduce((sum, row) => sum + row.autoExpenses, 0);
    const totalManualExpenses = reconciliationData.reduce((sum, row) => sum + row.manualExpenses, 0);
    const totalExpenses = totalAutoExpenses + totalManualExpenses;
    const totalDebts = reconciliationData.reduce((sum, row) => sum + row.totalDebts, 0);
    const totalCashCollections = reconciliationData.reduce((sum, row) => sum + row.cashCollections, 0);
    const totalCollected = totalCashDrops + totalDebts + totalReceipts - totalExpenses;
    const totalExpected = totalSales + totalReceipts - totalExpenses;
    
    // ========== Only count shortages (when collected < expected) ==========
    const totalShortageAmount = reconciliationData
      .filter(row => row.shortageAmount > 10) // Only count shortages above threshold
      .reduce((sum, row) => sum + row.shortageAmount, 0);
    
    const islandsWithShortage = reconciliationData.filter(row => row.shortageAmount > 10).length;
    const islandsWithMinorShortage = reconciliationData.filter(row => row.shortageAmount > 0 && row.shortageAmount <= 10).length;
    const islandsComplete = reconciliationData.filter(row => row.shortageAmount === 0).length;
    
    // Calculate net position (should be positive when collected > expected, but we don't track overage)
    const netPosition = totalCollected - totalExpected;
    
    return {
      totalCashDrops,
      totalSales,
      totalReceipts,
      totalAutoExpenses,
      totalManualExpenses,
      totalExpenses,
      totalDebts,
      totalCashCollections,
      totalCollected,
      totalExpected,
      totalShortageAmount, // Only shortages above threshold
      islandsWithShortage,
      islandsWithMinorShortage,
      islandsComplete,
      totalIslands: reconciliationData.length,
      hasExpenses: totalExpenses > 0,
      hasAutoExpenses: totalAutoExpenses > 0,
      hasManualExpenses: totalManualExpenses > 0,
      netPosition, // Positive = over-collected, but we don't track as shortage
      hasShortages: totalShortageAmount > 0
    };
  }, [reconciliationData]);

  // Validate data before submission
  const validateSubmission = () => {
    const errors = [];
    
    if (!reconciliationNotes.trim()) {
      errors.push('Reconciliation notes are required');
    }
    
    if (reconciliationData.length === 0) {
      errors.push('No island data available');
    }
    
    const incompleteIslands = reconciliationData.filter(island => !island.isComplete);
    if (incompleteIslands.length > 0) {
      errors.push(`${incompleteIslands.length} island(s) are incomplete`);
    }
    
    // ========== Check for unresolved shortages (above threshold and not posted) ==========
    const unresolvedShortages = reconciliationData.filter(
      island => island.shortageAmount > 10 && !island.shortagePosted
    );
    if (unresolvedShortages.length > 0) {
      errors.push(`${unresolvedShortages.length} island(s) have unresolved shortages above KES 10`);
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

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
    
    if (stateStationId && visible) {
      fetchWallet();
    }
  }, [stateStationId, visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setReconciliationNotes('');
      setSaveResult(null);
      setValidationErrors([]);
    }
  }, [visible]);

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
      generatedBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Unknown',
      generatedById: currentUser?.id,
      metadata: {
        version: '1.0',
        totalIslands: reconciliationData.length,
        totalDebtors: debtorBreakdown.length,
        totalTransactions: debtorBreakdown.reduce((sum, d) => sum + d.transactions.length, 0),
        totalExpenseItems: expenseBreakdown.reduce((sum, e) => sum + (e.autoExpenseDetails?.length || 0), 0),
        hasShortages: overallTotals.hasShortages,
        totalShortageAmount: overallTotals.totalShortageAmount
      }
    };
  };

  // ========== MODIFIED TABLE COLUMNS - Only show shortage ==========
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
            <Tooltip title={`Auto-loaded expenses: ${formatCurrency(record.autoExpenses)}`}>
              <Tag size="small" color="orange" style={{ marginTop: 2 }}>
                Auto: {formatCurrency(record.autoExpenses)}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'EXPECTED',
      key: 'expectedTotal',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
          {formatCurrency(record.expectedTotal)}
        </Text>
      ),
    },
    {
      title: 'COLLECTED',
      key: 'totalCollected',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
          {formatCurrency(record.totalCollected)}
        </Text>
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
            <Tooltip title={`Auto: ${formatCurrency(record.autoExpenses)} • Manual: ${formatCurrency(record.manualExpenses)}`}>
              <Text type="secondary" style={{ fontSize: '10px', cursor: 'help' }}>
                Auto: {formatCurrency(record.autoExpenses)}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'SHORTAGE',
      key: 'shortageAmount',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.shortageAmount === 0) {
          return <Tag color="green">None</Tag>;
        } else if (record.shortageAmount <= 10) {
          return (
            <Tooltip title="Below minimum threshold (KES 10)">
              <Tag color="blue">KES {record.shortageAmount.toFixed(2)}</Tag>
            </Tooltip>
          );
        } else {
          return (
            <Space direction="vertical" size={2} align="center">
              <Tag color="red" style={{ fontWeight: 'bold' }}>
                KES {record.shortageAmount.toFixed(2)}
              </Tag>
              {record.shortagePosted && (
                <Tag color="green" size="small" style={{ fontSize: '9px' }}>
                  Posted ✓
                </Tag>
              )}
            </Space>
          );
        }
      },
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (record.shortageAmount === 0) {
          return <Tag color="green">Complete ✓</Tag>;
        } else if (record.shortageAmount <= 10) {
          return <Tag color="blue">Minor</Tag>;
        } else if (record.shortagePosted) {
          return <Tag color="orange">Shortage Posted</Tag>;
        } else {
          return <Tag color="red">Unresolved</Tag>;
        }
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
          {record.phone && (
            <Text type="secondary" style={{ fontSize: '10px' }}>Phone: {record.phone}</Text>
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
          {record.hasManualExpenses && (
            <Tag size="small" color="red" style={{ marginTop: 2 }}>
              Manual expenses
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
      
      const reportData = prepareReportData();
      
      const result = await fileSystemService.saveShiftCashSummary(reportData);
      
      if (result.success) {
        setSaveResult(result);
        setSavePath(result.file?.path || 'Report saved successfully');
        
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

  // ========== ENHANCED PDF GENERATION - Multi-page landscape with all data ==========
  const generatePDF = async () => {
    return new Promise((resolve, reject) => {
      try {
        // Create new PDF in landscape orientation
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        const formattedDate = getFormattedDate();
        
        // Colors
        const primaryColor = [41, 128, 185];      // Blue
        const secondaryColor = [52, 152, 219];    // Light Blue
        const successColor = [39, 174, 96];       // Green
        const warningColor = [241, 196, 15];      // Yellow
        const dangerColor = [231, 76, 60];        // Red
        const expenseColor = [230, 126, 34];      // Orange
        const debtorColor = [155, 89, 182];       // Purple
        const headerBg = [240, 240, 240];          // Light Gray
        
        let yPosition = 20;
        const margin = 15;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Helper function to check if we need a new page
        const checkPageBreak = (neededSpace) => {
          if (yPosition + neededSpace > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
            return true;
          }
          return false;
        };
        
        // ================= PAGE 1: HEADER =================
        // Header background
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('COLLECTION SUMMARY REPORT', pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`${stationName} (${stationCode}) - Shift #${shiftNumber}`, pageWidth / 2, 22, { align: 'center' });
        doc.text(`Generated: ${formattedDate.fullDate} at ${formattedDate.fullTime}`, pageWidth / 2, 29, { align: 'center' });
        
        yPosition = 45;
        
        // ================= PAGE 1: EXECUTIVE SUMMARY =================
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('EXECUTIVE SUMMARY', margin, yPosition);
        yPosition += 8;
        
        // Create executive summary boxes
        const boxWidth = (pageWidth - 2 * margin - 30) / 3;
        
        // Box 1: Sales Summary
        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPosition, boxWidth, 35, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Total Sales', margin + 5, yPosition + 7);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(formatCurrency(overallTotals.totalSales), margin + 5, yPosition + 22);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`${overallTotals.totalIslands} Islands`, margin + 5, yPosition + 30);
        
        // Box 2: Collections Summary
        doc.setFillColor(240, 255, 240);
        doc.setDrawColor(...successColor);
        doc.roundedRect(margin + boxWidth + 15, yPosition, boxWidth, 35, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Total Collected', margin + boxWidth + 20, yPosition + 7);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(formatCurrency(overallTotals.totalCollected), margin + boxWidth + 20, yPosition + 22);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Cash: ${formatCurrency(overallTotals.totalCashDrops)}`, margin + boxWidth + 20, yPosition + 30);
        
        // Box 3: Shortage Summary
        doc.setFillColor(255, 240, 240);
        doc.setDrawColor(...dangerColor);
        doc.roundedRect(margin + 2 * (boxWidth + 15), yPosition, boxWidth, 35, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Total Shortage', margin + 2 * (boxWidth + 15) + 5, yPosition + 7);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(overallTotals.hasShortages ? dangerColor : successColor);
        doc.text(overallTotals.hasShortages ? formatCurrency(overallTotals.totalShortageAmount) : 'None', 
                 margin + 2 * (boxWidth + 15) + 5, yPosition + 22);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`${overallTotals.islandsWithShortage} Islands with shortages`, margin + 2 * (boxWidth + 15) + 5, yPosition + 30);
        
        yPosition += 45;
        
        // ================= PAGE 1: ISLAND RECONCILIATION TABLE =================
        checkPageBreak(60);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ISLAND RECONCILIATION', margin, yPosition);
        yPosition += 8;
        
        const islandTableData = reconciliationData.map(row => [
          row.islandName,
          formatCurrency(row.expectedTotal),
          formatCurrency(row.totalCollected),
          formatCurrency(row.totalExpenses),
          row.shortageAmount === 0 ? 'None' : `KES ${row.shortageAmount.toFixed(2)}`,
          row.shortagePosted ? 'Posted' : (row.shortageAmount > 10 ? 'Unresolved' : 'Complete')
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Island', 'Expected', 'Collected', 'Expenses', 'Shortage', 'Status']],
          body: islandTableData,
          margin: { left: margin, right: margin },
          headStyles: { 
            fillColor: [...secondaryColor],
            textColor: [255, 255, 255],
            fontSize: 10,
            halign: 'center'
          },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 45, halign: 'right' },
            2: { cellWidth: 45, halign: 'right' },
            3: { cellWidth: 40, halign: 'right' },
            4: { cellWidth: 40, halign: 'center' },
            5: { cellWidth: 35, halign: 'center' }
          },
          didDrawPage: (data) => {
            // Add page number
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
          }
        });
        
        // Get the final Y position after the table
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // ================= PAGE 1: SUMMARY ROW =================
        checkPageBreak(15);
        
        doc.setFillColor(...headerBg);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        doc.text('TOTAL', margin + 5, yPosition + 8);
        doc.text(formatCurrency(overallTotals.totalExpected), margin + 60, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalCollected), margin + 110, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalExpenses), margin + 155, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalShortageAmount), margin + 200, yPosition + 8, { align: 'center' });
        doc.text(`${overallTotals.islandsComplete}/${overallTotals.totalIslands} Complete`, margin + 245, yPosition + 8, { align: 'center' });
        
        yPosition += 20;
        
        // ================= PAGE 1: EXPENSE BREAKDOWN (if any) =================
        if (expenseBreakdown.length > 0) {
          if (checkPageBreak(50)) {
            // If new page, add section header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EXPENSE BREAKDOWN', margin, yPosition);
            yPosition += 8;
          } else {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EXPENSE BREAKDOWN', margin, yPosition);
            yPosition += 8;
          }
          
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
              fontSize: 10,
              halign: 'center'
            },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 60, halign: 'right' },
              2: { cellWidth: 60, halign: 'right' },
              3: { cellWidth: 60, halign: 'right' }
            },
            didDrawPage: (data) => {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
          });
          
          // Add expense summary row
          yPosition = doc.lastAutoTable.finalY + 5;
          
          doc.setFillColor(...headerBg);
          doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('TOTAL EXPENSES', margin + 5, yPosition + 7);
          doc.text(formatCurrency(overallTotals.totalAutoExpenses), margin + 70, yPosition + 7, { align: 'right' });
          doc.text(formatCurrency(overallTotals.totalManualExpenses), margin + 135, yPosition + 7, { align: 'right' });
          doc.text(formatCurrency(overallTotals.totalExpenses), margin + 200, yPosition + 7, { align: 'right' });
          
          yPosition += 15;
        }
        
        // ================= PAGE 2: DEBTOR COLLECTIONS (if any) =================
        if (debtorBreakdown.length > 0) {
          // Force new page for debtor collections
          doc.addPage();
          yPosition = 20;
          
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...debtorColor);
          doc.text('DEBTOR COLLECTIONS', margin, yPosition);
          yPosition += 10;
          
          // Summary stats for debtors
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Total Debtors: ${debtorBreakdown.length}`, margin, yPosition);
          doc.text(`Total Debt Collected: ${formatCurrency(overallTotals.totalDebts)}`, margin + 80, yPosition);
          doc.text(`Total Transactions: ${debtorBreakdown.reduce((sum, d) => sum + d.transactions.length, 0)}`, margin + 160, yPosition);
          yPosition += 10;
          
          const debtorTableData = debtorBreakdown.map(debtor => [
            debtor.name,
            debtor.code || 'N/A',
            debtor.phone || 'N/A',
            formatCurrency(debtor.total),
            debtor.transactions.length.toString()
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Debtor Name', 'Code', 'Phone', 'Total Collected', 'Transactions']],
            body: debtorTableData,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [...debtorColor],
              textColor: [255, 255, 255],
              fontSize: 10,
              halign: 'center'
            },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
              0: { cellWidth: 55 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 45 },
              3: { cellWidth: 50, halign: 'right' },
              4: { cellWidth: 30, halign: 'center' }
            },
            didDrawPage: (data) => {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
          });
          
          yPosition = doc.lastAutoTable.finalY + 10;
          
          // Detailed transaction view for each debtor
          debtorBreakdown.forEach((debtor, index) => {
            if (debtor.transactions.length > 0) {
              if (yPosition + 40 > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...debtorColor);
              doc.text(`${debtor.name} - Transactions`, margin, yPosition);
              yPosition += 6;
              
              const transactionData = debtor.transactions.map(t => [
                t.island,
                t.date,
                t.time,
                formatCurrency(t.amount)
              ]);
              
              autoTable(doc, {
                startY: yPosition,
                head: [['Island', 'Date', 'Time', 'Amount']],
                body: transactionData,
                margin: { left: margin + 5, right: margin },
                headStyles: { 
                  fillColor: [...debtorColor],
                  textColor: [255, 255, 255],
                  fontSize: 9
                },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: 50 },
                  1: { cellWidth: 35 },
                  2: { cellWidth: 30 },
                  3: { cellWidth: 45, halign: 'right' }
                },
                didDrawPage: (data) => {
                  doc.setFontSize(8);
                  doc.setTextColor(150, 150, 150);
                  doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                }
              });
              
              yPosition = doc.lastAutoTable.finalY + 10;
            }
          });
        }
        
        // ================= PAGE 3: SHORTAGE DETAILS (if any) =================
        if (overallTotals.hasShortages) {
          doc.addPage();
          yPosition = 20;
          
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...dangerColor);
          doc.text('SHORTAGE ANALYSIS', margin, yPosition);
          yPosition += 10;
          
          const shortageIslands = reconciliationData.filter(r => r.shortageAmount > 10);
          
          // Summary stats
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Total Islands with Shortages: ${shortageIslands.length}`, margin, yPosition);
          doc.text(`Total Shortage Amount: ${formatCurrency(overallTotals.totalShortageAmount)}`, margin + 100, yPosition);
          yPosition += 10;
          
          const shortageTableData = shortageIslands.map(row => [
            row.islandName,
            row.attendants.map(a => `${a.firstName || ''} ${a.lastName || ''}`).join(', ') || 'No attendant',
            formatCurrency(row.expectedTotal),
            formatCurrency(row.totalCollected),
            formatCurrency(row.shortageAmount),
            row.shortagePosted ? 'Posted' : 'Pending'
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Island', 'Attendant', 'Expected', 'Collected', 'Shortage', 'Status']],
            body: shortageTableData,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [...dangerColor],
              textColor: [255, 255, 255],
              fontSize: 10,
              halign: 'center'
            },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
              0: { cellWidth: 45 },
              1: { cellWidth: 60 },
              2: { cellWidth: 45, halign: 'right' },
              3: { cellWidth: 45, halign: 'right' },
              4: { cellWidth: 40, halign: 'right' },
              5: { cellWidth: 35, halign: 'center' }
            },
            didDrawPage: (data) => {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
          });
          
          yPosition = doc.lastAutoTable.finalY + 15;
        }
        
        // ================= FINAL PAGE: RECONCILIATION NOTES & WALLET IMPACT =================
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('RECONCILIATION NOTES & WALLET IMPACT', margin, yPosition);
        yPosition += 10;
        
        // Notes section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Reconciliation Notes:', margin, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const notes = reconciliationNotes || 'No reconciliation notes provided.';
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 2 * margin);
        doc.text(splitNotes, margin, yPosition);
        
        yPosition += splitNotes.length * 5 + 15;
        
        // Wallet Impact Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text('STATION WALLET IMPACT', margin, yPosition);
        yPosition += 8;
        
        const walletTableData = [
          ['Previous Balance', formatCurrency(walletBalance)],
          ['+ Sales Revenue', formatCurrency(overallTotals.totalSales)],
          ['- Total Expenses', formatCurrency(overallTotals.totalExpenses)],
          ['Net Change', formatCurrency(overallTotals.totalSales - overallTotals.totalExpenses)],
          ['New Balance', formatCurrency(walletBalance + overallTotals.totalSales - overallTotals.totalExpenses)]
        ];
        
        autoTable(doc, {
          startY: yPosition,
          body: walletTableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 11 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { cellWidth: 70, halign: 'right' }
          },
          theme: 'plain',
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // Footer with generation info on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          
          doc.text(`Generated by: ${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Unknown', margin, pageHeight - 10);
          doc.text(`Station: ${stationName} (${stationCode})`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
        
        // Generate blob
        const pdfBlob = doc.output('blob');
        resolve(pdfBlob);
        
      } catch (error) {
        console.error('PDF Generation Error:', error);
        reject(error);
      }
    });
  };

  // Handle download only (without submission)
  const handleDownloadOnly = async () => {
    try {
      setGeneratingReport(true);
      
      const result = await saveReportToFileSystem();
      
      if (result.success) {
        const reportData = prepareReportData();
        const exportResult = await fileSystemService.exportAsJson(reportData);
        
        if (exportResult.success) {
          message.success('Report saved and downloaded successfully!');
        }
        
        const pdfBlob = await generatePDF();
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `collection_summary_${stationCode}_shift${shiftNumber}_${getFormattedDate().year}-${getFormattedDate().month}-${getFormattedDate().day}.pdf`;
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
    if (!validateSubmission()) {
      message.error('Please fix validation errors before submitting');
      return;
    }

    setSubmitting(true);
    
    try {
      const saveResult = await saveReportToFileSystem();
      
      if (saveResult.success) {
        await onSubmitShift(saveResult.file?.path);
        
        message.success('Shift submitted successfully with report!');
        
        setTimeout(() => {
          onClose();
          navigate('/station-manager/dashboard');
        }, 1500);
      } else {
        throw new Error(saveResult.message || 'Failed to save report');
      }
      
    } catch (error) {
      console.error('Error in final submission:', error);
      message.error(`Failed to submit shift: ${error.message}`);
      
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FileCheck size={24} color="#1890ff" />
          <div>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Shift Cash Summary</Title>
            <Space size={4} wrap>
              <Tag color="blue">{stationName}</Tag>
              <Tag color="geekblue">Shift #{shiftNumber}</Tag>
              <Tag color={overallTotals.hasShortages ? 'red' : 'green'}>
                {overallTotals.hasShortages ? 'Has Shortages' : 'All Complete'}
              </Tag>
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
        {/* Validation Errors Alert */}
        {validationErrors.length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            icon={<AlertCircle size={16} />}
          />
        )}

        {/* Summary Stats Header - Updated to show shortage only */}
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#e6f7ff', border: '2px solid #1890ff' }}>
              <Statistic
                title="Total Expected"
                value={overallTotals.totalExpected}
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
                title="Total Collected"
                value={overallTotals.totalCollected}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ 
              background: '#fff7e6',
              border: `2px solid ${overallTotals.hasShortages ? '#fa541c' : '#52c41a'}`
            }}>
              <Statistic
                title="Total Shortage"
                value={overallTotals.totalShortageAmount}
                precision={0}
                prefix="KES"
                valueStyle={{ 
                  color: overallTotals.hasShortages ? '#fa541c' : '#52c41a',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                suffix={
                  overallTotals.islandsWithShortage > 0 && (
                    <Tooltip title={`${overallTotals.islandsWithShortage} islands with shortages`}>
                      <Badge 
                        count={overallTotals.islandsWithShortage} 
                        style={{ 
                          backgroundColor: '#fa541c',
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
              background: '#f9f9f9',
              border: `2px solid ${overallTotals.hasShortages ? '#fa541c' : '#52c41a'}`
            }}>
              <Statistic
                title="Islands Status"
                value={overallTotals.islandsComplete}
                suffix={`/ ${overallTotals.totalIslands}`}
                valueStyle={{ 
                  color: overallTotals.hasShortages ? '#fa541c' : '#52c41a',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
              <div style={{ fontSize: '11px', marginTop: 4 }}>
                {overallTotals.islandsWithShortage > 0 && (
                  <Tag color="red">{overallTotals.islandsWithShortage} Shortages</Tag>
                )}
                {overallTotals.islandsWithMinorShortage > 0 && (
                  <Tag color="blue">{overallTotals.islandsWithMinorShortage} Minor</Tag>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Expense Breakdown Section */}
        {expenseBreakdown.length > 0 && (
          <Card
            title={
              <Space wrap>
                <ReceiptIcon size={18} color="#fa8c16" />
                <Text strong>Expense Breakdown</Text>
                <Tag color="orange">{expenseBreakdown.length} Islands with Expenses</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Total: {formatCurrency(overallTotals.totalExpenses)}
                </Text>
                {overallTotals.hasAutoExpenses && (
                  <Tag color="orange">Auto: {formatCurrency(overallTotals.totalAutoExpenses)}</Tag>
                )}
                {overallTotals.hasManualExpenses && (
                  <Tag color="red">Manual: {formatCurrency(overallTotals.totalManualExpenses)}</Tag>
                )}
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
                rowKey="key"
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
                              <List.Item key={idx}>
                                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: '12px' }}>
                                      {expense.title || expense.description || 'Expense'}
                                      {expense.expenseNumber && (
                                        <Text type="secondary" style={{ marginLeft: 4, fontSize: '10px' }}>
                                          #{expense.expenseNumber}
                                        </Text>
                                      )}
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
                                  {expense.approvedAt && (
                                    <Text type="secondary" style={{ fontSize: '9px' }}>
                                      Approved: {new Date(expense.approvedAt).toLocaleDateString()}
                                    </Text>
                                  )}
                                </Space>
                              </List.Item>
                            )}
                          />
                        </>
                      ) : null}
                      
                      {record.hasManualExpenses && (
                        <div style={{ marginTop: record.hasAutoExpenses ? 16 : 0 }}>
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
                  rowExpandable: (record) => record.hasAutoExpenses || record.hasManualExpenses,
                  expandedRowKeys: Object.keys(showExpenseDetails).filter(key => showExpenseDetails[key]),
                  onExpand: (expanded, record) => {
                    setShowExpenseDetails(prev => ({
                      ...prev,
                      [record.islandId || record.islandName]: expanded
                    }));
                  }
                }}
                summary={() => (
                  <Table.Summary fixed>
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

        {/* Island Reconciliation Table - Updated with shortage-only view */}
        <Card
          title={
            <Space wrap>
              <Building size={18} />
              <Text strong>Island Reconciliation</Text>
              <Tag color="blue">{reconciliationData.length} Islands</Tag>
              <Tag color={overallTotals.islandsWithShortage > 0 ? 'red' : 'green'}>
                {overallTotals.islandsWithShortage} Shortages
              </Tag>
              <Tag color="blue">
                {overallTotals.islandsWithMinorShortage} Minor (&lt;10)
              </Tag>
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
              rowKey="key"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ 
                    background: '#fafafa', 
                    fontWeight: 'bold',
                    borderTop: '2px solid #d9d9d9'
                  }}>
                    <Table.Summary.Cell index={0}>
                      <Text strong>TOTALS ({reconciliationData.length} Islands)</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                        {formatCurrency(overallTotals.totalExpected)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                        {formatCurrency(overallTotals.totalCollected)}
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
                      <Tag color={overallTotals.hasShortages ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
                        {overallTotals.hasShortages ? `KES ${overallTotals.totalShortageAmount.toFixed(2)}` : 'None'}
                      </Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">
                      <Tag color={overallTotals.hasShortages ? 'red' : 'green'}>
                        {overallTotals.islandsComplete}/{overallTotals.totalIslands} Complete
                      </Tag>
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
              <Space wrap>
                <Users size={18} color="#722ed1" />
                <Text strong>Debtor Collections</Text>
                <Tag color="purple">{debtorBreakdown.length} Debtors</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Total: {formatCurrency(overallTotals.totalDebts)}
                </Text>
                <Tag color="purple">
                  {debtorBreakdown.reduce((sum, d) => sum + d.transactions.length, 0)} Transactions
                </Tag>
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
                rowKey={(record) => record.id || record.name}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>Transaction Details:</Text>
                      <List
                        size="small"
                        dataSource={record.transactions}
                        renderItem={(transaction, idx) => (
                          <List.Item key={idx}>
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

        {/* Cash Summary Section - Updated to show shortage focus */}
        <Card
          title={
            <Space wrap>
              <Wallet size={18} color="#52c41a" />
              <Text strong>Cash Summary & Wallet Impact</Text>
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
                  border: '1px solid #1890ff',
                  height: '100%'
                }}
              >
                <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
                  <DollarSign size={16} /> Collection Summary
                </Title>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Expected Total:</Text>
                    <Text strong style={{ color: '#1890ff' }}>
                      {formatCurrency(overallTotals.totalExpected)}
                    </Text>
                  </div>
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
                  <Divider style={{ margin: '8px 0' }} />
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
                    <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                      {formatCurrency(overallTotals.totalCollected)}
                    </Text>
                  </div>
                  {overallTotals.hasShortages && (
                    <Alert
                      message={`Total Shortage: ${formatCurrency(overallTotals.totalShortageAmount)}`}
                      description={`${overallTotals.islandsWithShortage} island(s) have shortages above KES 10`}
                      type="warning"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #fff7e6, #ffe7ba)',
                  border: '1px solid #faad14',
                  height: '100%'
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
                    format={(percent) => `${percent.toFixed(1)}% Change`}
                  />
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>New Balance:</Text>
                    <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
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
            <Space wrap>
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
            placeholder="Enter detailed reconciliation notes, explanation of shortages, expense details, special circumstances, or additional comments..."
            value={reconciliationNotes}
            onChange={(e) => setReconciliationNotes(e.target.value)}
            maxLength={500}
            status={!reconciliationNotes.trim() ? 'error' : ''}
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
              <Space wrap>
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
                  {generatingReport ? 'Generating...' : 'Save & Download PDF'}
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
              
              <Space wrap>
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
                  disabled={!reconciliationNotes.trim() || !shiftId || submitting || validationErrors.length > 0}
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
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>File: {saveResult.file?.name}</Text>
                      <Tag color="green">Saved</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                      Path: {saveResult.file?.path}
                    </Text>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Size: {((saveResult.file?.size || 0) / 1024).toFixed(2)} KB
                      </Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Format: {saveResult.file?.format || 'JSON'}
                      </Text>
                    </div>
                    {saveResult.metadata && (
                      <div style={{ marginTop: 8, padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          📊 {saveResult.metadata.dataPoints?.islands || overallTotals.totalIslands} islands • 
                          👥 {saveResult.metadata.dataPoints?.debtors || debtorBreakdown.length} debtors • 
                          💰 {overallTotals.totalAutoExpenses > 0 ? `${expenseBreakdown.length} islands with auto expenses` : 'No auto expenses'}
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
                      icon={<Download size={14} />}
                    >
                      Download
                    </Button>
                  )
                }
                closable
                onClose={() => setSaveResult(null)}
              />
            )}

            {/* Submission Warnings */}
            {!reconciliationNotes.trim() && (
              <Alert
                message="Reconciliation Notes Required"
                description="Please add detailed reconciliation notes before submitting the shift report."
                type="warning"
                showIcon
                icon={<AlertCircle size={16} />}
              />
            )}
            
            {validationErrors.length > 0 && (
              <Alert
                message="Validation Errors"
                description={`${validationErrors.length} error(s) must be resolved before submission.`}
                type="error"
                showIcon
                icon={<AlertCircle size={16} />}
              />
            )}
          </Space>
        </Card>
      </div>
    </Modal>
  );
};

export default EnhancedSummaryModal;