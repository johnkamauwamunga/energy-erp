import React from 'react';
import { Button, Dropdown, Space, message } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ReportGenerator = ({ 
  tableRef, 
  dataSource, 
  columns, 
  title = 'Report',
  fileName = 'report',
  showColumnSelector = false,
  customData = null,
  customColumns = null
}) => {
  // Get column definitions and data
  const getProcessedData = () => {
    const data = customData || dataSource || [];
    const cols = customColumns || columns || [];
    
    return {
      columns: cols,
      data: data
    };
  };

  // Extract headers from columns
  const extractHeaders = (columns) => {
    return columns
      .filter(col => !col.hidden && col.title && col.dataIndex)
      .map(col => ({
        key: col.dataIndex,
        title: typeof col.title === 'string' ? col.title : col.key || col.dataIndex,
        dataIndex: col.dataIndex,
        render: col.render
      }));
  };

  // Format cell value based on column render function
  const formatCellValue = (value, column, record) => {
    if (column.render) {
      // For React components, we need to extract text content
      // This is a simplified version - you might need to enhance it
      if (React.isValidElement(column.render(value, record))) {
        return String(value) || '';
      }
      return column.render(value, record) || '';
    }
    return value;
  };

  // Generate PDF Report
  const generatePDF = () => {
    try {
      const { columns: tableColumns, data } = getProcessedData();
      const headers = extractHeaders(tableColumns);
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      
      // Prepare data for autoTable
      const pdfHeaders = headers.map(header => header.title);
      const pdfData = data.map(record => 
        headers.map(header => {
          const value = record[header.dataIndex];
          return formatCellValue(value, header, record);
        })
      );

      // Generate table
      doc.autoTable({
        head: [pdfHeaders],
        body: pdfData,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] }
      });

      // Save PDF
      doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
      message.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      message.error('Failed to generate PDF');
    }
  };

  // Generate Excel Report
  const generateExcel = () => {
    try {
      const { columns: tableColumns, data } = getProcessedData();
      const headers = extractHeaders(tableColumns);
      
      // Prepare data for Excel
      const excelHeaders = headers.map(header => header.title);
      const excelData = data.map(record => 
        headers.reduce((acc, header) => {
          const value = record[header.dataIndex];
          acc[header.title] = formatCellValue(value, header, record);
          return acc;
        }, {})
      );

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData, { header: excelHeaders });
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      
      // Generate and save Excel file
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      message.success('Excel file generated successfully!');
    } catch (error) {
      console.error('Excel generation error:', error);
      message.error('Failed to generate Excel file');
    }
  };

  const items = [
    {
      key: 'pdf',
      label: 'Export as PDF',
      icon: <FilePdfOutlined />,
      onClick: generatePDF
    },
    {
      key: 'excel',
      label: 'Export as Excel',
      icon: <FileExcelOutlined />,
      onClick: generateExcel
    }
  ];

  return (
    <Dropdown
      menu={{ items }}
      placement="bottomLeft"
      trigger={['click']}
    >
      <Button type="primary" icon={<DownloadOutlined />}>
        Export Report
      </Button>
    </Dropdown>
  );
};

export default ReportGenerator;