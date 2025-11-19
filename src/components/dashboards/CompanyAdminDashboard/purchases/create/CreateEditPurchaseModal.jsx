// src/components/purchases/create/CreateEditPurchaseModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Input, 
  Select, 
  Card, 
  Alert,
  Badge,
  Form,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  MinusOutlined, 
  TruckOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { purchaseService } from '../../../../../services/purchaseService/purchaseService';
import { supplierService } from '../../../../../services/supplierService/supplierService';
import { fuelService } from '../../../../../services/fuelService/fuelService';
import {stationService} from '../../../../../services/stationService/stationService';
import { useApp } from '../../../../../context/AppContext';

const { Option } = Select;
const { Text } = Typography;

const CreateEditPurchaseModal = ({ isOpen, onClose, purchase, onPurchaseCreated, onPurchaseUpdated }) => {
  const { state } = useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [suppliers, setSuppliers] = useState([]);
  const [fuelProducts, setFuelProducts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [stations, setStations]=useState([]);

 
  
  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseDate: '',
    expectedDate: '',
    type: 'FUEL',
    deliveryAddress: '',
    termsAndConditions: '',
    items: []
  });

  // Format date for input[type="date"]
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Format date for backend (ISO string)
  const formatDateForBackend = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toISOString();
  };

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const expectedDate = new Date();
      expectedDate.setDate(today.getDate() + 7); // Default to 7 days from now

      if (purchase) {
        // Edit mode - populate with existing purchase data
        setFormData({
          supplierId: purchase.supplierId || '',
          purchaseDate: formatDateForInput(purchase.purchaseDate),
          expectedDate: formatDateForInput(purchase.expectedDate),
          type: purchase.type || 'FUEL',
          deliveryAddress: purchase.deliveryAddress || '',
          termsAndConditions: purchase.termsAndConditions || '',
          items: purchase.items?.map(item => ({
            ...item,
            expiryDate: formatDateForInput(item.expiryDate)
          })) || []
        });
      } else {
        // Create mode - set defaults
        setFormData({
          supplierId: '',
          purchaseDate: formatDateForInput(today),
          expectedDate: formatDateForInput(expectedDate),
          type: 'FUEL',
          deliveryAddress: '',
          termsAndConditions: '',
          items: []
        });
      }
      loadInitialData();
    }
  }, [isOpen, purchase]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [suppliersData, productsData, stationData ] = await Promise.all([
        supplierService.getSuppliers(true),
        fuelService.getFuelProducts(),
        stationService.getCompanyStations()
      ]);
      
      setSuppliers(suppliersData);
      console.log("stations ", stationData);
      setFuelProducts(productsData.products || productsData || []);
       console.log("products ", productsData);
      setStations(stationData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load suppliers and products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.supplierId) {
      loadSupplierProducts(formData.supplierId);
    } else {
      setSupplierProducts([]);
    }
  }, [formData.supplierId]);

  const loadSupplierProducts = async (supplierId) => {
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier && supplier.supplierProducts) {
        setSupplierProducts(supplier.supplierProducts);
      } else {
        setSupplierProducts(fuelProducts);
      }
    } catch (error) {
      console.error('Failed to load supplier products:', error);
      setSupplierProducts(fuelProducts);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: '',
          orderedQty: 1,
          unitCost: 0,
          taxRate: 0.16,
          batchNumber: '',
          expiryDate: ''
        }
      ]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { 
          ...item, 
          [field]: field === 'orderedQty' || field === 'unitCost' || field === 'taxRate' 
            ? parseFloat(value) || 0 
            : value 
        } : item
      )
    }));
  };

  const calculateItemTotals = (item) => {
    const orderedQty = parseFloat(item.orderedQty) || 0;
    const unitCost = parseFloat(item.unitCost) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    
    const grossAmount = orderedQty * unitCost;
    const taxAmount = grossAmount * taxRate;
    const netAmount = grossAmount + taxAmount;
    
    return { grossAmount, taxAmount, netAmount };
  };

  const calculatePurchaseTotals = () => {
    let grossAmount = 0;
    let totalTaxAmount = 0;
    
    formData.items.forEach(item => {
      const totals = calculateItemTotals(item);
      grossAmount += totals.grossAmount;
      totalTaxAmount += totals.taxAmount;
    });
    
    const netPayable = grossAmount + totalTaxAmount;
    
    return {
      grossAmount: parseFloat(grossAmount.toFixed(2)),
      totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
      netPayable: parseFloat(netPayable.toFixed(2))
    };
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.supplierId) {
      errors.push('Supplier is required');
    }
    
    if (!formData.purchaseDate) {
      errors.push('Purchase date is required');
    }
    
    if (formData.items.length === 0) {
      errors.push('At least one product item is required');
    }
    
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Product is required for item ${index + 1}`);
      }
      if (!item.orderedQty || item.orderedQty <= 0) {
        errors.push(`Valid quantity is required for item ${index + 1}`);
      }
      if (!item.unitCost || item.unitCost < 0) {
        errors.push(`Valid unit cost is required for item ${index + 1}`);
      }
    });
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    // if (!validateForm()) {
    //   return;
    // }

    try {
      setSubmitting(true);
      setError('');

      // Prepare data for backend with proper date formatting
      const purchaseData = {
        supplierId: formData.supplierId,
        stationId:formData.stationId,
        purchaseDate: formatDateForBackend(formData.purchaseDate),
        expectedDate: formData.expectedDate ? formatDateForBackend(formData.expectedDate) : null,
        type: formData.type,
        deliveryAddress: formData.deliveryAddress || null,
        termsAndConditions: formData.termsAndConditions || null,
        items: formData.items.map(item => ({
          productId: item.productId,
          orderedQty: parseFloat(item.orderedQty),
          unitCost: parseFloat(item.unitCost),
          taxRate: parseFloat(item.taxRate),
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate ? formatDateForBackend(item.expiryDate) : null
        })),
        ...calculatePurchaseTotals()
      };

      console.log('Submitting purchase data:', purchaseData);

      let result;
      if (purchase) {
        result = await purchaseService.updatePurchase(purchase.id, purchaseData);
        onPurchaseUpdated(result);
      } else {
        result = await purchaseService.createPurchase(purchaseData);
        onPurchaseCreated(result);
      }
      
      onClose();
      
      // Reset form
      setFormData({
        supplierId: '',
        purchaseDate: formatDateForInput(new Date()),
        expectedDate: formatDateForInput(new Date(new Date().setDate(new Date().getDate() + 7))),
        type: 'FUEL',
        deliveryAddress: '',
        termsAndConditions: '',
        items: []
      });
    } catch (error) {
      console.error('Failed to submit purchase:', error);
      setError(error.message || `Failed to ${purchase ? 'update' : 'create'} purchase order`);
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableProducts = () => {
    if (formData.supplierId && supplierProducts.length > 0) {
      return supplierProducts;
    }
    return fuelProducts;
  };

  const totals = calculatePurchaseTotals();

  const modalFooter = [
    <Button key="cancel" onClick={onClose} disabled={submitting}>
      Cancel
    </Button>,
    <Button
      key="submit"
      type="primary"
      loading={submitting}
      disabled={formData.items.length === 0 || submitting}
      icon={<TruckOutlined />}
      onClick={handleSubmit}
    >
      {purchase ? 'Update Purchase Order' : 'Create Purchase Order'}
    </Button>
  ];

  if (loading) {
    return (
      <Modal
        open={isOpen}
        onCancel={onClose}
        title={purchase ? "Edit Purchase Order" : "Create Purchase Order"}
        width={1200}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px', color: '#666' }}>Loading suppliers and products...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space>
          <TruckOutlined />
          {purchase ? "Edit Purchase Order" : "Create Purchase Order"}
        </Space>
      }
      width={1200}
      style={{ top: 20 }}
      footer={modalFooter}
    >
      <Form form={form} layout="vertical">
        {error && (
          <Alert
            message="Validation Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" type="text" onClick={() => setError('')}>
                Dismiss
              </Button>
            }
          />
        )}

        <Card title="Purchase Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Supplier" required>
                <Select
                  value={formData.supplierId}
                  onChange={(value) => handleFormChange('supplierId', value)}
                  placeholder="Select Supplier"
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  <Option value="">Select Supplier</Option>
                  {suppliers.map(supplier => (
                    <Option key={supplier.id} value={supplier.id}>
                      {supplier.name} {supplier.code ? `(${supplier.code})` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Purchase Type" required>
                <Select
                  value={formData.type}
                  onChange={(value) => handleFormChange('type', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="FUEL">Fuel</Option>
                  <Option value="NON_FUEL">Non-Fuel</Option>
                  <Option value="MIXED">Mixed</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Purchase Date" required>
                <Input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => handleFormChange('purchaseDate', e.target.value)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Expected Delivery Date">
                <Input
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => handleFormChange('expectedDate', e.target.value)}
                  min={formData.purchaseDate}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card 
          title={
            <Space>
              <ShoppingOutlined />
              Products
              <Badge count={formData.items.length} showZero color="#1890ff" />
            </Space>
          }
          extra={
            <Button
              type="dashed"
              onClick={addItem}
              icon={<PlusOutlined />}
              size="small"
            >
              Add Product
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          {formData.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
              <ShoppingOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
              <div>No products added yet</div>
              <Text type="secondary">Click "Add Product" to start adding products</Text>
            </div>
          ) : (
            <div style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
              {formData.items.map((item, index) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ backgroundColor: '#fafafa' }}
                  title={`Product #${index + 1}`}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<MinusOutlined />}
                      onClick={() => removeItem(index)}
                      size="small"
                    >
                      Remove
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Product" required>
                        <Select
                          value={item.productId}
                          onChange={(value) => updateItem(index, 'productId', value)}
                          placeholder="Select Product"
                          style={{ width: '100%' }}
                          showSearch
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          <Option value="">Select Product</Option>
                          {getAvailableProducts().map(product => (
                            <Option key={product.id} value={product.id}>
                              {/* {product.name} {product.fuelCode ? `(${product.fuelCode})` : ''} */}
                              {product?.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col span={6}>
                      <Form.Item label="Quantity" required>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.orderedQty}
                          onChange={(e) => updateItem(index, 'orderedQty', e.target.value)}
                          placeholder="0.00"
                        />
                      </Form.Item>
                    </Col>

                    <Col span={6}>
                      <Form.Item label="Unit Cost" required>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                          placeholder="0.00"
                          prefix="Ksh"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Tax Rate">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                          placeholder="0.16"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Batch Number">
                        <Input
                          value={item.batchNumber}
                          onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                          placeholder="Optional"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Expiry Date">
                        <Input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                          placeholder="Optional"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {item.productId && item.orderedQty > 0 && (
                    <Card size="small" style={{ marginTop: 8, backgroundColor: 'white' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <div style={{ textAlign: 'center' }}>
                            <Text type="secondary">Gross Amount</Text>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                              Ksh {calculateItemTotals(item).grossAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div style={{ textAlign: 'center' }}>
                            <Text type="secondary">Tax Amount</Text>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                              Ksh {calculateItemTotals(item).taxAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div style={{ textAlign: 'center' }}>
                            <Text type="secondary">Net Amount</Text>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#52c41a' }}>
                              Ksh {calculateItemTotals(item).netAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>

        {formData.items.length > 0 && (
          <Card title="Purchase Summary" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Items"
                  value={formData.items.length}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<ShoppingOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Gross Amount"
                  value={totals.grossAmount}
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                  prefix="Ksh"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Total Tax"
                  value={totals.totalTaxAmount}
                  precision={2}
                  valueStyle={{ color: '#fa8c16' }}
                  prefix="Ksh"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Net Payable"
                  value={totals.netPayable}
                  precision={2}
                  valueStyle={{ color: '#722ed1' }}
                  prefix="Ksh"
                />
              </Col>
            </Row>
          </Card>
        )}

        <Card title="Additional Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>

{/* stations */}
            <Col span={24}>
              <Form.Item label="Deliverly Station" required>
                <Select
                  value={formData.stationId}
                 onChange={(value) => handleFormChange('stationId', value)}
                  placeholder="Select Station"
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  <Option value="">Select Station</Option>
                  {stations.map(station => (
                    <Option key={station.id} value={station.id}>
                      {station.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Delivery Address">
                <Input.TextArea
                  rows={3}
                  value={formData.deliveryAddress}
                  onChange={(e) => handleFormChange('deliveryAddress', e.target.value)}
                  placeholder="Enter delivery address if different from station address"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Terms & Conditions">
                <Input.TextArea
                  rows={2}
                  value={formData.termsAndConditions}
                  onChange={(e) => handleFormChange('termsAndConditions', e.target.value)}
                  placeholder="Any special terms and conditions for this purchase"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Modal>
  );
};

export default CreateEditPurchaseModal;