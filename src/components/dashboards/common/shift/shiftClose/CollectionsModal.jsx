// CollectionsModal.jsx - COMPLETE OPTIMIZED VERSION
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
  Statistic,
  List,
  Space,
  message,
  Modal,
  InputNumber,
  Tag,
  Avatar,
  Divider,
  Badge,
  Grid
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
  IdcardOutlined,
  WalletOutlined,
  SafetyOutlined,
  CreditCardOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import './CollectionsModal.css'; // We'll create a CSS file for custom styles

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const CollectionsModal = ({ 
  visible, 
  onCancel, 
  onSave, 
  island = {}, 
  currentCollections = [],
  setCurrentCollections
}) => {
  const [availableDebtors, setAvailableDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [debtAmount, setDebtAmount] = useState(0);
  
  // Responsive breakpoints
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg && screens.md;
  
  // Get actual attendant info from island prop
  const attendants = island?.attendants || [];
  const islandName = island?.islandName || 'Unknown Island';
  
  // Calculations using useMemo for performance
  const calculations = useMemo(() => {
    const totalPumpSales = island?.totalPumpSales || 0;
    const islandReceipts = island?.receipts || 0;
    const islandExpenses = island?.expenses || 0;
    const totalExpected = totalPumpSales + islandReceipts - islandExpenses;
    
    const currentCashCollection = currentCollections
      .filter(c => c?.type === 'cash')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    
    const currentDebtCollections = currentCollections
      .filter(c => c?.type === 'debt');
    
    const totalDebtCollection = currentDebtCollections
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    
    const currentTotal = currentCashCollection + totalDebtCollection;
    const cashNum = parseFloat(cashAmount) || 0;
    const totalCollectedSoFar = currentTotal + cashNum;
    const remainingAmount = totalExpected - totalCollectedSoFar;
    
    return {
      totalExpected,
      currentCashCollection,
      totalDebtCollection,
      totalCollectedSoFar,
      remainingAmount,
      currentDebtCollections
    };
  }, [island, currentCollections, cashAmount]);

  // Format currency display
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `KES ${num.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Compact attendant display
  const renderCompactAttendantInfo = () => {
    if (attendants.length === 0) {
      return (
        <Alert
          message="No Attendant Assigned"
          description="Assign an attendant before recording collections"
          type="warning"
          showIcon
          size="small"
          style={{ marginBottom: 12 }}
        />
      );
    }

    return (
      <div className="compact-attendant-info">
        <div className="attendant-header">
          <TeamOutlined style={{ fontSize: '14px', marginRight: 6 }} />
          <Text strong style={{ fontSize: '13px' }}>Attendant{attendants.length > 1 ? 's' : ''}:</Text>
          <Badge 
            count={attendants.length} 
            size="small" 
            style={{ 
              backgroundColor: '#52c41a',
              marginLeft: 8,
              fontSize: '10px'
            }} 
          />
        </div>
        <div className="attendant-list">
          {attendants.slice(0, 2).map((attendant, index) => (
            <Tag 
              key={attendant.id || attendant.attendantId}
              color={attendant.assignmentType === 'PRIMARY' ? 'green' : 'blue'}
              size="small"
              style={{ 
                margin: '2px 4px 2px 0',
                fontSize: '11px',
                padding: '1px 6px'
              }}
            >
              {attendant.firstName?.charAt(0)}.{attendant.lastName}
              {attendant.assignmentType === 'PRIMARY' && ' ⭐'}
            </Tag>
          ))}
          {attendants.length > 2 && (
            <Tag size="small" style={{ fontSize: '11px', padding: '1px 6px' }}>
              +{attendants.length - 2} more
            </Tag>
          )}
        </div>
      </div>
    );
  };

  // Compact statistics display
  const renderCompactStats = () => (
    <Row gutter={[8, 8]} className="compact-stats-row">
      <Col xs={12} sm={6}>
        <div className="compact-stat">
          <div className="stat-label">Expected</div>
          <div className="stat-value" style={{ color: '#1890ff' }}>
            {formatCurrency(calculations.totalExpected)}
          </div>
        </div>
      </Col>
      <Col xs={12} sm={6}>
        <div className="compact-stat">
          <div className="stat-label">Cash</div>
          <div className="stat-value" style={{ color: '#52c41a' }}>
            {formatCurrency(cashAmount)}
          </div>
        </div>
      </Col>
      <Col xs={12} sm={6}>
        <div className="compact-stat">
          <div className="stat-label">Debt</div>
          <div className="stat-value" style={{ color: '#faad14' }}>
            {formatCurrency(calculations.totalDebtCollection)}
          </div>
        </div>
      </Col>
      <Col xs={12} sm={6}>
        <div className="compact-stat">
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ 
            color: calculations.remainingAmount === 0 ? '#52c41a' : 
                   calculations.remainingAmount > 0 ? '#fa541c' : '#faad14'
          }}>
            {formatCurrency(calculations.remainingAmount)}
          </div>
        </div>
      </Col>
    </Row>
  );

  // Fetch debtors
  useEffect(() => {
    const fetchDebtors = async () => {
      if (!visible) return;
      
      setLoading(true);
      try {
        const result = await debtorService.getDebtors();
        const debtorsData = result.debtors || result.data || result || [];
        setAvailableDebtors(debtorsData);
        setFilteredDebtors(debtorsData);
      } catch (error) {
        console.error('Failed to fetch debtors:', error);
        message.error('Failed to load debtors');
        setAvailableDebtors([]);
        setFilteredDebtors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtors();
  }, [visible]);

  // Filter debtors based on search text
  useEffect(() => {
    if (searchText) {
      const filtered = availableDebtors.filter(debtor =>
        debtor.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        debtor.phone?.toLowerCase().includes(searchText.toLowerCase()) ||
        debtor.email?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredDebtors(filtered);
    } else {
      setFilteredDebtors(availableDebtors);
    }
  }, [searchText, availableDebtors]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCashAmount(0);
      setSelectedDebtor(null);
      setDebtAmount(0);
      setSearchText('');
    }
  }, [visible]);

  // Handle cash amount change
  const handleCashAmountChange = (value) => {
    setCashAmount(value || 0);
  };

  // Handle debt amount change
  const handleDebtAmountChange = (value) => {
    setDebtAmount(value || 0);
  };

  const handleAddDebtCollection = () => {
    const debtAmountNum = parseFloat(debtAmount) || 0;
    
    if (!selectedDebtor || debtAmountNum <= 0) {
      message.warning('Please select a debtor and enter valid amount');
      return;
    }

    const newCollection = {
      id: Date.now().toString(),
      type: 'debt',
      debtorId: selectedDebtor.id,
      debtorName: selectedDebtor.name,
      debtorCode: selectedDebtor.code,
      amount: debtAmountNum,
      timestamp: new Date().toISOString()
    };

    const updatedCollections = [...currentCollections, newCollection];
    setCurrentCollections(updatedCollections);
    
    setSelectedDebtor(null);
    setDebtAmount(0);
    message.success(`Added ${formatCurrency(debtAmountNum)} debt for ${selectedDebtor.name}`);
  };

  const handleRemoveCollection = (collectionId) => {
    const updatedCollections = currentCollections.filter(c => c.id !== collectionId);
    setCurrentCollections(updatedCollections);
  };

  const handleSaveCollections = () => {
    const cashAmountNum = parseFloat(cashAmount) || 0;
    
    const finalCollections = [...currentCollections];
    
    if (cashAmountNum > 0) {
      finalCollections.push({
        id: 'cash-' + Date.now(),
        type: 'cash',
        amount: cashAmountNum,
        timestamp: new Date().toISOString()
      });
    }

    const totalCollected = finalCollections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const variance = calculations.totalExpected - totalCollected;
    
    onSave(finalCollections, variance);
  };

  return (
    <Modal
      title={
        <div className="modal-header-compact">
          <WalletOutlined style={{ marginRight: 8 }} />
          <Text strong style={{ fontSize: '15px' }}>
            Collections - {islandName}
          </Text>
          {!isMobile && renderCompactAttendantInfo()}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={isMobile ? '95%' : isTablet ? '90%' : 850}
      className="collections-modal"
      footer={[
        <Button 
          key="cancel" 
          onClick={onCancel}
          size={isMobile ? "small" : "middle"}
        >
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          onClick={handleSaveCollections}
          icon={<SaveOutlined />}
          disabled={attendants.length === 0}
          size={isMobile ? "small" : "middle"}
        >
          {isMobile ? 'Save' : 'Save Collections'}
        </Button>
      ]}
    >
      {/* Mobile attendant info */}
      {isMobile && (
        <div style={{ marginBottom: 12 }}>
          {renderCompactAttendantInfo()}
        </div>
      )}
      
      {/* Compact Statistics */}
      {renderCompactStats()}

      <Row gutter={[16, 16]}>
        {/* Left Side - Cash & Current Debt Collections */}
        <Col xs={24} md={12}>
          <Card 
            size="small"
            title={
              <span className="card-title-compact">
                <DollarOutlined style={{ fontSize: '14px', marginRight: 6 }} />
                Cash
              </span>
            }
            className="compact-card"
          >
            <div className="cash-input-section">
              <InputNumber
                style={{ width: '100%' }}
                size={isMobile ? "middle" : "large"}
                placeholder="0.00"
                value={cashAmount}
                onChange={handleCashAmountChange}
                min={0}
                step={100}
                prefix="KES"
                className="compact-input-number"
                precision={2}
              />
              <Text type="secondary" className="input-hint">
                Enter cash amount collected
              </Text>
            </div>
          </Card>

          {/* Current Debt Collections Display */}
          {calculations.currentDebtCollections.length > 0 && (
            <Card 
              size="small"
              title={
                <span className="card-title-compact">
                  <CreditCardOutlined style={{ fontSize: '14px', marginRight: 6 }} />
                  Current Debt ({calculations.currentDebtCollections.length})
                </span>
              }
              className="compact-card"
              style={{ marginTop: 12 }}
            >
              <div className="debt-list-container">
                {calculations.currentDebtCollections.map((collection) => (
                  <div key={collection.id} className="debt-list-item">
                    <div className="debt-item-info">
                      <div className="debtor-name">
                        <UserOutlined style={{ fontSize: '12px', marginRight: 4 }} />
                        {collection.debtorName}
                      </div>
                      <div className="debt-amount">
                        {formatCurrency(collection.amount)}
                      </div>
                    </div>
                    <Tooltip title="Remove">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                        onClick={() => handleRemoveCollection(collection.id)}
                        className="remove-btn"
                      />
                    </Tooltip>
                  </div>
                ))}
                <div className="debt-total">
                  <Tag color="green" size="small">
                    Total: {formatCurrency(calculations.totalDebtCollection)}
                  </Tag>
                </div>
              </div>
            </Card>
          )}
        </Col>

        {/* Right Side - Add Debt Collection */}
        <Col xs={24} md={12}>
          <Card 
            size="small"
            title={
              <span className="card-title-compact">
                <PlusOutlined style={{ fontSize: '14px', marginRight: 6 }} />
                Add Debt
              </span>
            }
            className="compact-card"
          >
            <div className="debt-form">
              {/* Debtor Search */}
              <div className="form-section">
                <Text className="form-label">Select Debtor</Text>
                <Input
                  placeholder="Search debtors..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  size="small"
                  className="compact-input"
                />
                
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder={loading ? "Loading..." : "Select debtor"}
                  value={selectedDebtor?.id}
                  onChange={(value) => setSelectedDebtor(availableDebtors.find(d => d.id === value))}
                  loading={loading}
                  size="small"
                  showSearch
                  filterOption={false}
                  dropdownMatchSelectWidth={false}
                  className="compact-select"
                >
                  {filteredDebtors.slice(0, 10).map(debtor => (
                    <Option key={debtor.id} value={debtor.id}>
                      <div className="debtor-option">
                        <div className="debtor-name-option">{debtor.name}</div>
                        <div className="debtor-details">
                          {debtor.code && <span>{debtor.code}</span>}
                          {debtor.phone && <span> • 📞 {debtor.phone}</span>}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Selected Debtor Info */}
              {selectedDebtor && (
                <div className="selected-debtor-info">
                  <Tag color="blue" size="small" style={{ margin: '4px 0' }}>
                    {selectedDebtor.name}
                    {selectedDebtor.code && ` (${selectedDebtor.code})`}
                  </Tag>
                </div>
              )}

              {/* Debt Amount Input */}
              <div className="form-section">
                <Text className="form-label">Debt Amount</Text>
                <InputNumber
                  style={{ width: '100%' }}
                  size="small"
                  placeholder="0.00"
                  value={debtAmount}
                  onChange={handleDebtAmountChange}
                  min={0}
                  prefix="KES"
                  className="compact-input-number"
                  precision={2}
                />
              </div>

              {/* Add Debt Button */}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddDebtCollection}
                disabled={!selectedDebtor || !debtAmount || parseFloat(debtAmount) <= 0}
                block
                size="small"
                className="add-debt-btn"
              >
                Add Debt Collection
              </Button>
            </div>
          </Card>

          {/* Quick Summary */}
          <Card 
            size="small"
            title={
              <span className="card-title-compact">
                <CalculatorOutlined style={{ fontSize: '14px', marginRight: 6 }} />
                Summary
              </span>
            }
            className="compact-card"
            style={{ marginTop: 12 }}
          >
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Total Collected</div>
                <div className="summary-value highlight">
                  {formatCurrency(calculations.totalCollectedSoFar)}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Balance</div>
                <div className="summary-value" style={{ 
                  color: calculations.remainingAmount === 0 ? '#52c41a' : 
                         calculations.remainingAmount > 0 ? '#fa541c' : '#faad14'
                }}>
                  {formatCurrency(calculations.remainingAmount)}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Status Alerts */}
      <div className="status-alerts">
        {calculations.remainingAmount > 0 && (
          <Alert
            message="Shortage Detected"
            description={`Shortage of ${formatCurrency(calculations.remainingAmount)} will be debited to attendant's account`}
            type="warning"
            showIcon
            size="small"
            className="compact-alert"
          />
        )}

        {calculations.remainingAmount < 0 && (
          <Alert
            message="Overage Detected"
            description={`Overage of ${formatCurrency(Math.abs(calculations.remainingAmount))} will be added to station wallet`}
            type="success"
            showIcon
            size="small"
            className="compact-alert"
          />
        )}

        {calculations.remainingAmount === 0 && calculations.totalExpected > 0 && (
          <Alert
            message="Perfect Allocation!"
            description="All expected amount has been fully allocated"
            type="success"
            showIcon
            size="small"
            className="compact-alert"
          />
        )}

        {attendants.length === 0 && (
          <Alert
            message="No Attendant"
            description="Cannot save without an assigned attendant"
            type="error"
            showIcon
            size="small"
            className="compact-alert"
          />
        )}
      </div>
    </Modal>
  );
};

export default CollectionsModal;