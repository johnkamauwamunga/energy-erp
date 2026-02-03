
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Alert, 
  Tag, 
  Badge, 
  Row,
  Col,
  Statistic,
  message,
  Typography,
  Descriptions,
  Tooltip,
  Modal,
  Divider,
  Tabs,
  Collapse,
  Spin
} from 'antd';
import { 
  Fuel, 
  Droplets,
  RefreshCw,
  Eye,
  Download,
  BarChart3,
  FileText,
  Database,
  AlertTriangle,
  DollarSign,
  Zap,
  Calculator,
  Hash,
  Search,
  Filter,
  Settings,
  Bug
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { shiftReadingService } from '../../../../../services/shiftReadingService/shiftReadingService'
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;


const PumpMeterReadings = async() => {
    const location = useLocation();
  const navigate = useNavigate();
  
  // Extract shift and station data from navigation state
  const { shiftId, stationId, shiftNumber } = location.state || {};

  const fetchPumpReadings = async(id) =>{
   try{
    const response = await shiftReadingService.getPumpReadingsSummary(id)
    console.log("the response data ",response.data);
   }catch(e){
    console.log("error ",e)
   }
  }

  useEffect(()=>{
 fetchPumpReadings(shiftId)
  },[])

  return (
    <div>PumpMeterReadings</div>
  )
}

export default PumpMeterReadings