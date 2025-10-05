// components/shifts/ShiftManagementTable.jsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Badge,Input } from '../../../ui';
import { Eye, PlayCircle, PauseCircle, MoreVertical, Filter, Search } from 'lucide-react';
import { shiftService } from '../../../../services/shiftService/shiftService';

const ShiftManagementTable = ({ onViewShift, onOpenShift, onCloseShift }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    supervisor: ''
  });

  useEffect(() => {
    loadShifts();
  }, [filters]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const shiftData = await shiftService.getShifts(filters);
      setShifts(shiftData);
    } catch (error) {
      console.error('Failed to load shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      OPEN: 'success',
      CLOSED: 'gray',
      PENDING: 'yellow',
      CANCELLED: 'red'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const columns = [
    {
      key: 'shiftNumber',
      header: 'Shift #',
      render: (shift) => shift.shiftNumber
    },
    {
      key: 'supervisor',
      header: 'Supervisor',
      render: (shift) => `${shift.supervisor?.firstName} ${shift.supervisor?.lastName}`
    },
    {
      key: 'startTime',
      header: 'Start Time',
      render: (shift) => new Date(shift.startTime).toLocaleString()
    },
    {
      key: 'endTime',
      header: 'End Time',
      render: (shift) => shift.endTime ? new Date(shift.endTime).toLocaleString() : '-'
    },
    {
      key: 'status',
      header: 'Status',
      render: (shift) => getStatusBadge(shift.status)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (shift) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewShift(shift)}
            icon={Eye}
          >
            View
          </Button>
          
          {shift.status === 'OPEN' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onCloseShift(shift)}
              icon={PauseCircle}
            >
              Close
            </Button>
          )}
          
          {shift.status === 'PENDING' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => onOpenShift(shift)}
              icon={PlayCircle}
            >
              Open
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <Card title="Shift Management" className="p-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search shifts..."
          icon={Search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="all">All Status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="PENDING">Pending</option>
        </select>
        <Input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
        />
        <Button variant="outline" icon={Filter} onClick={loadShifts}>
          Apply Filters
        </Button>
      </div>

      {/* Shifts Table */}
      <Table
        columns={columns}
        data={shifts}
        loading={loading}
        emptyMessage="No shifts found"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {shifts.filter(s => s.status === 'OPEN').length}
          </div>
          <div className="text-blue-700">Open Shifts</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {shifts.filter(s => s.status === 'CLOSED').length}
          </div>
          <div className="text-green-700">Closed Today</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {shifts.filter(s => s.status === 'PENDING').length}
          </div>
          <div className="text-yellow-700">Pending</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{shifts.length}</div>
          <div className="text-gray-700">Total Shifts</div>
        </div>
      </div>
    </Card>
  );
};

export default ShiftManagementTable;