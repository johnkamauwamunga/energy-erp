import React, { useState, useEffect } from 'react';
import { Input, Select, DatePicker, Alert } from '../../../ui';
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

  const handleDateChange = (date) => {
    onChange({ startTime: date ? date.toISOString() : null });
  };

  const priceLists = dummyData.priceLists.map(pl => ({ 
    value: pl.id, 
    label: pl.name,
    disabled: !pl.isActive 
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            size="sm"
          />
          {shiftNumberValid !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              shiftNumberValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {checkingShiftNumber ? (
                <>Checking...</>
              ) : shiftNumberValid ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Available
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  Already exists
                </>
              )}
            </div>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <DatePicker
              value={startTime}
              onChange={handleDateChange}
              placeholderText="Select date & time..."
              required
              className="w-full text-sm"
            />
          </div>
          {startTime && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(startTime).toLocaleString()}
            </p>
          )}
        </div>

        {/* Price List */}
        <div className="md:col-span-2">
          <Select
            label="Price List"
            value={priceListId}
            onChange={(value) => onChange({ priceListId: value })}
            options={priceLists}
            icon={Calendar}
            required
            size="sm"
          />
        </div>
      </div>

      {/* Compact Alert */}
      <Alert variant="info" className="text-sm" size="sm">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="font-medium">Shift Information</p>
            <p className="mt-1">
              Create a new shift by selecting shift number, start time, and price list.
              Shift will be pending until setup is complete.
            </p>
          </div>
        </div>
      </Alert>

      {/* Compact Quick Actions */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-blue-900 text-xs">Next Shift</span>
          </div>
          <p className="text-lg font-bold text-blue-700">
            {dummyDataHelpers.getNextShiftNumber()}
          </p>
        </div>
        
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-green-600" />
            <span className="font-semibold text-green-900 text-xs">Today</span>
          </div>
          <p className="text-sm text-green-700">
            {new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        
        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3 text-purple-600" />
            <span className="font-semibold text-purple-900 text-xs">Price List</span>
          </div>
          <p className="text-sm text-purple-700 truncate">
            {dummyData.station.activePriceList?.name || 'None'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShiftBasicsStep;