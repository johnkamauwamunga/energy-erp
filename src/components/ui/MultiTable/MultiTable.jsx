// MultiTable.jsx
import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// Helper function to get nested object properties
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

const MultiTable = ({
  columns,
  data,
  renderRow,
  className,
  headerClass = "bg-gray-50",
  rowClass = "hover:bg-gray-50",
  emptyMessage = "No data available",
  paginate = true,
  pageSize = 10,
  showPageInfo = true,
  showPageControls = true,
  expandable = true,
  renderExpandedContent,
  onCellClick,
  responsiveBreakpoint = "md"
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);

  // Calculate pagination values
  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Get current page data
  const currentData = useMemo(() => {
    if (!paginate || !data) return data;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize, paginate, totalItems]);

  // Toggle row expansion
  const toggleRowExpansion = (rowId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Handle cell click for modals
  const handleCellClick = (cellType, rowData, additionalData = null) => {
    if (onCellClick) {
      onCellClick(cellType, rowData, additionalData);
    } else {
      setActiveModal(cellType);
      setModalData({ rowData, additionalData });
    }
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // Get cell value - supports nested accessors
  const getCellValue = (item, accessor) => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    if (typeof accessor === 'string' && accessor.includes('.')) {
      return getNestedValue(item, accessor);
    }
    return item[accessor];
  };

  // Render pagination controls
  const renderPagination = () => {
    if (!paginate || totalPages <= 1 || !data || data.length === 0) return null;
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-200 bg-white gap-2">
        {showPageInfo && (
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalItems}</span> records
          </div>
        )}
        
        {showPageControls && (
          <div className="flex items-center flex-wrap gap-2 justify-center">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={clsx(
                "px-3 py-1 rounded border text-sm min-w-[60px]",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              First
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={clsx(
                "px-3 py-1 rounded border text-sm min-w-[80px]",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-700">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                className="w-12 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
              <span className="text-sm text-gray-700">
                of {totalPages}
              </span>
            </div>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={clsx(
                "px-3 py-1 rounded border text-sm min-w-[60px]",
                currentPage === totalPages
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              Next
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={clsx(
                "px-3 py-1 rounded border text-sm min-w-[60px]",
                currentPage === totalPages
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              Last
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render modals based on active modal type
  const renderModal = () => {
    if (!activeModal || !modalData) return null;

    const modalConfigs = {
      sales: {
        title: "Sales Details",
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-600">Total Sales</div>
                <div className="text-xl font-bold">${modalData.rowData.sales.total.toLocaleString()}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-green-600">Transactions</div>
                <div className="text-xl font-bold">{modalData.rowData.sales.transactions}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Sales Breakdown</h4>
              <div className="space-y-2">
                {modalData.rowData.sales.breakdown?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{item.category}</span>
                    <span className="font-medium">${item.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      },
      attendants: {
        title: "Attendants Details",
        content: (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              {modalData.rowData.attendants?.length || 0} attendants on shift
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {modalData.rowData.attendants?.map((attendant, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{attendant.name}</div>
                    <div className="text-sm text-gray-600">{attendant.role}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    attendant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {attendant.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      },
      shift: {
        title: "Shift Overview",
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-purple-600">Duration</div>
                <div className="text-lg font-bold">{modalData.rowData.shift?.duration}h</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-sm text-orange-600">Efficiency</div>
                <div className="text-lg font-bold">{modalData.rowData.shift?.efficiency}%</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Shift Notes</h4>
              <p className="text-gray-600 text-sm">{modalData.rowData.shift?.notes}</p>
            </div>
          </div>
        )
      }
    };

    const config = modalConfigs[activeModal];
    if (!config) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{config.title}</h3>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            {config.content}
          </div>
          <div className="flex justify-end p-4 border-t">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="py-12 text-center">
          <div className="text-gray-400 mb-2">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={clsx("bg-white rounded-lg shadow overflow-hidden", className)}>
        {/* Mobile Card View */}
        <div className={clsx("block", {
          "md:hidden": responsiveBreakpoint === "md",
          "lg:hidden": responsiveBreakpoint === "lg"
        })}>
          {currentData.map((item, index) => (
            <div key={item.id} className="border-b border-gray-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">{getCellValue(item, columns[0].accessor)}</div>
                {expandable && (
                  <button
                    onClick={() => toggleRowExpansion(item.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedRows.has(item.id) ? '▼' : '▶'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                {columns.slice(1, 5).map((column, colIndex) => {
                  const value = getCellValue(item, column.accessor);
                  return (
                    <div key={column.key || colIndex}>
                      <div className="text-gray-600">{column.header}</div>
                      <div 
                        className={column.clickable ? "text-blue-600 cursor-pointer hover:underline" : ""}
                        onClick={() => column.clickable && handleCellClick(column.modalType, item)}
                      >
                        {column.render ? column.render(value, item) : value}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expanded content for mobile */}
              {expandable && expandedRows.has(item.id) && renderExpandedContent && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  {renderExpandedContent(item)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className={clsx("hidden overflow-x-auto", {
          "md:block": responsiveBreakpoint === "md",
          "lg:block": responsiveBreakpoint === "lg"
        })}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={headerClass}>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key || index}
                    className={clsx(
                      "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                      column.className
                    )}
                  >
                    {column.header}
                  </th>
                ))}
                {expandable && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((item, rowIndex) => {
                const isExpanded = expandedRows.has(item.id);
                
                return (
                  <React.Fragment key={item.id}>
                    <tr className={clsx(rowClass, rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50")}>
                      {typeof renderRow === 'function' 
                        ? renderRow(item)
                        : columns.map((column, colIndex) => {
                            const value = getCellValue(item, column.accessor);
                            return (
                              <td
                                key={colIndex}
                                className={clsx(
                                  "px-4 py-4 whitespace-nowrap text-sm",
                                  column.cellClassName,
                                  column.clickable && "cursor-pointer hover:bg-gray-100"
                                )}
                                onClick={() => column.clickable && handleCellClick(column.modalType, item, column.additionalData)}
                              >
                                {column.render 
                                  ? column.render(value, item) 
                                  : value
                                }
                              </td>
                            );
                          })
                      }
                      
                      {expandable && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleRowExpansion(item.id)}
                            className="text-gray-500 hover:text-gray-700 p-1 rounded"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </td>
                      )}
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandable && isExpanded && renderExpandedContent && (
                      <tr>
                        <td colSpan={columns.length + (expandable ? 1 : 0)} className="p-0">
                          <div className="bg-gray-50 border-t border-gray-200 p-6">
                            {renderExpandedContent(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {renderPagination()}
      </div>
      
      {renderModal()}
    </>
  );
};

export default MultiTable;