import React, { useState } from 'react';
import { Button, Alert } from '../../../ui';
import { Fuel } from 'lucide-react';

const EditTankFuelModal = ({ tank, fuelProducts, onSave, onClose }) => {
  const [selectedProductId, setSelectedProductId] = useState(tank.tank?.product?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProductId) {
      setError('Please select a fuel product');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare update data for tank fuel product
      const updateData = {
        tank: {
          ...tank.tank, // Keep existing tank properties
          productId: selectedProductId
        }
      };

      await onSave(tank.id, updateData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update fuel product');
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = fuelProducts.find(product => product.id === selectedProductId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Fuel className="w-5 h-5 mr-2 text-orange-500" />
            Edit Tank Fuel Product
          </h2>
          
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tank:</strong> {tank.name}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Current Product:</strong> {tank.tank?.product?.name || 'None'}
            </p>
            {tank.tank?.capacity && (
              <p className="text-sm text-blue-800">
                <strong>Capacity:</strong> {tank.tank.capacity}L
              </p>
            )}
          </div>
          
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Fuel Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a fuel product...</option>
                {fuelProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.description ? `- ${product.description}` : ''}
                  </option>
                ))}
              </select>
              
              {selectedProduct && (
                <div className="mt-2 p-2 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Selected:</strong> {selectedProduct.name}
                    {selectedProduct.description && ` - ${selectedProduct.description}`}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Type: {selectedProduct.type} | Unit: {selectedProduct.unit}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedProductId}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading ? 'Updating...' : 'Update Fuel'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTankFuelModal;