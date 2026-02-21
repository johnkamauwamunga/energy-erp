// src/pages/tests/ReconciliationTest.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Typography, 
  Alert, 
  Spin, 
  Badge,
  Table,
  Select,
  Space,
  message,
  Tabs,
  Descriptions,
  Statistic,
  Divider,
  Tag,
  Timeline,
  Tooltip,
  Progress,
  Modal,
  Input,
  DatePicker,
  Collapse,
  Empty
} from 'antd';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  FileText,
  Filter,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  Printer,
  Clock,
  Shield,
  Fuel,
  Droplets,
  Truck,
  Settings,
  Info,
  ChevronRight,
  ChevronDown,
  Layers,
  PieChart,
  Activity,
  Zap,
  Plus,
  MinusCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Gauge,
  Thermometer,
  Beaker
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { reconciliationService, RECONCILIATION_STATUS, SHIFT_STATUS } from '../../../services/reconcilliationService/reconcilliationService';

import { expenseService } from '../../../services/expenseService/expenseService'
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const ReconciliationTest = () => {
  const [shiftId] = useState("afa0dd2d-7c87-4b07-89eb-6e111ac850f3");
  const [expenses, setExpenses] = useState([]);

  const fetchData = async (id) => {
    try {
      const data = await expenseService.getExpensesByShift(id);
      console.log('Raw data:', data);
      
      // Filter for THIS specific shift AND where islandId exists
      const filteredExpenses = data.filter(expense => 
        expense.shiftId === id && expense.islandId !== null
      );
      
      console.log('Filtered expenses (matching shift + has islandId):', filteredExpenses);
      console.log('Count:', filteredExpenses.length);
      
      setExpenses(filteredExpenses);
      
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    fetchData(shiftId);
  }, []);

  return (
    <div>
      <h1>Expense Test Component</h1>
      <p>Shift ID: {shiftId}</p>
      <p>Found {expenses.length} expenses with islandId</p>
      <pre>{JSON.stringify(expenses, null, 2)}</pre>
    </div>
  );
};

export default ReconciliationTest;
