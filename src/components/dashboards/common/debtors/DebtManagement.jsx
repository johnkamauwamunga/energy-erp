// src/components/debtor/DebtsManagement.jsx
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
  DatePicker,
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Progress,
  Grid
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  FileTextOutlined,
  DollarOutlined,
  CreditCardOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  ReloadOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../services/debtorService/debtorService';
import { useApp } from '../../../../context/AppContext';
import CreateDebtorModal from './modal/CreateDebtorModal';
import RecordPaymentModal from './modal/RecordPaymentModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const DebtsManagement = () => {
  const { state } = useApp();
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [showCreateDebtorModal, setShowCreateDebtorModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [debtDetails, setDebtDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    debtorId: '',
    stationId: '',
    daysOverdue: '',
    dateRange: null,
    page: 1,
    limit: 10,
    sortBy: 'transactionDate',
    sortOrder: 'desc'
  });

  const currentCompany = state.currentUser?.companyId;

  // Fetch all debt transactions
  const fetchDebts = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      console.log("🔄 Fetching debts with filters:", filters);
      
    //   const result = await debtorService.getDebtors({
    //     ...filters,
    //     includeTransactions: true
    //   });
        const result = await debtorService.getDebtors();
      
      console.log("📦 Debts response:", result);
      
      // Extract all debt transactions from debtors
      const allDebts = [];
      const debtorsData = result.debtors || result.data || [];
      
      debtorsData.forEach(debtor => {
        if (debtor.transactions) {
          debtor.transactions.forEach(transaction => {
            if (transaction.type === 'DEBT_INCURRED') {
              allDebts.push({
                ...transaction,
                debtor: debtor,
                station: transaction.stationDebtorAccount?.station
              });
            }
          });
        }
        
        if (debtor.stationAccounts) {
          debtor.stationAccounts.forEach(account => {
            if (account.transactions) {
              account.transactions.forEach(transaction => {
                if (transaction.type === 'DEBT_INCURRED') {
                  allDebts.push({
                    ...transaction,
                    debtor: debtor,
                    station: account.station
                  });
                }
              });
            }
          });
        }
      });
      
      console.log(`✅ Retrieved ${allDebts.length} debt records`);
      
      // Apply additional filtering
      let filteredDebts = allDebts;
      
      if (filters.status) {
        filteredDebts = filteredDebts.filter(debt => debt.status === filters.status);
      }
      
      if (filters.daysOverdue) {
        const today = new Date();
        filteredDebts = filteredDebts.filter(debt => {
          if (!debt.dueDate) return false;
          const dueDate = new Date(debt.dueDate);
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          
          switch (filters.daysOverdue) {
            case '1-30': return daysOverdue >= 1 && daysOverdue <= 30;
            case '31-60': return daysOverdue >= 31 && daysOverdue <= 60;
            case '61-90': return daysOverdue >= 61 && daysOverdue <= 90;
            case '90+': return daysOverdue > 90;
            default: return true;
          }
        });
      }
      
      if (filters.dateRange) {
        filteredDebts = filteredDebts.filter(debt => {
          const debtDate = new Date(debt.transactionDate);
          return debtDate >= filters.dateRange[0] && debtDate <= filters.dateRange[1];
        });
      }
      
      setDebts(filteredDebts);
      setPagination({
        page: 1,
        limit: 10,
        totalCount: filteredDebts.length,
        totalPages: Math.ceil(filteredDebts.length / 10)
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch debts:', error);
      message.error('Failed to load debt records');
      setDebts([]);
      setPagination({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch debt statistics
  const [statistics, setStatistics] = useState(null);
  const fetchStatistics = async () => {
    try {
      const stats = await debtorService.getDebtorStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchDebts();
    fetchStatistics();
  }, [currentCompany, filters.page, filters.limit, filters.status, filters.daysOverdue, filters.dateRange]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  // Handle table pagination
  const handleTableChange = (newPagination) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.current,
      limit: newPagination.pageSize
    }));
  };

  // Handle actions
  const handleRecordPayment = useCallback((debt) => {
    setSelectedDebt(debt);
    setShowPaymentModal(true);
  }, []);

  const handleViewDetails = useCallback((debt) => {
    setDebtDetails(debt);
    setShowDetailsModal(true);
  }, []);

  const handleWriteOff = async (debtId) => {
    try {
      message.success('Debt marked for write-off');
      fetchDebts();
    } catch (error) {
      message.error('Failed to write off debt');
    }
  };

  // Status configurations
  const getDebtStatusConfig = useCallback((debt) => {
    const today = new Date();
    const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
    const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
    
    if (debt.status === 'SETTLED') {
      return { color: 'green', label: 'Paid', badge: 'success' };
    } else if (debt.status === 'PARTIAL') {
      return { color: 'orange', label: 'Partial', badge: 'warning' };
    } else if (daysOverdue > 90) {
      return { color: 'red', label: 'Critical', badge: 'error' };
    } else if (daysOverdue > 60) {
      return { color: 'red', label: 'Overdue 60+', badge: 'error' };
    } else if (daysOverdue > 30) {
      return { color: 'orange', label: 'Overdue 30+', badge: 'warning' };
    } else if (daysOverdue > 0) {
      return { color: 'orange', label: 'Overdue', badge: 'warning' };
    } else if (dueDate && daysOverdue <= 0) {
      const daysUntilDue = Math.abs(daysOverdue);
      return { color: 'blue', label: `Due in ${daysUntilDue}d`, badge: 'processing' };
    } else {
      return { color: 'blue', label: 'Active', badge: 'processing' };
    }
  }, []);

  const getAgingCategory = useCallback((daysOverdue) => {
    if (daysOverdue <= 0) return { color: 'green', label: 'Current' };
    if (daysOverdue <= 30) return { color: 'blue', label: '1-30 Days' };
    if (daysOverdue <= 60) return { color: 'orange', label: '31-60 Days' };
    if (daysOverdue <= 90) return { color: 'red', label: '61-90 Days' };
    return { color: 'red', label: '90+ Days' };
  }, []);

  // Responsive columns configuration
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Debtor',
        dataIndex: ['debtor', 'name'],
        key: 'debtorName',
        width: screens.xs ? 120 : 180,
        render: (name, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.debtor?.phone}
            </Text>
          </Space>
        ),
        fixed: screens.xs ? 'left' : false
      },
      {
        title: 'Station',
        dataIndex: ['station', 'name'],
        key: 'station',
        width: screens.xs ? 100 : 150,
        render: (name) => name || 'N/A',
        responsive: ['md']
      },
      {
        title: 'Vehicle',
        key: 'vehicle',
        width: screens.xs ? 100 : 140,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: '500' }}>{record.vehiclePlate || 'N/A'}</div>
            {record.vehicleModel && screens.sm && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.vehicleModel}
              </Text>
            )}
          </div>
        )
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: screens.xs ? 90 : 120,
        render: (amount) => (
          <Text strong type="danger">
            {debtorService.formatCurrency(amount)}
          </Text>
        ),
        sorter: (a, b) => a.amount - b.amount
      },
      {
        title: 'Date',
        dataIndex: 'transactionDate',
        key: 'date',
        width: screens.xs ? 90 : 110,
        render: (date) => new Date(date).toLocaleDateString(),
        sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate),
        responsive: ['sm']
      },
      {
        title: 'Due Date',
        dataIndex: 'dueDate',
        key: 'dueDate',
        width: screens.xs ? 90 : 110,
        render: (dueDate) => dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A',
        sorter: (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0),
        responsive: ['md']
      },
      {
        title: 'Overdue',
        key: 'daysOverdue',
        width: screens.xs ? 80 : 120,
        render: (_, record) => {
          if (!record.dueDate) return 'N/A';
          const today = new Date();
          const dueDate = new Date(record.dueDate);
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          
          if (daysOverdue <= 0) {
            return <Tag color="green">Current</Tag>;
          }
          
          const aging = getAgingCategory(daysOverdue);
          return (
            <Tooltip title={`${daysOverdue} days overdue`}>
              <Tag color={aging.color}>
                {screens.sm && <ClockCircleOutlined />} {daysOverdue}d
              </Tag>
            </Tooltip>
          );
        }
      },
      {
        title: 'Status',
        key: 'status',
        width: screens.xs ? 90 : 130,
        render: (_, record) => {
          const config = getDebtStatusConfig(record);
          return screens.xs ? (
            <Badge status={config.badge} />
          ) : (
            <Badge status={config.badge} text={config.label} />
          );
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        width: screens.xs ? 100 : 150,
        fixed: screens.xs ? 'right' : false,
        render: (_, record) => {
          const config = getDebtStatusConfig(record);
          const isOverdue = config.label.includes('Overdue') || config.label.includes('Critical');
          
          return (
            <Space size="small">
              <Tooltip title="View Details">
                <Button 
                  icon={<EyeOutlined />} 
                  size="small"
                  onClick={() => handleViewDetails(record)}
                />
              </Tooltip>
              <Tooltip title="Record Payment">
                <Button 
                  icon={<CreditCardOutlined />} 
                  size="small"
                  type="primary"
                  onClick={() => handleRecordPayment(record)}
                  disabled={record.status === 'SETTLED'}
                />
              </Tooltip>
              {isOverdue && (
                <Popconfirm
                  title="Write Off Debt"
                  description="Are you sure you want to write off this debt?"
                  onConfirm={() => handleWriteOff(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tooltip title="Write Off">
                    <Button 
                      icon={<ExclamationCircleOutlined />} 
                      size="small"
                      danger
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          );
        }
      }
    ];

    return baseColumns;
  }, [screens, getDebtStatusConfig, getAgingCategory, handleRecordPayment, handleViewDetails]);

  // Format debts for display
  const formattedDebts = useMemo(() => 
    debts.map(debt => ({
      ...debt,
      key: debt.id
    })), 
    [debts]
  );

  // Statistics calculations
  const stats = useMemo(() => {
    const total = pagination.totalCount;
    const overdue = debts.filter(debt => {
      if (!debt.dueDate) return false;
      const today = new Date();
      const dueDate = new Date(debt.dueDate);
      return dueDate < today && debt.status !== 'SETTLED';
    }).length;
    
    const critical = debts.filter(debt => {
      if (!debt.dueDate) return false;
      const today = new Date();
      const dueDate = new Date(debt.dueDate);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      return daysOverdue > 90 && debt.status !== 'SETTLED';
    }).length;
    
    const totalOutstanding = debts.reduce((sum, debt) => {
      if (debt.status !== 'SETTLED') {
        return sum + debt.amount;
      }
      return sum;
    }, 0);

    return { total, overdue, critical, totalOutstanding };
  }, [debts, pagination.totalCount]);

  // Aging analysis
  const agingAnalysis = useMemo(() => {
    return {
      current: debts.filter(debt => {
        if (!debt.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(debt.dueDate);
        return dueDate >= today && debt.status !== 'SETTLED';
      }).reduce((sum, debt) => sum + debt.amount, 0),
      '1-30': debts.filter(debt => {
        if (!debt.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(debt.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return daysOverdue >= 1 && daysOverdue <= 30 && debt.status !== 'SETTLED';
      }).reduce((sum, debt) => sum + debt.amount, 0),
      '31-60': debts.filter(debt => {
        if (!debt.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(debt.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return daysOverdue >= 31 && daysOverdue <= 60 && debt.status !== 'SETTLED';
      }).reduce((sum, debt) => sum + debt.amount, 0),
      '61-90': debts.filter(debt => {
        if (!debt.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(debt.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return daysOverdue >= 61 && daysOverdue <= 90 && debt.status !== 'SETTLED';
      }).reduce((sum, debt) => sum + debt.amount, 0),
      '90+': debts.filter(debt => {
        if (!debt.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(debt.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return daysOverdue > 90 && debt.status !== 'SETTLED';
      }).reduce((sum, debt) => sum + debt.amount, 0)
    };
  }, [debts]);

  // Export functionality
  const handleExportDebts = useCallback(() => {
    const csvContent = debtorService.exportTransactionsToCSV(debts);
    debtorService.downloadTransactionsCSV(debts, `debts_export_${new Date().toISOString().split('T')[0]}.csv`);
    message.success('Debts exported successfully');
  }, [debts]);

  // Debt Details Modal
  const DebtDetailsModal = ({ debt, visible, onClose }) => {
    if (!debt) return null;

    const today = new Date();
    const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
    const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
    const statusConfig = getDebtStatusConfig(debt);

    return (
      <Modal
        title={`Debt Details - ${debt.debtor?.name}`}
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          <Button 
            key="payment" 
            type="primary" 
            icon={<CreditCardOutlined />}
            onClick={() => {
              onClose();
              handleRecordPayment(debt);
            }}
            disabled={debt.status === 'SETTLED'}
          >
            Record Payment
          </Button>
        ]}
        width={screens.xs ? '90%' : 700}
      >
        <div className="space-y-4">
          <Card size="small" title="Transaction Details">
            <Descriptions column={screens.xs ? 1 : 2} size="small">
              <Descriptions.Item label="Debtor">{debt.debtor?.name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{debt.debtor?.phone}</Descriptions.Item>
              <Descriptions.Item label="Station">{debt.station?.name || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Vehicle">
                {debt.vehiclePlate} {debt.vehicleModel ? `(${debt.vehicleModel})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong type="danger">
                  {debtorService.formatCurrency(debt.amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={statusConfig.badge} text={statusConfig.label} />
              </Descriptions.Item>
              <Descriptions.Item label="Transaction Date">
                {new Date(debt.transactionDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {dueDate ? dueDate.toLocaleDateString() : 'N/A'}
              </Descriptions.Item>
              {daysOverdue > 0 && (
                <Descriptions.Item label="Days Overdue">
                  <Tag color="red">{daysOverdue} days</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {debt.description && (
            <Card size="small" title="Description">
              <Text>{debt.description}</Text>
            </Card>
          )}

          <Card size="small" title="Aging Analysis">
            <Row gutter={16} align="middle">
              <Col xs={24} sm={8}>
                <Progress
                  type="circle"
                  percent={Math.min(100, (daysOverdue / 90) * 100)}
                  width={80}
                  format={() => `${daysOverdue}d`}
                  status={daysOverdue > 90 ? 'exception' : daysOverdue > 30 ? 'normal' : 'success'}
                />
              </Col>
              <Col xs={24} sm={16}>
                <Space direction="vertical" size="small">
                  <div>
                    <Text strong>Current Status: </Text>
                    <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
                  </div>
                  {dueDate && (
                    <div>
                      <Text strong>Due Date: </Text>
                      <Text>{dueDate.toLocaleDateString()}</Text>
                    </div>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </div>
      </Modal>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
      <div style={{ color: '#8c8c8c', fontSize: '16px', marginBottom: '8px' }}>
        No debt records found
      </div>
      <div style={{ color: '#bfbfbf', fontSize: '14px', marginBottom: '24px' }}>
        {filters.search || filters.status ? 
          'Try adjusting your filters to see more results' : 
          'No debt records available'
        }
      </div>
      {!(filters.search || filters.status) && (
        <Button 
          type="primary" 
          icon={<UserAddOutlined />}
          onClick={() => setShowCreateDebtorModal(true)}
          size="large"
        >
          Create First Debtor
        </Button>
      )}
    </div>
  );

  if (!currentCompany) {
    return (
      <Alert
        message="No Company Context"
        description="Please ensure you are logged into a company account."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '20px' : '24px' }}>
                Debts Management
              </Title>
              <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '14px' }}>
                Track and manage all outstanding fuel debts and payments
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify={screens.md ? "end" : "start"}>
              <Col xs={12} sm={8}>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExportDebts}
                  disabled={debts.length === 0}
                  block={screens.xs}
                >
                  {screens.sm && 'Export'}
                </Button>
              </Col>
              <Col xs={12} sm={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchDebts}
                  loading={loading}
                  block={screens.xs}
                >
                  {screens.sm && 'Refresh'}
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setShowCreateDebtorModal(true)}
                  block
                  size={screens.xs ? "middle" : "large"}
                >
                  Create Debtor
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Total Debts"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Overdue"
              value={stats.overdue}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Critical"
              value={stats.critical}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Outstanding"
              value={debtorService.formatCurrency(stats.totalOutstanding)}
              valueStyle={{ color: '#cf1322' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Aging Analysis */}
      <Card title="Aging Analysis" size="small">
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={4} md={4}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #52c41a' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="Current"
                value={debtorService.formatCurrency(agingAnalysis.current)}
                valueStyle={{ color: '#52c41a', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={4} md={4}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #1890ff' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="1-30 Days"
                value={debtorService.formatCurrency(agingAnalysis['1-30'])}
                valueStyle={{ color: '#1890ff', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={4} md={4}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #fa8c16' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="31-60 Days"
                value={debtorService.formatCurrency(agingAnalysis['31-60'])}
                valueStyle={{ color: '#fa8c16', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={4} md={4}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #fa541c' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="61-90 Days"
                value={debtorService.formatCurrency(agingAnalysis['61-90'])}
                valueStyle={{ color: '#fa541c', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={4} md={4}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #cf1322' }}
              bodyStyle={{ padding: '12px' }}
            >
              <Statistic
                title="90+ Days"
                value={debtorService.formatCurrency(agingAnalysis['90+'])}
                valueStyle={{ color: '#cf1322', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={4} md={4}>
            <Card size="small" bodyStyle={{ padding: '12px' }}>
              <Statistic
                title="Collection Rate"
                value={stats.total > 0 ? ((stats.total - stats.overdue) / stats.total * 100).toFixed(1) : 0}
                suffix="%"
                valueStyle={{ color: '#13c2c2', fontSize: screens.xs ? '12px' : '14px' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search debtor, vehicle..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              prefix={<SearchOutlined />}
              size="large"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange({ status: value })}
              allowClear
              size="large"
            >
              <Option value="OUTSTANDING">Outstanding</Option>
              <Option value="PARTIAL">Partial</Option>
              <Option value="SETTLED">Settled</Option>
              <Option value="OVERDUE">Overdue</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Aging"
              value={filters.daysOverdue}
              onChange={(value) => handleFilterChange({ daysOverdue: value })}
              allowClear
              size="large"
            >
              <Option value="1-30">1-30 Days</Option>
              <Option value="31-60">31-60 Days</Option>
              <Option value="61-90">61-90 Days</Option>
              <Option value="90+">90+ Days</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange({ dateRange: dates })}
              size="large"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button 
                icon={<SearchOutlined />}
                onClick={fetchDebts}
                loading={loading}
                type="primary"
                size="large"
                block={screens.xs}
              >
                {screens.sm && 'Search'}
              </Button>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  handleFilterChange({
                    search: '',
                    status: '',
                    daysOverdue: '',
                    dateRange: null,
                    page: 1
                  });
                }}
                size="large"
                block={screens.xs}
              >
                {screens.sm && 'Reset'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Debts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={formattedDebts}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} debt records`,
            size: screens.xs ? 'small' : 'default',
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          scroll={{ x: screens.xs ? 800 : 1200 }}
          locale={{ emptyText: <EmptyState /> }}
          size={screens.xs ? 'small' : 'middle'}
        />
      </Card>

      {/* Modals */}
      <CreateDebtorModal
        visible={showCreateDebtorModal}
        onClose={() => setShowCreateDebtorModal(false)}
        onSuccess={() => {
          setShowCreateDebtorModal(false);
          fetchDebts();
          fetchStatistics();
          message.success('Debtor created successfully');
        }}
      />

      <RecordPaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDebt(null);
        }}
        onSuccess={() => {
          setShowPaymentModal(false);
          setSelectedDebt(null);
          fetchDebts();
          fetchStatistics();
          message.success('Payment recorded successfully');
        }}
        selectedDebt={selectedDebt}
      />

      {/* Debt Details Modal */}
      {debtDetails && (
        <DebtDetailsModal
          debt={debtDetails}
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setDebtDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default DebtsManagement;