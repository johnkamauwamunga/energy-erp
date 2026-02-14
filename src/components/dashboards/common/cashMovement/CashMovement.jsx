// src/components/collections/CashMovement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Tabs,
  Row,
  Col,
  Select,
  Button,
  DatePicker,
  Space,
  Statistic,
  Table,
  Alert,
  Spin,
  Typography,
  Tag,
  Badge,
  Divider,
  Input,
  Checkbox,
  Form,
  Tooltip,
  Empty,
  message,
  Modal,
  Descriptions,
  Progress,
  Collapse,
  InputNumber
} from 'antd';
import {
  DollarOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TransactionOutlined,
  DashboardOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../../../../context/AppContext';
import CollectionService from '../../../../services/collectionService/collectionService';
import { formatCurrency, formatDate } from '../../../../services/collectionService/collectionService';
import { operationsService } from '../../../../services/operationService/operationService';
import { stationService } from '../../../../services/stationService/stationService';
import AdvancedReportGenerator from '../downloadable/AdvancedReportGenerator';
import './CashMovement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

// ==================== SIMPLIFIED FILTER SECTION ====================
const FilterSection = ({ activeTab, filters, onFilterChange, onFetchData, loading, 
  stations, islands, shifts, attendants, currentUser }) => {
  
  const renderTabFilters = () => {
    const commonFilters = (
      <Row gutter={[8, 8]} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Form.Item style={{ marginBottom: 0 }}>
            <RangePicker
              value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
              onChange={(dates, dateStrings) => {
                onFilterChange('startDate', dateStrings[0]);
                onFilterChange('endDate', dateStrings[1]);
              }}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              size="small"
              placeholder={['Start', 'End']}
            />
          </Form.Item>
        </Col>
        
        {(currentUser?.isSuperAdmin || currentUser?.isCompanyAdmin) && (
          <Col xs={24} sm={12} md={5}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Select
                value={filters.stationId}
                onChange={(value) => onFilterChange('stationId', value)}
                placeholder="Station"
                style={{ width: '100%' }}
                size="small"
                allowClear
              >
                {stations.map(station => (
                  <Option key={station.id} value={station.id}>
                    {station.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        )}
        
        <Col xs={24} sm={12} md={5}>
          <Form.Item style={{ marginBottom: 0 }}>
            <Select
              value={filters.status}
              onChange={(value) => onFilterChange('status', value)}
              placeholder="Status"
              style={{ width: '100%' }}
              size="small"
              allowClear
            >
              <Option value="PENDING">Pending</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="VERIFIED">Verified</Option>
              <Option value="COUNTED">Counted</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    );

    switch (activeTab) {
      case 'island':
        return (
          <div>
            <Row gutter={[8, 8]} align="middle">
              <Col xs={24} sm={12} md={5}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.islandId}
                    onChange={(value) => onFilterChange('islandId', value)}
                    placeholder="Island"
                    style={{ width: '100%' }}
                    size="small"
                    allowClear
                  >
                    {islands.map(island => (
                      <Option key={island.id} value={island.id}>
                        {island.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={5}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.attendantId}
                    onChange={(value) => onFilterChange('attendantId', value)}
                    placeholder="Attendant"
                    style={{ width: '100%' }}
                    size="small"
                    allowClear
                  >
                    {attendants.map(attendant => (
                      <Option key={attendant.id} value={attendant.id}>
                        {attendant.firstName} {attendant.lastName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Space size="small">
                  <Checkbox
                    checked={filters.includeExpenses}
                    onChange={(e) => onFilterChange('includeExpenses', e.target.checked)}
                    style={{ fontSize: '12px' }}
                  >
                    Expenses
                  </Checkbox>
                  <Checkbox
                    checked={filters.includeDebts}
                    onChange={(e) => onFilterChange('includeDebts', e.target.checked)}
                    style={{ fontSize: '12px' }}
                  >
                    Debts
                  </Checkbox>
                </Space>
              </Col>
              
              <Col xs={24} sm={12} md={4}>
                <Space>
                  <Button
                    type="primary"
                    onClick={onFetchData}
                    loading={loading}
                    icon={<ReloadOutlined />}
                    size="small"
                  >
                    Load
                  </Button>
                  <Button
                    onClick={() => {
                      onFilterChange('islandId', null);
                      onFilterChange('attendantId', null);
                      onFilterChange('includeExpenses', false);
                      onFilterChange('includeDebts', false);
                    }}
                    size="small"
                  >
                    Clear
                  </Button>
                </Space>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            {commonFilters}
          </div>
        );

      case 'shift':
        return (
          <div>
            <Row gutter={[8, 8]} align="middle">
              <Col xs={24} sm={12} md={5}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.shiftId}
                    onChange={(value) => onFilterChange('shiftId', value)}
                    placeholder="Shift"
                    style={{ width: '100%' }}
                    size="small"
                    allowClear
                  >
                    {shifts.map(shift => (
                      <Option key={shift.id} value={shift.id}>
                        #{shift.shiftNumber}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={5}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.sortBy}
                    onChange={(value) => onFilterChange('sortBy', value)}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    <Option value="countedAt">Counted Date</Option>
                    <Option value="cashAmount">Cash Amount</Option>
                    <Option value="grandTotal">Grand Total</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={4}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Select
                    value={filters.sortOrder}
                    onChange={(value) => onFilterChange('sortOrder', value)}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    <Option value="desc">Newest</Option>
                    <Option value="asc">Oldest</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Space>
                  <Button
                    type="primary"
                    onClick={onFetchData}
                    loading={loading}
                    icon={<ReloadOutlined />}
                    size="small"
                  >
                    Load
                  </Button>
                  <Button
                    onClick={() => {
                      onFilterChange('shiftId', null);
                      onFilterChange('sortBy', 'countedAt');
                      onFilterChange('sortOrder', 'desc');
                    }}
                    size="small"
                  >
                    Clear
                  </Button>
                </Space>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            {commonFilters}
          </div>
        );

      case 'daily':
        return (
          <Row gutter={[8, 8]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Form.Item style={{ marginBottom: 0 }}>
                <DatePicker
                  value={dayjs(filters.reportDate)}
                  onChange={(date, dateString) => onFilterChange('reportDate', dateString)}
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  size="small"
                  placeholder="Report Date"
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Space size="small">
                <Checkbox
                  checked={filters.includeExpenses}
                  onChange={(e) => onFilterChange('includeExpenses', e.target.checked)}
                  style={{ fontSize: '12px' }}
                >
                  Expenses
                </Checkbox>
                <Checkbox
                  checked={filters.includeDebts}
                  onChange={(e) => onFilterChange('includeDebts', e.target.checked)}
                  style={{ fontSize: '12px' }}
                >
                  Debts
                </Checkbox>
              </Space>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Button
                type="primary"
                onClick={onFetchData}
                loading={loading}
                icon={<ReloadOutlined />}
                size="small"
              >
                Generate
              </Button>
            </Col>
          </Row>
        );

      case 'performance':
        return (
          <Row gutter={[8, 8]} align="middle">
            <Col xs={24} sm={12} md={5}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Select
                  value={filters.reportPeriod}
                  onChange={(value) => onFilterChange('reportPeriod', value)}
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Option value="daily">Daily</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="monthly">Monthly</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={5}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Select
                  value={filters.reportGroupBy}
                  onChange={(value) => onFilterChange('reportGroupBy', value)}
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Option value="station">Station</Option>
                  <Option value="attendant">Attendant</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Button
                type="primary"
                onClick={onFetchData}
                loading={loading}
                icon={<ReloadOutlined />}
                size="small"
              >
                Generate
              </Button>
            </Col>
          </Row>
        );

      case 'dashboard':
        return (
          <Row>
            <Col xs={24}>
              <Button
                type="primary"
                onClick={onFetchData}
                loading={loading}
                icon={<ReloadOutlined />}
                size="small"
              >
                Refresh Dashboard
              </Button>
            </Col>
          </Row>
        );

      default:
        return commonFilters;
    }
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      {renderTabFilters()}
    </Card>
  );
};

// ==================== COMPACT SUMMARY CARDS ====================
const SummaryCards = ({ summary, tableData, activeTab }) => {
  if (!summary && !tableData?.length) return null;

  const getTabSummary = () => {
    const totalRecords = tableData?.length || 0;
    
    switch (activeTab) {
      case 'island':
        const totalCash = tableData?.reduce((sum, item) => sum + (parseFloat(item.cashAmount) || 0), 0) || 0;
        const totalShortage = tableData?.reduce((sum, item) => sum + (parseFloat(item.shortageAmount) || 0), 0) || 0;
        const totalOverage = tableData?.reduce((sum, item) => sum + (parseFloat(item.overageAmount) || 0), 0) || 0;
        
        return {
          totalCash,
          totalShortage,
          totalOverage,
          totalRecords
        };
        
      case 'shift':
        const shiftCash = tableData?.reduce((sum, item) => sum + (parseFloat(item.cashAmount) || 0), 0) || 0;
        const shiftVariance = tableData?.reduce((sum, item) => sum + (parseFloat(item.cashVariance) || 0), 0) || 0;
        
        return {
          totalCash: shiftCash,
          totalVariance: shiftVariance,
          totalRecords
        };
        
      case 'daily':
        return {
          totalCash: summary?.totalCash || 0,
          totalRecords: summary?.totalShiftCollections || 0
        };
        
      case 'performance':
        return {
          totalCash: summary?.totalCash || 0,
          totalRecords: summary?.totalShiftCollections || 0
        };
        
      default:
        return { totalRecords };
    }
  };

  const tabSummary = getTabSummary();

  return (
    <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={6} md={4}>
        <Card size="small" bodyStyle={{ padding: '8px' }}>
          <Statistic
            title={<span style={{ fontSize: '11px' }}>Records</span>}
            value={tabSummary.totalRecords}
            valueStyle={{ color: '#1890ff', fontSize: '14px' }}
          />
        </Card>
      </Col>
      
      <Col xs={12} sm={6} md={4}>
        <Card size="small" bodyStyle={{ padding: '8px' }}>
          <Statistic
            title={<span style={{ fontSize: '11px' }}>Cash</span>}
            value={tabSummary.totalCash || 0}
            precision={0}
            prefix="KES"
            valueStyle={{ color: '#52c41a', fontSize: '14px' }}
          />
        </Card>
      </Col>
      
      {(tabSummary.totalShortage !== undefined || tabSummary.totalVariance !== undefined) && (
        <Col xs={12} sm={6} md={4}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>{tabSummary.totalShortage !== undefined ? "Shortage" : "Variance"}</span>}
              value={tabSummary.totalShortage || tabSummary.totalVariance || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ 
                color: (tabSummary.totalShortage || tabSummary.totalVariance) < 0 ? '#ff4d4f' : '#52c41a',
                fontSize: '14px'
              }}
            />
          </Card>
        </Col>
      )}
      
      {tabSummary.totalOverage !== undefined && (
        <Col xs={12} sm={6} md={4}>
          <Card size="small" bodyStyle={{ padding: '8px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px' }}>Overage</span>}
              value={tabSummary.totalOverage || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#722ed1', fontSize: '14px' }}
            />
          </Card>
        </Col>
      )}
    </Row>
  );
};

// ==================== SIMPLIFIED TABLE COLUMNS ====================
const useTableColumns = (activeTab, currentUser, onViewDetails, onViewMoneyFlow) => {
  return useMemo(() => {
    const getStatusTag = (status) => {
      const statusMap = {
        'PENDING': { color: 'orange', icon: <ClockCircleOutlined /> },
        'APPROVED': { color: 'green', icon: <CheckCircleOutlined /> },
        'VERIFIED': { color: 'blue', icon: <CheckCircleOutlined /> },
        'COUNTED': { color: 'green', icon: <CheckCircleOutlined /> },
        'REJECTED': { color: 'red', icon: <CloseCircleOutlined /> },
        'UNDER_REVIEW': { color: 'gold', icon: <ExclamationCircleOutlined /> }
      };
      
      const config = statusMap[status?.toUpperCase()] || { color: 'default', icon: null };
      
      return (
        <Tag color={config.color} icon={config.icon} style={{ fontSize: '10px', padding: '0 4px' }}>
          {status}
        </Tag>
      );
    };

    const commonColumns = [
      {
        title: '#',
        key: 'sequence',
        width: 40,
        align: 'center',
        render: (_, __, index) => (
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {index + 1}
          </Text>
        )
      }
    ];

    const actionsColumn = {
      title: '',
      key: 'actions',
      width: 50,
      fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined style={{ fontSize: '12px' }} />}
              onClick={() => onViewDetails(record)}
              size="small"
              style={{ padding: '0 2px' }}
            />
          </Tooltip>
          {activeTab === 'shift' && (
            <Tooltip title="Money Flow">
              <Button
                type="link"
                icon={<TransactionOutlined style={{ fontSize: '12px' }} />}
                onClick={() => onViewMoneyFlow(record.id)}
                size="small"
                style={{ padding: '0 2px' }}
              />
            </Tooltip>
          )}
        </Space>
      )
    };

    switch (activeTab) {
      case 'island':
        return [
          ...commonColumns,
          {
            title: 'Island',
            key: 'island',
            width: 100,
            render: (_, record) => (
              <div>
                <div style={{ fontWeight: '500', fontSize: '11px' }}>
                  {record.islandName || record.island?.name || 'N/A'}
                </div>
              </div>
            )
          },
          {
            title: 'Attendant',
            dataIndex: 'attendantName',
            key: 'attendantName',
            width: 80,
            render: (value) => (
              <Text style={{ fontSize: '10px' }}>{value || 'N/A'}</Text>
            )
          },
          {
            title: 'Cash',
            key: 'cash',
            width: 80,
            align: 'right',
            render: (_, record) => (
              <div>
                <div style={{ fontWeight: '500', fontSize: '11px', color: '#1890ff' }}>
                  {formatCurrency(record.cashAmount || 0)}
                </div>
              </div>
            )
          },
          {
            title: 'Short/Overage',
            key: 'variance',
            width: 80,
            render: (_, record) => {
              const shortage = parseFloat(record.shortageAmount) || 0;
              const overage = parseFloat(record.overageAmount) || 0;
              
              if (shortage > 0) {
                return (
                  <Text type="danger" style={{ fontSize: '10px' }}>
                    -{formatCurrency(shortage)}
                  </Text>
                );
              } else if (overage > 0) {
                return (
                  <Text type="success" style={{ fontSize: '10px' }}>
                    +{formatCurrency(overage)}
                  </Text>
                );
              }
              return <Text type="secondary" style={{ fontSize: '10px' }}>-</Text>;
            }
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 70,
            render: getStatusTag
          },
          {
            title: 'Time',
            dataIndex: 'countedAt',
            key: 'countedAt',
            width: 90,
            render: (value) => (
              <Text style={{ fontSize: '9px' }}>
                {value ? formatDate(value, 'time') : 'N/A'}
              </Text>
            )
          },
          actionsColumn
        ];

      case 'shift':
        return [
          ...commonColumns,
          {
            title: 'Shift',
            dataIndex: 'shiftNumber',
            key: 'shiftNumber',
            width: 50,
            render: (value) => (
              <Text strong style={{ fontSize: '11px' }}>#{value}</Text>
            )
          },
          {
            title: 'Supervisor',
            dataIndex: 'supervisorName',
            key: 'supervisorName',
            width: 80,
            render: (value) => (
              <Text style={{ fontSize: '10px' }}>{value || 'N/A'}</Text>
            )
          },
          {
            title: 'Cash',
            key: 'cash',
            width: 80,
            align: 'right',
            render: (_, record) => (
              <div>
                <div style={{ fontWeight: '500', fontSize: '11px', color: '#1890ff' }}>
                  {formatCurrency(record.cashAmount || 0)}
                </div>
              </div>
            )
          },
          {
            title: 'Variance',
            dataIndex: 'cashVariance',
            key: 'cashVariance',
            width: 70,
            align: 'right',
            render: (value) => {
              const numValue = parseFloat(value) || 0;
              return (
                <Text style={{
                  color: numValue >= 0 ? '#52c41a' : '#ff4d4f',
                  fontWeight: '500',
                  fontSize: '10px'
                }}>
                  {formatCurrency(numValue)}
                </Text>
              );
            }
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 70,
            render: getStatusTag
          },
          {
            title: 'Counted',
            dataIndex: 'countedAt',
            key: 'countedAt',
            width: 90,
            render: (value) => (
              <Text style={{ fontSize: '9px' }}>
                {value ? formatDate(value, 'short') : 'N/A'}
              </Text>
            )
          },
          actionsColumn
        ];

      case 'daily':
        return [
          ...commonColumns,
          {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            width: 70,
            render: (value) => (
              <Text style={{ fontSize: '10px' }}>{formatDate(value, 'short')}</Text>
            )
          },
          {
            title: 'Station',
            dataIndex: 'stationName',
            key: 'stationName',
            width: 100,
            render: (value) => (
              <Text style={{ fontSize: '10px' }}>{value || 'N/A'}</Text>
            )
          },
          {
            title: 'Collections',
            dataIndex: 'totalShiftCollections',
            key: 'totalShiftCollections',
            width: 60,
            align: 'right',
            render: (value) => (
              <Badge count={value || 0} style={{ backgroundColor: '#1890ff', fontSize: '9px' }} />
            )
          },
          {
            title: 'Cash',
            dataIndex: 'totalCash',
            key: 'totalCash',
            width: 80,
            align: 'right',
            render: (value) => (
              <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>
                {formatCurrency(value || 0)}
              </Text>
            )
          },
          {
            title: 'Shortage',
            dataIndex: 'totalShortage',
            key: 'totalShortage',
            width: 70,
            align: 'right',
            render: (value) => (
              <Text type="danger" style={{ fontSize: '10px' }}>
                {formatCurrency(value || 0)}
              </Text>
            )
          },
          {
            title: 'Overage',
            dataIndex: 'totalOverage',
            key: 'totalOverage',
            width: 70,
            align: 'right',
            render: (value) => (
              <Text type="success" style={{ fontSize: '10px' }}>
                {formatCurrency(value || 0)}
              </Text>
            )
          }
        ];

      case 'performance':
        return [
          ...commonColumns,
          {
            title: 'Rank',
            dataIndex: 'rank',
            key: 'rank',
            width: 40,
            align: 'center',
            render: (value) => (
              <Badge
                count={value}
                style={{
                  backgroundColor: value <= 3 ? 
                    value === 1 ? '#f5222d' : 
                    value === 2 ? '#fa8c16' : 
                    '#52c41a' : '#d9d9d9',
                  fontSize: '9px'
                }}
              />
            )
          },
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 120,
            render: (value) => (
              <Text style={{ fontSize: '11px' }}>{value}</Text>
            )
          },
          {
            title: 'Collections',
            dataIndex: 'shiftCount',
            key: 'shiftCount',
            width: 60,
            align: 'right',
            render: (value) => (
              <Badge count={value || 0} style={{ backgroundColor: '#1890ff', fontSize: '9px' }} />
            )
          },
          {
            title: 'Cash',
            dataIndex: 'totalCash',
            key: 'totalCash',
            width: 90,
            align: 'right',
            render: (value) => (
              <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>
                {formatCurrency(value || 0)}
              </Text>
            )
          },
          {
            title: 'Debts',
            dataIndex: 'totalDebts',
            key: 'totalDebts',
            width: 80,
            align: 'right',
            render: (value) => (
              <Text style={{ fontSize: '10px', color: '#fa8c16' }}>
                {formatCurrency(value || 0)}
              </Text>
            )
          },
          {
            title: 'Grand Total',
            dataIndex: 'totalGrandTotal',
            key: 'totalGrandTotal',
            width: 90,
            align: 'right',
            render: (value) => (
              <Text strong style={{ fontSize: '11px', color: '#52c41a' }}>
                {formatCurrency(value || 0)}
              </Text>
            )
          }
        ];

      default:
        return commonColumns;
    }
  }, [activeTab, currentUser, onViewDetails, onViewMoneyFlow]);
};

// ==================== REPORT GENERATION ====================
const getReportColumnsForTab = (activeTab) => {
  switch (activeTab) {
    case 'island':
      return [
        { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
        { title: 'Island', dataIndex: 'Island', key: 'island', width: 120, type: 'text' },
        { title: 'Attendant', dataIndex: 'Attendant', key: 'attendant', width: 120, type: 'text' },
        { title: 'Cash (KES)', dataIndex: 'Cash', key: 'cash', width: 100, type: 'currency' },
        { title: 'Shortage (KES)', dataIndex: 'Shortage', key: 'shortage', width: 100, type: 'currency' },
        { title: 'Overage (KES)', dataIndex: 'Overage', key: 'overage', width: 100, type: 'currency' },
        { title: 'Status', dataIndex: 'Status', key: 'status', width: 80, type: 'text' },
        { title: 'Counted At', dataIndex: 'Counted At', key: 'countedAt', width: 120, type: 'datetime' },
        { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' }
      ];
      
    case 'shift':
      return [
        { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
        { title: 'Shift', dataIndex: 'Shift', key: 'shift', width: 80, type: 'text' },
        { title: 'Supervisor', dataIndex: 'Supervisor', key: 'supervisor', width: 120, type: 'text' },
        { title: 'Cash (KES)', dataIndex: 'Cash', key: 'cash', width: 100, type: 'currency' },
        { title: 'Grand Total (KES)', dataIndex: 'Grand Total', key: 'grandTotal', width: 120, type: 'currency' },
        { title: 'Variance (KES)', dataIndex: 'Variance', key: 'variance', width: 100, type: 'currency' },
        { title: 'Status', dataIndex: 'Status', key: 'status', width: 80, type: 'text' },
        { title: 'Counted At', dataIndex: 'Counted At', key: 'countedAt', width: 120, type: 'datetime' },
        { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' }
      ];
      
    case 'daily':
      return [
        { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
        { title: 'Date', dataIndex: 'Date', key: 'date', width: 100, type: 'date' },
        { title: 'Station', dataIndex: 'Station', key: 'station', width: 120, type: 'text' },
        { title: 'Collections', dataIndex: 'Collections', key: 'collections', width: 80, type: 'number' },
        { title: 'Total Cash (KES)', dataIndex: 'Total Cash', key: 'totalCash', width: 120, type: 'currency' },
        { title: 'Total Shortage (KES)', dataIndex: 'Total Shortage', key: 'totalShortage', width: 120, type: 'currency' },
        { title: 'Total Overage (KES)', dataIndex: 'Total Overage', key: 'totalOverage', width: 120, type: 'currency' }
      ];
      
    case 'performance':
      return [
        { title: '#', dataIndex: '#', key: 'index', width: 50, type: 'number' },
        { title: 'Rank', dataIndex: 'Rank', key: 'rank', width: 50, type: 'number' },
        { title: 'Name', dataIndex: 'Name', key: 'name', width: 150, type: 'text' },
        { title: 'Collections', dataIndex: 'Collections', key: 'collections', width: 80, type: 'number' },
        { title: 'Total Cash (KES)', dataIndex: 'Total Cash', key: 'totalCash', width: 120, type: 'currency' },
        { title: 'Total Debts (KES)', dataIndex: 'Total Debts', key: 'totalDebts', width: 120, type: 'currency' },
        { title: 'Grand Total (KES)', dataIndex: 'Grand Total', key: 'grandTotal', width: 120, type: 'currency' }
      ];
      
    default:
      return [];
  }
};

const prepareReportData = (data, activeTab) => {
  if (!data || data.length === 0) return [];
  
  switch (activeTab) {
    case 'island':
      return data.map((item, index) => ({
        '#': index + 1,
        'Island': item.islandName || item.island?.name || 'N/A',
        'Attendant': item.attendantName || 'N/A',
        'Cash': item.cashAmount || 0,
        'Shortage': item.shortageAmount || 0,
        'Overage': item.overageAmount || 0,
        'Status': item.status || 'N/A',
        'Counted At': item.countedAt || 'N/A',
        'Station': item.stationName || item.station?.name || 'N/A'
      }));
      
    case 'shift':
      return data.map((item, index) => ({
        '#': index + 1,
        'Shift': item.shiftNumber || 'N/A',
        'Supervisor': item.supervisorName || 'N/A',
        'Cash': item.cashAmount || 0,
        'Grand Total': item.grandTotal || 0,
        'Variance': item.cashVariance || 0,
        'Status': item.status || 'N/A',
        'Counted At': item.countedAt || 'N/A',
        'Station': item.stationName || item.station?.name || 'N/A'
      }));
      
    case 'daily':
      return data.map((item, index) => ({
        '#': index + 1,
        'Date': item.date || 'N/A',
        'Station': item.stationName || 'N/A',
        'Collections': item.totalShiftCollections || 0,
        'Total Cash': item.totalCash || 0,
        'Total Shortage': item.totalShortage || 0,
        'Total Overage': item.totalOverage || 0
      }));
      
    case 'performance':
      return data.map((item, index) => ({
        '#': index + 1,
        'Rank': item.rank || index + 1,
        'Name': item.name || 'N/A',
        'Collections': item.shiftCount || 0,
        'Total Cash': item.totalCash || 0,
        'Total Debts': item.totalDebts || 0,
        'Grand Total': item.totalGrandTotal || 0
      }));
      
    default:
      return [];
  }
};

const calculateReportSummary = (data, activeTab) => {
  if (!data || data.length === 0) return null;
  
  const totalRecords = data.length;
  let totalCash = 0;
  let totalShortage = 0;
  let totalOverage = 0;
  
  data.forEach(item => {
    if (activeTab === 'island') {
      totalCash += parseFloat(item.cashAmount) || 0;
      totalShortage += parseFloat(item.shortageAmount) || 0;
      totalOverage += parseFloat(item.overageAmount) || 0;
    } else if (activeTab === 'shift') {
      totalCash += parseFloat(item.cashAmount) || 0;
      totalShortage += parseFloat(item.cashVariance) || 0;
    } else if (activeTab === 'daily') {
      totalCash += parseFloat(item.totalCash) || 0;
      totalShortage += parseFloat(item.totalShortage) || 0;
      totalOverage += parseFloat(item.totalOverage) || 0;
    } else if (activeTab === 'performance') {
      totalCash += parseFloat(item.totalCash) || 0;
    }
  });
  
  return {
    'Report Type': `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Collections Report`,
    'Total Records': totalRecords,
    'Total Cash (KES)': totalCash,
    'Total Shortage (KES)': totalShortage,
    'Total Overage (KES)': totalOverage,
    'Generated Date': new Date().toLocaleDateString('en-KE'),
    'Generated Time': new Date().toLocaleTimeString('en-KE')
  };
};

// ==================== MAIN COMPONENT ====================
const CashMovement = () => {
  const { state } = useApp();
  const userStationId = state.currentStation?.id;
  const currentUser = state.currentUser;
  const currentStation = state.currentStation;
  const [form] = Form.useForm();

  // State
  const [activeTab, setActiveTab] = useState('island');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tableData, setTableData] = useState([]);

  // Report generation state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportTitle, setReportTitle] = useState('');

  // Dropdown data
  const [shifts, setShifts] = useState([]);
  const [stations, setStations] = useState([]);
  const [islands, setIslands] = useState([]);
  const [attendants, setAttendants] = useState([]);

  // Filters - SIMPLIFIED
  const [filters, setFilters] = useState({
    // Common
    startDate: dayjs().subtract(7, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    stationId: userStationId,
    status: null,
    
    // Tab-specific
    islandId: null,
    attendantId: null,
    shiftId: null,
    reportDate: dayjs().format('YYYY-MM-DD'),
    reportGroupBy: 'station',
    reportPeriod: 'daily',
    
    // Options
    includeExpenses: false,
    includeDebts: false,
    
    // Sorting
    sortBy: 'countedAt',
    sortOrder: 'desc',
    
    // Pagination
    page: 1,
    limit: 20
  });

  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [moneyFlowModalVisible, setMoneyFlowModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [moneyFlowData, setMoneyFlowData] = useState(null);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const promises = [];

        // Load stations for admins
        if (currentUser?.isSuperAdmin || currentUser?.isCompanyAdmin) {
          promises.push(
            stationService.getCompanyStations().then(stationsData => {
              const stationsArray = Array.isArray(stationsData) ? stationsData : [];
              setStations(stationsArray);
            }).catch(() => setStations([]))
          );
        }

        // Load islands, shifts, attendants for current station
        if (userStationId) {
          promises.push(
            operationsService.getIslands({ stationId: userStationId }).then(islandsData => {
              setIslands(Array.isArray(islandsData) ? islandsData : []);
            }).catch(() => setIslands([]))
          );

          promises.push(
            operationsService.getShifts({
              stationId: userStationId,
              limit: 50,
              status: 'CLOSED'
            }).then(shiftsData => {
              const shiftsArray = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.shifts || []);
              const sortedShifts = [...shiftsArray].sort((a, b) => 
                (parseInt(b.shiftNumber) || 0) - (parseInt(a.shiftNumber) || 0)
              );
              setShifts(sortedShifts);
            }).catch(() => setShifts([]))
          );

          promises.push(
            operationsService.getStaff({ stationId: userStationId, role: 'ATTENDANT' }).then(attendantsData => {
              setAttendants(Array.isArray(attendantsData) ? attendantsData : []);
            }).catch(() => setAttendants([]))
          );
        }

        await Promise.all(promises);
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
        message.error('Failed to load dropdown data');
      }
    };

    loadDropdownData();
  }, [userStationId, currentUser]);

  // Fetch data when filters change
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      const timeoutId = setTimeout(() => {
        fetchData();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [filters, activeTab]);

  // Handler for filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  // Fetch data function
  const fetchData = async () => {
    if (activeTab === 'dashboard') return;
    
    setLoading(true);
    setError(null);

    try {
      const commonFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        stationId: filters.stationId || userStationId,
        status: filters.status,
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      let result;

      switch (activeTab) {
        case 'island':
          result = await CollectionService.getIslandCollections({
            ...commonFilters,
            islandId: filters.islandId,
            attendantId: filters.attendantId,
            includeExpenses: filters.includeExpenses,
            includeDebts: filters.includeDebts
          });
          break;

        case 'shift':
          result = await CollectionService.getShiftCollections({
            ...commonFilters,
            shiftId: filters.shiftId
          });
          break;

        case 'daily':
          result = await CollectionService.getDailyReport({
            date: filters.reportDate,
            stationId: filters.stationId || userStationId,
            includeExpenses: filters.includeExpenses,
            includeDebts: filters.includeDebts
          });
          break;

        case 'performance':
          result = await CollectionService.getPerformanceReport({
            startDate: filters.startDate,
            endDate: filters.endDate,
            stationId: filters.stationId || userStationId,
            groupBy: filters.reportGroupBy,
            period: filters.reportPeriod
          });
          break;

        default:
          return;
      }

      const dataArray = result?.tableData || result?.data || [];
      
      // Sort data based on current sort settings
      const sortedData = [...dataArray].sort((a, b) => {
        const aValue = a[filters.sortBy];
        const bValue = b[filters.sortBy];
        
        if (filters.sortOrder === 'desc') {
          return new Date(bValue || 0) - new Date(aValue || 0);
        } else {
          return new Date(aValue || 0) - new Date(bValue || 0);
        }
      });

      setData(result);
      setTableData(sortedData);

      if (sortedData.length === 0) {
        message.info('No data found for the selected filters');
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab} data:`, error);
      setError(error.message || 'Failed to fetch data');
      message.error(error.message || 'Failed to fetch data');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    setData(null);
    setTableData([]);
    setError(null);
    setSelectedRecord(null);
    
    // Reset to page 1 when changing tabs
    handleFilterChange('page', 1);
  };

  // Handle view details
  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // Handle money flow
  const handleMoneyFlow = async (collectionId) => {
    try {
      const result = await CollectionService.getMoneyFlow(collectionId);
      setMoneyFlowData(result.data);
      setMoneyFlowModalVisible(true);
    } catch (error) {
      console.error('Failed to fetch money flow:', error);
      message.error('Failed to fetch money flow data');
    }
  };

  // Get columns for current tab
  const columns = useTableColumns(activeTab, currentUser, handleViewDetails, handleMoneyFlow);

  // Handle report generation
  const handleGenerateReport = () => {
    if (tableData.length === 0) {
      message.warning('No data to generate report');
      return;
    }

    const reportData = prepareReportData(tableData, activeTab);
    const reportColumns = getReportColumnsForTab(activeTab);
    const summaryData = calculateReportSummary(tableData, activeTab);
    
    const title = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Collections Report - ${currentStation?.name || 'All Stations'}`;
    const fileName = `cash_movement_${activeTab}_${new Date().toISOString().split('T')[0]}`;
    
    const config = {
      dataSource: reportData,
      columns: reportColumns,
      summaryData: summaryData,
      title: title,
      fileName: fileName,
      reportType: 'finance',
      companyName: state.currentCompany?.name || "Lynx Energy System",
      stationInfo: currentStation ? {
        name: currentStation.name,
        code: currentStation.code,
        address: currentStation.address
      } : null,
      showFooter: true,
      footerText: `Generated from Lynx Energy System | ${new Date().toLocaleString('en-KE')}`,
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

  // Render dashboard
  const renderDashboard = () => {
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <DashboardOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
          <Text type="secondary">Click "Refresh Dashboard" to load data</Text>
        </div>
      );
    }

    const dashboardData = data.data || {};

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Cash Collected"
              value={dashboardData.totalCashCollected || 0}
              precision={0}
              prefix="KES"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Today's Collections"
              value={dashboardData.todayCollections || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Active Stations"
              value={dashboardData.stations || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div className="cash-movement" style={{ padding: 12 }}>
      {/* Header */}
      <Card style={{ marginBottom: 12 }} size="small">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <div>
              <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                <DollarOutlined /> Cash Movement
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Track and analyze cash collections
              </Text>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={handleGenerateReport}
                  disabled={tableData.length === 0}
                  size="small"
                  type="primary"
                >
                  Report
                </Button>
              </Col>
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  loading={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <FilterSection
        activeTab={activeTab}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFetchData={fetchData}
        loading={loading}
        stations={stations}
        islands={islands}
        shifts={shifts}
        attendants={attendants}
        currentUser={currentUser}
      />

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 12 }}
          size="small"
        />
      )}

      {/* Summary Cards */}
      <SummaryCards 
        summary={data?.summary} 
        tableData={tableData}
        activeTab={activeTab}
      />

      {/* Main Content Tabs */}
      <Card size="small" bodyStyle={{ padding: '12px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          size="small"
          tabBarExtraContent={
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {tableData.length} records
            </Text>
          }
        >
          <TabPane
            tab={
              <span>
                <ShopOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Island</span>
              </span>
            }
            key="island"
          >
            {loading && !tableData.length ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <Spin size="small" />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Loading...</Text>
                </div>
              </div>
            ) : tableData.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text style={{ fontSize: '12px' }}>No island collections found</Text>
                  </div>
                }
              />
            ) : (
              <Table
                columns={columns}
                dataSource={tableData}
                rowKey={(record) => record.id || Math.random()}
                pagination={{
                  current: filters.page,
                  pageSize: filters.limit,
                  total: data?.pagination?.total || tableData.length,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                  size: 'small'
                }}
                size="small"
                scroll={{ x: 800 }}
                loading={loading}
                onChange={(pagination, _, sorter) => {
                  if (pagination.current !== filters.page) {
                    handleFilterChange('page', pagination.current);
                  }
                  if (pagination.pageSize !== filters.limit) {
                    handleFilterChange('limit', pagination.pageSize);
                  }
                  if (sorter.field && sorter.order) {
                    handleFilterChange('sortBy', sorter.field);
                    handleFilterChange('sortOrder', sorter.order === 'ascend' ? 'asc' : 'desc');
                  }
                }}
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Shift</span>
              </span>
            }
            key="shift"
          >
            {tableData.length === 0 && !loading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text style={{ fontSize: '12px' }}>No shift collections found</Text>}
              />
            ) : (
              <Table
                columns={columns}
                dataSource={tableData}
                rowKey={(record) => record.id || Math.random()}
                pagination={{
                  current: filters.page,
                  pageSize: filters.limit,
                  total: data?.pagination?.total || tableData.length,
                  showSizeChanger: true
                }}
                size="small"
                scroll={{ x: 800 }}
                loading={loading}
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <CalendarOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Daily</span>
              </span>
            }
            key="daily"
          >
            {activeTab === 'daily' && data?.data && (
              <div>
                <Descriptions bordered size="small" column={3} style={{ marginBottom: 12 }}>
                  <Descriptions.Item label="Date" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                    {formatDate(data.data.date, 'long')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Collections" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                    {data.data.totalShiftCollections || 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Cash" labelStyle={{ fontSize: '11px' }} contentStyle={{ fontSize: '11px' }}>
                    {formatCurrency(data.data.totalCash || 0)}
                  </Descriptions.Item>
                </Descriptions>
                
                {tableData.length > 0 && (
                  <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey={(record) => record.id || Math.random()}
                    pagination={false}
                    size="small"
                    scroll={{ x: 700 }}
                  />
                )}
              </div>
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Performance</span>
              </span>
            }
            key="performance"
          >
            {tableData.length === 0 && !loading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text style={{ fontSize: '12px' }}>No performance data found</Text>}
              />
            ) : (
              <Table
                columns={columns}
                dataSource={tableData}
                rowKey={(record) => record.id || Math.random()}
                pagination={false}
                size="small"
                scroll={{ x: 700 }}
                loading={loading}
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <DashboardOutlined style={{ fontSize: '12px' }} />
                <span style={{ fontSize: '12px' }}>Dashboard</span>
              </span>
            }
            key="dashboard"
          >
            {renderDashboard()}
          </TabPane>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Collection Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)} size="small">
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedRecord && (
          <Descriptions bordered column={2} size="small">
            {Object.entries(selectedRecord).map(([key, value]) => {
              if (typeof value === 'object' || key.includes('Id') || key === 'id') {
                return null;
              }
              
              let displayValue = value;
              
              if (typeof value === 'number' && (key.includes('Amount') || key.includes('Cash') || key.includes('Total'))) {
                displayValue = formatCurrency(value);
              } else if (key.includes('Date') || key.includes('At')) {
                displayValue = formatDate(value);
              } else if (key === 'status') {
                displayValue = (
                  <Tag color={
                    value === 'APPROVED' ? 'green' :
                    value === 'PENDING' ? 'orange' :
                    value === 'REJECTED' ? 'red' : 'default'
                  }>
                    {value}
                  </Tag>
                );
              }
              
              return (
                <Descriptions.Item label={key.replace(/([A-Z])/g, ' $1').toUpperCase()} key={key}>
                  {displayValue}
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        )}
      </Modal>

      {/* Money Flow Modal */}
      <Modal
        title="Money Flow Analysis"
        open={moneyFlowModalVisible}
        onCancel={() => setMoneyFlowModalVisible(false)}
        footer={null}
        width={800}
      >
        {moneyFlowData ? (
          <div>
            <Text>Money flow data would appear here</Text>
            {/* Add money flow visualization here */}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin size="small" />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Loading money flow data...</Text>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Generator Modal */}
      <Modal
        title={
          <Space>
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
              key={`cash-report-${Date.now()}`}
              {...reportConfig}
              onReportGenerate={handleReportComplete}
              onSettingsSave={(settings) => {
                console.log('Report settings saved:', settings);
                message.success('Report settings saved successfully!');
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

export default CashMovement;