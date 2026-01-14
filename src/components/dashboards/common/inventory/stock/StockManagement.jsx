// src/pages/inventory/stock/StockManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Popconfirm,
  message,
  Alert,
  Modal,
  Form,
  Descriptions,
  Badge,
  Tabs,
  DatePicker,
  Upload
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  PrinterOutlined,
  EyeOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  StockOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import StockAdjustmentModal from './StockAdjustmentModal';
import StockDetailsModal from './StockDetailsModal';
import StockTransferModal from './StockTransferModal';
import { useAuth } from '../../../contexts/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const StockManagement = ({ filters, onRefresh }) => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [alerts, setAlerts] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    productId: undefined,
    status: undefined,
    batchNumber: undefined,
    expiringSoon: false,
    expired: false
  });
  const { user } = useAuth();

  // Load warehouses and initial stock
  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadStock();
      loadAlerts();
    }
  }, [selectedWarehouse, searchFilters, pagination.current]);

  const loadWarehouses = () => {
    const userWarehouses = user?.station?.warehouses || [];
    setWarehouses(userWarehouses);
    if (userWarehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(userWarehouses[0].id);
    }
  };

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const result = await nonFuelPurchaseService.getWarehouseStock(
        selectedWarehouse,
        {
          ...searchFilters,
          page: pagination.current,
          limit: pagination.pageSize
        }
      );

      const formattedStock = result.stock.map(item => 
        nonFuelPurchaseService.formatWarehouseStock(item)
      );
      
      setStock(formattedStock);
      setPagination({
        ...pagination,
        total: result.totals?.totalItems || 0
      });
    } catch (error) {
      message.error('Failed to load stock: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, searchFilters, pagination.current, pagination.pageSize]);

  const loadAlerts = async () => {
    try {
      const result = await nonFuelPurchaseService.getStockAlerts(selectedWarehouse);
      setAlerts(result);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async (itemId, adjustmentData) => {
    try {
      // This would call a new API endpoint for stock adjustments
      message.success('Stock adjusted successfully');
      loadStock();
      onRefresh?.();
    } catch (error) {
      message.error('Failed to adjust stock: ' + error.message);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Warehouse Stock Report', 20, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Add warehouse info
    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    doc.text(`Warehouse: ${warehouse?.name || 'Unknown'}`, 20, 40);
    
    // Prepare table data
    const tableData = stock.map(item => [
      item.productName,
      item.batchNumber || 'N/A',
      item.availableQty,
      item.unit,
      `KES ${item.avgUnitCost?.toLocaleString() || '0'}`,
      item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
      item.stockStatus
    ]);
    
    // Add table
    doc.autoTable({
      head: [['Product', 'Batch', 'Qty', 'Unit', 'Unit Cost', 'Expiry', 'Status']],
      body: tableData,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Add summary
    const totalValue = stock.reduce((sum, item) => 
      sum + (item.availableQty * (item.avgUnitCost || 0)), 0
    );
    
    doc.setFontSize(10);
    doc.text(`Total Items: ${stock.length}`, 20, doc.lastAutoTable.finalY + 10);
    doc.text(`Total Value: KES ${totalValue.toLocaleString()}`, 20, doc.lastAutoTable.finalY + 20);
    
    // Save PDF
    doc.save(`stock-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = nonFuelPurchaseService.prepareStockExportData(stock);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    XLSX.writeFile(wb, `stock-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Columns for stock table
  const columns = [
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      fixed: 'left',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.categoryName} • {record.unit}
          </div>
        </div>
      )
    },
    {
      title: 'Batch',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      render: (text) => text || <Tag color="default">No batch</Tag>
    },
    {
      title: 'Available',
      dataIndex: 'availableQty',
      key: 'availableQty',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <div>
            <Tag color={record.isCritical ? 'red' : record.isLowStock ? 'orange' : 'green'}>
              {text}
            </Tag>
            {record.reservedQty > 0 && (
              <Tag color="blue">Reserved: {record.reservedQty}</Tag>
            )}
          </div>
          {record.minStock > 0 && (
            <Progress 
              percent={Math.min((text / record.minStock) * 100, 100)} 
              size="small" 
              showInfo={false}
              status={text <= record.reorderPoint ? 'exception' : 'normal'}
            />
          )}
        </Space>
      )
    },
    {
      title: 'Unit Cost',
      key: 'unitCost',
      render: (_, record) => `KES ${record.avgUnitCost?.toLocaleString() || '0'}`
    },
    {
      title: 'Stock Value',
      key: 'stockValue',
      render: (_, record) => `KES ${record.stockValue?.toLocaleString() || '0'}`
    },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_, record) => (
        <div>
          {record.expiryDate ? (
            <Tag color={record.isExpired ? 'red' : '#108ee9'}>
              {record.formattedExpiryDate}
            </Tag>
          ) : (
            <Tag color="default">No expiry</Tag>
          )}
          {record.expiryStatus !== 'N/A' && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              {record.expiryStatus}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.statusColor}>
          {record.stockStatus}
        </Tag>
      )
    },
    {
      title: 'Location',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
      render: (text) => text || 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedItem(record);
                setShowDetailsModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Adjust Stock">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedItem(record);
                setShowAdjustModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Transfer">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => {
                setSelectedItem(record);
                setShowTransferModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="History">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => {
                // Navigate to item history
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="stock-management">
      {/* Header with Stats */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Warehouse Stock Management</h3>
              <Space>
                <Button icon={<DownloadOutlined />} onClick={exportToExcel}>
                  Excel
                </Button>
                <Button icon={<PrinterOutlined />} onClick={exportToPDF}>
                  PDF
                </Button>
                <Button type="primary" icon={<BarChartOutlined />}>
                  Analytics
                </Button>
              </Space>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <Select
              placeholder="Select Warehouse"
              style={{ width: '100%' }}
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
            >
              {warehouses.map(warehouse => (
                <Option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} md={8}>
            <Search
              placeholder="Search products..."
              allowClear
              onSearch={(value) => setSearchFilters(prev => ({ ...prev, search: value }))}
            />
          </Col>
          
          <Col xs={24} md={8}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              mode="multiple"
              allowClear
              onChange={(value) => setSearchFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="AVAILABLE">Available</Option>
              <Option value="LOW_STOCK">Low Stock</Option>
              <Option value="OUT_OF_STOCK">Out of Stock</Option>
              <Option value="EXPIRED">Expired</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Alerts Summary */}
      {alerts.criticalCount > 0 && (
        <Alert
          message={
            <Space>
              <WarningOutlined />
              <span>Critical Alerts: {alerts.criticalCount}</span>
              <span>Warning Alerts: {alerts.warningCount}</span>
            </Space>
          }
          description="There are critical stock alerts that require immediate attention."
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => {}}>
              View Alerts
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Stock Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Items"
              value={pagination.total}
              prefix={<StockOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Value"
              value={stock.reduce((sum, item) => sum + (item.stockValue || 0), 0)}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Low Stock"
              value={alerts.warningCount || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Critical"
              value={alerts.criticalCount || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Stock Table */}
      <Card title={
        <Space>
          <span>Stock Items ({pagination.total})</span>
          {selectedWarehouse && (
            <Tag color="blue">{warehouses.find(w => w.id === selectedWarehouse)?.name}</Tag>
          )}
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={stock}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => setPagination(prev => ({ ...prev, current: page })),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: 1500 }}
          rowClassName={(record) => {
            if (record.isExpired) return 'expired-row';
            if (record.isCritical) return 'critical-row';
            if (record.isLowStock) return 'lowstock-row';
            return '';
          }}
        />
      </Card>

      {/* Modals */}
      {selectedItem && (
        <>
          <StockDetailsModal
            item={selectedItem}
            warehouseId={selectedWarehouse}
            visible={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedItem(null);
            }}
          />
          
          <StockAdjustmentModal
            item={selectedItem}
            warehouseId={selectedWarehouse}
            visible={showAdjustModal}
            onClose={() => {
              setShowAdjustModal(false);
              setSelectedItem(null);
            }}
            onSuccess={handleStockAdjustment}
          />
          
          <StockTransferModal
            item={selectedItem}
            warehouseId={selectedWarehouse}
            visible={showTransferModal}
            onClose={() => {
              setShowTransferModal(false);
              setSelectedItem(null);
            }}
            onSuccess={() => {
              message.success('Stock transfer initiated');
              loadStock();
            }}
          />
        </>
      )}
    </div>
  );
};

export default StockManagement;