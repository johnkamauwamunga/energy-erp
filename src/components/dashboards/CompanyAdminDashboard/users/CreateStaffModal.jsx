import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Tag,
  Space,
  Alert,
  Row,
  Col,
  Card,
  Divider,
  Spin,
  message
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  TeamOutlined,
  ShopOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';

const { Option } = Select;

const CreateStaffModal = ({ isOpen, onClose, onUserCreated }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStations, setSelectedStations] = useState([]);

  // Load stations when modal opens
  useEffect(() => {
    const loadStations = async () => {
      if (isOpen) {
        setLoading(true);
        try {
          const response = await stationService.getCompanyStations();
          setStations(response || []);
        } catch (error) {
          console.error('Failed to load stations:', error);
          message.error('Failed to load stations');
        } finally {
          setLoading(false);
        }
      }
    };

    if (isOpen) {
      loadStations();
      // Reset form and selections
      form.resetFields();
      setSelectedStations([]);
    }
  }, [isOpen, form]);

const handleSubmit = async (values) => {
  setSubmitting(true);
  
  try {
    // Prepare station assignments if user has station-based role
    const stationAssignments = selectedStations.map(stationId => ({
      stationId,
      role: values.role
    }));

    const userData = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.toLowerCase().trim(),
      role: values.role,
      status: values.status,
      // REMOVED: password field - will be auto-generated on backend
      ...(stationAssignments.length > 0 && { stationAssignments })
    };

    console.log('🟢 [CREATE USER] Sending data:', userData);

    const response = await userService.createUser(userData);

    console.log("response ",response)

    if (response.id) {
      message.success('User created successfully!');
      
      // Call onUserCreated first to refresh the table
      onUserCreated();
      
      // Then close the modal
      onClose();
      
      // Show temporary password in a separate message if available
      if (response.data?.tempPassword) {
        // Use setTimeout to ensure modal is closed before showing the password modal
        setTimeout(() => {
          Modal.info({
            title: 'Temporary Password',
            content: (
              <div>
                <p>The temporary password for <strong>{userData.email}</strong> is:</p>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  margin: '8px 0',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}>
                  {response.data.tempPassword}
                </div>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Please save this password securely. It will not be shown again.
                </p>
              </div>
            ),
            okText: 'Copy Password',
            width: 500,
            onOk: () => {
              // Copy to clipboard
              navigator.clipboard.writeText(response.data.tempPassword);
              message.success('Password copied to clipboard!');
            }
          });
        }, 300);
      }
    } else {
      message.error(response.message || 'Failed to create user');
    }
  } catch (error) {
    console.error('❌ [CREATE USER] Failed to create user:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create user';
    message.error(errorMessage);
  } finally {
    setSubmitting(false);
  }
};

  const handleStationChange = (selectedValues) => {
    console.log('🟢 [STATION CHANGE] Selected values:', selectedValues);
    setSelectedStations(selectedValues);
  };

  const handleRoleChange = (role) => {
    // Clear station selections if role changes to non-station role
    if (role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN') {
      setSelectedStations([]);
    }
  };

  const getRoleOptions = () => {
    const baseRoles = [
      { value: 'STATION_MANAGER', label: 'Station Manager' },
      { value: 'SUPERVISOR', label: 'Supervisor' },
      { value: 'ATTENDANT', label: 'Attendant' }
    ];

    if (state.currentUser?.role === 'SUPER_ADMIN') {
      return [
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'COMPANY_ADMIN', label: 'Company Admin' },
        ...baseRoles
      ];
    }

    return baseRoles;
  };

  const showStationAssignment = () => {
    const role = form.getFieldValue('role');
    return role === 'STATION_MANAGER' || role === 'SUPERVISOR' || role === 'ATTENDANT';
  };

  const renderStationTags = () => {
    if (selectedStations.length === 0) return null;

    return (
      <div style={{ marginTop: 8 }}>
        <Divider orientation="left" plain>
          Selected Stations
        </Divider>
        <Space wrap size={[8, 8]}>
          {selectedStations.map(stationId => {
            const station = stations.find(s => s.id === stationId);
            return station ? (
              <Tag
                key={stationId}
                color="blue"
                closable
                onClose={() => {
                  setSelectedStations(prev => prev.filter(id => id !== stationId));
                }}
                icon={<ShopOutlined />}
              >
                {station.name}
              </Tag>
            ) : null;
          })}
        </Space>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Register New Staff Member
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
      maskClosable={!submitting}
      keyboard={!submitting}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            role: 'ATTENDANT',
            status: 'ACTIVE'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[
                  { required: true, message: 'Please enter first name' },
                  { min: 2, message: 'First name must be at least 2 characters' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="Enter first name" 
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[
                  { required: true, message: 'Please enter last name' },
                  { min: 2, message: 'Last name must be at least 2 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter last name" 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="user@example.com" 
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Please select a role' }]}
              >
                <Select 
                  onChange={handleRoleChange}
                  placeholder="Select role"
                >
                  {getRoleOptions().map(role => (
                    <Option key={role.value} value={role.value}>
                      <TeamOutlined /> {role.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Status"
                name="status"
              >
                <Select placeholder="Select status">
                  <Option value="ACTIVE">Active</Option>
                  <Option value="INACTIVE">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="Password"
                name="password"
                extra="Leave empty to auto-generate a secure password"
              >
                <Input.Password 
                  placeholder="Optional: Enter custom password" 
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Station Assignments Section */}
          {showStationAssignment() && (
            <Card 
              size="small" 
              title={
                <Space>
                  <ShopOutlined />
                  Station Assignments
                </Space>
              }
              style={{ marginTop: 16 }}
            >
              <Form.Item
                help="Select stations where this staff member will work"
                validateStatus={selectedStations.length === 0 ? 'error' : ''}
                extra={selectedStations.length === 0 ? 'At least one station assignment is required for this role' : ''}
              >
                <Select
                  mode="multiple"
                  placeholder="Select stations for assignment"
                  value={selectedStations}
                  onChange={handleStationChange}
                  loading={loading}
                  optionFilterProp="children"
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {stations.map(station => (
                    <Option key={station.id} value={station.id}>
                      {station.name} {station.location && `- ${station.location}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {renderStationTags()}

              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                <Space direction="vertical" size={2}>
                  <div>• User will be assigned as: <Tag color="blue">{form.getFieldValue('role')}</Tag></div>
                  <div>• Selected stations: <strong>{selectedStations.length}</strong></div>
                </Space>
              </div>
            </Card>
          )}

          {/* Info for non-station roles */}
          {!showStationAssignment() && form.getFieldValue('role') && (
            <Alert
              message="Role Information"
              description={
                form.getFieldValue('role') === 'COMPANY_ADMIN' 
                  ? 'Company Admins have access to all stations in the company automatically.'
                  : 'Super Admins have system-wide access to all stations and company data.'
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {/* Form Actions */}
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                icon={<PlusOutlined />}
                disabled={showStationAssignment() && selectedStations.length === 0}
              >
                Register Staff
              </Button>
            </Space>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CreateStaffModal;