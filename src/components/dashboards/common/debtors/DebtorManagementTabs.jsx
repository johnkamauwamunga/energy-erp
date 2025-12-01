import React, { useState } from 'react';
import { Tabs, Card, Button, Space } from 'antd';
import { 
  TeamOutlined, 
  FolderOpenOutlined,
  PlusOutlined 
} from '@ant-design/icons';
import DebtorCategoriesManagement from './DebtorCategoriesManagement';
import DebtorsManagement from './DebtorManagement';
import CreateDebtorCategoryModal from './modal/CreateDebtorCategoryModal';
import CreateDebtorModal from './modal/CreateDebtorModal';

const { TabPane } = Tabs;

const DebtorManagementTabs = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showCreateDebtorModal, setShowCreateDebtorModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabItems = [
    {
      key: 'debtors',
      label: (
        <Space>
          <TeamOutlined />
          Debtors
        </Space>
      ),
      children: (
        <DebtorsManagement 
          key={refreshKey}
          onShowCreateModal={() => setShowCreateDebtorModal(true)}
        />
      ),
      extra: (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateDebtorModal(true)}
          size="small"
        >
          New Debtor
        </Button>
      )
    },
    {
      key: 'categories',
      label: (
        <Space>
          <FolderOpenOutlined />
          Categories
        </Space>
      ),
      children: (
        <DebtorCategoriesManagement 
          key={refreshKey}
          onShowCreateModal={() => setShowCreateCategoryModal(true)}
        />
      ),
      extra: (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateCategoryModal(true)}
          size="small"
        >
          New Category
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
      <CreateDebtorCategoryModal
        visible={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSuccess={() => {
          setShowCreateCategoryModal(false);
          handleSuccess();
        }}
      />

      <CreateDebtorModal
        visible={showCreateDebtorModal}
        onClose={() => setShowCreateDebtorModal(false)}
        onSuccess={() => {
          setShowCreateDebtorModal(false);
          handleSuccess();
        }}
      />
    </div>
  );
};

export default DebtorManagementTabs;