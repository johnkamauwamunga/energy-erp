// src/components/dashboards/common/debtTransfer/DebtTransferManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Button,
  Space,
  Typography,
  Divider,
  Statistic,
  Alert,
  Spin
} from 'antd';
import {
  SwapOutlined,
  TransactionOutlined,
  HistoryOutlined,
  BarChartOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import TransactionList from './TransactionList';
import TransferList from './TransferList';
import TransferForms from './TransferForms';
import TransferAnalytics from './TransferAnalytics';
import { debtTransferService } from '../../../../services/debtTransferService/debtTransferService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const DebtTransferManagement = () => {
  const [activeTab, setActiveTab] = useState('operations');
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState({});
  const [transferFilters, setTransferFilters] = useState({});
  const [summary, setSummary] = useState(null);

  // Fetch transactions
  const fetchTransactions = async (filters = {}) => {
    setLoading(true);
    try {
      const transactionsResult = await debtTransferService.getDebtorTransactions(filters);
      console.log('Fetched transactions:', transactionsResult);
      setTransactions(transactionsResult.transactions || transactionsResult.data || transactionsResult || []);
    } catch (error) {
      console.error('Failed to fetch debtors transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transfers
  const fetchTransfers = async (filters = {}) => {
    setLoading(true);
    try {
      const transferResult = await debtTransferService.getAccountTransfers(filters);
      console.log('Fetched transfers:', transferResult);
      setTransfers(transferResult.transfers || transferResult.data || transferResult || []);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const summaryResult = await debtTransferService.getCompanyDebtorsSummary();
      setSummary(summaryResult);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchTransfers();
    fetchSummary();
  }, []);

  const handleTransferSuccess = () => {
    fetchTransactions(transactionFilters);
    fetchTransfers(transferFilters);
    fetchSummary();
  };

  const handleTransactionFiltersChange = (newFilters) => {
    setTransactionFilters(newFilters);
    fetchTransactions(newFilters);
  };

  const handleTransferFiltersChange = (newFilters) => {
    setTransferFilters(newFilters);
    fetchTransfers(newFilters);
  };

  const refreshAll = () => {
    fetchTransactions(transactionFilters);
    fetchTransfers(transferFilters);
    fetchSummary();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space>
              <SwapOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <Space direction="vertical" size={0}>
                <Title level={3} style={{ margin: 0 }}>
                  Debt Transfer Management
                </Title>
                <Text type="secondary">
                  Manage debt settlements, transfers, and reconciliations
                </Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[8, 8]} justify="end">
              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={refreshAll}
                  loading={loading}
                >
                  Refresh All
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Total Outstanding Debt"
                value={summary.totalOutstandingDebt}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Active Debtors"
                value={summary.totalActiveDebtors}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Average Debt"
                value={summary.averageDebtPerDebtor}
                precision={0}
                prefix="KES"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
        >
          <TabPane
            tab={
              <span>
                <TransactionOutlined />
                Transfer Operations
              </span>
            }
            key="operations"
          >
            <TransferForms onTransferSuccess={handleTransferSuccess} />
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                Transaction History
              </span>
            }
            key="transactions"
          >
            <Card 
              title="Debt Transactions" 
              size="small"
              extra={
                <Text strong>
                  {transactions.length} transactions
                </Text>
              }
            >
              <TransactionList
                transactions={transactions}
                loading={loading}
                filters={transactionFilters}
                onFiltersChange={handleTransactionFiltersChange}
                onRefresh={() => fetchTransactions(transactionFilters)}
                showFilters={true}
                pagination={{ pageSize: 20 }}
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                Transfer History
              </span>
            }
            key="transfers"
          >
            <Card 
              title="Account Transfers" 
              size="small"
              extra={
                <Text strong>
                  {transfers.length} transfers
                </Text>
              }
            >
              <TransferList
                transfers={transfers}
                loading={loading}
                filters={transferFilters}
                onFiltersChange={handleTransferFiltersChange}
                onRefresh={() => fetchTransfers(transferFilters)}
                showFilters={true}
                pagination={{ pageSize: 20 }}
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                Analytics & Reports
              </span>
            }
            key="analytics"
          >
            <TransferAnalytics transactions={transactions} transfers={transfers} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DebtTransferManagement;