// components/ClosingSummaryStep.js
import React from 'react';
import { Card, Badge, Alert } from '../../../../ui';
import { CheckCircle, AlertTriangle, DollarSign, Fuel, Zap, Package } from 'lucide-react';

const ClosingSummaryStep = ({ closingData, closingPayload, payloadSummary, validation }) => {
    if (!closingPayload) {
        return (
            <Alert variant="warning">
                <AlertTriangle className="w-4 h-4" />
                <div>
                    <p className="font-medium">No closing data available</p>
                    <p>Please complete the previous steps to generate closing summary.</p>
                </div>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            {/* Validation Status */}
            {validation.isValid ? (
                <Alert variant="success">
                    <CheckCircle className="w-4 h-4" />
                    <div>
                        <p className="font-medium">All checks passed!</p>
                        <p>Your shift closing data is ready to be submitted.</p>
                    </div>
                </Alert>
            ) : (
                <Alert variant="error">
                    <AlertTriangle className="w-4 h-4" />
                    <div>
                        <p className="font-medium">Validation Issues Found</p>
                        <ul className="list-disc list-inside mt-1">
                            {validation.errors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                            ))}
                        </ul>
                    </div>
                </Alert>
            )}

            {/* Payload Summary */}
            {payloadSummary && (
                <Card title="Closing Summary" className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Pumps</p>
                            <p className="text-xl font-bold">{payloadSummary.pumps}</p>
                        </div>
                        <div>
                            <Fuel className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Tanks</p>
                            <p className="text-xl font-bold">{payloadSummary.tanks}</p>
                        </div>
                        <div>
                            <Package className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Islands</p>
                            <p className="text-xl font-bold">{payloadSummary.islands}</p>
                        </div>
                        <div>
                            <DollarSign className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="text-xl font-bold">KES {payloadSummary.totalSales.toFixed(0)}</p>
                        </div>
                    </div>
                    
                    {/* Additional Summary Info */}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-600">Total Liters</p>
                            <p className="text-lg font-bold text-blue-600">
                                {payloadSummary.totalLiters.toFixed(1)}L
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Collections</p>
                            <p className="text-lg font-bold text-green-600">
                                KES {payloadSummary.totalCollections.toFixed(0)}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Raw Payload Preview */}
            <Card title="Payload Preview" className="p-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                    <pre className="text-xs overflow-auto max-h-64">
                        {JSON.stringify(closingPayload, null, 2)}
                    </pre>
                </div>
            </Card>
        </div>
    );
};

export default ClosingSummaryStep;