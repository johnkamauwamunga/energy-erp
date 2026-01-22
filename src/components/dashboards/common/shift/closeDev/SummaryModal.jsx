// SummaryModal.jsx - COMPLETE REDESIGN
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Result,
  Tag,
  Divider,
  List,
  Statistic,
  Progress,
  Collapse,
  Descriptions,
  Timeline,
  Badge,
  Tooltip
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
  Clock,
  Database,
  Shield,
  CheckSquare,
  BarChart,
  PieChart,
  TrendingDown,
  Info,
  FileCheck,
  Lock,
  Unlock,
  Edit
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import services - uncomment when ready
// import { shiftService } from '../../../../../services/shiftService/shiftService';
// import { bankingService } from '../../../../../services/bankingService/bankingService';
// import { useApp } from '../../../../../context/AppContext';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ============================================================
// RESPONSE MODAL COMPONENT
// ============================================================
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
  const timestamp = new Date().toLocaleString();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={550}
      closable={true}
      centered
      className="response-modal"
    >
      <Result
        status={isSuccess ? 'success' : 'error'}
        title={
          <Text strong style={{ fontSize: '20px' }}>
            {isSuccess ? '🎉 Shift Closed Successfully!' : '⚠️ Failed to Close Shift'}
          </Text>
        }
        subTitle={
          <Space direction="vertical" size={12} style={{ textAlign: 'center', marginTop: 16 }}>
            {isSuccess ? (
              <>
                <div>
                  <Text strong style={{ fontSize: '16px' }}>{stationName}</Text>
                  <Text type="secondary" display="block" style={{ fontSize: '14px' }}>
                    Shift {shiftNumber}
                  </Text>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f6ffed', 
                  borderRadius: '8px',
                  border: '1px solid #b7eb8f'
                }}>
                  <Space direction="vertical" size={4}>
                    <Text strong style={{ color: '#52c41a' }}>All Data Secured</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Cash records, shortages, and inventory updated
                    </Text>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Closed at: {timestamp}
                </Text>
              </>
            ) : (
              <>
                <Alert
                  message={error?.message || 'System Error'}
                  description="Please check your connection and try again."
                  type="error"
                  showIcon
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Error ID: ERR_{Date.now().toString(36).toUpperCase()}
                </Text>
              </>
            )}
          </Space>
        }
        icon={null}
        extra={
          <Space size="middle" style={{ marginTop: 24 }}>
            {isSuccess ? (
              <Button
                type="primary"
                icon={<ArrowLeft size={16} />}
                onClick={onBackToShifts}
                size="large"
                style={{ 
                  fontWeight: 'bold',
                  padding: '0 32px',
                  height: '44px'
                }}
              >
                Return to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  icon={<ArrowLeft size={16} />}
                  onClick={onBackToSales}
                  size="large"
                >
                  Back to Sales
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

// ============================================================
// SHORTAGE DETAILS COMPONENT
// ============================================================
const ShortageDetails = ({ shortages }) => {
  if (!shortages || Object.keys(shortages).length === 0) {
    return (
      <Alert
        message="No Shortages Recorded"
        description="All collections matched expected amounts within tolerance (±5 KES)."
        type="success"
        showIcon
      />
    );
  }

  const shortageList = Object.values(shortages);

  return (
    <Card 
      title={
        <Space>
          <AlertCircle size={16} color="#fa541c" />
          <Text strong>Recorded Shortages</Text>
          <Badge 
            count={shortageList.length} 
            style={{ backgroundColor: '#fa541c' }} 
          />
        </Space>
      }
      size="small"
      style={{ border: '1px solid #ffccc7', backgroundColor: '#fff2e8' }}
    >
      <List
        size="small"
        dataSource={shortageList}
        renderItem={(shortage, index) => (
          <List.Item>
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ color: '#fa541c' }}>{shortage.islandName}</Text>
                <Text strong style={{ color: '#fa541c' }}>
                  KES {shortage.amount?.toFixed(2) || '0.00'}
                </Text>
              </div>
              {shortage.description && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {shortage.description}
                </Text>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#666'
              }}>
                <Text>Recorded: {new Date(shortage.recordedAt).toLocaleTimeString()}</Text>
                <Tag color="orange" size="small">Pending Deduction</Tag>
              </div>
            </Space>
          </List.Item>
        )}
      />
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Total Shortages:</Text>
        <Text strong style={{ fontSize: '16px', color: '#fa541c' }}>
          KES {shortageList.reduce((sum, s) => sum + (s.amount || 0), 0).toFixed(2)}
        </Text>
      </div>
    </Card>
  );
};

