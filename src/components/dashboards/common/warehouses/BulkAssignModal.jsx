// pages/warehouse/warehouse/BulkAssignModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Select, 
  Button, 
  Space, 
  Alert, 
  message, 
  List,
  Tag,
  Typography
} from 'antd';
import { 
  HomeOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { warehouseService } from '../../../../services/warehouseService/warehouseService';

const { Title, Text } = Typography;
const { Option } = Select;

const BulkAssignModal = ({ isOpen, onClose, warehouseIds, onAssignComplete }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stations, setStations] = useState([]);
  const [selectedStations, setSelectedStations] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadStations();
      form.resetFields();
    }
  }, [isOpen, form]);

  const loadStations = async () => {
    try {
      setLoading(true);
      // This would come from a station service
      const stationsData = []; // await stationService.getStations();
      setStations(stationsData);
    } catch (error) {
      message.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  const handleStationChange = (warehouseId, stationId) => {
    setSelectedStations(prev => ({
      ...prev,
      [warehouseId]: stationId
    }));
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setError('');

      const { stationId } = values;
      
      if (!stationId) {
        setError('Please select a station');
        return;
      }

      // Validate assignment
      const validation = warehouseService.validateBulkAssignment({
        warehouseIds,
        stationId
      });

      if (!validation.isValid) {
        setError(validation.errors[Object.keys(validation.errors)[0]]);
        return;
      }

      // Perform bulk assignment
      await warehouseService.bulkAssignToStation(warehouseIds, stationId);
      
      message.success(`Successfully assigned ${warehouseIds.length} warehouses`);
      onAssignComplete();
      onClose();
    } catch (error) {
      setError(error.message);
      message.error(error.message || 'Failed to assign warehouses');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <HomeOutlined />
          <span>Bulk Assign Warehouses</span>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text>
          Assigning <Tag color="blue">{warehouseIds.length}</Tag> warehouses to a station.
        </Text>
      </div>

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
      >
        <Form.Item
          name="stationId"
          label="Select Station"
          rules={[{ required: true, message: 'Please select a station' }]}
        >
          <Select
            placeholder="Choose station"
            loading={loading}
            showSearch
            optionFilterProp="children"
            notFoundContent={loading ? <LoadingOutlined /> : 'No stations found'}
          >
            {stations.map(station => (
              <Option key={station.id} value={station.id}>
                <Space>
                  <HomeOutlined />
                  <Text>{station.name}</Text>
                  {station.company && (
                    <Text type="secondary">({station.company.name})</Text>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div style={{ margin: '24px 0' }}>
          <Text strong>Warehouses to assign:</Text>
          <List
            size="small"
            dataSource={warehouseIds}
            renderItem={(warehouseId, index) => (
              <List.Item>
                <Space style={{ width: '100%' }} justify="space-between">
                  <Text type="secondary">Warehouse {index + 1}</Text>
                  <Text code>{warehouseId.substring(0, 8)}...</Text>
                </Space>
              </List.Item>
            )}
            locale={{ emptyText: 'No warehouses selected' }}
          />
        </div>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              icon={<CheckCircleOutlined />}
            >
              Assign to Station
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BulkAssignModal;