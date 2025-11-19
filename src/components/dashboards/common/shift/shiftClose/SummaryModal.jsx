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
  Statistic,
  Typography,
  Button,
  Divider,
  Tag,
  Tabs,
  Input,
  message,
  Result
} from 'antd';
import {
  FileText,
  CheckCircle,
  X,
  Send,
  TrendingUp,
  TrendingDown,
  Calculator,
  Download,
  Zap,
  Droplets,
  ArrowLeft,
  AlertCircle,
  Printer,
  FileDown,
  Wallet,
  User,
  Building,
  CreditCard
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { shiftService } from '../../../../../services/shiftService/shiftService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text } = Typography;

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
  const [activeTab, setActiveTab] = useState('reconciliation');
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
  const pumpReadings = islandSalesData?.pumpReadings || [];
  const tankReadings = islandSalesData?.tankReadings || [];
  const stateStationId = state.currentStation?.id;
  const currentUser = state.currentUser;

  // Calculate totals for reconciliation table
  const reconciliationData = useMemo(() => {
    return islands.map((island, index) => {
      const cashAmount = island.cashCollection || 0;
      const debtCollections = island.collections?.filter(c => c && c.type === 'debt') || [];
      
      // Group debt by debtor for display
      const debtByDebtor = debtCollections.reduce((acc, debt) => {
        const debtorName = debt.debtorName || `Debtor ${debt.debtorId?.slice(0, 8)}`;
        if (!acc[debtorName]) {
          acc[debtorName] = 0;
        }
        acc[debtorName] += debt.amount || 0;
        return acc;
      }, {});

      // Calculate variance correctly: Expected - Collected
      const totalSales = island.totalActualSales || 0;
      const receipts = island.receipts || 0;
      const expenses = island.expenses || 0;
      const collected = cashAmount; // Cash drops = collected amount
      const expected = totalSales + receipts - expenses;
      const variance = expected - collected;

      return {
        key: index,
        islandName: island.islandName,
        attendants: island.attendants?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'No attendants',
        totalSales: totalSales,
        receipts: receipts,
        expenses: expenses,
        cashDrops: collected,
        variance: variance,
        debtCollections: debtByDebtor,
        totalExpected: expected,
        totalCollected: collected,
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
    const totalExpected = reconciliationData.reduce((sum, row) => sum + row.totalExpected, 0);
    const totalCollected = reconciliationData.reduce((sum, row) => sum + row.totalCollected, 0);

    // Calculate total debts (all non-cash collections)
    const totalDebts = reconciliationData.reduce((sum, row) => {
      const rowDebts = Object.values(row.debtCollections || {}).reduce((debtSum, amount) => debtSum + amount, 0);
      return sum + rowDebts;
    }, 0);

    return {
      totalCashDrops,
      totalSales,
      totalReceipts,
      totalExpenses,
      totalVariance,
      totalExpected,
      totalCollected,
      totalDebts
    };
  }, [reconciliationData]);

  // Calculate totals for wallet calculation
  const walletCalculationTotals = useMemo(() => {
    const totalCashDrops = reconciliationData.reduce((sum, row) => sum + row.cashDrops, 0);
    const totalExpenses = reconciliationData.reduce((sum, row) => sum + row.expenses, 0);
    
    return {
      totalCashDrops,
      totalExpenses
    };
  }, [reconciliationData]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const walletData = await bankingService.getStationWallet(stateStationId);
        console.log("the wallet balance ", walletData);
        const balance = walletData?.currentBalance || 0;
        setWalletBalance(balance);
        
        // Calculate new balance: current balance + actual collection
        const actualCollection = overallTotals.totalSales + overallTotals.totalReceipts - overallTotals.totalExpenses;
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

  // Cash Reconciliation Breakdown - FIXED CALCULATION
  const cashReconciliation = useMemo(() => {
    const totalSales = overallTotals.totalSales;
    const totalDebts = overallTotals.totalDebts;
    const totalReceipts = overallTotals.totalReceipts;
    const totalExpenses = overallTotals.totalExpenses;
    const totalDrops = overallTotals.totalCashDrops;
    
    // Actual Collection = Total Sales + Receipts - Expenses
    const actualCollection = totalSales + totalReceipts - totalExpenses;
    
    return {
      totalSales,
      totalDebts,
      totalReceipts,
      totalExpenses,
      totalDrops,
      actualCollection,
      walletBalance,
      newWalletBalance: walletBalance + actualCollection
    };
  }, [overallTotals, walletBalance]);

  // Get all unique debtor names for columns
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
          KES {amount?.toFixed(2) || '0.00'}
        </Text>
      ) : null
    }));
  }, [reconciliationData]);

  // Main Reconciliation Table Columns - Clean Financial Style
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
          KES {amount?.toFixed(2) || '0.00'}
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
          KES {amount?.toFixed(2) || '0.00'}
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
          KES {amount?.toFixed(2) || '0.00'}
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
          KES {amount?.toFixed(2) || '0.00'}
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
            {isPositive ? '+' : ''}KES {variance?.toFixed(2) || '0.00'}
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
      // Prepare final payload with reconciliation notes
      const finalPayload = {
        ...apiPayload,
        reconciliationNotes: reconciliationNotes.trim(),
        submittedAt: new Date().toISOString()
      };

      console.log('🚀 Submitting shift with payload:', finalPayload);
      
      // Call the shiftService.closeShift method directly
      const response = await shiftService.closeShift(shiftId, finalPayload);
      
      console.log('✅ Shift closed successfully:', response);
      
      // Store response and show success modal
      setResponseData(response);
      setResponseType('success');
      setResponseModalVisible(true);
      
      // Call the parent handler if provided (for any additional actions)
      if (onSubmitShift) {
        await onSubmitShift(response);
      }
      
    } catch (error) {
      console.error('❌ Error submitting shift:', error);
      
      // Store error and show error modal
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

  // Download as PDF
  const handleDownloadPDF = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element);
    const data = canvas.toDataURL('image/png');

    const pdf = new jsPDF();
    const imgProperties = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

    pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`shift-reconciliation-${shiftNumber}.pdf`);
    message.success('PDF downloaded successfully');
  };

  // Download as Excel (CSV)
  const handleDownloadExcel = () => {
    const headers = ['Island', 'Attendants', 'Total Sales', 'Receipts', 'Expenses', 'Cash Drops', 'Variance'];
    const csvData = reconciliationData.map(row => [
      row.islandName,
      row.attendants,
      row.totalSales,
      row.receipts,
      row.expenses,
      row.cashDrops,
      row.variance
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-reconciliation-${shiftNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Excel (CSV) downloaded successfully');
  };

  // Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Shift Reconciliation - ${shiftNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .document-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .table th { background-color: #f0f0f0; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; border: 1px solid #000; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <FileText size={20} />
            <Title level={4} style={{ margin: 0 }}>Shift Reconciliation Report</Title>
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
          <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 10 }}>
            <Title level={2} style={{ margin: 0, color: '#000' }}>SHIFT RECONCILIATION REPORT</Title>
            <Text strong style={{ fontSize: '16px', color: '#000' }}>Daily Operations Summary</Text>
          </div>

          {/* Document Information */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
            <div>
              <Space direction="vertical" size={2}>
                <Space>
                  <Building size={14} />
                  <Text strong>Station:</Text>
                  <Text>{state?.currentStation?.name || 'N/A'}</Text>
                </Space>
                <Space>
                  <FileText size={14} />
                  <Text strong>Shift code# </Text>
                  <Text>{shiftNumber || 'N/A'}</Text>
                </Space>
              </Space>
            </div>
            <div>
              <Space direction="vertical" size={2}>
                <Space>
                  <User size={14} />
                  <Text strong>Reconciled By:</Text>
                  <Text>{currentUser?.firstName} {currentUser?.lastName}</Text>
                </Space>
                <Space>
                  <Text strong>Date:</Text>
                  <Text>{new Date().toLocaleDateString()}</Text>
                </Space>
              </Space>
            </div>
          </div>

          {/* Main Reconciliation Table */}
          <Card 
            title={
              <Text strong style={{ fontSize: '16px', color: '#000' }}>
                ISLAND RECONCILIATION SUMMARY
              </Text>
            }
            bodyStyle={{ padding: 0 }}
            style={{ marginBottom: 20 }}
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
                  <Table.Summary.Row style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong>TOTAL</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong>KES {overallTotals.totalSales.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                    
                    {debtColumns.map((column, index) => {
                      const debtorTotal = reconciliationData.reduce((sum, row) => 
                        sum + (row.debtCollections[column.title] || 0), 0
                      );
                      return (
                        <Table.Summary.Cell key={index} index={index + 2} align="right">
                          {debtorTotal > 0 && (
                            <Text strong>KES {debtorTotal.toFixed(2)}</Text>
                          )}
                        </Table.Summary.Cell>
                      );
                    })}
                    
                    <Table.Summary.Cell index={debtColumns.length + 2} align="right">
                      <Text strong>KES {overallTotals.totalReceipts.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={debtColumns.length + 3} align="right">
                      <Text strong>KES {overallTotals.totalExpenses.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={debtColumns.length + 4} align="right">
                      <Text strong>KES {overallTotals.totalCashDrops.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={debtColumns.length + 5} align="right">
                      <Text strong style={{ color: overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c' }}>
                        {overallTotals.totalVariance >= 0 ? '+' : ''}KES {Math.abs(overallTotals.totalVariance).toFixed(2)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          {/* Financial Summary Section - FIXED CALCULATION */}
          <Row gutter={[16, 16]}>
            <Col span={16}>
              {/* Additional data tables can go here if needed */}
            </Col>
            <Col span={8}>
              <Card 
                title={
                  <Text strong style={{ fontSize: '16px', color: '#000' }}>
                    FINANCIAL SUMMARY
                  </Text>
                }
                bodyStyle={{ padding: '16px' }}
                style={{ border: '1px solid #000' }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 0' }}>
                        <Text strong>Total Sales:</Text>
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>
                        <Text strong>KES {cashReconciliation.totalSales.toFixed(2)}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #000' }}>
                        <Space>
                          <CreditCard size={12} />
                          <Text>Total Debts (Lipa na Mpesa):</Text>
                        </Space>
                      </td>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #000', textAlign: 'right' }}>
                        <Text>KES {cashReconciliation.totalDebts.toFixed(2)}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #000' }}>
                        <Text>Total Receipts:</Text>
                      </td>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #000', textAlign: 'right' }}>
                        <Text>KES {cashReconciliation.totalReceipts.toFixed(2)}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', borderBottom: '2px solid #000' }}>
                        <Text strong>Sub Total:</Text>
                      </td>
                      <td style={{ padding: '8px 0', borderBottom: '2px solid #000', textAlign: 'right' }}>
                        <Text strong>
                          KES {(cashReconciliation.totalSales + cashReconciliation.totalReceipts).toFixed(2)}
                        </Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #000' }}>
                        <Text>Total Expenses:</Text>
                      </td>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #000', textAlign: 'right' }}>
                        <Text>KES {cashReconciliation.totalExpenses.toFixed(2)}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', borderBottom: '2px solid #1890ff' }}>
                        <Text strong>Actual Collection:</Text>
                      </td>
                      <td style={{ padding: '8px 0', borderBottom: '2px solid #1890ff', textAlign: 'right' }}>
                        <Text strong style={{ color: '#1890ff' }}>
                          KES {cashReconciliation.actualCollection.toFixed(2)}
                        </Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 0 8px 0' }}>
                        <Text>Cash Drops:</Text>
                      </td>
                      <td style={{ padding: '12px 0 8px 0', textAlign: 'right' }}>
                        <Text>KES {cashReconciliation.totalDrops.toFixed(2)}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0' }}>
                        <Text>Station Wallet (Before):</Text>
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>
                        <Text>KES {cashReconciliation.walletBalance.toFixed(2)}</Text>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', borderTop: '2px solid #52c41a' }}>
                        <Text strong>New Wallet Balance:</Text>
                      </td>
                      <td style={{ padding: '8px 0', borderTop: '2px solid #52c41a', textAlign: 'right' }}>
                        <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                          KES {cashReconciliation.newWalletBalance.toFixed(2)}
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
                  <Text type="secondary" style={{ fontSize: '12px', color: '#000' }}>
                    <strong>Calculation:</strong> Actual Collection = Total Sales + Receipts - Expenses<br/>
                    <strong>New Balance:</strong> Station Wallet + Actual Collection
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Reconciliation Notes */}
          <Card 
            title="RECONCILIATION NOTES"
            style={{ marginTop: 20 }}
            bodyStyle={{ padding: '16px' }}
          >
            <Input.TextArea
              rows={3}
              placeholder="Enter reconciliation notes, variances explanation, or special circumstances..."
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              maxLength={500}
              style={{ border: '1px solid #000' }}
            />
            <Text type="secondary" style={{ fontSize: '11px', color: '#000', display: 'block', marginTop: 8 }}>
              {reconciliationNotes.length}/500 characters
            </Text>
          </Card>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: 20,
            paddingTop: 16,
            borderTop: '2px solid #000'
          }}>
            <Space>
              <Button 
                icon={<FileDown size={14} />}
                onClick={handleDownloadPDF}
                size="middle"
                type="primary"
              >
                Download PDF
              </Button>
              <Button 
                icon={<FileText size={14} />}
                onClick={handleDownloadExcel}
                size="middle"
              >
                Download Excel
              </Button>
              <Button 
                icon={<Printer size={14} />}
                onClick={handlePrint}
                size="middle"
              >
                Print Report
              </Button>
              
              <Button 
                onClick={onClose}
                icon={<X size={14} />}
                size="middle"
                disabled={submitting}
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
              style={{ fontWeight: 'bold', backgroundColor: '#1890ff' }}
              size="middle"
            >
              <Space size={4}>
                <CheckCircle size={14} />
                Submit Shift Report
              </Space>
            </Button>
          </div>

          {/* Submission Warnings */}
          {!reconciliationNotes.trim() && (
            <Alert
              message="Reconciliation Notes Required"
              description="Please add reconciliation notes before submitting the shift report."
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}

          {!shiftId && (
            <Alert
              message="Missing Shift Information"
              description="Unable to submit shift report without valid shift data."
              type="error"
              showIcon
              style={{ marginTop: 12 }}
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