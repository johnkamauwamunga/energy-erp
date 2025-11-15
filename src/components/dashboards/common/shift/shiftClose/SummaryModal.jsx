// SummaryModal.jsx
import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';

import { shiftService } from '../../../../../services/shiftService/shiftService';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text } = Typography;

// Response Modal Component
const ResponseModal = ({
  visible,
  onClose,
  type, // 'success' or 'error'
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
  const [responseType, setResponseType] = useState('success'); // 'success' or 'error'

  // Safe data extraction
  const islands = islandSalesData?.islands || [];
  const overallStats = islandSalesData?.overallStats || {};
  const apiPayload = islandSalesData?.apiPayload || {};
  const shiftId = islandSalesData?.shiftId;
  const pumpReadings = islandSalesData?.pumpReadings || [];
  const tankReadings = islandSalesData?.tankReadings || [];

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

      return {
        key: index,
        islandName: island.islandName,
        attendants: island.attendants?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'No attendants',
        totalSales: island.totalActualSales || 0,
        receipts: island.receipts || 0,
        expenses: island.expenses || 0,
        cashDrops: cashAmount,
        variance: island.totalDifference || 0,
        debtCollections: debtByDebtor,
        totalExpected: island.totalExpected || 0,
        totalCollected: island.totalCollection || 0,
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

    return {
      totalCashDrops,
      totalSales,
      totalReceipts,
      totalExpenses,
      totalVariance,
      totalExpected,
      totalCollected
    };
  }, [reconciliationData]);

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

  // Pump Readings Columns
  const pumpReadingsColumns = [
    {
      title: 'PUMP',
      dataIndex: 'pumpId',
      key: 'pumpId',
      width: 120,
      render: (pumpId, record) => (
        <Space>
          <Zap size={14} color="#faad14" />
          <Text strong>{record.pumpName || pumpId?.slice(0, 8)}...</Text>
        </Space>
      ),
    },
    {
      title: 'ELECTRIC METER',
      dataIndex: 'electricMeter',
      key: 'electricMeter',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>
          {parseFloat(value || 0).toFixed(3)}
        </Text>
      ),
    },
    {
      title: 'MANUAL METER',
      dataIndex: 'manualMeter',
      key: 'manualMeter',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text style={{ color: '#52c41a' }}>
          {parseFloat(value || 0).toFixed(3)}
        </Text>
      ),
    },
    {
      title: 'CASH METER',
      dataIndex: 'cashMeter',
      key: 'cashMeter',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text style={{ color: '#fa8c16' }}>
          {parseFloat(value || 0).toFixed(3)}
        </Text>
      ),
    },
    {
      title: 'LITERS DISPENSED',
      dataIndex: 'litersDispensed',
      key: 'litersDispensed',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#722ed1' }}>
          {parseFloat(value || 0).toFixed(1)} L
        </Text>
      ),
    },
    {
      title: 'SALES VALUE',
      dataIndex: 'salesValue',
      key: 'salesValue',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#52c41a' }}>
          KES {parseFloat(value || 0).toFixed(2)}
        </Text>
      ),
    },
  ];

  // Tank Readings Columns
  const tankReadingsColumns = [
    {
      title: 'TANK',
      dataIndex: 'tankId',
      key: 'tankId',
      width: 120,
      render: (tankId, record) => (
        <Space>
          <Droplets size={14} color="#1890ff" />
          <Text strong>{record.tankName || tankId?.slice(0, 8)}...</Text>
        </Space>
      ),
    },
    {
      title: 'DIP VALUE',
      dataIndex: 'dipValue',
      key: 'dipValue',
      width: 100,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>
          {parseFloat(value || 0).toFixed(2)} m
        </Text>
      ),
    },
    {
      title: 'VOLUME',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text style={{ color: '#52c41a' }}>
          {parseFloat(value || 0).toFixed(1)} L
        </Text>
      ),
    },
    {
      title: 'TEMPERATURE',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 120,
      align: 'right',
      render: (value) => (
        <Text style={{ color: '#fa541c' }}>
          {parseFloat(value || 28.5).toFixed(1)} °C
        </Text>
      ),
    },
  ];

  // Reconciliation Table Columns
  const reconciliationColumns = [
    {
      title: 'ISLAND',
      dataIndex: 'islandName',
      key: 'islandName',
      width: 120,
      fixed: 'left',
      render: (name, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>🏝️ {name}</Text>
          {record.isComplete && (
            <Tag color="green" size="small">Complete</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'ATTENDANT(S)',
      dataIndex: 'attendants',
      key: 'attendants',
      width: 150,
      render: (attendants) => (
        <Space direction="vertical" size={2}>
          {attendants.split(', ').map((attendant, idx) => (
            <Text key={idx} style={{ fontSize: '12px' }}>
              👤 {attendant}
            </Text>
          ))}
        </Space>
      ),
    },
    {
      title: 'TOTAL SALES',
      dataIndex: 'totalSales',
      key: 'totalSales',
      width: 120,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
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
        <Text style={{ color: '#52c41a' }}>
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
        <Text style={{ color: '#fa541c' }}>
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
        <Text strong style={{ color: '#722ed1' }}>
          KES {amount?.toFixed(2) || '0.00'}
        </Text>
      ),
    },
    {
      title: 'VARIANCE',
      dataIndex: 'variance',
      key: 'variance',
      width: 140,
      align: 'right',
      render: (variance) => {
        const isPositive = variance >= 0;
        return (
          <Space>
            {isPositive ? <TrendingUp size={14} color="#52c41a" /> : <TrendingDown size={14} color="#fa541c" />}
            <Text strong style={{ color: isPositive ? '#52c41a' : '#fa541c' }}>
              KES {Math.abs(variance || 0).toFixed(2)}
            </Text>
            <Tag color={isPositive ? 'green' : 'red'} size="small">
              {isPositive ? 'Over' : 'Short'}
            </Tag>
          </Space>
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
    navigate('/');
  };

  // Handle back to sales step (for errors)
  const handleBackToSalesStep = () => {
    setResponseModalVisible(false);
    onClose();
    // This will naturally fall back since the summary modal closes
    // and the parent component (IslandSalesStep) remains open
  };

  // Download payload as JSON
  const handleDownloadPayload = () => {
    const dataStr = JSON.stringify(apiPayload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-${shiftId}-payload.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Payload downloaded successfully');
  };

  // Tabs configuration
  const tabItems = [
    {
      key: 'reconciliation',
      label: (
        <Space>
          <Calculator size={16} />
          <Text strong>Reconciliation</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <Table
            columns={reconciliationColumns}
            dataSource={reconciliationData}
            pagination={false}
            size="small"
            scroll={{ x: 1200 }}
            style={{ fontSize: '12px' }}
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>GRAND TOTALS</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong style={{ color: '#1890ff' }}>
                      KES {overallTotals.totalSales.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  
                  {debtColumns.map((column, index) => {
                    const debtorTotal = reconciliationData.reduce((sum, row) => 
                      sum + (row.debtCollections[column.title] || 0), 0
                    );
                    return (
                      <Table.Summary.Cell key={index} index={index + 2} align="right">
                        {debtorTotal > 0 && (
                          <Text strong style={{ color: '#faad14' }}>
                            KES {debtorTotal.toFixed(2)}
                          </Text>
                        )}
                      </Table.Summary.Cell>
                    );
                  })}
                  
                  <Table.Summary.Cell index={debtColumns.length + 2} align="right">
                    <Text strong style={{ color: '#52c41a' }}>
                      KES {overallTotals.totalReceipts.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={debtColumns.length + 3} align="right">
                    <Text strong style={{ color: '#fa541c' }}>
                      KES {overallTotals.totalExpenses.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={debtColumns.length + 4} align="right">
                    <Text strong style={{ color: '#722ed1' }}>
                      KES {overallTotals.totalCashDrops.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={debtColumns.length + 5} align="right">
                    <Tag color={overallTotals.totalVariance >= 0 ? 'green' : 'red'}>
                      {overallTotals.totalVariance >= 0 ? '▲' : '▼'} KES {Math.abs(overallTotals.totalVariance).toFixed(2)}
                    </Tag>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>
      )
    },
    {
      key: 'pumpReadings',
      label: (
        <Space>
          <Zap size={16} />
          <Text strong>Pumps ({pumpReadings.length})</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <Table
            columns={pumpReadingsColumns}
            dataSource={pumpReadings.map((reading, index) => ({ ...reading, key: index }))}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
            style={{ fontSize: '12px' }}
          />
        </div>
      )
    },
    {
      key: 'tankReadings',
      label: (
        <Space>
          <Droplets size={16} />
          <Text strong>Tanks ({tankReadings.length})</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <Table
            columns={tankReadingsColumns}
            dataSource={tankReadings.map((reading, index) => ({ ...reading, key: index }))}
            pagination={false}
            size="small"
            scroll={{ x: 600 }}
            style={{ fontSize: '12px' }}
          />
        </div>
      )
    },
    {
      key: 'payload',
      label: (
        <Space>
          <FileText size={16} />
          <Text strong>API Payload</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '6px',
            fontSize: '11px'
          }}>
            {JSON.stringify(apiPayload, null, 2)}
          </pre>
        </div>
      )
    }
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <FileText size={20} />
            <Title level={4} style={{ margin: 0 }}>Shift Closing Summary</Title>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width="95%"
        style={{ maxWidth: '1400px', top: 20 }}
        footer={null}
        closeIcon={<X size={18} />}
      >
        <div style={{ padding: '8px 0' }}>
          {/* Overall Statistics */}
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Islands"
                  value={islands.length}
                  valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Pumps"
                  value={pumpReadings.length}
                  valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Total Sales"
                  value={overallTotals.totalSales}
                  precision={0}
                  prefix="KES"
                  valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Cash Drops"
                  value={overallTotals.totalCashDrops}
                  precision={0}
                  prefix="KES"
                  valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Variance"
                  value={overallTotals.totalVariance}
                  precision={0}
                  prefix="KES"
                  valueStyle={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    color: overallTotals.totalVariance >= 0 ? '#52c41a' : '#fa541c' 
                  }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Expected"
                  value={overallTotals.totalExpected}
                  precision={0}
                  prefix="KES"
                  valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
                <Statistic
                  title="Collected"
                  value={overallTotals.totalCollected}
                  precision={0}
                  prefix="KES"
                  valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card 
                size="small" 
                bodyStyle={{ 
                  padding: '8px', 
                  textAlign: 'center',
                  backgroundColor: islands.length > 0 ? '#f6ffed' : '#fff7e6'
                }}
              >
                <Statistic
                  title="Status"
                  value={islands.length > 0 ? "READY" : "NO DATA"}
                  valueStyle={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    color: islands.length > 0 ? '#52c41a' : '#faad14' 
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* Tabs for All Data */}
          <Card bodyStyle={{ padding: '12px' }}>
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size="small"
            />
          </Card>

          {/* Reconciliation Notes */}
          <Card 
            title="📝 Reconciliation Notes"
            style={{ marginTop: 16 }}
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Input.TextArea
                rows={3}
                placeholder="Add any notes about the shift closing, variances, or special circumstances..."
                value={reconciliationNotes}
                onChange={(e) => setReconciliationNotes(e.target.value)}
                maxLength={500}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {reconciliationNotes.length}/500 characters
              </Text>
            </Space>
          </Card>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #f0f0f0'
          }}>
            <Space>
              <Button 
                icon={<Download size={14} />}
                onClick={handleDownloadPayload}
                size="middle"
              >
                Download Payload
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
              style={{ fontWeight: 'bold' }}
              size="middle"
            >
              <Space size={4}>
                <CheckCircle size={14} />
                Submit Shift Closing
              </Space>
            </Button>
          </div>

          {/* Submission Warnings */}
          {!reconciliationNotes.trim() && (
            <Alert
              message="Add Reconciliation Notes"
              description="Please add reconciliation notes before submitting the shift closing."
              type="warning"
              showIcon
              size="small"
              style={{ marginTop: 12 }}
            />
          )}

          {!shiftId && (
            <Alert
              message="Missing Shift ID"
              description="Unable to submit shift without a valid shift ID."
              type="error"
              showIcon
              size="small"
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