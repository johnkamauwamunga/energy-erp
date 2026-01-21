// src/components/Shortages/CreateShortageModal.jsx
import React, { useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  message,
  Steps,
  Alert,
  Spin
} from 'antd';
import {
  AccountBookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import CreateShortageForm from './CreateShortageForm';

const { Title, Text } = Typography;
const { Step } = Steps;

const CreateShortageModal = ({
  visible,
  onCancel,
  onSuccess,
  currentUser,
  currentStation,
  title = "Record New Shortage",
  width = 700,
  showSteps = false
}) => {
  const [form] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const handleFormSubmit = async (values) => {
    // This will be called from the form component
    return true;
  };

  const handleModalOk = () => {
    if (form) {
      form.submit();
    }
  };

  const handleFormSuccess = (shortage) => {
    setSubmissionStatus('success');
    message.success('Shortage recorded successfully!');
    
    // Reset after delay
    setTimeout(() => {
      setSubmissionStatus(null);
      setCurrentStep(0);
      if (onSuccess) {
        onSuccess(shortage);
      }
    }, 1500);
  };

  const handleCancel = () => {
    setSubmissionStatus(null);
    setCurrentStep(0);
    if (onCancel) {
      onCancel();
    }
  };

  const steps = [
    {
      title: 'Fill Details',
      content: 'Enter shortage information',
    },
    {
      title: 'Review',
      content: 'Review before submission',
    },
    {
      title: 'Submit',
      content: 'Record shortage',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <AccountBookOutlined />
          <span>{title}</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={width}
      footer={submissionStatus === 'success' ? null : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {showSteps && steps.length > 1 && (
              <Text type="secondary">
                Step {currentStep + 1} of {steps.length}
              </Text>
            )}
          </div>
          <Space>
            <Button onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleModalOk}
              loading={submitting}
              icon={<AccountBookOutlined />}
            >
              Record Shortage
            </Button>
          </Space>
        </div>
      )}
      maskClosable={!submitting}
      keyboard={!submitting}
      destroyOnClose={true}
      centered
    >
      {submissionStatus === 'success' ? (
        <div className="text-center py-8">
          <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
          <Title level={3} className="mt-4" style={{ color: '#52c41a' }}>
            Success!
          </Title>
          <Text type="secondary">
            Shortage has been recorded successfully.
          </Text>
          <div className="mt-4">
            <Spin size="large" />
            <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
              Closing in a moment...
            </Text>
          </div>
        </div>
      ) : submissionStatus === 'error' ? (
        <div className="text-center py-8">
          <CloseCircleOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />
          <Title level={3} className="mt-4" style={{ color: '#ff4d4f' }}>
            Error!
          </Title>
          <Text type="secondary">
            Failed to record shortage. Please try again.
          </Text>
          <div className="mt-4">
            <Button type="primary" onClick={() => setSubmissionStatus(null)}>
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {showSteps && steps.length > 1 && (
            <>
              <Steps current={currentStep} className="mb-6">
                {steps.map(item => (
                  <Step key={item.title} title={item.title} />
                ))}
              </Steps>
              <Alert
                message={steps[currentStep].content}
                type="info"
                showIcon
                className="mb-4"
              />
            </>
          )}
          
          <CreateShortageForm
            formRef={form}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
            currentUser={currentUser}
            currentStation={currentStation}
            showSteps={showSteps}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            submitting={submitting}
            setSubmitting={setSubmitting}
          />
        </>
      )}
    </Modal>
  );
};

export default CreateShortageModal;