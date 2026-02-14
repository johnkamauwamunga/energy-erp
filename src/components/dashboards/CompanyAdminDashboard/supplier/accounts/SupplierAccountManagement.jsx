import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Tabs,
  Descriptions,
  Switch,
  DatePicker,
  Alert,
  Badge,
  Divider,
  Typography,
  Dropdown,
  Progress
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  BankOutlined,
  WalletOutlined,
  HistoryOutlined,
  PlusOutlined,
  DownOutlined,
  DownloadOutlined,
  PrinterOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { supplierPaymentService, paymentTransformers } from '../../../../../services/supplierPaymentService/supplierPaymentService';
import { useApp } from '../../../../../context/AppContext';
import CreateSupplierPaymentModal from './modal/CreateSupplierPaymentModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const SupplierAccountManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentJourney, setPaymentJourney] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stationWallets, setStationWallets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateRange: []
  });
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshIntervalRef = useRef(null);
  const currentUser = state.currentUser;

  const isCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(currentUser?.role);
  const isStationLevel = ['STATION_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(currentUser?.role);

  const REFRESH_INTERVAL = 30000;

  // Load supplier accounts with outstanding invoices
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierPaymentService.getSupplierAccounts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        includePaidInvoices: false
      });
      
      console.log("Suppliers API Response:", response);
      
      // Transform the data to ensure all fields are properly mapped
      const transformedSuppliers = response.data.map(supplier => {
        // Transform supplier object
        const transformed = {
          ...supplier,
          id: supplier.id,
          supplierName: supplier.supplier?.name || 'Unknown',
          supplierCode: supplier.supplier?.code || supplier.accountCode,
          contactPerson: supplier.supplier?.contactPerson,
          phone: supplier.supplier?.phone,
          email: supplier.supplier?.email,
          
          // Outstanding invoices with proper structure
          outstandingInvoices: (supplier.outstandingInvoices || []).map(invoice => ({
            ...invoice,
            supplierName: supplier.supplier?.name,
            supplierContact: supplier.supplier?.contactPerson,
            supplierPhone: supplier.supplier?.phone,
            purchaseNumber: invoice.purchase?.purchaseNumber,
            receivingNumber: invoice.purchaseReceiving?.receivingNumber,
            netPayable: invoice.purchase?.netPayable
          })),
          
          // Credit utilization
          creditUtilization: supplier.creditLimit ? 
            ((supplier.currentBalance / supplier.creditLimit) * 100).toFixed(1) : 0
        };
        
        return transformed;
      });
      
      setSuppliers(transformedSuppliers);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      return response;
    } catch (error) {
      console.error('Error loading suppliers:', error);
      message.error('Failed to load suppliers');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load supplier payment journey
  const loadPaymentJourney = async (supplierAccountId) => {
    try {
      const response = await supplierPaymentService.getSupplierPaymentJourney(supplierAccountId);
      const transformed = paymentTransformers.transformPaymentJourney(response.data);
      setPaymentJourney(transformed);
      return transformed;
    } catch (error) {
      console.error('Error loading payment journey:', error);
      message.error('Failed to load payment history');
      throw error;
    }
  };

  // Load supplier transactions
  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await supplierPaymentService.getSupplierTransactions({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      console.log("Transactions API Response:", response);
      
      setTransactions(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0
      }));
      return response;
    } catch (error) {
      console.error('Error loading transactions:', error);
      message.error('Failed to load transactions');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      const response = await supplierPaymentService.getPaymentMethods();
      setPaymentMethods(response.data || []);
      return response;
    } catch (error) {
      console.error('Error loading payment methods:', error);
      throw error;
    }
  };

  // Load bank accounts
  const loadBankAccounts = async () => {
    try {
      const response = await supplierPaymentService.getBankAccounts();
      setBankAccounts(response.data || []);
      return response;
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      throw error;
    }
  };

  // Load station wallets
  const loadStationWallets = async () => {
    try {
      const response = await supplierPaymentService.getStationWallets();
      setStationWallets(response.data || []);
      return response;
    } catch (error) {
      console.error('Error loading station wallets:', error);
      throw error;
    }
  };

  // Main refresh function
  const refreshAllData = async (showMessage = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const refreshPromises = [
        loadSuppliers(),
        loadPaymentMethods(),
        loadBankAccounts()
      ];

      if (isStationLevel) {
        refreshPromises.push(loadStationWallets());
      }

      if (activeTab === 'transactions') {
        refreshPromises.push(loadTransactions());
      }

      if (selectedSupplier) {
        refreshPromises.push(loadPaymentJourney(selectedSupplier.id));
      }

      await Promise.all(refreshPromises);
      
      setLastUpdated(new Date());
      setRefreshCount(prev => prev + 1);
      
      if (showMessage) {
        message.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (showMessage) {
        message.error('Failed to refresh data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh intervals
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refreshAllData(false);
      }, REFRESH_INTERVAL);

      return () => {
        clearInterval(refreshIntervalRef.current);
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    refreshAllData(false);
  }, []);

  // Reload when filters or pagination change
  useEffect(() => {
    if (activeTab === 'suppliers') {
      loadSuppliers();
    } else if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [filters, pagination.page, pagination.limit, activeTab]);

  // Manual refresh
  const handleManualRefresh = async () => {
    await refreshAllData(true);
  };

  // Toggle auto-refresh
  const handleAutoRefreshToggle = (checked) => {
    setAutoRefresh(checked);
    if (checked) {
      message.success('Auto-refresh enabled');
    } else {
      message.info('Auto-refresh disabled');
    }
  };

  // Handle view invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceModalVisible(true);
  };

  // Generate PDF for invoice
  const generateInvoicePDF = (invoice) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Company Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(state.currentCompany?.name || "LYNX ENERGY", pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("INVOICE", pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(240, 240, 240);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, margin, 35);

    // Invoice Details
    let yPos = 50;

    // Invoice Header Box
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    doc.text(`INVOICE NUMBER:`, margin + 5, yPos);
    doc.text(`DATE:`, pageWidth / 2 + 5, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.referenceNumber || 'N/A', margin + 35, yPos);
    doc.text(new Date(invoice.transactionDate).toLocaleDateString('en-KE'), pageWidth / 2 + 25, yPos);

    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`DUE DATE:`, margin + 5, yPos);
    doc.text(`AMOUNT:`, pageWidth / 2 + 5, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoice.dueDate).toLocaleDateString('en-KE'), margin + 35, yPos);
    doc.text(`KES ${(invoice.amount || 0).toLocaleString()}`, pageWidth / 2 + 25, yPos);

    yPos += 20;

    // Supplier Information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER INFORMATION:', margin, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    doc.text(`Name: ${invoice.supplierName || 'Unknown'}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Contact: ${invoice.supplierContact || 'N/A'}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Phone: ${invoice.supplierPhone || 'N/A'}`, margin + 5, yPos);

    yPos += 15;

    // Invoice Items Table
    const tableData = [
      ['Description', 'PO Number', 'Receiving #', 'Amount']
    ];

    // Add invoice row
    tableData.push([
      invoice.description || 'Fuel Purchase',
      invoice.purchaseNumber || 'N/A',
      invoice.receivingNumber || 'N/A',
      `KES ${(invoice.amount || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 35, halign: 'right' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Summary Box
    const summaryStartX = pageWidth - 80;
    const summaryWidth = 65;
    
    doc.setFillColor(250, 250, 250);
    doc.rect(summaryStartX, yPos - 5, summaryWidth, 35, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', summaryStartX + 5, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', summaryStartX + 5, yPos);
    doc.text(`KES ${(invoice.amount || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });
    
    yPos += 5;
    doc.text('Paid Amount:', summaryStartX + 5, yPos);
    doc.text(`KES ${(invoice.totalPaid || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', summaryStartX + 5, yPos);
    doc.text(`KES ${(invoice.remainingBalance || invoice.amount || 0).toLocaleString()}`, summaryStartX + summaryWidth - 10, yPos, { align: 'right' });

    yPos += 15;

    // Status Footer
    const status = invoice.status || 'OUTSTANDING';
    const statusColor = status === 'PAID' ? [82, 196, 26] : 
                       status === 'OVERDUE' ? [255, 77, 79] : 
                       status === 'PARTIALLY_PAID' ? [250, 173, 20] : [41, 128, 185];
    
    doc.setFillColor(...statusColor);
    doc.rect(margin, pageHeight - 20, pageWidth - (margin * 2), 10, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Status: ${status}`, pageWidth / 2, pageHeight - 14, { align: 'center' });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer generated invoice', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Save PDF
    const fileName = `invoice_${invoice.referenceNumber || invoice.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    message.success('Invoice PDF downloaded successfully');
  };

  // Handle supplier selection
  const handleSelectSupplier = async (supplier) => {
    setSelectedSupplier(supplier);
    await loadPaymentJourney(supplier.id);
    setDetailsModalVisible(true);
  };

  // Handle payment success
  const handlePaymentSuccess = (result) => {
    message.success(`Payment processed successfully! Reference: ${result.data?.transferNumber}`);
    refreshAllData(false);
    setPaymentModalVisible(false);
  };

  // Handle make payment
  const handleMakePayment = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentModalVisible(true);
  };

  // Handle quick payment
  const handleQuickPayment = () => {
    if (suppliers.length === 0) {
      message.warning('No suppliers available for payment');
      return;
    }
    
    const supplierWithBalance = suppliers.find(s => s.currentBalance > 0);
    if (supplierWithBalance) {
      setSelectedSupplier(supplierWithBalance);
      setPaymentModalVisible(true);
    } else {
      message.info('No suppliers with outstanding balances found');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return paymentTransformers.formatCurrency(amount);
  };

  const formatDate = (date) => {
    return paymentTransformers.formatDate(date);
  };

  const formatDateTime = (date) => {
    return paymentTransformers.formatDateTime(date);
  };

  // Get all invoices from all suppliers
  const getAllInvoices = useMemo(() => {
    const allInvoices = [];
    suppliers.forEach(supplier => {
      if (supplier.outstandingInvoices && supplier.outstandingInvoices.length > 0) {
        supplier.outstandingInvoices.forEach(invoice => {
          allInvoices.push({
            ...invoice,
            supplierName: supplier.supplierName,
            supplierContact: supplier.contactPerson,
            supplierPhone: supplier.phone,
            supplierId: supplier.id,
            purchaseNumber: invoice.purchase?.purchaseNumber || invoice.purchaseNumber,
            receivingNumber: invoice.purchaseReceiving?.receivingNumber || invoice.receivingNumber
          });
        });
      }
    });
    return allInvoices;
  }, [suppliers]);

  // ==================== SUPPLIER COLUMNS ====================
  const supplierColumns = [
    {
      title: '#',
      key: 'index',
      render: (_, __, index) => (
        <Text style={{ fontSize: '11px', color: '#999' }}>
          {((pagination.page - 1) * pagination.limit) + index + 1}
        </Text>
      ),
      width: 40
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <Space size={4}>
          <Avatar 
            size="small"
            style={{ 
              backgroundColor: record.isActive ? '#52c41a' : '#d9d9d9',
              fontSize: '11px',
              width: 22,
              height: 22,
              lineHeight: '22px'
            }}
          >
            {record.supplierName?.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ lineHeight: '1.2' }}>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>{record.supplierName}</div>
            <div style={{ fontSize: '10px', color: '#999' }}>{record.supplierCode || 'N/A'}</div>
          </div>
        </Space>
      ),
      width: 150,
      sorter: (a, b) => (a.supplierName || '').localeCompare(b.supplierName || '')
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.contactPerson && (
            <div style={{ fontSize: '11px' }}>
              <UserOutlined style={{ fontSize: '10px', color: '#1890ff', marginRight: 2 }} />
              <span>{record.contactPerson}</span>
            </div>
          )}
          {record.phone && (
            <div style={{ fontSize: '11px' }}>
              <PhoneOutlined style={{ fontSize: '10px', color: '#52c41a', marginRight: 2 }} />
              <span>{record.phone}</span>
            </div>
          )}
        </Space>
      ),
      width: 130
    },
    {
      title: 'Balance',
      dataIndex: 'currentBalance',
      key: 'balance',
      render: (balance) => (
        <Text style={{ 
          fontSize: '12px', 
          fontWeight: 'bold',
          color: balance > 0 ? '#ff4d4f' : '#52c41a'
        }}>
          KES {balance?.toLocaleString() || 0}
        </Text>
      ),
      width: 100,
      align: 'right',
      sorter: (a, b) => (a.currentBalance || 0) - (b.currentBalance || 0)
    },
    {
      title: 'Credit Limit',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      render: (limit) => (
        <Text style={{ fontSize: '11px' }}>
          KES {limit?.toLocaleString() || 0}
        </Text>
      ),
      width: 90,
      align: 'right'
    },
    {
      title: 'Utilization',
      key: 'utilization',
      render: (_, record) => {
        const percent = record.creditUtilization || 0;
        const color = percent > 80 ? '#ff4d4f' : percent > 60 ? '#faad14' : '#52c41a';
        return (
          <Tooltip title={`${percent}% of credit limit used`}>
            <Progress 
              percent={percent} 
              size="small" 
              strokeColor={color}
              showInfo={false}
              style={{ width: 60 }}
            />
          </Tooltip>
        );
      },
      width: 70
    },
    {
      title: 'Invoices',
      key: 'invoices',
      align: 'center',
      render: (_, record) => (
        <Badge 
          count={record.outstandingInvoices?.length || 0} 
          size="small"
          style={{ 
            backgroundColor: record.outstandingInvoices?.length > 0 ? '#1890ff' : '#d9d9d9',
            fontSize: '10px'
          }}
        />
      ),
      width: 60
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (!record.isActive) {
          return <Tag color="red" style={{ fontSize: '10px' }}>Inactive</Tag>;
        }
        if (record.isCreditHold) {
          return <Tag color="orange" style={{ fontSize: '10px' }}>Credit Hold</Tag>;
        }
        return <Tag color="green" style={{ fontSize: '10px' }}>Active</Tag>;
      },
      width: 70,
      align: 'center'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined style={{ fontSize: '14px' }} />}
              size="small"
              onClick={() => handleSelectSupplier(record)}
              style={{ padding: '4px' }}
            />
          </Tooltip>
          <Tooltip title={record.currentBalance <= 0 ? "No outstanding balance" : "Make Payment"}>
            <Button
              type="text"
              icon={<DollarOutlined style={{ fontSize: '14px', color: record.currentBalance > 0 ? '#52c41a' : '#d9d9d9' }} />}
              size="small"
              onClick={() => handleMakePayment(record)}
              disabled={record.currentBalance <= 0}
              style={{ padding: '4px' }}
            />
          </Tooltip>
          <Tooltip title="View Invoices">
            <Button
              type="text"
              icon={<FileTextOutlined style={{ fontSize: '14px' }} />}
              size="small"
              onClick={() => {
                setSelectedSupplier(record);
                setActiveTab('invoices');
              }}
              style={{ padding: '4px' }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // ==================== INVOICE COLUMNS ====================
  const invoiceColumns = [
    {
      title: '#',
      key: 'index',
      render: (_, __, index) => (
        <Text style={{ fontSize: '11px', color: '#999' }}>
          {((pagination.page - 1) * pagination.limit) + index + 1}
        </Text>
      ),
      width: 40
    },
    {
      title: 'Invoice #',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      render: (ref, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>{ref || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: '9px' }}>PO: {record.purchaseNumber || 'N/A'}</Text>
        </Space>
      ),
      width: 100,
      sorter: (a, b) => (a.referenceNumber || '').localeCompare(b.referenceNumber || '')
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'date',
      render: (date) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px' }}>{formatDate(date)}</Text>
        </Space>
      ),
      width: 70,
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px', fontWeight: 500 }}>{record.supplierName}</Text>
        </Space>
      ),
      width: 120
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text style={{ fontSize: '11px', fontWeight: 500, color: '#1890ff' }}>
          KES {amount?.toLocaleString()}
        </Text>
      ),
      width: 90,
      align: 'right',
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0)
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date, record) => {
        const isOverdue = new Date(date) < new Date() && record.status !== 'PAID';
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ 
              fontSize: '11px',
              color: isOverdue ? '#ff4d4f' : '#666'
            }}>
              {formatDate(date)}
            </Text>
          </Space>
        );
      },
      width: 70,
      sorter: (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = {
          'OUTSTANDING': { color: 'orange', text: 'Outstanding' },
          'PARTIALLY_PAID': { color: 'blue', text: 'Partial' },
          'PAID': { color: 'green', text: 'Paid' },
          'OVERDUE': { color: 'red', text: 'Overdue' }
        };
        const item = config[status] || { color: 'default', text: status };
        return (
          <Tag color={item.color} style={{ fontSize: '10px', margin: 0 }}>
            {item.text}
          </Tag>
        );
      },
      width: 70,
      align: 'center'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="View Invoice">
            <Button
              type="text"
              icon={<EyeOutlined style={{ fontSize: '14px' }} />}
              size="small"
              onClick={() => handleViewInvoice(record)}
              style={{ padding: '4px' }}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              type="text"
              icon={<DownloadOutlined style={{ fontSize: '14px' }} />}
              size="small"
              onClick={() => generateInvoicePDF(record)}
              style={{ padding: '4px' }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Last updated display
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  // Create payment dropdown items
  const createPaymentItems = [
    {
      key: 'quick-payment',
      label: 'Quick Payment',
      icon: <DollarOutlined />,
      onClick: handleQuickPayment
    },
    {
      key: 'select-supplier',
      label: 'Select Supplier First',
      icon: <UserOutlined />,
      onClick: () => message.info('Select a supplier from the list below')
    }
  ];

  // Avatar component
  const Avatar = ({ children, style }) => (
    <div style={{
      width: 22,
      height: 22,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#fff',
      ...style
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '12px' }}>
      {/* Header */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                <UserOutlined /> Supplier Accounts
                {autoRefresh && (
                  <Badge 
                    dot 
                    style={{ 
                      backgroundColor: '#52c41a',
                      marginLeft: 8
                    }} 
                  />
                )}
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                {suppliers.length} suppliers • {getAllInvoices.length} invoices
                {lastUpdated && (
                  <span style={{ marginLeft: 8 }}>
                    Updated: {lastUpdatedDisplay}
                  </span>
                )}
              </p>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[4, 4]} justify="end">
              <Col>
                <Space size={4}>
                  <Tooltip title="Auto Refresh">
                    <Switch
                      checked={autoRefresh}
                      onChange={handleAutoRefreshToggle}
                      size="small"
                      checkedChildren="Auto"
                      unCheckedChildren="Manual"
                    />
                  </Tooltip>
                  <Tooltip title="Refresh">
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleManualRefresh}
                      loading={loading}
                      size="small"
                    />
                  </Tooltip>
                  <Dropdown 
                    menu={{ items: createPaymentItems }}
                    placement="bottomRight"
                  >
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      size="small"
                    >
                      Payment <DownOutlined />
                    </Button>
                  </Dropdown>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Auto-refresh Status */}
      {autoRefresh && (
        <Alert
          message="Auto-refresh Enabled"
          description="Data updates every 30 seconds"
          type="info"
          showIcon
          icon={<SyncOutlined />}
          style={{ marginBottom: 12, fontSize: '11px', padding: '6px 12px' }}
          action={
            <Button size="small" onClick={() => setAutoRefresh(false)}>
              Disable
            </Button>
          }
        />
      )}

      {/* Summary Statistics */}
      <Row gutter={[4, 4]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Total Suppliers</span>}
              value={suppliers.length}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Active Suppliers</span>}
              value={suppliers.filter(s => s.isActive).length}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Total Invoices</span>}
              value={getAllInvoices.length}
              valueStyle={{ color: '#722ed1', fontSize: '16px' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Total Outstanding</span>}
              value={suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0)}
              formatter={value => `KES ${value.toLocaleString()}`}
              valueStyle={{ color: '#ff4d4f', fontSize: '16px' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      {getAllInvoices.length > 0 && (
        <Alert
          message={
            <Space>
              <Text style={{ fontSize: '11px' }}>
                {getAllInvoices.length} invoices available for viewing
              </Text>
              <Button 
                type="link" 
                size="small" 
                onClick={() => setActiveTab('invoices')}
                icon={<EyeOutlined />}
                style={{ fontSize: '11px' }}
              >
                View All Invoices
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 12, padding: '6px 12px' }}
        />
      )}

      {/* Tabs Section */}
      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="small"
          style={{ padding: '0 8px' }}
        >
          <TabPane 
            tab={
              <span style={{ fontSize: '12px' }}>
                <UserOutlined /> Suppliers ({suppliers.length})
              </span>
            } 
            key="suppliers"
          >
            {/* Suppliers Table */}
            <div style={{ padding: '8px' }}>
              <Table
                columns={supplierColumns}
                dataSource={suppliers}
                loading={loading}
                rowKey="id"
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.limit,
                  total: pagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} suppliers`,
                  onChange: (page, pageSize) => {
                    setPagination(prev => ({ ...prev, page, limit: pageSize }));
                  },
                  size: 'small'
                }}
                size="small"
                scroll={{ x: 900 }}
              />
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span style={{ fontSize: '12px' }}>
                <FileTextOutlined /> Invoices ({getAllInvoices.length})
              </span>
            } 
            key="invoices"
          >
            <div style={{ padding: '8px' }}>
              {/* Filters */}
              <Card size="small" style={{ marginBottom: 8 }} bodyStyle={{ padding: '8px' }}>
                <Row gutter={[4, 4]} align="middle">
                  <Col xs={24} sm={8} md={6}>
                    <Input
                      placeholder="Search invoices..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      prefix={<SearchOutlined style={{ fontSize: '12px' }} />}
                      size="small"
                    />
                  </Col>
                  <Col xs={12} sm={8} md={4}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Status"
                      value={filters.status}
                      onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                      allowClear
                      size="small"
                    >
                      <Option value="OUTSTANDING">Outstanding</Option>
                      <Option value="PARTIALLY_PAID">Partially Paid</Option>
                      <Option value="PAID">Paid</Option>
                      <Option value="OVERDUE">Overdue</Option>
                    </Select>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <RangePicker
                      style={{ width: '100%' }}
                      onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                      size="small"
                    />
                  </Col>
                </Row>
              </Card>

              {/* Invoices Table */}
              <Table
                columns={invoiceColumns}
                dataSource={getAllInvoices}
                loading={loading}
                rowKey="id"
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.limit,
                  total: getAllInvoices.length,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} invoices`,
                  onChange: (page, pageSize) => {
                    setPagination(prev => ({ ...prev, page, limit: pageSize }));
                  },
                  size: 'small'
                }}
                size="small"
                scroll={{ x: 800 }}
              />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Single Invoice View Modal */}
      <Modal
        title={
          <Space size={8}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Invoice Details</span>
            {selectedInvoice && (
              <Tag color={selectedInvoice.status === 'PAID' ? 'green' : 
                         selectedInvoice.status === 'OVERDUE' ? 'red' : 'orange'}>
                {selectedInvoice.status}
              </Tag>
            )}
          </Space>
        }
        open={invoiceModalVisible}
        onCancel={() => {
          setInvoiceModalVisible(false);
          setSelectedInvoice(null);
        }}
        width={700}
        footer={[
          <Button 
            key="pdf" 
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => generateInvoicePDF(selectedInvoice)}
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
              setInvoiceModalVisible(false);
              setSelectedInvoice(null);
            }}
            size="small"
          >
            Close
          </Button>
        ]}
      >
        {selectedInvoice && (
          <div>
            {/* Invoice Header */}
            <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f5f5f5' }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Invoice Number</Text>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedInvoice.referenceNumber || 'N/A'}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Invoice Date</Text>
                  <div style={{ fontSize: '14px' }}>
                    {formatDate(selectedInvoice.transactionDate)}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Purchase Order</Text>
                  <div style={{ fontSize: '14px' }}>
                    {selectedInvoice.purchaseNumber || 'N/A'}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Receiving #</Text>
                  <div style={{ fontSize: '14px' }}>
                    {selectedInvoice.receivingNumber || 'N/A'}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Due Date</Text>
                  <div style={{ 
                    fontSize: '14px',
                    color: new Date(selectedInvoice.dueDate) < new Date() && 
                           selectedInvoice.status !== 'PAID' ? '#ff4d4f' : 'inherit'
                  }}>
                    {formatDate(selectedInvoice.dueDate)}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Category</Text>
                  <div style={{ fontSize: '14px' }}>
                    <Tag color="blue">{selectedInvoice.category || 'FUEL'}</Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Supplier Information */}
            <Card title="Supplier Information" size="small" style={{ marginBottom: 12 }}>
              <Row gutter={[8, 8]}>
                <Col span={24}>
                  <Text strong>{selectedInvoice.supplierName}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Contact Person</Text>
                  <div>{selectedInvoice.supplierContact || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Phone</Text>
                  <div>{selectedInvoice.supplierPhone || 'N/A'}</div>
                </Col>
              </Row>
            </Card>

            {/* Invoice Items */}
            <Card title="Invoice Details" size="small" style={{ marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px' }}>PO Number</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px' }}>Receiving #</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', fontSize: '12px' }}>
                      {selectedInvoice.description || 'Fuel Purchase'}
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px' }}>
                      {selectedInvoice.purchaseNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px' }}>
                      {selectedInvoice.receivingNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      KES {selectedInvoice.amount?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Summary */}
            <Card size="small" style={{ backgroundColor: '#f0f5ff' }}>
              <Row gutter={[8, 8]}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Subtotal</Text>
                  <div style={{ fontSize: '14px' }}>
                    KES {selectedInvoice.amount?.toLocaleString()}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Paid Amount</Text>
                  <div style={{ fontSize: '14px', color: '#52c41a' }}>
                    KES {selectedInvoice.totalPaid?.toLocaleString() || 0}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Balance Due</Text>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: (selectedInvoice.remainingBalance || selectedInvoice.amount) > 0 ? '#ff4d4f' : '#52c41a'
                  }}>
                    KES {(selectedInvoice.remainingBalance || selectedInvoice.amount)?.toLocaleString()}
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Additional Information */}
            {(selectedInvoice.notes || selectedInvoice.paymentReference) && (
              <Card size="small" style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>Additional Information</Text>
                {selectedInvoice.notes && (
                  <div style={{ fontSize: '12px', marginTop: 4 }}>📝 {selectedInvoice.notes}</div>
                )}
                {selectedInvoice.paymentReference && (
                  <div style={{ fontSize: '12px', marginTop: 4 }}>💰 Payment Ref: {selectedInvoice.paymentReference}</div>
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Supplier Details Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            Supplier Details - {selectedSupplier?.supplierName}
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedSupplier(null);
          setPaymentJourney(null);
        }}
        width={1000}
        footer={[
          <Button 
            key="pay"
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => {
              setDetailsModalVisible(false);
              setPaymentModalVisible(true);
            }}
            disabled={!selectedSupplier || selectedSupplier.currentBalance <= 0}
            size="small"
          >
            Make Payment
          </Button>,
          <Button key="close" onClick={() => setDetailsModalVisible(false)} size="small">
            Close
          </Button>
        ]}
      >
        {selectedSupplier && paymentJourney && (
          <div>
            {/* Supplier Summary */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                <Descriptions.Item label="Current Balance">
                  <span style={{ 
                    color: selectedSupplier.currentBalance > 0 ? '#ff4d4f' : '#52c41a',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(selectedSupplier.currentBalance)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Credit Limit">
                  {selectedSupplier.creditLimit ? formatCurrency(selectedSupplier.creditLimit) : 'No Limit'}
                </Descriptions.Item>
                <Descriptions.Item label="Available Credit">
                  {selectedSupplier.availableCredit ? formatCurrency(selectedSupplier.availableCredit) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Terms">
                  {selectedSupplier.paymentTerms ? `Net ${selectedSupplier.paymentTerms} days` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Outstanding Invoices">
                  <Badge count={selectedSupplier.outstandingInvoices?.length || 0} />
                </Descriptions.Item>
                <Descriptions.Item label="Last Purchase">
                  {selectedSupplier.lastPurchaseDate ? formatDate(selectedSupplier.lastPurchaseDate) : 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Outstanding Invoices */}
            <Card title="Outstanding Invoices" size="small" style={{ marginBottom: 16 }}>
              {selectedSupplier.outstandingInvoices?.length > 0 ? (
                <Table
                  size="small"
                  dataSource={selectedSupplier.outstandingInvoices}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Invoice #',
                      dataIndex: 'referenceNumber',
                      key: 'referenceNumber'
                    },
                    {
                      title: 'PO Number',
                      dataIndex: 'purchaseNumber',
                      key: 'purchaseNumber'
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amount) => formatCurrency(amount),
                      align: 'right'
                    },
                    {
                      title: 'Due Date',
                      dataIndex: 'dueDate',
                      key: 'dueDate',
                      render: (date) => (
                        <Tag color={new Date(date) < new Date() ? 'red' : 'blue'}>
                          {formatDate(date)}
                        </Tag>
                      )
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record) => (
                        <Button 
                          type="link" 
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedInvoice({
                              ...record,
                              supplierName: selectedSupplier.supplierName,
                              supplierContact: selectedSupplier.contactPerson,
                              supplierPhone: selectedSupplier.phone
                            });
                            setInvoiceModalVisible(true);
                          }}
                        >
                          View
                        </Button>
                      )
                    }
                  ]}
                />
              ) : (
                <Alert message="No outstanding invoices" type="success" showIcon />
              )}
            </Card>

            {/* Payment History */}
            <Card title="Payment History" size="small">
              {paymentJourney.transactions?.length > 0 ? (
                <Table
                  size="small"
                  dataSource={paymentJourney.transactions}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'transactionDate',
                      key: 'date',
                      render: (date) => formatDate(date)
                    },
                    {
                      title: 'Type',
                      dataIndex: 'type',
                      key: 'type'
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amount) => (
                        <span style={{ color: amount < 0 ? '#52c41a' : '#ff4d4f' }}>
                          {amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(amount))}
                        </span>
                      ),
                      align: 'right'
                    },
                    {
                      title: 'Description',
                      dataIndex: 'description',
                      key: 'description'
                    }
                  ]}
                />
              ) : (
                <Alert message="No payment history" type="info" showIcon />
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* Create Supplier Payment Modal */}
      <CreateSupplierPaymentModal
        visible={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onSuccess={handlePaymentSuccess}
        supplier={selectedSupplier}
        stationWallets={stationWallets}
        bankAccounts={bankAccounts}
        paymentMethods={paymentMethods}
      />
    </div>
  );
};

export default SupplierAccountManagement;