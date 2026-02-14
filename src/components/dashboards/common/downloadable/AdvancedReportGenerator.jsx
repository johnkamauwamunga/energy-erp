// AdvancedReportGenerator.jsx - Complete Fixed Version
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
  Progress,
  Popconfirm,
  Result,
  Steps,
  List,
  Popover,
  Statistic,
  Descriptions
} from 'antd';
import { 
  DownloadOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  AuditOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  ShopOutlined,
  ShoppingOutlined,
  FileProtectOutlined,
  FileDoneOutlined,
  PrinterOutlined,
  ReloadOutlined,
  CompressOutlined,
  ExpandOutlined,
  SaveOutlined,
  CopyOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
  DesktopOutlined,
  MobileOutlined,
  TableOutlined,
  ColumnWidthOutlined,
  BorderOutlined,
  FullscreenOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Step } = Steps;

// ========== REPORT THEMES ==========
const REPORT_THEMES = {
  finance: {
    name: 'Financial Report',
    icon: <DollarOutlined />,
    colors: {
      primary: [30, 50, 92],      // Navy Blue
      secondary: [41, 128, 185],  // Professional Blue
      accent: [0, 150, 136],      // Teal
    }
  },
  users: {
    name: 'User Report',
    icon: <TeamOutlined />,
    colors: {
      primary: [103, 58, 183],    // Purple
      secondary: [156, 39, 176],  // Deep Purple
      accent: [255, 107, 0],      // Orange
    }
  },
  sales: {
    name: 'Sales Report',
    icon: <ShoppingOutlined />,
    colors: {
      primary: [0, 150, 136],     // Teal
      secondary: [0, 188, 212],   // Cyan
      accent: [255, 87, 34],      // Deep Orange
    }
  },
  inventory: {
    name: 'Inventory Report',
    icon: <DatabaseOutlined />,
    colors: {
      primary: [255, 107, 0],     // Orange
      secondary: [255, 145, 0],   // Amber
      accent: [33, 150, 243],     // Blue
    }
  },
  audit: {
    name: 'Audit Report',
    icon: <AuditOutlined />,
    colors: {
      primary: [121, 85, 72],     // Brown
      secondary: [93, 64, 55],    // Dark Brown
      accent: [141, 110, 99],     // Light Brown
    }
  },
  default: {
    name: 'Corporate Report',
    icon: <AppstoreOutlined />,
    colors: {
      primary: [41, 128, 185],    // Blue
      secondary: [44, 62, 80],    // Dark Blue
      accent: [52, 152, 219],     // Light Blue
    }
  }
};

// ========== COLUMN TYPES ==========
const COLUMN_TYPES = {
  text: {
    name: 'Text',
    format: (value) => String(value || ''),
    excelType: 's',
    minWidth: 30,
    avgChars: 15
  },
  number: {
    name: 'Number',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    excelType: 'n',
    style: { numFmt: '#,##0.00' },
    minWidth: 25,
    avgChars: 10
  },
  currency: {
    name: 'Currency',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    excelType: 'n',
    style: { numFmt: 'KSh #,##0.00' },
    minWidth: 35,
    avgChars: 15
  },
  percentage: {
    name: 'Percentage',
    format: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num / 100;
    },
    excelType: 'n',
    style: { numFmt: '0.00%' },
    minWidth: 25,
    avgChars: 8
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
    minWidth: 30,
    avgChars: 10
  },
  datetime: {
    name: 'Date Time',
    format: (value) => {
      if (!value) return '';
      const date = new Date(value);
      return isNaN(date.getTime()) ? '' : date.toLocaleString('en-KE');
    },
    excelType: 'd',
    style: { numFmt: 'dd/mm/yyyy hh:mm' },
    minWidth: 40,
    avgChars: 16
  },
  boolean: {
    name: 'Yes/No',
    format: (value) => value ? 'Yes' : 'No',
    excelType: 's',
    minWidth: 20,
    avgChars: 3
  },
  email: {
    name: 'Email',
    format: (value) => String(value || ''),
    excelType: 's',
    minWidth: 40,
    avgChars: 20,
    sensitive: true
  },
  phone: {
    name: 'Phone',
    format: (value) => String(value || ''),
    excelType: 's',
    minWidth: 30,
    avgChars: 12,
    sensitive: true
  },
  accountNumber: {
    name: 'Account No',
    format: (value) => {
      const str = String(value || '');
      return str.length > 4 ? `***${str.slice(-4)}` : str;
    },
    excelType: 's',
    minWidth: 30,
    avgChars: 10,
    sensitive: true
  }
};

