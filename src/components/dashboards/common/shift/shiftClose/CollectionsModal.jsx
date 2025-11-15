import React, { useState, useEffect } from 'react';
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
  Tag
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  DollarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Title, Text } = Typography;
const { Option } = Select;

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

  // Safe calculations with null checks
  const totalPumpSales = island?.totalPumpSales || 0;
  const totalActualSales = island?.totalActualSales || 0;
  const islandExpenses = island?.expenses || 0;
  const islandReceipts = island?.receipts || 0;
  
  // CORRECT CALCULATION: Expected = Pump Sales + Receipts - Expenses
  const totalExpected = totalPumpSales + islandReceipts - islandExpenses;

  // Calculate current collections
  const currentCashCollection = currentCollections
    .filter(c => c && c.type === 'cash')
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  
  const currentDebtCollections = currentCollections
    .filter(c => c && c.type === 'debt');

  const totalDebtCollection = currentDebtCollections
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  const totalCollectedSoFar = currentCashCollection + totalDebtCollection + (parseFloat(cashAmount) || 0);
  const remainingAmount = Math.max(0, totalExpected - totalCollectedSoFar);

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
    if (value === null || value === undefined || value === '') {
      setCashAmount(0);
    } else {
      setCashAmount(value);
    }
  };

  // Handle debt amount change
  const handleDebtAmountChange = (value) => {
    if (value === null || value === undefined || value === '') {
      setDebtAmount(0);
    } else {
      setDebtAmount(value);
    }
  };

  const handleAddDebtCollection = () => {
    const debtAmountNum = parseFloat(debtAmount) || 0;
    
    if (!selectedDebtor || debtAmountNum <= 0) {
      message.warning('Please select a debtor and enter valid amount');
      return;
    }

    if (debtAmountNum > remainingAmount) {
      message.warning(`Debt amount cannot exceed remaining amount of KES ${remainingAmount.toLocaleString()}`);
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
    message.success(`Added KES ${debtAmountNum.toLocaleString()} debt for ${selectedDebtor.name}`);
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
    const variance = totalExpected - totalCollected;

    const payload = {
      cashAmount: cashAmountNum,
      debtCollections: currentDebtCollections.map(debt => ({
        debtorId: debt.debtorId,
        debtorName: debt.debtorName,
        amount: parseFloat(debt.amount) || 0
      })),
      totalCollected: totalCollected,
      variance: variance,
      collections: finalCollections
    };

    if (variance !== 0) {
      Modal.confirm({
        title: 'Variance Detected',
        content: `There is a variance of KES ${Math.abs(variance).toLocaleString()}. This amount will be debited to the attendant's account. Continue?`,
        onOk: () => {
          onSave(finalCollections, variance);
          message.success('Collections saved successfully');
        }
      });
    } else {
      onSave(finalCollections, variance);
      message.success('Collections saved successfully');
    }
  };

  // Format currency display
  const formatCurrency = (amount) => {
    return `KES ${(parseFloat(amount) || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <Modal
      title={`💰 Collections - ${island?.islandName || 'Island'}`}
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          onClick={handleSaveCollections}
          icon={<SaveOutlined />}
        >
          Save Collections
        </Button>
      ]}
    >
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Expected"
              value={totalExpected}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Cash Collected"
              value={cashAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Debt Collected"
              value={totalDebtCollection}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Remaining"
              value={remainingAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ 
                color: remainingAmount === 0 ? '#52c41a' : '#fa541c' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Left Side - Cash Collection */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <DollarOutlined />
                Cash Collection
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>Enter Cash Amount:</Text>
                <InputNumber
                  style={{ 
                    width: '100%', 
                    marginTop: 8
                  }}
                  size="large"
                  placeholder="0.00"
                  value={cashAmount}
                  onChange={handleCashAmountChange}
                  min={0}
                  max={totalExpected}
                  step={100}
                  addonBefore="KES"
                  precision={2}
                />
                <Text type="secondary" style={{ fontSize: '12px', marginTop: 4 }}>
                  Enter 0 if no cash collection
                </Text>
              </div>

              <Alert
                message="Cash Collection"
                description="Cash amount goes directly to station wallet"
                type="info"
                showIcon
              />
            </Space>
          </Card>

          {/* Current Debt Collections Display */}
          {currentDebtCollections.length > 0 && (
            <Card 
              title="Current Debt Collections" 
              size="small" 
              style={{ marginTop: 16 }}
            >
              <List
                size="small"
                dataSource={currentDebtCollections}
                renderItem={(collection) => (
                  <List.Item
                    actions={[
                      <Tooltip title="Remove" key="remove">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveCollection(collection.id)}
                          size="small"
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <UserOutlined />
                          <Text strong>{collection.debtorName}</Text>
                          {collection.debtorCode && (
                            <Tag color="blue" size="small">{collection.debtorCode}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                          {formatCurrency(collection.amount)}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
              
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Tag color="blue">
                  {currentDebtCollections.length} debt entries
                </Tag>
                <Tag color="green">
                  Total Debt: {formatCurrency(totalDebtCollection)}
                </Tag>
              </div>
            </Card>
          )}
        </Col>

        {/* Right Side - Debt Collection Form */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                Add Debt Collection
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Debtor Search and Selection */}
              <div>
                <Text strong>Select Debtor:</Text>
                <Input
                  placeholder="Search debtors by name, phone, or email..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ marginTop: 8, marginBottom: 8 }}
                  size="middle"
                />
                
                <Select
                  style={{ width: '100%' }}
                  placeholder={loading ? "Loading debtors..." : "Select a debtor..."}
                  value={selectedDebtor?.id}
                  onChange={(value) => setSelectedDebtor(availableDebtors.find(d => d.id === value))}
                  loading={loading}
                  size="middle"
                  showSearch
                  filterOption={false}
                  dropdownRender={menu => (
                    <div>
                      <div style={{ padding: 8 }}>
                        <Input
                          placeholder="Search debtors..."
                          value={searchText}
                          onChange={e => setSearchText(e.target.value)}
                          style={{ marginBottom: 8 }}
                          prefix={<SearchOutlined />}
                        />
                      </div>
                      {loading ? (
                        <div style={{ padding: '16px', textAlign: 'center' }}>
                          <Text type="secondary">Loading debtors...</Text>
                        </div>
                      ) : (
                        menu
                      )}
                    </div>
                  )}
                >
                  {filteredDebtors.map(debtor => (
                    <Option key={debtor.id} value={debtor.id}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{debtor.name}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {debtor.code} • {debtor.phone || 'No phone'}
                          {debtor.contactPerson && ` • 👤 ${debtor.contactPerson}`}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Selected Debtor Info */}
              {selectedDebtor && (
                <Card size="small" style={{ backgroundColor: '#f0f8ff' }}>
                  <Space direction="vertical" size={2}>
                    <Text strong>Selected Debtor:</Text>
                    <Text>{selectedDebtor.name} ({selectedDebtor.code})</Text>
                    {selectedDebtor.phone && (
                      <Text type="secondary">📞 {selectedDebtor.phone}</Text>
                    )}
                  </Space>
                </Card>
              )}

              {/* Debt Amount Input */}
              <div>
                <Text strong>Debt Amount:</Text>
                <InputNumber
                  style={{ width: '100%', marginTop: 8 }}
                  size="large"
                  placeholder="0.00"
                  value={debtAmount}
                  onChange={handleDebtAmountChange}
                  min={0}
                  max={remainingAmount}
                  step={100}
                  addonBefore="KES"
                  precision={2}
                />
                <Text type="secondary" style={{ fontSize: '12px', marginTop: 4 }}>
                  Maximum: {formatCurrency(remainingAmount)}
                </Text>
              </div>

              {/* Add Debt Button */}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddDebtCollection}
                disabled={!selectedDebtor || !debtAmount || parseFloat(debtAmount) <= 0}
                block
                size="large"
              >
                Add Debt Collection
              </Button>
            </Space>
          </Card>

          {/* Collection Summary */}
          <Card 
            title="Collection Summary" 
            size="small" 
            style={{ marginTop: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Cash:</Text>
                <Text strong>{formatCurrency(cashAmount)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Debt Collections:</Text>
                <Text strong>{formatCurrency(totalDebtCollection)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                <Text strong>Total Collected:</Text>
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                  {formatCurrency(totalCollectedSoFar)}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Remaining:</Text>
                <Text strong style={{ color: remainingAmount === 0 ? '#52c41a' : '#fa541c' }}>
                  {formatCurrency(remainingAmount)}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Variance Warning */}
      {remainingAmount !== 0 && (
        <Alert
          message="Variance Notice"
          description={`There is a variance of KES ${Math.abs(remainingAmount).toLocaleString()}. This will be debited to the attendant's account.`}
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {/* Success Message when fully allocated */}
      {remainingAmount === 0 && totalExpected > 0 && (
        <Alert
          message="Perfect Allocation!"
          description="All expected amount has been fully allocated between cash and debt collections."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default CollectionsModal;