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
      message: shiftData.status === 'OPEN' ? 'Shift is open and ready for closing' : 'Shift is not open'
    },
    {
      id: 'openingChecks',
      label: 'Opening Checks Passed',
      status: shiftOpeningCheck?.checksPassed || false,
      message: shiftOpeningCheck?.checksPassed ? 'All opening checks passed' : 'Opening checks not completed'
    },
    {
      id: 'pumpReadings',
      label: 'Opening Pump Readings',
      status: meterReadings.length > 0,
      message: `${meterReadings.length} pump START readings recorded`
    },
    {
      id: 'tankReadings', 
      label: 'Opening Tank Readings',
      status: dipReadings.length > 0,
      message: `${dipReadings.length} tank START readings recorded`
    },
    {
      id: 'islandAssignments',
      label: 'Island Assignments',
      status: shiftIslandAttedant.length > 0,
      message: `${shiftIslandAttedant.length} islands with attendants assigned`
    }
  ];

  const allChecksPassed = validationChecks.every(check => check.status);

  return (
    <div className="space-y-6">
      <Alert variant={allChecksPassed ? "success" : "warning"}>
        <div className="flex items-center gap-3">
          {allChecksPassed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <div>
            <h4 className="font-semibold">
              {allChecksPassed ? 'Ready to Close Shift' : 'Shift Closing Requirements'}
            </h4>
            <p>
              {allChecksPassed 
                ? 'All pre-closing checks passed. You can proceed with closing the shift.'
                : 'Some requirements need attention before closing the shift.'
              }
            </p>
          </div>
        </div>
      </Alert>

      {/* Validation Checks */}
      <Card title="Pre-Closing Validation" className="p-6">
        <div className="space-y-4">
          {validationChecks.map(check => (
            <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {check.status ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{check.label}</p>
                  <p className="text-sm text-gray-600">{check.message}</p>
                </div>
              </div>
              <Badge variant={check.status ? "success" : "error"}>
                {check.status ? "PASS" : "FAIL"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Opening Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Pumps</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{meterReadings.length}</p>
          <p className="text-sm text-gray-600">START readings recorded</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-orange-600" />
            <span className="font-semibold">Tanks</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{dipReadings.length}</p>
          <p className="text-sm text-gray-600">START dips recorded</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-600" />
            <span className="font-semibold">Islands</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{shiftIslandAttedant.length}</p>
          <p className="text-sm text-gray-600">With attendants</p>
        </Card>
      </div>

      {/* Island Assignments Table */}
      <Card title="Island Assignments" className="p-6">
        <Table>
          <thead>
            <tr>
              <th>Island</th>
              <th>Attendant</th>
              <th>Assignment</th>
              <th>Pumps</th>
            </tr>
          </thead>
          <tbody>
            {shiftIslandAttedant.map(assignment => {
              const islandPumps = meterReadings.filter(reading => 
                reading.pump?.islandId === assignment.islandId
              );
              
              return (
                <tr key={assignment.islandId}>
                  <td className="font-medium">
                    {assignment.island.name} ({assignment.island.code})
                  </td>
                  <td>
                    {assignment.attendant.firstName} {assignment.attendant.lastName}
                  </td>
                  <td>
                    <Badge variant="success">{assignment.assignmentType}</Badge>
                  </td>
                  <td>{islandPumps.length} pumps</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {!allChecksPassed && (
        <Alert variant="error">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-semibold">Cannot Proceed</p>
              <p>Please ensure all opening requirements are met before closing the shift.</p>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default PreClosingValidationStep;