// src/components/Shortages/ShortageManagement.jsx (Updated)
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Button,
  Space,
  Typography,
  Modal,
  message
} from 'antd';
import {
  AccountBookOutlined,
  PlusOutlined,
  ExportOutlined,
  SyncOutlined,
  DollarOutlined,
  WarningOutlined,
  PercentageOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../../services/shortageService/shortageService';
import { useApp } from '../../../../context/AppContext';


const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ShortageManagement = () => {
  const { state } = useApp();
  const [shortageStats, setShortageStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [modalVisible, setModalVisible] = useState({
    createShortage: false,
    exportData: false
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const currentUser = state?.currentUser;
  const currentStation = state?.currentStation;

  // Fetch statistics
  const fetchShortageStats = async () => {
    try {
      const stats = await shortageService.getStatsByRole(currentUser?.role);
      setShortageStats(stats);
    } catch (error) {
      console.error('Failed to fetch shortage statistics:', error);
      message.error('Failed to load shortage statistics');
    }
  };

  // Refresh data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
    fetchShortageStats();
  };

  // Handle successful shortage creation
  const handleShortageCreated = (shortage) => {
    message.success(`Shortage recorded: ${shortage.description}`);
    refreshData();
    setModalVisible(prev => ({ ...prev, createShortage: false }));
  };

  // Tab-specific filters
  const getTabFilters = () => {
    const today = new Date().toISOString();
    
    switch (activeTab) {
      case 'active':
        return { status: 'ACTIVE', hasOutstanding: true };
      case 'overdue':
        return { 
          status: 'ACTIVE', 
          hasOutstanding: true,
          dueBefore: today
        };
      case 'critical':
        return { 
          severity: 'CRITICAL', 
          hasOutstanding: true 
        };
      case 'my':
        return { 
          staffAccountId: currentUser?.staffAccountId 
        };
      default:
        return {};
    }
  };

  // Initialize
  useEffect(() => {
    fetchShortageStats();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} className="m-0">
                <AccountBookOutlined className="mr-2" />
                Shortage Management
              </Title>
              <Text type="secondary">
                Manage staff shortages, deductions, and collections
                {currentStation && ` • ${currentStation.name}`}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<SyncOutlined />}
                  onClick={refreshData}
                >
                  Refresh
                </Button>
              </Col>
              <Col>
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => setModalVisible(prev => ({ ...prev, exportData: true }))}
                >
                  Export
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalVisible(prev => ({ ...prev, createShortage: true }))}
                  disabled={!currentUser?.role || currentUser?.role === 'ATTENDANT'}
                >
                  Record Shortage
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics - Same as before */}
      <Card size="small" className="shadow-sm">
        {/* ... statistics row ... */}
      </Card>

      {/* Tabs */}
      <Card size="small" className="shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="All Shortages" key="all" />
          <TabPane tab="Active" key="active" />
          <TabPane tab="Overdue" key="overdue" />
          <TabPane tab="Critical" key="critical" />
          {currentUser?.role === 'ATTENDANT' && (
            <TabPane tab="My Shortages" key="my" />
          )}
          <TabPane tab="Statistics" key="stats" />
        </Tabs>
      </Card>

     
    </div>
  );
};

export default ShortageManagement;