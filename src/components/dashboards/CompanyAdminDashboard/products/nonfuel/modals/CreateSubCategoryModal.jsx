// components/nonfuel/category/CreateSubCategoryModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, Alert, message } from 'antd';
import { nonFuelService } from '../../../../../../services/nonFuelService/nonFuelService';
const { TextArea } = Input;
const { Option } = Select;

const CreateSubCategoryModal = ({ 
  isOpen, 
  onClose, 
  onSubCategoryCreated, 
  subCategory, 
  companyId,
  categories 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (subCategory) {
        form.setFieldsValue({
          name: subCategory.name,
          description: subCategory.description,
          categoryId: subCategory.categoryId
        });
      } else {
        form.resetFields();
      }
      loadCategoryOptions();
    }
  }, [isOpen, subCategory, form]);

  const loadCategoryOptions = async () => {
    try {
      const response = await nonFuelService.getCategories();
      const categoriesData = response.data || [];
      setCategoryOptions(categoriesData.map(cat => ({
        value: cat.id,
        label: cat.name
      })));
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      const subCategoryData = {
        ...values,
        companyId
      };

      if (subCategory) {
        const updateData = {
          id: subCategory.id,
          ...subCategoryData
        };
        
        await nonFuelService.updateSubCategory(updateData);
        message.success('Sub-category updated successfully');
      } else {
        await nonFuelService.createSubCategory(subCategoryData);
        message.success('Sub-category created successfully');
      }

      onSubCategoryCreated();
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save sub-category');
      message.error(error.message || 'Failed to save sub-category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={subCategory ? 'Edit Sub-Category' : 'Create Sub-Category'}
      open={isOpen}
      onCancel={onClose}
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
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
      >
        <Form.Item
          name="categoryId"
          label="Parent Category"
          rules={[
            { required: true, message: 'Please select a parent category' }
          ]}
        >
          <Select
            placeholder="Select a category"
            options={categoryOptions}
            showSearch
            optionFilterProp="label"
            disabled={!!subCategory}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Sub-Category Name"
          rules={[
            { required: true, message: 'Please enter sub-category name' },
            { max: 100, message: 'Name cannot exceed 100 characters' }
          ]}
        >
          <Input 
            placeholder="e.g., SMARTPHONES, BATTERIES, TIRES" 
            style={{ textTransform: 'uppercase' }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { max: 500, message: 'Description cannot exceed 500 characters' }
          ]}
        >
          <TextArea
            placeholder="Optional description for this sub-category"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {subCategory ? 'Update' : 'Create'} Sub-Category
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateSubCategoryModal;