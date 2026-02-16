// IntegratedShiftClose.jsx (FIXED - Overage removed, only shortages tracked)
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
import { CalendarOutlined, UserOutlined, BankOutlined } from '@ant-design/icons';
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
  AlertCircle,
  FileCheck,
  FolderPlus,
  Download,
  FileDown,
  Printer
} from 'lucide-react';
import { useApp } from '../../../../../context/AppContext';
import { shiftService } from '../../../../../services/shiftService/shiftService';
import { islandPumpMappingService } from '../../../../../services/assetTopologyService/islandPumpMappingService';
import { assetTopologyService } from '../../../../../services/assetTopologyService/assetTopologyService';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import { shortageService } from '../../../../../services/shortageService/shortageService';
import { staffAccountService } from '../../../../../services/staffAccountService/staffAccountService';
import { bankingService } from '../../../../../services/bankingService/bankingService';
import { expenseService } from '../../../../../services/expenseService/expenseService';
import EnhancedSummaryModal from './EnhancedSummaryModal';
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
  const [autoExpenses, setAutoExpenses] = useState({});
  
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
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

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
      autoExpenses,
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
        
        if (data.shiftId === shift?.id && Date.now() - data.timestamp < TWO_HOURS) {
          console.log('📂 Loading from cache');
          
          setCurrentStep(data.step || 0);
          setPumps(data.pumps || []);
          setTanks(data.tanks || []);
          setGlobalMeterType(data.globalMeterType || 'electric');
          setSalesEntries(data.salesEntries || {});
          setReceipts(data.receipts || {});
          setExpenses(data.expenses || {});
          setAutoExpenses(data.autoExpenses || {});
          setCollections(data.collections || {});
          setPostedShortages(data.postedShortages || {});
          
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
      loadExistingExpenses();
    }
  }, [currentStationId, shift?.id]);

  // ========== AUTO-SAVE ON CHANGES ==========
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToCache();
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [pumps, tanks, salesEntries, receipts, expenses, autoExpenses, collections, postedShortages]);

  // ========== LOAD EXISTING EXPENSES ==========
  const loadExistingExpenses = async () => {
    if (!shift?.id || !currentStationId) return;
    
    try {
      const filters = {
        stationId: currentStationId,
        shiftId: shift.id,
        status: 'APPROVED',
        paymentSource: 'ISLAND_COLLECTION'
      };
      
      const response = await expenseService.getExpenses(filters);
      const expensesData = response.data || response || [];
      
      console.log('📝 Existing expenses for shift:', expensesData);
      
      const expensesByIsland = {};
      expensesData.forEach(expense => {
        if (expense.islandId && expense.amount > 0) {
          if (!expensesByIsland[expense.islandId]) {
            expensesByIsland[expense.islandId] = [];
          }
          expensesByIsland[expense.islandId].push({
            id: expense.id,
            amount: expense.amount,
            title: expense.title,
            description: expense.description,
            category: expense.category,
            expenseNumber: expense.expenseNumber,
            approvedAt: expense.approvedAt
          });
        }
      });
      
      const autoExpenseTotals = {};
      Object.keys(expensesByIsland).forEach(islandId => {
        const total = expensesByIsland[islandId].reduce((sum, exp) => sum + exp.amount, 0);
        autoExpenseTotals[islandId] = {
          total,
          details: expensesByIsland[islandId]
        };
      });
      
      setAutoExpenses(autoExpenseTotals);
      
      if (currentStep >= 1) {
        prepareIslandsData(pumps, {});
      }
      
      message.success(`Loaded ${expensesData.length} existing expenses`);
      
    } catch (error) {
      console.error('Failed to load existing expenses:', error);
      message.error('Could not load existing expenses');
    }
  };

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

      const islandAssignments = {};
      (openShiftData.shiftIslandAttendant || []).forEach((assignment) => {
        if (assignment.islandId && assignment.attendant) {
          islandAssignments[assignment.islandId] = assignment.attendant;
        }
      });

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

      const transformedPumps = (openShiftData.meterReadings || []).map(meterReading => {
        const productInfo = pumpProductMap.get(meterReading.pumpId);

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
      
      prepareIslandsData(transformedPumps, islandAssignments);
      
      loadExistingExpenses();
      
    } catch (error) {
      console.error('❌ Error loading open shift readings:', error);
      message.error('Failed to load open shift readings');
    } finally {
      setLoading(false);
    }
  };

  const prepareIslandsData = (pumpsData, islandAssignments) => {
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

    const islands = Object.values(pumpsByIsland).map((islandData, index) => {
      const attendants = islandData.attendant ? [islandData.attendant] : [];

      const islandAutoExpenses = islandData.islandId ? autoExpenses[islandData.islandId] : null;
      const autoExpenseTotal = islandAutoExpenses?.total || 0;
      const autoExpenseDetails = islandAutoExpenses?.details || [];

      return {
        key: index,
        islandId: islandData.islandId,
        islandName: islandData.islandName,
        attendants: attendants,
        pumps: islandData.pumps,
        totalPumpSales: calculateIslandExpectedSales(islandData.pumps),
        autoExpenses: autoExpenseTotal,
        autoExpenseDetails: autoExpenseDetails
      };
    });

    setIslandsData(islands);
    
    const initialEntries = {};
    islands.forEach((island) => {
      if (!salesEntries[island.key]) {
        initialEntries[island.key] = {
          islandTotalSales: island.totalPumpSales || 0,
          notes: ''
        };
      }
      
      if (island.autoExpenses > 0 && !expenses[island.key]) {
        setExpenses(prev => ({
          ...prev,
          [island.key]: island.autoExpenses
        }));
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
        salesValue: salesValue,
        electricMeter: parseFloat(pump.closingElectricMeter) || 0,
        manualMeter: parseFloat(pump.closingManualMeter) || 0,
        cashMeter: parseFloat(pump.closingCashMeter) || 0
      };
    });
  }, [pumps, globalMeterType]);

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
      const manualExpenseAmount = expenses[islandKey] || 0;
      const autoExpenseAmount = island.autoExpenses || 0;
      const totalExpenses = manualExpenseAmount + autoExpenseAmount;
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
      const totalExpected = totalPumpSales + islandReceipts - totalExpenses;
      
      // ========== MODIFIED LOGIC HERE ==========
      // Only calculate shortage when collections are LESS THAN expected
      // If collections are EQUAL TO or GREATER THAN expected, variance is 0 (no shortage)
      let shortageAmount = 0;
      if (totalExpected > totalCollection) {
        shortageAmount = totalExpected - totalCollection;
      }
      
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
        manualExpenses: manualExpenseAmount,
        autoExpenses: autoExpenseAmount,
        totalExpenses,
        receipts: islandReceipts,
        totalExpected,
        shortageAmount, // Only populated when below expected
        variance: shortageAmount, // Keep for backward compatibility but now only represents shortage
        hasSales,
        collectionsModalCompleted,
        shortagePosted,
        shortageRecord: postedShortages[islandKey],
        // Add a status flag for UI
        collectionStatus: totalCollection >= totalExpected ? 'full' : 'short'
      };
    });
  };

  const postShortage = async (islandData, shortageAmount, totalExpected, totalCollected) => {
    if (shortageAmount <= 10) {
      message.info(`Shortage of KES ${shortageAmount.toFixed(2)} is below minimum threshold (KES 10)`);
      return null;
    }

    if (!islandData.attendants || islandData.attendants.length === 0) {
      message.error('No attendant assigned to this island. Cannot post shortage.');
      return null;
    }

    const primaryAttendant = islandData.attendants[0];
    
    try {
      const staffAccount = await staffAccountService.getStaffAccountByUserId(primaryAttendant.id);
      
      if (!staffAccount) {
        message.error(`No staff account found for ${primaryAttendant.firstName} ${primaryAttendant.lastName}`);
        return null;
      }

      const today = dayjs();
      const endOfMonth = today.endOf('month');

      const shortageData = {
        staffAccountId: staffAccount.id,
        amount: shortageAmount,
        description: `Shortage during shift closing - Shift ${shift?.shiftNumber || 'N/A'} at ${islandData.islandName}`,
        shortageType: 'CASH',
        responsibleParty: 'ATTENDANT',
        severity: shortageAmount > 5000 ? 'HIGH' : shortageAmount > 1000 ? 'MODERATE' : 'LOW',
        comments: `Auto-posted during shift closing. Expected: KES ${totalExpected.toFixed(2)}, Collected: KES ${totalCollected.toFixed(2)}`,
        shiftId: shift?.id,
        islandId: islandData.islandId,
        dueDate: endOfMonth.toISOString(),
        recordedById: currentUser?.id,
        stationId: currentStationId,
        autoGenerated: true
      };

      console.log('Posting shortage:', shortageData);
      
      const shortage = await shortageService.createShortage(shortageData);
      
      message.success(`Shortage of KES ${shortageAmount.toFixed(2)} posted to ${primaryAttendant.firstName} ${primaryAttendant.lastName}`);
      
      return shortage;
    } catch (error) {
      console.error('Error posting shortage:', error);
      message.error(`Failed to post shortage: ${error.message}`);
      return null;
    }
  };

  // ========== COLLECTIONS MODAL - MODIFIED VERSION ==========
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
    const [searchDebtor, setSearchDebtor] = useState('');
    const [selectedIsland, setSelectedIsland] = useState(null);
    const [hasPendingShortage, setHasPendingShortage] = useState(false);
    const [justPostedShortage, setJustPostedShortage] = useState(false);
    
    const [shortageModalVisible, setShortageModalVisible] = useState(false);
    const [shortageDetails, setShortageDetails] = useState(null);
    const [creatingShortage, setCreatingShortage] = useState(false);
    
    const [hasUnaddedCash, setHasUnaddedCash] = useState(false);
    
    useEffect(() => {
      setHasUnaddedCash(cashAmount && parseFloat(cashAmount) > 0);
    }, [cashAmount]);
    
    useEffect(() => {
      if (visible && islandIndex !== undefined) {
        const island = islandsData.find(island => island.key === islandIndex);
        setSelectedIsland(island);
        setLocalCollections(currentCollections || []);
        setHasPendingShortage(false);
        setJustPostedShortage(false);
        setCashAmount('');
        setDebtAmount('');
        setSelectedDebtor(null);
        setSearchDebtor('');
      }
    }, [visible, islandIndex, currentCollections]);

    const filteredDebtors = useMemo(() => {
      if (!searchDebtor) return debtors;
      return debtors.filter(debtor =>
        debtor.name?.toLowerCase().includes(searchDebtor.toLowerCase()) ||
        debtor.phone?.toLowerCase().includes(searchDebtor.toLowerCase()) ||
        debtor.code?.toLowerCase().includes(searchDebtor.toLowerCase())
      );
    }, [debtors, searchDebtor]);

    const totalPumpSales = selectedIsland?.totalPumpSales || 0;
    const islandReceipts = receipts[islandIndex] || 0;
    const manualExpenseAmount = expenses[islandIndex] || 0;
    const autoExpenseAmount = selectedIsland?.autoExpenses || 0;
    const totalExpenses = manualExpenseAmount + autoExpenseAmount;
    const totalExpected = totalPumpSales + islandReceipts - totalExpenses;
    
    const currentCashCollection = localCollections
      .filter(c => c?.type === 'cash')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    
    const currentDebtCollections = localCollections
      .filter(c => c?.type === 'debt');
    
    const totalDebtCollection = currentDebtCollections
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    
    const currentTotal = currentCashCollection + totalDebtCollection;
    
    // Display total including pending cash input
    const displayTotal = currentTotal + (parseFloat(cashAmount) || 0);
    
    // ========== MODIFIED LOGIC HERE ==========
    // Only show shortage if totalExpected > displayTotal
    // If displayTotal >= totalExpected, no shortage
    const hasShortage = totalExpected > displayTotal;
    const shortageAmount = hasShortage ? totalExpected - displayTotal : 0;
    
    const shortagePosted = selectedIsland ? postedShortages[selectedIsland.key] : false;
    
    useEffect(() => {
      if (selectedIsland && postedShortages[selectedIsland.key]) {
        console.log('✅ Shortage already posted for this island:', postedShortages[selectedIsland.key]);
        setJustPostedShortage(true);
        setHasPendingShortage(false);
      } else if (selectedIsland && hasShortage) {
        setHasPendingShortage(true);
        setJustPostedShortage(false);
      } else {
        setHasPendingShortage(false);
        setJustPostedShortage(false);
      }
    }, [selectedIsland, postedShortages, hasShortage]);
    
    const canSaveCollections = localCollections.length > 0 && 
      !hasUnaddedCash &&
      (!hasShortage || shortagePosted || justPostedShortage);

    const getSeverityLevel = (amount) => {
      if (amount <= 1000) return 'MINOR';
      if (amount <= 5000) return 'MODERATE';
      if (amount <= 20000) return 'MAJOR';
      return 'CRITICAL';
    };
    
    const prepareShortageDetails = async () => {
      if (!selectedIsland || !selectedIsland.attendants || selectedIsland.attendants.length === 0) {
        console.error('❌ No attendant assigned to this island');
        message.error('No attendant assigned to this island');
        return null;
      }

      const primaryAttendant = selectedIsland.attendants[0];
      
      let staffAccount = null;
      let staffAccountId = null;
      
      try {
        const result = await staffAccountService.getStaffAccountsByStation(currentStationId);
        const accounts = result?.accounts || result?.data || result || [];
        
        staffAccount = accounts.find(account => {
          const userId = account.user?.id || account.userId;
          return userId === primaryAttendant.id;
        });
        
        if (!staffAccount) {
          const attendantFullName = `${primaryAttendant.firstName} ${primaryAttendant.lastName}`.toLowerCase().trim();
          
          staffAccount = accounts.find(account => {
            const accountFullName = `${account.user?.firstName || ''} ${account.user?.lastName || ''}`.toLowerCase().trim();
            return accountFullName === attendantFullName;
          });
        }
        
        if (staffAccount) {
          staffAccountId = staffAccount.id;
        } else {
          console.error('❌ NO STAFF ACCOUNT FOUND for attendant');
          message.error(`No staff account found for ${primaryAttendant.firstName} ${primaryAttendant.lastName}. Please ensure the attendant has a staff account.`);
          return null;
        }
        
      } catch (error) {
        console.error('❌ ERROR fetching staff accounts:', error);
        message.error('Failed to fetch staff accounts');
        return null;
      }
      
      const today = dayjs();
      const dueDate = today.add(30, 'day');
      const shortageType = 'CASH';
      const responsibleParty = 'ATTENDANT';
      const severity = getSeverityLevel(shortageAmount);
      
      const description = `Island Collection Shortage - ${selectedIsland.islandName}, Shift #${shift?.shiftNumber || 'N/A'}`;
      
      const comments = `Generated from shift closing collections:
      • Station: ${state?.currentStation?.name || 'Unknown'}
      • Island: ${selectedIsland.islandName}
      • Shift: #${shift?.shiftNumber || 'N/A'}
      • Attendant: ${primaryAttendant.firstName} ${primaryAttendant.lastName}
      • Pump Sales: KES ${totalPumpSales.toFixed(2)}
      • Receipts: KES ${islandReceipts.toFixed(2)}
      • Auto Expenses: KES ${autoExpenseAmount.toFixed(2)}
      • Manual Expenses: KES ${manualExpenseAmount.toFixed(2)}
      • Expected Total: KES ${totalExpected.toFixed(2)}
      • Collected (with pending): KES ${displayTotal.toFixed(2)}
      • Shortage: KES ${shortageAmount.toFixed(2)}
      • Generated on: ${today.format('DD/MM/YYYY HH:mm:ss')}`;
      
      const shortageDetails = {
        attendant: primaryAttendant,
        attendantId: primaryAttendant.id,
        attendantName: `${primaryAttendant.firstName} ${primaryAttendant.lastName}`,
        staffAccountId: staffAccountId,
        staffAccount: staffAccount,
        stationId: currentStationId,
        stationName: state?.currentStation?.name,
        islandId: selectedIsland.islandId,
        islandName: selectedIsland.islandName,
        shiftId: shift?.id,
        shiftNumber: shift?.shiftNumber,
        shortageAmount: shortageAmount,
        shortageType: shortageType,
        responsibleParty: responsibleParty,
        severity: severity,
        description: description,
        comments: comments,
        dueDate: dueDate.toISOString(),
        incidentDate: new Date().toISOString(),
        submitDate: today.toISOString(),
        collectionDetails: {
          totalExpected,
          totalCollected: displayTotal,
          shortageAmount,
          cashCollections: localCollections.filter(c => c.type === 'cash'),
          debtCollections: localCollections.filter(c => c.type === 'debt'),
          receipts: islandReceipts,
          autoExpenses: autoExpenseAmount,
          manualExpenses: manualExpenseAmount,
          totalExpenses: totalExpenses,
          pumpSales: totalPumpSales,
          timestamp: new Date().toISOString()
        }
      };
      
      return shortageDetails;
    };

    const handleCreateShortageRecord = async () => {
      if (!shortageDetails) return;
      
      setCreatingShortage(true);
      try {
        if (!shortageDetails.staffAccountId) {
          message.error(`No staff account found for ${shortageDetails.attendantName}`);
          return;
        }

        const shortageData = {
          staffAccountId: shortageDetails.staffAccountId,
          amount: shortageDetails.shortageAmount,
          description: shortageDetails.description,
          shortageType: shortageDetails.shortageType,
          responsibleParty: shortageDetails.responsibleParty,
          severity: shortageDetails.severity,
          comments: shortageDetails.comments,
          shiftId: shortageDetails.shiftId,
          islandId: shortageDetails.islandId,
          dueDate: shortageDetails.dueDate,
          incidentDate: shortageDetails.incidentDate,
          recordedById: currentUser?.id,
          stationId: shortageDetails.stationId,
          submitDate: shortageDetails.submitDate,
          autoGenerated: true,
          source: 'SHIFT_CLOSING_COLLECTIONS',
          metadata: JSON.stringify({
            collectionDetails: shortageDetails.collectionDetails,
            stationName: shortageDetails.stationName,
            islandName: shortageDetails.islandName,
            shiftNumber: shortageDetails.shiftNumber,
            attendantName: shortageDetails.attendantName
          })
        };

        console.log('Creating complete shortage record:', shortageData);
        
        const response = await shortageService.createShortage(shortageData);
        const shortage = response.data;
        
        message.success(`Shortage of KES ${shortageDetails.shortageAmount.toFixed(2)} created for ${shortageDetails.attendantName}`);
        
        setPostedShortages(prev => ({
          ...prev,
          [selectedIsland.key]: {
            ...shortage,
            postedAt: new Date().toISOString(),
            attendantName: shortageDetails.attendantName,
            amount: shortageDetails.shortageAmount,
            dueDate: shortageDetails.dueDate
          }
        }));
        
        setJustPostedShortage(true);
        setHasPendingShortage(false);
        
        setShortageModalVisible(false);
        
        message.success({
          content: (
            <div>
              <p><strong>KES {shortageDetails.shortageAmount.toFixed(2)} shortage recorded</strong></p>
              <p>Attendant: {shortageDetails.attendantName}</p>
              <p>Due Date: {dayjs(shortageDetails.dueDate).format('DD/MM/YYYY')}</p>
            </div>
          ),
          duration: 4,
        });
        
      } catch (error) {
        console.error('Error creating shortage record:', error);
        message.error(`Failed to create shortage: ${error.message}`);
      } finally {
        setCreatingShortage(false);
      }
    };

    const handleOpenShortageCreation = async () => {
      console.log('Opening shortage creation modal...');
      
      try {
        const details = await prepareShortageDetails();
        if (details) {
          setShortageDetails(details);
          setShortageModalVisible(true);
        }
      } catch (error) {
        console.error('Error preparing shortage details:', error);
        message.error('Failed to prepare shortage details');
      }
    };

    const ShortageCreationModal = () => {
      if (!shortageDetails) return null;

      return (
        <Modal
          title={
            <Space>
              <AlertTriangle size={16} color="#fa8c16" />
              <Text strong>Create Shortage Record</Text>
              <Tag color="red" style={{ marginLeft: 8 }}>
                KES {shortageDetails.shortageAmount.toFixed(2)}
              </Tag>
            </Space>
          }
          open={shortageModalVisible}
          onCancel={() => {
            if (!creatingShortage) {
              setShortageModalVisible(false);
            }
          }}
          width={750}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => setShortageModalVisible(false)}
              disabled={creatingShortage}
            >
              Cancel
            </Button>,
            <Button
              key="create"
              type="primary"
              onClick={handleCreateShortageRecord}
              loading={creatingShortage}
              icon={creatingShortage ? null : <CheckSquare size={14} />}
              disabled={!shortageDetails.staffAccountId || creatingShortage}
            >
              {creatingShortage ? 'Creating Shortage Record...' : 'Create Shortage Record'}
            </Button>
          ]}
          maskClosable={!creatingShortage}
          closable={!creatingShortage}
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <Card 
              size="small" 
              style={{ marginBottom: 16, borderLeft: '4px solid #1890ff' }}
            >
              <Descriptions title="Attendant & Basic Information" column={2} size="small">
                <Descriptions.Item label="Attendant" span={2}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Space>
                      <UserOutlined style={{ color: '#1890ff' }} />
                      <Text strong style={{ fontSize: '15px' }}>
                        {shortageDetails.attendantName}
                      </Text>
                    </Space>
                  </Space>
                </Descriptions.Item>
                
                <Descriptions.Item label="Station">
                  <Space>
                    <BankOutlined />
                    <Text>{shortageDetails.stationName || 'Unknown Station'}</Text>
                  </Space>
                </Descriptions.Item>
                
                <Descriptions.Item label="Island">
                  <Space>
                    <Fuel size={14} color="#52c41a" />
                    <Text>{shortageDetails.islandName}</Text>
                  </Space>
                </Descriptions.Item>
                
                <Descriptions.Item label="Shift">
                  <Space>
                    <Clock size={14} />
                    <Tag color="blue">#{shortageDetails.shiftNumber}</Tag>
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card 
              size="small" 
              style={{ marginBottom: 16, borderLeft: '4px solid #ff4d4f' }}
              title={
                <Space>
                  <DollarSign size={14} color="#ff4d4f" />
                  <Text strong>Shortage Details</Text>
                </Space>
              }
            >
              <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                      Amount
                    </div>
                    <div style={{ 
                      fontSize: '22px', 
                      fontWeight: 'bold', 
                      color: '#ff4d4f',
                      padding: '8px',
                      backgroundColor: '#fff2f0',
                      borderRadius: '6px'
                    }}>
                      KES {shortageDetails.shortageAmount.toFixed(2)}
                    </div>
                  </div>
                </Col>
                
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                      Type
                    </div>
                    <Tag 
                      color="purple" 
                      style={{ 
                        fontSize: '14px', 
                        padding: '8px 12px',
                        margin: 0
                      }}
                    >
                      {shortageDetails.shortageType}
                    </Tag>
                  </div>
                </Col>
                
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                      Severity
                    </div>
                    <Tag 
                      color={
                        shortageDetails.severity === 'CRITICAL' ? 'red' :
                        shortageDetails.severity === 'MAJOR' ? 'orange' :
                        shortageDetails.severity === 'MODERATE' ? 'gold' : 'blue'
                      }
                      style={{ 
                        fontSize: '14px', 
                        padding: '8px 12px',
                        margin: 0,
                        fontWeight: 'bold'
                      }}
                    >
                      {shortageDetails.severity}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card 
              size="small" 
              style={{ marginBottom: 16, borderLeft: '4px solid #52c41a' }}
              title={
                <Space>
                  <Wallet size={14} color="#52c41a" />
                  <Text strong>Collection Breakdown</Text>
                </Space>
              }
            >
              <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
                <Col span={8}>
                  <Statistic
                    title="Expected Total"
                    value={shortageDetails.collectionDetails.totalExpected}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ fontSize: '14px', color: '#1890ff', fontWeight: 'bold' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Collected"
                    value={shortageDetails.collectionDetails.totalCollected}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ fontSize: '14px', color: '#52c41a', fontWeight: 'bold' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Shortage"
                    value={shortageDetails.collectionDetails.shortageAmount}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ 
                      fontSize: '14px', 
                      color: '#ff4d4f', 
                      fontWeight: 'bold',
                      backgroundColor: '#fff2f0',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                  />
                </Col>
              </Row>
              
              <Divider style={{ margin: '8px 0' }} />
              
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space>
                        <Tag color="green">Cash</Tag>
                        <Text strong>Cash Collections</Text>
                      </Space>
                      <div style={{ paddingLeft: 24 }}>
                        <Text>
                          {shortageDetails.collectionDetails.cashCollections.length} entries
                        </Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                          Total: KES {
                            shortageDetails.collectionDetails.cashCollections
                              .reduce((sum, c) => sum + (c.amount || 0), 0)
                              .toFixed(2)
                          }
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                
                <Col span={12}>
                  <Card size="small" style={{ backgroundColor: '#f0f8ff' }}>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space>
                        <Tag color="blue">Debt</Tag>
                        <Text strong>Debt Collections</Text>
                      </Space>
                      <div style={{ paddingLeft: 24 }}>
                        <Text>
                          {shortageDetails.collectionDetails.debtCollections.length} entries
                        </Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                          Total: KES {
                            shortageDetails.collectionDetails.debtCollections
                              .reduce((sum, c) => sum + (c.amount || 0), 0)
                              .toFixed(2)
                          }
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
              
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space>
                        <Tag color="orange">Auto</Tag>
                        <Text strong>Auto Expenses</Text>
                      </Space>
                      <div style={{ paddingLeft: 24 }}>
                        <Text>
                          {shortageDetails.collectionDetails.autoExpenses > 0 ? 'Yes' : 'No'}
                        </Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                          Amount: KES {shortageDetails.collectionDetails.autoExpenses.toFixed(2)}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                
                <Col span={12}>
                  <Card size="small" style={{ backgroundColor: '#fff2e8' }}>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space>
                        <Tag color="red">Manual</Tag>
                        <Text strong>Manual Expenses</Text>
                      </Space>
                      <div style={{ paddingLeft: 24 }}>
                        <Text>
                          {shortageDetails.collectionDetails.manualExpenses > 0 ? 'Yes' : 'No'}
                        </Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                          Amount: KES {shortageDetails.collectionDetails.manualExpenses.toFixed(2)}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Card>
          </div>
        </Modal>
      );
    };

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
        debtorPhone: selectedDebtor.phone,
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

    const handleSaveCollections = () => {
      if (hasUnaddedCash) {
        message.warning('Please click "Add Cash Collection" first to include the entered amount');
        return;
      }

      // Check for unresolved shortage
      if (hasShortage && !shortagePosted && !justPostedShortage) {
        Modal.error({
          title: 'Cannot Save - Unresolved Shortage',
          content: (
            <div>
              <p>You have an unresolved shortage of <strong>KES {shortageAmount.toFixed(2)}</strong>.</p>
              <p><strong>You must create a shortage record before you can save collections.</strong></p>
              <p>Click "Create Shortage Record" to proceed.</p>
            </div>
          ),
          okText: 'Create Shortage Record',
          cancelText: 'Cancel',
          onOk: () => {
            handleOpenShortageCreation();
          }
        });
        return;
      }
      
      // Calculate final amounts
      const finalCashTotal = localCollections
        .filter(c => c.type === 'cash')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const finalDebtTotal = localCollections
        .filter(c => c.type === 'debt')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const finalCollected = finalCashTotal + finalDebtTotal;
      
      // Calculate final shortage if any (only when expected > collected)
      const finalShortageAmount = totalExpected > finalCollected ? totalExpected - finalCollected : 0;
      
      onSave(localCollections, finalShortageAmount);
    };

    if (!selectedIsland) {
      return null;
    }

    return (
      <>
        <Modal
          title={
            <Space>
              <Wallet size={16} />
              <Text strong>Collections - {selectedIsland?.islandName || 'Unknown Island'}</Text>
              {!hasShortage && displayTotal >= totalExpected && (
                <Tag color="green" icon={<CheckCircle size={12} />}>
                  Fully Collected ✓
                </Tag>
              )}
              {justPostedShortage && (
                <Tag color="green" icon={<CheckCircle size={12} />}>
                  Shortage Posted
                </Tag>
              )}
              {hasUnaddedCash && (
                <Tag color="orange" icon={<AlertCircle size={12} />}>
                  Unadded Cash
                </Tag>
              )}
            </Space>
          }
          open={visible}
          onCancel={onCancel}
          width={isMobile ? '95%' : 800}
          footer={[
            <Button key="cancel" onClick={onCancel}>
              Cancel
            </Button>,
            // Only show shortage button if there's a shortage
            hasShortage && (
              <Button
                key="post"
                type={hasPendingShortage && !justPostedShortage ? "dashed" : "default"}
                danger={hasPendingShortage && !justPostedShortage}
                onClick={handleOpenShortageCreation}
                disabled={!hasPendingShortage || justPostedShortage || creatingShortage}
                icon={<AlertTriangle size={14} />}
                loading={creatingShortage}
              >
                {justPostedShortage 
                  ? 'Shortage Created ✓' 
                  : hasPendingShortage 
                    ? `Create Shortage (KES ${shortageAmount.toFixed(2)})`
                    : 'No Shortage'}
              </Button>
            ),
            <Button
              key="save"
              type="primary"
              onClick={handleSaveCollections}
              disabled={!canSaveCollections}
              style={{
                opacity: canSaveCollections ? 1 : 0.5,
                cursor: canSaveCollections ? 'pointer' : 'not-allowed'
              }}
            >
              {hasUnaddedCash ? 'Click "Add" first to include cash' :
               justPostedShortage ? 'Save Collections (Shortage Resolved)' : 
               hasPendingShortage ? 'Save Collections (Blocked - Resolve Shortage First)' :
               'Save Collections'}
            </Button>
          ]}
        >
          <div style={{ marginBottom: 16 }}>
            <Card size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Expected Total"
                    value={totalExpected}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Collected"
                    value={displayTotal}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: displayTotal >= totalExpected ? '#52c41a' : '#faad14' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Status"
                    value={
                      justPostedShortage ? 'Shortage Posted ✓' :
                      displayTotal >= totalExpected ? 'Fully Collected ✓' : 
                      'Shortage'
                    }
                    valueStyle={{ 
                      color: justPostedShortage || displayTotal >= totalExpected ? '#52c41a' : '#ff4d4f',
                      fontSize: '14px'
                    }}
                  />
                </Col>
              </Row>
              
              {(autoExpenseAmount > 0 || manualExpenseAmount > 0) && (
                <Alert
                  message="Expense Details"
                  description={
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      {autoExpenseAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Auto Expenses (pre-recorded):</Text>
                          <Text strong style={{ color: '#fa8c16' }}>KES {autoExpenseAmount.toFixed(2)}</Text>
                        </div>
                      )}
                      {manualExpenseAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Manual Expenses (entered now):</Text>
                          <Text strong style={{ color: '#ff4d4f' }}>KES {manualExpenseAmount.toFixed(2)}</Text>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text strong>Total Expenses:</Text>
                        <Text strong style={{ color: totalExpenses > 0 ? '#ff4d4f' : '#52c41a' }}>
                          KES {totalExpenses.toFixed(2)}
                        </Text>
                      </div>
                    </Space>
                  }
                  type="info"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
              
              {justPostedShortage && (
                <Alert
                  message="✅ Shortage Recorded"
                  description={
                    <div>
                      <p><strong>KES {shortageAmount.toFixed(2)} shortage has been recorded for the attendant.</strong></p>
                      <p>You can now save collections. All your entered data is preserved.</p>
                    </div>
                  }
                  type="success"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
              
              {displayTotal >= totalExpected && (
                <Alert
                  message="✅ Fully Collected"
                  description="Collections meet or exceed expected amount. No shortage to record."
                  type="success"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
              
              {hasUnaddedCash && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '8px 12px', 
                  backgroundColor: '#fff7e6',
                  border: '1px solid #ffbb96',
                  borderRadius: '4px'
                }}>
                  <Text type="warning" strong>
                    ⚠️ You have KES {parseFloat(cashAmount).toFixed(2)} in the cash field that hasn't been added. 
                    Click "Add Cash Collection" to include it.
                  </Text>
                </div>
              )}
              
              {!canSaveCollections && hasPendingShortage && !hasUnaddedCash && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '8px 12px', 
                  backgroundColor: '#fff2e8',
                  border: '1px solid #ffbb96',
                  borderRadius: '4px'
                }}>
                  <Text type="warning" strong>
                    ⚠️ Save is blocked until shortage record is created
                  </Text>
                </div>
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
                      disabled={!cashAmount || parseFloat(cashAmount) <= 0}
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
        
        <ShortageCreationModal />
      </>
    );
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      const pumpStats = calculatePumpStats();
      const tankStats = calculateTankStats();
      
      if (pumpStats.completed < pumpStats.total || tankStats.completed < tankStats.total) {
        message.warning('Please complete all readings before proceeding');
        return;
      }
      
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
      
      const allCollectionsComplete = islandStats.every(island => island.collectionsModalCompleted);
      
      if (!allCollectionsComplete) {
        message.warning('Please complete collections for all islands');
        return;
      }
      
      // Check if all shortages are resolved (only for islands with shortageAmount > 0)
      const allShortagesResolved = islandStats.every(island => 
        island.shortageAmount <= 10 || island.shortagePosted
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

  const handleIslandCollectionsSave = (islandKey, collectionsData, shortageAmount) => {
    setCollections(prev => ({
      ...prev,
      [islandKey]: collectionsData
    }));
    
    setCollectionsModalVisible(false);
    message.success('Collections saved for island');
  };

  const prepareSummaryData = () => {
    const islandStats = calculateIslandStats();
    
    const enhancedIslands = islandStats.map(island => {
      const islandKey = island.key;
      const islandCollections = Array.isArray(collections[islandKey]) ? collections[islandKey] : [];
      
      return {
        ...island,
        key: islandKey,
        islandName: island.islandName,
        islandId: island.islandId,
        attendants: island.attendants || [],
        totalActualSales: salesEntries[islandKey]?.islandTotalSales || 0,
        receipts: receipts[islandKey] || 0,
        manualExpenses: expenses[islandKey] || 0,
        autoExpenses: island.autoExpenses || 0,
        autoExpenseDetails: island.autoExpenseDetails || [],
        cashCollection: islandCollections
          .filter(c => c && c.type === 'cash')
          .reduce((sum, c) => sum + (c.amount || 0), 0),
        collections: islandCollections,
        shortageAmount: island.shortageAmount, // Now only populated for shortages
        shortagePosted: island.shortagePosted,
        shortageRecord: island.shortageRecord,
        isComplete: true,
        notes: salesEntries[islandKey]?.notes || ''
      };
    });

    const totalPumpSales = enhancedIslands.reduce((sum, island) => sum + (island.totalPumpSales || 0), 0);
    const totalActualSales = enhancedIslands.reduce((sum, island) => sum + (island.totalActualSales || 0), 0);
    const totalCashCollection = enhancedIslands.reduce((sum, island) => sum + (island.cashCollection || 0), 0);
    const totalDebtCollection = enhancedIslands.reduce((sum, island) => sum + (island.debtCollection || 0), 0);
    const totalReceipts = enhancedIslands.reduce((sum, island) => sum + (island.receipts || 0), 0);
    const totalManualExpenses = enhancedIslands.reduce((sum, island) => sum + (island.manualExpenses || 0), 0);
    const totalAutoExpenses = enhancedIslands.reduce((sum, island) => sum + (island.autoExpenses || 0), 0);
    const totalExpenses = totalManualExpenses + totalAutoExpenses;
    
    // Total shortage amount - only count when collections < expected
    const totalShortageAmount = enhancedIslands.reduce((sum, island) => sum + (island.shortageAmount || 0), 0);

    const apiPayload = {
      shiftId: shift?.id,
      endTime: new Date().toISOString(),
      recordedById: currentUser?.id,
      reconciliationNotes: 'Shift closed via station manager UI',
      
      pumpReadings: pumps.map(pump => {
        const calculatedPump = calculatePumpValues().find(p => p.id === pump.id);
        
        return {
          pumpId: pump.pumpId,
          electricMeter: parseFloat(pump.closingElectricMeter) || 0,
          manualMeter: parseFloat(pump.closingManualMeter) || 0,
          cashMeter: parseFloat(pump.closingCashMeter) || 0,
          litersDispensed: calculatedPump?.litersDispensed || 0,
          salesValue: calculatedPump?.salesValue || 0,
          unitPrice: pump.unitPrice || 0,
          ...(pump.productId && { productId: pump.productId })
        };
      }),
      
      tankReadings: tanks.map(tank => ({
        tankId: tank.tankId,
        dipValue: parseFloat(tank.closingDipValue) || parseFloat(tank.dipValue) || 1.5,
        volume: parseFloat(tank.currentVolume) || parseFloat(tank.closingVolume) || parseFloat(tank.volume) || 0,
        currentVolume: parseFloat(tank.currentVolume) || parseFloat(tank.closingVolume) || parseFloat(tank.volume) || 0,
        temperature: parseFloat(tank.temperature) || 25,
        waterLevel: parseFloat(tank.waterLevel) || 0,
        density: parseFloat(tank.density) || 0.85,
        ...(tank.product?.id && { productId: tank.product.id })
      })),
      
      islandCollections: enhancedIslands.map(island => {
        const islandKey = island.key;
        const islandCollections = island.collections || [];
        const islandManualExpenses = island.manualExpenses || 0;
        const islandAutoExpenses = island.autoExpenses || 0;
        const totalIslandExpenses = islandManualExpenses + islandAutoExpenses;
        const islandReceipts = island.receipts || 0;
        const islandSales = island.totalActualSales || 0;
        
        const cashAmount = islandCollections
          .filter(c => c && c.type === 'cash')
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        
        const debtorCollections = islandCollections
          .filter(c => c && c.type === 'debt')
          .map(debt => ({
            debtorId: debt.debtorId,
            amount: debt.amount || 0
          }));
        
        const primaryAttendant = island.attendants?.[0];
        
        // Calculate expected amount
        const expectedAmount = islandSales + islandReceipts - totalIslandExpenses;
        const collectedAmount = cashAmount;
        
        // Only set shortageAmount if expected > collected, otherwise 0
        const shortageAmount = expectedAmount > collectedAmount ? expectedAmount - collectedAmount : 0;
        
        return {
          islandId: island.islandId,
          attendantId: primaryAttendant?.id || currentUser?.id,
          cashAmount: cashAmount,
          receiptsAmount: islandReceipts,
          expectedCashAmount: expectedAmount,
          debtorCollections: debtorCollections,
          expensesAmount: totalIslandExpenses,
          shortageAmount: shortageAmount, // Now only > 0 when there's a shortage
          overageAmount: 0 // Always 0 now
        };
      }).filter(item => item.islandId),
      
      nonFuelStocks: []
    };

    const summaryData = {
      islands: enhancedIslands,
      overallStats: {
        totalPumpSales,
        totalActualSales,
        totalCashCollection,
        totalDebtCollection,
        totalReceipts,
        totalManualExpenses,
        totalAutoExpenses,
        totalExpenses,
        totalShortageAmount, // Now only reflects actual shortages
        totalIslands: enhancedIslands.length,
        islandsWithShortage: enhancedIslands.filter(island => island.shortageAmount > 10).length,
        islandsWithPostedShortages: enhancedIslands.filter(island => island.shortagePosted).length,
        totalPostedShortageAmount: Object.values(postedShortages).reduce((sum, shortage) => sum + (shortage.amount || 0), 0)
      },
      apiPayload: apiPayload,
      shiftId: shift?.id,
      shiftNumber: shift?.shiftNumber,
      stationId: currentStationId,
      stationName: state?.currentStation?.name,
      stationCode: state?.currentStation?.code,
      timestamp: new Date().toISOString(),
      reconciliationNotes: 'Shift closed via station manager',
      autoExpenses: autoExpenses
    };

    console.log('✅ prepareSummaryData completed with expenses');
    return summaryData;
  };

  const handleSummarySubmit = async (reportPath) => {
    setIsSubmitting(true);
    
    try {
      const summaryData = prepareSummaryData();
      const apiPayload = summaryData.apiPayload;
      
      const validationErrors = [];
      
      if (!apiPayload.pumpReadings || apiPayload.pumpReadings.length === 0) {
        validationErrors.push('No pump readings provided');
      } else {
        apiPayload.pumpReadings.forEach((pump, index) => {
          if (typeof pump.electricMeter === 'undefined') {
            validationErrors.push(`Pump ${index + 1}: electricMeter is undefined`);
          }
          if (typeof pump.electricMeter !== 'number') {
            validationErrors.push(`Pump ${index + 1}: electricMeter must be a number`);
          }
        });
      }
      
      if (!apiPayload.tankReadings || apiPayload.tankReadings.length === 0) {
        validationErrors.push('No tank readings provided');
      }
      
      if (!apiPayload.islandCollections || apiPayload.islandCollections.length === 0) {
        validationErrors.push('No island collections provided');
      } else {
        apiPayload.islandCollections.forEach((island, index) => {
          if (!island.islandId) {
            validationErrors.push(`Island collection ${index + 1}: missing islandId`);
          }
          if (!island.attendantId) {
            validationErrors.push(`Island collection ${index + 1}: missing attendantId`);
          }
        });
      }
      
      if (validationErrors.length > 0) {
        console.error('❌ PAYLOAD VALIDATION ERRORS:', validationErrors);
        validationErrors.forEach(error => message.error(error));
        throw new Error('Payload validation failed');
      }
      
      const finalPayload = {
        ...apiPayload,
        ...(reportPath && { reportPath: reportPath })
      };

      console.log('🚀 SUBMITTING PAYLOAD:', {
        shiftId: finalPayload.shiftId,
        firstPumpReading: finalPayload.pumpReadings[0],
        firstTankReading: finalPayload.tankReadings[0],
        firstIslandCollection: finalPayload.islandCollections[0],
        pumpReadingsCount: finalPayload.pumpReadings.length,
        tankReadingsCount: finalPayload.tankReadings.length,
        islandCollectionsCount: finalPayload.islandCollections.length
      });
      
      const response = await shiftService.closeShift(shift?.id, finalPayload);
      
      console.log('✅ Shift closed successfully:', response);
      
      clearCache();
      
      message.success({
        content: 'Shift closed successfully! Report has been saved.',
        duration: 4,
      });
      
      if (onSuccess) {
        onSuccess({
          ...response,
          summaryData: summaryData,
          reportPath: reportPath
        });
      }
      
      setSummaryModalVisible(false);
      
      Modal.success({
        title: 'Shift Closed Successfully',
        content: (
          <div>
            <p>Shift #{shift?.shiftNumber} has been successfully closed.</p>
            <p>The cash summary report has been saved to:</p>
            <p><strong>{reportPath}</strong></p>
          </div>
        ),
        onOk: () => {
          onClose?.();
        }
      });
      
    } catch (error) {
      console.error('❌ Shift closure error:', error);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          message.error(`${err.field}: ${err.message}`);
        });
      } else {
        message.error(`Failed to close shift: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const renderIslandSalesStep = () => {
    const islandStats = calculateIslandStats();
    const allHasSales = islandStats.every(island => island.hasSales);
    
    const totalAutoExpenses = islandStats.reduce((sum, island) => sum + (island.autoExpenses || 0), 0);
    
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
            {island.autoExpenses > 0 && (
              <Tooltip title="Auto-loaded expenses from previous records">
                <Tag size="small" color="orange" style={{ marginTop: 2 }}>
                  Auto: KES {island.autoExpenses.toFixed(2)}
                </Tag>
              </Tooltip>
            )}
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
        width: 150,
        render: (_, island) => (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {island.autoExpenses > 0 && (
              <div style={{ 
                padding: '2px 4px', 
                backgroundColor: '#fff7e6',
                borderRadius: '2px',
                fontSize: '9px',
                textAlign: 'center'
              }}>
                Auto: KES {island.autoExpenses.toFixed(2)}
              </div>
            )}
            <InputNumber
              size="small"
              style={{ width: '100%' }}
              value={expenses[island.key] || 0}
              onChange={(value) => setExpenses(prev => ({ ...prev, [island.key]: value }))}
              min={0}
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
              addonBefore={
                island.autoExpenses > 0 ? (
                  <Tooltip title={`Auto: KES ${island.autoExpenses.toFixed(2)} + Manual`}>
                    <Text type="secondary" style={{ fontSize: '9px' }}>+</Text>
                  </Tooltip>
                ) : null
              }
            />
            <Text type="secondary" style={{ fontSize: '9px', textAlign: 'center' }}>
              Total: KES {(island.autoExpenses + (expenses[island.key] || 0)).toFixed(2)}
            </Text>
          </Space>
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
        <Title level={4}>
          <Space>
            <DollarSign size={18} />
            Island Sales
            {totalAutoExpenses > 0 && (
              <Tooltip title="Auto-loaded expenses from previous records">
                <Badge 
                  count="Auto Expenses" 
                  style={{ 
                    backgroundColor: '#fa8c16',
                    marginLeft: 8
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </Title>

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
                title="Total Expenses"
                value={islandStats.reduce((sum, island) => sum + (island.autoExpenses || 0) + (expenses[island.key] || 0), 0)}
                precision={0}
                prefix="KES"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4d4f' }}
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

        {totalAutoExpenses > 0 && (
          <Alert
            message="Auto-Loaded Expenses Detected"
            description={
              <Space direction="vertical" size={2}>
                <Text>
                  Found <strong>KES {totalAutoExpenses.toFixed(2)}</strong> in pre-recorded expenses from this shift.
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  These expenses are automatically subtracted from each island's expected amount. You can add additional manual expenses if needed.
                </Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

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

  const renderCollectionsStep = () => {
    const islandStats = calculateIslandStats();
    
    const allCollectionsComplete = islandStats.every(island => island.collectionsModalCompleted);
    
    // Check if all shortages are resolved (only for islands with shortageAmount > 0)
    const allShortagesResolved = islandStats.every(island => 
      island.shortageAmount <= 10 || island.shortagePosted
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
        title: 'EXPENSES',
        width: 120,
        render: (_, island) => (
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '10px' }}>Total:</Text>
            <Text strong style={{ color: island.totalExpenses > 0 ? '#ff4d4f' : '#52c41a' }}>
              KES {island.totalExpenses?.toFixed(2)}
            </Text>
            {island.autoExpenses > 0 && (
              <Text type="secondary" style={{ fontSize: '9px' }}>
                (Auto: KES {island.autoExpenses.toFixed(2)})
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'SHORTAGE',
        width: 120,
        render: (_, island) => {
          if (island.shortageAmount === 0) {
            return <Tag color="green">No Shortage</Tag>;
          } else if (island.shortageAmount > 0) {
            return (
              <Tag color={island.shortagePosted ? 'orange' : 'red'}>
                KES {island.shortageAmount?.toFixed(2)}
                {island.shortagePosted && ' ✓'}
              </Tag>
            );
          }
          return null;
        },
      },
      {
        title: 'STATUS',
        width: 120,
        render: (_, island) => {
          if (!island.collectionsModalCompleted) {
            return <Tag color="red">Pending</Tag>;
          }
          
          if (island.shortageAmount === 0) {
            return <Tag color="green">Complete ✓</Tag>;
          }
          
          if (island.shortageAmount > 0 && island.shortagePosted) {
            return <Tag color="orange">Shortage Posted</Tag>;
          }
          
          if (island.shortageAmount > 0) {
            return <Tag color="red">Shortage Unresolved</Tag>;
          }
          
          return <Tag color="gold">Complete</Tag>;
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

    const totalIslands = islandStats.length;
    const islandsWithCollections = islandStats.filter(island => island.collectionsModalCompleted).length;
    const islandsWithShortages = islandStats.filter(island => island.shortageAmount > 10).length;
    const islandsWithPostedShortages = islandStats.filter(island => island.shortagePosted).length;
    const totalShortageAmount = islandStats
      .filter(island => island.shortagePosted)
      .reduce((sum, island) => sum + island.shortageAmount, 0);

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
          onSave={(collectionsData, shortageAmount) => handleIslandCollectionsSave(currentIslandIndex, collectionsData, shortageAmount)}
          islandIndex={currentIslandIndex}
          currentCollections={collections[currentIslandIndex] || []}
        />
      </div>
    );
  };

  const renderSummaryStep = () => {
    const islandStats = calculateIslandStats();
    
    const totalExpectedSales = islandStats.reduce((sum, island) => sum + (island.totalPumpSales || 0), 0);
    const totalActualSales = islandStats.reduce((sum, island) => sum + (island.totalActualSales || 0), 0);
    const totalCollections = islandStats.reduce((sum, island) => sum + (island.totalCollection || 0), 0);
    const totalManualExpenses = islandStats.reduce((sum, island) => sum + (island.manualExpenses || 0), 0);
    const totalAutoExpenses = islandStats.reduce((sum, island) => sum + (island.autoExpenses || 0), 0);
    const totalExpenses = totalManualExpenses + totalAutoExpenses;
    
    // Only count shortages (when expected > collected)
    const totalShortageAmount = islandStats.reduce((sum, island) => sum + (island.shortageAmount || 0), 0);
    
    const islandsWithShortages = islandStats.filter(island => island.shortageAmount > 10);
    const islandsWithPostedShortages = islandStats.filter(island => island.shortagePosted);
    const totalPostedShortageAmount = islandsWithPostedShortages.reduce((sum, island) => sum + island.shortageAmount, 0);

    const handleOpenSummaryModal = () => {
      const data = prepareSummaryData();
      setSummaryData(data);
      setSummaryModalVisible(true);
    };

    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>📋 Review & Submit</Title>
        
        {(totalAutoExpenses > 0 || totalManualExpenses > 0) && (
          <Card 
            title={
              <Space>
                <Receipt size={16} color="#fa8c16" />
                <Text strong>Expense Summary</Text>
              </Space>
            }
            style={{ marginBottom: 16, borderColor: '#ffa940' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Auto Expenses"
                  value={totalAutoExpenses}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
                />
                <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                  Pre-recorded expenses
                </Text>
              </Col>
              <Col span={8}>
                <Statistic
                  title="Manual Expenses"
                  value={totalManualExpenses}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
                />
                <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                  Entered during shift closing
                </Text>
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total Expenses"
                  value={totalExpenses}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ 
                    color: '#ff4d4f', 
                    fontSize: '22px',
                    fontWeight: 'bold'
                  }}
                />
              </Col>
            </Row>
          </Card>
        )}
        
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
                  value={totalPostedShortageAmount}
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
                            Shortage: <Tag color="red">KES {island.shortageAmount.toFixed(2)}</Tag>
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
            <Descriptions.Item label="Total Expenses">
              <Text strong style={{ color: totalExpenses > 0 ? '#ff4d4f' : '#52c41a' }}>
                KES {totalExpenses.toFixed(2)}
                {totalAutoExpenses > 0 && ` (KES ${totalAutoExpenses.toFixed(2)} auto)`}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Shortage">
              <Tag 
                color={totalShortageAmount === 0 ? 'green' : 'red'} 
                style={{ fontSize: '14px', padding: '4px 8px' }}
              >
                KES {totalShortageAmount.toFixed(2)}
                {totalShortageAmount > 0 && islandsWithPostedShortages.length > 0 && ' (Posted)'}
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
                    {record.autoExpenses > 0 && (
                      <Text type="secondary" style={{ fontSize: '10px', color: '#fa8c16' }}>
                        Auto Expenses: KES {record.autoExpenses.toFixed(2)}
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
                title: 'Expenses', 
                render: (_, r) => (
                  <Space direction="vertical" size={0} align="end">
                    <Text strong style={{ color: r.totalExpenses > 0 ? '#ff4d4f' : '#52c41a' }}>
                      KES {r.totalExpenses?.toFixed(2)}
                    </Text>
                    {r.autoExpenses > 0 && (
                      <Text type="secondary" style={{ fontSize: '9px' }}>
                        Auto: KES {r.autoExpenses.toFixed(2)}
                      </Text>
                    )}
                  </Space>
                ),
                align: 'right'
              },
              { 
                title: 'Shortage', 
                render: (_, r) => (
                  <Tag 
                    color={r.shortageAmount === 0 ? 'green' : r.shortagePosted ? 'orange' : 'red'}
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    {r.shortageAmount === 0 ? 'None' : `KES ${r.shortageAmount?.toFixed(2)}`}
                    {r.shortagePosted && ' ✓'}
                  </Tag>
                ),
                align: 'center'
              }
            ]}
            rowKey="key"
          />
        </Card>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '24px',
          borderTop: '2px solid #f0f0f0',
          marginTop: '24px'
        }}>
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
              onClick={handleOpenSummaryModal}
              icon={<FileCheck size={16} />}
              size="large"
              style={{ 
                minWidth: 250,
                background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                border: 'none',
                fontWeight: 'bold'
              }}
            >
              <Space size={6}>
                <CheckSquare size={18} />
                Generate Summary & Submit
              </Space>
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  return (
    <>
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

      {summaryModalVisible && summaryData && (
        <EnhancedSummaryModal
          visible={summaryModalVisible}
          onClose={() => setSummaryModalVisible(false)}
          onSubmitShift={handleSummarySubmit}
          islandSalesData={summaryData}
          loading={isSubmitting}
        />
      )}
    </>
  );
};

export default IntegratedShiftClose;