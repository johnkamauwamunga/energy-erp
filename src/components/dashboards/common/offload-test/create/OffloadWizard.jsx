// src/components/purchases/OffloadWizard.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  Alert,
  Table,
  Tag,
  List,
  Checkbox,
  message,
  DatePicker
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  TruckOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  DropboxOutlined,
  DollarOutlined,
  UserOutlined,
  PhoneOutlined,
  CarOutlined,
  CalendarOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { assetTopologyService } from '../../../../../services/assetTopologyService/assetTopologyService';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { OffloadService } from '../../../../../services/offloadService/offloadService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const OffloadWizard = ({ visible, purchase, onClose, onComplete, stationId, userId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [selectedTanks, setSelectedTanks] = useState([]);
  const [connectedPumpsMap, setConnectedPumpsMap] = useState({});
  const [topologyLoading, setTopologyLoading] = useState(false);
  const [productBaseCost, setProductBaseCost] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [currentShiftId, setCurrentShiftId] = useState("");
  
  // Single source of truth for all form data
  const [formData, setFormData] = useState({
    // Step 0: Delivery Information
    supplierInvoiceNumber: '',
    supplierInvoiceDate: null,
    supplierInvoiceAmount: null,
    currency: 'KES',
    driverName: '',
    driverPhone: '',
    deliveryVehiclePlate: '',
    deliveryCompany: '',
    notes: '',
    
    // Step 1: Tank Data (dynamic fields)
    tankData: {},
    
    // Step 2: Quality Check
    hasQualityIssues: false,
    qualityNotes: ''
  });

  // Separate forms for each step to prevent conflicts
  const [formStep0] = Form.useForm();
  const [formStep1] = Form.useForm();
  const [formStep2] = Form.useForm();

  // Get current form based on step
  const getCurrentForm = () => {
    switch (currentStep) {
      case 0: return formStep0;
      case 1: return formStep1;
      case 2: return formStep2;
      default: return formStep0;
    }
  };

  // Fetch tanks with topology data
  useEffect(() => {
    const fetchShift = async () => {
      try {
        const result = await shiftService.getOpenShift(stationId);
        console.log("✅ Open shift check result:", result);
        setCurrentShiftId(result?.id);
      } catch (error) {
        console.error("❌ Error fetching shift:", error);
      }
    };

    const fetchTanksWithTopology = async () => {
      if (visible && purchase && stationId) {
        setTopologyLoading(true);
        try {
          console.log('🔄 Fetching topology for station:', stationId);
          console.log('📦 Purchase product:', purchase.items[0]?.product);
          
          const topologyResult = await assetTopologyService.getTanksWithPumpsAndProducts(stationId);
          console.log('🏗️ Full topology result:', topologyResult);
          
          if (topologyResult.success) {
            const topologyTanks = topologyResult.data?.tanks || [];
            const purchaseProductId = purchase.items[0]?.product?.id;
            
            console.log('🎯 Looking for product ID:', purchaseProductId);
            
            // Filter tanks that match the purchase product
            const compatibleTanks = topologyTanks.filter(tank => {
              const matches = tank.product?.id === purchaseProductId;
              return matches;
            });
            
            console.log('✅ Compatible tanks found:', compatibleTanks);
            setTanks(compatibleTanks);
            
            // Set product pricing from the first compatible tank
            if (compatibleTanks.length > 0 && compatibleTanks[0].product) {
              if (compatibleTanks[0].product.baseCostPrice) {
                setProductBaseCost(compatibleTanks[0].product.baseCostPrice);
              }
              if (compatibleTanks[0].product.minSellingPrice) {
                setSellingPrice(compatibleTanks[0].product.minSellingPrice);
              }
            }
            
            // Pre-build connected pumps map
            const pumpsMap = {};
            compatibleTanks.forEach(tank => {
              if (tank.connectedPumps && Array.isArray(tank.connectedPumps)) {
                pumpsMap[tank.id] = tank.connectedPumps.map(pump => ({
                  ...pump,
                  product: pump.product || tank.product
                }));
              }
            });
            setConnectedPumpsMap(pumpsMap);
          }
        } catch (error) {
          console.error('❌ Error fetching topology:', error);
          message.error('Failed to load tank topology');
        } finally {
          setTopologyLoading(false);
        }
      }
    };

    fetchTanksWithTopology();
    fetchShift();
  }, [visible, purchase, stationId]);

  // Reset everything when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentStep(0);
      setSelectedTanks([]);
      setFormData({
        supplierInvoiceNumber: '',
        supplierInvoiceDate: null,
        supplierInvoiceAmount: null,
        currency: 'KES',
        driverName: '',
        driverPhone: '',
        deliveryVehiclePlate: '',
        deliveryCompany: purchase?.supplier?.name || '',
        notes: '',
        tankData: {},
        hasQualityIssues: false,
        qualityNotes: ''
      });
      formStep0.resetFields();
      formStep1.resetFields();
      formStep2.resetFields();
    }
  }, [visible, purchase, formStep0, formStep1, formStep2]);

  // Set form initial values when step changes
  useEffect(() => {
    const currentForm = getCurrentForm();
    
    switch (currentStep) {
      case 0:
        currentForm.setFieldsValue({
          supplierInvoiceNumber: formData.supplierInvoiceNumber,
          supplierInvoiceDate: formData.supplierInvoiceDate,
          supplierInvoiceAmount: formData.supplierInvoiceAmount,
          currency: formData.currency,
          driverName: formData.driverName,
          driverPhone: formData.driverPhone,
          deliveryVehiclePlate: formData.deliveryVehiclePlate,
          deliveryCompany: formData.deliveryCompany,
          notes: formData.notes
        });
        break;
      case 1:
        currentForm.setFieldsValue(formData.tankData);
        break;
      case 2:
        currentForm.setFieldsValue({
          hasQualityIssues: formData.hasQualityIssues,
          qualityNotes: formData.qualityNotes
        });
        break;
      default:
        break;
    }
  }, [currentStep, formData]);

  // Handle tank selection
  const handleTankSelection = (tankId, checked) => {
    if (checked) {
      setSelectedTanks(prev => [...prev, tankId]);
    } else {
      setSelectedTanks(prev => prev.filter(id => id !== tankId));
      // Clear tank data when deselected
      setFormData(prev => ({
        ...prev,
        tankData: {
          ...prev.tankData,
          [`beforeDip_${tankId}`]: undefined,
          [`afterDip_${tankId}`]: undefined,
          [`tankNotes_${tankId}`]: undefined,
          [`beforeNotes_${tankId}`]: undefined,
          [`afterNotes_${tankId}`]: undefined
        }
      }));
      
      // Also clear from form
      const fieldsToClear = [
        `beforeDip_${tankId}`, `afterDip_${tankId}`, `tankNotes_${tankId}`,
        `beforeNotes_${tankId}`, `afterNotes_${tankId}`
      ];
      
      const clearedValues = {};
      fieldsToClear.forEach(field => {
        clearedValues[field] = undefined;
      });
      
      formStep1.setFieldsValue(clearedValues);
    }
  };

  // Calculate liters from sales and selling price
  const calculateLitersFromSales = (salesValue) => {
    if (!salesValue || !sellingPrice || sellingPrice === 0) return 0;
    return salesValue / sellingPrice;
  };

  // Handle form value changes for each step
  const handleStep0ValuesChange = (changedValues, allValues) => {
    console.log('📝 Step 0 values changed:', changedValues);
    setFormData(prev => ({
      ...prev,
      ...allValues
    }));
  };

  const handleStep1ValuesChange = (changedValues, allValues) => {
    console.log('📝 Step 1 values changed:', changedValues);
    setFormData(prev => ({
      ...prev,
      tankData: allValues
    }));
  };

  const handleStep2ValuesChange = (changedValues, allValues) => {
    console.log('📝 Step 2 values changed:', changedValues);
    setFormData(prev => ({
      ...prev,
      ...allValues
    }));
  };

  // Get calculations for a specific tank
  const getTankCalculations = (tankId) => {
    const beforeDip = parseFloat(formData.tankData[`beforeDip_${tankId}`]) || 0;
    const afterDip = parseFloat(formData.tankData[`afterDip_${tankId}`]) || 0;
    const offloadedVolume = afterDip - beforeDip;

    return {
      beforeDip,
      afterDip,
      offloadedVolume: Math.max(offloadedVolume, 0)
    };
  };

  // Get pump calculations
  const getPumpCalculations = (pumpId) => {
    const salesValue = parseFloat(formData.tankData[`sales_${pumpId}`]) || 0;
    const liters = calculateLitersFromSales(salesValue);

    return {
      salesValue,
      liters
    };
  };

  // Validate step 1 before proceeding
  const validateStep1 = async () => {
    try {
      await formStep1.validateFields();
      
      // Additional validation: check that after dip is greater than before dip
      let hasValidationErrors = false;
      
      selectedTanks.forEach(tankId => {
        const beforeDip = formData.tankData[`beforeDip_${tankId}`];
        const afterDip = formData.tankData[`afterDip_${tankId}`];
        
        if (afterDip && beforeDip && afterDip <= beforeDip) {
          message.error(`After dip must be greater than before dip for tank ${tanks.find(t => t.id === tankId)?.name}`);
          hasValidationErrors = true;
        }
      });

      return !hasValidationErrors;
    } catch (error) {
      console.log('Form validation errors:', error);
      message.error('Please fill in all required fields correctly');
      return false;
    }
  };

  const handleNext = async () => {
    try {
      const currentForm = getCurrentForm();
      
      if (currentStep === 0) {
        await currentForm.validateFields();
        console.log('✅ Step 0 validated:', formData);
      } else if (currentStep === 1) {
        const isValid = await validateStep1();
        if (!isValid) return;
      }
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.log('Form validation errors:', error);
      message.error('Please fill in all required fields correctly');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // COMPLETE SUBMIT HANDLER
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      console.log('🎯 Final form data for submission:', formData);

      // Construct the payload
      const offloadPayload = {
        purchaseId: purchase.id,
        stationId: stationId,
        shiftId: currentShiftId,
        createdById: userId,
        
        // Supplier invoice details
        supplierInvoiceNumber: formData.supplierInvoiceNumber,
        supplierInvoiceDate: formData.supplierInvoiceDate?.toISOString(),
        supplierInvoiceAmount: formData.supplierInvoiceAmount,
        
        // Delivery information
        driverName: formData.driverName,
        driverPhone: formData.driverPhone || "",
        deliveryVehiclePlate: formData.deliveryVehiclePlate,
        deliveryCompany: formData.deliveryCompany || purchase.supplier?.name,
        
        // Additional info
        currency: formData.currency,
        notes: formData.notes,
        
        // Quality check
        qualityCheck: {
          hasQualityIssues: formData.hasQualityIssues || false,
          qualityNotes: formData.qualityNotes || "Product quality verified - within specifications",
          density: 0.845,
          temperature: 28.5
        },
        
        // Tank offloads
        tankOffloads: selectedTanks.map(tankId => {
          const tank = tanks.find(t => t.id === tankId);
          const calculations = getTankCalculations(tankId);
          const connectedPumps = connectedPumpsMap[tankId] || [];
          
          return {
            tankId: tank.id,
            expectedVolume: calculations.offloadedVolume,
            actualVolume: calculations.offloadedVolume,
            
            // Dip readings
            dipBefore: {
              dipValue: (calculations.beforeDip / 1000),
              volume: calculations.beforeDip,
              temperature: 28.0,
              waterLevel: 0.0,
              density: 0.845,
              notes: formData.tankData[`beforeNotes_${tankId}`] || "Pre-delivery dip reading"
            },
            
            dipAfter: {
              dipValue: (calculations.afterDip / 1000),
              volume: calculations.afterDip,
              temperature: 28.5,
              waterLevel: 0.0,
              density: 0.845,
              notes: formData.tankData[`afterNotes_${tankId}`] || "Post-delivery dip reading"
            },
            
            // Enhanced tank data
            density: 0.845,
            temperature: 28.5,
            waterLevelBefore: 0.0,
            waterLevelAfter: 0.0,
            notes: formData.tankData[`tankNotes_${tankId}`] || `Delivery to ${tank.name}`,
            
            // Pump sales data
            pumpSales: connectedPumps.map(pump => {
              const pumpCalculations = getPumpCalculations(pump.id);
              
              return {
                pumpId: pump.id,
                salesValue: pumpCalculations.salesValue,
                unitPrice: sellingPrice,
                litersDispensed: pumpCalculations.liters,
                recordedById: userId,
                recordedAt: new Date().toISOString()
              };
            }).filter(sale => sale.salesValue > 0)
          };
        })
      };

      console.log('🚚 ========== COMPLETE OFFLOAD PAYLOAD ==========');
      console.log('📦 Payload Object:', offloadPayload);
      console.log('📊 Payload JSON:', JSON.stringify(offloadPayload, null, 2));
      console.log('============================================');

      // Call the API service
      const response = await OffloadService.createFuelOffload(offloadPayload);
      
      console.log('✅ Offload created successfully:', response);
      
      message.success('Fuel offload recorded successfully!');
      
      onComplete({
        success: true,
        message: 'Fuel offload recorded successfully',
        offloadId: response.id || response.purchaseReceiving?.id,
        data: response
      });
      
      onClose();
      
    } catch (error) {
      console.error('❌ Error submitting offload:', error);
      message.error(error.message || 'Failed to complete offload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!purchase) return null;

  const mainProduct = purchase.items[0]?.product;
  const totalOrdered = purchase.items.reduce((sum, item) => sum + (item.orderedQty || 0), 0);
  const totalReceived = purchase.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
  const remainingQuantity = totalOrdered - totalReceived;

  const steps = [
    { title: 'Purchase Info', icon: <FileTextOutlined /> },
    { title: 'Tank & Pump Data', icon: <DatabaseOutlined /> },
    { title: 'Quality Check', icon: <ExperimentOutlined /> },
    { title: 'Confirmation', icon: <CheckCircleOutlined /> },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Card 
              title="📋 Purchase Information" 
              size="small"
              style={{ borderLeft: '4px solid #1890ff' }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Purchase Number"
                    value={purchase.purchaseNumber}
                    valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Supplier"
                    value={purchase.supplier?.name}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Product"
                    value={mainProduct?.name}
                    valueStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Ordered Quantity"
                    value={totalOrdered}
                    suffix="L"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Remaining"
                    value={remainingQuantity}
                    suffix="L"
                    valueStyle={{ 
                      color: remainingQuantity > 0 ? '#1890ff' : '#52c41a',
                      fontWeight: 'bold'
                    }}
                  />
                </Col>
              </Row>
              
              {productBaseCost > 0 && sellingPrice > 0 && (
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Alert
                      message={
                        <Space>
                          <DollarOutlined />
                          <Text strong>Product Pricing:</Text>
                          <Tag color="blue">Base Cost: KSH {productBaseCost}</Tag>
                          <Tag color="green">Selling Price: KSH {sellingPrice}</Tag>
                        </Space>
                      }
                      type="info"
                      showIcon
                    />
                  </Col>
                </Row>
              )}
            </Card>

            <Card 
              title="📦 Purchase Items" 
              size="small"
              style={{ borderLeft: '4px solid #52c41a' }}
            >
              <Table
                dataSource={purchase.items}
                pagination={false}
                size="small"
                columns={[
                  { 
                    title: 'Product', 
                    dataIndex: ['product', 'name'], 
                    key: 'product',
                    render: (text) => <Text strong>{text}</Text>
                  },
                  { 
                    title: 'Ordered', 
                    dataIndex: 'orderedQty', 
                    key: 'orderedQty', 
                    render: qty => <Tag color="blue">{qty} L</Tag> 
                  },
                  { 
                    title: 'Received', 
                    dataIndex: 'receivedQty', 
                    key: 'receivedQty', 
                    render: qty => <Tag color={qty > 0 ? 'green' : 'default'}>{qty || 0} L</Tag> 
                  },
                  { 
                    title: 'Remaining', 
                    key: 'remaining', 
                    render: (_, item) => {
                      const remaining = item.orderedQty - (item.receivedQty || 0);
                      return <Tag color={remaining > 0 ? 'orange' : 'green'}>{remaining} L</Tag>;
                    } 
                  }
                ]}
              />
            </Card>

            <Card 
              title="🚚 Delivery Information" 
              size="small"
              style={{ borderLeft: '4px solid #faad14' }}
            >
              <Form 
                form={formStep0} 
                layout="vertical"
                onValuesChange={handleStep0ValuesChange}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="supplierInvoiceNumber"
                      label={
                        <Space>
                          <FileTextOutlined />
                          <Text>Supplier Invoice Number</Text>
                        </Space>
                      }
                      rules={[{ required: true, message: 'Please enter invoice number' }]}
                    >
                      <Input placeholder="e.g., INV-2024-001234" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="supplierInvoiceDate"
                      label={
                        <Space>
                          <CalendarOutlined />
                          <Text>Invoice Date</Text>
                        </Space>
                      }
                      rules={[{ required: true, message: 'Please select invoice date' }]}
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        size="large"
                        format="YYYY-MM-DD"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="supplierInvoiceAmount"
                      label={
                        <Space>
                          <DollarOutlined />
                          <Text>Invoice Amount (KES)</Text>
                        </Space>
                      }
                      rules={[{ required: true, message: 'Please enter invoice amount' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="Enter amount"
                        min={0}
                        step={1000}
                        precision={2}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="currency"
                      label="Currency"
                      initialValue="KES"
                    >
                      <Input disabled size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider />

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="driverName"
                      label={
                        <Space>
                          <UserOutlined />
                          <Text>Driver Name</Text>
                        </Space>
                      }
                      rules={[{ required: true, message: 'Please enter driver name' }]}
                    >
                      <Input placeholder="e.g., John Kamau" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="driverPhone"
                      label={
                        <Space>
                          <PhoneOutlined />
                          <Text>Driver Phone</Text>
                        </Space>
                      }
                    >
                      <Input placeholder="e.g., +254712345678" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="deliveryVehiclePlate"
                      label={
                        <Space>
                          <CarOutlined />
                          <Text>Vehicle Plate</Text>
                        </Space>
                      }
                      rules={[{ required: true, message: 'Please enter vehicle plate' }]}
                    >
                      <Input placeholder="e.g., KCA 123A" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="deliveryCompany"
                      label="Delivery Company"
                      initialValue={purchase.supplier?.name}
                    >
                      <Input placeholder="Delivery company name" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="notes"
                  label="Additional Notes"
                >
                  <TextArea
                    placeholder="Enter any additional notes about the delivery..."
                    rows={3}
                  />
                </Form.Item>
              </Form>
            </Card>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <Card 
              title={
                <Space>
                  <DatabaseOutlined style={{ color: '#1890ff' }} />
                  <Text strong>Tank Dip Readings & Pump Sales</Text>
                  {topologyLoading && <Tag color="blue">Loading topology...</Tag>}
                </Space>
              } 
              size="small"
              loading={topologyLoading}
              style={{ borderLeft: '4px solid #1890ff' }}
            >
              <Alert
                message="Select tanks and enter dip readings before/after offload with pump sales"
                description="Choose tanks, enter dip readings, and record sales from connected pumps during the offload period."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              {sellingPrice > 0 && (
                <Alert
                  message={`Using selling price: KSH ${sellingPrice} per liter`}
                  type="info"
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form 
                form={formStep1} 
                layout="vertical"
                onValuesChange={handleStep1ValuesChange}
              >
                <Row gutter={[16, 16]}>
                  {tanks.map(tank => (
                    <Col span={24} key={tank.id}>
                      <Card 
                        type="inner" 
                        size="small" 
                        style={{ 
                          border: selectedTanks.includes(tank.id) ? '2px solid #52c41a' : '1px solid #d9d9d9',
                          backgroundColor: selectedTanks.includes(tank.id) ? '#f6ffed' : '#fff'
                        }}
                        title={
                          <Space>
                            <Checkbox
                              onChange={(e) => handleTankSelection(tank.id, e.target.checked)}
                              checked={selectedTanks.includes(tank.id)}
                              style={{ transform: 'scale(1.2)' }}
                            >
                              <Space>
                                <DatabaseOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                                <Text strong style={{ fontSize: '16px' }}>{tank.name}</Text>
                              </Space>
                            </Checkbox>
                            <Tag color="blue" style={{ fontSize: '12px' }}>
                              Capacity: {tank.capacity?.toLocaleString()}L
                            </Tag>
                            <Tag color="green" style={{ fontSize: '12px' }}>
                              Current: {(tank.currentVolume || 0).toLocaleString()}L
                            </Tag>
                            {tank.connectedPumps && (
                              <Tag color="orange" style={{ fontSize: '12px' }}>
                                {tank.connectedPumps.length} Pumps
                              </Tag>
                            )}
                          </Space>
                        }
                      >
                        {selectedTanks.includes(tank.id) && (
                          <Row gutter={24}>
                            <Col span={12}>
                              <Card 
                                title={
                                  <Space>
                                    <DatabaseOutlined />
                                    <Text>Tank Dip Readings</Text>
                                  </Space>
                                }
                                size="small"
                                style={{ borderLeft: '3px solid #1890ff' }}
                              >
                                <Row gutter={16}>
                                  <Col span={12}>
                                    <Form.Item
                                      name={`beforeDip_${tank.id}`}
                                      label="Before Offload (Liters)"
                                      rules={[
                                        { required: true, message: 'Enter dip reading before offload' },
                                        { type: 'number', min: 0, message: 'Must be positive' }
                                      ]}
                                    >
                                      <InputNumber
                                        style={{ width: '100%' }}
                                        placeholder="Before volume"
                                        min={0}
                                        step={100}
                                        size="large"
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item
                                      name={`afterDip_${tank.id}`}
                                      label="After Offload (Liters)"
                                      rules={[
                                        { required: true, message: 'Enter dip reading after offload' },
                                        { type: 'number', min: 0, message: 'Must be positive' }
                                      ]}
                                    >
                                      <InputNumber
                                        style={{ width: '100%' }}
                                        placeholder="After volume"
                                        min={0}
                                        step={100}
                                        size="large"
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>

                                <Row gutter={16}>
                                  <Col span={12}>
                                    <Form.Item
                                      name={`beforeNotes_${tank.id}`}
                                      label="Before Offload Notes"
                                    >
                                      <TextArea
                                        placeholder="Notes before offload..."
                                        rows={2}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item
                                      name={`afterNotes_${tank.id}`}
                                      label="After Offload Notes"
                                    >
                                      <TextArea
                                        placeholder="Notes after offload..."
                                        rows={2}
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                                
                                <Form.Item
                                  name={`tankNotes_${tank.id}`}
                                  label="General Tank Notes"
                                >
                                  <TextArea
                                    placeholder={`Enter general notes for ${tank.name}...`}
                                    rows={2}
                                  />
                                </Form.Item>
                                
                                <Divider />
                                
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <Text strong>Calculations:</Text>
                                  <Row gutter={8}>
                                    <Col span={12}>
                                      <Text>Before Dip:</Text>
                                    </Col>
                                    <Col span={12}>
                                      <Text strong>{getTankCalculations(tank.id).beforeDip} L</Text>
                                    </Col>
                                  </Row>
                                  <Row gutter={8}>
                                    <Col span={12}>
                                      <Text>After Dip:</Text>
                                    </Col>
                                    <Col span={12}>
                                      <Text strong>{getTankCalculations(tank.id).afterDip} L</Text>
                                    </Col>
                                  </Row>
                                  <Row gutter={8}>
                                    <Col span={12}>
                                      <Text>Offloaded Volume:</Text>
                                    </Col>
                                    <Col span={12}>
                                      <Tag 
                                        color={getTankCalculations(tank.id).offloadedVolume > 0 ? 'green' : 'red'} 
                                        style={{ fontSize: '14px', fontWeight: 'bold' }}
                                      >
                                        {getTankCalculations(tank.id).offloadedVolume} L
                                      </Tag>
                                    </Col>
                                  </Row>
                                </Space>
                              </Card>
                            </Col>

                            <Col span={12}>
                              <Card 
                                title={
                                  <Space>
                                    <DropboxOutlined style={{ color: '#52c41a' }} />
                                    <Text>Pump Sales</Text>
                                    <Tag color="green">{(connectedPumpsMap[tank.id] || []).length} pumps</Tag>
                                  </Space>
                                }
                                size="small"
                                style={{ borderLeft: '3px solid #52c41a' }}
                              >
                                {(connectedPumpsMap[tank.id] || []).length > 0 ? (
                                  <List
                                    size="small"
                                    dataSource={connectedPumpsMap[tank.id] || []}
                                    renderItem={pump => {
                                      const calculations = getPumpCalculations(pump.id);
                                      return (
                                        <List.Item
                                          style={{ 
                                            padding: '12px 0',
                                            borderBottom: '1px solid #f0f0f0'
                                          }}
                                        >
                                          <div style={{ width: '100%' }}>
                                            <Row gutter={8} align="middle">
                                              <Col span={8}>
                                                <Space direction="vertical" size={0}>
                                                  <Space>
                                                    <DropboxOutlined style={{ color: '#faad14' }} />
                                                    <Text strong>{pump.name}</Text>
                                                  </Space>
                                                  {pump.island && (
                                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                                      {pump.island.name}
                                                    </Text>
                                                  )}
                                                </Space>
                                              </Col>
                                              <Col span={8}>
                                                <Form.Item
                                                  name={`sales_${pump.id}`}
                                                  label="Sales (KSH)"
                                                  style={{ marginBottom: 0 }}
                                                  rules={[
                                                    { required: false },
                                                    { type: 'number', min: 0, message: 'Must be positive' }
                                                  ]}
                                                >
                                                  <InputNumber
                                                    style={{ width: '100%' }}
                                                    placeholder="Sales amount"
                                                    min={0}
                                                    step={100}
                                                    precision={0}
                                                    size="small"
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col span={8}>
                                                <Space direction="vertical" size={0}>
                                                  <Text strong>{calculations.liters.toFixed(1)} L</Text>
                                                  <Text type="secondary" style={{ fontSize: '10px' }}>
                                                    @ KSH {sellingPrice}
                                                  </Text>
                                                </Space>
                                              </Col>
                                            </Row>
                                          </div>
                                        </List.Item>
                                      );
                                    }}
                                  />
                                ) : (
                                  <Alert
                                    message="No Connected Pumps"
                                    description="This tank has no pumps connected."
                                    type="info"
                                    showIcon
                                  />
                                )}
                              </Card>
                            </Col>
                          </Row>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>

                {tanks.length === 0 && !topologyLoading && (
                  <Alert
                    message="No Compatible Tanks Found"
                    description={`No tanks found for product "${mainProduct?.name}". Please check your station topology.`}
                    type="warning"
                    showIcon
                  />
                )}

                {selectedTanks.length === 0 && tanks.length > 0 && (
                  <Alert
                    message="No Tanks Selected"
                    description="Please select at least one tank to continue."
                    type="warning"
                    showIcon
                  />
                )}
              </Form>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Card 
              title={
                <Space>
                  <ExperimentOutlined style={{ color: '#faad14' }} />
                  <Text strong>Quality Check</Text>
                </Space>
              } 
              size="small"
              style={{ borderLeft: '4px solid #faad14' }}
            >
              <Alert
                message="Quality Assurance Check"
                description="Verify product quality and record any quality issues."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form 
                form={formStep2} 
                layout="vertical"
                onValuesChange={handleStep2ValuesChange}
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="hasQualityIssues"
                      valuePropName="checked"
                      label="Quality Issues Found?"
                    >
                      <Checkbox>Check if quality issues were detected</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="qualityNotes"
                  label="Quality Notes & Observations"
                >
                  <TextArea
                    placeholder="Enter quality observations, test results, or any issues detected..."
                    rows={4}
                  />
                </Form.Item>
              </Form>

              <Card 
                type="inner" 
                title="📊 Product Specifications Reference" 
                size="small"
                style={{ marginTop: 16, borderLeft: '3px solid #1890ff' }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Product" value={mainProduct?.name} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Expected Density" value="0.820 - 0.880" />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Temperature Range" value="15°C - 30°C" />
                  </Col>
                </Row>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    Standard specifications for {mainProduct?.name}. Default values will be used if not specified.
                  </Text>
                </div>
              </Card>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Alert
              message="Ready to Complete Offload"
              description="Please review all information before completing the offload process."
              type="info"
              showIcon
            />

            <Card 
              title="📊 Offload Summary" 
              size="small"
              style={{ borderLeft: '4px solid #52c41a' }}
            >
              <Card 
                type="inner" 
                title="🚚 Delivery Information" 
                size="small"
                style={{ marginBottom: 16, borderLeft: '3px solid #faad14' }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Invoice Number" value={formData.supplierInvoiceNumber} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Invoice Amount" value={`KSH ${formData.supplierInvoiceAmount}`} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Driver" value={formData.driverName} />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={8}>
                    <Text strong>Vehicle Plate:</Text> {formData.deliveryVehiclePlate}
                  </Col>
                  <Col span={8}>
                    <Text strong>Delivery Company:</Text> {formData.deliveryCompany}
                  </Col>
                  <Col span={8}>
                    <Text strong>Currency:</Text> {formData.currency || 'KES'}
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={8}>
                    <Text strong>Driver Phone:</Text> {formData.driverPhone || 'N/A'}
                  </Col>
                  <Col span={16}>
                    <Text strong>Invoice Date:</Text> {formData.supplierInvoiceDate ? new Date(formData.supplierInvoiceDate).toLocaleDateString() : 'N/A'}
                  </Col>
                </Row>
                {formData.notes && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong>Notes:</Text> {formData.notes}
                  </div>
                )}
              </Card>

              <Card 
                type="inner" 
                title="🔬 Quality Check Summary" 
                size="small"
                style={{ marginBottom: 16, borderLeft: '3px solid #faad14' }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic 
                      title="Quality Status" 
                      value={formData.hasQualityIssues ? "ISSUES FOUND" : "PASSED"} 
                      valueStyle={{ color: formData.hasQualityIssues ? '#ff4d4f' : '#52c41a' }}
                    />
                  </Col>
                  <Col span={16}>
                    <Text strong>Quality Notes:</Text> {formData.qualityNotes || "No quality issues reported"}
                  </Col>
                </Row>
              </Card>

              {selectedTanks.map(tankId => {
                const tank = tanks.find(t => t.id === tankId);
                const tankCalculations = getTankCalculations(tankId);
                const connectedPumps = connectedPumpsMap[tankId] || [];
                const totalPumpSales = connectedPumps.reduce((sum, pump) => {
                  const calc = getPumpCalculations(pump.id);
                  return sum + calc.salesValue;
                }, 0);

                return (
                  <Card 
                    key={tankId} 
                    type="inner" 
                    title={
                      <Space>
                        <DatabaseOutlined />
                        <Text strong>{tank?.name}</Text>
                      </Space>
                    } 
                    size="small" 
                    style={{ marginBottom: 16, borderLeft: '3px solid #1890ff' }}
                  >
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic 
                          title="Before Dip" 
                          value={tankCalculations.beforeDip} 
                          suffix="L" 
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic 
                          title="After Dip" 
                          value={tankCalculations.afterDip} 
                          suffix="L" 
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic 
                          title="Offloaded" 
                          value={tankCalculations.offloadedVolume} 
                          suffix="L" 
                          valueStyle={{ 
                            color: tankCalculations.offloadedVolume > 0 ? '#52c41a' : '#ff4d4f',
                            fontWeight: 'bold'
                          }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic 
                          title="Pump Sales" 
                          value={totalPumpSales} 
                          prefix="KSH" 
                          valueStyle={{ color: '#722ed1' }}
                        />
                      </Col>
                    </Row>

                    <div style={{ marginTop: 8 }}>
                      {formData.tankData[`beforeNotes_${tankId}`] && (
                        <div>
                          <Text strong>Before Notes:</Text> {formData.tankData[`beforeNotes_${tankId}`]}
                        </div>
                      )}
                      {formData.tankData[`afterNotes_${tankId}`] && (
                        <div style={{ marginTop: 4 }}>
                          <Text strong>After Notes:</Text> {formData.tankData[`afterNotes_${tankId}`]}
                        </div>
                      )}
                      {formData.tankData[`tankNotes_${tankId}`] && (
                        <div style={{ marginTop: 4 }}>
                          <Text strong>Tank Notes:</Text> {formData.tankData[`tankNotes_${tankId}`]}
                        </div>
                      )}
                    </div>

                    {connectedPumps.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong>Connected Pumps:</Text>{' '}
                        {connectedPumps.map(pump => {
                          const calc = getPumpCalculations(pump.id);
                          return calc.salesValue > 0 ? (
                            <Tag key={pump.id} color="blue" style={{ margin: '2px' }}>
                              {pump.name}: KSH {calc.salesValue || 0}
                            </Tag>
                          ) : null;
                        }).filter(Boolean)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <div>
          <TruckOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          <Text strong>Fuel Offload Wizard - {purchase.purchaseNumber}</Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
      destroyOnClose={true}
    >
      <Steps 
        current={currentStep} 
        style={{ marginBottom: 32 }}
        items={steps.map(step => ({
          title: step.title,
          icon: step.icon
        }))}
      />

      {renderStepContent()}

      <Divider />

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Space>
          {currentStep > 0 && (
            <Button onClick={handlePrev} icon={<ArrowLeftOutlined />} size="large">
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={handleNext} 
              icon={<ArrowRightOutlined />}
              size="large"
              disabled={currentStep === 1 && selectedTanks.length === 0}
            >
              Next
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button 
              type="primary" 
              loading={loading}
              onClick={handleSubmit}
              icon={<CheckCircleOutlined />}
              size="large"
            >
              Complete Offload
            </Button>
          )}
          <Button onClick={onClose} size="large">
            Cancel
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default OffloadWizard;