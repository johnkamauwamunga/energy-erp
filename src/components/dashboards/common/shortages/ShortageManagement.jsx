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
  LineChartOutlined
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
  
  // Modal states - Fixed: Using separate states for better control
  const [createShortageModalVisible, setCreateShortageModalVisible] = useState(false);
  const [deductionModalVisible, setDeductionModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewDetailsModalVisible, setViewDetailsModalVisible] = useState(false);
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
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Create ref for CreateShortageForm
  const createShortageFormRef = useRef();

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

  // Prepare data for report generator
// Prepare data for report generator - UPDATED
const prepareReportData = (shortagesData) => {
  const formattedData = shortagesData.map(shortage => {
    // Extract user info from nested structure

    console.log(" this is the logged shortage data ", shortage);
    const staffAccount = shortage.ledger?.staffAccount;
    const user = staffAccount?.user;
     const station = staffAccount?.station.name;
  console.log("station info ", station);
    
    return {
      id: shortage.id,
      staffName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
      station: station || 'Unknown',
      amount: shortage.amount || 0,
      amountDisplay: shortage.amountDisplay || `Ksh ${(shortage.amount || 0).toLocaleString()}`,
      amountRemaining: shortage.amountRemaining || 0,
      amountRemainingDisplay: `Ksh ${(shortage.amountRemaining || 0).toLocaleString()}`,
      description: shortage.description || '',
      shortageType: shortage.shortageTypeDisplay || shortage.shortageType || 'CASH',
      severity: shortage.severityDisplay || shortage.severity || 'MODERATE',
      status: shortage.statusDisplay || shortage.status || 'ACTIVE',
      responsibleParty: shortage.responsiblePartyDisplay || shortage.responsibleParty || 'ATTENDANT',
      shortageDate: shortage.shortageDateDisplay || new Date(shortage.shortageDate || shortage.createdAt).toLocaleDateString(),
      dueDate: shortage.dueDateDisplay || (shortage.dueDate ? new Date(shortage.dueDate).toLocaleDateString() : 'No due date'),
      daysUntilDue: shortage.daysUntilDueDisplay || shortage.daysUntilDue || '',
      isOverdue: shortage.isOverdue || false,
      isCritical: shortage.severity === 'CRITICAL',
      totalDeducted: shortage.totalDeducted || 0,
      totalDeductedDisplay: `Ksh ${(shortage.totalDeducted || 0).toLocaleString()}`,
      percentagePaid: shortage.amount > 0 ? 
        ((shortage.amount - (shortage.amountRemaining || 0)) / shortage.amount * 100).toFixed(2) : 0,
      recordedBy: shortage.recordedByDisplay || ''
    };
  });
  
  setShortageReportData(formattedData);
  
  // Define report columns
  const columns = [
    {
      title: 'Staff Name',
      dataIndex: 'staffName',
      type: 'text',
      width: 150,
      render: (text, record) => text
    },
    {
      title: 'Station',
      dataIndex: 'station',
      type: 'text',
      width: 120
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      type: 'currency',
      width: 100
    },
    {
      title: 'Remaining',
      dataIndex: 'amountRemaining',
      type: 'currency',
      width: 100
    },
    {
      title: 'Description',
      dataIndex: 'description',
      type: 'text',
      width: 200
    },
    {
      title: 'Type',
      dataIndex: 'shortageType',
      type: 'text',
      width: 80
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      type: 'text',
      width: 80
    },
    {
      title: 'Status',
      dataIndex: 'status',
      type: 'text',
      width: 100
    },
    {
      title: 'Shortage Date',
      dataIndex: 'shortageDate',
      type: 'date',
      width: 100
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      type: 'date',
      width: 100
    },
    {
      title: 'Days Remaining',
      dataIndex: 'daysUntilDue',
      type: 'text',
      width: 100
    },
    {
      title: '% Paid',
      dataIndex: 'percentagePaid',
      type: 'percentage',
      width: 80
    }
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

  // Handle form submission from modal
  const handleCreateShortageSubmit = async () => {
    try {
      setFormSubmitting(true);
      
      // Use the form ref to submit
      if (createShortageFormRef.current) {
        const success = await createShortageFormRef.current.submit();
        if (success) {
          // Success will be handled by onSuccess callback
          return;
        }
      }
      
      // If we get here, the form submission failed
      message.warning('Please fill in all required fields correctly');
    } catch (error) {
      console.error('Error submitting shortage form:', error);
      message.error('Failed to submit form');
    } finally {
      setFormSubmitting(false);
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
      'Total Shortages': shortages.length,
      'Total Amount': totalAmount,
      'Outstanding Amount': totalRemaining,
      'Amount Collected': totalDeducted,
      'Active Shortages': activeCount,
      'Overdue Shortages': overdueCount,
      'Critical Shortages': criticalCount,
      'Collection Rate': totalAmount > 0 ? `${((totalDeducted / totalAmount) * 100).toFixed(2)}%` : '0%'
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
      icon: <DownloadOutlined />,
      visible: canExportReports && shortages.length > 0,
      type: 'default',
      component: (
        <AdvancedReportGenerator
          dataSource={shortageReportData}
          columns={reportColumns}
          title={`Shortage Management Report - ${activeTab}`}
          fileName={`shortages_${activeTab}_${new Date().toISOString().split('T')[0]}`}
          reportType="finance"
          summaryData={getReportSummaryData()}
          showFooter={true}
          footerText={`${state?.currentCompany?.name || 'Company'} • Shortage Management Report`}
          companyName={state?.currentCompany?.name || 'Company'}
          stationInfo={selectedStation ? {
            name: selectedStation.name,
            code: selectedStation.code || '',
            address: selectedStation.address || ''
          } : null}
          includeLogo={false}
          enableCustomization={true}
          onReportGenerate={(format) => {
            message.success(`Report generation started for ${format.toUpperCase()}`);
          }}
        />
      )
    }
  ];

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
                {selectedStation && ` • Station: ${selectedStation.name}`}
                {selectedCompany && companies.find(c => c.id === selectedCompany) && 
                  ` • Company: ${companies.find(c => c.id === selectedCompany).name}`}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<SyncOutlined />}
                  onClick={refreshData}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Col>
              {quickActions.map(action => {
                if (!action.visible) return null;
                
                if (action.key === 'report' && action.component) {
                  return (
                    <Col key={action.key}>
                      {action.component}
                    </Col>
                  );
                }
                
                return (
                  <Col key={action.key}>
                    <Button
                      type={action.type}
                      icon={action.icon}
                      onClick={action.onClick}
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

      {/* Station/Company Selection */}
      {(isCompanyAdmin || isSuperAdmin) && (
        <Card size="small" className="shadow-sm">
          <Row gutter={[16, 16]} align="middle">
            {/* Company Selection (for Super Admin only) */}
            {isSuperAdmin && (
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text strong>Select Company</Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Select company"
                    value={selectedCompany}
                    onChange={handleCompanyChange}
                    showSearch
                    optionFilterProp="children"
                    allowClear
                  >
                    {companies.map(company => (
                      <Option key={company.id} value={company.id}>
                        <Space>
                          <BankOutlined />
                          <span>{company.name}</span>
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
                <Text strong>Select Station</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select station"
                  value={selectedStation?.id}
                  onChange={handleStationChange}
                  showSearch
                  optionFilterProp="children"
                  disabled={isSuperAdmin && !selectedCompany}
                  loading={loading}
                >
                  {stations.map(station => (
                    <Option key={station.id} value={station.id}>
                      <Space>
                        <ShopOutlined />
                        <span>{station.name}</span>
                        {station.company?.name && (
                          <Text type="secondary">({station.company.name})</Text>
                        )}
                      </Space>
                    </Option>
                  ))}
                </Select>
                {isSuperAdmin && !selectedCompany && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Please select a company first
                  </Text>
                )}
              </Space>
            </Col>
            
            {/* Current Selection Info */}
            <Col xs={24} sm={isSuperAdmin ? 8 : 12}>
              <Card size="small">
                <Space direction="vertical" size={2}>
                  <Text strong>Current Selection:</Text>
                  {selectedStation ? (
                    <>
                      <Text>
                        <ShopOutlined className="mr-2" />
                        {selectedStation.name}
                      </Text>
                      {selectedCompany && (
                        <Text type="secondary">
                          <BankOutlined className="mr-2" />
                          {companies.find(c => c.id === selectedCompany)?.name}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text type="secondary">No station selected</Text>
                  )}
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* Statistics */}
      {shortageStats && activeTab === 'stats' && (
        <Card size="small" className="shadow-sm">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Total Shortages"
                value={shortageStats.overview?.totalShortages || 0}
                prefix={<AccountBookOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Total Amount"
                value={shortageStats.overview?.totalAmountDisplay || 'Ksh 0'}
                prefix={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Outstanding"
                value={shortageStats.overview?.outstandingShortages || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Outstanding Amount"
                value={shortageStats.overview?.outstandingAmountDisplay || 'Ksh 0'}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Avg. Shortage"
                value={shortageStats.overview?.avgShortageAmountDisplay || 'Ksh 0'}
                prefix={<PercentageOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Statistic
                title="Collection Rate"
                value={`${shortageStats.computedMetrics?.collectionRate || 0}%`}
                prefix={<BarChartOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Tabs */}
      <Card size="small" className="shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <Space>
                <AppstoreOutlined />
                All Shortages
                {shortages.length > 0 && (
                  <Badge count={shortages.length} style={{ backgroundColor: '#52c41a' }} />
                )}
              </Space>
            } 
            key="all" 
          />
          <TabPane 
            tab={
              <Space>
                <ExclamationCircleOutlined />
                Active
                {shortages.filter(s => s.status === 'ACTIVE').length > 0 && (
                  <Badge 
                    count={shortages.filter(s => s.status === 'ACTIVE').length} 
                    style={{ backgroundColor: '#1890ff' }} 
                  />
                )}
              </Space>
            } 
            key="active" 
          />
          <TabPane 
            tab={
              <Space>
                <WarningOutlined />
                Overdue
                {shortages.filter(s => s.isOverdue).length > 0 && (
                  <Badge 
                    count={shortages.filter(s => s.isOverdue).length} 
                    style={{ backgroundColor: '#ff4d4f' }} 
                  />
                )}
              </Space>
            } 
            key="overdue" 
          />
          <TabPane 
            tab={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                Critical
                {shortages.filter(s => s.severity === 'CRITICAL').length > 0 && (
                  <Badge 
                    count={shortages.filter(s => s.severity === 'CRITICAL').length} 
                    style={{ backgroundColor: '#ff4d4f' }} 
                  />
                )}
              </Space>
            } 
            key="critical" 
          />
          {isAttendant && (
            <TabPane 
              tab={
                <Space>
                  <TeamOutlined />
                  My Shortages
                  {shortages.filter(s => s.status === 'ACTIVE').length > 0 && (
                    <Badge 
                      count={shortages.filter(s => s.status === 'ACTIVE').length} 
                      style={{ backgroundColor: '#722ed1' }} 
                    />
                  )}
                </Space>
              } 
              key="my" 
            />
          )}
          {isCompanyAdmin && (
            <TabPane 
              tab={
                <Space>
                  <BankOutlined />
                  Company View
                </Space>
              } 
              key="company" 
            />
          )}
          <TabPane 
            tab={
              <Space>
                <LineChartOutlined />
                Statistics
              </Space>
            } 
            key="stats" 
          />
        </Tabs>
      </Card>

      {/* Main Content */}
      <Card className="shadow-sm">
        {activeTab === 'stats' ? (
          // Statistics View
          shortageStats ? (
            <div className="space-y-4">
              <Card title="Detailed Statistics" size="small">
                <Descriptions title="Overview" column={2} bordered>
                  <Descriptions.Item label="Scope">
                    {shortageStats.userScope?.role || 'Unknown'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Accessible Stations">
                    {shortageStats.userScope?.accessibleStations || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Accessible Companies">
                    {shortageStats.userScope?.accessibleCompanies || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Data Period">
                    Last 30 Days
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              
              {/* By Type */}
              {shortageStats.byType && shortageStats.byType.length > 0 && (
                <Card title="Shortages by Type" size="small">
                  <Row gutter={[16, 16]}>
                    {shortageStats.byType.map((item, index) => (
                      <Col xs={24} sm={12} md={8} key={index}>
                        <Card size="small">
                          <Statistic
                            title={item.shortageTypeDisplay}
                            value={item.count}
                            suffix={`(${item.percentage}%)`}
                          />
                          <Text type="secondary">
                            Total: {item.totalAmountDisplay}
                          </Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Alert
                message="No Statistics Available"
                description="There are no shortage statistics to display at this time."
                type="info"
                showIcon
              />
            </div>
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

      {/* Create Shortage Modal - FIXED WITH REF */}
 {/* Create Shortage Modal - SIMPLE NO-REF APPROACH */}
<Modal
  title={
    <Space>
      <PlusOutlined />
      Record New Shortage
    </Space>
  }
  open={createShortageModalVisible}
  onCancel={() => setCreateShortageModalVisible(false)}
  width={700}
  footer={null}
>
  {/* Use a key to force re-render when modal opens */}
  <div key={createShortageModalVisible ? 'open' : 'closed'}>
    <CreateShortageForm
      onSuccess={(shortage) => {
        handleShortageCreated(shortage);
        setCreateShortageModalVisible(false);
      }}
      onCancel={() => setCreateShortageModalVisible(false)}
      currentUser={currentUser}
      currentStation={selectedStation || currentStation}
      currentCompany={selectedCompany || currentCompanyId}
    />
  </div>
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
          <Button key="cancel" onClick={() => setExportModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="excel" 
            type="primary" 
            onClick={() => handleExport('excel')}
            loading={exportLoading}
            icon={<FileExcelOutlined />}
          >
            Export as Excel
          </Button>,
          <Button 
            key="pdf" 
            onClick={() => handleExport('pdf')}
            loading={exportLoading}
            icon={<FilePdfOutlined />}
          >
            Export as PDF
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
          />
          <Text strong>Current filters:</Text>
          <Text type="secondary">
            {selectedStation && `Station: ${selectedStation.name}`}
            {selectedCompany && ` • Company: ${companies.find(c => c.id === selectedCompany)?.name}`}
            {activeTab !== 'all' && ` • Tab: ${activeTab}`}
          </Text>
          <Divider />
          <Text>Data will include:</Text>
          <ul>
            <li>All shortage details</li>
            <li>Staff information</li>
            <li>Deduction history</li>
            <li>Status and dates</li>
            <li>Summary statistics</li>
          </ul>
          <Text type="secondary" style={{ fontSize: '12px' }}>
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
          <Button key="close" onClick={() => setViewDetailsModalVisible(false)}>
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
            >
              Add Deduction
            </Button>
          )
        ]}
      >
        {selectedShortage && (
          <div>
            <Descriptions title="Basic Information" bordered column={2}>
              <Descriptions.Item label="Staff Member" span={2}>
                <Space>
                  <TeamOutlined />
                  <Text strong>{selectedShortage.staffDisplayName}</Text>
                  <Text type="secondary">({selectedShortage.stationDisplayName})</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong style={{ fontSize: '18px' }}>
                  {selectedShortage.amountDisplay}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Remaining">
                <Text strong style={{ fontSize: '18px', color: '#ff4d4f' }}>
                  {selectedShortage.amountRemainingDisplay}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{selectedShortage.shortageTypeDisplay}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Severity">
                <Tag color={selectedShortage.severity === 'CRITICAL' ? 'red' : 
                           selectedShortage.severity === 'HIGH' ? 'orange' : 
                           selectedShortage.severity === 'MODERATE' ? 'gold' : 'blue'}>
                  {selectedShortage.severityDisplay}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedShortage.status === 'ACTIVE' ? 'red' : 
                           selectedShortage.status === 'PARTIALLY_DEDUCTED' ? 'orange' : 
                           selectedShortage.status === 'FULLY_DEDUCTED' ? 'green' : 'default'}>
                  {selectedShortage.statusDisplay}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Responsible Party">
                {selectedShortage.responsiblePartyDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Shortage Date">
                {selectedShortage.shortageDateDisplay}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <Space>
                  <Text>{selectedShortage.dueDateDisplay}</Text>
                  {selectedShortage.daysUntilDueDisplay && (
                    <Tag color={selectedShortage.isOverdue ? 'red' : 'green'}>
                      {selectedShortage.daysUntilDueDisplay}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedShortage.description}
              </Descriptions.Item>
              <Descriptions.Item label="Comments" span={2}>
                {selectedShortage.comments || 'No comments'}
              </Descriptions.Item>
              {selectedShortage.recordedByDisplay && (
                <Descriptions.Item label="Recorded By">
                  {selectedShortage.recordedByDisplay}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            {/* Deductions History */}
            {selectedShortage.deductions && selectedShortage.deductions.length > 0 && (
              <Card title="Deduction History" size="small" className="mt-4">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedShortage.deductions.map((deduction, index) => (
                    <Card key={index} size="small">
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="Amount">
                          <Text strong>{deduction.amountDisplay}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Date">
                          {deduction.deductionDateDisplay}
                        </Descriptions.Item>
                        <Descriptions.Item label="Description" span={2}>
                          {deduction.description || 'No description'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Recorded By">
                          {deduction.recordedByDisplay}
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
    </div>
  );
};

export default ShortageManagement;