import React from 'react';
import { Card, Badge, Table, Alert } from '../../../ui';
import { CheckCircle, AlertCircle, Package, Zap, Fuel, User } from 'lucide-react';
import { dummyData, dummyDataHelpers } from './dummyData';

const SummaryStep = ({ data }) => {
  const getIslandName = (islandId) => {
    const island = dummyData.stationAssets.assets.find(i => i.islandId === islandId);
    return island ? island.islandName : 'Unknown Island';
  };

  const getPumpName = (pumpId) => {
    for (let island of dummyData.stationAssets.assets) {
      const pump = island.pumps.find(p => p.pumpId === pumpId);
      if (pump) return pump.pumpName;
    }
    return 'Unknown Pump';
  };

  const getTankName = (tankId) => {
    const tank = dummyData.uniqueTanks.find(t => t.tankId === tankId);
    return tank ? tank.tankName : 'Unknown Tank';
  };

  const getUserName = (userId) => {
    const user = dummyDataHelpers.getUserById(userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const getSupervisorName = () => {
    return getUserName(data.supervisorId);
  };

  // Group island assignments by island
  const assignmentsByIsland = data.islandAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.islandId]) {
      acc[assignment.islandId] = [];
    }
    acc[assignment.islandId].push(assignment);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Alert variant="success">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <div>
            <h4 className="font-semibold">Ready to Create Shift</h4>
            <p>Review all the information below before creating the shift.</p>
          </div>
        </div>
      </Alert>

      {/* Basic Information */}
      <Card title="Shift Basic Information" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Number</label>
            <p className="text-lg font-semibold">{data.shiftNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <p className="text-lg font-semibold">
              {new Date(data.startTime).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
            <p className="text-lg font-semibold">{getSupervisorName()}</p>
          </div>
        </div>
      </Card>

      {/* Island Assignments */}
      <Card title="Island Assignments" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">Attendants per Island</span>
        </div>

        {Object.keys(assignmentsByIsland).length === 0 ? (
          <Alert variant="warning">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" />
              <span>No attendants assigned to islands</span>
            </div>
          </Alert>
        ) : (
          <div className="space-y-4">
            {Object.entries(assignmentsByIsland).map(([islandId, assignments]) => (
              <div key={islandId} className="border rounded-lg p-4">
                <h5 className="font-semibold text-lg mb-3">{getIslandName(islandId)}</h5>
                <div className="flex flex-wrap gap-2">
                  {assignments.map((assignment, index) => (
                    <Badge key={index} variant="success" className="text-sm">
                      <User className="w-3 h-3 mr-1" />
                      {getUserName(assignment.attendantId)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pump Readings */}
      <Card title="Pump Meter Readings" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-green-600" />
          <span className="font-semibold">
            Pump Configurations ({data.pumpReadings.length} pumps)
          </span>
        </div>

        {data.pumpReadings.length === 0 ? (
          <Alert variant="warning">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" />
              <span>No pump readings recorded</span>
            </div>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Pump</th>
                  <th>Electric Meter</th>
                  <th>Manual Meter</th>
                  <th>Cash Meter</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.pumpReadings.map((reading, index) => (
                  <tr key={index}>
                    <td className="font-medium">{getPumpName(reading.pumpId)}</td>
                    <td>{reading.electricMeter.toLocaleString()}</td>
                    <td>{reading.manualMeter.toLocaleString()}</td>
                    <td>{reading.cashMeter.toLocaleString()}</td>
                    <td>
                      <Badge variant="success">Recorded</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Tank Readings */}
      <Card title="Tank Dip Readings" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Fuel className="w-5 h-5 text-orange-600" />
          <span className="font-semibold">
            Tank Measurements ({data.tankReadings.length} tanks)
          </span>
        </div>

        {data.tankReadings.length === 0 ? (
          <Alert variant="warning">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" />
              <span>No tank readings recorded</span>
            </div>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Tank</th>
                  <th>Dip Value</th>
                  <th>Volume</th>
                  <th>Temperature</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.tankReadings.map((reading, index) => (
                  <tr key={index}>
                    <td className="font-medium">{getTankName(reading.tankId)}</td>
                    <td>{reading.dipValue}m</td>
                    <td>{reading.volume.toLocaleString()}L</td>
                    <td>{reading.temperature}°C</td>
                    <td>
                      <Badge variant="success">Recorded</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Final Summary */}
      <Card title="Final Summary" className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {data.shiftNumber}
            </div>
            <div className="text-sm text-gray-600">Shift Number</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(data.islandAssignments.map(a => a.islandId)).size}
            </div>
            <div className="text-sm text-gray-600">Islands</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {data.pumpReadings.length}
            </div>
            <div className="text-sm text-gray-600">Pumps</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {data.tankReadings.length}
            </div>
            <div className="text-sm text-gray-600">Tanks</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SummaryStep;