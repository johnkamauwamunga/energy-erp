// IslandSalesStep.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Input,
  Space,
  Alert,
  Badge,
  Row,
  Col,
  Statistic,
  message,
  Typography,
  Button,
  Divider,
  Tag,
  InputNumber
} from 'antd';
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle,
  FileText,
  Wallet
} from 'lucide-react';
import CollectionsModal from './CollectionsModal';
import SummaryModal from './SummaryModal';
import { useApp } from '../../../../../context/AppContext';

const { Text, Title } = Typography;

const IslandSalesStep = ({
  readingsData,
  onBackToReadings,
  onProceedToSummary
}) => {
    const { state}=useApp()
  const [islandsData, setIslandsData] = useState([]);
  const [salesEntries, setSalesEntries] = useState({});
  const [collectionsModalVisible, setCollectionsModalVisible] = useState(false);
  const [currentIslandIndex, setCurrentIslandIndex] = useState(0);
  const [collections, setCollections] = useState({});
  const [expenses, setExpenses] = useState({});
  const [receipts, setReceipts] = useState({});
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentUserId=state.currentUser?.id

  // Initialize data from readings
  useEffect(() => {
    if (readingsData?.islands) {
      console.log('🏝️ Initializing Island Sales with data:', readingsData);
      setIslandsData(readingsData.islands);
      
      const initialEntries = {};
      const initialReceipts = {};
      const initialExpenses = {};
      const initialCollections = {};
      
      readingsData.islands.forEach((island, islandIndex) => {
        initialEntries[islandIndex] = {};
        initialReceipts[islandIndex] = 0;
        initialExpenses[islandIndex] = 0;
        initialCollections[islandIndex] = [];
        
        island.pumps.forEach(pump => {
          initialEntries[islandIndex][pump.pumpId] = {
            actualSales: pump.expectedSales || 0,
            notes: ''
          };
        });
      });
      
      setSalesEntries(initialEntries);
      setReceipts(initialReceipts);
      setExpenses(initialExpenses);
      setCollections(initialCollections);
    }
  }, [readingsData]);

  // Handle sales input change
  const handleSalesChange = (islandIndex, pumpId, value) => {
    setSalesEntries(prev => ({
      ...prev,
      [islandIndex]: {
        ...prev[islandIndex],
        [pumpId]: {
          ...prev[islandIndex]?.[pumpId],
          actualSales: value || 0
        }
      }
    }));
  };

  // Handle expenses change
  const handleExpensesChange = (islandIndex, value) => {
    setExpenses(prev => ({
      ...prev,
      [islandIndex]: value || 0
    }));
  };

  // Handle receipts change
  const handleReceiptsChange = (islandIndex, value) => {
    setReceipts(prev => ({
      ...prev,
      [islandIndex]: value || 0
    }));
  };

  // Handle collections save
  const handleCollectionsSave = (islandIndex, finalCollections) => {
    console.log(`💾 Saving collections for island ${islandIndex}:`, finalCollections);
    
    setCollections(prev => ({
      ...prev,
      [islandIndex]: finalCollections || []
    }));
    
    setCollectionsModalVisible(false);
    
    const totalCollected = finalCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
    message.success(`Collections saved! Total: KES ${totalCollected.toFixed(2)}`);
  };

  // Calculate island statistics
  const islandStats = useMemo(() => {
    return islandsData.map((island, islandIndex) => {
      const islandSales = salesEntries[islandIndex] || {};
      const islandCollections = Array.isArray(collections[islandIndex]) ? collections[islandIndex] : [];
      const islandExpenses = expenses[islandIndex] || 0;
      const islandReceipts = receipts[islandIndex] || 0;
      
      let totalPumpSales = 0;
      let totalActualSales = 0;
      let completedPumps = 0;

      // Calculate pump sales and completion
      island.pumps.forEach(pump => {
        totalPumpSales += pump.expectedSales || 0;
        
        const pumpSales = islandSales[pump.pumpId];
        const actualSales = pumpSales?.actualSales || 0;
        totalActualSales += actualSales;
        
        // A pump is completed if actual sales is entered (not 0 or empty)
        if (actualSales > 0) {
          completedPumps++;
        }
      });

      // Calculate collections
      const cashCollection = islandCollections
        .filter(c => c && c.type === 'cash')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const debtCollection = islandCollections
        .filter(c => c && c.type === 'debt')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      const totalCollection = cashCollection + debtCollection;
      
      // Expected = Pump Sales + Receipts - Expenses
      const totalExpected = totalPumpSales + islandReceipts - islandExpenses;
      const totalExpectedWithCollections = totalActualSales + totalCollection;
      const totalDifference = totalExpectedWithCollections - totalExpected;

      // Island is complete when:
      // 1. All pumps have sales entered (> 0)
      // 2. Collections have been entered (at least one collection entry)
      const allPumpsCompleted = completedPumps === island.pumps.length;
      const hasCollections = islandCollections.length > 0;
      const isComplete = allPumpsCompleted && hasCollections;

      return {
        ...island,
        totalPumpSales,
        totalActualSales,
        cashCollection,
        debtCollection,
        totalCollection,
        expenses: islandExpenses,
        receipts: islandReceipts,
        totalExpected,
        totalExpectedWithCollections,
        totalDifference,
        completedPumps,
        totalPumps: island.pumps.length,
        isComplete,
        hasCollections,
        allPumpsCompleted
      };
    });
  }, [islandsData, salesEntries, collections, expenses, receipts]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalIslands = islandStats.length;
    const totalPumps = islandStats.reduce((sum, island) => sum + island.pumps.length, 0);
    const completedIslands = islandStats.filter(island => island.isComplete).length;
    const totalPumpSales = islandStats.reduce((sum, island) => sum + island.totalPumpSales, 0);
    const totalActualSales = islandStats.reduce((sum, island) => sum + island.totalActualSales, 0);
    const totalReceipts = islandStats.reduce((sum, island) => sum + island.receipts, 0);
    const totalExpenses = islandStats.reduce((sum, island) => sum + island.expenses, 0);
    const totalCollections = islandStats.reduce((sum, island) => sum + island.totalCollection, 0);
    const totalExpected = islandStats.reduce((sum, island) => sum + island.totalExpected, 0);
    const totalExpectedWithCollections = islandStats.reduce((sum, island) => sum + island.totalExpectedWithCollections, 0);
    const totalDifference = totalExpectedWithCollections - totalExpected;

    return {
      totalIslands,
      totalPumps,
      completedIslands,
      totalPumpSales,
      totalActualSales,
      totalReceipts,
      totalExpenses,
      totalCollections,
      totalExpected,
      totalExpectedWithCollections,
      totalDifference,
      allIslandsComplete: completedIslands === totalIslands && totalIslands > 0
    };
  }, [islandStats]);

  // Open collections modal
  const openCollectionsModal = (islandIndex) => {
    setCurrentIslandIndex(islandIndex);
    setCollectionsModalVisible(true);
  };

  // Get current collections for modal
  const getCurrentCollections = (islandIndex) => {
    return Array.isArray(collections[islandIndex]) ? collections[islandIndex] : [];
  };

  // Prepare payload for summary step
  const preparePayload = () => {
    const payload = {
      shiftId: readingsData?.shiftId,
      recordedById: currentUserId,
      endTime: new Date().toISOString(),
      
      // Include pump readings from readings step
      pumpReadings: readingsData?.pumpReadings || [],
      
      // Include tank readings from readings step  
      tankReadings: readingsData?.tankReadings || [],
      
      islandCollections: islandStats.map((island, index) => {
        const islandCollections = getCurrentCollections(index);
        const cashCollection = islandCollections.find(c => c && c.type === 'cash');
        const debtCollections = islandCollections.filter(c => c && c.type === 'debt');
        
        // Group debt collections by debtor
        const debtorCollectionsMap = debtCollections.reduce((acc, collection) => {
          if (collection && collection.debtorId) {
            if (!acc[collection.debtorId]) {
              acc[collection.debtorId] = 0;
            }
            acc[collection.debtorId] += collection.amount || 0;
          }
          return acc;
        }, {});

        const debtorCollections = Object.entries(debtorCollectionsMap).map(([debtorId, amount]) => ({
          debtorId,
          amount
        }));

        const variance = island.totalDifference;
        
        return {
          islandId: island.islandId,
          attendantId: island.attendants[0]?.id,
          cashAmount: cashCollection?.amount || 0,
          receiptsAmount: island.receipts,
          expectedCashAmount: island.totalExpected,
          debtorCollections: debtorCollections,
          expensesAmount: island.expenses,
          shortageAmount: variance < 0 ? Math.abs(variance) : 0,
          overageAmount: variance > 0 ? variance : 0
        };
      }),
      
      reconciliationNotes: "Shift completed with collections system",
      emergencyClosure: false
    };

    console.log('📦 Final API Payload:', payload);
    return payload;
  };

  // Handle proceed to summary - NOW OPENS MODAL
  const handleProceedToSummary = () => {
    if (!overallStats.allIslandsComplete) {
      message.warning('Please complete all islands before proceeding to summary');
      return;
    }

    // Create a clean, flattened data structure for SummaryModal
    const finalData = {
      // Core shift data
      shiftId: readingsData?.shiftId,
      stationId: readingsData?.stationId,
      shiftNumber: readingsData?.shiftNumber,
      supervisor: readingsData?.supervisor,
      
      // Readings data
      pumpReadings: readingsData?.pumpReadings || [],
      tankReadings: readingsData?.tankReadings || [],
      
      // Island sales data
      islands: islandStats.map((island, index) => ({
        islandId: island.islandId,
        islandName: island.islandName,
        attendants: island.attendants,
        pumps: island.pumps,
        totalPumpSales: island.totalPumpSales,
        totalActualSales: island.totalActualSales,
        cashCollection: island.cashCollection,
        debtCollection: island.debtCollection,
        totalCollection: island.totalCollection,
        expenses: island.expenses,
        receipts: island.receipts,
        totalExpected: island.totalExpected,
        totalExpectedWithCollections: island.totalExpectedWithCollections,
        totalDifference: island.totalDifference,
        completedPumps: island.completedPumps,
        totalPumps: island.totalPumps,
        isComplete: island.isComplete,
        hasCollections: island.hasCollections,
        allPumpsCompleted: island.allPumpsCompleted,
        
        // Additional data for detailed display
        salesEntries: salesEntries[index] || {},
        collections: getCurrentCollections(index)
      })),
      
      // Statistics
      overallStats: overallStats,
      
      // API payload
      apiPayload: preparePayload(),
      
      // Summary data from readings step
      summary: readingsData?.summary || {}
    };

    console.log('📊 Opening Summary Modal with data:', finalData);
    setSummaryData(finalData);
    setSummaryModalVisible(true);
  };

  // Handle shift submission from modal
  const handleSubmitShift = async (finalPayload) => {
    setSubmitting(true);
    try {
      // Here you would call your API to submit the shift
      // await shiftService.closeShift(finalPayload);
      
      message.success('Shift submitted successfully!');
      setSummaryModalVisible(false);
      
      // You can add any post-submission logic here
      // For example, redirect to dashboard or show success message
      
    } catch (error) {
      console.error('❌ Error submitting shift:', error);
      message.error('Failed to submit shift. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Island table columns
  const islandColumns = [
    {
      title: 'ISLAND',
      key: 'island',
      width: 120,
      fixed: 'left',
      render: (_, island, islandIndex) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '14px' }}>🏝️ {island.islandName}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {island.completedPumps}/{island.pumps.length} pumps
          </Text>
          {island.attendants.length > 0 && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              👤 {island.attendants[0].firstName} {island.attendants[0].lastName}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'ATTENDANT(S)',
      key: 'attendants',
      width: 150,
      render: (_, island) => (
        <Space direction="vertical" size={2}>
          {island.attendants.map((attendant, idx) => (
            <Text key={idx} style={{ fontSize: '12px' }}>
              👤 {attendant.firstName} {attendant.lastName}
              <Tag color={attendant.assignmentType === 'PRIMARY' ? 'blue' : 'default'} size="small" style={{ marginLeft: 4 }}>
                {attendant.assignmentType}
              </Tag>
            </Text>
          ))}
          {island.attendants.length === 0 && (
            <Text type="secondary" style={{ fontSize: '11px' }}>No attendants</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'PUMP SALES',
      key: 'pumpSales',
      width: 200,
      render: (_, island, islandIndex) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {island.pumps.map((pump, pumpIndex) => {
            const pumpSales = salesEntries[islandIndex]?.[pump.pumpId];
            const actualSales = pumpSales?.actualSales || 0;
            const isCompleted = actualSales > 0;
            
            return (
              <div key={pump.pumpId} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '6px 8px',
                backgroundColor: pumpIndex % 2 === 0 ? '#fafafa' : 'transparent',
                borderRadius: '6px',
                border: isCompleted ? '1px solid #52c41a' : '1px solid #d9d9d9'
              }}>
                <Text style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: isCompleted ? '#52c41a' : '#000000' 
                }}>
                  ⛽ {pump.pumpName}
                </Text>
                <InputNumber
                  size="middle"
                  style={{ 
                    width: '120px', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: isCompleted ? '2px solid #52c41a' : '2px solid #d9d9d9',
                    borderRadius: '6px'
                  }}
                  value={actualSales}
                  onChange={(value) => handleSalesChange(islandIndex, pump.pumpId, value)}
                  min={0}
                  placeholder="Sales"
                  formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/KES\s?|(,*)/g, '')}
                />
              </div>
            );
          })}
        </Space>
      ),
    },
    {
      title: 'TOTAL SALES',
      key: 'totalSales',
      width: 120,
      render: (_, island) => (
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
            KES {island.totalActualSales.toFixed(2)}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Actual Pump Sales
          </Text>
        </div>
      ),
    },
    {
      title: 'RECEIPTS',
      key: 'receipts',
      width: 120,
      render: (_, island, islandIndex) => (
        <InputNumber
          size="middle"
          style={{ 
            width: '110px',
            border: '2px solid #d9d9d9',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          value={island.receipts}
          onChange={(value) => handleReceiptsChange(islandIndex, value)}
          min={0}
          placeholder="Receipts"
          formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/KES\s?|(,*)/g, '')}
        />
      ),
    },
    {
      title: 'EXPENSES',
      key: 'expenses',
      width: 120,
      render: (_, island, islandIndex) => (
        <InputNumber
          size="middle"
          style={{ 
            width: '110px',
            border: '2px solid #d9d9d9',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          value={island.expenses}
          onChange={(value) => handleExpensesChange(islandIndex, value)}
          min={0}
          placeholder="Expenses"
          formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/KES\s?|(,*)/g, '')}
        />
      ),
    },
    {
      title: 'EXPECTED',
      key: 'expected',
      width: 120,
      render: (_, island) => (
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
            KES {island.totalExpected.toFixed(2)}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Sales + Receipts - Expenses
          </Text>
        </div>
      ),
    },
    {
      title: 'COLLECTIONS',
      key: 'collections',
      width: 140,
      render: (_, island, islandIndex) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Button 
            type={island.hasCollections ? "primary" : "default"}
            icon={<Wallet size={14} />}
            onClick={() => openCollectionsModal(islandIndex)}
            style={{ 
              padding: '6px 12px', 
              height: 'auto',
              border: island.hasCollections ? '2px solid #52c41a' : '2px solid #1890ff',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            {island.hasCollections ? '✅ ' : ''}
            {getCurrentCollections(islandIndex).length} entries
          </Button>
          {island.hasCollections && (
            <Text style={{ fontSize: '10px', color: '#52c41a', textAlign: 'center' }}>
              KES {island.totalCollection.toFixed(2)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 120,
      fixed: 'right',
      render: (_, island) => {
        let statusText = '';
        let status = 'processing';
        let color = '#faad14';
        
        if (island.isComplete) {
          status = 'success';
          statusText = 'Complete';
          color = '#52c41a';
        } else if (island.allPumpsCompleted && !island.hasCollections) {
          status = 'warning';
          statusText = 'Needs Collections';
          color = '#faad14';
        } else if (island.hasCollections && !island.allPumpsCompleted) {
          status = 'warning';
          statusText = 'Needs Sales';
          color = '#faad14';
        } else {
          status = 'processing';
          statusText = `${island.completedPumps}/${island.pumps.length} pumps`;
          color = '#1890ff';
        }

        return (
          <Badge 
            status={status} 
            text={
              <Text strong style={{ color }}>
                {statusText}
              </Text>
            }
          />
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          💰 Island Sales & Collections
        </Title>
        
        <Alert
          message="Sales Calculation: Expected = Pump Sales + Receipts - Expenses"
          description="Enter actual sales for each pump, then add receipts, expenses, and collections for each island."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </div>

      {/* Overall Statistics */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Total Islands"
              value={overallStats.totalIslands}
              valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Completed Islands"
              value={overallStats.completedIslands}
              suffix={`/ ${overallStats.totalIslands}`}
              valueStyle={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: overallStats.completedIslands === overallStats.totalIslands ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Total Expected"
              value={overallStats.totalExpected}
              precision={0}
              prefix="KES"
              valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Collections"
              value={overallStats.totalCollections}
              precision={0}
              prefix="KES"
              valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '12px', textAlign: 'center' }}>
            <Statistic
              title="Variance"
              value={overallStats.totalDifference}
              precision={0}
              prefix="KES"
              valueStyle={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: overallStats.totalDifference >= 0 ? '#52c41a' : '#fa541c' 
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card 
            size="small" 
            bodyStyle={{ 
              padding: '12px', 
              textAlign: 'center',
              backgroundColor: overallStats.allIslandsComplete ? '#f6ffed' : '#fff7e6'
            }}
          >
            <Statistic
              title="Overall Status"
              value={overallStats.allIslandsComplete ? "READY" : "IN PROGRESS"}
              valueStyle={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: overallStats.allIslandsComplete ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Islands Table */}
      <Card 
        bodyStyle={{ padding: '16px' }}
        style={{ marginBottom: 20 }}
        title={
          <Space>
            <Users size={16} />
            <Text strong>Island Sales & Collections</Text>
            <Badge 
              count={`${overallStats.completedIslands}/${overallStats.totalIslands} Complete`} 
              showZero 
              style={{ 
                backgroundColor: overallStats.allIslandsComplete ? '#52c41a' : '#faad14'
              }} 
            />
          </Space>
        }
      >
        <Table
          columns={islandColumns}
          dataSource={islandStats.map((island, index) => ({ ...island, key: index }))}
          pagination={false}
          size="middle"
          scroll={{ x: 1300 }}
          style={{ fontSize: '12px' }}
        />
      </Card>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '20px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Button 
          size="large"
          icon={<ArrowLeft size={16} />}
          onClick={onBackToReadings}
        >
          BACK TO READINGS
        </Button>
        
        <Button 
          type="primary"
          size="large"
          icon={<FileText size={16} />}
          onClick={handleProceedToSummary}
          disabled={!overallStats.allIslandsComplete}
          style={{ 
            fontWeight: 'bold',
            backgroundColor: overallStats.allIslandsComplete ? '#52c41a' : '#d9d9d9',
            borderColor: overallStats.allIslandsComplete ? '#52c41a' : '#d9d9d9'
          }}
        >
          {overallStats.allIslandsComplete ? (
            <Space size={8}>
              <CheckCircle size={16} />
              REVIEW & SUBMIT
              <ArrowRight size={16} />
            </Space>
          ) : (
            `COMPLETE ALL ISLANDS (${overallStats.completedIslands}/${overallStats.totalIslands})`
          )}
        </Button>
      </div>

      {/* Collections Modal */}
      <CollectionsModal
        visible={collectionsModalVisible}
        onCancel={() => setCollectionsModalVisible(false)}
        onSave={(finalCollections) => handleCollectionsSave(currentIslandIndex, finalCollections)}
        island={islandStats[currentIslandIndex]}
        currentCollections={getCurrentCollections(currentIslandIndex)}
        setCurrentCollections={(newCollections) => 
          setCollections(prev => ({
            ...prev,
            [currentIslandIndex]: newCollections || []
          }))
        }
      />

      {/* Summary Modal */}
      <SummaryModal
        visible={summaryModalVisible}
        onClose={() => setSummaryModalVisible(false)}
        onSubmitShift={handleSubmitShift}
        islandSalesData={summaryData}
        loading={submitting}
      />

      {!overallStats.allIslandsComplete && (
        <Alert
          message="Complete All Island Sales & Collections"
          description={`Please enter sales for all pumps and complete collections for all ${overallStats.totalIslands - overallStats.completedIslands} remaining islands before proceeding.`}
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default IslandSalesStep;