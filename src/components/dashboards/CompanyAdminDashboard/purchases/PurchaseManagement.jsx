// src/components/purchases/PurchaseManagement.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ExclamationCircleOutlined,
  PrinterOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserOutlined,
  IdcardOutlined,
  BankOutlined
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
  Switch,
  Avatar
} from 'antd';
import { purchaseService } from '../../../../services/purchaseService/purchaseService';
import { supplierService } from '../../../../services/supplierService/supplierService';
import CreateEditPurchaseModal from './create/CreateEditPurchaseModal';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';
import { useApp } from '../../../../context/AppContext';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
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
    sortOrder: 'desc',
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
      
      queryFilters.sortBy = filters.sortBy;
      queryFilters.sortOrder = filters.sortOrder;
      queryFilters.page = filters.page;
      queryFilters.limit = filters.limit;

      const purchasesData = await purchaseService.getPurchases(queryFilters);
      console.log("purchase fetched filtered \n", purchasesData);
      
      const purchasesArray = purchasesData.purchases || purchasesData.data || purchasesData || [];
      
      // Sort purchases in DESC order by purchase date for display
      const sortedPurchases = [...purchasesArray].sort((a, b) => {
        const dateA = new Date(a.purchaseDate || a.createdAt);
        const dateB = new Date(b.purchaseDate || b.createdAt);
        return dateB - dateA;
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
      if (!p.expectedDate || !p.receivedDate) return false;
      const expected = new Date(p.expectedDate);
      const actual = new Date(p.receivedDate);
      return actual <= expected || (actual - expected) <= (24 * 60 * 60 * 1000);
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
      page: 1
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

  // View single purchase order
  const handleViewPurchase = async (purchase) => {
    try {
      const purchaseDetails = await purchaseService.getPurchaseById(purchase.id);
      setSelectedPurchase(purchaseDetails);
      setPurchaseModalVisible(true);
    } catch (error) {
      message.error(error.message || 'Failed to load purchase details');
    }
  };

  // Generate PDF for single purchase order
  const generatePurchaseOrderPDF = (purchase) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // =========== COMPANY HEADER ===========
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text((currentCompany?.name || "LYNX ENERGY").toUpperCase(), pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text("PURCHASE ORDER", pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(240, 240, 240);
    doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, margin, 35);
    doc.text(`By: ${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`, pageWidth - margin, 35, { align: 'right' });

    // =========== PO HEADER ===========
    let yPos = 50;

    // PO Number and Date Box
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    doc.text(`PO NUMBER:`, margin + 5, yPos);
    doc.text(`DATE:`, pageWidth / 2 + 5, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(purchase.purchaseNumber || 'N/A', margin + 25, yPos);
    doc.text(formatDate(purchase.purchaseDate, 'long'), pageWidth / 2 + 25, yPos);

    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`STATUS:`, margin + 5, yPos);
    doc.text(`DELIVERY:`, pageWidth / 2 + 5, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(purchase.status || 'N/A', margin + 25, yPos);
    doc.text(purchase.deliveryStatus || 'N/A', pageWidth / 2 + 25, yPos);

    yPos += 20;

    // =========== SUPPLIER INFORMATION ===========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER INFORMATION', margin, yPos);
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const supplier = purchase.supplier || {};
    
    // Supplier details in two columns
    doc.text(`Name:`, margin + 5, yPos);
    doc.text(supplier.name || 'N/A', margin + 25, yPos);
    
    doc.text(`Code:`, pageWidth / 2 + 5, yPos);
    doc.text(supplier.code || 'N/A', pageWidth / 2 + 25, yPos);
    
    yPos += 5;
    doc.text(`Contact:`, margin + 5, yPos);
    doc.text(supplier.contactPerson || 'N/A', margin + 25, yPos);
    
    doc.text(`Phone:`, pageWidth / 2 + 5, yPos);
    doc.text(supplier.phone || 'N/A', pageWidth / 2 + 25, yPos);
    
    yPos += 5;
    doc.text(`Email:`, margin + 5, yPos);
    doc.text(supplier.email || 'N/A', margin + 25, yPos);
    
    doc.text(`Payment Terms:`, pageWidth / 2 + 5, yPos);
    doc.text(supplier.paymentTerms ? `Net ${supplier.paymentTerms} days` : 'N/A', pageWidth / 2 + 25, yPos);

    yPos += 15;

    // =========== DELIVERY INFORMATION ===========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY INFORMATION', margin, yPos);
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const station = purchase.station || {};
    
    doc.text(`Station:`, margin + 5, yPos);
    doc.text(station.name || 'N/A', margin + 25, yPos);
    
    doc.text(`Expected Date:`, pageWidth / 2 + 5, yPos);
    doc.text(formatDate(purchase.expectedDate, 'short') || 'N/A', pageWidth / 2 + 25, yPos);
    
    yPos += 5;
    doc.text(`Location:`, margin + 5, yPos);
    doc.text(station.location || 'N/A', margin + 25, yPos);
    
    doc.text(`Received Date:`, pageWidth / 2 + 5, yPos);
    doc.text(purchase.receivedDate ? formatDate(purchase.receivedDate, 'short') : 'Not received', pageWidth / 2 + 25, yPos);
    
    yPos += 5;
    doc.text(`Delivery Address:`, margin + 5, yPos);
    doc.text(purchase.deliveryAddress || 'N/A', margin + 25, yPos);

    yPos += 15;

    // =========== ITEMS TABLE ===========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ITEMS', margin, yPos);
    
    yPos += 6;

    const tableHeaders = [['#', 'Product', 'Code', 'Qty', 'Unit Cost', 'Tax', 'Total']];
    const tableData = [];

    if (purchase.items && purchase.items.length > 0) {
      purchase.items.forEach((item, index) => {
        const product = item.product || {};
        const lineTotal = (item.unitCost || 0) * (item.orderedQty || 0);
        const taxAmount = item.taxAmount || (lineTotal * (item.taxRate || 0));
        const totalWithTax = lineTotal + taxAmount;

        tableData.push([
          (index + 1).toString(),
          product.name || 'N/A',
          product.fuelCode || 'N/A',
          (item.orderedQty || 0).toString(),
          `KES ${(item.unitCost || 0).toLocaleString()}`,
          `${((item.taxRate || 0) * 100).toFixed(0)}%`,
          `KES ${(totalWithTax || 0).toLocaleString()}`
        ]);
      });
    } else {
      tableData.push(['No items found']);
    }

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 35, halign: 'right' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // =========== FINANCIAL SUMMARY ===========
    const summaryStartX = pageWidth - 80;
    const summaryWidth = 65;
    
    doc.setFillColor(250, 250, 250);
    doc.rect(summaryStartX, yPos - 5, summaryWidth, 40, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', summaryStartX + 5, yPos);
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Gross Amount:', summaryStartX + 5, yPos);
    doc.text(`KES ${(purchase.grossAmount || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });
    
    yPos += 5;
    doc.text('Tax Amount:', summaryStartX + 5, yPos);
    doc.text(`KES ${(purchase.totalTaxAmount || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });
    
    yPos += 5;
    doc.text('Discount:', summaryStartX + 5, yPos);
    doc.text(`KES ${(purchase.discountAmount || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYABLE:', summaryStartX + 5, yPos);
    doc.text(`KES ${(purchase.netPayable || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });

    yPos += 20;

    // =========== ADDITIONAL INFORMATION ===========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL INFORMATION', margin, yPos);
    
    yPos += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Notes
    doc.text(`Notes:`, margin + 5, yPos);
    doc.text(purchase.notes || 'No notes provided', margin + 20, yPos);
    
    yPos += 4;
    doc.text(`Reference:`, margin + 5, yPos);
    doc.text(purchase.reference || 'N/A', margin + 20, yPos);
    
    yPos += 4;
    doc.text(`Internal Ref:`, margin + 5, yPos);
    doc.text(purchase.internalRef || 'N/A', margin + 20, yPos);
    
    yPos += 8;

    // =========== AUDIT TRAIL ===========
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos - 3, pageWidth - (margin * 2), 15, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDIT TRAIL', margin + 5, yPos);
    
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Created: ${formatDateTime(purchase.createdAt)} by ${purchase.createdBy?.firstName || ''} ${purchase.createdBy?.lastName || ''}`, margin + 10, yPos);
    
    yPos += 3;
    doc.text(`Last Updated: ${formatDateTime(purchase.updatedAt)}`, margin + 10, yPos);
    
    if (purchase.receivedById) {
      yPos += 3;
      doc.text(`Received: ${formatDateTime(purchase.receivedDate)}`, margin + 10, yPos);
    }
    
    if (purchase.approvedById) {
      yPos += 3;
      doc.text(`Approved: ${formatDateTime(purchase.approvedAt)}`, margin + 10, yPos);
    }

    yPos += 10;

    // =========== STATUS FOOTER ===========
    const status = purchase.status || 'DRAFT';
    const statusColor = status === 'COMPLETED' ? [82, 196, 26] : 
                       status === 'CANCELLED' ? [255, 77, 79] : 
                       status === 'APPROVED' ? [24, 144, 255] : 
                       [250, 173, 20];
    
    doc.setFillColor(...statusColor);
    doc.rect(margin, pageHeight - 20, pageWidth - (margin * 2), 8, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Status: ${status}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // =========== FOOTER ===========
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer generated purchase order', pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`PO: ${purchase.purchaseNumber} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 4, { align: 'center' });

    // Save PDF
    const fileName = `PO_${purchase.purchaseNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    message.success('Purchase order PDF downloaded successfully');
  };

  const handleEditPurchase = (purchase) => {
    if (purchase.status !== 'DRAFT') {
      message.error('Only draft purchases can be edited');
      return;
    }
    setSelectedPurchase(purchase);
    setIsCreateModalOpen(true);
  };

  // Status tag configuration
  const getStatusTag = (status) => {
    const statusConfig = {
      DRAFT: { color: 'default', label: 'Draft', icon: <FileExcelOutlined /> },
      PENDING_APPROVAL: { color: 'orange', label: 'Pending', icon: <ClockCircleOutlined /> },
      APPROVED: { color: 'blue', label: 'Approved', icon: <CheckCircleOutlined /> },
      ORDER_CONFIRMED: { color: 'purple', label: 'Confirmed', icon: <CheckOutlined /> },
      IN_TRANSIT: { color: 'orange', label: 'In Transit', icon: <ExclamationCircleOutlined /> },
      ARRIVED_AT_SITE: { color: 'cyan', label: 'Arrived', icon: <InfoCircleOutlined /> },
      QUALITY_CHECK: { color: 'gold', label: 'Quality Check', icon: <ExclamationCircleOutlined /> },
      PARTIALLY_RECEIVED: { color: 'geekblue', label: 'Partial', icon: <InfoCircleOutlined /> },
      COMPLETED: { color: 'green', label: 'Completed', icon: <CheckCircleOutlined /> },
      CANCELLED: { color: 'red', label: 'Cancelled', icon: <CloseCircleOutlined /> },
      REJECTED: { color: 'red', label: 'Rejected', icon: <CloseCircleOutlined /> },
      ON_HOLD: { color: 'default', label: 'On Hold', icon: <ClockCircleOutlined /> }
    };
    return statusConfig[status] || statusConfig.DRAFT;
  };

  // Type tag configuration
  const getTypeTag = (type) => {
    const typeConfig = {
      FUEL: { color: 'blue', label: 'Fuel', icon: <DollarOutlined /> },
      NON_FUEL: { color: 'green', label: 'Non-Fuel', icon: <ShoppingOutlined /> },
      MIXED: { color: 'purple', label: 'Mixed', icon: <CalculatorOutlined /> }
    };
    return typeConfig[type] || typeConfig.FUEL;
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
      PARTIALLY_ACCEPTED: { color: 'geekblue', label: 'Partial', icon: <InfoCircleOutlined /> },
      FULLY_ACCEPTED: { color: 'green', label: 'Accepted', icon: <CheckCircleOutlined /> },
      REJECTED: { color: 'red', label: 'Rejected', icon: <CloseCircleOutlined /> },
      RETURNED: { color: 'red', label: 'Returned', icon: <CloseCircleOutlined /> }
    };
    return statusConfig[status] || statusConfig.PENDING;
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
      return 'N/A';
    }
  };

  const formatDateTime = (date) => {
    return formatDate(date, 'datetime');
  };

  // =========== COMPACT TABLE COLUMNS (NO HORIZONTAL SCROLL) ===========
  const columns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      render: (_, __, index) => (
        <Text style={{ fontSize: '11px', color: '#999' }}>
          {((filters.page - 1) * filters.limit) + index + 1}
        </Text>
      )
    },
    {
      title: 'PO Number',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber',
      width: 100,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '9px' }}>{record.reference || ''}</Text>
        </Space>
      ),
      sorter: true
    },
    {
      title: 'Supplier',
      key: 'supplier',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '12px', fontWeight: 500 }}>{record.supplier?.name || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: '9px' }}>{record.supplier?.code || ''}</Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 60,
      render: (type) => {
        const config = getTypeTag(type);
        return (
          <Tag color={config.color} style={{ fontSize: '10px', margin: 0 }}>
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const config = getStatusTag(status);
        return (
          <Tag color={config.color} style={{ fontSize: '10px', margin: 0 }}>
            {config.label}
          </Tag>
        );
      },
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
      width: 70,
      render: (status) => {
        const config = getDeliveryTag(status);
        return (
          <Tag color={config.color} style={{ fontSize: '9px', margin: 0 }}>
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'netPayable',
      key: 'netPayable',
      width: 100,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontSize: '12px', fontWeight: 500, color: '#1890ff' }}>
          {formatCurrency(amount)}
        </Text>
      ),
      sorter: true
    },
    {
      title: 'Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 80,
      render: (date) => (
        <Text style={{ fontSize: '11px' }}>{formatDate(date, 'short')}</Text>
      ),
      sorter: true,
      defaultSortOrder: 'descend'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="View Purchase Order">
            <Button
              type="text"
              icon={<EyeOutlined style={{ fontSize: '14px' }} />}
              size="small"
              onClick={() => handleViewPurchase(record)}
              style={{ padding: '4px' }}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              type="text"
              icon={<FilePdfOutlined style={{ fontSize: '14px', color: '#ff4d4f' }} />}
              size="small"
              onClick={() => generatePurchaseOrderPDF(record)}
              style={{ padding: '4px' }}
            />
          </Tooltip>
          {record.status === 'DRAFT' && (
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined style={{ fontSize: '14px' }} />}
                size="small"
                onClick={() => handleEditPurchase(record)}
                style={{ padding: '4px' }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // Total width calculation: 40+100+120+60+80+70+100+80+60 = 710px (fits without scroll)

  // Prepare data for export
  const prepareExportData = () => {
    if (!purchases || purchases.length === 0) return [];
    
    return purchases.map((record, index) => ({
      '#': index + 1,
      'PO Number': record.purchaseNumber,
      'Supplier': record.supplier?.name || 'N/A',
      'Type': record.type || 'N/A',
      'Status': record.status || 'N/A',
      'Delivery Status': record.deliveryStatus || 'N/A',
      'Gross Amount': record.grossAmount || 0,
      'Tax Amount': record.totalTaxAmount || 0,
      'Net Payable': record.netPayable || 0,
      'Purchase Date': formatDate(record.purchaseDate, 'short'),
      'Expected Date': formatDate(record.expectedDate, 'short'),
      'Received Date': record.receivedDate ? formatDate(record.receivedDate, 'short') : 'Not received',
      'Supplier Contact': record.supplier?.contactPerson || 'N/A',
      'Supplier Phone': record.supplier?.phone || 'N/A',
      'Station': record.station?.name || 'N/A',
      'Created By': record.createdBy ? `${record.createdBy.firstName} ${record.createdBy.lastName}` : 'N/A',
      'Created At': formatDateTime(record.createdAt),
      'Notes': record.notes || ''
    }));
  };

  // Calculate summary data for reports
  const calculateSummaryData = () => {
    if (!purchases || purchases.length === 0) return null;

    const totalGross = purchases.reduce((sum, p) => sum + (p.grossAmount || 0), 0);
    const totalTax = purchases.reduce((sum, p) => sum + (p.totalTaxAmount || 0), 0);
    const totalNet = purchases.reduce((sum, p) => sum + (p.netPayable || 0), 0);
    const totalDiscount = purchases.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
    
    return {
      'Total Purchases': purchases.length,
      'Total Gross Amount': formatCurrency(totalGross),
      'Total Tax Amount': formatCurrency(totalTax),
      'Total Net Payable': formatCurrency(totalNet),
      'Total Discount': formatCurrency(totalDiscount),
      'Average Purchase Value': formatCurrency(totalNet / (purchases.length || 1)),
      'Completed Purchases': purchases.filter(p => p.status === 'COMPLETED').length,
      'Pending Purchases': purchases.filter(p => p.status === 'PENDING_APPROVAL').length,
      'Date Range': `${formatDate(filters.startDate, 'short')} - ${formatDate(filters.endDate, 'short')}`,
      'Generated At': new Date().toLocaleString(),
      'Generated By': `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
      'Company': currentCompany?.name || 'All Companies'
    };
  };

  // Handle table sort change
  const handleTableChange = (pagination, _, sorter) => {
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

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} md={12}>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
              <ShoppingOutlined /> Purchase Management
            </Title>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {purchases.length} purchase orders • Last 30 days
            </Text>
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }} size={4}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
              size="small"
            >
              New PO
            </Button>
            
            <AdvancedReportGenerator
              dataSource={prepareExportData()}
              columns={[
                { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
                { title: 'PO Number', dataIndex: 'PO Number', key: 'poNumber', width: 120, type: 'text' },
                { title: 'Supplier', dataIndex: 'Supplier', key: 'supplier', width: 150, type: 'text' },
                { title: 'Type', dataIndex: 'Type', key: 'type', width: 80, type: 'text' },
                { title: 'Status', dataIndex: 'Status', key: 'status', width: 100, type: 'text' },
                { title: 'Delivery Status', dataIndex: 'Delivery Status', key: 'delivery', width: 100, type: 'text' },
                { title: 'Gross Amount', dataIndex: 'Gross Amount', key: 'gross', width: 120, type: 'currency' },
                { title: 'Tax Amount', dataIndex: 'Tax Amount', key: 'tax', width: 120, type: 'currency' },
                { title: 'Net Payable', dataIndex: 'Net Payable', key: 'net', width: 120, type: 'currency' },
                { title: 'Purchase Date', dataIndex: 'Purchase Date', key: 'date', width: 100, type: 'date' }
              ]}
              summaryData={calculateSummaryData()}
              title={`Purchase Report - ${formatDate(filters.startDate, 'short')} to ${formatDate(filters.endDate, 'short')}`}
              fileName={`purchases_${filters.startDate}_to_${filters.endDate}`}
              reportType="operations"
              companyName={currentCompany?.name}
              stationInfo={currentStation}
              showFooter={true}
              footerText={`Generated by ${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}
              enableCustomization={true}
              showGrandTotals={true}
            />
            
            <Button icon={<ReloadOutlined />} onClick={loadPurchases} loading={loading} size="small" />
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards - COMPACT */}
      <Row gutter={[4, 4]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Total Purchases</span>}
              value={stats.total}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Total Spend</span>}
              value={stats.totalSpent}
              precision={0}
              formatter={value => `KES ${value.toLocaleString()}`}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Completed</span>}
              value={stats.completed}
              valueStyle={{ color: '#722ed1', fontSize: '16px' }}
              suffix={`/ ${stats.total}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>On-Time</span>}
              value={stats.onTimeDeliveryRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: stats.onTimeDeliveryRate >= 90 ? '#52c41a' : '#fa8c16', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters - COMPACT */}
      <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '8px' }}>
        <Row gutter={[4, 4]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search POs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={loadPurchases}
              prefix={<SearchOutlined style={{ fontSize: '12px' }} />}
              size="small"
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              size="small"
            >
              <Option value="all">All Status</Option>
              <Option value="DRAFT">Draft</Option>
              <Option value="PENDING_APPROVAL">Pending</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="COMPLETED">Completed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Type"
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              size="small"
            >
              <Option value="all">All Types</Option>
              <Option value="FUEL">Fuel</Option>
              <Option value="NON_FUEL">Non-Fuel</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
              style={{ width: '100%' }}
              size="small"
            >
              <Option value="purchaseDate">Date</Option>
              <Option value="netPayable">Amount</Option>
              <Option value="purchaseNumber">PO #</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table - COMPACT */}
      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={purchases}
          loading={loading}
          rowKey="id"
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
              `${range[0]}-${range[1]} of ${total}`,
            size: 'small'
          }}
          onChange={handleTableChange}
          size="small"
          scroll={{ x: 710 }} // Exactly the width of our columns
        />
      </Card>

      {/* Single Purchase Order Modal */}
      <Modal
        title={
          <Space size={8}>
            <ShoppingOutlined style={{ color: '#1890ff' }} />
            <span>Purchase Order: {selectedPurchase?.purchaseNumber}</span>
            {selectedPurchase && (
              <Tag color={getStatusTag(selectedPurchase.status).color}>
                {getStatusTag(selectedPurchase.status).label}
              </Tag>
            )}
          </Space>
        }
        open={purchaseModalVisible}
        onCancel={() => {
          setPurchaseModalVisible(false);
          setSelectedPurchase(null);
        }}
        width={800}
        footer={[
          <Button 
            key="pdf" 
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => generatePurchaseOrderPDF(selectedPurchase)}
            size="small"
          >
            Download PDF
          </Button>,
          <Button 
            key="print" 
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            size="small"
          >
            Print
          </Button>,
          <Button 
            key="close" 
            onClick={() => {
              setPurchaseModalVisible(false);
              setSelectedPurchase(null);
            }}
            size="small"
          >
            Close
          </Button>
        ]}
      >
        {selectedPurchase && (
          <div>
            {/* PO Header */}
            <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f5f5f5' }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>PO Number</Text>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedPurchase.purchaseNumber}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>PO Date</Text>
                  <div style={{ fontSize: '14px' }}>
                    {formatDate(selectedPurchase.purchaseDate, 'long')}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Status</Text>
                  <div>
                    <Tag color={getStatusTag(selectedPurchase.status).color}>
                      {getStatusTag(selectedPurchase.status).label}
                    </Tag>
                    <Tag color={getDeliveryTag(selectedPurchase.deliveryStatus).color} style={{ marginLeft: 4 }}>
                      {getDeliveryTag(selectedPurchase.deliveryStatus).label}
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Type</Text>
                  <div>
                    <Tag color={getTypeTag(selectedPurchase.type).color}>
                      {getTypeTag(selectedPurchase.type).label}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Supplier Information */}
            <Card title="Supplier Information" size="small" style={{ marginBottom: 12 }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Supplier Name</Text>
                  <div style={{ fontWeight: 500 }}>{selectedPurchase.supplier?.name || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Supplier Code</Text>
                  <div>{selectedPurchase.supplier?.code || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Contact Person</Text>
                  <div>{selectedPurchase.supplier?.contactPerson || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Phone</Text>
                  <div>{selectedPurchase.supplier?.phone || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Email</Text>
                  <div>{selectedPurchase.supplier?.email || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Payment Terms</Text>
                  <div>{selectedPurchase.supplier?.paymentTerms ? `Net ${selectedPurchase.supplier.paymentTerms}` : 'N/A'}</div>
                </Col>
              </Row>
            </Card>

            {/* Delivery Information */}
            <Card title="Delivery Information" size="small" style={{ marginBottom: 12 }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Station</Text>
                  <div>{selectedPurchase.station?.name || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Location</Text>
                  <div>{selectedPurchase.station?.location || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Expected Date</Text>
                  <div>{formatDate(selectedPurchase.expectedDate, 'short')}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Received Date</Text>
                  <div>{selectedPurchase.receivedDate ? formatDate(selectedPurchase.receivedDate, 'short') : 'Not received'}</div>
                </Col>
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Delivery Address</Text>
                  <div>{selectedPurchase.deliveryAddress || 'N/A'}</div>
                </Col>
              </Row>
            </Card>

            {/* Items Table */}
            <Card title="Purchase Items" size="small" style={{ marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>#</th>
                    <th style={{ padding: '6px', textAlign: 'left', fontSize: '11px' }}>Product</th>
                    <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Qty</th>
                    <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Unit Cost</th>
                    <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Tax</th>
                    <th style={{ padding: '6px', textAlign: 'right', fontSize: '11px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchase.items?.map((item, index) => {
                    const lineTotal = (item.unitCost || 0) * (item.orderedQty || 0);
                    const taxAmount = item.taxAmount || (lineTotal * (item.taxRate || 0));
                    const totalWithTax = lineTotal + taxAmount;
                    
                    return (
                      <tr key={index}>
                        <td style={{ padding: '6px', fontSize: '11px' }}>{index + 1}</td>
                        <td style={{ padding: '6px', fontSize: '11px' }}>
                          <div>{item.product?.name || 'N/A'}</div>
                          <Text type="secondary" style={{ fontSize: '9px' }}>{item.product?.fuelCode || ''}</Text>
                        </td>
                        <td style={{ padding: '6px', fontSize: '11px', textAlign: 'right' }}>{item.orderedQty?.toLocaleString() || 0}</td>
                        <td style={{ padding: '6px', fontSize: '11px', textAlign: 'right' }}>KES {(item.unitCost || 0).toLocaleString()}</td>
                        <td style={{ padding: '6px', fontSize: '11px', textAlign: 'right' }}>{((item.taxRate || 0) * 100).toFixed(0)}%</td>
                        <td style={{ padding: '6px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                          KES {totalWithTax.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Financial Summary */}
            <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f0f5ff' }}>
              <Row gutter={[8, 8]}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Gross Amount</Text>
                  <div style={{ fontSize: '14px' }}>KES {selectedPurchase.grossAmount?.toLocaleString() || 0}</div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Tax Amount</Text>
                  <div style={{ fontSize: '14px' }}>KES {selectedPurchase.totalTaxAmount?.toLocaleString() || 0}</div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Discount</Text>
                  <div style={{ fontSize: '14px', color: '#52c41a' }}>KES {selectedPurchase.discountAmount?.toLocaleString() || 0}</div>
                </Col>
                <Col span={24}>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong style={{ fontSize: '14px' }}>NET PAYABLE: </Text>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff', marginLeft: 8 }}>
                    KES {selectedPurchase.netPayable?.toLocaleString() || 0}
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* Additional Information */}
            {(selectedPurchase.notes || selectedPurchase.reference || selectedPurchase.internalRef) && (
              <Card title="Additional Information" size="small" style={{ marginBottom: 12 }}>
                {selectedPurchase.notes && (
                  <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Notes: </Text>
                    <Text style={{ fontSize: '12px' }}>{selectedPurchase.notes}</Text>
                  </div>
                )}
                {selectedPurchase.reference && (
                  <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Reference: </Text>
                    <Text style={{ fontSize: '12px' }}>{selectedPurchase.reference}</Text>
                  </div>
                )}
                {selectedPurchase.internalRef && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Internal Ref: </Text>
                    <Text style={{ fontSize: '12px' }}>{selectedPurchase.internalRef}</Text>
                  </div>
                )}
              </Card>
            )}

            {/* Audit Trail */}
            <Card title="Audit Trail" size="small" style={{ backgroundColor: '#fafafa' }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '10px' }}>Created</Text>
                  <div style={{ fontSize: '11px' }}>
                    {formatDateTime(selectedPurchase.createdAt)} by {selectedPurchase.createdBy?.firstName} {selectedPurchase.createdBy?.lastName}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '10px' }}>Last Updated</Text>
                  <div style={{ fontSize: '11px' }}>{formatDateTime(selectedPurchase.updatedAt)}</div>
                </Col>
                {selectedPurchase.receivedById && (
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: '10px' }}>Received</Text>
                    <div style={{ fontSize: '11px' }}>{formatDateTime(selectedPurchase.receivedDate)}</div>
                  </Col>
                )}
                {selectedPurchase.approvedById && (
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: '10px' }}>Approved</Text>
                    <div style={{ fontSize: '11px' }}>{formatDateTime(selectedPurchase.approvedAt)}</div>
                  </Col>
                )}
              </Row>
            </Card>
          </div>
        )}
      </Modal>

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