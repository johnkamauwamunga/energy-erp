// components/ShiftClosingWizard.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Stepper, Alert, LoadingSpinner } from '../../../../ui';
import { CheckCircle, FileText, Zap, Fuel, DollarSign, ArrowLeft, ArrowRight } from 'lucide-react';

// Import steps
import PreClosingValidationStep from './PreClosingValidationStep';
import IslandPumpsStep from './IslandPumpsStep';
import TanksStep from './TanksStep';
import CollectionsStep from './CollectionsStep';
import ClosingSummaryStep from './ClosingSummaryStep';

import { useApp } from '../../../../../context/AppContext';
import { useShiftAssets } from './hooks/useShiftAssets';

const ShiftClosingWizard = ({ shiftId, onSuccess, onCancel }) => {
    const { state } = useApp();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentStation = state.currentStation?.id;
    const currentUser = state.currentUser;

    // Single hook that handles everything!
    const {
        // Data
        currentShift,
        pumpsWithIslandInfo,
        tanksWithReadings,
        expectedCollectionsByIsland,
        enhancedShiftOpeningCheck,
        loading: assetsLoading,
        error: assetsError,
        
        // Closing functions
        submitShiftClosing,
        getClosingPayloadSummary,
        validateShiftClosingPayload,
        buildShiftClosingPayload
    } = useShiftAssets(currentStation);

    // Closing form data state
    const [closingData, setClosingData] = useState({
        shiftId: shiftId,
        recordedById: currentUser?.id,
        endTime: new Date().toISOString().slice(0, 16),
        pumpReadings: [],
        tankReadings: [],
        islandCollections: {}
    });

    const steps = [
        { number: 1, title: 'Pre-Closing Check', icon: FileText },
        { number: 2, title: 'Island Pumps', icon: Zap },
        { number: 3, title: 'Tank Dips', icon: Fuel },
        { number: 4, title: 'Collections', icon: DollarSign },
        { number: 5, title: 'Review & Close', icon: CheckCircle }
    ];

    // Initialize closing data with current shift data
    useEffect(() => {
        if (currentShift) {
            const openingPumpReadings = currentShift.meterReadings || [];
            const openingTankReadings = currentShift.dipReadings || [];
            
            setClosingData(prev => ({
                ...prev,
                pumpReadings: openingPumpReadings.map(reading => ({
                    pumpId: reading.pumpId,
                    openingElectric: reading.electricMeter,
                    openingManual: reading.manualMeter,
                    openingCash: reading.cashMeter,
                    electricMeter: 0,
                    manualMeter: 0,
                    cashMeter: 0,
                    litersDispensed: 0,
                    salesValue: 0,
                    unitPrice: 150.0
                })),
                tankReadings: openingTankReadings.map(reading => ({
                    tankId: reading.tankId,
                    openingDip: reading.dipValue,
                    openingVolume: reading.volume,
                    dipValue: 0,
                    volume: 0,
                    temperature: 25.0,
                    waterLevel: 0.0,
                    density: 0.85
                }))
            }));
        }
    }, [currentShift]);

    const handleNext = () => {
        setError(null);
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const updateClosingData = (updates) => {
        setClosingData(prev => ({ ...prev, ...updates }));
    };

    const handleCloseShift = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Everything handled by the hook!
            const result = await submitShiftClosing(closingData, currentUser);
            onSuccess?.(result);
            
        } catch (error) {
            setError(error.message || 'Failed to close shift');
        } finally {
            setIsLoading(false);
        }
    };

    // Get payload for summary step
    const closingPayload = buildShiftClosingPayload?.(closingData, currentUser);
    const payloadSummary = getClosingPayloadSummary?.(closingData, currentUser);
    const validation = validateShiftClosingPayload?.(closingPayload) || { isValid: false, errors: [] };

    const renderStepContent = () => {
        if (assetsLoading) return <LoadingSpinner />;

        switch (currentStep) {
            case 1:
                return (
                    <PreClosingValidationStep 
                        currentShift={currentShift}
                        enhancedShiftOpeningCheck={enhancedShiftOpeningCheck}
                        closingData={closingData}
                    />
                );
            case 2:
                return (
                    <IslandPumpsStep 
                        pumpsWithIslandInfo={pumpsWithIslandInfo}
                        expectedCollectionsByIsland={expectedCollectionsByIsland}
                        closingData={closingData}
                        onChange={updateClosingData}
                    />
                );
            case 3:
                return (
                    <TanksStep 
                        tanksWithReadings={tanksWithReadings}
                        closingData={closingData}
                        onChange={updateClosingData}
                    />
                );
            case 4:
                return (
                    <CollectionsStep 
                        closingData={closingData}
                        onChange={updateClosingData}
                    />
                );
            case 5:
                return (
                    <ClosingSummaryStep 
                        closingData={closingData}
                        closingPayload={closingPayload}
                        payloadSummary={payloadSummary}
                        validation={validation}
                    />
                );
            default:
                return null;
        }
    };

    if (assetsLoading && !currentShift) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingSpinner />
            </div>
        );
    }

    if (assetsError) {
        return (
            <Alert variant="error">
                Failed to load shift data: {assetsError}
            </Alert>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Card title={`Close Shift #${currentShift?.shiftNumber}`} className="mb-6">
                {/* Stepper */}
                <div className="mb-8">
                    <Stepper steps={steps} currentStep={currentStep} />
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="error" className="mb-4">
                        {error}
                    </Alert>
                )}

                {/* Step Content */}
                <div className="min-h-[500px]">
                    {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                    <div>
                        {currentStep > 1 && (
                            <Button 
                                variant="secondary" 
                                onClick={handleBack}
                                icon={ArrowLeft}
                            >
                                Back
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        
                        {currentStep < steps.length ? (
                            <Button 
                                variant="cosmic" 
                                onClick={handleNext}
                                icon={ArrowRight}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button 
                                variant="cosmic" 
                                onClick={handleCloseShift}
                                loading={isLoading}
                                disabled={!validation.isValid}
                                icon={CheckCircle}
                            >
                                Close Shift
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ShiftClosingWizard;