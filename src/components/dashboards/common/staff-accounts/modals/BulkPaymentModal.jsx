// src/components/StaffAccounts/modals/BulkPaymentModal.jsx
import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Alert,
  DatePicker,
  Space,
  Row,
  Col,
  Switch,
  Card,
  Table,
  Tag
} from 'antd';
import { 
  TeamOutlined, 
  BankOutlined, 
  DollarOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';

const BulkPaymentModal = ({ 
  visible, 
  onCancel, 
  onOk, 
  confirmLoading,
  form,
  staffAccounts,
  selectedStaffIds,
  setSelectedStaffIds,
  isCompanyAdmin,
  bankAccounts,
  formErrors,
  onFinish
}) => {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allActiveIds = staffAccounts
        .filter(acc => acc.isActive && !acc.isOnHold)
        .map(acc => acc.id);
      setSelectedStaffIds(allActiveIds);
    } else {
      setSelectedStaffIds([]);
    }
  };

  const staffSelectionColumns = [
    {
      title: 'Select',
      dataIndex: 'id',
      key: 'select',
      render: (id, record) => (
        <input
          type="checkbox"
          checked={selectedStaffIds.includes(id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedStaffIds([...selectedStaffIds, id]);
            } else {
              setSelectedStaffIds(selectedStaffIds.filter(sid => sid !== id));
            }
          }}
          disabled={!record.isActive || record.isOnHold}
        />
      ),
      width: 60
    },
    {
      title: 'Staff',
      dataIndex: 'userDisplayName',
      key: 'staff',
      render: (name, record) => (
        <Space>
          <span>{name}</span>
          {record.isOnHold && <Tag color="orange">On Hold</Tag>}
          {!record.isActive && <Tag color="red">Inactive</Tag>}
        </Space>
      )
    },
    {
      title: 'Balance',
      dataIndex: 'currentBalanceDisplay',
      key: 'balance',
      render: (display, record) => (
        <span style={{ color: record.currentBalanceColor }}>
          {display}
        </span>
      )
    },
    {
      title: 'Salary',
      dataIndex: 'salaryAmountDisplay',
      key: 'salary'
    },
    {
      title: 'Shortages',
      dataIndex: 'totalShortagesDisplay',
      key: 'shortages',
      render: (display, record) => (
        <Tag color={record.hasShortages ? 'red' : 'green'}>
          {display}
        </Tag>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          Bulk Payments
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="Process Payments"
      cancelText="Cancel"
      width={800}
      confirmLoading={confirmLoading}
      style={{ top: 20 }}
    >
      {formErrors.length > 0 && (
        <Alert
          message="Validation Error"
          description={
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Alert
        message={`Selected ${selectedStaffIds.length} staff members for payment`}
        type="info"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          deductShortages: true,
          deductAdvances: true
        }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Card 
              title="Select Staff Members" 
              size="small"
              extra={
                <Switch
                  checked={selectAll}
                  onChange={handleSelectAll}
                  checkedChildren="All"
                  unCheckedChildren="None"
                />
              }
            >
              <Table
                columns={staffSelectionColumns}
                dataSource={staffAccounts}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="paymentDate"
              label="Payment Date"
              rules={[{ required: true, message: 'Please select payment date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="paymentMethod"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select placeholder="Select payment method">
                <Select.Option value="STATION_WALLET">Station Wallet</Select.Option>
                <Select.Option value="BANK_TRANSFER">Bank Transfer</Select.Option>
                <Select.Option value="MOBILE_MONEY">Mobile Money</Select.Option>
                <Select.Option value="CASH">Cash</Select.Option>
                <Select.Option value="MIXED">Mixed</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="paymentSource"
              label="Payment Source"
              rules={[{ required: true, message: 'Please select payment source' }]}
            >
              <Select placeholder="Select payment source">
                <Select.Option value="STATION_WALLET">Station Wallet</Select.Option>
                <Select.Option value="BANK_ACCOUNT">Bank Account</Select.Option>
                <Select.Option value="PETTY_CASH">Petty Cash</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          {isCompanyAdmin && (
            <Col span={12}>
              <Form.Item
                name="bankAccountId"
                label="Bank Account (Optional)"
              >
                <Select
                  placeholder="Select bank account"
                  allowClear
                  suffixIcon={<BankOutlined />}
                >
                  {bankAccounts.map(account => (
                    <Select.Option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          )}
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="periodStart"
              label="Period Start"
              rules={[{ required: true, message: 'Please select period start' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="periodEnd"
              label="Period End"
              rules={[{ required: true, message: 'Please select period end' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="deductShortages"
              label="Deduct Shortages"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="deductAdvances"
              label="Deduct Advances"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Payment Description"
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <Input.TextArea
            placeholder="Enter payment description"
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BulkPaymentModal;