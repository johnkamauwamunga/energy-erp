// IslandSalesStep.jsx - Compact version WITH SIMPLIFIED PUMP SALES
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
  InputNumber,
  Popover,
  List
} from 'antd';
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle,
  FileText,
  Wallet,
  DollarSign,
  Receipt,
  Zap,
  Fuel
} from 'lucide-react';
import CollectionsModal from './CollectionsModal';
import SummaryModal from './SummaryModal';
import { useApp } from '../../../../../context/AppContext';
import { expenseService } from '../../../../../services/expenseService/expenseService';

const { Text, Title } = Typography;

const IslandSalesStep = ({
  readingsData,
  onBackToReadings,
  onProceedToSummary
}) => {
  const { state } = useApp();
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
  const [loadingExpenses, setLoadingExpenses] = useState({});
  const [islandExpenses, setIslandExpenses] = useState({});

  const currentUserId = state.currentUser?.id;
  const shiftId = readingsData?.shiftId;

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
        
        // Calculate total expected sales for all pumps in this island
        const totalExpectedSales = island.pumps.reduce((sum, pump) => sum + (pump.expectedSales || 0), 0);
        
        // Set initial sales entry for the whole island (not per pump)
        initialEntries[islandIndex] = {
          islandTotalSales: totalExpectedSales,
          notes: ''
        };
      });
      
      setSalesEntries(initialEntries);
      setReceipts(initialReceipts);
      setExpenses(initialExpenses);
      setCollections(initialCollections);

      // Load expenses for each island
      loadIslandExpenses(readingsData.islands);
    }
  }, [readingsData]);

  // Load cumulative expenses for each island in the shift
  const loadIslandExpenses = async (islands) => {
    if (!shiftId) return;

    const expensesData = {};
    const loadingStates = {};

    // Initialize loading states
    islands.forEach((island, index) => {
      if (island.islandId) {
        loadingStates[index] = true;
      }
    });

    setLoadingExpenses(loadingStates);

    try {
      // Load expenses for each island in parallel
      const expensePromises = islands.map(async (island, index) => {
        if (!island.islandId) return null;

        try {
          const result = await expenseService.getExpensesByShiftAndIsland(shiftId, island.islandId);
          
          // Filter expenses to only include current shift expenses
          const allExpenses = result.data || [];
          const currentShiftExpenses = allExpenses.filter(expense => expense.shiftId === shiftId);
          
          // Calculate cumulative amount from CURRENT SHIFT expenses only
          const cumulativeAmount = currentShiftExpenses.reduce((total, expense) => total + (expense.amount || 0), 0);
          
          return { 
            index, 
            result: {
              ...result,
              cumulativeAmount,
              count: currentShiftExpenses.length,
              expenses: currentShiftExpenses
            }
          };
        } catch (error) {
          console.error(`❌ Error loading expenses for island ${island.islandId}:`, error);
          return { 
            index, 
            result: { 
              expenses: [], 
              cumulativeAmount: 0, 
              count: 0 
            } 
          };
        }
      });

      const results = await Promise.all(expensePromises);

      // Process results
      results.forEach(({ index, result }) => {
        if (result) {
          expensesData[index] = result;
        }
      });

      setIslandExpenses(expensesData);

      // Update expenses with cumulative amounts
      const updatedExpenses = { ...expenses };
      Object.entries(expensesData).forEach(([index, data]) => {
        updatedExpenses[index] = data.cumulativeAmount || 0;
      });
      setExpenses(updatedExpenses);

    } catch (error) {
      console.error('❌ Error loading island expenses:', error);
      message.error('Failed to load island expenses');
    } finally {
      setLoadingExpenses({});
    }
  };

  // Handle total island sales change
  const handleSalesChange = (islandIndex, value) => {
    setSalesEntries(prev => ({
      ...prev,
      [islandIndex]: {
        ...prev[islandIndex],
        islandTotalSales: value || 0
      }
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
      const islandExpenseData = islandExpenses[islandIndex] || { cumulativeAmount: 0, expenses: [], count: 0 };
      const islandExpenseAmount = expenses[islandIndex] || 0;
      const islandReceipts = receipts[islandIndex] || 0;
      
      // Calculate total expected sales from all pumps
      const totalPumpSales = island.pumps.reduce((sum, pump) => sum + (pump.expectedSales || 0), 0);
      
      // Get actual sales entered for the whole island
      const totalActualSales = islandSales.islandTotalSales || 0;
      
      // Calculate collections
      const cashCollection = islandCollections
        .filter(c => c && c.type === 'cash')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const debtCollection = islandCollections
        .filter(c => c && c.type === 'debt')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      const totalCollection = cashCollection + debtCollection;
      
      // Expected = Pump Sales + Receipts - Expenses
      const totalExpected = totalPumpSales + islandReceipts - islandExpenseAmount;
      const totalExpectedWithCollections = totalActualSales + totalCollection;
      const totalDifference = totalExpectedWithCollections - totalExpected;

      // Island is complete when:
      // 1. Total sales have been entered (> 0)
      // 2. Collections have been entered (at least one collection entry)
      const hasSales = totalActualSales > 0;
      const hasCollections = islandCollections.length > 0;
      const isComplete = hasSales && hasCollections;

      return {
        ...island,
        totalPumpSales,
        totalActualSales,
        cashCollection,
        debtCollection,
        totalCollection,
        expenses: islandExpenseAmount,
        expenseData: islandExpenseData,
        receipts: islandReceipts,
        totalExpected,
        totalExpectedWithCollections,
        totalDifference,
        totalPumps: island.pumps.length,
        isComplete,
        hasCollections,
        hasSales,
        isLoadingExpenses: loadingExpenses[islandIndex] || false,
        // Store pump count for display
        pumpCount: island.pumps.length,
        pumpNames: island.pumps.map(p => p.pumpName).join(', ')
      };
    });
  }, [islandsData, salesEntries, collections, expenses, receipts, islandExpenses, loadingExpenses]);

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

  // Expense Popover Content
  const renderExpenseDetails = (island) => {
    if (island.isLoadingExpenses) {
      return <Text>Loading expenses...</Text>;
    }

    const expenseData = island.expenseData || {};
    const expensesList = expenseData.expenses || [];

    if (expensesList.length === 0) {
      return <Text type="secondary">No expenses recorded for this shift</Text>;
    }

    return (
      <div style={{ width: 300 }}>
        <Text strong>Shift Expenses ({expensesList.length}):</Text>
        <List
          size="small"
          dataSource={expensesList}
          renderItem={(expense) => (
            <List.Item>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text strong style={{ fontSize: '12px' }}>{expense.title}</Text>
                  <Text strong style={{ color: '#1890ff', fontSize: '12px' }}>
                    {expenseService.formatCurrency(expense.amount)}
                  </Text>
                </div>
                {expense.description && (
                  <Text type="secondary" style={{ fontSize: '10px' }}>{expense.description}</Text>
                )}
                <div style={{ display: '-flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
                  <Text>{expenseService.getCategoryDisplay(expense.category)}</Text>
                  <Text>{expenseService.formatDate(expense.expenseDate)}</Text>
                </div>
              </Space>
            </List.Item>
          )}
        />
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <Text>Total Expenses:</Text>
          <Text style={{ color: '#1890ff' }}>
            {expenseService.formatCurrency(expenseData.cumulativeAmount || 0)}
          </Text>
        </div>
      </div>
    );
  };

  // SIMPLIFIED Island table columns - Clean version
  const islandColumns = [
    {
      title: 'ISLAND',
      key: 'island',
      width: 100,
      fixed: 'left',
      render: (_, island, islandIndex) => (
        <Space direction="vertical" size={2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Fuel size={14} color="#52c41a" />
            <Text strong style={{ fontSize: '12px' }}>{island.islandName}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {island.pumpCount} pumps
          </Text>
          <Text type="secondary" style={{ fontSize: '9px', color: '#666' }}>
            {island.pumpNames}
          </Text>
        </Space>
      ),
    },
    {
      title: 'ATTENDANT(S)',
      key: 'attendants',
      width: 120,
      render: (_, island) => (
        <Space direction="vertical" size={2}>
          {island.attendants.map((attendant, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: idx === 0 ? '#52c41a' : '#1890ff' 
              }} />
              <Text style={{ fontSize: '11px' }}>
                {attendant.firstName} {attendant.lastName}
              </Text>
            </div>
          ))}
          {island.attendants.length === 0 && (
            <Text type="secondary" style={{ fontSize: '10px' }}>No attendants</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'PUMP SALES',
      key: 'pumpSales',
      width: 140,
      render: (_, island, islandIndex) => {
        const expectedSales = island.totalPumpSales;
        const actualSales = salesEntries[islandIndex]?.islandTotalSales || 0;
        const hasSales = actualSales > 0;
        
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {/* Expected Sales (display only) */}
            <div style={{ 
              padding: '4px 8px', 
              backgroundColor: '#f6ffed', 
              borderRadius: '4px',
              border: '1px solid #b7eb8f'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: '11px', color: '#389e0d' }}>
                  KES {expectedSales.toFixed(2)}
                </Text>
              </div>
            </div>
            
            {/* Actual Sales Input - SIMPLIFIED */}
            {/* <InputNumber
              size="small"
              style={{ 
                width: '100%', 
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: hasSales ? '#f6ffed' : '#fff',
                border: hasSales ? '2px solid #52c41a' : '1px solid #d9d9d9',
                borderRadius: '4px',
                height: '32px'
              }}
              value={actualSales}
              onChange={(value) => handleSalesChange(islandIndex, value)}
              min={0}
              placeholder="Enter total sales"
              formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/KES\s?|(,*)/g, '')}
              prefix={<DollarSign size={12} color={hasSales ? '#52c41a' : '#d9d9d9'} />}
            /> */}
            
            {/* Difference indicator */}
            {hasSales && (
              <div style={{ 
                padding: '2px 6px', 
                backgroundColor: '#e6f7ff', 
                borderRadius: '2px',
                fontSize: '10px',
                textAlign: 'center'
              }}>
                <Text type="secondary">
                  Diff: 
                  <span style={{ 
                    color: actualSales >= expectedSales ? '#389e0d' : '#fa541c',
                    fontWeight: 'bold',
                    marginLeft: 4
                  }}>
                    KES {(actualSales - expectedSales).toFixed(2)}
                  </span>
                </Text>
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'RECEIPTS',
      key: 'receipts',
      width: 100,
      render: (_, island, islandIndex) => (
        <InputNumber
          size="small"
          style={{ 
            width: '100%',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            height: '32px'
          }}
          value={island.receipts}
          onChange={(value) => handleReceiptsChange(islandIndex, value)}
          min={0}
          placeholder="Receipts"
          formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/KES\s?|(,*)/g, '')}
          prefix={<Receipt size={12} color="#faad14" />}
        />
      ),
    },
    {
      title: 'EXPENSES',
      key: 'expenses',
      width: 100,
      render: (_, island, islandIndex) => (
        <Popover 
          content={renderExpenseDetails(island)} 
          title="Shift Expenses Details"
          trigger="click"
          placement="left"
        >
          <div style={{ 
            padding: '8px', 
            cursor: 'pointer',
            textAlign: 'center',
            border: '1px solid #1890ff',
            borderRadius: '4px',
            backgroundColor: '#e6f7ff',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {island.isLoadingExpenses ? (
              <Text type="secondary" style={{ fontSize: '10px' }}>Loading...</Text>
            ) : (
              <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>
                KES {island.expenses.toFixed(2)}
              </Text>
            )}
          </div>
        </Popover>
      ),
    },
    {
      title: 'COLLECTIONS',
      key: 'collections',
      width: 110,
      render: (_, island, islandIndex) => (
        <div style={{ textAlign: 'center' }}>
          <Button 
            type={island.hasCollections ? "primary" : "default"}
            icon={<Wallet size={12} style={{ color: island.hasCollections ? '#fff' : '#faad14' }} />}
            onClick={() => openCollectionsModal(islandIndex)}
            size="small"
            style={{ 
              width: '100%',
              height: '32px',
              fontSize: '11px',
              fontWeight: 'bold',
              backgroundColor: island.hasCollections ? '#52c41a' : '#fff',
              borderColor: island.hasCollections ? '#52c41a' : '#d9d9d9',
              color: island.hasCollections ? '#fff' : '#000',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {island.hasCollections ? '✅ ' : ''}
            {getCurrentCollections(islandIndex).length} drops
          </Button>
          {island.hasCollections && (
            <Text style={{ fontSize: '10px', color: '#52c41a', marginTop: 4 }}>
              KES {island.totalCollection.toFixed(2)}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      width: 90,
      fixed: 'right',
      render: (_, island) => {
        let statusText = '';
        let status = 'processing';
        let color = '#faad14';
        
        if (island.isComplete) {
          status = 'success';
          statusText = 'Complete';
          color = '#52c41a';
        } else if (island.hasSales && !island.hasCollections) {
          status = 'warning';
          statusText = 'Needs Drops';
          color = '#faad14';
        } else if (island.hasCollections && !island.hasSales) {
          status = 'warning';
          statusText = 'Needs Sales';
          color = '#faad14';
        } else {
          status = 'processing';
          statusText = island.hasSales ? 'Sales Done' : 'No Sales';
          color = '#1890ff';
        }

        return (
          <div style={{ textAlign: 'center' }}>
            <Badge 
              status={status} 
              text={
                <Text strong style={{ color, fontSize: '11px' }}>
                  {statusText}
                </Text>
              }
            />
          </div>
        );
      },
    },
  ];

  // Helper function to get current collections
  const getCurrentCollections = (islandIndex) => {
    return Array.isArray(collections[islandIndex]) ? collections[islandIndex] : [];
  };

  // Open collections modal
  const openCollectionsModal = (islandIndex) => {
    setCurrentIslandIndex(islandIndex);
    setCollectionsModalVisible(true);
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

  // Handle proceed to summary
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
        expenseData: island.expenseData,
        receipts: island.receipts,
        totalExpected: island.totalExpected,
        totalExpectedWithCollections: island.totalExpectedWithCollections,
        totalDifference: island.totalDifference,
        pumpCount: island.pumpCount,
        isComplete: island.isComplete,
        hasCollections: island.hasCollections,
        hasSales: island.hasSales,
        
        // Additional data for detailed display
        salesEntry: salesEntries[index] || {},
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

  return (
    <div style={{ padding: '16px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          💰 Island Sales & Collections
        </Title>
        
        {/* <Alert
          message="Sales Calculation: Expected = Pump Sales + Receipts - Expenses"
          description="Enter total sales for each island. Collections capture cash and debt payments."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        /> */}

        {/* Shift Info */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>Shift ID:</Text>
            <Text code>{shiftId}</Text>
            <Text strong>Station:</Text>
            <Text>{state?.currentStation?.name}</Text>
          </Space>
        </Card>
      </div>

      {/* Overall Statistics */}
      <Row gutter={[8, 8]} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Total Islands"
              value={overallStats.totalIslands}
              valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Completed"
              value={overallStats.completedIslands}
              suffix={`/ ${overallStats.totalIslands}`}
              valueStyle={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: overallStats.completedIslands === overallStats.totalIslands ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Expected Sales"
              value={overallStats.totalExpected}
              precision={0}
              prefix="KES"
              valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Total Drops"
              value={overallStats.totalCollections}
              precision={0}
              prefix="KES"
              valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Variance"
              value={overallStats.totalDifference}
              precision={0}
              prefix="KES"
              valueStyle={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: overallStats.totalDifference >= 0 ? '#52c41a' : '#fa541c' 
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bodyStyle={{ padding: '8px', textAlign: 'center' }}>
            <Statistic
              title="Status"
              value={overallStats.allIslandsComplete ? "Ready" : "In Progress"}
              valueStyle={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: overallStats.allIslandsComplete ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Islands Table - CLEAN VERSION */}
      <Card 
        bodyStyle={{ padding: '12px' }}
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <Fuel size={14} color="#52c41a" />
            <Text strong style={{ fontSize: '14px' }}>Island Sales Summary</Text>
            <Badge 
              count={`${overallStats.completedIslands}/${overallStats.totalIslands}`} 
              showZero 
              style={{ 
                backgroundColor: overallStats.allIslandsComplete ? '#52c41a' : '#faad14',
                fontSize: '10px'
              }} 
            />
          </Space>
        }
      >
        <Table
          columns={islandColumns}
          dataSource={islandStats.map((island, index) => ({ ...island, key: index }))}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          style={{ fontSize: '11px' }}
          rowClassName={(record) => record.isComplete ? 'table-row-success' : ''}
        />
      </Card>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '16px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Button 
          size="middle"
          icon={<ArrowLeft size={14} />}
          onClick={onBackToReadings}
          style={{ height: '40px' }}
        >
          BACK TO READINGS
        </Button>
        
        <Button 
          type="primary"
          size="middle"
          icon={<FileText size={14} />}
          onClick={handleProceedToSummary}
          disabled={!overallStats.allIslandsComplete}
          style={{ 
            height: '40px',
            fontWeight: 'bold',
            backgroundColor: overallStats.allIslandsComplete ? '#52c41a' : '#d9d9d9',
            borderColor: overallStats.allIslandsComplete ? '#52c41a' : '#d9d9d9'
          }}
        >
          {overallStats.allIslandsComplete ? (
            <Space size={6}>
              <CheckCircle size={14} />
              REVIEW & SUBMIT
              <ArrowRight size={14} />
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
          description={`Please enter total sales and complete drops for all ${overallStats.totalIslands - overallStats.completedIslands} remaining islands before proceeding.`}
          type="warning"
          showIcon
          style={{ marginTop: 16, fontSize: '12px' }}
        />
      )}
    </div>
  );
};

// Add CSS for row highlighting
const styles = `
  .table-row-success {
    background-color: #f6ffed !important;
  }
  .table-row-success:hover {
    background-color: #d9f7be !important;
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default IslandSalesStep;