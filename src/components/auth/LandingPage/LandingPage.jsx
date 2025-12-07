import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  Row,
  Col,
  Card,
  Button,
  Typography,
  Space,
  Divider,
  Avatar,
  Tag,
  Grid,
  Statistic,
  FloatButton
} from 'antd';
import {
  RocketOutlined,
  GlobalOutlined,
  LoginOutlined,
  PhoneOutlined,
  MessageOutlined,
  FireOutlined,
  DashboardOutlined,
  BarChartOutlined,
  ShopOutlined,
  FileTextOutlined,
  TruckOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  TeamOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Footer } = Layout;
const { useBreakpoint } = Grid;

const LandingPage = ({ onNavigate }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const screens = useBreakpoint();
   const navigate = useNavigate();
  
  const features = [
    {
      title: "Complete ERP Solution",
      description: "End-to-end management from fuel procurement to customer receipt",
      icon: DatabaseOutlined,
      color: "#1890ff",
      stat: "100%"
    },
    {
      title: "Real-Time Operations", 
      description: "Live monitoring across all stations with instant updates",
      icon: SyncOutlined,
      color: "#52c41a",
      stat: "24/7"
    },
    {
      title: "Advanced Analytics",
      description: "Professional reporting with company branding and insights",
      icon: BarChartOutlined,
      color: "#722ed1",
      stat: "50+"
    },
    {
      title: "Multi-Station Management",
      description: "Centralized control of unlimited service stations",
      icon: ShopOutlined,
      color: "#fa8c16",
      stat: "∞"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Fluid Animation Background */}
      <FluidAnimation />
      
      {/* Navigation Header */}
      <Header style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(20px)',
        border: 'none',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        padding: '0 24px',
        height: 80,
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 1000
      }}>
        <Row justify="space-between" align="middle" style={{ height: 80 }}>
          <Col>
            <Space size="middle">
              <Avatar 
                size="large" 
                style={{ 
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                }}
                icon={<FireOutlined />}
              />
              <div style={{ lineHeight: 1.2 }}>
                <Title level={3} style={{ margin: 0, color: '#262626', fontWeight: 700 }}>
                  FuelFlow ERP
                </Title>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                  Intelligent Energy Management
                </Text>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space size="large" wrap>
              <Button type="text" style={{ fontWeight: 600 }} onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                Features
              </Button>
              <Button type="text" style={{ fontWeight: 600 }} onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}>
                About
              </Button>
              <Button type="text" style={{ fontWeight: 600 }} onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}>
                Contact
               </Button>

               
              
              <Button 
                type="primary" 
                icon={<LoginOutlined />}
                 onClick={() => navigate('/login')} 
                style={{ 
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                }}
              >
                System Login
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ marginTop: 80 }}>
        <HeroSection 
          onNavigate={onNavigate} 
          currentFeature={currentFeature} 
          features={features} 
        />
        
        <FeaturesSection />
        
        <StatsSection />
        
        <CTASection onNavigate={onNavigate} />
      </Content>

      <Footer style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid #e8e8e8',
        padding: '48px 24px'
      }}>
        <Row justify="center">
          <Col xs={24} lg={18}>
            <Row gutter={[48, 32]}>
              <Col xs={24} md={8}>
                <Space direction="vertical" size="middle">
                  <Space size="middle">
                    <Avatar 
                      style={{ 
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                        color: 'white'
                      }}
                      icon={<FireOutlined />}
                    />
                    <Title level={4} style={{ margin: 0 }}>FuelFlow ERP</Title>
                  </Space>
                  <Text type="secondary">
                    Intelligent energy management solutions for the modern enterprise.
                  </Text>
                </Space>
              </Col>
              <Col xs={12} md={4}>
                <Space direction="vertical" size="middle">
                  <Text strong>Product</Text>
                  <Button type="text" style={{ padding: 0, display: 'block', textAlign: 'left' }}>Features</Button>
                  <Button type="text" style={{ padding: 0, display: 'block', textAlign: 'left' }}>Solutions</Button>
                  <Button type="text" style={{ padding: 0, display: 'block', textAlign: 'left' }}>Pricing</Button>
                </Space>
              </Col>
              <Col xs={12} md={4}>
                <Space direction="vertical" size="middle">
                  <Text strong>Company</Text>
                  <Button type="text" style={{ padding: 0, display: 'block', textAlign: 'left' }}>About</Button>
                  <Button type="text" style={{ padding: 0, display: 'block', textAlign: 'left' }}>Blog</Button>
                  <Button type="text" style={{ padding: 0, display: 'block', textAlign: 'left' }}>Careers</Button>
                </Space>
              </Col>
              <Col xs={24} md={8}>
                <Space direction="vertical" size="middle">
                  <Text strong>Get Started</Text>
                  <Button 
                    type="primary"
                    icon={<LoginOutlined />}
                    onClick={() => onNavigate('login')}
                    style={{ 
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                      border: 'none'
                    }}
                  >
                    Access System
                  </Button>
                </Space>
              </Col>
            </Row>
            <Divider />
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary">© 2024 FuelFlow ERP. All rights reserved.</Text>
              </Col>
              <Col>
                <Space size="middle">
                  <Button type="text" icon={<MessageOutlined />} />
                  <Button type="text" icon={<PhoneOutlined />} />
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Footer>

      <FloatButton.Group shape="circle" style={{ right: 24 }}>
        <FloatButton icon={<MessageOutlined />} />
        <FloatButton icon={<PhoneOutlined />} />
        <FloatButton.BackTop visibilityHeight={0} />
      </FloatButton.Group>
    </Layout>
  );
};

const FluidAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class FuelParticle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.size = Math.random() * 20 + 5;
        this.speed = Math.random() * 2 + 1;
        this.color = `hsl(${Math.random() * 60 + 10}, 100%, 60%)`;
        this.opacity = Math.random() * 0.6 + 0.4;
        this.wave = Math.random() * Math.PI * 2;
        this.waveSpeed = Math.random() * 0.02 + 0.01;
        this.waveAmplitude = Math.random() * 20 + 10;
      }

      update() {
        this.y -= this.speed;
        this.wave += this.waveSpeed;
        this.x += Math.sin(this.wave) * 0.5;

        if (this.y < -this.size) {
          this.reset();
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();

        // Add glow effect
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          this.x, this.y, this.size,
          this.x, this.y, this.size * 2
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    const particles = Array.from({ length: 30 }, () => new FuelParticle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.6
      }}
    />
  );
};

const HeroSection = ({ onNavigate, currentFeature, features }) => {
  const screens = useBreakpoint();
  const FeatureIcon = features[currentFeature].icon;

  return (
    <Content style={{ 
      padding: screens.xs ? '100px 16px 60px' : '150px 24px 100px',
      position: 'relative',
      zIndex: 2
    }}>
      <Row justify="center">
        <Col xs={24} lg={20} xl={16}>
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            
            <Avatar 
              size={100}
              style={{ 
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                margin: '0 auto 32px',
                boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)'
              }}
              icon={<FireOutlined />}
            />
            
            <Title level={1} style={{ 
              fontSize: screens.xs ? '2.5rem' : screens.md ? '4rem' : '3.5rem',
              margin: 0,
              color: 'white',
              fontWeight: 800,
              textShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              Intelligent Energy
              <span style={{ 
                display: 'block',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none'
              }}>
                Management System
              </span>
            </Title>
            
            <Paragraph style={{ 
              fontSize: screens.xs ? 16 : 20,
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: 800,
              margin: '0 auto 48px',
              lineHeight: 1.6,
              fontWeight: 500
            }}>
              Complete fuel station management solution with real-time operations, 
              advanced analytics, and professional reporting for modern energy companies.
            </Paragraph>

            {/* Feature Showcase */}
            <Card
              style={{
                maxWidth: 600,
                margin: '0 auto 48px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
              bodyStyle={{ padding: 32 }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Row align="middle" gutter={24} justify="center">
                  <Col>
                    <div style={{
                      padding: 16,
                      background: `linear-gradient(135deg, ${features[currentFeature].color}20, ${features[currentFeature].color}40)`,
                      borderRadius: 16
                    }}>
                      <FeatureIcon style={{ 
                        fontSize: 48, 
                        color: features[currentFeature].color 
                      }} />
                    </div>
                  </Col>
                  <Col flex={1}>
                    <Space direction="vertical" size="small" style={{ textAlign: 'left' }}>
                      <Tag color={features[currentFeature].color} style={{ fontSize: 12, fontWeight: 600 }}>
                        {features[currentFeature].stat}
                      </Tag>
                      <Title level={3} style={{ margin: 0, color: '#262626' }}>
                        {features[currentFeature].title}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 16 }}>
                        {features[currentFeature].description}
                      </Text>
                    </Space>
                  </Col>
                </Row>
                
                {/* Progress Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      style={{
                        width: index === currentFeature ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: index === currentFeature ? feature.color : '#d9d9d9',
                        transition: 'all 0.5s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => setCurrentFeature(index)}
                    />
                  ))}
                </div>
              </Space>
            </Card>

            {/* Action Buttons */}
            <Space 
              direction={screens.xs ? 'vertical' : 'horizontal'} 
              size="large" 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Button
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={() => onNavigate('login')}
                style={{
                  height: 56,
                  padding: '0 40px',
                  fontSize: 18,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(255, 107, 107, 0.3)',
                  borderRadius: 12
                }}
              >
                Access System
              </Button>
              <Button
                size="large"
                icon={<GlobalOutlined />}
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                style={{
                  height: 56,
                  padding: '0 40px',
                  fontSize: 18,
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 12,
                  color: '#262626'
                }}
              >
                Explore Features
              </Button>
            </Space>
          </Space>
        </Col>
      </Row>
    </Content>
  );
};

const FeaturesSection = () => {
  const screens = useBreakpoint();
  
  const features = [
    {
      icon: FileTextOutlined,
      title: "Document Matching",
      description: "Three-way matching with automatic variance detection and reconciliation",
      color: "#1890ff"
    },
    {
      icon: TruckOutlined,
      title: "Centralized Offloads", 
      description: "Real-time monitoring and management across all station locations",
      color: "#52c41a"
    },
    {
      icon: RiseOutlined,
      title: "Sales Aggregation",
      description: "Multi-level sales consolidation with advanced analytics and insights",
      color: "#722ed1"
    },
    {
      icon: FileTextOutlined,
      title: "Professional Reports",
      description: "Custom branded reports in multiple formats with automated delivery",
      color: "#fa8c16"
    },
    {
      icon: SafetyCertificateOutlined,
      title: "Complete Audit Trail",
      description: "Every transaction fully traceable from source to final sale",
      color: "#f5222d"
    },
    {
      icon: ThunderboltOutlined,
      title: "Real-Time Operations",
      description: "Live monitoring with instant notifications and alert systems",
      color: "#faad14"
    }
  ];

  return (
    <div id="features" style={{ 
      background: 'rgba(255, 255, 255, 0.95)', 
      backdropFilter: 'blur(20px)',
      padding: screens.xs ? '80px 16px' : '120px 24px',
      position: 'relative',
      zIndex: 2
    }}>
      <Row justify="center">
        <Col xs={24} lg={20} xl={16}>
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <Tag color="orange" style={{ fontSize: 14, fontWeight: 600, padding: '4px 12px' }}>
              Powerful Features
            </Tag>
            <Title level={2} style={{ margin: 0, fontSize: screens.xs ? '2rem' : '3rem' }}>
              Everything You Need to Succeed
            </Title>
            <Text type="secondary" style={{ fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
              Comprehensive tools designed specifically for the energy management industry
            </Text>
            
            <Row gutter={[24, 24]} style={{ marginTop: 64 }}>
              {features.map((feature, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 16,
                      background: 'white',
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      transition: 'all 0.3s ease'
                    }}
                    bodyStyle={{ padding: 32 }}
                    hoverable
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                    }}
                  >
                    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'left' }}>
                      <div style={{
                        padding: 16,
                        background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}40)`,
                        borderRadius: 12,
                        width: 'fit-content'
                      }}>
                        <feature.icon style={{ fontSize: 32, color: feature.color }} />
                      </div>
                      <Title level={4} style={{ margin: 0, color: '#262626' }}>{feature.title}</Title>
                      <Text type="secondary" style={{ lineHeight: 1.6, fontSize: 15 }}>
                        {feature.description}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

const StatsSection = () => {
  const screens = useBreakpoint();

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: screens.xs ? '60px 16px' : '80px 24px',
      position: 'relative',
      zIndex: 2
    }}>
      <Row justify="center">
        <Col xs={24} lg={18}>
          <Row gutter={[48, 32]} justify="space-around">
            {[
              { value: '99.97%', label: 'System Uptime', prefix: '' },
              { value: '1.2', label: 'Million Transactions', prefix: '' },
              { value: '50', label: 'Active Stations', prefix: '+' },
              { value: '24/7', label: 'Support Coverage', prefix: '' }
            ].map((stat, index) => (
              <Col xs={12} sm={6} key={index}>
                <Statistic
                  value={stat.value}
                  prefix={stat.prefix}
                  valueStyle={{ 
                    color: 'white', 
                    fontSize: screens.xs ? '2rem' : '2.5rem',
                    fontWeight: 700,
                    textShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  suffix={index === 1 ? 'M+' : ''}
                />
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: screens.xs ? 12 : 14,
                  fontWeight: 500
                }}>
                  {stat.label}
                </Text>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </div>
  );
};

const CTASection = ({ onNavigate }) => {
  const screens = useBreakpoint();

  return (
    <div id="contact" style={{ 
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: screens.xs ? '80px 16px' : '120px 24px',
      position: 'relative',
      zIndex: 2
    }}>
      <Row justify="center">
        <Col xs={24} md={16} lg={12}>
          <Card
            style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: 24,
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)'
            }}
            bodyStyle={{ padding: screens.xs ? '48px 24px' : '64px 48px' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Title level={2} style={{ margin: 0, color: 'white' }}>
                Ready to Transform Your Energy Management?
              </Title>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontSize: 18,
                display: 'block'
              }}>
                Join industry leaders who trust FuelFlow ERP for their business operations
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={() => onNavigate('login')}
                style={{
                  height: 56,
                  padding: '0 48px',
                  fontSize: 18,
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 12,
                  color: 'white',
                  marginTop: 24
                }}
              >
                Get Started Today
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LandingPage;