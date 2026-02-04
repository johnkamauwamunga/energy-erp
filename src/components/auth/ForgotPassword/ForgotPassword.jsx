import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Divider,
  Space,
  Typography,
  Layout,
  Row,
  Col,
  message,
  Progress,
  List,
  Steps
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { userService } from '../../../services/userService/userService';

const { Title, Text, Link } = Typography;
const { Content } = Layout;
const { Step } = Steps;

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  const navigate = useNavigate();

  // Password strength checker
  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password)
    });
  };

  const getPasswordStrengthScore = () => {
    const { hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar } = passwordStrength;
    const requirements = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar];
    return requirements.filter(Boolean).length;
  };

  const getStrengthColor = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return '#ff4d4f'; // red
    if (score <= 3) return '#faad14'; // orange
    if (score === 4) return '#1890ff'; // blue
    return '#52c41a'; // green
  };

  const getStrengthText = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score === 4) return 'Good';
    return 'Strong';
  };

  const handleResetPassword = async (values) => {
    setLoading(true);
    setError('');

    try {
      const resetData = {
        email: values.email.trim().toLowerCase(),
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword
      };

      console.log('🟢 [FRONTEND] Sending reset payload:', resetData);

      const result = await userService.resetPasswordByEmail(resetData);
      
      if (result.success) {
        setSuccess(true);
        message.success('Password reset successful! Redirecting to login...');
        console.log('✅ [FRONTEND] Password reset successful for:', values.email);
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.message || 'Password reset failed. Please try again.');
        message.error(result.message || 'Password reset failed');
      }
    } catch (err) {
      console.error('❌ [FRONTEND] Password reset error:', err);
      
      // Enhanced error handling
      if (err.response?.status === 404) {
        setError('No account found with this email address');
      } else if (err.response?.status === 400) {
        setError(err.message || 'Invalid request. Please check your input and try again.');
      } else if (err.response?.status === 422) {
        setError(err.message || 'Password does not meet security requirements');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      message.error(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const validatePasswordMatch = (_, value) => {
    const newPassword = form.getFieldValue('newPassword');
    if (value && value !== newPassword) {
      return Promise.reject(new Error('Passwords do not match!'));
    }
    return Promise.resolve();
  };

  // Success screen
  if (success) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Content style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Row justify="center" style={{ width: '100%', maxWidth: 1200 }}>
            <Col xs={24} sm={20} md={16} lg={12} xl={8}>
              
              {/* Back to Login Button */}
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/login')}
                style={{ 
                  color: 'white', 
                  marginBottom: 16,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                Back to Login
              </Button>

              {/* Success Card */}
              <Card
                style={{
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '32px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <CheckCircleOutlined style={{ fontSize: 40, color: 'white' }} />
                    </div>
                    <Title level={2} style={{ margin: 0, color: '#262626' }}>
                      Password Reset Successful!
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                      Your password has been successfully reset. You will be redirected to the login page shortly.
                    </Text>
                  </Space>
                </div>

                <Steps current={2} style={{ marginBottom: 32 }}>
                  <Step title="Enter Email" description="Verification" />
                  <Step title="Set Password" description="Security" />
                  <Step title="Complete" description="Success" />
                </Steps>

                <Button
                  type="primary"
                  onClick={() => navigate('/login')}
                  block
                  size="large"
                  style={{ 
                    height: 48,
                    fontSize: 16,
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                    marginTop: 16
                  }}
                >
                  Back to Login
                </Button>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Row justify="center" style={{ width: '100%', maxWidth: 1200 }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={8}>
            
            {/* Back to Login Button */}
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/login')}
              style={{ 
                color: 'white', 
                marginBottom: 16,
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              Back to Login
            </Button>

            {/* Reset Password Card */}
            <Card
              style={{
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid #e8e8e8'
              }}
              bodyStyle={{ padding: '32px' }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Space direction="vertical" size="middle">
                  <div style={{ 
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <SafetyCertificateOutlined style={{ fontSize: 28, color: 'white' }} />
                  </div>
                  <Title level={2} style={{ margin: 0, color: '#262626' }}>
                    Reset Password
                  </Title>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    Enter your email and set a new password
                  </Text>
                </Space>
              </div>

              <Steps current={1} style={{ marginBottom: 32 }}>
                <Step title="Enter Email" description="Verification" />
                <Step title="Set Password" description="Security" />
                <Step title="Complete" description="Success" />
              </Steps>

              {/* Error Alert */}
              {error && (
                <Alert
                  message="Reset Error"
                  description={error}
                  type="error"
                  showIcon
                  closable
                  style={{ marginBottom: 24 }}
                  onClose={() => setError('')}
                />
              )}

              {/* Reset Form */}
              <Form
                form={form}
                name="resetPassword"
                onFinish={handleResetPassword}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                size="large"
                layout="vertical"
              >
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: 'Please input your email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item
                  label="New Password"
                  name="newPassword"
                  rules={[
                    { required: true, message: 'Please input your new password!' },
                    () => ({
                      validator(_, value) {
                        if (!value) {
                          return Promise.resolve();
                        }
                        
                        const validation = userService.validatePasswordStrength(value);
                        if (!validation.isValid) {
                          return Promise.reject(new Error(validation.errors[0]));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    iconRender={(visible) => 
                      visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                    }
                    onChange={(e) => checkPasswordStrength(e.target.value)}
                  />
                </Form.Item>

                {/* Password Strength Indicator */}
                {form.getFieldValue('newPassword') && (
                  <div style={{ marginBottom: 24 }}>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text>Password Strength</Text>
                      <Text strong style={{ color: getStrengthColor() }}>
                        {getStrengthText()}
                      </Text>
                    </Row>
                    <Progress 
                      percent={(getPasswordStrengthScore() / 5) * 100} 
                      showInfo={false}
                      strokeColor={getStrengthColor()}
                      size="small"
                    />
                    
                    <List
                      size="small"
                      dataSource={[
                        { label: 'At least 8 characters', valid: passwordStrength.hasMinLength },
                        { label: 'One uppercase letter', valid: passwordStrength.hasUpperCase },
                        { label: 'One lowercase letter', valid: passwordStrength.hasLowerCase },
                        { label: 'One number', valid: passwordStrength.hasNumber },
                        { label: 'One special character', valid: passwordStrength.hasSpecialChar }
                      ]}
                      renderItem={item => (
                        <List.Item style={{ padding: '4px 0' }}>
                          <Text type={item.valid ? "success" : "secondary"} style={{ fontSize: 12 }}>
                            {item.valid ? '✓ ' : '○ '}{item.label}
                          </Text>
                        </List.Item>
                      )}
                      style={{ marginTop: 8 }}
                    />
                  </div>
                )}

                <Form.Item
                  label="Confirm New Password"
                  name="confirmPassword"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Please confirm your password!' },
                    { validator: validatePasswordMatch }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    iconRender={(visible) => 
                      visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    style={{ 
                      height: 48,
                      fontSize: 16,
                      background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                      border: 'none'
                    }}
                    disabled={getPasswordStrengthScore() < 5}
                  >
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Ensure your password meets all security requirements
                </Text>
              </Divider>

              {/* Security Tips */}
              <Alert
                message="Password Security Tips"
                description={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Use a combination of letters, numbers, and special characters</li>
                    <li>Avoid using personal information like your name or birthdate</li>
                    <li>Don't reuse passwords from other accounts</li>
                    <li>Consider using a password manager</li>
                  </ul>
                }
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />

              {/* Version Info */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Fuel Management System v1.0
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default ForgotPassword;