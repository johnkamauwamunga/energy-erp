import React from 'react';
import { Input, Select, DatePicker as DateTimePicker } from '../../../ui';
import { Calendar, Clock, Hash } from 'lucide-react';

const ShiftBasicsStep = ({ data, onChange }) => {
  const { shiftNumber, startTime, priceListId } = data;

  // Mock data - replace with actual API calls
  const priceLists = [
    { id: '11651bc5-c287-4702-9c64-efe4db4a3e03', name: 'Standard Pricing - Jan 2024' },
    { id: '22651bc5-c287-4702-9c64-efe4db4a3e04', name: 'Premium Pricing - Jan 2024' }
  ];

  const shiftNumbers = [1, 2, 3].map(num => ({ value: num, label: `Shift ${num}` }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shift Number */}
        <Select
          label="Shift Number"
          value={shiftNumber}
          onChange={(value) => onChange({ shiftNumber: value })}
          options={shiftNumbers}
          icon={Hash}
          required
        />

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
            options={priceLists.map(pl => ({ value: pl.id, label: pl.name }))}
            icon={Calendar}
            required
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Shift Information</h4>
        <p className="text-blue-700 text-sm">
          Create a new shift by selecting the shift number, start time, and applicable price list.
          The shift will be created in a pending state until you complete the setup process.
        </p>
      </div>
    </div>
  );
};

export default ShiftBasicsStep;