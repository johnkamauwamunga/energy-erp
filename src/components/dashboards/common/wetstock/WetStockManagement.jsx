// src/components/dashboards/common/wetStock/WetStockManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Button,
  Space,
  Typography,
  Divider,
  Statistic,
  Alert,
  Spin,
  message,
  Badge,
  Modal
} from 'antd';
import {
  DashboardOutlined,
  HistoryOutlined,
  BarChartOutlined,
  ReloadOutlined,
  PlusOutlined,
  ReconciliationOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import {LoaderPinwheelIcon, Fuel} from 'lucide-react'
import PumpReadingsList from './PumpReadingsList';
import TankReadingsList from './TankReadingsList';
import ReconciliationList from './ReconciliationList';
import { wetStockService } from '../../../../services/wetStockService/wetStockService';
import { useApp } from '../../../../context/AppContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const WetStockManagement = () => {
  const { state } = useApp();
  const currentUser = state?.currentUser;
  const currentStation = state?.currentStation;
  const currentCompany = state?.currentCompany;
  
  const [activeTab, setActiveTab] = useState('pump-readings');
  const [pumpReadings, setPumpReadings] = useState([]);
  const [tankReadings, setTankReadings] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pumpFilters, setPumpFilters] = useState({});
  const [tankFilters, setTankFilters] = useState({});
  const [reconciliationFilters, setReconciliationFilters] = useState({});
  const [summary, setSummary] = useState(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch pump readings
  const fetchPumpReadings = async (filters = {}) => {
    setLoading(true);
    try {
      const result = await wetStockService.getPumpMeterReadings(filters);
      console.log('Fetched pump readings:', result);
      setPumpReadings(result.data || result || []);
    } catch (error) {
      console.error('Failed to fetch pump readings:', error);
      message.error('Failed to fetch pump readings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tank readings
  const fetchTankReadings = async (filters = {}) => {
    setLoading(true);
    try {
      const result = await wetStockService.getTankDipReadings(filters);
      console.log('Fetched tank readings:', result);
      setTankReadings(result.data || result || []);
    } catch (error) {
      console.error('Failed to fetch tank readings:', error);
      message.error('Failed to fetch tank readings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reconciliations
  const fetchReconciliations = async (filters = {}) => {
    setLoading(true);
    try {
      const result = await wetStockService.getWetStockReconciliations(filters);
      console.log('Fetched reconciliations:', result);
      setReconciliations(result.data || result || []);
    } catch (error) {
      console.error('Failed to fetch reconciliations:', error);
      message.error('Failed to fetch reconciliations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary statistics
  const fetchSummary = async () => {
    try {
      const result = await wetStockService.getVarianceStatistics();
      setSummary(result);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  useEffect(() => {
    fetchPumpReadings();
    fetchTankReadings();
    fetchReconciliations();
    fetchSummary();
  }, []);

  const handlePumpFiltersChange = (newFilters) => {
    setPumpFilters(newFilters);
    fetchPumpReadings(newFilters);
  };

  const handleTankFiltersChange = (newFilters) => {
    setTankFilters(newFilters);
    fetchTankReadings(newFilters);
  };

  const handleReconciliationFiltersChange = (newFilters) => {
    setReconciliationFilters(newFilters);
    fetchReconciliations(newFilters);
  };

  const refreshAll = () => {
    fetchPumpReadings(pumpFilters);
    fetchTankReadings(tankFilters);
    fetchReconciliations(reconciliationFilters);
    fetchSummary();
    message.success('Data refreshed successfully', 2);
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch(activeTab) {
      case 'pump-readings':
        return {
          data: pumpReadings,
          count: pumpReadings.length,
          name: 'Pump Meter Readings'
        };
      case 'tank-readings':
        return {
          data: tankReadings,
          count: tankReadings.length,
          name: 'Tank Dip Readings'
        };
      case 'reconciliations':
        return {
          data: reconciliations,
          count: reconciliations.length,
          name: 'Reconciliations'
        };
      default:
        return { data: [], count: 0, name: '' };
    }
  };

  const handleQuickExport = async (format) => {
    const currentData = getCurrentData();
    if (currentData.count === 0) {
      message.warning(`No ${currentData.name.toLowerCase()} to export`);
      return;
    }

    setExportLoading(true);
    try {
      // Quick export logic would go here
      message.success(`Preparing ${format.toUpperCase()} export for ${currentData.name}`);
      
      // For now, just show a message
      setTimeout(() => {
        setExportLoading(false);
        message.success(`${currentData.name} ${format.toUpperCase()} export started`);
      }, 1000);
      
    } catch (error) {
      console.error('Export error:', error);
      message.error(`Failed to export ${format}: ${error.message}`);
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space>
              <DashboardOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <Space direction="vertical" size={0}>
                <Title level={3} style={{ margin: 0 }}>
                  Wet Stock Management
                </Title>
                <Text type="secondary">
                  Monitor pump and tank readings, and manage fuel reconciliations
                </Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  onClick={() => message.info('New reading functionality coming soon')}
                >
                  New Reading
                </Button>
              </Col>
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={refreshAll}
                  loading={loading}
                >
                  Refresh All
                </Button>
              </Col>
              <Col>
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  onClick={() => setExportModalVisible(true)}
                  loading={exportLoading}
                >
                  Export
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Reconciliations"
                value={summary.totalReconciliations}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Normal Variance"
                value={summary.bySeverity?.NORMAL || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Warning Variance"
                value={summary.bySeverity?.WARNING || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Critical Variance"
                value={summary.bySeverity?.CRITICAL || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Export Modal */}
      <Modal
        title="Export Reports"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="Export Options"
            description="Choose export format for current tab data"
            type="info"
            showIcon
          />
          
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card size="small" title="Quick Export">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    icon={<FilePdfOutlined />}
                    onClick={() => handleQuickExport('pdf')}
                    block
                    loading={exportLoading}
                  >
                    Export as PDF
                  </Button>
                  <Button 
                    icon={<FileExcelOutlined />}
                    onClick={() => handleQuickExport('excel')}
                    block
                    loading={exportLoading}
                  >
                    Export as Excel
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Current tab: {getCurrentData().name} ({getCurrentData().count} records)
          </Text>
        </Space>
      </Modal>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
        >
          <TabPane
            tab={
              <span>
                <Fuel />
                Pump Meter Readings
                <Badge count={pumpReadings.length} offset={[10, -5]} />
              </span>
            }
            key="pump-readings"
          >
            <PumpReadingsList
              readings={pumpReadings}
              loading={loading}
              filters={pumpFilters}
              onFiltersChange={handlePumpFiltersChange}
              onRefresh={() => fetchPumpReadings(pumpFilters)}
              showFilters={true}
              pagination={{ pageSize: 20 }}
              currentUser={currentUser}
              currentStation={currentStation}
              currentCompany={currentCompany}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <LoaderPinwheelIcon />
                Tank Dip Readings
                <Badge count={tankReadings.length} offset={[10, -5]} />
              </span>
            }
            key="tank-readings"
          >
            <TankReadingsList
              readings={tankReadings}
              loading={loading}
              filters={tankFilters}
              onFiltersChange={handleTankFiltersChange}
              onRefresh={() => fetchTankReadings(tankFilters)}
              showFilters={true}
              pagination={{ pageSize: 20 }}
              currentUser={currentUser}
              currentStation={currentStation}
              currentCompany={currentCompany}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ReconciliationOutlined />
                Reconciliations
                <Badge count={reconciliations.length} offset={[10, -5]} />
              </span>
            }
            key="reconciliations"
          >
            <ReconciliationList
              reconciliations={reconciliations}
              loading={loading}
              filters={reconciliationFilters}
              onFiltersChange={handleReconciliationFiltersChange}
              onRefresh={() => fetchReconciliations(reconciliationFilters)}
              showFilters={true}
              pagination={{ pageSize: 20 }}
              currentUser={currentUser}
              currentStation={currentStation}
              currentCompany={currentCompany}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default WetStockManagement;