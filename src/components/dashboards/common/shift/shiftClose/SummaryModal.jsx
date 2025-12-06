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
  Result,
  Tag,
  Divider,
  List,
  Statistic,
  Progress
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
  ChevronDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { shiftService } from '../../../../../services/shiftService/shiftService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text, Paragraph } = Typography;

// Response Modal Component
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
  const [showDebtorDetails, setShowDebtorDetails] = useState({});

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

  // Calculate debtor breakdown
  const debtorBreakdown = useMemo(() => {
    const debtorMap = new Map();
    
    islands.forEach(island => {
      const collections = island.collections || [];
      collections.forEach(collection => {
        if (collection && collection.type === 'debt' && collection.debtorName) {
          const debtorName = collection.debtorName;
          const amount = collection.amount || 0;
          
          if (!debtorMap.has(debtorName)) {
            debtorMap.set(debtorName, {
              name: debtorName,
              total: 0,
              transactions: []
            });
          }
          
          const debtor = debtorMap.get(debtorName);
          debtor.total += amount;
          debtor.transactions.push({
            island: island.islandName,
            amount: amount,
            date: new Date().toLocaleDateString()
          });
        }
      });
    });
    
    // Convert to array and sort by total descending
    return Array.from(debtorMap.values())
      .sort((a, b) => b.total - a.total);
  }, [islands]);

  // Calculate totals for reconciliation table
  const reconciliationData = useMemo(() => {
    return islands.map((island, index) => {
      const cashDrops = island.cashCollection || 0;
      const debtCollections = island.collections?.filter(c => c && c.type === 'debt') || [];
      
      // Calculate total debt amount
      const totalDebts = debtCollections.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      
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
        totalCollected: totalCollected,
        variance: variance,
        isComplete: island.isComplete || false
      };
    });
  }, [islands]);

  // Calculate overall totals
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
        setNewWalletBalance(balance + overallTotals.totalSales);
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

  // Cash Reconciliation Breakdown
  const cashReconciliation = useMemo(() => {
    const totalSales = overallTotals.totalSales;
    const totalDebts = overallTotals.totalDebts;
    const totalReceipts = overallTotals.totalReceipts;
    const totalExpenses = overallTotals.totalExpenses;
    const totalDrops = overallTotals.totalCashDrops;
    
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

  // Toggle debtor details
  const toggleDebtorDetails = (debtorName) => {
    setShowDebtorDetails(prev => ({
      ...prev,
      [debtorName]: !prev[debtorName]
    }));
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Main Reconciliation Table Columns
  const financialColumns = [
    {
      title: 'ISLAND',
      dataIndex: 'islandName',
      key: 'islandName',
      width: 140,
      fixed: 'left',
      render: (name) => (
        <Text strong style={{ fontSize: '13px' }}>{name}</Text>
      ),
    },
    {
      title: 'ATTENDANT(S)',
      dataIndex: 'attendants',
      key: 'attendants',
      width: 160,
      render: (attendants) => (
        <Text style={{ fontSize: '12px' }}>{attendants}</Text>
      ),
    },
    {
      title: 'TOTAL SALES',
      dataIndex: 'totalSales',
      key: 'totalSales',
      width: 120,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'RECEIPTS',
      dataIndex: 'receipts',
      key: 'receipts',
      width: 110,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#faad14' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'EXPENSES',
      dataIndex: 'expenses',
      key: 'expenses',
      width: 110,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>
          {formatCurrency(amount)}
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
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'DEBTS',
      dataIndex: 'totalDebts',
      key: 'totalDebts',
      width: 110,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', color: '#722ed1' }}>
          {formatCurrency(amount)}
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
        const color = isPositive ? '#52c41a' : '#fa541c';
        const icon = isPositive ? '+' : '';
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            {!isPositive && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />}
            <Text strong style={{ fontSize: '13px', color: color }}>
              {icon}{formatCurrency(Math.abs(variance))}
            </Text>
            {isPositive && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />}
          </div>
        );
      },
    },
  ];

  // Handle shift submission
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
        submittedAt: new Date().toISOString(),
        submittedBy: currentUser?.id,
        stationId: stateStationId
      };

      console.log('🚀 Submitting shift with payload:', finalPayload);
      
      const response = await shiftService.closeShift(shiftId, finalPayload);
      
      console.log('✅ Shift closed successfully:', response);
      
      // Clear cache
      const shiftCacheKey = `shift_close_draft_${stateStationId}_${shiftId}`;
      const legacyCacheKey = `shift_close_draft_${stateStationId}`;
      localStorage.removeItem(shiftCacheKey);
      localStorage.removeItem(legacyCacheKey);
      
      // Clear all shift-related cache
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes(stateStationId) || key.includes(shiftId))) {
          localStorage.removeItem(key);
        }
      }
      
      setResponseData(response);
      setResponseType('success');
      setResponseModalVisible(true);
      
      if (onSubmitShift) {
        await onSubmitShift(response);
      }
      
      message.success({
        content: 'Shift submitted successfully! All cache cleared.',
        duration: 4,
      });
      
    } catch (error) {
      console.error('❌ Error submitting shift:', error);
      
      setResponseData({ 
        error: error.response?.data || error.message || error 
      });
      setResponseType('error');
      setResponseModalVisible(true);
      
      message.error('Failed to submit shift. Please try again.');
      
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToShiftManagement = () => {
    setResponseModalVisible(false);
    onClose();
    navigate('/station-manager/dashboard');
  };

  const handleBackToSalesStep = () => {
    setResponseModalVisible(false);
    onClose();
  };

  // PDF Generation
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      
      doc.setProperties({
        title: `Shift Cash Summary - ${shiftNumber}`,
        subject: 'Daily Cash Summary Report',
        author: `${currentUser?.firstName} ${currentUser?.lastName}`,
        creator: 'Fuel Management System'
      });

      const primaryColor = [41, 128, 185];
      const darkColor = [44, 62, 80];
      
      let yPosition = 25;

      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 297, 40, 'F');
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SHIFT CASH SUMMARY REPORT', 148, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Daily Financial Operations Summary', 148, 22, { align: 'center' });

      // Station Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Station: ${stationName}`, 20, 32);
      doc.text(`Shift: ${shiftNumber}`, 148, 32, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 277, 32, { align: 'right' });

      // Main table
      yPosition = 50;
      autoTable(doc, {
        head: [['Island', 'Attendants', 'Total Sales', 'Receipts', 'Expenses', 'Cash Drops', 'Debts', 'Variance']],
        body: reconciliationData.map(row => [
          row.islandName,
          row.attendants,
          formatCurrency(row.totalSales),
          formatCurrency(row.receipts),
          formatCurrency(row.expenses),
          formatCurrency(row.cashDrops),
          formatCurrency(row.totalDebts),
          formatCurrency(row.variance)
        ]),
        startY: yPosition,
        headStyles: { 
          fillColor: [...darkColor],
          textColor: [255, 255, 255],
          fontSize: 9
        },
        styles: { fontSize: 8 }
      });

      // Save PDF
      doc.save(`shift-cash-summary-${shiftNumber}.pdf`);
      message.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF report');
    }
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={24} color="#1890ff" />
            <div>
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Shift Cash Summary Report</Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {stationName} • Shift {shiftNumber}
              </Text>
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width="95%"
        style={{ maxWidth: '1400px', top: 20 }}
        footer={null}
        closeIcon={<X size={18} />}
        className="summary-modal-responsive"
      >
        <div ref={printRef}>
          {/* Header Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ background: 'linear-gradient(135deg, #f0f8ff, #e6f7ff)' }}>
                <Statistic
                  title="Total Sales"
                  value={overallTotals.totalSales}
                  precision={2}
                  prefix={<DollarSign size={16} color="#1890ff" />}
                  valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}
                  suffix="KES"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ background: 'linear-gradient(135deg, #f6ffed, #d9f7be)' }}>
                <Statistic
                  title="Cash Drops"
                  value={overallTotals.totalCashDrops}
                  precision={2}
                  prefix={<Wallet size={16} color="#52c41a" />}
                  valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
                  suffix="KES"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ background: 'linear-gradient(135deg, #fff7e6, #ffe7ba)' }}>
                <Statistic
                  title="Total Variance"
                  value={Math.abs(overallTotals.totalVariance)}
                  precision={2}
                  prefix={<TrendingUp size={16} color={overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c'} />}
                  valueStyle={{ 
                    color: overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                  suffix="KES"
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {overallTotals.totalVariance >= 0 ? 'Overage' : 'Shortage'}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ background: 'linear-gradient(135deg, #f9f0ff, #efdbff)' }}>
                <Statistic
                  title="Debt Collection"
                  value={overallTotals.totalDebts}
                  precision={2}
                  prefix={<CreditCard size={16} color="#722ed1" />}
                  valueStyle={{ color: '#722ed1', fontSize: '18px', fontWeight: 'bold' }}
                  suffix="KES"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Left Column - Debtor Breakdown */}
            <Col xs={24} md={12} lg={8}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} color="#722ed1" />
                    <Text strong style={{ fontSize: '16px' }}>Debtor Breakdown</Text>
                  </div>
                }
                style={{ height: '100%' }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: '14px', color: '#722ed1' }}>Total Debt Collected:</Text>
                    <Text strong style={{ fontSize: '16px', color: '#722ed1' }}>
                      {formatCurrency(overallTotals.totalDebts)}
                    </Text>
                  </div>
                  
                  {debtorBreakdown.length > 0 ? (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        {debtorBreakdown.map((debtor, index) => (
                          <div key={index} style={{ marginBottom: 8 }}>
                            <div 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '8px',
                                backgroundColor: showDebtorDetails[debtor.name] ? '#f9f0ff' : 'transparent',
                                borderRadius: '4px',
                                border: '1px solid #f0f0f0'
                              }}
                              onClick={() => toggleDebtorDetails(debtor.name)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {showDebtorDetails[debtor.name] ? 
                                  <ChevronDown size={14} color="#722ed1" /> : 
                                  <ChevronRight size={14} color="#722ed1" />
                                }
                                <Text strong style={{ fontSize: '13px' }}>{debtor.name}</Text>
                              </div>
                              <Text strong style={{ fontSize: '13px', color: '#722ed1' }}>
                                {formatCurrency(debtor.total)}
                              </Text>
                            </div>
                            
                            {showDebtorDetails[debtor.name] && debtor.transactions.length > 0 && (
                              <div style={{ 
                                padding: '12px', 
                                backgroundColor: '#fafafa',
                                marginTop: 4,
                                borderRadius: '4px'
                              }}>
                                <List
                                  size="small"
                                  dataSource={debtor.transactions}
                                  renderItem={(transaction, idx) => (
                                    <List.Item>
                                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <Text style={{ fontSize: '12px' }}>{transaction.island}</Text>
                                          <Text strong style={{ fontSize: '12px', color: '#722ed1' }}>
                                            {formatCurrency(transaction.amount)}
                                          </Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: '11px' }}>
                                          {transaction.date}
                                        </Text>
                                      </Space>
                                    </List.Item>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Debtor Summary */}
                      <Card size="small" style={{ backgroundColor: '#f9f0ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: '13px' }}>Total Debtors:</Text>
                          <Tag color="purple">{debtorBreakdown.length}</Tag>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {debtorBreakdown.map(d => d.name).join(', ')}
                          </Text>
                        </div>
                      </Card>
                    </>
                  ) : (
                    <Alert
                      message="No Debt Collections"
                      description="No debt collections were recorded for this shift."
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}
                </div>
              </Card>
            </Col>

            {/* Right Column - Main Table and Cash Summary */}
            <Col xs={24} md={12} lg={16}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Receipt size={18} color="#1890ff" />
                    <Text strong style={{ fontSize: '16px' }}>Island Reconciliation</Text>
                  </div>
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
                      <Table.Summary>
                        <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                          <Table.Summary.Cell index={0} colSpan={2}>
                            <Text strong>TOTAL</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text strong style={{ color: '#1890ff' }}>
                              {formatCurrency(overallTotals.totalSales)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Text strong style={{ color: '#faad14' }}>
                              {formatCurrency(overallTotals.totalReceipts)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong style={{ color: '#ff4d4f' }}>
                              {formatCurrency(overallTotals.totalExpenses)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text strong style={{ color: '#52c41a' }}>
                              {formatCurrency(overallTotals.totalCashDrops)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <Text strong style={{ color: '#722ed1' }}>
                              {formatCurrency(overallTotals.totalDebts)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            <Text strong style={{ color: overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c' }}>
                              {overallTotals.totalVariance >= 0 ? '+' : ''}{formatCurrency(Math.abs(overallTotals.totalVariance))}
                            </Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                </div>
              </Card>

              {/* Cash Summary Report */}
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={18} color="#52c41a" />
                    <Text strong style={{ fontSize: '16px' }}>Shift Cash Summary Report</Text>
                  </div>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <div style={{ padding: '12px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: '14px' }}>Total Sales Revenue:</Text>
                        <Text strong style={{ fontSize: '15px', color: '#1890ff' }}>
                          {formatCurrency(cashReconciliation.totalSales)}
                        </Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>Cash Drops:</Text>
                        <Text style={{ color: '#52c41a' }}>{formatCurrency(cashReconciliation.totalDrops)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>Debt Collections:</Text>
                        <Text style={{ color: '#722ed1' }}>{formatCurrency(cashReconciliation.totalDebts)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>Receipts:</Text>
                        <Text style={{ color: '#faad14' }}>{formatCurrency(cashReconciliation.totalReceipts)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>Expenses:</Text>
                        <Text style={{ color: '#ff4d4f' }}>{formatCurrency(cashReconciliation.totalExpenses)}</Text>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div style={{ padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text strong style={{ fontSize: '14px' }}>Station Wallet:</Text>
                        <div style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: '12px', color: '#666' }}>Previous Balance:</Text>
                          <Text strong style={{ fontSize: '15px', color: '#1890ff' }}>
                            {formatCurrency(cashReconciliation.walletBalance)}
                          </Text>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: 12,
                        padding: '8px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }}>
                        <Text strong style={{ fontSize: '14px' }}>Actual Collection:</Text>
                        <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                          {formatCurrency(cashReconciliation.actualCollection)}
                        </Text>
                      </div>
                      
                      <Divider style={{ margin: '8px 0' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ fontSize: '14px' }}>New Wallet Balance:</Text>
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                          {formatCurrency(cashReconciliation.newWalletBalance)}
                        </Text>
                      </div>
                      
                      <div style={{ marginTop: 8 }}>
                        <Progress
                          percent={Math.min(100, (cashReconciliation.actualCollection / (cashReconciliation.walletBalance + 1)) * 100)}
                          size="small"
                          strokeColor={{
                            '0%': '#1890ff',
                            '100%': '#52c41a',
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Collection added to wallet
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
                
                {/* Variance Alert */}
                {Math.abs(cashReconciliation.totalVariance) > 0 && (
                  <Alert
                    message={`Cash ${cashReconciliation.totalVariance >= 0 ? 'Overage' : 'Shortage'} Detected`}
                    description={
                      <Text>
                        There is a {cashReconciliation.totalVariance >= 0 ? 'positive' : 'negative'} variance of{' '}
                        <Text strong style={{ color: cashReconciliation.totalVariance >= 0 ? '#52c41a' : '#fa541c' }}>
                          {formatCurrency(Math.abs(cashReconciliation.totalVariance))}
                        </Text>
                        {' '}between expected and actual collections.
                      </Text>
                    }
                    type={cashReconciliation.totalVariance >= 0 ? 'success' : 'error'}
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* Reconciliation Notes */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#1890ff" />
                <Text strong style={{ fontSize: '16px' }}>Reconciliation Notes & Comments</Text>
              </div>
            }
            style={{ marginTop: 24 }}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter detailed reconciliation notes, explanation of variances, special circumstances, or additional comments..."
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              maxLength={500}
              style={{
                border: '2px solid #1890ff',
                borderRadius: '6px',
                fontSize: '14px',
                padding: '12px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {reconciliationNotes.length}/500 characters
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Required for submission
              </Text>
            </div>
          </Card>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 24,
            paddingTop: 24,
            borderTop: '2px solid #f0f0f0'
          }}>
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
                icon={<X size={16} />}
                size="middle"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<Send size={16} />}
                onClick={handleSubmitShift}
                loading={submitting}
                disabled={!reconciliationNotes.trim() || !shiftId}
                style={{
                  fontWeight: 'bold',
                  backgroundColor: '#52c41a',
                  border: 'none',
                  padding: '0 32px',
                  height: '44px',
                  fontSize: '15px'
                }}
                size="large"
              >
                <Space size={6}>
                  <CheckCircle size={18} />
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
              />
            )}

            {!shiftId && (
              <Alert
                message="Missing Shift Information"
                description="Unable to submit shift report without valid shift data."
                type="error"
                showIcon
              />
            )}
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
            font-size: 12px !important;
          }
          
          .ant-table-thead > tr > th {
            padding: 8px !important;
            font-size: 11px !important;
          }
          
          .ant-table-tbody > tr > td {
            padding: 8px !important;
            font-size: 11px !important;
          }
        }
        
        @media (max-width: 576px) {
          .ant-statistic-title {
            font-size: 12px !important;
          }
          
          .ant-statistic-content {
            font-size: 14px !important;
          }
        }
      `}</style>
    </>
  );
};

export default SummaryModal;