// ========== MAIN COMPONENT ==========
const AdvancedReportGenerator = ({ 
  // Data
  dataSource = [],
  columns = [],
  
  // Report info
  title = 'Report',
  fileName = 'report',
  reportType = 'default',
  footerText,
  
  // Company/User info
  companyName: propCompanyName,
  stationInfo: propStationInfo,
  
  // Features
  requireApproval = false,
  enableAuditTrail = true,
  showGrandTotals = true,
  
  // Callbacks
  onReportGenerate,
  onReportApprove,
  onSettingsChange
}) => {
  // ========== CONTEXT ==========
  const { state } = useApp();
  
  // Company and user info
  const companyName = propCompanyName || state?.currentCompany?.name || "Lynx Systems Ltd";
  const currentUser = state?.currentUser;
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'System User';
  const userRole = currentUser?.role || 'User';
  const userId = currentUser?.id || 'N/A';
  
  const stationInfo = propStationInfo || {
    name: state?.currentStation?.name || 'Head Office',
    code: state?.currentStation?.code || 'HO001',
    location: state?.currentStation?.location || 'Nairobi, Kenya'
  };

  // ========== PDF ORIENTATION & COLUMN CALCULATION ==========
  const PDF_WIDTHS = {
    portrait: 210, // A4 width in mm
    landscape: 297 // A4 landscape width in mm
  };

  // ========== STATE ==========
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [auditLog, setAuditLog] = useState([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [orientationModalVisible, setOrientationModalVisible] = useState(false);
  
  // PDF specific state
  const [pdfOrientation, setPdfOrientation] = useState('landscape');
  const [columnWidths, setColumnWidths] = useState({});
  const [pdfSettings, setPdfSettings] = useState({
    fontSize: 8,
    headerFontSize: 10,
    cellPadding: 2,
    showBorders: true,
    alternateRowColors: true,
    includeFooter: true,
    includePageNumbers: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    passwordProtected: false,
    password: '',
    watermarkText: 'CONFIDENTIAL',
    hideSensitiveData: reportType === 'users' || reportType === 'finance'
  });

  // Report approval
  const [reportApproval, setReportApproval] = useState({
    approved: false,
    approvedBy: '',
    approvedAt: null,
    requiresApproval: requireApproval
  });

  const [exportStep, setExportStep] = useState(0);

  // ========== INITIALIZATION ==========
  useEffect(() => {
    initializeReport();
  }, [columns, dataSource]);

  const initializeReport = () => {
    // Initialize selected columns
    const initialColumns = columns
      .filter(col => col.dataIndex && col.title)
      .map(col => col.dataIndex);
    setSelectedColumns(initialColumns);
    
    // Set filtered data
    setFilteredData(dataSource);
    
    // Calculate optimal orientation based on columns
    const optimalOrientation = calculateOptimalOrientation(initialColumns.length);
    setPdfOrientation(optimalOrientation);
    
    // Calculate column widths
    const widths = calculateColumnWidths(initialColumns);
    setColumnWidths(widths);
    
    // Initialize audit log
    if (enableAuditTrail) {
      addAuditEntry('Report Initialized', `${dataSource.length} records loaded`);
    }
  };

  // Calculate optimal orientation based on column count
  const calculateOptimalOrientation = (columnCount) => {
    if (columnCount <= 5) {
      return 'portrait';
    } else {
      return 'landscape';
    }
  };

  // Calculate recommended column widths
  const calculateColumnWidths = useCallback((cols = selectedColumns) => {
    const visibleColumns = getVisibleColumns(cols);
    if (visibleColumns.length === 0) return {};
    
    const availableWidth = PDF_WIDTHS[pdfOrientation] - 40; // 20mm margins on each side
    
    const widths = {};
    const contentLengths = [];
    
    // Calculate content length for each column
    visibleColumns.forEach((col, index) => {
      let maxLength = col.title ? col.title.length : 0;
      
      // Sample data to find max content length
      dataSource.slice(0, 30).forEach(row => {
        const value = row[col.dataIndex];
        if (value) {
          const strValue = String(value);
          maxLength = Math.max(maxLength, strValue.length);
        }
      });
      
      // Add buffer based on column type
      const colType = COLUMN_TYPES[col.type] || COLUMN_TYPES.text;
      const buffer = colType.avgChars || 5;
      contentLengths[index] = maxLength + buffer;
    });

    // Calculate total content units
    const totalUnits = contentLengths.reduce((sum, len) => sum + len, 0);
    
    // Distribute width proportionally
    visibleColumns.forEach((col, index) => {
      const colType = COLUMN_TYPES[col.type] || COLUMN_TYPES.text;
      const proportion = contentLengths[index] / totalUnits;
      let width = proportion * availableWidth;
      
      // Apply min/max constraints
      const minWidth = colType.minWidth || 20;
      const maxWidth = 70; // Max 70mm per column
      
      width = Math.max(minWidth, Math.min(width, maxWidth));
      
      // If in landscape, we can be slightly more generous
      if (pdfOrientation === 'landscape') {
        width = Math.min(width * 1.1, maxWidth);
      }
      
      widths[col.dataIndex] = Math.round(width);
    });

    // If total width is less than available, distribute extra space to priority columns
    const totalWidth = Object.values(widths).reduce((sum, w) => sum + w, 0);
    if (totalWidth < availableWidth) {
      const extraSpace = availableWidth - totalWidth;
      const priorityColumns = visibleColumns.filter(col => 
        ['currency', 'amount', 'balance'].includes(col.type)
      );
      
      if (priorityColumns.length > 0) {
        const extraPerPriority = extraSpace / priorityColumns.length;
        priorityColumns.forEach(col => {
          widths[col.dataIndex] = Math.round(widths[col.dataIndex] + extraPerPriority);
        });
      } else {
        // Distribute evenly
        const extraPerColumn = extraSpace / visibleColumns.length;
        visibleColumns.forEach(col => {
          widths[col.dataIndex] = Math.round(widths[col.dataIndex] + extraPerColumn);
        });
      }
    }

    return widths;
  }, [selectedColumns, dataSource, pdfOrientation]);

  // Recalculate when columns or orientation changes
  useEffect(() => {
    if (selectedColumns.length > 0) {
      const widths = calculateColumnWidths();
      setColumnWidths(widths);
    }
  }, [selectedColumns, pdfOrientation]);

  const addAuditEntry = (action, details = '') => {
    const newEntry = {
      id: auditLog.length + 1,
      action,
      user: userName,
      userId: userId,
      timestamp: new Date().toISOString(),
      details
    };
    setAuditLog(prev => [newEntry, ...prev]);
    
    // Store in localStorage
    const history = JSON.parse(localStorage.getItem('reportAuditHistory') || '[]');
    history.unshift(newEntry);
    localStorage.setItem('reportAuditHistory', JSON.stringify(history.slice(0, 50)));
  };

  // ========== DATA PROCESSING ==========
  const getVisibleColumns = (cols = selectedColumns) => {
    return columns.filter(col => 
      cols.includes(col.dataIndex)
    ).map(col => ({
      ...col,
      type: col.type || 'text'
    }));
  };

  const getExportData = () => {
    const visibleColumns = getVisibleColumns();
    
    const headers = visibleColumns.map(col => ({
      key: col.dataIndex,
      title: typeof col.title === 'string' ? col.title : col.dataIndex,
      dataIndex: col.dataIndex,
      type: col.type,
      format: COLUMN_TYPES[col.type]?.format || COLUMN_TYPES.text.format
    }));

    const data = filteredData.map(record => 
      headers.reduce((acc, header) => {
        let value = record[header.dataIndex];
        
        // Apply masking for sensitive data
        if (securitySettings.hideSensitiveData && 
            COLUMN_TYPES[header.type]?.sensitive) {
          value = maskSensitiveData(value, header.type);
        }
        
        // Format value
        value = header.format ? header.format(value) : value;
        
        acc[header.title] = value != null ? String(value) : '';
        return acc;
      }, {})
    );

    return { headers, data };
  };

  const maskSensitiveData = (value, type) => {
    const str = String(value || '');
    switch (type) {
      case 'email':
        const parts = str.split('@');
        if (parts.length === 2) {
          return `${parts[0].charAt(0)}***@${parts[1]}`;
        }
        return str;
      case 'phone':
        return str.length > 4 ? `${str.slice(0, 3)}****${str.slice(-2)}` : str;
      case 'accountNumber':
        return str.length > 4 ? `***${str.slice(-4)}` : str;
      default:
        return str;
    }
  };

  const calculateTotals = () => {
    if (!showGrandTotals) return {};
    
    const visibleColumns = getVisibleColumns();
    const totals = {};
    
    visibleColumns.forEach(col => {
      if (['number', 'currency', 'amount', 'balance'].includes(col.type)) {
        const total = filteredData.reduce((sum, record) => {
          return sum + (parseFloat(record[col.dataIndex]) || 0);
        }, 0);
        totals[col.dataIndex] = total;
      }
    });
    
    return totals;
  };

  // ========== PDF GENERATION ==========
  const generatePDF = async (orientation = pdfOrientation) => {
    if (filteredData.length === 0) {
      message.warning('No data to export');
      return;
    }

    if (reportApproval.requiresApproval && !reportApproval.approved) {
      message.error('Report requires approval before export');
      return;
    }

    setIsGeneratingPDF(true);
    setExportStep(1);
    addAuditEntry('PDF Export Started', `Generating ${title} with ${orientation} orientation`);

    try {
      if (onReportGenerate) {
        onReportGenerate('pdf');
      }

      // Create PDF document with selected orientation
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      const { headers, data } = getExportData();
      const visibleColumns = getVisibleColumns();
      const totals = calculateTotals();

      setExportStep(2);

      // =========== PREPARE COLUMN WIDTHS ===========
      const colWidths = [];
      visibleColumns.forEach((col, index) => {
        colWidths[index] = columnWidths[col.dataIndex] || 30;
      });

      // Adjust if total width exceeds content width
      const totalColWidth = colWidths.reduce((sum, w) => sum + w, 0);
      if (totalColWidth > contentWidth) {
        const scaleFactor = contentWidth / totalColWidth;
        colWidths.forEach((w, i) => {
          colWidths[i] = Math.max(20, Math.round(w * scaleFactor));
        });
      }

      setExportStep(3);

      // =========== PREPARE TABLE DATA ===========
      const tableHeaders = headers.map(h => h.title);
      const tableData = data.map(row => 
        headers.map(h => {
          let value = row[h.title] || '';
          if (value.length > 100) {
            value = value.substring(0, 97) + '...';
          }
          return value;
        })
      );

      // Add totals row if needed
      if (showGrandTotals && Object.keys(totals).length > 0) {
        const totalsRow = headers.map(header => {
          const total = totals[header.dataIndex];
          if (total !== undefined) {
            return new Intl.NumberFormat('en-KE', {
              style: 'currency',
              currency: 'KES',
              minimumFractionDigits: 2
            }).format(total);
          }
          return header.dataIndex === headers[0].dataIndex ? 'TOTAL' : '';
        });
        tableData.push(totalsRow);
      }

      // =========== HEADER SECTION ===========
      const currentTheme = REPORT_THEMES[reportType] || REPORT_THEMES.default;
      
      // Header background
      doc.setFillColor(...currentTheme.colors.primary);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(companyName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(title, pageWidth / 2, 22, { align: 'center' });
      
      // Metadata
      doc.setFontSize(8);
      doc.setTextColor(240, 240, 240);
      
      // Left metadata
      doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, margin, 32);
      doc.text(`By: ${userName} (${userRole})`, margin, 36);
      
      // Right metadata
      const rightText = `Station: ${stationInfo.name} | Columns: ${headers.length}`;
      doc.text(rightText, pageWidth - margin, 32, { align: 'right' });
      doc.text(`Report ID: ${generateReportId()}`, pageWidth - margin, 36, { align: 'right' });
      
      let startY = 48;

      // =========== ORIENTATION INFO ===========
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated in ${orientation} mode for ${headers.length} columns`, 
        margin, startY - 4);

      setExportStep(4);

      // =========== GENERATE TABLE ===========
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: startY,
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        columnStyles: colWidths.reduce((styles, width, index) => {
          styles[index] = { cellWidth: width };
          return styles;
        }, {}),
        styles: {
          fontSize: pdfSettings.fontSize,
          cellPadding: pdfSettings.cellPadding,
          lineWidth: pdfSettings.showBorders ? 0.1 : 0,
          lineColor: [200, 200, 200],
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: currentTheme.colors.secondary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: pdfSettings.headerFontSize,
          halign: 'center'
        },
        bodyStyles: {
          lineWidth: pdfSettings.showBorders ? 0.1 : 0
        },
        alternateRowStyles: pdfSettings.alternateRowColors ? {
          fillColor: [245, 245, 245]
        } : undefined,
        columnStyles: headers.reduce((styles, header, index) => {
          if (['number', 'currency', 'percentage'].includes(header.type)) {
            styles[index] = { halign: 'right' };
          }
          return styles;
        }, {}),
        didParseCell: (data) => {
          // Style totals row
          if (showGrandTotals && data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        didDrawPage: (data) => {
          // Page number
          if (pdfSettings.includePageNumbers) {
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(
              `Page ${data.pageNumber}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          }
        }
      });

      const finalY = doc.lastAutoTable.finalY || startY;

      setExportStep(5);

      // =========== FOOTER ===========
      if (pdfSettings.includeFooter) {
        const footerY = pageHeight - 15;
        
        doc.setDrawColor(...currentTheme.colors.primary);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        
        const leftFooter = footerText || `${companyName} • ${new Date().toLocaleDateString()}`;
        doc.text(leftFooter, margin, footerY);
        
        const recordCount = `Records: ${data.length}${showGrandTotals ? ' • With Totals' : ''}`;
        doc.text(recordCount, pageWidth - margin, footerY, { align: 'right' });
      }

      // =========== WATERMARK ===========
      if (securitySettings.watermarkText) {
        doc.setFontSize(40);
        doc.setTextColor(230, 230, 230);
        doc.setFont('helvetica', 'bold');
        doc.text(securitySettings.watermarkText, pageWidth / 2, pageHeight / 2, { 
          align: 'center',
          angle: 45 
        });
      }

      // =========== SAVE PDF ===========
      const dateStr = new Date().toISOString().split('T')[0];
      const columnCount = headers.length;
      const finalFileName = `${fileName}_${columnCount}cols_${orientation}_${dateStr}.pdf`;
      
      doc.save(finalFileName);
      
      addAuditEntry('PDF Export Completed', `${data.length} records, ${orientation} orientation`);
      message.success(`PDF generated successfully in ${orientation} mode!`);
      
      setExportStep(0);

    } catch (error) {
      console.error('PDF generation error:', error);
      addAuditEntry('PDF Export Failed', error.message);
      message.error('Failed to generate PDF: ' + error.message);
      setExportStep(0);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ========== EXCEL GENERATION ==========
  const generateExcel = async () => {
    if (filteredData.length === 0) {
      message.warning('No data to export');
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
      const totals = calculateTotals();

      setExportStep(2);

      const wb = XLSX.utils.book_new();
      
      // Main data sheet
      const excelHeaders = headers.map(h => h.title);
      const excelData = [excelHeaders];
      
      data.forEach(row => {
        excelData.push(headers.map(h => row[h.title] || ''));
      });

      // Add totals row
      if (showGrandTotals && Object.keys(totals).length > 0) {
        const totalsRow = headers.map(header => {
          const total = totals[header.dataIndex];
          if (total !== undefined) {
            return total;
          }
          return header.dataIndex === headers[0].dataIndex ? 'GRAND TOTAL' : '';
        });
        excelData.push(totalsRow);
      }

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Auto-size columns
      const colWidths = headers.map((header, index) => {
        let maxLen = header.title.length;
        data.slice(0, 100).forEach(row => {
          const value = row[header.title] || '';
          maxLen = Math.max(maxLen, String(value).length);
        });
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Data');

      setExportStep(3);

      // Metadata sheet
      const metadata = [
        ['REPORT METADATA', ''],
        ['Title', title],
        ['Generated By', userName],
        ['User Role', userRole],
        ['Date', new Date().toLocaleString('en-KE')],
        ['Company', companyName],
        ['Station', stationInfo.name],
        ['Station Code', stationInfo.code],
        ['Total Columns', headers.length],
        ['Total Records', data.length],
        ['Report Type', reportType],
        ['Grand Totals', showGrandTotals ? 'Yes' : 'No'],
        ['Security', securitySettings.hideSensitiveData ? 'Masked' : 'Full Data'],
        ['Report ID', generateReportId()]
      ];
      
      const metadataWs = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.book_append_sheet(wb, metadataWs, 'Info');

      setExportStep(4);

      // Audit sheet if enabled
      if (enableAuditTrail && auditLog.length > 0) {
        const auditHeaders = ['Timestamp', 'Action', 'User', 'Details'];
        const auditData = [auditHeaders];
        
        auditLog.slice(0, 50).forEach(entry => {
          auditData.push([
            new Date(entry.timestamp).toLocaleString('en-KE'),
            entry.action,
            entry.user,
            entry.details
          ]);
        });
        
        const auditWs = XLSX.utils.aoa_to_sheet(auditData);
        XLSX.utils.book_append_sheet(wb, auditWs, 'Audit Trail');
      }

      // Save file
      const dateStr = new Date().toISOString().split('T')[0];
      const excelFileName = `${fileName}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, excelFileName);
      
      addAuditEntry('Excel Export Completed', `${data.length} records`);
      message.success('Excel report generated successfully!');
      
      setExportStep(0);

    } catch (error) {
      console.error('Excel generation error:', error);
      message.error('Failed to generate Excel');
      setExportStep(0);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  const generateReportId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${reportType.substring(0, 3).toUpperCase()}_${timestamp}_${random}`.toUpperCase();
  };

  const approveReport = () => {
    setReportApproval({
      approved: true,
      approvedBy: userName,
      approvedAt: new Date().toISOString(),
      requiresApproval: true
    });
    addAuditEntry('Report Approved', `Approved by ${userName}`);
    if (onReportApprove) {
      onReportApprove({ approved: true, approvedBy: userName });
    }
    message.success('Report approved');
  };

  // ========== ORIENTATION MODAL ==========
  const renderOrientationModal = () => {
    const columnCount = selectedColumns.length;

    return (
      <Modal
        title={
          <Space>
            <FullscreenOutlined />
            <span>Choose PDF Orientation</span>
          </Space>
        }
        open={orientationModalVisible}
        onCancel={() => setOrientationModalVisible(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setOrientationModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="portrait" 
            icon={<DesktopOutlined />}
            onClick={() => {
              setPdfOrientation('portrait');
              setOrientationModalVisible(false);
              generatePDF('portrait');
            }}
            disabled={columnCount > 8}
          >
            Portrait
          </Button>,
          <Button 
            key="landscape" 
            type="primary"
            icon={<MobileOutlined />}
            onClick={() => {
              setPdfOrientation('landscape');
              setOrientationModalVisible(false);
              generatePDF('landscape');
            }}
          >
            Landscape
          </Button>
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message={`Your report has ${columnCount} columns`}
            type="info"
            showIcon
          />

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card 
                size="small" 
                title={
                  <Space>
                    <DesktopOutlined />
                    Portrait
                  </Space>
                }
                style={{
                  border: pdfOrientation === 'portrait' ? '2px solid #1890ff' : undefined
                }}
              >
                <Statistic 
                  title="Recommended for" 
                  value="≤ 5 columns" 
                  valueStyle={{ fontSize: '16px' }}
                />
                {columnCount <= 5 ? (
                  <Tag color="green" style={{ marginTop: 8 }}>Recommended</Tag>
                ) : columnCount <= 8 ? (
                  <Tag color="orange" style={{ marginTop: 8 }}>Tight fit</Tag>
                ) : (
                  <Tag color="red" style={{ marginTop: 8 }}>Not recommended</Tag>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                size="small" 
                title={
                  <Space>
                    <MobileOutlined />
                    Landscape
                  </Space>
                }
                style={{
                  border: pdfOrientation === 'landscape' ? '2px solid #1890ff' : undefined
                }}
              >
                <Statistic 
                  title="Recommended for" 
                  value="6-12 columns" 
                  valueStyle={{ fontSize: '16px' }}
                />
                {columnCount > 5 && columnCount <= 12 ? (
                  <Tag color="green" style={{ marginTop: 8 }}>Recommended</Tag>
                ) : columnCount <= 5 ? (
                  <Tag color="blue" style={{ marginTop: 8 }}>Optional</Tag>
                ) : (
                  <Tag color="orange" style={{ marginTop: 8 }}>Compact</Tag>
                )}
              </Card>
            </Col>
          </Row>

          {columnCount > 12 && (
            <Alert
              message="Many columns detected"
              description="Your report has many columns. Consider reducing the number of columns for better readability."
              type="warning"
              showIcon
            />
          )}

          <Card size="small" title="Preview">
            <div style={{ 
              display: 'flex', 
              gap: '20px',
              justifyContent: 'center',
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '85px', 
                  border: '2px solid #d9d9d9',
                  borderRadius: '4px',
                  marginBottom: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  backgroundColor: columnCount <= 5 ? '#e6f7ff' : 'white'
                }}>
                  {columnCount}c
                </div>
                <Text type="secondary">Portrait</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '85px', 
                  height: '60px', 
                  border: '2px solid #d9d9d9',
                  borderRadius: '4px',
                  marginBottom: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  backgroundColor: columnCount > 5 ? '#e6f7ff' : 'white'
                }}>
                  {columnCount}c
                </div>
                <Text type="secondary">Landscape</Text>
              </div>
            </div>
          </Card>

          <Divider />

          <div>
            <Text strong>PDF Settings:</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                <Select 
                  value={pdfSettings.fontSize}
                  onChange={(value) => setPdfSettings({...pdfSettings, fontSize: value})}
                  size="small"
                  style={{ width: 100 }}
                >
                  <Option value={7}>Small (7pt)</Option>
                  <Option value={8}>Normal (8pt)</Option>
                  <Option value={9}>Large (9pt)</Option>
                </Select>
                
                <Checkbox
                  checked={pdfSettings.showBorders}
                  onChange={(e) => setPdfSettings({...pdfSettings, showBorders: e.target.checked})}
                >
                  Borders
                </Checkbox>
                
                <Checkbox
                  checked={pdfSettings.alternateRowColors}
                  onChange={(e) => setPdfSettings({...pdfSettings, alternateRowColors: e.target.checked})}
                >
                  Striped
                </Checkbox>
              </Space>
            </div>
          </div>
        </Space>
      </Modal>
    );
  };

  // ========== PREVIEW MODAL ==========
  const renderPreviewModal = () => {
    const visibleColumns = getVisibleColumns();
    const columnCount = visibleColumns.length;

    return (
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Report Preview</span>
            <Tag color={columnCount > 5 ? 'orange' : 'green'}>
              {columnCount} Columns
            </Tag>
            <Tag color="blue">
              {filteredData.length} Records
            </Tag>
          </Space>
        }
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="excel" 
            icon={<FileExcelOutlined />}
            onClick={() => {
              setPreviewModalVisible(false);
              generateExcel();
            }}
          >
            Export Excel
          </Button>,
          <Button 
            key="pdf" 
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => {
              setPreviewModalVisible(false);
              setOrientationModalVisible(true);
            }}
          >
            Export PDF
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* Column count warning */}
          {columnCount > 10 && (
            <Alert
              message={`Wide table: ${columnCount} columns`}
              description="This report has many columns. It will be exported in landscape mode for better readability."
              type="info"
              showIcon
            />
          )}

          {/* Table preview with horizontal scroll */}
          <div style={{ 
            overflowX: 'auto', 
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  {visibleColumns.map((col, index) => (
                    <th key={index} style={{ 
                      padding: '8px', 
                      border: '1px solid #ddd',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#f5f5f5',
                      zIndex: 1,
                      whiteSpace: 'nowrap'
                    }}>
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 15).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {visibleColumns.map((col, colIndex) => {
                      const value = row[col.dataIndex];
                      const displayValue = value !== null && value !== undefined ? String(value) : '-';
                      
                      return (
                        <td key={colIndex} style={{ 
                          padding: '6px', 
                          border: '1px solid #eee',
                          textAlign: ['number', 'currency', 'percentage'].includes(col.type) ? 'right' : 'left',
                          whiteSpace: 'nowrap'
                        }}>
                          {displayValue.length > 50 ? displayValue.substring(0, 47) + '...' : displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length > 15 && (
            <Text type="secondary">
              Showing first 15 of {filteredData.length} records
            </Text>
          )}
        </Space>
      </Modal>
    );
  };

  // ========== SETTINGS MODAL ==========
  const renderSettingsModal = () => (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Report Settings</span>
        </Space>
      }
      open={settingsModalVisible}
      onCancel={() => setSettingsModalVisible(false)}
      width={700}
      footer={[
        <Button key="cancel" onClick={() => setSettingsModalVisible(false)}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={() => {
          setSettingsModalVisible(false);
          if (onSettingsChange) {
            onSettingsChange({ selectedColumns, pdfSettings, securitySettings });
          }
          message.success('Settings saved');
        }}>
          Save Settings
        </Button>
      ]}
    >
      <Tabs defaultActiveKey="columns">
        <TabPane tab="Columns" key="columns">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message={`Select columns to include (${selectedColumns.length} selected)`}
              description="Choose which columns appear in your report"
              type="info"
              showIcon
            />
            
            <div style={{ maxHeight: 400, overflow: 'auto', padding: '4px' }}>
              <Row gutter={[8, 8]}>
                {columns.map(column => (
                  <Col span={12} key={column.dataIndex}>
                    <Card size="small" style={{ marginBottom: 4 }}>
                      <Checkbox
                        checked={selectedColumns.includes(column.dataIndex)}
                        onChange={(e) => {
                          let newSelected;
                          if (e.target.checked) {
                            newSelected = [...selectedColumns, column.dataIndex];
                          } else {
                            newSelected = selectedColumns.filter(c => c !== column.dataIndex);
                          }
                          setSelectedColumns(newSelected);
                          
                          // Recalculate widths
                          const widths = calculateColumnWidths(newSelected);
                          setColumnWidths(widths);
                        }}
                      >
                        <Space>
                          <Text strong>{column.title}</Text>
                          {column.type && (
                            <Tag color="blue" size="small">
                              {column.type}
                            </Tag>
                          )}
                          {COLUMN_TYPES[column.type]?.sensitive && (
                            <LockOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                          )}
                        </Space>
                      </Checkbox>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Space>
        </TabPane>

        <TabPane tab="PDF Settings" key="pdf">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small" title="Typography">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Font Size:</Text>
                  <Select 
                    value={pdfSettings.fontSize}
                    onChange={(value) => setPdfSettings({...pdfSettings, fontSize: value})}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <Option value={7}>Small (7pt)</Option>
                    <Option value={8}>Normal (8pt)</Option>
                    <Option value={9}>Large (9pt)</Option>
                    <Option value={10}>Extra Large (10pt)</Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <Text>Header Size:</Text>
                  <Select 
                    value={pdfSettings.headerFontSize}
                    onChange={(value) => setPdfSettings({...pdfSettings, headerFontSize: value})}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <Option value={9}>Small (9pt)</Option>
                    <Option value={10}>Normal (10pt)</Option>
                    <Option value={11}>Large (11pt)</Option>
                    <Option value={12}>Extra Large (12pt)</Option>
                  </Select>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Table Style">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Checkbox
                  checked={pdfSettings.showBorders}
                  onChange={(e) => setPdfSettings({...pdfSettings, showBorders: e.target.checked})}
                >
                  Show table borders
                </Checkbox>

                <Checkbox
                  checked={pdfSettings.alternateRowColors}
                  onChange={(e) => setPdfSettings({...pdfSettings, alternateRowColors: e.target.checked})}
                >
                  Alternate row colors (striped)
                </Checkbox>

                <Checkbox
                  checked={pdfSettings.includeFooter}
                  onChange={(e) => setPdfSettings({...pdfSettings, includeFooter: e.target.checked})}
                >
                  Include footer
                </Checkbox>

                <Checkbox
                  checked={pdfSettings.includePageNumbers}
                  onChange={(e) => setPdfSettings({...pdfSettings, includePageNumbers: e.target.checked})}
                >
                  Include page numbers
                </Checkbox>
              </Space>
            </Card>

            <Card size="small" title="Grand Totals">
              <Switch
                checked={showGrandTotals}
                onChange={(checked) => {
                  // This would need to be handled by parent component
                  message.info('Grand totals setting can be configured when initializing the component');
                }}
                checkedChildren="Show Totals"
                unCheckedChildren="Hide Totals"
                disabled
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                Set showGrandTotals prop when using the component
              </Text>
            </Card>
          </Space>
        </TabPane>

        <TabPane tab="Security" key="security">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small" title="Data Protection">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Switch
                    checked={securitySettings.hideSensitiveData}
                    onChange={(checked) => setSecuritySettings({...securitySettings, hideSensitiveData: checked})}
                    checkedChildren="Masked"
                    unCheckedChildren="Visible"
                  />
                  <Text style={{ marginLeft: 8 }}>Mask sensitive data (emails, phones, account numbers)</Text>
                </div>

                <Divider />

                <div>
                  <Text>Watermark Text:</Text>
                  <Input
                    placeholder="Enter watermark text"
                    value={securitySettings.watermarkText}
                    onChange={(e) => setSecuritySettings({...securitySettings, watermarkText: e.target.value})}
                    prefix={<FileProtectOutlined />}
                    style={{ marginTop: 4 }}
                  />
                </div>

                <Alert
                  message="Watermarks appear diagonally across the PDF"
                  type="info"
                  showIcon
                />
              </Space>
            </Card>

            <Card size="small" title="Audit Trail">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic 
                  title="Total Audit Entries" 
                  value={auditLog.length} 
                  suffix="actions"
                />
                {auditLog.length > 0 && (
                  <Button 
                    size="small" 
                    icon={<HistoryOutlined />}
                    onClick={() => {
                      Modal.info({
                        title: 'Audit Trail',
                        width: 600,
                        content: (
                          <div style={{ maxHeight: 400, overflow: 'auto' }}>
                            <Timeline mode="left">
                              {auditLog.slice(0, 20).map(entry => (
                                <Timeline.Item key={entry.id}>
                                  <Text strong>{entry.action}</Text>
                                  <br />
                                  <Text type="secondary">{new Date(entry.timestamp).toLocaleString()}</Text>
                                  <br />
                                  <Text>{entry.details}</Text>
                                  <br />
                                  <Text type="secondary">By: {entry.user}</Text>
                                </Timeline.Item>
                              ))}
                            </Timeline>
                          </div>
                        )
                      });
                    }}
                  >
                    View Audit Trail
                  </Button>
                )}
              </Space>
            </Card>
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  );

  // ========== MAIN RENDER ==========
  const columnCount = selectedColumns.length;

  // Dropdown menu items - fixed to avoid button nesting
  const dropdownItems = [
    {
      key: 'pdf',
      label: 'Export as PDF',
      icon: <FilePdfOutlined />,
      onClick: () => setOrientationModalVisible(true)
    },
    {
      key: 'excel',
      label: 'Export as Excel',
      icon: <FileExcelOutlined />,
      onClick: generateExcel
    },
    {
      key: 'preview',
      label: 'Preview Report',
      icon: <EyeOutlined />,
      onClick: () => setPreviewModalVisible(true)
    },
    { type: 'divider' },
    {
      key: 'settings',
      label: 'Report Settings',
      icon: <SettingOutlined />,
      onClick: () => setSettingsModalVisible(true)
    },
    {
      key: 'audit',
      label: 'Audit Trail',
      icon: <HistoryOutlined />,
      onClick: () => {
        Modal.info({
          title: 'Audit Trail',
          width: 600,
          content: (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {auditLog.length > 0 ? (
                auditLog.slice(0, 20).map(entry => (
                  <div key={entry.id} style={{ marginBottom: 12, padding: 8, borderBottom: '1px solid #f0f0f0' }}>
                    <Text strong>{entry.action}</Text>
                    <br />
                    <Text type="secondary">{new Date(entry.timestamp).toLocaleString()}</Text>
                    <br />
                    <Text>{entry.details}</Text>
                    <br />
                    <Text type="secondary">By: {entry.user}</Text>
                  </div>
                ))
              ) : (
                <Text type="secondary">No audit entries yet</Text>
              )}
            </div>
          )
        });
      }
    }
  ];

  // Add approval item if needed
  if (reportApproval.requiresApproval && !reportApproval.approved) {
    dropdownItems.push(
      { type: 'divider' },
      {
        key: 'approve',
        label: 'Approve Report',
        icon: <SafetyCertificateOutlined />,
        onClick: approveReport
      }
    );
  }

  return (
    <>
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Main action buttons */}
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Dropdown 
              menu={{ items: dropdownItems }} 
              placement="bottomLeft"
              disabled={filteredData.length === 0}
            >
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                loading={isGeneratingPDF || isGeneratingExcel}
                size="large"
              >
                <Space>
                  <span>Generate Report</span>
                  {filteredData.length > 0 && (
                    <Badge count={columnCount} style={{ backgroundColor: '#52c41a' }} />
                  )}
                </Space>
              </Button>
            </Dropdown>
          </Col>

          {/* Quick orientation toggle - separate button, not in dropdown */}
          {filteredData.length > 0 && (
            <Col>
              <Tooltip title="Choose PDF orientation">
                <Button 
                  icon={<FullscreenOutlined />}
                  onClick={() => setOrientationModalVisible(true)}
                >
                  {pdfOrientation === 'landscape' ? 'Landscape' : 'Portrait'}
                </Button>
              </Tooltip>
            </Col>
          )}

          {/* Approval status */}
          {reportApproval.requiresApproval && (
            <Col>
              <Tag color={reportApproval.approved ? 'green' : 'orange'}>
                {reportApproval.approved ? `Approved by ${reportApproval.approvedBy}` : 'Pending Approval'}
              </Tag>
            </Col>
          )}
        </Row>

        {/* Column info */}
        {filteredData.length > 0 && (
          <Row gutter={[8, 8]}>
            <Col>
              <Space wrap>
                <Tag icon={<TableOutlined />} color="blue">
                  {columnCount} Columns
                </Tag>
                <Tag icon={<DatabaseOutlined />} color="green">
                  {filteredData.length} Records
                </Tag>
                {columnCount > 5 && (
                  <Tag icon={<WarningOutlined />} color="orange">
                    Landscape Recommended
                  </Tag>
                )}
                {securitySettings.hideSensitiveData && (
                  <Tag icon={<LockOutlined />} color="purple">
                    Data Masked
                  </Tag>
                )}
                {showGrandTotals && (
                  <Tag icon={<DollarOutlined />} color="gold">
                    With Totals
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
        )}

        {/* Export progress */}
        {(isGeneratingPDF || isGeneratingExcel) && (
          <Card size="small" style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                {isGeneratingPDF ? 'Generating PDF...' : 'Generating Excel...'}
              </Text>
              <Progress percent={exportStep * 25} status="active" />
              <Steps size="small" current={exportStep - 1}>
                <Step title="Prepare" />
                <Step title="Process" />
                <Step title="Format" />
                <Step title="Save" />
              </Steps>
            </Space>
          </Card>
        )}

        {/* No data state */}
        {filteredData.length === 0 && (
          <Result
            icon={<FileTextOutlined />}
            title="No Data Available"
            subTitle="There is no data to generate a report"
          />
        )}
      </Space>

      {/* Modals */}
      {renderOrientationModal()}
      {renderPreviewModal()}
      {renderSettingsModal()}
    </>
  );
};

export default AdvancedReportGenerator;