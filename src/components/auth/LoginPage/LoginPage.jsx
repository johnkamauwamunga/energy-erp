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
  Switch,
  Layout,
  Row,
  Col,
  message,
  Tag  // Added Tag import
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../hooks/useAuth';

const { Title, Text, Link } = Typography;
const { Content } = Layout;

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("✅ LoginPage: User authenticated, redirecting...", {
        role: user.role,
        email: user.email
      });
      
      const redirectTimer = setTimeout(() => {
        redirectBasedOnRole(user.role);
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, user, navigate]);

  const redirectBasedOnRole = (role) => {
    const routes = {
      'SUPER_ADMIN': '/super-admin/dashboard',
      'COMPANY_ADMIN': '/company-admin/dashboard',
      'STATION_MANAGER': '/station-manager/dashboard',
      'SUPERVISOR': '/supervisor/dashboard',
      'ATTENDANT': '/attendant/dashboard'
    };
    
    navigate(routes[role] || '/dashboard');
  };

  const handleLogin = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await login(values.email, values.password);
      
      if (result.success) {
        message.success('Login successful!');
        // Redirect handled by useEffect
      } else {
        setError(result.message || 'Login failed. Please try again.');
        message.error(result.message || 'Login failed');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'An unexpected error occurred');
      message.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  // Show loading while initializing auth state
  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <RocketOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />
              <Title level={3}>Initializing</Title>
              <Text type="secondary">Checking authentication status...</Text>
            </Space>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Row justify="center" style={{ width: '100%', maxWidth: 1200 }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          
            {/* Back to Home Button */}
            <Button 
              type="text" 
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ 
                color: 'white', 
                marginBottom: 16,
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              Back to Home
            </Button>

            {/* Login Card */}
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
                    System Access
                  </Title>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    Sign in to your dashboard
                  </Text>
                </Space>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert
                  message="Authentication Error"
                  description={error}
                  type="error"
                  showIcon
                  closable
                  style={{ marginBottom: 24 }}
                  onClose={() => setError('')}
                />
              )}

              {/* Login Form */}
              <Form
                form={form}
                name="login"
                onFinish={handleLogin}
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
                    prefix={<UserOutlined />}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item
                  label="Password"
                  name="password"
                  rules={[{ required: true, message: 'Please input your password!' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Form.Item>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <Switch 
                          size="small" 
                          checked={rememberMe}
                          onChange={setRememberMe}
                        />
                        <Text>Remember me</Text>
                      </Space>
                    </Col>
                    <Col>
                      <Link href="/forgot-password" style={{ fontSize: 14 }}>
                        Forgot password?
                      </Link>
                    </Col>
                  </Row>
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
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Secure access with role-based permissions
                </Text>
              </Divider>

              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <Card 
                  size="small" 
                  title="Debug Info" 
                  style={{ marginTop: 16 }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Row justify="space-between">
                      <Text type="secondary">Status:</Text>
                      <Tag color={isAuthenticated ? 'green' : 'red'}>
                        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                      </Tag>
                    </Row>
                    <Row justify="space-between">
                      <Text type="secondary">User:</Text>
                      <Text strong>{user?.email || 'None'}</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text type="secondary">Role:</Text>
                      <Tag color="blue">{user?.role || 'None'}</Tag>
                    </Row>
                  </Space>
                </Card>
              )}

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

export default LoginPage;