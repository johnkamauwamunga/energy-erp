// src/components/purchases/OffloadWizard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tag,
  List,
  Checkbox,
  message,
  DatePicker,
  Progress,
  Descriptions,
  Collapse,
  Tabs
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
  ExperimentOutlined,
  RocketOutlined,
  ShoppingCartOutlined,
  CodeOutlined,
  EyeOutlined,
  LoadingOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { assetTopologyService } from '../../../../../services/assetTopologyService/assetTopologyService';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { OffloadService } from '../../../../../services/offloadService/offloadService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// Steps for the wizard
const OFFLOAD_STEPS = [
  { title: 'Delivery Info', icon: <TruckOutlined /> },
  { title: 'Tank Selection', icon: <DatabaseOutlined /> },
  { title: 'Dip & Pump Data', icon: <DropboxOutlined /> },
  { title: 'Quality Check', icon: <ExperimentOutlined /> },
  { title: 'Confirm', icon: <CheckCircleOutlined /> }
];

const OffloadWizard = ({ visible, purchase, onClose, onComplete, stationId, userId }) => {
  // Loading states
  const [loading, setLoading] = useState(false);
  const [topologyLoading, setTopologyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [finalPayloads, setFinalPayloads] = useState([]);
  const [initialized, setInitialized] = useState(false);
  
  // Products from purchase
  const [products, setProducts] = useState([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [productJourneys, setProductJourneys] = useState({});
  const [submissionResults, setSubmissionResults] = useState([]);
  
  // Forms for each product
  const [deliveryForms, setDeliveryForms] = useState({});

  // Safe check for purchase data
  const hasValidPurchase = purchase && purchase.items && purchase.items.length > 0;

  // Current product and journey
  const currentProduct = products[currentProductIndex];
  const currentJourney = currentProduct && productJourneys[currentProduct.id] 
    ? productJourneys[currentProduct.id] 
    : null;

  // Initialize products from purchase
  useEffect(() => {
    if (hasValidPurchase && !initialized) {
      console.log('📦 Purchase data received:', purchase);
      
      const uniqueProducts = purchase.items.map(item => ({
        id: item.product?.id || `temp-${Math.random()}`,
        name: item.product?.name || 'Unknown Product',
        orderedQty: item.orderedQty || 0,
        receivedQty: item.receivedQty || 0,
        remainingQty: (item.orderedQty || 0) - (item.receivedQty || 0),
        baseCost: item.product?.baseCostPrice || 0,
        sellingPrice: item.product?.minSellingPrice || 0,
        itemId: item.id,
        supplier: purchase.supplier,
        currency: purchase.currency || 'KES'
      }));
      
      console.log('🛍️ Products extracted:', uniqueProducts);
      setProducts(uniqueProducts);
      
      // Initialize journeys for each product
      const initialJourneys = {};
      const initialForms = {};
      
      uniqueProducts.forEach((product, index) => {
        initialJourneys[product.id] = {
          productId: product.id,
          productName: product.name,
          step: 0,
          selectedTanks: [],
          tankData: {},
          connectedPumpsMap: {},
          qualityCheck: {
            hasQualityIssues: false,
            qualityNotes: ''
          },
          completed: false,
          tanks: [],
          deliveryInfo: {
            supplierInvoiceNumber: `INV-${purchase.purchaseNumber}-${index + 1}`,
            supplierInvoiceDate: dayjs(),
            supplierInvoiceAmount: product.orderedQty * product.baseCost,
            currency: product.currency || 'KES',
            driverName: '',
            driverPhone: '',
            deliveryVehiclePlate: '',
            deliveryCompany: product.supplier?.name || purchase.supplier?.name || '',
            notes: `Delivery for ${product.name}`
          }
        };
        
        initialForms[product.id] = React.createRef();
      });
      
      setProductJourneys(initialJourneys);
      setDeliveryForms(initialForms);
      setInitialized(true);
    }
  }, [purchase, hasValidPurchase, initialized]);

  // Fetch current shift
  useEffect(() => {
    const fetchShift = async () => {
      if (!stationId) {
        console.log('⚠️ No stationId provided, skipping shift fetch');
        return;
      }
      
      try {
        console.log('🔄 Fetching open shift for station:', stationId);
        const result = await shiftService.getOpenShift(stationId);
        
        if (result) {
          if (result.id) {
            setCurrentShiftId(result.id);
          } else if (result.data && result.data.id) {
            setCurrentShiftId(result.data.id);
          } else if (result.shiftId) {
            setCurrentShiftId(result.shiftId);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching shift:", error);
      }
    };
    
    if (visible && stationId) {
      fetchShift();
    }
  }, [visible, stationId]);

  // Fetch topology for current product
  useEffect(() => {
    const fetchTanksForProduct = async () => {
      if (!visible || !stationId || products.length === 0 || !currentProduct) return;
      
      setTopologyLoading(true);
      try {
        console.log(`🔄 Fetching topology for product: ${currentProduct.name}`);
        
        const topologyResult = await assetTopologyService.getTanksWithPumpsAndProducts(stationId);
        
        if (topologyResult?.success && topologyResult.data?.tanks) {
          const topologyTanks = topologyResult.data.tanks || [];
          
          // Filter tanks for current product
          const compatibleTanks = topologyTanks.filter(tank => 
            tank.product?.id === currentProduct.id
          );
          
          console.log(`✅ Found ${compatibleTanks.length} tanks for ${currentProduct.name}`);
          
          // Build pumps map
          const pumpsMap = {};
          compatibleTanks.forEach(tank => {
            if (tank.connectedPumps && Array.isArray(tank.connectedPumps)) {
              pumpsMap[tank.id] = tank.connectedPumps.map(pump => ({
                ...pump,
                product: pump.product || tank.product
              }));
            }
          });
          
          // Update journey with tanks data
          setProductJourneys(prev => {
            const currentJourney = prev[currentProduct.id] || {
              productId: currentProduct.id,
              productName: currentProduct.name,
              step: 0,
              selectedTanks: [],
              tankData: {},
              connectedPumpsMap: {},
              qualityCheck: { hasQualityIssues: false, qualityNotes: '' },
              completed: false,
              deliveryInfo: {
                supplierInvoiceNumber: `INV-${purchase.purchaseNumber}-${currentProductIndex + 1}`,
                supplierInvoiceDate: dayjs(),
                supplierInvoiceAmount: currentProduct.orderedQty * currentProduct.baseCost,
                currency: currentProduct.currency || 'KES',
                driverName: '',
                driverPhone: '',
                deliveryVehiclePlate: '',
                deliveryCompany: currentProduct.supplier?.name || purchase?.supplier?.name || '',
                notes: `Delivery for ${currentProduct.name}`
              }
            };
            
            return {
              ...prev,
              [currentProduct.id]: {
                ...currentJourney,
                tanks: compatibleTanks,
                connectedPumpsMap: pumpsMap
              }
            };
          });
        }
      } catch (error) {
        console.error('❌ Error fetching topology:', error);
        message.error(`Failed to load tanks for ${currentProduct.name}`);
      } finally {
        setTopologyLoading(false);
      }
    };

    fetchTanksForProduct();
  }, [visible, stationId, currentProductIndex, products, currentProduct, purchase]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      console.log('🔄 Resetting wizard state');
      setCurrentProductIndex(0);
      setProducts([]);
      setProductJourneys({});
      setDeliveryForms({});
      setShowPayloadPreview(false);
      setFinalPayloads([]);
      setSubmissionResults([]);
      setErrorMessage('');
      setInitialized(false);
    }
  }, [visible]);

  // Don't render if no valid purchase
  if (!hasValidPurchase) {
    return (
      <Modal
        title="Fuel Offload Wizard"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
      >
        <Alert
          message="No Purchase Data"
          description="Unable to load purchase information. Please try again."
          type="error"
          showIcon
        />
      </Modal>
    );
  }

  // Navigation helpers
  const goToNextProduct = () => {
    if (currentProductIndex < products.length - 1) {
      const nextIndex = currentProductIndex + 1;
      console.log(`➡️ Moving to next product: ${products[nextIndex].name}`);
      setCurrentProductIndex(nextIndex);
    }
  };

  const goToPrevProduct = () => {
    if (currentProductIndex > 0) {
      const prevIndex = currentProductIndex - 1;
      console.log(`⬅️ Moving to previous product: ${products[prevIndex].name}`);
      setCurrentProductIndex(prevIndex);
    }
  };

  const markCurrentProductComplete = () => {
    if (currentProduct) {
      console.log(`✅ Marking product ${currentProduct.name} as complete`);
      setProductJourneys(prev => ({
        ...prev,
        [currentProduct.id]: {
          ...prev[currentProduct.id],
          completed: true,
          step: OFFLOAD_STEPS.length - 1
        }
      }));
    }
  };

  // Update delivery info
  const updateDeliveryInfo = (values) => {
    if (!currentProduct) return;
    
    setProductJourneys(prev => ({
      ...prev,
      [currentProduct.id]: {
        ...prev[currentProduct.id],
        deliveryInfo: {
          ...prev[currentProduct.id].deliveryInfo,
          ...values
        }
      }
    }));
  };

  // Handle next step
  const handleNextStep = async () => {
    if (!currentJourney) return;
    
    const currentStep = currentJourney.step;
    
    // Validate based on step
    if (currentStep === 0) {
      // Validate delivery info
      const form = deliveryForms[currentProduct.id]?.current;
      if (form) {
        try {
          await form.validateFields();
        } catch (error) {
          message.error('Please complete all required delivery information');
          return;
        }
      }
    } else if (currentStep === 1) {
      // Validate tank selection
      if (!currentJourney.selectedTanks || currentJourney.selectedTanks.length === 0) {
        message.error('Please select at least one tank');
        return;
      }
    } else if (currentStep === 2) {
      // Validate dip readings
      const isValid = validateDipReadings();
      if (!isValid) return;
    }
    
    // Move to next step
    if (currentStep < OFFLOAD_STEPS.length - 1) {
      setProductJourneys(prev => ({
        ...prev,
        [currentProduct.id]: {
          ...prev[currentProduct.id],
          step: currentStep + 1
        }
      }));
    } else {
      // Last step - mark as complete
      markCurrentProductComplete();
      message.success(`${currentProduct.name} completed!`);
    }
  };

  const handlePrevStep = () => {
    if (!currentJourney) return;
    
    if (currentJourney.step > 0) {
      setProductJourneys(prev => ({
        ...prev,
        [currentProduct.id]: {
          ...prev[currentProduct.id],
          step: currentJourney.step - 1
        }
      }));
    }
  };

  // Validate dip readings
  const validateDipReadings = () => {
    if (!currentJourney) return false;
    
    let isValid = true;
    const errors = [];
    
    (currentJourney.selectedTanks || []).forEach(tankId => {
      const beforeDip = currentJourney.tankData[`beforeDip_${tankId}`];
      const afterDip = currentJourney.tankData[`afterDip_${tankId}`];
      const tank = (currentJourney.tanks || []).find(t => t.id === tankId);
      
      if (!beforeDip || beforeDip <= 0) {
        errors.push(`Before dip for ${tank?.name || 'tank'} is required`);
        isValid = false;
      }
      
      if (!afterDip || afterDip <= 0) {
        errors.push(`After dip for ${tank?.name || 'tank'} is required`);
        isValid = false;
      }
      
      if (beforeDip && afterDip && afterDip <= beforeDip) {
        errors.push(`After dip must be greater than before dip for ${tank?.name || 'tank'}`);
        isValid = false;
      }
    });
    
    if (errors.length > 0) {
      errors.forEach(error => message.error(error));
    }
    
    return isValid;
  };

  // Handle tank selection
  const handleTankSelection = (tankId, checked) => {
    if (!currentProduct || !currentJourney) return;
    
    setProductJourneys(prev => {
      const journey = prev[currentProduct.id];
      const selectedTanks = checked 
        ? [...(journey.selectedTanks || []), tankId]
        : (journey.selectedTanks || []).filter(id => id !== tankId);
      
      // Clear tank data if deselected
      const tankData = { ...(journey.tankData || {}) };
      if (!checked) {
        [
          `beforeDip_${tankId}`, `afterDip_${tankId}`, 
          `tankNotes_${tankId}`, `beforeNotes_${tankId}`, 
          `afterNotes_${tankId}`
        ].forEach(field => delete tankData[field]);
        
        const pumps = (journey.connectedPumpsMap || {})[tankId] || [];
        pumps.forEach(pump => {
          delete tankData[`sales_${pump.id}`];
        });
      }
      
      return {
        ...prev,
        [currentProduct.id]: {
          ...journey,
          selectedTanks,
          tankData
        }
      };
    });
  };

  // Handle tank data changes
  const handleTankDataChange = (field, value) => {
    if (!currentProduct) return;
    
    setProductJourneys(prev => ({
      ...prev,
      [currentProduct.id]: {
        ...prev[currentProduct.id],
        tankData: {
          ...(prev[currentProduct.id].tankData || {}),
          [field]: value
        }
      }
    }));
  };

  // Handle quality check changes
  const handleQualityChange = (field, value) => {
    if (!currentProduct) return;
    
    setProductJourneys(prev => ({
      ...prev,
      [currentProduct.id]: {
        ...prev[currentProduct.id],
        qualityCheck: {
          ...(prev[currentProduct.id].qualityCheck || {}),
          [field]: value
        }
      }
    }));
  };

  // Calculate liters from sales
  const calculateLitersFromSales = (salesValue, sellingPrice) => {
    if (!salesValue || !sellingPrice || sellingPrice === 0) return 0;
    return salesValue / sellingPrice;
  };

  // Get tank calculations
  const getTankCalculations = (tankId) => {
    if (!currentJourney) return { beforeDip: 0, afterDip: 0, offloadedVolume: 0 };
    
    const beforeDip = parseFloat(currentJourney.tankData?.[`beforeDip_${tankId}`]) || 0;
    const afterDip = parseFloat(currentJourney.tankData?.[`afterDip_${tankId}`]) || 0;
    
    return {
      beforeDip,
      afterDip,
      offloadedVolume: Math.max(afterDip - beforeDip, 0)
    };
  };

// Get pump calculations - FIXED
const getPumpCalculations = (pumpId) => {
  if (!currentJourney || !currentProduct) return { salesValue: 0, liters: 0 };
  
  // Use pumpId parameter correctly
  const salesValue = parseFloat(currentJourney.tankData?.[`sales_${pumpId}`]) || 0;
  const liters = calculateLitersFromSales(salesValue, currentProduct.sellingPrice);
  
  return { salesValue, liters };
};
  // Build payload for a SINGLE product (matches backend schema)
  const buildProductPayload = (productId) => {
    const journey = productJourneys[productId];
    const product = products.find(p => p.id === productId);
    
    if (!journey || !journey.completed || !product) {
      return null;
    }
    
    // Build tank offloads for this product
    const tankOffloads = (journey.selectedTanks || []).map(tankId => {
      const tank = (journey.tanks || []).find(t => t.id === tankId);
      const beforeDip = parseFloat(journey.tankData?.[`beforeDip_${tankId}`]) || 0;
      const afterDip = parseFloat(journey.tankData?.[`afterDip_${tankId}`]) || 0;
      const offloadedVolume = Math.max(afterDip - beforeDip, 0);
      const connectedPumps = (journey.connectedPumpsMap || {})[tankId] || [];
      
      // Build pump sales for this tank
      const pumpSales = connectedPumps
        .map(pump => {
          const salesValue = parseFloat(journey.tankData?.[`sales_${pump.id}`]) || 0;
          const liters = calculateLitersFromSales(salesValue, product.sellingPrice);
          
          if (salesValue <= 0) return null;
          
          return {
            pumpId: pump.id,
            salesValue: salesValue,
            unitPrice: product.sellingPrice,
            litersDispensed: liters,
            recordedById: userId,
            recordedAt: new Date().toISOString()
          };
        })
        .filter(Boolean);
      
      return {
        tankId: tank?.id || tankId,
        expectedVolume: offloadedVolume,
        actualVolume: offloadedVolume,
        
        dipBefore: {
          dipValue: beforeDip,
          volume: beforeDip,
          temperature: 28.0,
          waterLevel: 0.0,
          density: 0.845,
          notes: journey.tankData?.[`beforeNotes_${tankId}`] || "Pre-delivery dip reading"
        },
        
        dipAfter: {
          dipValue: afterDip,
          volume: afterDip,
          temperature: 28.5,
          waterLevel: 0.0,
          density: 0.845,
          notes: journey.tankData?.[`afterNotes_${tankId}`] || "Post-delivery dip reading"
        },
        
        density: 0.845,
        temperature: 28.5,
        waterLevelBefore: 0.0,
        waterLevelAfter: 0.0,
        notes: journey.tankData?.[`tankNotes_${tankId}`] || `Delivery to ${tank?.name || 'tank'}`,
        
        pumpSales: pumpSales
      };
    });
    
    // Only create payload if there are tank offloads
    if (tankOffloads.length === 0) {
      return null;
    }
    
    // Create payload matching backend schema
    return {
      purchaseId: purchase.id,
      stationId: stationId,
      shiftId: currentShiftId || null,
      createdById: userId,
      
      // Supplier Invoice Details
      supplierInvoiceNumber: journey.deliveryInfo?.supplierInvoiceNumber || '',
      supplierInvoiceDate: journey.deliveryInfo?.supplierInvoiceDate 
        ? (journey.deliveryInfo.supplierInvoiceDate.toISOString?.() || journey.deliveryInfo.supplierInvoiceDate)
        : new Date().toISOString(),
      supplierInvoiceAmount: parseFloat(journey.deliveryInfo?.supplierInvoiceAmount || 0),
      
      // Delivery Information
      driverName: journey.deliveryInfo?.driverName || '',
      driverPhone: journey.deliveryInfo?.driverPhone || '',
      deliveryVehiclePlate: journey.deliveryInfo?.deliveryVehiclePlate || '',
      deliveryCompany: journey.deliveryInfo?.deliveryCompany || product.supplier?.name || '',
      
      // Currency
      currency: journey.deliveryInfo?.currency || 'KES',
      
      // Notes
      notes: `Product: ${product.name}. ${journey.deliveryInfo?.notes || ''}`.trim(),
      
      // Tank Offloads (multiple tanks per offload)
      tankOffloads: tankOffloads,
      
      // Quality Check
      qualityCheck: {
        hasQualityIssues: journey.qualityCheck?.hasQualityIssues || false,
        qualityNotes: journey.qualityCheck?.qualityNotes || "Product quality verified",
        density: 0.845,
        temperature: 28.5
      }
    };
  };

  // Build all product payloads
  const buildAllPayloads = () => {
    console.log('🎯 Building payloads for all products...');
    
    const payloads = [];
    
    products.forEach(product => {
      const payload = buildProductPayload(product.id);
      if (payload) {
        // Add metadata for tracking
        payload._metadata = {
          productId: product.id,
          productName: product.name,
          productIndex: products.indexOf(product)
        };
        payloads.push(payload);
      }
    });
    
    console.log(`✅ Built ${payloads.length} separate offload payloads`);
    return payloads;
  };

  // Preview payloads
  const handlePreviewPayloads = () => {
    const payloads = buildAllPayloads();
    setFinalPayloads(payloads);
    setShowPayloadPreview(true);
  };

  // FINAL SUBMIT - Create separate offloads for each product
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage('');
      setSubmissionResults([]);
      
      console.log('🚀 ========== STARTING FINAL SUBMISSION ==========');
      
      // CRITICAL FIX: Auto-complete the current product if we're on the last step
      let updatedJourneys = { ...productJourneys };
      
      if (currentProduct && currentJourney) {
        // If we're on the last step (step 4) but not marked complete, mark it now
        if (currentJourney.step === OFFLOAD_STEPS.length - 1 && !currentJourney.completed) {
          console.log(`✅ Auto-completing current product ${currentProduct.name} before submission`);
          
          updatedJourneys = {
            ...updatedJourneys,
            [currentProduct.id]: {
              ...updatedJourneys[currentProduct.id],
              completed: true,
              step: OFFLOAD_STEPS.length - 1
            }
          };
          
          // Update state
          setProductJourneys(updatedJourneys);
        }
      }
      
      // Validate that all products have been processed using the updated journeys
      const allCompleted = products.every(product => {
        const isCompleted = updatedJourneys[product.id]?.completed === true;
        console.log(`🔍 Product ${product.name}: ${isCompleted ? '✅' : '❌'}`);
        return isCompleted;
      });
      
      console.log('🎯 All products completed?', allCompleted);
      
      if (!allCompleted) {
        const incompleteProducts = products
          .filter(p => !updatedJourneys[p.id]?.completed)
          .map(p => p.name)
          .join(', ');
        message.error(`Please complete all products before submitting: ${incompleteProducts}`);
        setSubmitting(false);
        return;
      }
      
      // Build all payloads using the updated journeys
      // Temporarily set productJourneys to updatedJourneys for payload building
      const originalJourneys = productJourneys;
      setProductJourneys(updatedJourneys);
      
      const payloads = buildAllPayloads();
      
      // Restore original journeys (though we already updated state)
      if (payloads.length === 0) {
        message.error('No valid offloads to submit');
        setSubmitting(false);
        return;
      }
      
      console.log('🚀 ========== PRODUCT PAYLOADS ==========');
      console.log(`📦 Total offloads to create: ${payloads.length}`);
      
      // Show preview
      setFinalPayloads(payloads);
      
      // Submit each product as a separate offload
      const results = [];
      const errors = [];
      
      for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        const productName = payload._metadata?.productName || `Product ${i + 1}`;
        
        console.log(`📤 Submitting offload ${i + 1}/${payloads.length} for ${productName}...`);
        
        try {
          // Show progress
          message.loading({ 
            content: `Processing ${productName} (${i + 1}/${payloads.length})...`, 
            key: 'offloadProgress',
            duration: 0 
          });
          
          // Remove metadata before sending
          const { _metadata, ...apiPayload } = payload;
          
          const response = await OffloadService.createFuelOffload(apiPayload);
          
          console.log(`✅ Offload ${i + 1} created successfully:`, response);
          
          results.push({
            productName,
            success: true,
            data: response,
            offloadId: response.id || response.purchaseReceiving?.id,
            payload: apiPayload
          });
          
          message.success({ 
            content: `${productName} offloaded successfully`, 
            key: 'offloadProgress',
            duration: 2 
          });
          
        } catch (error) {
          console.error(`❌ Error submitting offload for ${productName}:`, error);
          
          const errorMsg = error.message || error.response?.data?.message || 'Unknown error';
          
          errors.push({
            productName,
            error: errorMsg,
            payload: payload
          });
          
          message.error({ 
            content: `Failed to offload ${productName}: ${errorMsg}`, 
            key: 'offloadProgress',
            duration: 3 
          });
          
          // Ask user if they want to continue with remaining products
          if (i < payloads.length - 1) {
            const shouldContinue = await new Promise((resolve) => {
              Modal.confirm({
                title: `Error offloading ${productName}`,
                content: `Error: ${errorMsg}\n\nDo you want to continue with the remaining products?`,
                okText: 'Continue',
                cancelText: 'Stop',
                onOk: () => resolve(true),
                onCancel: () => resolve(false)
              });
            });
            
            if (!shouldContinue) {
              break;
            }
          }
        }
      }
      
      // Update submission results
      setSubmissionResults(results);
      
      // Final summary
      if (results.length > 0) {
        const successCount = results.length;
        const failCount = errors.length;
        
        if (failCount === 0) {
          message.success(`✅ All ${successCount} product(s) offloaded successfully!`);
        } else {
          message.warning(`⚠️ ${successCount} product(s) offloaded successfully, ${failCount} failed`);
        }
        
        onComplete({
          success: true,
          message: `${successCount} offload(s) completed${failCount > 0 ? `, ${failCount} failed` : ''}`,
          results,
          errors: errors.length > 0 ? errors : undefined,
          payloads: payloads
        });
        
        onClose();
      } else {
        message.error('❌ No products were offloaded successfully');
        setErrorMessage('Failed to offload any products. Please check the console for details.');
      }
      
    } catch (error) {
      console.error('❌ Submission error:', error);
      setErrorMessage(error.message || error.response?.data?.message || 'Failed to complete offload');
      message.error('Failed to complete offload. Please check the console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate overall progress
  const completedProducts = Object.values(productJourneys).filter(j => j && j.completed).length;
  const overallProgress = products.length > 0 ? (completedProducts / products.length) * 100 : 0;

  // Render current step content
  const renderStepContent = () => {
    if (!currentJourney) {
      return (
        <Alert
          message="Loading Product Data"
          description="Please wait while we load the product information..."
          type="info"
          showIcon
        />
      );
    }
    
    const currentStep = currentJourney.step;
    
    switch (currentStep) {
      case 0: // Delivery Info
        return (
          <Card 
            title={
              <Space>
                <TruckOutlined style={{ color: '#1890ff' }} />
                <Text strong>Delivery Information for {currentProduct?.name}</Text>
              </Space>
            }
          >
            <Alert
              message="Product-Specific Delivery Details"
              description="Enter the delivery information for this product. Each product will be created as a separate offload record."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form
              ref={deliveryForms[currentProduct.id]}
              layout="vertical"
              initialValues={currentJourney.deliveryInfo}
              onValuesChange={updateDeliveryInfo}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="supplierInvoiceNumber"
                    label={
                      <Space>
                        <FileTextOutlined />
                        <Text>Invoice Number</Text>
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
                        <Text>Invoice Amount ({currentJourney.deliveryInfo?.currency})</Text>
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
                  placeholder="Enter any additional notes about this product delivery..."
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Card>
        );
        
      case 1: // Tank Selection
        return (
          <Card 
            title={
              <Space>
                <DatabaseOutlined style={{ color: '#1890ff' }} />
                <Text strong>Select Tanks for {currentProduct?.name}</Text>
              </Space>
            }
            loading={topologyLoading}
          >
            <Alert
              message={`Select tanks containing ${currentProduct?.name}`}
              description="Choose the tanks that will receive this product delivery."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Row gutter={[16, 16]}>
              {(currentJourney.tanks || []).map(tank => (
                <Col span={24} key={tank.id}>
                  <Card
                    size="small"
                    style={{ 
                      border: (currentJourney.selectedTanks || []).includes(tank.id) 
                        ? '2px solid #52c41a' 
                        : '1px solid #d9d9d9',
                      backgroundColor: (currentJourney.selectedTanks || []).includes(tank.id) 
                        ? '#f6ffed' 
                        : '#fff'
                    }}
                  >
                    <Checkbox
                      onChange={(e) => handleTankSelection(tank.id, e.target.checked)}
                      checked={(currentJourney.selectedTanks || []).includes(tank.id)}
                      style={{ width: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <Text strong style={{ fontSize: '16px' }}>{tank.name}</Text>
                          <Tag color="blue">Capacity: {tank.capacity?.toLocaleString()}L</Tag>
                          <Tag color="green">Current: {(tank.currentVolume || 0).toLocaleString()}L</Tag>
                        </Space>
                        {tank.connectedPumps && tank.connectedPumps.length > 0 && (
                          <Space>
                            <Text type="secondary">Connected Pumps:</Text>
                            {tank.connectedPumps.map(pump => (
                              <Tag key={pump.id} color="orange">{pump.name}</Tag>
                            ))}
                          </Space>
                        )}
                      </Space>
                    </Checkbox>
                  </Card>
                </Col>
              ))}
            </Row>
            
            {(currentJourney.tanks || []).length === 0 && !topologyLoading && (
              <Alert
                message="No Compatible Tanks"
                description={`No tanks found for ${currentProduct?.name}. Please check topology.`}
                type="warning"
                showIcon
              />
            )}
          </Card>
        );
        
      case 2: // Dip & Pump Data
        return (
          <Card
            title={
              <Space>
                <DropboxOutlined style={{ color: '#52c41a' }} />
                <Text strong>Dip Readings & Pump Sales - {currentProduct?.name}</Text>
              </Space>
            }
          >
            <Alert
              message={`Selling Price: ${currentJourney.deliveryInfo?.currency} ${currentProduct?.sellingPrice}/L`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            {(currentJourney.selectedTanks || []).map(tankId => {
              const tank = (currentJourney.tanks || []).find(t => t.id === tankId);
              const calculations = getTankCalculations(tankId);
              
              return (
                <Card
                  key={tankId}
                  type="inner"
                  title={
                    <Space>
                      <DatabaseOutlined />
                      <Text strong>{tank?.name}</Text>
                      <Tag color="blue">Current: {tank?.currentVolume?.toLocaleString()}L</Tag>
                    </Space>
                  }
                  style={{ marginBottom: 16, borderLeft: '3px solid #1890ff' }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Before Dip (Liters)" required>
                        <InputNumber
                          style={{ width: '100%' }}
                          value={currentJourney.tankData?.[`beforeDip_${tankId}`]}
                          onChange={val => handleTankDataChange(`beforeDip_${tankId}`, val)}
                          min={0}
                          step={100}
                          size="large"
                          placeholder="Enter before dip reading"
                        />
                      </Form.Item>
                      <Form.Item label="Before Notes">
                        <TextArea
                          rows={2}
                          value={currentJourney.tankData?.[`beforeNotes_${tankId}`]}
                          onChange={e => handleTankDataChange(`beforeNotes_${tankId}`, e.target.value)}
                          placeholder="Notes before offload..."
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="After Dip (Liters)" required>
                        <InputNumber
                          style={{ width: '100%' }}
                          value={currentJourney.tankData?.[`afterDip_${tankId}`]}
                          onChange={val => handleTankDataChange(`afterDip_${tankId}`, val)}
                          min={0}
                          step={100}
                          size="large"
                          placeholder="Enter after dip reading"
                        />
                      </Form.Item>
                      <Form.Item label="After Notes">
                        <TextArea
                          rows={2}
                          value={currentJourney.tankData?.[`afterNotes_${tankId}`]}
                          onChange={e => handleTankDataChange(`afterNotes_${tankId}`, e.target.value)}
                          placeholder="Notes after offload..."
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic 
                        title="Before Dip" 
                        value={calculations.beforeDip} 
                        suffix="L"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="After Dip" 
                        value={calculations.afterDip} 
                        suffix="L"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Offloaded Volume" 
                        value={calculations.offloadedVolume} 
                        suffix="L"
                        valueStyle={{ 
                          color: calculations.offloadedVolume > 0 ? '#52c41a' : '#ff4d4f',
                          fontWeight: 'bold'
                        }}
                      />
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <Text strong style={{ fontSize: '16px' }}>Connected Pumps Sales</Text>
                  {((currentJourney.connectedPumpsMap || {})[tankId] || []).length > 0 ? (
                    <List
                      size="small"
                      dataSource={(currentJourney.connectedPumpsMap || {})[tankId] || []}
                      renderItem={pump => {
                        const pumpCalc = getPumpCalculations(pump.id);
                        return (
                          <List.Item>
                            <Row gutter={16} style={{ width: '100%' }} align="middle">
                              <Col span={8}>
                                <Space>
                                  <DropboxOutlined style={{ color: '#faad14' }} />
                                  <Text strong>{pump.name}</Text>
                                  {pump.island && (
                                    <Text type="secondary">({pump.island.name})</Text>
                                  )}
                                </Space>
                              </Col>
                              <Col span={8}>
                                <InputNumber
                                  placeholder={`Sales (${currentJourney.deliveryInfo?.currency})`}
                                  value={currentJourney.tankData?.[`sales_${pump.id}`]}
                                  onChange={val => handleTankDataChange(`sales_${pump.id}`, val)}
                                  min={0}
                                  step={100}
                                  style={{ width: '100%' }}
                                  size="middle"
                                />
                              </Col>
                              <Col span={8}>
                                <Tag color={pumpCalc.liters > 0 ? 'green' : 'default'}>
                                  {pumpCalc.liters.toFixed(1)} L @ {currentJourney.deliveryInfo?.currency} {currentProduct?.sellingPrice}
                                </Tag>
                              </Col>
                            </Row>
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
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>
              );
            })}
            
            {(currentJourney.selectedTanks || []).length === 0 && (
              <Alert
                message="No Tanks Selected"
                description="Please go back and select at least one tank."
                type="warning"
                showIcon
              />
            )}
          </Card>
        );
        
      case 3: // Quality Check
        return (
          <Card
            title={
              <Space>
                <ExperimentOutlined style={{ color: '#faad14' }} />
                <Text strong>Quality Check - {currentProduct?.name}</Text>
              </Space>
            }
          >
            <Alert
              message="Product Quality Verification"
              description="Verify the quality of this product delivery and note any issues."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form layout="vertical">
              <Form.Item>
                <Checkbox
                  checked={currentJourney.qualityCheck?.hasQualityIssues || false}
                  onChange={e => handleQualityChange('hasQualityIssues', e.target.checked)}
                >
                  Quality Issues Found?
                </Checkbox>
              </Form.Item>
              
              <Form.Item label="Quality Notes & Observations">
                <TextArea
                  rows={4}
                  value={currentJourney.qualityCheck?.qualityNotes || ''}
                  onChange={e => handleQualityChange('qualityNotes', e.target.value)}
                  placeholder="Enter quality observations, test results, or any issues detected..."
                />
              </Form.Item>
            </Form>
            
            <Card 
              type="inner" 
              title="📊 Product Specifications" 
              size="small"
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Product" value={currentProduct?.name} />
                </Col>
                <Col span={8}>
                  <Statistic title="Expected Density" value="0.820 - 0.880" />
                </Col>
                <Col span={8}>
                  <Statistic title="Temperature Range" value="15°C - 30°C" />
                </Col>
              </Row>
            </Card>
          </Card>
        );
        
      case 4: // Confirm
        return (
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong>Confirm {currentProduct?.name} Details</Text>
              </Space>
            }
          >
            <Alert
              message="Review product details before completing"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {/* Delivery Info Summary */}
            <Card type="inner" title="🚚 Delivery Information" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Invoice Number">{currentJourney.deliveryInfo?.supplierInvoiceNumber}</Descriptions.Item>
                <Descriptions.Item label="Invoice Date">
                  {currentJourney.deliveryInfo?.supplierInvoiceDate?.format?.('YYYY-MM-DD') || 
                   (currentJourney.deliveryInfo?.supplierInvoiceDate ? new Date(currentJourney.deliveryInfo.supplierInvoiceDate).toLocaleDateString() : 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Invoice Amount">
                  {currentJourney.deliveryInfo?.currency} {currentJourney.deliveryInfo?.supplierInvoiceAmount?.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Driver">{currentJourney.deliveryInfo?.driverName}</Descriptions.Item>
                <Descriptions.Item label="Vehicle">{currentJourney.deliveryInfo?.deliveryVehiclePlate}</Descriptions.Item>
                <Descriptions.Item label="Company">{currentJourney.deliveryInfo?.deliveryCompany}</Descriptions.Item>
              </Descriptions>
            </Card>
            
            {/* Tanks Summary */}
            <Card type="inner" title="⛽ Tanks & Readings" size="small" style={{ marginBottom: 16 }}>
              {(currentJourney.selectedTanks || []).map(tankId => {
                const tank = (currentJourney.tanks || []).find(t => t.id === tankId);
                const calc = getTankCalculations(tankId);
                const pumps = (currentJourney.connectedPumpsMap || {})[tankId] || [];
                const totalPumpSales = pumps.reduce((sum, pump) => {
                  const pumpCalc = getPumpCalculations(pump.id);
                  return sum + pumpCalc.salesValue;
                }, 0);
                
                return (
                  <Card key={tankId} type="inner" size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Text strong>{tank?.name}</Text>
                      </Col>
                      <Col span={6}>
                        <Text>Before: {calc.beforeDip}L</Text>
                      </Col>
                      <Col span={6}>
                        <Text>After: {calc.afterDip}L</Text>
                      </Col>
                      <Col span={6}>
                        <Tag color="green">Offload: {calc.offloadedVolume}L</Tag>
                      </Col>
                    </Row>
                    {totalPumpSales > 0 && (
                      <Row style={{ marginTop: 4 }}>
                        <Col span={24}>
                          <Text type="secondary">Pump Sales: {currentJourney.deliveryInfo?.currency} {totalPumpSales.toLocaleString()}</Text>
                        </Col>
                      </Row>
                    )}
                  </Card>
                );
              })}
            </Card>
            
            {/* Quality Summary */}
            <Card type="inner" title="🔬 Quality Check" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="Status" 
                    value={currentJourney.qualityCheck?.hasQualityIssues ? "Issues Found" : "Passed"}
                    valueStyle={{ color: currentJourney.qualityCheck?.hasQualityIssues ? '#ff4d4f' : '#52c41a' }}
                  />
                </Col>
                <Col span={16}>
                  <Text strong>Notes:</Text> {currentJourney.qualityCheck?.qualityNotes || "No issues reported"}
                </Col>
              </Row>
            </Card>
          </Card>
        );
        
      default:
        return null;
    }
  };

  // Render submission results
  const renderSubmissionResults = () => {
    if (submissionResults.length === 0) return null;
    
    const successCount = submissionResults.filter(r => r.success).length;
    const failCount = submissionResults.length - successCount;
    
    return (
      <Card 
        size="small" 
        style={{ marginTop: 16, borderLeft: `4px solid ${failCount === 0 ? '#52c41a' : '#faad14'}` }}
      >
        <Space>
          {failCount === 0 ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          )}
          <Text strong>Submission Results:</Text>
          <Tag color="green">Success: {successCount}</Tag>
          {failCount > 0 && <Tag color="red">Failed: {failCount}</Tag>}
        </Space>
        
        {submissionResults.map((result, index) => (
          <Alert
            key={index}
            message={result.productName}
            description={result.success ? `✓ Offload ID: ${result.offloadId}` : `✗ ${result.error}`}
            type={result.success ? 'success' : 'error'}
            showIcon
            style={{ marginTop: 8 }}
          />
        ))}
      </Card>
    );
  };

  return (
    <Modal
      title={
        <div>
          <TruckOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          <Text strong>Multi-Product Fuel Offload - {purchase?.purchaseNumber}</Text>
          <Tag color="blue" style={{ marginLeft: 8 }}>{purchase?.supplier?.name}</Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
      destroyOnClose={true}
    >
      {/* Overall Progress */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Progress 
              percent={overallProgress} 
              status="active"
              format={() => `${completedProducts}/${products.length} Products Completed`}
            />
          </Col>
          <Col span={8}>
            <Space>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                Current: {currentProduct?.name}
              </Tag>
              <Tag color="orange">
                Remaining: {currentProduct?.remainingQty}L
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Purchase Summary */}
      <Card 
        title={
          <Space>
            <ShoppingCartOutlined />
            <Text strong>Purchase Order Summary</Text>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary">Purchase Number:</Text> {purchase?.purchaseNumber}
          </Col>
          <Col span={8}>
            <Text type="secondary">Supplier:</Text> {purchase?.supplier?.name}
          </Col>
          <Col span={8}>
            <Text type="secondary">Order Date:</Text> {purchase?.orderDate ? new Date(purchase.orderDate).toLocaleDateString() : 'N/A'}
          </Col>
        </Row>
      </Card>

      {/* Payload Preview Section */}
      {showPayloadPreview && finalPayloads.length > 0 && (
        <Card 
          title={
            <Space>
              <CodeOutlined style={{ color: '#722ed1' }} />
              <Text strong>Payload Preview ({finalPayloads.length} offloads)</Text>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16, borderLeft: '4px solid #722ed1' }}
          extra={
            <Button 
              type="link" 
              size="small" 
              onClick={() => setShowPayloadPreview(false)}
            >
              Hide
            </Button>
          }
        >
          <Tabs defaultActiveKey="0">
            {finalPayloads.map((payload, index) => (
              <Tabs.TabPane 
                tab={`${payload._metadata?.productName || `Product ${index + 1}`}`} 
                key={String(index)}
              >
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: 16, 
                  borderRadius: 4,
                  maxHeight: 300,
                  overflow: 'auto',
                  fontSize: 12
                }}>
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </Tabs.TabPane>
            ))}
          </Tabs>
        </Card>
      )}

      {/* Submission Results */}
      {submissionResults.length > 0 && renderSubmissionResults()}

      {/* Product Steps */}
      <Card 
        title={
          <Space>
            <RocketOutlined style={{ color: '#1890ff' }} />
            <Text strong>Processing: {currentProduct?.name}</Text>
          </Space>
        }
      >
        <Steps 
          current={currentJourney?.step || 0}
          items={OFFLOAD_STEPS}
          style={{ marginBottom: 24 }}
        />
        
        {renderStepContent()}
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <Alert
          message="Error"
          description={errorMessage}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
          closable
          onClose={() => setErrorMessage('')}
        />
      )}

      {/* Navigation Buttons */}
      <Divider />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {currentProductIndex > 0 && (
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={goToPrevProduct}
              size="large"
              disabled={submitting}
            >
              Previous Product
            </Button>
          )}
        </div>
        
        <Space>
          {/* Preview Payloads Button */}
          {completedProducts === products.length && products.length > 0 && (
            <Button 
              icon={<EyeOutlined />} 
              onClick={handlePreviewPayloads}
              size="large"
              disabled={submitting}
            >
              Preview Payloads
            </Button>
          )}
          
          {currentJourney?.step > 0 && (
            <Button 
              onClick={handlePrevStep} 
              size="large"
              disabled={submitting}
            >
              Previous Step
            </Button>
          )}
          
          {currentJourney?.step < OFFLOAD_STEPS.length - 1 ? (
            <Button 
              type="primary" 
              onClick={handleNextStep} 
              icon={<ArrowRightOutlined />}
              size="large"
              disabled={
                (currentJourney?.step === 1 && (!currentJourney.selectedTanks || currentJourney.selectedTanks.length === 0)) ||
                submitting
              }
            >
              Next Step
            </Button>
          ) : (
            // On last step
            currentProductIndex === products.length - 1 ? (
              // Last product - show Complete All
              <Button 
                type="primary"
                loading={submitting}
                onClick={handleFinalSubmit}
                icon={submitting ? <LoadingOutlined /> : <CheckCircleOutlined />}
                size="large"
                style={{ backgroundColor: '#52c41a' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Complete All Products'}
              </Button>
            ) : (
              // Not last product - show Next Product
              <Button 
                type="primary"
                onClick={() => {
                  markCurrentProductComplete();
                  goToNextProduct();
                }}
                icon={<ArrowRightOutlined />}
                size="large"
                disabled={submitting}
              >
                Next Product →
              </Button>
            )
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default OffloadWizard;