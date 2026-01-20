// src/components/Shortages/ShortageManagement.jsx
import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  message
} from 'antd';
import {
  AccountBookOutlined,
  PlusOutlined,
  ExportOutlined,
  SyncOutlined,
  DollarOutlined,
  WarningOutlined,
  PercentageOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../../services/shortage/shortageService';
import { useApp } from '../../context/AppContext';
import ShortageComponent from './ShortageComponent';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const ShortageManagement = () => {
  const { state } = useApp();
  const [shortageStats, setShortageStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [modalVisible, setModalVisible] = useState({
    createShortage: false,
    exportData: false
  });
  const [forms, setForms] = useState({
    createShortage: Form.useForm()[0],
    exportData: Form.useForm()[0]
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const currentUser = state?.currentUser;
  const currentStationId = state?.currentStation?.id;
  const currentCompanyId = currentUser?.companyId;

  // Fetch statistics
  const fetchShortageStats = async () => {
    try {
      const stats = await shortageService.getShortageStats();
      setShortageStats(shortageService.formatShortageStats(stats));
    } catch (error) {
      console.error('Failed to fetch shortage statistics:', error);
    }
  };

  // Handle create shortage
  const handleCreateShortage = async (values) => {
    try {
      const shortage = await shortageService.createShortage(values);
      message.success('Shortage recorded successfully');
      
      setModalVisible(prev => ({ ...prev, createShortage: false }));
      forms.createShortage.resetFields();
      refreshData();
      
    } catch (error) {
      console.error('Failed to create shortage:', error);
      message.error(error.message || 'Failed to record shortage');
    }
  };

  // Refresh data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
    fetchShortageStats();
  };

  // Tab-specific filters
  const getTabFilters = () => {
    switch (activeTab) {
      case 'active':
        return { status: 'ACTIVE', hasOutstanding: true };
      case 'overdue':
        return { status: 'ACTIVE', hasOutstanding: true };
      case 'critical':
        return { severity: 'CRITICAL', hasOutstanding: true };
      default:
        return {};
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} className="m-0">
                <AccountBookOutlined className="mr-2" />
                Shortage Management
              </Title>
              <Text type="secondary">
                Manage staff shortages, deductions, and collections
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<SyncOutlined />}
                  onClick={refreshData}
                >
                  Refresh
                </Button>
              </Col>
              <Col>
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => setModalVisible(prev => ({ ...prev, exportData: true }))}
                >
                  Export
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    forms.createShortage.resetFields();
                    setModalVisible(prev => ({ ...prev, createShortage: true }));
                  }}
                >
                  Record Shortage
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Card size="small" className="shadow-sm">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Total Shortages"
              value={shortageStats?.overview?.totalShortages || 0}
              prefix={<AccountBookOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Total Amount"
              value={shortageStats?.overview?.totalAmountDisplay || '$0'}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Outstanding"
              value={shortageStats?.overview?.outstandingAmountDisplay || '$0'}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Collection Rate"
              value={shortageStats?.computedMetrics?.collectionRate || 0}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
              prefix={<PercentageOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Critical"
              value={shortageStats?.bySeverity?.find(s => s.severity === 'CRITICAL')?.count || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Statistic
              title="Overdue"
              value={shortageStats?.computedMetrics?.overdueCount || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card size="small" className="shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="All Shortages" key="all" />
          <TabPane tab="Active" key="active" />
          <TabPane tab="Overdue" key="overdue" />
          <TabPane tab="Critical" key="critical" />
          <TabPane tab="Statistics" key="stats" />
        </Tabs>
      </Card>

      {/* Main Content */}
      {activeTab === 'stats' ? (
        <Card className="shadow-sm">
          <div className="text-center py-8">
            <BarChartOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            <Title level={3} className="mt-4">Detailed Statistics</Title>
            <Text type="secondary">Advanced shortage analytics coming soon</Text>
          </div>
        </Card>
      ) : (
        <ShortageComponent
          mode="full"
          roleBased={true}
          filters={getTabFilters()}
          showHeader={false}
          showFilters={true}
          showActions={true}
          pageSize={10}
          refreshKey={refreshKey}
          currentUser={currentUser}
          currentStationId={currentStationId}
          currentCompanyId={currentCompanyId}
          onRefresh={fetchShortageStats}
          onCreateShortage={() => {
            forms.createShortage.resetFields();
            setModalVisible(prev => ({ ...prev, createShortage: true }));
          }}
        />
      )}

      {/* Create Shortage Modal */}
      <Modal
        title={
          <Space>
            <AccountBookOutlined />
            <span>Record New Shortage</span>
          </Space>
        }
        open={modalVisible.createShortage}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createShortage: false }));
          forms.createShortage.resetFields();
        }}
        onOk={() => forms.createShortage.submit()}
        okText="Record Shortage"
        cancelText="Cancel"
        width={600}
      >
        <Form form={forms.createShortage} layout="vertical" onFinish={handleCreateShortage}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="staffAccountId"
                label="Staff Member"
                rules={[{ required: true, message: 'Please select staff member' }]}
              >
                <Select
                  placeholder="Select staff"
                  showSearch
                  optionFilterProp="children"
                >
                  {/* Populate with actual staff accounts */}
                  <Option value="demo">Demo Staff</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[
                  { required: true, message: 'Please enter amount' },
                  { type: 'number', min: 0.01, message: 'Amount must be positive' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea
              placeholder="Describe the shortage..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="shortageType"
                label="Type"
                initialValue="CASH"
              >
                <Select>
                  <Option value="CASH">Cash</Option>
                  <Option value="INVENTORY">Inventory</Option>
                  <Option value="PRODUCT">Product</Option>
                  <Option value="EQUIPMENT">Equipment</Option>
                  <Option value="OTHER">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="responsibleParty"
                label="Responsible"
                initialValue="ATTENDANT"
              >
                <Select>
                  <Option value="ATTENDANT">Attendant</Option>
                  <Option value="SUPERVISOR">Supervisor</Option>
                  <Option value="SHIFT_LEADER">Shift Leader</Option>
                  <Option value="STATION">Station</Option>
                  <Option value="OTHER">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="severity"
                label="Severity"
                initialValue="MODERATE"
              >
                <Select>
                  <Option value="MINOR">Minor</Option>
                  <Option value="MODERATE">Moderate</Option>
                  <Option value="MAJOR">Major</Option>
                  <Option value="CRITICAL">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Due Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shiftId"
                label="Shift ID"
              >
                <Input placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="comments"
            label="Comments"
          >
            <TextArea
              placeholder="Additional notes..."
              rows={2}
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShortageManagement;