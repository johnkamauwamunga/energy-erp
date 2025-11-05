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
  Table,
  Tag,
  Space,
  message,
  Modal,
  Form,
  InputNumber
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  CarOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import { useShiftAssets } from './hooks/useShiftAssets';
import { useApp } from '../../../../../context/AppContext';

const { Title, Text } = Typography;
const { Option } = Select;

const DebtAllocationsStep = ({ closingData, onSaveComplete }) => {
  const { state } = useApp();
  const currentStation = state.currentStation?.id;
  const [allocations, setAllocations] = useState([]);
  const [availableDebtors, setAvailableDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [debtForm] = Form.useForm();

  const {
    currentShift,
  } = useShiftAssets(currentStation);

  const shiftId = currentShift?.id;

  // Calculate total debt from all islands
  const totalCollectedDebt = Object.values(closingData.islandCollections || {}).reduce(
    (sum, island) => sum + (parseFloat(island.debtAmount) || 0), 0
  );

  // Calculate allocated amount so far
  const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.amount) || 0), 0);
  const remainingDebt = totalCollectedDebt - totalAllocated;

  // Fetch debtors from debtorService
  useEffect(() => {
    const fetchDebtors = async () => {
      setLoading(true);
      try {
        console.log("🔄 Fetching debtors for debt allocation...");
        
        const result = await debtorService.getDebtors();
        console.log("📦 Debtors response:", result);
        
        const debtorsData = result.debtors || result.data || result || [];
        console.log("👥 Processed debtors:", debtorsData);
        
        setAvailableDebtors(debtorsData);
        setFilteredDebtors(debtorsData);
        
      } catch (error) {
        console.error('❌ Failed to fetch debtors:', error);
        message.error('Failed to load debtors');
        setAvailableDebtors([]);
        setFilteredDebtors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtors();
  }, []);

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

  // Handle debtor selection - open modal with form
  const handleSelectDebtor = (debtorId) => {
    const debtor = availableDebtors.find(d => d.id === debtorId);
    if (debtor) {
      setSelectedDebtor(debtor);
      
      // Pre-fill form with remaining debt and clear previous values
      debtForm.setFieldsValue({
        amount: remainingDebt > 0 ? remainingDebt : 0,
        vehiclePlate: '',
        vehicleModel: '',
        description: `Fuel purchase - Shift ${shiftId}`
      });
      
      setShowDebtModal(true);
    }
  };

  // Handle saving debt allocation from modal
  const handleSaveDebtAllocation = async (values) => {
    if (!selectedDebtor) return;

    const allocation = {
      id: Date.now().toString(),
      debtorId: selectedDebtor.id,
      debtorName: selectedDebtor.name,
      phone: selectedDebtor.phone,
      email: selectedDebtor.email,
      amount: parseFloat(values.amount),
      vehiclePlate: values.vehiclePlate.trim().toUpperCase(),
      vehicleModel: values.vehicleModel?.trim() || '',
      description: values.description?.trim() || `Fuel purchase - Shift ${shiftId}`,
      timestamp: new Date().toISOString(),
      shiftId: shiftId,
      stationId: currentStation,
      recordedBy: state.currentUser?.id
    };

    const updatedAllocations = [...allocations, allocation];
    setAllocations(updatedAllocations);
    
    message.success(`Allocated KES ${allocation.amount} to ${selectedDebtor.name}`);
    setShowDebtModal(false);
    setSelectedDebtor(null);
    debtForm.resetFields();
  };

  const handleRemoveAllocation = (allocationId) => {
    const allocation = allocations.find(a => a.id === allocationId);
    setAllocations(prev => prev.filter(a => a.id !== allocationId));
    message.info(`Removed allocation to ${allocation?.debtorName}`);
  };

  // Save allocations and properly call onSaveComplete
// Enhanced Save allocations with individual error handling
const handleSaveAllocations = async () => {
  if (remainingDebt !== 0) {
    message.warning(`Please fully allocate all debt before saving. Remaining: KES ${remainingDebt.toFixed(0)}`);
    return;
  }

  setIsSaving(true);
  
  try {
    console.log("💾 Saving debt allocations:", allocations);
    
    // Track success and failures
    const results = {
      successful: [],
      failed: []
    };

    // Save each debt record individually with error handling
    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i];
      
      try {
        const debtRecord = {
          // Required fields for recordFuelDebt
          debtorPhone: allocation.phone,
          debtorName: allocation.debtorName,
          stationId: allocation.stationId,
          shiftId: allocation.shiftId,
          amount: allocation.amount,
          vehiclePlate: allocation.vehiclePlate,
          vehicleModel: allocation.vehicleModel || '',
          description: allocation.description || `Fuel debt from shift ${allocation.shiftId} - ${allocation.vehiclePlate}`,
          
          // Optional metadata
          transactionDate: new Date().toISOString()
        };

        console.log(`📤 Saving debt record ${i + 1}/${allocations.length}:`, debtRecord);
        
        await debtorService.recordFuelDebt(debtRecord);
        results.successful.push({
          debtor: allocation.debtorName,
          amount: allocation.amount,
          vehicle: allocation.vehiclePlate
        });
        
        console.log(`✅ Debt record ${i + 1} saved successfully`);
        
      } catch (error) {
        console.error(`❌ Failed to save debt record ${i + 1}:`, error);
        results.failed.push({
          debtor: allocation.debtorName,
          amount: allocation.amount,
          vehicle: allocation.vehiclePlate,
          error: error.message
        });
        
        // Continue with next record even if one fails
        continue;
      }
    }

    // Show summary of results
    if (results.failed.length === 0) {
      // All successful
      setIsSaved(true);
      message.success(`All ${results.successful.length} debt records saved successfully!`);
      
      console.log("✅ All debt allocations saved successfully, calling onSaveComplete");
      if (onSaveComplete) {
        onSaveComplete();
      }
      
    } else if (results.successful.length > 0) {
      // Some successful, some failed
      setIsSaved(true); // Still mark as saved since some succeeded
      message.warning(
        `${results.successful.length} debt records saved, ${results.failed.length} failed. ` +
        `Check console for details.`
      );
      
      // Log failed records for debugging
      console.warn("❌ Failed debt records:", results.failed);
      
      if (onSaveComplete) {
        onSaveComplete();
      }
      
    } else {
      // All failed
      message.error(`All ${results.failed.length} debt records failed to save. Please try again.`);
      console.error("❌ All debt records failed:", results.failed);
    }

  } catch (error) {
    console.error('Unexpected error during debt allocation save:', error);
    message.error(`Unexpected error: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};

  // Debt Allocation Modal Component
  const DebtAllocationModal = ({ visible, onCancel, onSave, debtor, form }) => {
    return (
      <Modal
        title={`Record Debt for ${debtor?.name}`}
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSave}
        >
          {/* Debtor Information */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '16px' }}>{debtor?.name}</Text>
              <Space direction="vertical" size={0}>
                {debtor?.phone && (
                  <Text type="secondary">
                    <UserOutlined /> Phone: {debtor.phone}
                  </Text>
                )}
                {debtor?.email && (
                  <Text type="secondary">
                    📧 Email: {debtor.email}
                  </Text>
                )}
                {debtor?.contactPerson && (
                  <Text type="secondary">
                    👤 Contact: {debtor.contactPerson}
                  </Text>
                )}
              </Space>
            </Space>
          </Card>

          {/* Amount */}
          <Form.Item
            name="amount"
            label="Debt Amount (KES)"
            rules={[
              { required: true, message: 'Please enter debt amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
              {
                validator: (_, value) => {
                  if (value > remainingDebt) {
                    return Promise.reject(new Error(`Amount cannot exceed remaining debt of KES ${remainingDebt.toFixed(0)}`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0.01}
              step={0.01}
              precision={2}
              size="large"
            />
          </Form.Item>

          {/* Vehicle Information */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehiclePlate"
                label="Vehicle Plate Number"
                rules={[
                  { required: true, message: 'Please enter vehicle plate number' },
                  { pattern: /^[A-Z0-9\s]+$/, message: 'Please enter a valid plate number' }
                ]}
              >
                <Input 
                  placeholder="KCA 123A" 
                  style={{ textTransform: 'uppercase' }}
                  prefix={<CarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vehicleModel"
                label="Vehicle Model (Optional)"
              >
                <Input placeholder="Toyota Hilux" />
              </Form.Item>
            </Col>
          </Row>

          {/* Description */}
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea 
              placeholder="Additional details about this debt..."
              rows={3}
            />
          </Form.Item>

          {/* Form Actions */}
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<PlusOutlined />}
              >
                Add Allocation
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  // Table columns for allocations
  const allocationColumns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_, record, index) => index + 1,
    },
    {
      title: 'Debtor',
      dataIndex: 'debtorName',
      key: 'debtorName',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            <UserOutlined /> {record.phone || 'No phone'}
          </div>
        </div>
      ),
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            <CarOutlined /> {record.vehiclePlate}
          </div>
          {record.vehicleModel && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.vehicleModel}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
          KES {amount?.toFixed(0)}
        </Text>
      ),
    },
    {
      title: 'Running Total',
      key: 'runningTotal',
      align: 'right',
      render: (_, record, index) => {
        const runningTotal = allocations.slice(0, index + 1).reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
        return (
          <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
            KES {runningTotal.toFixed(0)}
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        !isSaved && (
          <Tooltip title="Remove allocation">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveAllocation(record.id)}
              size="small"
            />
          </Tooltip>
        )
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Alert
        message="Allocate Collected Debt to Debtors"
        description="Distribute shift debt to individual debtors. This is saved separately from shift closing."
        type="info"
        showIcon
        icon={<TeamOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* Debt Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total Debt Collected"
              value={totalCollectedDebt}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix="KES"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Allocated"
              value={totalAllocated}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              prefix="KES"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Remaining"
              value={remainingDebt}
              precision={0}
              valueStyle={{ 
                color: remainingDebt === 0 ? '#52c41a' : '#f5222d' 
              }}
              prefix="KES"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* Debtor Selection */}
        {!isSaved && totalCollectedDebt > 0 && (
          <>
            <Title level={4} style={{ marginBottom: 16 }}>
              <PlusOutlined /> Select Debtor to Allocate Debt
            </Title>
            
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="Search debtors by name, phone, or email..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 16 }}
                size="large"
                disabled={loading}
              />
            </div>

            <Select
              showSearch
              placeholder={loading ? "Loading debtors..." : "Select a debtor to allocate debt..."}
              style={{ width: '100%' }}
              onChange={handleSelectDebtor}
              filterOption={false}
              onSearch={setSearchText}
              disabled={loading || remainingDebt === 0}
              loading={loading}
              size="large"
              dropdownRender={menu => (
                <div>
                  <div style={{ padding: 8 }}>
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      style={{ marginBottom: 8 }}
                      prefix={<SearchOutlined />}
                      disabled={loading}
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
                      {debtor.phone && `📞 ${debtor.phone}`}
                      {debtor.email && ` • 📧 ${debtor.email}`}
                      {debtor.contactPerson && ` • 👤 ${debtor.contactPerson}`}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>

            {remainingDebt === 0 && (
              <Alert
                message="All Debt Allocated"
                description="All collected debt has been allocated. You can proceed to save."
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </>
        )}

        {/* Allocations Table */}
        {allocations.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              <FileTextOutlined /> Debt Allocation Summary
            </Title>
            
            <Table
              columns={allocationColumns}
              dataSource={allocations.map((item, index) => ({ ...item, key: item.id, index }))}
              pagination={false}
              scroll={{ x: 800 }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row style={{ background: '#fafafa' }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>Grand Total Allocated</Text>
                      <div>
                        <Tag color="blue">
                          {allocations.length} debtors
                        </Tag>
                        <Tag color="green">
                          {totalCollectedDebt > 0 ? 
                            `${((totalAllocated / totalCollectedDebt) * 100).toFixed(1)}% of total` : 
                            '0% of total'
                          }
                        </Tag>
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} colSpan={3}>
                      <Space direction="vertical" align="end">
                        <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                          KES {totalAllocated.toFixed(0)}
                        </Text>
                        <Text type="secondary">
                          Remaining: KES {remainingDebt.toFixed(0)}
                        </Text>
                      </Space>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        )}

        {/* Save Button Section */}
        {!isSaved && totalCollectedDebt > 0 && allocations.length > 0 && (
          <div style={{ 
            marginTop: 24, 
            padding: 16, 
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff',
            borderRadius: 6
          }}>
            <Row gutter={16} align="middle">
              <Col xs={24} md={16}>
                <Space direction="vertical">
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text strong style={{ color: '#0050b3' }}>
                      Ready to Save Debt Allocations
                    </Text>
                  </Space>
                  <Text type="secondary">
                    {remainingDebt === 0 ? 
                      'All debt has been fully allocated. Save to continue.' : 
                      `You have KES ${remainingDebt.toFixed(0)} remaining to allocate before saving.`
                    }
                  </Text>
                  {remainingDebt === 0 && (
                    <Alert
                      message={`Perfect! All KES ${totalCollectedDebt.toFixed(0)} debt has been distributed across ${allocations.length} debtors.`}
                      type="success"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Space>
              </Col>
              <Col xs={24} md={8}>
                <Button
                  type="primary"
                  size="large"
                  icon={<SaveOutlined />}
                  onClick={handleSaveAllocations}
                  disabled={remainingDebt !== 0}
                  loading={isSaving}
                  style={{ 
                    backgroundColor: remainingDebt === 0 ? '#52c41a' : '#d9d9d9',
                    borderColor: remainingDebt === 0 ? '#52c41a' : '#d9d9d9',
                    width: '100%'
                  }}
                >
                  {remainingDebt === 0 ? 'Save & Continue' : 'Complete Allocation First'}
                </Button>
              </Col>
            </Row>
          </div>
        )}

        {/* Status after Saving */}
        {isSaved && (
          <Alert
            message="Debt Allocations Saved Successfully!"
            description={
              <Space direction="vertical">
                <Text>
                  Total of KES {totalCollectedDebt.toFixed(0)} has been allocated to {allocations.length} debtors. 
                </Text>
                <Text strong>
                  You will be automatically redirected to the summary step...
                </Text>
              </Space>
            }
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginTop: 24 }}
          />
        )}

        {/* No Debt Case */}
        {totalCollectedDebt === 0 && (
          <Alert
            message="No Debt Collected"
            description="No debt amounts were recorded in island collections. You can proceed to summary."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            action={
              <Button 
                type="primary" 
                icon={<ArrowRightOutlined />}
                onClick={onSaveComplete}
              >
                Continue to Summary
              </Button>
            }
          />
        )}

        {/* No Debtors Case */}
        {!loading && availableDebtors.length === 0 && totalCollectedDebt > 0 && (
          <Alert
            message="No Debtors Available"
            description="There are no debtors set up in the system. Please create debtors first before allocating debt."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Debt Allocation Modal */}
      <DebtAllocationModal
        visible={showDebtModal}
        onCancel={() => {
          setShowDebtModal(false);
          setSelectedDebtor(null);
          debtForm.resetFields();
        }}
        onSave={handleSaveDebtAllocation}
        debtor={selectedDebtor}
        form={debtForm}
      />
    </div>
  );
};

export default DebtAllocationsStep;