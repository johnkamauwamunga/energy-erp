// CollectionsModal.jsx - COMPLETE REDESIGN
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Alert,
  Input,
  Select,
  Tooltip,
  Typography,
  Row,
  Col,
  List,
  Space,
  message,
  Modal,
  InputNumber,
  Tag,
  Avatar,
  Badge,
  Grid,
  Form,
  Descriptions,
  Statistic,
  Divider,
  Progress,
  Switch,
  Radio,
  Popconfirm
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  DollarOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  WalletOutlined,
  SafetyOutlined,
  CreditCardOutlined,
  CalculatorOutlined,
  ReloadOutlined,
  PercentageOutlined,
  HistoryOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ScanOutlined,
  BarcodeOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import {FileText} from 'lucide-react'
import { debtorService } from '../../../../../services/debtorService/debtorService';
import { staffAccountService } from '../../../../../services/staffAccountService/staffAccountService';
// import './CollectionsModal.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;
const { TextArea } = Input;

// ============================================================
// DEBTOR SEARCH COMPONENT
// ============================================================
const DebtorSearch = ({ 
  onSelect, 
  selectedDebtor, 
  availableDebtors, 
  loading, 
  onSearch 
}) => {
  const [searchText, setSearchText] = useState('');
  
  const filteredDebtors = useMemo(() => {
    if (!searchText) return availableDebtors.slice(0, 5);
    
    return availableDebtors.filter(debtor =>
      debtor.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      debtor.phone?.toLowerCase().includes(searchText.toLowerCase()) ||
      debtor.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      debtor.code?.toLowerCase().includes(searchText.toLowerCase())
    ).slice(0, 5);
  }, [searchText, availableDebtors]);

  return (
    <div className="debtor-search-container">
      <div className="search-header">
        <Text strong style={{ fontSize: '14px' }}>Search Debtor</Text>
        <Badge 
          count={availableDebtors.length} 
          size="small" 
          style={{ backgroundColor: '#1890ff' }}
        />
      </div>
      
      <Input
        placeholder="Search by name, phone, code..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          onSearch?.(e.target.value);
        }}
        size="middle"
        className="search-input"
        allowClear
      />
      
      {loading ? (
        <div className="loading-state">
          <Text type="secondary">Loading debtors...</Text>
        </div>
      ) : filteredDebtors.length > 0 ? (
        <div className="debtor-list">
          {filteredDebtors.map(debtor => (
            <div 
              key={debtor.id}
              className={`debtor-item ${selectedDebtor?.id === debtor.id ? 'selected' : ''}`}
              onClick={() => onSelect(debtor)}
            >
              <div className="debtor-info">
                <Avatar 
                  size="small" 
                  style={{ backgroundColor: '#1890ff' }}
                  icon={<UserOutlined />}
                />
                <div className="debtor-details">
                  <Text strong className="debtor-name">{debtor.name}</Text>
                  <div className="debtor-meta">
                    {debtor.code && <Text type="secondary" className="debtor-code">{debtor.code}</Text>}
                    {debtor.phone && <Text type="secondary" className="debtor-phone">📞 {debtor.phone}</Text>}
                  </div>
                </div>
              </div>
              {selectedDebtor?.id === debtor.id && (
                <CheckCircleOutlined className="selected-icon" />
              )}
            </div>
          ))}
        </div>
      ) : searchText ? (
        <div className="no-results">
          <Text type="secondary">No debtors found</Text>
        </div>
      ) : null}
      
      {selectedDebtor && (
        <div className="selected-debtor-display">
          <div className="selected-header">
            <Text strong>Selected Debtor</Text>
            <Button 
              type="link" 
              size="small" 
              onClick={() => onSelect(null)}
              danger
            >
              Clear
            </Button>
          </div>
          <Card size="small" className="selected-card">
            <div className="selected-content">
              <div>
                <Text strong>{selectedDebtor.name}</Text>
                <div className="debtor-tags">
                  {selectedDebtor.code && <Tag color="blue">{selectedDebtor.code}</Tag>}
                  {selectedDebtor.phone && <Tag color="green">📞 {selectedDebtor.phone}</Tag>}
                  {selectedDebtor.email && <Tag color="orange">✉️ {selectedDebtor.email}</Tag>}
                </div>
              </div>
              <div className="debtor-stats">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Credit Limit: KES {selectedDebtor.creditLimit?.toLocaleString() || '0'}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ============================================================
// COLLECTION ITEMS DISPLAY
// ============================================================
const CollectionItems = ({ collections, onRemove }) => {
  const totalCash = collections
    .filter(c => c.type === 'cash')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
    
  const totalDebt = collections
    .filter(c => c.type === 'debt')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div className="collection-items-container">
      <div className="collection-header">
        <div className="collection-stats">
          <Tag color="green" icon={<DollarOutlined />}>
            Cash: KES {totalCash.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Tag>
          <Tag color="orange" icon={<CreditCardOutlined />}>
            Debt: KES {totalDebt.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Tag>
          <Tag color="blue" icon={<CalculatorOutlined />}>
            Total: KES {(totalCash + totalDebt).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Tag>
        </div>
      </div>
      
      {collections.length === 0 ? (
        <div className="empty-collections">
          <Alert
            message="No Collections Yet"
            description="Add cash or debt collections to proceed"
            type="info"
            showIcon
          />
        </div>
      ) : (
        <div className="collections-list">
          {collections.map((collection, index) => (
            <div key={collection.id || index} className="collection-item">
              <div className="collection-type">
                {collection.type === 'cash' ? (
                  <div className="cash-collection">
                    <DollarOutlined style={{ color: '#52c41a' }} />
                    <Text strong style={{ color: '#52c41a' }}>Cash</Text>
                  </div>
                ) : (
                  <div className="debt-collection">
                    <CreditCardOutlined style={{ color: '#faad14' }} />
                    <Text strong style={{ color: '#faad14' }}>{collection.debtorName}</Text>
                    {collection.debtorCode && (
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Code: {collection.debtorCode}
                      </Text>
                    )}
                  </div>
                )}
              </div>
              
              <div className="collection-amount">
                <Text strong style={{ fontSize: '15px' }}>
                  KES {collection.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {new Date(collection.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </div>
              
              <div className="collection-actions">
                <Popconfirm
                  title="Remove Collection"
                  description="Are you sure you want to remove this collection?"
                  onConfirm={() => onRemove(collection.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// VARIANCE CALCULATOR
// ============================================================
const VarianceCalculator = ({ 
  expectedAmount, 
  totalCollected, 
  showDetails = false 
}) => {
  const variance = expectedAmount - totalCollected;
  const isShortage = variance > 0;
  const isOverage = variance < 0;
  const isBalanced = variance === 0;
  
  const variancePercentage = expectedAmount > 0 
    ? Math.abs((variance / expectedAmount) * 100).toFixed(1)
    : 0;

  return (
    <Card 
      size="small" 
      className={`variance-calculator ${isShortage ? 'shortage' : isOverage ? 'overage' : 'balanced'}`}
    >
      <div className="variance-header">
        <Text strong>Cash Reconciliation</Text>
        <Tag color={isShortage ? 'red' : isOverage ? 'orange' : 'green'}>
          {isShortage ? 'SHORTAGE' : isOverage ? 'OVERAGE' : 'BALANCED'}
        </Tag>
      </div>
      
      <Divider style={{ margin: '12px 0' }} />
      
      <div className="variance-body">
        <div className="variance-row">
          <Text>Expected Amount:</Text>
          <Text strong style={{ color: '#1890ff' }}>
            KES {expectedAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Text>
        </div>
        
        <div className="variance-row">
          <Text>Total Collected:</Text>
          <Text strong style={{ color: '#52c41a' }}>
            KES {totalCollected.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Text>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        <div className="variance-row">
          <Text strong>Variance:</Text>
          <Text 
            strong 
            style={{ 
              fontSize: '16px',
              color: isShortage ? '#ff4d4f' : isOverage ? '#fa8c16' : '#52c41a'
            }}
          >
            {isShortage ? '-' : isOverage ? '+' : ''}
            KES {Math.abs(variance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            <span style={{ fontSize: '12px', marginLeft: '4px', color: '#666' }}>
              ({variancePercentage}%)
            </span>
          </Text>
        </div>
        
        {showDetails && variance !== 0 && (
          <div className="variance-details">
            <Alert
              message={
                isShortage 
                  ? `Shortage of KES ${Math.abs(variance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
                  : `Overage of KES ${Math.abs(variance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
              }
              description={
                isShortage
                  ? "This amount will be recorded as a shortage and deducted from the attendant's account."
                  : "This amount will be added to the station wallet as overage."
              }
              type={isShortage ? 'warning' : 'success'}
              showIcon
              style={{ marginTop: '12px' }}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

// ============================================================
// MAIN COLLECTIONS MODAL
// ============================================================
const CollectionsModal = ({ 
  visible, 
  onCancel, 
  onSave, 
  island = {}, 
  currentCollections = [],
  setCurrentCollections
}) => {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // State
  const [availableDebtors, setAvailableDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [debtorLoading, setDebtorLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [showVarianceDetails, setShowVarianceDetails] = useState(true);
  
  // Extract island data
  const islandName = island?.islandName || 'Unknown Island';
  const attendants = island?.attendants || [];
  const islandId = island?.islandId;
  
  // Expected amount calculations
  const expectedAmount = useMemo(() => {
    const totalSales = island?.totalActualSales || 0;
    const receipts = island?.receipts || 0;
    const expenses = island?.expenses || 0;
    return totalSales + receipts - expenses;
  }, [island]);
  
  // Current collections calculations
  const currentTotals = useMemo(() => {
    const cash = currentCollections
      .filter(c => c?.type === 'cash')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    
    const debt = currentCollections
      .filter(c => c?.type === 'debt')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    
    return {
      cash,
      debt,
      total: cash + debt,
      variance: expectedAmount - (cash + debt),
      remaining: expectedAmount - (cash + debt)
    };
  }, [currentCollections, expectedAmount]);
  
  // Load debtors on modal open
  useEffect(() => {
    if (visible) {
      loadDebtors();
      resetForm();
    }
  }, [visible]);
  
  // Load debtors
  const loadDebtors = async () => {
    setDebtorLoading(true);
    try {
      const result = await debtorService.getDebtors();
      const debtors = result.debtors || result.data || result || [];
      setAvailableDebtors(debtors);
    } catch (error) {
      console.error('Failed to load debtors:', error);
      message.error('Failed to load debtor list');
    } finally {
      setDebtorLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setCashAmount('');
    setDebtAmount('');
    setSelectedDebtor(null);
    setNotes('');
    form.resetFields();
  };
  
  // Add cash collection
  const handleAddCash = () => {
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) {
      message.warning('Please enter a valid cash amount');
      return;
    }
    
    const newCollection = {
      id: `cash_${Date.now()}`,
      type: 'cash',
      amount: amount,
      timestamp: new Date().toISOString(),
      notes: notes || undefined
    };
    
    setCurrentCollections([...currentCollections, newCollection]);
    setCashAmount('');
    setNotes('');
    message.success(`Added KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })} cash`);
  };
  
  // Add debt collection
  const handleAddDebt = () => {
    const amount = parseFloat(debtAmount);
    
    if (!selectedDebtor) {
      message.warning('Please select a debtor');
      return;
    }
    
    if (!amount || amount <= 0) {
      message.warning('Please enter a valid debt amount');
      return;
    }
    
    // Check credit limit
    const creditLimit = selectedDebtor.creditLimit || 0;
    const currentDebt = currentCollections
      .filter(c => c.type === 'debt' && c.debtorId === selectedDebtor.id)
      .reduce((sum, c) => sum + c.amount, 0);
    
    if (creditLimit > 0 && (currentDebt + amount) > creditLimit) {
      message.error(`Debt amount exceeds credit limit of KES ${creditLimit.toLocaleString()}`);
      return;
    }
    
    const newCollection = {
      id: `debt_${Date.now()}`,
      type: 'debt',
      debtorId: selectedDebtor.id,
      debtorName: selectedDebtor.name,
      debtorCode: selectedDebtor.code,
      amount: amount,
      timestamp: new Date().toISOString(),
      notes: notes || undefined
    };
    
    setCurrentCollections([...currentCollections, newCollection]);
    setDebtAmount('');
    setSelectedDebtor(null);
    setNotes('');
    message.success(`Added KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })} debt for ${selectedDebtor.name}`);
  };
  
  // Remove collection
  const handleRemoveCollection = (collectionId) => {
    setCurrentCollections(currentCollections.filter(c => c.id !== collectionId));
    message.info('Collection removed');
  };
  
  // Save all collections
  const handleSave = () => {
    if (currentCollections.length === 0 && currentTotals.remaining > 0) {
      Modal.confirm({
        title: 'No Collections Added',
        content: 'You have not added any collections. Do you want to save anyway?',
        okText: 'Yes, Save Empty',
        cancelText: 'Go Back',
        onOk: () => {
          onSave(currentCollections, currentTotals.variance);
        }
      });
      return;
    }
    
    onSave(currentCollections, currentTotals.variance);
  };
  
  // Quick cash buttons
  const quickCashAmounts = [100, 500, 1000, 2000, 5000];
  
  return (
    <Modal
      title={
        <div className="modal-header">
          <div className="header-content">
            <div className="header-title">
              <WalletOutlined style={{ fontSize: '20px', color: '#1890ff', marginRight: '8px' }} />
              <Text strong style={{ fontSize: '18px' }}>Collections - {islandName}</Text>
            </div>
            <div className="header-subtitle">
              <Space size={8}>
                {attendants.map((attendant, idx) => (
                  <Tag 
                    key={attendant.id || idx}
                    color={idx === 0 ? 'green' : 'blue'}
                    icon={<UserOutlined />}
                    size="small"
                  >
                    {attendant.firstName?.charAt(0)}.{attendant.lastName}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={isMobile ? '95%' : 900}
      className="collections-modal"
      footer={null}
      centered
      destroyOnClose
    >
      <div className="collections-content">
        <Row gutter={[16, 16]}>
          {/* LEFT COLUMN - INPUTS */}
          <Col xs={24} md={12}>
            <div className="input-section">
              {/* Cash Collection */}
              <Card 
                title={
                  <Space>
                    <DollarOutlined style={{ color: '#52c41a' }} />
                    <Text strong>Cash Collection</Text>
                  </Space>
                }
                size="small"
                className="cash-card"
              >
                <div className="cash-input-section">
                  <div className="amount-input">
                    <InputNumber
                      className="cash-input"
                      size="large"
                      placeholder="0.00"
                      value={cashAmount}
                      onChange={setCashAmount}
                      min={0}
                      step={100}
                      prefix="KES"
                      style={{ width: '100%' }}
                      formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/KES\s?|(,*)/g, '')}
                      precision={2}
                    />
                  </div>
                  
                  {/* Quick Cash Buttons */}
                  <div className="quick-cash">
                    <Text type="secondary" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      Quick Amounts:
                    </Text>
                    <Space wrap size={[4, 4]}>
                      {quickCashAmounts.map(amount => (
                        <Button
                          key={amount}
                          size="small"
                          type="dashed"
                          onClick={() => setCashAmount(amount.toString())}
                        >
                          KES {amount.toLocaleString()}
                        </Button>
                      ))}
                    </Space>
                  </div>
                  
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddCash}
                    disabled={!cashAmount || parseFloat(cashAmount) <= 0}
                    style={{ marginTop: '12px' }}
                    block
                  >
                    Add Cash Collection
                  </Button>
                </div>
              </Card>
              
              {/* Debt Collection */}
              <Card 
                title={
                  <Space>
                    <CreditCardOutlined style={{ color: '#faad14' }} />
                    <Text strong>Debt Collection</Text>
                  </Space>
                }
                size="small"
                className="debt-card"
              >
                <div className="debt-input-section">
                  {/* Debtor Search */}
                  <DebtorSearch
                    onSelect={setSelectedDebtor}
                    selectedDebtor={selectedDebtor}
                    availableDebtors={availableDebtors}
                    loading={debtorLoading}
                  />
                  
                  {/* Debt Amount */}
                  <div className="debt-amount-input" style={{ marginTop: '12px' }}>
                    <InputNumber
                      className="debt-input"
                      size="large"
                      placeholder="0.00"
                      value={debtAmount}
                      onChange={setDebtAmount}
                      min={0}
                      step={100}
                      prefix="KES"
                      style={{ width: '100%' }}
                      formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/KES\s?|(,*)/g, '')}
                      precision={2}
                    />
                  </div>
                  
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddDebt}
                    disabled={!selectedDebtor || !debtAmount || parseFloat(debtAmount) <= 0}
                    style={{ marginTop: '12px' }}
                    block
                  >
                    Add Debt Collection
                  </Button>
                </div>
              </Card>
              
              {/* Notes */}
              <Card 
                title={
                  <Space>
                    <FileText style={{ width: '16px', color: '#1890ff' }} />
                    <Text strong>Collection Notes</Text>
                  </Space>
                }
                size="small"
              >
                <TextArea
                  placeholder="Add notes about these collections (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={200}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '4px',
                  fontSize: '11px',
                  color: '#666'
                }}>
                  <Text>{notes.length}/200 characters</Text>
                  <Text>Optional</Text>
                </div>
              </Card>
            </div>
          </Col>
          
          {/* RIGHT COLUMN - PREVIEW & SUMMARY */}
          <Col xs={24} md={12}>
            <div className="preview-section">
              {/* Variance Calculator */}
              <VarianceCalculator
                expectedAmount={expectedAmount}
                totalCollected={currentTotals.total}
                showDetails={showVarianceDetails}
              />
              
              {/* Current Collections */}
              <Card 
                title={
                  <Space>
                    <HistoryOutlined />
                    <Text strong>Current Collections</Text>
                    <Badge 
                      count={currentCollections.length} 
                      showZero 
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  </Space>
                }
                size="small"
                className="collections-preview"
              >
                <CollectionItems
                  collections={currentCollections}
                  onRemove={handleRemoveCollection}
                />
              </Card>
              
              {/* Summary Stats */}
              <Card size="small" className="summary-stats">
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="Expected"
                      value={expectedAmount}
                      precision={2}
                      prefix="KES"
                      valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Collected"
                      value={currentTotals.total}
                      precision={2}
                      prefix="KES"
                      valueStyle={{ 
                        color: currentTotals.total >= expectedAmount ? '#52c41a' : '#faad14',
                        fontSize: '16px'
                      }}
                    />
                  </Col>
                  <Col span={24}>
                    <Progress
                      percent={Math.min(100, (currentTotals.total / expectedAmount) * 100)}
                      strokeColor={{
                        '0%': '#1890ff',
                        '100%': '#52c41a',
                      }}
                      showInfo={false}
                    />
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      <Text type="secondary">Progress</Text>
                      <Text strong>
                        {((currentTotals.total / expectedAmount) * 100).toFixed(1)}%
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          </Col>
        </Row>
        
        {/* ACTION BUTTONS */}
        <div className="action-buttons">
          <div className="left-actions">
            <Button
              icon={<ReloadOutlined />}
              onClick={resetForm}
              disabled={!cashAmount && !debtAmount && !selectedDebtor && !notes}
            >
              Reset Form
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setShowVarianceDetails(!showVarianceDetails)}
            >
              {showVarianceDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
          
          <div className="right-actions">
            <Button
              onClick={onCancel}
              style={{ marginRight: '8px' }}
            >
              Cancel
            </Button>
            
            <Popconfirm
              title="Save Collections"
              description="Are you sure you want to save these collections?"
              onConfirm={handleSave}
              okText="Yes, Save"
              cancelText="Review"
            >
              <Button
                type="primary"
                icon={<SaveOutlined />}
                disabled={attendants.length === 0}
              >
                Save Collections
                {currentCollections.length > 0 && (
                  <Badge 
                    count={currentCollections.length} 
                    style={{ 
                      backgroundColor: '#52c41a',
                      marginLeft: '4px'
                    }} 
                  />
                )}
              </Button>
            </Popconfirm>
          </div>
        </div>
        
        {/* ATTENDANT WARNING */}
        {attendants.length === 0 && (
          <Alert
            message="No Attendant Assigned"
            description="You cannot save collections without an assigned attendant. Please assign an attendant first."
            type="error"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </div>
    </Modal>
  );
};

// CSS Styles
const styles = `
.collections-modal .ant-modal-body {
  padding: 20px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  flex: 1;
}

.header-title {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.header-subtitle {
  margin-top: 4px;
}

/* Debtor Search */
.debtor-search-container {
  margin-bottom: 12px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.search-input {
  margin-bottom: 8px;
}

.debtor-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.debtor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f5f5f5;
}

.debtor-item:hover {
  background-color: #f5f5f5;
}

.debtor-item.selected {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.debtor-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.debtor-details {
  flex: 1;
}

.debtor-name {
  display: block;
  font-size: 13px;
}

.debtor-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #666;
}

.selected-icon {
  color: #52c41a;
}

.selected-debtor-display {
  margin-top: 12px;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.selected-card {
  background-color: #f0f8ff;
  border: 1px solid #91d5ff;
}

.selected-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debtor-tags {
  margin-top: 4px;
}

.debtor-stats {
  text-align: right;
}

.loading-state, .no-results {
  padding: 12px;
  text-align: center;
  color: #666;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}

/* Collection Items */
.collection-items-container {
  margin-top: 12px;
}

.collection-header {
  margin-bottom: 12px;
}

.collection-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-collections {
  padding: 20px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  background-color: #fafafa;
}

.collections-list {
  max-height: 250px;
  overflow-y: auto;
}

.collection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  margin-bottom: 6px;
  background-color: #fff;
}

.collection-type {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cash-collection, .debt-collection {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collection-amount {
  text-align: right;
  margin-right: 12px;
}

.collection-actions {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.collection-item:hover .collection-actions {
  opacity: 1;
}

/* Variance Calculator */
.variance-calculator {
  margin-bottom: 16px;
}

.variance-calculator.shortage {
  border-left: 4px solid #ff4d4f;
}

.variance-calculator.overage {
  border-left: 4px solid #fa8c16;
}

.variance-calculator.balanced {
  border-left: 4px solid #52c41a;
}

.variance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.variance-body {
  padding: 4px 0;
}

.variance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.variance-details {
  margin-top: 12px;
}

/* Input Sections */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cash-card, .debt-card {
  border-color: #d9d9d9;
}

.cash-input-section, .debt-input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.amount-input {
  margin-bottom: 8px;
}

.cash-input, .debt-input {
  font-size: 16px;
  font-weight: 500;
}

.quick-cash {
  margin: 8px 0;
}

/* Preview Section */
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.collections-preview, .summary-stats {
  border-color: #d9d9d9;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.left-actions, .right-actions {
  display: flex;
  gap: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .collections-modal .ant-modal {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    top: 0 !important;
    padding: 0 !important;
    height: 100vh;
  }
  
  .collections-modal .ant-modal-body {
    padding: 16px;
    max-height: calc(100vh - 108px);
    overflow-y: auto;
  }
  
  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .left-actions, .right-actions {
    width: 100%;
  }
  
  .right-actions {
    justify-content: flex-end;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .debtor-item:hover {
    background-color: #303030;
  }
  
  .debtor-item.selected {
    background-color: #111d2c;
  }
  
  .selected-card {
    background-color: #111d2c;
    border-color: #153450;
  }
  
  .empty-collections {
    background-color: #1f1f1f;
    border-color: #303030;
  }
  
  .collection-item {
    background-color: #141414;
    border-color: #303030;
  }
}
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default CollectionsModal;