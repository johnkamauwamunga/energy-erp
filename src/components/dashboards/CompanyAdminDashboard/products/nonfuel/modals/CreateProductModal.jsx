// components/nonfuel/product/CreateProductModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Button, 
  Space, 
  Alert, 
  Steps, 
  Divider, 
  Row, 
  Col,
  Checkbox,
  message 
} from 'antd';
import { 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  CheckOutlined,
  ShoppingOutlined,
  TagOutlined,
  DollarOutlined,
  EyeOutlined,
  DatabaseOutlined,
  BoxPlotOutlined
} from '@ant-design/icons';
import { nonFuelService } from '../../../../../../services/nonFuelService/nonFuelService';

const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const CreateProductModal = ({ isOpen, onClose, onProductCreated, companyId, product = null }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEditMode = !!product;

  const steps = [
    { key: 'category', title: 'Category', icon: <BoxPlotOutlined /> },
    { key: 'details', title: 'Details', icon: <TagOutlined /> },
    { key: 'pricing', title: 'Pricing', icon: <DollarOutlined /> },
    { key: 'review', title: 'Review', icon: <CheckOutlined /> }
  ];

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        // Edit mode - populate form
        const transformed = nonFuelService.transformProductForForm(product);
        form.setFieldsValue(transformed);
        if (transformed.categoryId) {
          setSelectedCategoryId(transformed.categoryId);
          loadSubCategories(transformed.categoryId);
        }
      } else {
        // Create mode - reset
        form.resetFields();
        form.setFieldsValue({ 
          unit: 'PIECE',
          isBatchTracked: false,
          isSerialTracked: false 
        });
        setCurrentStep(0);
        setShowAdvanced(false);
      }
    }
  }, [isOpen, product, form]);

  const loadCategories = async () => {
    try {
      const response = await nonFuelService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSubCategories = async (categoryId) => {
    try {
      if (!categoryId) {
        setSubCategories([]);
        return;
      }
      const response = await nonFuelService.getSubCategories({ categoryId });
      setSubCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load sub-categories:', error);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    loadSubCategories(categoryId);
    form.setFieldsValue({ subCategoryId: undefined });
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Prepare data for submission
      const productData = nonFuelService.prepareProductForSubmit({
        ...values,
        companyId
      });

      if (isEditMode) {
        await nonFuelService.updateProduct({
          ...productData,
          id: product.id
        });
        message.success('Product updated successfully');
      } else {
        await nonFuelService.createProduct(productData);
        message.success('Product created successfully');
      }

      onProductCreated();
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save product');
      message.error(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryStep = () => (
    <div className="space-y-6">
      <Alert
        message="Select a category and optionally a sub-category"
        type="info"
        showIcon
      />
      
      <Form.Item
        name="categoryId"
        label="Category"
        rules={[{ required: true, message: 'Please select a category' }]}
      >
        <Select
          placeholder="Select category"
          onChange={handleCategoryChange}
          showSearch
          optionFilterProp="label"
        >
          {categories.map(cat => (
            <Option key={cat.id} value={cat.id} label={cat.name}>
              <div className="flex items-center">
                <DatabaseOutlined className="mr-2" />
                {cat.name}
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="subCategoryId"
        label="Sub-Category (Optional)"
      >
        <Select
          placeholder="Select sub-category (optional)"
          allowClear
          showSearch
          optionFilterProp="label"
          disabled={!selectedCategoryId}
        >
          {subCategories.map(sub => (
            <Option key={sub.id} value={sub.id} label={sub.name}>
              <div className="flex items-center">
                <BoxPlotOutlined className="mr-2" />
                {sub.name}
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <div className="text-gray-500 text-sm">
        <p>Tip: Products can be created directly under a category or within a sub-category for better organization.</p>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label="Product Name"
            rules={[
              { required: true, message: 'Please enter product name' },
              { max: 200, message: 'Name cannot exceed 200 characters' }
            ]}
          >
            <Input 
              placeholder="e.g., iPhone 14 Pro Max" 
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="variantName"
            label="Variant (Optional)"
            rules={[{ max: 100, message: 'Variant cannot exceed 100 characters' }]}
          >
            <Input 
              placeholder="e.g., 256GB, Midnight Black" 
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="description"
        label="Description"
        rules={[{ max: 1000, message: 'Description cannot exceed 1000 characters' }]}
      >
        <TextArea
          placeholder="Product description and specifications"
          rows={3}
          maxLength={1000}
          showCount
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="unit"
            label="Unit"
            initialValue="PIECE"
          >
            <Select>
              {nonFuelService.getUnitOptions().map(unit => (
                <Option key={unit.value} value={unit.value}>
                  {unit.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="brand"
            label="Brand"
            rules={[{ max: 100, message: 'Brand cannot exceed 100 characters' }]}
          >
            <Input placeholder="e.g., Apple, Samsung" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" className="cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
      </Divider>

      {showAdvanced && (
        <div className="space-y-6">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ max: 50, message: 'SKU cannot exceed 50 characters' }]}
              >
                <Input placeholder="Stock keeping unit" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="barcode"
                label="Barcode"
                rules={[{ max: 50, message: 'Barcode cannot exceed 50 characters' }]}
              >
                <Input placeholder="Barcode number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isBatchTracked" valuePropName="checked">
                <Checkbox>Track by Batch Number</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isSerialTracked" valuePropName="checked">
                <Checkbox>Track by Serial Number</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="modelNumber"
                label="Model Number"
                rules={[{ max: 50, message: 'Model number cannot exceed 50 characters' }]}
              >
                <Input placeholder="e.g., A2487" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="packSize"
                label="Pack Size"
                rules={[{ max: 50, message: 'Pack size cannot exceed 50 characters' }]}
              >
                <Input placeholder="e.g., 1 piece per box" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );

  const renderPricingStep = () => (
    <div className="space-y-6">
      <Alert
        message="Set pricing for your product. All fields are optional."
        type="info"
        showIcon
      />

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="baseCostPrice"
            label="Base Cost"
            rules={[
              { type: 'number', min: 0, message: 'Cost must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              step={0.01}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="minSellingPrice"
            label="Min Price"
            rules={[
              { type: 'number', min: 0, message: 'Price must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              step={0.01}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="maxSellingPrice"
            label="Max Price"
            rules={[
              { type: 'number', min: 0, message: 'Price must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              step={0.01}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
      </Row>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-800 mb-2">Pricing Validation</h5>
        <p className="text-blue-600 text-sm">
          Base Cost ≤ Min Price ≤ Max Price
        </p>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const values = form.getFieldsValue();
    const selectedCategory = categories.find(c => c.id === values.categoryId);
    const selectedSubCategory = subCategories.find(s => s.id === values.subCategoryId);
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h5 className="font-medium mb-2">Basic Information</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Name</p>
                <p className="font-medium">{values.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Variant</p>
                <p className="font-medium">{values.variantName || 'None'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Category</p>
                <p className="font-medium">{selectedCategory?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Sub-Category</p>
                <p className="font-medium">{selectedSubCategory?.name || 'None'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Unit</p>
                <p className="font-medium">{values.unit || 'PIECE'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Brand</p>
                <p className="font-medium">{values.brand || 'None'}</p>
              </div>
            </div>
          </div>

          {values.baseCostPrice || values.minSellingPrice || values.maxSellingPrice ? (
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium mb-2">Pricing</h5>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Base Cost</p>
                  <p className="font-medium text-blue-600">
                    ${parseFloat(values.baseCostPrice || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Min Price</p>
                  <p className="font-medium text-green-600">
                    ${parseFloat(values.minSellingPrice || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Max Price</p>
                  <p className="font-medium text-orange-600">
                    ${parseFloat(values.maxSellingPrice || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <p className="text-yellow-800">⚠️ No pricing configured</p>
            </div>
          )}

          {values.description && (
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium mb-2">Description</h5>
              <p className="text-gray-700">{values.description}</p>
            </div>
          )}
        </div>

        <Alert
          message="Review all information before saving"
          type="info"
          showIcon
        />
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderCategoryStep();
      case 1: return renderDetailsStep();
      case 2: return renderPricingStep();
      case 3: return renderReviewStep();
      default: return null;
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center">
          <ShoppingOutlined className="mr-2" />
          {isEditMode ? 'Edit Non-Fuel Product' : 'Create Non-Fuel Product'}
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={800}
      footer={null}
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

      <Steps current={currentStep} className="mb-6">
        {steps.map(step => (
          <Step key={step.key} title={step.title} icon={step.icon} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        size="large"
      >
        {renderStepContent()}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button 
            onClick={currentStep === 0 ? onClose : handlePrev}
            disabled={loading}
            icon={<ArrowLeftOutlined />}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          
          <Space>
            {currentStep < steps.length - 1 ? (
              <Button 
                type="primary" 
                onClick={handleNext}
                icon={<ArrowRightOutlined />}
                loading={loading}
              >
                Next
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
                icon={<CheckOutlined />}
              >
                {isEditMode ? 'Update Product' : 'Create Product'}
              </Button>
            )}
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateProductModal;