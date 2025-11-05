import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space,
  Alert,
  Spin
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined 
} from '@ant-design/icons';
import { useApp } from '../../../../context/AppContext';
import { stationService } from '../../../../services/stationService/stationService';

const CreateStationsModal = ({ isOpen, onClose, editingStation, onSuccess, refreshStations }) => {
  const { state, dispatch } = useApp();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens or when editingStation changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingStation) {
        // Prefill form for editing
        form.setFieldsValue({
          name: editingStation.name || '',
          location: editingStation.location || '',
          warehouseName: '' // You might need to adjust this based on your data structure
        });
      } else {
        // Reset form for creation
        form.resetFields();
      }
    }
  }, [isOpen, editingStation, form]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      let response;
      
      if (editingStation) {
        // Update existing station
        response = await stationService.updateStation(editingStation.id, values);
        
        if (response.success) {
          // Dispatch update action
          dispatch({ 
            type: 'UPDATE_STATION', 
            payload: {
              ...editingStation,
              ...values,
              ...response.data
            }
          });
          
          // Call success callback and refresh
          if (onSuccess) onSuccess();
          if (refreshStations) refreshStations();
        } else {
          throw new Error(response.message || 'Failed to update station');
        }
      } else {
        // Create new station
        response = await stationService.createStation(values);

        console.log("Station creation response:", response);
        
        // Handle different response formats
        if (response.id || response.success) {
          const newStation = response.data || response;
          
          // Dispatch add action with proper structure
          dispatch({ 
            type: 'ADD_STATION', 
            payload: {
              id: newStation.id,
              name: values.name,
              location: values.location,
              companyId: newStation.companyId || state.currentUser?.companyId,
              createdAt: newStation.createdAt || new Date().toISOString(),
              updatedAt: newStation.updatedAt || new Date().toISOString(),
              warehousesCount: 0, // New station starts with 0 warehouses
              companyName: newStation.companyName || state.currentUser?.companyName
            }
          });
          
          // Call success callback and refresh
          if (onSuccess) onSuccess();
          if (refreshStations) refreshStations();
        } else {
          throw new Error(response.message || 'Failed to create station');
        }
      }
    } catch (error) {
      console.error(`Failed to ${editingStation ? 'update' : 'create'} station:`, error);
      
      // Handle specific error cases
      let errorMessage = error.message || `Failed to ${editingStation ? 'update' : 'create'} station`;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes('already exists')) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError(null);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          {editingStation ? <EditOutlined /> : <PlusOutlined />}
          {editingStation ? 'Edit Station' : 'Create New Station'}
        </Space>
      }
      open={isOpen}
      onCancel={handleCancel}
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
        disabled={isSubmitting}
      >
        <Form.Item
          label="Station Name"
          name="name"
          rules={[
            { required: true, message: 'Please enter station name' },
            { min: 2, message: 'Station name must be at least 2 characters' }
          ]}
        >
          <Input 
            placeholder="Enter station name" 
            disabled={isSubmitting}
          />
        </Form.Item>
        
        <Form.Item
          label="Location"
          name="location"
        >
          <Input 
            placeholder="Enter station location" 
            disabled={isSubmitting}
          />
        </Form.Item>
        
        <Form.Item
          label="Warehouse Name"
          name="warehouseName"
          help="If provided, a warehouse will be created with this name for the station"
        >
          <Input 
            placeholder="Enter warehouse name (optional)" 
            disabled={isSubmitting}
          />
        </Form.Item>
        
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={isSubmitting}
              icon={editingStation ? <EditOutlined /> : <PlusOutlined />}
            >
              {editingStation ? 'Update Station' : 'Create Station'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      
      {isSubmitting && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Spin tip={editingStation ? "Updating station..." : "Creating station..."} />
        </div>
      )}
    </Modal>
  );
};

export default CreateStationsModal;