import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Tabs,
  Tag,
  Space,
  Alert,
  Row,
  Col,
  Card,
  List,
  Divider,
  Spin,
  Empty,
  Popconfirm,
  message
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  TeamOutlined,
  ShopOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import { userService } from '../../../../services/userService/userService';
import { stationService } from '../../../../services/stationService/stationService';

const { Option } = Select;
const { TabPane } = Tabs;

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { state } = useApp();
  const [personalForm] = Form.useForm();
  const [stationForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('personal');
  const [stations, setStations] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Load data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (isOpen && user) {
        setLoading(true);
        try {
          // Load stations
          const stationsResponse = await stationService.getCompanyStations();
          setStations(stationsResponse || []);

          // Load user's current assignments
          const assignmentsResponse = await userService.getUserStationAssignments(user.id);
          setUserAssignments(assignmentsResponse.data || []);

          // Set personal form data
          personalForm.setFieldsValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status
          });

          // Reset station form
          stationForm.resetFields();

        } catch (error) {
          console.error('Failed to load data:', error);
          message.error('Failed to load user data');
        } finally {
          setLoading(false);
        }
      }
    };

    if (isOpen) {
      loadData();
      setActiveTab('personal');
    }
  }, [isOpen, user, personalForm, stationForm]);

  const handlePersonalInfoUpdate = async (values) => {
    setSubmitting(true);
    
    try {
      const updateData = {
        ...values,
        email: values.email.toLowerCase().trim()
      };

      console.log('🟢 [UPDATE USER] Sending data:', updateData);

      const response = await userService.updateUser(user.id, updateData);

      if (response.success) {
        message.success('User information updated successfully!');
        onUserUpdated();
      } else {
        message.error(response.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('❌ [UPDATE USER] Failed to update user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStationAssignment = async (values) => {
    setActionLoading(prev => ({ ...prev, add: true }));
    
    try {
      const { stationId, role } = values;

      const response = await userService.assignUserToStation(
        user.id,
        stationId,
        role
      );

      if (response.success) {
        message.success('Station assignment added successfully!');
        
        // Refresh assignments
        const assignmentsResponse = await userService.getUserStationAssignments(user.id);
        setUserAssignments(assignmentsResponse.data || []);
        
        // Reset station form
        stationForm.resetFields();
        
        onUserUpdated();
      } else {
        message.error(response.message || 'Failed to add station assignment');
      }
    } catch (error) {
      console.error('❌ [STATION ASSIGN] Failed to add station assignment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add station assignment';
      message.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, add: false }));
    }
  };

  const handleRemoveStationAssignment = async (assignmentId) => {
    setActionLoading(prev => ({ ...prev, [assignmentId]: true }));
    
    try {
      const response = await userService.unassignUserFromStation(user.id, assignmentId);

      if (response.success) {
        message.success('Station assignment removed successfully!');
        
        // Refresh assignments
        const assignmentsResponse = await userService.getUserStationAssignments(user.id);
        setUserAssignments(assignmentsResponse.data || []);
        
        onUserUpdated();
      } else {
        message.error(response.message || 'Failed to remove station assignment');
      }
    } catch (error) {
      console.error('❌ [STATION UNASSIGN] Failed to remove assignment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove assignment';
      message.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [assignmentId]: false }));
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

  const getStationRoleOptions = () => [
    { value: 'STATION_MANAGER', label: 'Station Manager' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ATTENDANT', label: 'Attendant' }
  ];

  const canHaveStations = () => {
    const role = personalForm.getFieldValue('role');
    return ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(role);
  };

  // Get available stations (stations user is not already assigned to)
  const getAvailableStations = () => {
    return stations.filter(station => 
      !userAssignments.some(assignment => assignment.stationId === station.id)
    );
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'SUPER_ADMIN': 'Super Admin',
      'COMPANY_ADMIN': 'Company Admin',
      'STATION_MANAGER': 'Station Manager',
      'SUPERVISOR': 'Supervisor',
      'ATTENDANT': 'Attendant'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role) => {
    const colorMap = {
      'SUPER_ADMIN': 'purple',
      'COMPANY_ADMIN': 'blue',
      'STATION_MANAGER': 'green',
      'SUPERVISOR': 'orange',
      'ATTENDANT': 'default'
    };
    return colorMap[role] || 'default';
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Edit User - {user?.firstName} {user?.lastName}
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          {/* Personal Information Tab */}
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                Personal Information
              </span>
            } 
            key="personal"
          >
            <Form
              form={personalForm}
              layout="vertical"
              onFinish={handlePersonalInfoUpdate}
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
                    <Select placeholder="Select role">
                      {getRoleOptions().map(role => (
                        <Option key={role.value} value={role.value}>
                          <TeamOutlined /> {role.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Status"
                name="status"
              >
                <Select placeholder="Select status">
                  <Option value="ACTIVE">Active</Option>
                  <Option value="INACTIVE">Inactive</Option>
                  <Option value="SUSPENDED">Suspended</Option>
                </Select>
              </Form.Item>

              <Divider />

              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting}
                    icon={<EditOutlined />}
                  >
                    Update User
                  </Button>
                </Space>
              </div>
            </Form>
          </TabPane>

          {/* Station Assignments Tab */}
          <TabPane 
            tab={
              <span>
                <ShopOutlined />
                Station Assignments
                {userAssignments.length > 0 && (
                  <Tag style={{ marginLeft: 8 }} color="blue">
                    {userAssignments.length}
                  </Tag>
                )}
              </span>
            } 
            key="stations"
          >
            {!canHaveStations() ? (
              <Alert
                message="Role Information"
                description={
                  personalForm.getFieldValue('role') === 'COMPANY_ADMIN' 
                    ? 'Company Admins have access to all stations in the company automatically.'
                    : 'Super Admins have system-wide access to all stations and company data.'
                }
                type="info"
                showIcon
              />
            ) : (
              <div>
                {/* Current Assignments */}
                <Card 
                  size="small" 
                  title="Current Station Assignments"
                  style={{ marginBottom: 16 }}
                >
                  {userAssignments.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No station assignments"
                    />
                  ) : (
                    <List
                      size="small"
                      dataSource={userAssignments}
                      renderItem={(assignment) => (
                        <List.Item
                          actions={[
                            <Popconfirm
                              title="Remove Station Assignment"
                              description="Are you sure you want to remove this station assignment?"
                              onConfirm={() => handleRemoveStationAssignment(assignment.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                loading={actionLoading[assignment.id]}
                                icon={<DeleteOutlined />}
                              >
                                Remove
                              </Button>
                            </Popconfirm>
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<EnvironmentOutlined />}
                            title={
                              <Space>
                                <span>{assignment.station?.name}</span>
                                <Tag color={getRoleColor(assignment.role)}>
                                  {getRoleDisplayName(assignment.role)}
                                </Tag>
                              </Space>
                            }
                            description={
                              <Space>
                                <CalendarOutlined />
                                Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                                {assignment.station?.location && (
                                  <>
                                    <Divider type="vertical" />
                                    <EnvironmentOutlined />
                                    {assignment.station.location}
                                  </>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>

                {/* Add New Assignment */}
                <Card size="small" title="Add New Station Assignment">
                  <Form
                    form={stationForm}
                    layout="vertical"
                    onFinish={handleAddStationAssignment}
                    initialValues={{ role: 'ATTENDANT' }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="Station"
                          name="stationId"
                          rules={[{ required: true, message: 'Please select a station' }]}
                        >
                          <Select 
                            placeholder="Select station"
                            loading={loading}
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                          >
                            {getAvailableStations().map(station => (
                              <Option key={station.id} value={station.id}>
                                {station.name} {station.location && `- ${station.location}`}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        <Form.Item
                          label="Role at Station"
                          name="role"
                          rules={[{ required: true, message: 'Please select a role' }]}
                        >
                          <Select placeholder="Select role">
                            {getStationRoleOptions().map(role => (
                              <Option key={role.value} value={role.value}>
                                <SafetyOutlined /> {role.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    {getAvailableStations().length === 0 && (
                      <Alert
                        message="No Available Stations"
                        description="This user is already assigned to all available stations."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}

                    <div style={{ textAlign: 'right' }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={actionLoading.add}
                        disabled={getAvailableStations().length === 0}
                        icon={<PlusOutlined />}
                      >
                        Add Assignment
                      </Button>
                    </div>
                  </Form>
                </Card>
              </div>
            )}
          </TabPane>
        </Tabs>
      </Spin>
    </Modal>
  );
};

export default EditUserModal;