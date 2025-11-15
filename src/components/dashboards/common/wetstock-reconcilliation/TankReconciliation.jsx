import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  Input,
  Select,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Progress,
  Grid,
  Avatar,
  Switch,
  Tabs,
  DatePicker,
  Radio,
  Divider,
  List,
  Timeline,
  Empty,
  Collapse
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  ShopOutlined,
  ProductOutlined,
  DollarOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UserOutlined,
  CreditCardOutlined,
  WalletOutlined,
  AreaChartOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckOutlined,
  CloseOutlined,
  LockOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { 
  BarChart3, Activity, Clock, Users, FileText, 
  Flame, X, Menu, MapPin, DollarSign, Truck, Building2, Fuel, LogOut, User, Settings, TrendingUp,
  Gauge, Droplets, Thermometer, AlertTriangle
} from 'lucide-react';
import { tankReconciliationService } from '../../../../services/tankReconciliationService/tankReconciliationService';
import { assetService } from '../../../../services/assetService/assetService';

import { useApp } from '../../../../context/AppContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { Panel } = Collapse;

// Role-based access configuration
const ACCESS_LEVELS = {
  SUPER_ADMIN: 'COMPANY',
  COMPANY_ADMIN: 'COMPANY',
  STATION_MANAGER: 'STATION',
  LINES_MANAGER: 'STATION',
  SUPERVISOR: 'STATION',
  ATTENDANT: 'STATION'
};

