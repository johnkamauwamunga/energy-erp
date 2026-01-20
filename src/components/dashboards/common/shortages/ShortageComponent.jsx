// src/components/Shortages/ShortageComponent.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Tooltip,
  Avatar,
  Badge,
  Dropdown,
  Typography,
  Progress,
  Divider,
  Alert,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  message
} from 'antd';
import {
  AccountBookOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoneyCollectOutlined,
  FileTextOutlined,
  MoreOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { shortageService } from '../../../services/shortage/shortageService';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const ShortageComponent = ({
  // Props
  mode = 'full', // 'full', 'compact', 'list', 'dashboard'
  roleBased = true,
  filters = {},
  showHeader = true,
  showFilters = true,
  showActions = true,
  onShortageSelect,
  onActionComplete,
  refreshKey,
  // Callbacks
  onRefresh,
  onCreateShortage,
  onUpdateShortage,
  onDeleteShortage,
  onAddDeduction,
  onWriteOff,
  // Custom configurations
  customColumns,
  customActions,
  pageSize = 10,
  autoRefresh = false,
  loading = false,
  // Context
  currentUser,
  currentStationId,
  currentCompanyId
}) => {
  const [shortages, setShortages] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [selectedShortage, setSelectedShortage] = useState(null);
  const [internalFilters, setInternalFilters] = useState({
    search: '',
    status: 'all',
    shortageType: 'all',
    severity: 'all',
    hasOutstanding: 'all',
    ...filters
  });
  const [modalVisible, setModalVisible] = useState({
    viewDetails: false,
    updateShortage: false,
    createDeduction: false
  });
  const [forms, setForms] = useState({
    updateShortage: Form.useForm()[0],
    createDeduction: Form.useForm()[0]
  });

  const isAttendant = currentUser?.role === 'ATTENDANT';
  const isStationBased = ['STATION_MANAGER', 'SUPERVISOR'].includes(currentUser?.role);
  const isCompanyAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(currentUser?.role);

  // Fetch shortages based on mode and role
  const fetchShortages = async () => {
    if (loading) return;
    
    setInternalLoading(true);
    try {
      let result = null;
      const queryFilters = { ...internalFilters, page: 1, limit: mode === 'dashboard' ? 5 : 50 };

      // Determine which endpoint to call based on role (if roleBased is true)
      if (roleBased) {
        if (isAttendant) {
          result = await shortageService.getMyShortages(queryFilters);
        } else if (isStationBased) {
          result = await shortageService.getStationShortages(queryFilters);
        } else if (isCompanyAdmin) {
          result = await shortageService.getCompanyShortages(queryFilters);
        } else {
          result = await shortageService.getAllShortages(queryFilters);
        }
      } else {
        // Use default endpoint if not role-based
        result = await shortageService.getAllShortages(queryFilters);
      }

      const formattedShortages = (result.shortages || []).map(shortage =>
        shortageService.formatShortage(shortage)
      );

      setShortages(formattedShortages);
      
      // Notify parent if callback provided
      if (onRefresh) {
        onRefresh(formattedShortages);
      }
    } catch (error) {
      console.error('Error loading shortages:', error);
      message.error('Failed to load shortages');
      setShortages([]);
    } finally {
      setInternalLoading(false);
    }
  };

  // Handle actions
  const handleAction = async (action, shortage, data = null) => {
    try {
      switch (action) {
        case 'view':
          setSelectedShortage(shortage);
          setModalVisible(prev => ({ ...prev, viewDetails: true }));
          if (onShortageSelect) onShortageSelect(shortage);
          break;
          
        case 'edit':
          setSelectedShortage(shortage);
          forms.updateShortage.setFieldsValue({
            description: shortage.description,
            comments: shortage.comments,
            shortageType: shortage.shortageType,
            responsibleParty: shortage.responsibleParty,
            severity: shortage.severity,
            status: shortage.status,
            dueDate: shortage.dueDate ? dayjs(shortage.dueDate) : null
          });
          setModalVisible(prev => ({ ...prev, updateShortage: true }));
          break;
          
        case 'delete':
          Modal.confirm({
            title: 'Delete Shortage',
            content: 'Are you sure you want to delete this shortage? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
              if (onDeleteShortage) {
                await onDeleteShortage(shortage.id);
              } else {
                await shortageService.deleteShortage(shortage.id);
                message.success('Shortage deleted successfully');
              }
              fetchShortages();
              if (onActionComplete) onActionComplete('delete', shortage);
            }
          });
          break;
          
        case 'deduction':
          setSelectedShortage(shortage);
          forms.createDeduction.setFieldsValue({
            amount: Math.min(shortage.amountRemaining, 100),
            deductionDate: dayjs(),
            paymentMethod: 'CASH'
          });
          setModalVisible(prev => ({ ...prev, createDeduction: true }));
          break;
          
        case 'writeOff':
          Modal.confirm({
            title: 'Write Off Shortage',
            content: 'Are you sure you want to write off this shortage? This action cannot be undone.',
            okText: 'Write Off',
            okType: 'danger',
            onOk: async () => {
              if (onWriteOff) {
                await onWriteOff(shortage.id);
              } else {
                await shortageService.updateShortage(shortage.id, { status: 'WRITTEN_OFF' });
                message.success('Shortage written off successfully');
              }
              fetchShortages();
              if (onActionComplete) onActionComplete('writeOff', shortage);
            }
          });
          break;
          
        default:
          if (customActions?.[action]) {
            customActions[action](shortage, data);
          }
          break;
      }
    } catch (error) {
      console.error(`Error in ${action} action:`, error);
      message.error(`Failed to ${action} shortage`);
    }
  };

  // Handle form submissions
  const handleUpdateShortage = async (values) => {
    if (!selectedShortage) return;
    
    try {
      if (onUpdateShortage) {
        await onUpdateShortage(selectedShortage.id, values);
      } else {
        await shortageService.updateShortage(selectedShortage.id, values);
        message.success('Shortage updated successfully');
      }
      
      setModalVisible(prev => ({ ...prev, updateShortage: false }));
      forms.updateShortage.resetFields();
      setSelectedShortage(null);
      fetchShortages();
      if (onActionComplete) onActionComplete('update', selectedShortage);
    } catch (error) {
      console.error('Failed to update shortage:', error);
      message.error(error.message || 'Failed to update shortage');
    }
  };

  const handleCreateDeduction = async (values) => {
    if (!selectedShortage) return;
    
    try {
      if (onAddDeduction) {
        await onAddDeduction(selectedShortage.id, values);
      } else {
        await shortageService.createDeduction(selectedShortage.id, values);
        message.success('Deduction recorded successfully');
      }
      
      setModalVisible(prev => ({ ...prev, createDeduction: false }));
      forms.createDeduction.resetFields();
      setSelectedShortage(null);
      fetchShortages();
      if (onActionComplete) onActionComplete('deduction', selectedShortage);
    } catch (error) {
      console.error('Failed to create deduction:', error);
      message.error(error.message || 'Failed to record deduction');
    }
  };

  // Initialize
  useEffect(() => {
    fetchShortages();
  }, [internalFilters, refreshKey]);

  // Auto-refresh
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchShortages, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Base columns that can be extended or overridden
  const baseColumns = [
    {
      title: 'Staff Member',
      key: 'staff',
      width: mode === 'compact' ? 150 : 200,
      render: (shortage) => (
        <Space>
          <Avatar 
            size={mode === 'compact' ? 'small' : 'default'}
            style={{ 
              backgroundColor: shortage.isOverdue ? '#ff4d4f' : '#1890ff',
              fontSize: mode === 'compact' ? '12px' : '14px'
            }}
            icon={<UserOutlined />}
          >
            {shortage.staffDisplayName?.[0] || 'S'}
          </Avatar>
          <div>
            <div style={{ 
              fontWeight: 'bold',
              fontSize: mode === 'compact' ? '12px' : '14px'
            }}>
              {mode === 'compact' ? 
                (shortage.staffDisplayName?.split(' ')[0] || 'Staff') : 
                shortage.staffDisplayName}
            </div>
            {mode !== 'compact' && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                {shortage.stationDisplayName}
              </div>
            )}
          </div>
        </Space>
      ),
      sorter: (a, b) => a.staffDisplayName.localeCompare(b.staffDisplayName)
    },
    {
      title: 'Amount',
      key: 'amount',
      width: mode === 'compact' ? 100 : 120,
      render: (shortage) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: mode === 'compact' ? '12px' : '14px' }}>
            {shortage.amountDisplay}
          </Text>
          {shortage.hasOutstanding && (
            <Text type="danger" style={{ fontSize: '11px' }}>
              {shortage.amountRemainingDisplay} remaining
            </Text>
          )}
        </Space>
      ),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Status',
      key: 'status',
      width: mode === 'compact' ? 100 : 120,
      render: (shortage) => (
        <Space direction="vertical" size={2}>
          <Badge 
            status={shortage.statusBadge} 
            text={
              <Text style={{ fontSize: mode === 'compact' ? '11px' : '12px' }}>
                {mode === 'compact' ? 
                  shortage.statusDisplay.substring(0, 3) : 
                  shortage.statusDisplay}
              </Text>
            }
          />
          {shortage.isOverdue && (
            <Tag 
              color="red" 
              icon={<ClockCircleOutlined />}
              size={mode === 'compact' ? 'small' : 'default'}
            >
              {mode === 'compact' ? '!' : 'Overdue'}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Severity',
      key: 'severity',
      width: mode === 'compact' ? 80 : 100,
      render: (shortage) => (
        <Tag 
          color={shortage.severityBadge} 
          style={{ margin: 0 }}
          size={mode === 'compact' ? 'small' : 'default'}
        >
          {mode === 'compact' ? 
            shortage.severityDisplay.substring(0, 1) : 
            shortage.severityDisplay}
        </Tag>
      )
    },
    {
      title: 'Due Date',
      key: 'dueDate',
      width: mode === 'compact' ? 100 : 120,
      render: (shortage) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontSize: '12px' }}>
            {shortage.dueDateDisplay}
          </div>
          <Text 
            type={shortage.isOverdue ? 'danger' : 'secondary'}
            style={{ fontSize: '11px' }}
          >
            {shortage.daysUntilDueDisplay}
          </Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
    }
  ];

  // Progress column for full mode
  if (mode === 'full' || mode === 'list') {
    baseColumns.push({
      title: 'Progress',
      key: 'progress',
      width: 150,
      render: (shortage) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Progress
            percent={parseFloat(shortage.percentagePaid)}
            size="small"
            strokeColor={shortage.percentagePaid >= 100 ? '#52c41a' : '#1890ff'}
            showInfo={false}
          />
          <div style={{ fontSize: '12px', textAlign: 'center' }}>
            <Text type="secondary">
              {shortage.percentagePaid}% Paid
            </Text>
          </div>
        </Space>
      )
    });
  }

  // Actions column if showActions is true
  if (showActions && (mode === 'full' || mode === 'list')) {
    baseColumns.push({
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (shortage) => {
        const actionItems = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => handleAction('view', shortage)
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined />,
            onClick: () => handleAction('edit', shortage),
            disabled: !shortage.canEdit
          },
          {
            key: 'deduction',
            label: 'Add Deduction',
            icon: <MoneyCollectOutlined />,
            onClick: () => handleAction('deduction', shortage),
            disabled: !shortage.canAddDeduction
          },
          {
            type: 'divider'
          },
          {
            key: 'writeOff',
            label: 'Write Off',
            icon: <FileTextOutlined />,
            danger: true,
            onClick: () => handleAction('writeOff', shortage),
            disabled: !shortage.canWriteOff
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleAction('delete', shortage),
            disabled: !shortage.canDelete
          }
        ];

        // Add custom actions if provided
        if (customActions) {
          Object.entries(customActions).forEach(([key, action]) => {
            if (action.showInMenu !== false) {
              actionItems.push({
                key,
                label: action.label || key,
                icon: action.icon,
                danger: action.danger,
                disabled: action.disabled?.(shortage),
                onClick: () => handleAction(key, shortage)
              });
            }
          });
        }

        return (
          <Space size="small">
            <Tooltip title="Add Deduction">
              <Button
                icon={<MoneyCollectOutlined />}
                size="small"
                onClick={() => handleAction('deduction', shortage)}
                disabled={!shortage.canAddDeduction}
              />
            </Tooltip>
            
            <Dropdown
              menu={{ items: actionItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                icon={<MoreOutlined />}
                size="small"
              />
            </Dropdown>
          </Space>
        );
      }
    });
  }

  // Use custom columns if provided
  const columns = customColumns || baseColumns;

  // Render different modes
  const renderContent = () => {
    switch (mode) {
      case 'compact':
        return (
          <Table
            columns={columns}
            dataSource={shortages}
            loading={internalLoading || loading}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        );
        
      case 'dashboard':
        return (
          <div className="space-y-2">
            {shortages.slice(0, 5).map(shortage => (
              <Card key={shortage.id} size="small" className="shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar 
                      size="small"
                      style={{ 
                        backgroundColor: shortage.isOverdue ? '#ff4d4f' : '#1890ff'
                      }}
                      icon={<UserOutlined />}
                    >
                      {shortage.staffDisplayName?.[0]}
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {shortage.staffDisplayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {shortage.amountDisplay}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Tag 
                      color={shortage.severityBadge}
                      size="small"
                    >
                      {shortage.severityDisplay}
                    </Tag>
                    {shortage.isOverdue && (
                      <Tag color="red" size="small" className="ml-1">
                        !
                      </Tag>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );
        
      case 'list':
        return (
          <Table
            columns={columns}
            dataSource={shortages}
            loading={internalLoading || loading}
            rowKey="id"
            size="middle"
            pagination={{
              pageSize,
              showSizeChanger: true,
              showQuickJumper: true
            }}
            scroll={{ x: 1000 }}
          />
        );
        
      case 'full':
      default:
        return (
          <>
            {showFilters && (
              <Card size="small" className="shadow-sm mb-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Search..."
                    value={internalFilters.search}
                    onChange={(e) => setInternalFilters(prev => ({ ...prev, search: e.target.value }))}
                    prefix={<SearchOutlined />}
                    style={{ width: 200 }}
                    allowClear
                  />
                  <Select
                    placeholder="Status"
                    value={internalFilters.status}
                    onChange={(value) => setInternalFilters(prev => ({ ...prev, status: value }))}
                    style={{ width: 120 }}
                  >
                    <Option value="all">All</Option>
                    <Option value="ACTIVE">Active</Option>
                    <Option value="PARTIALLY_DEDUCTED">Partial</Option>
                    <Option value="FULLY_DEDUCTED">Paid</Option>
                    <Option value="WRITTEN_OFF">Written Off</Option>
                  </Select>
                  <Select
                    placeholder="Severity"
                    value={internalFilters.severity}
                    onChange={(value) => setInternalFilters(prev => ({ ...prev, severity: value }))}
                    style={{ width: 120 }}
                  >
                    <Option value="all">All</Option>
                    <Option value="MINOR">Minor</Option>
                    <Option value="MODERATE">Moderate</Option>
                    <Option value="MAJOR">Major</Option>
                    <Option value="CRITICAL">Critical</Option>
                  </Select>
                  <Select
                    placeholder="Type"
                    value={internalFilters.shortageType}
                    onChange={(value) => setInternalFilters(prev => ({ ...prev, shortageType: value }))}
                    style={{ width: 120 }}
                  >
                    <Option value="all">All</Option>
                    <Option value="CASH">Cash</Option>
                    <Option value="INVENTORY">Inventory</Option>
                    <Option value="PRODUCT">Product</Option>
                    <Option value="EQUIPMENT">Equipment</Option>
                    <Option value="OTHER">Other</Option>
                  </Select>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={fetchShortages}
                  >
                    Apply
                  </Button>
                </div>
              </Card>
            )}
            
            <Table
              columns={columns}
              dataSource={shortages}
              loading={internalLoading || loading}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `${total} shortages`
              }}
              scroll={{ x: 1200 }}
              expandable={{
                expandedRowRender: (shortage) => (
                  <div style={{ padding: '16px', background: '#fafafa' }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium mb-2">Description</div>
                        <div className="text-sm">{shortage.description}</div>
                      </div>
                      <div>
                        <div className="font-medium mb-2">Payment Progress</div>
                        <Progress
                          percent={parseFloat(shortage.percentagePaid)}
                          size="small"
                          strokeColor={shortage.percentagePaid >= 100 ? '#52c41a' : '#1890ff'}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {shortage.totalDeductedDisplay} paid of {shortage.amountDisplay}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
          </>
        );
    }
  };

  // Empty state
  const renderEmpty = () => (
    <Alert
      message="No Shortages Found"
      description="No shortages match your criteria. Try adjusting your filters."
      type="info"
      showIcon
    />
  );

  return (
    <>
      <div className="space-y-4">
        {showHeader && mode === 'full' && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center">
                <AccountBookOutlined className="mr-2" />
                Shortages
                {shortages.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({shortages.length})
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-sm">
                {roleBased ? (
                  isAttendant ? 'Your shortages' :
                  isStationBased ? 'Shortages in your station' :
                  isCompanyAdmin ? 'Company shortages' :
                  'All shortages'
                ) : 'All shortages'}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                icon={<FilterOutlined />}
                onClick={() => setInternalFilters({ ...internalFilters })}
              >
                Filters
              </Button>
              <Button
                icon={<SearchOutlined />}
                onClick={fetchShortages}
              >
                Refresh
              </Button>
              {onCreateShortage && (
                <Button
                  type="primary"
                  icon={<AccountBookOutlined />}
                  onClick={onCreateShortage}
                >
                  New Shortage
                </Button>
              )}
            </div>
          </div>
        )}

        {shortages.length === 0 && !internalLoading && !loading ? (
          renderEmpty()
        ) : (
          renderContent()
        )}
      </div>

      {/* Modals */}
      {/* View Details Modal */}
      <Modal
        title="Shortage Details"
        open={modalVisible.viewDetails}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, viewDetails: false }));
          setSelectedShortage(null);
        }}
        footer={[
          <Button key="close" onClick={() => setModalVisible(prev => ({ ...prev, viewDetails: false }))}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedShortage && (
          <div className="space-y-4">
            <Descriptions title="Basic Information" bordered size="small" column={2}>
              <Descriptions.Item label="Staff">{selectedShortage.staffDisplayName}</Descriptions.Item>
              <Descriptions.Item label="Station">{selectedShortage.stationDisplayName}</Descriptions.Item>
              <Descriptions.Item label="Amount">{selectedShortage.amountDisplay}</Descriptions.Item>
              <Descriptions.Item label="Remaining">{selectedShortage.amountRemainingDisplay}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={selectedShortage.statusBadge} text={selectedShortage.statusDisplay} />
              </Descriptions.Item>
              <Descriptions.Item label="Severity">
                <Tag color={selectedShortage.severityBadge}>{selectedShortage.severityDisplay}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <div className="font-medium mb-2">Description</div>
              <div className="text-gray-700">{selectedShortage.description}</div>
            </div>

            {selectedShortage.comments && (
              <>
                <Divider />
                <div>
                  <div className="font-medium mb-2">Comments</div>
                  <div className="text-gray-600">{selectedShortage.comments}</div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Update Shortage Modal */}
      <Modal
        title="Update Shortage"
        open={modalVisible.updateShortage}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, updateShortage: false }));
          setSelectedShortage(null);
          forms.updateShortage.resetFields();
        }}
        onOk={() => forms.updateShortage.submit()}
        okText="Update"
        cancelText="Cancel"
        width={500}
      >
        {selectedShortage && (
          <Form form={forms.updateShortage} layout="vertical" onFinish={handleUpdateShortage}>
            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <TextArea rows={3} maxLength={500} />
            </Form.Item>

            <Form.Item
              name="comments"
              label="Comments"
            >
              <TextArea rows={2} maxLength={1000} />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="severity"
                label="Severity"
              >
                <Select>
                  <Option value="MINOR">Minor</Option>
                  <Option value="MODERATE">Moderate</Option>
                  <Option value="MAJOR">Major</Option>
                  <Option value="CRITICAL">Critical</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="status"
                label="Status"
              >
                <Select>
                  <Option value="ACTIVE">Active</Option>
                  <Option value="PARTIALLY_DEDUCTED">Partially Deducted</Option>
                  <Option value="FULLY_DEDUCTED">Fully Deducted</Option>
                  <Option value="WRITTEN_OFF">Written Off</Option>
                </Select>
              </Form.Item>
            </div>
          </Form>
        )}
      </Modal>

      {/* Create Deduction Modal */}
      <Modal
        title="Add Deduction"
        open={modalVisible.createDeduction}
        onCancel={() => {
          setModalVisible(prev => ({ ...prev, createDeduction: false }));
          setSelectedShortage(null);
          forms.createDeduction.resetFields();
        }}
        onOk={() => forms.createDeduction.submit()}
        okText="Add Deduction"
        cancelText="Cancel"
        width={400}
      >
        {selectedShortage && (
          <Form form={forms.createDeduction} layout="vertical" onFinish={handleCreateDeduction}>
            <Alert
              message={`Outstanding: ${selectedShortage.amountRemainingDisplay}`}
              type="info"
              showIcon
              className="mb-4"
            />

            <Form.Item
              name="amount"
              label="Amount"
              rules={[
                { required: true, message: 'Please enter amount' },
                { type: 'number', min: 0.01, message: 'Amount must be positive' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value <= selectedShortage.amountRemaining) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(`Amount cannot exceed ${selectedShortage.amountRemainingDisplay}`));
                  },
                }),
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                max={selectedShortage.amountRemaining}
                step={0.01}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Payment Method"
              initialValue="CASH"
            >
              <Select>
                <Option value="CASH">Cash</Option>
                <Option value="BANK_TRANSFER">Bank Transfer</Option>
                <Option value="MOBILE_MONEY">Mobile Money</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default ShortageComponent;