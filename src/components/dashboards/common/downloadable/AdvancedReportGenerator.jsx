// AdvancedReportGenerator.jsx - Complete Enhanced Version
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Button, 
  Dropdown, 
  Modal, 
  Checkbox, 
  Space, 
  Divider,
  message,
  Row,
  Col,
  Card,
  ColorPicker,
  Input,
  Select,
  Switch,
  Typography,
  Tooltip,
  Tabs,
  Form,
  Radio,
  InputNumber,
  Badge,
  Tag,
  Alert,
  Statistic,
  Progress,
  Slider,
  Popconfirm,
  Descriptions,
  Result,
  Timeline,
  Segmented,
  QRCode,
  DatePicker,
  TimePicker,
  Upload,
  Table as AntTable,
  Steps,
  Avatar,
  List
} from 'antd';
import { 
  DownloadOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined,
  FileWordOutlined,
  FileTextOutlined,
  FileImageOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  AuditOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  BankOutlined,
  PercentageOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  AreaChartOutlined,
  TableOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  ShopOutlined,
  ShoppingOutlined,
  ProfileOutlined,
  FileProtectOutlined,
  FileDoneOutlined,
  FileSyncOutlined,
  FileExcelFilled,
  FilePdfFilled,
  FileWordFilled,
  PrinterOutlined,
  ReloadOutlined,
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  CompressOutlined,
  ExpandOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  BorderOutlined,
  TaobaoCircleOutlined,
  SaveOutlined,
  CopyOutlined,
  ShareAltOutlined,
  QrcodeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SearchOutlined,
  ClearOutlined,
  PlusOutlined,
  MinusOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  StopOutlined,
  ExportOutlined,
  ImportOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  SyncOutlined,
  LoadingOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Step } = Steps;
const { Countdown } = Statistic;

// ========== REPORT THEMES & CONFIGURATIONS ==========
const REPORT_THEMES = {
  finance: {
    name: 'Financial Report',
    icon: <DollarOutlined />,
    colors: {
      primary: [30, 50, 92],      // Navy Blue
      secondary: [41, 128, 185],  // Professional Blue
      accent: [0, 150, 136],      // Teal
      success: [46, 204, 113],    // Green
      warning: [255, 152, 0],     // Amber
      danger: [211, 47, 47],      // Crimson
      info: [52, 152, 219]       // Light Blue
    },
    features: {
      requireApproval: true,
      requireAuditTrail: true,
      confidentialLevel: 'high',
      requiredFields: ['amount', 'date', 'transactionId'],
      validations: ['numeric', 'positive', 'balanceCheck']
    }
  },
  users: {
    name: 'User Report',
    icon: <TeamOutlined />,
    colors: {
      primary: [103, 58, 183],    // Purple
      secondary: [156, 39, 176],  // Deep Purple
      accent: [255, 107, 0],      // Orange
      success: [76, 175, 80],     // Green
      warning: [255, 193, 7],     // Amber
      danger: [244, 67, 54],      // Red
      info: [33, 150, 243]       // Blue
    },
    features: {
      requireApproval: false,
      requireAuditTrail: true,
      confidentialLevel: 'medium',
      requiredFields: ['userId', 'name', 'email'],
      validations: ['email', 'phone', 'dateOfBirth'],
      maskSensitiveData: true
    }
  },
  sales: {
    name: 'Sales Report',
    icon: <ShoppingOutlined />,
    colors: {
      primary: [0, 150, 136],     // Teal
      secondary: [0, 188, 212],   // Cyan
      accent: [255, 87, 34],      // Deep Orange
      success: [56, 142, 60],     // Green
      warning: [255, 152, 0],     // Orange
      danger: [198, 40, 40],      // Dark Red
      info: [0, 188, 212]        // Cyan
    },
    features: {
      requireApproval: false,
      requireAuditTrail: true,
      confidentialLevel: 'medium'
    }
  },
  inventory: {
    name: 'Inventory Report',
    icon: <DatabaseOutlined />,
    colors: {
      primary: [255, 107, 0],     // Orange
      secondary: [255, 145, 0],   // Amber
      accent: [33, 150, 243],     // Blue
      success: [0, 200, 83],      // Emerald
      warning: [255, 193, 7],     // Yellow
      danger: [255, 61, 0],       // Red
      info: [255, 145, 0]        // Amber
    }
  },
  audit: {
    name: 'Audit Report',
    icon: <AuditOutlined />,
    colors: {
      primary: [121, 85, 72],     // Brown
      secondary: [93, 64, 55],    // Dark Brown
      accent: [141, 110, 99],     // Light Brown
      success: [67, 160, 71],     // Green
      warning: [251, 192, 45],    // Yellow
      danger: [229, 57, 53],      // Red
      info: [93, 64, 55]         // Dark Brown
    },
    features: {
      requireApproval: true,
      requireAuditTrail: true,
      confidentialLevel: 'high',
      immutable: true
    }
  },
  default: {
    name: 'Corporate Report',
    icon: <AppstoreOutlined />,
    colors: {
      primary: [41, 128, 185],    // Blue
      secondary: [44, 62, 80],    // Dark Blue
      accent: [52, 152, 219],     // Light Blue
      success: [46, 204, 113],    // Green
      warning: [241, 196, 15],    // Yellow
      danger: [231, 76, 60],      // Red
      info: [52, 152, 219]       // Light Blue
    }
  }
};

// ========== COLUMN TYPES WITH FINANCIAL/USER SPECIFIC HANDLING ==========
const COLUMN_TYPES = {
  text: {
    name: 'Text',
    format: (value) => String(value || ''),
    excelType: 's',
    validation: null
  },
  number: {
    name: 'Number',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    excelType: 'n',
    style: { numFmt: '#,##0.00' },
    validation: 'numeric'
  },
  currency: {
    name: 'Currency',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    excelType: 'n',
    style: { numFmt: 'KSh #,##0.00;[Red]-KSh #,##0.00' },
    validation: 'currency',
    financial: true
  },
  percentage: {
    name: 'Percentage',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num / 100;
    },
    excelType: 'n',
    style: { numFmt: '0.00%' },
    validation: 'percentage',
    financial: true
  },
  date: {
    name: 'Date',
    format: (value) => {
      if (!value) return '';
      const date = new Date(value);
      return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-KE');
    },
    excelType: 'd',
    style: { numFmt: 'dd/mm/yyyy' },
    validation: 'date'
  },
  datetime: {
    name: 'Date & Time',
    format: (value) => {
      if (!value) return '';
      const date = new Date(value);
      return isNaN(date.getTime()) ? '' : date.toLocaleString('en-KE');
    },
    excelType: 'd',
    style: { numFmt: 'dd/mm/yyyy hh:mm:ss' },
    validation: 'datetime'
  },
  boolean: {
    name: 'Yes/No',
    format: (value) => value ? 'Yes' : 'No',
    excelType: 's',
    validation: null
  },
  status: {
    name: 'Status',
    format: (value) => String(value || ''),
    excelType: 's',
    validation: null
  },
  // Financial specific
  accountNumber: {
    name: 'Account Number',
    format: (value) => {
      const str = String(value || '');
      // Mask for display
      return str.length > 4 ? `***${str.slice(-4)}` : str;
    },
    excelType: 's',
    validation: 'accountNumber',
    financial: true,
    sensitive: true
  },
  amount: {
    name: 'Amount',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : Math.abs(num);
    },
    excelType: 'n',
    style: { numFmt: 'KSh #,##0.00;[Red]-KSh #,##0.00' },
    validation: 'positiveAmount',
    financial: true
  },
  balance: {
    name: 'Balance',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    excelType: 'n',
    style: { numFmt: 'KSh #,##0.00;[Red]-KSh #,##0.00' },
    validation: 'balance',
    financial: true
  },
  // User specific
  email: {
    name: 'Email',
    format: (value) => String(value || ''),
    excelType: 's',
    validation: 'email',
    sensitive: true
  },
  phone: {
    name: 'Phone',
    format: (value) => {
      const str = String(value || '');
      // Mask phone number
      return str.length > 4 ? `${str.slice(0, 3)}****${str.slice(-2)}` : str;
    },
    excelType: 's',
    validation: 'phone',
    sensitive: true
  },
  nationalId: {
    name: 'National ID',
    format: (value) => {
      const str = String(value || '');
      // Mask ID
      return str.length > 5 ? `${str.slice(0, 2)}***${str.slice(-3)}` : str;
    },
    excelType: 's',
    validation: 'nationalId',
    sensitive: true
  }
};

// ========== DATA VALIDATION RULES ==========
const VALIDATION_RULES = {
  numeric: (value) => !isNaN(parseFloat(value)) && isFinite(value),
  positive: (value) => parseFloat(value) >= 0,
  currency: (value) => /^-?\d+(\.\d{1,2})?$/.test(value),
  percentage: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  },
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^\+?[\d\s\-\(\)]{10,}$/.test(value),
  nationalId: (value) => /^\d{6,12}$/.test(value),
  accountNumber: (value) => /^[A-Z0-9]{8,20}$/.test(value),
  date: (value) => !isNaN(new Date(value).getTime())
};

