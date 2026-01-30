// AdvancedReportGenerator.jsx - Fixed with proper company/user info
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Progress
} from 'antd';
import { 
  DownloadOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined,
  SettingOutlined,
  TaobaoCircleOutlined,
  DropboxOutlined,
  ShopOutlined,
  FileTextOutlined,
  PrinterOutlined,
  SaveOutlined,
  EyeOutlined,
  ReloadOutlined,
  ColumnHeightOutlined,
  FontSizeOutlined,
  BorderOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  LineChartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Default color schemes for different report types
const REPORT_THEMES = {
  finance: {
    name: 'Finance',
    icon: <DollarOutlined />,
    colors: {
      primary: [30, 50, 92],      // Navy Blue
      secondary: [41, 128, 185],  // Professional Blue
      accent: [0, 150, 136],      // Teal
      success: [46, 204, 113],    // Green
      warning: [255, 152, 0],     // Amber
      danger: [211, 47, 47]       // Crimson
    }
  },
  inventory: {
    name: 'Inventory',
    icon: <ShoppingOutlined />,
    colors: {
      primary: [103, 58, 183],    // Purple
      secondary: [156, 39, 176],  // Deep Purple
      accent: [255, 107, 0],      // Orange
      success: [76, 175, 80],     // Green
      warning: [255, 193, 7],     // Amber
      danger: [244, 67, 54]       // Red
    }
  },
  sales: {
    name: 'Sales',
    icon: <LineChartOutlined />,
    colors: {
      primary: [0, 150, 136],     // Teal
      secondary: [0, 188, 212],   // Cyan
      accent: [255, 87, 34],      // Deep Orange
      success: [56, 142, 60],     // Green
      warning: [255, 152, 0],     // Orange
      danger: [198, 40, 40]       // Dark Red
    }
  },
  operations: {
    name: 'Operations',
    icon: <DatabaseOutlined />,
    colors: {
      primary: [255, 107, 0],     // Orange
      secondary: [255, 145, 0],   // Amber
      accent: [33, 150, 243],     // Blue
      success: [0, 200, 83],      // Emerald
      warning: [255, 193, 7],     // Yellow
      danger: [255, 61, 0]        // Red
    }
  },
  default: {
    name: 'Corporate',
    icon: <AppstoreOutlined />,
    colors: {
      primary: [41, 128, 185],    // Blue
      secondary: [44, 62, 80],    // Dark Blue
      accent: [52, 152, 219],     // Light Blue
      success: [46, 204, 113],    // Green
      warning: [241, 196, 15],    // Yellow
      danger: [231, 76, 60]       // Red
    }
  }
};

// Column types for different data formatting
const COLUMN_TYPES = {
  text: {
    name: 'Text',
    format: (value) => String(value || ''),
    excelType: 's'
  },
  number: {
    name: 'Number',
    format: (value) => Number(value) || 0,
    excelType: 'n',
    style: { numFmt: '#,##0.00' }
  },
  currency: {
    name: 'Currency',
    format: (value) => Number(value) || 0,
    excelType: 'n',
    style: { numFmt: 'KSh #,##0.00' }
  },
  date: {
    name: 'Date',
    format: (value) => {
      if (!value) return '';
      const date = new Date(value);
      return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
    },
    excelType: 'd'
  },
  datetime: {
    name: 'Date & Time',
    format: (value) => {
      if (!value) return '';
      const date = new Date(value);
      return isNaN(date.getTime()) ? '' : date.toLocaleString();
    },
    excelType: 'd'
  },
  percentage: {
    name: 'Percentage',
    format: (value) => Number(value) || 0,
    excelType: 'n',
    style: { numFmt: '0.00%' }
  },
  boolean: {
    name: 'Yes/No',
    format: (value) => value ? 'Yes' : 'No',
    excelType: 's'
  },
  status: {
    name: 'Status',
    format: (value) => String(value || ''),
    excelType: 's'
  }
};

const AdvancedReportGenerator = ({ 
  // Dynamic table data
  dataSource = [],
  columns = [], // Array of column definitions
  summaryData = null, // Optional summary data (totals, etc.)
  
  // Report configuration
  title = 'Report',
  fileName = 'report',
  reportType = 'default', // finance, inventory, sales, operations, default
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
  
  // Callbacks
  onColumnChange,
  onSettingsSave,
  onReportGenerate
}) => {
  // Get state from context
  const { state } = useApp();
  
  // Get company and user info from state
  const companyName = propCompanyName || state?.currentCompany?.name || "Lynx";
  const currentUser = state?.currentUser;
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'System';
  
  // pick station from the state

  const stationInfo = propStationInfo || {
    name: state?.currentStation?.name || 'N/A',
    code: state?.currentStation?.code || '',
    address: state?.currentStation?.location || ''
  };
  
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

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
    includePageNumbers: true,
    includeTimestamp: true,
    includeStationInfo: !!stationInfo,
    includeGeneratedBy: true,
    watermark: false,
    
    // Table
    showGridLines: true,
    alternateRowColors: true,
    autoWrapText: true,
    headerStyle: 'bold',
    
    // Data
    groupBy: null,
    sortBy: null,
    filterBy: null,
    
    // Company info
    companyName: companyName,
    reportSubtitle: '',
    customHeader: ''
  });

  const [form] = Form.useForm();
  const [activeSettingsTab, setActiveSettingsTab] = useState('columns');

  // Get current theme
  const currentTheme = useMemo(() => {
    return REPORT_THEMES[reportSettings.colorScheme] || REPORT_THEMES.default;
  }, [reportSettings.colorScheme]);

  // Get colors
  const colors = useMemo(() => {
    return reportSettings.customColors || currentTheme.colors;
  }, [reportSettings.customColors, currentTheme]);

  // Initialize selected columns
  useEffect(() => {
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
    
    // Load saved settings
    const savedSettings = localStorage.getItem(`reportSettings_${reportType}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setReportSettings(prev => ({
          ...prev,
          ...parsed,
          companyName: companyName // Always use current company name from state
        }));
      } catch (error) {
        console.error('Error loading report settings:', error);
      }
    }
  }, [columns, dataSource, reportType, companyName]);

  // Save settings
  const saveSettings = () => {
    try {
      localStorage.setItem(`reportSettings_${reportType}`, JSON.stringify(reportSettings));
      if (onSettingsSave) {
        onSettingsSave(reportSettings);
      }
      message.success('Report settings saved successfully!');
    } catch (error) {
      console.error('Error saving report settings:', error);
      message.error('Failed to save settings');
    }
  };

  // Reset to defaults
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
      includePageNumbers: true,
      includeTimestamp: true,
      includeStationInfo: !!stationInfo,
      includeGeneratedBy: true,
      watermark: false,
      showGridLines: true,
      alternateRowColors: true,
      autoWrapText: true,
      headerStyle: 'bold',
      groupBy: null,
      sortBy: null,
      filterBy: null,
      companyName: companyName,
      reportSubtitle: '',
      customHeader: ''
    });
    message.success('Settings reset to defaults');
  };

  // Get visible columns with metadata
  const getVisibleColumns = () => {
    return columns.filter(col => 
      selectedColumns.includes(col.dataIndex) && 
      col.dataIndex && 
      col.title
    ).map(col => ({
      ...col,
      width: columnWidths[col.dataIndex] || col.width || 'auto',
      type: col.type || 'text',
      format: col.format || COLUMN_TYPES[col.type || 'text'].format
    }));
  };

  // Extract formatted data for export
  const getExportData = () => {
    const visibleColumns = getVisibleColumns();
    
    const headers = visibleColumns.map(col => ({
      key: col.dataIndex,
      title: typeof col.title === 'string' ? col.title : col.key || col.dataIndex,
      dataIndex: col.dataIndex,
      type: col.type,
      format: col.format,
      width: col.width,
      render: col.render
    }));

    const data = filteredData.map(record => 
      headers.reduce((acc, header) => {
        let value = record[header.dataIndex];
        
        // Apply column render function if exists
        if (header.render && typeof header.render === 'function') {
          try {
            const rendered = header.render(value, record);
            // Extract text from React elements
            if (React.isValidElement(rendered)) {
              value = extractTextFromElement(rendered);
            } else {
              value = rendered;
            }
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

  // Helper to extract text from React elements
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
      }
    }
    
    return String(element);
  };

  // Format currency for display
  const formatCurrency = (amount, currency = 'KES') => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate column totals for numeric columns
  const calculateColumnTotals = () => {
    const visibleColumns = getVisibleColumns();
    const totals = {};
    
    visibleColumns.forEach(col => {
      if (col.type === 'currency' || col.type === 'number') {
        const total = filteredData.reduce((sum, record) => {
          const value = record[col.dataIndex];
          return sum + (parseFloat(value) || 0);
        }, 0);
        totals[col.dataIndex] = total;
      }
    });
    
    return totals;
  };

  // Generate PDF report - FIXED VERSION
  const generatePDF = () => {
    if (filteredData.length === 0) {
      message.warning('No data available to generate PDF');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      if (onReportGenerate) {
        onReportGenerate('pdf');
      }

      // Create jsPDF instance
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

      let yPosition = 0;

      // =========== HEADER SECTION ===========
      if (reportSettings.includeHeader) {
        // Header background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 45, 'F'); // Increased height for additional info
        
        // Company Name - FROM STATE
        doc.setFontSize(18);
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
        
        // Header Details Row
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(240, 240, 240);
        
        // Left details
        const leftDetails = [
          `Report Type: ${currentTheme.name}`,
          `Generated By: ${userName}`,
          `Date: ${new Date().toLocaleDateString('en-KE')}`
        ];
        
        leftDetails.forEach((text, index) => {
          doc.text(text, 15, 35 + (index * 5));
        });
        
        // Right details - Station Info
        if (reportSettings.includeStationInfo && stationInfo) {
          const rightDetails = [
            `Station: ${stationInfo.name || 'N/A'}`,
            stationInfo.code ? `Code: ${stationInfo.code}` : '',
            stationInfo.address ? `Address: ${stationInfo.address.substring(0, 25)}...` : ''
          ].filter(Boolean);
          
          rightDetails.forEach((text, index) => {
            doc.text(text, pageWidth - 15, 35 + (index * 5), { align: 'right' });
          });
        }
        
        yPosition = 55;
      } else {
        yPosition = 20;
      }

      // =========== SUMMARY SECTION ===========
      if (reportSettings.includeSummary && summaryData) {
        const summaryHeight = 25;
        
        // Summary box
        doc.setDrawColor(...colors.secondary);
        doc.setLineWidth(0.5);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(10, yPosition, pageWidth - 20, summaryHeight, 2, 2, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.secondary);
        doc.text(`${currentTheme.name.toUpperCase()} SUMMARY`, 15, yPosition + 8);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Summary items
        const summaryItems = Object.entries(summaryData).slice(0, 4);
        const colWidth = (pageWidth - 30) / summaryItems.length;
        
        summaryItems.forEach(([label, value], index) => {
          const xPos = 15 + (index * colWidth);
          
          doc.setTextColor(100, 100, 100);
          doc.text(label.toUpperCase(), xPos, yPosition + 15);
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          
          const isNumeric = !isNaN(parseFloat(value)) && isFinite(value);
          const displayValue = isNumeric ? formatCurrency(value) : value;
          
          doc.text(displayValue, xPos, yPosition + 21);
        });
        
        yPosition += summaryHeight + 15;
      }

      // =========== MAIN TABLE ===========
      const tableHeaders = headers.map(header => header.title);
      
      // Prepare table body data
      const tableData = data.map(record => 
        headers.map(header => {
          let value = record[header.title];
          
          // Truncate very long values
          if (value && value.length > 50) {
            value = value.substring(0, 47) + '...';
          }
          
          return value || '';
        })
      );

      // Add totals row if applicable
      if (hasTotals) {
        const totalsRow = headers.map(header => {
          const total = columnTotals[header.dataIndex];
          if (total !== undefined) {
            return formatCurrency(total);
          }
          return '';
        });
        tableData.push(totalsRow);
      }

      // Use autoTable
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPosition,
        margin: { top: 10 },
        styles: { 
          fontSize: reportSettings.fontSize,
          cellPadding: reportSettings.cellPadding,
          lineWidth: reportSettings.showGridLines ? 0.1 : 0,
          lineColor: reportSettings.showGridLines ? [200, 200, 200] : [255, 255, 255],
          cellWidth: 'wrap',
          overflow: reportSettings.autoWrapText ? 'linebreak' : 'ellipsize',
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
          lineColor: [255, 255, 255]
        },
        bodyStyles: {
          lineWidth: reportSettings.showGridLines ? 0.1 : 0,
          lineColor: reportSettings.showGridLines ? [200, 200, 200] : [255, 255, 255]
        },
        alternateRowStyles: reportSettings.alternateRowColors ? {
          fillColor: [248, 248, 248]
        } : undefined,
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
      });

      // =========== FOOTER SECTION ===========
      if (reportSettings.includeFooter) {
        const footerY = pageHeight - 20;
        
        // Footer line
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.line(10, footerY, pageWidth - 10, footerY);
        
        // Footer text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        const footerContent = footerText || 
          `${companyName} • ${currentTheme.name} Report`;
        
        const timestamp = reportSettings.includeTimestamp ? 
          `Generated: ${new Date().toLocaleString()} | Records: ${data.length}` : 
          `Records: ${data.length}`;
        
        // Add "Generated by" in footer if enabled
        const generatedByText = reportSettings.includeGeneratedBy ? 
          `Generated by: ${userName} | ` : '';
        
        doc.text(footerContent, 10, footerY + 4);
        doc.text(`${generatedByText}${timestamp}`, pageWidth - 10, footerY + 4, { align: 'right' });
        
        // Confidential watermark
        if (reportSettings.watermark) {
          doc.setFontSize(40);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(230, 230, 230);
          doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2, { 
            align: 'center',
            angle: 45 
          });
        }
      }

      // Save PDF
      const dateStr = new Date().toISOString().split('T')[0];
      const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const finalFileName = `${safeFileName}_${currentTheme.name.toLowerCase()}_${dateStr}.pdf`;
      
      doc.save(finalFileName);
      
      message.success(`${currentTheme.name} PDF report generated successfully!`);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Generate Excel report
  const generateExcel = () => {
    setIsGeneratingExcel(true);
    
    try {
      const { headers, data } = getExportData();
      const columnTotals = calculateColumnTotals();
      
      if (onReportGenerate) {
        onReportGenerate('excel');
      }

      const wb = XLSX.utils.book_new();
      
      // Main data sheet
      const excelHeaders = headers.map(header => header.title);
      const excelData = [excelHeaders];
      
      data.forEach(record => {
        const row = headers.map(header => {
          const value = record[header.title];
          const colType = COLUMN_TYPES[header.type || 'text'];
          
          if (colType.excelType === 'n') {
            return Number(value) || 0;
          } else if (colType.excelType === 'd') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date;
          }
          return value;
        });
        excelData.push(row);
      });
      
      // Add totals row if applicable
      if (Object.keys(columnTotals).length > 0) {
        const totalsRow = headers.map(header => {
          const total = columnTotals[header.dataIndex];
          if (total !== undefined) {
            return total;
          }
          return '';
        });
        excelData.push(totalsRow);
        
        // Add label for totals row
        excelData[excelData.length - 1][0] = 'TOTAL';
      }

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Apply column styles
      const colWidths = headers.map((header, index) => {
        const width = header.width;
        if (width && width !== 'auto') {
          return { wch: parseInt(width.toString()) / 5 || 15 };
        }
        return { wch: 15 };
      });
      
      ws['!cols'] = colWidths;
      
      // Style header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { 
            fgColor: { 
              rgb: colors.primary.slice(0, 3)
                .map(c => c.toString(16).padStart(2, '0'))
                .join('').toUpperCase() 
            } 
          },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      
      // Style totals row if present
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
            }
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, `${currentTheme.name} Data`);
      
      // Enhanced Metadata sheet
      const metadata = [
        ['REPORT INFORMATION', ''],
        ['Report Title', title],
        ['Report Type', currentTheme.name],
        ['Company', companyName],
        ['Station', stationInfo?.name || 'N/A'],
        ['Station Code', stationInfo?.code || 'N/A'],
        ['Generated By', userName],
        ['User ID', currentUser?.id || 'N/A'],
        ['Generation Date', new Date().toLocaleString()],
        ['Total Records', data.length],
        ['Data Source', 'Advanced Report Generator'],
        ['', ''],
        ['REPORT SETTINGS', ''],
        ['Page Orientation', reportSettings.pageOrientation],
        ['Font Size', reportSettings.fontSize],
        ['Color Scheme', currentTheme.name],
        ['Show Grid Lines', reportSettings.showGridLines ? 'Yes' : 'No'],
        ['Alternate Row Colors', reportSettings.alternateRowColors ? 'Yes' : 'No'],
        ['', ''],
        ['COLUMN INFORMATION', ''],
        ...headers.map((header, index) => [
          `Column ${index + 1}`,
          `${header.title} (${header.type || 'text'})`
        ])
      ];
      
      const metadataWs = XLSX.utils.aoa_to_sheet(metadata);
      
      // Style metadata sheet
      const metaHeaderRange = XLSX.utils.decode_range(metadataWs['!ref']);
      for (let R = metaHeaderRange.s.r; R <= 0; R++) {
        for (let C = metaHeaderRange.s.c; C <= metaHeaderRange.e.c; C++) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (metadataWs[address]) {
            metadataWs[address].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "2E7D32" } }
            };
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, metadataWs, 'Report Info');

      const excelFileName = `${fileName}_${currentTheme.name.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, excelFileName);
      
      message.success(`${currentTheme.name} Excel report generated successfully!`);
    } catch (error) {
      console.error('Excel generation error:', error);
      message.error('Failed to generate Excel report');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  // Render Settings Modal
  const renderSettingsModal = () => (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Report Settings & Customization</span>
          <Tag color="blue" icon={currentTheme.icon}>
            {currentTheme.name} Report
          </Tag>
        </Space>
      }
      open={settingsModalVisible}
      onOk={() => {
        setSettingsModalVisible(false);
        saveSettings();
      }}
      onCancel={() => setSettingsModalVisible(false)}
      width={800}
      okText="Save Settings"
      cancelText="Cancel"
      footer={[
        <Button key="reset" onClick={resetSettings} danger>
          Reset to Defaults
        </Button>,
        <Button key="cancel" onClick={() => setSettingsModalVisible(false)}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={saveSettings}>
          Save Settings
        </Button>
      ]}
    >
      <Tabs activeKey={activeSettingsTab} onChange={setActiveSettingsTab}>
        <TabPane tab={<span><ColumnHeightOutlined /> Columns</span>} key="columns">
          <Card size="small" title="Select & Arrange Columns">
            <Row gutter={[16, 16]}>
              {columns.map((column, index) => (
                <Col xs={24} sm={12} key={column.dataIndex || index}>
                  <Card size="small" hoverable>
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
                      <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Type: {column.type || 'text'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Width: 
                          <InputNumber
                            size="small"
                            value={columnWidths[column.dataIndex] || 'auto'}
                            onChange={(value) => setColumnWidths(prev => ({
                              ...prev,
                              [column.dataIndex]: value
                            }))}
                            style={{ width: 70, marginLeft: 8 }}
                            placeholder="auto"
                          />
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
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
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card size="small" title="Layout">
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
        </TabPane>

        <TabPane tab={<span><FileTextOutlined /> Content</span>} key="content">
          <Card size="small" title="Report Content">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Company Name (from system):</Text>
                <Text style={{ display: 'block', marginBottom: 16, color: '#1890ff' }}>
                  {companyName}
                </Text>
              </div>
              
              <Input
                placeholder="Report Subtitle (optional)"
                value={reportSettings.reportSubtitle}
                onChange={(e) => setReportSettings(prev => ({
                  ...prev,
                  reportSubtitle: e.target.value
                }))}
              />
              
              <div>
                <Text>Include:</Text>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
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
                  <Col span={8}>
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
                  <Col span={8}>
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
                  <Col span={8}>
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
                  <Col span={8}>
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
                  <Col span={8}>
                    <Checkbox
                      checked={reportSettings.watermark}
                      onChange={(e) => setReportSettings(prev => ({
                        ...prev,
                        watermark: e.target.checked
                      }))}
                    >
                      Watermark
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

  // Render Preview Modal
  const renderPreviewModal = () => (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>Report Preview</span>
          <Tag color="green">Live Preview</Tag>
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
          key="generate" 
          type="primary" 
          onClick={generatePDF}
          loading={isGeneratingPDF}
        >
          <DownloadOutlined /> Generate PDF
        </Button>
      ]}
    >
      <div style={{ 
        padding: 20, 
        backgroundColor: '#f5f5f5',
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        position: 'relative'
      }}>
        {/* Header Preview */}
        {reportSettings.includeHeader && (
          <div style={{
            backgroundColor: `rgb(${colors.primary.join(', ')})`,
            color: 'white',
            padding: '20px',
            marginBottom: 20,
            borderRadius: 4,
            textAlign: 'center'
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
                <div>Report Type: {currentTheme.name}</div>
                <div>Generated By: {userName}</div>
                <div>Date: {new Date().toLocaleDateString()}</div>
              </div>
              {stationInfo && (
                <div style={{ textAlign: 'right' }}>
                  <div>Station: {stationInfo.name}</div>
                  {stationInfo.code && <div>Code: {stationInfo.code}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Preview */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: `${reportSettings.fontSize}pt`,
            fontFamily: 'Arial, sans-serif'
          }}>
            <thead>
              <tr style={{
                backgroundColor: `rgb(${colors.secondary.join(', ')})`,
                color: 'white'
              }}>
                {getVisibleColumns().map((col, index) => (
                  <th key={index} style={{
                    padding: '8px',
                    border: reportSettings.showGridLines ? '1px solid #ddd' : 'none',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex} style={{
                  backgroundColor: reportSettings.alternateRowColors && rowIndex % 2 === 0 
                    ? '#f9f9f9' 
                    : 'white'
                }}>
                  {getVisibleColumns().map((col, colIndex) => (
                    <td key={colIndex} style={{
                      padding: '6px',
                      border: reportSettings.showGridLines ? '1px solid #eee' : 'none',
                      whiteSpace: 'nowrap'
                    }}>
                      {col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}
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
              {reportSettings.includeTimestamp && `Generated: ${new Date().toLocaleString()} | `}
              Records: {filteredData.length}
            </div>
          </div>
        )}

        {filteredData.length > 10 && (
          <div style={{
            textAlign: 'center',
            marginTop: 10,
            padding: 10,
            backgroundColor: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 4,
            fontSize: '12px'
          }}>
            <Text type="warning">
              Preview shows first 10 of {filteredData.length} records
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );

  // Dropdown menu items
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
      disabled: isGeneratingExcel
    },
    {
      key: 'pdf',
      label: (
        <Space>
          <FilePdfOutlined />
          <span>Export as PDF</span>
          {isGeneratingPDF && <span style={{ fontSize: '12px', color: '#999' }}>(Generating...)</span>}
        </Space>
      ),
      onClick: generatePDF,
      disabled: isGeneratingPDF
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
    }
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomLeft"
        trigger={['click']}
      >
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          loading={isGeneratingPDF || isGeneratingExcel}
          disabled={filteredData.length === 0}
        >
          <Space>
            <Badge 
              count={currentTheme.name.charAt(0)} 
              style={{ backgroundColor: `rgb(${colors.primary.join(', ')})` }}
              size="small"
            />
            Generate Report
            {filteredData.length > 0 && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ({filteredData.length} records)
              </Text>
            )}
          </Space>
        </Button>
      </Dropdown>
      
      {renderSettingsModal()}
      {renderPreviewModal()}

      {/* Data validation alert */}
      {filteredData.length === 0 && (
        <Alert
          message="No Data Available"
          description="There is no data to generate a report from. Please check your data source."
          type="warning"
          showIcon
          style={{ marginTop: 8 }}
        />
      )}
    </>
  );
};

export default AdvancedReportGenerator;