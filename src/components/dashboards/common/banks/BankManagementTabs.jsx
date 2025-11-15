import React, { useState } from 'react';
import { Tabs, Card, Button, Space } from 'antd';
import { 
  BankOutlined, 
  CreditCardOutlined,
  PlusOutlined 
} from '@ant-design/icons';
import BanksManagement from './BanksManagement';
import BankAccountsManagement from './BankAccountsManagement';
import CreateBankModal from './modal/CreateBankModal';
import CreateBankAccountModal from './modal/CreateBankAccountModal';

const { TabPane } = Tabs;

const BankManagementTabs = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [showCreateBankModal, setShowCreateBankModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabItems = [
    {
      key: 'accounts',
      label: (
        <Space>
          <CreditCardOutlined />
          Bank Accounts
        </Space>
      ),
      children: (
        <BankAccountsManagement 
          key={refreshKey}
          onShowCreateModal={() => setShowCreateAccountModal(true)}
        />
      ),
      extra: (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateAccountModal(true)}
          size="small"
        >
          New Account
        </Button>
      )
    },
    {
      key: 'banks',
      label: (
        <Space>
          <BankOutlined />
          Banks
        </Space>
      ),
      children: (
        <BanksManagement 
          key={refreshKey}
          onShowCreateModal={() => setShowCreateBankModal(true)}
        />
      ),
      extra: (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateBankModal(true)}
          size="small"
        >
          New Bank
        </Button>
      )
    }
  ];

  return (
    <div>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={tabItems}
        />
      </Card>

      {/* Modals */}
      <CreateBankModal
        visible={showCreateBankModal}
        onClose={() => setShowCreateBankModal(false)}
        onSuccess={() => {
          setShowCreateBankModal(false);
          handleSuccess();
        }}
      />

      <CreateBankAccountModal
        visible={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSuccess={() => {
          setShowCreateAccountModal(false);
          handleSuccess();
        }}
      />
    </div>
  );
};

export default BankManagementTabs;