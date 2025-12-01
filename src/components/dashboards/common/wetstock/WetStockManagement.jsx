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
  Badge
} from 'antd';
import {
  DashboardOutlined,
  HistoryOutlined,
  BarChartOutlined,
  ReloadOutlined,
  PlusOutlined,
  ReconciliationOutlined
} from '@ant-design/icons';
import {LoaderPinwheelIcon, Fuel} from 'lucide-react'
import PumpReadingsList from './PumpReadingsList';
import TankReadingsList from './TankReadingsList';
import ReconciliationList from './ReconciliationList';
import { wetStockService } from '../../../../services/wetStockService/wetStockService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const WetStockManagement = () => {
  const [activeTab, setActiveTab] = useState('pump-readings');
  const [pumpReadings, setPumpReadings] = useState([]);
  const [tankReadings, setTankReadings] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pumpFilters, setPumpFilters] = useState({});
  const [tankFilters, setTankFilters] = useState({});
  const [reconciliationFilters, setReconciliationFilters] = useState({});
  const [summary, setSummary] = useState(null);

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
    message.info('Data refreshed successfully', 2);
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
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default WetStockManagement;