import React, { useState } from 'react';
import { Button, Alert } from '../../../ui';
import { Fuel, Edit } from 'lucide-react';

const EditAssetModal = ({ asset, onSave, onClose, userRole }) => {
  const [formData, setFormData] = useState({
    name: asset.name || '',
    stationLabel: asset.stationLabel || '',
    status: asset.status || 'REGISTERED'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine which fields the user can edit based on role
  const canEditName = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(userRole);
  const canEditStatus = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER'].includes(userRole);
  const canEditStationLabel = asset.stationId && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LINES_MANAGER', 'STATION_MANAGER', 'SUPERVISOR'].includes(userRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare update data based on permissions
      const updateData = {};
      
      if (canEditName) updateData.name = formData.name;
      if (canEditStatus) updateData.status = formData.status;
      if (canEditStationLabel) updateData.stationLabel = formData.stationLabel;

      await onSave(asset.id, updateData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Edit Asset</h2>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            {canEditName && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {canEditStationLabel && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Label
                  <span className="text-xs text-gray-500 ml-2">
                    (Local name for this station)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.stationLabel}
                  onChange={(e) => setFormData(prev => ({ ...prev, stationLabel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`e.g., ${asset.name}#shell@${asset.station?.name?.toLowerCase()}`}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This label will be used within this station only
                </p>
              </div>
            )}

            {!canEditStationLabel && asset.stationId && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">
                  Station label can only be edited when asset is assigned to a station
                </p>
              </div>
            )}

            {canEditStatus && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="REGISTERED">Registered</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            )}

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
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;