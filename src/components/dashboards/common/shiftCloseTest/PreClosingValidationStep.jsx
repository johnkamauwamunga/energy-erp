import React from 'react';
import { Card, Alert, Badge, Table } from '../../../ui';
import { CheckCircle, XCircle, Info, Zap, Fuel, Package } from 'lucide-react';

const PreClosingValidationStep = ({ shiftData, closingData }) => {
  const { shiftOpeningCheck, meterReadings, dipReadings, shiftIslandAttedant } = shiftData;

  const validationChecks = [
    {
      id: 'shiftStatus',
      label: 'Shift Status',
      status: shiftData.status === 'OPEN',
      message: shiftData.status === 'OPEN' ? 'Shift is open' : 'Shift not open'
    },
    {
      id: 'openingChecks',
      label: 'Opening Checks',
      status: shiftOpeningCheck?.checksPassed || false,
      message: shiftOpeningCheck?.checksPassed ? 'All checks passed' : 'Checks incomplete'
    },
    {
      id: 'pumpReadings',
      label: 'Pump Readings',
      status: meterReadings.length > 0,
      message: `${meterReadings.length} START readings`
    },
    {
      id: 'tankReadings', 
      label: 'Tank Readings',
      status: dipReadings.length > 0,
      message: `${dipReadings.length} START readings`
    },
    {
      id: 'islandAssignments',
      label: 'Island Assignments',
      status: shiftIslandAttedant.length > 0,
      message: `${shiftIslandAttedant.length} islands assigned`
    }
  ];

  const allChecksPassed = validationChecks.every(check => check.status);

  return (
    <div className="space-y-4">
      {/* Compact Alert */}
      <Alert variant={allChecksPassed ? "success" : "warning"} className="text-sm" size="sm">
        <div className="flex items-center gap-2">
          {allChecksPassed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <div>
            <p className="font-medium">
              {allChecksPassed ? 'Ready to Close Shift' : 'Shift Closing Requirements'}
            </p>
            <p>
              {allChecksPassed 
                ? 'All pre-closing checks passed. Proceed with closing.'
                : 'Some requirements need attention before closing.'
              }
            </p>
          </div>
        </div>
      </Alert>

      {/* Compact Validation Checks */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Pre-Closing Validation</h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2">
          {validationChecks.map(check => (
            <div key={check.id} className={`flex items-center gap-2 p-2 border rounded text-xs ${
              check.status ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              {check.status ? (
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{check.label}</p>
                <p className="text-gray-600 truncate">{check.message}</p>
              </div>
              <Badge variant={check.status ? "success" : "error"} size="sm" className="flex-shrink-0">
                {check.status ? "PASS" : "FAIL"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Compact Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-xs">Pumps</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{meterReadings.length}</p>
          <p className="text-xs text-gray-600">START</p>
        </div>

        <div className="bg-orange-50 p-3 rounded border border-orange-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Fuel className="w-3 h-3 text-orange-600" />
            <span className="font-semibold text-xs">Tanks</span>
          </div>
          <p className="text-lg font-bold text-orange-600">{dipReadings.length}</p>
          <p className="text-xs text-gray-600">START</p>
        </div>

        <div className="bg-green-50 p-3 rounded border border-green-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Package className="w-3 h-3 text-green-600" />
            <span className="font-semibold text-xs">Islands</span>
          </div>
          <p className="text-lg font-bold text-green-600">{shiftIslandAttedant.length}</p>
          <p className="text-xs text-gray-600">Assigned</p>
        </div>
      </div>

      {/* Compact Island Assignments Table */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Island Assignments</h3>
        <div className="overflow-x-auto">
          <Table size="sm">
            <thead>
              <tr>
                <th className="text-xs">Island</th>
                <th className="text-xs">Attendant</th>
                <th className="text-xs">Type</th>
                <th className="text-xs">Pumps</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {shiftIslandAttedant.map(assignment => {
                const islandPumps = meterReadings.filter(reading => 
                  reading.pump?.islandId === assignment.islandId
                );
                
                return (
                  <tr key={assignment.islandId}>
                    <td className="font-medium">
                      <div className="truncate max-w-20">
                        {assignment.island.name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {assignment.island.code}
                      </div>
                    </td>
                    <td>
                      <div className="truncate max-w-20">
                        {assignment.attendant.firstName} {assignment.attendant.lastName}
                      </div>
                    </td>
                    <td>
                      <Badge variant="success" size="sm" className="text-xs">
                        {assignment.assignmentType}
                      </Badge>
                    </td>
                    <td>{islandPumps.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>

      {!allChecksPassed && (
        <Alert variant="error" className="text-sm" size="sm">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Cannot Proceed</p>
              <p>Ensure all opening requirements are met before closing the shift.</p>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default PreClosingValidationStep;