import React, { useState, useMemo, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Space, 
  Alert, 
  Badge, 
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Tag,
  Input,
  Select
} from 'antd';
import { 
  UserCheck,
  Users,
  CheckCircle,
  AlertTriangle,
  Calculator
} from 'lucide-react';

const { Text, Title } = Typography;
const { Option } = Select;

const ConnectionValidation = ({ 
  stationId,
  pumpReadings,
  islandSalesData,
  shiftAssignments,
  onValidationComplete,
  onNext,
  onPrev
}) => {
  const [attendantAssignments, setAttendantAssignments] = useState({});
  const [cashCollections, setCashCollections] = useState({});
  const [validationNotes, setValidationNotes] = useState({});

  const availableAttendants = useMemo(() => {
    return shiftAssignments
      .filter(assignment => assignment.role === 'ATTENDANT')
      .map(assignment => ({
        id: assignment.userId,
        name: assignment.userName,
        badgeNumber: assignment.badgeNumber
      }));
  }, [shiftAssignments]);

  const stats = useMemo(() => {
    const totalIslands = islandSalesData.length;
    const islandsWithAttendants = Object.keys(attendantAssignments).length;
    const islandsWithCollections = Object.keys(cashCollections).length;
    
    const totalExpectedCash = islandSalesData.reduce((sum, island) => sum + island.totalSales, 0);
    const totalCollectedCash = Object.values(cashCollections).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    
    const cashVariance = totalExpectedCash - totalCollectedCash;

    return {
      totalIslands,
      islandsWithAttendants,
      islandsWithCollections,
      totalExpectedCash,
      totalCollectedCash,
      cashVariance,
      isBalanced: Math.abs(cashVariance) < 0.01
    };
  }, [islandSalesData, attendantAssignments, cashCollections]);

  const handleAttendantAssignment = useCallback((islandId, attendantId) => {
    const newAssignments = {
      ...attendantAssignments,
      [islandId]: attendantId
    };
    setAttendantAssignments(newAssignments);
    updateValidationResults(newAssignments, cashCollections, validationNotes);
  }, [attendantAssignments, cashCollections, validationNotes]);

  const handleCashCollection = useCallback((islandId, amount) => {
    const newCollections = {
      ...cashCollections,
      [islandId]: amount
    };
    setCashCollections(newCollections);
    updateValidationResults(attendantAssignments, newCollections, validationNotes);
  }, [attendantAssignments, cashCollections, validationNotes]);

  const handleValidationNotes = useCallback((islandId, notes) => {
    const newNotes = {
      ...validationNotes,
      [islandId]: notes
    };
    setValidationNotes(newNotes);
    updateValidationResults(attendantAssignments, cashCollections, newNotes);
  }, [attendantAssignments, cashCollections, validationNotes]);

  const updateValidationResults = (assignments, collections, notes) => {
    const results = islandSalesData.reduce((acc, island) => {
      const attendantId = assignments[island.islandId];
      const collectedAmount = parseFloat(collections[island.islandId]) || 0;
      const expectedAmount = island.totalSales;
      
      acc[island.islandId] = {
        islandId: island.islandId,
        hasAttendant: !!attendantId,
        attendantId: attendantId,
        attendantName: availableAttendants.find(a => a.id === attendantId)?.name,
        expectedCash: expectedAmount,
        collectedCash: collectedAmount,
        cashVariance: expectedAmount - collectedAmount,
        isCashBalanced: Math.abs(expectedAmount - collectedAmount) < 0.01,
        notes: notes[island.islandId] || '',
        isValid: !!attendantId && Math.abs(expectedAmount - collectedAmount) < 0.01
      };
      return acc;
    }, {});

    onValidationComplete?.(results);
  };

  const validationColumns = [
    {
      title: 'Island',
      key: 'island',
      render: (_, island) => (
        <Space direction="vertical" size={6}>
          <Text strong style={{ fontSize: '14px' }}>
            Island {islandSalesData.findIndex(i => i.islandId === island.islandId) + 1}
          </Text>
          <div style={{ fontSize: '11px', color: '#666' }}>
            ID: <code>{island.islandId}</code>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>
              {island.pumpCount} Pumps
            </Tag>
            <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>
              {island.totalLiters.toFixed(1)}L
            </Tag>
          </div>
        </Space>
      ),
      width: 150
    },
    {
      title: 'Sales Summary',
      key: 'sales',
      render: (_, island) => (
        <Space direction="vertical" size={4}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#389e0d' }}>
            {island.totalSales.toFixed(0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Expected Collection
          </div>
          {island.pumps.slice(0, 2).map(pump => (
            <div key={pump.id} style={{ fontSize: '10px', color: '#666' }}>
              • {pump.name}: {pump.sales.toFixed(0)}
            </div>
          ))}
          {island.pumps.length > 2 && (
            <div style={{ fontSize: '10px', color: '#999' }}>
              +{island.pumps.length - 2} more pumps
            </div>
          )}
        </Space>
      ),
      width: 160
    },
    {
      title: 'Attendant Assignment',
      key: 'attendant',
      render: (_, island) => {
        const assignedAttendantId = attendantAssignments[island.islandId];
        const assignedAttendant = availableAttendants.find(a => a.id === assignedAttendantId);
        
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              placeholder="Select Attendant"
              value={assignedAttendantId}
              onChange={(value) => handleAttendantAssignment(island.islandId, value)}
              style={{ width: '100%' }}
              size="small"
            >
              {availableAttendants.map(attendant => (
                <Option key={attendant.id} value={attendant.id}>
                  {attendant.name} ({attendant.badgeNumber})
                </Option>
              ))}
            </Select>
            {assignedAttendant && (
              <div style={{ 
                padding: '4px 8px', 
                backgroundColor: '#e6f7ff', 
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                <UserCheck size={12} style={{ marginRight: '4px' }} />
                {assignedAttendant.name}
              </div>
            )}
          </Space>
        );
      },
      width: 180
    },
    {
      title: 'Cash Collection',
      key: 'collection',
      render: (_, island) => {
        const collectedAmount = parseFloat(cashCollections[island.islandId]) || 0;
        const expectedAmount = island.totalSales;
        const variance = expectedAmount - collectedAmount;
        const isBalanced = Math.abs(variance) < 0.01;
        
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              type="number"
              placeholder="Enter collected amount"
              value={cashCollections[island.islandId] || ''}
              onChange={(e) => handleCashCollection(island.islandId, e.target.value)}
              style={{ width: '100%' }}
              size="small"
            />
            {collectedAmount > 0 && (
              <div style={{ 
                padding: '4px 8px', 
                backgroundColor: isBalanced ? '#f6ffed' : '#fff2e8',
                borderRadius: '4px',
                fontSize: '11px',
                border: `1px solid ${isBalanced ? '#b7eb8f' : '#ffbb96'}`
              }}>
                <Space size={4}>
                  {isBalanced ? <CheckCircle size={12} color="#389e0d" /> : <AlertTriangle size={12} color="#fa8c16" />}
                  <Text style={{ color: isBalanced ? '#389e0d' : '#fa8c16', fontSize: '11px' }}>
                    {isBalanced ? 'Balanced' : `Variance: ${Math.abs(variance).toFixed(2)}`}
                  </Text>
                </Space>
              </div>
            )}
          </Space>
        );
      },
      width: 180
    },
    {
      title: 'Validation Notes',
      key: 'notes',
      render: (_, island) => (
        <Input.TextArea
          placeholder="Add validation notes..."
          value={validationNotes[island.islandId] || ''}
          onChange={(e) => handleValidationNotes(island.islandId, e.target.value)}
          rows={2}
          style={{ width: '100%' }}
          size="small"
        />
      ),
      width: 200
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, island) => {
        const hasAttendant = !!attendantAssignments[island.islandId];
        const collectedAmount = parseFloat(cashCollections[island.islandId]) || 0;
        const expectedAmount = island.totalSales;
        const isCashBalanced = Math.abs(expectedAmount - collectedAmount) < 0.01;
        const isValid = hasAttendant && isCashBalanced;
        
        return (
          <div style={{ textAlign: 'center' }}>
            <Badge
              status={isValid ? 'success' : hasAttendant ? 'warning' : 'error'}
              text={
                <Text style={{ 
                  fontSize: '11px',
                  color: isValid ? '#389e0d' : hasAttendant ? '#fa8c16' : '#cf1322'
                }}>
                  {isValid ? 'Valid' : hasAttendant ? 'Pending Cash' : 'No Attendant'}
                </Text>
              }
            />
          </div>
        );
      },
      width: 120
    }
  ];

  const canProceedToNext = islandSalesData.length > 0 && 
                          islandSalesData.every(island => {
                            const hasAttendant = !!attendantAssignments[island.islandId];
                            const collectedAmount = parseFloat(cashCollections[island.islandId]) || 0;
                            const isCashBalanced = Math.abs(island.totalSales - collectedAmount) < 0.01;
                            return hasAttendant && isCashBalanced;
                          });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>Step 3: Collection Validation</Title>
        <Text type="secondary">
          Assign attendants to islands and verify cash collections match expected sales.
        </Text>
      </div>

      {/* Statistics Overview - NO PREFIX ATTRIBUTES */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Total Islands"
              value={stats.totalIslands}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="With Attendants"
              value={stats.islandsWithAttendants}
              suffix={`/ ${stats.totalIslands}`}
              valueStyle={{ 
                color: stats.islandsWithAttendants === stats.totalIslands ? '#3f8600' : '#faad14',
                fontSize: '16px'
              }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="Expected Cash"
              value={stats.totalExpectedCash}
              precision={0}
              valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="Collected Cash"
              value={stats.totalCollectedCash}
              precision={0}
              valueStyle={{ 
                color: stats.isBalanced ? '#3f8600' : '#cf1322',
                fontSize: '16px'
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Cash Variance"
              value={Math.abs(stats.cashVariance)}
              precision={0}
              valueStyle={{ 
                color: stats.isBalanced ? '#3f8600' : '#cf1322',
                fontSize: '16px'
              }}
            />
          </Card>
        </Col>
      </Row>

      {!stats.isBalanced && (
        <Alert
          message="Cash Collection Variance Detected"
          description={`Total variance: ${Math.abs(stats.cashVariance).toFixed(2)} (${Math.abs((stats.cashVariance / stats.totalExpectedCash) * 100).toFixed(1)}%)`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary">
              Investigate
            </Button>
          }
        />
      )}

      <Card 
        title={
          <Space>
            <UserCheck size={16} />
            Island Validation
            <Badge 
              count={`${stats.islandsWithAttendants} / ${stats.totalIslands}`} 
              style={{ 
                backgroundColor: stats.islandsWithAttendants === stats.totalIslands ? '#52c41a' : '#faad14'
              }} 
            />
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={validationColumns}
          dataSource={islandSalesData}
          pagination={false}
          size="small"
          rowKey="islandId"
          locale={{ emptyText: 'No island sales data available for validation' }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={onPrev}>
          Back to Island Sales
        </Button>
        
        <Button 
          type="primary" 
          onClick={onNext}
          disabled={!canProceedToNext}
          icon={<CheckCircle size={14} />}
        >
          Proceed to Summary
        </Button>
      </div>
    </div>
  );
};

export default ConnectionValidation;