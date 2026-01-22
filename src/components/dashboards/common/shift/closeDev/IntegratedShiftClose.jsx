import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Input,
  Space,
  Alert,
  Badge,
  Row,
  Col,
  Statistic,
  message,
  Typography,
  Button,
  Divider,
  Tag,
  InputNumber,
  Modal,
  Tabs,
  Select,
  Steps,
  Form,
  Descriptions,
  Spin,
  DatePicker,
  Tooltip,
  List,
  Grid
} from 'antd';
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Wallet,
  DollarSign,
  Receipt,
  Zap,
  Fuel,
  AlertTriangle,
  Gauge,
  Droplets,
  Save,
  X,
  CheckSquare,
  Trash2,
  Plus,
  UserCheck,
  Users,
  Search,
  Clock,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../../../../context/AppContext';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { islandPumpMappingService } from '../../../../../services/assetTopologyService/islandPumpMappingService';
import { assetTopologyService } from '../../../../../services/assetTopologyService/assetTopologyService';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import { shortageService } from '../../../../../services/shortageService/shortageService';
import { staffAccountService } from '../../../../../services/staffAccountService/staffAccountService';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Step } = Steps;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const IntegratedShiftClose = ({ 
  onClose, 
  onSuccess, 
  shift, 
  stationId, 
  currentUser,
  visible = true 
}) => {
  const { state } = useApp();
  const currentStationId = stationId || state?.currentStation?.id;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ========== STEP MANAGEMENT ==========
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { key: 'readings', title: 'Readings', icon: <Gauge size={16} /> },
    { key: 'sales', title: 'Sales', icon: <DollarSign size={16} /> },
    { key: 'collections', title: 'Collections', icon: <Wallet size={16} /> },
    { key: 'summary', title: 'Review & Submit', icon: <CheckSquare size={16} /> }
  ];

  // ========== READINGS STEP STATE ==========
  const [loading, setLoading] = useState(true);
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [shiftData, setShiftData] = useState(null);
  const [globalMeterType, setGlobalMeterType] = useState('electric');
  
  // ========== ISLAND SALES STEP STATE ==========
  const [islandsData, setIslandsData] = useState([]);
  const [salesEntries, setSalesEntries] = useState({});
  const [receipts, setReceipts] = useState({});
  const [expenses, setExpenses] = useState({});
  
  // ========== COLLECTIONS STEP STATE ==========
  const [collections, setCollections] = useState({});
  const [collectionsModalVisible, setCollectionsModalVisible] = useState(false);
  const [currentIslandIndex, setCurrentIslandIndex] = useState(0);
  
  // ========== DEBTORS STATE ==========
  const [debtors, setDebtors] = useState([]);
  const [loadingDebtors, setLoadingDebtors] = useState(false);
  
  // ========== POSTED SHORTAGES TRACKING ==========
  const [postedShortages, setPostedShortages] = useState({});
  
  // ========== SUBMISSION STATE ==========
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========== CACHE SYSTEM ==========
  const getCacheKey = () => `shift_close_${currentStationId}_${shift?.id}`;
  
  const saveToCache = () => {
    const cacheKey = getCacheKey();
    const cacheData = {
      step: currentStep,
      pumps,
      tanks,
      globalMeterType,
      salesEntries,
      receipts,
      expenses,
      collections,
      postedShortages,
      timestamp: Date.now(),
      shiftId: shift?.id,
      stationId: currentStationId
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('💾 Saved to cache');
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  const loadFromCache = () => {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        
        // Check if cache is for current shift and not expired
        if (data.shiftId === shift?.id && Date.now() - data.timestamp < TWO_HOURS) {
          console.log('📂 Loading from cache');
          
          setCurrentStep(data.step || 0);
          setPumps(data.pumps || []);
          setTanks(data.tanks || []);
          setGlobalMeterType(data.globalMeterType || 'electric');
          setSalesEntries(data.salesEntries || {});
          setReceipts(data.receipts || {});
          setExpenses(data.expenses || {});
          setCollections(data.collections || {});
          setPostedShortages(data.postedShortages || {});
          
          // Re-prepare islands data if we have pumps
          if (data.pumps && data.pumps.length > 0) {
            setTimeout(() => {
              prepareIslandsData(data.pumps, {});
            }, 100);
          }
          
          message.info('Restored unsaved data from previous session');
          return true;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (error) {
        console.error('Cache load error:', error);
        localStorage.removeItem(cacheKey);
      }
    }
    return false;
  };

  const clearCache = () => {
    const cacheKey = getCacheKey();
    localStorage.removeItem(cacheKey);
    
    // Also clear any related cache
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`shift_close_${currentStationId}`)) {
        localStorage.removeItem(key);
      }
    }
    
    console.log('🧹 Cache cleared');
    message.success('Cache cleared successfully');
  };

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    if (currentStationId && shift?.id) {
      const hasCache = loadFromCache();
      if (!hasCache) {
        loadOpenShiftData();
      } else {
        setLoading(false);
      }
      loadDebtors();
    }
  }, [currentStationId, shift?.id]);

  // ========== AUTO-SAVE ON CHANGES ==========
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToCache();
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [pumps, tanks, salesEntries, receipts, expenses, collections, postedShortages]);

  // ========== LOAD DEBTORS ==========
  const loadDebtors = async () => {
    setLoadingDebtors(true);
    try {
      const result = await debtorService.getDebtors();
      const debtorsData = result.debtors || result.data || result || [];
      setDebtors(debtorsData);
    } catch (error) {
      console.error('Failed to load debtors:', error);
      message.error('Failed to load debtors list');
      setDebtors([]);
    } finally {
      setLoadingDebtors(false);
    }
  };

  // ========== READINGS STEP FUNCTIONS ==========
  const loadOpenShiftData = async () => {
    if (!currentStationId) return;
    
    setLoading(true);
    try {
      const [openShiftData, mapping, topologyData] = await Promise.all([
        shiftService.getOpenShift(currentStationId),
        islandPumpMappingService.getIslandPumpMapping(currentStationId),
        assetTopologyService.getIslandsWithPumpsAndTanks(currentStationId)
      ]);

      if (!openShiftData) {
        message.error('No open shift found for this station');
        setLoading(false);
        return;
      }

      setShiftData(openShiftData);

      // Get island assignments
      const islandAssignments = {};
      (openShiftData.shiftIslandAttendant || []).forEach((assignment) => {
        if (assignment.islandId && assignment.attendant) {
          islandAssignments[assignment.islandId] = assignment.attendant;
        }
      });

      // Create pump product map
      const pumpProductMap = new Map();
      const topologyIslands = topologyData.data?.islands || topologyData.islands || [];
      
      topologyIslands.forEach((island) => {
        if (island.pumps && Array.isArray(island.pumps)) {
          island.pumps.forEach((pump) => {
            if (pump.product) {
              pumpProductMap.set(pump.id, {
                productId: pump.product.id,
                product: pump.product,
                unitPrice: pump.product.baseCostPrice || pump.product.minSellingPrice || 0
              });
            }
          });
        }
      });

      // Transform pump readings
      const transformedPumps = (openShiftData.meterReadings || []).map(meterReading => {
        const productInfo = pumpProductMap.get(meterReading.pumpId);

        // Find which island this pump belongs to
        let pumpIslandId = null;
        let pumpIslandName = 'Unassigned';
        let attendant = null;
        
        for (const [islandId, pumpIds] of Object.entries(mapping)) {
          if (pumpIds.includes(meterReading.pumpId)) {
            pumpIslandId = islandId;
            const islandAssignment = openShiftData.shiftIslandAttendant?.find(
              assignment => assignment.islandId === islandId
            );
            pumpIslandName = islandAssignment?.island?.code || `Island ${islandId.slice(0, 8)}`;
            attendant = islandAssignments[islandId];
            break;
          }
        }

        const finalProductInfo = productInfo || {
          productId: meterReading.pump?.product?.id,
          product: meterReading.pump?.product || { name: 'Fuel' },
          unitPrice: meterReading.unitPrice || 0
        };

        return {
          id: meterReading.pumpId,
          pumpId: meterReading.pumpId,
          productId: finalProductInfo.productId,
          name: meterReading.pump?.asset?.name || `Pump ${meterReading.pumpId.slice(0, 8)}`,
          product: finalProductInfo.product,
          openingElectricMeter: meterReading.electricMeter || 0,
          openingManualMeter: meterReading.manualMeter || 0,
          openingCashMeter: meterReading.cashMeter || 0,
          unitPrice: finalProductInfo.unitPrice,
          closingElectricMeter: '',
          closingManualMeter: '',
          closingCashMeter: '',
          islandId: pumpIslandId,
          islandName: pumpIslandName,
          attendant: attendant
        };
      });

      // Transform tank readings
      const transformedTanks = (openShiftData.dipReadings || []).map(dipReading => ({
        id: dipReading.tankId,
        tankId: dipReading.tankId,
        name: dipReading.tank?.asset?.name || `Tank ${dipReading.tankId.slice(0, 8)}`,
        product: dipReading.tank?.product || { name: 'Fuel' },
        capacity: dipReading.tank?.capacity || 10000,
        openingVolume: dipReading.volume || 0,
        openingDipValue: dipReading.dipValue || 0,
        openingCurrentVolume: dipReading.currentVolume || dipReading.volume || 0,
        closingVolume: '',
        closingDipValue: 2.5,
        closingCurrentVolume: '',
        currentVolume: ''
      }));

      setPumps(transformedPumps);
      setTanks(transformedTanks);
      
      // Prepare islands data
      prepareIslandsData(transformedPumps, islandAssignments);
      
    } catch (error) {
      console.error('❌ Error loading open shift readings:', error);
      message.error('Failed to load open shift readings');
    } finally {
      setLoading(false);
    }
  };

  // Prepare islands data for sales step
  const prepareIslandsData = (pumpsData, islandAssignments) => {
    // Group pumps by island
    const pumpsByIsland = {};
    pumpsData.forEach(pump => {
      const islandKey = pump.islandId || 'unassigned';
      if (!pumpsByIsland[islandKey]) {
        pumpsByIsland[islandKey] = {
          islandId: pump.islandId,
          islandName: pump.islandName,
          pumps: [],
          attendant: pump.attendant
        };
      }
      pumpsByIsland[islandKey].pumps.push(pump);
    });

    // Create islands data structure with proper keys
    const islands = Object.values(pumpsByIsland).map((islandData, index) => {
      const attendants = islandData.attendant ? [islandData.attendant] : [];

      return {
        key: index,
        islandId: islandData.islandId,
        islandName: islandData.islandName,
        attendants: attendants,
        pumps: islandData.pumps,
        totalPumpSales: calculateIslandExpectedSales(islandData.pumps)
      };
    });

    setIslandsData(islands);
    
    // Initialize sales entries
    const initialEntries = {};
    islands.forEach((island) => {
      if (!salesEntries[island.key]) {
        initialEntries[island.key] = {
          islandTotalSales: island.totalPumpSales || 0,
          notes: ''
        };
      }
    });
    
    if (Object.keys(initialEntries).length > 0) {
      setSalesEntries(prev => ({ ...prev, ...initialEntries }));
    }
  };

  const calculateIslandExpectedSales = (islandPumps) => {
    return islandPumps.reduce((sum, pump) => {
      const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const unitPrice = parseFloat(pump.unitPrice) || 0;
      
      let sales = 0;
      if (globalMeterType === 'cash') {
        sales = Math.max(0, closing - opening);
      } else {
        const liters = Math.max(0, closing - opening);
        sales = liters * unitPrice;
      }
      
      return sum + sales;
    }, 0);
  };

  // Calculate pump values based on global meter type
  const calculatePumpValues = useCallback(() => {
    return pumps.map(pump => {
      const opening = parseFloat(pump[`opening${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const closing = parseFloat(pump[`closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`]) || 0;
      const unitPrice = parseFloat(pump.unitPrice) || 0;
      
      let litersDispensed = 0;
      let salesValue = 0;
      
      if (globalMeterType === 'cash') {
        salesValue = Math.max(0, closing - opening);
        litersDispensed = unitPrice > 0 ? salesValue / unitPrice : 0;
      } else {
        litersDispensed = Math.max(0, closing - opening);
        salesValue = litersDispensed * unitPrice;
      }

      return {
        ...pump,
        litersDispensed: litersDispensed,
        salesValue: salesValue
      };
    });
  }, [pumps, globalMeterType]);

  // Handle pump reading change
  const handlePumpReadingChange = (pumpId, field, value) => {
    setPumps(prevPumps => {
      return prevPumps.map(pump => {
        if (pump.id !== pumpId) return pump;
        
        const updatedPump = { ...pump, [field]: value };
        
        const meterType = field.replace('closing', '').replace('Meter', '').toLowerCase();
        
        if (value && value !== '') {
          const openingElectric = parseFloat(updatedPump.openingElectricMeter) || 0;
          const openingManual = parseFloat(updatedPump.openingManualMeter) || 0;
          const openingCash = parseFloat(updatedPump.openingCashMeter) || 0;
          const unitPrice = parseFloat(updatedPump.unitPrice) || 0;
          
          const enteredValue = parseFloat(value) || 0;
          let litersDispensed = 0;
          
          switch(meterType) {
            case 'electric':
              litersDispensed = Math.max(0, enteredValue - openingElectric);
              updatedPump.closingManualMeter = (openingManual + litersDispensed).toFixed(3);
              updatedPump.closingCashMeter = (openingCash + (litersDispensed * unitPrice)).toFixed(2);
              break;
              
            case 'manual':
              litersDispensed = Math.max(0, enteredValue - openingManual);
              updatedPump.closingElectricMeter = (openingElectric + litersDispensed).toFixed(3);
              updatedPump.closingCashMeter = (openingCash + (litersDispensed * unitPrice)).toFixed(2);
              break;
              
            case 'cash':
              const cashDifference = Math.max(0, enteredValue - openingCash);
              litersDispensed = unitPrice > 0 ? cashDifference / unitPrice : 0;
              updatedPump.closingElectricMeter = (openingElectric + litersDispensed).toFixed(3);
              updatedPump.closingManualMeter = (openingManual + litersDispensed).toFixed(3);
              break;
          }
        }
        
        return updatedPump;
      });
    });
  };

  // Handle tank reading change
  const handleTankReadingChange = (tankId, field, value) => {
    setTanks(prev => prev.map(tank => {
      if (tank.id !== tankId) return tank;
      
      const updatedTank = { ...tank, [field]: value };
      
      if (field === 'currentVolume' && value) {
        updatedTank.closingVolume = value;
        updatedTank.closingCurrentVolume = value;
      }
      
      return updatedTank;
    }));
  };

  // ========== SHORTAGE POSTING FUNCTION ==========
  const postShortage = async (islandData, variance, totalExpected, totalCollected) => {
    if (variance <= 10) {
      message.info(`Shortage of KES ${variance.toFixed(2)} is below minimum threshold (KES 10)`);
      return null;
    }

    if (!islandData.attendants || islandData.attendants.length === 0) {
      message.error('No attendant assigned to this island. Cannot post shortage.');
      return null;
    }

    const primaryAttendant = islandData.attendants[0];
    
    try {
      // Get staff account for attendant
      const staffAccount = await staffAccountService.getStaffAccountByUserId(primaryAttendant.id);
      
      if (!staffAccount) {
        message.error(`No staff account found for ${primaryAttendant.firstName} ${primaryAttendant.lastName}`);
        return null;
      }

      // Calculate due date (end of current month)
      const today = dayjs();
      const endOfMonth = today.endOf('month');

      // Create shortage data
      const shortageData = {
        staffAccountId: staffAccount.id,
        amount: variance,
        description: `Shortage during shift closing - Shift ${shift?.shiftNumber || 'N/A'} at ${islandData.islandName}`,
        shortageType: 'CASH',
        responsibleParty: 'ATTENDANT',
        severity: variance > 5000 ? 'HIGH' : variance > 1000 ? 'MODERATE' : 'LOW',
        comments: `Auto-posted during shift closing. Expected: KES ${totalExpected.toFixed(2)}, Collected: KES ${totalCollected.toFixed(2)}`,
        shiftId: shift?.id,
        islandId: islandData.islandId,
        dueDate: endOfMonth.toISOString(),
        recordedById: currentUser?.id,
        stationId: currentStationId,
        autoGenerated: true
      };

      console.log('Posting shortage:', shortageData);
      
      // Post shortage
      const shortage = await shortageService.createShortage(shortageData);
      
      message.success(`Shortage of KES ${variance.toFixed(2)} posted to ${primaryAttendant.firstName} ${primaryAttendant.lastName}`);
      
      return shortage;
    } catch (error) {
      console.error('Error posting shortage:', error);
      message.error(`Failed to post shortage: ${error.message}`);
      return null;
    }
  };

  // ========== FIXED COLLECTIONS MODAL ==========
  const CollectionsModal = ({ 
    visible, 
    onCancel, 
    onSave, 
    islandIndex,
    currentCollections
  }) => {
    const [localCollections, setLocalCollections] = useState(currentCollections || []);
    const [cashAmount, setCashAmount] = useState('');
    const [selectedDebtor, setSelectedDebtor] = useState(null);
    const [debtAmount, setDebtAmount] = useState('');
    const [postingShortage, setPostingShortage] = useState(false);
    const [searchDebtor, setSearchDebtor] = useState('');
    const [selectedIsland, setSelectedIsland] = useState(null);

    // Find the island data
    useEffect(() => {
      if (visible && islandIndex !== undefined) {
        const island = islandsData.find(island => island.key === islandIndex);
        setSelectedIsland(island);
        setLocalCollections(currentCollections || []);
      }
    }, [visible, islandIndex, currentCollections]);

    // Filter debtors based on search
    const filteredDebtors = useMemo(() => {
      if (!searchDebtor) return debtors;
      return debtors.filter(debtor =>
        debtor.name?.toLowerCase().includes(searchDebtor.toLowerCase()) ||
        debtor.phone?.toLowerCase().includes(searchDebtor.toLowerCase()) ||
        debtor.code?.toLowerCase().includes(searchDebtor.toLowerCase())
      );
    }, [debtors, searchDebtor]);

    // Calculate totals
    const totalPumpSales = selectedIsland?.totalPumpSales || 0;
    const islandReceipts = receipts[islandIndex] || 0;
    const islandExpenses = expenses[islandIndex] || 0;
    const totalExpected = totalPumpSales + islandReceipts - islandExpenses;
    
    const currentCashCollection = localCollections
      .filter(c => c?.type === 'cash')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    
    const currentDebtCollections = localCollections
      .filter(c => c?.type === 'debt');
    
    const totalDebtCollection = currentDebtCollections
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    
    const currentTotal = currentCashCollection + totalDebtCollection;
    const cashNum = parseFloat(cashAmount) || 0;
    const totalCollectedSoFar = currentTotal + cashNum;
    const variance = totalExpected - totalCollectedSoFar;

    const hasShortage = variance > 10; // Only consider shortages above KES 10
    const shortagePosted = selectedIsland ? postedShortages[selectedIsland.key] : false;

    const handleAddCashCollection = () => {
      const cashAmountNum = parseFloat(cashAmount) || 0;
      if (cashAmountNum <= 0) {
        message.warning('Please enter a valid cash amount');
        return;
      }

      const newCollection = {
        id: `cash_${Date.now()}`,
        type: 'cash',
        amount: cashAmountNum,
        timestamp: new Date().toISOString()
      };
      
      const updatedCollections = [...localCollections, newCollection];
      setLocalCollections(updatedCollections);
      setCashAmount('');
      message.success(`Added KES ${cashAmountNum.toFixed(2)} cash collection`);
    };

    const handleAddDebtCollection = () => {
      const debtAmountNum = parseFloat(debtAmount) || 0;
      
      if (!selectedDebtor || debtAmountNum <= 0) {
        message.warning('Please select a debtor and enter valid amount');
        return;
      }

      const newCollection = {
        id: `debt_${Date.now()}`,
        type: 'debt',
        debtorId: selectedDebtor.id,
        debtorName: selectedDebtor.name,
        debtorCode: selectedDebtor.code,
        amount: debtAmountNum,
        timestamp: new Date().toISOString()
      };

      const updatedCollections = [...localCollections, newCollection];
      setLocalCollections(updatedCollections);
      setSelectedDebtor(null);
      setDebtAmount('');
      setSearchDebtor('');
      message.success(`Added KES ${debtAmountNum.toFixed(2)} debt for ${selectedDebtor.name}`);
    };

    const handleRemoveCollection = (collectionId) => {
      const updatedCollections = localCollections.filter(c => c.id !== collectionId);
      setLocalCollections(updatedCollections);
    };

    const handlePostShortage = async () => {
      if (variance <= 10) {
        message.info('Shortage is below minimum threshold (KES 10)');
        return;
      }

      if (!selectedIsland?.attendants || selectedIsland.attendants.length === 0) {
        message.error('No attendant assigned to this island');
        return;
      }

      setPostingShortage(true);
      try {
        const shortage = await postShortage(selectedIsland, variance, totalExpected, totalCollectedSoFar);
        
        if (shortage) {
          setPostedShortages(prev => ({
            ...prev,
            [selectedIsland.key]: {
              ...shortage,
              postedAt: new Date().toISOString(),
              attendantName: selectedIsland.attendants[0].firstName + ' ' + selectedIsland.attendants[0].lastName
            }
          }));
        }
      } catch (error) {
        console.error('Error in shortage posting:', error);
      } finally {
        setPostingShortage(false);
      }
    };

    const handleSaveCollections = () => {
      // Check if there's an unresolved shortage above threshold
      if (hasShortage && !shortagePosted) {
        Modal.confirm({
          title: 'Unresolved Shortage',
          content: (
            <div>
              <p>There is an unresolved shortage of <strong>KES {variance.toFixed(2)}</strong>.</p>
              <p>Do you want to:</p>
              <ul>
                <li>Post shortage to attendant account</li>
                <li>Save collections without posting (not recommended)</li>
              </ul>
            </div>
          ),
          okText: 'Post Shortage',
          cancelText: 'Save Without Posting',
          onOk: () => {
            handlePostShortage();
          },
          onCancel: () => {
            // Save collections without posting shortage
            onSave(localCollections, variance);
          }
        });
      } else {
        onSave(localCollections, variance);
      }
    };

    if (!selectedIsland) {
      return null;
    }

    return (
      <Modal
        title={
          <Space>
            <Wallet size={16} />
            <Text strong>Collections - {selectedIsland?.islandName || 'Unknown Island'}</Text>
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        width={isMobile ? '95%' : 800}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="post"
            type={hasShortage && !shortagePosted ? "dashed" : "default"}
            danger={hasShortage && !shortagePosted}
            onClick={handlePostShortage}
            loading={postingShortage}
            disabled={!hasShortage || shortagePosted || postingShortage}
          >
            {shortagePosted 
              ? 'Shortage Posted ✓' 
              : hasShortage 
                ? `Post Shortage (KES ${variance.toFixed(2)})`
                : 'No Shortage'}
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={handleSaveCollections}
            disabled={localCollections.length === 0}
          >
            Save Collections
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Card size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Expected Total"
                  value={totalExpected}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Collected"
                  value={totalCollectedSoFar}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: totalCollectedSoFar >= totalExpected ? '#52c41a' : '#faad14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Variance"
                  value={Math.abs(variance)}
                  precision={2}
                  prefix={variance >= 0 ? 'KES' : 'KES'}
                  valueStyle={{ 
                    color: variance === 0 ? '#52c41a' : variance > 0 ? '#ff4d4f' : '#faad14' 
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Status"
                  value={variance === 0 ? 'Balanced' : variance > 0 ? 'Shortage' : 'Overage'}
                  valueStyle={{ 
                    color: variance === 0 ? '#52c41a' : variance > 0 ? '#ff4d4f' : '#faad14',
                    fontSize: '14px'
                  }}
                />
              </Col>
            </Row>
            
            {hasShortage && !shortagePosted && (
              <Alert
                message="Action Required"
                description={`Shortage of KES ${variance.toFixed(2)} detected. Post to attendant account before saving.`}
                type="error"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
            
            {shortagePosted && (
              <Alert
                message="Shortage Posted"
                description={`Shortage of KES ${variance.toFixed(2)} has been posted to attendant account.`}
                type="success"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </Card>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card 
              size="small" 
              title="Cash Collections"
              style={{ height: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <InputNumber
                    value={cashAmount}
                    onChange={setCashAmount}
                    placeholder="Enter cash amount"
                    prefix="KES"
                    style={{ width: '100%', marginBottom: 8 }}
                    min={0}
                    size="large"
                  />
                  <Button
                    type="dashed"
                    onClick={handleAddCashCollection}
                    icon={<Plus size={14} />}
                    block
                  >
                    Add Cash Collection
                  </Button>
                </Space>
                
                {localCollections.filter(c => c.type === 'cash').map((collection) => (
                  <Card key={collection.id} size="small" style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Tag color="green">Cash</Tag>
                        <Text strong>KES {collection.amount?.toFixed(2)}</Text>
                      </Space>
                      <Button
                        danger
                        size="small"
                        icon={<Trash2 size={12} />}
                        onClick={() => handleRemoveCollection(collection.id)}
                      />
                    </div>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card 
              size="small" 
              title="Debt Collections"
              style={{ height: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input
                    placeholder="Search debtor by name, phone, or code..."
                    prefix={<Search size={14} />}
                    value={searchDebtor}
                    onChange={(e) => setSearchDebtor(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                  <Select
                    placeholder={loadingDebtors ? "Loading debtors..." : "Select a debtor"}
                    value={selectedDebtor?.id}
                    onChange={(value) => setSelectedDebtor(debtors.find(d => d.id === value))}
                    style={{ width: '100%', marginBottom: 8 }}
                    loading={loadingDebtors}
                    showSearch
                    filterOption={false}
                    size="large"
                  >
                    {filteredDebtors.slice(0, 10).map(debtor => (
                      <Option key={debtor.id} value={debtor.id}>
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          <Text strong>{debtor.name}</Text>
                          {debtor.code && <Text type="secondary">Code: {debtor.code}</Text>}
                          {debtor.phone && <Text type="secondary">Phone: {debtor.phone}</Text>}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                  <InputNumber
                    value={debtAmount}
                    onChange={setDebtAmount}
                    placeholder="Enter debt amount"
                    prefix="KES"
                    style={{ width: '100%', marginBottom: 8 }}
                    min={0}
                    size="large"
                  />
                  <Button
                    type="dashed"
                    onClick={handleAddDebtCollection}
                    icon={<Plus size={14} />}
                    disabled={!selectedDebtor || !debtAmount}
                    block
                  >
                    Add Debt Collection
                  </Button>
                </Space>
                
                {localCollections.filter(c => c.type === 'debt').map((collection) => (
                  <Card key={collection.id} size="small" style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space direction="vertical" size={0}>
                        <Space>
                          <Tag color="blue">Debt</Tag>
                          <Text strong>{collection.debtorName}</Text>
                        </Space>
                        {collection.debtorCode && (
                          <Text type="secondary" style={{ fontSize: '11px', marginLeft: 24 }}>
                            Code: {collection.debtorCode}
                          </Text>
                        )}
                        <Text strong style={{ marginLeft: 24 }}>KES {collection.amount?.toFixed(2)}</Text>
                      </Space>
                      <Button
                        danger
                        size="small"
                        icon={<Trash2 size={12} />}
                        onClick={() => handleRemoveCollection(collection.id)}
                      />
                    </div>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
        
        {localCollections.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Current Collections:</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {localCollections.map(collection => (
                <Tag 
                  key={collection.id} 
                  color={collection.type === 'cash' ? 'green' : 'blue'}
                  style={{ margin: '2px' }}
                >
                  {collection.type === 'cash' ? 'Cash' : collection.debtorName}: KES {collection.amount?.toFixed(2)}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Modal>
    );
  };

  // ========== STEP NAVIGATION ==========
  const handleNextStep = () => {
    if (currentStep === 0) {
      const pumpStats = calculatePumpStats();
      const tankStats = calculateTankStats();
      
      if (pumpStats.completed < pumpStats.total || tankStats.completed < tankStats.total) {
        message.warning('Please complete all readings before proceeding');
        return;
      }
      
      // Re-prepare islands data with updated pump values
      prepareIslandsData(pumps, {});
      setCurrentStep(1);
      
    } else if (currentStep === 1) {
      const islandStats = calculateIslandStats();
      const allIslandsComplete = islandStats.every(island => island.hasSales);
      
      if (!allIslandsComplete) {
        message.warning('Please enter sales for all islands');
        return;
      }
      
      setCurrentStep(2);
      
    } else if (currentStep === 2) {
      const islandStats = calculateIslandStats();
      
      // Check if all islands have collections
      const allCollectionsComplete = islandStats.every(island => island.collectionsModalCompleted);
      
      if (!allCollectionsComplete) {
        message.warning('Please complete collections for all islands');
        return;
      }
      
      // Check if all shortages are resolved (either below threshold or posted)
      const allShortagesResolved = islandStats.every(island => 
        island.variance <= 10 || island.shortagePosted
      );
      
      if (!allShortagesResolved) {
        message.error('Please resolve all shortages above KES 10 before proceeding');
        return;
      }
      
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ========== CALCULATION FUNCTIONS ==========
  const calculatePumpStats = () => {
    const total = pumps.length;
    const completed = pumps.filter(p => {
      const closingField = `closing${globalMeterType.charAt(0).toUpperCase() + globalMeterType.slice(1)}Meter`;
      return p[closingField] && p[closingField] !== '';
    }).length;
    
    const calculatedPumps = calculatePumpValues();
    const totalLiters = calculatedPumps.reduce((sum, pump) => sum + (pump.litersDispensed || 0), 0);
    const totalSales = calculatedPumps.reduce((sum, pump) => sum + (pump.salesValue || 0), 0);
    
    return { total, completed, totalLiters, totalSales };
  };

  const calculateTankStats = () => ({
    total: tanks.length,
    completed: tanks.filter(t => t.currentVolume).length,
  });

  const calculateIslandStats = () => {
    if (!islandsData.length) return [];
    
    return islandsData.map((island) => {
      const islandKey = island.key;
      const islandSales = salesEntries[islandKey] || {};
      const islandCollections = Array.isArray(collections[islandKey]) ? collections[islandKey] : [];
      const islandExpenseAmount = expenses[islandKey] || 0;
      const islandReceipts = receipts[islandKey] || 0;
      
      const totalPumpSales = island.totalPumpSales || 0;
      const totalActualSales = islandSales.islandTotalSales || 0;
      
      const cashCollection = islandCollections
        .filter(c => c && c.type === 'cash')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const debtCollection = islandCollections
        .filter(c => c && c.type === 'debt')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      const totalCollection = cashCollection + debtCollection;
      const totalExpected = totalPumpSales + islandReceipts - islandExpenseAmount;
      const variance = totalExpected - totalCollection;
      
      const collectionsModalCompleted = islandCollections.length > 0;
      const hasSales = totalActualSales >= 0;
      const shortagePosted = postedShortages[islandKey] ? true : false;

      return {
        ...island,
        totalPumpSales,
        totalActualSales,
        cashCollection,
        debtCollection,
        totalCollection,
        expenses: islandExpenseAmount,
        receipts: islandReceipts,
        totalExpected,
        variance,
        hasSales,
        collectionsModalCompleted,
        shortagePosted,
        shortageRecord: postedShortages[islandKey]
      };
    });
  };

  // Handle collections save
  const handleIslandCollectionsSave = (islandKey, collectionsData, variance) => {
    setCollections(prev => ({
      ...prev,
      [islandKey]: collectionsData
    }));
    
    setCollectionsModalVisible(false);
    message.success('Collections saved for island');
  };

  // ========== RENDER COMPONENTS ==========
  
  // 1. READINGS STEP COMPONENT
  const renderReadingsStep = () => {
    const pumpStats = calculatePumpStats();
    const tankStats = calculateTankStats();
    const allComplete = pumpStats.completed === pumpStats.total && tankStats.completed === tankStats.total;
    
    const pumpColumns = [
      {
        title: 'PUMP DETAILS',
        key: 'pump',
        width: 180,
        fixed: 'left',
        render: (_, pump) => (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={14} color="#faad14" />
              <Text strong style={{ fontSize: '12px' }}>{pump.name}</Text>
            </div>
            <div style={{ 
              padding: '1px 4px', 
              backgroundColor: pump.islandId ? '#e6f7ff' : '#fff2e8',
              borderRadius: '2px',
              fontSize: '9px',
              textAlign: 'center'
            }}>
              {pump.islandName}
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {pump.product?.name || 'Fuel'}
            </Text>
            <Text type="secondary" style={{ fontSize: '9px', color: '#1890ff' }}>
              KES {pump.unitPrice?.toFixed(2)}/L
            </Text>
          </Space>
        ),
      },
      {
        title: 'ELECTRIC METER',
        key: 'electric',
        width: 140,
        render: (_, pump) => {
          const isSelected = globalMeterType === 'electric';
          return (
            <div style={{ 
              padding: '4px',
              backgroundColor: isSelected ? '#f0f8ff' : 'transparent',
              borderRadius: '4px',
              border: isSelected ? '1px solid #1890ff' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
                <Text strong style={{ fontSize: '11px', color: '#1890ff', fontWeight: '700' }}>
                  {parseFloat(pump.openingElectricMeter).toFixed(3)}
                </Text>
              </div>
              <Input
                size="small"
                type="number"
                step="0.001"
                value={pump.closingElectricMeter}
                onChange={(e) => handlePumpReadingChange(pump.id, 'closingElectricMeter', e.target.value)}
                placeholder="Closing"
                style={{ 
                  width: '100%', 
                  fontSize: '12px',
                  height: '26px',
                  textAlign: 'center',
                  fontWeight: '600',
                  border: '1px solid #d9d9d9'
                }}
              />
            </div>
          );
        },
      },
      {
        title: 'MANUAL METER',
        key: 'manual',
        width: 140,
        render: (_, pump) => {
          const isSelected = globalMeterType === 'manual';
          return (
            <div style={{ 
              padding: '4px',
              backgroundColor: isSelected ? '#f6ffed' : 'transparent',
              borderRadius: '4px',
              border: isSelected ? '1px solid #52c41a' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
                <Text strong style={{ fontSize: '11px', color: '#52c41a', fontWeight: '700' }}>
                  {parseFloat(pump.openingManualMeter).toFixed(3)}
                </Text>
              </div>
              <Input
                size="small"
                type="number"
                step="0.001"
                value={pump.closingManualMeter}
                onChange={(e) => handlePumpReadingChange(pump.id, 'closingManualMeter', e.target.value)}
                placeholder="Closing"
                style={{ 
                  width: '100%', 
                  fontSize: '12px',
                  height: '26px',
                  textAlign: 'center',
                  fontWeight: '600',
                  border: '1px solid #d9d9d9'
                }}
              />
            </div>
          );
        },
      },
      {
        title: 'CASH METER',
        key: 'cash',
        width: 140,
        render: (_, pump) => {
          const isSelected = globalMeterType === 'cash';
          return (
            <div style={{ 
              padding: '4px',
              backgroundColor: isSelected ? '#fff7e6' : 'transparent',
              borderRadius: '4px',
              border: isSelected ? '1px solid #fa8c16' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <Text style={{ fontSize: '9px', color: '#666' }}>Opening:</Text>
                <Text strong style={{ fontSize: '11px', color: '#fa8c16', fontWeight: '700' }}>
                  {parseFloat(pump.openingCashMeter).toFixed(2)}
                </Text>
              </div>
              <Input
                size="small"
                type="number"
                step="0.01"
                value={pump.closingCashMeter}
                onChange={(e) => handlePumpReadingChange(pump.id, 'closingCashMeter', e.target.value)}
                placeholder="Closing"
                style={{ 
                  width: '100%', 
                  fontSize: '12px',
                  height: '26px',
                  textAlign: 'center',
                  fontWeight: '600',
                  border: '1px solid #d9d9d9'
                }}
              />
            </div>
          );
        },
      },
      {
        title: 'CALCULATED SALES',
        key: 'sales',
        width: 120,
        render: (_, pump) => {
          const calculated = calculatePumpValues().find(p => p.id === pump.id);
          const liters = calculated?.litersDispensed || 0;
          const sales = calculated?.salesValue || 0;
          
          return (
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <Text strong style={{ fontSize: '12px', color: '#722ed1', fontWeight: '700' }}>
                KES {sales.toFixed(2)}
              </Text>
              <div style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>
                {liters.toFixed(1)}L
              </div>
            </div>
          );
        },
      }
    ];
    
    const tankColumns = [
      {
        title: 'TANK DETAILS',
        key: 'tank',
        width: 180,
        render: (_, tank) => (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={14} color="#1890ff" />
              <Text strong style={{ fontSize: '12px' }}>{tank.name}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {tank.product?.name || 'Fuel'}
            </Text>
            <Text type="secondary" style={{ fontSize: '9px' }}>
              Capacity: {tank.capacity?.toLocaleString()}L
            </Text>
          </Space>
        ),
      },
      {
        title: 'OPENING VOLUME',
        key: 'opening',
        width: 120,
        render: (_, tank) => (
          <div style={{ padding: '4px', textAlign: 'center' }}>
            <Text strong style={{ fontSize: '12px', color: '#1890ff', fontWeight: '700' }}>
              {parseFloat(tank.openingCurrentVolume || tank.openingVolume).toFixed(1)}L
            </Text>
            <div style={{ fontSize: '9px', color: '#666' }}>
              Dip: {parseFloat(tank.openingDipValue).toFixed(3)}
            </div>
          </div>
        ),
      },
      {
        title: 'CURRENT VOLUME',
        key: 'currentVolume',
        width: 150,
        render: (_, tank) => (
          <div style={{ padding: '4px' }}>
            <Input
              size="small"
              type="number"
              step="0.1"
              value={tank.currentVolume}
              onChange={(e) => handleTankReadingChange(tank.id, 'currentVolume', e.target.value)}
              placeholder="Enter current volume"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                height: '32px',
                textAlign: 'center',
                fontWeight: '600',
                border: '2px solid #722ed1',
                borderRadius: '4px'
              }}
            />
            {tank.currentVolume && (
              <div style={{ fontSize: '10px', color: '#722ed1', textAlign: 'center', marginTop: '4px' }}>
                Current: {parseFloat(tank.currentVolume).toFixed(1)}L
              </div>
            )}
          </div>
        ),
      }
    ];

    return (
      <div style={{ padding: '12px' }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ marginBottom: 8 }}>
            📊 Shift Closing - Readings Collection
          </Title>
          
          <Card 
            size="small" 
            style={{ marginBottom: 12 }}
            bodyStyle={{ padding: '8px 12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: '13px' }}>Meter Calculation Method:</Text>
              <Select
                value={globalMeterType}
                onChange={setGlobalMeterType}
                style={{ width: 160 }}
                size="small"
              >
                <Option value="electric">⚡ Electric Meter</Option>
                <Option value="manual">📝 Manual Meter</Option>
                <Option value="cash">💰 Cash Meter</Option>
              </Select>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Enter closing readings for one meter type, others auto-calculate
              </Text>
            </div>
          </Card>
        </div>

        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Pumps Ready"
                value={`${pumpStats.completed}/${pumpStats.total}`}
                valueStyle={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: pumpStats.completed === pumpStats.total ? '#3f8600' : '#faad14' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Liters Dispensed"
                value={pumpStats.totalLiters}
                precision={1}
                suffix="L"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Expected Sales"
                value={pumpStats.totalSales}
                precision={2}
                prefix="KES"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card 
              size="small" 
              bodyStyle={{ 
                padding: '8px', 
                textAlign: 'center',
                backgroundColor: allComplete ? '#f6ffed' : '#fff7e6'
              }}
            >
              <Statistic
                title="Overall Status"
                value={allComplete ? "READY" : "IN PROGRESS"}
                valueStyle={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: allComplete ? '#52c41a' : '#faad14' 
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card bodyStyle={{ padding: '12px' }} style={{ marginBottom: 16 }}>
          <Tabs defaultActiveKey="pumps" size="small">
            <TabPane 
              tab={
                <Space>
                  <Zap size={12} />
                  Pumps ({pumpStats.completed}/{pumpStats.total})
                </Space>
              }
              key="pumps"
            >
              <Table
                columns={pumpColumns}
                dataSource={pumps}
                pagination={false}
                size="small"
                rowKey="id"
                loading={loading}
                scroll={{ x: 1000 }}
                style={{ fontSize: '11px' }}
              />
            </TabPane>
            <TabPane 
              tab={
                <Space>
                  <Droplets size={12} />
                  Tanks ({tankStats.completed}/{tankStats.total})
                </Space>
              }
              key="tanks"
            >
              <Table
                columns={tankColumns}
                dataSource={tanks}
                pagination={false}
                size="small"
                rowKey="id"
                loading={loading}
                scroll={{ x: 600 }}
                style={{ fontSize: '11px' }}
              />
            </TabPane>
          </Tabs>
        </Card>

        <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Button 
            type="primary"
            size="middle"
            icon={<Calculator size={14} />}
            onClick={handleNextStep}
            disabled={!allComplete}
            style={{ 
              height: '40px', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              padding: '0 24px',
              background: allComplete ? '#1890ff' : '#d9d9d9'
            }}
          >
            {allComplete ? (
              <Space>
                PROCEED TO ISLAND SALES
                <ArrowRight size={14} />
              </Space>
            ) : (
              `COMPLETE ALL READINGS (${pumpStats.completed}/${pumpStats.total} pumps, ${tankStats.completed}/${tankStats.total} tanks)`
            )}
          </Button>
        </div>
      </div>
    );
  };

  // 2. ISLAND SALES STEP COMPONENT
  const renderIslandSalesStep = () => {
    const islandStats = calculateIslandStats();
    const allHasSales = islandStats.every(island => island.hasSales);
    
    const columns = [
      {
        title: 'ISLAND',
        key: 'island',
        width: 150,
        render: (_, island) => (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Fuel size={14} color="#52c41a" />
              <Text strong style={{ fontSize: '12px' }}>{island.islandName}</Text>
            </div>
            {island.attendants && island.attendants.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {island.attendants.slice(0, 2).map((att, idx) => (
                  <Tag key={idx} size="small" color="blue">
                    {att.firstName?.charAt(0)}.{att.lastName}
                  </Tag>
                ))}
              </div>
            )}
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {island.pumps?.length || 0} pumps
            </Text>
          </Space>
        ),
      },
      {
        title: 'EXPECTED SALES',
        key: 'expected',
        width: 120,
        render: (_, island) => (
          <div style={{ padding: '4px 8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
            <Text strong style={{ fontSize: '11px', color: '#389e0d' }}>
              KES {island.totalPumpSales?.toFixed(2)}
            </Text>
          </div>
        ),
      },
      {
        title: 'ACTUAL SALES',
        key: 'actual',
        width: 140,
        render: (_, island) => (
          <InputNumber
            size="small"
            style={{ width: '100%', fontSize: '12px', fontWeight: 'bold' }}
            value={salesEntries[island.key]?.islandTotalSales || 0}
            onChange={(value) => setSalesEntries(prev => ({
              ...prev,
              [island.key]: { ...prev[island.key], islandTotalSales: value }
            }))}
            min={0}
            formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/KES\s?|(,*)/g, '')}
          />
        ),
      },
      {
        title: 'RECEIPTS',
        key: 'receipts',
        width: 120,
        render: (_, island) => (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            value={receipts[island.key] || 0}
            onChange={(value) => setReceipts(prev => ({ ...prev, [island.key]: value }))}
            min={0}
            formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/KES\s?|(,*)/g, '')}
          />
        ),
      },
      {
        title: 'EXPENSES',
        key: 'expenses',
        width: 120,
        render: (_, island) => (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            value={expenses[island.key] || 0}
            onChange={(value) => setExpenses(prev => ({ ...prev, [island.key]: value }))}
            min={0}
            formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/KES\s?|(,*)/g, '')}
          />
        ),
      },
      {
        title: 'STATUS',
        key: 'status',
        width: 100,
        render: (_, island) => (
          <Tag color={island.hasSales ? 'green' : 'red'} style={{ width: '100%', textAlign: 'center' }}>
            {island.hasSales ? '✓ Sales Entered' : 'No Sales'}
          </Tag>
        ),
      }
    ];

    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>💰 Island Sales</Title>

        <Row gutter={[8, 8]} style={{ marginBottom: 20 }}>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Total Islands"
                value={islandStats.length}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="With Sales"
                value={islandStats.filter(island => island.hasSales).length}
                suffix={`/ ${islandStats.length}`}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Total Expected"
                value={islandStats.reduce((sum, island) => sum + (island.totalPumpSales || 0), 0)}
                precision={0}
                prefix="KES"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Total Actual"
                value={islandStats.reduce((sum, island) => sum + (salesEntries[island.key]?.islandTotalSales || 0), 0)}
                precision={0}
                prefix="KES"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Status"
                value={allHasSales ? "Ready" : "In Progress"}
                valueStyle={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: allHasSales ? '#52c41a' : '#faad14' 
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card bodyStyle={{ padding: '12px' }} style={{ marginBottom: 16 }}>
          <Table
            columns={columns}
            dataSource={islandStats}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
            style={{ fontSize: '11px' }}
            rowKey="key"
          />
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Button 
            onClick={handlePrevStep} 
            icon={<ArrowLeft size={14} />}
            style={{ height: '40px' }}
          >
            BACK TO READINGS
          </Button>
          <Button 
            type="primary"
            onClick={handleNextStep}
            disabled={!allHasSales}
            style={{ 
              height: '40px',
              background: allHasSales ? '#1890ff' : '#d9d9d9'
            }}
          >
            {allHasSales ? (
              <Space>
                PROCEED TO COLLECTIONS
                <ArrowRight size={14} />
              </Space>
            ) : (
              `ENTER SALES FOR ALL ISLANDS`
            )}
          </Button>
        </div>
      </div>
    );
  };

  // 3. COLLECTIONS STEP COMPONENT
  const renderCollectionsStep = () => {
    const islandStats = calculateIslandStats();
    
    // Check if all islands have collections
    const allCollectionsComplete = islandStats.every(island => island.collectionsModalCompleted);
    
    // Check if all shortages are resolved
    const allShortagesResolved = islandStats.every(island => 
      island.variance <= 10 || island.shortagePosted
    );
    
    const columns = [
      {
        title: 'ISLAND',
        key: 'island',
        width: 150,
        render: (_, island) => (
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Fuel size={14} color="#52c41a" />
              <Text strong style={{ fontSize: '12px' }}>{island.islandName}</Text>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {island.attendants?.slice(0, 2).map((att, idx) => (
                <Tag key={idx} size="small" color="blue">
                  {att.firstName?.charAt(0)}.{att.lastName}
                </Tag>
              ))}
              {island.attendants?.length > 2 && (
                <Tag size="small">+{island.attendants.length - 2}</Tag>
              )}
            </div>
          </Space>
        ),
      },
      {
        title: 'EXPECTED TOTAL',
        width: 120,
        render: (_, island) => (
          <Text strong style={{ color: '#1890ff' }}>
            KES {island.totalExpected?.toFixed(2)}
          </Text>
        ),
      },
      {
        title: 'COLLECTED',
        width: 120,
        render: (_, island) => (
          <Text strong style={{ color: '#52c41a' }}>
            KES {island.totalCollection?.toFixed(2)}
          </Text>
        ),
      },
      {
        title: 'VARIANCE',
        width: 120,
        render: (_, island) => {
          if (island.variance === 0) {
            return <Tag color="green">KES 0.00</Tag>;
          } else if (island.variance > 0) {
            return (
              <Tag color={island.shortagePosted ? 'orange' : 'red'}>
                -KES {island.variance?.toFixed(2)}
                {island.shortagePosted && ' ✓'}
              </Tag>
            );
          } else {
            return <Tag color="gold">+KES {Math.abs(island.variance)?.toFixed(2)}</Tag>;
          }
        },
      },
      {
        title: 'COLLECTIONS',
        width: 100,
        render: (_, island) => {
          const cashCount = island.collections?.filter(c => c.type === 'cash').length || 0;
          const debtCount = island.collections?.filter(c => c.type === 'debt').length || 0;
          
          return (
            <Space>
              <Badge count={cashCount} size="small" style={{ backgroundColor: '#52c41a' }} />
              <Badge count={debtCount} size="small" style={{ backgroundColor: '#1890ff' }} />
            </Space>
          );
        },
      },
      {
        title: 'STATUS',
        width: 120,
        render: (_, island) => {
          if (!island.collectionsModalCompleted) {
            return <Tag color="red">Pending</Tag>;
          }
          
          if (island.variance === 0) {
            return <Tag color="green">Balanced</Tag>;
          }
          
          if (island.variance > 0 && island.shortagePosted) {
            return <Tag color="orange">Shortage Posted</Tag>;
          }
          
          if (island.variance > 0) {
            return <Tag color="red">Shortage Unresolved</Tag>;
          }
          
          return <Tag color="gold">Overage</Tag>;
        },
      },
      {
        title: 'ACTIONS',
        width: 120,
        render: (_, island) => (
          <Button
            type={island.collectionsModalCompleted ? "primary" : "default"}
            onClick={() => {
              setCurrentIslandIndex(island.key);
              setCollectionsModalVisible(true);
            }}
            size="small"
          >
            {island.collectionsModalCompleted ? 'Edit' : 'Enter'}
          </Button>
        ),
      }
    ];

    // Calculate summary statistics
    const totalIslands = islandStats.length;
    const islandsWithCollections = islandStats.filter(island => island.collectionsModalCompleted).length;
    const islandsWithShortages = islandStats.filter(island => island.variance > 10).length;
    const islandsWithPostedShortages = islandStats.filter(island => island.shortagePosted).length;
    const totalShortageAmount = islandStats
      .filter(island => island.shortagePosted)
      .reduce((sum, island) => sum + island.variance, 0);

    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>
          <Space>
            <Wallet size={18} />
            Collections
            {!allShortagesResolved && (
              <Badge count="!" style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }} />
            )}
          </Space>
        </Title>
        
        {/* Summary Statistics */}
        <Row gutter={[8, 8]} style={{ marginBottom: 20 }}>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Islands"
                value={islandsWithCollections}
                suffix={`/ ${totalIslands}`}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="With Shortages"
                value={islandsWithShortages}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Shortages Posted"
                value={islandsWithPostedShortages}
                suffix={`/ ${islandsWithShortages}`}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Total Shortage"
                value={totalShortageAmount}
                precision={0}
                prefix="KES"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card 
              size="small" 
              bodyStyle={{ 
                padding: '8px', 
                textAlign: 'center',
                backgroundColor: allCollectionsComplete && allShortagesResolved ? '#f6ffed' : '#fff7e6'
              }}
            >
              <Statistic
                title="Status"
                value={allCollectionsComplete && allShortagesResolved ? "Ready" : "In Progress"}
                valueStyle={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: allCollectionsComplete && allShortagesResolved ? '#52c41a' : '#faad14' 
                }}
              />
            </Card>
          </Col>
        </Row>
        
        {/* Summary Alert */}
        {!allShortagesResolved && (
          <Alert
            message="Action Required"
            description="Some islands have unresolved shortages above KES 10. Please post shortages to attendants before proceeding."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Card bodyStyle={{ padding: '12px' }} style={{ marginBottom: 16 }}>
          <Table
            columns={columns}
            dataSource={islandStats}
            size="small"
            pagination={false}
            scroll={{ y: 400 }}
            rowKey="key"
          />
        </Card>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handlePrevStep} icon={<ArrowLeft size={16} />}>
            Back to Sales
          </Button>
          <Button
            type="primary"
            onClick={handleNextStep}
            disabled={!allCollectionsComplete || !allShortagesResolved}
            style={{ 
              background: allCollectionsComplete && allShortagesResolved ? '#1890ff' : '#d9d9d9'
            }}
          >
            {allShortagesResolved ? 'Review & Submit' : 'Resolve Shortages First'}
          </Button>
        </div>
        
        <CollectionsModal
          visible={collectionsModalVisible}
          onCancel={() => setCollectionsModalVisible(false)}
          onSave={(collectionsData, variance) => handleIslandCollectionsSave(currentIslandIndex, collectionsData, variance)}
          islandIndex={currentIslandIndex}
          currentCollections={collections[currentIslandIndex] || []}
        />
      </div>
    );
  };

  // 4. SUMMARY STEP COMPONENT
  const renderSummaryStep = () => {
    const islandStats = calculateIslandStats();
    
    // Calculate totals
    const totalExpectedSales = islandStats.reduce((sum, island) => sum + (island.totalPumpSales || 0), 0);
    const totalActualSales = islandStats.reduce((sum, island) => sum + (island.totalActualSales || 0), 0);
    const totalCollections = islandStats.reduce((sum, island) => sum + (island.totalCollection || 0), 0);
    const totalVariance = islandStats.reduce((sum, island) => sum + (island.variance || 0), 0);
    
    // Shortage statistics
    const islandsWithShortages = islandStats.filter(island => island.variance > 10);
    const islandsWithPostedShortages = islandStats.filter(island => island.shortagePosted);
    const totalShortageAmount = islandsWithPostedShortages.reduce((sum, island) => sum + island.variance, 0);

    const handleSubmitShiftClosure = async () => {
      setIsSubmitting(true);
      try {
        // Prepare shift closure data
        const payload = {
          shiftId: shift?.id,
          stationId: currentStationId,
          recordedById: currentUser?.id,
          endTime: new Date().toISOString(),
          readings: {
            pumps: pumps.map(pump => ({
              pumpId: pump.pumpId,
              closingElectricMeter: parseFloat(pump.closingElectricMeter) || 0,
              closingManualMeter: parseFloat(pump.closingManualMeter) || 0,
              closingCashMeter: parseFloat(pump.closingCashMeter) || 0
            })),
            tanks: tanks.map(tank => ({
              tankId: tank.tankId,
              closingVolume: parseFloat(tank.closingVolume) || 0,
              closingDipValue: parseFloat(tank.closingDipValue) || 0
            }))
          },
          sales: Object.entries(salesEntries).map(([key, entry]) => ({
            islandId: islandsData.find(island => island.key === parseInt(key))?.islandId,
            totalSales: entry.islandTotalSales,
            notes: entry.notes
          })),
          collections: Object.entries(collections).map(([key, coll]) => ({
            islandId: islandsData.find(island => island.key === parseInt(key))?.islandId,
            collections: coll,
            variance: islandStats.find(island => island.key === parseInt(key))?.variance || 0
          })),
          shortages: Object.entries(postedShortages).map(([key, shortage]) => ({
            islandId: islandsData.find(island => island.key === parseInt(key))?.islandId,
            shortageId: shortage.id,
            amount: shortage.amount,
            attendantId: islandStats.find(island => island.key === parseInt(key))?.attendants?.[0]?.id
          })),
          summary: {
            totalPumps: pumps.length,
            totalTanks: tanks.length,
            totalExpectedSales,
            totalActualSales,
            totalCollections,
            totalVariance,
            shortagesPosted: Object.keys(postedShortages).length,
            totalShortageAmount
          }
        };

        console.log('Submitting shift closure:', payload);
        
        // Call API to close shift
        // await shiftService.closeShift(payload);
        
        clearCache();
        message.success('Shift closed successfully!');
        
        // Call success callback with results
        if (onSuccess) {
          onSuccess({
            ...payload,
            islandStats,
            postedShortages
          });
        }
        
      } catch (error) {
        console.error('Error closing shift:', error);
        message.error('Failed to close shift');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>📋 Review & Submit</Title>
        
        {/* SHORTAGE SUMMARY CARD */}
        {islandsWithPostedShortages.length > 0 && (
          <Card 
            title={
              <Space>
                <AlertTriangle size={16} color="#fa8c16" />
                <Text strong>Shortage Summary</Text>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: '#ffa940' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Total Shortage Posted"
                  value={totalShortageAmount}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Islands with Shortages"
                  value={islandsWithShortages.length}
                  suffix={`/ ${islandStats.length}`}
                  valueStyle={{ color: islandsWithShortages.length > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Shortages Posted"
                  value={islandsWithPostedShortages.length}
                  suffix={`/ ${islandsWithShortages.length}`}
                  valueStyle={{ 
                    color: islandsWithPostedShortages.length === islandsWithShortages.length ? '#52c41a' : 
                           islandsWithPostedShortages.length > 0 ? '#fa8c16' : '#ff4d4f'
                  }}
                />
              </Col>
            </Row>
            
            {/* List of posted shortages */}
            {islandsWithPostedShortages.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Shortages Posted to Attendants:
                </Text>
                {islandsWithPostedShortages.map((island, idx) => (
                  <Alert
                    key={idx}
                    message={
                      <Space direction="vertical" size={0}>
                        <Text strong>{island.islandName}</Text>
                        <Space>
                          <Text>
                            Shortage: <Tag color="red">KES {island.variance.toFixed(2)}</Tag>
                          </Text>
                          {island.attendants && island.attendants.length > 0 && (
                            <Text>
                              To: <Tag color="blue">{island.attendants[0].firstName} {island.attendants[0].lastName}</Tag>
                            </Text>
                          )}
                          <Tag color="green" icon={<CheckCircle size={12} />}>
                            Posted to attendant account
                          </Tag>
                        </Space>
                      </Space>
                    }
                    type="success"
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </div>
            )}
          </Card>
        )}
        
        {/* SHIFT SUMMARY */}
        <Card style={{ marginBottom: 16 }}>
          <Descriptions title="Shift Summary" column={2}>
            <Descriptions.Item label="Total Expected Sales">
              <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                KES {totalExpectedSales.toFixed(2)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Actual Sales">
              <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                KES {totalActualSales.toFixed(2)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Collections">
              <Text strong>KES {totalCollections.toFixed(2)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Net Variance">
              <Tag 
                color={totalVariance === 0 ? 'green' : totalVariance > 0 ? 'red' : 'gold'} 
                style={{ fontSize: '14px', padding: '4px 8px' }}
              >
                {totalVariance > 0 ? '-' : totalVariance < 0 ? '+' : ''}KES {Math.abs(totalVariance).toFixed(2)}
                {totalVariance > 0 && islandsWithPostedShortages.length > 0 && ' (Posted)'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Pumps">
              {pumps.length}
            </Descriptions.Item>
            <Descriptions.Item label="Total Tanks">
              {tanks.length}
            </Descriptions.Item>
            <Descriptions.Item label="Total Islands">
              {islandStats.length}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color="green">Ready for Submission</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
        
        {/* ISLAND DETAILS */}
        <Card title="Island Details" style={{ marginBottom: 16 }}>
          <Table
            dataSource={islandStats}
            size="small"
            pagination={false}
            columns={[
              { 
                title: 'Island', 
                dataIndex: 'islandName',
                render: (text, record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    {record.attendants && record.attendants.length > 0 && (
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Attendant: {record.attendants[0].firstName} {record.attendants[0].lastName}
                      </Text>
                    )}
                  </Space>
                )
              },
              { 
                title: 'Expected', 
                render: (_, r) => `KES ${r.totalExpected?.toFixed(2)}`,
                align: 'right'
              },
              { 
                title: 'Collected', 
                render: (_, r) => `KES ${r.totalCollection?.toFixed(2)}`,
                align: 'right'
              },
              { 
                title: 'Variance', 
                render: (_, r) => (
                  <Tag 
                    color={r.variance === 0 ? 'green' : r.variance > 0 ? r.shortagePosted ? 'orange' : 'red' : 'gold'}
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    {r.variance > 0 ? '-' : r.variance < 0 ? '+' : ''}KES {Math.abs(r.variance)?.toFixed(2)}
                    {r.shortagePosted && ' ✓'}
                  </Tag>
                ),
                align: 'center'
              },
              { 
                title: 'Collections', 
                render: (_, r) => {
                  const cashCount = r.collections?.filter(c => c.type === 'cash').length || 0;
                  const debtCount = r.collections?.filter(c => c.type === 'debt').length || 0;
                  return (
                    <Space>
                      <Badge count={cashCount} size="small" style={{ backgroundColor: '#52c41a' }} title="Cash drops" />
                      <Badge count={debtCount} size="small" style={{ backgroundColor: '#1890ff' }} title="Debt collections" />
                    </Space>
                  );
                }
              }
            ]}
            rowKey="key"
          />
        </Card>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handlePrevStep} icon={<ArrowLeft size={16} />}>
            Back to Collections
          </Button>
          
          <Space>
            <Button
              onClick={clearCache}
              danger
              icon={<Trash2 size={16} />}
            >
              Clear Draft
            </Button>
            <Button
              type="primary"
              onClick={handleSubmitShiftClosure}
              loading={isSubmitting}
              icon={<CheckSquare size={16} />}
              size="large"
              style={{ minWidth: 200 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Shift Closure'}
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>Shift Closure</Title>
          <Text type="secondary">Shift #{shift?.shiftNumber} • {state?.currentStation?.name}</Text>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<Save size={16} />}
            onClick={saveToCache}
            size="small"
            type="dashed"
            disabled={loading}
          >
            Save Draft
          </Button>
          <Button
            icon={<X size={16} />}
            onClick={() => {
              Modal.confirm({
                title: 'Close Shift Closure',
                content: 'Are you sure you want to close? Unsaved changes will be lost.',
                okText: 'Yes, Close',
                cancelText: 'Cancel',
                onOk: () => {
                  clearCache();
                  onClose?.();
                }
              });
            }}
            size="small"
            danger
            disabled={loading}
          >
            Close
          </Button>
        </Space>
      }
      style={{ height: '100%' }}
      bodyStyle={{ padding: 0 }}
    >
      <Steps current={currentStep} style={{ padding: '16px 24px 0' }}>
        {steps.map(step => (
          <Step key={step.key} title={step.title} icon={step.icon} />
        ))}
      </Steps>
      
      <Divider style={{ margin: '16px 0 0' }} />
      
      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading shift data...</div>
          </div>
        ) : (
          <>
            {currentStep === 0 && renderReadingsStep()}
            {currentStep === 1 && renderIslandSalesStep()}
            {currentStep === 2 && renderCollectionsStep()}
            {currentStep === 3 && renderSummaryStep()}
          </>
        )}
      </div>
    </Card>
  );
};

export default IntegratedShiftClose;