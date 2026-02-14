// src/components/Shortages/ShortageManagement.jsx (Fixed with Working Modals + Report Generator)
import React, { useState, useEffect, useRef } from 'react';
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
  message,
  Select,
  Input,
  Alert,
  Divider,
  Descriptions,
  Tag,
  Dropdown,
  Badge
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
  BarChartOutlined,
  TeamOutlined,
  BankOutlined,
  ShopOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  SettingOutlined,
  AppstoreOutlined,
  LineChartOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../../services/shortageService/shortageService';
import { stationService } from '../../../../services/stationService/stationService';
import { companyService } from '../../../../services/companyService/companyService';
import { useApp } from '../../../../context/AppContext';
import CreateShortageForm from './CreateShortageForm';
import ShortageList from './ShortageList';
import ShortageDeductionModal from './ShortageDeductionModal';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const ShortageManagement = () => {
  const { state } = useApp();
  const [shortageStats, setShortageStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [shortages, setShortages] = useState([]);
  
  // Modal states
  const [createShortageModalVisible, setCreateShortageModalVisible] = useState(false);
  const [deductionModalVisible, setDeductionModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewDetailsModalVisible, setViewDetailsModalVisible] = useState(false);
  
  // Report Generator state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  
  const [shortageReportData, setShortageReportData] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedShortage, setSelectedShortage] = useState(null);
  const [stations, setStations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reportColumns, setReportColumns] = useState([]);

  const currentUser = state?.currentUser;
  const currentStation = state?.currentStation;
  const currentCompanyId = state?.currentCompany?.id || currentUser?.companyId;
  
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isStationManager = ['STATION_MANAGER', 'LINES_MANAGER', 'SUPERVISOR'].includes(currentUser?.role);
  const isAttendant = currentUser?.role === 'ATTENDANT';
  
  // Permission checks
  const canCreateShortage = !isAttendant && !isCompanyAdmin;
  const canViewDeductions = !isCompanyAdmin;
  const canExportReports = true; // All roles can export

  // Fetch companies (for super admin only)
  const fetchCompanies = async () => {
    if (isSuperAdmin) {
      try {
        const companiesData = await companyService.getAllCompanies();
        setCompanies(companiesData || []);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      }
    }
  };

  // Fetch stations for selection
  const fetchStations = async () => {
    try {
      setLoading(true);
      let stationsData = [];
      
      if (isCompanyAdmin && currentCompanyId) {
        stationsData = await stationService.getCompanyStations();
        if (stationsData.length > 0 && !selectedStation) {
          setSelectedStation(stationsData[0]);
        }
      } else if (isSuperAdmin) {
        stationsData = await stationService.getAllStations();
      } else if (currentStation) {
        stationsData = [currentStation];
        setSelectedStation(currentStation);
      }
      
      setStations(stationsData || []);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      message.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchShortageStats = async () => {
    try {
      const stats = await shortageService.getStatsByRole(currentUser?.role, {
        stationId: selectedStation?.id,
        companyId: selectedCompany
      });
      setShortageStats(stats);
    } catch (error) {
      console.error('Failed to fetch shortage statistics:', error);
    }
  };

  // Fetch shortages for current view
  const fetchShortages = async () => {
    try {
      setLoading(true);
      
      const filterParams = getTabFilters();
      let result;
      
      if (activeTab === 'my') {
        result = await shortageService.getMyShortages(filterParams);
      } else if (isCompanyAdmin || activeTab === 'company') {
        result = await shortageService.getCompanyShortages(filterParams);
      } else if (isSuperAdmin) {
        result = await shortageService.getAllShortages(filterParams);
      } else {
        result = await shortageService.getStationShortages(filterParams);
      }
      
      setShortages(result?.shortages || []);
      
      // Prepare report data
      prepareReportData(result?.shortages || []);
      
    } catch (error) {
      console.error('Error fetching shortages:', error);
      message.error(error.message || 'Failed to fetch shortages');
      setShortages([]);
      setShortageReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for report generator - SIMPLIFIED COLUMNS
  const prepareReportData = (shortagesData) => {
    const formattedData = shortagesData.map((shortage, index) => {
      const staffAccount = shortage.ledger?.staffAccount;
      const user = staffAccount?.user;
      const station = staffAccount?.station?.name || 'Unknown';
      
      return {
        '#': index + 1,
        'Staff Name': user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
        'Station': station,
        'Amount (KES)': shortage.amount || 0,
        'Remaining (KES)': shortage.amountRemaining || 0,
        'Description': shortage.description || '',
        'Type': shortage.shortageTypeDisplay || shortage.shortageType || 'CASH',
        'Severity': shortage.severityDisplay || shortage.severity || 'MODERATE',
        'Status': shortage.statusDisplay || shortage.status || 'ACTIVE',
        'Shortage Date': shortage.shortageDateDisplay || new Date(shortage.shortageDate || shortage.createdAt).toLocaleDateString(),
        'Due Date': shortage.dueDateDisplay || (shortage.dueDate ? new Date(shortage.dueDate).toLocaleDateString() : 'No due date'),
        '% Paid': shortage.amount > 0 ? 
          ((shortage.amount - (shortage.amountRemaining || 0)) / shortage.amount * 100).toFixed(2) : 0
      };
    });
    
    setShortageReportData(formattedData);
    
    // Define report columns - SIMPLIFIED
    const columns = [
      { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
      { title: 'Staff Name', dataIndex: 'Staff Name', key: 'staffName', width: 150, type: 'text' },
      { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' },
      { title: 'Amount (KES)', dataIndex: 'Amount (KES)', key: 'amount', width: 120, type: 'currency' },
      { title: 'Remaining (KES)', dataIndex: 'Remaining (KES)', key: 'remaining', width: 120, type: 'currency' },
      { title: 'Description', dataIndex: 'Description', key: 'description', width: 200, type: 'text' },
      { title: 'Type', dataIndex: 'Type', key: 'type', width: 80, type: 'text' },
      { title: 'Severity', dataIndex: 'Severity', key: 'severity', width: 80, type: 'text' },
      { title: 'Status', dataIndex: 'Status', key: 'status', width: 100, type: 'text' },
      { title: 'Shortage Date', dataIndex: 'Shortage Date', key: 'shortageDate', width: 100, type: 'date' },
      { title: 'Due Date', dataIndex: 'Due Date', key: 'dueDate', width: 100, type: 'date' },
      { title: '% Paid', dataIndex: '% Paid', key: 'percentagePaid', width: 80, type: 'percentage' }
    ];
    
    setReportColumns(columns);
  };

  // Refresh all data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
    fetchShortageStats();
    fetchStations();
    fetchShortages();
  };

  // Handle successful shortage creation
  const handleShortageCreated = (shortage) => {
    message.success(`Shortage recorded: ${shortage.description}`);
    refreshData();
    setCreateShortageModalVisible(false);
  };

  // Handle successful deduction
  const handleDeductionCreated = () => {
    message.success('Deduction recorded successfully');
    refreshData();
    setDeductionModalVisible(false);
  };

  // Handle station change
  const handleStationChange = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    setSelectedStation(station);
  };

  // Handle company change
  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    setSelectedStation(null);
    
    if (companyId) {
      const fetchCompanyStations = async () => {
        try {
          const companyStations = await stationService.getStationsByCompany(companyId);
          setStations(companyStations || []);
        } catch (error) {
          console.error('Failed to fetch company stations:', error);
        }
      };
      fetchCompanyStations();
    } else {
      fetchStations();
    }
  };

  // ==================== REPORT GENERATION ====================

  // Handle generate report
  const handleGenerateReport = () => {
    if (shortageReportData.length === 0) {
      message.warning('No data to generate report');
      return;
    }

    const summaryData = getReportSummaryData();
    
    const title = `Shortage Management Report - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - ${new Date().toLocaleDateString()}`;
    const fileName = `shortages_${activeTab}_${new Date().toISOString().split('T')[0]}`;
    
    const config = {
      dataSource: shortageReportData,
      columns: reportColumns,
      summaryData: summaryData,
      title: title,
      fileName: fileName,
      reportType: 'finance',
      companyName: state?.currentCompany?.name || "Lynx Energy System",
      stationInfo: selectedStation ? {
        name: selectedStation.name,
        code: selectedStation.code || '',
        address: selectedStation.address || ''
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy | User: ${currentUser?.firstName || ''} ${currentUser?.lastName || ''} | ${new Date().toLocaleString('en-KE')}`,
      enableCustomization: true,
      showGrandTotals: false
    };
    
    setReportConfig(config);
    setReportTitle(title);
    setReportModalVisible(true);
  };

  const handleReportComplete = (format) => {
    message.success(`${reportTitle} generated successfully as ${format.toUpperCase()}!`);
    setReportModalVisible(false);
    setReportConfig(null);
  };

  // Handle export
  const handleExport = async (format = 'excel') => {
    try {
      setExportLoading(true);
      
      const filters = getTabFilters();
      
      if (format === 'excel') {
        await shortageService.exportToExcel(filters);
        message.success('Excel export started successfully');
      } else if (format === 'pdf') {
        await shortageService.exportToPDF(filters);
        message.success('PDF export started successfully');
      }
      
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export error:', error);
      message.error(error.message || `Failed to export ${format}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Modal handlers
  const handleOpenCreateShortage = () => {
    setCreateShortageModalVisible(true);
  };

  const handleOpenDeduction = (shortage = null) => {
    setSelectedShortage(shortage);
    setDeductionModalVisible(true);
  };

  const handleOpenViewDetails = (shortage) => {
    setSelectedShortage(shortage);
    setViewDetailsModalVisible(true);
  };

  // Get summary data for report
  const getReportSummaryData = () => {
    if (!shortages.length) return null;
    
    const totalAmount = shortages.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalRemaining = shortages.reduce((sum, s) => sum + (s.amountRemaining || 0), 0);
    const totalDeducted = shortages.reduce((sum, s) => sum + (s.totalDeducted || 0), 0);
    const activeCount = shortages.filter(s => s.status === 'ACTIVE').length;
    const overdueCount = shortages.filter(s => s.isOverdue).length;
    const criticalCount = shortages.filter(s => s.severity === 'CRITICAL').length;
    
    return {
      'Report Type': `Shortage Report - ${activeTab}`,
      'Total Shortages': shortages.length,
      'Total Amount (KES)': totalAmount,
      'Outstanding Amount (KES)': totalRemaining,
      'Amount Collected (KES)': totalDeducted,
      'Active Shortages': activeCount,
      'Overdue Shortages': overdueCount,
      'Critical Shortages': criticalCount,
      'Collection Rate': totalAmount > 0 ? `${((totalDeducted / totalAmount) * 100).toFixed(2)}%` : '0%',
      'Generated Date': new Date().toLocaleDateString('en-KE'),
      'Generated Time': new Date().toLocaleTimeString('en-KE')
    };
  };

  // Initialize
  useEffect(() => {
    fetchStations();
    fetchCompanies();
    fetchShortageStats();
    fetchShortages();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchShortages();
  }, [activeTab, selectedStation, selectedCompany]);

  // Get filters based on active tab
  const getTabFilters = () => {
    const filters = {};
    
    switch (activeTab) {
      case 'active':
        filters.status = 'ACTIVE';
        filters.hasOutstanding = true;
        break;
      case 'overdue':
        filters.status = 'ACTIVE';
        filters.hasOutstanding = true;
        filters.dueBefore = new Date().toISOString().split('T')[0];
        break;
      case 'critical':
        filters.severity = 'CRITICAL';
        filters.hasOutstanding = true;
        break;
      case 'my':
        filters.status = 'ACTIVE';
        break;
    }
    
    if (selectedStation?.id) {
      filters.stationId = selectedStation.id;
    }
    if (selectedCompany) {
      filters.companyId = selectedCompany;
    }
    
    return filters;
  };

  // Quick actions for shortages
  const quickActions = [
    {
      key: 'create-shortage',
      label: 'Record Shortage',
      icon: <PlusOutlined />,
      onClick: handleOpenCreateShortage,
      visible: canCreateShortage,
      type: 'primary'
    },
    {
      key: 'quick-deduction',
      label: 'Quick Deduction',
      icon: <DollarOutlined />,
      onClick: () => handleOpenDeduction(),
      visible: canViewDeductions,
      type: 'dashed'
    },
    {
      key: 'report',
      label: 'Generate Report',
      icon: <FileTextOutlined />,
      onClick: handleGenerateReport,
      visible: canExportReports && shortages.length > 0,
      type: 'default'
    }
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <Card size="small">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                <AccountBookOutlined className="mr-2" />
                Shortage Management
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Manage staff shortages, deductions, and collections
                {selectedStation && ` • ${selectedStation.name}`}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[6, 6]} justify="end">
              <Col>
                <Button
                  icon={<SyncOutlined />}
                  onClick={refreshData}
                  loading={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Col>
              {quickActions.map(action => {
                if (!action.visible) return null;
                
                return (
                  <Col key={action.key}>
                    <Button
                      type={action.type}
                      icon={action.icon}
                      onClick={action.onClick}
                      size="small"
                    >
                      {action.label}
                    </Button>
                  </Col>
                );
              })}
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Station/Company Selection - COMPACT */}
      {(isCompanyAdmin || isSuperAdmin) && (
        <Card size="small" bodyStyle={{ padding: '8px 12px' }}>
          <Row gutter={[8, 8]} align="middle">
            {/* Company Selection (for Super Admin only) */}
            {isSuperAdmin && (
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text style={{ fontSize: '11px' }}>Company</Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Select company"
                    value={selectedCompany}
                    onChange={handleCompanyChange}
                    showSearch
                    allowClear
                    size="small"
                  >
                    {companies.map(company => (
                      <Option key={company.id} value={company.id}>
                        <Space size="small">
                          <BankOutlined style={{ fontSize: '12px' }} />
                          <span style={{ fontSize: '12px' }}>{company.name}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Space>
              </Col>
            )}
            
            {/* Station Selection */}
            <Col xs={24} sm={isSuperAdmin ? 8 : 12}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text style={{ fontSize: '11px' }}>Station</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select station"
                  value={selectedStation?.id}
                  onChange={handleStationChange}
                  showSearch
                  disabled={isSuperAdmin && !selectedCompany}
                  loading={loading}
                  size="small"
                >
                  {stations.map(station => (
                    <Option key={station.id} value={station.id}>
                      <Space size="small">
                        <ShopOutlined style={{ fontSize: '12px' }} />
                        <span style={{ fontSize: '12px' }}>{station.name}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            
            {/* Current Selection Info */}
            <Col xs={24} sm={isSuperAdmin ? 8 : 12}>
              <div style={{ fontSize: '12px' }}>
                <Text type="secondary">Selected: </Text>
                {selectedStation ? (
                  <Text strong>{selectedStation.name}</Text>
                ) : (
                  <Text type="secondary">None</Text>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Statistics - COMPACT */}
      {shortageStats && (
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Total</span>}
                value={shortageStats.overview?.totalShortages || 0}
                prefix={<AccountBookOutlined style={{ fontSize: '12px' }} />}
                valueStyle={{ fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Amount</span>}
                value={shortageStats.overview?.totalAmount || 0}
                formatter={value => `KES ${(value || 0).toLocaleString()}`}
                valueStyle={{ fontSize: '12px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Outstanding</span>}
                value={shortageStats.overview?.outstandingShortages || 0}
                valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Overdue</span>}
                value={shortageStats.byStatus?.OVERDUE || 0}
                valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Critical</span>}
                value={shortageStats.bySeverity?.CRITICAL || 0}
                valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Statistic
                title={<span style={{ fontSize: '11px' }}>Collection</span>}
                value={`${shortageStats.computedMetrics?.collectionRate || 0}%`}
                valueStyle={{ fontSize: '14px' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs */}
      <Card size="small" bodyStyle={{ padding: '8px 12px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="small"
          tabBarExtraContent={
            <span style={{ fontSize: '11px', color: '#666' }}>
              {shortages.length} records
            </span>
          }
        >
          <TabPane 
            tab={
              <Space size="small">
                <AppstoreOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>All</span>
                {shortages.length > 0 && (
                  <Badge count={shortages.length} style={{ backgroundColor: '#52c41a', fontSize: '9px' }} />
                )}
              </Space>
            } 
            key="all" 
          />
          <TabPane 
            tab={
              <Space size="small">
                <ExclamationCircleOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Active</span>
                {shortages.filter(s => s.status === 'ACTIVE').length > 0 && (
                  <Badge 
                    count={shortages.filter(s => s.status === 'ACTIVE').length} 
                    style={{ backgroundColor: '#1890ff', fontSize: '9px' }} 
                  />
                )}
              </Space>
            } 
            key="active" 
          />
          <TabPane 
            tab={
              <Space size="small">
                <WarningOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Overdue</span>
                {shortages.filter(s => s.isOverdue).length > 0 && (
                  <Badge 
                    count={shortages.filter(s => s.isOverdue).length} 
                    style={{ backgroundColor: '#ff4d4f', fontSize: '9px' }} 
                  />
                )}
              </Space>
            } 
            key="overdue" 
          />
          <TabPane 
            tab={
              <Space size="small">
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Critical</span>
                {shortages.filter(s => s.severity === 'CRITICAL').length > 0 && (
                  <Badge 
                    count={shortages.filter(s => s.severity === 'CRITICAL').length} 
                    style={{ backgroundColor: '#ff4d4f', fontSize: '9px' }} 
                  />
                )}
              </Space>
            } 
            key="critical" 
          />
          {isAttendant && (
            <TabPane 
              tab={
                <Space size="small">
                  <TeamOutlined style={{ fontSize: '12px' }} />
                  <span style={{ fontSize: '12px' }}>My</span>
                  {shortages.filter(s => s.status === 'ACTIVE').length > 0 && (
                    <Badge 
                      count={shortages.filter(s => s.status === 'ACTIVE').length} 
                      style={{ backgroundColor: '#722ed1', fontSize: '9px' }} 
                    />
                  )}
                </Space>
              } 
              key="my" 
            />
          )}
        </Tabs>
      </Card>

      {/* Main Content */}
      <Card size="small" bodyStyle={{ padding: '12px' }}>
        {activeTab === 'stats' ? (
          // Statistics View
          shortageStats ? (
            <div className="space-y-4">
              <Descriptions title="Overview" bordered size="small" column={2}>
                <Descriptions.Item label="Scope" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  {shortageStats.userScope?.role || 'Unknown'}
                </Descriptions.Item>
                <Descriptions.Item label="Stations" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  {shortageStats.userScope?.accessibleStations || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Total Shortages" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  {shortageStats.overview?.totalShortages || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  KES {(shortageStats.overview?.totalAmount || 0).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Outstanding" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  {shortageStats.overview?.outstandingShortages || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Outstanding Amount" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  KES {(shortageStats.overview?.outstandingAmount || 0).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Collection Rate" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                  {shortageStats.computedMetrics?.collectionRate || 0}%
                </Descriptions.Item>
              </Descriptions>
            </div>
          ) : (
            <Alert
              message="No Statistics Available"
              description="There are no shortage statistics to display at this time."
              type="info"
              showIcon
              style={{ fontSize: '12px' }}
            />
          )
        ) : (
          // Shortages List View
          <ShortageList
            scope={activeTab === 'company' ? 'company' : 
                  activeTab === 'my' ? 'my' : 
                  isSuperAdmin ? 'all' : 'station'}
            title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Shortages`}
            filters={getTabFilters()}
            onRefresh={refreshData}
            key={`${refreshKey}-${activeTab}-${selectedStation?.id}`}
            onViewDetails={handleOpenViewDetails}
            onAddDeduction={handleOpenDeduction}
          />
        )}
      </Card>

      {/* === MODALS === */}

      {/* Create Shortage Modal - SIMPLE APPROACH */}
      <Modal
        title={
          <Space size="small">
            <PlusOutlined />
            <span>Record New Shortage</span>
          </Space>
        }
        open={createShortageModalVisible}
        onCancel={() => setCreateShortageModalVisible(false)}
        width={700}
        footer={null}
        destroyOnClose
      >
        <CreateShortageForm
          onSuccess={(shortage) => {
            handleShortageCreated(shortage);
          }}
          onCancel={() => setCreateShortageModalVisible(false)}
          currentUser={currentUser}
          currentStation={selectedStation || currentStation}
          currentCompany={selectedCompany || currentCompanyId}
        />
      </Modal>

      {/* Shortage Deduction Modal */}
      <ShortageDeductionModal
        visible={deductionModalVisible}
        onCancel={() => {
          setSelectedShortage(null);
          setDeductionModalVisible(false);
        }}
        onSuccess={handleDeductionCreated}
        shortage={selectedShortage}
        currentUser={currentUser}
        title={selectedShortage ? `Deduction for ${selectedShortage.description?.substring(0, 30)}...` : "Record Deduction"}
      />

      {/* Export Modal */}
      <Modal
        title="Export Shortages"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)} size="small">
            Cancel
          </Button>,
          <Button 
            key="excel" 
            type="primary" 
            onClick={() => handleExport('excel')}
            loading={exportLoading}
            icon={<FileExcelOutlined />}
            size="small"
          >
            Excel
          </Button>,
          <Button 
            key="pdf" 
            onClick={() => handleExport('pdf')}
            loading={exportLoading}
            icon={<FilePdfOutlined />}
            size="small"
          >
            PDF
          </Button>
        ]}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="Export Options"
            description="Select the format for exporting shortage data."
            type="info"
            showIcon
            style={{ fontSize: '12px', padding: '8px' }}
          />
          <Text style={{ fontSize: '12px' }}>
            Total records: {shortages.length}
          </Text>
        </Space>
      </Modal>

      {/* View Details Modal */}
      <Modal
        title="Shortage Details"
        open={viewDetailsModalVisible}
        onCancel={() => {
          setSelectedShortage(null);
          setViewDetailsModalVisible(false);
        }}
        width={700}
        footer={[
          <Button key="close" onClick={() => setViewDetailsModalVisible(false)} size="small">
            Close
          </Button>,
          canViewDeductions && selectedShortage?.amountRemaining > 0 && (
            <Button
              key="deduct"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                setViewDetailsModalVisible(false);
                setTimeout(() => handleOpenDeduction(selectedShortage), 100);
              }}
              size="small"
            >
              Add Deduction
            </Button>
          )
        ]}
      >
        {selectedShortage && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Staff" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                {selectedShortage.staffDisplayName || 'Unknown'}
              </Descriptions.Item>
              <Descriptions.Item label="Station" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                {selectedShortage.stationDisplayName || 'Unknown'}
              </Descriptions.Item>
              <Descriptions.Item label="Amount" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '12px', fontWeight: 'bold' }}>
                KES {(selectedShortage.amount || 0).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Remaining" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '12px', color: '#ff4d4f', fontWeight: 'bold' }}>
                KES {(selectedShortage.amountRemaining || 0).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Type" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                <Tag color="blue" style={{ fontSize: '10px' }}>{selectedShortage.shortageTypeDisplay}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Severity" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                <Tag color={selectedShortage.severity === 'CRITICAL' ? 'red' : 'orange'} style={{ fontSize: '10px' }}>
                  {selectedShortage.severityDisplay}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                <Tag color={selectedShortage.status === 'ACTIVE' ? 'red' : 'green'} style={{ fontSize: '10px' }}>
                  {selectedShortage.statusDisplay}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Shortage Date" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                {selectedShortage.shortageDateDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                {selectedShortage.dueDateDisplay || 'No due date'}
              </Descriptions.Item>
              <Descriptions.Item label="Description" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }} span={2}>
                {selectedShortage.description}
              </Descriptions.Item>
            </Descriptions>
            
            {/* Deductions History */}
            {selectedShortage.deductions && selectedShortage.deductions.length > 0 && (
              <Card title="Deduction History" size="small" style={{ marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedShortage.deductions.map((deduction, index) => (
                    <Card key={index} size="small">
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="Amount" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                          KES {(deduction.amount || 0).toLocaleString()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Date" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                          {deduction.deductionDateDisplay}
                        </Descriptions.Item>
                        <Descriptions.Item label="Description" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }} span={2}>
                          {deduction.description || 'No description'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Report Generator Modal */}
      <Modal
        title={
          <Space size="small">
            <FileTextOutlined />
            <span>{reportTitle}</span>
            <Tag color="blue">{reportConfig?.dataSource?.length || 0} records</Tag>
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
        {reportConfig && (
          <div style={{ padding: '20px 0' }}>
            <AdvancedReportGenerator
              key={`shortage-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={handleReportComplete}
              onSettingsSave={(settings) => {
                console.log('Settings saved:', settings);
                message.success('Report settings saved!');
              }}
            />
            
            <Divider />
            
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button 
                onClick={() => {
                  setReportModalVisible(false);
                  setReportConfig(null);
                }}
                size="small"
              >
                Close
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShortageManagement;