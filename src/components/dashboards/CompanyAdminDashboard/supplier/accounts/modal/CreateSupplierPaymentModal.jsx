import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Steps,
  Card,
  List,
  Tag,
  Space,
  Alert,
  Descriptions,
  Typography,
  Badge,
  Row,
  Col,
  message
} from 'antd';
import {
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
  ClockCircleOutlined,
  CalculatorOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

// Import your services
import { supplierPaymentService, paymentTransformers } from '../../../../../../services/supplierPaymentService/supplierPaymentService';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

const CreateSupplierPaymentModal = ({
  visible,
  onCancel,
  onSuccess,
  supplier,
  stationWallets = [],
  bankAccounts = [],
  paymentMethods = []
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [allocations, setAllocations] = useState([]);
  const [formData, setFormData] = useState({
    paymentAmount: null,
    paymentMethod: '',
    bankAccountId: '',
    applicationMethod: 'OLDEST_FIRST',
    description: '',
    paymentReference: '',
    stationId: ''
  });

  // Calculate payment summary
  const paymentSummary = supplierPaymentService.calculatePaymentSummary(
    formData.paymentAmount || 0, 
    allocations
  );

  // Reset everything when modal opens
  useEffect(() => {
    if (visible && supplier) {
      console.log("🔄 MODAL OPENING - Supplier:", supplier);
      console.log("📋 SUPPLIER OUTSTANDING INVOICES:", supplier.outstandingInvoices);
      form.resetFields();
      setCurrentStep(0);
      setAllocations([]);
      setFormData({
        paymentAmount: null,
        paymentMethod: '',
        bankAccountId: '',
        applicationMethod: 'OLDEST_FIRST',
        description: '',
        paymentReference: '',
        stationId: ''
      });
      
      form.setFieldsValue({
        applicationMethod: 'OLDEST_FIRST'
      });
    }
  }, [visible, supplier, form]);

  // Update form data when form values change
  const updateFormData = (changedValues) => {
    setFormData(prev => ({
      ...prev,
      ...changedValues
    }));
  };

  const handleAllocationChange = (index, field, value) => {
    console.log(`🔄 ALLOCATION CHANGE: index=${index}, field=${field}, value=${value}`);
    const newAllocations = [...allocations];
    newAllocations[index] = {
      ...newAllocations[index],
      [field]: parseFloat(value) || 0
    };
    setAllocations(newAllocations);
    console.log("📊 UPDATED ALLOCATIONS:", newAllocations);
  };

  const handleAddAllocation = (invoice) => {
    console.log("➕ ADDING ALLOCATION FOR INVOICE:", invoice);
    
    // Check if invoice already exists in allocations
    const existingIndex = allocations.findIndex(
      alloc => alloc.invoiceTransactionId === invoice.id
    );

    if (existingIndex >= 0) {
      // Update existing allocation
      const newAllocations = [...allocations];
      newAllocations[existingIndex].amount = invoice.remainingBalance;
      setAllocations(newAllocations);
      console.log("🔄 UPDATED EXISTING ALLOCATION:", newAllocations);
    } else {
      // Add new allocation
      const newAllocation = {
        invoiceTransactionId: invoice.id,
        amount: invoice.remainingBalance,
        invoiceNumber: invoice.invoiceNumber,
        remainingBalance: invoice.remainingBalance,
        dueDate: invoice.dueDate,
        isOverdue: invoice.isOverdue
      };
      
      setAllocations(prev => {
        const updated = [...prev, newAllocation];
        console.log("✅ ADDED NEW ALLOCATION. TOTAL:", updated);
        return updated;
      });
    }
  };

  const handleRemoveAllocation = (index) => {
    console.log("🗑️ REMOVING ALLOCATION AT INDEX:", index);
    const newAllocations = allocations.filter((_, i) => i !== index);
    setAllocations(newAllocations);
    console.log("📊 REMAINING ALLOCATIONS:", newAllocations);
  };

  const handleAutoAllocate = () => {
    console.log("🤖 AUTO ALLOCATING INVOICES");
    if (!supplier?.outstandingInvoices?.length) {
      message.warning('No outstanding invoices to allocate');
      return;
    }

    const paymentAmount = parseFloat(formData.paymentAmount) || 0;
    if (!paymentAmount) {
      message.error('Please enter payment amount first');
      return;
    }

    // Sort by due date (oldest first)
    const sortedInvoices = [...supplier.outstandingInvoices].sort((a, b) => 
      new Date(a.dueDate) - new Date(b.dueDate)
    );

    let remainingAmount = paymentAmount;
    const newAllocations = [];

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const amountToAllocate = Math.min(invoice.remainingBalance, remainingAmount);
      newAllocations.push({
        invoiceTransactionId: invoice.id,
        amount: amountToAllocate,
        invoiceNumber: invoice.invoiceNumber,
        remainingBalance: invoice.remainingBalance,
        dueDate: invoice.dueDate,
        isOverdue: invoice.isOverdue
      });

      remainingAmount -= amountToAllocate;
    }

    setAllocations(newAllocations);
    console.log("✅ AUTO ALLOCATION COMPLETE:", newAllocations);
    message.success(`Auto-allocated ${newAllocations.length} invoices`);
  };

  const handleValidateStep1 = async () => {
    try {
      // Get current form values
      const values = await form.validateFields();
      console.log("✅ STEP 1 FORM VALUES:", values);
      
      // Update form data
      updateFormData(values);

      const paymentAmount = parseFloat(values.paymentAmount);
      if (!paymentAmount || paymentAmount <= 0) {
        throw new Error('Please enter a valid payment amount');
      }

      if (values.paymentMethod === 'BANK_TRANSFER' && !values.bankAccountId) {
        throw new Error('Please select a bank account');
      }

      console.log("✅ STEP 1 VALIDATION PASSED - Form Data:", formData);
      console.log("📊 CURRENT ALLOCATIONS:", allocations);
      setCurrentStep(1);
    } catch (error) {
      console.error("❌ STEP 1 VALIDATION FAILED:", error);
      message.error(error.message || 'Please fill all required fields correctly');
    }
  };

  // SINGLE buildPaymentPayload function
// FIXED buildPaymentPayload function
const buildPaymentPayload = () => {
  console.log("🛠️ BUILDING PAYLOAD FROM FORM DATA:", formData);
  console.log("📊 CURRENT ALLOCATIONS FOR PAYLOAD:", allocations);
  console.log("🔑 SUPPLIER ID:", supplier?.id); // Debug supplier ID
  
  // Use supplier.id instead of supplierAccountId from formData
  const payload = {
    supplierAccountId: supplier?.id, // ✅ FIX: Use supplier.id directly
    paymentAmount: parseFloat(formData.paymentAmount),
    paymentMethod: formData.paymentMethod,
    applicationMethod: formData.applicationMethod || 'OLDEST_FIRST',
    allocations: allocations.map(alloc => ({
      invoiceTransactionId: alloc.invoiceTransactionId,
      amount: parseFloat(alloc.amount)
    })),
    description: formData.description || '',
    paymentReference: formData.paymentReference || ''
  };

  // Add payment method specific fields
  if (formData.paymentMethod === 'CASH') {
    payload.stationId = formData.stationId;
    if (formData.shiftId) {
      payload.shiftId = formData.shiftId;
    }
  } else if (formData.paymentMethod === 'BANK_TRANSFER') {
    payload.bankAccountId = formData.bankAccountId;
  }

  console.log("📦 FINAL PAYLOAD READY:", payload);
  console.log("📋 PAYLOAD BREAKDOWN:");
  console.log("  - supplierAccountId:", payload.supplierAccountId); // Should now show the correct ID
  console.log("  - paymentAmount:", payload.paymentAmount);
  console.log("  - paymentMethod:", payload.paymentMethod);
  console.log("  - bankAccountId:", payload.bankAccountId);
  console.log("  - stationId:", payload.stationId);
  console.log("  - allocations count:", payload.allocations.length);
  console.log("  - allocations:", payload.allocations);

  return payload;
};

  // SINGLE handlePaymentSubmit function
const handlePaymentSubmit = async () => {
  console.log("🎯 SUBMIT BUTTON CLICKED - Starting payment submission");
  setLoading(true);

  try {
    console.log("📝 STEP 1: Validating form fields...");
    // Get final form values
    const finalValues = await form.validateFields();
    console.log("✅ FORM VALIDATION PASSED:", finalValues);
    
    updateFormData(finalValues);

    console.log("🎯 FINAL FORM DATA:", formData);
    console.log("📊 FINAL ALLOCATIONS:", allocations);
    console.log("🔑 SUPPLIER ID:", supplier?.id);

    // Build the payload using transformer
    console.log("🛠️ STEP 2: Building payment payload...");
    const paymentPayload = buildPaymentPayload();
    console.log("📦 PAYLOAD BUILT:", paymentPayload);

    // ✅ CRITICAL CHECK: Verify supplierAccountId is set
    if (!paymentPayload.supplierAccountId) {
      throw new Error('Supplier account ID is missing. Please refresh and try again.');
    }

    console.log("✅ STEP 3: All critical validations passed");

    console.log("🚀 STEP 4: Calling API service...");
    
    // Call the appropriate service based on payment method
    let result;
    if (paymentPayload.paymentMethod === 'CASH') {
      console.log("💵 PROCESSING CASH PAYMENT...");
      result = await supplierPaymentService.processCashPayment(paymentPayload);
    } else if (paymentPayload.paymentMethod === 'BANK_TRANSFER') {
      console.log("🏦 PROCESSING BANK PAYMENT...");
      result = await supplierPaymentService.processBankPayment(paymentPayload);
    } else {
      throw new Error(`Unsupported payment method: ${paymentPayload.paymentMethod}`);
    }

    console.log("✅ STEP 5: API CALL SUCCESS:", result);

    // Transform response for UI
    const transformedResponse = paymentTransformers.transformPaymentResponse(result);

    if (transformedResponse.success) {
      const successMessage = `Payment processed successfully! Reference: ${transformedResponse.data?.transferNumber}`;
      
      // Add credit balance info if overpayment occurred
      if (transformedResponse.data.hasCredit) {
        message.success(
          `${successMessage} Credit balance: ${transformedResponse.data.formattedCreditBalance}`
        );
      } else {
        message.success(successMessage);
      }
      
      console.log("✅ STEP 6: Calling onSuccess callback...");
      onSuccess(transformedResponse);
      onCancel();
    } else {
      throw new Error(transformedResponse.message || 'Payment processing failed');
    }

  } catch (error) {
    console.error("💥 PAYMENT ERROR:", error);
    console.error("💥 ERROR DETAILS:", {
      message: error.message,
      response: error.response,
      stack: error.stack
    });
    
    // Handle specific error types
    if (error.response?.data?.errors) {
      // Zod validation errors from backend
      const validationErrors = error.response.data.errors;
      validationErrors.forEach(err => {
        message.error(`${err.field}: ${err.message}`);
      });
    } else if (error.response?.data?.message) {
      // Backend error message
      message.error(error.response.data.message);
    } else {
      // Generic error
      message.error(error.message || 'Failed to process payment');
    }
  } finally {
    console.log("🏁 STEP 7: Submission process completed");
    setLoading(false);
  }
};

  const formatCurrency = (amount) => {
    return paymentTransformers.formatCurrency(amount);
  };

  const formatDate = (date) => {
    return paymentTransformers.formatDate(date);
  };

  // Step 1: Payment Details
  const renderStep1 = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="paymentAmount"
            label="Payment Amount"
            rules={[
              { required: true, message: 'Please enter payment amount' },
              {
                validator: (_, value) => {
                  const numValue = parseFloat(value);
                  if (isNaN(numValue) || numValue <= 0) {
                    return Promise.reject('Amount must be greater than 0');
                  }
                  if (supplier && numValue > supplier.currentBalance) {
                    return Promise.reject(
                      `Amount exceeds current balance of ${formatCurrency(supplier.currentBalance)}`
                    );
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter amount"
              size="large"
              min={1}
              max={supplier?.currentBalance || 100000000}
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
              onChange={(value) => updateFormData({ paymentAmount: value })}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select 
              placeholder="Select payment method" 
              size="large"
              onChange={(value) => updateFormData({ paymentMethod: value })}
            >
              {paymentMethods.map(method => (
                <Option key={method.id} value={method.id}>
                  <Space>
                    {method.id === 'CASH' ? <WalletOutlined /> : <BankOutlined />}
                    {method.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Bank Account Selection - Only show for BANK_TRANSFER */}
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => 
          prevValues.paymentMethod !== currentValues.paymentMethod
        }
      >
        {({ getFieldValue }) => {
          const paymentMethod = getFieldValue('paymentMethod');
          
          if (paymentMethod === 'BANK_TRANSFER') {
            return (
              <Form.Item
                name="bankAccountId"
                label="Bank Account"
                rules={[{ required: true, message: 'Please select bank account' }]}
              >
                <Select 
                  placeholder="Select bank account" 
                  size="large"
                  onChange={(value) => updateFormData({ bankAccountId: value })}
                >
                  {bankAccounts.map(account => (
                    <Option key={account.id} value={account.id}>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <div>
                          <BankOutlined /> 
                          <strong>{account.bankName}</strong> - {account.accountNumber}
                        </div>
                        <div>
                          <Text type="secondary">
                            Balance: {formatCurrency(account.currentBalance)}
                          </Text>
                        </div>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            );
          } else if (paymentMethod === 'CASH') {
            return (
              <Form.Item
                name="stationId"
                label="Station Wallet"
                rules={[{ required: true, message: 'Please select station wallet' }]}
              >
                <Select 
                  placeholder="Select station wallet" 
                  size="large"
                  onChange={(value) => updateFormData({ stationId: value })}
                >
                  {stationWallets.map(wallet => (
                    <Option key={wallet.id} value={wallet.stationId}>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <div>
                          <WalletOutlined /> 
                          <strong>{wallet.stationName}</strong>
                        </div>
                        <div>
                          <Text type="secondary">
                            Balance: {formatCurrency(wallet.currentBalance)}
                          </Text>
                        </div>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            );
          }

          return null;
        }}
      </Form.Item>

      {/* Allocation Method */}
      <Form.Item
        name="applicationMethod"
        label="Allocation Method"
      >
        <Select 
          placeholder="Select allocation method" 
          size="large"
          onChange={(value) => updateFormData({ applicationMethod: value })}
        >
          <Option value="OLDEST_FIRST">Oldest Invoices First</Option>
          <Option value="MANUAL_ALLOCATION">Manual Allocation</Option>
        </Select>
      </Form.Item>

      {/* Outstanding Invoices Section */}
      {supplier?.outstandingInvoices?.length > 0 && (
        <Card 
          title={
            <Space>
              <FileTextOutlined />
              Outstanding Invoices ({supplier.outstandingInvoices.length})
              <Button 
                type="link" 
                size="small" 
                onClick={handleAutoAllocate}
                icon={<CalculatorOutlined />}
              >
                Auto Allocate
              </Button>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Text strong>
              Total: {formatCurrency(supplier.totalOutstanding)}
            </Text>
          }
        >
          <List
            size="small"
            dataSource={supplier.outstandingInvoices}
            renderItem={(invoice, index) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleAddAllocation(invoice)}
                    disabled={allocations.some(alloc => alloc.invoiceTransactionId === invoice.id)}
                  >
                    {allocations.some(alloc => alloc.invoiceTransactionId === invoice.id) 
                      ? 'Added' 
                      : 'Add to Payment'
                    }
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Badge
                      count={index + 1}
                      style={{ backgroundColor: invoice.isOverdue ? '#ff4d4f' : '#1890ff' }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{invoice.invoiceNumber}</Text>
                      {invoice.isOverdue && <Tag color="red">OVERDUE</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text>Remaining: {formatCurrency(invoice.remainingBalance)}</Text>
                      <Text type="secondary">Due: {formatDate(invoice.dueDate)}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Current Allocations Section */}
      <Card 
        title={`Payment Allocations (${allocations.length})`} 
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          allocations.length > 0 && (
            <Button 
              size="small" 
              danger 
              onClick={() => setAllocations([])}
            >
              Clear All
            </Button>
          )
        }
      >
        {allocations.length > 0 ? (
          <List
            size="small"
            dataSource={allocations}
            renderItem={(allocation, index) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleRemoveAllocation(index)}
                  >
                    Remove
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{allocation.invoiceNumber}</Text>
                      {allocation.isOverdue && <Tag color="red">OVERDUE</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <InputNumber
                        size="small"
                        value={allocation.amount}
                        onChange={(value) => handleAllocationChange(index, 'amount', value)}
                        min={1}
                        max={allocation.remainingBalance}
                        formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/KES\s?|(,*)/g, '')}
                        style={{ width: 150 }}
                      />
                      <Text type="secondary">
                        Remaining: {formatCurrency(allocation.remainingBalance)} | 
                        Due: {formatDate(allocation.dueDate)}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Alert
            message="No Allocations"
            description="Click 'Add to Payment' on invoices above to allocate payment amounts"
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* Payment Summary */}
      {allocations.length > 0 && (
        <Alert
          message="Payment Summary"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>Total Allocated: <Text strong>{formatCurrency(paymentSummary.totalAllocated)}</Text></Text>
              {paymentSummary.isOverpayment && (
                <Text type="warning">
                  Credit Balance: {formatCurrency(paymentSummary.creditBalance)} 
                  (This will be available for future payments)
                </Text>
              )}
              {!paymentSummary.isValid && (
                <Text type="danger">
                  Warning: Total allocated amount exceeds payment amount!
                </Text>
              )}
            </Space>
          }
          type={paymentSummary.isValid ? "info" : "warning"}
          showIcon
        />
      )}

      {/* Debug buttons */}
      <Space style={{ marginTop: 16 }}>
        <Button 
          type="dashed" 
          onClick={() => {
            console.log("🔍 CURRENT FORM DATA (Step 1):", formData);
            console.log("🔍 CURRENT FORM VALUES:", form.getFieldsValue());
          }}
        >
          Debug Form Data
        </Button>
        <Button 
          type="dashed" 
          onClick={() => {
            console.log("📊 CURRENT ALLOCATIONS:", allocations);
          }}
        >
          Debug Allocations
        </Button>
      </Space>
    </div>
  );

  // Step 2: Review & Confirm
  const renderStep2 = () => (
    <div>
      {/* Overpayment Alert */}
      {paymentSummary.isOverpayment && (
        <Alert
          message={`Overpayment Detected: ${formatCurrency(paymentSummary.creditBalance)}`}
          description="This amount will be available as credit for future payments"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="Payment Confirmation" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Supplier">
            <Text strong>{supplier?.supplierName}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Amount">
            <Text strong style={{ color: '#1890ff', fontSize: '18px' }}>
              {formatCurrency(formData.paymentAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            <Tag color="blue">
              {formData.paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'}
            </Tag>
          </Descriptions.Item>
          {formData.paymentMethod === 'BANK_TRANSFER' && (
            <Descriptions.Item label="Bank Account">
              <Text>
                {bankAccounts.find(b => b.id === formData.bankAccountId)?.bankName} - 
                {bankAccounts.find(b => b.id === formData.bankAccountId)?.accountNumber}
              </Text>
            </Descriptions.Item>
          )}
          {formData.paymentMethod === 'CASH' && (
            <Descriptions.Item label="Station Wallet">
              <Text>
                {stationWallets.find(w => w.stationId === formData.stationId)?.stationName}
              </Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Total Allocated">
            <Text strong>
              {formatCurrency(paymentSummary.totalAllocated)}
            </Text>
          </Descriptions.Item>
          {paymentSummary.isOverpayment && (
            <Descriptions.Item label="Credit Balance">
              <Text strong type="warning">
                {formatCurrency(paymentSummary.creditBalance)}
              </Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Allocations">
            {allocations.length > 0 ? (
              <List
                size="small"
                dataSource={allocations}
                renderItem={allocation => (
                  <List.Item>
                    <Text>{allocation.invoiceNumber}</Text>
                    <Text strong>{formatCurrency(allocation.amount)}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="danger">No allocations - please go back and add invoices</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Form.Item 
        name="description" 
        label="Description"
      >
        <TextArea 
          placeholder="Payment description" 
          rows={2}
          onChange={(e) => updateFormData({ description: e.target.value })}
        />
      </Form.Item>

      <Form.Item 
        name="paymentReference" 
        label="Reference"
      >
        <Input 
          placeholder="Payment reference" 
          onChange={(e) => updateFormData({ paymentReference: e.target.value })}
        />
      </Form.Item>

      <Button 
        type="dashed" 
        onClick={() => {
          const payload = buildPaymentPayload();
          console.log("🔍 DEBUG PAYLOAD (Step 2):", payload);
        }}
      >
        Debug Payload
      </Button>
    </div>
  );

  const steps = [
    { title: 'Payment Details', content: renderStep1() },
    { title: 'Review & Confirm', content: renderStep2() }
  ];

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          Make Payment to {supplier?.supplierName}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="back" onClick={() => currentStep > 0 ? setCurrentStep(0) : onCancel()}>
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>,
        currentStep === 0 ? (
          <Button 
            key="validate" 
            type="primary" 
            onClick={handleValidateStep1}
            icon={<SafetyCertificateOutlined />}
            disabled={allocations.length === 0}
          >
            Validate & Continue
          </Button>
        ) : (
          <Button 
            key="submit" 
            type="primary" 
            loading={loading}
            onClick={handlePaymentSubmit}
            icon={<CheckCircleOutlined />}
            disabled={allocations.length === 0}
          >
            Confirm Payment
          </Button>
        )
      ]}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} />
        ))}
      </Steps>

      <Form 
        form={form} 
        layout="vertical"
        onValuesChange={updateFormData}
      >
        {steps[currentStep].content}
      </Form>
    </Modal>
  );
};

export default CreateSupplierPaymentModal;