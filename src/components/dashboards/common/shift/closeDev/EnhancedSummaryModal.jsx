// EnhancedSummaryModal.jsx (FIXED - With Cache Clearing)
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
  FileWarning,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { shiftService } from '../../../../../services/shiftService/shiftService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import fileSystemService  from '../../../../../services/fileSystemService/fileSystemService';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Enhanced Summary Modal Component with clear structure
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
  const [previousWalletBalance, setPreviousWalletBalance] = useState(0);
  const [showDebtorDetails, setShowDebtorDetails] = useState({});
  const [showExpenseDetails, setShowExpenseDetails] = useState({});
  const [saveResult, setSaveResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [clearingCache, setClearingCache] = useState(false);

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

  // Debug log to see what data is coming in
  useEffect(() => {
    if (visible) {
      console.log('📊 EnhancedSummaryModal received data:', {
        shiftId,
        shiftNumber,
        islandsCount: islands.length,
        hasApiPayload: !!apiPayload,
        apiPayloadKeys: Object.keys(apiPayload),
        overallStats
      });
    }
  }, [visible, islands, shiftId, shiftNumber, apiPayload, overallStats]);

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

  // ========== CACHE CLEARING FUNCTION ==========
  const clearAllShiftCaches = () => {
    try {
      setClearingCache(true);
      console.log('🧹 Clearing all shift caches...');
      
      const stationId = stateStationId || state?.currentStation?.id;
      if (!stationId) {
        console.warn('No station ID available for cache clearing');
        return;
      }
      
      const cachePattern = `shift_close_${stationId}`;
      const shiftSpecificPattern = shiftId ? `${cachePattern}_${shiftId}` : cachePattern;
      
      let removedCount = 0;
      const removedKeys = [];
      
      // 1. Clear localStorage caches for this station
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes(cachePattern) || key.includes(shiftSpecificPattern))) {
          localStorage.removeItem(key);
          removedCount++;
          removedKeys.push(key);
          console.log(`   Removed: ${key}`);
        }
      }
      
      // 2. Clear any backup/temp keys with various patterns
      const backupPatterns = [
        `shift_backup_${stationId}`,
        `shift_draft_${stationId}`,
        `shift_temp_${stationId}`,
        `shift_session_${stationId}`,
        `shift_working_${stationId}`,
        `shift_auto_${stationId}`,
        `shift_draft_${stationId}`,
        `shift_recovery_${stationId}`
      ];
      
      backupPatterns.forEach(pattern => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(pattern)) {
            localStorage.removeItem(key);
            removedCount++;
            removedKeys.push(key);
            console.log(`   Removed backup: ${key}`);
          }
        }
      });
      
      // 3. Clear any keys containing shift ID
      if (shiftId) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(shiftId)) {
            localStorage.removeItem(key);
            removedCount++;
            removedKeys.push(key);
            console.log(`   Removed shift-specific: ${key}`);
          }
        }
      }
      
      // 4. Clear session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes(cachePattern) || (shiftId && key.includes(shiftId)))) {
          sessionStorage.removeItem(key);
          removedCount++;
          removedKeys.push(key);
          console.log(`   Removed session: ${key}`);
        }
      }
      
      // 5. Clear any IndexedDB stores if they exist
      if (window.indexedDB) {
        try {
          // Common database names that might be used
          const dbNames = ['ShiftDrafts', 'ShiftCache', 'OfflineStorage', 'AppCache'];
          dbNames.forEach(dbName => {
            try {
              const deleteRequest = indexedDB.deleteDatabase(dbName);
              deleteRequest.onsuccess = () => console.log(`   IndexedDB cleared: ${dbName}`);
              deleteRequest.onerror = () => console.warn(`   Could not clear IndexedDB: ${dbName}`);
            } catch (e) {
              console.warn(`   Error clearing IndexedDB ${dbName}:`, e);
            }
          });
        } catch (e) {
          console.warn('   Could not clear IndexedDB:', e);
        }
      }
      
      // 6. Clear service worker caches if they exist
      if ('caches' in window) {
        try {
          caches.keys().then(keys => {
            keys.forEach(key => {
              if (key.includes('shift') || key.includes('cache') || key.includes('offline')) {
                caches.delete(key).then(() => {
                  console.log(`   Cache storage cleared: ${key}`);
                });
              }
            });
          });
        } catch (e) {
          console.warn('   Could not clear caches API:', e);
        }
      }
      
      console.log(`✅ Cleared ${removedCount} cache entries:`, removedKeys);
      
      // Optional: Show success message
      if (removedCount > 0) {
        message.success(`Cleared ${removedCount} temporary cache entries`);
      } else {
        message.info('No caches found to clear');
      }
      
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      message.error('Failed to clear some caches');
    } finally {
      setClearingCache(false);
    }
  };

  // ========== FETCH WALLET BALANCE ==========
  const fetchWallet = async () => {
    try {
      const response = await bankingService.getCurrentStationWallet();
      
      if (response) {
        const balance = response?.currentBalance || 0;
        setWalletBalance(balance);
        setPreviousWalletBalance(balance);
        console.log('💰 Wallet balance fetched:', balance);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
      setPreviousWalletBalance(0);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchWallet();
    }
  }, [visible]);

  // ========== CALCULATE DEBTOR BREAKDOWN ==========
  const debtorBreakdown = useMemo(() => {
    const debtorMap = new Map();
    
    islands.forEach(island => {
      // Use displayValues if available, otherwise fallback to direct properties
      const display = island.displayValues || island;
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

  // ========== CALCULATE EXPENSE BREAKDOWN ==========
  const expenseBreakdown = useMemo(() => {
    const breakdown = [];
    
    islands.forEach(island => {
      // Use displayValues if available
      const display = island.displayValues || island;
      const autoExpenseDetails = island.autoExpenseDetails || [];
      const autoExpenses = display.autoExpenses || island.autoExpenses || 0;
      const manualExpenses = display.manualExpenses || island.manualExpenses || 0;
      const totalExpenses = autoExpenses + manualExpenses;
      
      if (totalExpenses > 0) {
        breakdown.push({
          key: island.islandId || island.islandName,
          islandName: island.islandName,
          islandId: island.islandId,
          autoExpenses: autoExpenses,
          manualExpenses: manualExpenses,
          totalExpenses: totalExpenses,
          autoExpenseDetails: autoExpenseDetails,
          hasAutoExpenses: autoExpenseDetails.length > 0 || autoExpenses > 0,
          hasManualExpenses: manualExpenses > 0
        });
      }
    });
    
    return breakdown.sort((a, b) => b.totalExpenses - a.totalExpenses);
  }, [islands]);

  // ========== RECONCILIATION DATA ==========
  const reconciliationData = useMemo(() => {
    return islands.map((island, index) => {
      // Use displayValues if available (from IntegratedShiftClose)
      // This ensures we use the pre-calculated values that already have expenses factored in
      const display = island.displayValues || island;
      
      // Collections data
      const collections = island.collections || [];
      const debtCollections = collections.filter(c => c && c.type === 'debt');
      const cashCollections = collections.filter(c => c && c.type === 'cash');
      
      // Use pre-calculated values from IntegratedShiftClose
      const totalSales = display.totalSales || island.totalActualSales || 0;
      const receipts = display.receipts || island.receipts || 0;
      
      // EXPENSE VALUES - FOR DISPLAY ONLY (not used in calculations)
      const autoExpenses = display.autoExpenses || island.autoExpenses || 0;
      const manualExpenses = display.manualExpenses || island.manualExpenses || 0;
      const totalExpenses = autoExpenses + manualExpenses;
      
      // COLLECTION VALUES - from actual collections
      const cashDrops = display.cashCollected || 
                        cashCollections.reduce((sum, cash) => sum + (cash.amount || 0), 0);
      const totalDebts = display.debtCollected || 
                        debtCollections.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      
      // Total collected (expenses are NOT subtracted here because they're already in sales)
      const totalCollected = cashDrops + totalDebts + receipts;
      
      // Expected amount (from pre-calculated value - already has expenses factored in)
      const expectedTotal = display.expectedAmount || (totalSales + receipts);
      
      // Shortage (only when collected < expected)
      const shortageAmount = display.shortageAmount !== undefined ? display.shortageAmount :
                            (expectedTotal > totalCollected ? expectedTotal - totalCollected : 0);
      
      const status = shortageAmount > 10 ? 'SHORT' : 'OK';
      const statusDisplay = shortageAmount === 0 ? 'Complete' : 
                           shortageAmount > 10 ? 'Shortage' : 'Minor';
      
      // Attendant names
      const attendantNames = island.attendants?.map(a => 
        `${a.firstName || ''} ${a.lastName || ''}`
      ).filter(Boolean).join(', ') || 'No attendant';
      
      return {
        key: index,
        islandName: island.islandName,
        islandId: island.islandId,
        attendants: island.attendants || [],
        attendantNames: attendantNames,
        
        // DISPLAY VALUES (shown in UI)
        totalSales: totalSales,
        receipts: receipts,
        autoExpenses: autoExpenses,
        manualExpenses: manualExpenses,
        totalExpenses: totalExpenses,
        
        // COLLECTION VALUES
        cashDrops: cashDrops,
        totalDebts: totalDebts,
        debtCollections: debtCollections,
        cashCollections: cashCollections,
        totalCollected: totalCollected,
        
        // EXPECTED & SHORTAGE
        expectedTotal: expectedTotal,
        shortageAmount: shortageAmount,
        status: status,
        statusDisplay: statusDisplay,
        shortagePosted: island.shortagePosted || false,
        
        // METADATA
        isComplete: island.isComplete || false,
        collections: collections,
        autoExpenseDetails: island.autoExpenseDetails || []
      };
    });
  }, [islands]);

  // ========== OVERALL TOTALS ==========
  const overallTotals = useMemo(() => {
    const totalCashDrops = reconciliationData.reduce((sum, row) => sum + row.cashDrops, 0);
    const totalSales = reconciliationData.reduce((sum, row) => sum + row.totalSales, 0);
    const totalReceipts = reconciliationData.reduce((sum, row) => sum + row.receipts, 0);
    const totalAutoExpenses = reconciliationData.reduce((sum, row) => sum + row.autoExpenses, 0);
    const totalManualExpenses = reconciliationData.reduce((sum, row) => sum + row.manualExpenses, 0);
    const totalExpenses = totalAutoExpenses + totalManualExpenses;
    const totalDebts = reconciliationData.reduce((sum, row) => sum + row.totalDebts, 0);
    
    // IMPORTANT: totalCollected does NOT subtract expenses because they're already in sales
    const totalCollected = reconciliationData.reduce((sum, row) => sum + row.totalCollected, 0);
    
    // expectedTotal already has expenses factored in from previous step
    const totalExpected = reconciliationData.reduce((sum, row) => sum + row.expectedTotal, 0);
    
    const totalShortageAmount = reconciliationData
      .filter(row => row.shortageAmount > 10)
      .reduce((sum, row) => sum + row.shortageAmount, 0);
    
    const islandsWithShortage = reconciliationData.filter(row => row.shortageAmount > 10).length;
    const islandsWithMinorShortage = reconciliationData.filter(row => row.shortageAmount > 0 && row.shortageAmount <= 10).length;
    const islandsComplete = reconciliationData.filter(row => row.shortageAmount === 0).length;
    
    // Verification: Expected should equal Collected + Shortage
    const verificationTotal = totalCollected + totalShortageAmount;
    const isBalanced = Math.abs(totalExpected - verificationTotal) < 0.01;
    
    return {
      totalCashDrops,
      totalSales,
      totalReceipts,
      totalAutoExpenses,
      totalManualExpenses,
      totalExpenses,
      totalDebts,
      totalCollected,
      totalExpected,
      totalShortageAmount,
      islandsWithShortage,
      islandsWithMinorShortage,
      islandsComplete,
      totalIslands: reconciliationData.length,
      hasExpenses: totalExpenses > 0,
      hasAutoExpenses: totalAutoExpenses > 0,
      hasManualExpenses: totalManualExpenses > 0,
      hasShortages: totalShortageAmount > 0,
      verificationTotal,
      isBalanced
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
    
    const unresolvedShortages = reconciliationData.filter(
      island => island.shortageAmount > 10 && !island.shortagePosted
    );
    if (unresolvedShortages.length > 0) {
      errors.push(`${unresolvedShortages.length} island(s) have unresolved shortages above KES 10`);
    }
    
    // Check if we have shift ID
    if (!shiftId) {
      errors.push('Shift ID is missing');
    }
    
    // Check if we have API payload
    if (!apiPayload || Object.keys(apiPayload).length === 0) {
      errors.push('API payload is missing');
    } else {
      // Check required fields
      if (!apiPayload.pumpReadings || apiPayload.pumpReadings.length === 0) {
        errors.push('No pump readings in payload');
      }
      if (!apiPayload.tankReadings || apiPayload.tankReadings.length === 0) {
        errors.push('No tank readings in payload');
      }
      if (!apiPayload.islandCollections || apiPayload.islandCollections.length === 0) {
        errors.push('No island collections in payload');
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

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
      previousWalletBalance,
      newWalletBalance: previousWalletBalance + overallTotals.totalCashDrops,
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
        totalExpenseItems: expenseBreakdown.reduce((sum, e) => sum + (e.autoExpenseDetails?.length || 0), 0) + 
                          (overallTotals.hasManualExpenses ? 1 : 0),
        hasShortages: overallTotals.hasShortages,
        totalShortageAmount: overallTotals.totalShortageAmount,
        isBalanced: overallTotals.isBalanced
      }
    };
  };

  // ========== MAIN ISLAND TABLE COLUMNS ==========
  const islandColumns = [
    {
      title: 'ISLAND & ATTENDANT',
      key: 'island',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '13px' }}>{record.islandName}</Text>
          <Tag color="blue" style={{ fontSize: '10px', marginTop: 2 }}>
            <User size={10} style={{ marginRight: 4 }} />
            {record.attendantNames}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'SALES',
      key: 'totalSales',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
          {formatCurrency(record.totalSales)}
        </Text>
      ),
    },
    {
      title: 'RECEIPTS',
      key: 'receipts',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ fontSize: '13px', color: '#fa8c16' }}>
          {formatCurrency(record.receipts)}
        </Text>
      ),
    },
    {
      title: 'EXPENSES',
      key: 'totalExpenses',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space direction="vertical" size={0} align="end">
          <Text strong style={{ color: record.totalExpenses > 0 ? '#ff4d4f' : '#52c41a' }}>
            {formatCurrency(record.totalExpenses)}
          </Text>
          {record.autoExpenses > 0 && record.manualExpenses > 0 && (
            <Text type="secondary" style={{ fontSize: '9px' }}>
              A:{formatCurrency(record.autoExpenses)} M:{formatCurrency(record.manualExpenses)}
            </Text>
          )}
          {record.autoExpenses > 0 && record.manualExpenses === 0 && (
            <Text type="secondary" style={{ fontSize: '9px', color: '#fa8c16' }}>
              Auto: {formatCurrency(record.autoExpenses)}
            </Text>
          )}
          {record.manualExpenses > 0 && record.autoExpenses === 0 && (
            <Text type="secondary" style={{ fontSize: '9px', color: '#ff4d4f' }}>
              Manual: {formatCurrency(record.manualExpenses)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'DEBTS',
      key: 'totalDebts',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ color: record.totalDebts > 0 ? '#722ed1' : '#52c41a' }}>
          {record.totalDebts > 0 ? formatCurrency(record.totalDebts) : 'None'}
        </Text>
      ),
    },
    {
      title: 'CASH',
      key: 'cashDrops',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(record.cashDrops)}
        </Text>
      ),
    },
    {
      title: 'TOTAL COLLECTED',
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
      title: 'EXPECTED',
      key: 'expectedTotal',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
          {formatCurrency(record.expectedTotal)}
        </Text>
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
  ];

  // Debtor Collections Table
  const debtorColumns = [
    {
      title: 'DEBTOR NAME',
      dataIndex: 'name',
      key: 'name',
      width: 200,
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
      title: 'AMOUNT',
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
              {record.autoExpenseDetails.length} auto
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'AUTO',
      dataIndex: 'autoExpenses',
      key: 'autoExpenses',
      width: 100,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#fa8c16' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'MANUAL',
      dataIndex: 'manualExpenses',
      key: 'manualExpenses',
      width: 100,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'TOTAL',
      dataIndex: 'totalExpenses',
      key: 'totalExpenses',
      width: 100,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#ff4d4f' }}>
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

  // ========== PDF GENERATION ==========
  const generatePDF = async () => {
    return new Promise((resolve, reject) => {
      try {
        // Create new PDF in portrait orientation
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const formattedDate = getFormattedDate();
        
        // Colors
        const primaryColor = [41, 128, 185];      // Blue
        const secondaryColor = [52, 152, 219];    // Light Blue
        const successColor = [39, 174, 96];       // Green
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
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SHIFT COLLECTION SUMMARY', pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${stationName} (${stationCode}) - Shift #${shiftNumber}`, pageWidth / 2, 23, { align: 'center' });
        doc.text(`Generated: ${formattedDate.fullDate} at ${formattedDate.fullTime}`, pageWidth / 2, 30, { align: 'center' });
        
        yPosition = 45;
        
        // ================= PAGE 1: SUMMARY CARDS =================
        // Row 1: Expected vs Collected vs Shortage
        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPosition, 55, 20, 2, 2, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Expected', margin + 3, yPosition + 5);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(formatCurrency(overallTotals.totalExpected).replace('KES', '').trim(), margin + 3, yPosition + 15);
        
        // Collected Card
        doc.setFillColor(240, 255, 240);
        doc.setDrawColor(...successColor);
        doc.roundedRect(margin + 65, yPosition, 55, 20, 2, 2, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Collected', margin + 68, yPosition + 5);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(formatCurrency(overallTotals.totalCollected).replace('KES', '').trim(), margin + 68, yPosition + 15);
        
        // Shortage Card
        doc.setFillColor(255, 240, 240);
        doc.setDrawColor(...dangerColor);
        doc.roundedRect(margin + 130, yPosition, 55, 20, 2, 2, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Shortage', margin + 133, yPosition + 5);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        if (overallTotals.hasShortages) {
          doc.setTextColor(...dangerColor);
          doc.text(formatCurrency(overallTotals.totalShortageAmount).replace('KES', '').trim(), margin + 133, yPosition + 15);
        } else {
          doc.setTextColor(...successColor);
          doc.text('None', margin + 133, yPosition + 15);
        }
        
        yPosition += 25;
        
        // Row 2: Expenses, Debts, Cash
        doc.setFillColor(255, 247, 230);
        doc.setDrawColor(...expenseColor);
        doc.roundedRect(margin, yPosition, 55, 18, 2, 2, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Expenses', margin + 3, yPosition + 5);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...expenseColor);
        doc.text(formatCurrency(overallTotals.totalExpenses).replace('KES', '').trim(), margin + 3, yPosition + 13);
        
        // Debts Card
        doc.setFillColor(245, 240, 255);
        doc.setDrawColor(...debtorColor);
        doc.roundedRect(margin + 65, yPosition, 55, 18, 2, 2, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Debts', margin + 68, yPosition + 5);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...debtorColor);
        doc.text(formatCurrency(overallTotals.totalDebts).replace('KES', '').trim(), margin + 68, yPosition + 13);
        
        // Cash Drops Card
        doc.setFillColor(230, 247, 255);
        doc.setDrawColor(...secondaryColor);
        doc.roundedRect(margin + 130, yPosition, 55, 18, 2, 2, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Cash Drops', margin + 133, yPosition + 5);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...secondaryColor);
        doc.text(formatCurrency(overallTotals.totalCashDrops).replace('KES', '').trim(), margin + 133, yPosition + 13);
        
        yPosition += 28;
        
        // ================= PAGE 1: ISLAND RECONCILIATION TABLE =================
        checkPageBreak(60);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('ISLAND RECONCILIATION', margin, yPosition);
        yPosition += 8;
        
        const islandTableData = reconciliationData.map(row => [
          row.islandName,
          row.attendantNames.substring(0, 20),
          formatCurrency(row.totalSales).replace('KES', '').trim(),
          formatCurrency(row.receipts).replace('KES', '').trim(),
          formatCurrency(row.totalExpenses).replace('KES', '').trim(),
          formatCurrency(row.totalDebts).replace('KES', '').trim(),
          formatCurrency(row.cashDrops).replace('KES', '').trim(),
          formatCurrency(row.totalCollected).replace('KES', '').trim(),
          row.shortageAmount === 0 ? 'None' : `KES ${row.shortageAmount.toFixed(2)}`
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Island', 'Attendant', 'Sales', 'Receipts', 'Expenses', 'Debts', 'Cash', 'Collected', 'Shortage']],
          body: islandTableData,
          margin: { left: margin, right: margin },
          headStyles: { 
            fillColor: [...primaryColor],
            textColor: [255, 255, 255],
            fontSize: 8,
            halign: 'center'
          },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 35 },
            2: { cellWidth: 20, halign: 'right' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 20, halign: 'right' },
            6: { cellWidth: 20, halign: 'right' },
            7: { cellWidth: 22, halign: 'right' },
            8: { cellWidth: 22, halign: 'center' }
          },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
          }
        });
        
        // Get the final Y position after the table
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // ================= PAGE 1: VERIFICATION ROW =================
        checkPageBreak(15);
        
        doc.setFillColor(...headerBg);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        doc.text('TOTAL', margin + 5, yPosition + 8);
        doc.text(formatCurrency(overallTotals.totalSales).replace('KES', '').trim(), margin + 40, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalReceipts).replace('KES', '').trim(), margin + 65, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalExpenses).replace('KES', '').trim(), margin + 90, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalDebts).replace('KES', '').trim(), margin + 115, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalCashDrops).replace('KES', '').trim(), margin + 140, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalCollected).replace('KES', '').trim(), margin + 165, yPosition + 8, { align: 'right' });
        doc.text(formatCurrency(overallTotals.totalShortageAmount).replace('KES', '').trim(), margin + 190, yPosition + 8, { align: 'center' });
        
        yPosition += 20;
        
        // ================= PAGE 1: VERIFICATION EQUATION =================
        checkPageBreak(15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Verification: Expected = Collected + Shortage', margin, yPosition);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${formatCurrency(overallTotals.totalExpected).replace('KES', '').trim()} = ${formatCurrency(overallTotals.totalCollected).replace('KES', '').trim()} + ${formatCurrency(overallTotals.totalShortageAmount).replace('KES', '').trim()}`, 
                 margin + 90, yPosition);
        
        if (overallTotals.isBalanced) {
          doc.setTextColor(...successColor);
          doc.text('✓ BALANCED', margin + 160, yPosition);
        } else {
          doc.setTextColor(...dangerColor);
          doc.text('✗ MISMATCH', margin + 160, yPosition);
        }
        
        yPosition += 15;
        
        // ================= PAGE 2: DEBTOR COLLECTIONS =================
        if (debtorBreakdown.length > 0) {
          doc.addPage();
          yPosition = 20;
          
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...debtorColor);
          doc.text('DEBTOR COLLECTIONS', margin, yPosition);
          yPosition += 10;
          
          // Summary line
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Total Debtors: ${debtorBreakdown.length} | Total Debt: ${formatCurrency(overallTotals.totalDebts).replace('KES', '').trim()} | Transactions: ${debtorBreakdown.reduce((sum, d) => sum + d.transactions.length, 0)}`, 
                   margin, yPosition);
          yPosition += 10;
          
          const debtorTableData = debtorBreakdown.map(debtor => [
            debtor.name,
            debtor.code || '-',
            debtor.phone || '-',
            formatCurrency(debtor.total).replace('KES', '').trim(),
            debtor.transactions.length.toString()
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Debtor Name', 'Code', 'Phone', 'Amount', 'Txns']],
            body: debtorTableData,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [...debtorColor],
              textColor: [255, 255, 255],
              fontSize: 9,
              halign: 'center'
            },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 55 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 40 },
              3: { cellWidth: 35, halign: 'right' },
              4: { cellWidth: 20, halign: 'center' }
            },
            didDrawPage: (data) => {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
          });
        }
        
        // ================= PAGE 3: EXPENSE BREAKDOWN =================
        if (expenseBreakdown.length > 0) {
          doc.addPage();
          yPosition = 20;
          
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...expenseColor);
          doc.text('EXPENSE BREAKDOWN', margin, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Total Expenses: ${formatCurrency(overallTotals.totalExpenses).replace('KES', '').trim()} | Auto: ${formatCurrency(overallTotals.totalAutoExpenses).replace('KES', '').trim()} | Manual: ${formatCurrency(overallTotals.totalManualExpenses).replace('KES', '').trim()}`, 
                   margin, yPosition);
          yPosition += 10;
          
          const expenseTableData = expenseBreakdown.map(row => [
            row.islandName,
            formatCurrency(row.autoExpenses).replace('KES', '').trim(),
            formatCurrency(row.manualExpenses).replace('KES', '').trim(),
            formatCurrency(row.totalExpenses).replace('KES', '').trim()
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Island', 'Auto', 'Manual', 'Total']],
            body: expenseTableData,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [...expenseColor],
              textColor: [255, 255, 255],
              fontSize: 9,
              halign: 'center'
            },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 40, halign: 'right' },
              2: { cellWidth: 40, halign: 'right' },
              3: { cellWidth: 40, halign: 'right' }
            },
            didDrawPage: (data) => {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
          });
        }
        
        // ================= FINAL PAGE: WALLET IMPACT =================
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text('STATION WALLET IMPACT', margin, yPosition);
        yPosition += 15;
        
        // Previous Balance
        doc.setFillColor(240, 248, 255);
        doc.roundedRect(margin, yPosition, 80, 30, 3, 3, 'FD');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Previous Balance', margin + 5, yPosition + 7);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(formatCurrency(previousWalletBalance).replace('KES', '').trim(), margin + 5, yPosition + 22);
        
        // Cash Drops
        doc.setFillColor(230, 247, 255);
        doc.roundedRect(margin + 90, yPosition, 80, 30, 3, 3, 'FD');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Cash Drops', margin + 95, yPosition + 7);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(`+ ${formatCurrency(overallTotals.totalCashDrops).replace('KES', '').trim()}`, margin + 95, yPosition + 22);
        
        yPosition += 40;
        
        // New Balance
        doc.setFillColor(240, 255, 240);
        doc.setDrawColor(...successColor);
        doc.setLineWidth(1);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 40, 3, 3, 'FD');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('NEW WALLET BALANCE', margin + 10, yPosition + 12);
        
        const newBalance = previousWalletBalance + overallTotals.totalCashDrops;
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(formatCurrency(newBalance).replace('KES', '').trim(), margin + 10, yPosition + 30);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatCurrency(previousWalletBalance).replace('KES', '').trim()} + ${formatCurrency(overallTotals.totalCashDrops).replace('KES', '').trim()}`, 
                 margin + 100, yPosition + 30);
        
        yPosition += 50;
        
        // ================= RECONCILIATION NOTES =================
        if (yPosition + 40 > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('RECONCILIATION NOTES', margin, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const notes = reconciliationNotes || 'No reconciliation notes provided.';
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 2 * margin - 20);
        doc.text(splitNotes, margin + 5, yPosition);
        
        yPosition += splitNotes.length * 5 + 15;
        
        // Footer with generation info on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          
          const generatedBy = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Unknown';
          doc.text(`Generated by: ${generatedBy}`, margin, pageHeight - 10);
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

  // Manual cache clear handler
  const handleManualCacheClear = () => {
    Modal.confirm({
      title: 'Clear All Caches',
      content: (
        <div>
          <p>This will clear all temporary shift data including:</p>
          <ul>
            <li>Local storage caches</li>
            <li>Session storage</li>
            <li>IndexedDB databases</li>
            <li>Service worker caches</li>
          </ul>
          <p>Are you sure you want to continue?</p>
        </div>
      ),
      okText: 'Yes, Clear All',
      cancelText: 'No',
      okButtonProps: { danger: true, loading: clearingCache },
      onOk: async () => {
        clearAllShiftCaches();
      }
    });
  };

  // ========== FINAL SUBMISSION WITH CACHE CLEARING ==========
  const handleFinalSubmit = async () => {
    if (!validateSubmission()) {
      message.error('Please fix validation errors before submitting');
      return;
    }

    setSubmitting(true);
    
    try {
      console.log('🚀 Starting final submission...');
      console.log('📁 Saving report to file system...');
      
      // First save the report
      const saveResult = await saveReportToFileSystem();
      
      if (saveResult.success) {
        console.log('✅ Report saved successfully:', saveResult);
        
        console.log('📄 Generating PDF...');
        // Generate and download PDF
        const pdfBlob = await generatePDF();
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `collection_summary_${stationCode}_shift${shiftNumber}_${getFormattedDate().year}-${getFormattedDate().month}-${getFormattedDate().day}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log('📤 Calling onSubmitShift with path:', saveResult.file?.path);
        console.log('📤 shiftId:', shiftId);
        
        // Then submit the shift
        await onSubmitShift(saveResult.file?.path);
        
        console.log('✅ Shift submitted successfully!');
        
        // ========== CLEAR ALL CACHES AFTER SUCCESSFUL SUBMISSION ==========
        clearAllShiftCaches();
        
        message.success({
          content: 'Shift submitted successfully! PDF downloaded. All temporary data cleared.',
          duration: 5,
          icon: <CheckCircle size={16} color="#52c41a" />
        });
        
        setTimeout(() => {
          onClose();
          navigate('/station-manager/dashboard');
        }, 1500);
      } else {
        throw new Error(saveResult.message || 'Failed to save report');
      }
      
    } catch (error) {
      console.error('❌ Error in final submission:', error);
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

  const handleBackToShiftManagement = () => {
    onClose();
    navigate('/station-manager/dashboard');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FileCheck size={20} color="#1890ff" />
          <div>
            <Title level={5} style={{ margin: 0, color: '#1890ff' }}>Shift Cash Summary</Title>
            <Space size={4} wrap>
              <Tag color="blue" style={{ fontSize: '11px' }}>{stationName}</Tag>
              <Tag color="geekblue" style={{ fontSize: '11px' }}>Shift #{shiftNumber}</Tag>
              <Tag color={overallTotals.hasShortages ? 'red' : 'green'} style={{ fontSize: '11px' }}>
                {overallTotals.hasShortages ? `${overallTotals.islandsWithShortage} Shortages` : 'All Complete'}
              </Tag>
              {overallTotals.hasExpenses && (
                <Tag color="orange" style={{ fontSize: '11px' }}>
                  Expenses: {formatCurrency(overallTotals.totalExpenses)}
                </Tag>
              )}
            </Space>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="90%"
      style={{ maxWidth: '1200px', top: 20 }}
      footer={null}
      closeIcon={<X size={16} />}
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
            style={{ marginBottom: 12 }}
            icon={<AlertCircle size={14} />}
          />
        )}

        {/* Compact Summary Stats Cards */}
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #1890ff' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Sales</span>}
                value={overallTotals.totalSales}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#1890ff', fontSize: '14px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#fff7e6', border: '1px solid #fa8c16' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Receipts</span>}
                value={overallTotals.totalReceipts}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#fa8c16', fontSize: '14px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#fff2e8', border: '1px solid #fa8c16' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Expenses</span>}
                value={overallTotals.totalExpenses}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#ff4d4f', fontSize: '14px', fontWeight: 'bold' }}
              />
              {overallTotals.hasAutoExpenses && overallTotals.hasManualExpenses && (
                <Text type="secondary" style={{ fontSize: '9px' }}>
                  A:{formatCurrency(overallTotals.totalAutoExpenses)} M:{formatCurrency(overallTotals.totalManualExpenses)}
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #722ed1' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Debts</span>}
                value={overallTotals.totalDebts}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#722ed1', fontSize: '14px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: '#f6ffed', border: '1px solid #52c41a' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Collected</span>}
                value={overallTotals.totalCollected}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ 
              background: '#fff7e6',
              border: `1px solid ${overallTotals.hasShortages ? '#fa541c' : '#52c41a'}`
            }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Shortage</span>}
                value={overallTotals.totalShortageAmount}
                precision={0}
                prefix="KES"
                valueStyle={{ 
                  color: overallTotals.hasShortages ? '#fa541c' : '#52c41a',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Verification Line */}
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Verification: Expected = Collected + Shortage
              </Text>
              <div>
                <Text strong style={{ fontSize: '13px' }}>
                  {formatCurrency(overallTotals.totalExpected)} = {formatCurrency(overallTotals.totalCollected)} + {formatCurrency(overallTotals.totalShortageAmount)}
                </Text>
              </div>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              {overallTotals.isBalanced ? (
                <Tag color="green" style={{ fontSize: '12px', padding: '4px 12px' }}>
                  <CheckCircle size={14} style={{ marginRight: 4 }} />
                  BALANCED
                </Tag>
              ) : (
                <Tag color="red" style={{ fontSize: '12px', padding: '4px 12px' }}>
                  <AlertCircle size={14} style={{ marginRight: 4 }} />
                  MISMATCH
                </Tag>
              )}
            </Col>
          </Row>
        </Card>

        {/* Main Island Table */}
        <Card
          title={
            <Space wrap>
              <Building size={16} />
              <Text strong style={{ fontSize: '14px' }}>Island Reconciliation</Text>
              <Tag color="blue" style={{ fontSize: '11px' }}>{reconciliationData.length} Islands</Tag>
              <Tag color={overallTotals.islandsWithShortage > 0 ? 'red' : 'green'} style={{ fontSize: '11px' }}>
                {overallTotals.islandsWithShortage} Shortages
              </Tag>
              {overallTotals.hasExpenses && (
                <Tag color="orange" style={{ fontSize: '11px' }}>
                  Total Expenses: {formatCurrency(overallTotals.totalExpenses)}
                </Tag>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
          size="small"
          bodyStyle={{ padding: '8px' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={islandColumns}
              dataSource={reconciliationData}
              pagination={false}
              size="small"
              scroll={{ x: 1200 }}
              style={{ fontSize: '12px' }}
              rowKey="key"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0}>
                      <Text strong>TOTAL</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: '#1890ff' }}>{formatCurrency(overallTotals.totalSales)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong style={{ color: '#fa8c16' }}>{formatCurrency(overallTotals.totalReceipts)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text strong style={{ color: '#ff4d4f' }}>{formatCurrency(overallTotals.totalExpenses)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Text strong style={{ color: '#722ed1' }}>{formatCurrency(overallTotals.totalDebts)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text strong style={{ color: '#52c41a' }}>{formatCurrency(overallTotals.totalCashDrops)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      <Text strong style={{ color: '#52c41a' }}>{formatCurrency(overallTotals.totalCollected)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text strong style={{ color: '#1890ff' }}>{formatCurrency(overallTotals.totalExpected)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="center">
                      <Tag color={overallTotals.hasShortages ? 'red' : 'green'}>
                        {formatCurrency(overallTotals.totalShortageAmount)}
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
                <Users size={16} color="#722ed1" />
                <Text strong style={{ fontSize: '14px' }}>Debtor Collections</Text>
                <Tag color="purple" style={{ fontSize: '11px' }}>{debtorBreakdown.length} Debtors</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Total: {formatCurrency(overallTotals.totalDebts)}
                </Text>
              </Space>
            }
            style={{ marginBottom: 16 }}
            size="small"
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={debtorColumns}
                dataSource={debtorBreakdown}
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
                rowKey={(record) => record.id || record.name}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '8px', backgroundColor: '#fafafa' }}>
                      <List
                        size="small"
                        dataSource={record.transactions}
                        renderItem={(transaction, idx) => (
                          <List.Item key={idx}>
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: '11px' }}>{transaction.island}</Text>
                                <Text strong style={{ fontSize: '11px', color: '#722ed1' }}>
                                  {formatCurrency(transaction.amount)}
                                </Text>
                              </div>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  ),
                }}
              />
            </div>
          </Card>
        )}

        {/* Expense Breakdown Table */}
        {expenseBreakdown.length > 0 && (
          <Card
            title={
              <Space wrap>
                <Receipt size={16} color="#fa8c16" />
                <Text strong style={{ fontSize: '14px' }}>Expense Breakdown</Text>
                <Tag color="orange" style={{ fontSize: '11px' }}>{expenseBreakdown.length} Islands with Expenses</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Total: {formatCurrency(overallTotals.totalExpenses)}
                </Text>
              </Space>
            }
            style={{ marginBottom: 16 }}
            size="small"
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={expenseColumns}
                dataSource={expenseBreakdown}
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
                rowKey="key"
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '8px', backgroundColor: '#fafafa' }}>
                      {record.autoExpenseDetails && record.autoExpenseDetails.length > 0 && (
                        <>
                          <Text strong style={{ fontSize: '12px', color: '#fa8c16' }}>Auto Expense Details:</Text>
                          <List
                            size="small"
                            dataSource={record.autoExpenseDetails}
                            renderItem={(expense, idx) => (
                              <List.Item key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                  <Space direction="vertical" size={0}>
                                    <Text style={{ fontSize: '11px' }}>{expense.title || expense.description || 'Expense'}</Text>
                                    {expense.expenseNumber && (
                                      <Text type="secondary" style={{ fontSize: '9px' }}>#{expense.expenseNumber}</Text>
                                    )}
                                  </Space>
                                  <Text strong style={{ fontSize: '11px', color: '#fa8c16' }}>
                                    {formatCurrency(expense.amount)}
                                  </Text>
                                </div>
                              </List.Item>
                            )}
                          />
                        </>
                      )}
                      {record.manualExpenses > 0 && (
                        <>
                          {record.autoExpenseDetails && record.autoExpenseDetails.length > 0 && <Divider style={{ margin: '8px 0' }} />}
                          <Text strong style={{ fontSize: '12px', color: '#ff4d4f' }}>Manual Expenses Total: {formatCurrency(record.manualExpenses)}</Text>
                        </>
                      )}
                    </div>
                  ),
                }}
              />
            </div>
          </Card>
        )}

        {/* Wallet Impact Summary */}
        <Card
          title={
            <Space wrap>
              <Wallet size={16} color="#52c41a" />
              <Text strong style={{ fontSize: '14px' }}>Wallet Impact</Text>
            </Space>
          }
          style={{ marginBottom: 16 }}
          size="small"
        >
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Previous Balance</span>}
                value={previousWalletBalance}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Cash Drops</span>}
                value={overallTotals.totalCashDrops}
                precision={0}
                prefix="+ KES"
                valueStyle={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={8}>
              <Card style={{ background: '#f6ffed', border: '2px solid #52c41a' }}>
                <Statistic
                  title={<span style={{ fontSize: '12px' }}>New Balance</span>}
                  value={previousWalletBalance + overallTotals.totalCashDrops}
                  precision={0}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Reconciliation Notes */}
        <Card
          title={
            <Space wrap>
              <FileText size={16} color="#1890ff" />
              <Text strong style={{ fontSize: '14px' }}>Reconciliation Notes</Text>
              <Tag color={reconciliationNotes.trim() ? 'green' : 'red'} style={{ fontSize: '11px' }}>
                {reconciliationNotes.trim() ? 'Completed' : 'Required'}
              </Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
          size="small"
        >
          <Input.TextArea
            rows={3}
            placeholder="Enter reconciliation notes..."
            value={reconciliationNotes}
            onChange={(e) => setReconciliationNotes(e.target.value)}
            maxLength={500}
            style={{
              border: reconciliationNotes.trim() ? '1px solid #52c41a' : '1px solid #ff4d4f',
              fontSize: '13px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {reconciliationNotes.length}/500
            </Text>
          </div>
        </Card>

        {/* Action Buttons */}
        <Card style={{ marginTop: 8 }} size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
              <Space wrap>
                <Button
                  icon={<Download size={14} />}
                  onClick={handleDownloadOnly}
                  size="small"
                  type="primary"
                  loading={generatingReport}
                >
                  {generatingReport ? 'Generating...' : 'Save & Download PDF'}
                </Button>
                <Button
                  icon={<FileJson size={14} />}
                  onClick={handleExportJson}
                  size="small"
                >
                  JSON
                </Button>
                <Button
                  icon={<FileSpreadsheet size={14} />}
                  onClick={handleExportCsv}
                  size="small"
                >
                  CSV
                </Button>
                <Button
                  icon={<Trash2 size={14} />}
                  onClick={handleManualCacheClear}
                  size="small"
                  danger
                  type="text"
                  title="Clear all cached data"
                  loading={clearingCache}
                >
                  Clear Cache
                </Button>
              </Space>
              
              <Space wrap>
                <Button
                  onClick={onClose}
                  icon={<X size={14} />}
                  size="small"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<Send size={14} />}
                  onClick={handleFinalSubmit}
                  loading={submitting}
                  disabled={!reconciliationNotes.trim() || !shiftId || submitting || validationErrors.length > 0}
                  style={{
                    background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                    border: 'none'
                  }}
                  size="small"
                >
                  {submitting ? 'Submitting...' : 'Submit & Download PDF'}
                </Button>
              </Space>
            </div>

            {/* File Path Display */}
            {saveResult && saveResult.success && (
              <Alert
                message="Report Saved"
                description={
                  <div>
                    <Text strong>File: {saveResult.file?.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Path: {saveResult.file?.path}
                    </Text>
                  </div>
                }
                type="success"
                showIcon
                size="small"
                closable
                onClose={() => setSaveResult(null)}
              />
            )}
          </Space>
        </Card>
      </div>
    </Modal>
  );
};

export default EnhancedSummaryModal;