const TankReconciliationManagement = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [tankData, setTankData] = useState({});
  const [wetStockData, setWetStockData] = useState({});
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [pumpMap, setPumpMap] = useState(new Map());
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
    stationId: '',
    tankId: '',
    productId: '',
    status: '',
    shiftId: ''
  });

  // Get user and access level
  const currentUser = state.currentUser;
  const currentCompany = currentUser?.companyId;
  const currentStation = state.currentStation?.id;
  const userRole = currentUser?.role;
  const accessLevel = ACCESS_LEVELS[userRole] || 'STATION';

  // Check if user can access company-level data
  const canAccessCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(userRole);
  
  // Check if user can access station-level data
  const canAccessStationLevel = ['STATION_MANAGER', 'LINES_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(userRole);

  // Check if user can modify data
  const canModifyData = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER', 'LINES_MANAGER'].includes(userRole);

  // Check if user can view sensitive data
  const canViewSensitiveData = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER', 'LINES_MANAGER', 'SUPERVISOR'].includes(userRole);

  // Determine which data to fetch based on access level
  const shouldFetchCompanyData = canAccessCompanyLevel && !currentStation;
  const shouldFetchStationData = canAccessStationLevel && currentStation;

  // Create pump mapping from assets
  const createPumpMapping = (islandAssets) => {
    const pumpMap = new Map();
    
    islandAssets.forEach(asset => {
      if (asset.pump && asset.pump.id) {
        pumpMap.set(asset.pump.id, {
          name: asset.name,
          islandCode: asset.stationLabel || asset.island?.code || "N/A",
          fullAsset: asset
        });
      }
    });
    
    console.log('🗺️ Pump mapping created:', Object.fromEntries(pumpMap));
    return pumpMap;
  };

  // Fetch assets and create pump mapping
  const fetchAssets = async () => {
    if (!currentStation) return;
    
    console.log('🔄 📦 Starting assets fetch for mapping...');
    try {
      const assetsResponse = await assetService.getStationAssets(currentStation);
      console.log('📦 Raw assets response:', assetsResponse);
      
      if (assetsResponse && Array.isArray(assetsResponse)) {
        console.log(`📊 Total assets: ${assetsResponse.length}`);
        
        // Filter only pump assets
        const pumpAssets = assetsResponse.filter(asset => asset.type === 'FUEL_PUMP');
        console.log(`🏝️ 📊 Found PUMPS:`, pumpAssets);
        
        const mapping = createPumpMapping(pumpAssets);
        setPumpMap(mapping);
      }
    } catch (error) {
      console.error('❌ Error fetching assets:', error);
    }
  };

  // Fetch available shifts from the reconciliation data
  const fetchShifts = async () => {
    if (!tankData.recentReconciliations) {
      console.log('📋 No recent reconciliations available for shifts');
      return;
    }
    
    try {
      // Extract unique shifts from recent reconciliations
      const uniqueShifts = [];
      const shiftMap = new Map();
      
      tankData.recentReconciliations?.forEach(rec => {
        if (rec.shift && !shiftMap.has(rec.shift.id)) {
          shiftMap.set(rec.shift.id, true);
          uniqueShifts.push({
            id: rec.shift.id,
            shiftNumber: rec.shift.shiftNumber,
            startTime: rec.shift.startTime,
            supervisor: rec.shift.supervisor
          });
        }
      });
      
      console.log('📋 Available shifts extracted:', uniqueShifts);
      setShifts(uniqueShifts);
    } catch (error) {
      console.error('❌ Failed to process shifts:', error);
    }
  };

  // Fetch tank reconciliation data based on access level
  const fetchTankReconciliation = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      if (shouldFetchStationData) {
        console.log('🏪 Fetching station tank reconciliation:', currentStation);
        result = await tankReconciliationService.getTankReconciliationInStation(currentStation, filters);
      } else if (shouldFetchCompanyData) {
        console.log('🏢 Fetching company tank reconciliation:', currentCompany);
        result = await tankReconciliationService.getTankReconciliationInCompany(currentCompany, filters);
      } else {
        throw new Error('No access to fetch data');
      }
      
      console.log('📦 Tank reconciliation result:', result);
      setTankData(result);
    } catch (error) {
      console.error('❌ Failed to fetch tank reconciliation data:', error);
      message.error('Failed to load tank reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch wet stock reconciliation data based on access level
  const fetchWetStockReconciliation = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      if (shouldFetchStationData) {
        result = await tankReconciliationService.getWetStockReconciliationInStation(currentStation, filters);
      } else if (shouldFetchCompanyData) {
        result = await tankReconciliationService.getWetStockReconciliationInCompany(currentCompany, filters);
      } else {
        throw new Error('No access to fetch data');
      }
      
      setWetStockData(result);
    } catch (error) {
      console.error('❌ Failed to fetch wet stock reconciliation data:', error);
      message.error('Failed to load wet stock reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on active tab and access level
  const fetchData = useCallback(async () => {
    if (!hasAccess()) return;

    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'tanks') {
        await fetchTankReconciliation();
      } else if (activeTab === 'wet-stock') {
        await fetchWetStockReconciliation();
      }
    } catch (error) {
      console.error('❌ Failed to fetch data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentCompany, currentStation, filters, shouldFetchCompanyData, shouldFetchStationData]);

  useEffect(() => {
    fetchData();
    fetchAssets();
  }, [fetchData]);

  // Process shifts when tank data changes
  useEffect(() => {
    if (tankData.recentReconciliations && activeTab === 'tanks') {
      console.log('🔄 Processing shifts from tank data...');
      fetchShifts();
    }
  }, [tankData.recentReconciliations, activeTab]);

  // Check if user has access to view this component
  const hasAccess = () => {
    return canAccessCompanyLevel || canAccessStationLevel;
  };

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Get filtered and enriched reconciliation data for detailed view
  const getDetailedReconciliationData = useCallback(() => {
    if (!tankData.recentReconciliations || pumpMap.size === 0) {
      console.log('📊 No data available:', {
        hasReconciliations: !!tankData.recentReconciliations,
        reconciliationsCount: tankData.recentReconciliations?.length,
        pumpMapSize: pumpMap.size
      });
      return [];
    }

    let reconciliations = tankData.recentReconciliations;

    // Filter by shift if selected
    if (filters.shiftId) {
      reconciliations = reconciliations.filter(rec => rec.shiftId === filters.shiftId);
      console.log(`🔍 Filtered to ${reconciliations.length} reconciliations for shift ${filters.shiftId}`);
    }

    // Enrich with pump names and transform data
    const enrichedData = reconciliations.map(reconciliation => {
      console.log('🔄 Processing reconciliation:', reconciliation.id);
      
      const tankReconciliations = reconciliation.tankReconciliations?.map(tankRec => {
        console.log('⛽ Processing tank reconciliation:', tankRec.id);
        
        const enrichedPumps = tankRec.connectedPumps?.map(pump => {
          const pumpInfo = pumpMap.get(pump.pumpId);
          console.log('🔧 Mapping pump:', {
            pumpId: pump.pumpId,
            foundInMap: !!pumpInfo,
            pumpName: pumpInfo?.name
          });
          
          return {
            ...pump,
            pumpName: pumpInfo ? pumpInfo.name : `Pump-${pump.pumpId?.slice(-4) || 'Unknown'}`,
            islandCode: pumpInfo ? pumpInfo.islandCode : pump.islandCode
          };
        }) || [];

        return {
          ...tankRec,
          pumps: enrichedPumps,
          tankName: tankRec.tank?.asset?.name || 'Unknown Tank',
          productName: tankRec.tank?.product?.name || 'Unknown Product'
        };
      }) || [];

      return {
        ...reconciliation,
        tankReconciliations,
        pulledBy: currentUser?.name || 'Unknown User',
        displayDate: dayjs(reconciliation.recordedAt).format('YYYY-MM-DD HH:mm'),
        supervisorName: reconciliation.shift?.supervisor ? 
          `${reconciliation.shift.supervisor.firstName} ${reconciliation.shift.supervisor.lastName}` : 
          'Unknown Supervisor'
      };
    });

    console.log('✅ Enriched data:', enrichedData);
    return enrichedData;
  }, [tankData.recentReconciliations, pumpMap, filters.shiftId, currentUser]);

  // Show detailed reconciliation view
  const showDetailedReconciliation = (reconciliation) => {
    if (!canViewSensitiveData) {
      message.error('You do not have permission to view detailed reconciliation data');
      return;
    }
    setSelectedReconciliation(reconciliation);
    setDetailModalVisible(true);
  };

  // Format utilities
  const formatCurrency = (amount) => tankReconciliationService.formatCurrency(amount);
  const formatNumber = (number) => tankReconciliationService.formatNumber(number);
  const formatPercentage = (number) => tankReconciliationService.formatPercentage(number);

  // Get access level display
  const getAccessLevelDisplay = () => {
    if (shouldFetchCompanyData) return 'Company Level Access';
    if (shouldFetchStationData) return `Station: ${state.currentStation?.name || 'Current Station'}`;
    return 'Limited Access';
  };

  // Tab configurations
  const getTabItems = () => {
    const baseTabs = [
      {
        key: 'overview',
        label: (
          <span>
            <DashboardOutlined />
            {screens.xs ? '' : ' Overview'}
          </span>
        )
      }
    ];

    if (canViewSensitiveData) {
      baseTabs.push(
        {
          key: 'tanks',
          label: (
            <span>
              <Fuel style={{ width: 14, height: 14 }} />
              {screens.xs ? '' : ' Detailed View'}
            </span>
          )
        },
        {
          key: 'wet-stock',
          label: (
            <span>
              <Droplets style={{ width: 14, height: 14 }} />
              {screens.xs ? '' : ' Wet Stock'}
            </span>
          )
        }
      );
    }

    return baseTabs;
  };

  // Overview Tab Content
  const OverviewTab = () => {
    const summary = tankData.summary || {};
    const tanks = tankData.tanks || [];
    
    const criticalTanks = tanks.filter(tank => tank.avgVariance > 100);
    const bestPerformingTanks = tanks.slice(0, 3);
    
    return (
      <div className="space-y-4">
        {/* Access Level Indicator */}
        <Alert
          message={getAccessLevelDisplay()}
          description={`You are viewing data as ${userRole?.replace('_', ' ')}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* Key Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Total Tanks"
                value={summary.totalTanks || tanks.length}
                valueStyle={{ color: '#1890ff' }}
                prefix={<Fuel style={{ width: 16, height: 16 }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Avg Variance"
                value={summary.avgVariance || 0}
                suffix="L"
                valueStyle={{ color: '#faad14' }}
                prefix={<AreaChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Critical Tanks"
                value={criticalTanks.length}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" loading={loading}>
              <Statistic
                title="Overall Efficiency"
                value={summary.overallEfficiency || 0}
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Overview */}
        {canViewSensitiveData && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card 
                title="Critical Tanks Alert" 
                size="small" 
                loading={loading}
                extra={
                  <Tag color="red">
                    {criticalTanks.length} Issues
                  </Tag>
                }
              >
                {criticalTanks.length > 0 ? (
                  <List
                    size="small"
                    dataSource={criticalTanks.slice(0, 3)}
                    renderItem={(tank) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                          title={tank.tank.asset?.name}
                          description={`Variance: ${formatNumber(tank.avgVariance)}L`}
                        />
                        <Tag color="red">Critical</Tag>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No critical tanks found"
                  />
                )}
              </Card>
            </Col>
            
            <Col xs={24} sm={12}>
              <Card 
                title="Best Performing Tanks" 
                size="small" 
                loading={loading}
              >
                {bestPerformingTanks.map((tank, index) => (
                  <div key={tank.tank?.id} className="mb-3 last:mb-0">
                    <div className="flex justify-between items-center">
                      <Text strong>{tank.tank.asset?.name}</Text>
                      <Badge count={`#${index + 1}`} style={{ backgroundColor: '#52c41a' }} />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Variance: {formatNumber(tank.avgVariance)}L</span>
                      <span>Efficiency: {formatPercentage(tank.efficiency)}</span>
                    </div>
                    <Progress 
                      percent={Math.min((100 - (tank.avgVariance / 100)) * 100, 100)} 
                      size="small" 
                      showInfo={false}
                      strokeColor="#52c41a"
                    />
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        )}

        {/* Recent Reconciliations */}
        <Card title="Recent Activity" size="small" loading={loading}>
          {canViewSensitiveData ? (
            <Timeline pending={loading}>
              {tankData.recentReconciliations?.slice(0, 3).map((reconciliation, index) => (
                <Timeline.Item
                  key={reconciliation.id}
                  color={reconciliation.severity === 'CRITICAL' ? 'red' : 'green'}
                  dot={reconciliation.severity === 'CRITICAL' ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>Shift {reconciliation.shift?.shiftNumber}</Text>
                    <Text type="secondary">
                      Variance: {formatNumber(reconciliation.totalVariance)}L • 
                      Status: <Tag color={tankReconciliationService.getReconciliationStatusColor(reconciliation.status)}>
                        {tankReconciliationService.formatReconciliationStatus(reconciliation.status)}
                      </Tag>
                    </Text>
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Alert
              message="Limited Access"
              description="You have limited view access. Contact your supervisor for detailed reconciliation data."
              type="info"
              showIcon
            />
          )}
        </Card>
      </div>
    );
  };

  // Detailed Reconciliation Tab with Shift Filtering
  const DetailedReconciliationTab = () => {
    if (!canViewSensitiveData) {
      return (
        <Alert
          message="Access Denied"
          description="You do not have permission to view detailed reconciliation data."
          type="warning"
          showIcon
        />
      );
    }

    const detailedData = getDetailedReconciliationData();
    const selectedShift = shifts.find(s => s.id === filters.shiftId);

    // Debug Info Component
    const DebugInfo = () => (
      <Card size="small" title="🔍 Debug Information" style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Reconciliations Count">
            {tankData.recentReconciliations?.length || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Pump Map Size">
            {pumpMap.size}
          </Descriptions.Item>
          <Descriptions.Item label="Filtered Shift">
            {filters.shiftId || 'None'}
          </Descriptions.Item>
          <Descriptions.Item label="Enriched Data">
            {detailedData.length} records
          </Descriptions.Item>
          <Descriptions.Item label="Available Shifts">
            {shifts.length}
          </Descriptions.Item>
          <Descriptions.Item label="Loading">
            {loading ? 'Yes' : 'No'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );

    // Main table columns for reconciliation overview
    const reconciliationColumns = [
      {
        title: 'Shift',
        dataIndex: 'shift',
        key: 'shift',
        width: 120,
        render: (shift) => (
          <Space direction="vertical" size={0}>
            <Text strong>{shift?.shiftNumber || 'N/A'}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {shift?.startTime ? dayjs(shift.startTime).format('MMM DD') : 'No Date'}
            </Text>
          </Space>
        )
      },
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 80,
        render: (id) => <Text code>{id?.slice(-8)}</Text>
      },
      {
        title: 'Supervisor',
        dataIndex: 'supervisorName',
        key: 'supervisor',
        width: 120,
        render: (supervisor) => (
          <Text>{supervisor}</Text>
        )
      },
      {
        title: 'Total Variance',
        dataIndex: 'totalVariance',
        key: 'totalVariance',
        width: 100,
        render: (variance) => (
          <Text type={variance > 100 ? 'danger' : variance === 0 ? 'secondary' : 'success'}>
            {formatNumber(variance)}L
          </Text>
        )
      },
      {
        title: 'Tanks',
        dataIndex: 'tankReconciliations',
        key: 'tankCount',
        width: 80,
        render: (tanks) => (
          <Badge 
            count={tanks?.length || 0} 
            showZero 
            style={{ backgroundColor: tanks?.length > 0 ? '#52c41a' : '#faad14' }}
          />
        )
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status) => (
          <Tag color={tankReconciliationService.getReconciliationStatusColor(status)}>
            {tankReconciliationService.formatReconciliationStatus(status)}
          </Tag>
        )
      },
      {
        title: 'Pulled By',
        dataIndex: 'pulledBy',
        key: 'pulledBy',
        width: 120,
        render: (pulledBy) => (
          <Text type="secondary">{pulledBy}</Text>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Tooltip title="View Full Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => showDetailedReconciliation(record)}
            />
          </Tooltip>
        )
      }
    ];

    return (
      <div className="space-y-4">
        {/* Debug Info - Remove in production */}
        <DebugInfo />

        {/* Shift Filter */}
        <Card size="small">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Filter by Shift:</Text>
                <Select
                  style={{ width: '100%' }}
                  value={filters.shiftId}
                  onChange={(value) => handleFilterChange({ shiftId: value })}
                  placeholder="Select a shift..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {shifts.map(shift => (
                    <Option key={shift.id} value={shift.id}>
                      {shift.shiftNumber} - {dayjs(shift.startTime).format('MMM DD, YYYY')}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              {selectedShift && (
                <Space direction="vertical">
                  <Text strong>Selected Shift:</Text>
                  <Text>
                    {selectedShift.shiftNumber} • {dayjs(selectedShift.startTime).format('MMM DD, YYYY HH:mm')}
                  </Text>
                </Space>
              )}
            </Col>
          </Row>
        </Card>

        {/* Reconciliation Table */}
        <Card 
          title="Detailed Reconciliation Data"
          extra={
            <Space>
              <Text type="secondary">
                Showing {detailedData.length} reconciliation(s)
              </Text>
              {canModifyData && (
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const exportData = {
                      reconciliations: detailedData,
                      exportedBy: currentUser?.name,
                      exportDate: new Date().toISOString()
                    };
                    tankReconciliationService.exportToCSV(exportData, 'detailed-reconciliation');
                  }}
                >
                  Export
                </Button>
              )}
            </Space>
          }
        >
          <Table
            columns={reconciliationColumns}
            dataSource={detailedData}
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
            rowKey="id"
            expandable={{
              expandedRowRender: (record) => (
                <TankReconciliationDetail record={record} />
              ),
              rowExpandable: (record) => record.tankReconciliations?.length > 0
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    filters.shiftId 
                      ? "No reconciliation data found for selected shift"
                      : "No reconciliation data available"
                  }
                />
              )
            }}
          />
        </Card>
      </div>
    );
  };

  // Tank Reconciliation Detail Component for expanded rows
  const TankReconciliationDetail = ({ record }) => {
    return (
      <div className="p-4 bg-gray-50 rounded">
        <Title level={5} style={{ marginBottom: 16 }}>Tank Reconciliations</Title>
        {record.tankReconciliations?.map((tankRec, index) => (
          <Card 
            key={tankRec.id} 
            size="small" 
            style={{ marginBottom: 12 }}
            title={
              <Space>
                <Droplets style={{ color: '#1890ff' }} />
                <Text strong>{tankRec.tankName}</Text>
                <Tag color="blue">{tankRec.productName}</Tag>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Space direction="vertical">
                  <Text strong>Volumes:</Text>
                  <Text>Opening: {tankRec.openingVolume}L</Text>
                  <Text>Closing: {tankRec.closingVolume}L</Text>
                  <Text>Reduction: {tankRec.tankReduction}L</Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical">
                  <Text strong>Dispensing:</Text>
                  <Text>Pump Dispensed: {tankRec.totalPumpDispensed}L</Text>
                  <Text>Variance: 
                    <Tag color={parseFloat(tankRec.variance) > 100 ? 'red' : 'green'} style={{ marginLeft: 8 }}>
                      {tankRec.variance}L ({formatPercentage(tankRec.variancePercentage)})
                    </Tag>
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical">
                  <Text strong>Pumps:</Text>
                  {tankRec.pumps?.map((pump, pumpIndex) => (
                    <Text key={pumpIndex}>
                      {pump.pumpName}: {pump.litersDispensed}L
                    </Text>
                  ))}
                </Space>
              </Col>
            </Row>
          </Card>
        ))}
      </div>
    );
  };

  // Wet Stock Tab Content
  const WetStockTab = () => {
    if (!canViewSensitiveData) {
      return (
        <Alert
          message="Access Denied"
          description="You do not have permission to view wet stock reconciliation data."
          type="warning"
          showIcon
        />
      );
    }

    const reconciliations = wetStockData.wetStockReconciliations || [];
    const summary = wetStockData.summary || {};
    
    const wetStockColumns = [
      {
        title: 'Shift',
        dataIndex: 'shift',
        key: 'shift',
        width: 120,
        render: (shift) => `Shift ${shift.shiftNumber}`
      },
      {
        title: 'Date',
        dataIndex: 'shift',
        key: 'date',
        width: 120,
        render: (shift) => new Date(shift.startTime).toLocaleDateString()
      },
      {
        title: 'Total Variance',
        dataIndex: 'totalVariance',
        key: 'totalVariance',
        width: 120,
        render: (variance) => (
          <Text type={variance > 100 ? 'danger' : 'success'}>
            {formatNumber(variance)} L
          </Text>
        ),
        sorter: (a, b) => a.totalVariance - b.totalVariance
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 100,
        render: (severity) => (
          <Tag color={tankReconciliationService.getSeverityColor(severity)}>
            {tankReconciliationService.formatSeverity(severity)}
          </Tag>
        )
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status) => (
          <Tag color={tankReconciliationService.getReconciliationStatusColor(status)}>
            {tankReconciliationService.formatReconciliationStatus(status)}
          </Tag>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => showDetailedReconciliation(record)}
              />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <div className="space-y-4">
        {/* Wet Stock Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Reconciliations"
                value={summary.totalReconciliations || reconciliations.length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="With Discrepancies"
                value={summary.withDiscrepancies || reconciliations.filter(r => r.severity === 'CRITICAL').length}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={summary.completed || reconciliations.filter(r => r.status === 'COMPLETED').length}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Avg Variance"
                value={summary.avgVariance || reconciliations.reduce((sum, r) => sum + r.totalVariance, 0) / reconciliations.length}
                suffix="L"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Wet Stock Table */}
        <Card 
          title="Wet Stock Reconciliation"
          extra={
            canModifyData && (
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => tankReconciliationService.exportTankReconciliationToCSV(wetStockData, 'company')}
              >
                Export
              </Button>
            )
          }
        >
          <Table
            columns={wetStockColumns}
            dataSource={reconciliations}
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
            rowKey={(record) => record.id}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No wet stock reconciliation data available"
                />
              )
            }}
          />
        </Card>
      </div>
    );
  };

  // Enhanced Reconciliation Detail Modal
  const ReconciliationDetailModal = () => {
    if (!selectedReconciliation || !canViewSensitiveData) return null;

    const reconciliation = selectedReconciliation;
    
    // Function to get pump name from pump ID
    const getPumpName = (pumpId) => {
      const pumpInfo = pumpMap.get(pumpId);
      return pumpInfo ? pumpInfo.name : `Pump-${pumpId?.slice(-4) || 'Unknown'}`;
    };

    // Function to get island code from pump ID
    const getIslandCode = (pumpId) => {
      const pumpInfo = pumpMap.get(pumpId);
      return pumpInfo ? pumpInfo.islandCode : 'N/A';
    };

    return (
      <Modal
        title={
          <Space>
            <FileText />
            Reconciliation Details - Shift {reconciliation.shift?.shiftNumber}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          canModifyData && (
            <Button 
              key="export" 
              icon={<DownloadOutlined />}
              onClick={() => {
                const exportData = {
                  reconciliation: reconciliation,
                  exportedBy: currentUser?.name,
                  exportDate: new Date().toISOString()
                };
                tankReconciliationService.exportToCSV([exportData], `reconciliation-${reconciliation.shift?.shiftNumber}`);
              }}
            >
              Export
            </Button>
          )
        ]}
      >
        <div className="space-y-6">
          {/* Header Information */}
          <Card size="small">
            <Descriptions bordered column={3} size="small">
              <Descriptions.Item label="Shift Number" span={1}>
                <Text strong>{reconciliation.shift?.shiftNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Date" span={1}>
                {reconciliation.displayDate || dayjs(reconciliation.recordedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Supervisor" span={1}>
                {reconciliation.supervisorName}
              </Descriptions.Item>
              <Descriptions.Item label="Pulled By" span={1}>
                {reconciliation.pulledBy}
              </Descriptions.Item>
              <Descriptions.Item label="Total Variance" span={1}>
                <Text type={reconciliation.totalVariance > 100 ? 'danger' : 'success'}>
                  {formatNumber(reconciliation.totalVariance)} L
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                <Tag color={tankReconciliationService.getReconciliationStatusColor(reconciliation.status)}>
                  {tankReconciliationService.formatReconciliationStatus(reconciliation.status)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Tank Reconciliations */}
          <Card 
            title={
              <Space>
                <Fuel style={{ width: 16, height: 16 }} />
                Tank Reconciliations
                <Badge count={reconciliation.tankReconciliations?.length || 0} showZero />
              </Space>
            }
          >
            <Collapse accordion>
              {reconciliation.tankReconciliations?.map((tankRec, index) => (
                <Panel 
                  key={tankRec.id}
                  header={
                    <Space>
                      <Text strong>{tankRec.tankName}</Text>
                      <Tag color="blue">{tankRec.productName}</Tag>
                      <Tag color={parseFloat(tankRec.variance) > 100 ? 'red' : 'green'}>
                        Variance: {formatNumber(tankRec.variance)}L
                      </Tag>
                      <Tag color={tankRec.severity === 'CRITICAL' ? 'red' : 'green'}>
                        {tankRec.severity}
                      </Tag>
                    </Space>
                  }
                >
                  <div className="space-y-4">
                    {/* Volume Information */}
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={8}>
                        <Card size="small" title="Volume Details">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div className="flex justify-between">
                              <Text>Opening Volume:</Text>
                              <Text strong>{formatNumber(tankRec.openingVolume)} L</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Closing Volume:</Text>
                              <Text strong>{formatNumber(tankRec.closingVolume)} L</Text>
                            </div>
                            <Divider style={{ margin: '8px 0' }} />
                            <div className="flex justify-between">
                              <Text>Tank Reduction:</Text>
                              <Text strong type="warning">
                                {formatNumber(tankRec.tankReduction)} L
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Adjusted Reduction:</Text>
                              <Text strong>{formatNumber(tankRec.adjustedReduction)} L</Text>
                            </div>
                          </Space>
                        </Card>
                      </Col>
                      
                      <Col xs={24} sm={8}>
                        <Card size="small" title="Dispensing Summary">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div className="flex justify-between">
                              <Text>Total Pump Dispensed:</Text>
                              <Text strong>{formatNumber(tankRec.totalPumpDispensed)} L</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Variance:</Text>
                              <Text strong type={parseFloat(tankRec.variance) > 100 ? 'danger' : 'success'}>
                                {formatNumber(tankRec.variance)} L
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Variance %:</Text>
                              <Text strong type={parseFloat(tankRec.variancePercentage) > 5 ? 'danger' : 'success'}>
                                {formatPercentage(tankRec.variancePercentage)}
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Within Tolerance:</Text>
                              {tankRec.isWithinTolerance ? (
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              ) : (
                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                              )}
                            </div>
                          </Space>
                        </Card>
                      </Col>
                      
                      <Col xs={24} sm={8}>
                        <Card size="small" title="Additional Info">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div className="flex justify-between">
                              <Text>Avg Temperature:</Text>
                              <Text strong>{tankRec.avgTemperature} °C</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Temp Correction:</Text>
                              <Text strong>{tankRec.tempCorrectionFactor}</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text>Total Offloaded:</Text>
                              <Text strong>{formatNumber(tankRec.totalOffloaded)} L</Text>
                            </div>
                            {tankRec.notes && (
                              <>
                                <Divider style={{ margin: '8px 0' }} />
                                <Text type="secondary">Notes: {tankRec.notes}</Text>
                              </>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    </Row>

                    {/* Connected Pumps */}
                    {tankRec.pumps && tankRec.pumps.length > 0 && (
                      <Card 
                        size="small" 
                        title={
                          <Space>
                            <Truck style={{ width: 14, height: 14 }} />
                            Connected Pumps
                            <Badge count={tankRec.pumps.length} showZero />
                          </Space>
                        }
                      >
                        <Table
                          size="small"
                          dataSource={tankRec.pumps}
                          pagination={false}
                          rowKey={(record, index) => `${record.pumpId}-${index}`}
                          columns={[
                            {
                              title: 'Pump Name',
                              dataIndex: 'pumpName',
                              key: 'pumpName',
                              render: (name, record) => (
                                <Space>
                                  <Truck style={{ width: 12, height: 12 }} />
                                  <Text>{name}</Text>
                                </Space>
                              )
                            },
                            {
                              title: 'Island Code',
                              dataIndex: 'islandCode',
                              key: 'islandCode',
                              render: (code) => <Tag>{code}</Tag>
                            },
                            {
                              title: 'Pump ID',
                              dataIndex: 'pumpId',
                              key: 'pumpId',
                              render: (id) => <Text code>{id?.slice(-8)}</Text>
                            },
                            {
                              title: 'Liters Dispensed',
                              dataIndex: 'litersDispensed',
                              key: 'litersDispensed',
                              render: (liters) => (
                                <Text strong>{formatNumber(liters)} L</Text>
                              )
                            },
                            {
                              title: 'Contribution',
                              key: 'contribution',
                              render: (_, record) => {
                                const percentage = (record.litersDispensed / tankRec.totalPumpDispensed) * 100;
                                return (
                                  <Progress 
                                    percent={Math.round(percentage * 100) / 100} 
                                    size="small" 
                                    format={percent => `${percent}%`}
                                  />
                                );
                              }
                            }
                          ]}
                        />
                      </Card>
                    )}

                    {/* Pump Summary */}
                    {tankRec.pumps && tankRec.pumps.length > 0 && (
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                          <Card size="small" title="Pump Performance">
                            <List
                              size="small"
                              dataSource={tankRec.pumps}
                              renderItem={(pump, index) => (
                                <List.Item>
                                  <List.Item.Meta
                                    avatar={
                                      <Avatar 
                                        size="small" 
                                        style={{ backgroundColor: '#1890ff' }}
                                      >
                                        {index + 1}
                                      </Avatar>
                                    }
                                    title={pump.pumpName}
                                    description={`${formatNumber(pump.litersDispensed)} L`}
                                  />
                                  <Tag color="blue">
                                    {((pump.litersDispensed / tankRec.totalPumpDispensed) * 100).toFixed(1)}%
                                  </Tag>
                                </List.Item>
                              )}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Card size="small" title="Performance Metrics">
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <div className="flex justify-between">
                                <Text>Total Pumps:</Text>
                                <Text strong>{tankRec.pumps.length}</Text>
                              </div>
                              <div className="flex justify-between">
                                <Text>Max Dispensed:</Text>
                                <Text strong>
                                  {formatNumber(Math.max(...tankRec.pumps.map(p => p.litersDispensed)))} L
                                </Text>
                              </div>
                              <div className="flex justify-between">
                                <Text>Min Dispensed:</Text>
                                <Text strong>
                                  {formatNumber(Math.min(...tankRec.pumps.map(p => p.litersDispensed)))} L
                                </Text>
                              </div>
                              <div className="flex justify-between">
                                <Text>Avg per Pump:</Text>
                                <Text strong>
                                  {formatNumber(tankRec.pumps.reduce((sum, p) => sum + p.litersDispensed, 0) / tankRec.pumps.length)} L
                                </Text>
                              </div>
                            </Space>
                          </Card>
                        </Col>
                      </Row>
                    )}
                  </div>
                </Panel>
              ))}
            </Collapse>
          </Card>

          {/* Summary Statistics */}
          <Card size="small" title="Reconciliation Summary">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total Variance"
                  value={reconciliation.totalVariance}
                  suffix="L"
                  valueStyle={{ 
                    color: reconciliation.totalVariance > 100 ? '#ff4d4f' : '#52c41a'
                  }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Variance %"
                  value={reconciliation.variancePercentage}
                  suffix="%"
                  valueStyle={{ 
                    color: reconciliation.variancePercentage > 5 ? '#ff4d4f' : '#52c41a'
                  }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total Dispensed"
                  value={reconciliation.totalPumpDispensed}
                  suffix="L"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Tank Reduction"
                  value={reconciliation.totalTankReduction}
                  suffix="L"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Debug Information (Remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <Card size="small" title="🔍 Debug Information" type="inner">
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Pump Map Size">
                  {pumpMap.size}
                </Descriptions.Item>
                <Descriptions.Item label="Tank Reconciliations">
                  {reconciliation.tankReconciliations?.length || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Total Pumps">
                  {reconciliation.tankReconciliations?.reduce((sum, tr) => sum + (tr.pumps?.length || 0), 0) || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Reconciliation ID">
                  {reconciliation.id}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>
      </Modal>
    );
  };

  // Main render
  if (!hasAccess()) {
    return (
      <Alert
        message="Access Denied"
        description="You do not have permission to access tank reconciliation data."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="tank-reconciliation-management">
      <Card>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <Space>
                <Fuel style={{ width: 24, height: 24 }} />
                Tank Reconciliation Management
              </Space>
            </Title>
            <Text type="secondary">
              Monitor and analyze fuel tank reconciliation across your operations
            </Text>
          </div>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              loading={loading}
            >
              Refresh
            </Button>
            {canModifyData && (
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={() => tankReconciliationService.exportTankReconciliationToCSV(tankData, 'station')}
              >
                Export Data
              </Button>
            )}
          </Space>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={getTabItems()}
        />

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'tanks' && <DetailedReconciliationTab />}
        {activeTab === 'wet-stock' && <WetStockTab />}

        {/* Detail Modal */}
        <ReconciliationDetailModal />
      </Card>
    </div>
  );
};

export default TankReconciliationManagement;