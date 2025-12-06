// CollectionsModal.jsx - COMPACT & RESPONSIVE VERSION
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
  WalletOutlined,
  SafetyOutlined,
  CreditCardOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import './CollectionsModal.css';

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
  const isSmallScreen = !screens.lg;
  
  // Get actual attendant info
  const attendants = island?.attendants || [];
  const islandName = island?.islandName || 'Unknown Island';
  
  // Calculations using useMemo
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

  // Format currency
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
          className="mb-3"
        />
      );
    }

    return (
      <div className="attendant-info-compact bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <TeamOutlined className="text-gray-600 mr-2" style={{ fontSize: '14px' }} />
            <Text strong className="text-sm">Attendant{attendants.length > 1 ? 's' : ''}:</Text>
            <Badge 
              count={attendants.length} 
              size="small" 
              className="ml-2"
              style={{ backgroundColor: '#52c41a', fontSize: '10px' }}
            />
          </div>
          {attendants.some(a => a.assignmentType === 'PRIMARY') && (
            <Tag color="gold" size="small" icon={<SafetyOutlined />}>
              Primary
            </Tag>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {attendants.slice(0, 3).map((attendant) => (
            <Tag 
              key={attendant.id || attendant.attendantId}
              color={attendant.assignmentType === 'PRIMARY' ? 'green' : 'blue'}
              size="small"
              className="text-xs py-0.5"
            >
              {attendant.firstName?.charAt(0)}.{attendant.lastName}
              {attendant.assignmentType === 'PRIMARY' && ' ⭐'}
            </Tag>
          ))}
          {attendants.length > 3 && (
            <Tag size="small" className="text-xs py-0.5 bg-gray-200">
              +{attendants.length - 3} more
            </Tag>
          )}
        </div>
      </div>
    );
  };

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

  // Filter debtors
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

  // Reset form
  useEffect(() => {
    if (visible) {
      setCashAmount(0);
      setSelectedDebtor(null);
      setDebtAmount(0);
      setSearchText('');
    }
  }, [visible]);

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

    setCurrentCollections([...currentCollections, newCollection]);
    setSelectedDebtor(null);
    setDebtAmount(0);
    message.success(`Added ${formatCurrency(debtAmountNum)} debt for ${selectedDebtor.name}`);
  };

  const handleRemoveCollection = (collectionId) => {
    setCurrentCollections(currentCollections.filter(c => c.id !== collectionId));
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WalletOutlined className="mr-2 text-blue-600" />
            <Text strong className="text-base">Collections - {islandName}</Text>
          </div>
          {!isMobile && (
            <div className="flex items-center">
              <Text className="text-sm text-gray-600 mr-2">Expected:</Text>
              <Text strong className="text-blue-600">
                {formatCurrency(calculations.totalExpected)}
              </Text>
            </div>
          )}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={isMobile ? '95%' : isSmallScreen ? '90%' : 800}
      className="collections-modal"
      footer={null} // Remove default footer
      centered={isMobile}
    >
      <div className="space-y-4">
        {/* Attendant Info & Quick Stats */}
        <div className="space-y-3">
          {renderCompactAttendantInfo()}
          
          {isMobile && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <Text className="text-sm text-gray-600">Expected:</Text>
                <Text strong className="text-base text-blue-600">
                  {formatCurrency(calculations.totalExpected)}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-gray-600">Balance:</Text>
                <Text strong className={`text-base ${
                  calculations.remainingAmount === 0 ? 'text-green-600' :
                  calculations.remainingAmount > 0 ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {formatCurrency(calculations.remainingAmount)}
                </Text>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <Row gutter={[16, 16]}>
          {/* Left Column - Cash */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              className="h-full border border-gray-200"
              bodyStyle={{ padding: '16px' }}
              title={
                <div className="flex items-center">
                  <DollarOutlined className="mr-2 text-green-600" />
                  <Text strong className="text-sm">Cash Collection</Text>
                </div>
              }
            >
              <div className="space-y-3">
                <div>
                  <Text className="text-sm font-medium block mb-2">Enter Cash Amount</Text>
                  <InputNumber
                    className="w-full"
                    size={isMobile ? "middle" : "large"}
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={setCashAmount}
                    min={0}
                    step={100}
                    prefix="KES"
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/KES\s?|(,*)/g, '')}
                    precision={2}
                  />
                  <Text className="text-xs text-gray-500 mt-1 block">
                    Enter the physical cash amount collected
                  </Text>
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Text className="text-xs text-gray-600 block">Cash</Text>
                      <Text strong className="text-green-600">
                        {formatCurrency(cashAmount)}
                      </Text>
                    </div>
                    <div>
                      <Text className="text-xs text-gray-600 block">Debts</Text>
                      <Text strong className="text-orange-600">
                        {formatCurrency(calculations.totalDebtCollection)}
                      </Text>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between">
                      <Text className="text-sm">Total Collected:</Text>
                      <Text strong className="text-blue-600">
                        {formatCurrency(calculations.totalCollectedSoFar)}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          {/* Right Column - Debt Collection */}
          <Col xs={24} md={12}>
            <Card 
              size="small"
              className="h-full border border-gray-200"
              bodyStyle={{ padding: '16px' }}
              title={
                <div className="flex items-center">
                  <PlusOutlined className="mr-2 text-blue-600" />
                  <Text strong className="text-sm">Add Debt Collection</Text>
                </div>
              }
            >
              <div className="space-y-4">
                {/* Debtor Search */}
                <div className="space-y-2">
                  <Text className="text-sm font-medium">Select Debtor</Text>
                  <Input
                    placeholder="Search debtors..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    size="small"
                    className="w-full"
                  />
                  
                  <Select
                    className="w-full"
                    placeholder={loading ? "Loading debtors..." : "Select a debtor"}
                    value={selectedDebtor?.id}
                    onChange={(value) => setSelectedDebtor(availableDebtors.find(d => d.id === value))}
                    loading={loading}
                    size="small"
                    showSearch
                    filterOption={false}
                  >
                    {filteredDebtors.slice(0, 8).map(debtor => (
                      <Option key={debtor.id} value={debtor.id}>
                        <div className="py-1">
                          <div className="font-medium">{debtor.name}</div>
                          <div className="text-xs text-gray-600">
                            {debtor.code && <span>{debtor.code}</span>}
                            {debtor.phone && <span> • {debtor.phone}</span>}
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Selected Debtor */}
                {selectedDebtor && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <Text strong className="text-sm">{selectedDebtor.name}</Text>
                        {selectedDebtor.code && (
                          <Text className="text-xs text-gray-600 block">Code: {selectedDebtor.code}</Text>
                        )}
                      </div>
                      {selectedDebtor.phone && (
                        <Tag size="small" color="blue">📞 {selectedDebtor.phone}</Tag>
                      )}
                    </div>
                  </div>
                )}

                {/* Debt Amount */}
                <div className="space-y-2">
                  <Text className="text-sm font-medium">Debt Amount</Text>
                  <InputNumber
                    className="w-full"
                    size={isMobile ? "middle" : "large"}
                    placeholder="0.00"
                    value={debtAmount}
                    onChange={setDebtAmount}
                    min={0}
                    prefix="KES"
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/KES\s?|(,*)/g, '')}
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
                  size={isMobile ? "middle" : "large"}
                  className="mt-2"
                >
                  Add Debt Collection
                </Button>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Current Debt Collections */}
        {calculations.currentDebtCollections.length > 0 && (
          <Card 
            size="small"
            className="border border-gray-200"
            bodyStyle={{ padding: '16px' }}
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCardOutlined className="mr-2 text-orange-600" />
                  <Text strong className="text-sm">
                    Current Debt Collections ({calculations.currentDebtCollections.length})
                  </Text>
                </div>
                <Tag color="green" size="small">
                  Total: {formatCurrency(calculations.totalDebtCollection)}
                </Tag>
              </div>
            }
          >
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {calculations.currentDebtCollections.map((collection) => (
                <div 
                  key={collection.id} 
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <UserOutlined className="text-gray-600 mr-2" />
                    <div>
                      <Text strong className="text-sm">{collection.debtorName}</Text>
                      {collection.debtorCode && (
                        <Text className="text-xs text-gray-600 block">Code: {collection.debtorCode}</Text>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Text strong className="text-blue-600">
                      {formatCurrency(collection.amount)}
                    </Text>
                    <Tooltip title="Remove">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveCollection(collection.id)}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Status Alerts */}
        <div className="space-y-2">
          {calculations.remainingAmount > 0 && (
            <Alert
              message="Shortage Detected"
              description={
                <div className="flex items-center justify-between">
                  <span>Shortage of {formatCurrency(calculations.remainingAmount)} will be debited to attendant</span>
                  <Text strong className="text-red-600">
                    {formatCurrency(calculations.remainingAmount)}
                  </Text>
                </div>
              }
              type="warning"
              showIcon
              size="small"
              className="border border-orange-200"
            />
          )}

          {calculations.remainingAmount < 0 && (
            <Alert
              message="Overage Detected"
              description={
                <div className="flex items-center justify-between">
                  <span>Overage of {formatCurrency(Math.abs(calculations.remainingAmount))} will be added to station wallet</span>
                  <Text strong className="text-green-600">
                    {formatCurrency(Math.abs(calculations.remainingAmount))}
                  </Text>
                </div>
              }
              type="success"
              showIcon
              size="small"
              className="border border-green-200"
            />
          )}

          {calculations.remainingAmount === 0 && calculations.totalExpected > 0 && (
            <Alert
              message="Perfect Allocation"
              description="All expected amount has been fully allocated"
              type="success"
              showIcon
              size="small"
              className="border border-green-200"
            />
          )}
        </div>

        {/* Action Buttons (Inside modal body, not footer) */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {attendants.length === 0 && (
              <Alert
                message="No Attendant"
                description="Cannot save without an assigned attendant"
                type="error"
                showIcon
                size="small"
                className="w-fit"
              />
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={onCancel}
              size={isMobile ? "middle" : "large"}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveCollections}
              disabled={attendants.length === 0}
              size={isMobile ? "middle" : "large"}
              className="px-6"
            >
              Save Collections
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CollectionsModal;