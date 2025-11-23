// src/components/dashboards/common/debtTransfer/components/management/DebtTransferManagement.jsx
import React, { useState } from 'react';
import { Tabs, Card, Space, Button, Row, Col, message } from 'antd';
import {
  TransactionOutlined,
  HistoryOutlined,
  PlusOutlined,
  FileTextOutlined,
  BarChartOutlined,
  DollarOutlined,
  SwapOutlined,
  BankOutlined,
  SyncOutlined,
  UndoOutlined,
  FileExclamationOutlined
} from '@ant-design/icons';

// Import components
import TransferList from './TransferList';
import DebtorTransactionsList from './DebtorTransactionsList';
import DebtAgingReport from './reports/DebtAgingReport';
import SettlementActivityReport from './reports/SettlementActivityReport';
import CompanyDebtorsSummary from './reports/CompanyDebtorsSummary';

// Import modals
import CashSettlementForm from './modals/CashSettlementForm';
import ElectronicTransferForm from './modals/ElectronicTransferForm';
import BankSettlementForm from './modals/BankSettlementForm';
import CrossStationForm from './modals/CrossStationForm';
import DebtReversalModal from './modals/DebtReversalModal';
import DebtWriteOffModal from './modals/DebtWriteOffModal';
import DebtorSearch from './common/DebtorSearch';

const DebtTransferManagement = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [modals, setModals] = useState({
    cash: false,
    electronic: false,
    bank: false,
    crossStation: false,
    reversal: false,
    writeOff: false,
    search: false
  });

  const openModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: true }));
  const closeModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: false }));

  const handleDebtorSelect = (debtor) => {
    setSelectedDebtor(debtor);
    closeModal('search');
    message.success(`Selected debtor: ${debtor.name}`);
  };

  const handleSuccess = (messageText = 'Operation completed successfully') => {
    message.success(messageText);
    // Refresh relevant data based on active tab
    if (activeTab === 'transactions') {
      // Refresh transactions list
    } else if (activeTab === 'transfers') {
      // Refresh transfers list
    }
  };

  const actionButtons = (
    <Space wrap>
      {/* Debtor Selection */}
      <Button 
        icon={<FileTextOutlined />} 
        onClick={() => openModal('search')}
        disabled={!!selectedDebtor}
      >
        {selectedDebtor ? `Debtor: ${selectedDebtor.name}` : 'Select Debtor'}
      </Button>

      {/* Settlement Actions */}
      <Button 
        type="primary" 
        icon={<DollarOutlined />} 
        onClick={() => openModal('cash')}
        disabled={!selectedDebtor}
      >
        Cash Settlement
      </Button>
      
      <Button 
        type="primary" 
        icon={<SwapOutlined />}
        onClick={() => openModal('electronic')}
        disabled={!selectedDebtor}
      >
        Electronic Transfer
      </Button>
      
      <Button 
        icon={<BankOutlined />}
        onClick={() => openModal('bank')}
        disabled={!selectedDebtor}
      >
        Bank Settlement
      </Button>
      
      <Button 
        icon={<SyncOutlined />}
        onClick={() => openModal('crossStation')}
        disabled={!selectedDebtor}
      >
        Cross-Station
      </Button>
      
      {/* Management Actions */}
      <Button 
        danger 
        icon={<UndoOutlined />}
        onClick={() => openModal('reversal')}
      >
        Reverse
      </Button>
      
      <Button 
        danger 
        icon={<FileExclamationOutlined />}
        onClick={() => openModal('writeOff')}
        disabled={!selectedDebtor}
      >
        Write Off
      </Button>
    </Space>
  );

  const tabs = [
    {
      key: 'summary',
      label: (
        <span>
          <BarChartOutlined />
          Dashboard
        </span>
      ),
      children: <CompanyDebtorsSummary />
    },
    {
      key: 'transactions',
      label: (
        <span>
          <HistoryOutlined />
          Debtor Transactions
        </span>
      ),
      children: <DebtorTransactionsList debtorId={selectedDebtor?.id} />
    },
    {
      key: 'transfers',
      label: (
        <span>
          <TransactionOutlined />
          Transfer History
        </span>
      ),
      children: <TransferList />
    },
    {
      key: 'reports',
      label: (
        <span>
          <FileTextOutlined />
          Reports
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <DebtAgingReport />
          </Col>
          <Col span={24}>
            <SettlementActivityReport />
          </Col>
        </Row>
      )
    }
  ];

  return (
    <>
      <Card 
        title="Debt Transfer Management"
        extra={actionButtons}
        style={{ minHeight: '80vh' }}
      >
        {selectedDebtor && (
          <Card 
            size="small" 
            style={{ marginBottom: 16, backgroundColor: '#f0f8ff' }}
            title={`Selected Debtor: ${selectedDebtor.name}`}
            extra={
              <Button 
                size="small" 
                onClick={() => setSelectedDebtor(null)}
              >
                Clear Selection
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <strong>Phone:</strong> {selectedDebtor.phone || 'N/A'}
              </Col>
              <Col span={6}>
                <strong>Email:</strong> {selectedDebtor.email || 'N/A'}
              </Col>
              <Col span={6}>
                <strong>Total Debt:</strong> KES {selectedDebtor.currentDebt?.toLocaleString() || 0}
              </Col>
              <Col span={6}>
                <strong>Stations:</strong> {selectedDebtor.totalStations || 0}
              </Col>
            </Row>
          </Card>
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          size="large"
        />
      </Card>

      {/* Modals */}
      <DebtorSearch
        visible={modals.search}
        onClose={() => closeModal('search')}
        onSelect={handleDebtorSelect}
      />

      <CashSettlementForm
        visible={modals.cash}
        onClose={() => closeModal('cash')}
        onSuccess={() => {
          closeModal('cash');
          handleSuccess('Cash settlement processed successfully');
        }}
        debtor={selectedDebtor}
      />

      <ElectronicTransferForm
        visible={modals.electronic}
        onClose={() => closeModal('electronic')}
        onSuccess={() => {
          closeModal('electronic');
          handleSuccess('Electronic transfer processed successfully');
        }}
        debtor={selectedDebtor}
      />

      <BankSettlementForm
        visible={modals.bank}
        onClose={() => closeModal('bank')}
        onSuccess={() => {
          closeModal('bank');
          handleSuccess('Bank settlement processed successfully');
        }}
        debtor={selectedDebtor}
      />

      <CrossStationForm
        visible={modals.crossStation}
        onClose={() => closeModal('crossStation')}
        onSuccess={() => {
          closeModal('crossStation');
          handleSuccess('Cross-station settlement processed successfully');
        }}
        debtor={selectedDebtor}
      />

      <DebtReversalModal
        visible={modals.reversal}
        onClose={() => closeModal('reversal')}
        onSuccess={() => {
          closeModal('reversal');
          handleSuccess('Settlement reversed successfully');
        }}
      />

      <DebtWriteOffModal
        visible={modals.writeOff}
        onClose={() => closeModal('writeOff')}
        onSuccess={() => {
          closeModal('writeOff');
          handleSuccess('Debt written off successfully');
        }}
        debtor={selectedDebtor}
      />
    </>
  );
};

export default DebtTransferManagement;