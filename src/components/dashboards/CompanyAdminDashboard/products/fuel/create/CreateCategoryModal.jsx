import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Space, Alert, ColorPicker, message, Select } from 'antd';
import { fuelService } from '../../../../../../services/fuelService/fuelService';

const { TextArea } = Input;
const { Option } = Select;

const CreateCategoryModal = ({ isOpen, onClose, onCategoryCreated, category, companyId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        // Edit mode - set form values from category
        form.setFieldsValue({
          name: category.name,
          code: category.code,
          defaultColor: category.defaultColor,
          typicalDensity: category.typicalDensity,
          hazardClass: category.hazardClass,
          octaneRange: category.octaneRange,
          sulfurMax: category.sulfurMax,
          flashPoint: category.flashPoint
        });
      } else {
        // Create mode - reset form
        form.resetFields();
      }
    }
  }, [isOpen, category, form]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      const categoryData = {
        ...values,
        companyId
      };

      if (category) {
        // Update existing category
        const updateData = {
          id: category.id,
          ...categoryData
        };
        
        await fuelService.updateFuelCategory(updateData);
        message.success('Category updated successfully');
      } else {
        // Create new category
        await fuelService.createFuelCategory(categoryData);
        message.success('Category created successfully');
      }

      onCategoryCreated();
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save category');
      message.error(error.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (color, hex) => {
    form.setFieldsValue({ defaultColor: hex });
  };

  return (
    <Modal
      title={category ? 'Edit Fuel Category' : 'Create Fuel Category'}
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
          name="name"
          label="Category Name"
          rules={[
            { required: true, message: 'Please enter category name' },
            { max: 100, message: 'Name cannot exceed 100 characters' }
          ]}
        >
          <Input 
            placeholder="e.g., DIESEL, PETROL, KEROSENE" 
            style={{ textTransform: 'uppercase' }}
          />
        </Form.Item>

        <Form.Item
          name="code"
          label="Category Code"
          rules={[
            { required: true, message: 'Please enter category code' },
            { max: 10, message: 'Code cannot exceed 10 characters' }
          ]}
        >
          <Input 
            placeholder="e.g., DSL, PTRL, KRS" 
            style={{ textTransform: 'uppercase' }} 
          />
        </Form.Item>

        <Form.Item
          name="defaultColor"
          label="Default Color"
        >
          <ColorPicker 
            format="hex" 
            onChange={handleColorChange}
            showText
          />
        </Form.Item>

        <Form.Item
          name="typicalDensity"
          label="Typical Density (g/cm³)"
          rules={[
            { type: 'number', min: 0.1, max: 2.0, message: 'Density must be between 0.1 and 2.0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="e.g., 0.85 for diesel"
            step={0.01}
            min={0.1}
            max={2.0}
          />
        </Form.Item>

        <Form.Item
          name="hazardClass"
          label="Hazard Class"
        >
          <Input placeholder="e.g., Class 3, Flammable Liquid" />
        </Form.Item>

        <Form.Item
          name="octaneRange"
          label="Octane Range"
        >
          <Input placeholder="e.g., 87-93, 95-98" />
        </Form.Item>

        <Form.Item
          name="sulfurMax"
          label="Max Sulfur Content (ppm)"
          rules={[
            { type: 'number', min: 0, message: 'Sulfur content must be positive' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="e.g., 10"
            step={0.1}
            min={0}
          />
        </Form.Item>

        <Form.Item
          name="flashPoint"
          label="Flash Point (°C)"
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="e.g., 55"
            step={0.1}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {category ? 'Update' : 'Create'} Category
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCategoryModal;