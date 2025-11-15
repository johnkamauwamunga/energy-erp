import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Space,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Timeline,
  Empty,
  Spin
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ContactsOutlined,
  HomeOutlined,
  DollarOutlined,
  CalendarOutlined,
  CloseOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { debtorService } from '../../../../../services/debtorService/debtorService';

const DebtorDetailModal = ({ visible, debtor, onClose }) => {
  const [debtorDetails, setDebtorDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Load debtor details when modal opens
  useEffect(() => {
    if (visible && debtor) {
      loadDebtorDetails();
      loadRecentTransactions();
    }
  }, [visible, debtor]);

  const loadDebtorDetails = async () => {
    setLoading(true);
    try {
      const details = await debtorService.getDebtorById(debtor.id);
      setDebtorDetails(details);
    } catch (error) {
      console.error('Failed to load debtor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const result = await debtorService.getDebtorTransactions(debtor.id, { limit: 10 });
      setTransactions(result.transactions || result || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const formatDebtor = (debtorData) => {
    return debtorService.formatDebtor(debtorData);
  };

  const formatTransaction = (transaction) => {
    return debtorService.formatDebtorTransaction(transaction);
  };

  if (!debtor) return null;

  const formattedDebtor = formatDebtor(debtorDetails || debtor);

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Debtor Details - {debtor.name}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      width={900}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {debtorDetails ? (
          <>
            {/* Summary Statistics */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Total Debt"
                    value={debtorDetails.summary?.totalDebt || 0}
                    precision={2}
                    prefix={<DollarOutlined />}
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Total Paid"
                    value={debtorDetails.summary?.totalPaid || 0}
                    precision={2}
                    prefix={<DollarOutlined />}
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Stations"
                    value={debtorDetails.summary?.totalStations || 0}
                    prefix={<HomeOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Credit Utilization"
                    value={debtorDetails.summary?.creditUtilization || 0}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} lg={12}>
                {/* Basic Information */}
                <Card title="Basic Information" size="small" style={{ marginBottom: 16 }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Name">
                      {debtorDetails.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Code">
                      {debtorDetails.code || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Category">
                      <Space>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: debtorDetails.category?.color || '#666666'
                          }}
                        />
                        {debtorDetails.category?.name}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tax Number">
                      {debtorDetails.taxNumber || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Space>
                        <Tag color={formattedDebtor.statusColor}>
                          {formattedDebtor.statusDisplay}
                        </Tag>
                        {debtorDetails.isBlacklisted && (
                          <Tag color="error">Blacklisted</Tag>
                        )}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Contact Information */}
                <Card title="Contact Information" size="small" style={{ marginBottom: 16 }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Contact Person">
                      {debtorDetails.contactPerson || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {debtorDetails.phone || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      {debtorDetails.email || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Address">
                      {debtorDetails.address || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Credit Information */}
                <Card title="Credit Information" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Credit Limit">
                      {formattedDebtor.creditLimitDisplay}
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Terms">
                      {debtorDetails.paymentTerms ? `${debtorDetails.paymentTerms} days` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current Debt">
                      {formattedDebtor.totalDebtDisplay}
                    </Descriptions.Item>
                    <Descriptions.Item label="Available Credit">
                      {debtorDetails.creditLimit ? 
                        `KES ${(debtorDetails.creditLimit - (debtorDetails.summary?.totalDebt || 0)).toLocaleString()}` 
                        : 'No limit'
                      }
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                {/* Recent Transactions */}
                <Card 
                  title="Recent Transactions" 
                  size="small"
                  extra={
                    <Button type="link" size="small">
                      View All
                    </Button>
                  }
                >
                  <Spin spinning={transactionsLoading}>
                    {transactions.length > 0 ? (
                      <Timeline>
                        {transactions.slice(0, 5).map((transaction, index) => {
                          const formatted = formatTransaction(transaction);
                          return (
                            <Timeline.Item
                              key={transaction.id || index}
                              color={formatted.typeColor}
                              dot={formatted.isOverdue ? <CloseOutlined style={{ color: '#ff4d4f' }} /> : null}
                            >
                              <div>
                                <div style={{ fontWeight: 500 }}>
                                  {formatted.typeDisplay} • {formatted.amountDisplay}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {formatted.stationDisplay}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  <Tag size="small" color={formatted.statusColor}>
                                    {formatted.statusDisplay}
                                  </Tag>
                                  {formatted.dueDateDisplay && ` • Due: ${formatted.dueDateDisplay}`}
                                </div>
                              </div>
                            </Timeline.Item>
                          );
                        })}
                      </Timeline>
                    ) : (
                      <Empty
                        description="No recent transactions"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Spin>
                </Card>

                {/* Station Accounts */}
                <Card title="Station Accounts" size="small" style={{ marginTop: 16 }}>
                  {debtorDetails.stationAccounts && debtorDetails.stationAccounts.length > 0 ? (
                    <Descriptions column={1} size="small">
                      {debtorDetails.stationAccounts.map(account => (
                        <Descriptions.Item key={account.id} label={account.station?.name}>
                          KES {account.currentDebt?.toLocaleString() || '0'}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  ) : (
                    <Empty
                      description="No station accounts"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      size="small"
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          // Fallback to basic info if details not loaded
          <Card>
            <Descriptions column={1}>
              <Descriptions.Item label="Name">
                {debtor.name}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {debtor.category?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={formattedDebtor.statusColor}>
                  {formattedDebtor.statusDisplay}
                </Tag>
                {debtor.isBlacklisted && (
                  <Tag color="error">Blacklisted</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Total Debt">
                {formattedDebtor.totalDebtDisplay}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Spin>
    </Modal>
  );
};

export default DebtorDetailModal;