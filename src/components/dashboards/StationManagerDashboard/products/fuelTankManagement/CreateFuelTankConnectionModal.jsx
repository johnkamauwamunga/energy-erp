// components/tank/CreateTankFuelConnectionModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  Button, 
  Select, 
  Input,
  Progress 
} from '../../../../ui';
import { Link2, Fuel, Zap, Building } from 'lucide-react';
import { useApp } from '../../../../../context/AppContext';
import { tankFuelConnectionService } from '../../../../../services/tankFuelConnectionService/tankFuelConnectionService';
import { stationService } from '../../../../../services/stationService/stationService';
import { fuelService } from '../../../../../services/fuelService/fuelService';

const CreateTankFuelConnectionModal = ({ 
  isOpen, 
  onClose, 
  onConnectionCreated,
  editConnection = null 
}) => {
  const { state } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Data states
  const [stations, setStations] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [pumps, setPumps] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    stationId: '',
    tankId: '',
    productId: '',
    assetIds: [] // Multiple pumps can be connected
  });

  // Selected items for display
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedTank, setSelectedTank] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (editConnection) {
        setFormData({
          stationId: editConnection.stationId,
          tankId: editConnection.tankId,
          productId: editConnection.productId,
          assetIds: [editConnection.assetId]
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editConnection]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const [stationsRes, productsRes] = await Promise.all([
        stationService.getCompanyStations(),
        fuelService.getFuelProducts()
      ]);
      
      setStations(stationsRes?.data || stationsRes || []);
      setProducts(productsRes?.data || productsRes || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStationAssets = async (stationId) => {
    if (!stationId) return;
    
    try {
      setLoading(true);
      
      const [tanksRes, pumpsRes] = await Promise.all([
        stationService.getStationTanks(stationId),
        stationService.getStationAssets(stationId, 'FUEL_PUMP')
      ]);
      
      setTanks(tanksRes?.data || tanksRes || []);
      setPumps(pumpsRes?.data || pumpsRes || []);
    } catch (error) {
      console.error('Failed to load station assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      stationId: '',
      tankId: '',
      productId: '',
      assetIds: []
    });
    setStep(1);
    setErrors({});
    setSelectedStation(null);
    setSelectedTank(null);
    setSelectedProduct(null);
  };

  const handleStationSelect = (stationId) => {
    setFormData(prev => ({ 
      ...prev, 
      stationId,
      tankId: '',
      assetIds: []
    }));
    
    const station = stations.find(s => s.id === stationId);
    setSelectedStation(station);
    loadStationAssets(stationId);
  };

  const handleTankSelect = (tankId) => {
    setFormData(prev => ({ ...prev, tankId }));
    const tank = tanks.find(t => t.id === tankId);
    setSelectedTank(tank);
  };

  const handleProductSelect = (productId) => {
    setFormData(prev => ({ ...prev, productId }));
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
  };

  const handlePumpToggle = (pumpId) => {
    setFormData(prev => ({
      ...prev,
      assetIds: prev.assetIds.includes(pumpId)
        ? prev.assetIds.filter(id => id !== pumpId)
        : [...prev.assetIds, pumpId]
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.stationId) newErrors.stationId = 'Station is required';
        break;
      case 2:
        if (!formData.tankId) newErrors.tankId = 'Tank selection is required';
        break;
      case 3:
        if (!formData.productId) newErrors.productId = 'Fuel product is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Create connections for each selected pump
      const connections = formData.assetIds.map(assetId => ({
        stationId: formData.stationId,
        tankId: formData.tankId,
        productId: formData.productId,
        assetId
      }));

      let result;
      if (editConnection) {
        // Update existing connection (single connection edit)
        result = await tankFuelConnectionService.updateTankFuelConnection({
          id: editConnection.id,
          ...connections[0] // For edit, we only handle one connection
        });
      } else {
        // Create new connections
        if (connections.length === 1) {
          result = await tankFuelConnectionService.createTankFuelConnection(connections[0]);
        } else {
          result = await tankFuelConnectionService.bulkCreateTankFuelConnections(connections);
        }
      }

      if (result.success !== false) {
        onConnectionCreated();
        resetForm();
        onClose();
      }
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Select Station', icon: Building },
    { number: 2, title: 'Choose Tank', icon: Zap },
    { number: 3, title: 'Select Fuel', icon: Fuel },
    { number: 4, title: 'Connect Pumps', icon: Zap }
  ];

  const canProceed = () => {
    switch (step) {
      case 1: return !!formData.stationId;
      case 2: return !!formData.tankId;
      case 3: return !!formData.productId;
      case 4: return formData.assetIds.length > 0;
      default: return false;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editConnection ? "Edit Tank Connection" : "Connect Tank to Fuel"}
      size="lg"
      onAfterClose={resetForm}
    >
      {/* Progress Steps */}
      <div className="mb-6">
        <Progress steps={steps} currentStep={step} />
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: Station Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Station</h3>
            <Select
              label="Station"
              value={formData.stationId}
              onChange={(e) => handleStationSelect(e.target.value)}
              options={stations.map(station => ({
                value: station.id,
                label: station.name
              }))}
              error={errors.stationId}
              placeholder="Choose a station"
            />
            
            {selectedStation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Station Details</h4>
                <p className="text-blue-700">{selectedStation.name}</p>
                <p className="text-sm text-blue-600">{selectedStation.address}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Tank Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Tank</h3>
            <Select
              label="Storage Tank"
              value={formData.tankId}
              onChange={(e) => handleTankSelect(e.target.value)}
              options={tanks.map(tank => ({
                value: tank.id,
                label: tank.asset?.name || `Tank ${tank.id.slice(-4)}`
              }))}
              error={errors.tankId}
              placeholder="Choose a tank"
            />
            
            {selectedTank && (
              <div className="p-4 bg-green-50 rounded-lg space-y-3">
                <h4 className="font-medium text-green-900">Tank Capacity</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Total Capacity:</span>
                    <div className="text-green-900 font-medium">
                      {selectedTank.capacity?.toLocaleString()} L
                    </div>
                  </div>
                  <div>
                    <span className="text-green-600">Current Volume:</span>
                    <div className="text-green-900 font-medium">
                      {selectedTank.currentVolume?.toLocaleString()} L
                    </div>
                  </div>
                  <div>
                    <span className="text-green-600">Available:</span>
                    <div className="text-green-900 font-medium">
                      {((selectedTank.capacity || 0) - (selectedTank.currentVolume || 0)).toLocaleString()} L
                    </div>
                  </div>
                  <div>
                    <span className="text-green-600">Utilization:</span>
                    <div className="text-green-900 font-medium">
                      {selectedTank.capacity ? 
                        (((selectedTank.currentVolume || 0) / selectedTank.capacity) * 100).toFixed(1) 
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Fuel Selection */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Fuel Product</h3>
            <Select
              label="Fuel Product"
              value={formData.productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              options={products
                .filter(p => p.type === 'FUEL')
                .map(product => ({
                  value: product.id,
                  label: `${product.name} (${product.fuelCode || 'No Code'})`
                }))
              }
              error={errors.productId}
              placeholder="Choose fuel product"
            />
            
            {selectedProduct && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Product Specifications</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-purple-600">Product:</span>
                    <div className="text-purple-900 font-medium">{selectedProduct.name}</div>
                  </div>
                  <div>
                    <span className="text-purple-600">Fuel Code:</span>
                    <div className="text-purple-900 font-medium">{selectedProduct.fuelCode}</div>
                  </div>
                  {selectedProduct.density && (
                    <div>
                      <span className="text-purple-600">Density:</span>
                      <div className="text-purple-900 font-medium">{selectedProduct.density} kg/L</div>
                    </div>
                  )}
                  {selectedProduct.octaneRating && (
                    <div>
                      <span className="text-purple-600">Octane:</span>
                      <div className="text-purple-900 font-medium">RON {selectedProduct.octaneRating}</div>
                    </div>
                  )}
                  {selectedProduct.fuelSubType && (
                    <>
                      <div>
                        <span className="text-purple-600">Category:</span>
                        <div className="text-purple-900 font-medium">
                          {selectedProduct.fuelSubType.category?.name}
                        </div>
                      </div>
                      <div>
                        <span className="text-purple-600">Sub Type:</span>
                        <div className="text-purple-900 font-medium">
                          {selectedProduct.fuelSubType.name}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Pump Connection */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Connect Pumps</h3>
            <p className="text-gray-600">Select pumps that will dispense from this tank</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {pumps.length > 0 ? (
                pumps.map(pump => (
                  <div
                    key={pump.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.assetIds.includes(pump.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePumpToggle(pump.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Zap className={`w-4 h-4 ${
                          formData.assetIds.includes(pump.id) ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <div>
                          <div className="font-medium">{pump.name}</div>
                          <div className="text-sm text-gray-500">
                            {pump.asset?.stationLabel || 'No label'}
                          </div>
                        </div>
                      </div>
                      {formData.assetIds.includes(pump.id) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No pumps available at this station
                </div>
              )}
            </div>
            
            {formData.assetIds.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-700 text-sm">
                  {formData.assetIds.length} pump(s) selected
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {errors.general && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            {errors.general}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 mt-6 border-t">
        <Button
          onClick={step === 1 ? onClose : handleBack}
          variant="secondary"
          disabled={loading}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        <div className="flex space-x-3">
          {step < 4 && (
            <Button
              onClick={handleNext}
              variant="cosmic"
              disabled={!canProceed() || loading}
            >
              Next
            </Button>
          )}
          
          {step === 4 && (
            <Button
              onClick={handleSubmit}
              icon={Link2}
              loading={loading}
              disabled={!canProceed() || loading}
            >
              {editConnection ? 'Update Connection' : 'Create Connections'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default CreateTankFuelConnectionModal;