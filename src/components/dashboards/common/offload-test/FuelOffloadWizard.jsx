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
  Tabs
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

const { Title, Text } = Typography;
const { Step } = Steps;
const { TextArea } = Input;
const { TabPane } = Tabs;

// ========== SUB-COMPONENTS ==========

// getCurrentOpenShift

// Purchase Selection Step Component
const PurchaseSelectionStep = ({ purchases, onPurchaseSelect, stationId }) => {
  
  // Filter purchases to only show those for the current station
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => purchase.stationId === stationId);
  }, [purchases, stationId]);


  return (
    <div className="space-y-4">
      <Title level={4}>Select Purchase Delivery</Title>
      <Text>Choose a purchase that has arrived for offloading at this station</Text>
      
      {filteredPurchases.length === 0 ? (
        <Alert
          message="No Purchases Available"
          description={
            <div>
              <p>No pending purchases found for this station.</p>
              <p><strong>Station ID:</strong> {stationId}</p>
              <p>Please check if purchases are in ARRIVED_AT_SITE, IN_TRANSIT, or APPROVED status and assigned to this station.</p>
              {purchases.length > 0 && (
                <p className="mt-2">
                  <strong>Note:</strong> Found {purchases.length} total purchases, but none match this station.
                </p>
              )}
            </div>
          }
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
                        <span className="text-gray-600">Expected Date:</span>
                        <span>{purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : 'N/A'}</span>
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
                          {purchase.items?.map(item => item.product?.name).join(', ') || 'No products'}
                        </span>
                      </div>
                    </div>
                    
                    {purchase.vehicleNumber && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <span className="text-gray-600">Vehicle:</span> {purchase.vehicleNumber}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Debug information - only show in development */}
      {process.env.NODE_ENV === 'development' && purchases.length > 0 && (
        <Card size="small" title="Debug Information" className="mt-4">
          <div className="text-xs space-y-1">
            <div><strong>Total purchases from API:</strong> {purchases.length}</div>
            <div><strong>Filtered purchases for station:</strong> {filteredPurchases.length}</div>
            <div><strong>Current Station ID:</strong> {stationId}</div>
            <div className="mt-2">
              <strong>All purchase station IDs:</strong>
              <div className="max-h-20 overflow-y-auto mt-1 p-1 bg-gray-50 rounded">
                {purchases.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{p.purchaseNumber}:</span>
                    <span className={p.stationId === stationId ? 'text-green-600 font-semibold' : 'text-red-600'}>
                      {p.stationId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
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
              <div>
                <Text strong>Expected Date: </Text>
                <Text>
                  {selectedPurchase.expectedDate ? new Date(selectedPurchase.expectedDate).toLocaleDateString() : 'N/A'}
                </Text>
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
              <div>
                <Text strong>Station: </Text>
                <Text>{selectedPurchase.station?.name || selectedPurchase.stationId}</Text>
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
          name="shiftId"
          label="Shift ID (Optional)"
          help="Leave blank if not applicable"
        >
          <Input placeholder="Enter shift ID if available" size="large" />
        </Form.Item>
        
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

// Tank Selection Component
const TankSelectionSection = ({ 
  uniqueTanks, 
  selectedTanks, 
  onTankSelect, 
  onTankRemove, 
  onVolumeChange,
  getPumpsForTank,
  calculateTotalExpected 
}) => (
  <Row gutter={16}>
    <Col span={12}>
      <Card title="Available Tanks" size="small">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {uniqueTanks.map(tank => {
            const isSelected = selectedTanks.find(t => t.tankId === tank.tankId);
            const connectedPumps = getPumpsForTank(tank.tankId);
            
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
                    <Text strong>{tank.tankName}</Text>
                    <div className="text-xs text-gray-600">
                      {tank.productName} • {tank.currentVolume.toLocaleString()}L / {tank.capacity.toLocaleString()}L
                    </div>
                    <div className="text-xs text-blue-600">
                      {connectedPumps.length} pump(s) connected
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Tag color="blue">{tank.productName}</Tag>
                    {isSelected && (
                      <CheckCircleOutlined className="text-green-500" />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </Col>

    <Col span={12}>
      <Card title="Selected Tanks" size="small">
        {selectedTanks.length === 0 ? (
          <Alert message="No tanks selected" type="info" showIcon />
        ) : (
          <div className="space-y-3">
            {selectedTanks.map(tank => (
              <Card key={tank.tankId} size="small">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Text strong>{tank.tankName}</Text>
                    <div className="text-xs text-gray-600 mb-2">
                      Available: {(tank.capacity - tank.currentVolume).toLocaleString()}L
                    </div>
                    <InputNumber
                      placeholder="Expected Volume"
                      value={tank.expectedVolume}
                      onChange={(value) => onVolumeChange(tank.tankId, 'expectedVolume', value)}
                      min={0}
                      max={tank.capacity - tank.currentVolume}
                      addonAfter="Liters"
                      style={{ width: '100%' }}
                      size="large"
                      stringMode
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={() => onTankRemove(tank.tankId)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
            
            <Divider />
            <div className="text-right">
              <Text strong>Total Allocated: {calculateTotalExpected().toLocaleString()}L</Text>
            </div>
          </div>
        )}
      </Card>
    </Col>
  </Row>
);

// Tank Dip Readings Component
const TankDipReadingsTab = ({ selectedTank, readingType, onDipReadingChange }) => (
  <div className="space-y-4">
    <Text strong>Tank Dip Measurements</Text>
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <div className="space-y-1">
          <Text className="text-sm font-medium">Dip Value (m)</Text>
          <InputNumber
            placeholder="0.00"
            value={selectedTank[readingType]?.dipValue}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'dipValue', value)}
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            size="large"
            stringMode
          />
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div className="space-y-1">
          <Text className="text-sm font-medium">Volume (L)</Text>
          <InputNumber
            placeholder="0"
            value={selectedTank[readingType]?.volume}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'volume', value)}
            min={0}
            style={{ width: '100%' }}
            size="large"
            stringMode
          />
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div className="space-y-1">
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
            stringMode
          />
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div className="space-y-1">
          <Text className="text-sm font-medium">Water Level (m)</Text>
          <InputNumber
            placeholder="0.00"
            value={selectedTank[readingType]?.waterLevel}
            onChange={(value) => onDipReadingChange(selectedTank.tankId, readingType, 'waterLevel', value)}
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            size="large"
            stringMode
          />
        </div>
      </Col>
    </Row>
  </div>
);

// Pump Meter Readings Component
const PumpMeterReadingsTab = ({
  selectedTank,
  pumpReadingType,
  selectedPumpId,
  onPumpSelect,
  onPumpReadingChange,
  getPumpsForTank
}) => {
  const pumps = getPumpsForTank(selectedTank.tankId);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Pump Reading Form */}
        <div>
          {selectedPumpId ? (
            <div className="space-y-4">
              <Text strong>Meter Readings for {pumps.find(p => p.pumpId === selectedPumpId)?.pumpName}</Text>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Text className="text-sm font-medium">Electric Meter</Text>
                  <InputNumber
                    placeholder="0"
                    value={selectedTank[pumpReadingType]?.find(p => p.pumpId === selectedPumpId)?.electricMeter}
                    onChange={(value) => onPumpReadingChange(selectedTank.tankId, selectedPumpId, pumpReadingType, 'electricMeter', value)}
                    min={0}
                    style={{ width: '100%' }}
                    size="large"
                    stringMode
                  />
                </div>
                <div className="space-y-1">
                  <Text className="text-sm font-medium">Manual Meter</Text>
                  <InputNumber
                    placeholder="0"
                    value={selectedTank[pumpReadingType]?.find(p => p.pumpId === selectedPumpId)?.manualMeter}
                    onChange={(value) => onPumpReadingChange(selectedTank.tankId, selectedPumpId, pumpReadingType, 'manualMeter', value)}
                    min={0}
                    style={{ width: '100%' }}
                    size="large"
                    stringMode
                  />
                </div>
                <div className="space-y-1">
                  <Text className="text-sm font-medium">Cash Meter</Text>
                  <InputNumber
                    placeholder="0"
                    value={selectedTank[pumpReadingType]?.find(p => p.pumpId === selectedPumpId)?.cashMeter}
                    onChange={(value) => onPumpReadingChange(selectedTank.tankId, selectedPumpId, pumpReadingType, 'cashMeter', value)}
                    min={0}
                    style={{ width: '100%' }}
                    size="large"
                    stringMode
                  />
                </div>
              </div>
            </div>
          ) : (
            <Alert message="Select a pump to enter meter readings" type="info" showIcon />
          )}
        </div>
      </div>
    </div>
  );
};

// Reading Step Component
const ReadingStep = ({ 
  title, 
  readingType, 
  pumpReadingType, 
  selectedTanks,
  selectedTankId,
  setSelectedTankId,
  selectedPumpId,
  setSelectedPumpId,
  activeReadingTab,
  setActiveReadingTab,
  onDipReadingChange,
  onPumpReadingChange,
  getPumpsForTank 
}) => {
  // Auto-select first tank if none selected
  useEffect(() => {
    if (selectedTanks.length > 0 && !selectedTankId) {
      setSelectedTankId(selectedTanks[0].tankId);
    }
  }, [selectedTanks, selectedTankId, setSelectedTankId]);

  const selectedTank = selectedTanks.find(tank => tank.tankId === selectedTankId);

  return (
    <div className="space-y-6">
      <Title level={4}>{title}</Title>
      
      {selectedTanks.length === 0 ? (
        <Alert message="No tanks selected for offload" type="warning" showIcon />
      ) : (
        <Row gutter={16}>
          {/* Left Column - Tank List */}
          <Col span={8}>
            <Card title="Selected Tanks" size="small">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedTanks.map(tank => {
                  const isSelected = selectedTankId === tank.tankId;
                  const hasReadings = tank[readingType]?.dipValue > 0 || 
                                    tank[pumpReadingType]?.some(p => p.electricMeter > 0 || p.manualMeter > 0 || p.cashMeter > 0);
                  
                  return (
                    <Card
                      key={tank.tankId}
                      size="small"
                      hoverable
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-sm' 
                          : hasReadings
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedTankId(tank.tankId);
                        setSelectedPumpId('');
                        setActiveReadingTab('dip');
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong className="text-sm">{tank.tankName}</Text>
                          <div className="text-xs text-gray-600">
                            {tank.productName}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {hasReadings ? (
                            <CheckCircleOutlined className="text-green-500" />
                          ) : (
                            <Tag color="orange" className="text-xs">Pending</Tag>
                          )}
                          {isSelected && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </Col>

          {/* Right Column - Readings Form */}
          <Col span={16}>
            {selectedTank ? (
              <Card title={`Readings for ${selectedTank.tankName}`}>
                <Tabs 
                  activeKey={activeReadingTab} 
                  onChange={setActiveReadingTab}
                  type="card"
                  size="middle"
                >
                  <TabPane 
                    tab={
                      <span className="flex items-center gap-2">
                        <DashboardOutlined />
                        Tank Dip Readings
                      </span>
                    } 
                    key="dip"
                  >
                    <TankDipReadingsTab
                      selectedTank={selectedTank}
                      readingType={readingType}
                      onDipReadingChange={onDipReadingChange}
                    />
                  </TabPane>

                  <TabPane 
                    tab={
                      <span className="flex items-center gap-2">
                        <ExperimentOutlined />
                        Pump Meter Readings ({getPumpsForTank(selectedTank.tankId).length})
                      </span>
                    } 
                    key="pumps"
                  >
                    <PumpMeterReadingsTab
                      selectedTank={selectedTank}
                      pumpReadingType={pumpReadingType}
                      selectedPumpId={selectedPumpId}
                      onPumpSelect={setSelectedPumpId}
                      onPumpReadingChange={onPumpReadingChange}
                      getPumpsForTank={getPumpsForTank}
                    />
                  </TabPane>
                </Tabs>
              </Card>
            ) : (
              <Alert message="Select a tank to enter readings" type="info" showIcon />
            )}
          </Col>
        </Row>
      )}
    </div>
  );
};

// Summary Step Component
const SummaryStep = ({ selectedPurchase, selectedTanks, calculateTankActualVolume }) => {
  const totalExpected = selectedTanks.reduce((sum, tank) => sum + (tank.expectedVolume || 0), 0);
  const totalActual = selectedTanks.reduce((sum, tank) => sum + calculateTankActualVolume(tank), 0);
  const purchaseQty = selectedPurchase ? 
    selectedPurchase.items?.reduce((sum, item) => sum + (item.orderedQty || 0), 0) || 0 : 0;
  const variance = totalActual - purchaseQty;

  return (
    <div className="space-y-6">
      <Title level={4}>Offload Summary</Title>
      
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Expected Quantity"
              value={purchaseQty}
              suffix="Liters"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Actual Offloaded"
              value={totalActual}
              suffix="Liters"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Variance"
              value={variance}
              suffix="Liters"
              valueStyle={{ color: variance === 0 ? '#52c41a' : variance > 0 ? '#faad14' : '#ff4d4f' }}
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
            { title: 'Tank', dataIndex: 'tankName', key: 'tankName' },
            { title: 'Product', dataIndex: 'productName', key: 'productName' },
            { 
              title: 'Before Volume', 
              key: 'beforeVolume',
              render: (_, tank) => (tank.dipBefore?.volume || 0).toLocaleString() + 'L'
            },
            { 
              title: 'After Volume', 
              key: 'afterVolume',
              render: (_, tank) => (tank.dipAfter?.volume || 0).toLocaleString() + 'L'
            },
            { 
              title: 'Actual Received', 
              key: 'actualReceived',
              render: (_, tank) => calculateTankActualVolume(tank).toLocaleString() + 'L'
            }
          ]}
        />
      </Card>

      <Alert
        message={variance === 0 ? "Perfect match! Quantities are exact." : 
                 variance > 0 ? `Over by ${variance}L - check for measurement errors` :
                 `Short by ${Math.abs(variance)}L - investigate discrepancy`}
        type={variance === 0 ? "success" : variance > 0 ? "warning" : "error"}
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
  const [activeReadingTab, setActiveReadingTab] = useState('dip');

    const [currentShift, setCurrentShift] = useState(null);
    const [loadingShift, setLoadingShift] = useState(false);
    const [latestShift, setLatestShift]=useState(null)

      useEffect(() => {
    const fetchCurrentShift = async () => {
      if (stationId) {
        setLoadingShift(true);
        try {
          console.log("🔄 Fetching current open shift for station:", stationId);
          const response = await shiftService.getCurrentOpenShift(); // ADD AWAIT
          console.log("✅ Current open shift response:", response);
        //   setCurrentShift(response);
        } catch (error) {
          console.error("❌ Failed to fetch current shift:", error);
         // setCurrentShift(null);
        } finally {
          setLoadingShift(false);
        }
      }
    };

   const  fetchLatestShift = async ()=>{
        if (stationId) {
        setLoadingShift(true);
        try {
          console.log("🔄 Fetching latest open shift for station:", stationId);
          const response = await shiftService.getLatestShift(stationId); // ADD AWAIT
          console.log("✅ Current latest shift response:", response);
          setLatestShift(response);
           setCurrentShift(response?.id);
        } catch (error) {
          console.error("❌ Failed to fetch current shift:", error);
          setLatestShift(null);
        } finally {
          setLoadingShift(false);
        }
      }
    }

    fetchLatestShift()
    fetchCurrentShift();
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
          
          // Add tank to unique tanks map
          if (!tankMap.has(tank.tankId)) {
            tankMap.set(tank.tankId, {
              ...tank,
              islandId: island.islandId,
              islandName: island.islandName
            });
          }

          // Add pump to tank's pump list
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
    { title: 'Tank Allocation', icon: <DashboardOutlined /> },
    { title: 'Before Readings', icon: <CalculatorOutlined /> },
    { title: 'After Readings', icon: <CalculatorOutlined /> },
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
          // Remove stationId filter from API call since we'll filter client-side
          // to see all purchases and debug which ones belong to this station
          status: ['ARRIVED_AT_SITE', 'IN_TRANSIT', 'APPROVED', 'DRAFT'] // Include DRAFT for testing
        }),
        connectedAssetService.getStationAssetsSimplified(stationId)
      ]);

      const allPurchases = purchasesData.purchases || purchasesData.data || purchasesData || [];
      setPurchases(allPurchases);
      setStationAssets(assetsData);

      console.log('All purchases from API:', allPurchases);
      console.log('Current station ID:', stationId);
      console.log('Purchases for this station:', allPurchases.filter(p => p.stationId === stationId));

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
    
    // Double-check that the purchase belongs to the current station
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
      setSelectedTanks(prev => [...prev, {
        tankId: tank.tankId,
        tankName: tank.tankName,
        productId: tank.productId,
        productName: tank.productName,
        capacity: tank.capacity,
        currentVolume: tank.currentVolume,
        expectedVolume: 0,
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
      }]);
    }
  };

  const handleTankRemove = (tankId) => {
    setSelectedTanks(prev => prev.filter(t => t.tankId !== tankId));
    if (selectedTankId === tankId) {
      setSelectedTankId('');
      setSelectedPumpId('');
    }
  };

  const handleTankVolumeChange = (tankId, field, value) => {
    setSelectedTanks(prev => prev.map(tank =>
      tank.tankId === tankId ? { ...tank, [field]: value } : tank
    ));
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
    return afterVolume - beforeVolume;
  };

  const calculateTotalExpected = () => {
    return selectedTanks.reduce((sum, tank) => sum + (tank.expectedVolume || 0), 0);
  };

  const getPumpsForTank = (tankId) => {
    return pumpsByTank[tankId] || [];
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
          <div className="space-y-4">
            <Title level={4}>Select Tanks for Offload</Title>
            <Text>Choose which tanks to offload the fuel into</Text>
            <TankSelectionSection
              uniqueTanks={uniqueTanks}
              selectedTanks={selectedTanks}
              onTankSelect={handleTankSelect}
              onTankRemove={handleTankRemove}
              onVolumeChange={handleTankVolumeChange}
              getPumpsForTank={getPumpsForTank}
              calculateTotalExpected={calculateTotalExpected}
            />
          </div>
        );
      case 3:
        return (
          <ReadingStep 
            title="Before Offload Readings" 
            readingType="dipBefore" 
            pumpReadingType="pumpReadingsBefore"
            selectedTanks={selectedTanks}
            selectedTankId={selectedTankId}
            setSelectedTankId={setSelectedTankId}
            selectedPumpId={selectedPumpId}
            setSelectedPumpId={setSelectedPumpId}
            activeReadingTab={activeReadingTab}
            setActiveReadingTab={setActiveReadingTab}
            onDipReadingChange={handleDipReadingChange}
            onPumpReadingChange={handlePumpReadingChange}
            getPumpsForTank={getPumpsForTank}
          />
        );
      case 4:
        return (
          <ReadingStep 
            title="After Offload Readings" 
            readingType="dipAfter" 
            pumpReadingType="pumpReadingsAfter"
            selectedTanks={selectedTanks}
            selectedTankId={selectedTankId}
            setSelectedTankId={setSelectedTankId}
            selectedPumpId={selectedPumpId}
            setSelectedPumpId={setSelectedPumpId}
            activeReadingTab={activeReadingTab}
            setActiveReadingTab={setActiveReadingTab}
            onDipReadingChange={handleDipReadingChange}
            onPumpReadingChange={handlePumpReadingChange}
            getPumpsForTank={getPumpsForTank}
          />
        );
      case 5:
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
    
    const tankOffloads = selectedTanks.map(tank => ({
      tankId: tank.tankId,
      expectedVolume: Number(tank.expectedVolume), // Convert to number
      actualVolume: Number(calculateTankActualVolume(tank)), // Convert to number
      dipBefore: {
        dipValue: Number(tank.dipBefore.dipValue || 0),
        volume: Number(tank.dipBefore.volume || 0),
        temperature: Number(tank.dipBefore.temperature || 25), // Default temperature
        waterLevel: Number(tank.dipBefore.waterLevel || 0), // Default to 0 instead of null
        density: Number(tank.dipBefore.density || 0.85) // Default density
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
        cashMeter: Number(reading.cashMeter || 0),
        litersDispensed: 0, // Explicitly set to 0
        salesValue: 0,      // Explicitly set to 0
        unitPrice: 0        // Explicitly set to 0
      })),
      pumpReadingsAfter: (tank.pumpReadingsAfter || []).map(reading => ({
        pumpId: reading.pumpId,
        electricMeter: Number(reading.electricMeter || 0),
        manualMeter: Number(reading.manualMeter || 0),
        cashMeter: Number(reading.cashMeter || 0),
        litersDispensed: 0,
        salesValue: 0,
        unitPrice: 0
      })),
      density: Number(tank.density || 0.85), // Provide default
      temperature: Number(tank.temperature || 25) // Provide default
    }));

    const offloadData = {
      purchaseId: selectedPurchase.id,
      stationId,
      shiftId: currentShift || undefined, // Use undefined instead of null
      tankOffloads,
      totalExpectedVolume: Number(calculateTotalExpected()), // Convert to number
      totalActualVolume: Number(selectedTanks.reduce((sum, tank) => sum + calculateTankActualVolume(tank), 0)), // Convert to number
      notes: values.notes || "defaul notes" // Use undefined instead of null
    };

    // Remove any undefined values completely
    const cleanOffloadData = JSON.parse(JSON.stringify(offloadData));

    console.log('Sending offload data:', cleanOffloadData);
    
    const result = await fuelOffloadService.createFuelOffload(cleanOffloadData);
    message.success('Fuel offload created successfully!');
    
    if (onComplete) {
      onComplete(result);
    }
  } catch (error) {
    console.error('Failed to create offload:', error);
    message.error(error.message || 'Failed to create fuel offload');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>Fuel Offload Process</span>
          {stationId && (
            <Tag color="blue">Station: {stationId.substring(0, 8)}...</Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1400}
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

        <div style={{ minHeight: '500px' }}>
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
                onClick={nextStep}
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