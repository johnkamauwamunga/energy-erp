// src/pages/inventory/reports/ReportingManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  DatePicker,
  Select,
  Statistic,
  Table,
  Progress,
  Alert,
  Tabs,
  Input,
  Form,
  Divider,
  Tag,
  Badge
} from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const ReportingManagement = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState(null);
  const [filters, setFilters] = useState({
    stationId: undefined,
    supplierId: undefined,
    warehouseId: undefined,
    status: undefined
  });
  const [reportData, setReportData] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      let data;
      
      switch (reportType) {
        case 'summary':
          data = await nonFuelPurchaseService.getPurchaseSummaryReport({
            ...filters,
            startDate: dateRange?.[0]?.toISOString(),
            endDate: dateRange?.[1]?.toISOString()
          });
          break;
          
        case 'detailed':
          data = await nonFuelPurchaseService.getDetailedPurchaseReport({
            ...filters,
            startDate: dateRange?.[0]?.toISOString(),
            endDate: dateRange?.[1]?.toISOString()
          });
          break;
          
        case 'receivings':
          // This would be a custom report for receivings
          const receivings = await nonFuelPurchaseService.getReceivings({
            ...filters,
            startDate: dateRange?.[0]?.toISOString(),
            endDate: dateRange?.[1]?.toISOString()
          });
          data = {
            data: receivings.data,
            summary: {
              totalReceivings: receivings.pagination?.total || 0,
              totalValue: receivings.data?.reduce((sum, r) => sum + (r.payableAmount || 0), 0) || 0
            }
          };
          break;
          
        case 'stock':
          // This would be a custom report for stock
          // For demo, using warehouse stock
          const stock = await nonFuelPurchaseService.getWarehouseStock('', {});
          data = {
            data: stock.stock || [],
            summary: stock.totals
          };
          break;
      }
      
      setReportData(data);
      calculateSummaryStats(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummaryStats = (data) => {
    if (!data) return;
    
    let stats = {};
    
    switch (reportType) {
      case 'summary':
        stats = {
          totalPurchases: data.purchaseCount || 0,
          totalAmount: data.totals?.totalAmount || 0,
          totalItems: data.totals?.totalItems || 0,
          averagePurchase: data.purchaseCount > 0 ? data.totals?.totalAmount / data.purchaseCount : 0
        };
        break;
        
      case 'detailed':
        stats = {
          totalPurchases: data.purchaseCount || 0,
          totalAmount: data.purchases?.reduce((sum, p) => sum + (p.netPayable || 0), 0) || 0,
          averagePurchase: data.purchaseCount > 0 ? 
            data.purchases?.reduce((sum, p) => sum + (p.netPayable || 0), 0) / data.purchaseCount : 0
        };
        break;
        
      case 'receivings':
        stats = {
          totalReceivings: data.summary?.totalReceivings || 0,
          totalValue: data.summary?.totalValue || 0,
          averageValue: data.summary?.totalReceivings > 0 ? 
            data.summary?.totalValue / data.summary?.totalReceivings : 0
        };
        break;
        
      case 'stock':
        stats = {
          totalItems: data.summary?.totalItems || 0,
          totalValue: data.summary?.totalValue || 0,
          lowStockItems: data.summary?.lowStockItems || 0,
          expiredItems: data.data?.filter(item => item.isExpired)?.length || 0
        };
        break;
    }
    
    setSummaryStats(stats);
  };

  useEffect(() => {
    loadReport();
  }, [reportType, dateRange, filters]);

  const exportToPDF = () => {
    if (!reportData) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text(`${reportType.toUpperCase()} Report`, 20, 20);
    
    // Filters
    doc.setFontSize(10);
    doc.text(`Date Range: ${dateRange?.[0]?.format('YYYY-MM-DD') || 'All'} to ${dateRange?.[1]?.format('YYYY-MM-DD') || 'All'}`, 20, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
    
    let tableData = [];
    let headers = [];
    
    switch (reportType) {
      case 'summary':
        headers = ['Supplier', 'Purchases', 'Amount', 'Items', 'Average'];
        tableData = reportData.supplierSummary?.map(s => [
          s.supplierName,
          s.purchaseCount,
          `KES ${s.totalAmount?.toLocaleString()}`,
          s.totalItems,
          `KES ${Math.round(s.totalAmount / s.purchaseCount)?.toLocaleString()}`
        ]) || [];
        break;
        
      case 'detailed':
        headers = ['Purchase #', 'Date', 'Supplier', 'Amount', 'Status', 'Items'];
        tableData = reportData.purchases?.slice(0, 50).map(p => [
          p.purchaseNumber,
          new Date(p.purchaseDate).toLocaleDateString(),
          p.supplier?.name,
          `KES ${p.netPayable?.toLocaleString()}`,
          p.status,
          p.items?.length || 0
        ]) || [];
        break;
        
      case 'receivings':
        headers = ['Receiving #', 'Date', 'Purchase #', 'Supplier', 'Items', 'Amount', 'Status'];
        tableData = reportData.data?.slice(0, 50).map(r => [
          r.receivingNumber,
          new Date(r.deliveryTime).toLocaleDateString(),
          r.purchase?.purchaseNumber,
          r.purchase?.supplier?.name,
          `${r.receivedTotalItems || 0}/${r.expectedTotalItems || 0}`,
          `KES ${r.payableAmount?.toLocaleString()}`,
          r.status
        ]) || [];
        break;
        
      case 'stock':
        headers = ['Product', 'Batch', 'Available', 'Unit', 'Unit Cost', 'Value', 'Status', 'Expiry'];
        tableData = reportData.data?.slice(0, 50).map(item => [
          item.product?.name,
          item.batchNumber || 'N/A',
          item.availableQty,
          item.product?.unit,
          `KES ${item.avgUnitCost?.toLocaleString()}`,
          `KES ${(item.availableQty * item.avgUnitCost)?.toLocaleString()}`,
          item.stockStatus,
          item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'
        ]) || [];
        break;
    }
    
    // Add table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Add summary
    if (summaryStats) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text('Summary:', 20, finalY);
      
      let y = finalY + 10;
      Object.entries(summaryStats).forEach(([key, value], index) => {
        doc.text(`${key.replace(/([A-Z])/g, ' $1').trim()}: ${typeof value === 'number' ? 
          (key.includes('Amount') || key.includes('Value') ? `KES ${value.toLocaleString()}` : value) : 
          value}`, 20, y + (index * 5));
      });
    }
    
    doc.save(`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;
    
    let data = [];
    
    switch (reportType) {
      case 'summary':
        data = reportData.supplierSummary?.map(s => ({
          'Supplier': s.supplierName,
          'Purchases': s.purchaseCount,
          'Total Amount': s.totalAmount,
          'Total Items': s.totalItems,
          'Average Purchase': Math.round(s.totalAmount / s.purchaseCount)
        })) || [];
        break;
        
      case 'detailed':
        data = nonFuelPurchaseService.preparePurchaseExportData(reportData.purchases || []);
        break;
        
      case 'stock':
        data = nonFuelPurchaseService.prepareStockExportData(reportData.data || []);
        break;
        
      case 'receivings':
        data = (reportData.data || []).map(r => ({
          'Receiving Number': r.receivingNumber,
          'Date': new Date(r.deliveryTime).toLocaleDateString(),
          'Purchase Number': r.purchase?.purchaseNumber,
          'Supplier': r.purchase?.supplier?.name,
          'Invoice Number': r.supplierInvoiceNumber,
          'Expected Items': r.expectedTotalItems,
          'Received Items': r.receivedTotalItems,
          'Accepted Items': r.acceptedItems,
          'Damaged Items': r.damagedItems,
          'Invoice Amount': r.supplierInvoiceAmount,
          'Payable Amount': r.payableAmount,
          'Status': r.status,
          'Driver': r.driverName,
          'Vehicle': r.deliveryVehiclePlate
        }));
        break;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const reportTypes = [
    {
      key: 'summary',
      label: 'Purchase Summary',
      icon: <BarChartOutlined />,
      description: 'Summary of purchases by supplier'
    },
    {
      key: 'detailed',
      label: 'Detailed Purchases',
      icon: <LineChartOutlined />,
      description: 'Detailed purchase listing'
    },
    {
      key: 'receivings',
      label: 'Receivings',
      icon: <PieChartOutlined />,
      description: 'Goods receiving reports'
    },
    {
      key: 'stock',
      label: 'Stock Report',
      icon: <BarChartOutlined />,
      description: 'Current stock levels and values'
    }
  ];

  return (
    <div className="reporting-management">
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Inventory Reports</h3>
              <Space>
                <Button icon={<FilePdfOutlined />} onClick={exportToPDF}>
                  PDF
                </Button>
                <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>
                  Excel
                </Button>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                  Print
                </Button>
              </Space>
            </div>
          </Col>
          
          <Col span={24}>
            <Space wrap>
              <RangePicker 
                onChange={setDateRange}
                style={{ width: 300 }}
              />
              
              <Select
                placeholder="Status"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <Option value="COMPLETED">Completed</Option>
                <Option value="IN_TRANSIT">In Transit</Option>
                <Option value="PENDING">Pending</Option>
              </Select>
              
              <Select
                placeholder="Report Type"
                style={{ width: 200 }}
                value={reportType}
                onChange={setReportType}
              >
                {reportTypes.map(type => (
                  <Option key={type.key} value={type.key}>
                    <Space>
                      {type.icon}
                      {type.label}
                    </Space>
                  </Option>
                ))}
              </Select>
              
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadReport}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary Statistics */}
      {summaryStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(summaryStats).map(([key, value], index) => (
            <Col key={key} xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title={key.replace(/([A-Z])/g, ' $1').trim()}
                  value={typeof value === 'number' ? 
                    (key.includes('Amount') || key.includes('Value') ? 
                     `KES ${value.toLocaleString()}` : value) : 
                    value}
                  valueStyle={{ 
                    color: index === 0 ? '#1890ff' : 
                           index === 1 ? '#52c41a' : 
                           index === 2 ? '#fa8c16' : '#722ed1'
                  }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Report Content */}
      <Card title={reportTypes.find(t => t.key === reportType)?.label}>
        <Tabs defaultActiveKey="data">
          <TabPane tab="Data View" key="data">
            {reportData?.data?.length > 0 ? (
              <Table
                dataSource={reportData.data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1500 }}
                columns={getReportColumns(reportType)}
              />
            ) : (
              <Alert
                message="No Data"
                description="No data found for the selected filters."
                type="info"
                showIcon
              />
            )}
          </TabPane>
          
          <TabPane tab="Charts" key="charts">
            <Alert
              message="Chart View"
              description="Chart visualizations will be displayed here based on the report data."
              type="info"
              showIcon
            />
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <BarChartOutlined style={{ fontSize: 64, color: '#1890ff' }} />
              <div style={{ marginTop: 16 }}>Chart visualization coming soon</div>
            </div>
          </TabPane>
          
          <TabPane tab="Summary" key="summary">
            {reportData?.summary && (
              <div>
                <Descriptions title="Report Summary" bordered column={2}>
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key.replace(/([A-Z])/g, ' $1').trim()}>
                      {typeof value === 'number' ? 
                        (key.includes('Amount') || key.includes('Value') ? 
                         `KES ${value.toLocaleString()}` : value) : 
                        value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
                
                {reportData.totals && (
                  <div style={{ marginTop: 24 }}>
                    <h4>Totals</h4>
                    <Descriptions bordered column={2}>
                      {Object.entries(reportData.totals).map(([key, value]) => (
                        <Descriptions.Item key={key} label={key.replace(/([A-Z])/g, ' $1').trim()}>
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </div>
                )}
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

// Helper function to get columns for each report type
const getReportColumns = (reportType) => {
  switch (reportType) {
    case 'summary':
      return [
        {
          title: 'Supplier',
          dataIndex: 'supplierName',
          key: 'supplierName'
        },
        {
          title: 'Purchases',
          dataIndex: 'purchaseCount',
          key: 'purchaseCount'
        },
        {
          title: 'Total Amount',
          dataIndex: 'totalAmount',
          key: 'totalAmount',
          render: (amount) => `KES ${amount?.toLocaleString()}`
        },
        {
          title: 'Total Items',
          dataIndex: 'totalItems',
          key: 'totalItems'
        },
        {
          title: 'Average Purchase',
          key: 'average',
          render: (_, record) => 
            `KES ${Math.round(record.totalAmount / record.purchaseCount)?.toLocaleString()}`
        }
      ];
      
    case 'detailed':
      return [
        {
          title: 'Purchase #',
          dataIndex: 'purchaseNumber',
          key: 'purchaseNumber'
        },
        {
          title: 'Date',
          dataIndex: 'purchaseDate',
          key: 'purchaseDate',
          render: (date) => new Date(date).toLocaleDateString()
        },
        {
          title: 'Supplier',
          dataIndex: ['supplier', 'name'],
          key: 'supplier'
        },
        {
          title: 'Amount',
          dataIndex: 'netPayable',
          key: 'netPayable',
          render: (amount) => `KES ${amount?.toLocaleString()}`
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (status) => (
            <Tag color={
              status === 'COMPLETED' ? 'green' :
              status === 'IN_TRANSIT' ? 'blue' :
              status === 'PENDING_APPROVAL' ? 'orange' : 'default'
            }>
              {status}
            </Tag>
          )
        },
        {
          title: 'Items',
          key: 'items',
          render: (_, record) => record.items?.length || 0
        }
      ];
      
    case 'receivings':
      return [
        {
          title: 'Receiving #',
          dataIndex: 'receivingNumber',
          key: 'receivingNumber'
        },
        {
          title: 'Date',
          dataIndex: 'deliveryTime',
          key: 'deliveryTime',
          render: (date) => new Date(date).toLocaleDateString()
        },
        {
          title: 'Purchase #',
          dataIndex: ['purchase', 'purchaseNumber'],
          key: 'purchaseNumber'
        },
        {
          title: 'Supplier',
          dataIndex: ['purchase', 'supplier', 'name'],
          key: 'supplier'
        },
        {
          title: 'Items',
          key: 'items',
          render: (_, record) => 
            `${record.receivedTotalItems || 0}/${record.expectedTotalItems || 0}`
        },
        {
          title: 'Amount',
          dataIndex: 'payableAmount',
          key: 'payableAmount',
          render: (amount) => `KES ${amount?.toLocaleString()}`
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (status) => (
            <Tag color={
              status === 'COMPLETED' ? 'green' :
              status === 'INSPECTION_IN_PROGRESS' ? 'orange' :
              status === 'ARRIVED' ? 'blue' : 'default'
            }>
              {status}
            </Tag>
          )
        }
      ];
      
    case 'stock':
      return [
        {
          title: 'Product',
          dataIndex: ['product', 'name'],
          key: 'product'
        },
        {
          title: 'Batch',
          dataIndex: 'batchNumber',
          key: 'batchNumber',
          render: (text) => text || 'N/A'
        },
        {
          title: 'Available',
          dataIndex: 'availableQty',
          key: 'availableQty'
        },
        {
          title: 'Unit',
          dataIndex: ['product', 'unit'],
          key: 'unit'
        },
        {
          title: 'Unit Cost',
          dataIndex: 'avgUnitCost',
          key: 'avgUnitCost',
          render: (cost) => `KES ${cost?.toLocaleString()}`
        },
        {
          title: 'Value',
          key: 'value',
          render: (_, record) => 
            `KES ${((record.availableQty || 0) * (record.avgUnitCost || 0)).toLocaleString()}`
        },
        {
          title: 'Status',
          key: 'status',
          render: (_, record) => (
            <Tag color={
              record.isExpired ? 'red' :
              record.isCritical ? 'red' :
              record.isLowStock ? 'orange' : 'green'
            }>
              {record.stockStatus}
            </Tag>
          )
        },
        {
          title: 'Expiry',
          dataIndex: 'expiryDate',
          key: 'expiryDate',
          render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
        }
      ];
      
    default:
      return [];
  }
};

export default ReportingManagement;