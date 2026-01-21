// src/components/purchases/PurchaseManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ShoppingOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
  DollarOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import {
  Button,
  Input,
  Select,
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Modal,
  message,
  Tooltip,
  DatePicker,
  Badge,
  Typography,
  Progress,
  Alert,
  Divider,
  Descriptions,
  Tabs,
  Form,
  Radio,
  InputNumber,
  Switch
} from 'antd';
import { purchaseService } from '../../../../services/purchaseService/purchaseService';
import { supplierService } from '../../../../services/supplierService/supplierService';
import CreateEditPurchaseModal from './create/CreateEditPurchaseModal';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';
import { useApp } from '../../../../context/AppContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { Search } = Input;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const PurchaseManagement = () => {
  const { state } = useApp();
  const currentUser = state?.currentUser;
  const currentCompany = state?.currentCompany;
  const currentStation = state?.currentStation;
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    supplier: 'all',
    startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    sortBy: 'purchaseDate',
    sortOrder: 'desc', // Default to descending order
    page: 1,
    limit: 20
  });
  
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    cancelled: 0,
    totalSpent: 0,
    totalTax: 0,
    totalDiscount: 0,
    averagePurchaseValue: 0,
    onTimeDeliveryRate: 0
  });

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getSuppliers(true);
      const suppliersArray = suppliersData.suppliers || suppliersData.data || suppliersData || [];
      setSuppliers(suppliersArray);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      message.error(error.message || 'Failed to load suppliers');
      setSuppliers([]);
    }
  };

  // Load purchases with advanced filtering and sorting
  const loadPurchases = async () => {
    try {
      setLoading(true);
      
      const queryFilters = {};
      if (filters.status !== 'all') queryFilters.status = filters.status;
      if (filters.type !== 'all') queryFilters.type = filters.type;
      if (filters.supplier !== 'all') queryFilters.supplierId = filters.supplier;
      if (searchQuery) queryFilters.search = searchQuery;
      if (filters.startDate) queryFilters.startDate = filters.startDate;
      if (filters.endDate) queryFilters.endDate = filters.endDate;
      
      // Add sorting parameters - FIXED: Ensure DESC order by default
      queryFilters.sortBy = filters.sortBy;
      queryFilters.sortOrder = filters.sortOrder;
      queryFilters.page = filters.page;
      queryFilters.limit = filters.limit;

      const purchasesData = await purchaseService.getPurchases(queryFilters);
      const purchasesArray = purchasesData.purchases || purchasesData.data || purchasesData || [];
      
      // Sort purchases in DESC order by purchase date for display
      const sortedPurchases = [...purchasesArray].sort((a, b) => {
        const dateA = new Date(a.purchaseDate || a.createdAt);
        const dateB = new Date(b.purchaseDate || b.createdAt);
        return dateB - dateA; // DESC order
      });
      
      setPurchases(sortedPurchases);
      calculateStats(sortedPurchases);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      message.error(error.message || 'Failed to load purchases');
      setPurchases([]);
      setStats({
        total: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        cancelled: 0,
        totalSpent: 0,
        totalTax: 0,
        totalDiscount: 0,
        averagePurchaseValue: 0,
        onTimeDeliveryRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate comprehensive statistics
  const calculateStats = (purchaseData) => {
    const total = purchaseData.length;
    const draft = purchaseData.filter(p => p.status === 'DRAFT').length;
    const pending = purchaseData.filter(p => p.status === 'PENDING_APPROVAL').length;
    const approved = purchaseData.filter(p => p.status === 'APPROVED').length;
    const completed = purchaseData.filter(p => p.status === 'COMPLETED').length;
    const cancelled = purchaseData.filter(p => p.status === 'CANCELLED').length;
    
    const totalSpent = purchaseData.reduce((sum, p) => sum + (p.netPayable || 0), 0);
    const totalTax = purchaseData.reduce((sum, p) => sum + (p.totalTaxAmount || 0), 0);
    const totalDiscount = purchaseData.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
    
    const averagePurchaseValue = total > 0 ? totalSpent / total : 0;
    
    // Calculate on-time delivery rate
    const deliveredPurchases = purchaseData.filter(p => 
      p.deliveryStatus === 'FULLY_ACCEPTED' || p.deliveryStatus === 'PARTIALLY_ACCEPTED'
    );
    const onTimeDeliveries = deliveredPurchases.filter(p => {
      if (!p.expectedDeliveryDate || !p.actualDeliveryDate) return false;
      const expected = new Date(p.expectedDeliveryDate);
      const actual = new Date(p.actualDeliveryDate);
      return actual <= expected || (actual - expected) <= (24 * 60 * 60 * 1000); // Within 1 day
    });
    const onTimeDeliveryRate = deliveredPurchases.length > 0 
      ? (onTimeDeliveries.length / deliveredPurchases.length) * 100 
      : 0;

    setStats({ 
      total, 
      draft, 
      pending, 
      approved, 
      completed, 
      cancelled,
      totalSpent, 
      totalTax, 
      totalDiscount,
      averagePurchaseValue,
      onTimeDeliveryRate
    });
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (dates, dateStrings) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dateStrings[0],
        endDate: dateStrings[1],
        page: 1
      }));
    }
  };

  // Initialize
  useEffect(() => {
    loadPurchases();
    loadSuppliers();
  }, [filters.status, filters.type, filters.supplier, filters.startDate, filters.endDate, filters.sortBy, filters.sortOrder, filters.page, filters.limit]);

  useEffect(() => {
    if (searchQuery === '') {
      loadPurchases();
    }
  }, [searchQuery]);

  const handleUpdateStatus = async (purchaseId, status) => {
    try {
      await purchaseService.updatePurchaseStatus(purchaseId, status);
      message.success('Purchase status updated successfully');
      loadPurchases();
    } catch (error) {
      message.error(error.message || 'Failed to update purchase status');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this purchase?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await purchaseService.deletePurchase(purchaseId);
          message.success('Purchase deleted successfully');
          loadPurchases();
        } catch (error) {
          message.error(error.message || 'Failed to delete purchase');
        }
      }
    });
  };

  const handlePurchaseCreated = () => {
    loadPurchases();
    setIsCreateModalOpen(false);
    message.success('Purchase created successfully');
  };

  const handlePurchaseUpdated = () => {
    loadPurchases();
    setSelectedPurchase(null);
    message.success('Purchase updated successfully');
  };

  // Status tag configuration
  const getStatusTag = (status) => {
    const statusConfig = {
      DRAFT: { color: 'default', label: 'Draft', icon: <FileExcelOutlined /> },
      PENDING_APPROVAL: { color: 'orange', label: 'Pending Approval', icon: <ClockCircleOutlined /> },
      APPROVED: { color: 'blue', label: 'Approved', icon: <CheckCircleOutlined /> },
      ORDER_CONFIRMED: { color: 'purple', label: 'Order Confirmed', icon: <CheckOutlined /> },
      IN_TRANSIT: { color: 'orange', label: 'In Transit', icon: <ExclamationCircleOutlined /> },
      ARRIVED_AT_SITE: { color: 'cyan', label: 'Arrived at Site', icon: <InfoCircleOutlined /> },
      QUALITY_CHECK: { color: 'gold', label: 'Quality Check', icon: <ExclamationCircleOutlined /> },
      PARTIALLY_RECEIVED: { color: 'geekblue', label: 'Partially Received', icon: <InfoCircleOutlined /> },
      COMPLETED: { color: 'green', label: 'Completed', icon: <CheckCircleOutlined /> },
      CANCELLED: { color: 'red', label: 'Cancelled', icon: <CloseCircleOutlined /> },
      REJECTED: { color: 'red', label: 'Rejected', icon: <CloseCircleOutlined /> },
      ON_HOLD: { color: 'default', label: 'On Hold', icon: <ClockCircleOutlined /> }
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.label}
      </Tag>
    );
  };

  // Type tag configuration
  const getTypeTag = (type) => {
    const typeConfig = {
      FUEL: { color: 'blue', label: 'Fuel', icon: <DollarOutlined /> },
      NON_FUEL: { color: 'green', label: 'Non-Fuel', icon: <ShoppingOutlined /> },
      MIXED: { color: 'purple', label: 'Mixed', icon: <CalculatorOutlined /> }
    };

    const config = typeConfig[type] || typeConfig.FUEL;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.label}
      </Tag>
    );
  };

  // Delivery status tag
  const getDeliveryTag = (status) => {
    const statusConfig = {
      PENDING: { color: 'default', label: 'Pending', icon: <ClockCircleOutlined /> },
      DISPATCHED: { color: 'blue', label: 'Dispatched', icon: <ExclamationCircleOutlined /> },
      IN_TRANSIT: { color: 'orange', label: 'In Transit', icon: <ExclamationCircleOutlined /> },
      ARRIVED: { color: 'cyan', label: 'Arrived', icon: <InfoCircleOutlined /> },
      UNLOADING: { color: 'purple', label: 'Unloading', icon: <ExclamationCircleOutlined /> },
      QUALITY_VERIFICATION: { color: 'gold', label: 'Quality Check', icon: <ExclamationCircleOutlined /> },
      PARTIALLY_ACCEPTED: { color: 'geekblue', label: 'Partially Accepted', icon: <InfoCircleOutlined /> },
      FULLY_ACCEPTED: { color: 'green', label: 'Fully Accepted', icon: <CheckCircleOutlined /> },
      REJECTED: { color: 'red', label: 'Rejected', icon: <CloseCircleOutlined /> },
      RETURNED: { color: 'red', label: 'Returned', icon: <CloseCircleOutlined /> }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.label}
      </Tag>
    );
  };

  // Currency formatting
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') {
      return 'KES 0.00';
    }
    const numValue = parseFloat(amount);
    return isNaN(numValue) 
      ? 'KES 0.00' 
      : `KES ${numValue.toLocaleString('en-KE', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
  };

  // Date formatting
  const formatDate = (date, format = 'short') => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      
      if (format === 'short') {
        return dateObj.toLocaleDateString('en-KE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } else if (format === 'long') {
        return dateObj.toLocaleDateString('en-KE', {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else if (format === 'datetime') {
        return dateObj.toLocaleString('en-KE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const handleViewDetails = async (purchase) => {
    try {
      const purchaseDetails = await purchaseService.getPurchaseById(purchase.id);
      setSelectedPurchase(purchaseDetails);
      message.info('View details for ' + purchase.purchaseNumber);
    } catch (error) {
      message.error(error.message || 'Failed to load purchase details');
    }
  };

  const handleEditPurchase = (purchase) => {
    if (purchase.status !== 'DRAFT') {
      message.error('Only draft purchases can be edited');
      return;
    }
    setSelectedPurchase(purchase);
    setIsCreateModalOpen(true);
  };

  // Enhanced column definitions with sequential numbering
  const getColumnDefinitions = () => {
    return [
      {
        title: '#',
        key: 'sequence',
        width: 60,
        fixed: 'left',
        type: 'number',
        render: (_, __, index) => {
          // Calculate sequential number based on pagination for DESC order
          const page = filters.page || 1;
          const pageSize = filters.limit || 20;
          const sequentialNumber = ((page - 1) * pageSize) + index + 1;
          return (
            <Badge
              count={sequentialNumber}
              style={{ 
                backgroundColor: sequentialNumber <= 3 ? 
                  sequentialNumber === 1 ? '#f5222d' : 
                  sequentialNumber === 2 ? '#fa8c16' : 
                  '#52c41a' : '#d9d9d9'
              }}
            />
          );
        }
      },
      {
        title: 'Purchase #',
        dataIndex: 'purchaseNumber',
        key: 'purchaseNumber',
        width: 140,
        type: 'text',
        render: (text, record) => (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '12px' }}>{text}</Text>
            {record.reference && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                Ref: {record.reference}
              </Text>
            )}
          </Space>
        ),
        sorter: (a, b) => a.purchaseNumber?.localeCompare(b.purchaseNumber || ''),
        defaultSortOrder: 'descend'
      },
      {
        title: 'Supplier',
        dataIndex: 'supplier',
        key: 'supplier',
        width: 160,
        type: 'text',
        render: (supplier) => (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '12px' }}>{supplier?.name || 'N/A'}</Text>
            {supplier?.code && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                Code: {supplier.code}
              </Text>
            )}
            {supplier?.contactPerson && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                Contact: {supplier.contactPerson}
              </Text>
            )}
          </Space>
        )
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        type: 'status',
        render: (type) => getTypeTag(type)
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 150,
        type: 'status',
        render: (status) => getStatusTag(status),
        filters: [
          { text: 'Draft', value: 'DRAFT' },
          { text: 'Pending', value: 'PENDING_APPROVAL' },
          { text: 'Approved', value: 'APPROVED' },
          { text: 'Completed', value: 'COMPLETED' },
          { text: 'Cancelled', value: 'CANCELLED' }
        ]
      },
      {
        title: 'Delivery',
        dataIndex: 'deliveryStatus',
        key: 'deliveryStatus',
        width: 140,
        type: 'status',
        render: (status) => getDeliveryTag(status)
      },
      {
        title: 'Gross Amount',
        dataIndex: 'grossAmount',
        key: 'grossAmount',
        width: 130,
        type: 'currency',
        render: (amount) => {
          const formatted = formatCurrency(amount);
          return (
            <Text style={{ fontWeight: 500, fontSize: '12px' }}>
              {formatted}
            </Text>
          );
        },
        sorter: (a, b) => (parseFloat(a.grossAmount) || 0) - (parseFloat(b.grossAmount) || 0),
        defaultSortOrder: 'descend'
      },
      {
        title: 'Tax',
        dataIndex: 'totalTaxAmount',
        key: 'totalTaxAmount',
        width: 120,
        type: 'currency',
        render: (amount) => {
          const formatted = formatCurrency(amount);
          return (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatted}
            </Text>
          );
        }
      },
      {
        title: 'Discount',
        dataIndex: 'discountAmount',
        key: 'discountAmount',
        width: 120,
        type: 'currency',
        render: (amount) => {
          const formatted = formatCurrency(amount);
          return (
            <Text type="success" style={{ fontSize: '12px' }}>
              {formatted}
            </Text>
          );
        }
      },
      {
        title: 'Net Payable',
        dataIndex: 'netPayable',
        key: 'netPayable',
        width: 130,
        type: 'currency',
        render: (amount) => {
          const formatted = formatCurrency(amount);
          return (
            <Text strong style={{ color: '#52c41a', fontSize: '12px' }}>
              {formatted}
            </Text>
          );
        },
        sorter: (a, b) => (parseFloat(a.netPayable) || 0) - (parseFloat(b.netPayable) || 0)
      },
      {
        title: 'Purchase Date',
        dataIndex: 'purchaseDate',
        key: 'purchaseDate',
        width: 140,
        type: 'date',
        render: (date) => (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '12px' }}>{formatDate(date, 'short')}</Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Expected: {formatDate(date, 'short')}
            </Text>
          </Space>
        ),
        sorter: (a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate),
        defaultSortOrder: 'descend'
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 180,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            
            {record.status === 'DRAFT' && (
              <Tooltip title="Edit">
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => handleEditPurchase(record)}
                />
              </Tooltip>
            )}
            
            {record.status === 'PENDING_APPROVAL' && (
              <Tooltip title="Approve">
                <Button 
                  icon={<CheckCircleOutlined />} 
                  size="small"
                  type="primary"
                  onClick={() => handleUpdateStatus(record.id, 'APPROVED')}
                />
              </Tooltip>
            )}
            
            {record.status === 'DRAFT' && (
              <Tooltip title="Delete">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                  onClick={() => handleDeletePurchase(record.id)}
                />
              </Tooltip>
            )}
          </Space>
        )
      }
    ];
  };

  // Prepare data for export with sequential numbering
  const prepareExportData = () => {
    if (!purchases || purchases.length === 0) return [];
    
    const columnDefinitions = getColumnDefinitions();
    
    return purchases.map((record, index) => {
      const exportRecord = { ...record };
      
      // Add sequential number
      exportRecord.sequenceNumber = index + 1;
      
      // Process each column to ensure proper values
      columnDefinitions.forEach(col => {
        if (col.dataIndex) {
          const value = record[col.dataIndex];
          
          // Handle supplier object
          if (col.dataIndex === 'supplier' && value && typeof value === 'object') {
            exportRecord.supplierName = value.name || 'N/A';
            exportRecord.supplierCode = value.code || '';
            exportRecord.supplierContact = value.contactPerson || '';
          }
          
          // Handle missing or null values for currency columns
          if (col.type === 'currency') {
            if (value === null || value === undefined || value === '') {
              exportRecord[col.dataIndex] = 0;
            } else {
              exportRecord[col.dataIndex] = parseFloat(value) || 0;
            }
          }
          // Handle missing values for number columns
          else if (col.type === 'number') {
            if (value === null || value === undefined || value === '') {
              exportRecord[col.dataIndex] = 0;
            } else {
              exportRecord[col.dataIndex] = parseFloat(value) || 0;
            }
          }
          // Handle missing text values
          else if (col.type === 'text') {
            if (value === null || value === undefined) {
              exportRecord[col.dataIndex] = 'N/A';
            }
          }
          // Handle missing status values
          else if (col.type === 'status') {
            if (value === null || value === undefined) {
              exportRecord[col.dataIndex] = 'Unknown';
            }
          }
          // Handle missing date values
          else if (col.type === 'date' || col.type === 'datetime') {
            if (value === null || value === undefined) {
              exportRecord[col.dataIndex] = 'N/A';
            }
          }
        }
      });
      
      return exportRecord;
    });
  };

  // Calculate summary data for reports
  const calculateSummaryData = () => {
    if (!purchases || purchases.length === 0) return null;

    const columnDefinitions = getColumnDefinitions();
    const currencyColumns = columnDefinitions.filter(col => 
      col.type === 'currency' && col.dataIndex
    );

    const totals = {};
    
    // Initialize all currency totals
    currencyColumns.forEach(col => {
      if (col.dataIndex) {
        totals[col.dataIndex] = 0;
      }
    });
    
    // Calculate totals
    purchases.forEach(record => {
      currencyColumns.forEach(col => {
        if (col.dataIndex) {
          const value = parseFloat(record[col.dataIndex]) || 0;
          totals[col.dataIndex] += value;
        }
      });
    });

    // Add record count
    totals.totalRecords = purchases.length;
    totals.averagePurchaseValue = totals.totalRecords > 0 ? totals.netPayable / totals.totalRecords : 0;
    
    // Add summary info
    totals.summaryInfo = {
      'Total Purchases': totals.totalRecords,
      'Total Spend': formatCurrency(totals.netPayable || 0),
      'Average Purchase Value': formatCurrency(totals.averagePurchaseValue || 0),
      'Total Tax': formatCurrency(totals.totalTaxAmount || 0),
      'Total Discount': formatCurrency(totals.discountAmount || 0),
      'Generated At': new Date().toLocaleString(),
      'Company': currentCompany?.name || 'All Companies',
      'Date Range': `${formatDate(filters.startDate, 'short')} to ${formatDate(filters.endDate, 'short')}`,
      'Report Type': 'Purchase Management Report'
    };
    
    // Format totals for display
    const formattedTotals = {};
    Object.entries(totals).forEach(([key, value]) => {
      if (typeof value === 'number') {
        formattedTotals[key] = {
          raw: value,
          formatted: formatCurrency(value)
        };
      } else {
        formattedTotals[key] = value;
      }
    });

    return formattedTotals;
  };

  // Render export button with AdvancedReportGenerator
  const renderExportButton = () => {
    if (!purchases || purchases.length === 0) {
      return (
        <Button icon={<DownloadOutlined />} disabled>
          Export
        </Button>
      );
    }

    const columnDefinitions = getColumnDefinitions();
    const summaryData = calculateSummaryData();
    const exportDataSource = prepareExportData();
    
    // Get report title
    const getReportTitle = () => {
      const companyName = currentCompany?.name || 'All Companies';
      const dateRange = `${formatDate(filters.startDate, 'short')} to ${formatDate(filters.endDate, 'short')}`;
      
      return `Purchase Management Report - ${companyName} - ${dateRange}`;
    };

    // Get file name
    const getFileName = () => {
      const companyCode = currentCompany?.code ? `_${currentCompany.code}` : '';
      return `purchases_${filters.startDate}_to_${filters.endDate}${companyCode}_${new Date().toISOString().split('T')[0]}`;
    };

    // Enhanced column configuration for export
    const enhancedExportColumns = columnDefinitions.map(col => {
      const enhancedCol = { ...col };
      
      // Override render functions to ensure consistent values for export
      if (col.type === 'currency') {
        enhancedCol.render = (value) => {
          if (value === null || value === undefined || value === '') {
            return 0;
          }
          return parseFloat(value) || 0;
        };
      } else if (col.type === 'number') {
        enhancedCol.render = (value) => {
          if (value === null || value === undefined || value === '') {
            return 0;
          }
          return parseFloat(value) || 0;
        };
      } else if (col.type === 'text') {
        enhancedCol.render = (value) => {
          if (value === null || value === undefined) {
            return 'N/A';
          }
          return String(value);
        };
      } else if (col.type === 'status') {
        enhancedCol.render = (value) => {
          if (value === null || value === undefined) {
            return 'Unknown';
          }
          return String(value);
        };
      } else if (col.type === 'date' || col.type === 'datetime') {
        enhancedCol.render = (value) => {
          if (value === null || value === undefined) {
            return 'N/A';
          }
          return formatDate(value, col.type === 'date' ? 'short' : 'datetime');
        };
      }
      
      return enhancedCol;
    });

    return (
      <AdvancedReportGenerator
        dataSource={exportDataSource}
        columns={enhancedExportColumns}
        summaryData={summaryData}
        title={getReportTitle()}
        fileName={getFileName()}
        reportType="operations"
        companyName={currentCompany?.name || "Lynx Energy System"}
        stationInfo={currentStation ? {
          name: currentStation.name,
          code: currentStation.code,
          address: currentStation.address
        } : null}
        showFooter={true}
        footerText={`Generated from Lynx Energy System | User: ${currentUser?.firstName || ''} ${currentUser?.lastName || ''} | ${new Date().toLocaleString()}`}
        enableCustomization={true}
        includeLogo={false}
        onReportGenerate={(format) => {
          console.log(`Exporting ${exportDataSource.length} purchase records as ${format}`);
          message.success(`Purchase report generated successfully with ${exportDataSource.length} records`);
        }}
        customStyles={{
          fontSize: 9,
          cellPadding: 3,
          showGridLines: true,
          alternateRowColors: true,
          includeTimestamp: true,
          includeStationInfo: !!currentStation,
          autoWrapText: true
        }}
      />
    );
  };

  // Handle table sort change
  const handleTableChange = (pagination, _, sorter) => {
    console.log('Table sort changed:', sorter);
    
    if (sorter.field) {
      handleFilterChange('sortBy', sorter.field);
      handleFilterChange('sortOrder', sorter.order === 'ascend' ? 'asc' : 'desc');
    }
    
    if (pagination.current !== filters.page) {
      handleFilterChange('page', pagination.current);
    }
    
    if (pagination.pageSize !== filters.limit) {
      handleFilterChange('limit', pagination.pageSize);
    }
  };

  // Get permissions
  const canManagePurchases = () => true;
  const canApprovePurchases = () => true;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>
            <ShoppingOutlined /> Purchase Management
          </Title>
          <Text type="secondary">
            Manage purchase orders, track deliveries, and monitor supplier performance
          </Text>
        </Space>
        
        <Space style={{ marginTop: '16px' }}>
          {canManagePurchases() && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Purchase
            </Button>
          )}
          {renderExportButton()}
          <Button icon={<BarChartOutlined />}>
            Analytics
          </Button>
        </Space>
      </div>

      {/* Statistics Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Purchases"
              value={stats.total}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary">
              Last 30 days: {purchases.filter(p => 
                new Date(p.purchaseDate) > new Date(dayjs().subtract(30, 'days'))
              ).length}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Spend"
              value={stats.totalSpent}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary">
              Avg: {formatCurrency(stats.averagePurchaseValue)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Tax"
              value={stats.totalTax}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">
              {((stats.totalTax / stats.totalSpent) * 100).toFixed(1)}% of spend
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="On-Time Delivery"
              value={stats.onTimeDeliveryRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: stats.onTimeDeliveryRate >= 90 ? '#52c41a' : stats.onTimeDeliveryRate >= 75 ? '#fa8c16' : '#f5222d' }}
            />
            <Progress 
              percent={stats.onTimeDeliveryRate} 
              size="small" 
              status={stats.onTimeDeliveryRate >= 90 ? 'success' : stats.onTimeDeliveryRate >= 75 ? 'active' : 'exception'}
            />
          </Card>
        </Col>
      </Row>

      {/* Status Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">Draft</Text>
            <Badge count={stats.draft} style={{ backgroundColor: '#666' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">Pending</Text>
            <Badge count={stats.pending} style={{ backgroundColor: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">Approved</Text>
            <Badge count={stats.approved} style={{ backgroundColor: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">Completed</Text>
            <Badge count={stats.completed} style={{ backgroundColor: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">Cancelled</Text>
            <Badge count={stats.cancelled} style={{ backgroundColor: '#f5222d' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">Discount</Text>
            <Text strong style={{ color: '#52c41a' }}>
              {formatCurrency(stats.totalDiscount)}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: '24px' }} size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={loadPurchases}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="all">All Statuses</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="PENDING_APPROVAL">Pending Approval</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Type"
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
            >
              <Option value="all">All Types</Option>
              <Option value="FUEL">Fuel</Option>
              <Option value="NON_FUEL">Non-Fuel</Option>
              <Option value="MIXED">Mixed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Supplier"
              value={filters.supplier}
              onChange={(value) => handleFilterChange('supplier', value)}
              loading={loading}
            >
              <Option value="all">All Suppliers</Option>
              {suppliers.map(supplier => (
                <Option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.code ? `(${supplier.code})` : ''}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadPurchases}
              loading={loading}
              style={{ width: '100%' }}
            >
              Refresh
            </Button>
          </Col>
        </Row>
        
        <Divider style={{ margin: '16px 0' }} />
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Date Range</Text>
              <RangePicker
                value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Sort By</Text>
              <Select
                value={filters.sortBy}
                onChange={(value) => handleFilterChange('sortBy', value)}
                style={{ width: '100%' }}
              >
                <Option value="purchaseDate">Purchase Date (DESC)</Option>
                <Option value="netPayable">Net Amount (DESC)</Option>
                <Option value="grossAmount">Gross Amount (DESC)</Option>
                <Option value="createdAt">Created Date (DESC)</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Sort Order</Text>
              <Select
                value={filters.sortOrder}
                onChange={(value) => handleFilterChange('sortOrder', value)}
                style={{ width: '100%' }}
              >
                <Option value="desc">Newest First (Desc)</Option>
                <Option value="asc">Oldest First (Asc)</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Records Per Page</Text>
              <Select
                value={filters.limit}
                onChange={(value) => handleFilterChange('limit', value)}
                style={{ width: '100%' }}
              >
                <Option value={10}>10</Option>
                <Option value={20}>20</Option>
                <Option value={50}>50</Option>
                <Option value={100}>100</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card>
        <Table
          columns={getColumnDefinitions()}
          dataSource={purchases}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: purchases.length,
            onChange: (page, pageSize) => {
              handleFilterChange('page', page);
              if (pageSize !== filters.limit) {
                handleFilterChange('limit', pageSize);
              }
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} purchases (Sorted: ${filters.sortBy} ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'})`
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: searchQuery || filters.status !== 'all' || filters.type !== 'all' || filters.supplier !== 'all'
              ? 'No purchases match your search criteria.' 
              : 'No purchases found. Create your first purchase order to get started.'
          }}
          summary={() => {
            if (purchases.length === 0) return null;
            
            const summaryData = calculateSummaryData();
            if (!summaryData) return null;

            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong>TOTAL ({purchases.length} purchases)</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong style={{ color: '#1890ff' }}>
                      {formatCurrency(summaryData.grossAmount?.raw || 0)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong type="secondary">
                      {formatCurrency(summaryData.totalTaxAmount?.raw || 0)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong type="success">
                      {formatCurrency(summaryData.discountAmount?.raw || 0)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong style={{ color: '#52c41a' }}>
                      {formatCurrency(summaryData.netPayable?.raw || 0)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} colSpan={6}>
                    <Text type="secondary">
                      Sorted by: {filters.sortBy} ({filters.sortOrder === 'desc' ? 'Descending' : 'Ascending'})
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* Info Section */}
      {purchases.length > 0 && (
        <Alert
          message="Purchase Management Information"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                • Total purchases: <Text strong>{stats.total}</Text> with total spend of <Text strong>{formatCurrency(stats.totalSpent)}</Text>
              </Text>
              <Text>
                • On-time delivery rate: <Text strong>{stats.onTimeDeliveryRate.toFixed(1)}%</Text>
              </Text>
              <Text>
                • Average purchase value: <Text strong>{formatCurrency(stats.averagePurchaseValue)}</Text>
              </Text>
              <Text>
                • Date range: {formatDate(filters.startDate, 'short')} to {formatDate(filters.endDate, 'short')}
              </Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <CreateEditPurchaseModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onPurchaseCreated={handlePurchaseCreated}
        onPurchaseUpdated={handlePurchaseUpdated}
      />
    </div>
  );
};

export default PurchaseManagement;