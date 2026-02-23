// IntegratedShiftClose.jsx (FIXED - With Proper Expense Filtering by Shift)
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
    { key: 'shortages', title: 'Shortages', icon: <AlertTriangle size={16} /> },
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
  
  // ========== SHORTAGES STEP STATE ==========
  const [postedShortages, setPostedShortages] = useState({});
  const [shortageModalVisible, setShortageModalVisible] = useState(false);
  const [currentShortageIsland, setCurrentShortageIsland] = useState(null);
  const [creatingShortage, setCreatingShortage] = useState(false);
  
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
      console.log('💾 Saved to cache for shift:', shift?.id);
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
        
        // CRITICAL: Only load cache if it matches the CURRENT shift ID
        if (data.shiftId === shift?.id && Date.now() - data.timestamp < TWO_HOURS) {
          console.log('📂 Loading from cache for shift:', shift?.id);
          
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
          console.log('🧹 Cache expired or belongs to different shift, removing...');
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
    
    // Also clear any backup/auto-save keys for this specific shift
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`shift_close_${currentStationId}`) && key.includes(shift?.id)) {
        localStorage.removeItem(key);
        console.log(`🧹 Removed backup cache: ${key}`);
      }
    }
    
    console.log('🧹 Cache cleared for shift:', shift?.id);
    message.success('Draft cleared successfully');
  };

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    if (currentStationId && shift?.id) {
      // First, clear any autoExpenses from previous shifts
      setAutoExpenses({});
      
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
  }, [pumps, tanks, salesEntries, receipts, expenses, autoExpenses, collections, postedShortages, currentStep]);

  // ========== LOAD EXISTING EXPENSES - FIXED WITH PROPER SHIFT FILTERING ==========
  const loadExistingExpenses = async () => {
    if (!shift?.id || !currentStationId) {
      console.log('⚠️ Cannot load expenses: missing shift ID or station ID', {
        shiftId: shift?.id,
        stationId: currentStationId
      });
      return;
    }
    
    try {
      console.log('📋 ========== START LOADING EXPENSES ==========');
      console.log('📋 Current Shift:', {
        id: shift.id,
        number: shift.shiftNumber,
        stationId: currentStationId
      });
      
      // CRITICAL: Clear any existing autoExpenses first
      console.log('🧹 Clearing existing autoExpenses state');
      setAutoExpenses({});
      
      let expensesData = [];
      let loadMethod = '';
      
      // Try to get expenses - multiple methods for robustness
      try {
        // Method 1: Try shift-specific endpoint
        console.log('🔍 METHOD 1: Calling expenseService.getExpensesByShift()');
        console.log('   - With shiftId:', shift.id);
        
        const response = await expenseService.getExpensesByShift(shift.id);
        expensesData = response.data || response || [];
        loadMethod = 'shift-specific endpoint';
        
        console.log(`   ✅ Received ${expensesData.length} raw expenses`);
        
      } catch (error) {
        console.warn('⚠️ Method 1 failed:', error.message);
        
        // Method 2: Try filtered query
        try {
          console.log('🔍 METHOD 2: Calling expenseService.getExpenses() with filters');
          console.log('   - Filters:', {
            stationId: currentStationId,
            shiftId: shift.id,
            status: 'APPROVED'
          });
          
          const response = await expenseService.getExpenses({ 
            stationId: currentStationId,
            shiftId: shift.id,
            status: 'APPROVED'
          });
          
          expensesData = response.data || response || [];
          loadMethod = 'filtered query';
          
          console.log(`   ✅ Received ${expensesData.length} raw expenses`);
          
        } catch (filterError) {
          console.warn('⚠️ Method 2 failed:', filterError.message);
          
          // Method 3: Get all and filter client-side
          console.log('🔍 METHOD 3: Getting all expenses and filtering client-side');
          
          const response = await expenseService.getExpenses({ 
            stationId: currentStationId
          });
          
          const allExpenses = response.data || response || [];
          console.log(`   ✅ Received ${allExpenses.length} total station expenses`);
          
          // Filter client-side
          expensesData = allExpenses.filter(exp => {
            // Check multiple possible locations for shift ID
            const expenseShiftId = exp.shiftId || exp.shift?.id;
            return expenseShiftId === shift.id;
          });
          
          loadMethod = 'client-side filter';
          console.log(`   🔍 Filtered to ${expensesData.length} expenses for shift ${shift.id}`);
        }
      }
      
      // Log all raw expenses received
      console.log(`📊 RAW EXPENSES RECEIVED (${expensesData.length}):`);
      expensesData.forEach((exp, index) => {
        console.log(`   ${index + 1}. Expense:`, {
          id: exp.id,
          title: exp.title,
          amount: exp.amount,
          // CRITICAL FIELDS FOR FILTERING:
          shiftId: exp.shiftId,                    // Direct shiftId
          shiftObjectId: exp.shift?.id,             // Nested shift.id
          paymentSource: exp.paymentSource,         // Must be ISLAND_COLLECTION
          islandId: exp.islandId,                    // Must have islandId
          status: exp.status,                        // Should be APPROVED
          expenseNumber: exp.expenseNumber
        });
      });
      
      // ===== CRITICAL FILTERING LOGIC =====
      // Only include expenses that meet ALL criteria:
      // 1. shiftId matches current shift
      // 2. paymentSource is "ISLAND_COLLECTION"
      // 3. has islandId (not null/undefined)
      // 4. status is "APPROVED"
      // 5. amount > 0
      
      console.log('🔍 APPLYING FILTERS:');
      console.log('   ✅ Must have shiftId ===', shift.id);
      console.log('   ✅ Must have paymentSource === "ISLAND_COLLECTION"');
      console.log('   ✅ Must have islandId (not null)');
      console.log('   ✅ Must have status === "APPROVED"');
      console.log('   ✅ Must have amount > 0');
      
      const validExpenses = expensesData.filter(expense => {
        // Check shift ID (multiple possible locations)
        const expenseShiftId = expense.shiftId || expense.shift?.id;
        const shiftMatches = expenseShiftId === shift.id;
        
        // Check payment source
        const isIslandCollection = expense.paymentSource === 'ISLAND_COLLECTION';
        
        // Check island ID exists
        const hasIslandId = !!expense.islandId;
        
        // Check status
        const isApproved = expense.status === 'APPROVED';
        
        // Check amount
        const hasValidAmount = expense.amount > 0 && expense.amount !== null && expense.amount !== undefined;
        
        const isValid = shiftMatches && isIslandCollection && hasIslandId && isApproved && hasValidAmount;
        
        console.log(`   🔍 Expense ${expense.id}:`, {
          title: expense.title,
          shiftMatches: `${expenseShiftId} === ${shift.id} = ${shiftMatches}`,
          isIslandCollection: `${expense.paymentSource} === ISLAND_COLLECTION = ${isIslandCollection}`,
          hasIslandId: `${expense.islandId} = ${hasIslandId}`,
          isApproved: `${expense.status} === APPROVED = ${isApproved}`,
          hasValidAmount: `${expense.amount} > 0 = ${hasValidAmount}`,
          INCLUDED: isValid ? '✅ YES' : '❌ NO'
        });
        
        return isValid;
      });
      
      console.log(`📊 VALID EXPENSES AFTER FILTERING: ${validExpenses.length}`);
      
      // ===== GROUP EXPENSES BY ISLAND AND SUM THEM =====
      // This handles multiple expenses per island by summing them
      const expensesByIsland = {};
      validExpenses.forEach(expense => {
        const islandId = expense.islandId;
        if (!expensesByIsland[islandId]) {
          expensesByIsland[islandId] = [];
        }
        
        expensesByIsland[islandId].push({
          id: expense.id,
          amount: expense.amount,
          title: expense.title || expense.description || 'Expense',
          description: expense.description,
          category: expense.category,
          expenseNumber: expense.expenseNumber,
          approvedAt: expense.approvedAt,
          createdAt: expense.createdAt,
          shiftId: expense.shiftId || expense.shift?.id,
          paymentSource: expense.paymentSource,
          verified: true
        });
        
        console.log(`   📝 Added to island ${islandId}:`, {
          id: expense.id,
          title: expense.title,
          amount: expense.amount
        });
      });
      
      // ===== CALCULATE TOTALS PER ISLAND (SUMMING MULTIPLE EXPENSES) =====
      const autoExpenseTotals = {};
      Object.keys(expensesByIsland).forEach(islandId => {
        // REDUCE sums all expenses for this island
        const total = expensesByIsland[islandId].reduce((sum, exp) => sum + exp.amount, 0);
        autoExpenseTotals[islandId] = {
          total, // This is the SUMMED total of all expenses for the island
          details: expensesByIsland[islandId], // Array of all individual expenses
          shiftId: shift.id,
          loadedAt: new Date().toISOString(),
          expenseCount: expensesByIsland[islandId].length, // Number of expenses for this island
          paymentSources: [...new Set(expensesByIsland[islandId].map(e => e.paymentSource))]
        };
        
        console.log(`   🏝️ Island ${islandId}: total=KES ${total}, count=${expensesByIsland[islandId].length}`);
        expensesByIsland[islandId].forEach((exp, idx) => {
          console.log(`     - Expense ${idx + 1}: ${exp.title} - KES ${exp.amount}`);
        });
      });
      
      console.log('✅ FINAL autoExpenseTotals:', autoExpenseTotals);
      
      setAutoExpenses(autoExpenseTotals);
      
      // Update islands data if needed
      if (currentStep >= 1 && pumps.length > 0) {
        console.log('🔄 Updating islands data with new expenses');
        prepareIslandsData(pumps, {});
      }
      
      if (validExpenses.length > 0) {
        console.log(`✅ SUCCESS: Loaded ${validExpenses.length} valid island collection expenses for shift #${shift.shiftNumber}`);
        message.success(`Loaded ${validExpenses.length} expenses for this shift`);
      } else {
        console.log('ℹ️ No island collection expenses found for this shift');
      }
      
      console.log('📋 ========== FINISHED LOADING EXPENSES ==========');
      
    } catch (error) {
      console.error('❌ FATAL ERROR in loadExistingExpenses:', error);
      message.error('Could not load existing expenses');
      setAutoExpenses({});
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
                unitPrice: pump.product.minSellingPrice || pump.product.axSellingPrice || 0
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
      
      // Load expenses AFTER pumps are set
      await loadExistingExpenses();
      
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

      // CRITICAL: Only load autoExpenses that belong to this shift
      const islandAutoExpenses = islandData.islandId && autoExpenses[islandData.islandId] ? 
        autoExpenses[islandData.islandId] : null;
      
      // Verify the expense belongs to current shift
      if (islandAutoExpenses && islandAutoExpenses.shiftId !== shift?.id) {
        console.warn(`⚠️ AutoExpense for island ${islandData.islandId} has shiftId ${islandAutoExpenses.shiftId} but current shift is ${shift?.id}`);
      }
      
      // Get the SUMMED total of all expenses for this island
      const autoExpenseTotal = islandAutoExpenses?.total || 0;
      const autoExpenseDetails = islandAutoExpenses?.details || [];
      const expenseCount = islandAutoExpenses?.expenseCount || 0;

      // Calculate expected sales for this island
      const expectedSales = calculateIslandExpectedSales(islandData.pumps);

      return {
        key: index,
        islandId: islandData.islandId,
        islandName: islandData.islandName,
        attendants: attendants,
        pumps: islandData.pumps,
        totalPumpSales: expectedSales,
        autoExpenses: autoExpenseTotal, // This is the SUMMED total of all expenses
        autoExpenseDetails: autoExpenseDetails, // Array of individual expenses
        autoExpenseShiftId: islandAutoExpenses?.shiftId,
        loadedAt: islandAutoExpenses?.loadedAt,
        expenseCount: expenseCount // Number of expenses for this island
      };
    });

    setIslandsData(islands);
    
    // ===== AUTO-FILL ACTUAL SALES WITH EXPECTED VALUES =====
    const initialEntries = {};
    islands.forEach((island) => {
      initialEntries[island.key] = {
        islandTotalSales: island.totalPumpSales || 0, // Auto-fill with expected value
        notes: ''
      };
    });
    
    // Merge with any existing entries, but prioritize expected values for new islands
    setSalesEntries(prev => {
      const merged = { ...prev };
      
      // For each island, if it doesn't have an entry OR if the entry is 0, set it to expected
      Object.keys(initialEntries).forEach(key => {
        if (!merged[key] || merged[key].islandTotalSales === 0) {
          merged[key] = initialEntries[key];
          console.log(`📝 Auto-filled island ${key} with expected sales: KES ${initialEntries[key].islandTotalSales}`);
        }
      });
      
      return merged;
    });
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
      const autoExpenseAmount = island.autoExpenses || 0; // This is the SUMMED total
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
      
      // Calculate shortage (only when collections < expected)
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
        autoExpenses: autoExpenseAmount, // SUMMED total passed through
        totalExpenses,
        receipts: islandReceipts,
        totalExpected,
        shortageAmount,
        variance: shortageAmount,
        hasSales,
        collectionsModalCompleted,
        shortagePosted,
        shortageRecord: postedShortages[islandKey],
        collectionStatus: totalCollection >= totalExpected ? 'full' : 'short',
        expenseCount: island.expenseCount // Pass through expense count
      };
    });
  };

  // ========== COLLECTIONS MODAL ==========
  const CollectionsModal = ({ 
    visible, 
    onCancel, 
    onSave, 
    islandIndex,
    currentCollections
  }) => {
    const [localCollections, setLocalCollections] = useState([]);
    const [cashAmount, setCashAmount] = useState('');
    const [selectedDebtor, setSelectedDebtor] = useState(null);
    const [debtAmount, setDebtAmount] = useState('');
    const [searchDebtor, setSearchDebtor] = useState('');
    const [selectedIsland, setSelectedIsland] = useState(null);
    
    const [hasUnaddedCash, setHasUnaddedCash] = useState(false);
    
    // Calculate real-time totals
    const totalPumpSales = selectedIsland?.totalPumpSales || 0;
    const islandReceipts = receipts[islandIndex] || 0;
    const manualExpenseAmount = expenses[islandIndex] || 0;
    const autoExpenseAmount = selectedIsland?.autoExpenses || 0; // SUMMED total
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
    const pendingCash = parseFloat(cashAmount) || 0;
    const displayTotal = currentTotal + pendingCash;
    
    // Real-time shortage calculation (for display only)
    const hasShortage = totalExpected > displayTotal;
    const shortageAmount = hasShortage ? totalExpected - displayTotal : 0;
    
    useEffect(() => {
      setHasUnaddedCash(cashAmount && parseFloat(cashAmount) > 0);
    }, [cashAmount]);
    
    // Load collections when modal opens
    useEffect(() => {
      if (visible && islandIndex !== undefined) {
        const island = islandsData.find(island => island.key === islandIndex);
        setSelectedIsland(island);
        setLocalCollections(currentCollections || []);
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

      onSave(localCollections);
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
            {selectedIsland?.expenseCount > 1 && (
              <Tag color="orange" icon={<Receipt size={12} />}>
                {selectedIsland.expenseCount} Expenses (KES {selectedIsland.autoExpenses?.toFixed(2)})
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
          <Button
            key="save"
            type="primary"
            onClick={handleSaveCollections}
            disabled={localCollections.length === 0 || hasUnaddedCash}
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
                  valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Collected"
                  value={currentTotal}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Pending"
                  value={pendingCash}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                    SHORTAGE (if any)
                  </div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: shortageAmount > 0 ? '#ff4d4f' : '#52c41a',
                    backgroundColor: shortageAmount > 0 ? '#fff2f0' : '#f6ffed',
                    padding: '8px',
                    borderRadius: '6px'
                  }}>
                    KES {shortageAmount.toFixed(2)}
                    {shortageAmount === 0 && ' ✓'}
                  </div>
                </div>
              </Col>
            </Row>
            
            {(autoExpenseAmount > 0 || manualExpenseAmount > 0) && (
              <Alert
                message="Expense Details"
                description={
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    {autoExpenseAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">
                          Auto Expenses 
                          {selectedIsland?.expenseCount > 1 && ` (${selectedIsland.expenseCount} items)`}:
                        </Text>
                        <Text strong style={{ color: '#fa8c16' }}>KES {autoExpenseAmount.toFixed(2)}</Text>
                      </div>
                    )}
                    {autoExpenseAmount > 0 && selectedIsland?.autoExpenseDetails?.length > 0 && (
                      <div style={{ marginLeft: 16, marginTop: 4 }}>
                        {selectedIsland.autoExpenseDetails.map((exp, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <Text type="secondary">• {exp.title}:</Text>
                            <Text>KES {exp.amount.toFixed(2)}</Text>
                          </div>
                        ))}
                      </div>
                    )}
                    {manualExpenseAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: autoExpenseAmount > 0 ? 4 : 0 }}>
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
            
            {hasUnaddedCash && (
              <div style={{ 
                marginTop: 12, 
                padding: '8px 12px', 
                backgroundColor: '#fff7e6',
                border: '1px solid #ffbb96',
                borderRadius: '4px'
              }}>
                <Text type="warning" strong>
                  ⚠️ You have KES {pendingCash.toFixed(2)} in the cash field that hasn't been added. 
                  Click "Add Cash Collection" to include it.
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
            <Text strong>Current Collections ({localCollections.length} entries):</Text>
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

  // ========== SHORTAGE MODAL ==========
  const ShortageModal = ({ 
    visible, 
    onCancel, 
    onPost,
    island
  }) => {
    const [shortageDetails, setShortageDetails] = useState(null);
    const [creatingShortage, setCreatingShortage] = useState(false);
    const [staffAccount, setStaffAccount] = useState(null);
    const [loadingStaff, setLoadingStaff] = useState(false);
    
    useEffect(() => {
      if (visible && island) {
        prepareShortageDetails();
      }
    }, [visible, island]);
    
    const prepareShortageDetails = async () => {
      if (!island || !island.attendants || island.attendants.length === 0) {
        message.error('No attendant assigned to this island');
        return;
      }

      const primaryAttendant = island.attendants[0];
      
      setLoadingStaff(true);
      try {
        const result = await staffAccountService.getStaffAccountsByStation(currentStationId);
        const accounts = result?.accounts || result?.data || result || [];
        
        let foundAccount = accounts.find(account => {
          const userId = account.user?.id || account.userId;
          return userId === primaryAttendant.id;
        });
        
        if (!foundAccount) {
          const attendantFullName = `${primaryAttendant.firstName} ${primaryAttendant.lastName}`.toLowerCase().trim();
          
          foundAccount = accounts.find(account => {
            const accountFullName = `${account.user?.firstName || ''} ${account.user?.lastName || ''}`.toLowerCase().trim();
            return accountFullName === attendantFullName;
          });
        }
        
        setStaffAccount(foundAccount);
        
        if (!foundAccount) {
          message.error(`No staff account found for ${primaryAttendant.firstName} ${primaryAttendant.lastName}`);
        }
        
      } catch (error) {
        console.error('Error fetching staff accounts:', error);
        message.error('Failed to fetch staff accounts');
      } finally {
        setLoadingStaff(false);
      }
    };
    
    const getSeverityLevel = (amount) => {
      if (amount <= 1000) return 'MINOR';
      if (amount <= 5000) return 'MODERATE';
      if (amount <= 20000) return 'MAJOR';
      return 'CRITICAL';
    };
    
    const handlePostShortage = async () => {
      if (!staffAccount) {
        message.error('No staff account found for attendant');
        return;
      }
      
      setCreatingShortage(true);
      try {
        const today = dayjs();
        const dueDate = today.add(30, 'day');
        
        const shortageData = {
          staffAccountId: staffAccount.id,
          amount: island.shortageAmount,
          description: `Island Collection Shortage - ${island.islandName}, Shift #${shift?.shiftNumber || 'N/A'}`,
          shortageType: 'CASH',
          responsibleParty: 'ATTENDANT',
          severity: getSeverityLevel(island.shortageAmount),
          comments: `Posted during shift closing. Expected: KES ${island.totalExpected?.toFixed(2)}, Collected: KES ${island.totalCollection?.toFixed(2)}`,
          shiftId: shift?.id,
          islandId: island.islandId,
          dueDate: dueDate.toISOString(),
          incidentDate: new Date().toISOString(),
          recordedById: currentUser?.id,
          stationId: currentStationId,
          autoGenerated: true,
          source: 'SHIFT_CLOSING'
        };

        console.log('Posting shortage:', shortageData);
        
        const response = await shortageService.createShortage(shortageData);
        const shortage = response.data || response;
        
        message.success(`Shortage of KES ${island.shortageAmount.toFixed(2)} posted to ${island.attendants[0].firstName} ${island.attendants[0].lastName}`);
        
        onPost(island.key, shortage);
        
      } catch (error) {
        console.error('Error posting shortage:', error);
        message.error(`Failed to post shortage: ${error.message}`);
      } finally {
        setCreatingShortage(false);
      }
    };

    if (!island) return null;

    return (
      <Modal
        title={
          <Space>
            <AlertTriangle size={16} color="#fa8c16" />
            <Text strong>Post Shortage - {island.islandName}</Text>
            <Tag color="red" style={{ marginLeft: 8 }}>
              KES {island.shortageAmount?.toFixed(2)}
            </Tag>
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        width={600}
        footer={[
          <Button key="cancel" onClick={onCancel} disabled={creatingShortage}>
            Cancel
          </Button>,
          <Button
            key="post"
            type="primary"
            danger
            onClick={handlePostShortage}
            loading={creatingShortage}
            disabled={!staffAccount || loadingStaff}
            icon={<AlertTriangle size={14} />}
          >
            {creatingShortage ? 'Posting Shortage...' : 'Post Shortage to Attendant'}
          </Button>
        ]}
      >
        <Spin spinning={loadingStaff}>
          <div style={{ marginBottom: 16 }}>
            <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Expected Amount"
                    value={island.totalExpected}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Collected Amount"
                    value={island.totalCollection}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Shortage Amount</Text>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  color: '#ff4d4f'
                }}>
                  KES {island.shortageAmount?.toFixed(2)}
                </div>
              </div>
            </Card>
          </div>

          <Card size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Island">
                <Tag color="blue">{island.islandName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Attendant">
                {island.attendants && island.attendants.length > 0 ? (
                  <Space>
                    <UserOutlined />
                    <Text>{island.attendants[0].firstName} {island.attendants[0].lastName}</Text>
                  </Space>
                ) : (
                  <Text type="danger">No attendant assigned</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Staff Account">
                {staffAccount ? (
                  <Tag color="green">Account Found ✓</Tag>
                ) : (
                  <Text type="danger">No staff account found</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {dayjs().add(30, 'day').format('DD/MM/YYYY')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Spin>
      </Modal>
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
      
      setCurrentStep(3);
      
    } else if (currentStep === 3) {
      const islandStats = calculateIslandStats();
      const islandsWithShortages = islandStats.filter(island => island.shortageAmount > 10);
      const allShortagesResolved = islandsWithShortages.every(island => island.shortagePosted);
      
      if (islandsWithShortages.length > 0 && !allShortagesResolved) {
        message.warning('Please post all shortages before proceeding');
        return;
      }
      
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleIslandCollectionsSave = (islandKey, collectionsData) => {
    setCollections(prev => ({
      ...prev,
      [islandKey]: collectionsData
    }));
    
    setCollectionsModalVisible(false);
    message.success('Collections saved for island');
  };

  const handlePostShortage = (islandKey, shortageRecord) => {
    setPostedShortages(prev => ({
      ...prev,
      [islandKey]: {
        ...shortageRecord,
        postedAt: new Date().toISOString()
      }
    }));
    
    setShortageModalVisible(false);
    setCurrentShortageIsland(null);
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
        autoExpenses: island.autoExpenses || 0, // SUMMED total
        autoExpenseDetails: island.autoExpenseDetails || [], // Array of individual expenses
        cashCollection: islandCollections
          .filter(c => c && c.type === 'cash')
          .reduce((sum, c) => sum + (c.amount || 0), 0),
        collections: islandCollections,
        shortageAmount: island.shortageAmount,
        shortagePosted: island.shortagePosted,
        shortageRecord: island.shortageRecord,
        isComplete: true,
        notes: salesEntries[islandKey]?.notes || '',
        expenseCount: island.expenseCount
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
    
    // Total shortage amount
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
          shortageAmount: shortageAmount,
          overageAmount: 0
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
        totalShortageAmount,
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

    console.log('✅ prepareSummaryData completed for shift:', shift?.id);
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

      console.log('🚀 SUBMITTING PAYLOAD for shift:', shift?.id);
      
      const response = await shiftService.closeShift(shift?.id, finalPayload);
      
      console.log('✅ Shift closed successfully:', response);
      
      // Clear cache for this specific shift
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
    const totalExpenseItems = islandStats.reduce((sum, island) => sum + (island.expenseCount || 0), 0);
    
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
              <Tooltip title={island.autoExpenseDetails?.map(e => `${e.title}: KES ${e.amount}`).join('\n')}>
                <Tag size="small" color="orange" style={{ marginTop: 2 }}>
                  {island.expenseCount} Expense{island.expenseCount > 1 ? 's' : ''}: KES {island.autoExpenses.toFixed(2)}
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
                {island.expenseCount > 1 && ` (${island.expenseCount} items)`}
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
              <Tooltip title={`${totalExpenseItems} total expense items across islands`}>
                <Badge 
                  count={`KES ${totalAutoExpenses.toFixed(2)}`} 
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
                  Found <strong>KES {totalAutoExpenses.toFixed(2)}</strong> in pre-recorded expenses from this shift across <strong>{totalExpenseItems} expense items</strong>.
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
            {island.expenseCount > 0 && (
              <Tag size="small" color="orange" style={{ marginTop: 2 }}>
                {island.expenseCount} Expense{island.expenseCount > 1 ? 's' : ''}
              </Tag>
            )}
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
                {island.expenseCount > 1 && ` ${island.expenseCount} items`}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'SHORTAGE',
        width: 100,
        render: (_, island) => {
          if (island.shortageAmount === 0) {
            return <Tag color="green">None</Tag>;
          }
          return (
            <Tag color="red">
              KES {island.shortageAmount?.toFixed(2)}
            </Tag>
          );
        },
      },
      {
        title: 'STATUS',
        width: 100,
        render: (_, island) => (
          <Tag color={island.collectionsModalCompleted ? 'green' : 'red'}>
            {island.collectionsModalCompleted ? 'Saved' : 'Pending'}
          </Tag>
        ),
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

    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>
          <Space>
            <Wallet size={18} />
            Collections
            {islandsWithShortages > 0 && (
              <Badge count={`${islandsWithShortages} Shortages`} style={{ backgroundColor: '#ff4d4f' }} />
            )}
          </Space>
        </Title>
        
        <Row gutter={[8, 8]} style={{ marginBottom: 20 }}>
          <Col span={6}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Islands"
                value={islandsWithCollections}
                suffix={`/ ${totalIslands}`}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="With Shortages"
                value={islandsWithShortages}
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
              <Statistic
                title="Total Shortage"
                value={islandStats.reduce((sum, island) => sum + (island.shortageAmount || 0), 0)}
                precision={0}
                prefix="KES"
                valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card 
              size="small" 
              bodyStyle={{ 
                padding: '8px', 
                textAlign: 'center',
                backgroundColor: allCollectionsComplete ? '#f6ffed' : '#fff7e6'
              }}
            >
              <Statistic
                title="Status"
                value={allCollectionsComplete ? "Ready" : "In Progress"}
                valueStyle={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: allCollectionsComplete ? '#52c41a' : '#faad14' 
                }}
              />
            </Card>
          </Col>
        </Row>
        
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
            disabled={!allCollectionsComplete}
            style={{ 
              background: allCollectionsComplete ? '#1890ff' : '#d9d9d9'
            }}
          >
            Proceed to Shortages
          </Button>
        </div>
        
        <CollectionsModal
          visible={collectionsModalVisible}
          onCancel={() => setCollectionsModalVisible(false)}
          onSave={(collectionsData) => handleIslandCollectionsSave(currentIslandIndex, collectionsData)}
          islandIndex={currentIslandIndex}
          currentCollections={collections[currentIslandIndex] || []}
        />
      </div>
    );
  };

  const renderShortagesStep = () => {
    const islandStats = calculateIslandStats();
    const islandsWithShortages = islandStats.filter(island => island.shortageAmount > 10);
    const allShortagesPosted = islandsWithShortages.every(island => island.shortagePosted);
    
    const columns = [
      {
        title: 'ISLAND',
        key: 'island',
        width: 180,
        render: (_, island) => (
          <Space direction="vertical" size={2}>
            <Text strong>{island.islandName}</Text>
            {island.attendants && island.attendants.length > 0 && (
              <Tag color="blue">
                <UserOutlined /> {island.attendants[0].firstName} {island.attendants[0].lastName}
              </Tag>
            )}
            {island.expenseCount > 0 && (
              <Tag size="small" color="orange">
                {island.expenseCount} Expenses
              </Tag>
            )}
          </Space>
        ),
      },
      {
        title: 'EXPECTED',
        width: 120,
        render: (_, island) => (
          <Text strong>KES {island.totalExpected?.toFixed(2)}</Text>
        ),
      },
      {
        title: 'COLLECTED',
        width: 120,
        render: (_, island) => (
          <Text strong>KES {island.totalCollection?.toFixed(2)}</Text>
        ),
      },
      {
        title: 'SHORTAGE AMOUNT',
        width: 150,
        render: (_, island) => (
          <Text strong style={{ color: '#ff4d4f', fontSize: '16px' }}>
            KES {island.shortageAmount?.toFixed(2)}
          </Text>
        ),
      },
      {
        title: 'STATUS',
        width: 120,
        render: (_, island) => {
          if (island.shortagePosted) {
            return <Tag color="green">Posted ✓</Tag>;
          }
          return <Tag color="red">Pending</Tag>;
        },
      },
      {
        title: 'ACTIONS',
        width: 150,
        render: (_, island) => {
          if (island.shortagePosted) {
            return (
              <Button 
                size="small" 
                disabled
                icon={<CheckCircle size={14} />}
              >
                Already Posted
              </Button>
            );
          }
          return (
            <Button
              type="primary"
              danger
              size="small"
              onClick={() => {
                setCurrentShortageIsland(island);
                setShortageModalVisible(true);
              }}
              icon={<AlertTriangle size={14} />}
            >
              Post Shortage
            </Button>
          );
        },
      }
    ];

    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>
          <Space>
            <AlertTriangle size={18} color="#fa8c16" />
            Post Shortages
            {islandsWithShortages.length === 0 && (
              <Tag color="green">No Shortages to Post</Tag>
            )}
          </Space>
        </Title>
        
        {islandsWithShortages.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <CheckCircle size={48} color="#52c41a" style={{ marginBottom: 16 }} />
              <Title level={4}>No Shortages Found</Title>
              <Text type="secondary">All islands have fully collected their expected amounts.</Text>
            </div>
          </Card>
        ) : (
          <>
            <Alert
              message={`${islandsWithShortages.length} Island${islandsWithShortages.length > 1 ? 's' : ''} with Shortages`}
              description="Please post shortages to the responsible attendants. Shortages below KES 10 are automatically ignored."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Card bodyStyle={{ padding: '12px' }} style={{ marginBottom: 16 }}>
              <Table
                columns={columns}
                dataSource={islandsWithShortages}
                size="small"
                pagination={false}
                rowKey="key"
              />
            </Card>
          </>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handlePrevStep} icon={<ArrowLeft size={16} />}>
            Back to Collections
          </Button>
          <Button
            type="primary"
            onClick={handleNextStep}
            disabled={!allShortagesPosted && islandsWithShortages.length > 0}
            style={{ 
              background: allShortagesPosted || islandsWithShortages.length === 0 ? '#52c41a' : '#d9d9d9',
              border: 'none'
            }}
          >
            {islandsWithShortages.length === 0 ? 'Proceed to Summary' : 
             allShortagesPosted ? 'All Shortages Posted - Proceed to Summary' : 
             'Post All Shortages First'}
          </Button>
        </div>
        
        <ShortageModal
          visible={shortageModalVisible}
          onCancel={() => {
            setShortageModalVisible(false);
            setCurrentShortageIsland(null);
          }}
          onPost={handlePostShortage}
          island={currentShortageIsland}
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
    const totalExpenseItems = islandStats.reduce((sum, island) => sum + (island.expenseCount || 0), 0);
    
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
                  title={`Auto Expenses (${totalExpenseItems} item${totalExpenseItems > 1 ? 's' : ''})`}
                  value={totalAutoExpenses}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
                />
                <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                  Pre-recorded expenses for this shift
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
            
            {totalAutoExpenses > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>Expense Breakdown by Island:</Text>
                {islandStats.filter(i => i.autoExpenses > 0).map(island => (
                  <div key={island.key} style={{ marginTop: 8 }}>
                    <Tag color="orange">{island.islandName}</Tag>
                    <Text>KES {island.autoExpenses.toFixed(2)}</Text>
                    {island.autoExpenseDetails?.length > 0 && (
                      <div style={{ marginLeft: 24, marginTop: 4 }}>
                        {island.autoExpenseDetails.map((exp, idx) => (
                          <div key={idx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">• {exp.title}:</Text>
                            <Text>KES {exp.amount.toFixed(2)}</Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                {totalAutoExpenses > 0 && ` (KES ${totalAutoExpenses.toFixed(2)} auto from ${totalExpenseItems} items)`}
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
                      <Tooltip title={record.autoExpenseDetails?.map(e => `${e.title}: KES ${e.amount}`).join('\n')}>
                        <Text type="secondary" style={{ fontSize: '10px', color: '#fa8c16' }}>
                          Auto Expenses: KES {record.autoExpenses.toFixed(2)}
                          {record.expenseCount > 1 && ` (${record.expenseCount} items)`}
                        </Text>
                      </Tooltip>
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
                        {r.expenseCount > 1 && ` (${r.expenseCount})`}
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
            Back to Shortages
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
              {currentStep === 3 && renderShortagesStep()}
              {currentStep === 4 && renderSummaryStep()}
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