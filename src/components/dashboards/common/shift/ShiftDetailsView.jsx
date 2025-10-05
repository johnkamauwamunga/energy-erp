// components/shifts/ShiftDetailsView.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Card, Button, Tabs, Badge, Alert } from '../../../ui';
import { 
  User, Clock, DollarSign, Droplets, Zap, 
  CreditCard, Package, Calendar, TrendingUp 
} from 'lucide-react';
import { shiftService } from '../../../../services/shiftService/shiftService';

const ShiftDetailsView = ({ shift, isOpen, onClose, onCloseShift }) => {
  const [shiftDetails, setShiftDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && shift) {
      loadShiftDetails();
    }
  }, [isOpen, shift]);

  const loadShiftDetails = async () => {
    setLoading(true);
    try {
      const details = await shiftService.getShiftById(shift.id);
      setShiftDetails(details);
    } catch (error) {
      console.error('Failed to load shift details:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'readings', label: 'Meter Readings', icon: Zap },
    { id: 'collections', label: 'Collections', icon: CreditCard },
    { id: 'attendants', label: 'Attendants', icon: User }
  ];

  const calculateShiftDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end - start;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  if (!shift) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Shift ${shift.shiftNumber} Details`}
      size="4xl"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Supervisor</div>
              <div className="font-medium">{shift.supervisor?.firstName} {shift.supervisor?.lastName}</div>
            </div>
            <div>
              <div className="text-gray-600">Start Time</div>
              <div className="font-medium">{new Date(shift.startTime).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Duration</div>
              <div className="font-medium">
                {calculateShiftDuration(shift.startTime, shift.endTime).hours}h 
                {calculateShiftDuration(shift.startTime, shift.endTime).minutes}m
              </div>
            </div>
            <div>
              <div className="text-gray-600">Status</div>
              <Badge variant={shift.status === 'OPEN' ? 'success' : 'gray'}>
                {shift.status}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading shift details...</p>
          </div>
        )}

        {/* Tab Content */}
        {!loading && shiftDetails && (
          <div className="min-h-96">
            {activeTab === 'overview' && <OverviewTab shift={shiftDetails} />}
            {activeTab === 'readings' && <ReadingsTab shift={shiftDetails} />}
            {activeTab === 'collections' && <CollectionsTab shift={shiftDetails} />}
            {activeTab === 'attendants' && <AttendantsTab shift={shiftDetails} />}
          </div>
        )}

        {/* Action Buttons */}
        {shift.status === 'OPEN' && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="secondary" onClick={onClose}>
              Close View
            </Button>
            <Button
              variant="danger"
              onClick={() => onCloseShift(shift)}
            >
              Close Shift
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Tab Components
const OverviewTab = ({ shift }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card title="Shift Summary" className="p-4">
      <div className="space-y-3 text-sm">
        <InfoRow label="Shift Number" value={shift.shiftNumber} />
        <InfoRow label="Supervisor" value={`${shift.supervisor?.firstName} ${shift.supervisor?.lastName}`} />
        <InfoRow label="Start Time" value={new Date(shift.startTime).toLocaleString()} />
        <InfoRow label="End Time" value={shift.endTime ? new Date(shift.endTime).toLocaleString() : 'Still Open'} />
        <InfoRow label="Status" value={shift.status} />
      </div>
    </Card>

    <Card title="Performance Metrics" className="p-4">
      <div className="space-y-3 text-sm">
        <InfoRow label="Total Sales" value="$12,450.00" />
        <InfoRow label="Fuel Volume" value="8,250 L" />
        <InfoRow label="Transactions" value="342" />
        <InfoRow label="Average Sale" value="$36.40" />
      </div>
    </Card>
  </div>
);

const ReadingsTab = ({ shift }) => (
  <Card title="Meter Readings" className="p-4">
    <div className="space-y-4">
      {/* Pump Readings */}
      <div>
        <h4 className="font-medium mb-3">Pump Meter Readings</h4>
        <div className="space-y-2">
          {shift.pumpMeterReadings?.map(reading => (
            <div key={reading.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Pump {reading.pumpId}</div>
                <div className="text-sm text-gray-600">
                  Electric: {reading.electricMeter}L | Cash: {reading.cashMeter}L
                </div>
              </div>
              <Badge variant="outline">{reading.readingType}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Tank Readings */}
      <div>
        <h4 className="font-medium mb-3">Tank Dip Readings</h4>
        <div className="space-y-2">
          {shift.tankDipReadings?.map(reading => (
            <div key={reading.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Tank {reading.tankId}</div>
                <div className="text-sm text-gray-600">
                  Dip: {reading.dipValue} | Volume: {reading.volume}L
                </div>
              </div>
              <Badge variant="outline">{reading.readingType}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Card>
);

const CollectionsTab = ({ shift }) => (
  <Card title="Collections" className="p-4">
    <div className="space-y-4">
      {/* Island Collections */}
      <div>
        <h4 className="font-medium mb-3">Island Collections</h4>
        <div className="space-y-2">
          {shift.islandCollections?.map(collection => (
            <div key={collection.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium mb-2">Island {collection.islandId}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>Cash: ${collection.cashAmount}</div>
                <div>Card: ${collection.cardAmount}</div>
                <div>Mobile: ${collection.mobileAmount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Card>
);

const AttendantsTab = ({ shift }) => (
  <Card title="Assigned Attendants" className="p-4">
    <div className="space-y-3">
      {shift.shiftIslandAttedant?.map(assignment => (
        <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">
              {assignment.attendant?.firstName} {assignment.attendant?.lastName}
            </div>
            <div className="text-sm text-gray-600">
              Island {assignment.islandId} • {assignment.attendant?.position}
            </div>
          </div>
          <Badge variant="outline">Active</Badge>
        </div>
      ))}
    </div>
  </Card>
);

// Supporting Component
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default ShiftDetailsView;