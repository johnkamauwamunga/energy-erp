import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Row,
  Col,
  Switch,
  Tag
} from 'antd';
import { 
  FolderAddOutlined,
  CheckOutlined,
  CloseOutlined 
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const { TextArea } = Input;

const CreateDebtorCategoryModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setError('');
    }
  }, [visible, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const categoryData = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        isPaymentProcessor: values.isPaymentProcessor || false,
        requiresApproval: values.requiresApproval || false,
        hasCreditLimit: values.hasCreditLimit || false
      };

      // Validate data
      const validationErrors = debtorService.validateDebtorCategory(categoryData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await debtorService.createDebtorCategory(categoryData);
      onSuccess();
      form.resetFields();
    } catch (err) {
      setError(err.message || 'Failed to create debtor category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <FolderAddOutlined />
          Create Debtor Category
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
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
        initialValues={{
          isPaymentProcessor: false,
          requiresApproval: false,
          hasCreditLimit: false
        }}
      >
        <Form.Item
          name="name"
          label="Category Name"
          rules={[
            { required: true, message: 'Please enter category name' },
            { min: 1, message: 'Category name must be at least 1 character' },
            { max: 100, message: 'Category name cannot exceed 100 characters' }
          ]}
          tooltip="Unique name for this debtor category"
        >
          <Input 
            placeholder="e.g., Mobile Money, Corporate Clients" 
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          tooltip="Optional description for this category"
        >
          <TextArea 
            placeholder="Enter category description (optional)"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Category Settings */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Category Settings</div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="isPaymentProcessor"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Switch 
                  size="small"
                  checkedChildren={<CheckOutlined />} 
                  unCheckedChildren={<CloseOutlined />}
                />
                <div style={{ fontSize: '12px', marginTop: 4 }}>Payment Processor</div>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="requiresApproval"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Switch 
                  size="small"
                  checkedChildren={<CheckOutlined />} 
                  unCheckedChildren={<CloseOutlined />}
                />
                <div style={{ fontSize: '12px', marginTop: 4 }}>Requires Approval</div>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="hasCreditLimit"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Switch 
                  size="small"
                  checkedChildren={<CheckOutlined />} 
                  unCheckedChildren={<CloseOutlined />}
                />
                <div style={{ fontSize: '12px', marginTop: 4 }}>Credit Limit</div>
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Settings Preview */}
        <Form.Item label="Preview">
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const name = getFieldValue('name') || 'Category Name';
              const isPaymentProcessor = getFieldValue('isPaymentProcessor');
              const requiresApproval = getFieldValue('requiresApproval');
              const hasCreditLimit = getFieldValue('hasCreditLimit');
              
              return (
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9'
                }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>{name}</div>
                  <Space size={[4, 4]} wrap>
                    {isPaymentProcessor && (
                      <Tag color="green" size="small">Payment Processor</Tag>
                    )}
                    {requiresApproval && (
                      <Tag color="orange" size="small">Requires Approval</Tag>
                    )}
                    {hasCreditLimit && (
                      <Tag color="blue" size="small">Credit Limit</Tag>
                    )}
                    {!isPaymentProcessor && !requiresApproval && !hasCreditLimit && (
                      <Tag color="default" size="small">Standard</Tag>
                    )}
                  </Space>
                </div>
              );
            }}
          </Form.Item>
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
              icon={<FolderAddOutlined />}
              size="large"
            >
              Create Category
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDebtorCategoryModal;