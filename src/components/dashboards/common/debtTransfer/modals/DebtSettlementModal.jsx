// src/components/dashboards/common/debtTransfer/components/modals/DebtSettlementModal.jsx
import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Space,
  Button,
  Alert,
  Empty
} from 'antd';
import {
  DollarOutlined,
  SwapOutlined,
  BankOutlined,
  SyncOutlined,
  CloseOutlined
} from '@ant-design/icons';

// Import all settlement forms
import CashSettlementForm from './CashSettlementForm';
import ElectronicTransferForm from './ElectronicTransferForm';
import BankSettlementForm from './BankSettlementForm';
import CrossStationForm from './CrossStationForm';

const DebtSettlementModal = ({ visible, onClose, onSuccess, debtor }) => {
  const [activeTab, setActiveTab] = useState('cash');

  const settlementTypes = [
    {
      key: 'cash',
      label: (
        <Space>
          <DollarOutlined />
          Cash Settlement
        </Space>
      ),
      description: 'Debtor pays cash at current station',
      form: CashSettlementForm
    },
    {
      key: 'electronic',
      label: (
        <Space>
          <SwapOutlined />
          Electronic Transfer
        </Space>
      ),
      description: 'Transfer debt to another debtor/payment method',
      form: ElectronicTransferForm
    },
    {
      key: 'bank',
      label: (
        <Space>
          <BankOutlined />
          Bank Settlement
        </Space>
      ),
      description: 'Record bank deposit payment',
      form: BankSettlementForm
    },
    {
      key: 'cross-station',
      label: (
        <Space>
          <SyncOutlined />
          Cross-Station
        </Space>
      ),
      description: 'Pay at one station, settle across multiple',
      form: CrossStationForm
    }
  ];

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  const renderForm = () => {
    const settlementType = settlementTypes.find(type => type.key === activeTab);
    if (!settlementType) return null;

    const FormComponent = settlementType.form;
    return (
      <FormComponent
        visible={true}
        onClose={onClose}
        onSuccess={handleSuccess}
        debtor={debtor}
      />
    );
  };

  if (!debtor) {
    return (
      <Modal
        title="Debt Settlement"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Alert
          message="No Debtor Selected"
          description="Please select a debtor before processing settlements."
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          Debt Settlement - {debtor.name}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <div className="space-y-4">
        <Alert
          message="Choose Settlement Method"
          description="Select the appropriate settlement method based on how the debtor is making the payment."
          type="info"
          showIcon
        />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={settlementTypes.map(type => ({
            key: type.key,
            label: type.label,
            children: (
              <Card>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ marginBottom: 16 }}>
                    {React.createElement(type.form ? type.form.Icon || DollarOutlined : DollarOutlined, {
                      style: { fontSize: 48, color: '#1890ff' }
                    })}
                  </div>
                  <h3>{type.label}</h3>
                  <p style={{ color: '#666', marginBottom: 24 }}>
                    {type.description}
                  </p>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => {
                      // This would open the specific form modal
                      console.log('Open', type.key, 'form');
                    }}
                  >
                    Open {type.label} Form
                  </Button>
                </div>
              </Card>
            )
          }))}
        />

        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} icon={<CloseOutlined />}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Add icons to form components for the parent modal
CashSettlementForm.Icon = DollarOutlined;
ElectronicTransferForm.Icon = SwapOutlined;
BankSettlementForm.Icon = BankOutlined;
CrossStationForm.Icon = SyncOutlined;

export default DebtSettlementModal;