// src/components/offload/FuelOffloadWizard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Steps,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Alert,
  Table,
  Tag,
  Statistic,
  message,
  Tabs,
  Progress
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  ShoppingOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  DashboardOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { purchaseService } from '../../../../services/purchaseService/purchaseService';
import { connectedAssetService } from '../../../../services/connectedAssetsService/connectedAssetsService';
import { fuelOffloadService } from '../../../../services/offloadService/offloadService';
import {shiftService} from '../../../../services/shiftService/shiftService';
import { supplierAccountService } from '../../../../services/supplierAccountService/supplierAccountService'

const { Title, Text } = Typography;
const { Step } = Steps;
const { TextArea } = Input;
const { TabPane } = Tabs;

// ========== SUB-COMPONENTS ==========

// Purchase Selection Step Component
const PurchaseSelectionStep = ({ purchases, onPurchaseSelect, stationId }) => {
  
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => purchase.stationId === stationId);
  }, [purchases, stationId]);

  console.log("purchase infor ",filteredPurchases);

  return (
    <div className="space-y-4">
      <Title level={4}>Select Purchase Delivery</Title>
      <Text>Choose a purchase that has arrived for offloading at this station</Text>
      
      {filteredPurchases.length === 0 ? (
        <Alert
          message="No Purchases Available"
          description="No pending purchases found for this station. Please check if purchases are in ARRIVED_AT_SITE, IN_TRANSIT, or APPROVED status."
          type="info"
          showIcon
        />
      ) : (
        <div className="space-y-4">
          <Alert
            message={`Found ${filteredPurchases.length} purchase(s) for this station`}
            type="success"
            showIcon
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPurchases.map(purchase => (
              <Card 
                key={purchase.id}
                hoverable
                className="cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition-all"
                onClick={() => onPurchaseSelect(purchase.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Text strong className="text-lg">{purchase.purchaseNumber}</Text>
                      <Tag color={
                        purchase.status === 'APPROVED' ? 'green' :
                        purchase.status === 'IN_TRANSIT' ? 'orange' :
                        purchase.status === 'ARRIVED_AT_SITE' ? 'blue' : 'default'
                      }>
                        {purchase.status}
                      </Tag>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supplier:</span>
                        <span className="font-medium">{purchase.supplier?.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="font-semibold text-blue-600">
                          {purchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0).toLocaleString()}L
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Products:</span>
                        <span className="text-right">
                          {purchase.items?.map(item => item.product?.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Purchase Info Step Component
const PurchaseInfoStep = ({ selectedPurchase, form }) => {
  if (!selectedPurchase) {
    return <Alert message="No purchase selected" type="warning" showIcon />;
  }

  return (
    <div className="space-y-4">
      <Title level={4}>Purchase Information</Title>
      
      <Card>
        <Row gutter={16}>
          <Col span={12}>
            <div className="space-y-3">
              <div>
                <Text strong>Purchase #: </Text>
                <Text>{selectedPurchase.purchaseNumber}</Text>
              </div>
              <div>
                <Text strong>Supplier: </Text>
                <Text>{selectedPurchase.supplier?.name}</Text>
              </div>
              <div>
                <Text strong>Vehicle: </Text>
                <Text>{selectedPurchase.vehicleNumber || 'N/A'}</Text>
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div className="space-y-3">
              <div>
                <Text strong>Total Quantity: </Text>
                <Text className="font-semibold text-blue-600">
                  {selectedPurchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0).toLocaleString()}L
                </Text>
              </div>
              <div>
                <Text strong>Products: </Text>
                <Text>{selectedPurchase.items?.map(item => item.product?.name).join(', ')}</Text>
              </div>
              <div>
                <Text strong>Status: </Text>
                <Tag color={
                  selectedPurchase.status === 'APPROVED' ? 'green' :
                  selectedPurchase.status === 'IN_TRANSIT' ? 'orange' :
                  selectedPurchase.status === 'ARRIVED_AT_SITE' ? 'blue' : 'default'
                }>
                  {selectedPurchase.status}
                </Tag>
              </div>
            </div>
          </Col>
        </Row>

        {/* Purchase Items Details */}
        {selectedPurchase.items && selectedPurchase.items.length > 0 && (
          <div className="mt-4">
            <Text strong>Purchase Items:</Text>
            <div className="mt-2 space-y-2">
              {selectedPurchase.items.map((item, index) => (
                <Card key={index} size="small" className="bg-gray-50">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text strong>{item.product?.name}</Text>
                    </Col>
                    <Col span={4}>
                      <Text>Qty: {item.orderedQty?.toLocaleString()}L</Text>
                    </Col>
                    <Col span={4}>
                      <Text>Price: KSh {item.unitPrice?.toLocaleString()}</Text>
                    </Col>
                    <Col span={8}>
                      <Text>Total: KSh {((item.orderedQty || 0) * (item.unitPrice || 0)).toLocaleString()}</Text>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Form form={form} layout="vertical">
        <Form.Item
          name="notes"
          label="Notes (Optional)"
        >
          <TextArea 
            placeholder="Add any additional notes about this offload..."
            rows={3}
            size="large"
          />
        </Form.Item>
      </Form>
    </div>
  );
};

// Tank Dip Readings Component - Column layout
const TankDipReadings = ({ selectedTank, readingType, title, onDipReadingChange, showCompletion = false }) => {
  const isComplete = selectedTank[readingType]?.volume > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text strong>{title}</Text>
        {showCompletion && isComplete && (
          <CheckCircleOutlined className="text-green-500 text-lg" />
        )}
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Text className="text-sm font-medium">Dip Value (meters)</Text>
          <InputNumber
            placeholder="0.00"
            value={selectedTank[readingType]?.dipValue}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'dipValue', value)}
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            size="large"
            addonAfter="m"
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">Volume (liters)</Text>
          <InputNumber
            placeholder="0"
            value={selectedTank[readingType]?.volume}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'volume', value)}
            min={0}
            style={{ width: '100%' }}
            size="large"
            addonAfter="L"
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">Temperature (°C)</Text>
          <InputNumber
            placeholder="25.0"
            value={selectedTank[readingType]?.temperature}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'temperature', value)}
            min={-50}
            max={100}
            step={0.1}
            style={{ width: '100%' }}
            size="large"
            addonAfter="°C"
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">Water Level (meters)</Text>
          <InputNumber
            placeholder="0.00"
            value={selectedTank[readingType]?.waterLevel}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'waterLevel', value)}
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            size="large"
            addonAfter="m"
          />
        </div>
      </div>
      
      {showCompletion && !isComplete && (
        <Alert message="Please enter volume reading" type="info" showIcon className="mt-2" />
      )}
    </div>
  );
};

// Pump Meter Readings Component - Column layout
const PumpMeterReadings = ({ 
  selectedTank, 
  pumpReadingType, 
  title, 
  selectedPumpId, 
  onPumpSelect, 
  onPumpReadingChange, 
  getPumpsForTank,
  showCompletion = false 
}) => {
  const pumps = getPumpsForTank(selectedTank.tankId);
  
  const isComplete = pumps.length > 0 
    ? pumps.every(pump => {
        const pumpReading = selectedTank[pumpReadingType]?.find(p => p.pumpId === pump.pumpId);
        return pumpReading && (pumpReading.electricMeter > 0 || pumpReading.manualMeter > 0 || pumpReading.cashMeter > 0);
      })
    : true; // If no pumps, consider complete

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text strong>{title}</Text>
        {showCompletion && isComplete && (
          <CheckCircleOutlined className="text-green-500 text-lg" />
        )}
      </div>
      
      <div className="space-y-4">
        {/* Pump List */}
        <div>
          <Text strong className="block mb-3">Select Pump</Text>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pumps.map(pump => {
              const pumpReading = selectedTank[pumpReadingType]?.find(p => p.pumpId === pump.pumpId);
              const hasReadings = pumpReading && (
                pumpReading.electricMeter > 0 || 
                pumpReading.manualMeter > 0 || 
                pumpReading.cashMeter > 0
              );
              
              return (
                <Card
                  key={pump.pumpId}
                  size="small"
                  hoverable
                  className={`cursor-pointer transition-all ${
                    selectedPumpId === pump.pumpId
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : hasReadings
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onPumpSelect(pump.pumpId)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong className="text-sm">{pump.pumpName}</Text>
                      <div className="text-xs text-gray-600">
                        {pump.islandName}
                      </div>
                    </div>
                    {hasReadings ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <Tag color="orange" className="text-xs">Pending</Tag>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Pump Reading Form - Column layout */}
        {selectedPumpId && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <Text strong className="text-lg">
              Meter Readings for {pumps.find(p => p.pumpId === selectedPumpId)?.pumpName}
            </Text>
            <div className="space-y-4">
              <div className="space-y-2">
                <Text className="text-sm font-medium">Electric Meter Reading</Text>
                <InputNumber
                  placeholder="0"
                  value={selectedTank[pumpReadingType]?.find(p => p.pumpId === selectedPumpId)?.electricMeter}
                  onChange={(value) => onPumpReadingChange(selectedTank.tankId, selectedPumpId, pumpReadingType, 'electricMeter', value)}
                  min={0}
                  style={{ width: '100%' }}
                  size="large"
                />
              </div>
              <div className="space-y-2">
                <Text className="text-sm font-medium">Manual Meter Reading</Text>
                <InputNumber
                  placeholder="0"
                  value={selectedTank[pumpReadingType]?.find(p => p.pumpId === selectedPumpId)?.manualMeter}
                  onChange={(value) => onPumpReadingChange(selectedTank.tankId, selectedPumpId, pumpReadingType, 'manualMeter', value)}
                  min={0}
                  style={{ width: '100%' }}
                  size="large"
                />
              </div>
              <div className="space-y-2">
                <Text className="text-sm font-medium">Cash Meter Reading</Text>
                <InputNumber
                  placeholder="0"
                  value={selectedTank[pumpReadingType]?.find(p => p.pumpId === selectedPumpId)?.cashMeter}
                  onChange={(value) => onPumpReadingChange(selectedTank.tankId, selectedPumpId, pumpReadingType, 'cashMeter', value)}
                  min={0}
                  style={{ width: '100%' }}
                  size="large"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showCompletion && !isComplete && pumps.length > 0 && (
        <Alert message="Please complete readings for all pumps" type="info" showIcon className="mt-2" />
      )}
    </div>
  );
};

// Combined Tank Allocation and Readings Step
const TankAllocationAndReadingsStep = ({
  uniqueTanks,
  selectedTanks,
  onTankSelect,
  onTankRemove,
  onVolumeChange,
  getPumpsForTank,
  calculateTotalExpected,
  selectedTankId,
  setSelectedTankId,
  selectedPumpId,
  setSelectedPumpId,
  onDipReadingChange,
  onPumpReadingChange,
  calculateTankActualVolume
}) => {
  const [activeBeforeTab, setActiveBeforeTab] = useState('dip');
  const [activeAfterTab, setActiveAfterTab] = useState('dip');

  // Auto-select first tank if none selected
  useEffect(() => {
    if (selectedTanks.length > 0 && !selectedTankId) {
      setSelectedTankId(selectedTanks[0].tankId);
    }
  }, [selectedTanks, selectedTankId, setSelectedTankId]);

  const selectedTank = selectedTanks.find(tank => tank.tankId === selectedTankId);

  // Check completion status for each section
  const isExpectedVolumeComplete = (tank) => {
    return Number(tank.expectedVolume) > 0;
  };

  const isBeforeReadingsComplete = (tank) => {
    const hasDipReadings = tank.dipBefore?.volume > 0;
    const hasPumpReadings = tank.pumpReadingsBefore?.some(pump => 
      pump.electricMeter > 0 || pump.manualMeter > 0 || pump.cashMeter > 0
    );
    return hasDipReadings || hasPumpReadings;
  };

  const isAfterReadingsComplete = (tank) => {
    const hasDipReadings = tank.dipAfter?.volume > 0;
    const hasPumpReadings = tank.pumpReadingsAfter?.some(pump => 
      pump.electricMeter > 0 || pump.manualMeter > 0 || pump.cashMeter > 0
    );
    return hasDipReadings || hasPumpReadings;
  };

  const isTankComplete = (tank) => {
    return isExpectedVolumeComplete(tank) && isBeforeReadingsComplete(tank) && isAfterReadingsComplete(tank);
  };

  return (
    <div className="space-y-6">
      <Title level={4}>Tank Allocation & Readings</Title>
      <Text>Select tanks, set expected volumes, and enter before/after offload readings</Text>

      <Row gutter={16}>
        {/* Left Column - Tank Selection and Expected Volume */}
        <Col span={6}>
          <Card title="Tank Allocation" size="small" className="h-full">
            <div className="space-y-3">
              {/* Available Tanks */}
              <div>
                <Text strong className="text-sm">Available Tanks</Text>
                <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
                  {uniqueTanks.map(tank => {
                    const isSelected = selectedTanks.find(t => t.tankId === tank.tankId);
                    
                    return (
                      <Card
                        key={tank.tankId}
                        size="small"
                        hoverable
                        className={`cursor-pointer ${
                          isSelected 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => onTankSelect(tank.tankId)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <Text strong className="text-xs">{tank.tankName}</Text>
                            <div className="text-xs text-gray-600">
                              {tank.productName}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircleOutlined className="text-green-500" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Divider />

              {/* Selected Tanks with Expected Volume */}
              <div>
                <Text strong className="text-sm">Selected Tanks</Text>
                <div className="space-y-3 mt-2 max-h-96 overflow-y-auto">
                  {selectedTanks.map(tank => {
                    const isSelected = selectedTankId === tank.tankId;
                    const isComplete = isTankComplete(tank);
                    
                    return (
                      <Card
                        key={tank.tankId}
                        size="small"
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : isComplete
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedTankId(tank.tankId)}
                      >
                        <div className="space-y-3">
                          {/* Tank Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <Text strong className="text-sm">{tank.tankName}</Text>
                              <div className="text-xs text-gray-600">{tank.productName}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isComplete && <CheckCircleOutlined className="text-green-500" />}
                              {isSelected && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                          </div>

                          {/* FIXED: Expected Volume Input - Direct connection */}
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600">Expected Volume (Liters)</div>
                            <InputNumber
                              placeholder="0"
                              value={tank.capacity - tank.currentVolume >= 0 ? tank.expectedVolume : 0}
                              onChange={(value) => onVolumeChange(tank.tankId, 'expectedVolume', value)}
                              min={0}
                              max={800000}
                              style={{ width: '100%' }}
                              size="middle"
                              addonAfter="L"
                            />
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-500">
                                Available: {(tank.capacity - tank.currentVolume).toLocaleString()}L
                              </div>
                              {isExpectedVolumeComplete(tank) && (
                                <CheckCircleOutlined className="text-green-500 text-sm" />
                              )}
                            </div>
                          </div>

                          {/* Completion Status */}
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Expected Volume:</span>
                              <Tag color={isExpectedVolumeComplete(tank) ? "green" : "orange"} size="small">
                                {isExpectedVolumeComplete(tank) ? "✓ Set" : "Not set"}
                              </Tag>
                            </div>
                            <div className="flex justify-between">
                              <span>Before Readings:</span>
                              <Tag color={isBeforeReadingsComplete(tank) ? "green" : "orange"} size="small">
                                {isBeforeReadingsComplete(tank) ? "✓ Complete" : "Pending"}
                              </Tag>
                            </div>
                            <div className="flex justify-between">
                              <span>After Readings:</span>
                              <Tag color={isAfterReadingsComplete(tank) ? "green" : "orange"} size="small">
                                {isAfterReadingsComplete(tank) ? "✓ Complete" : "Pending"}
                              </Tag>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <Button
                            type="text"
                            danger
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTankRemove(tank.tankId);
                            }}
                            block
                          >
                            Remove Tank
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary */}
              {selectedTanks.length > 0 && (
                <>
                  <Divider />
                  <div className="text-center">
                    <Text strong className="text-sm">
                      Completion: {selectedTanks.filter(t => isTankComplete(t)).length} of {selectedTanks.length} tanks
                    </Text>
                    <Progress 
                      percent={Math.round((selectedTanks.filter(t => isTankComplete(t)).length / selectedTanks.length) * 100)} 
                      size="small" 
                      className="mt-2"
                    />
                    <div className="mt-2 text-xs">
                      <Text strong>Total Expected: {calculateTotalExpected().toLocaleString()}L</Text>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>

        {/* Right Column - Readings for Selected Tank */}
        <Col span={18}>
          {selectedTank ? (
            <div className="space-y-4">
              {/* Tank Header with Summary */}
              <Card size="small">
                <Row gutter={16}>
                  <Col span={4}>
                    <Statistic
                      title="Expected Volume"
                      value={selectedTank.expectedVolume || 0}
                      suffix="L"
                      valueStyle={{ color: '#1890ff' }}
                      prefix={isExpectedVolumeComplete(selectedTank) ? <CheckCircleOutlined className="text-green-500" /> : null}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="Before Volume"
                      value={selectedTank.dipBefore?.volume || 0}
                      suffix="L"
                      valueStyle={{ color: '#faad14' }}
                      prefix={isBeforeReadingsComplete(selectedTank) ? <CheckCircleOutlined className="text-green-500" /> : null}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="After Volume"
                      value={selectedTank.dipAfter?.volume || 0}
                      suffix="L"
                      valueStyle={{ color: '#52c41a' }}
                      prefix={isAfterReadingsComplete(selectedTank) ? <CheckCircleOutlined className="text-green-500" /> : null}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="Actual Volume"
                      value={calculateTankActualVolume(selectedTank)}
                      suffix="L"
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title="Variance"
                      value={calculateTankActualVolume(selectedTank) - (selectedTank.expectedVolume || 0)}
                      suffix="L"
                      valueStyle={{ 
                        color: Math.abs(calculateTankActualVolume(selectedTank) - (selectedTank.expectedVolume || 0)) < 10 ? '#52c41a' : '#cf1322' 
                      }}
                    />
                  </Col>
                  <Col span={4}>
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-lg font-bold ${
                        isTankComplete(selectedTank) ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {isTankComplete(selectedTank) ? '✓ Complete' : 'In Progress'}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Before and After Readings */}
              <Row gutter={16}>
                {/* Before Readings */}
                <Col span={12}>
                  <Card 
                    title={
                      <div className="flex items-center gap-2">
                        <span>Before Offload Readings</span>
                        {isBeforeReadingsComplete(selectedTank) && (
                          <CheckCircleOutlined className="text-green-500" />
                        )}
                      </div>
                    }
                    className="h-full"
                  >
                    <Tabs 
                      activeKey={activeBeforeTab} 
                      onChange={setActiveBeforeTab}
                      type="card"
                      size="middle"
                      tabBarExtraContent={
                        isBeforeReadingsComplete(selectedTank) ? (
                          <CheckCircleOutlined className="text-green-500 mr-2" />
                        ) : null
                      }
                    >
                      <TabPane 
                        tab={
                          <span className="flex items-center gap-1">
                            <DashboardOutlined />
                            Tank Dip
                            {selectedTank.dipBefore?.volume > 0 && (
                              <CheckCircleOutlined className="text-green-500 text-xs ml-1" />
                            )}
                          </span>
                        } 
                        key="dip"
                      >
                        <TankDipReadings
                          selectedTank={selectedTank}
                          readingType="dipBefore"
                          title="Before Offload Dip Readings"
                          onDipReadingChange={onDipReadingChange}
                          showCompletion={true}
                        />
                      </TabPane>

                      <TabPane 
                        tab={
                          <span className="flex items-center gap-1">
                            <ExperimentOutlined />
                            Pump Meters ({getPumpsForTank(selectedTank.tankId).length})
                            {selectedTank.pumpReadingsBefore?.some(p => p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0) && (
                              <CheckCircleOutlined className="text-green-500 text-xs ml-1" />
                            )}
                          </span>
                        } 
                        key="pumps"
                      >
                        <PumpMeterReadings
                          selectedTank={selectedTank}
                          pumpReadingType="pumpReadingsBefore"
                          title="Before Offload Pump Readings"
                          selectedPumpId={selectedPumpId}
                          onPumpSelect={setSelectedPumpId}
                          onPumpReadingChange={onPumpReadingChange}
                          getPumpsForTank={getPumpsForTank}
                          showCompletion={true}
                        />
                      </TabPane>
                    </Tabs>
                  </Card>
                </Col>

                {/* After Readings */}
                <Col span={12}>
                  <Card 
                    title={
                      <div className="flex items-center gap-2">
                        <span>After Offload Readings</span>
                        {isAfterReadingsComplete(selectedTank) && (
                          <CheckCircleOutlined className="text-green-500" />
                        )}
                      </div>
                    }
                    className="h-full"
                  >
                    <Tabs 
                      activeKey={activeAfterTab} 
                      onChange={setActiveAfterTab}
                      type="card"
                      size="middle"
                      tabBarExtraContent={
                        isAfterReadingsComplete(selectedTank) ? (
                          <CheckCircleOutlined className="text-green-500 mr-2" />
                        ) : null
                      }
                    >
                      <TabPane 
                        tab={
                          <span className="flex items-center gap-1">
                            <DashboardOutlined />
                            Tank Dip
                            {selectedTank.dipAfter?.volume > 0 && (
                              <CheckCircleOutlined className="text-green-500 text-xs ml-1" />
                            )}
                          </span>
                        } 
                        key="dip"
                      >
                        <TankDipReadings
                          selectedTank={selectedTank}
                          readingType="dipAfter"
                          title="After Offload Dip Readings"
                          onDipReadingChange={onDipReadingChange}
                          showCompletion={true}
                        />
                      </TabPane>

                      <TabPane 
                        tab={
                          <span className="flex items-center gap-1">
                            <ExperimentOutlined />
                            Pump Meters ({getPumpsForTank(selectedTank.tankId).length})
                            {selectedTank.pumpReadingsAfter?.some(p => p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0) && (
                              <CheckCircleOutlined className="text-green-500 text-xs ml-1" />
                            )}
                          </span>
                        } 
                        key="pumps"
                      >
                        <PumpMeterReadings
                          selectedTank={selectedTank}
                          pumpReadingType="pumpReadingsAfter"
                          title="After Offload Pump Readings"
                          selectedPumpId={selectedPumpId}
                          onPumpSelect={setSelectedPumpId}
                          onPumpReadingChange={onPumpReadingChange}
                          getPumpsForTank={getPumpsForTank}
                          showCompletion={true}
                        />
                      </TabPane>
                    </Tabs>
                  </Card>
                </Col>
              </Row>
            </div>
          ) : (
            <Alert 
              message="Select a tank to configure allocation and enter readings" 
              type="info" 
              showIcon 
              className="h-64 flex items-center justify-center"
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

// Summary Step Component
const SummaryStep = ({ selectedPurchase, selectedTanks, calculateTankActualVolume }) => {
  const totalExpected = selectedTanks.reduce((sum, tank) => sum + (Number(tank.expectedVolume) || 0), 0);
  const totalActual = selectedTanks.reduce((sum, tank) => sum + calculateTankActualVolume(tank), 0);
  const purchaseQty = selectedPurchase ? 
    selectedPurchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0) || 0 : 0;
  const variance = totalActual - purchaseQty;

  return (
    <div className="space-y-6">
      <Title level={4}>Offload Summary</Title>
      
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Purchase Quantity"
              value={purchaseQty}
              suffix="Liters"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Allocated"
              value={totalExpected}
              suffix="Liters"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Actual Offloaded"
              value={totalActual}
              suffix="Liters"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overall Variance"
              value={variance}
              suffix="Liters"
              valueStyle={{ 
                color: Math.abs(variance) < 10 ? '#52c41a' : '#cf1322' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Tank Allocation Summary">
        <Table
          dataSource={selectedTanks}
          pagination={false}
          size="middle"
          columns={[
            { 
              title: 'Tank', 
              dataIndex: 'tankName', 
              key: 'tankName',
              render: (text, tank) => (
                <div>
                  <div>{text}</div>
                  <div className="text-xs text-gray-500">{tank.productName}</div>
                </div>
              )
            },
            { 
              title: 'Expected', 
              key: 'expectedVolume',
              render: (_, tank) => (
                <div className="text-right">
                  <div>{(Number(tank.expectedVolume) || 0).toLocaleString()}L</div>
                  {(!tank.expectedVolume || tank.expectedVolume === 0) && (
                    <Tag color="red" className="text-xs mt-1">Not set!</Tag>
                  )}
                </div>
              )
            },
            { 
              title: 'Before Volume', 
              key: 'beforeVolume',
              render: (_, tank) => (
                <div className="text-right">{(tank.dipBefore?.volume || 0).toLocaleString()}L</div>
              )
            },
            { 
              title: 'After Volume', 
              key: 'afterVolume',
              render: (_, tank) => (
                <div className="text-right">{(tank.dipAfter?.volume || 0).toLocaleString()}L</div>
              )
            },
            { 
              title: 'Actual Received', 
              key: 'actualReceived',
              render: (_, tank) => (
                <div className="text-right font-semibold">
                  {calculateTankActualVolume(tank).toLocaleString()}L
                </div>
              )
            },
            { 
              title: 'Variance', 
              key: 'variance',
              render: (_, tank) => {
                const actual = calculateTankActualVolume(tank);
                const expected = Number(tank.expectedVolume) || 0;
                const tankVariance = actual - expected;
                
                // Show critical alerts for significant variances
                const isCritical = Math.abs(tankVariance) > 100; // 100L threshold for critical
                
                return (
                  <div className={`text-right font-semibold ${
                    Math.abs(tankVariance) < 10 ? 'text-green-600' : 
                    isCritical ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {tankVariance.toLocaleString()}L
                    {isCritical && (
                      <Tag color="red" className="ml-1">CRITICAL</Tag>
                    )}
                  </div>
                );
              }
            }
          ]}
        />
      </Card>

      {/* Critical Variance Alert */}
      {selectedTanks.some(tank => {
        const actual = calculateTankActualVolume(tank);
        const expected = Number(tank.expectedVolume) || 0;
        return Math.abs(actual - expected) > 100;
      }) && (
        <Alert
          message="CRITICAL: Significant variance detected in one or more tanks!"
          description="Please verify the expected volumes and tank readings. Variances over 100L indicate potential issues with the offload process."
          type="error"
          showIcon
        />
      )}

      <Alert
        message={
          Math.abs(variance) < 10 ? 
          "Perfect! Quantities are within acceptable variance." : 
          `Variance detected: ${variance.toLocaleString()}L difference between expected and actual volumes.`
        }
        type={Math.abs(variance) < 10 ? "success" : "warning"}
        showIcon
      />
    </div>
  );
};

// ========== MAIN COMPONENT ==========

const FuelOffloadWizard = ({ visible, onClose, onComplete, stationId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [stationAssets, setStationAssets] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedTanks, setSelectedTanks] = useState([]);
  const [selectedTankId, setSelectedTankId] = useState('');
  const [selectedPumpId, setSelectedPumpId] = useState('');

  const [currentShift, setCurrentShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(false);

  useEffect(() => {
    const fetchLatestShift = async () => {
      if (stationId) {
        setLoadingShift(true);
        try {
          const response = await shiftService.getLatestShift(stationId);
          setCurrentShift(response?.id);
        } catch (error) {
          console.error("Failed to fetch current shift:", error);
        } finally {
          setLoadingShift(false);
        }
      }
    };

    fetchLatestShift();
  }, [stationId]);

  // Extract unique tanks and create pump-tank mapping
  const { uniqueTanks, pumpsByTank } = useMemo(() => {
    if (!stationAssets?.assets) return { uniqueTanks: [], pumpsByTank: {} };

    const tankMap = new Map();
    const pumpMap = {};

    stationAssets.assets.forEach(island => {
      island.pumps?.forEach(pump => {
        if (pump.tank) {
          const tank = pump.tank;
          
          if (!tankMap.has(tank.tankId)) {
            tankMap.set(tank.tankId, {
              ...tank,
              islandId: island.islandId,
              islandName: island.islandName
            });
          }

          if (!pumpMap[tank.tankId]) {
            pumpMap[tank.tankId] = [];
          }
          pumpMap[tank.tankId].push({
            ...pump,
            islandId: island.islandId,
            islandName: island.islandName
          });
        }
      });
    });

    return {
      uniqueTanks: Array.from(tankMap.values()),
      pumpsByTank: pumpMap
    };
  }, [stationAssets]);

  // Steps configuration
  const steps = [
    { title: 'Select Purchase', icon: <ShoppingOutlined /> },
    { title: 'Purchase Info', icon: <FileTextOutlined /> },
    { title: 'Tank & Readings', icon: <DashboardOutlined /> },
    { title: 'Summary', icon: <CheckCircleOutlined /> }
  ];

  // Fetch data on mount
  useEffect(() => {
    if (visible && stationId) {
      fetchData();
    }
  }, [visible, stationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchasesData, assetsData] = await Promise.all([
        purchaseService.getPurchases({
          status: ['ARRIVED_AT_SITE', 'IN_TRANSIT', 'APPROVED', 'DRAFT']
        }),
        connectedAssetService.getStationAssetsSimplified(stationId)
      ]);

      const allPurchases = purchasesData.purchases || purchasesData.data || purchasesData || [];
      setPurchases(allPurchases);
      setStationAssets(assetsData);

    } catch (error) {
      console.error('Failed to fetch offload data:', error);
      message.error('Failed to load purchase and asset data');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    setSelectedTankId('');
    setSelectedPumpId('');
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setSelectedTankId('');
    setSelectedPumpId('');
  };

  const handlePurchaseSelect = (purchaseId) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    
    if (purchase && purchase.stationId === stationId) {
      setSelectedPurchase(purchase);
      form.setFieldValue('purchaseId', purchaseId);
      nextStep();
    } else {
      message.error('This purchase does not belong to the current station');
    }
  };

  const handleTankSelect = (tankId) => {
    const tank = uniqueTanks.find(t => t.tankId === tankId);
    if (tank && !selectedTanks.find(t => t.tankId === tankId)) {
      const newTank = {
        tankId: tank.tankId,
        tankName: tank.tankName,
        productId: tank.productId,
        productName: tank.productName,
        capacity: tank.capacity,
        currentVolume: tank.currentVolume,
        expectedVolume: 0, // Initialize with 0
        dipBefore: { 
          dipValue: 0, 
          volume: tank.currentVolume,
          temperature: 25, 
          waterLevel: 0,
          density: 0.85 
        },
        dipAfter: { 
          dipValue: 0, 
          volume: 0, 
          temperature: 25, 
          waterLevel: 0,
          density: 0.85 
        },
        pumpReadingsBefore: pumpsByTank[tank.tankId]?.map(pump => ({
          pumpId: pump.pumpId,
          pumpName: pump.pumpName,
          electricMeter: 0,
          manualMeter: 0,
          cashMeter: 0
        })) || [],
        pumpReadingsAfter: pumpsByTank[tank.tankId]?.map(pump => ({
          pumpId: pump.pumpId,
          pumpName: pump.pumpName,
          electricMeter: 0,
          manualMeter: 0,
          cashMeter: 0
        })) || []
      };
      
      console.log('Adding tank:', newTank);
      setSelectedTanks(prev => [...prev, newTank]);
    }
  };

  const handleTankRemove = (tankId) => {
    setSelectedTanks(prev => prev.filter(t => t.tankId !== tankId));
    if (selectedTankId === tankId) {
      setSelectedTankId('');
      setSelectedPumpId('');
    }
  };

  // FIXED: Simple and reliable volume change handler
  const handleTankVolumeChange = (tankId, field, value) => {
    console.log('🔄 handleTankVolumeChange called:', { tankId, field, value });
    
    // Simple number conversion
    const numericValue = Number(value) || 0;
    
    setSelectedTanks(prev => prev.map(tank => {
      if (tank.tankId === tankId) {
        const updatedTank = { 
          ...tank, 
          [field]: numericValue
        };
        console.log('✅ Updated tank:', updatedTank.tankName, 'expectedVolume:', updatedTank.expectedVolume);
        return updatedTank;
      }
      return tank;
    }));
  };

  const handleDipReadingChange = (tankId, readingType, field, value) => {
    setSelectedTanks(prev => prev.map(tank =>
      tank.tankId === tankId ? {
        ...tank,
        [readingType]: { ...tank[readingType], [field]: value }
      } : tank
    ));
  };

  const handlePumpReadingChange = (tankId, pumpId, readingType, field, value) => {
    setSelectedTanks(prev => prev.map(tank => {
      if (tank.tankId === tankId) {
        const updatedReadings = tank[readingType].map(reading =>
          reading.pumpId === pumpId ? { ...reading, [field]: value } : reading
        );
        return { ...tank, [readingType]: updatedReadings };
      }
      return tank;
    }));
  };

  // Calculate actual volume from dip readings (after - before)
  const calculateTankActualVolume = (tank) => {
    const beforeVolume = tank.dipBefore?.volume || 0;
    const afterVolume = tank.dipAfter?.volume || 0;
    const actualVolume = afterVolume - beforeVolume;
    
    console.log(`📊 Tank ${tank.tankName}: Before=${beforeVolume}L, After=${afterVolume}L, Actual=${actualVolume}L`);
    return actualVolume;
  };

  // Calculate total expected volume
  const calculateTotalExpected = () => {
    const total = selectedTanks.reduce((sum, tank) => {
      const expectedVol = Number(tank.expectedVolume) || 0;
      console.log(`📊 Tank ${tank.tankName}: expectedVolume = ${tank.expectedVolume}`);
      return sum + expectedVol;
    }, 0);
    console.log('🧮 Total expected volume calculated:', total);
    return total;
  };

  const getPumpsForTank = (tankId) => {
    return pumpsByTank[tankId] || [];
  };

  // Check if all tanks are complete
  const areAllTanksComplete = () => {
    return selectedTanks.every(tank => {
      const expectedComplete = Number(tank.expectedVolume) > 0;
      const beforeComplete = tank.dipBefore?.volume > 0 || tank.pumpReadingsBefore?.some(p => p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0);
      const afterComplete = tank.dipAfter?.volume > 0 || tank.pumpReadingsAfter?.some(p => p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0);
      return expectedComplete && beforeComplete && afterComplete;
    });
  };

  // NEW: Handle supplier account posting
  const handleSupplierAccountPosting = async (purchase, offloadResult) => {
    try {
      console.log('💰 Starting supplier account posting...');
      
      if (!purchase.supplierId) {
        throw new Error('No supplier assigned to this purchase.');
      }

      // Calculate due date based on supplier payment terms (default 30 days)
      const paymentTerms = purchase.supplier?.paymentTerms || 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      const invoiceData = {
        supplierId: purchase.supplierId,
        purchaseId: purchase.id,
        amount: purchase.netPayable, // Using netPayable as total amount
        description: `Fuel purchase ${purchase.purchaseNumber}`,
        dueDate: dueDate.toISOString()
      };

      console.log('📝 Supplier invoice data:', invoiceData);

      // Validate the invoice data
      const validationErrors = supplierAccountService.validatePurchaseInvoice(invoiceData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Record the purchase invoice
      const supplierResult = await supplierAccountService.recordPurchaseInvoice(invoiceData);
      console.log('✅ Supplier account updated successfully:', supplierResult);
      
      return supplierResult;
    } catch (error) {
      console.error('❌ Supplier account posting failed:', error);
      throw error;
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <PurchaseSelectionStep 
            purchases={purchases} 
            onPurchaseSelect={handlePurchaseSelect}
            stationId={stationId}
          />
        );
      case 1:
        return <PurchaseInfoStep selectedPurchase={selectedPurchase} form={form} />;
      case 2:
        return (
          <TankAllocationAndReadingsStep
            uniqueTanks={uniqueTanks}
            selectedTanks={selectedTanks}
            onTankSelect={handleTankSelect}
            onTankRemove={handleTankRemove}
            onVolumeChange={handleTankVolumeChange}
            getPumpsForTank={getPumpsForTank}
            calculateTotalExpected={calculateTotalExpected}
            selectedTankId={selectedTankId}
            setSelectedTankId={setSelectedTankId}
            selectedPumpId={selectedPumpId}
            setSelectedPumpId={setSelectedPumpId}
            onDipReadingChange={handleDipReadingChange}
            onPumpReadingChange={handlePumpReadingChange}
            calculateTankActualVolume={calculateTankActualVolume}
          />
        );
      case 3:
        return (
          <SummaryStep 
            selectedPurchase={selectedPurchase} 
            selectedTanks={selectedTanks} 
            calculateTankActualVolume={calculateTankActualVolume} 
          />
        );
      default:
        return (
          <PurchaseSelectionStep 
            purchases={purchases} 
            onPurchaseSelect={handlePurchaseSelect}
            stationId={stationId}
          />
        );
    }
  };

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      
      const totalExpectedVolume = calculateTotalExpected();
      const totalActualVolume = selectedTanks.reduce((sum, tank) => sum + calculateTankActualVolume(tank), 0);

      console.log('🧪 FINAL DEBUG - Expected volumes:');
      selectedTanks.forEach(tank => {
        console.log(`Tank ${tank.tankName}: expectedVolume = ${tank.expectedVolume} (type: ${typeof tank.expectedVolume})`);
      });

      const tankOffloads = selectedTanks.map(tank => {
        const expectedVolume = Number(tank.expectedVolume) || 0;
        const actualVolume = Number(calculateTankActualVolume(tank));
        
        // Check for critical variance (as per your requirement)
        const variance = actualVolume - expectedVolume;
        const isCritical = Math.abs(variance) > 100;
        
        if (isCritical) {
          console.warn(`🚨 CRITICAL VARIANCE: Tank ${tank.tankName} - Expected: ${expectedVolume}L, Actual: ${actualVolume}L, Variance: ${variance}L`);
        }
        
        return {
          tankId: tank.tankId,
          expectedVolume: expectedVolume,
          actualVolume: actualVolume,
          dipBefore: {
            dipValue: Number(tank.dipBefore.dipValue || 0),
            volume: Number(tank.dipBefore.volume || 0),
            temperature: Number(tank.dipBefore.temperature || 25),
            waterLevel: Number(tank.dipBefore.waterLevel || 0),
            density: Number(tank.dipBefore.density || 0.85)
          },
          dipAfter: {
            dipValue: Number(tank.dipAfter.dipValue || 0),
            volume: Number(tank.dipAfter.volume || 0),
            temperature: Number(tank.dipAfter.temperature || 25),
            waterLevel: Number(tank.dipAfter.waterLevel || 0),
            density: Number(tank.dipAfter.density || 0.85)
          },
          pumpReadingsBefore: (tank.pumpReadingsBefore || []).map(reading => ({
            pumpId: reading.pumpId,
            electricMeter: Number(reading.electricMeter || 0),
            manualMeter: Number(reading.manualMeter || 0),
            cashMeter: Number(reading.cashMeter || 0)
          })),
          pumpReadingsAfter: (tank.pumpReadingsAfter || []).map(reading => ({
            pumpId: reading.pumpId,
            electricMeter: Number(reading.electricMeter || 0),
            manualMeter: Number(reading.manualMeter || 0),
            cashMeter: Number(reading.cashMeter || 0)
          }))
        };
      });

      const offloadData = {
        purchaseId: selectedPurchase.id,
        stationId,
        shiftId: currentShift || undefined,
        tankOffloads,
        totalExpectedVolume: Number(totalExpectedVolume),
        totalActualVolume: Number(totalActualVolume),
        notes: values.notes || "Fuel offload completed"
      };

      console.log('🚀 Sending offload data:', offloadData);
      
      // Step 1: Complete fuel offload
      const offloadResult = await fuelOffloadService.createFuelOffload(offloadData);
      console.log('✅ Fuel offload successful:', offloadResult);
      
      // Step 2: Post to supplier account (concurrent from frontend)
      try {
        await handleSupplierAccountPosting(selectedPurchase, offloadResult);
        message.success('Fuel offload created and supplier account updated successfully!');
      } catch (supplierError) {
        console.warn('⚠️ Fuel offload succeeded but supplier account posting failed:', supplierError);
        message.warning('Fuel offload completed but supplier account update failed. Please update supplier account manually.');
      }
      
      if (onComplete) {
        onComplete(offloadResult);
      }
    } catch (error) {
      console.error('❌ Failed to create offload:', error);
      message.error(error.message || 'Failed to create fuel offload');
    } finally {
      setSubmitting(false);
    }
  };

  // Enhanced next step handler with validation
  const handleNextStep = () => {
    if (currentStep === 1) {
      // Moving to Tank & Readings step
      if (!selectedPurchase) {
        message.error('Please select a purchase first');
        return;
      }
    }
    
    if (currentStep === 2) {
      // Moving to Summary - check if all tanks are complete
      if (selectedTanks.length === 0) {
        message.error('Please select at least one tank');
        return;
      }
      
      if (!areAllTanksComplete()) {
        message.warning('Please complete expected volumes and readings for all tanks before proceeding to summary');
        return;
      }
    }
    
    nextStep();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>Fuel Offload Process</span>
          {stationId && (
            <Tag color="blue">Station: {stationId}</Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1600}
      style={{ top: 20 }}
      footer={null}
      closable={false}
    >
      <div className="space-y-6">
        <Steps current={currentStep}>
          {steps.map(step => (
            <Step key={step.title} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        <div style={{ minHeight: '600px' }}>
          {renderCurrentStep()}
        </div>

        <div className="flex justify-between">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={prevStep}
            disabled={currentStep === 0}
            size="large"
          >
            Previous
          </Button>
          
          <Space>
            <Button onClick={onClose} icon={<CloseOutlined />} size="large">
              Cancel
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={handleNextStep}
                disabled={selectedTanks.length === 0 && currentStep >= 2}
                size="large"
              >
                Next: {steps[currentStep + 1]?.title}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleComplete}
                loading={submitting}
                disabled={selectedTanks.length === 0}
                size="large"
              >
                {submitting ? 'Creating Offload...' : 'Complete Offload'}
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default FuelOffloadWizard;