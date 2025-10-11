// components/PreClosingValidationStep.js
import React from 'react';
import { Card, Alert, Badge } from '../../../../ui';
import { CheckCircle, AlertTriangle, Clock, FileText, Zap, Fuel } from 'lucide-react';

const PreClosingValidationStep = ({ currentShift, enhancedShiftOpeningCheck, closingData }) => {
    const getValidationStatus = () => {
        const issues = [];
        const warnings = [];

        // Check if shift has opening readings
        if (!currentShift?.meterReadings?.length) {
            issues.push('No opening pump meter readings found');
        }

        if (!currentShift?.dipReadings?.length) {
            issues.push('No opening tank dip readings found');
        }

        // Check shift timing
        const shiftStart = new Date(currentShift?.startTime);
        const now = new Date();
        const shiftDuration = (now - shiftStart) / (1000 * 60 * 60); // hours

        if (shiftDuration < 1) {
            warnings.push('Shift duration is less than 1 hour');
        }

        if (shiftDuration > 24) {
            warnings.push('Shift duration exceeds 24 hours');
        }

        return { issues, warnings, isValid: issues.length === 0 };
    };

    const { issues, warnings, isValid } = getValidationStatus();

    return (
        <div className="space-y-4">
            {/* Shift Information */}
            <Card title="Shift Information" className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Shift Number</p>
                        <p className="font-semibold">{currentShift?.shiftNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge variant="success" size="sm">OPEN</Badge>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Start Time</p>
                        <p className="font-semibold">
                            {currentShift?.startTime ? new Date(currentShift.startTime).toLocaleString() : 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold">
                            {currentShift?.startTime ? 
                                `${Math.round((new Date() - new Date(currentShift.startTime)) / (1000 * 60 * 60))} hours` : 
                                'N/A'
                            }
                        </p>
                    </div>
                </div>
            </Card>

            {/* Validation Results */}
            {isValid ? (
                <Alert variant="success">
                    <CheckCircle className="w-4 h-4" />
                    <div>
                        <p className="font-medium">Pre-closing validation passed</p>
                        <p>All required opening readings are available. You can proceed to close the shift.</p>
                    </div>
                </Alert>
            ) : (
                <Alert variant="error">
                    <AlertTriangle className="w-4 h-4" />
                    <div>
                        <p className="font-medium">Pre-closing validation failed</p>
                        <p>Please ensure all opening readings are completed before proceeding.</p>
                    </div>
                </Alert>
            )}

            {/* Opening Readings Summary */}
            <Card title="Opening Readings Summary" className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="font-medium">Pump Readings</p>
                            <p className="text-sm text-gray-600">
                                {currentShift?.meterReadings?.length || 0} pumps with opening readings
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Fuel className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="font-medium">Tank Readings</p>
                            <p className="text-sm text-gray-600">
                                {currentShift?.dipReadings?.length || 0} tanks with opening dip readings
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Issues & Warnings */}
            {(issues.length > 0 || warnings.length > 0) && (
                <Card title="Validation Details" className="p-4">
                    {issues.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Critical Issues ({issues.length})
                            </h4>
                            <ul className="list-disc list-inside text-sm text-red-600">
                                {issues.map((issue, index) => (
                                    <li key={index}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {warnings.length > 0 && (
                        <div>
                            <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Warnings ({warnings.length})
                            </h4>
                            <ul className="list-disc list-inside text-sm text-orange-600">
                                {warnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
            )}

            {/* Shift Opening Check */}
            {enhancedShiftOpeningCheck && (
                <Card title="Shift Opening Verification" className="p-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Opening Cash Float</span>
                            <span className="font-semibold">
                                KES {enhancedShiftOpeningCheck.cashFloat?.toFixed(2) || '0.00'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Price List</span>
                            <span className="font-semibold">
                                {enhancedShiftOpeningCheck.priceList?.name || 'Not set'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Verified By</span>
                            <span className="font-semibold">
                                {enhancedShiftOpeningCheck.verifiedBy || 'Not recorded'}
                            </span>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PreClosingValidationStep;