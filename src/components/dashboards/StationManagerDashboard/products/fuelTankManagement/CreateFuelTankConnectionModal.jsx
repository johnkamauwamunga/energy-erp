// components/tankFuel/CreateTankFuelConnectionModal.jsx
import React, { useState, useEffect } from 'react';
import { Input, Button, Select, MultiSelect } from '../../../ui';
import Dialog from '../../../ui/Dialog';
import { useApp } from '../../../../context/AppContext';
import { Fuel, Tank, Link2 } from 'lucide-react';
import { tankFuelConnectionService } from '../../../../services/tankFuelConnectionService';
import { fuelService } from '../../../../services/fuelService';
import { stationService } from '../../../../services/stationService';

const CreateTankFuelConnectionModal = ({ isOpen, onClose, onConnectionCreated }) => {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    stationId: '',
    tankId: '',
    productId: '',
    assetId: '',
  });
  
  const [stations, setStations] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedTank, setSelectedTank] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState({
    stations: false,
    tanks: false,
    products: false,
    assets: false
  });

  // Load initial data when modal opens
  useEffect(() => {
    const loadInitialData = async () => {
      if (isOpen) {
        setIsLoading(prev => ({ ...prev, stations: true }));
        try {
          const [stationsResponse, productsResponse] = await Promise.all([
            stationService.getCompanyStations(),
            fuelService.getFuelProducts()
          ]);
          
          setStations(stationsResponse?.data || stationsResponse || []);
          setProducts(productsResponse?.data || productsResponse || []);
        } catch (error) {
          console.error('Failed to load initial data:', error);
        } finally {
          setIsLoading(prev => ({ ...prev, stations: false }));
        }
        
        // Reset form
        setFormData({
          stationId: '',
          tankId: '',
          productId: '',
          assetId: '',
        });
        setSelectedTank(null);
        setSelectedProduct(null);
        setErrors({});
        setSuccessMessage('');
      }
    };

    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Load tanks when station is selected
  useEffect(() => {
    const loadTanks = async () => {
      if (formData.stationId) {
        setIsLoading(prev => ({ ...prev, tanks: true }));
        try {
          // You might need to create a tanks service or use existing asset service
          const tanksResponse = await stationService.getStationTanks(formData.stationId);
          setTanks(tanksResponse?.data || tanksResponse || []);
        } catch (error) {
          console.error('Failed to load tanks:', error);
          setTanks([]);
        } finally {
          setIsLoading(prev => ({ ...prev, tanks: false }));
        }
      } else {
        setTanks([]);
        setFormData(prev => ({ ...prev, tankId: '' }));
        setSelectedTank(null);
      }
    };

    if (formData.stationId) {
      loadTanks();
    }
  }, [formData.stationId]);

  // Load assets (pumps) when station is selected
  useEffect(() => {
    const loadAssets = async () => {
      if (formData.stationId) {
        setIsLoading(prev => ({ ...prev, assets: true }));
        try {
          // You might need to create an assets service or use existing one
          const assetsResponse = await stationService.getStationAssets(formData.stationId, 'PUMP');
          setAssets(assetsResponse?.data || assetsResponse || []);
        } catch (error) {
          console.error('Failed to load assets:', error);
          setAssets([]);
        } finally {
          setIsLoading(prev => ({ ...prev, assets: false }));
        }
      } else {
        setAssets([]);
        setFormData(prev => ({ ...prev, assetId: '' }));
      }
    };

    if (formData.stationId) {
      loadAssets();
    }
  }, [formData.stationId]);

  // Update selected tank when tankId changes
  useEffect(() => {
    if (formData.tankId && tanks.length > 0) {
      const tank = tanks.find(t => t.id === formData.tankId);
      setSelectedTank(tank || null);
    } else {
      setSelectedTank(null);
    }
  }, [formData.tankId, tanks]);

  // Update selected product when productId changes
  useEffect(() => {
    if (formData.productId && products.length > 0) {
      const product = products.find(p => p.id === formData.productId);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [formData.productId, products]);

  const validate = () => {
    const newErrors = tankFuelConnectionService.validateTankFuelConnection(formData);
    
    // Additional validation for tank capacity
    if (selectedTank && selectedTank.currentVolume !== undefined && selectedTank.capacity !== undefined) {
      if (selectedTank.currentVolume > selectedTank.capacity) {
        newErrors.tankId = 'Tank current volume cannot exceed capacity';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const connectionData = tankFuelConnectionService.mapFormToConnection(formData);
      
      const response = await tankFuelConnectionService.createTankFuelConnection(connectionData);

      if (response.data) {
        setSuccessMessage('Tank-Fuel connection created successfully!');
        
        // Wait a moment before closing to show success message
        setTimeout(() => {
          onConnectionCreated(); // Refetch connections
          onClose();
        }, 1500);
      } else {
        setErrors({ general: response.message || 'Failed to create connection' });
      }
    } catch (error) {
      console.error('Failed to create tank-fuel connection:', error);
      const errorMessage = error.message || 'Failed to create tank-fuel connection';
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
    
    // Clear error when user provides input
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }

    // Clear dependent fields when station changes
    if (field === 'stationId') {
      setFormData(prev => ({
        ...prev,
        tankId: '',
        assetId: ''
      }));
    }
  };

  // Filter products by type (FUEL only)
  const fuelProducts = products.filter(product => 
    product.type === 'FUEL' || !product.type // Include if type is not specified
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Tank-Fuel Connection"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 mb-4 text-green-700 bg-green-100 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Station Selection */}
          <Select
            label="Station"
            value={formData.stationId}
            onChange={(e) => handleInputChange('stationId', e.target.value)}
            options={stations.map(station => ({
              value: station.id,
              label: station.name
            }))}
            required
            error={errors.stationId}
            isLoading={isLoading.stations}
            placeholder="Select station"
          />

          {/* Tank Selection */}
          <Select
            label="Tank"
            value={formData.tankId}
            onChange={(e) => handleInputChange('tankId', e.target.value)}
            options={tanks.map(tank => ({
              value: tank.id,
              label: tank.asset?.name || `Tank ${tank.id.slice(-4)}`
            }))}
            required
            error={errors.tankId}
            isLoading={isLoading.tanks}
            placeholder="Select tank"
            disabled={!formData.stationId}
          />

          {/* Fuel Product Selection */}
          <Select
            label="Fuel Product"
            value={formData.productId}
            onChange={(e) => handleInputChange('productId', e.target.value)}
            options={fuelProducts.map(product => ({
              value: product.id,
              label: `${product.name} (${product.fuelCode || 'No Code'})`
            }))}
            required
            error={errors.productId}
            isLoading={isLoading.products}
            placeholder="Select fuel product"
          />

          {/* Asset (Pump) Selection */}
          <Select
            label="Connected Asset (Pump)"
            value={formData.assetId}
            onChange={(e) => handleInputChange('assetId', e.target.value)}
            options={assets.map(asset => ({
              value: asset.id,
              label: asset.name || `Asset ${asset.id.slice(-4)}`
            }))}
            error={errors.assetId}
            isLoading={isLoading.assets}
            placeholder="Select pump (optional)"
            disabled={!formData.stationId}
          />
        </div>

        {/* Tank Capacity Information */}
        {selectedTank && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Tank className="w-4 h-4" />
              Selected Tank Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Capacity:</span>
                <div className="text-blue-900">{selectedTank.capacity?.toLocaleString() || 'N/A'} L</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Current Volume:</span>
                <div className="text-blue-900">{selectedTank.currentVolume?.toLocaleString() || '0'} L</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Available:</span>
                <div className="text-blue-900">
                  {selectedTank.capacity && selectedTank.currentVolume !== undefined 
                    ? (selectedTank.capacity - selectedTank.currentVolume).toLocaleString() 
                    : 'N/A'} L
                </div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Utilization:</span>
                <div className="text-blue-900">
                  {selectedTank.capacity && selectedTank.currentVolume !== undefined 
                    ? ((selectedTank.currentVolume / selectedTank.capacity) * 100).toFixed(1) 
                    : '0'}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Information */}
        {selectedProduct && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Selected Fuel Product
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-600 font-medium">Product:</span>
                <div className="text-green-900">{selectedProduct.name}</div>
              </div>
              <div>
                <span className="text-green-600 font-medium">Fuel Code:</span>
                <div className="text-green-900">{selectedProduct.fuelCode || 'N/A'}</div>
              </div>
              <div>
                <span className="text-green-600 font-medium">Density:</span>
                <div className="text-green-900">
                  {selectedProduct.density ? `${selectedProduct.density} kg/L` : 'N/A'}
                </div>
              </div>
              {selectedProduct.octaneRating && (
                <div>
                  <span className="text-green-600 font-medium">Octane:</span>
                  <div className="text-green-900">RON {selectedProduct.octaneRating}</div>
                </div>
              )}
              {selectedProduct.fuelSubType && (
                <div className="md:col-span-2">
                  <span className="text-green-600 font-medium">Category:</span>
                  <div className="text-green-900">
                    {selectedProduct.fuelSubType.category?.name} → {selectedProduct.fuelSubType.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Summary */}
        {selectedTank && selectedProduct && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Connection Summary
            </h4>
            <div className="text-sm text-purple-800">
              Connecting <strong>{selectedProduct.name}</strong> to{' '}
              <strong>{selectedTank.asset?.name || 'Selected Tank'}</strong>
              {formData.assetId && assets.find(a => a.id === formData.assetId) && (
                <> via <strong>{assets.find(a => a.id === formData.assetId).name}</strong></>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="cosmic"
            icon={Link2}
            loading={isSubmitting}
            disabled={isSubmitting || !formData.stationId || !formData.tankId || !formData.productId}
          >
            {isSubmitting ? 'Creating Connection...' : 'Create Connection'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateTankFuelConnectionModal;