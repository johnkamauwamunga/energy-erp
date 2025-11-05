import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Card,
  Statistic,
  message
} from 'antd';
import {
  DownloadOutlined,
  BarChartOutlined,
  FilePdfOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { supplierAccountService } from '../../../../../../services/supplierAccountService/supplierAccountService';


const { Option } = Select;
const { RangePicker } = DatePicker;

const GenerateReportModal = ({ visible, onClose, suppliers }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [reportStats, setReportStats] = useState(null);

  const handleGeneratePreview = async (values) => {
    setLoading(true);
    try {
      // Calculate statistics based on filters
      const filteredSuppliers = filterSuppliers(suppliers, values);
      const stats = supplierAccountService.calculateSupplierStatistics(filteredSuppliers);
      setReportStats(stats);
    } catch (error) {
      message.error('Failed to generate report preview');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format) => {
    const values = form.getFieldsValue();
    
    try {
      const filteredSuppliers = filterSuppliers(suppliers, values);
      
      if (format === 'csv') {
        supplierAccountService.downloadSuppliersCSV(
          filteredSuppliers, 
          `supplier_report_${new Date().toISOString().split('T')[0]}.csv`
        );
      } else if (format === 'pdf') {
        // PDF export logic would go here
        message.info('PDF export feature coming soon');
      }
      
      message.success('Report exported successfully');
    } catch (error) {
      message.error('Failed to export report');
    }
  };

  const filterSuppliers = (suppliers, filters) => {
    let filtered = [...suppliers];
    
    if (filters.status) {
      filtered = filtered.filter(supplier => {
        if (filters.status === 'active') return supplier.status === 'ACTIVE';
        if (filters.status === 'inactive') return supplier.status !== 'ACTIVE';
        if (filters.status === 'with_debt') return (supplier.supplierAccount?.currentBalance || 0) > 0;
        if (filters.status === 'credit_hold') return supplier.supplierAccount?.isCreditHold;
        return true;
      });
    }
    
    if (filters.supplierType) {
      filtered = filtered.filter(supplier => supplier.supplierType === filters.supplierType);
    }
    
    return filtered;
  };

  return (
    <Modal
      title="Generate Supplier Report"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <div className="space-y-4">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGeneratePreview}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dateRange" label="Date Range">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Supplier Status">
                <Select placeholder="Select status" allowClear>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="with_debt">With Debt</Option>
                  <Option value="credit_hold">Credit Hold</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplierType" label="Supplier Type">
                <Select placeholder="Select type" allowClear>
                  <Option value="FUEL_WHOLESALER">Fuel Wholesaler</Option>
                  <Option value="FUEL_REFINERY">Fuel Refinery</Option>
                  <Option value="OIL_COMPANY">Oil Company</Option>
                  <Option value="DISTRIBUTOR">Distributor</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reportType" label="Report Type" initialValue="summary">
                <Select>
                  <Option value="summary">Summary Report</Option>
                  <Option value="detailed">Detailed Report</Option>
                  <Option value="aging">Aging Analysis</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              htmlType="submit"
              loading={loading}
            >
              Generate Preview
            </Button>
          </div>
        </Form>

        {/* Report Preview */}
        {reportStats && (
          <Card title="Report Preview" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Total Suppliers"
                  value={reportStats.totalSuppliers}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Active Suppliers"
                  value={reportStats.activeSuppliers}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Total Outstanding"
                  value={reportStats.totalDebt}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Settlement Rate"
                  value={reportStats.settlementRate}
                />
              </Col>
            </Row>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => handleExportReport('csv')}
                style={{ marginRight: 8 }}
              >
                Export CSV
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handleExportReport('pdf')}
              >
                Export PDF
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default GenerateReportModal;