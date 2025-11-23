// src/components/dashboards/common/debtTransfer/forms/CashSettlementForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Space,
  Card,
  Divider,
  Alert,
  Row,
  Col,
  Descriptions,
  Tag
} from 'antd';
import {
  DollarOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { debtTransferService } from '../../../../../services/debtTransferService/debtTransferService';
import { debtorService } from '../../../../../services/debtorService/debtorService';
import {useApp} from '../../../../../context/AppContext'

const { Option } = Select;
const { TextArea } = Input;

const CashSettlementForm = ({ onSuccess, currentShift }) => {
  const [form] = Form.useForm();
  const {state}= useApp();
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [stationDebt, setStationDebt] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const currentStation= state.currentStation?.id;
  const stationName=state.currentStation?.name;

  useEffect(() => {
    loadDebtors();
  }, []);

  const loadDebtors = async () => {
    try {
      const debtorsData = await debtorService.getDebtors();
      console.log('Debtors data:', debtorsData);
      
      // Filter debtors who have debt at the current station
      const filteredDebtors = (debtorsData?.data || debtorsData || []).filter(debtor => {
        if (!currentStation) return true;
        
        // Check if debtor has an account at this station with debt
        const stationAccount = debtor.stationDebtorAccount?.find(
          account => account.stationId === currentStation
        );

       // console.log("station debtor account:", debtor.stationDebtorAccount?.station);
        return stationAccount && stationAccount.currentDebt > 0;
      });
      
      setDebtors(filteredDebtors);
    } catch (error) {
      console.error('Failed to load debtors:', error);
      message.error('Failed to load debtors data');
    }
  };

  // Filter debtors based on search query
  const filteredDebtors = useMemo(() => {
    if (!searchQuery.trim()) return debtors;

    const query = searchQuery.toLowerCase().trim();
    
    return debtors.filter(debtor => {
      // Search by name
      const nameMatch = debtor.name?.toLowerCase().includes(query);
      
      // Search by code
      const codeMatch = debtor.code?.toLowerCase().includes(query);
      
      // Search by category name
      const categoryMatch = debtor.category?.name?.toLowerCase().includes(query);
      
      // Search by phone
      const phoneMatch = debtor.phone?.toLowerCase().includes(query);
      
      // Search by email
      const emailMatch = debtor.email?.toLowerCase().includes(query);

      return nameMatch || codeMatch || categoryMatch || phoneMatch || emailMatch;
    });
  }, [debtors, searchQuery]);

  const handleDebtorChange = (debtorId) => {
    const debtor = debtors.find(d => d.id === debtorId);
    setSelectedDebtor(debtor);
    
    // Calculate debt at current station
    if (debtor && currentStation) {
      const stationAccount = debtor.stationDebtorAccount?.find(
        account => account.stationId === currentStation
      );
      setStationDebt(stationAccount?.currentDebt || 0);
    } else {
      setStationDebt(debtor?.currentDebt || 0);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const submissionData = {
        ...values,
        paymentType: 'CASH',
        shiftId: currentShift?.id,
        stationId: currentStation,
      };
      
      const result = await debtTransferService.processCashSettlement(submissionData);
      
      message.success(
        `Cash settlement processed successfully! Transfer #: ${result.data?.transferNumber}`
      );
      
      form.resetFields();
      setSelectedDebtor(null);
      setStationDebt(0);
      setSearchQuery('');
      
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(`Failed to process cash settlement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (_, value) => {
    if (value && value > stationDebt) {
      return Promise.reject(`Amount cannot exceed current debt of KES ${stationDebt.toLocaleString()}`);
    }
    return Promise.resolve();
  };

  // Custom dropdown renderer with search
  const dropdownRender = (menu) => (
    <div>
      <div style={{ padding: '8px', borderBottom: '1px solid #d9d9d9' }}>
        <Input
          placeholder="Search by name, code, category, phone, or email..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {menu}
      </div>
      {filteredDebtors.length === 0 && searchQuery && (
        <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
          No debtors found matching "{searchQuery}"
        </div>
      )}
    </div>
  );

  // Format debtor display in dropdown
  const renderDebtorOption = (debtor) => {
    const stationAccount = currentStation 
      ? debtor.stationDebtorAccount?.find(acc => acc.stationId === currentStation.id)
      : null;
    
    const displayDebt = stationAccount?.currentDebt || debtor.currentDebt;
    
    return (
      <Option key={debtor.id} value={debtor.id}>
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <div>
            <strong>{debtor.name}</strong>
            {debtor.code && <Tag size="small" style={{ marginLeft: 8 }}>{debtor.code}</Tag>}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            KES {displayDebt.toLocaleString()} • {debtor.category?.name}
            {currentStation && stationAccount && ` • ${stationAccount.station.name}`}
          </div>
          {debtor.phone && (
            <div style={{ fontSize: '11px', color: '#888' }}>
              📞 {debtor.phone}
              {debtor.email && ` • 📧 ${debtor.email}`}
            </div>
          )}
        </Space>
      </Option>
    );
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Cash Settlement"
        description="Process cash payments received directly from debtors at the station"
        type="info"
        showIcon
      />

      {/* Shift & Station Context */}
      <Card size="small">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Current Shift">
            {currentShift?.shiftNumber || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Station">
            {stationName || 'All Stations'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="debtorId"
              label="Select Debtor"
              rules={[{ required: true, message: 'Please select a debtor' }]}
            >
              <Select
                placeholder="Choose debtor or type to search..."
                onChange={handleDebtorChange}
                showSearch
                optionFilterProp="children"
                filterOption={false} // We handle filtering manually
                dropdownRender={dropdownRender}
                onSearch={setSearchQuery} // Fallback search
                loading={!debtors.length}
                notFoundContent={
                  searchQuery ? `No debtors found for "${searchQuery}"` : "No debtors available"
                }
              >
                {filteredDebtors.map(renderDebtorOption)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedDebtor && (
          <Card size="small" type="inner">
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Debtor" span={2}>
                <Space>
                  <strong>{selectedDebtor.name}</strong>
                  {selectedDebtor.code && <Tag>{selectedDebtor.code}</Tag>}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Current Debt">
                <span style={{ color: stationDebt > 0 ? '#ff4d4f' : '#52c41a' }}>
                  KES {stationDebt.toLocaleString()}
                </span>
              </Descriptions.Item>
              
              <Descriptions.Item label="Category">
                {selectedDebtor.category?.name}
              </Descriptions.Item>
              
              {selectedDebtor.phone && (
                <Descriptions.Item label="Phone">
                  <Space>
                    <PhoneOutlined />
                    {selectedDebtor.phone}
                  </Space>
                </Descriptions.Item>
              )}
              
              {selectedDebtor.email && (
                <Descriptions.Item label="Email">
                  <Space>
                    <MailOutlined />
                    {selectedDebtor.email}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        <Divider />

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="amount"
              label="Settlement Amount"
              rules={[
                { required: true, message: 'Please enter amount' },
                { type: 'number', min: 1, message: 'Amount must be positive' },
                { validator: validateAmount }
              ]}
            >
              <InputNumber
                placeholder="Enter amount"
                style={{ width: '100%' }}
                prefix={<DollarOutlined />}
                min={1}
                max={stationDebt}
                disabled={!selectedDebtor || stationDebt === 0}
                formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/KES\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="paymentReference"
              label="Payment Reference"
            >
              <Input placeholder="Receipt number, transaction ID, etc." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea
                placeholder="Additional notes about this settlement"
                rows={3}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<DollarOutlined />}
            size="large"
            block
            disabled={!selectedDebtor || !currentStation }
          >
            {stationDebt === 0 ? 'No Debt to Settle' : 'Process Cash Settlement'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CashSettlementForm;