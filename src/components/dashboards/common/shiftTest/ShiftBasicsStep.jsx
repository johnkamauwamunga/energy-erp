import React, { useState, useEffect } from 'react';
import { Input, Select, DatePicker as DateTimePicker, Alert } from '../../../ui';
import { Calendar, Clock, Hash, CheckCircle, XCircle } from 'lucide-react';
import { dummyData, mockServices, dummyDataHelpers } from './dummyData';

const ShiftBasicsStep = ({ data, onChange }) => {
  const { shiftNumber, startTime, priceListId } = data;
  const [shiftNumberValid, setShiftNumberValid] = useState(null);
  const [checkingShiftNumber, setCheckingShiftNumber] = useState(false);

  // Auto-check shift number when it changes
  useEffect(() => {
    const checkShiftNumber = async () => {
      if (shiftNumber && shiftNumber !== dummyDataHelpers.getNextShiftNumber().toString()) {
        setCheckingShiftNumber(true);
        try {
          const result = await mockServices.shiftService.checkShiftNumber(shiftNumber);
          setShiftNumberValid(!result.exists);
        } catch (error) {
          setShiftNumberValid(false);
        } finally {
          setCheckingShiftNumber(false);
        }
      } else {
        setShiftNumberValid(null);
      }
    };

    const timeoutId = setTimeout(checkShiftNumber, 500);
    return () => clearTimeout(timeoutId);
  }, [shiftNumber]);

  const priceLists = dummyData.priceLists.map(pl => ({ 
    value: pl.id, 
    label: pl.name,
    disabled: !pl.isActive 
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shift Number */}
        <div>
          <Input
            label="Shift Number"
            value={shiftNumber}
            onChange={(e) => onChange({ shiftNumber: e.target.value })}
            icon={Hash}
            required
            type="number"
            placeholder="Enter shift number..."
          />
          {shiftNumberValid !== null && (
            <div className={`flex items-center gap-2 mt-2 text-sm ${
              shiftNumberValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {checkingShiftNumber ? (
                <>Checking availability...</>
              ) : shiftNumberValid ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Shift number available
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Shift number already exists
                </>
              )}
            </div>
          )}
        </div>

        {/* Start Time */}
        <DateTimePicker
          label="Shift Start Time"
          value={startTime}
          onChange={(value) => onChange({ startTime: value })}
          icon={Clock}
          required
        />

        {/* Price List */}
        <div className="md:col-span-2">
          <Select
            label="Price List"
            value={priceListId}
            onChange={(value) => onChange({ priceListId: value })}
            options={priceLists}
            icon={Calendar}
            required
          />
        </div>
      </div>

      <Alert variant="info">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Shift Information</h4>
            <p className="text-sm">
              Create a new shift by selecting the shift number, start time, and applicable price list.
              The shift will be created in a pending state until you complete the setup process.
            </p>
          </div>
        </div>
      </Alert>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-900">Next Shift Number</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {dummyDataHelpers.getNextShiftNumber()}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-900">Current Date</span>
          </div>
          <p className="text-sm text-green-700">
            {new Date().toLocaleDateString()}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-purple-900">Active Price List</span>
          </div>
          <p className="text-sm text-purple-700">
            {dummyData.station.activePriceList?.name || 'None'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShiftBasicsStep;