import React, { useState } from 'react';
import { 
  Button, 
  Dropdown, 
  Modal, 
  Checkbox, 
  Space, 
  Divider,
  message,
  Row,
  Col 
} from 'antd';
import { 
  DownloadOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AdvancedReportGenerator = ({ 
  dataSource = [],
  columns = [],
  title = 'Report',
  fileName = 'report',
  showFooter = false,
  footerText,
  customStyles
}) => {
  const [columnModalVisible, setColumnModalVisible] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // Initialize selected columns
  React.useEffect(() => {
    const initialColumns = columns
      .filter(col => col.dataIndex && col.title)
      .map(col => col.dataIndex);
    setSelectedColumns(initialColumns);
  }, [columns]);

  // Get visible columns
  const getVisibleColumns = () => {
    return columns.filter(col => 
      selectedColumns.includes(col.dataIndex) && 
      col.dataIndex && 
      col.title
    );
  };

  // Extract data for export
  const getExportData = () => {
    const visibleColumns = getVisibleColumns();
    
    const headers = visibleColumns.map(col => ({
      key: col.dataIndex,
      title: typeof col.title === 'string' ? col.title : col.key || col.dataIndex,
      dataIndex: col.dataIndex,
      render: col.render
    }));

    const data = dataSource.map(record => 
      headers.reduce((acc, header) => {
        let value = record[header.dataIndex];
        
        // Apply column render function if exists
        if (header.render && typeof header.render === 'function') {
          const rendered = header.render(value, record);
          if (React.isValidElement(rendered)) {
            // Extract text from React elements
            value = extractTextFromElement(rendered);
          } else {
            value = rendered;
          }
        }
        
        acc[header.title] = value != null ? String(value) : '';
        return acc;
      }, {})
    );

    return { headers, data };
  };

  // Helper to extract text from React elements
  const extractTextFromElement = (element) => {
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return String(element);
    
    if (React.isValidElement(element)) {
      // Handle simple elements with children
      if (element.props && element.props.children) {
        if (typeof element.props.children === 'string') {
          return element.props.children;
        }
        if (Array.isArray(element.props.children)) {
          return element.props.children
            .map(child => extractTextFromElement(child))
            .join(' ');
        }
      }
    }
    
    return '';
  };

  // Generate PDF with advanced features
  const generatePDF = () => {
    try {
      const { headers, data } = getExportData();
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, pageWidth / 2, 15, { align: 'center' });
      
      // Add generation date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
      
      // Prepare table data
      const pdfHeaders = headers.map(header => header.title);
      const pdfData = data.map(record => 
        headers.map(header => record[header.title])
      );

      // Generate table
      doc.autoTable({
        head: [pdfHeaders],
        body: pdfData,
        startY: 30,
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 30 }
      });

      // Add footer if needed
      if (showFooter && footerText) {
        const finalY = doc.lastAutoTable.finalY || 100;
        doc.setFontSize(8);
        doc.text(footerText, pageWidth / 2, finalY + 10, { align: 'center' });
      }

      doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
      message.success('PDF report generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error('Failed to generate PDF report');
    }
  };

  // Generate Excel with advanced features
  const generateExcel = () => {
    try {
      const { headers, data } = getExportData();
      
      const wb = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = [headers.map(header => header.title), ...data.map(record => 
        headers.map(header => record[header.title])
      )];

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Style the header row
      if (!ws['!cols']) ws['!cols'] = [];
      headers.forEach((_, index) => {
        ws['!cols'][index] = { width: 15 };
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
      
      // Add metadata sheet
      const metadata = [
        ['Report Title', title],
        ['Generated Date', new Date().toLocaleString()],
        ['Total Records', data.length],
        ['Generated By', 'Energy ERP System']
      ];
      
      const metadataWs = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.book_append_sheet(wb, metadataWs, 'Report Info');

      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      message.success('Excel report generated successfully!');
    } catch (error) {
      console.error('Excel generation error:', error);
      message.error('Failed to generate Excel report');
    }
  };

  // Column selection modal
  const ColumnSelectionModal = () => (
    <Modal
      title="Select Columns to Export"
      open={columnModalVisible}
      onOk={() => setColumnModalVisible(false)}
      onCancel={() => setColumnModalVisible(false)}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={[16, 8]}>
          {columns
            .filter(col => col.dataIndex && col.title)
            .map(column => (
              <Col xs={24} sm={12} key={column.dataIndex}>
                <Checkbox
                  checked={selectedColumns.includes(column.dataIndex)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColumns(prev => [...prev, column.dataIndex]);
                    } else {
                      setSelectedColumns(prev => prev.filter(col => col !== column.dataIndex));
                    }
                  }}
                >
                  {typeof column.title === 'string' ? column.title : column.key}
                </Checkbox>
              </Col>
            ))
          }
        </Row>
      </Space>
    </Modal>
  );

  const items = [
    {
      key: 'excel',
      label: 'Export as Excel',
      icon: <FileExcelOutlined />,
      onClick: generateExcel
    },
    {
      key: 'pdf',
      label: 'Export as PDF',
      icon: <FilePdfOutlined />,
      onClick: generatePDF
    },
    {
      type: 'divider'
    },
    {
      key: 'settings',
      label: 'Column Settings',
      icon: <SettingOutlined />,
      onClick: () => setColumnModalVisible(true)
    }
  ];

  return (
    <>
      <Dropdown
        menu={{ items }}
        placement="bottomLeft"
        trigger={['click']}
      >
        <Button type="primary" icon={<DownloadOutlined />}>
          Export Report
        </Button>
      </Dropdown>
      
      <ColumnSelectionModal />
    </>
  );
};

export default AdvancedReportGenerator;