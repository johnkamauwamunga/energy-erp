import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Select, 
  Space, 
  Alert, 
  Row, 
  Col, 
  Tag, 
  Badge, 
  Modal,
  Tooltip,
  Input,
  Typography,
  List,
  Avatar,
  Empty,
  Steps,
  Statistic,
  Collapse
} from 'antd';
import { 
  Users, 
  UserCheck, 
  MapPin, 
  Plus, 
  RefreshCw, 
  Zap,
  Fuel,
  Link2,
  X,
  Settings,
  CheckCircle,
  Play,
  UserPlus,
  Shield,
  Database,
  GitBranch
} from 'lucide-react';
import { userService } from '../../../../../services/userService/userService';
import { assetTopologyService } from '../../../../../services/assetTopologyService/assetTopologyService';
import { useApp } from '../../../../../context/AppContext';
import { assetService } from '../../../../../services/assetService/assetService';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

const PersonnelStep = ({ 
  personnelData,
  shiftInfo,
  loading,
  error,
  onCreateShift,
  onUpdatePersonnel,
  onUpdateShiftInfo,
  onClearError,
  onCheckActiveShift
}) => {
  const { state } = useApp();
  
  const [supervisors, setSupervisors] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [islandAssignmentModal, setIslandAssignmentModal] = useState(false);
  const [currentAttendant, setCurrentAttendant] = useState(null);
  const [assignmentTypeModal, setAssignmentTypeModal] = useState(false);
  const [selectedIslandForAssignment, setSelectedIslandForAssignment] = useState(null);
  const [checkingOpenShift, setCheckingOpenShift] = useState(false);
  const [hasOpenShift, setHasOpenShift] = useState(false);
  const [openShiftData, setOpenShiftData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchingTopology, setFetchingTopology] = useState(false);
  const [createShiftModal, setCreateShiftModal] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [assetToIslandMapping, setAssetToIslandMapping] = useState({});
  const [allAssets, setAllAssets] = useState([]);
  const [showDebugInfo, setShowDebugInfo] = useState(true);

  const stationId = state.currentStation?.id;

  console.log('🏢 PersonnelStep mounted with stationId:', stationId);

  // Fetch data when stationId is available
  useEffect(() => {
    if (stationId) {
      console.log('🚀 Starting data fetch for station:', stationId);
      fetchTopologyData();
      fetchPersonnel();
      checkExistingOpenShift();
      fetchAssets();
    } else {
      console.warn('❌ No stationId available for data fetching');
    }
  }, [stationId]);

  // Fetch topology data from assetTopologyService
  const fetchTopologyData = async () => {
    if (!stationId) return;
    
    console.log('🗺️ Starting topology data fetch...');
    setFetchingTopology(true);
    try {
      const result = await assetTopologyService.getIslandsWithPumpsAndTanks(stationId);
      console.log('✅ Topology data fetched:', result);

      if (result.success && result.data) {
        const islandsData = result.data.islands || [];
        console.log(`🏝️ Found ${islandsData.length} topology islands:`, islandsData);
        
        onUpdatePersonnel({
          topologyIslands: islandsData
        });
      } else {
        console.warn('⚠️ Topology response missing data:', result);
      }
    } catch (error) {
      console.error('❌ Error fetching topology data:', error);
    } finally {
      setFetchingTopology(false);
    }
  };

  // Fetch assets and create mapping: topologyIslandId (assetId) -> actualIslandId
  const fetchAssets = async () => {
    if (!stationId) return;
    
    console.log('🔄 Starting assets fetch for mapping...');
    try {
      const assetsResponse = await assetService.getStationAssets(stationId);
      console.log('📦 Raw assets response:', assetsResponse);
      
      setAllAssets(assetsResponse || []);
      
      if (assetsResponse && Array.isArray(assetsResponse)) {
        console.log(`📊 Total assets: ${assetsResponse.length}`);
        
        // Filter only island assets
        const islandAssets = assetsResponse.filter(asset => asset.type === 'ISLAND');
        console.log(`🏝️ Found ${islandAssets.length} island assets:`, islandAssets);
        
        // CREATE MAPPING: topologyIslandId (assetId) -> actualIslandId
        const mapping = {};
        
        islandAssets.forEach((islandAsset, index) => {
          console.log(`🔍 Processing island asset ${index + 1}:`, {
            assetId: islandAsset.id,                    // This is what topology uses as "Island ID"
            actualIslandId: islandAsset.island?.id,     // This is the actual island ID we need
            assetName: islandAsset.name,
            hasIslandObject: !!islandAsset.island
          });
          
          if (islandAsset.island && islandAsset.island.id) {
            // Map: topologyIslandId (assetId) -> actualIslandId
            mapping[islandAsset.id] = islandAsset.island.id;
            console.log(`🗺️ MAPPING CREATED: TopologyIsland ${islandAsset.id} → ActualIsland ${islandAsset.island.id}`);
          } else {
            console.warn(`⚠️ Island asset ${islandAsset.id} missing island data`);
          }
        });
        
        setAssetToIslandMapping(mapping);
        console.log('🗺️ FINAL TOPOLOGY-TO-ACTUAL MAPPING:', mapping);
        
      } else {
        console.warn('❌ Assets response is not an array:', assetsResponse);
      }
    } catch (error) {
      console.error('❌ Error fetching assets:', error);
    }
  };

  // Use the topology data
  const allIslands = personnelData.topologyIslands || [];
  console.log('🏝️ Current topology islands:', allIslands);

  // Check for existing open shift
  const checkExistingOpenShift = async () => {
    if (!stationId) return;
    
    console.log('🔍 Checking for existing open shift...');
    setCheckingOpenShift(true);
    try {
      const activeShift = await onCheckActiveShift();
      console.log('📋 Active shift check result:', activeShift);
      
      if (activeShift) {
        setHasOpenShift(true);
        setOpenShiftData(activeShift);
        console.log('✅ Found open shift:', activeShift);
        
        if (activeShift.supervisor) {
          onUpdateShiftInfo({
            supervisorId: activeShift.supervisor.id
          });
        }
      } else {
        setHasOpenShift(false);
        setOpenShiftData(null);
        console.log('❌ No open shift found');
      }
    } catch (err) {
      console.error('❌ Failed to check open shift:', err);
      setHasOpenShift(false);
      setOpenShiftData(null);
    } finally {
      setCheckingOpenShift(false);
    }
  };

  const fetchPersonnel = async () => {
    console.log('👥 Starting personnel fetch...');
    setLoadingSupervisors(true);
    try {
      const [supervisorsResponse, attendantsResponse] = await Promise.all([
        userService.getStationSupervisors(stationId),
        userService.getStationAttendants(stationId)
      ]);

      if (Array.isArray(supervisorsResponse)) {
        const validSupervisors = supervisorsResponse.filter(s => 
          s && s.id && s.firstName && s.lastName
        );
        setSupervisors(validSupervisors);
      } else {
        console.warn('❌ Invalid supervisors response format:', supervisorsResponse);
        setSupervisors([]);
      }

      if (Array.isArray(attendantsResponse)) {
        const validAttendants = attendantsResponse.filter(a => 
          a && a.id && a.firstName && a.lastName
        );
        setAttendants(validAttendants);
      } else {
        console.warn('❌ Invalid attendants response format:', attendantsResponse);
        setAttendants([]);
      }

    } catch (err) {
      console.error('❌ Failed to fetch personnel:', err);
      setSupervisors([]);
      setAttendants([]);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  // Get all island assets with mapping info
  const getIslandAssetsWithMapping = () => {
    const islandAssets = allAssets.filter(asset => asset.type === 'ISLAND');
    
    return islandAssets.map(asset => ({
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      actualIslandId: asset.island?.id,
      islandCode: asset.island?.code,
      hasMapping: !!(asset.island && asset.island.id),
      mappingStatus: asset.island && asset.island.id ? 'MAPPED' : 'NO_MAPPING'
    }));
  };

  // Get topology islands with mapping info
  const getTopologyIslandsWithMapping = () => {
    return allIslands.map(island => {
      // topologyIsland.id is actually the assetId, so we look it up in mapping
      const actualIslandId = assetToIslandMapping[island.id];
      
      return {
        topologyIslandId: island.id,  // This is actually the assetId
        islandName: island.name,
        islandCode: island.code,
        actualIslandId: actualIslandId,
        hasMapping: !!actualIslandId,
        mappingStatus: actualIslandId ? 'MAPPED' : 'NO_MAPPING',
        pumpCount: island.pumps?.length || island.directPumps?.length || 0
      };
    });
  };

  const handleSupervisorSelection = (supervisorId) => {
    console.log('🎯 Supervisor selected:', supervisorId);
    setSelectedSupervisor(supervisorId);
  };

  const handleCreateShift = async () => {
    console.log('🚀 Starting shift creation...');
    
    if (!selectedSupervisor || !stationId) {
      console.warn('❌ Missing required data for shift creation');
      onClearError();
      return;
    }

    try {
      const shiftPayload = {
        stationId: stationId,
        supervisorId: selectedSupervisor
      };

      await onCreateShift(shiftPayload);
      setCreateShiftModal(false);
      setSelectedSupervisor(null);
    } catch (err) {
      console.error('❌ Shift creation failed:', err);
    }
  };

  const handleAttendantSelection = (attendantId, checked) => {
    console.log('👥 Attendant selection:', { attendantId, checked });
    
    let newAttendants;
    
    if (checked) {
      const attendant = attendants.find(a => a.id === attendantId);
      newAttendants = [...personnelData.attendants, attendant];
    } else {
      newAttendants = personnelData.attendants.filter(a => a.id !== attendantId);
      const newAssignments = personnelData.islandAssignments.filter(
        assignment => assignment.attendantId !== attendantId
      );
      onUpdatePersonnel({ 
        attendants: newAttendants,
        islandAssignments: newAssignments
      });
      return;
    }
    
    onUpdatePersonnel({ attendants: newAttendants });
  };

  // CORRECTED: Convert topologyIslandId (assetId) to actualIslandId
  const handleIslandAssignment = (topologyIslandId, attendantId, assignmentType = 'PRIMARY') => {
    console.log('🏝️ Island assignment attempt:', { topologyIslandId, attendantId, assignmentType });
    
    if (!attendantId) {
      console.error('❌ No attendant ID provided for island assignment');
      return;
    }

    // CONVERT topologyIslandId (assetId) to actualIslandId using mapping
    const actualIslandId = assetToIslandMapping[topologyIslandId];
    console.log('🗺️ ID CONVERSION:', { 
      inputTopologyIslandId: topologyIslandId, 
      outputActualIslandId: actualIslandId
    });
    
    if (!actualIslandId) {
      console.error('❌ No mapping found for topologyIslandId:', topologyIslandId);
      return;
    }

    const existingAssignmentIndex = personnelData.islandAssignments.findIndex(
      assignment => assignment.attendantId === attendantId && 
                   assignment.islandId === actualIslandId  // Use ACTUAL island ID here
    );

    let newAssignments;
    
    if (existingAssignmentIndex >= 0) {
      newAssignments = [...personnelData.islandAssignments];
      newAssignments[existingAssignmentIndex] = {
        ...newAssignments[existingAssignmentIndex],
        assignmentType
      };
    } else {
      newAssignments = [
        ...personnelData.islandAssignments, 
        { 
          attendantId, 
          islandId: actualIslandId, // ✅ Store the ACTUAL island ID
          assignmentType,
          id: `${attendantId}-${actualIslandId}-${Date.now()}`
        }
      ];
    }

    onUpdatePersonnel({ islandAssignments: newAssignments });
    console.log('✅ Assignments updated with actual island ID:', actualIslandId);
  };

  const removeIslandAssignment = (topologyIslandId, attendantId) => {
    console.log('🗑️ Removing island assignment:', { topologyIslandId, attendantId });
    
    const actualIslandId = assetToIslandMapping[topologyIslandId];
    
    const newAssignments = personnelData.islandAssignments.filter(
      assignment => !(assignment.attendantId === attendantId && 
                     assignment.islandId === actualIslandId)
    );
    
    onUpdatePersonnel({ islandAssignments: newAssignments });
  };

  const clearAttendants = () => {
    console.log('🧹 Clearing all attendants and assignments');
    onUpdatePersonnel({ attendants: [], islandAssignments: [] });
  };

  const getIslandStatusTag = (island) => {
    const pumpCount = island.pumps?.length || island.directPumps?.length || 0;
    
    if (island.fullyOperational) {
      return <Tag color="green" icon={<CheckCircle size={12} />}>Fully Operational</Tag>;
    }
    if (pumpCount > 0) {
      return <Tag color="blue">{pumpCount} Pumps</Tag>;
    }
    return <Tag color="orange">No Pumps</Tag>;
  };

  const getAssignmentTypeColor = (type) => {
    const colors = {
      'PRIMARY': 'blue',
      'SECONDARY': 'green',
      'BACKUP': 'orange'
    };
    return colors[type] || 'default';
  };

  const getIslandAssignments = (islandId) => {
    const assignments = personnelData.islandAssignments
      .filter(assignment => assignment.islandId === islandId)
      .map(assignment => {
        const attendant = personnelData.attendants.find(a => a.id === assignment.attendantId);
        return {
          ...assignment,
          attendantName: attendant ? `${attendant.firstName} ${attendant.lastName}` : 'Unknown',
          attendant
        };
      });
    
    return assignments;
  };

  const getAttendantAssignments = (attendantId) => {
    const assignments = personnelData.islandAssignments
      .filter(assignment => assignment.attendantId === attendantId)
      .map(assignment => {
        const island = allIslands.find(i => {
          // Find the topology island that maps to this actual islandId
          const topologyIslandId = Object.keys(assetToIslandMapping).find(
            key => assetToIslandMapping[key] === assignment.islandId
          );
          return topologyIslandId === i.id;
        });
        return {
          ...assignment,
          islandName: island ? island.name : 'Unknown Island',
          island
        };
      });
    
    return assignments;
  };

  // Find actualIslandId for a topologyIslandId
  const findActualIslandId = (topologyIslandId) => {
    return assetToIslandMapping[topologyIslandId];
  };

  // Find topologyIslandId for an actualIslandId (reverse lookup)
  const findTopologyIslandId = (actualIslandId) => {
    return Object.keys(assetToIslandMapping).find(
      key => assetToIslandMapping[key] === actualIslandId
    );
  };

  const filteredAttendants = attendants.filter(attendant =>
    `${attendant.firstName} ${attendant.lastName} ${attendant.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const attendantColumns = [
    {
      title: 'Select',
      dataIndex: 'id',
      render: (id, record) => (
        <input
          type="checkbox"
          checked={personnelData.attendants.some(a => a.id === id)}
          onChange={(e) => handleAttendantSelection(id, e.target.checked)}
          disabled={!shiftInfo.shiftId && !hasOpenShift}
        />
      ),
      width: 60
    },
    {
      title: 'Attendant',
      key: 'name',
      render: (_, record) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#87d068' }}>
            {record.firstName?.[0]}{record.lastName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.firstName} {record.lastName}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {record.email}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Assigned Islands',
      key: 'islands',
      render: (_, record) => {
        const assignments = getAttendantAssignments(record.id);
        
        return (
          <Space wrap>
            {assignments.map((assignment, index) => (
              <Tag 
                key={assignment.id}
                color={getAssignmentTypeColor(assignment.assignmentType)}
                closable
                onClose={() => {
                  const topologyIslandId = findTopologyIslandId(assignment.islandId);
                  if (topologyIslandId) {
                    removeIslandAssignment(topologyIslandId, record.id);
                  }
                }}
                style={{ margin: '2px' }}
              >
                {assignment.islandName} ({assignment.assignmentType})
              </Tag>
            ))}
            <Button 
              type="link" 
              size="small" 
              icon={<Plus size={12} />}
              onClick={() => {
                setCurrentAttendant(record);
                setIslandAssignmentModal(true);
              }}
              disabled={!personnelData.attendants.some(a => a.id === record.id) || (!shiftInfo.shiftId && !hasOpenShift) || allIslands.length === 0}
            >
              Assign Islands
            </Button>
          </Space>
        );
      }
    }
  ];

  // Determine if we can proceed
  const canProceed = !!shiftInfo.shiftId || hasOpenShift;

  // Check if we have all required data for personnel step
  const hasRequiredPersonnelData = 
    personnelData.islandAssignments.length > 0 && 
    personnelData.attendants.length > 0;

  // Get debug data
  const islandAssets = getIslandAssetsWithMapping();
  const topologyIslands = getTopologyIslandsWithMapping();

  return (
    <div style={{ padding: '0 8px' }}>
      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {/* DEBUG INFORMATION */}
      {/* <Card 
        title={
          <Space>
            <Database size={16} />
            <Title level={5} style={{ margin: 0 }}>Asset & Island Mapping Debug</Title>
            <Button 
              size="small" 
              icon={<RefreshCw size={12} />}
              onClick={() => {
                fetchAssets();
                fetchTopologyData();
              }}
            >
              Refresh Data
            </Button>
          </Space>
        } 
        size="small" 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            type="link" 
            size="small"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
          >
            {showDebugInfo ? 'Hide' : 'Show'} Debug Info
          </Button>
        }
      >
        <Collapse defaultActiveKey={['1', '2']}>
          {/* Island Assets from Asset Service */}
          {/* <Panel 
            header={
              <Space>
                <GitBranch size={14} />
                <Text strong>Island Assets ({islandAssets.length})</Text>
                <Tag color="blue">Asset Service</Tag>
              </Space>
            } 
            key="1"
          >
            <Table
              size="small"
              dataSource={islandAssets}
              pagination={false}
              rowKey="assetId"
              columns={[
                {
                  title: 'Asset ID',
                  dataIndex: 'assetId',
                  render: (id) => <Text code>{id}</Text>,
                  width: 300
                },
                {
                  title: 'Asset Name',
                  dataIndex: 'assetName',
                },
                {
                  title: 'Actual Island ID',
                  dataIndex: 'actualIslandId',
                  render: (id) => id ? <Text code>{id}</Text> : <Tag color="red">Missing</Tag>,
                  width: 300
                },
                {
                  title: 'Mapping Status',
                  dataIndex: 'mappingStatus',
                  render: (status) => (
                    <Tag color={status === 'MAPPED' ? 'green' : 'red'}>
                      {status === 'MAPPED' ? '✅ Mapped' : '❌ No Mapping'}
                    </Tag>
                  )
                }
              ]}
              locale={{ emptyText: 'No island assets found' }}
            />
          </Panel>

          Topology Islands from Topology Service */}
          {/* <Panel 
            header={
              <Space>
                <MapPin size={14} />
                <Text strong>Topology Islands ({topologyIslands.length})</Text>
                <Tag color="green">Topology Service</Tag>
              </Space>
            } 
            key="2"
          >
            <Table
              size="small"
              dataSource={topologyIslands}
              pagination={false}
              rowKey="topologyIslandId"
              columns={[
                {
                  title: 'Topology Island ID',
                  dataIndex: 'topologyIslandId',
                  render: (id) => <Text code>{id}</Text>,
                  width: 300
                },
                {
                  title: 'Island Name',
                  dataIndex: 'islandName',
                },
                {
                  title: 'Island Code',
                  dataIndex: 'islandCode',
                },
                {
                  title: 'Actual Island ID',
                  dataIndex: 'actualIslandId',
                  render: (id) => id ? <Text code>{id}</Text> : <Tag color="red">No Mapping</Tag>,
                  width: 300
                },
                {
                  title: 'Pumps',
                  dataIndex: 'pumpCount',
                  render: (count) => <Tag color={count > 0 ? 'blue' : 'orange'}>{count} pumps</Tag>
                },
                {
                  title: 'Mapping Status',
                  dataIndex: 'mappingStatus',
                  render: (status) => (
                    <Tag color={status === 'MAPPED' ? 'green' : 'red'}>
                      {status === 'MAPPED' ? '✅ Mapped' : '❌ No Mapping'}
                    </Tag>
                  )
                }
              ]}
              locale={{ emptyText: 'No topology islands found' }}
            />
          </Panel> */}

          {/* Mapping Summary */}
          {/* <Panel 
            header={
              <Space>
                <Link2 size={14} />
                <Text strong>Mapping Summary</Text>
              </Space>
            } 
            key="3"
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Total Island Assets"
                  value={islandAssets.length}
                  prefix={<Database size={16} />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total Topology Islands"
                  value={topologyIslands.length}
                  prefix={<MapPin size={16} />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Successful Mappings"
                  value={topologyIslands.filter(i => i.hasMapping).length}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<Link2 size={16} />}
                />
              </Col>
            </Row>
          </Panel>
        </Collapse>
      // </Card> */}

      <Row gutter={[24, 24]}>
        {/* Shift Status & Creation */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <Shield size={16} />
                <Title level={5} style={{ margin: 0 }}>Shift Management</Title>
              </Space>
            } 
            size="small" 
            loading={checkingOpenShift || fetchingTopology}
          >
            {hasOpenShift ? (
              <Alert
                message="Open Shift Found"
                description={
                  <Space direction="vertical">
                    <div>
                      <strong>Shift #{openShiftData.shiftNumber}</strong> is currently open.
                    </div>
                    <div>
                      Started at {new Date(openShiftData.startTime).toLocaleString()}
                      {openShiftData.supervisor && ` by ${openShiftData.supervisor.firstName} ${openShiftData.supervisor.lastName}`}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Tag color="green">Ready for Personnel Assignment</Tag>
                    </div>
                  </Space>
                }
                type="success"
                showIcon
                action={
                  <Button 
                    size="small" 
                    icon={<RefreshCw size={14} />}
                    onClick={checkExistingOpenShift}
                    loading={checkingOpenShift}
                  >
                    Refresh
                  </Button>
                }
              />
            ) : (
              <Row gutter={[16, 16]} align="middle">
                <Col flex="auto">
                  <Space direction="vertical" size="small">
                    <Text strong>Ready to start a new shift?</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Create a new shift to begin operations. You'll need to assign a supervisor first.
                    </Text>
                  </Space>
                </Col>
                <Col>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<Play size={16} />}
                    onClick={() => setCreateShiftModal(true)}
                    disabled={loading || fetchingTopology}
                    style={{ 
                      background: '#52c41a',
                      borderColor: '#52c41a',
                      height: '48px',
                      padding: '0 24px',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading ? 'Creating Shift...' : 'Create New Shift'}
                  </Button>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Current Shift Info */}
        {(shiftInfo.shiftId || hasOpenShift) && (
          <Col span={24}>
            <Card size="small" type="inner">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="Shift Status"
                    value={hasOpenShift ? "Using Existing Shift" : "New Shift Created"}
                    valueStyle={{ 
                      color: hasOpenShift ? '#52c41a' : '#1890ff',
                      fontSize: '16px'
                    }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Shift Number"
                    value={hasOpenShift ? openShiftData?.shiftNumber : shiftInfo.shiftNumber}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Supervisor"
                    value={
                      hasOpenShift 
                        ? `${openShiftData?.supervisor?.firstName} ${openShiftData?.supervisor?.lastName}`
                        : supervisors.find(s => s.id === personnelData.supervisorId) 
                          ? `${supervisors.find(s => s.id === personnelData.supervisorId)?.firstName} ${supervisors.find(s => s.id === personnelData.supervisorId)?.lastName}`
                          : 'Not Assigned'
                    }
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {/* Progress Steps */}
        <Col span={24}>
          <Card size="small">
            <Steps
              current={canProceed ? 1 : 0}
              size="small"
              items={[
                {
                  title: 'Create Shift',
               //   description: 'Start new shift operations',
                  status: canProceed ? 'finish' : 'process'
                },
                {
                  title: 'Assign Personnel',
                //  description: 'Select attendants and assign islands',
                  status: canProceed ? (hasRequiredPersonnelData ? 'finish' : 'process') : 'wait'
                },
                {
                  title: 'Take Readings',
                 // description: 'Record pump and tank readings',
                  status: 'wait'
                }
              ]}
            />
          </Card>
        </Col>

        {/* Attendants Selection */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <Users size={16} />
                <Title level={5} style={{ margin: 0 }}>Attendants Selection</Title>
                <Badge 
                  count={personnelData.attendants.length} 
                  showZero 
                  style={{ backgroundColor: '#52c41a' }} 
                />
                {allIslands.length === 0 && !fetchingTopology && (
                  <Tag color="red">No islands with pumps available</Tag>
                )}
                {fetchingTopology && (
                  <Tag color="orange">Loading islands...</Tag>
                )}
              </Space>
            } 
            size="small"
            extra={
              <Space>
                <Button 
                  onClick={clearAttendants}
                  disabled={personnelData.attendants.length === 0}
                  size="small"
                >
                  Clear All
                </Button>
                <Button 
                  icon={<RefreshCw size={14} />}
                  onClick={() => {
                    checkExistingOpenShift();
                    fetchTopologyData();
                    fetchAssets();
                  }}
                  loading={checkingOpenShift || fetchingTopology}
                  size="small"
                >
                  Refresh All
                </Button>
              </Space>
            }
          >
            {!canProceed && (
              <Alert
                message="No Active Shift"
                description="Please create a new shift or wait for an existing open shift to be detected."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            {allIslands.length === 0 && !fetchingTopology && (
              <Alert
                message="No Islands Available"
                description="No islands with pumps were found in the station topology."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            {fetchingTopology && (
              <Alert
                message="Loading Topology Data"
                description="Fetching islands and pumps information from the station..."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="Search attendants by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 300 }}
              />
            </div>
            
            <Table
              columns={attendantColumns}
              dataSource={filteredAttendants}
              pagination={false}
              size="small"
              rowKey="id"
              loading={!attendants.length || fetchingTopology}
              locale={{ emptyText: 'No attendants found for this station' }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Assignment Summary */}
      {personnelData.islandAssignments.length > 0 && (
        <Card 
          title="Island Assignments Summary" 
          size="small" 
          style={{ marginTop: 16 }}
        >
          <Row gutter={[16, 16]}>
            {allIslands.map(island => {
              const actualIslandId = findActualIslandId(island.id);
              const assignments = actualIslandId ? getIslandAssignments(actualIslandId) : [];
              
              if (assignments.length === 0) return null;
              
              return (
                <Col span={8} key={island.id}>
                  <Card size="small" title={island.name} extra={<Tag>{island.code}</Tag>}>
                    <List
                      size="small"
                      dataSource={assignments}
                      renderItem={assignment => (
                        <List.Item
                          actions={[
                            <Button 
                              type="link" 
                              size="small" 
                              icon={<Settings size={12} />}
                              onClick={() => {
                                setCurrentAttendant(assignment.attendant);
                                setSelectedIslandForAssignment({...island, assetId: island.id});
                                setAssignmentTypeModal(true);
                              }}
                            >
                              Change
                            </Button>,
                            <Button 
                              type="link" 
                              size="small" 
                              danger 
                              icon={<X size={12} />}
                              onClick={() => {
                                removeIslandAssignment(island.id, assignment.attendantId);
                              }}
                            >
                              Remove
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Space>
                                <Avatar size="small" src={assignment.attendant?.avatar} />
                                {assignment.attendantName}
                              </Space>
                            }
                            description={
                              <Tag color={getAssignmentTypeColor(assignment.assignmentType)}>
                                {assignment.assignmentType}
                              </Tag>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* Status Summary */}
      <div style={{ marginTop: 16, padding: '16px', background: '#f6ffed', borderRadius: 6 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Current Status:</Text>
            <Space style={{ marginLeft: 8 }} wrap>
              <Tag color={canProceed ? "green" : "orange"}>
                {hasOpenShift ? "Using Existing Open Shift" : 
                 shiftInfo.shiftId ? "New Shift Created" : "No Active Shift"}
              </Tag>
              <Tag color={personnelData.supervisorId ? "blue" : "orange"}>
                Supervisor: {personnelData.supervisorId ? "Selected" : "Not Selected"}
              </Tag>
              <Tag color={personnelData.attendants.length > 0 ? "green" : "orange"}>
                Attendants: {personnelData.attendants.length}
              </Tag>
              <Tag color={personnelData.islandAssignments.length > 0 ? "green" : "orange"}>
                Island Assignments: {personnelData.islandAssignments.length}
              </Tag>
              <Tag color={allIslands.length > 0 ? "blue" : "red"}>
                Topology Islands: {allIslands.length}
              </Tag>
              <Tag color={Object.keys(assetToIslandMapping).length > 0 ? "green" : "orange"}>
                ID Mappings: {Object.keys(assetToIslandMapping).length}
              </Tag>
            </Space>
          </div>
          
          {canProceed && (
            <div style={{ marginTop: 8 }}>
              <Text strong>Next Step Readiness:</Text>
              <Space style={{ marginLeft: 8 }} wrap>
                <Tag color={personnelData.attendants.length > 0 ? "green" : "red"}>
                  Attendants Selected: {personnelData.attendants.length}
                </Tag>
                <Tag color={personnelData.islandAssignments.length > 0 ? "green" : "red"}>
                  Island Assignments: {personnelData.islandAssignments.length}
                </Tag>
                <Tag color={hasRequiredPersonnelData ? "green" : "orange"}>
                  {hasRequiredPersonnelData ? "Ready for Next Step" : "Need More Data"}
                </Tag>
              </Space>
            </div>
          )}
        </Space>
      </div>

      {/* Create Shift Modal */}
      <Modal
        title={
          <Space>
            <UserPlus size={18} />
            <Title level={4} style={{ margin: 0 }}>Create New Shift</Title>
          </Space>
        }
        open={createShiftModal}
        onCancel={() => {
          setCreateShiftModal(false);
          setSelectedSupervisor(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setCreateShiftModal(false);
              setSelectedSupervisor(null);
            }}
          >
            Cancel
          </Button>,
          <Button 
            key="create"
            type="primary" 
            onClick={handleCreateShift}
            disabled={!selectedSupervisor || loading}
            loading={loading}
            style={{ 
              background: '#52c41a',
              borderColor: '#52c41a'
            }}
            icon={<Play size={16} />}
          >
            {loading ? 'Creating Shift...' : 'Create Shift'}
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Shift Creation"
            description="Select a supervisor to create a new shift. This will initialize shift operations for the current station."
            type="info"
            showIcon
          />
          
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Select Shift Supervisor <Text type="danger">*</Text>
            </Text>
            <Select
              placeholder={loadingSupervisors ? "Loading supervisors..." : "Select a supervisor"}
              style={{ width: '100%' }}
              onChange={handleSupervisorSelection}
              value={selectedSupervisor}
              options={supervisors.map(s => ({
                value: s.id,
                label: (
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                      {s.firstName?.[0]}{s.lastName?.[0]}
                    </Avatar>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {s.firstName} {s.lastName}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {s.email}
                      </div>
                    </div>
                  </Space>
                )
              }))}
              disabled={loadingSupervisors}
              loading={loadingSupervisors}
              size="large"
              showSearch
              filterOption={(input, option) =>
                option.label.props.children[1].props.children[0].props.children
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              notFoundContent={
                loadingSupervisors ? 
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <RefreshCw size={16} spin style={{ marginRight: 8 }} />
                    Loading supervisors...
                  </div> :
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No supervisors found for this station"
                  />
              }
            />
          </div>

          {selectedSupervisor && (
            <Card size="small" style={{ background: '#f6ffed' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Selected Supervisor:</Text>
                <Space>
                  <Avatar size="large" style={{ backgroundColor: '#52c41a' }}>
                    {supervisors.find(s => s.id === selectedSupervisor)?.firstName?.[0]}
                    {supervisors.find(s => s.id === selectedSupervisor)?.lastName?.[0]}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {supervisors.find(s => s.id === selectedSupervisor)?.firstName} {supervisors.find(s => s.id === selectedSupervisor)?.lastName}
                    </div>
                    <div style={{ color: '#666' }}>
                      {supervisors.find(s => s.id === selectedSupervisor)?.email}
                    </div>
                  </div>
                </Space>
              </Space>
            </Card>
          )}

          {supervisors.length === 0 && !loadingSupervisors && (
            <Alert
              message="No Supervisors Available"
              description="No supervisors were found for this station. Please ensure supervisors are assigned to this station in the system."
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Modal>

      {/* Island Assignment Modal */}
      <Modal
        title={
          <Space>
            <MapPin size={16} />
            {`Assign Islands to ${currentAttendant?.firstName} ${currentAttendant?.lastName}`}
          </Space>
        }
        open={islandAssignmentModal}
        onCancel={() => {
          setIslandAssignmentModal(false);
          setCurrentAttendant(null);
        }}
        footer={null}
        width={900}
      >
        <Alert 
          message="Only islands with pumps are shown. Click on islands to assign/unassign. You can assign multiple islands to one attendant with different roles."
          type="info" 
          showIcon 
          style={{ marginBottom: 16 }}
        />
        
        {allIslands.length === 0 ? (
          <Empty
            description="No islands with pumps found in station topology."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {allIslands.map(island => {
              // topologyIsland.id is the assetId, check if it has mapping
              const actualIslandId = findActualIslandId(island.id);
              const existingAssignment = actualIslandId ? personnelData.islandAssignments.find(
                assignment => assignment.attendantId === currentAttendant?.id && 
                             assignment.islandId === actualIslandId
              ) : null;
              
              const pumpCount = island.pumps?.length || island.directPumps?.length || 0;
              const isSelectable = !!actualIslandId && currentAttendant?.id;
              
              return (
                <Col span={8} key={island.id}>
                  <Card
                    size="small"
                    style={{ 
                      border: existingAssignment ? `2px solid #1890ff` : 
                              isSelectable ? '1px solid #d9d9d9' : '1px solid #f0f0f0',
                      cursor: isSelectable ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s',
                      background: existingAssignment ? '#f0f8ff' : 
                                  isSelectable ? 'white' : '#fafafa',
                      opacity: isSelectable ? 1 : 0.6
                    }}
                    onClick={() => {
                      if (isSelectable) {
                        if (existingAssignment) {
                          removeIslandAssignment(island.id, currentAttendant.id);
                        } else {
                          setCurrentAttendant(currentAttendant);
                          setSelectedIslandForAssignment({...island, assetId: island.id});
                          setAssignmentTypeModal(true);
                        }
                      }
                    }}
                    hoverable={isSelectable}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <MapPin 
                        size={24} 
                        color={existingAssignment ? '#1890ff' : isSelectable ? '#999' : '#ccc'} 
                      />
                      <div style={{ 
                        marginTop: 8, 
                        fontWeight: existingAssignment ? 'bold' : 'normal',
                        color: existingAssignment ? '#1890ff' : isSelectable ? 'inherit' : '#999'
                      }}>
                        {island.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {island.code}
                      </div>
                      
                      <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
                        <Space direction="vertical" size={2}>
                          <Tooltip title="Number of pumps">
                            <Space size={4}>
                              <Zap size={10} />
                              {pumpCount} pumps
                            </Space>
                          </Tooltip>
                          <Tooltip title="ID Mapping Status">
                            <Space size={4}>
                              <Tag size="small" color={actualIslandId ? "green" : "red"}>
                                {actualIslandId ? "Mapped" : "No Mapping"}
                              </Tag>
                            </Space>
                          </Tooltip>
                          {actualIslandId && (
                            <Tooltip title="Actual Island ID">
                              <Space size={4}>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                  Actual: {actualIslandId.substring(0, 8)}...
                                </Text>
                              </Space>
                            </Tooltip>
                          )}
                        </Space>
                      </div>
                      
                      <div style={{ marginTop: 8 }}>
                        {getIslandStatusTag(island)}
                      </div>
                      
                      {existingAssignment && (
                        <div style={{ marginTop: 8 }}>
                          <Tag color={getAssignmentTypeColor(existingAssignment.assignmentType)}>
                            {existingAssignment.assignmentType}
                          </Tag>
                        </div>
                      )}
                      
                      {!isSelectable && (
                        <div style={{ marginTop: 8 }}>
                          <Tag color="red" style={{ fontSize: 10 }}>
                            {!actualIslandId ? "No Asset Mapping" : "No Attendant Selected"}
                          </Tag>
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
        
        {currentAttendant && (
          <div style={{ marginTop: 16, padding: 12, background: '#f0f8ff', borderRadius: 6 }}>
            <Text strong>Current Island Assignments for {currentAttendant.firstName}:</Text>
            <div style={{ marginTop: 8 }}>
              {getAttendantAssignments(currentAttendant.id).map(assignment => (
                <Tag 
                  key={assignment.id} 
                  color={getAssignmentTypeColor(assignment.assignmentType)}
                  style={{ margin: '2px' }}
                >
                  {assignment.islandName} ({assignment.assignmentType})
                </Tag>
              ))}
              {getAttendantAssignments(currentAttendant.id).length === 0 && (
                <Text type="secondary" italic>No islands assigned yet</Text>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Assignment Type Modal */}
      <Modal
        title="Select Assignment Type"
        open={assignmentTypeModal}
        onCancel={() => {
          setAssignmentTypeModal(false);
          setSelectedIslandForAssignment(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setAssignmentTypeModal(false)}>
            Cancel
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Select assignment type for {selectedIslandForAssignment?.name}:</Text>
          <Button 
            type="primary" 
            block
            onClick={() => {
              console.log('🎯 Creating PRIMARY assignment:', {
                topologyIslandId: selectedIslandForAssignment.assetId,
                attendantId: currentAttendant.id
              });
              handleIslandAssignment(
                selectedIslandForAssignment.assetId, 
                currentAttendant.id, 
                'PRIMARY'
              );
              setAssignmentTypeModal(false);
              setSelectedIslandForAssignment(null);
            }}
          >
            Primary Attendant
          </Button>
          <Button 
            block
            onClick={() => {
              handleIslandAssignment(
                selectedIslandForAssignment.assetId, 
                currentAttendant.id, 
                'SECONDARY'
              );
              setAssignmentTypeModal(false);
              setSelectedIslandForAssignment(null);
            }}
          >
            Secondary Attendant
          </Button>
          <Button 
            block
            onClick={() => {
              handleIslandAssignment(
                selectedIslandForAssignment.assetId, 
                currentAttendant.id, 
                'BACKUP'
              );
              setAssignmentTypeModal(false);
              setSelectedIslandForAssignment(null);
            }}
          >
            Backup Attendant
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default PersonnelStep;