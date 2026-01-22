// src/components/Shortages/CreateShortageForm.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Card,
  Alert,
  Space,
  Descriptions,
  Divider,
  Tag,
  message,
  Spin,
  Button
} from 'antd';
import {
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  BankOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../../services/shortageService/shortageService';
import { staffAccountService } from '../../../../services/staffAccountService/staffAccountService';
import { stationService } from '../../../../services/stationService/stationService';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const CreateShortageForm = forwardRef(({
  onSuccess,
  onCancel,
  currentUser,
  currentStation,
  currentCompany,
  showSteps,
  currentStep,
  setCurrentStep,
  submitting = false,
  setSubmitting
}, ref) => {
  const [form] = Form.useForm();
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [stations, setStations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [islands, setIslands] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserRole = currentUser?.role;
  const isAttendant = currentUserRole === 'ATTENDANT';
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUserRole === 'COMPANY_ADMIN';
  const isStationManager = ['STATION_MANAGER', 'LINES_MANAGER', 'SUPERVISOR'].includes(currentUserRole);

  // Expose form methods to parent via ref
  useImperativeHandle(ref, () => ({
    submit: async () => {
      try {
        // Validate form fields
        const values = await form.validateFields();
        
        // Call handleSubmit
        await handleSubmit(values);
        return true;
      } catch (error) {
        console.error('Form validation failed:', error);
        
        // Show specific validation errors
        if (error.errorFields && error.errorFields.length > 0) {
          const firstError = error.errorFields[0];
          message.error(`${firstError.name.join('.')}: ${firstError.errors[0]}`);
        } else {
          message.error('Please check all required fields');
        }
        
        return false;
      }
    },
    reset: () => {
      form.resetFields();
      setSelectedAccount(null);
      setSelectedStation(null);
      setSelectedCompany(null);
    }
  }));

  // Fetch staff accounts based on user role
  const fetchStaffAccounts = async () => {
    try {
      setIsLoading(true);
      let accounts = [];
      
      if (isAttendant) {
        // Attendants can only create shortages for themselves
        const myAccount = await staffAccountService.getMyStaffAccount();
        if (myAccount) {
          accounts = [myAccount];
          form.setFieldsValue({ staffAccountId: myAccount.id });
          setSelectedAccount(myAccount);
        }
      } else if (isStationManager && currentStation?.id) {
        // Station managers see accounts in their station
        const result = await staffAccountService.getStaffAccountsByStation(currentStation.id);
        accounts = result?.accounts || [];
      } else if (isCompanyAdmin && currentUser?.companyId) {
        // Company admins see accounts in their company
        const result = await staffAccountService.getStaffAccountsByCompany(currentUser.companyId);
        accounts = result?.accounts || [];
      } else if (isSuperAdmin) {
        // Super admin sees all accounts
        const result = await staffAccountService.getAllStaffAccounts();
        accounts = result?.accounts || [];
      }

      setStaffAccounts(accounts);
    } catch (error) {
      console.error('Error fetching staff accounts:', error);
      message.error('Failed to load staff accounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stations
  const fetchStations = async () => {
    try {
      setIsLoading(true);
      let stationsData = [];
      
      if (isCompanyAdmin && currentUser?.companyId) {
        stationsData = await stationService.getCompanyStations();
      } else if (isSuperAdmin) {
        stationsData = await stationService.getAllStations();
      } else if (currentStation) {
        stationsData = [currentStation];
        setSelectedStation(currentStation);
      }

      setStations(stationsData || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    console.log('Form values for submission:', values);
    
    try {
      if (setSubmitting) {
        setSubmitting(true);
      }
      
      // Format the data for API
      const shortageData = {
        staffAccountId: values.staffAccountId,
        amount: values.amount,
        description: values.description,
        shortageType: values.shortageType || 'CASH',
        responsibleParty: values.responsibleParty || 'ATTENDANT',
        severity: values.severity || 'MODERATE',
        comments: values.comments,
        shiftId: values.shiftId,
        islandId: values.islandId,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null
      };

      console.log('Sending shortage data:', shortageData);
      
      // Call the shortage service
      const shortage = await shortageService.createShortage(shortageData);
      console.log('Shortage created successfully:', shortage);
      
      // Trigger success callback
      if (onSuccess) {
        onSuccess(shortage);
      }
      
      // Reset form
      form.resetFields();
      setSelectedAccount(null);
      setSelectedStation(null);
      
    } catch (error) {
      console.error('Error creating shortage:', error);
      message.error(error.message || 'Failed to record shortage');
      throw error;
    } finally {
      if (setSubmitting) {
        setSubmitting(false);
      }
    }
  };

  // Handle staff account selection
  const handleStaffAccountChange = (accountId) => {
    const account = staffAccounts.find(acc => acc.id === accountId);
    setSelectedAccount(account);
    
    // Auto-set station if not already set
    if (account?.stationId && !form.getFieldValue('stationId')) {
      form.setFieldsValue({ stationId: account.stationId });
      setSelectedStation(stations.find(s => s.id === account.stationId));
    }
  };

  // Handle station selection
  const handleStationChange = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    setSelectedStation(station);
    
    // Filter staff accounts by station
    if (stationId) {
      const filteredAccounts = staffAccounts.filter(acc => acc.stationId === stationId);
      setStaffAccounts(filteredAccounts);
    } else {
      fetchStaffAccounts(); // Reset to all accounts
    }
  };

  // Initial data fetching
  useEffect(() => {
    if (!isAttendant) {
      fetchStaffAccounts();
      fetchStations();
    } else {
      // For attendants, fetch their own account
      const fetchMyAccount = async () => {
        try {
          setIsLoading(true);
          const myAccount = await staffAccountService.getMyStaffAccount();
          if (myAccount) {
            setStaffAccounts([myAccount]);
            form.setFieldsValue({ staffAccountId: myAccount.id });
            setSelectedAccount(myAccount);
          }
        } catch (error) {
          console.error('Error fetching my account:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMyAccount();
    }
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">Loading form data...</Text>
        </div>
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      onFinishFailed={(errorInfo) => {
        console.log('Validation failed:', errorInfo);
        message.error('Please check the form for errors');
      }}
      initialValues={{
        shortageType: 'CASH',
        responsibleParty: 'ATTENDANT',
        severity: 'MODERATE',
        amount: 0
      }}
      requiredMark={false}
      disabled={submitting}
    >
      {/* Staff Account Selection */}
      {!isAttendant && (
        <Card size="small" className="mb-4" title={<Space><UserOutlined /> Staff Member</Space>}>
          <Row gutter={16}>
            {isCompanyAdmin || isSuperAdmin ? (
              <Col span={12}>
                <Form.Item
                  name="stationId"
                  label="Station"
                  rules={[{ required: true, message: 'Please select a station' }]}
                >
                  <Select
                    placeholder="Select station"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleStationChange}
                    loading={isLoading}
                    disabled={submitting}
                  >
                    {stations.map(station => (
                      <Option key={station.id} value={station.id}>
                        {station.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            ) : null}
            
            <Col span={isCompanyAdmin || isSuperAdmin ? 12 : 24}>
              <Form.Item
                name="staffAccountId"
                label="Staff Account"
                rules={[{ required: true, message: 'Please select a staff member' }]}
              >
                <Select
                  placeholder="Select staff member"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleStaffAccountChange}
                  loading={isLoading}
                  disabled={(!selectedStation && (isCompanyAdmin || isSuperAdmin)) || submitting}
                >
                  {staffAccounts.map(account => (
                    <Option key={account.id} value={account.id}>
                      <Space>
                        <UserOutlined />
                        <span>{account.userDisplayName || `${account.user?.firstName} ${account.user?.lastName}`}</span>
                        <Text type="secondary">({account.stationDisplayName || account.station?.name})</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )}

      {/* Selected Staff Info */}
      {selectedAccount && (
        <Alert
          message={
            <Space direction="vertical" size={0}>
              <Text strong>Selected Staff: {selectedAccount.userDisplayName || `${selectedAccount.user?.firstName} ${selectedAccount.user?.lastName}`}</Text>
              <Text type="secondary">Station: {selectedAccount.stationDisplayName || selectedAccount.station?.name}</Text>
              <Text type="secondary">Current Balance: {`Ksh ${(selectedAccount.currentBalance || 0).toLocaleString()}`}</Text>
            </Space>
          }
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      {/* Shortage Details */}
      <Card size="small" className="mb-4" title={<Space><DollarOutlined /> Shortage Details</Space>}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Amount"
              rules={[
                { required: true, message: 'Amount is required' },
                { type: 'number', min: 1, message: 'Amount must be at least 1' },
                { type: 'number', max: 1000000, message: 'Amount cannot exceed 1,000,000' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter amount"
                min={1}
                max={1000000}
                step={100}
                prefix="Ksh"
                formatter={value => `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/Ksh\s?|(,*)/g, '')}
                disabled={submitting}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="shortageType"
              label="Type"
              rules={[{ required: true, message: 'Type is required' }]}
            >
              <Select 
                placeholder="Select type"
                disabled={submitting}
              >
                {shortageService.SHORTAGE_TYPES?.map(type => (
                  <Option key={type} value={type}>
                    {shortageService.getShortageTypeLabel ? shortageService.getShortageTypeLabel(type) : type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description"
              rules={[
                { required: true, message: 'Description is required' },
                { min: 5, message: 'Description must be at least 5 characters' },
                { max: 500, message: 'Description cannot exceed 500 characters' }
              ]}
            >
              <TextArea
                placeholder="Describe the shortage (what, when, where, why)"
                rows={3}
                maxLength={500}
                showCount
                disabled={submitting}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="responsibleParty"
              label="Responsible Party"
            >
              <Select 
                placeholder="Select responsible party"
                disabled={submitting}
              >
                {shortageService.RESPONSIBLE_PARTIES?.map(party => (
                  <Option key={party} value={party}>
                    {shortageService.getResponsiblePartyLabel ? shortageService.getResponsiblePartyLabel(party) : party}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="severity"
              label="Severity Level"
            >
              <Select 
                placeholder="Select severity"
                disabled={submitting}
              >
                {shortageService.SHORTAGE_SEVERITY?.map(severity => (
                  <Option key={severity} value={severity}>
                    {shortageService.getSeverityLabel ? shortageService.getSeverityLabel(severity) : severity}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="dueDate"
              label="Due Date (Optional)"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Select due date"
                format="YYYY-MM-DD"
                disabledDate={(current) => {
                  return current && current < dayjs().startOf('day');
                }}
                disabled={submitting}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="comments"
              label="Additional Comments"
            >
              <TextArea
                placeholder="Any additional comments or notes"
                rows={2}
                maxLength={200}
                showCount
                disabled={submitting}
              />
            </Form.Item>

            
          </Col>
        </Row>

         <Row gutter={16}>
          <Col span={16}>
            <Form.Item>
        <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button 
            onClick={() => {
              if (onCancel) {
                onCancel();
              }
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit"
            loading={submitting}
            disabled={submitting}
          >
            Create Shortage
          </Button>
        </Space>
      </Form.Item>
          </Col>
          </Row>
      </Card>

      {/* Debug info - remove in production */}
      <div style={{ display: 'none' }}>
        <Text type="secondary">Form ref available: {!!ref}</Text>
        <Text type="secondary">Staff accounts loaded: {staffAccounts.length}</Text>
        <Text type="secondary">Stations loaded: {stations.length}</Text>
      </div>
    </Form>
  );
});

// Add display name for debugging
CreateShortageForm.displayName = 'CreateShortageForm';

export default CreateShortageForm;