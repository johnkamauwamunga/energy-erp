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
  Switch,
  ColorPicker,
  Tag,
  Card
} from 'antd';
import { 
  EditOutlined, 
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { Option } = Select;
const { TextArea } = Input;

const UpdateDebtorCategoryModal = ({ visible, category, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens with category data
  useEffect(() => {
    if (visible && category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description || '',
        color: category.color || '#666666',
        icon: category.icon || '',
        isPaymentProcessor: category.isPaymentProcessor || false,
        requiresApproval: category.requiresApproval || false,
        hasCreditLimit: category.hasCreditLimit || false,
        isActive: category.isActive !== false
      });
      setError('');
    }
  }, [visible, category, form]);

  const handleSubmit = async (values) => {
    if (!category) return;
    
    setLoading(true);
    setError('');

    try {
      const updateData = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        color: values.color,
        icon: values.icon?.trim() || null,
        isPaymentProcessor: values.isPaymentProcessor,
        requiresApproval: values.requiresApproval,
        hasCreditLimit: values.hasCreditLimit,
        isActive: values.isActive
      };

      // Remove unchanged fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === category[key]) {
          delete updateData[key];
        }
      });

      // Validate data
      const validationErrors = debtorService.validateDebtorCategory(updateData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await debtorService.updateDebtorCategory(category.id, updateData);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update debtor category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    onClose();
  };

  // Common icons for debtor categories
  const categoryIcons = [
    { value: 'mobile', label: 'Mobile', description: 'Mobile Money' },
    { value: 'credit-card', label: 'Credit Card', description: 'Credit Cards' },
    { value: 'building', label: 'Building', description: 'Corporate Clients' },
    { value: 'fuel', label: 'Fuel', description: 'Fuel Cards' },
    { value: 'users', label: 'Users', description: 'General Debtors' },
    { value: 'car', label: 'Car', description: 'Vehicle Owners' },
    { value: 'shop', label: 'Shop', description: 'Retail Customers' },
    { value: 'bank', label: 'Bank', description: 'Bank Partners' },
    { value: 'truck', label: 'Truck', description: 'Fleet Operators' },
    { value: 'star', label: 'Star', description: 'VIP Customers' }
  ];

  // Default colors for different category types
  const defaultColors = [
    '#FF4D4F', '#1890FF', '#52C41A', '#FAAD14', '#722ED1',
    '#13C2C2', '#EB2F96', '#FA8C16', '#389E0D', '#0958D9'
  ];

  if (!category) return null;

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Update Debtor Category
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
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Category Name"
              rules={[
                { required: true, message: 'Please enter category name' },
                { min: 1, message: 'Category name must be at least 1 character' },
                { max: 100, message: 'Category name cannot exceed 100 characters' }
              ]}
            >
              <Input 
                placeholder="Enter category name" 
                size="large"
                disabled={category.isSystem}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="icon"
              label="Icon"
            >
              <Select 
                placeholder="Select icon" 
                size="large"
                showSearch
                optionFilterProp="children"
              >
                {categoryIcons.map(icon => (
                  <Option key={icon.value} value={icon.value}>
                    <Space>
                      <span>📱</span>
                      {icon.label}
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        {icon.description}
                      </span>
                    </Space>
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
          <TextArea 
            placeholder="Enter category description (optional)"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="color"
              label="Color"
            >
              <ColorPicker
                size="large"
                format="hex"
                presets={[
                  {
                    label: 'Recommended',
                    colors: defaultColors,
                  },
                ]}
                showText
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="isPaymentProcessor"
              label="Payment Processor"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="requiresApproval"
              label="Requires Approval"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="hasCreditLimit"
              label="Credit Limit"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Active Status"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />} 
                unCheckedChildren={<CloseOutlined />}
                disabled={category.isSystem}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Settings Preview */}
        <Form.Item label="Category Settings Preview">
          <Card size="small" style={{ background: '#fafafa' }}>
            <Row gutter={16} align="middle">
              <Col>
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const color = getFieldValue('color') || '#666666';
                    const name = getFieldValue('name') || 'Category Name';
                    const isPaymentProcessor = getFieldValue('isPaymentProcessor');
                    const requiresApproval = getFieldValue('requiresApproval');
                    const hasCreditLimit = getFieldValue('hasCreditLimit');
                    const isActive = getFieldValue('isActive');
                    
                    return (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              backgroundColor: color,
                              border: '1px solid #d9d9d9'
                            }}
                          />
                          <span style={{ fontWeight: 500 }}>{name}</span>
                          {category.isSystem && (
                            <Tag color="blue" size="small">System</Tag>
                          )}
                          <Tag color={isActive ? 'success' : 'error'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Tag>
                        </Space>
                        
                        <Space size={[8, 8]} wrap>
                          {isPaymentProcessor && (
                            <Tag color="green">
                              <CheckOutlined /> Payment Processor
                            </Tag>
                          )}
                          {requiresApproval && (
                            <Tag color="orange">
                              <InfoCircleOutlined /> Requires Approval
                            </Tag>
                          )}
                          {hasCreditLimit && (
                            <Tag color="blue">
                              💳 Credit Limit
                            </Tag>
                          )}
                          {!isPaymentProcessor && !requiresApproval && !hasCreditLimit && (
                            <Tag color="default">
                              Standard Category
                            </Tag>
                          )}
                        </Space>
                      </Space>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form.Item>

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
                Update Category
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateDebtorCategoryModal;