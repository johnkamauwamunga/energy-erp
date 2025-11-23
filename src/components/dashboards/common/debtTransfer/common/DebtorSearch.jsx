// src/components/dashboards/common/debtTransfer/components/common/DebtorSearch.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Table,
  Tag,
  Space,
  Button,
  Card,
  Statistic,
  Row,
  Col,
  Empty,
  Alert
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CloseOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { useApp } from '../../../../../context/AppContext';

const DebtorSearch = ({ visible, onClose, onSelect }) => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);

  const performSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await debtTransferService.searchDebtors({
        searchTerm: searchTerm.trim(),
        companyId: state.companyId
      });
      
      setSearchResults(results.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelect = (debtor) => {
    setSelectedDebtor(debtor);
  };

  const handleConfirm = () => {
    if (selectedDebtor) {
      onSelect(selectedDebtor);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedDebtor(null);
    onClose();
  };

  const columns = [
    {
      title: 'Debtor Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <strong>{text}</strong>
          <small style={{ color: '#666' }}>{record.code}</small>
        </Space>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.phone && (
            <div>
              <PhoneOutlined style={{ color: '#666', marginRight: 4 }} />
              {record.phone}
            </div>
          )}
          {record.email && (
            <div>
              <MailOutlined style={{ color: '#666', marginRight: 4 }} />
              {record.email}
            </div>
          )}
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category, record) => (
        <Tag color={record.isPaymentProcessor ? 'green' : 'blue'}>
          {category}
        </Tag>
      )
    },
    {
      title: 'Total Debt',
      dataIndex: 'currentDebt',
      key: 'currentDebt',
      width: 100,
      render: (amount) => (
        <strong style={{ 
          color: amount > 0 ? '#ff4d4f' : '#52c41a'
        }}>
          KES {amount?.toLocaleString()}
        </strong>
      )
    },
    {
      title: 'Stations',
      dataIndex: 'totalStations',
      key: 'totalStations',
      width: 80,
      render: (count) => (
        <Tag>{count} stations</Tag>
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          size="small"
          type={selectedDebtor?.id === record.id ? 'primary' : 'default'}
          onClick={() => handleSelect(record)}
        >
          {selectedDebtor?.id === record.id ? 'Selected' : 'Select'}
        </Button>
      )
    }
  ];

  // Mock data for demonstration
  const mockResults = [
    {
      id: '1',
      name: 'John Doe',
      code: 'D001',
      phone: '+254712345678',
      email: 'john@example.com',
      category: 'Individual',
      isPaymentProcessor: false,
      currentDebt: 15000,
      totalStations: 2
    },
    {
      id: '2',
      name: 'ABC Suppliers Ltd',
      code: 'D002',
      phone: '+254723456789',
      email: 'info@abcsuppliers.com',
      category: 'Corporate',
      isPaymentProcessor: false,
      currentDebt: 50000,
      totalStations: 3
    },
    {
      id: '3',
      name: 'M-Pesa',
      code: 'MPESA',
      phone: null,
      email: null,
      category: 'Payment Processor',
      isPaymentProcessor: true,
      currentDebt: 0,
      totalStations: 5
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Search and Select Debtor
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <div className="space-y-4">
        {/* Search Input */}
        <Input
          placeholder="Search by name, code, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<SearchOutlined />}
          size="large"
          allowClear
        />

        <Row gutter={16}>
          <Col span={16}>
            {/* Search Results */}
            <Card 
              title={`Search Results (${mockResults.length})`}
              size="small"
              style={{ height: '400px', overflow: 'auto' }}
            >
              {searchTerm ? (
                <Table
                  columns={columns}
                  dataSource={mockResults}
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                  rowKey="id"
                  onRow={(record) => ({
                    onClick: () => handleSelect(record),
                    style: {
                      cursor: 'pointer',
                      backgroundColor: selectedDebtor?.id === record.id ? '#e6f7ff' : 'white'
                    }
                  })}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Enter search terms to find debtors"
                />
              )}
            </Card>
          </Col>

          <Col span={8}>
            {/* Selected Debtor Info */}
            <Card 
              title="Selected Debtor" 
              size="small"
              style={{ height: '400px' }}
            >
              {selectedDebtor ? (
                <div className="space-y-3">
                  <div style={{ textAlign: 'center' }}>
                    <UserOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ fontSize: '16px' }}>
                        {selectedDebtor.name}
                      </strong>
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {selectedDebtor.code}
                    </div>
                  </div>

                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="Total Debt"
                        value={selectedDebtor.currentDebt}
                        prefix="KES"
                        valueStyle={{ 
                          color: selectedDebtor.currentDebt > 0 ? '#ff4d4f' : '#52c41a',
                          fontSize: '14px'
                        }}
                        formatter={value => value.toLocaleString()}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Stations"
                        value={selectedDebtor.totalStations}
                        valueStyle={{ fontSize: '14px' }}
                      />
                    </Col>
                  </Row>

                  {selectedDebtor.phone && (
                    <div>
                      <strong>Phone:</strong>
                      <div style={{ color: '#666' }}>{selectedDebtor.phone}</div>
                    </div>
                  )}

                  {selectedDebtor.email && (
                    <div>
                      <strong>Email:</strong>
                      <div style={{ color: '#666' }}>{selectedDebtor.email}</div>
                    </div>
                  )}

                  <div>
                    <strong>Category:</strong>
                    <div>
                      <Tag color={selectedDebtor.isPaymentProcessor ? 'green' : 'blue'}>
                        {selectedDebtor.category}
                        {selectedDebtor.isPaymentProcessor && ' (Payment Method)'}
                      </Tag>
                    </div>
                  </div>

                  {/* Station Breakdown */}
                  {selectedDebtor.stationAccounts && (
                    <div>
                      <strong>Debt by Station:</strong>
                      {selectedDebtor.stationAccounts.map(account => (
                        <div key={account.stationId} style={{ 
                          fontSize: '12px',
                          padding: '4px 0',
                          borderBottom: '1px solid #f0f0f0'
                        }}>
                          {account.stationName}: KES {account.currentDebt.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={handleConfirm}
                      block
                    >
                      Confirm Selection
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 0',
                  color: '#999'
                }}>
                  <UserOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>Select a debtor from the search results</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Search Tips */}
        <Alert
          message="Search Tips"
          description="You can search by debtor name, code, phone number, or email address. Payment processors are also included in search results."
          type="info"
          showIcon
        />

        {/* Action Buttons */}
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={handleClose} icon={<CloseOutlined />}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handleConfirm}
              disabled={!selectedDebtor}
              icon={<CheckOutlined />}
            >
              Use Selected Debtor
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default DebtorSearch;