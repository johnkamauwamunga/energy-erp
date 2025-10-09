// ShiftTableExample.jsx
import React from 'react';
import {MultiTable as Table} from '../../../ui';
import { generateShiftData } from './sampleData';

const ShiftTableExample = () => {
  const shiftData = generateShiftData(35);

  const columns = [
    {
      key: 'shift-name',
      header: 'Shift',
      accessor: 'shift.name',
      className: 'font-medium'
    },
    {
      key: 'date',
      header: 'Date',
      accessor: 'date'
    },
    {
      key: 'location',
      header: 'Location',
      accessor: 'shift.location'
    },
    {
      key: 'sales',
      header: 'Sales',
      accessor: 'sales.total',
      render: (value, row) => (
        <div 
          className="text-blue-600 cursor-pointer hover:underline font-medium"
          onClick={() => console.log('Sales clicked', row)}
        >
          ${value.toLocaleString()}
        </div>
      ),
      clickable: true,
      modalType: 'sales'
    },
    {
      key: 'attendants',
      header: 'Attendants',
      accessor: 'attendants',
      render: (value) => (
        <div className="text-green-600 cursor-pointer hover:underline">
          {value.length} staff
        </div>
      ),
      clickable: true,
      modalType: 'attendants'
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: 'shift.duration',
      render: (value) => `${value}h`
    },
    {
      key: 'efficiency',
      header: 'Efficiency',
      accessor: 'shift.efficiency',
      render: (value) => (
        <div className="flex items-center">
          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
            <div 
              className={`h-2 rounded-full ${
                value > 85 ? 'bg-green-500' : 
                value > 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${value}%` }}
            ></div>
          </div>
          <span>{value}%</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'active' ? 'bg-blue-100 text-blue-800' :
          value === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  const renderExpandedContent = (rowData) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Shift Details */}
      <div>
        <h4 className="font-semibold mb-3 text-gray-800">Shift Overview</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-medium">{rowData.shift.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Manager:</span>
            <span className="font-medium">{rowData.manager}</span>
          </div>
          <div className="flex justify-between">
            <span>Incidents:</span>
            <span className={`font-medium ${rowData.incidents > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {rowData.incidents}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Rating:</span>
            <span className="flex items-center text-yellow-600">
              {'★'.repeat(rowData.rating)}{'☆'.repeat(5 - rowData.rating)}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Breakdown */}
      <div>
        <h4 className="font-semibold mb-3 text-gray-800">Sales Breakdown</h4>
        <div className="space-y-2 text-sm">
          {rowData.sales.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span>{item.category}:</span>
              <span className="font-medium">${item.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>${rowData.sales.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h4 className="font-semibold mb-3 text-gray-800">Quick Actions</h4>
        <div className="space-y-2">
          <button 
            className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded text-sm text-blue-700"
            onClick={() => console.log('View full report', rowData)}
          >
            📊 View Full Report
          </button>
          <button 
            className="w-full text-left p-2 bg-green-50 hover:bg-green-100 rounded text-sm text-green-700"
            onClick={() => console.log('Export data', rowData)}
          >
            📥 Export Shift Data
          </button>
          <button 
            className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 rounded text-sm text-purple-700"
            onClick={() => console.log('Schedule similar', rowData)}
          >
            🗓️ Schedule Similar Shift
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
        <p className="text-gray-600">Comprehensive overview of all shifts with detailed analytics</p>
      </div>
      
      <Table
        columns={columns}
        data={shiftData}
        expandable={true}
        renderExpandedContent={renderExpandedContent}
        paginate={true}
        pageSize={10}
        responsiveBreakpoint="md"
        className="shadow-lg"
        headerClass="bg-gradient-to-r from-blue-50 to-indigo-50"
        rowClass="hover:bg-blue-50 transition-colors duration-150"
      />
    </div>
  );
};

export default ShiftTableExample;