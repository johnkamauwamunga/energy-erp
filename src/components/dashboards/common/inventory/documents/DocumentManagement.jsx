// src/pages/inventory/documents/DocumentManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Table,
  Upload,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Avatar,
  List,
  Divider,
  Alert,
  Badge,
  Tooltip,
  Popconfirm,
  message
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { nonFuelPurchaseService } from '../../../services/nonFuelPurchaseService';

const { Option } = Select;
const { Search } = Input;

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm] = Form.useForm();
  const [selectedReceiving, setSelectedReceiving] = useState(null);
  const [receivings, setReceivings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');

  useEffect(() => {
    loadReceivings();
    loadDocuments();
  }, []);

  const loadReceivings = async () => {
    try {
      const result = await nonFuelPurchaseService.getReceivings({ limit: 100 });
      setReceivings(result.data || []);
    } catch (error) {
      console.error('Failed to load receivings:', error);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch all documents
      // For now, we'll simulate with data from receivings
      const allDocuments = [];
      
      // Get documents from each receiving
      for (const receiving of receivings.slice(0, 10)) {
        if (receiving.documents?.length > 0) {
          allDocuments.push(...receiving.documents.map(doc => ({
            ...doc,
            receivingNumber: receiving.receivingNumber,
            purchaseNumber: receiving.purchase?.purchaseNumber
          })));
        }
      }
      
      setDocuments(allDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values) => {
    if (!selectedReceiving) {
      message.error('Please select a receiving first');
      return;
    }

    try {
      // In a real implementation, this would upload the file
      // and then create the document record
      message.success('Document uploaded successfully');
      uploadForm.resetFields();
      setShowUploadModal(false);
      loadDocuments();
    } catch (error) {
      message.error('Failed to upload document: ' + error.message);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await nonFuelPurchaseService.deleteReceivingDocument(documentId);
      message.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      message.error('Failed to delete document: ' + error.message);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImageOutlined style={{ color: '#52c41a' }} />;
      case 'xls':
      case 'xlsx':
        return <FileExcelOutlined style={{ color: '#52c41a' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  const documentTypes = [
    'DELIVERY_NOTE',
    'SUPPLIER_INVOICE',
    'INSPECTION_PHOTO',
    'QUALITY_REPORT',
    'WAYBILL',
    'OTHER'
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.receivingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = documentTypeFilter === 'all' || doc.documentType === documentTypeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="document-management">
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Document Management</h3>
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload Document
                </Button>
              </Space>
            </div>
          </Col>
          
          <Col span={24}>
            <Space wrap>
              <Search
                placeholder="Search documents..."
                style={{ width: 300 }}
                allowClear
                onSearch={setSearchTerm}
              />
              
              <Select
                placeholder="Document Type"
                style={{ width: 200 }}
                value={documentTypeFilter}
                onChange={setDocumentTypeFilter}
              >
                <Option value="all">All Types</Option>
                {documentTypes.map(type => (
                  <Option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </Option>
                ))}
              </Select>
              
              <Select
                placeholder="Receiving"
                style={{ width: 200 }}
                onChange={(value) => setSelectedReceiving(value)}
                allowClear
              >
                {receivings.map(receiving => (
                  <Option key={receiving.id} value={receiving.id}>
                    {receiving.receivingNumber}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Alert
        message="Document Storage"
        description="All documents related to receivings are stored here. You can view, download, or delete documents as needed."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title={
        <Space>
          <span>Documents ({filteredDocuments.length})</span>
          <Badge 
            count={documents.filter(d => d.documentType === 'INSPECTION_PHOTO').length} 
            style={{ backgroundColor: '#52c41a' }}
            title="Inspection Photos"
          />
          <Badge 
            count={documents.filter(d => d.documentType === 'SUPPLIER_INVOICE').length} 
            style={{ backgroundColor: '#1890ff' }}
            title="Supplier Invoices"
          />
        </Space>
      }>
        {filteredDocuments.length > 0 ? (
          <Table
            dataSource={filteredDocuments}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            columns={[
              {
                title: 'Document',
                dataIndex: 'fileName',
                key: 'fileName',
                render: (fileName, record) => (
                  <Space>
                    <Avatar icon={getFileIcon(fileName)} />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{fileName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {record.documentType?.replace(/_/g, ' ')}
                        {record.documentNumber && ` • ${record.documentNumber}`}
                      </div>
                    </div>
                  </Space>
                )
              },
              {
                title: 'Receiving',
                dataIndex: 'receivingNumber',
                key: 'receivingNumber',
                render: (text, record) => (
                  <div>
                    <div>{text}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Purchase: {record.purchaseNumber}
                    </div>
                  </div>
                )
              },
              {
                title: 'Uploaded',
                dataIndex: 'uploadedAt',
                key: 'uploadedAt',
                render: (date) => (
                  <div>
                    <div>{new Date(date).toLocaleDateString()}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(date).toLocaleTimeString()}
                    </div>
                  </div>
                )
              },
              {
                title: 'Uploaded By',
                dataIndex: ['uploadedBy', 'firstName'],
                key: 'uploadedBy',
                render: (firstName, record) => 
                  `${firstName || ''} ${record.uploadedBy?.lastName || ''}`.trim() || 'Unknown'
              },
              {
                title: 'File Size',
                dataIndex: 'fileSize',
                key: 'fileSize',
                render: (size) => size ? `${(size / 1024).toFixed(2)} KB` : 'N/A'
              },
              {
                title: 'Actions',
                key: 'actions',
                fixed: 'right',
                render: (_, record) => (
                  <Space>
                    <Tooltip title="View">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => window.open(record.fileUrl, '_blank')}
                      />
                    </Tooltip>
                    <Tooltip title="Download">
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = record.fileUrl;
                          link.download = record.fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Are you sure you want to delete this document?"
                      onConfirm={() => handleDeleteDocument(record.id)}
                    >
                      <Tooltip title="Delete">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                )
              }
            ]}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <FolderOpenOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
            <div style={{ marginTop: 16, color: '#666' }}>
              {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your filters'}
            </div>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => setShowUploadModal(true)}
              style={{ marginTop: 16 }}
            >
              Upload First Document
            </Button>
          </div>
        )}
      </Card>

      {/* Upload Document Modal */}
      <Modal
        title="Upload Document"
        open={showUploadModal}
        onCancel={() => {
          setShowUploadModal(false);
          uploadForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Document Requirements"
          description="Upload supporting documents for receivings. Maximum file size is 10MB."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleUpload}
        >
          <Form.Item
            name="receivingId"
            label="Receiving"
            rules={[{ required: true, message: 'Please select a receiving' }]}
          >
            <Select
              placeholder="Select receiving"
              style={{ width: '100%' }}
            >
              {receivings.map(receiving => (
                <Option key={receiving.id} value={receiving.id}>
                  {receiving.receivingNumber} - {receiving.purchase?.purchaseNumber}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="documentType"
            label="Document Type"
            rules={[{ required: true, message: 'Please select document type' }]}
          >
            <Select
              placeholder="Select document type"
              style={{ width: '100%' }}
            >
              {documentTypes.map(type => (
                <Option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="documentNumber"
            label="Document Number"
            rules={[{ max: 100, message: 'Max 100 characters' }]}
          >
            <Input placeholder="e.g., DN-2024-001, INV-7890" />
          </Form.Item>

          <Form.Item
            name="documentDate"
            label="Document Date"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="Select document date"
            />
          </Form.Item>

          <Form.Item
            name="file"
            label="File"
            rules={[{ required: true, message: 'Please select a file' }]}
          >
            <Upload.Dragger
              name="file"
              multiple={false}
              maxCount={1}
              beforeUpload={() => false} // Prevent auto upload
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for single file upload. Maximum size: 10MB
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
            rules={[{ max: 500, message: 'Max 500 characters' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Add notes about this document..."
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setShowUploadModal(false);
                uploadForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
                Upload Document
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentManagement;