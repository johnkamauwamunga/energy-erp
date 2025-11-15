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
  Switch,
  Tag
} from 'antd';
import { 
  EditOutlined, 
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ContactsOutlined,
  IdcardOutlined,
  HomeOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Option } = Select;
const { TextArea } = Input;

const UpdateDebtorModal = ({ visible, debtor, categories, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Reset form when modal opens with debtor data
  useEffect(() => {
    if (visible && debtor) {
      const category = categories.find(cat => cat.id === debtor.categoryId);
      setSelectedCategory(category);
      
      form.setFieldsValue({
        name: debtor.name,
        categoryId: debtor.categoryId,
        code: debtor.code || '',
        contactPerson: debtor.contactPerson || '',
        phone: debtor.phone || '',
        email: debtor.email || '',
        address: debtor.address || '',
        creditLimit: debtor.creditLimit,
        paymentTerms: debtor.paymentTerms,
        taxNumber: debtor.taxNumber || '',
        isActive: debtor.isActive !== false,
        isBlacklisted: debtor.isBlacklisted || false
      });
      setError('');
    }
  }, [visible, debtor, categories, form]);

  const handleSubmit = async (values) => {
    if (!debtor) return;
    
    setLoading(true);
    setError('');

    try {
      const updateData = {
        name: values.name.trim(),
        categoryId: values.categoryId,
        code: values.code?.trim() || null,
        contactPerson: values.contactPerson?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
        creditLimit: values.creditLimit || null,
        paymentTerms: values.paymentTerms || null,
        taxNumber: values.taxNumber?.trim() || null,
        isActive: values.isActive,
        isBlacklisted: values.isBlacklisted
      };

      // Remove unchanged fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === debtor[key]) {
          delete updateData[key];
        }
      });

      // Validate data
      const validationErrors = debtorService.validateDebtor(updateData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await debtorService.updateDebtor(debtor.id, updateData);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update debtor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    setSelectedCategory(null);
    onClose();
  };

  const handleCategoryChange = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    setSelectedCategory(category);
  };

  // Get category settings display
  const getCategorySettings = (category) => {
    if (!category) return null;
    
    const settings = [];
    if (category.isPaymentProcessor) settings.push('Payment Processor');
    if (category.requiresApproval) settings.push('Requires Approval');
    if (category.hasCreditLimit) settings.push('Credit Limit Enabled');
    
    return settings.length > 0 ? settings.join(' • ') : 'Standard Category';
  };

  if (!debtor) return null;

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Update Debtor
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
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

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* Basic Information */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Debtor Name"
              rules={[
                { required: true, message: 'Please enter debtor name' },
                { min: 1, message: 'Debtor name must be at least 1 character' },
                { max: 200, message: 'Debtor name cannot exceed 200 characters' }
              ]}
            >
              <Input 
                placeholder="Enter debtor name" 
                prefix={<UserOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="categoryId"
              label="Category"
              rules={[
                { required: true, message: 'Please select a category' }
              ]}
            >
              <Select 
                placeholder="Select category" 
                size="large"
                onChange={handleCategoryChange}
                showSearch
                optionFilterProp="children"
              >
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    <Space>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          backgroundColor: category.color || '#666666'
                        }}
                      />
                      {category.name}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Category Settings Display */}
        {selectedCategory && (
          <Alert
            message={
              <Space direction="vertical" size={0}>
                <div>
                  <strong>Category: </strong>
                  <Tag color={selectedCategory.color}>{selectedCategory.name}</Tag>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {getCategorySettings(selectedCategory)}
                </div>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label="Debtor Code"
              rules={[
                {
                  pattern: /^[A-Z0-9-_]+$/,
                  message: 'Code can only contain uppercase letters, numbers, hyphens and underscores'
                },
                { max: 50, message: 'Code cannot exceed 50 characters' }
              ]}
            >
              <Input 
                placeholder="DEBTOR-001" 
                prefix={<IdcardOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="taxNumber"
              label="Tax Number"
              rules={[
                { max: 50, message: 'Tax number cannot exceed 50 characters' }
              ]}
            >
              <Input 
                placeholder="P051234567L" 
                prefix={<IdcardOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Contact Information */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="contactPerson"
              label="Contact Person"
              rules={[
                { max: 100, message: 'Contact person cannot exceed 100 characters' }
              ]}
            >
              <Input 
                placeholder="John Doe" 
                prefix={<ContactsOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[
                { max: 20, message: 'Phone number cannot exceed 20 characters' },
                { 
                  pattern: /^\+?[\d\s-()]+$/,
                  message: 'Please enter a valid phone number'
                }
              ]}
            >
              <Input 
                placeholder="+254712345678" 
                prefix={<PhoneOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { type: 'email', message: 'Please enter a valid email address' },
                { max: 100, message: 'Email cannot exceed 100 characters' }
              ]}
            >
              <Input 
                placeholder="debtor@example.com" 
                prefix={<MailOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="paymentTerms"
              label="Payment Terms (Days)"
              rules={[
                { type: 'number', min: 0, max: 365, message: 'Payment terms must be between 0 and 365 days' }
              ]}
            >
              <InputNumber
                placeholder="30"
                prefix={<CalendarOutlined />}
                style={{ width: '100%' }}
                size="large"
                min={0}
                max={365}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Credit Limit - Only show if category supports it */}
        {selectedCategory?.hasCreditLimit && (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="creditLimit"
                label="Credit Limit (KES)"
                rules={[
                  { type: 'number', min: 0, max: 10000000, message: 'Credit limit must be between 0 and 10,000,000' }
                ]}
              >
                <InputNumber
                  placeholder="50000"
                  prefix={<DollarOutlined />}
                  style={{ width: '100%' }}
                  size="large"
                  min={0}
                  max={10000000}
                  formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/KES\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item
          name="address"
          label="Address"
        >
          <TextArea 
            placeholder="Enter full address"
            rows={2}
            maxLength={500}
            showCount
            prefix={<HomeOutlined />}
          />
        </Form.Item>

        {/* Status Settings */}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={8}>
            <Form.Item
              name="isBlacklisted"
              label="Blacklisted"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0 }}>
          <Row gutter={16}>
            <Col xs={12} sm={8}>
              <Button 
                block 
                onClick={handleCancel}
                size="large"
                disabled={loading}
              >
                Cancel
              </Button>
            </Col>
            <Col xs={12} sm={16}>
              <Button 
                block 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<EditOutlined />}
                size="large"
              >
                Update Debtor
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateDebtorModal;