// src/components/shift/ShiftDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Timeline,
  Button,
  Space,
  Alert,
  Tabs
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  CalculatorOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { shiftService } from '../../../services/shiftService';
import { wetStockService } from '../../../services/wetStockService';

const { TabPane } = Tabs;

const ShiftDetailsModal = ({ shift, visible, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [detailedShift, setDetailedShift] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);

  useEffect(() => {
    if (visible && shift) {
      fetchDetailedData();
    }
  }, [visible, shift]);

  const fetchDetailedData = async () => {
    setLoading(true);
    try {
      // Fetch complete shift details with assets
      const shiftData = await shiftService.getShiftByIdWithAssets(shift.id);
      setDetailedShift(shiftData.data?.shift || shiftData.shift || shift);

      // Fetch reconciliation data if shift is closed
      if (shift.status === 'CLOSED') {
        try {
          const reconData = await wetStockService.getWetStockReconciliation(shift.id);
          setReconciliation(reconData.data);
        } catch (error) {
          console.log('No reconciliation data found');
        }
      }
    } catch (error) {
      console.error('Failed to fetch shift details:', error);
      setDetailedShift(shift);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  const formatVolume = (liters) => {
    return `${new Intl.NumberFormat('en-US').format(liters || 0)}L`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': 'green',
      'CLOSED': 'blue',
      'UNDER_REVIEW': 'orange',
      'APPROVED': 'purple'
    };
    return colors[status] || 'default';
  };

  if (!shift) return null;

  return (
    <Modal
      title={`Shift Details - #${shift.shiftNumber}`}
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button 
          key="refresh" 
          onClick={fetchDetailedData}
          loading={loading}
        >
          Refresh
        </Button>
      ]}
    >
      <Tabs defaultActiveKey="overview">
        <TabPane tab="Overview" key="overview">
          <ShiftOverviewTab 
            shift={detailedShift || shift} 
            reconciliation={reconciliation}
            formatCurrency={formatCurrency}
            formatVolume={formatVolume}
          />
        </TabPane>
        
        <TabPane tab="Assets & Readings" key="assets">
          <AssetsReadingsTab shift={detailedShift || shift} />
        </TabPane>
        
        <TabPane tab="Financials" key="financials">
          <FinancialsTab 
            shift={detailedShift || shift} 
            formatCurrency={formatCurrency}
          />
        </TabPane>
        
        {reconciliation && (
          <TabPane tab="Reconciliation" key="reconciliation">
            <ReconciliationTab 
              reconciliation={reconciliation}
              formatVolume={formatVolume}
            />
          </TabPane>
        )}
      </Tabs>
    </Modal>
  );
};

// Sub-components for tabs
const ShiftOverviewTab = ({ shift, reconciliation, formatCurrency, formatVolume }) => (
  <div className="space-y-4">
    <Descriptions bordered column={2}>
      <Descriptions.Item label="Shift Number">#{shift.shiftNumber}</Descriptions.Item>
      <Descriptions.Item label="Status">
        <Tag color={getStatusColor(shift.status)}>{shift.status}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Station">{shift.stationName}</Descriptions.Item>
      <Descriptions.Item label="Supervisor">{shift.supervisorName}</Descriptions.Item>
      <Descriptions.Item label="Start Time">
        {new Date(shift.startTime).toLocaleString()}
      </Descriptions.Item>
      <Descriptions.Item label="End Time">
        {shift.endTime ? new Date(shift.endTime).toLocaleString() : 'Ongoing'}
      </Descriptions.Item>
      <Descriptions.Item label="Duration" span={2}>
        {shift.startTime && (
          (() => {
            const start = new Date(shift.startTime);
            const end = shift.endTime ? new Date(shift.endTime) : new Date();
            const durationMs = end - start;
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
          })()
        )}
      </Descriptions.Item>
    </Descriptions>

    <Row gutter={16}>
      <Col span={8}>
        <Card size="small">
          <Statistic
            title="Total Revenue"
            value={shift.totalRevenue}
            formatter={value => formatCurrency(value)}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card size="small">
          <Statistic
            title="Total Collections"
            value={shift.totalCollections}
            formatter={value => formatCurrency(value)}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card size="small">
          <Statistic
            title="Variance"
            value={shift.totalRevenue - shift.totalCollections}
            formatter={value => formatCurrency(value)}
            valueStyle={{ 
              color: Math.abs(shift.totalRevenue - shift.totalCollections) < 100 ? '#52c41a' : '#ff4d4f' 
            }}
          />
        </Card>
      </Col>
    </Row>

    {reconciliation && (
      <Card title="Wet Stock Reconciliation" size="small">
        <Descriptions column={2}>
          <Descriptions.Item label="Status">
            <Tag color={reconciliation.status === 'COMPLETED' ? 'green' : 'orange'}>
              {reconciliation.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Variance">
            {formatVolume(reconciliation.totalVariance)}
          </Descriptions.Item>
          <Descriptions.Item label="Variance Percentage">
            {reconciliation.variancePercentage?.toFixed(2)}%
          </Descriptions.Item>
          <Descriptions.Item label="Severity">
            <Tag color={
              reconciliation.severity === 'CRITICAL' ? 'red' : 
              reconciliation.severity === 'WARNING' ? 'orange' : 'green'
            }>
              {reconciliation.severity}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    )}
  </div>
);

const AssetsReadingsTab = ({ shift }) => (
  <div className="space-y-4">
    <Row gutter={16}>
      <Col span={12}>
        <Card title="Pump Meter Readings" size="small">
          {shift.meterReadings?.length > 0 ? (
            <Table
              dataSource={shift.meterReadings}
              pagination={false}
              size="small"
              columns={[
                { title: 'Pump', dataIndex: ['pump', 'asset', 'name'], key: 'pump' },
                { title: 'Type', dataIndex: 'readingType', key: 'type' },
                { title: 'Electric Meter', dataIndex: 'electricMeter', key: 'electric' },
                { title: 'Manual Meter', dataIndex: 'manualMeter', key: 'manual' },
                { title: 'Cash Meter', dataIndex: 'cashMeter', key: 'cash' }
              ]}
            />
          ) : (
            <Alert message="No pump readings available" type="info" showIcon />
          )}
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Tank Dip Readings" size="small">
          {shift.dipReadings?.length > 0 ? (
            <Table
              dataSource={shift.dipReadings}
              pagination={false}
              size="small"
              columns={[
                { title: 'Tank', dataIndex: ['tank', 'asset', 'name'], key: 'tank' },
                { title: 'Type', dataIndex: 'readingType', key: 'type' },
                { title: 'Volume', dataIndex: 'volume', key: 'volume' },
                { title: 'Temperature', dataIndex: 'temperature', key: 'temp' },
                { title: 'Water Level', dataIndex: 'waterLevel', key: 'water' }
              ]}
            />
          ) : (
            <Alert message="No tank readings available" type="info" showIcon />
          )}
        </Card>
      </Col>
    </Row>
  </div>
);

const FinancialsTab = ({ shift, formatCurrency }) => (
  <div className="space-y-4">
    <Row gutter={16}>
      <Col span={12}>
        <Card title="Sales Summary" size="small">
          <Descriptions column={1}>
            <Descriptions.Item label="Fuel Sales">
              {formatCurrency(shift.metrics?.fuelSales || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Non-Fuel Sales">
              {formatCurrency(shift.metrics?.nonFuelSales || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Total Revenue">
              {formatCurrency(shift.totalRevenue || 0)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Collections Summary" size="small">
          <Descriptions column={1}>
            <Descriptions.Item label="Cash Collected">
              {formatCurrency(shift.metrics?.cashCollected || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Mobile Money">
              {formatCurrency(shift.metrics?.mobileMoneyCollected || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Total Collections">
              {formatCurrency(shift.totalCollections || 0)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
    </Row>
  </div>
);

const ReconciliationTab = ({ reconciliation, formatVolume }) => (
  <div className="space-y-4">
    <Card title="Reconciliation Summary" size="small">
      <Descriptions column={2}>
        <Descriptions.Item label="Total Pump Dispensed">
          {formatVolume(reconciliation.totalPumpDispensed)}
        </Descriptions.Item>
        <Descriptions.Item label="Total Tank Reduction">
          {formatVolume(reconciliation.totalTankReduction)}
        </Descriptions.Item>
        <Descriptions.Item label="Total Variance">
          {formatVolume(reconciliation.totalVariance)}
        </Descriptions.Item>
        <Descriptions.Item label="Variance Percentage">
          {reconciliation.variancePercentage?.toFixed(2)}%
        </Descriptions.Item>
      </Descriptions>
    </Card>

    {reconciliation.tankReconciliations?.length > 0 && (
      <Card title="Tank Reconciliations" size="small">
        <Table
          dataSource={reconciliation.tankReconciliations}
          pagination={false}
          size="small"
          columns={[
            { 
              title: 'Tank', 
              key: 'tank',
              render: (_, rec) => rec.tank?.asset?.name || 'Unknown'
            },
            { 
              title: 'Product', 
              key: 'product',
              render: (_, rec) => rec.tank?.product?.name || 'Unknown'
            },
            { 
              title: 'Pump Dispensed', 
              dataIndex: 'totalPumpDispensed',
              render: value => formatVolume(value)
            },
            { 
              title: 'Tank Reduction', 
              dataIndex: 'adjustedReduction',
              render: value => formatVolume(value)
            },
            { 
              title: 'Variance', 
              dataIndex: 'variance',
              render: value => formatVolume(value)
            },
            { 
              title: 'Variance %', 
              dataIndex: 'variancePercentage',
              render: value => `${value?.toFixed(2)}%`
            },
            { 
              title: 'Status', 
              dataIndex: 'severity',
              render: severity => (
                <Tag color={
                  severity === 'CRITICAL' ? 'red' : 
                  severity === 'WARNING' ? 'orange' : 'green'
                }>
                  {severity}
                </Tag>
              )
            }
          ]}
        />
      </Card>
    )}
  </div>
);

export default ShiftDetailsModal;