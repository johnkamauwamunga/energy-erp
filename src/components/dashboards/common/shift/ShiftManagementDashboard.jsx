// components/shifts/ShiftManagementDashboard.jsx
import React, { useState } from 'react';
import { Card, Button } from '../../../ui';
import { Plus, RefreshCw, BarChart3 } from 'lucide-react';
import ShiftManagementTable from './ShiftManagementTable';
import ShiftOpeningForm from './ShiftOpeningForm';
import ShiftDetailsView from './ShiftDetailsView';
import ShiftClosingFlow from './ShiftClosingFlow';

const ShiftManagementDashboard = () => {
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewShift = (shift) => {
    setSelectedShift(shift);
    setShowDetails(true);
  };

  const handleCloseShift = (shift) => {
    setSelectedShift(shift);
    setShowClosing(true);
  };

  const handleOpenShift = (shift) => {
    setSelectedShift(shift);
    // Logic to open shift
  };

  const handleShiftOpened = (newShift) => {
    setShowOpenForm(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleShiftClosed = (closedShift) => {
    setShowClosing(false);
    setShowDetails(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600">Manage fuel station shifts, attendants, and operations</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => setRefreshKey(prev => prev + 1)}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            icon={BarChart3}
          >
            Reports
          </Button>
          <Button
            icon={Plus}
            onClick={() => setShowOpenForm(true)}
          >
            Open New Shift
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ShiftManagementTable
        key={refreshKey}
        onViewShift={handleViewShift}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
      />

      {/* Modals */}
      <ShiftOpeningForm
        isOpen={showOpenForm}
        onClose={() => setShowOpenForm(false)}
        onShiftOpened={handleShiftOpened}
      />

      <ShiftDetailsView
        shift={selectedShift}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onCloseShift={handleCloseShift}
      />

      <ShiftClosingFlow
        shift={selectedShift}
        isOpen={showClosing}
        onClose={() => setShowClosing(false)}
        onShiftClosed={handleShiftClosed}
      />
    </div>
  );
};

export default ShiftManagementDashboard;