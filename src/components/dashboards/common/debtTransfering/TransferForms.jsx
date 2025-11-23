// src/components/dashboards/common/debtTransfer/TransferForms.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Tabs, 
  Card, 
  Steps,
  Alert,
  Spin 
} from 'antd';
import {
  DollarOutlined,
  SwapOutlined,
  BankOutlined,
  TeamOutlined,
  UndoOutlined,
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { shiftService } from '../../../../services/shiftService/shiftService';
import { useApp } from '../../../../context/AppContext';
import CashSettlementForm from './modals/CashSettlementForm';
import ElectronicTransferForm from './modals/ElectronicTransferForm';
import BankSettlementForm from './modals/BankSettlementForm';
import CrossStationForm from './modals/CrossStationForm';
import ReversalForm from './modals/ReversalForm';
import WriteOffForm from './modals/WriteOffForm';

const { TabPane } = Tabs;
const { Step } = Steps;

const TransferForms = ({ visible, onClose, onSuccess }) => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('cash');
  const [checkingShift, setCheckingShift] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [hasOpenShift, setHasOpenShift] = useState(false);

  const userStationId = state.currentStation?.id;

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
    if (visible) {
      fetchOpenShift();
    }
  }, [visible]);

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
    } finally {
      setCheckingShift(false);
    }
  };

  const handleSuccess = (messageText) => {
    onSuccess(messageText);
  };

  const handleCancel = () => {
    setActiveTab('cash'); // Reset to first tab when closing
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2">
          <SwapOutlined className="text-blue-500" />
          <span>Create New Transfer</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      style={{ top: 20 }}
      destroyOnClose={true}
    >
      <div className="space-y-4">
        {/* Shift Status Alert */}
        {checkingShift ? (
          <div className="text-center py-4">
            <Spin tip="Checking shift status..." />
          </div>
        ) : !hasOpenShift ? (
          <Alert
            message="No Open Shift"
            description="You need to have an open shift to perform transfer operations."
            type="warning"
            showIcon
            closable
          />
        ) : (
          <Alert
            message={`Active Shift: ${currentShift?.shiftNumber}`}
            description={`Started at: ${new Date(currentShift?.startTime).toLocaleString()}`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        )}

        {/* Transfer Type Selection */}
        <Card size="small" title="Select Transfer Type" className="mb-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="small"
            destroyInactiveTabPane={true}
          >
            {forms.map((form) => (
              <TabPane
                key={form.key}
                tab={
                  <span className="flex items-center space-x-1">
                    {form.icon}
                    <span>{form.label}</span>
                  </span>
                }
              >
                <div className="mb-4">
                  <h4 className="text-gray-800 font-medium">{form.label}</h4>
                  <p className="text-gray-600 text-sm">{form.description}</p>
                </div>
                
                {/* Render the form component */}
                {React.createElement(form.component, {
                  onSuccess: handleSuccess,
                  currentShift: currentShift,
                  currentStation: userStationId,
                  disabled: !hasOpenShift
                })}
              </TabPane>
            ))}
          </Tabs>
        </Card>
      </div>
    </Modal>
  );
};

export default TransferForms;