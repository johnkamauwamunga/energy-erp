import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Alert,
  Row,
  Col,
  InputNumber,
  Tag,
  Divider,
  Card,
  Typography,
  message
} from 'antd';
import { 
  DollarOutlined, 
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { expenseService } from '../../../../services/expenseService/expenseService';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { useApp } from '../../../../context/AppContext';

const { Option } = Select;
const { Text } = Typography;

const CreateExpenseModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentShift, setCurrentShift] = useState(null);
  const [islands, setIslands] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [selectedAttendant, setSelectedAttendant] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const { state } = useApp();
  const userStationId = state.currentStation?.id;

  // Load current shift and data
  useEffect(() => {
    if (visible && userStationId) {
      loadCurrentShiftData();
      form.resetFields();
      setError('');
      setSelectedAttendant(null);
    }
  }, [visible, userStationId, form]);

  const loadCurrentShiftData = async () => {
    try {
      console.log("🔍 Loading current shift data for station:", userStationId);
      
      // Get current open shift
      const shiftData = await shiftService.getOpenShift(userStationId);
      console.log("✅ Current shift data:", shiftData);
      
      if (shiftData && shiftData.status === "OPEN") {
        setCurrentShift(shiftData);
        
        // Extract islands and attendants from shift data
        const shiftIslands = shiftData.shiftIslandAttendant || [];
        const uniqueIslands = [];
        const allAttendants = [];
        
        shiftIslands.forEach(item => {
          if (item.island && !uniqueIslands.find(i => i.id === item.island.id)) {
            uniqueIslands.push({
              id: item.island.id,
              name: item.island.name,
              code: item.island.code
            });
          }
          
          if (item.attendant) {
            allAttendants.push({
              id: item.attendant.id,
              firstName: item.attendant.firstName,
              lastName: item.attendant.lastName,
              email: item.attendant.email,
              islandId: item.island?.id,
              islandName: item.island?.name,
              assignmentType: item.assignmentType
            });
          }
        });
        
        setIslands(uniqueIslands);
        setAttendants(allAttendants);
        console.log("🏝️ Islands:", uniqueIslands);
        console.log("👥 Attendants:", allAttendants);
      } else {
        setCurrentShift(null);
        setIslands([]);
        setAttendants([]);
        console.log("🚫 No open shift found");
      }
    } catch (error) {
      console.error("❌ Error loading shift data:", error);
      setError('Failed to load current shift data');
      setCurrentShift(null);
      setIslands([]);
      setAttendants([]);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const expenseData = {
        title: values.title.trim(),
        description: values.description?.trim() || '',
        category: values.category,
        amount: values.amount,
        paymentSource: values.paymentSource,
        expenseDate: new Date().toISOString(),
        stationId: userStationId,
        shiftId: currentShift?.id || null,
        islandId: selectedAttendant?.islandId || values.islandId || null
      };

      // Validate data
      const validationErrors = expenseService.validateExpense(expenseData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      console.log("📦 Submitting expense:", expenseData);
      await expenseService.createExpense(expenseData);
      
      // Show success modal
      setSuccessModalVisible(true);
      
    } catch (err) {
      console.error("❌ Error creating expense:", err);
      setError(err.message || 'Failed to create expense');
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    form.resetFields();
    setSelectedAttendant(null);
    onSuccess(); // This will refresh the parent component data
    onClose(); // Close the create modal
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    setSelectedAttendant(null);
    onClose();
  };

  const handleAttendantChange = (attendantId) => {
    const attendant = attendants.find(a => a.id === attendantId);
    setSelectedAttendant(attendant);
    
    // Auto-set the island based on attendant
    if (attendant) {
      form.setFieldsValue({
        islandId: attendant.islandId
      });
    }
  };

  const handleIslandChange = (islandId) => {
    // Clear selected attendant if island changes manually
    if (selectedAttendant && selectedAttendant.islandId !== islandId) {
      setSelectedAttendant(null);
      form.setFieldsValue({
        attendantId: undefined
      });
    }
  };

  const getCategoryOptions = () => {
    return expenseService.getCategoryOptions();
  };

  const getPaymentSourceOptions = () => {
    return expenseService.getPaymentSourceOptions();
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <DollarOutlined />
            Create New Expense
          </Space>
        }
        open={visible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnClose
      >
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError('')}
          />
        )}

        {/* Current Shift Info */}
        {currentShift && (
          <Card 
            size="small" 
            style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}
            bodyStyle={{ padding: '12px' }}
          >
            <Row gutter={[8, 8]} align="middle">
              <Col>
                <ClockCircleOutlined style={{ color: '#52c41a' }} />
              </Col>
              <Col flex="auto">
                <Text strong>Active Shift: {currentShift.shiftNumber}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Supervisor: {currentShift.supervisor?.firstName} {currentShift.supervisor?.lastName}
                </Text>
              </Col>
              <Col>
                <Tag color="green">OPEN</Tag>
              </Col>
            </Row>
          </Card>
        )}

        {!currentShift && (
          <Alert
            message="No Active Shift"
            description="There is no active shift running. Expenses will be recorded without shift context."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            paymentSource: 'STATION_WALLET'
          }}
        >
          {/* Basic Information */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Expense Title"
                rules={[
                  { required: true, message: 'Please enter expense title' },
                  { min: 2, message: 'Title must be at least 2 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter expense title" 
                  prefix={<FileTextOutlined />}
                  size="large"
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[
                  { required: true, message: 'Please select category' }
                ]}
              >
                <Select 
                  placeholder="Select category" 
                  size="large"
                  showSearch
                >
                  {getCategoryOptions().map(category => (
                    <Option key={category.value} value={category.value}>
                      {category.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea 
              placeholder="Enter expense description (optional)"
              rows={3}
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* Amount & Payment */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[
                  { required: true, message: 'Please enter amount' },
                  { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
                ]}
              >
                <InputNumber
                  placeholder="0.00"
                  prefix="KES"
                  style={{ width: '100%' }}
                  size="large"
                  min={0.01}
                  step={0.01}
                  precision={2}
                  formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/KES\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="paymentSource"
                label="Payment Source"
                rules={[
                  { required: true, message: 'Please select payment source' }
                ]}
              >
                <Select 
                  placeholder="Select payment source" 
                  size="large"
                >
                  {getPaymentSourceOptions().map(source => (
                    <Option key={source.value} value={source.value}>
                      {source.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* Shift Context (Only if shift is active) */}
          {currentShift && (
            <>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                <UserOutlined /> Shift Context
              </Text>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="attendantId"
                    label="Select Attendant"
                  >
                    <Select 
                      placeholder="Choose attendant" 
                      size="large"
                      onChange={handleAttendantChange}
                      showSearch
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {attendants.map(attendant => (
                        <Option key={attendant.id} value={attendant.id}>
                          <Space>
                            {attendant.firstName} {attendant.lastName}
                            <Tag color={attendant.assignmentType === 'PRIMARY' ? 'blue' : 'default'} size="small">
                              {attendant.assignmentType}
                            </Tag>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    name="islandId"
                    label="Island"
                  >
                    <Select 
                      placeholder="Select island" 
                      size="large"
                      onChange={handleIslandChange}
                      disabled={!!selectedAttendant}
                    >
                      {islands.map(island => (
                        <Option key={island.id} value={island.id}>
                          <Space>
                            <CheckOutlined />
                            {island.name} ({island.code})
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Selected Attendant Info */}
              {selectedAttendant && (
                <Card 
                  size="small" 
                  style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}
                  bodyStyle={{ padding: '8px 12px' }}
                >
                  <Row gutter={8} align="middle">
                    <Col>
                      <UserOutlined style={{ color: '#1890ff' }} />
                    </Col>
                    <Col flex="auto">
                      <Text strong>
                        {selectedAttendant.firstName} {selectedAttendant.lastName}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Island: {selectedAttendant.islandName} • {selectedAttendant.assignmentType}
                      </Text>
                    </Col>
                  </Row>
                </Card>
              )}
            </>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleCancel}
                size="large"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<DollarOutlined />}
                size="large"
              >
                Create Expense
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={successModalVisible}
        onCancel={handleSuccessModalClose}
        footer={[
          <Button 
            key="ok" 
            type="primary" 
            onClick={handleSuccessModalClose}
            icon={<CheckCircleOutlined />}
          >
            OK
          </Button>
        ]}
        width={400}
        closable={false}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircleOutlined 
            style={{ 
              fontSize: '48px', 
              color: '#52c41a',
              marginBottom: '16px' 
            }} 
          />
          <h3 style={{ color: '#52c41a', marginBottom: '8px' }}>
            Expense Created Successfully!
          </h3>
          <p style={{ color: '#666' }}>
            The expense has been recorded and will be reflected in the expenses list.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default CreateExpenseModal;