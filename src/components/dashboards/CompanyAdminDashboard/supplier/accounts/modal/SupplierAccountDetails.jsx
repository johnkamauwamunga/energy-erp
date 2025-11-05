// src/components/supplier-accounts/SupplierAccountDetails.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Table,
  Tag,
  Tabs,
  Card,
  Row,
  Col,
  Progress,
  Statistic,
  Timeline,
  Empty,
  Space,
  Button
} from 'antd';
import {
  EyeOutlined,
  DollarOutlined,
  EditOutlined,
  BarChartOutlined,
  TransactionOutlined
} from '@ant-design/icons';
import { supplierAccountService } from '../../../../../../services/supplierAccountService/supplierAccountService';

const { TabPane } = Tabs;

const SupplierAccountDetails = ({ visible, account, onClose, onRefresh }) => {
  const [accountDetails, setAccountDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && account) {
      loadAccountDetails();
    }
  }, [visible, account]);

  const loadAccountDetails = async () => {
    try {
      setLoading(true);
      const [details, txs] = await Promise.all([
        supplierAccountService.getSupplierAccount(account.supplierId),
        supplierAccountService.getTransactionsBySupplier(account.supplierId, { limit: 50 })
      ]);
      
      setAccountDetails(details);
      setTransactions(txs);
    } catch (error) {
      console.error('Failed to load account details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!accountDetails) return null;

  const formatCurrency = (amount) => supplierAccountService.formatCurrency(amount);
  const aging = accountDetails.aging || {};

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          PURCHASE_INVOICE: { color: 'blue', text: 'Purchase' },
          PAYMENT_MADE: { color: 'green', text: 'Payment' },
          CREDIT_NOTE: { color: 'cyan', text: 'Credit Note' },
          ADJUSTMENT: { color: 'orange', text: 'Adjustment' }
        };
        const config = typeMap[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        const isCredit = ['PAYMENT_MADE', 'CREDIT_NOTE'].includes(record.type);
        const color = isCredit ? '#52c41a' : '#cf1322';
        return (
          <span style={{ color, fontWeight: 500 }}>
            {isCredit ? '-' : '+'}{formatCurrency(Math.abs(amount))}
          </span>
        );
      }
    },
    {
      title: 'Balance',
      dataIndex: 'balanceAfter',
      key: 'balance',
      render: (balance) => formatCurrency(balance)
    }
  ];

  return (
    <Modal
      title={`Supplier Account: ${accountDetails.supplier?.name}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <Tabs defaultActiveKey="overview">
        <TabPane tab="Overview" key="overview">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Current Balance"
                  value={accountDetails.currentBalance}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ 
                    color: accountDetails.currentBalance > 0 ? '#cf1322' : '#52c41a'
                  }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Credit Limit"
                  value={accountDetails.creditLimit || 0}
                  precision={2}
                  prefix="KES"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Available Credit"
                  value={accountDetails.availableCredit || 0}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Supplier Code">
              {accountDetails.supplier?.code}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              {accountDetails.supplier?.contactPerson}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Terms">
              {accountDetails.paymentTerms} days
            </Descriptions.Item>
            <Descriptions.Item label="Last Payment Date">
              {accountDetails.lastPaymentDate ? 
                new Date(accountDetails.lastPaymentDate).toLocaleDateString() : 
                'Never'
              }
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={accountDetails.isActive ? 'green' : 'red'}>
                {accountDetails.isActive ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Card title="Aging Analysis" style={{ marginTop: 16 }} size="small">
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Current</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {formatCurrency(aging.current || 0)}
                  </div>
                </div>
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#faad14' }}>1-30 Days</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}>
                    {formatCurrency(aging['1-30'] || 0)}
                  </div>
                </div>
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#fa8c16' }}>31-60 Days</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>
                    {formatCurrency(aging['31-60'] || 0)}
                  </div>
                </div>
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#fa541c' }}>61-90 Days</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa541c' }}>
                    {formatCurrency(aging['61-90'] || 0)}
                  </div>
                </div>
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#cf1322' }}>90+ Days</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#cf1322' }}>
                    {formatCurrency(aging['90+'] || 0)}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="Transaction History" key="transactions">
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </TabPane>

        <TabPane tab="Performance" key="performance">
          {accountDetails.summary && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Total Invoices">
                {accountDetails.summary.totalInvoices}
              </Descriptions.Item>
              <Descriptions.Item label="Total Payments">
                {accountDetails.summary.totalPayments}
              </Descriptions.Item>
              <Descriptions.Item label="Outstanding Invoices">
                {accountDetails.summary.outstandingInvoices}
              </Descriptions.Item>
              <Descriptions.Item label="Total Invoice Amount">
                {formatCurrency(accountDetails.summary.totalInvoiceAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Payment Amount">
                {formatCurrency(accountDetails.summary.totalPaymentAmount)}
              </Descriptions.Item>
            </Descriptions>
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SupplierAccountDetails;