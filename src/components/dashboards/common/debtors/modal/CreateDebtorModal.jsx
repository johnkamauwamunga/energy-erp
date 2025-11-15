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
  InputNumber
} from 'antd';
import { 
  UserAddOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  ContactsOutlined,
  IdcardOutlined,
  HomeOutlined,
  DollarOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Option } = Select;
const { TextArea } = Input;

const CreateDebtorModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (visible) {
      loadCategories();
      form.resetFields();
      setError('');
    }
  }, [visible, form]);

  const loadCategories = async () => {
    try {
      const activeCategories = await debtorService.getActiveDebtorCategories();
      setCategories(activeCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const debtorData = {
        name: values.name.trim(),
        categoryId: values.categoryId,
        code: values.code?.trim() || null,
        contactPerson: values.contactPerson?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
        creditLimit: values.creditLimit || null,
        paymentTerms: values.paymentTerms || null,
        taxNumber: values.taxNumber?.trim() || null
      };

      // Validate data
      const validationErrors = debtorService.validateDebtor(debtorData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await debtorService.createDebtor(debtorData);
      onSuccess();
      form.resetFields();
      setSelectedCategory(null);
    } catch (err) {
      setError(err.message || 'Failed to create debtor');
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

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined />
          Create New Debtor
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

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* Basic Information */}
        <Row gutter={16}>
          <Col span={12}>
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
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
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
                loading={categories.length === 0}
              >
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedCategory && (
          <Alert
            message={`Category: ${selectedCategory.name} ${
              selectedCategory.hasCreditLimit ? '(Credit Limit Enabled)' : ''
            }`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          <Col span={12}>
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
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="taxNumber"
              label="Tax Number"
              rules={[
                { max: 50, message: 'Tax number cannot exceed 50 characters' }
              ]}
            >
              <Input 
                placeholder="P051234567L" 
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Contact Information */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="contactPerson"
              label="Contact Person"
              rules={[
                { max: 100, message: 'Contact person cannot exceed 100 characters' }
              ]}
            >
              <Input 
                placeholder="John Doe" 
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
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
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
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
                size="large"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="paymentTerms"
              label="Payment Terms (Days)"
              rules={[
                { type: 'number', min: 0, max: 365, message: 'Payment terms must be between 0 and 365 days' }
              ]}
            >
              <InputNumber
                placeholder="30"
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
          <Form.Item
            name="creditLimit"
            label="Credit Limit (KES)"
            rules={[
              { required: true, message: 'Credit limit is required for this category' },
              { type: 'number', min: 0, max: 10000000, message: 'Credit limit must be between 0 and 10,000,000' }
            ]}
          >
            <InputNumber
              placeholder="50000"
              style={{ width: '100%' }}
              size="large"
              min={0}
              max={10000000}
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
            />
          </Form.Item>
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
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
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
              icon={<UserAddOutlined />}
              size="large"
            >
              Create Debtor
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDebtorModal;