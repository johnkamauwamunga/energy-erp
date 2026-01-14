// components/nonfuel/category/CreateCategoryModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Alert, message } from 'antd';
import { nonFuelService } from '../../../../../../services/nonFuelService/nonFuelService';

const { TextArea } = Input;

const CreateCategoryModal = ({ isOpen, onClose, onCategoryCreated, category, companyId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        form.setFieldsValue({
          name: category.name,
          description: category.description || '',
          isForFuel: category.isForFuel || false
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          isForFuel: false,
          description: ''
        });
      }
    }
  }, [isOpen, category, form]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      const categoryData = {
        ...values,
        companyId,
        isForFuel: false
      };

      console.log('Submitting category data:', categoryData);

      if (category) {
        const updateData = {
          id: category.id,
          ...categoryData
        };
        
        // Use nonFuelService.updateCategory
        await nonFuelService.updateCategory(updateData);
        message.success('Category updated successfully');
      } else {
        // Use nonFuelService.createCategory
        await nonFuelService.createCategory(categoryData);
        message.success('Category created successfully');
      }

      onCategoryCreated();
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Error saving category:', error);
      setError(error.message || 'Failed to save category');
      message.error(error.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const validateName = (_, value) => {
    if (!value || value.trim() === '') {
      return Promise.reject(new Error('Please enter category name'));
    }
    if (value.length > 100) {
      return Promise.reject(new Error('Name cannot exceed 100 characters'));
    }
    return Promise.resolve();
  };

  const validateDescription = (_, value) => {
    if (value && value.length > 500) {
      return Promise.reject(new Error('Description cannot exceed 500 characters'));
    }
    return Promise.resolve();
  };

  return (
    <Modal
      title={category ? 'Edit Non-Fuel Category' : 'Create Non-Fuel Category'}
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={500}
      destroyOnClose
      maskClosable={false}
      keyboard={false}
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="Category Name"
          rules={[
            { validator: validateName },
            {
              pattern: /^[A-Za-z0-9\s\-_,]+$/,
              message: 'Only letters, numbers, spaces, hyphens, underscores and commas are allowed'
            }
          ]}
          validateFirst
          hasFeedback
        >
          <Input 
            placeholder="e.g., ELECTRONICS, CONSUMABLES, AUTOMOTIVE" 
            style={{ textTransform: 'uppercase' }}
            disabled={loading}
            allowClear
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
          rules={[{ validator: validateDescription }]}
          validateFirst
          hasFeedback
        >
          <TextArea
            placeholder="Optional description for this category"
            rows={3}
            maxLength={500}
            showCount
            disabled={loading}
            allowClear
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button 
              onClick={handleCancel} 
              disabled={loading}
              size="middle"
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="middle"
            >
              {category ? 'Update' : 'Create'} Category
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCategoryModal;