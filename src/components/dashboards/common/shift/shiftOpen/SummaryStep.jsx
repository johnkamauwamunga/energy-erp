import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Descriptions, 
  Tag, 
  Space, 
  Alert, 
  Row, 
  Col,
  Statistic,
  Divider,
  Button,
  notification
} from 'antd';
import { 
  Users, 
  Gauge, 
  Fuel, 
  UserCheck, 
  MapPin,
  CheckCircle,
  AlertTriangle,
  Play
} from 'lucide-react';
import { shiftService } from '../../../../../services/shiftService/shiftService';

const SummaryStep = ({ 
  wizardData,
  onPrevStep,
  canOpenShift,
  onSuccess
}) => {
  const [submissionError, setSubmissionError] = useState(null);
  const [loading, setLoading] = useState(false);

  console.log('📋 SummaryStep received wizardData:', wizardData);

  // Helper function to safely format numbers
  const formatNumber = (value, decimals = 3) => {
    if (value === null || value === undefined || value === '') return '0.000';
    
    // Convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return '0.000';
    
    return numValue.toFixed(decimals);
  };

  // Helper function to safely format currency
  const formatCurrency = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return '0.00';
    
    // Convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return '0.00';
    
    return numValue.toFixed(decimals);
  };

  if (!wizardData.shiftInfo.shiftId) {
    return (
      <Alert
        message="No Shift Created"
        description="Please go back to Step 1 and create a shift first."
        type="warning"
        showIcon
      />
    );
  }

  const handleStartShift = async () => {
    try {
      setLoading(true);
      setSubmissionError(null);
      console.log('🎯 Starting shift opening process...');

      // Validate all required data
      if (!canOpenShift) {
        throw new Error('Please complete all steps before starting shift');
      }

      // Harmonize all data into the final payload
      const openShiftPayload = {
        recordedById: wizardData.personnel.supervisorId,
        
        // Personnel data
        islandAssignments: wizardData.personnel.islandAssignments.map(assignment => ({
          attendantId: assignment.attendantId,
          islandId: assignment.islandId,
          assignmentType: assignment.assignmentType || 'PRIMARY'
        })),
        
        // Pump readings data - ensure numbers
        pumpReadings: wizardData.readings.pumpReadings.map(reading => ({
          pumpId: reading.pumpId,
          electricMeter: parseFloat(reading.electricMeter) || 0,
          manualMeter: parseFloat(reading.manualMeter) || 0,
          cashMeter: parseFloat(reading.cashMeter) || 0,
          unitPrice: parseFloat(reading.unitPrice) || 0,
          readingType: 'OPENING',
          source: reading.source || 'MANUAL_ENTRY'
        })),
        
        // Tank readings data - ensure numbers
        tankReadings: wizardData.readings.tankReadings.map(reading => ({
          tankId: reading.tankId,
          volume: parseFloat(reading.volume) || 0,
          temperature: parseFloat(reading.temperature) || 25,
          waterLevel: parseFloat(reading.waterLevel) || 0,
          dipValue: parseFloat(reading.dipValue) || 0,
          readingType: 'OPENING',
          source: reading.source || 'MANUAL_ENTRY'
        }))
      };

      console.log('📤 Final harmonized payload for shift opening:', openShiftPayload);

      // Call shiftService directly
      const result = await shiftService.openShift(wizardData.shiftInfo.shiftId, openShiftPayload);
      
      console.log('✅ Shift opened successfully:', result);

      notification.success({
        message: 'Shift Started Successfully',
        description: `Shift ${wizardData.shiftInfo.shiftNumber} is now open and ready for operations.`
      });

      onSuccess?.(result);
      
    } catch (error) {
      console.error('❌ Failed to open shift:', error);
      setSubmissionError(error.message || 'Failed to start shift');
      notification.error({
        message: 'Failed to Start Shift',
        description: error.message || 'Please check all data and try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const personnelColumns = [
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'Supervisor' ? 'blue' : 'green'}>
          {role}
        </Tag>
      )
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Assigned Islands',
      key: 'islands',
      render: (_, record) => {
        if (record.role === 'Supervisor') {
          return <Tag color="blue">All Islands</Tag>;
        }
        
        const assignedIslands = wizardData.personnel.islandAssignments
          .filter(assignment => assignment.attendantId === record.id)
          .map(assignment => {
            const island = wizardData.personnel.topologyIslands?.find(i => i.id === assignment.islandId);
            return island ? island.name : `Island ${assignment.islandId}`;
          });
        
        return (
          <Space wrap>
            {assignedIslands.map((island, index) => (
              <Tag key={index} color="green">
                {island}
              </Tag>
            ))}
            {assignedIslands.length === 0 && (
              <Tag color="orange">No islands assigned</Tag>
            )}
          </Space>
        );
      }
    }
  ];

  const pumpColumns = [
    {
      title: 'Pump',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Gauge size={14} />
          {text}
        </Space>
      )
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => record.product?.name || 'No Product'
    },
    {
      title: 'Electric Meter',
      key: 'electricMeter',
      render: (_, record) => {
        const reading = wizardData.readings.pumpReadings?.find(r => r.pumpId === record.id);
        return formatNumber(reading?.electricMeter);
      }
    },
    {
      title: 'Manual Meter',
      key: 'manualMeter',
      render: (_, record) => {
        const reading = wizardData.readings.pumpReadings?.find(r => r.pumpId === record.id);
        return formatNumber(reading?.manualMeter);
      }
    },
    {
      title: 'Cash Meter',
      key: 'cashMeter',
      render: (_, record) => {
        const reading = wizardData.readings.pumpReadings?.find(r => r.pumpId === record.id);
        return formatNumber(reading?.cashMeter);
      }
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      render: (_, record) => {
        const reading = wizardData.readings.pumpReadings?.find(r => r.pumpId === record.id);
        return formatCurrency(reading?.unitPrice);
      }
    }
  ];

  const tankColumns = [
    {
      title: 'Tank',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <Fuel size={14} />
          {text}
        </Space>
      )
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => record.product?.name || 'No Product'
    },
    {
      title: 'Volume (L)',
      key: 'volume',
      render: (_, record) => {
        const reading = wizardData.readings.tankReadings?.find(r => r.tankId === record.id);
        return formatNumber(reading?.volume);
      }
    },
    {
      title: 'Temperature (°C)',
      key: 'temperature',
      render: (_, record) => {
        const reading = wizardData.readings.tankReadings?.find(r => r.tankId === record.id);
        return formatNumber(reading?.temperature, 1);
      }
    },
    {
      title: 'Water Level',
      key: 'waterLevel',
      render: (_, record) => {
        const reading = wizardData.readings.tankReadings?.find(r => r.tankId === record.id);
        return formatNumber(reading?.waterLevel, 2);
      }
    },
    {
      title: 'Dip Value',
      key: 'dipValue',
      render: (_, record) => {
        const reading = wizardData.readings.tankReadings?.find(r => r.tankId === record.id);
        return formatNumber(reading?.dipValue, 2);
      }
    },
    {
      title: 'Capacity (L)',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (capacity) => capacity?.toLocaleString() || '0'
    }
  ];

  // Prepare personnel data for table
  const personnelData = [
    // Supervisor
    ...(wizardData.personnel.supervisorId ? [{
      id: wizardData.personnel.supervisorId,
      role: 'Supervisor',
      firstName: 'Supervisor', // You might want to fetch actual name
      lastName: 'User',
      email: 'supervisor@station.com'
    }] : []),
    // Attendants
    ...(wizardData.personnel.attendants || []).map(attendant => ({
      ...attendant,
      role: 'Attendant'
    }))
  ];

  // Check if all required data is present
  const hasAllRequiredData = canOpenShift;

  // Debug: Check the actual data types in pumpReadings
  console.log('🔍 Pump readings data types:', wizardData.readings.pumpReadings?.map(reading => ({
    pumpId: reading.pumpId,
    electricMeter: { value: reading.electricMeter, type: typeof reading.electricMeter },
    manualMeter: { value: reading.manualMeter, type: typeof reading.manualMeter },
    cashMeter: { value: reading.cashMeter, type: typeof reading.cashMeter },
    unitPrice: { value: reading.unitPrice, type: typeof reading.unitPrice }
  })));

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Error Display */}
      {submissionError && (
        <Alert
          message="Failed to Start Shift"
          description={submissionError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary Header */}
      <Alert
        message={hasAllRequiredData ? "Shift Ready to Start" : "Incomplete Configuration"}
        description={
          hasAllRequiredData 
            ? "Review all the information below before starting the shift. All data will be submitted when you click 'Start Shift'."
            : "Please go back and complete all required steps before starting the shift."
        }
        type={hasAllRequiredData ? "success" : "warning"}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Supervisor"
              value={wizardData.personnel.supervisorId ? 1 : 0}
              prefix={<UserCheck size={16} />}
              valueStyle={{ color: wizardData.personnel.supervisorId ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Attendants"
              value={wizardData.personnel.attendants?.length || 0}
              prefix={<Users size={16} />}
              valueStyle={{ color: (wizardData.personnel.attendants?.length || 0) > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Island Assignments"
              value={wizardData.personnel.islandAssignments?.length || 0}
              prefix={<MapPin size={16} />}
              valueStyle={{ color: (wizardData.personnel.islandAssignments?.length || 0) > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Pumps Ready"
              value={wizardData.readings.pumpReadings?.length || 0}
              prefix={<Gauge size={16} />}
              valueStyle={{ color: (wizardData.readings.pumpReadings?.length || 0) > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Tanks Ready"
              value={wizardData.readings.tankReadings?.length || 0}
              prefix={<Fuel size={16} />}
              valueStyle={{ color: (wizardData.readings.tankReadings?.length || 0) > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Assets"
              value={(wizardData.readings.allPumps?.length || 0) + (wizardData.readings.allTanks?.length || 0)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Shift Information */}
      <Card title="Shift Information" size="small" style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Shift ID">
            <Tag color="blue">{wizardData.shiftInfo.shiftId}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Shift Number">
            <Tag color="green">{wizardData.shiftInfo.shiftNumber || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Station ID">
            <Tag>{wizardData.shiftInfo.stationId}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="orange">Pending Start</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Personnel Summary */}
      <Card 
        title={
          <Space>
            <Users size={16} />
            Personnel Summary
          </Space>
        } 
        size="small" 
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={personnelColumns}
          dataSource={personnelData}
          pagination={false}
          size="small"
          rowKey="id"
          locale={{ emptyText: 'No personnel assigned' }}
        />
      </Card>

      <Row gutter={[16, 16]}>
        {/* Pump Readings Summary */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <Gauge size={16} />
                Pump Meter Readings
                <Tag>{wizardData.readings.pumpReadings?.length || 0} pumps</Tag>
              </Space>
            } 
            size="small"
          >
            <Table
              columns={pumpColumns}
              dataSource={wizardData.readings.allPumps || []}
              pagination={false}
              size="small"
              rowKey="id"
              locale={{ emptyText: 'No pump readings configured' }}
            />
          </Card>
        </Col>

        {/* Tank Readings Summary */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <Fuel size={16} />
                Tank Volume Readings
                <Tag>{wizardData.readings.tankReadings?.length || 0} tanks</Tag>
              </Space>
            } 
            size="small"
          >
            <Table
              columns={tankColumns}
              dataSource={wizardData.readings.allTanks || []}
              pagination={false}
              size="small"
              rowKey="id"
              locale={{ emptyText: 'No tank readings configured' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Action Buttons */}
      <Divider />
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Space>
          <Button 
            size="large" 
            onClick={onPrevStep}
            disabled={loading}
          >
            Back to Readings
          </Button>
          <Button 
            type="primary" 
            size="large"
            icon={<Play size={16} />}
            onClick={handleStartShift}
            loading={loading}
            disabled={!hasAllRequiredData}
          >
            Start Shift
          </Button>
        </Space>
      </div>

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Alert
          message="Debug Information"
          description={
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              <div><strong>Shift ID:</strong> {wizardData.shiftInfo.shiftId || 'None'}</div>
              <div><strong>Supervisor:</strong> {wizardData.personnel.supervisorId || 'None'}</div>
              <div><strong>Attendants:</strong> {wizardData.personnel.attendants?.length || 0}</div>
              <div><strong>Island Assignments:</strong> {wizardData.personnel.islandAssignments?.length || 0}</div>
              <div><strong>Pump Readings:</strong> {wizardData.readings.pumpReadings?.length || 0}</div>
              <div><strong>Tank Readings:</strong> {wizardData.readings.tankReadings?.length || 0}</div>
              <div><strong>All Pumps:</strong> {wizardData.readings.allPumps?.length || 0}</div>
              <div><strong>All Tanks:</strong> {wizardData.readings.allTanks?.length || 0}</div>
              <div><strong>Can Open Shift:</strong> {canOpenShift?.toString() || 'false'}</div>
              <div><strong>Data Types Sample:</strong> 
                {wizardData.readings.pumpReadings?.slice(0, 1).map((reading, index) => (
                  <div key={index}>
                    Pump {reading.pumpId}: 
                    electricMeter(type: {typeof reading.electricMeter}), 
                    manualMeter(type: {typeof reading.manualMeter})
                  </div>
                ))}
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default SummaryStep;