import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  Select,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Divider,
  Empty
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Fuel, Droplets, Truck } from 'lucide-react';
import { tankReconciliationService } from '../../../../services/tankReconciliationService/tankReconciliationService';
import { assetService } from '../../../../services/assetService/assetService';
import { useApp } from '../../../../context/AppContext';
import dayjs from 'dayjs';

// Import jsPDF for PDF export
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { Title, Text } = Typography;
const { Option } = Select;

// Role-based access configuration
const ACCESS_LEVELS = {
  SUPER_ADMIN: 'COMPANY',
  COMPANY_ADMIN: 'COMPANY',
  STATION_MANAGER: 'STATION',
  LINES_MANAGER: 'STATION',
  SUPERVISOR: 'STATION',
  ATTENDANT: 'STATION'
};

const TankReconciliationManagement = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tankData, setTankData] = useState({});
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [pumpMap, setPumpMap] = useState(new Map());
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
    stationId: '',
    tankId: '',
    productId: '',
    status: '',
    shiftId: ''
  });

  // Get user and access level
  const currentUser = state.currentUser;
  const currentCompany = currentUser?.companyId;
  const currentStation = state.currentStation?.id;
  const userRole = currentUser?.role;
  const accessLevel = ACCESS_LEVELS[userRole] || 'STATION';

  // Check if user can access company-level data
  const canAccessCompanyLevel = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(userRole);
  
  // Check if user can access station-level data
  const canAccessStationLevel = ['STATION_MANAGER', 'LINES_MANAGER', 'SUPERVISOR', 'ATTENDANT'].includes(userRole);

  // Check if user can modify data
  const canModifyData = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER', 'LINES_MANAGER'].includes(userRole);

  // Check if user can view sensitive data
  const canViewSensitiveData = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STATION_MANAGER', 'LINES_MANAGER', 'SUPERVISOR'].includes(userRole);

  // Determine which data to fetch based on access level
  const shouldFetchCompanyData = canAccessCompanyLevel && !currentStation;
  const shouldFetchStationData = canAccessStationLevel && currentStation;

  // Create pump mapping from assets
  const createPumpMapping = (islandAssets) => {
    const pumpMap = new Map();
    
    islandAssets.forEach(asset => {
      if (asset.pump && asset.pump.id) {
        pumpMap.set(asset.pump.id, {
          name: asset.name,
          islandCode: asset.stationLabel || asset.island?.code || "N/A",
          fullAsset: asset
        });
      }
    });
    
    return pumpMap;
  };

  // Fetch assets and create pump mapping
  const fetchAssets = async () => {
    if (!currentStation) return;
    
    try {
      const assetsResponse = await assetService.getStationAssets(currentStation);
      
      if (assetsResponse && Array.isArray(assetsResponse)) {
        // Filter only pump assets
        const pumpAssets = assetsResponse.filter(asset => asset.type === 'FUEL_PUMP');
        const mapping = createPumpMapping(pumpAssets);
        setPumpMap(mapping);
      }
    } catch (error) {
      console.error('❌ Error fetching assets:', error);
    }
  };

  // Fetch available shifts from the reconciliation data
  const fetchShifts = async () => {
    if (!tankData.recentReconciliations) return;
    
    try {
      const uniqueShifts = [];
      const shiftMap = new Map();
      
      tankData.recentReconciliations?.forEach(rec => {
        if (rec.shift && !shiftMap.has(rec.shift.id)) {
          shiftMap.set(rec.shift.id, true);
          uniqueShifts.push({
            id: rec.shift.id,
            shiftNumber: rec.shift.shiftNumber,
            startTime: rec.shift.startTime,
            supervisor: rec.shift.supervisor
          });
        }
      });
      
      setShifts(uniqueShifts);
    } catch (error) {
      console.error('❌ Failed to process shifts:', error);
    }
  };

  // Fetch tank reconciliation data based on access level
  const fetchTankReconciliation = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      let result;
      
      if (shouldFetchStationData) {
        result = await tankReconciliationService.getTankReconciliationInStation(currentStation, filters);
      } else if (shouldFetchCompanyData) {
        result = await tankReconciliationService.getTankReconciliationInCompany(currentCompany, filters);
      } else {
        throw new Error('No access to fetch data');
      }
      
      setTankData(result);
    } catch (error) {
      console.error('❌ Failed to fetch tank reconciliation data:', error);
      message.error('Failed to load tank reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!hasAccess()) return;

    setLoading(true);
    try {
      await fetchTankReconciliation();
    } catch (error) {
      console.error('❌ Failed to fetch data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentCompany, currentStation, filters, shouldFetchCompanyData, shouldFetchStationData]);

  useEffect(() => {
    fetchData();
    fetchAssets();
  }, [fetchData]);

  // Process shifts when tank data changes
  useEffect(() => {
    if (tankData.recentReconciliations) {
      fetchShifts();
    }
  }, [tankData.recentReconciliations]);

  // Check if user has access to view this component
  const hasAccess = () => {
    return canAccessCompanyLevel || canAccessStationLevel;
  };

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Get flattened data for the restructured table
  const getFlattenedTableData = useCallback(() => {
    if (!tankData.recentReconciliations || pumpMap.size === 0) {
      return [];
    }

    let reconciliations = tankData.recentReconciliations;

    // Filter by shift if selected
    if (filters.shiftId) {
      reconciliations = reconciliations.filter(rec => rec.shiftId === filters.shiftId);
    }

    // Flatten the data - one row per tank reconciliation
    const flattenedData = [];
    
    reconciliations.forEach(reconciliation => {
      reconciliation.tankReconciliations?.forEach(tankRec => {
        // Calculate total pump dispensed
        const totalPumpDispensed = tankRec.connectedPumps?.reduce((sum, pump) => sum + (pump.litersDispensed || 0), 0) || 0;
        
        // Calculate variance and percentage
        const variance = (tankRec.tankReduction || 0) - totalPumpDispensed;
        const variancePercentage = tankRec.tankReduction > 0 ? (Math.abs(variance) / tankRec.tankReduction) * 100 : 0;
        
        // Get pump details
        const pumpDetails = tankRec.connectedPumps?.map(pump => {
          const pumpInfo = pumpMap.get(pump.pumpId);
          return {
            name: pumpInfo ? pumpInfo.name : `Pump-${pump.pumpId?.slice(-4) || 'Unknown'}`,
            litersDispensed: pump.litersDispensed || 0
          };
        }) || [];

        flattenedData.push({
          key: `${reconciliation.id}-${tankRec.id}`,
          shiftNumber: reconciliation.shift?.shiftNumber || 'N/A',
          tankName: tankRec.tank?.asset?.name || 'Unknown Tank',
          productName: tankRec.tank?.product?.name || 'Unknown Product',
          openingVolume: tankRec.openingVolume || 0,
          closingVolume: tankRec.closingVolume || 0,
          tankVolumeChange: tankRec.tankReduction || 0,
          pumps: pumpDetails,
          totalPumpDispensed: totalPumpDispensed,
          variance: variance,
          variancePercentage: variancePercentage,
          reconciliationId: reconciliation.id,
          tankReconciliationId: tankRec.id,
          status: reconciliation.status,
          recordedAt: reconciliation.recordedAt,
          supervisorName: reconciliation.shift?.supervisor ? 
            `${reconciliation.shift.supervisor.firstName} ${reconciliation.shift.supervisor.lastName}` : 
            'Unknown Supervisor'
        });
      });
    });

    return flattenedData;
  }, [tankData.recentReconciliations, pumpMap, filters.shiftId]);

  // Export to PDF function
  const exportToPDF = useCallback(async () => {
    if (!canModifyData) {
      message.error('You do not have permission to export data');
      return;
    }

    setExporting(true);
    try {
      const tableData = getFlattenedTableData();
      
      if (tableData.length === 0) {
        message.warning('No data available to export');
        return;
      }

      // Create new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Tank Reconciliation Report', 14, 15);
      
      // Add subtitle with date range
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const subtitle = `Generated on ${dayjs().format('YYYY-MM-DD HH:mm')}`;
      if (filters.shiftId) {
        const selectedShift = shifts.find(s => s.id === filters.shiftId);
        doc.text(`Shift: ${selectedShift?.shiftNumber || filters.shiftId} | ${subtitle}`, 14, 22);
      } else {
        doc.text(subtitle, 14, 22);
      }

      // Prepare table data
      const tableColumn = [
        'Shift',
        'Tank Name', 
        'Product',
        'Opening (L)',
        'Closing (L)',
        'Tank Change (L)',
        'Pump Dispensed (L)',
        'Variance (L)',
        'Variance %',
        'Status'
      ];

      const tableRows = tableData.map(item => [
        item.shiftNumber.toString(),
        item.tankName,
        item.productName,
        formatNumber(item.openingVolume),
        formatNumber(item.closingVolume),
        formatNumber(item.tankVolumeChange),
        formatNumber(item.totalPumpDispensed),
        formatNumber(Math.abs(item.variance)),
        formatPercentage(item.variancePercentage),
        item.status
      ]);

      // Add table to PDF
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 18 },
          9: { cellWidth: 18 }
        },
        didDrawCell: (data) => {
          // Color code variance and variance percentage cells
          if (data.column.index === 7) { // Variance column
            const variance = tableData[data.row.index]?.variance;
            if (variance > 100) {
              doc.setTextColor(255, 0, 0);
            } else if (variance < -100) {
              doc.setTextColor(255, 165, 0);
            } else {
              doc.setTextColor(0, 128, 0);
            }
          } else if (data.column.index === 8) { // Variance % column
            const variancePercentage = tableData[data.row.index]?.variancePercentage;
            if (variancePercentage > 5) {
              doc.setTextColor(255, 0, 0);
            } else {
              doc.setTextColor(0, 128, 0);
            }
          } else {
            doc.setTextColor(0, 0, 0);
          }
        },
        didDrawPage: (data) => {
          // Add footer
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      });

      // Add summary section
      const finalY = doc.lastAutoTable.finalY + 10;
      if (finalY < 280) {
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text('Summary Statistics', 14, finalY);
        
        const totalVariance = tableData.reduce((sum, item) => sum + Math.abs(item.variance), 0);
        const avgVariance = totalVariance / tableData.length;
        const criticalItems = tableData.filter(item => Math.abs(item.variance) > 100).length;
        const warningItems = tableData.filter(item => item.variance < -100).length;
        
        doc.setFontSize(7);
        doc.text(`Total Records: ${tableData.length}`, 14, finalY + 8);
        doc.text(`Average Variance: ${formatNumber(avgVariance)}L`, 14, finalY + 16);
        doc.text(`Critical Variances (>100L): ${criticalItems}`, 14, finalY + 24);
        doc.text(`Warning Variances (<-100L): ${warningItems}`, 14, finalY + 32);
        
        // Add generated by info
        doc.text(`Generated by: ${currentUser?.name || 'System'}`, 14, finalY + 45);
      }

      // Save the PDF
      const fileName = `tank-reconciliation-${filters.shiftId ? `shift-${filters.shiftId}` : 'all'}-${dayjs().format('YYYY-MM-DD')}.pdf`;
      doc.save(fileName);
      
      message.success('PDF exported successfully');
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      message.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }, [getFlattenedTableData, filters.shiftId, shifts, canModifyData, currentUser]);

  // Show detailed reconciliation view
  const showDetailedReconciliation = (reconciliation) => {
    if (!canViewSensitiveData) {
      message.error('You do not have permission to view detailed reconciliation data');
      return;
    }
    setSelectedReconciliation(reconciliation);
    setDetailModalVisible(true);
  };

  // Format utilities
  const formatNumber = (number) => tankReconciliationService.formatNumber(number);
  const formatPercentage = (number) => tankReconciliationService.formatPercentage(number);

  // Get access level display
  const getAccessLevelDisplay = () => {
    if (shouldFetchCompanyData) return 'Company Level Access';
    if (shouldFetchStationData) return `Station: ${state.currentStation?.name || 'Current Station'}`;
    return 'Limited Access';
  };

  // Main table data
  const tableData = getFlattenedTableData();
  const selectedShift = shifts.find(s => s.id === filters.shiftId);

  // Columns for the compact table
  const tableColumns = [
    {
      title: 'Shift',
      dataIndex: 'shiftNumber',
      key: 'shiftNumber',
      width: 60,
      render: (shiftNumber) => (
        <Text style={{ fontSize: '11px' }}>{shiftNumber}</Text>
      )
    },
    {
      title: 'Tank',
      dataIndex: 'tankName',
      key: 'tankName',
      width: 80,
      render: (name) => (
        <Text style={{ fontSize: '11px' }}>{name}</Text>
      )
    },
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      width: 70,
      render: (product) => (
          <Text style={{ fontSize: '11px' }}>  {product}</Text>
      )
    },
    {
      title: 'Readings (L)',
      key: 'readings',
      width: 90,
      render: (_, record) => (
        <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#52c41a' }}>Open:</span>
            <span style={{color:'#52c41a'}}>{formatNumber(record.openingVolume)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#ee3f13ffff' }}>Close:</span>
            <span style={{ color:'#ee3f13ffff'}}>{formatNumber(record.closingVolume)}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Tank Change (L)',
      dataIndex: 'tankVolumeChange',
      key: 'tankVolumeChange',
      width: 70,
      align: 'center',
      render: (volume) => (
        <Text style={{ fontSize: '11px', color: '#fa8c16' }}>
          {formatNumber(volume)}
        </Text>
      )
    },
    {
      title: 'Pumps (L)',
      key: 'pumps',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
          {record.pumps.slice(0, 2).map((pump, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>{pump.name.split('-')[0]}:</span>
              <span>{formatNumber(pump.litersDispensed)}</span>
            </div>
          ))}
          {record.pumps.length > 2 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
              <span>+{record.pumps.length - 2} more</span>
              <span>{formatNumber(record.totalPumpDispensed)}</span>
            </div>
          )}
          {record.pumps.length <= 2 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: '2px', marginTop: '2px' }}>
              <span style={{ color: '#52c41a' }}>Total:</span>
              <span style={{color:"#52c41a"}}>{formatNumber(record.totalPumpDispensed)}</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Variance (L)',
      dataIndex: 'variance',
      key: 'variance',
      width: 70,
      align: 'center',
      render: (variance) => {
        const absVariance = Math.abs(variance);
        const isCritical = absVariance > 100;
        const isWarning = variance < -100;
        
        let color = '#52c41a';
        if (isCritical) color = '#ff4d4f';
        if (isWarning) color = '#fa8c16';
        
        return (
          <Tooltip title={variance > 0 ? 'Tank reduction exceeds pump dispensing' : 'Pump dispensing exceeds tank reduction'}>
            <div style={{ 
              fontSize: '10px', 
              color: color,
              padding: '2px 4px',
              borderRadius: '2px',
              backgroundColor: `${color}10`
            }}>
              {formatNumber(absVariance)}
              {variance > 0 ? ' ↑' : ' ↓'}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Var %',
      dataIndex: 'variancePercentage',
      key: 'variancePercentage',
      width: 60,
      align: 'center',
      render: (percentage) => {
        const isCritical = percentage > 5;
        return (
          <Text style={{ 
            fontSize: '10px', 
            color: isCritical ? '#ff4d4f' : '#52c41a'
          }}>
            {formatPercentage(percentage)}
          </Text>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (status) => (
        <Tag 
          color={tankReconciliationService.getReconciliationStatusColor(status)}
          style={{ fontSize: '9px', margin: 0, padding: '0 4px' }}
        >
          {tankReconciliationService.formatReconciliationStatus(status).slice(0, 3)}
        </Tag>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      render: (_, record) => (
        <Tooltip title="View details">
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            type="text"
            style={{ fontSize: '12px', padding: '0 4px' }}
            onClick={() => {
              const fullRecord = tankData.recentReconciliations?.find(
                rec => rec.id === record.reconciliationId
              );
              if (fullRecord) {
                showDetailedReconciliation(fullRecord);
              }
            }}
          />
        </Tooltip>
      )
    }
  ];

  // Main render
  if (!hasAccess()) {
    return (
      <Alert
        message="Access Denied"
        description="You do not have permission to access tank reconciliation data."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="tank-reconciliation-management">
      <Card 
        size="small"
        style={{ border: 'none' }}
        bodyStyle={{ padding: '16px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
              <Space>
                <Fuel style={{ width: 18, height: 18 }} />
                Tank Reconciliation
              </Space>
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Detailed reconciliation view
            </Text>
          </div>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              loading={loading}
              size="small"
            >
              Refresh
            </Button>
            <Button 
              icon={<FilePdfOutlined />}
              loading={exporting}
              onClick={exportToPDF}
              type="primary"
              size="small"
            >
              PDF
            </Button>
          </Space>
        </div>

        {/* Access Level Indicator */}
        <Alert
          message={getAccessLevelDisplay()}
          description={`Viewing as ${userRole?.replace('_', ' ')} • ${tableData.length} records`}
          type="info"
          showIcon
          style={{ marginBottom: '16px', fontSize: '12px' }}
          size="small"
        />

        {/* Shift Filter */}
        <Card 
          size="small" 
          style={{ marginBottom: '16px', border: '1px solid #f0f0f0' }}
          bodyStyle={{ padding: '12px' }}
        >
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text style={{ fontSize: '12px' }}>Filter by Shift:</Text>
                <Select
                  style={{ width: '100%' }}
                  size="small"
                  value={filters.shiftId}
                  onChange={(value) => handleFilterChange({ shiftId: value })}
                  placeholder="Select a shift..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {shifts.map(shift => (
                    <Option key={shift.id} value={shift.id}>
                      Shift {shift.shiftNumber} - {dayjs(shift.startTime).format('MMM DD, YYYY')}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={16}>
              {selectedShift && (
                <div style={{ fontSize: '12px' }}>
                  <Text>Selected: Shift {selectedShift.shiftNumber} • {dayjs(selectedShift.startTime).format('MMM DD, YYYY HH:mm')}</Text>
                </div>
              )}
            </Col>
          </Row>
        </Card>

        {/* Main Table */}
        <Card 
          size="small"
          style={{ border: '1px solid #f0f0f0' }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            columns={tableColumns}
            dataSource={tableData}
            loading={loading}
            size="small"
            scroll={{ x: 800 }}
            pagination={{ 
              pageSize: 15,
              showSizeChanger: true,
              showQuickJumper: true,
              size: 'small',
              showTotal: (total, range) => (
                <Text style={{ fontSize: '12px' }}>
                  {range[0]}-{range[1]} of {total}
                </Text>
              )
            }}
            rowKey="key"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    filters.shiftId 
                      ? "No data for selected shift"
                      : "No reconciliation data"
                  }
                  style={{ padding: '20px' }}
                />
              )
            }}
            style={{ 
              fontSize: '11px',
            }}
            components={{
              header: {
                cell: (props) => (
                  <th 
                    {...props} 
                    style={{ 
                      ...props.style, 
                      fontSize: '11px', 
                      fontWeight: '600',
                      padding: '8px 4px',
                      backgroundColor: '#fafafa'
                    }} 
                  />
                ),
              },
              body: {
                cell: (props) => (
                  <td 
                    {...props} 
                    style={{ 
                      ...props.style, 
                      fontSize: '11px', 
                      padding: '6px 4px',
                      borderBottom: '1px solid #f0f0f0'
                    }} 
                  />
                ),
              },
            }}
          />
        </Card>

        {/* Summary Stats */}
        {tableData.length > 0 && (
          <Card 
            size="small" 
            style={{ marginTop: '16px', border: '1px solid #f0f0f0' }}
            bodyStyle={{ padding: '12px' }}
          >
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#666' }}>Total Records</Text>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{tableData.length}</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#666' }}>Avg Variance</Text>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#fa8c16' }}>
                    {formatNumber(tableData.reduce((sum, item) => sum + Math.abs(item.variance), 0) / tableData.length)}L
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#666' }}>Critical</Text>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#ff4d4f' }}>
                    {tableData.filter(item => Math.abs(item.variance) > 100).length}
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#666' }}>In Tolerance</Text>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#52c41a' }}>
                    {tableData.filter(item => Math.abs(item.variance) <= 100).length}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default TankReconciliationManagement;