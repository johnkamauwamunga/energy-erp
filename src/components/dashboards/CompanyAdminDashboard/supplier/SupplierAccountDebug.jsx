// src/components/debug/SupplierAccountDebug.jsx
import React, { useState } from 'react';
import {
  Card,
  Button,
  Alert,
  Steps,
  Space,
  Spin,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Divider,
  Collapse,
  Descriptions,
  Progress,
  Tabs,
  message,
  Modal
} from 'antd';
import {
  PlayCircleOutlined,
  BugOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  DollarCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  EyeOutlined,
  DownloadOutlined,
  CodeOutlined,
  RocketOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// Import our service - adjust path as needed
import { supplierAccountService } from '../../../../services/supplierAccountService/supplierAccountService';

const SupplierAccountDebug = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  // Test data state
  const [formData, setFormData] = useState({
    purchaseInvoice: supplierAccountService.generateTestPurchaseInvoice(),
    supplierPayment: supplierAccountService.generateTestSupplierPayment(),
    adjustment: supplierAccountService.generateTestAdjustment(),
    filters: supplierAccountService.generateTestFilters(),
    searchTerm: 'Vivo',
    supplierId: '2843e4a0-7e13-4297-bc57-c4f793191bd5',
    supplierName: 'Vivo'
  });

  const steps = [
    {
      title: 'Overview',
      icon: <EyeOutlined />
    },
    {
      title: 'Record Transactions',
      icon: <FileTextOutlined />
    },
    {
      title: 'Data Retrieval',
      icon: <DatabaseOutlined />
    },
    {
      title: 'Reports & Analytics',
      icon: <BarChartOutlined />
    },
    {
      title: 'Search & Utilities',
      icon: <SearchOutlined />
    }
  ];

  // Test execution function
  const runTest = async (testName, testFunction, params = []) => {
    setLoading(true);
    setErrors(prev => ({ ...prev, [testName]: null }));
    
    try {
      console.log(`🧪 Running test: ${testName}`, params);
      const result = await testFunction(...params);
      setResults(prev => ({ ...prev, [testName]: result }));
      message.success(`✅ ${testName} completed successfully!`);
      return result;
    } catch (error) {
      console.error(`❌ Test ${testName} failed:`, error);
      setErrors(prev => ({ ...prev, [testName]: error.message }));
      message.error(`❌ ${testName} failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Test Suites
  const testSuites = {
    // Transaction Recording Tests
    recordPurchaseInvoice: () => runTest(
      'recordPurchaseInvoice', 
      supplierAccountService.recordPurchaseInvoice, 
      [formData.purchaseInvoice]
    ),
    
    recordSupplierPayment: () => runTest(
      'recordSupplierPayment',
      supplierAccountService.recordSupplierPayment,
      [formData.supplierPayment]
    ),
    
    recordAdjustment: () => runTest(
      'recordAdjustment',
      supplierAccountService.recordAdjustment,
      [formData.adjustment]
    ),

    // Data Retrieval Tests
    getSupplierTransactions: () => runTest(
      'getSupplierTransactions',
      supplierAccountService.getSupplierTransactions,
      [formData.filters]
    ),

    getSupplierAccount: () => runTest(
      'getSupplierAccount',
      supplierAccountService.getSupplierAccount,
      [formData.supplierId]
    ),

    getSupplierBalances: () => runTest(
      'getSupplierBalances',
      supplierAccountService.getSupplierBalances,
      [formData.filters]
    ),

    getTransactionsBySupplierName: () => runTest(
      'getTransactionsBySupplierName',
      supplierAccountService.getTransactionsBySupplierName,
      [formData.supplierName, formData.filters]
    ),

    // Reports Tests
    getBalanceSheet: () => runTest(
      'getBalanceSheet',
      supplierAccountService.getBalanceSheet,
      [formData.filters]
    ),

    getSupplierStatistics: () => runTest(
      'getSupplierStatistics',
      supplierAccountService.getSupplierStatistics,
      []
    ),

    getSupplierAgingReport: () => runTest(
      'getSupplierAgingReport',
      supplierAccountService.getSupplierAgingReport,
      [formData.filters]
    ),

    // Search Tests
    searchSuppliers: () => runTest(
      'searchSuppliers',
      supplierAccountService.searchSuppliers,
      [formData.searchTerm]
    )
  };

  // Run all tests
  const runAllTests = async () => {
    setLoading(true);
    const testResults = {};
    const testErrors = {};

    for (const [testName, testFunction] of Object.entries(testSuites)) {
      try {
        const result = await testFunction();
        testResults[testName] = result;
      } catch (error) {
        testErrors[testName] = error.message;
      }
    }

    setResults(testResults);
    setErrors(testErrors);
    setLoading(false);

    const successCount = Object.keys(testResults).length;
    const totalTests = Object.keys(testSuites).length;
    
    if (successCount === totalTests) {
      message.success(`🎉 All ${totalTests} tests passed successfully!`);
    } else {
      message.warning(`⚠️ ${successCount}/${totalTests} tests passed. Check errors.`);
    }
  };

  // Update form data
  const updateFormData = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Results display components
  const ResultDisplay = ({ result, error, title }) => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin size="large" />
          <div>Testing {title}...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message={`${title} Failed`}
          description={error}
          type="error"
          showIcon
        />
      );
    }

    if (!result) {
      return (
        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
          No test run for {title}
        </div>
      );
    }

    return (
      <Collapse size="small">
        <Panel header={`✅ ${title} - Success`} key="1">
          <pre style={{ fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      </Collapse>
    );
  };

  // Step 1: Overview
  const OverviewStep = () => (
    <Card>
      <Alert
        message="Supplier Account Service Debug Dashboard"
        description="This dashboard tests all supplier account endpoints. Use the steps below to test individual functionalities or run all tests at once."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Total Endpoints"
              value={Object.keys(testSuites).length}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Tests Completed"
              value={Object.keys(results).length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Tests Failed"
              value={Object.keys(errors).length}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={4}>Quick Actions</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          icon={<RocketOutlined />}
          onClick={runAllTests}
          loading={loading}
          size="large"
          block
        >
          Run All Tests
        </Button>
        
        <Button 
          icon={<BugOutlined />}
          onClick={() => {
            setResults({});
            setErrors({});
            message.info('Test results cleared');
          }}
          block
        >
          Clear Results
        </Button>
      </Space>

      <Divider />

      <Title level={4}>Test Summary</Title>
      <Collapse>
        <Panel header="Available Test Endpoints" key="endpoints">
          <Descriptions column={1} size="small">
            {Object.keys(testSuites).map(endpoint => (
              <Descriptions.Item key={endpoint} label={endpoint}>
                <Tag color={results[endpoint] ? 'green' : errors[endpoint] ? 'red' : 'blue'}>
                  {results[endpoint] ? '✅ Passed' : errors[endpoint] ? '❌ Failed' : '⏳ Not Run'}
                </Tag>
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Panel>
      </Collapse>
    </Card>
  );

  // Step 2: Record Transactions
  const RecordTransactionsStep = () => (
    <Card>
      <Title level={4}>Transaction Recording Tests</Title>
      <Paragraph>
        Test creating purchase invoices, supplier payments, and adjustments.
      </Paragraph>

      <Tabs type="card">
        <TabPane tab="Purchase Invoice" key="purchase-invoice">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Supplier ID">
                  <Input
                    value={formData.purchaseInvoice.supplierId}
                    onChange={(e) => updateFormData('purchaseInvoice', 'supplierId', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Purchase ID">
                  <Input
                    value={formData.purchaseInvoice.purchaseId}
                    onChange={(e) => updateFormData('purchaseInvoice', 'purchaseId', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Amount">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={formData.purchaseInvoice.amount}
                    onChange={(value) => updateFormData('purchaseInvoice', 'amount', value)}
                    min={0.01}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Due Date">
                  <DatePicker
                    style={{ width: '100%' }}
                    onChange={(date) => updateFormData('purchaseInvoice', 'dueDate', date?.toISOString())}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Description">
              <Input.TextArea
                value={formData.purchaseInvoice.description}
                onChange={(e) => updateFormData('purchaseInvoice', 'description', e.target.value)}
                rows={3}
              />
            </Form.Item>

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={testSuites.recordPurchaseInvoice}
              loading={loading}
            >
              Test Record Purchase Invoice
            </Button>
          </Form>

          <Divider />
          <ResultDisplay
            result={results.recordPurchaseInvoice}
            error={errors.recordPurchaseInvoice}
            title="Record Purchase Invoice"
          />
        </TabPane>

        <TabPane tab="Supplier Payment" key="supplier-payment">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Supplier ID">
                  <Input
                    value={formData.supplierPayment.supplierId}
                    onChange={(e) => updateFormData('supplierPayment', 'supplierId', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Amount">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={formData.supplierPayment.amount}
                    onChange={(value) => updateFormData('supplierPayment', 'amount', value)}
                    min={0.01}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Payment Method">
                  <Select
                    value={formData.supplierPayment.paymentMethod}
                    onChange={(value) => updateFormData('supplierPayment', 'paymentMethod', value)}
                  >
                    <Option value="CASH">Cash</Option>
                    <Option value="MOBILE_MONEY">Mobile Money</Option>
                    <Option value="BANK_TRANSFER">Bank Transfer</Option>
                    <Option value="CHEQUE">Cheque</Option>
                    <Option value="OTHER">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Reference Number">
                  <Input
                    value={formData.supplierPayment.referenceNumber}
                    onChange={(e) => updateFormData('supplierPayment', 'referenceNumber', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={testSuites.recordSupplierPayment}
              loading={loading}
            >
              Test Record Supplier Payment
            </Button>
          </Form>

          <Divider />
          <ResultDisplay
            result={results.recordSupplierPayment}
            error={errors.recordSupplierPayment}
            title="Record Supplier Payment"
          />
        </TabPane>

        <TabPane tab="Adjustment" key="adjustment">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Supplier ID">
                  <Input
                    value={formData.adjustment.supplierId}
                    onChange={(e) => updateFormData('adjustment', 'supplierId', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Adjustment Type">
                  <Select
                    value={formData.adjustment.type}
                    onChange={(value) => updateFormData('adjustment', 'type', value)}
                  >
                    <Option value="CREDIT_NOTE">Credit Note</Option>
                    <Option value="DEBIT_NOTE">Debit Note</Option>
                    <Option value="ADJUSTMENT">Adjustment</Option>
                    <Option value="WRITE_OFF">Write Off</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Amount">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={formData.adjustment.amount}
                    onChange={(value) => updateFormData('adjustment', 'amount', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Reason">
                  <Input
                    value={formData.adjustment.reason}
                    onChange={(e) => updateFormData('adjustment', 'reason', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={testSuites.recordAdjustment}
              loading={loading}
            >
              Test Record Adjustment
            </Button>
          </Form>

          <Divider />
          <ResultDisplay
            result={results.recordAdjustment}
            error={errors.recordAdjustment}
            title="Record Adjustment"
          />
        </TabPane>
      </Tabs>
    </Card>
  );

  // Step 3: Data Retrieval
  const DataRetrievalStep = () => (
    <Card>
      <Title level={4}>Data Retrieval Tests</Title>
      <Paragraph>
        Test fetching supplier transactions, accounts, and balances.
      </Paragraph>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card size="small" title="Supplier Transactions">
          <Space>
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              onClick={testSuites.getSupplierTransactions}
              loading={loading}
            >
              Test Get Supplier Transactions
            </Button>
            <Text>With filters: {JSON.stringify(formData.filters)}</Text>
          </Space>
          <ResultDisplay
            result={results.getSupplierTransactions}
            error={errors.getSupplierTransactions}
            title="Get Supplier Transactions"
          />
        </Card>

        <Card size="small" title="Supplier Account">
          <Space>
            <Input
              placeholder="Supplier ID"
              value={formData.supplierId}
              onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
              style={{ width: 300 }}
            />
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={testSuites.getSupplierAccount}
              loading={loading}
            >
              Test Get Supplier Account
            </Button>
          </Space>
          <ResultDisplay
            result={results.getSupplierAccount}
            error={errors.getSupplierAccount}
            title="Get Supplier Account"
          />
        </Card>

        <Card size="small" title="Supplier Balances">
          <Button
            type="primary"
            icon={<DollarCircleOutlined />}
            onClick={testSuites.getSupplierBalances}
            loading={loading}
          >
            Test Get Supplier Balances
          </Button>
          <ResultDisplay
            result={results.getSupplierBalances}
            error={errors.getSupplierBalances}
            title="Get Supplier Balances"
          />
        </Card>

        <Card size="small" title="Transactions by Supplier Name">
          <Space>
            <Input
              placeholder="Supplier Name"
              value={formData.supplierName}
              onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={testSuites.getTransactionsBySupplierName}
              loading={loading}
            >
              Test Get Transactions by Supplier Name
            </Button>
          </Space>
          <ResultDisplay
            result={results.getTransactionsBySupplierName}
            error={errors.getTransactionsBySupplierName}
            title="Get Transactions by Supplier Name"
          />
        </Card>
      </Space>
    </Card>
  );

  // Step 4: Reports & Analytics
  const ReportsStep = () => (
    <Card>
      <Title level={4}>Reports & Analytics Tests</Title>
      <Paragraph>
        Test financial reports, statistics, and aging analysis.
      </Paragraph>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card size="small" title="Balance Sheet">
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={testSuites.getBalanceSheet}
            loading={loading}
          >
            Test Get Balance Sheet
          </Button>
          <ResultDisplay
            result={results.getBalanceSheet}
            error={errors.getBalanceSheet}
            title="Get Balance Sheet"
          />
        </Card>

        <Card size="small" title="Supplier Statistics">
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={testSuites.getSupplierStatistics}
            loading={loading}
          >
            Test Get Supplier Statistics
          </Button>
          <ResultDisplay
            result={results.getSupplierStatistics}
            error={errors.getSupplierStatistics}
            title="Get Supplier Statistics"
          />
        </Card>

        <Card size="small" title="Supplier Aging Report">
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={testSuites.getSupplierAgingReport}
            loading={loading}
          >
            Test Get Supplier Aging Report
          </Button>
          <ResultDisplay
            result={results.getSupplierAgingReport}
            error={errors.getSupplierAgingReport}
            title="Get Supplier Aging Report"
          />
        </Card>
      </Space>
    </Card>
  );

  // Step 5: Search & Utilities
  const SearchStep = () => (
    <Card>
      <Title level={4}>Search & Utility Tests</Title>
      <Paragraph>
        Test supplier search functionality and utility methods.
      </Paragraph>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card size="small" title="Search Suppliers">
          <Space>
            <Input
              placeholder="Search term"
              value={formData.searchTerm}
              onChange={(e) => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={testSuites.searchSuppliers}
              loading={loading}
            >
              Test Search Suppliers
            </Button>
          </Space>
          <ResultDisplay
            result={results.searchSuppliers}
            error={errors.searchSuppliers}
            title="Search Suppliers"
          />
        </Card>

        <Card size="small" title="Service Utilities">
          <Collapse>
            <Panel header="Test Data Generators" key="generators">
              <Space direction="vertical">
                <Text strong>Available Test Data:</Text>
                <Button onClick={() => {
                  setFormData({
                    purchaseInvoice: supplierAccountService.generateTestPurchaseInvoice(),
                    supplierPayment: supplierAccountService.generateTestSupplierPayment(),
                    adjustment: supplierAccountService.generateTestAdjustment(),
                    filters: supplierAccountService.generateTestFilters(),
                    searchTerm: 'Vivo',
                    supplierId: '2843e4a0-7e13-4297-bc57-c4f793191bd5',
                    supplierName: 'Vivo'
                  });
                  message.success('Test data reset to defaults');
                }}>
                  Reset Test Data
                </Button>
                
                <Collapse size="small">
                  <Panel header="Current Test Data" key="current">
                    <pre>{JSON.stringify(formData, null, 2)}</pre>
                  </Panel>
                </Collapse>
              </Space>
            </Panel>
          </Collapse>
        </Card>
      </Space>
    </Card>
  );

  const stepContent = [
    <OverviewStep key="overview" />,
    <RecordTransactionsStep key="transactions" />,
    <DataRetrievalStep key="retrieval" />,
    <ReportsStep key="reports" />,
    <SearchStep key="search" />
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Card 
        title={
          <Space>
            <BugOutlined />
            Supplier Account Service Debug Dashboard
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<RocketOutlined />}
            onClick={runAllTests}
            loading={loading}
          >
            Run All Tests
          </Button>
        }
      >
        <div style={{ marginBottom: 32 }}>
          <Steps 
            current={currentStep} 
            onChange={setCurrentStep}
            responsive
            size="small"
          >
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                icon={step.icon}
              />
            ))}
          </Steps>
        </div>

        <div style={{ minHeight: 500 }}>
          {stepContent[currentStep]}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          paddingTop: 24, 
          borderTop: '1px solid #f0f0f0'
        }}>
          <Button 
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Space>
            <Text type="secondary">
              Step {currentStep + 1} of {steps.length}
            </Text>
            <Button 
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
              type="primary"
            >
              Next
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default SupplierAccountDebug;