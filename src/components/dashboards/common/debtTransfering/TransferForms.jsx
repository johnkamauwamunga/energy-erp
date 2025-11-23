// src/components/dashboards/common/debtTransfer/TransferForms.jsx
import React, { useState, useEffect } from 'react';
import { Tabs, Card } from 'antd';
import {
  DollarOutlined,
  SwapOutlined,
  BankOutlined,
  TeamOutlined,
  UndoOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { shiftService } from '../../../../services/shiftService/shiftService';
import {useApp} from '../../../../context/AppContext'
import CashSettlementForm from './modals/CashSettlementForm';
import ElectronicTransferForm from './modals/ElectronicTransferForm';
import BankSettlementForm from './modals/BankSettlementForm';
import CrossStationForm from './modals/CrossStationForm';
import ReversalForm from './modals/ReversalForm';
import WriteOffForm from './modals/WriteOffForm';


const { TabPane } = Tabs;

const TransferForms = ({ onTransferSuccess }) => {
    const {state}=useApp();
  const [activeTab, setActiveTab] = useState('cash');
  const [checkShift, setCheckingShift] = useState(false);
  const [currentShift, setCurrentShift]=useState(null);
  const [hasOpenShift, setHasOpenShift]=useState(false);

  const userStationId=state.currentStation?.id;

  const forms = [
    {
      key: 'cash',
      label: 'Cash Settlement',
      icon: <DollarOutlined />,
      component: CashSettlementForm,
      description: 'Debtor pays cash directly at station'
    },
    {
      key: 'electronic',
      label: 'Electronic Transfer',
      icon: <SwapOutlined />,
      component: ElectronicTransferForm,
      description: 'Transfer debt between payment methods'
    },
    {
      key: 'bank',
      label: 'Bank Settlement',
      icon: <BankOutlined />,
      component: BankSettlementForm,
      description: 'Debtor pays directly to bank account'
    },
    {
      key: 'cross-station',
      label: 'Cross-Station',
      icon: <TeamOutlined />,
      component: CrossStationForm,
      description: 'Pay debt across multiple stations'
    },
    {
      key: 'reversal',
      label: 'Reversal',
      icon: <UndoOutlined />,
      component: ReversalForm,
      description: 'Reverse a previous settlement'
    },
    {
      key: 'write-off',
      label: 'Write-off',
      icon: <FileTextOutlined />,
      component: WriteOffForm,
      description: 'Write off unrecoverable debt'
    }
  ];

  useEffect(() => {
   fetchOpenShift();
  },[])

     const fetchOpenShift = async () => {
        if (!userStationId) {
          setCheckingShift(false);
          return;
        }
        
        setCheckingShift(true);
        try {
          console.log("🔍 Calling shiftService.getOpenShift...");
          const result = await shiftService.getOpenShift(userStationId);
          console.log("✅ Open shift check result:", result);
          
          if (result && result.status === "OPEN") {
            setHasOpenShift(true);
            setCurrentShift(result);
            console.log("🚦 Open shift found:", result.shiftNumber);
          } else {
            setHasOpenShift(false);
            setCurrentShift(null);
            console.log("🚦 No open shift found");
          }
        } catch (error) {
          console.error("❌ Error checking open shift:", error);
          setHasOpenShift(false);
          setCurrentShift(null);
          message.error('Failed to check shift status');
        } finally {
          setCheckingShift(false);
        }
      };

  return (
    <div className="space-y-3">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="small"
        destroyInactiveTabPane={true} // This ensures forms are recreated when switching tabs
      >
        {forms.map((form) => (
          <TabPane
            key={form.key}
            tab={
              <span>
                {form.icon}
                {form.label}
              </span>
            }
          >
            <Card size="small" style={{ border: 'none' }}>
              <div className="mb-4">
                <h4 className="text-gray-700">{form.label}</h4>
                <p className="text-gray-500 text-sm">{form.description}</p>
              </div>
              
              {/* Render the form component directly for the active tab */}
              {React.createElement(form.component, {
                onSuccess: onTransferSuccess,
                currentShift: currentShift,
                currentStation: userStationId
              })}
            </Card>
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
};

export default TransferForms;