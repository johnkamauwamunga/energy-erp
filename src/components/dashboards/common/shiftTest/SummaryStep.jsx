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
    <div className="space-y-4">
      {/* Compact Success Alert */}
      <Alert variant="success" className="text-sm" size="sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <div>
            <p className="font-medium">Ready to Create Shift</p>
            <p>Review all information before creating the shift.</p>
          </div>
        </div>
      </Alert>

      {/* Basic Information - Compact */}
      <Card className="p-4">
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shift Number</label>
            <p className="font-semibold text-lg">{data.shiftNumber}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
            <p className="font-semibold text-sm">
              {new Date(data.startTime).toLocaleDateString()} {new Date(data.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supervisor</label>
            <p className="font-semibold text-sm truncate">{getSupervisorName()}</p>
          </div>
        </div>
      </Card>

      {/* Island Assignments - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm">Island Assignments</span>
        </div>

        {Object.keys(assignmentsByIsland).length === 0 ? (
          <Alert variant="warning" className="text-sm" size="sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              <span>No attendants assigned to islands</span>
            </div>
          </Alert>
        ) : (
          <div className="space-y-3">
            {Object.entries(assignmentsByIsland).map(([islandId, assignments]) => (
              <div key={islandId} className="border rounded p-3 text-sm">
                <h5 className="font-semibold mb-2">{getIslandName(islandId)}</h5>
                <div className="flex flex-wrap gap-1">
                  {assignments.map((assignment, index) => (
                    <Badge key={index} variant="success" size="sm" className="text-xs">
                      <User className="w-2 h-2 mr-1" />
                      {getUserName(assignment.attendantId)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pump Readings - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-sm">
            Pump Readings ({data.pumpReadings.length})
          </span>
        </div>

        {data.pumpReadings.length === 0 ? (
          <Alert variant="warning" className="text-sm" size="sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              <span>No pump readings</span>
            </div>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table size="sm">
              <thead>
                <tr>
                  <th className="text-xs">Pump</th>
                  <th className="text-xs">Electric</th>
                  <th className="text-xs">Manual</th>
                  <th className="text-xs">Cash</th>
                  <th className="text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {data.pumpReadings.map((reading, index) => (
                  <tr key={index}>
                    <td className="font-medium truncate max-w-20">{getPumpName(reading.pumpId)}</td>
                    <td>{reading.electricMeter.toLocaleString()}</td>
                    <td>{reading.manualMeter.toLocaleString()}</td>
                    <td>{reading.cashMeter.toLocaleString()}</td>
                    <td>
                      <Badge variant="success" size="sm">✓</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Tank Readings - Compact */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fuel className="w-4 h-4 text-orange-600" />
          <span className="font-semibold text-sm">
            Tank Readings ({data.tankReadings.length})
          </span>
        </div>

        {data.tankReadings.length === 0 ? (
          <Alert variant="warning" className="text-sm" size="sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              <span>No tank readings</span>
            </div>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table size="sm">
              <thead>
                <tr>
                  <th className="text-xs">Tank</th>
                  <th className="text-xs">Dip</th>
                  <th className="text-xs">Volume</th>
                  <th className="text-xs">Temp</th>
                  <th className="text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {data.tankReadings.map((reading, index) => (
                  <tr key={index}>
                    <td className="font-medium truncate max-w-20">{getTankName(reading.tankId)}</td>
                    <td>{reading.dipValue}m</td>
                    <td>{reading.volume.toLocaleString()}L</td>
                    <td>{reading.temperature}°C</td>
                    <td>
                      <Badge variant="success" size="sm">✓</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Compact Final Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border">
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="text-xl font-bold text-green-600">
              {data.shiftNumber}
            </div>
            <div className="text-xs text-gray-600">Shift</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600">
              {new Set(data.islandAssignments.map(a => a.islandId)).size}
            </div>
            <div className="text-xs text-gray-600">Islands</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">
              {data.pumpReadings.length}
            </div>
            <div className="text-xs text-gray-600">Pumps</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-600">
              {data.tankReadings.length}
            </div>
            <div className="text-xs text-gray-600">Tanks</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;