// ========== MAIN COMPONENT ==========
const AdvancedReportGenerator = ({ 
  // Dynamic table data
  dataSource = [],
  columns = [],
  summaryData = null,
  financialSummary = null,
  
  // Report configuration
  title = 'Report',
  fileName = 'report',
  reportType = 'default',
  showFooter = true,
  footerText,
  customStyles,
  
  // Company/Station info
  companyName: propCompanyName,
  companyLogo = null,
  stationInfo: propStationInfo,
  
  // Advanced features
  includeLogo = false,
  includeCharts = false,
  includeFilters = false,
  enableCustomization = true,
  requireApproval = false,
  enableAuditTrail = true,
  dataSensitivity = 'medium',
  
  // Callbacks
  onColumnChange,
  onSettingsSave,
  onReportGenerate,
  onReportApprove,
  onReportExport,
  onDataValidation
}) => {
  // Get state from context
  const { state } = useApp();
  
  // Get company and user info from state
  const companyName = propCompanyName || state?.currentCompany?.name || "Lynx Systems Ltd";
  const currentUser = state?.currentUser;
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'System User';
  const userRole = currentUser?.role || 'User';
  const userId = currentUser?.id || 'N/A';
  
  const stationInfo = propStationInfo || {
    name: state?.currentStation?.name || 'Head Office',
    code: state?.currentStation?.code || 'HO001',
    address: state?.currentStation?.location || 'Nairobi, Kenya',
    manager: state?.currentStation?.manager || 'Station Manager'
  };
  
  // ========== STATE DEFINITIONS ==========
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isValidatingData, setIsValidatingData] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [auditLog, setAuditLog] = useState([]);
  const [reportApproval, setReportApproval] = useState({
    approved: false,
    approvedBy: '',
    approvedAt: null,
    approvalNotes: '',
    requiresApproval: requireApproval || false
  });

  // Enhanced state for intelligent column management
  const [optimizedColumnWidths, setOptimizedColumnWidths] = useState({});
  const [columnWidthMode, setColumnWidthMode] = useState('auto');
  const [tableSettings, setTableSettings] = useState({
    maxColumnWidth: 100,
    minColumnWidth: 15,
    defaultColumnWidth: 40,
    compressMode: true,
    overflowStrategy: 'wrap',
    columnPriority: 'balance',
    maxRowsPerPage: 50,
    autoPageBreak: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    passwordProtected: false,
    password: '',
    encryptionLevel: 'standard',
    watermarkText: 'CONFIDENTIAL',
    allowCopying: false,
    allowPrinting: true,
    expirationDate: null,
    accessRestrictions: [],
    hideSensitiveData: reportType === 'users' || reportType === 'finance'
  });

  // Report settings
  const [reportSettings, setReportSettings] = useState({
    // Layout
    pageOrientation: 'landscape',
    fontSize: 9,
    rowHeight: 6,
    cellPadding: 3,
    
    // Colors
    colorScheme: reportType,
    customColors: null,
    
    // Content
    includeHeader: true,
    includeFooter: showFooter,
    includeSummary: !!summaryData,
    includeFinancialSummary: !!financialSummary,
    includePageNumbers: true,
    includeTimestamp: true,
    includeStationInfo: !!stationInfo,
    includeGeneratedBy: true,
    includeQRCode: false,
    includeWatermark: false,
    
    // Table
    showGridLines: true,
    alternateRowColors: true,
    autoWrapText: true,
    headerStyle: 'bold',
    showTotals: true,
    showSubtotals: false,
    
    // Data
    groupBy: null,
    sortBy: null,
    filterBy: null,
    dateRange: null,
    
    // Company info
    companyName: companyName,
    reportSubtitle: '',
    customHeader: '',
    
    // Financial specific
    includeTaxCalculations: reportType === 'finance',
    includeVAT: false,
    currency: 'KES',
    exchangeRate: 1,
    
    // User specific
    maskPersonalData: reportType === 'users',
    includeUserStatistics: false
  });

  const [form] = Form.useForm();
  const [activeSettingsTab, setActiveSettingsTab] = useState('columns');
  const [exportStep, setExportStep] = useState(0);
  const reportRef = useRef(null);

  // Get current theme with enhanced features
  const currentTheme = useMemo(() => {
    return REPORT_THEMES[reportSettings.colorScheme] || REPORT_THEMES.default;
  }, [reportSettings.colorScheme]);

  // Get colors
  const colors = useMemo(() => {
    return reportSettings.customColors || currentTheme.colors;
  }, [reportSettings.customColors, currentTheme]);

  // ========== INITIALIZATION ==========
  useEffect(() => {
    initializeReport();
  }, [columns, dataSource, reportType, companyName]);

  const initializeReport = () => {
    // Initialize selected columns
    const initialColumns = columns
      .filter(col => col.dataIndex && col.title)
      .map(col => col.dataIndex);
    setSelectedColumns(initialColumns);
    
    // Initialize column widths
    const widths = {};
    columns.forEach(col => {
      if (col.dataIndex) {
        widths[col.dataIndex] = col.width || 'auto';
      }
    });
    setColumnWidths(widths);
    
    // Initialize filtered data
    setFilteredData(dataSource);
    
    // Calculate optimized widths
    calculateOptimalColumnWidths();
    
    // Load saved settings
    loadSavedSettings();
    
    // Initialize audit log
    initializeAuditLog();
    
    // Run initial data validation
    if (dataSource.length > 0) {
      validateData();
    }
  };

  const loadSavedSettings = () => {
    const savedSettings = localStorage.getItem(`reportSettings_${reportType}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setReportSettings(prev => ({
          ...prev,
          ...parsed,
          companyName: companyName
        }));
      } catch (error) {
        console.error('Error loading report settings:', error);
      }
    }
    
    // Load security settings
    const savedSecurity = localStorage.getItem(`reportSecurity_${reportType}`);
    if (savedSecurity) {
      try {
        setSecuritySettings(JSON.parse(savedSecurity));
      } catch (error) {
        console.error('Error loading security settings:', error);
      }
    }
  };

  const initializeAuditLog = () => {
    const auditEntries = [
      {
        id: 1,
        action: 'Report Initialized',
        user: userName,
        timestamp: new Date().toISOString(),
        details: `${reportType} report initialized with ${dataSource.length} records`,
        ipAddress: 'N/A',
        userAgent: navigator.userAgent
      }
    ];
    
    setAuditLog(auditEntries);
  };

  const addAuditEntry = (action, details = '') => {
    const newEntry = {
      id: auditLog.length + 1,
      action,
      user: userName,
      timestamp: new Date().toISOString(),
      details,
      ipAddress: 'N/A',
      userAgent: navigator.userAgent
    };
    
    setAuditLog(prev => [newEntry, ...prev]);
    
    // Save to localStorage for persistence
    const auditHistory = JSON.parse(localStorage.getItem('reportAuditHistory') || '[]');
    auditHistory.unshift(newEntry);
    localStorage.setItem('reportAuditHistory', JSON.stringify(auditHistory.slice(0, 100))); // Keep last 100 entries
  };

  // ========== INTELLIGENT COLUMN WIDTH CALCULATION ==========
  const calculateOptimalColumnWidths = useCallback(() => {
    if (filteredData.length === 0) return {};

    const visibleColumns = getVisibleColumns();
    const pageWidth = reportSettings.pageOrientation === 'landscape' ? 290 : 200;
    const maxColumns = Math.floor(pageWidth / tableSettings.minColumnWidth);
    
    if (visibleColumns.length > maxColumns && tableSettings.compressMode) {
      message.warning(`Table has ${visibleColumns.length} columns. Auto-compression enabled.`);
    }

    const widths = {};
    const columnAnalysis = {};
    
    // Analyze each column
    visibleColumns.forEach(col => {
      const dataIndex = col.dataIndex;
      const values = filteredData.map(row => {
        let value = row[dataIndex];
        if (col.render) {
          try {
            value = col.render(value, row);
            value = extractTextFromElement(value);
          } catch (err) {
            value = String(value || '');
          }
        }
        return String(value || '');
      });
      
      const maxLength = Math.max(
        String(col.title || '').length,
        ...values.map(v => v.length)
      );
      
      const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length;
      
      columnAnalysis[dataIndex] = {
        maxLength,
        avgLength,
        type: col.type || 'text',
        isNumeric: ['number', 'currency', 'percentage', 'amount', 'balance'].includes(col.type),
        isSensitive: ['email', 'phone', 'nationalId', 'accountNumber'].includes(col.type),
        hasLongText: maxLength > 50
      };
    });

    // Calculate initial widths
    let totalRequiredWidth = 0;
    visibleColumns.forEach(col => {
      const analysis = columnAnalysis[col.dataIndex];
      
      let width;
      if (analysis.isNumeric) {
        width = Math.max(
          tableSettings.minColumnWidth,
          Math.min(analysis.maxLength * 1.5, tableSettings.maxColumnWidth)
        );
      } else if (analysis.isSensitive && securitySettings.hideSensitiveData) {
        width = Math.min(tableSettings.defaultColumnWidth * 0.8, tableSettings.maxColumnWidth * 0.4);
      } else if (analysis.hasLongText) {
        width = tableSettings.overflowStrategy === 'wrap' 
          ? Math.min(analysis.avgLength * 1.2, tableSettings.maxColumnWidth * 0.7)
          : Math.min(analysis.avgLength * 0.8, tableSettings.maxColumnWidth * 0.5);
      } else {
        width = Math.max(
          tableSettings.minColumnWidth,
          Math.min(analysis.avgLength * 1.5, tableSettings.maxColumnWidth)
        );
      }
      
      // Apply user overrides
      if (columnWidths[col.dataIndex] && columnWidths[col.dataIndex] !== 'auto') {
        width = Math.min(parseInt(columnWidths[col.dataIndex]), tableSettings.maxColumnWidth);
      }
      
      widths[col.dataIndex] = Math.round(width);
      totalRequiredWidth += width;
    });

    // Adjust to fit page
    if (totalRequiredWidth > pageWidth) {
      const scaleFactor = pageWidth / totalRequiredWidth;
      const priorityMap = {
        numeric: 1,
        sensitive: 2,
        default: 3
      };
      
      visibleColumns.forEach(col => {
        const analysis = columnAnalysis[col.dataIndex];
        const priority = analysis.isNumeric ? 1 : analysis.isSensitive ? 2 : 3;
        const adjustment = scaleFactor * (1 - (priority * 0.1));
        widths[col.dataIndex] = Math.max(
          tableSettings.minColumnWidth,
          Math.round(widths[col.dataIndex] * adjustment)
        );
      });
    }
    
    setOptimizedColumnWidths(widths);
    return widths;
  }, [filteredData, tableSettings, columnWidths, reportSettings.pageOrientation, securitySettings.hideSensitiveData]);

  // ========== DATA VALIDATION ==========
  const validateData = async () => {
    setIsValidatingData(true);
    const errors = [];
    
    try {
      const visibleColumns = getVisibleColumns();
      
      // Validate each column based on type
      visibleColumns.forEach(col => {
        if (!col.type || !VALIDATION_RULES[col.type]) return;
        
        filteredData.forEach((row, rowIndex) => {
          const value = row[col.dataIndex];
          const validationRule = VALIDATION_RULES[col.type];
          
          if (value !== undefined && value !== null && value !== '' && !validationRule(value)) {
            errors.push({
              row: rowIndex + 1,
              column: col.title || col.dataIndex,
              value,
              type: col.type,
              message: `Invalid ${col.type} value: ${value}`
            });
          }
        });
      });
      
      // Financial report specific validations
      if (reportType === 'finance') {
        validateFinancialData(errors);
      }
      
      // User report specific validations
      if (reportType === 'users') {
        validateUserData(errors);
      }
      
      setValidationErrors(errors);
      
      if (onDataValidation) {
        onDataValidation(errors);
      }
      
      if (errors.length > 0) {
        message.warning(`Found ${errors.length} validation errors`);
      } else {
        message.success('Data validation passed');
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      message.error('Data validation failed');
    } finally {
      setIsValidatingData(false);
    }
  };

  const validateFinancialData = (errors) => {
    // Check for negative balances
    const balanceColumn = columns.find(col => col.type === 'balance');
    if (balanceColumn) {
      filteredData.forEach((row, index) => {
        const balance = parseFloat(row[balanceColumn.dataIndex]);
        if (balance < 0) {
          errors.push({
            row: index + 1,
            column: balanceColumn.title,
            value: balance,
            type: 'balance',
            message: `Negative balance detected: ${balance}`
          });
        }
      });
    }
    
    // Verify total calculations
    if (summaryData && summaryData.total) {
      const amountColumn = columns.find(col => col.type === 'amount');
      if (amountColumn) {
        const calculatedTotal = filteredData.reduce((sum, row) => {
          return sum + (parseFloat(row[amountColumn.dataIndex]) || 0);
        }, 0);
        
        if (Math.abs(calculatedTotal - summaryData.total) > 0.01) {
          errors.push({
            row: 'Summary',
            column: 'Total Amount',
            value: summaryData.total,
            calculated: calculatedTotal,
            type: 'totalMismatch',
            message: `Total mismatch: Expected ${summaryData.total}, Calculated ${calculatedTotal}`
          });
        }
      }
    }
  };

  const validateUserData = (errors) => {
    // Check for duplicate emails
    const emailColumn = columns.find(col => col.type === 'email');
    if (emailColumn) {
      const emailMap = {};
      filteredData.forEach((row, index) => {
        const email = row[emailColumn.dataIndex];
        if (email) {
          if (emailMap[email]) {
            errors.push({
              row: index + 1,
              column: emailColumn.title,
              value: email,
              type: 'duplicateEmail',
              message: `Duplicate email found: ${email}`
            });
          } else {
            emailMap[email] = true;
          }
        }
      });
    }
  };

  // ========== DATA PROCESSING & FORMATTING ==========
  const getVisibleColumns = () => {
    return columns.filter(col => 
      selectedColumns.includes(col.dataIndex) && 
      col.dataIndex && 
      col.title
    ).map(col => ({
      ...col,
      width: optimizedColumnWidths[col.dataIndex] || columnWidths[col.dataIndex] || col.width || 'auto',
      type: col.type || 'text',
      format: col.format || COLUMN_TYPES[col.type || 'text'].format,
      isSensitive: COLUMN_TYPES[col.type]?.sensitive || false
    }));
  };

  const extractTextFromElement = (element) => {
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return String(element);
    if (element === null || element === undefined) return '';
    
    if (React.isValidElement(element)) {
      if (element.props && element.props.children) {
        if (typeof element.props.children === 'string') {
          return element.props.children;
        }
        if (typeof element.props.children === 'number') {
          return String(element.props.children);
        }
        if (Array.isArray(element.props.children)) {
          return element.props.children
            .map(child => extractTextFromElement(child))
            .join(' ');
        }
        return extractTextFromElement(element.props.children);
      }
    }
    
    return String(element);
  };

  const formatCurrency = (amount, currency = reportSettings.currency) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const maskSensitiveData = (value, dataType) => {
    if (!securitySettings.hideSensitiveData) return value;
    
    const str = String(value || '');
    
    switch (dataType) {
      case 'email':
        const [local, domain] = str.split('@');
        return local && domain 
          ? `${local.charAt(0)}***@${domain}`
          : str;
      
      case 'phone':
        return str.length > 4 
          ? `${str.slice(0, 3)}****${str.slice(-2)}`
          : str;
      
      case 'nationalId':
        return str.length > 5 
          ? `${str.slice(0, 2)}***${str.slice(-3)}`
          : str;
      
      case 'accountNumber':
        return str.length > 4 
          ? `***${str.slice(-4)}`
          : str;
      
      default:
        return str;
    }
  };

  const getExportData = () => {
    const visibleColumns = getVisibleColumns();
    
    const headers = visibleColumns.map(col => ({
      key: col.dataIndex,
      title: typeof col.title === 'string' ? col.title : col.key || col.dataIndex,
      dataIndex: col.dataIndex,
      type: col.type,
      format: col.format,
      width: col.width,
      render: col.render,
      isSensitive: col.isSensitive,
      excelType: COLUMN_TYPES[col.type]?.excelType || 's'
    }));

    const data = filteredData.map(record => 
      headers.reduce((acc, header) => {
        let value = record[header.dataIndex];
        
        // Apply mask for sensitive data
        if (header.isSensitive && securitySettings.hideSensitiveData) {
          value = maskSensitiveData(value, header.type);
        }
        
        // Apply column render function
        if (header.render && typeof header.render === 'function') {
          try {
            const rendered = header.render(value, record);
            value = extractTextFromElement(rendered);
          } catch (err) {
            console.warn('Error rendering column:', err);
            value = record[header.dataIndex];
          }
        }
        
        // Format value based on column type
        value = header.format ? header.format(value) : value;
        
        acc[header.title] = value != null ? String(value) : '';
        return acc;
      }, {})
    );

    return { headers, data };
  };

  const calculateColumnTotals = () => {
    const visibleColumns = getVisibleColumns();
    const totals = {};
    
    visibleColumns.forEach(col => {
      if (['currency', 'number', 'amount', 'balance', 'percentage'].includes(col.type)) {
        const total = filteredData.reduce((sum, record) => {
          const value = record[col.dataIndex];
          return sum + (parseFloat(value) || 0);
        }, 0);
        totals[col.dataIndex] = total;
      }
    });
    
    return totals;
  };

  const calculateFinancialSummary = () => {
    if (!financialSummary) return null;
    
    const visibleColumns = getVisibleColumns();
    const summary = {
      totals: calculateColumnTotals(),
      counts: {},
      averages: {},
      minMax: {}
    };
    
    visibleColumns.forEach(col => {
      if (['currency', 'number', 'amount'].includes(col.type)) {
        const values = filteredData
          .map(row => parseFloat(row[col.dataIndex]) || 0)
          .filter(v => !isNaN(v));
        
        if (values.length > 0) {
          summary.counts[col.dataIndex] = values.length;
          summary.averages[col.dataIndex] = values.reduce((a, b) => a + b, 0) / values.length;
          summary.minMax[col.dataIndex] = {
            min: Math.min(...values),
            max: Math.max(...values)
          };
        }
      }
    });
    
    return summary;
  };

  // ========== ENHANCED PDF GENERATION ==========
  const generatePDF = async () => {
    if (filteredData.length === 0) {
      message.warning('No data available to generate PDF');
      return;
    }

    if (reportApproval.requiresApproval && !reportApproval.approved) {
      message.error('Report requires approval before export');
      return;
    }

    setIsGeneratingPDF(true);
    setExportStep(1);
    addAuditEntry('PDF Export Started', `Generating ${title} PDF`);

    try {
      if (onReportGenerate) {
        onReportGenerate('pdf');
      }

      const doc = new jsPDF({
        orientation: reportSettings.pageOrientation,
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const { headers, data } = getExportData();
      const columnTotals = calculateColumnTotals();
      const hasTotals = Object.keys(columnTotals).length > 0;
      const financialSummary = calculateFinancialSummary();

      setExportStep(2);

      let yPosition = 0;

      // =========== SECURITY WATERMARK ===========
      if (securitySettings.watermarkText) {
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(230, 230, 230);
        doc.text(securitySettings.watermarkText, pageWidth / 2, pageHeight / 2, { 
          align: 'center',
          angle: 45 
        });
      }

      // =========== HEADER SECTION ===========
      if (reportSettings.includeHeader) {
        // Header background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        // Company Logo/Name
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(companyName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });
        
        // Report Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(title, pageWidth / 2, 20, { align: 'center' });
        
        // Report Subtitle
        if (reportSettings.reportSubtitle) {
          doc.setFontSize(10);
          doc.text(reportSettings.reportSubtitle, pageWidth / 2, 26, { align: 'center' });
        }
        
        // Metadata
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(240, 240, 240);
        
        // Left metadata
        const leftMeta = [
          `Report ID: ${generateReportId()}`,
          `Type: ${currentTheme.name}`,
          `Generated: ${new Date().toLocaleString('en-KE')}`,
          `By: ${userName} (${userRole})`
        ];
        
        leftMeta.forEach((text, index) => {
          doc.text(text, 15, 38 + (index * 4));
        });
        
        // Right metadata - Station Info
        if (reportSettings.includeStationInfo && stationInfo) {
          const rightMeta = [
            `Station: ${stationInfo.name}`,
            `Code: ${stationInfo.code}`,
            `Manager: ${stationInfo.manager}`,
            `Date Range: ${reportSettings.dateRange ? formatDateRange(reportSettings.dateRange) : 'All Time'}`
          ];
          
          rightMeta.forEach((text, index) => {
            doc.text(text, pageWidth - 15, 38 + (index * 4), { align: 'right' });
          });
        }
        
        yPosition = 55;
      } else {
        yPosition = 20;
      }

      // =========== FINANCIAL SUMMARY ===========
      if (reportSettings.includeFinancialSummary && financialSummary && financialSummary.totals) {
        const summaryHeight = 35;
        
        // Summary box
        doc.setDrawColor(...colors.accent);
        doc.setLineWidth(0.5);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(10, yPosition, pageWidth - 20, summaryHeight, 3, 3, 'FD');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.accent);
        doc.text('FINANCIAL SUMMARY', 15, yPosition + 8);
        
        doc.setLineWidth(0.2);
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition + 11, pageWidth - 25, yPosition + 11);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Summary items in grid
        const summaryItems = Object.entries(financialSummary.totals).slice(0, 6);
        const colWidth = (pageWidth - 30) / Math.min(summaryItems.length, 3);
        const rowHeight = 8;
        
        summaryItems.forEach(([colKey, total], index) => {
          const col = headers.find(h => h.dataIndex === colKey);
          if (!col) return;
          
          const row = Math.floor(index / 3);
          const colPos = index % 3;
          const xPos = 15 + (colPos * colWidth);
          const yPos = yPosition + 16 + (row * rowHeight);
          
          doc.setTextColor(100, 100, 100);
          doc.text(col.title, xPos, yPos);
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          doc.text(formatCurrency(total), xPos, yPos + 4);
        });
        
        yPosition += summaryHeight + 10;
      }

      // =========== VALIDATION STATUS ===========
      if (validationErrors.length > 0) {
        const validationHeight = 15;
        
        doc.setFillColor(255, 243, 205);
        doc.setDrawColor(255, 193, 7);
        doc.setLineWidth(0.5);
        doc.roundedRect(10, yPosition, pageWidth - 20, validationHeight, 2, 2, 'FD');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(102, 77, 3);
        doc.text('⚠ DATA VALIDATION NOTES', 15, yPosition + 7);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(102, 77, 3);
        doc.text(`${validationErrors.length} validation issues found. See detailed report for more information.`, 
          30, yPosition + 12);
        
        yPosition += validationHeight + 10;
      }

      setExportStep(3);

      // =========== MAIN TABLE WITH OPTIMIZED WIDTHS ===========
      const tableHeaders = headers.map(header => header.title);
      
      // Prepare table data with formatting
      const tableData = data.map((record, rowIndex) => 
        headers.map((header, colIndex) => {
          let value = record[header.title];
          
          // Apply overflow strategy
          if (value && value.length > 100) {
            switch (tableSettings.overflowStrategy) {
              case 'truncate':
                value = value.substring(0, 97) + '...';
                break;
              case 'ellipsis':
                value = value.substring(0, 50) + '...';
                break;
            }
          }
          
          return value || '';
        })
      );

      // Add totals row
      if (hasTotals && reportSettings.showTotals) {
        const totalsRow = headers.map(header => {
          const total = columnTotals[header.dataIndex];
          if (total !== undefined && ['currency', 'number', 'amount'].includes(header.type)) {
            return formatCurrency(total);
          }
          return header.dataIndex === headers[0].dataIndex ? 'TOTAL' : '';
        });
        tableData.push(totalsRow);
      }

      // Calculate column widths
      const columnWidthsArray = headers.map(header => 
        optimizedColumnWidths[header.dataIndex] || tableSettings.defaultColumnWidth
      );
      
      const totalWidth = columnWidthsArray.reduce((sum, w) => sum + w, 0);
      const availableWidth = pageWidth - 20;
      
      let adjustedColumnWidths = columnWidthsArray;
      if (totalWidth > availableWidth) {
        const scaleFactor = availableWidth / totalWidth;
        adjustedColumnWidths = columnWidthsArray.map(w => 
          Math.max(tableSettings.minColumnWidth, Math.round(w * scaleFactor))
        );
      }

      setExportStep(4);

      // Configure autoTable
      const autoTableConfig = {
        head: [tableHeaders],
        body: tableData,
        startY: yPosition,
        margin: { top: 10, left: 10, right: 10 },
        tableWidth: 'auto',
        styles: { 
          fontSize: reportSettings.fontSize,
          cellPadding: reportSettings.cellPadding,
          lineWidth: reportSettings.showGridLines ? 0.1 : 0,
          lineColor: reportSettings.showGridLines ? [200, 200, 200] : [255, 255, 255],
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: { 
          fillColor: colors.secondary,
          textColor: [255, 255, 255],
          fontStyle: reportSettings.headerStyle,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.2,
          lineColor: colors.primary
        },
        bodyStyles: {
          lineWidth: reportSettings.showGridLines ? 0.1 : 0,
          lineColor: reportSettings.showGridLines ? [200, 200, 200] : [255, 255, 255]
        },
        alternateRowStyles: reportSettings.alternateRowColors ? {
          fillColor: [248, 248, 248]
        } : undefined,
        columnStyles: {},
        didParseCell: function(data) {
          // Right align numeric columns
          if (data.column.index > 0 && headers[data.column.index].type === 'number') {
            data.cell.styles.halign = 'right';
          }
          // Center boolean columns
          if (headers[data.column.index].type === 'boolean') {
            data.cell.styles.halign = 'center';
          }
        },
        willDrawCell: function(data) {
          // Highlight totals row
          if (hasTotals && data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = colors.accent;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawPage: function(data) {
          // Page number
          if (reportSettings.includePageNumbers) {
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(
              `Page ${data.pageNumber} of ${data.pageCount}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          }
        }
      };

      // Apply column widths
      adjustedColumnWidths.forEach((width, index) => {
        autoTableConfig.columnStyles[index] = { cellWidth: width };
      });

      autoTable(doc, autoTableConfig);

      setExportStep(5);

      // =========== FOOTER WITH AUDIT INFO ===========
      if (reportSettings.includeFooter) {
        const footerY = pageHeight - 20;
        
        // Footer separator
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.line(10, footerY, pageWidth - 10, footerY);
        
        // Footer content
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        const leftFooter = footerText || `${companyName} • ${currentTheme.name}`;
        doc.text(leftFooter, 10, footerY + 4);
        
        const rightFooter = [
          reportSettings.includeGeneratedBy ? `Generated by: ${userName}` : '',
          reportSettings.includeTimestamp ? `Time: ${new Date().toLocaleTimeString('en-KE')}` : '',
          `Records: ${data.length}`,
          reportApproval.approved ? `Approved by: ${reportApproval.approvedBy}` : ''
        ].filter(Boolean).join(' | ');
        
        doc.text(rightFooter, pageWidth - 10, footerY + 4, { align: 'right' });
        
        // QR Code for report verification
        if (reportSettings.includeQRCode) {
          const qrSize = 15;
          const qrText = JSON.stringify({
            reportId: generateReportId(),
            title: title,
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
            checksum: generateChecksum(data)
          });
          
          // Generate QR code (would need qrcode library)
          // doc.addQRCode(qrText, pageWidth - 25, footerY - 20, qrSize, qrSize);
        }
      }

      // =========== SECURITY & APPROVAL PAGE ===========
      if (reportType === 'finance' || reportType === 'audit') {
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text('REPORT CERTIFICATION & SECURITY', pageWidth / 2, 30, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        const certificationText = [
          'This report has been generated by the Lynx Advanced Reporting System.',
          'All data has been validated and processed according to company policies.',
          '',
          `Report ID: ${generateReportId()}`,
          `Generation Date: ${new Date().toLocaleString('en-KE')}`,
          `Generated By: ${userName} (${userRole})`,
          `User ID: ${userId}`,
          `Station: ${stationInfo.name} (${stationInfo.code})`,
          '',
          'SECURITY CLASSIFICATION: ' + (securitySettings.hideSensitiveData ? 'RESTRICTED' : 'PUBLIC'),
          'DATA SENSITIVITY: ' + dataSensitivity.toUpperCase(),
          '',
          reportApproval.approved 
            ? `APPROVED BY: ${reportApproval.approvedBy} on ${new Date(reportApproval.approvedAt).toLocaleDateString('en-KE')}`
            : 'PENDING APPROVAL',
          reportApproval.approvalNotes ? `Approval Notes: ${reportApproval.approvalNotes}` : ''
        ];
        
        certificationText.forEach((text, index) => {
          doc.text(text, 20, 50 + (index * 7));
        });
        
        // Signature line
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 80, 180, pageWidth - 20, 180);
        doc.text('Authorized Signature', pageWidth - 70, 185);
        
        // Timestamp
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Document Hash: ${generateDocumentHash(doc)}`, 20, pageHeight - 20);
      }

      // =========== SAVE PDF ===========
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const finalFileName = `${safeFileName}_${reportType}_${dateStr}_${generateReportId()}.pdf`;
      
      // Add password protection if enabled
      if (securitySettings.passwordProtected && securitySettings.password) {
        // jsPDF password protection (depends on version)
        // doc.setPassword(securitySettings.password);
      }
      
      doc.save(finalFileName);
      
      addAuditEntry('PDF Export Completed', `Generated ${finalFileName} with ${data.length} records`);
      message.success(`${currentTheme.name} generated successfully!`);
      
      setExportStep(0);

    } catch (error) {
      console.error('PDF generation error:', error);
      addAuditEntry('PDF Export Failed', error.message);
      message.error(`Failed to generate PDF: ${error.message}`);
      setExportStep(0);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ========== EXCEL GENERATION ==========
  const generateExcel = async () => {
    if (filteredData.length === 0) {
      message.warning('No data available to generate Excel');
      return;
    }

    if (reportApproval.requiresApproval && !reportApproval.approved) {
      message.error('Report requires approval before export');
      return;
    }

    setIsGeneratingExcel(true);
    setExportStep(1);

    try {
      const { headers, data } = getExportData();
      const columnTotals = calculateColumnTotals();
      const financialSummary = calculateFinancialSummary();

      if (onReportGenerate) {
        onReportGenerate('excel');
      }

      setExportStep(2);

      const wb = XLSX.utils.book_new();
      
      // =========== MAIN DATA SHEET ===========
      const excelHeaders = headers.map(header => header.title);
      const excelData = [excelHeaders];
      
      data.forEach((record, rowIndex) => {
        const row = headers.map(header => {
          let value = record[header.title];
          const colType = COLUMN_TYPES[header.type] || COLUMN_TYPES.text;
          
          if (colType.excelType === 'n') {
            const num = Number(value);
            return isNaN(num) ? 0 : num;
          } else if (colType.excelType === 'd') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date;
          }
          return value;
        });
        excelData.push(row);
        
        // Update progress
        if (rowIndex % 50 === 0) {
          setExportProgress(Math.round((rowIndex / data.length) * 100));
        }
      });

      // Add totals row
      if (Object.keys(columnTotals).length > 0) {
        const totalsRow = headers.map(header => {
          const total = columnTotals[header.dataIndex];
          if (total !== undefined && ['currency', 'number', 'amount'].includes(header.type)) {
            return total;
          }
          return '';
        });
        totalsRow[0] = 'GRAND TOTAL';
        excelData.push(totalsRow);
      }

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Apply column widths
      const colWidths = headers.map((header, index) => {
        const width = optimizedColumnWidths[header.dataIndex] || tableSettings.defaultColumnWidth;
        return { wch: Math.min(width / 5, 50) };
      });
      ws['!cols'] = colWidths;

      // Style header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
          fill: { 
            fgColor: { 
              rgb: colors.primary.slice(0, 3)
                .map(c => c.toString(16).padStart(2, '0'))
                .join('').toUpperCase() 
            } 
          },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "FFFFFF" } },
            bottom: { style: "thin", color: { rgb: "FFFFFF" } },
            left: { style: "thin", color: { rgb: "FFFFFF" } },
            right: { style: "thin", color: { rgb: "FFFFFF" } }
          }
        };
      }

      // Style numeric columns
      headers.forEach((header, colIndex) => {
        if (['currency', 'number', 'amount', 'balance', 'percentage'].includes(header.type)) {
          for (let R = 1; R < excelData.length; R++) {
            const address = XLSX.utils.encode_cell({ r: R, c: colIndex });
            if (ws[address] && ws[address].v !== '') {
              ws[address].s = {
                ...ws[address].s,
                numFmt: COLUMN_TYPES[header.type]?.style?.numFmt || '#,##0.00',
                alignment: { horizontal: "right" }
              };
            }
          }
        }
      });

      // Style totals row
      if (Object.keys(columnTotals).length > 0) {
        const lastRow = excelData.length - 1;
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: lastRow, c: C });
          if (!ws[address]) continue;
          ws[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { 
              fgColor: { 
                rgb: colors.accent.slice(0, 3)
                  .map(c => c.toString(16).padStart(2, '0'))
                  .join('').toUpperCase() 
              } 
            },
            numFmt: COLUMN_TYPES.currency.style.numFmt
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, `${currentTheme.name} Data`);

      setExportStep(3);

      // =========== METADATA SHEET ===========
      const metadata = [
        ['REPORT METADATA', ''],
        ['Report Title', title],
        ['Report Type', currentTheme.name],
        ['Report ID', generateReportId()],
        ['Company', companyName],
        ['Station', stationInfo.name],
        ['Station Code', stationInfo.code],
        ['Station Manager', stationInfo.manager],
        ['Generated By', userName],
        ['User Role', userRole],
        ['User ID', userId],
        ['Generation Date', new Date().toLocaleString('en-KE')],
        ['Data Source', 'Lynx Advanced Reporting System'],
        ['Total Records', data.length],
        ['Validation Errors', validationErrors.length],
        ['Approval Status', reportApproval.approved ? `Approved by ${reportApproval.approvedBy}` : 'Pending'],
        ['Security Level', dataSensitivity.toUpperCase()],
        ['', ''],
        ['DATA SUMMARY', ''],
        ['Total Columns', headers.length],
        ['Total Rows', data.length],
        ['Generated File', `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`],
        ['Checksum', generateChecksum(data)],
        ['', '']
      ];

      // Add financial summary if available
      if (financialSummary && financialSummary.totals) {
        metadata.push(['FINANCIAL TOTALS', '']);
        Object.entries(financialSummary.totals).forEach(([colKey, total]) => {
          const col = headers.find(h => h.dataIndex === colKey);
          if (col) {
            metadata.push([col.title, total]);
          }
        });
        metadata.push(['', '']);
      }

      // Add validation errors summary
      if (validationErrors.length > 0) {
        metadata.push(['VALIDATION ISSUES', '']);
        metadata.push(['Total Issues', validationErrors.length]);
        const errorTypes = {};
        validationErrors.forEach(error => {
          errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
        });
        Object.entries(errorTypes).forEach(([type, count]) => {
          metadata.push([`${type} errors`, count]);
        });
        metadata.push(['', '']);
      }

      const metadataWs = XLSX.utils.aoa_to_sheet(metadata);
      
      // Style metadata
      const metaHeaderRange = XLSX.utils.decode_range(metadataWs['!ref']);
      for (let R = 0; R <= 1; R++) {
        for (let C = 0; C <= 1; C++) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (metadataWs[address]) {
            metadataWs[address].s = {
              font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
              fill: { fgColor: { rgb: "2E7D32" } }
            };
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, metadataWs, 'Report Info');

      setExportStep(4);

      // =========== VALIDATION SHEET ===========
      if (validationErrors.length > 0) {
        const validationHeaders = ['Row', 'Column', 'Value', 'Issue Type', 'Message'];
        const validationData = [validationHeaders];
        
        validationErrors.forEach(error => {
          validationData.push([
            error.row,
            error.column,
            error.value,
            error.type,
            error.message
          ]);
        });
        
        const validationWs = XLSX.utils.aoa_to_sheet(validationData);
        
        // Style validation sheet
        for (let C = 0; C < validationHeaders.length; C++) {
          const address = XLSX.utils.encode_cell({ r: 0, c: C });
          if (validationWs[address]) {
            validationWs[address].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "D32F2F" } }
            };
          }
        }
        
        XLSX.utils.book_append_sheet(wb, validationWs, 'Validation Issues');
      }

      // =========== AUDIT TRAIL SHEET ===========
      const auditHeaders = ['Timestamp', 'Action', 'User', 'Details', 'IP Address'];
      const auditData = [auditHeaders];
      
      auditLog.slice(0, 100).forEach(entry => {
        auditData.push([
          new Date(entry.timestamp).toLocaleString('en-KE'),
          entry.action,
          entry.user,
          entry.details,
          entry.ipAddress
        ]);
      });
      
      const auditWs = XLSX.utils.aoa_to_sheet(auditData);
      
      // Style audit sheet
      for (let C = 0; C < auditHeaders.length; C++) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (auditWs[address]) {
          auditWs[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "607D8B" } }
          };
        }
      }
      
      XLSX.utils.book_append_sheet(wb, auditWs, 'Audit Trail');

      setExportStep(5);

      // =========== SAVE EXCEL ===========
      const excelFileName = `${fileName}_${reportType}_${new Date().toISOString().split('T')[0]}_${generateReportId()}.xlsx`;
      XLSX.writeFile(wb, excelFileName);
      
      addAuditEntry('Excel Export Completed', `Generated ${excelFileName}`);
      message.success(`${currentTheme.name} Excel report generated successfully!`);
      
      setExportStep(0);
      setExportProgress(0);

    } catch (error) {
      console.error('Excel generation error:', error);
      addAuditEntry('Excel Export Failed', error.message);
      message.error('Failed to generate Excel report');
      setExportStep(0);
      setExportProgress(0);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  const generateReportId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${reportType.substr(0, 3).toUpperCase()}_${timestamp}_${random}`.toUpperCase();
  };

  const generateChecksum = (data) => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const generateDocumentHash = (doc) => {
    // Generate a simple hash from document content
    const content = doc.internal.getCurrentPageInfo().text || '';
    return generateChecksum(content);
  };

  const formatDateRange = (range) => {
    if (!range || !range[0] || !range[1]) return 'All Time';
    return `${range[0].format('DD/MM/YYYY')} - ${range[1].format('DD/MM/YYYY')}`;
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(`reportSettings_${reportType}`, JSON.stringify(reportSettings));
      localStorage.setItem(`reportSecurity_${reportType}`, JSON.stringify(securitySettings));
      
      if (onSettingsSave) {
        onSettingsSave({ reportSettings, securitySettings });
      }
      
      addAuditEntry('Settings Saved', 'Report configuration updated');
      message.success('Report settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
    }
  };

  const resetSettings = () => {
    setReportSettings({
      pageOrientation: 'landscape',
      fontSize: 9,
      rowHeight: 6,
      cellPadding: 3,
      colorScheme: reportType,
      customColors: null,
      includeHeader: true,
      includeFooter: showFooter,
      includeSummary: !!summaryData,
      includeFinancialSummary: !!financialSummary,
      includePageNumbers: true,
      includeTimestamp: true,
      includeStationInfo: !!stationInfo,
      includeGeneratedBy: true,
      includeQRCode: false,
      includeWatermark: false,
      showGridLines: true,
      alternateRowColors: true,
      autoWrapText: true,
      headerStyle: 'bold',
      showTotals: true,
      showSubtotals: false,
      groupBy: null,
      sortBy: null,
      filterBy: null,
      dateRange: null,
      companyName: companyName,
      reportSubtitle: '',
      customHeader: '',
      includeTaxCalculations: reportType === 'finance',
      includeVAT: false,
      currency: 'KES',
      exchangeRate: 1,
      maskPersonalData: reportType === 'users',
      includeUserStatistics: false
    });
    
    message.success('Settings reset to defaults');
    addAuditEntry('Settings Reset', 'All settings restored to defaults');
  };

  const approveReport = () => {
    if (validationErrors.length > 0) {
      message.warning('Cannot approve report with validation errors');
      return;
    }

    const approvalData = {
      approved: true,
      approvedBy: userName,
      approvedAt: new Date().toISOString(),
      approvalNotes: 'Approved via Advanced Report Generator',
      approvedByRole: userRole
    };

    setReportApproval(prev => ({
      ...prev,
      ...approvalData
    }));

    addAuditEntry('Report Approved', `Approved by ${userName}`);
    
    if (onReportApprove) {
      onReportApprove(approvalData);
    }

    message.success('Report approved successfully!');
  };

  // ========== RENDER MODALS ==========
  const renderSettingsModal = () => (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Advanced Report Configuration</span>
          <Tag color="blue" icon={currentTheme.icon}>
            {currentTheme.name}
          </Tag>
        </Space>
      }
      open={settingsModalVisible}
      onCancel={() => setSettingsModalVisible(false)}
      width={1000}
      style={{ top: 20 }}
      footer={[
        <Button key="reset" onClick={resetSettings} danger>
          Reset All
        </Button>,
        <Button key="optimize" onClick={calculateOptimalColumnWidths}>
          Optimize Layout
        </Button>,
        <Button key="validate" onClick={validateData} loading={isValidatingData}>
          Validate Data
        </Button>,
        <Button key="cancel" onClick={() => setSettingsModalVisible(false)}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={saveSettings}>
          Save Settings
        </Button>
      ]}
    >
      <Tabs activeKey={activeSettingsTab} onChange={setActiveSettingsTab} type="card">
        <TabPane tab={<span><ColumnHeightOutlined /> Columns</span>} key="columns">
          <Card title="Column Management" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Select columns to include in the report"
                description="Drag to reorder, or use checkboxes to select/deselect"
                type="info"
                showIcon
              />
              
              <Row gutter={[16, 16]}>
                {columns.map((column, index) => (
                  <Col xs={24} sm={12} md={8} key={column.dataIndex || index}>
                    <Card 
                      size="small" 
                      hoverable
                      style={{
                        border: selectedColumns.includes(column.dataIndex) 
                          ? `2px solid rgb(${colors.primary.join(', ')})`
                          : '1px solid #f0f0f0'
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Checkbox
                          checked={selectedColumns.includes(column.dataIndex)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedColumns(prev => [...prev, column.dataIndex]);
                            } else {
                              setSelectedColumns(prev => prev.filter(col => col !== column.dataIndex));
                            }
                            if (onColumnChange) {
                              onColumnChange(column.dataIndex, e.target.checked);
                            }
                          }}
                        >
                          <Text strong>{column.title}</Text>
                        </Checkbox>
                        
                        <Space size="small">
                          <Tag size="small" color={COLUMN_TYPES[column.type] ? 'blue' : 'default'}>
                            {column.type || 'text'}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Width: 
                            <InputNumber
                              size="small"
                              value={columnWidths[column.dataIndex] || 'auto'}
                              onChange={(value) => setColumnWidths(prev => ({
                                ...prev,
                                [column.dataIndex]: value
                              }))}
                              style={{ width: 70, marginLeft: 4 }}
                              placeholder="auto"
                              min={10}
                              max={200}
                            />
                          </Text>
                        </Space>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab={<span><ColumnWidthOutlined /> Layout</span>} key="layout">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="Table Optimization">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Column Width Mode:</Text>
                    <Select
                      value={columnWidthMode}
                      onChange={setColumnWidthMode}
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      <Option value="auto">
                        <Space>
                          <CompressOutlined />
                          Auto (Smart Sizing)
                        </Space>
                      </Option>
                      <Option value="fixed">
                        <Space>
                          <ColumnWidthOutlined />
                          Fixed Widths
                        </Space>
                      </Option>
                      <Option value="custom">
                        <Space>
                          <SettingOutlined />
                          Custom Widths
                        </Space>
                      </Option>
                    </Select>
                  </div>
                  
                  <div>
                    <Text>Max Column Width: {tableSettings.maxColumnWidth}mm</Text>
                    <Slider
                      min={20}
                      max={150}
                      value={tableSettings.maxColumnWidth}
                      onChange={(value) => setTableSettings(prev => ({
                        ...prev,
                        maxColumnWidth: value
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Text>Min Column Width: {tableSettings.minColumnWidth}mm</Text>
                    <Slider
                      min={5}
                      max={50}
                      value={tableSettings.minColumnWidth}
                      onChange={(value) => setTableSettings(prev => ({
                        ...prev,
                        minColumnWidth: value
                      }))}
                    />
                  </div>
                  
                  <Switch
                    checked={tableSettings.compressMode}
                    onChange={(checked) => setTableSettings(prev => ({
                      ...prev,
                      compressMode: checked
                    }))}
                    checkedChildren="Auto Compress"
                    unCheckedChildren="No Compression"
                  />
                  
                  <div>
                    <Text>Overflow Strategy:</Text>
                    <Select
                      value={tableSettings.overflowStrategy}
                      onChange={(value) => setTableSettings(prev => ({
                        ...prev,
                        overflowStrategy: value
                      }))}
                      style={{ width: '100%' }}
                    >
                      <Option value="wrap">Wrap Text</Option>
                      <Option value="truncate">Truncate Long Text</Option>
                      <Option value="ellipsis">Show Ellipsis</Option>
                    </Select>
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card size="small" title="Page Settings">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>Page Orientation:</Text>
                    <Radio.Group
                      value={reportSettings.pageOrientation}
                      onChange={(e) => setReportSettings(prev => ({
                        ...prev,
                        pageOrientation: e.target.value
                      }))}
                    >
                      <Radio.Button value="portrait">Portrait</Radio.Button>
                      <Radio.Button value="landscape">Landscape</Radio.Button>
                    </Radio.Group>
                  </div>
                  
                  <div>
                    <Text>Font Size:</Text>
                    <InputNumber
                      value={reportSettings.fontSize}
                      onChange={(value) => setReportSettings(prev => ({
                        ...prev,
                        fontSize: value
                      }))}
                      min={6}
                      max={14}
                    />
                  </div>
                  
                  <div>
                    <Text>Row Height:</Text>
                    <InputNumber
                      value={reportSettings.rowHeight}
                      onChange={(value) => setReportSettings(prev => ({
                        ...prev,
                        rowHeight: value
                      }))}
                      min={4}
                      max={12}
                    />
                  </div>
                  
                  <Switch
                    checked={reportSettings.showGridLines}
                    onChange={(checked) => setReportSettings(prev => ({
                      ...prev,
                      showGridLines: checked
                    }))}
                    checkedChildren="Grid On"
                    unCheckedChildren="Grid Off"
                  />
                  
                  <Switch
                    checked={reportSettings.alternateRowColors}
                    onChange={(checked) => setReportSettings(prev => ({
                      ...prev,
                      alternateRowColors: checked
                    }))}
                    checkedChildren="Striped Rows"
                    unCheckedChildren="Plain Rows"
                  />
                </Space>
              </Card>
            </Col>
          </Row>
          
          {/* Column Width Visualization */}
          <Card size="small" title="Column Width Preview" style={{ marginTop: 16 }}>
            <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: 4 }}>
              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                Total Table Width: {Object.values(optimizedColumnWidths).reduce((a, b) => a + b, 0)}mm
                (Page: {reportSettings.pageOrientation === 'landscape' ? '290mm' : '200mm'})
              </Text>
              
              {getVisibleColumns().map((col, index) => {
                const width = optimizedColumnWidths[col.dataIndex] || tableSettings.defaultColumnWidth;
                const percentage = (width / (reportSettings.pageOrientation === 'landscape' ? 290 : 200)) * 100;
                
                return (
                  <div key={col.dataIndex} style={{ marginBottom: 8 }}>
                    <Space>
                      <Text style={{ width: 150 }} ellipsis>
                        {index + 1}. {col.title}
                      </Text>
                      <Progress
                        percent={Math.min(percentage, 100)}
                        size="small"
                        strokeColor={
                          percentage > 90 ? '#ff4d4f' :
                          percentage > 70 ? '#faad14' : '#52c41a'
                        }
                        style={{ width: 200 }}
                        showInfo={false}
                      />
                      <Text type="secondary" style={{ width: 60 }}>
                        {width}mm
                      </Text>
                      <Tag color={col.type === 'number' ? 'blue' : col.type === 'currency' ? 'green' : 'default'}>
                        {col.type || 'text'}
                      </Tag>
                    </Space>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabPane>

        <TabPane tab={<span><TaobaoCircleOutlined /> Design</span>} key="design">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="Theme & Colors">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select
                    value={reportSettings.colorScheme}
                    onChange={(value) => setReportSettings(prev => ({
                      ...prev,
                      colorScheme: value,
                      customColors: null
                    }))}
                    style={{ width: '100%' }}
                  >
                    {Object.entries(REPORT_THEMES).map(([key, theme]) => (
                      <Option key={key} value={key}>
                        <Space>
                          {theme.icon}
                          {theme.name}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                  
                  <div>
                    <Text strong>Primary Color:</Text>
                    <ColorPicker
                      value={`rgb(${colors.primary.join(', ')})`}
                      onChange={(color) => {
                        const rgb = color.toRgb();
                        setReportSettings(prev => ({
                          ...prev,
                          customColors: {
                            ...colors,
                            primary: [rgb.r, rgb.g, rgb.b]
                          }
                        }));
                      }}
                    />
                  </div>
                  
                  <div>
                    <Text strong>Secondary Color:</Text>
                    <ColorPicker
                      value={`rgb(${colors.secondary.join(', ')})`}
                      onChange={(color) => {
                        const rgb = color.toRgb();
                        setReportSettings(prev => ({
                          ...prev,
                          customColors: {
                            ...colors,
                            secondary: [rgb.r, rgb.g, rgb.b]
                          }
                        }));
                      }}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card size="small" title="Header & Footer">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input
                    placeholder="Report Subtitle (optional)"
                    value={reportSettings.reportSubtitle}
                    onChange={(e) => setReportSettings(prev => ({
                      ...prev,
                      reportSubtitle: e.target.value
                    }))}
                  />
                  
                  <div>
                    <Text>Include in Report:</Text>
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <Checkbox
                          checked={reportSettings.includeHeader}
                          onChange={(e) => setReportSettings(prev => ({
                            ...prev,
                            includeHeader: e.target.checked
                          }))}
                        >
                          Header
                        </Checkbox>
                      </Col>
                      <Col span={12}>
                        <Checkbox
                          checked={reportSettings.includeFooter}
                          onChange={(e) => setReportSettings(prev => ({
                            ...prev,
                            includeFooter: e.target.checked
                          }))}
                        >
                          Footer
                        </Checkbox>
                      </Col>
                      <Col span={12}>
                        <Checkbox
                          checked={reportSettings.includePageNumbers}
                          onChange={(e) => setReportSettings(prev => ({
                            ...prev,
                            includePageNumbers: e.target.checked
                          }))}
                        >
                          Page Numbers
                        </Checkbox>
                      </Col>
                      <Col span={12}>
                        <Checkbox
                          checked={reportSettings.includeTimestamp}
                          onChange={(e) => setReportSettings(prev => ({
                            ...prev,
                            includeTimestamp: e.target.checked
                          }))}
                        >
                          Timestamp
                        </Checkbox>
                      </Col>
                      <Col span={12}>
                        <Checkbox
                          checked={reportSettings.includeGeneratedBy}
                          onChange={(e) => setReportSettings(prev => ({
                            ...prev,
                            includeGeneratedBy: e.target.checked
                          }))}
                        >
                          Generated By
                        </Checkbox>
                      </Col>
                      <Col span={12}>
                        <Checkbox
                          checked={reportSettings.includeQRCode}
                          onChange={(e) => setReportSettings(prev => ({
                            ...prev,
                            includeQRCode: e.target.checked
                          }))}
                        >
                          QR Code
                        </Checkbox>
                      </Col>
                    </Row>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><SecurityScanOutlined /> Security</span>} key="security">
          <Card size="small" title="Security & Privacy">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Security Settings"
                description="Configure data protection and access controls"
                type="info"
                showIcon
              />
              
              <Switch
                checked={securitySettings.hideSensitiveData}
                onChange={(checked) => setSecuritySettings(prev => ({
                  ...prev,
                  hideSensitiveData: checked
                }))}
                checkedChildren="Hide Sensitive Data"
                unCheckedChildren="Show All Data"
              />
              
              <Switch
                checked={securitySettings.passwordProtected}
                onChange={(checked) => setSecuritySettings(prev => ({
                  ...prev,
                  passwordProtected: checked
                }))}
                checkedChildren="Password Protected"
                unCheckedChildren="No Password"
              />
              
              {securitySettings.passwordProtected && (
                <Input.Password
                  placeholder="Set document password"
                  value={securitySettings.password}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                />
              )}
              
              <Input
                placeholder="Watermark Text"
                value={securitySettings.watermarkText}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  watermarkText: e.target.value
                }))}
                prefix={<FileProtectOutlined />}
              />
              
              <div>
                <Text>Encryption Level:</Text>
                <Select
                  value={securitySettings.encryptionLevel}
                  onChange={(value) => setSecuritySettings(prev => ({
                    ...prev,
                    encryptionLevel: value
                  }))}
                  style={{ width: '100%' }}
                >
                  <Option value="standard">Standard (AES-128)</Option>
                  <Option value="high">High (AES-256)</Option>
                  <Option value="maximum">Maximum (Military Grade)</Option>
                </Select>
              </div>
              
              <DatePicker
                placeholder="Set expiration date (optional)"
                value={securitySettings.expirationDate}
                onChange={(date) => setSecuritySettings(prev => ({
                  ...prev,
                  expirationDate: date
                }))}
                style={{ width: '100%' }}
              />
            </Space>
          </Card>
        </TabPane>

        <TabPane tab={<span><AuditOutlined /> Validation</span>} key="validation">
          <Card size="small" title="Data Validation">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Data Quality Check"
                description={`${validationErrors.length} validation issues found`}
                type={validationErrors.length > 0 ? "warning" : "success"}
                showIcon
                action={
                  <Button 
                    size="small" 
                    onClick={validateData}
                    loading={isValidatingData}
                  >
                    Re-validate
                  </Button>
                }
              />
              
              {validationErrors.length > 0 && (
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  <List
                    size="small"
                    dataSource={validationErrors.slice(0, 20)}
                    renderItem={(error, index) => (
                      <List.Item>
                        <Space>
                          <Tag color="red">{error.type}</Tag>
                          <Text>Row {error.row}: {error.column}</Text>
                          <Text type="secondary">{error.message}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                  {validationErrors.length > 20 && (
                    <Text type="secondary">
                      ... and {validationErrors.length - 20} more issues
                    </Text>
                  )}
                </div>
              )}
              
              <Divider />
              
              <div>
                <Text strong>Financial Report Validations:</Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Checkbox
                      checked={reportSettings.includeTaxCalculations}
                      onChange={(e) => setReportSettings(prev => ({
                        ...prev,
                        includeTaxCalculations: e.target.checked
                      }))}
                    >
                      Include Tax Calculations
                    </Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox
                      checked={reportSettings.includeVAT}
                      onChange={(e) => setReportSettings(prev => ({
                        ...prev,
                        includeVAT: e.target.checked
                      }))}
                    >
                      Include VAT (16%)
                    </Checkbox>
                  </Col>
                </Row>
              </div>
            </Space>
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );

  const renderPreviewModal = () => (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>Report Preview</span>
          <Tag color="green">Live Preview</Tag>
          {validationErrors.length > 0 && (
            <Tag color="red">{validationErrors.length} Issues</Tag>
          )}
        </Space>
      }
      open={previewModalVisible}
      onCancel={() => setPreviewModalVisible(false)}
      width="95%"
      style={{ top: 10 }}
      footer={[
        <Button key="close" onClick={() => setPreviewModalVisible(false)}>
          Close
        </Button>,
        <Button 
          key="optimize" 
          onClick={calculateOptimalColumnWidths}
          icon={<CompressOutlined />}
        >
          Optimize Layout
        </Button>,
        <Button 
          key="generate" 
          type="primary" 
          onClick={generatePDF}
          loading={isGeneratingPDF}
          disabled={reportApproval.requiresApproval && !reportApproval.approved}
        >
          <DownloadOutlined /> Generate PDF
        </Button>
      ]}
    >
      <div ref={reportRef}>
        {/* Header Preview */}
        {reportSettings.includeHeader && (
          <div style={{
            backgroundColor: `rgb(${colors.primary.join(', ')})`,
            color: 'white',
            padding: '20px',
            marginBottom: 20,
            borderRadius: 4,
            textAlign: 'center',
            position: 'relative'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              {companyName.toUpperCase()}
            </h2>
            <h3 style={{ margin: '5px 0 0 0', fontSize: '16px' }}>
              {title}
            </h3>
            {reportSettings.reportSubtitle && (
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                {reportSettings.reportSubtitle}
              </p>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 15,
              fontSize: '10px',
              opacity: 0.8
            }}>
              <div style={{ textAlign: 'left' }}>
                <div>Report ID: {generateReportId()}</div>
                <div>Type: {currentTheme.name}</div>
                <div>Generated By: {userName} ({userRole})</div>
                <div>Date: {new Date().toLocaleDateString('en-KE')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>Station: {stationInfo.name}</div>
                <div>Code: {stationInfo.code}</div>
                <div>Manager: {stationInfo.manager}</div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Alert */}
        {validationErrors.length > 0 && (
          <Alert
            message={`${validationErrors.length} Data Validation Issues Found`}
            description="Please review the validation tab for details"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Approval Status */}
        {reportApproval.requiresApproval && (
          <Alert
            message={reportApproval.approved ? "Report Approved" : "Approval Required"}
            description={
              reportApproval.approved 
                ? `Approved by ${reportApproval.approvedBy} on ${new Date(reportApproval.approvedAt).toLocaleDateString()}`
                : "This report requires approval before export"
            }
            type={reportApproval.approved ? "success" : "warning"}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Table Preview */}
        <div style={{ overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: 4 }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: `${reportSettings.fontSize}pt`,
            fontFamily: 'Arial, sans-serif'
          }}>
            <thead>
              <tr style={{
                backgroundColor: `rgb(${colors.secondary.join(', ')})`,
                color: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 1
              }}>
                {getVisibleColumns().map((col, index) => (
                  <th key={index} style={{
                    padding: '8px',
                    border: reportSettings.showGridLines ? '1px solid #ddd' : 'none',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    minWidth: `${optimizedColumnWidths[col.dataIndex] || 40}px`
                  }}>
                    {col.title}
                    {col.isSensitive && securitySettings.hideSensitiveData && (
                      <LockOutlined style={{ marginLeft: 4, fontSize: '10px' }} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 20).map((row, rowIndex) => (
                <tr key={rowIndex} style={{
                  backgroundColor: reportSettings.alternateRowColors && rowIndex % 2 === 0 
                    ? '#f9f9f9' 
                    : 'white'
                }}>
                  {getVisibleColumns().map((col, colIndex) => (
                    <td key={colIndex} style={{
                      padding: '6px',
                      border: reportSettings.showGridLines ? '1px solid #eee' : 'none',
                      whiteSpace: 'nowrap',
                      textAlign: col.type === 'number' ? 'right' : 'left'
                    }}>
                      {col.render 
                        ? col.render(row[col.dataIndex], row)
                        : col.isSensitive && securitySettings.hideSensitiveData
                          ? maskSensitiveData(row[col.dataIndex], col.type)
                          : row[col.dataIndex]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Preview */}
        {reportSettings.includeFooter && (
          <div style={{
            marginTop: 20,
            paddingTop: 10,
            borderTop: `2px solid rgb(${colors.primary.join(', ')})`,
            fontSize: '10px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <div>
              {footerText || `${companyName} • ${currentTheme.name} Report`}
            </div>
            <div>
              {reportSettings.includeGeneratedBy && `Generated by: ${userName} | `}
              {reportSettings.includeTimestamp && `Time: ${new Date().toLocaleTimeString('en-KE')} | `}
              Records: {filteredData.length}
            </div>
          </div>
        )}

        {filteredData.length > 20 && (
          <Alert
            message={`Preview shows first 20 of ${filteredData.length} records`}
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  );

  const renderSecurityModal = () => (
    <Modal
      title={
        <Space>
          <SecurityScanOutlined />
          <span>Security & Access Control</span>
        </Space>
      }
      open={securityModalVisible}
      onCancel={() => setSecurityModalVisible(false)}
      footer={[
        <Button key="cancel" onClick={() => setSecurityModalVisible(false)}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={() => {
          setSecurityModalVisible(false);
          saveSettings();
        }}>
          Save Security Settings
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="Data Protection"
          description="Configure how sensitive data is handled in reports"
          type="info"
          showIcon
        />
        
        <Card size="small" title="Sensitive Data Handling">
          <Switch
            checked={securitySettings.hideSensitiveData}
            onChange={(checked) => setSecuritySettings(prev => ({
              ...prev,
              hideSensitiveData: checked
            }))}
            checkedChildren="Mask Sensitive Data"
            unCheckedChildren="Show All Data"
          />
          
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              When enabled, sensitive data like emails, phone numbers, and account numbers will be masked in exports.
            </Text>
          </div>
        </Card>
        
        <Card size="small" title="Export Protection">
          <Switch
            checked={securitySettings.passwordProtected}
            onChange={(checked) => setSecuritySettings(prev => ({
              ...prev,
              passwordProtected: checked
            }))}
            checkedChildren="Password Protect PDFs"
            unCheckedChildren="No Password"
          />
          
          {securitySettings.passwordProtected && (
            <Input.Password
              placeholder="Enter password for PDF protection"
              value={securitySettings.password}
              onChange={(e) => setSecuritySettings(prev => ({
                ...prev,
                password: e.target.value
              }))}
              style={{ marginTop: 8 }}
            />
          )}
        </Card>
        
        <Card size="small" title="Watermark">
          <Input
            placeholder="Watermark text (e.g., CONFIDENTIAL)"
            value={securitySettings.watermarkText}
            onChange={(e) => setSecuritySettings(prev => ({
              ...prev,
              watermarkText: e.target.value
            }))}
            prefix={<FileProtectOutlined />}
          />
        </Card>
      </Space>
    </Modal>
  );

  const renderAuditModal = () => (
    <Modal
      title={
        <Space>
          <AuditOutlined />
          <span>Audit Trail</span>
          <Badge count={auditLog.length} />
        </Space>
      }
      open={auditModalVisible}
      onCancel={() => setAuditModalVisible(false)}
      width={800}
      footer={[
        <Button key="close" onClick={() => setAuditModalVisible(false)}>
          Close
        </Button>
      ]}
    >
      <Timeline mode="left">
        {auditLog.slice(0, 20).map(entry => (
          <Timeline.Item 
            key={entry.id}
            color={
              entry.action.includes('Failed') ? 'red' :
              entry.action.includes('Completed') ? 'green' :
              entry.action.includes('Approved') ? 'blue' : 'gray'
            }
          >
            <Space direction="vertical" size={0}>
              <Text strong>{entry.action}</Text>
              <Text type="secondary">{new Date(entry.timestamp).toLocaleString('en-KE')}</Text>
              <Text>{entry.details}</Text>
              <Text type="secondary">By: {entry.user}</Text>
            </Space>
          </Timeline.Item>
        ))}
      </Timeline>
      {auditLog.length > 20 && (
        <Alert
          message={`Showing last 20 of ${auditLog.length} audit entries`}
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );

  // ========== MAIN RENDER ==========
  const menuItems = [
    {
      key: 'excel',
      label: (
        <Space>
          <FileExcelOutlined />
          <span>Export as Excel</span>
        </Space>
      ),
      onClick: generateExcel,
      disabled: isGeneratingExcel || (reportApproval.requiresApproval && !reportApproval.approved)
    },
    {
      key: 'pdf',
      label: (
        <Space>
          <FilePdfOutlined />
          <span>Export as PDF</span>
          {isGeneratingPDF && <LoadingOutlined spin style={{ marginLeft: 8 }} />}
        </Space>
      ),
      onClick: generatePDF,
      disabled: isGeneratingPDF || (reportApproval.requiresApproval && !reportApproval.approved)
    },
    {
      key: 'preview',
      label: (
        <Space>
          <EyeOutlined />
          <span>Preview Report</span>
        </Space>
      ),
      onClick: () => setPreviewModalVisible(true)
    },
    {
      type: 'divider'
    },
    {
      key: 'settings',
      label: (
        <Space>
          <SettingOutlined />
          <span>Report Settings</span>
        </Space>
      ),
      onClick: () => setSettingsModalVisible(true),
      disabled: !enableCustomization
    },
    {
      key: 'security',
      label: (
        <Space>
          <SecurityScanOutlined />
          <span>Security Settings</span>
        </Space>
      ),
      onClick: () => setSecurityModalVisible(true)
    },
    {
      key: 'audit',
      label: (
        <Space>
          <AuditOutlined />
          <span>View Audit Trail</span>
          {auditLog.length > 0 && (
            <Badge count={auditLog.length} size="small" />
          )}
        </Space>
      ),
      onClick: () => setAuditModalVisible(true)
    },
    {
      type: 'divider'
    },
    {
      key: 'validate',
      label: (
        <Space>
          <CheckCircleOutlined />
          <span>Validate Data</span>
          {validationErrors.length > 0 && (
            <Badge count={validationErrors.length} size="small" status="error" />
          )}
        </Space>
      ),
      onClick: validateData,
      disabled: isValidatingData || filteredData.length === 0
    },
    reportApproval.requiresApproval && !reportApproval.approved ? {
      key: 'approve',
      label: (
        <Space>
          <SafetyCertificateOutlined />
          <span>Approve Report</span>
        </Space>
      ),
      onClick: approveReport,
      disabled: validationErrors.length > 0
    } : null
  ].filter(Boolean);

  return (
    <>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomLeft"
            trigger={['click']}
            disabled={filteredData.length === 0}
          >
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              loading={isGeneratingPDF || isGeneratingExcel}
              disabled={filteredData.length === 0}
              size="large"
            >
              <Space>
                <Badge 
                  count={currentTheme.name.charAt(0)} 
                  style={{ 
                    backgroundColor: `rgb(${colors.primary.join(', ')})`,
                    fontSize: '10px'
                  }}
                  size="small"
                />
                <Text strong>Generate Report</Text>
                {filteredData.length > 0 && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    ({filteredData.length} records)
                  </Text>
                )}
              </Space>
            </Button>
          </Dropdown>
          
          {/* Quick Actions */}
          <Tooltip title="Optimize table layout">
            <Button 
              icon={<CompressOutlined />}
              onClick={calculateOptimalColumnWidths}
              disabled={filteredData.length === 0}
            >
              Optimize
            </Button>
          </Tooltip>
          
          <Tooltip title="Data validation">
            <Button 
              icon={<CheckCircleOutlined />}
              onClick={validateData}
              loading={isValidatingData}
              disabled={filteredData.length === 0}
            >
              Validate
            </Button>
          </Tooltip>
          
          {reportApproval.requiresApproval && !reportApproval.approved && (
            <Popconfirm
              title="Approve Report"
              description="Are you sure you want to approve this report?"
              onConfirm={approveReport}
              okText="Yes, Approve"
              cancelText="Cancel"
              disabled={validationErrors.length > 0}
            >
              <Button 
                type="dashed"
                icon={<SafetyCertificateOutlined />}
                disabled={validationErrors.length > 0}
              >
                Approve
              </Button>
            </Popconfirm>
          )}
        </Space>
        
        {/* Status Indicators */}
        <Row gutter={[8, 8]}>
          <Col span={24}>
            <Space wrap>
              {filteredData.length > 0 && (
                <>
                  <Tag color="blue" icon={<DatabaseOutlined />}>
                    {filteredData.length} records
                  </Tag>
                  <Tag color="green" icon={<ColumnHeightOutlined />}>
                    {getVisibleColumns().length} columns
                  </Tag>
                  <Tag color={validationErrors.length > 0 ? "red" : "green"} icon={<CheckCircleOutlined />}>
                    {validationErrors.length} issues
                  </Tag>
                  <Tag color={reportApproval.approved ? "green" : "orange"} icon={<SafetyCertificateOutlined />}>
                    {reportApproval.approved ? "Approved" : "Pending Approval"}
                  </Tag>
                  <Tag color="purple" icon={<SecurityScanOutlined />}>
                    {securitySettings.hideSensitiveData ? "Data Masked" : "Full Data"}
                  </Tag>
                </>
              )}
            </Space>
          </Col>
        </Row>
        
        {/* Export Progress */}
        {(isGeneratingPDF || isGeneratingExcel) && exportStep > 0 && (
          <Card size="small" style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                {isGeneratingPDF ? 'Generating PDF...' : 'Generating Excel...'} 
                <Badge count={exportStep} style={{ marginLeft: 8 }} />
              </Text>
              <Progress 
                percent={exportProgress || (exportStep * 20)}
                status="active"
                strokeColor={colors.primary}
              />
              <Steps size="small" current={exportStep - 1}>
                <Step title="Preparing" />
                <Step title="Processing Data" />
                <Step title="Formatting" />
                <Step title="Applying Styles" />
                <Step title="Finalizing" />
              </Steps>
            </Space>
          </Card>
        )}
        
        {/* Data Validation Alert */}
        {validationErrors.length > 0 && (
          <Alert
            message={`${validationErrors.length} Data Validation Issues Found`}
            description={
              <Space direction="vertical" size={0}>
                <Text>Please review and fix data issues before exporting.</Text>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => setActiveSettingsTab('validation') && setSettingsModalVisible(true)}
                >
                  View Details
                </Button>
              </Space>
            }
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={validateData}>
                Re-check
              </Button>
            }
          />
        )}
        
        {/* Empty State */}
        {filteredData.length === 0 && (
          <Result
            icon={<FileExcelOutlined />}
            title="No Data Available"
            subTitle="There is no data to generate a report from."
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            }
          />
        )}
      </Space>
      
      {renderSettingsModal()}
      {renderPreviewModal()}
      {renderSecurityModal()}
      {renderAuditModal()}
    </>
  );
};

export default AdvancedReportGenerator;