// ============================================================
// MAIN SUMMARY MODAL
// ============================================================
const SummaryModal = ({
  visible,
  onClose,
  onSubmitShift,
  shiftState,
  loading = false
}) => {
  // Mock useApp since it's commented out
  const state = {
    currentStation: { id: 1, name: 'Test Station' },
    currentUser: { id: 1, name: 'Test User' }
  };
  
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [responseType, setResponseType] = useState('success');
  const [walletBalance, setWalletBalance] = useState(0);
  const [activePanel, setActivePanel] = useState(['1', '2']);

  const printRef = useRef();

  // Extract data from shiftState
  const readings = shiftState?.readings || {};
  const sales = shiftState?.sales || {};
  const metadata = shiftState?.metadata || {};
  
  const islands = sales.islands || [];
  const shortages = sales.shortages || {};
  const collections = sales.collections || {};
  const salesEntries = sales.salesEntries || {};
  const expenses = sales.expenses || {};
  const receipts = sales.receipts || {};

  const shiftId = metadata.shiftId;
  const shiftNumber = metadata.shiftNumber;
  const stationName = state?.currentStation?.name || 'N/A';
  const currentUser = state.currentUser;

  // ============================================================
  // CALCULATIONS & STATISTICS
  // ============================================================

  // Overall financial summary
  const financialSummary = useMemo(() => {
    let totalSales = 0;
    let totalCashDrops = 0;
    let totalDebtCollections = 0;
    let totalReceipts = 0;
    let totalExpenses = 0;
    let totalVariance = 0;
    let totalShortages = 0;
    let totalOverage = 0;

    islands.forEach((island, index) => {
      const islandSales = salesEntries[index]?.islandTotalSales || 0;
      const islandCollections = Array.isArray(collections[index]) ? collections[index] : [];
      const islandExpenses = expenses[index] || 0;
      const islandReceipts = receipts[index] || 0;
      
      // Calculate collections
      const cashCollection = islandCollections
        .filter(c => c && c.type === 'cash')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const debtCollection = islandCollections
        .filter(c => c && c.type === 'debt')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      // Calculate variance
      const totalCollection = cashCollection + debtCollection;
      const totalExpected = islandSales + islandReceipts - islandExpenses;
      const variance = totalExpected - totalCollection;
      
      // Accumulate totals
      totalSales += islandSales;
      totalCashDrops += cashCollection;
      totalDebtCollections += debtCollection;
      totalReceipts += islandReceipts;
      totalExpenses += islandExpenses;
      totalVariance += variance;
      
      if (variance > 0) {
        totalShortages += variance;
      } else {
        totalOverage += Math.abs(variance);
      }
    });

    // Calculate totals
    const totalCollected = totalCashDrops + totalDebtCollections + totalReceipts - totalExpenses;
    const totalExpected = totalSales + totalReceipts - totalExpenses;
    const netVariance = totalExpected - totalCollected;

    return {
      totalSales,
      totalCashDrops,
      totalDebtCollections,
      totalReceipts,
      totalExpenses,
      totalCollected,
      totalExpected,
      totalVariance: netVariance,
      totalShortages,
      totalOverage,
      netBalance: totalCollected,
      completeness: (totalCollected / (totalExpected || 1)) * 100
    };
  }, [islands, salesEntries, collections, expenses, receipts]);

  // Detailed reconciliation table
  const reconciliationTable = useMemo(() => {
    return islands.map((island, index) => {
      const islandSales = salesEntries[index]?.islandTotalSales || 0;
      const islandCollections = Array.isArray(collections[index]) ? collections[index] : [];
      const islandExpenses = expenses[index] || 0;
      const islandReceipts = receipts[index] || 0;
      
      // Calculate collections
      const cashCollection = islandCollections
        .filter(c => c && c.type === 'cash')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const debtCollection = islandCollections
        .filter(c => c && c.type === 'debt')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      const totalCollection = cashCollection + debtCollection;
      const totalExpected = islandSales + islandReceipts - islandExpenses;
      const variance = totalExpected - totalCollection;
      
      const shortageRecord = shortages[index];
      const hasShortage = variance > 5;
      const shortageAmount = hasShortage ? variance : 0;

      return {
        key: index,
        islandName: island.islandName,
        islandId: island.islandId,
        attendants: island.attendants?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'Unassigned',
        totalSales: islandSales,
        receipts: islandReceipts,
        expenses: islandExpenses,
        cashDrops: cashCollection,
        debtCollections: debtCollection,
        totalCollected: totalCollection,
        totalExpected: totalExpected,
        variance: variance,
        shortageAmount: shortageAmount,
        hasShortage: hasShortage,
        shortageRecorded: !!shortageRecord,
        status: variance === 0 ? 'balanced' : variance > 0 ? 'shortage' : 'overage',
        isComplete: island.isComplete || false
      };
    });
  }, [islands, salesEntries, collections, expenses, receipts, shortages]);

  // Debtor breakdown
  const debtorBreakdown = useMemo(() => {
    const debtorMap = new Map();
    
    Object.values(collections).forEach(islandCollections => {
      if (!Array.isArray(islandCollections)) return;
      
      islandCollections.forEach(collection => {
        if (collection && collection.type === 'debt' && collection.debtorName) {
          const debtorName = collection.debtorName;
          const amount = collection.amount || 0;
          
          if (!debtorMap.has(debtorName)) {
            debtorMap.set(debtorName, {
              name: debtorName,
              total: 0,
              count: 0,
              transactions: []
            });
          }
          
          const debtor = debtorMap.get(debtorName);
          debtor.total += amount;
          debtor.count += 1;
          debtor.transactions.push({
            amount: amount,
            timestamp: collection.timestamp || new Date().toISOString()
          });
        }
      });
    });
    
    return Array.from(debtorMap.values())
      .sort((a, b) => b.total - a.total);
  }, [collections]);

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const reconciliationColumns = [
    {
      title: 'ISLAND',
      dataIndex: 'islandName',
      key: 'islandName',
      width: 140,
      fixed: 'left',
      render: (name, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '13px' }}>{name}</Text>
          {record.hasShortage && (
            <Badge 
              count="SHORTAGE" 
              style={{ 
                backgroundColor: '#fa541c',
                fontSize: '9px',
                padding: '0 4px'
              }} 
            />
          )}
        </Space>
      ),
    },
    {
      title: 'SALES',
      dataIndex: 'totalSales',
      key: 'totalSales',
      width: 110,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
          KES {amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a, b) => a.totalSales - b.totalSales,
    },
    {
      title: 'RECEIPTS',
      dataIndex: 'receipts',
      key: 'receipts',
      width: 100,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#faad14' }}>
          KES {amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
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
        <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>
          KES {amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
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
        <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>
          KES {amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'DEBTS',
      dataIndex: 'debtCollections',
      key: 'debtCollections',
      width: 110,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#722ed1' }}>
          KES {amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'VARIANCE',
      dataIndex: 'variance',
      key: 'variance',
      width: 120,
      align: 'right',
      render: (variance, record) => {
        const isPositive = variance >= 0;
        const color = isPositive ? '#52c41a' : '#fa541c';
        const icon = isPositive ? '▲' : '▼';
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: 4 
          }}>
            <Text strong style={{ 
              fontSize: '13px', 
              color: color,
              backgroundColor: isPositive ? '#f6ffed' : '#fff2e8',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {icon} KES {Math.abs(variance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </Text>
            {record.hasShortage && (
              <Tooltip title="Shortage > 5 KES">
                <AlertCircle size={14} color={color} />
              </Tooltip>
            )}
          </div>
        );
      },
      sorter: (a, b) => a.variance - b.variance,
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status) => {
        const config = {
          balanced: { color: 'green', text: '✓ Balanced', icon: '✓' },
          shortage: { color: 'red', text: 'Shortage', icon: '⚠' },
          overage: { color: 'orange', text: 'Overage', icon: '💰' }
        };
        
        const { color, text, icon } = config[status] || config.balanced;
        
        return (
          <Tag color={color} style={{ margin: 0 }}>
            {icon} {text}
          </Tag>
        );
      },
    },
  ];

  // ============================================================
  // HANDLERS
  // ============================================================

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        // Mock wallet data
        setWalletBalance(50000);
        
        // Uncomment when ready
        // const walletData = await bankingService.getStationWallet(state.currentStation?.id);
        // setWalletBalance(walletData?.currentBalance || 0);
      } catch (error) {
        console.error('Error fetching wallet:', error);
      }
    };
    
    if (state.currentStation?.id) {
      fetchWallet();
    }
  }, [state.currentStation?.id]);

  // Handle shift submission
  const handleSubmitShift = async () => {
    if (!reconciliationNotes.trim()) {
      message.warning('Please add reconciliation notes before submitting');
      return;
    }

    if (!shiftId) {
      message.error('Missing shift information');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare final payload
      const finalPayload = {
        shiftId: shiftId,
        stationId: state.currentStation?.id,
        closedBy: currentUser?.id,
        closedAt: new Date().toISOString(),
        
        // Readings data
        readings: readings,
        
        // Sales data
        sales: sales,
        
        // Summary data
        summary: {
          reconciliationNotes: reconciliationNotes.trim(),
          financialSummary: financialSummary,
          shortages: shortages,
          timestamp: new Date().toISOString()
        },
        
        // Metadata
        metadata: {
          ...metadata,
          submittedAt: new Date().toISOString()
        }
      };

      console.log('🚀 Submitting shift:', finalPayload);
      
      // Mock API call
      const mockResponse = {
        success: true,
        shift: {
          id: shiftId,
          shiftNumber: shiftNumber,
          status: 'closed',
          closedAt: new Date().toISOString()
        }
      };
      
      // Uncomment when ready
      // const response = await shiftService.closeShift(shiftId, finalPayload);
      const response = mockResponse;
      
      // Clear cache
      localStorage.removeItem(`shift_close_complete_${state.currentStation?.id}_${shiftId}`);
      
      // Show success
      setResponseData(response);
      setResponseType('success');
      setResponseModalVisible(true);
      
      if (onSubmitShift) {
        await onSubmitShift(response);
      }
      
      message.success('Shift closed successfully!');
      
    } catch (error) {
      console.error('❌ Submission error:', error);
      
      setResponseData({ 
        error: error.response?.data || error.message || 'Unknown error' 
      });
      setResponseType('error');
      setResponseModalVisible(true);
      
      message.error('Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToShiftManagement = () => {
    setResponseModalVisible(false);
    onClose();
    // Navigate to dashboard
    window.location.href = '/dashboard';
  };

  const handleBackToSalesStep = () => {
    setResponseModalVisible(false);
    onClose();
  };

  // Generate PDF Report - FIXED VERSION
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Styling
      const primaryColor = [41, 128, 185];
      const darkColor = [44, 62, 80];
      
      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SHIFT CLOSING REPORT', 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Station: ${stationName} | Shift: ${shiftNumber}`, 105, 22, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 27, { align: 'center' });
      
      // Financial Summary
      let yPos = 40;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('FINANCIAL SUMMARY', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryData = [
        ['Total Sales', `KES ${financialSummary.totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ['Cash Drops', `KES ${financialSummary.totalCashDrops.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ['Debt Collections', `KES ${financialSummary.totalDebtCollections.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ['Receipts', `KES ${financialSummary.totalReceipts.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ['Expenses', `KES ${financialSummary.totalExpenses.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ['Total Collected', `KES ${financialSummary.totalCollected.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ['Net Variance', `KES ${financialSummary.totalVariance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`]
      ];
      
      autoTable(doc, {
        head: [['Item', 'Amount']],
        body: summaryData,
        startY: yPos,
        headStyles: { fillColor: [...darkColor], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });
      
      // Get the y position after the first table
      const firstTableFinalY = doc.lastAutoTable.finalY || yPos + 50;
      
      // Island Reconciliation Table
      yPos = firstTableFinalY + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ISLAND RECONCILIATION', 20, yPos);
      
      yPos += 10;
      const tableData = reconciliationTable.map(row => [
        row.islandName,
        `KES ${row.totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
        `KES ${row.cashDrops.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
        `KES ${row.debtCollections.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
        `KES ${row.variance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
        row.status.toUpperCase()
      ]);
      
      autoTable(doc, {
        head: [['Island', 'Sales', 'Cash Drops', 'Debts', 'Variance', 'Status']],
        body: tableData,
        startY: yPos,
        headStyles: { fillColor: [...darkColor], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        pageBreak: 'auto'
      });
      
      // Save PDF
      doc.save(`shift-report-${shiftNumber}-${Date.now()}.pdf`);
      message.success('PDF report downloaded successfully!');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error('Failed to generate PDF report');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              padding: '8px', 
              borderRadius: '8px', 
              backgroundColor: '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileCheck size={24} color="#fff" />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>Shift Closing Summary</Title>
              <Space size={8} style={{ marginTop: 4 }}>
                <Tag icon={<Building size={12} />} color="blue">{stationName}</Tag>
                <Tag icon={<Clock size={12} />} color="geekblue">Shift {shiftNumber}</Tag>
                {Object.keys(shortages).length > 0 && (
                  <Tag icon={<AlertCircle size={12} />} color="red">
                    {Object.keys(shortages).length} Shortage(s)
                  </Tag>
                )}
              </Space>
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width="95%"
        style={{ maxWidth: '1400px', top: 20 }}
        footer={null}
        closeIcon={<X size={20} />}
        className="summary-modal-responsive"
        centered
      >
        <div ref={printRef} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
          
          {/* COLLAPSIBLE SECTIONS */}
          <Collapse 
            activeKey={activePanel}
            onChange={setActivePanel}
            expandIconPosition="end"
            style={{ marginBottom: 24 }}
          >
            {/* Section 1: Financial Overview */}
            <Panel 
              header={
                <Space>
                  <BarChart size={18} color="#1890ff" />
                  <Text strong style={{ fontSize: '16px' }}>Financial Overview</Text>
                  <Badge 
                    count={`KES ${financialSummary.totalCollected.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`} 
                    style={{ backgroundColor: '#52c41a' }} 
                  />
                </Space>
              } 
              key="1"
            >
              <Row gutter={[16, 16]}>
                {/* Key Metrics */}
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '4px solid #1890ff' }}>
                    <Statistic
                      title="Total Sales"
                      value={financialSummary.totalSales}
                      precision={2}
                      prefix="KES"
                      valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                    />
                    <Progress 
                      percent={100} 
                      size="small" 
                      strokeColor="#1890ff"
                      showInfo={false}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                    <Statistic
                      title="Cash Drops"
                      value={financialSummary.totalCashDrops}
                      precision={2}
                      prefix="KES"
                      valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                    />
                    <Progress 
                      percent={(financialSummary.totalCashDrops / (financialSummary.totalSales || 1)) * 100} 
                      size="small" 
                      strokeColor="#52c41a"
                      showInfo={false}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '4px solid #722ed1' }}>
                    <Statistic
                      title="Debt Collections"
                      value={financialSummary.totalDebtCollections}
                      precision={2}
                      prefix="KES"
                      valueStyle={{ color: '#722ed1', fontSize: '18px' }}
                    />
                    <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
                      {debtorBreakdown.length} debtor(s)
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ 
                    borderLeft: '4px solid', 
                    borderLeftColor: financialSummary.totalVariance >= 0 ? '#fa541c' : '#faad14'
                  }}>
                    <Statistic
                      title="Net Variance"
                      value={Math.abs(financialSummary.totalVariance)}
                      precision={2}
                      prefix="KES"
                      valueStyle={{ 
                        color: financialSummary.totalVariance >= 0 ? '#fa541c' : '#faad14',
                        fontSize: '18px'
                      }}
                    />
                    <Tag color={financialSummary.totalVariance >= 0 ? 'red' : 'orange'}>
                      {financialSummary.totalVariance >= 0 ? 'Shortage' : 'Overage'}
                    </Tag>
                  </Card>
                </Col>

                {/* Wallet Impact */}
                <Col xs={24}>
                  <Card 
                    title={
                      <Space>
                        <Wallet size={16} color="#1890ff" />
                        <Text strong>Station Wallet Impact</Text>
                      </Space>
                    }
                    size="small"
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="Previous Balance">
                            <Text strong style={{ color: '#1890ff' }}>
                              KES {walletBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Collection Added">
                            <Text strong style={{ color: '#52c41a' }}>
                              KES {financialSummary.totalCollected.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="New Balance">
                            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                              KES {(walletBalance + financialSummary.totalCollected).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col xs={24} md={16}>
                        <Progress
                          percent={100}
                          success={{
                            percent: (financialSummary.totalCollected / (walletBalance + financialSummary.totalCollected || 1)) * 100,
                            strokeColor: '#52c41a'
                          }}
                          strokeColor="#e6f7ff"
                          style={{ marginTop: 20 }}
                        />
                        <Space style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 12, height: 12, backgroundColor: '#e6f7ff', borderRadius: '2px' }} />
                            <Text type="secondary" style={{ fontSize: '12px' }}>Previous Balance</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 12, height: 12, backgroundColor: '#52c41a', borderRadius: '2px' }} />
                            <Text type="secondary" style={{ fontSize: '12px' }}>Today's Collection</Text>
                          </div>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </Panel>

            {/* Section 2: Island Reconciliation */}
            <Panel 
              header={
                <Space>
                  <Receipt size={18} color="#52c41a" />
                  <Text strong style={{ fontSize: '16px' }}>Island Reconciliation</Text>
                  <Badge 
                    count={`${reconciliationTable.length} islands`} 
                    style={{ backgroundColor: '#52c41a' }} 
                  />
                </Space>
              } 
              key="2"
            >
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <Table
                  columns={reconciliationColumns}
                  dataSource={reconciliationTable}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 800 }}
                  style={{ minWidth: 800 }}
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                        <Table.Summary.Cell index={0} colSpan={1}>
                          <Text strong>TOTAL</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text strong style={{ color: '#1890ff' }}>
                            KES {financialSummary.totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <Text strong style={{ color: '#faad14' }}>
                            KES {financialSummary.totalReceipts.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <Text strong style={{ color: '#ff4d4f' }}>
                            KES {financialSummary.totalExpenses.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          <Text strong style={{ color: '#52c41a' }}>
                            KES {financialSummary.totalCashDrops.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Text strong style={{ color: '#722ed1' }}>
                            KES {financialSummary.totalDebtCollections.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          <Text strong style={{ 
                            color: financialSummary.totalVariance >= 0 ? '#fa541c' : '#faad14'
                          }}>
                            {financialSummary.totalVariance >= 0 ? '+' : ''}
                            KES {Math.abs(financialSummary.totalVariance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} align="center">
                          <Tag color={financialSummary.totalVariance === 0 ? 'green' : financialSummary.totalVariance > 0 ? 'red' : 'orange'}>
                            {financialSummary.totalVariance === 0 ? 'BALANCED' : financialSummary.totalVariance > 0 ? 'NET SHORTAGE' : 'NET OVERAGE'}
                          </Tag>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </div>

              {/* Shortage Details */}
              <ShortageDetails shortages={shortages} />
            </Panel>

            {/* Section 3: Debtor Breakdown */}
            {debtorBreakdown.length > 0 && (
              <Panel 
                header={
                  <Space>
                    <Users size={18} color="#722ed1" />
                    <Text strong style={{ fontSize: '16px' }}>Debtor Collections</Text>
                    <Badge 
                      count={debtorBreakdown.length} 
                      style={{ backgroundColor: '#722ed1' }} 
                    />
                </Space>
                } 
                key="3"
              >
                <Row gutter={[16, 16]}>
                  {debtorBreakdown.map((debtor, index) => (
                    <Col xs={24} sm={12} md={8} key={index}>
                      <Card size="small" style={{ borderLeft: '4px solid #722ed1' }}>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong style={{ fontSize: '14px' }}>{debtor.name}</Text>
                            <Tag color="purple">{debtor.count} trans</Tag>
                          </div>
                          <Text strong style={{ fontSize: '16px', color: '#722ed1' }}>
                            KES {debtor.total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </Text>
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            Last: {new Date(debtor.transactions[0]?.timestamp).toLocaleDateString()}
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Panel>
            )}
          </Collapse>

          {/* ============================================================
          RECONCILIATION NOTES & SUBMISSION
          ============================================================ */}
          <Card
            title={
              <Space>
                <Edit size={18} color="#1890ff" />
                <Text strong style={{ fontSize: '16px' }}>Reconciliation Notes</Text>
                <Tooltip title="Required for audit trail">
                  <Info size={14} color="#faad14" />
                </Tooltip>
              </Space>
            }
            style={{ 
              marginTop: 24,
              border: '2px solid #1890ff',
              borderRadius: '8px'
            }}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter detailed notes about today's shift, any discrepancies, special circumstances, or additional information for audit purposes..."
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              maxLength={1000}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                fontSize: '14px',
                padding: '12px'
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: 8,
              alignItems: 'center'
            }}>
              <Space>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {reconciliationNotes.length}/1000 characters
                </Text>
                {reconciliationNotes.length < 50 && (
                  <Text type="warning" style={{ fontSize: '12px' }}>
                    Please provide more details
                  </Text>
                )}
              </Space>
              <Space>
                <Lock size={12} color="#666" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  These notes are permanently recorded
                </Text>
              </Space>
            </div>
          </Card>

          {/* ============================================================
          FINAL ACTIONS
          ============================================================ */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 24,
            paddingTop: 24,
            borderTop: '2px solid #f0f0f0'
          }}>
            {/* Export Options */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Button
                icon={<FileDown size={16} />}
                onClick={handleDownloadPDF}
                size="middle"
                type="primary"
                style={{
                  background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                  border: 'none',
                  fontWeight: 'bold'
                }}
              >
                Download PDF Report
              </Button>
              <Button
                icon={<Printer size={16} />}
                onClick={() => window.print()}
                size="middle"
              >
                Print Report
              </Button>
              <Button
                onClick={onClose}
                icon={<ArrowLeft size={16} />}
                size="middle"
                disabled={submitting}
              >
                Back to Sales
              </Button>
            </div>

            {/* Submission Section */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 16
            }}>
              {/* Validation Warnings */}
              <div style={{ flex: 1 }}>
                {!reconciliationNotes.trim() && (
                  <Alert
                    message="Missing Reconciliation Notes"
                    description="Please add detailed notes before submitting the shift."
                    type="warning"
                    showIcon
                    size="small"
                  />
                )}
                {Object.keys(shortages).length > 0 && (
                  <Alert
                    message={`${Object.keys(shortages).length} Shortage(s) Recorded`}
                    description="Shortages will be deducted from attendant accounts."
                    type="info"
                    showIcon
                    size="small"
                  />
                )}
              </div>
              
              {/* Submit Button */}
              <Button
                type="primary"
                icon={<Send size={18} />}
                onClick={handleSubmitShift}
                loading={submitting}
                disabled={!reconciliationNotes.trim() || !shiftId}
                style={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                  border: 'none',
                  padding: '0 40px',
                  height: '48px',
                  fontSize: '16px',
                  minWidth: '200px'
                }}
                size="large"
              >
                <Space size={8}>
                  {submitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      FINALIZE SHIFT
                    </>
                  )}
                </Space>
              </Button>
            </div>

            {/* Final Warning */}
            <Alert
              message="Final Submission Warning"
              description="Once submitted, this shift cannot be reopened. All data will be permanently recorded and cache will be cleared."
              type="warning"
              showIcon
              icon={<Shield size={16} />}
            />
          </div>
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

      <style jsx global>{`
        @media print {
          .summary-modal-responsive .ant-modal-content {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .ant-collapse-content,
          .ant-collapse-content-active {
            display: block !important;
            height: auto !important;
          }
        }
        
        @media (max-width: 768px) {
          .summary-modal-responsive .ant-modal {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            top: 0 !important;
            padding: 0 !important;
            height: 100vh;
          }
          
          .summary-modal-responsive .ant-modal-body {
            padding: 16px !important;
            max-height: calc(100vh - 108px);
            overflow-y: auto;
          }
          
          .ant-table {
            font-size: 11px !important;
          }
        }
        
        .response-modal .ant-result {
          padding: 40px 20px;
        }
      `}</style>
    </>
  );
};

export default SummaryModal;