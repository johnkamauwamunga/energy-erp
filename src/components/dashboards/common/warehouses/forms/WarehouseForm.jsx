// pages/warehouse/warehouse/WarehouseForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space, 
  Alert, 
  message, 
  Select,
  Typography,
  Divider,
  Card
} from 'antd';
import { 
  ShopOutlined, 
  HomeOutlined,
  DatabaseOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { warehouseService } from '../../../../../services/warehouseService/warehouseService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const WarehouseForm = ({ isOpen, onClose, onWarehouseCreated, warehouse, user }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stations, setStations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Load stations and assets
  useEffect(() => {
    if (isOpen) {
      loadStations();
      loadAssets();
      
      if (warehouse) {
        // Edit mode
        form.setFieldsValue({
          name: warehouse.name,
          stationId: warehouse.stationId,
          assetId: warehouse.assetId,
          description: warehouse.description
        });
      } else {
        // Create mode
        form.resetFields();
      }
    }
  }, [isOpen, warehouse, form]);

  const loadStations = async () => {
    try {
      // Fetch stations for the user's company
      const stationsData = []; // await stationService.getStationsForCompany(user.companyId);
      setStations(stationsData);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadAssets = async () => {
    try {
      // Fetch assets of type 'WAREHOUSE' for the user's company
      const assetsData = []; // await assetService.getAssets({ 
      //   type: 'WAREHOUSE', 
      //   companyId: user.companyId 
      // });
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');
      setValidationErrors({});

      // Client-side validation
      const validation = warehouseService.validateWarehouse(values, !!warehouse);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        message.error('Please fix validation errors');
        return;
      }

      if (warehouse) {
        // Update warehouse
        await warehouseService.updateWarehouse(warehouse.id, values);
        message.success('Warehouse updated successfully');
      } else {
        // Create warehouse - NO companyId needed
        await warehouseService.createWarehouse(values);
        message.success('Warehouse created successfully');
      }

      onWarehouseCreated();
      onClose();
    } catch (error) {
      setError(error.message);
      message.error(error.message || 'Failed to save warehouse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ShopOutlined />
          <span>{warehouse ? 'Edit Warehouse' : 'Create Warehouse'}</span>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnClose
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4}>
            <Text strong>
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              Warehouse Information
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {warehouse ? 'Update warehouse details' : 'Create a new warehouse'}
            </Text>
          </Space>
        </Card>

        <Form.Item
          name="name"
          label="Warehouse Name"
          validateStatus={validationErrors.name ? 'error' : ''}
          help={validationErrors.name}
          rules={[
            { required: true, message: 'Please enter warehouse name' },
            { max: 100, message: 'Name cannot exceed 100 characters' }
          ]}
        >
          <Input 
            placeholder="e.g., Nairobi Main Warehouse" 
            prefix={<ShopOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="stationId"
          label="Station (Optional)"
          validateStatus={validationErrors.stationId ? 'error' : ''}
          help={validationErrors.stationId}
        >
          <Select
            placeholder="Select station (optional)"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {stations.map(station => (
              <Option key={station.id} value={station.id}>
                <Space>
                  <HomeOutlined />
                  <Text>{station.name}</Text>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="assetId"
          label="Asset (Optional)"
          validateStatus={validationErrors.assetId ? 'error' : ''}
          help={validationErrors.assetId}
        >
          <Select
            placeholder="Select asset (optional)"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {assets.map(asset => (
              <Option key={asset.id} value={asset.id}>
                <Space>
                  <DatabaseOutlined />
                  <Text>{asset.name}</Text>
                  <Text type="secondary">({asset.type})</Text>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
        >
          <TextArea 
            placeholder="Add warehouse description, location details, or special instructions"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Divider />

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {warehouse ? 'Update' : 'Create'} Warehouse
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default WarehouseForm;