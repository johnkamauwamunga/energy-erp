import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Statistic,
  message,
  Modal,
  Tooltip,
  Grid,
  Dropdown,
  Avatar,
  Badge,
  Drawer,
  Typography,
  Empty,
  Divider,
  Form,
  Descriptions,
  Progress
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  TeamOutlined,
  MoreOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SettingOutlined,
  SortDescendingOutlined,
  UserOutlined,
  IdcardOutlined,
  CalendarOutlined,
  ClearOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BankOutlined,
  SafetyOutlined,
  StarOutlined
} from '@ant-design/icons';
import { supplierService } from '../../../../services/supplierService/supplierService';
import CreateSupplierModal from './create/CreateSupplierModal';
import UpdateSupplierModal from './edit/UpdateSupplierModal';
import CreateSupplierProductModal from './create/CreateSupplierProductModal';
import SupplierProductsModal from './products/SupplierProductsModal';
import AdvancedReportGenerator from '../../common/downloadable/AdvancedReportGenerator';
import './SupplierManagement.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [viewProductsModalVisible, setViewProductsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    supplierType: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [sortOrder, setSortOrder] = useState({
    field: 'createdAt',
    order: 'descend'
  });
  const screens = useBreakpoint();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Helper functions
  const getStatusConfig = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'green', text: 'Active', icon: '✅' },
      INACTIVE: { color: 'red', text: 'Inactive', icon: '⏸️' },
      ON_HOLD: { color: 'orange', text: 'On Hold', icon: '⏳' },
      BLACKLISTED: { color: 'red', text: 'Blacklisted', icon: '🚫' }
    };
    return statusConfig[status] || { color: 'default', text: status, icon: '❓' };
  };

  const getTypeConfig = (type) => {
    const typeConfig = {
      FUEL_WHOLESALER: { color: 'blue', text: 'Wholesaler', icon: '⛽' },
      FUEL_REFINERY: { color: 'volcano', text: 'Refinery', icon: '🏭' },
      OIL_COMPANY: { color: 'orange', text: 'Oil Co', icon: '🛢️' },
      DISTRIBUTOR: { color: 'green', text: 'Distributor', icon: '🚚' },
      RETAIL_SUPPLIER: { color: 'purple', text: 'Retail', icon: '🏪' },
      EQUIPMENT_VENDOR: { color: 'cyan', text: 'Equipment', icon: '🔧' },
      SERVICE_PROVIDER: { color: 'geekblue', text: 'Service', icon: '🔨' },
      GENERAL_SUPPLIER: { color: 'gray', text: 'General', icon: '📦' }
    };
    return typeConfig[type] || { color: 'default', text: type, icon: '📋' };
  };

  // Fetch suppliers and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await supplierService.getSuppliers({
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: sortOrder.field,
        sortOrder: sortOrder.order === 'descend' ? 'desc' : 'asc'
      });

      console.log('Fetched suppliers response:', response);
      
      if (response.data && response.pagination) {
        setSuppliers(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total
        }));
      } else {
        setSuppliers(response || []);
      }
      
      // Fetch stats separately
      const statsData = await supplierService.getSupplierStats();
      setStats(statsData);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, pagination.current, pagination.pageSize, sortOrder]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle pagination change
  const handleTableChange = (paginationConfig, filters, sorter) => {
    setPagination(paginationConfig);
    if (sorter && sorter.field) {
      setSortOrder({
        field: sorter.field,
        order: sorter.order || 'descend'
      });
    }
  };

  // Enhanced suppliers data for reporting
  const enhancedSuppliers = useMemo(() => 
    suppliers.map((supplier, index) => ({
      ...supplier,
      sequentialNumber: index + 1,
      formattedContact: `${supplier.contactPerson || 'N/A'}`,
      formattedPhone: supplier.phone || 'N/A',
      formattedEmail: supplier.email || 'N/A',
      formattedLocation: `${supplier.city || ''}${supplier.city && supplier.country ? ', ' : ''}${supplier.country || ''}`.trim() || 'N/A',
      statusDisplay: getStatusConfig(supplier.status).text,
      typeDisplay: getTypeConfig(supplier.supplierType).text,
      productsCount: supplier.supplierProducts ? supplier.supplierProducts.length : 0,
      activeProductsCount: supplier.supplierProducts ? supplier.supplierProducts.filter(p => p.status === 'ACTIVE').length : 0,
      creditLimitDisplay: `KES ${(supplier.creditLimit || 0).toLocaleString()}`,
      timestamp: new Date(supplier.createdAt).getTime()
    })),
  [suppliers]);

  // ==================== REPORT GENERATION ====================

  // Prepare supplier report data - COMPACT columns
  const prepareSupplierReportData = (data) => {
    return data.map((item, index) => ({
      '#': index + 1,
      'Supplier Name': item.name,
      'Code': item.code,
      'Type': item.typeDisplay,
      'Status': item.statusDisplay,
      'Contact Person': item.contactPerson || 'N/A',
      'Email': item.email || 'N/A',
      'Phone': item.phone || 'N/A',
      'City': item.city || 'N/A',
      'Country': item.country || 'N/A',
      'Products': item.productsCount,
      'Credit Limit': item.creditLimit || 0,
      'Rating': item.rating || 0,
      'Tax ID': item.taxId || 'N/A',
      'Payment Terms': item.paymentTerms || 'N/A'
    }));
  };

  // Get supplier report columns - COMPACT
  const getSupplierReportColumns = () => [
    { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
    { title: 'Supplier Name', dataIndex: 'Supplier Name', key: 'name', width: 150, type: 'text' },
    { title: 'Code', dataIndex: 'Code', key: 'code', width: 80, type: 'text' },
    { title: 'Type', dataIndex: 'Type', key: 'type', width: 100, type: 'text' },
    { title: 'Status', dataIndex: 'Status', key: 'status', width: 80, type: 'text' },
    { title: 'Contact Person', dataIndex: 'Contact Person', key: 'contact', width: 120, type: 'text' },
    { title: 'Email', dataIndex: 'Email', key: 'email', width: 150, type: 'email' },
    { title: 'Phone', dataIndex: 'Phone', key: 'phone', width: 100, type: 'phone' },
    { title: 'City', dataIndex: 'City', key: 'city', width: 100, type: 'text' },
    { title: 'Products', dataIndex: 'Products', key: 'products', width: 80, type: 'number' },
    { title: 'Credit Limit', dataIndex: 'Credit Limit', key: 'credit', width: 100, type: 'currency' },
    { title: 'Rating', dataIndex: 'Rating', key: 'rating', width: 70, type: 'number' }
  ];

  // Calculate supplier report summary
  const calculateSupplierSummary = (data) => {
    const totalProducts = data.reduce((sum, s) => sum + (s.productsCount || 0), 0);
    const totalCreditLimit = data.reduce((sum, s) => sum + (s.creditLimit || 0), 0);
    const avgRating = data.reduce((sum, s) => sum + (s.rating || 0), 0) / (data.length || 1);
    
    return {
      'Report Type': 'Supplier Management Report',
      'Total Suppliers': data.length,
      'Active Suppliers': data.filter(s => s.status === 'ACTIVE').length,
      'On Hold Suppliers': data.filter(s => s.status === 'ON_HOLD').length,
      'Total Products': totalProducts,
      'Total Credit Limit': `KES ${totalCreditLimit.toLocaleString()}`,
      'Average Rating': avgRating.toFixed(1),
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE')
    };
  };

  // Handle generate report
  const handleGenerateReport = () => {
    if (suppliers.length === 0) {
      message.warning('No supplier data to export');
      return;
    }

    const reportData = prepareSupplierReportData(enhancedSuppliers);
    const reportColumns = getSupplierReportColumns();
    const summaryData = calculateSupplierSummary(enhancedSuppliers);
    
    const title = `Supplier Report - ${new Date().toLocaleDateString('en-KE')}`;
    const fileName = `suppliers_${new Date().toISOString().split('T')[0]}`;
    
    const config = {
      dataSource: reportData,
      columns: reportColumns,
      summaryData: summaryData,
      title: title,
      fileName: fileName,
      reportType: 'default',
      companyName: "Lynx Energy System",
      showFooter: true,
      footerText: `Generated from Lynx Energy | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      showGrandTotals: true
    };
    
    setReportConfig(config);
    setReportModalVisible(true);
  };

  const handleReportComplete = (format) => {
    message.success(`Supplier report generated successfully as ${format.toUpperCase()}!`);
    setReportModalVisible(false);
    setReportConfig(null);
  };

  // Handle supplier actions
  const handleViewSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    Modal.info({
      title: 'Supplier Details',
      width: 600,
      content: (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Name" span={2}>{supplier.name}</Descriptions.Item>
          <Descriptions.Item label="Code">{supplier.code}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={getTypeConfig(supplier.supplierType).color}>
              {getTypeConfig(supplier.supplierType).text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusConfig(supplier.status).color}>
              {getStatusConfig(supplier.status).text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Contact Person">{supplier.contactPerson || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Email">{supplier.email || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{supplier.phone || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{supplier.mobile || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="City">{supplier.city || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Country">{supplier.country || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{supplier.address || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Tax ID">{supplier.taxId || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Payment Terms">{supplier.paymentTerms || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Credit Limit" span={2}>
            <Text strong>KES {(supplier.creditLimit || 0).toLocaleString()}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Products" span={2}>
            <Badge count={supplier.supplierProducts?.length || 0} showZero />
          </Descriptions.Item>
        </Descriptions>
      ),
      okText: 'Close'
    });
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setUpdateModalVisible(true);
  };

  const handleDeleteSupplier = async (supplier) => {
    Modal.confirm({
      title: 'Delete Supplier',
      content: (
        <div>
          <p>Are you sure you want to delete <strong>{supplier.name}</strong>?</p>
          {supplier.supplierProducts?.length > 0 && (
            <p style={{ color: '#ff4d4f', fontSize: '12px', marginBottom: 0 }}>
              ⚠️ This supplier has {supplier.supplierProducts.length} associated product(s)
            </p>
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await supplierService.deleteSupplier(supplier.id);
          message.success('Supplier deleted successfully');
          fetchData();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  const handleViewProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setViewProductsModalVisible(true);
  };

  const handleAddProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setProductsModalVisible(true);
  };

  // Table columns - COMPACT and OPTIMIZED
  const columns = [
    {
      title: '#',
      key: 'index',
      render: (_, __, index) => (
        <Text style={{ fontSize: '11px', color: '#999' }}>
          {((pagination.current - 1) * pagination.pageSize) + index + 1}
        </Text>
      ),
      width: 40,
      fixed: false
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <Space size={4}>
          <Avatar 
            size="small"
            style={{ 
              backgroundColor: getStatusConfig(record.status).color === 'green' ? '#52c41a' :
                              getStatusConfig(record.status).color === 'red' ? '#f5222d' :
                              getStatusConfig(record.status).color === 'orange' ? '#fa8c16' : '#1890ff',
              fontSize: '11px',
              width: 22,
              height: 22,
              lineHeight: '22px'
            }}
          >
            {record.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ lineHeight: '1.2' }}>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: '10px', color: '#999' }}>{record.code}</div>
          </div>
        </Space>
      ),
      width: 180,
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Type',
      dataIndex: 'supplierType',
      key: 'type',
      render: (type) => {
        const config = getTypeConfig(type);
        return (
          <Tooltip title={type}>
            <Tag color={config.color} style={{ fontSize: '10px', margin: 0 }}>
              {config.icon} {config.text}
            </Tag>
          </Tooltip>
        );
      },
      width: 90,
      sorter: (a, b) => a.supplierType.localeCompare(b.supplierType)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} style={{ fontSize: '10px', margin: 0 }}>
            {config.icon} {config.text}
          </Tag>
        );
      },
      width: 80,
      sorter: (a, b) => a.status.localeCompare(b.status)
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ lineHeight: '1.2' }}>
          {record.email && (
            <div style={{ fontSize: '11px' }}>
              <MailOutlined style={{ fontSize: '10px', color: '#1890ff', marginRight: 2 }} />
              <a href={`mailto:${record.email}`} style={{ fontSize: '11px' }}>
                {record.email.length > 15 ? record.email.substring(0, 12) + '...' : record.email}
              </a>
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
      width: 150
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ lineHeight: '1.2' }}>
          {record.city && (
            <div style={{ fontSize: '11px' }}>
              <EnvironmentOutlined style={{ fontSize: '10px', color: '#fa8c16', marginRight: 2 }} />
              <span>{record.city}</span>
            </div>
          )}
          {record.country && (
            <Text type="secondary" style={{ fontSize: '10px', marginLeft: 12 }}>
              {record.country}
            </Text>
          )}
        </Space>
      ),
      width: 120
    },
    {
      title: 'Products',
      key: 'products',
      align: 'center',
      render: (_, record) => {
        const count = record.supplierProducts?.length || 0;
        return (
          <Badge 
            count={count} 
            size="small"
            style={{ 
              backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9',
              fontSize: '10px'
            }}
          />
        );
      },
      width: 60,
      sorter: (a, b) => (b.supplierProducts?.length || 0) - (a.supplierProducts?.length || 0)
    },
    {
      title: 'Credit',
      key: 'credit',
      align: 'right',
      render: (_, record) => (
        <Text style={{ fontSize: '11px', fontWeight: 500 }}>
          KES {(record.creditLimit || 0).toLocaleString()}
        </Text>
      ),
      width: 90,
      sorter: (a, b) => (b.creditLimit || 0) - (a.creditLimit || 0)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View',
                icon: <EyeOutlined style={{ fontSize: '12px' }} />,
                onClick: () => handleViewSupplier(record)
              },
              {
                key: 'products',
                label: 'Products',
                icon: <ShoppingOutlined style={{ fontSize: '12px' }} />,
                onClick: () => handleViewProducts(record)
              },
              {
                key: 'add-products',
                label: 'Add Products',
                icon: <PlusOutlined style={{ fontSize: '12px' }} />,
                onClick: () => handleAddProducts(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined style={{ fontSize: '12px' }} />,
                onClick: () => handleEditSupplier(record)
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined style={{ fontSize: '12px' }} />,
                danger: true,
                onClick: () => handleDeleteSupplier(record)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button 
            type="text" 
            icon={<MoreOutlined style={{ fontSize: '14px' }} />}
            size="small"
            style={{ padding: '0 4px' }}
          />
        </Dropdown>
      )
    }
  ];

  // Calculate total width - should fit without horizontal scroll
  const totalTableWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0);

  // Mobile card view - COMPACT
  const renderMobileCard = (supplier, index) => (
    <Card 
      key={supplier.id} 
      size="small" 
      style={{ marginBottom: 8 }}
      bodyStyle={{ padding: '8px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space direction="vertical" size={2} style={{ flex: 1 }}>
          <Space size={4}>
            <Badge 
              count={index + 1}
              style={{ 
                backgroundColor: '#1890ff',
                fontSize: '9px',
                height: '16px',
                width: '16px',
                lineHeight: '16px',
                padding: 0
              }}
            />
            <Avatar size="small" style={{ width: 20, height: 20, lineHeight: '20px', fontSize: '10px' }}>
              {supplier.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: '12px' }}>{supplier.name}</Text>
              <div>
                <Tag color="blue" style={{ fontSize: '9px', marginRight: 2 }}>{supplier.code}</Tag>
                <Tag color={getTypeConfig(supplier.supplierType).color} style={{ fontSize: '9px' }}>
                  {getTypeConfig(supplier.supplierType).icon}
                </Tag>
              </div>
            </div>
          </Space>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 4 }}>
            {supplier.email && (
              <Tag icon={<MailOutlined />} color="blue" style={{ fontSize: '9px', margin: 0 }}>
                {supplier.email.substring(0, 12)}...
              </Tag>
            )}
            {supplier.phone && (
              <Tag icon={<PhoneOutlined />} color="green" style={{ fontSize: '9px', margin: 0 }}>
                {supplier.phone}
              </Tag>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Tag color={getStatusConfig(supplier.status).color} style={{ fontSize: '9px', margin: 0 }}>
              {getStatusConfig(supplier.status).icon} {getStatusConfig(supplier.status).text}
            </Tag>
            <Badge 
              count={supplier.supplierProducts?.length || 0} 
              size="small"
              style={{ fontSize: '9px' }}
            />
          </div>
        </Space>
        
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View',
                icon: <EyeOutlined />,
                onClick: () => handleViewSupplier(supplier)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditSupplier(supplier)
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDeleteSupplier(supplier)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      </div>
    </Card>
  );

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      supplierType: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSortOrder({
      field: 'createdAt',
      order: 'descend'
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilterDrawerVisible(false);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchData();
    message.success('Data refreshed successfully');
  };

  // Export data function
  const handleExport = (format) => {
    switch(format) {
      case 'excel':
        handleGenerateReport();
        break;
      case 'pdf':
        handleGenerateReport();
        break;
      case 'csv':
        handleGenerateReport();
        break;
      default:
        handleGenerateReport();
    }
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return filters.search || filters.status || filters.supplierType;
  };

  // Export dropdown items
  const exportItems = [
    {
      key: 'excel',
      label: 'Excel (.xlsx)',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />
    },
    {
      key: 'pdf',
      label: 'PDF (.pdf)',
      icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />
    },
    {
      key: 'csv',
      label: 'CSV (.csv)',
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />
    }
  ];

  return (
    <div className="supplier-management" style={{ padding: '12px' }}>
      {/* Header with Actions - COMPACT */}
      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={16}>
          <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
            <TeamOutlined style={{ marginRight: 6, fontSize: '18px' }} /> 
            Suppliers
          </Title>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {pagination.total} suppliers • {stats.activeSuppliers || 0} active
          </Text>
        </Col>
        <Col xs={24} md={8}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }} size={4}>
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="Generate Report">
              <Button
                icon={<FileTextOutlined />}
                onClick={handleGenerateReport}
                size="small"
                disabled={suppliers.length === 0}
              />
            </Tooltip>
            
            <Dropdown
              menu={{
                items: exportItems,
                onClick: ({ key }) => handleExport(key)
              }}
              placement="bottomRight"
              disabled={suppliers.length === 0}
            >
              <Button icon={<DownloadOutlined />} size="small" />
            </Dropdown>
            
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size="small"
            >
              Add
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Quick Stats - COMPACT */}
      <Row gutter={[4, 4]} style={{ marginBottom: 12 }}>
        {[
          { key: 'total', title: 'Total', value: stats.totalSuppliers || 0, color: '#1890ff' },
          { key: 'active', title: 'Active', value: stats.activeSuppliers || 0, color: '#52c41a' },
          { key: 'withProducts', title: 'With Products', value: stats.suppliersWithProducts || 0, color: '#722ed1' },
          { key: 'onHold', title: 'On Hold', value: stats.onHoldSuppliers || 0, color: '#fa8c16' },
        ].map(stat => (
          <Col xs={6} key={stat.key}>
            <Card size="small" bodyStyle={{ padding: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '9px', color: '#666' }}>{stat.title}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters Section - COMPACT */}
      <Card 
        size="small"
        style={{ marginBottom: 12 }}
        bodyStyle={{ padding: '8px' }}
      >
        <Row gutter={[4, 4]} align="middle">
          {/* Search Input */}
          <Col xs={24} sm={12}>
            <Input
              placeholder="Search suppliers..."
              allowClear
              prefix={<SearchOutlined style={{ fontSize: '12px' }} />}
              size="small"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>

          {/* Filter Actions */}
          <Col xs={24} sm={12}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }} size={4}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerVisible(true)}
                size="small"
              >
                Filters
              </Button>
              {hasActiveFilters() && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearFilters}
                  size="small"
                />
              )}
            </Space>
          </Col>

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <Col xs={24} style={{ marginTop: 4 }}>
              <Space wrap size={[2, 2]}>
                <Text type="secondary" style={{ fontSize: '10px' }}>Active:</Text>
                {filters.search && (
                  <Tag closable onClose={() => handleFilterChange('search', '')} size="small" style={{ fontSize: '9px' }}>
                    "{filters.search}"
                  </Tag>
                )}
                {filters.status && (
                  <Tag closable onClose={() => handleFilterChange('status', '')} size="small" style={{ fontSize: '9px' }}>
                    {getStatusConfig(filters.status).text}
                  </Tag>
                )}
                {filters.supplierType && (
                  <Tag closable onClose={() => handleFilterChange('supplierType', '')} size="small" style={{ fontSize: '9px' }}>
                    {getTypeConfig(filters.supplierType).text}
                  </Tag>
                )}
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Suppliers Table - COMPACT */}
      <Card
        size="small"
        bodyStyle={{ padding: 0 }}
      >
        {screens.lg || mobileView === 'list' ? (
          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: false,
              showQuickJumper: false,
              size: 'small',
              simple: screens.xs
            }}
            onChange={handleTableChange}
            scroll={{ x: totalTableWidth }}
            size="small"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div style={{ padding: '16px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>No suppliers found</Text>
                      <div style={{ marginTop: 8 }}>
                        <Button 
                          type="primary" 
                          onClick={() => setCreateModalVisible(true)}
                          icon={<PlusOutlined />}
                          size="small"
                        >
                          Add Supplier
                        </Button>
                      </div>
                    </div>
                  }
                />
              )
            }}
          />
        ) : (
          <div style={{ padding: '8px' }}>
            {suppliers.length > 0 ? (
              suppliers.map((supplier, index) => renderMobileCard(supplier, index))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ padding: '16px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>No suppliers found</Text>
                  </div>
                }
              />
            )}
          </div>
        )}
      </Card>

      {/* Filter Drawer for Mobile */}
      <Drawer
        title={
          <Space size={4}>
            <FilterOutlined />
            <Text style={{ fontSize: '14px' }}>Filter Suppliers</Text>
          </Space>
        }
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={300}
        extra={
          <Button type="text" icon={<ClearOutlined />} onClick={clearFilters} size="small">
            Clear
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>Status</Text>
            <Select
              placeholder="Select Status"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              size="small"
            >
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="ON_HOLD">On Hold</Option>
              <Option value="BLACKLISTED">Blacklisted</Option>
            </Select>
          </div>

          <div>
            <Text style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>Supplier Type</Text>
            <Select
              placeholder="Select Type"
              allowClear
              style={{ width: '100%' }}
              value={filters.supplierType}
              onChange={(value) => handleFilterChange('supplierType', value)}
              size="small"
            >
              <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
              <Option value="FUEL_REFINERY">Refinery</Option>
              <Option value="OIL_COMPANY">Oil Company</Option>
              <Option value="DISTRIBUTOR">Distributor</Option>
              <Option value="RETAIL_SUPPLIER">Retail Supplier</Option>
              <Option value="EQUIPMENT_VENDOR">Equipment Vendor</Option>
              <Option value="SERVICE_PROVIDER">Service Provider</Option>
              <Option value="GENERAL_SUPPLIER">General Supplier</Option>
            </Select>
          </div>

          <Button 
            type="primary" 
            onClick={() => setFilterDrawerVisible(false)} 
            block
            size="small"
          >
            Apply Filters
          </Button>
        </Space>
      </Drawer>

      {/* Modals */}
      <CreateSupplierModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchData();
          message.success('Supplier created successfully');
        }}
      />

      <UpdateSupplierModal
        visible={updateModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setUpdateModalVisible(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => {
          setUpdateModalVisible(false);
          setSelectedSupplier(null);
          fetchData();
          message.success('Supplier updated successfully');
        }}
      />

      <CreateSupplierProductModal
        visible={productsModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setProductsModalVisible(false);
          setSelectedSupplier(null);
        }}
        onSuccess={() => {
          setProductsModalVisible(false);
          setSelectedSupplier(null);
          fetchData();
          message.success('Products added successfully');
        }}
      />

      <SupplierProductsModal
        visible={viewProductsModalVisible}
        supplier={selectedSupplier}
        onCancel={() => {
          setViewProductsModalVisible(false);
          setSelectedSupplier(null);
        }}
        onRefresh={fetchData}
      />

      {/* Report Generator Modal */}
      {reportModalVisible && reportConfig && (
        <Modal
          title={
            <Space size={8}>
              <FileTextOutlined />
              <span style={{ fontSize: '16px' }}>Supplier Report</span>
              <Badge count={reportConfig.dataSource.length} style={{ backgroundColor: '#1890ff' }} />
            </Space>
          }
          open={reportModalVisible}
          onCancel={() => {
            setReportModalVisible(false);
            setReportConfig(null);
          }}
          width="90%"
          style={{ top: 20 }}
          footer={null}
          destroyOnClose
        >
          <div style={{ padding: '12px 0' }}>
            <AdvancedReportGenerator
              key={`supplier-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={handleReportComplete}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupplierManagement;