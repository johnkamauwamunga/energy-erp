// components/MultiTable/MultiTable.jsx
import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// Helper function to get nested object properties safely
const getNestedValue = (obj, path, defaultValue = 'N/A') => {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined && result !== null ? result : defaultValue;
};

// Modal component for different data types
const DataModal = ({ isOpen, onClose, type, data, title }) => {
  if (!isOpen) return null;

  const renderModalContent = () => {
    switch (type) {
      case 'collections':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Collections</div>
              <div className="text-2xl font-bold text-purple-800">
                KES {data?.total?.toLocaleString()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-600">Cash</div>
                <div className="font-semibold">KES {data?.cash?.toLocaleString()}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-xs text-green-600">Mobile Money</div>
                <div className="font-semibold">KES {data?.mobileMoney?.toLocaleString()}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-xs text-blue-600">Visa</div>
                <div className="font-semibold">KES {data?.visa?.toLocaleString()}</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-xs text-red-600">Mastercard</div>
                <div className="font-semibold">KES {data?.mastercard?.toLocaleString()}</div>
              </div>
            </div>

            {data?.breakdown && (
              <div className="mt-4">
                <h4 className="font-semibold mb-3 text-gray-800">Island Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(data.breakdown).map(([islandId, breakdown]) => (
                    <div key={islandId} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">Island {islandId}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Cash: KES {breakdown.cash?.toLocaleString()}</span>
                        <span>Mobile: KES {breakdown.mobileMoney?.toLocaleString()}</span>
                        <span>Expected: KES {breakdown.expectedAmount?.toLocaleString()}</span>
                        <span>Variance: {breakdown.variancePercentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'tanks':
        return (
          <div className="space-y-4">
            <div className="bg-teal-50 p-4 rounded-lg">
              <div className="text-sm text-teal-600 font-medium">Tank Operations</div>
              <div className="text-2xl font-bold text-teal-800">
                {data?.length || 0} Tanks
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data?.map((tank, index) => (
                <div key={tank.tankId || index} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{tank.tankName}</div>
                      <div className="text-sm text-gray-600">{tank.product?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {tank.currentVolume?.toLocaleString()} L
                      </div>
                      <div className="text-xs text-gray-500">of {tank.capacity?.toLocaleString()} L</div>
                    </div>
                  </div>
                  
                  {tank.dipReadings && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Dip Readings</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {tank.dipReadings.map((reading, idx) => (
                          <div key={idx} className={`p-2 rounded ${
                            reading.readingType === 'START' ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            <div className="font-medium">{reading.readingType}</div>
                            <div>Dip: {reading.dipValue}</div>
                            <div>Vol: {reading.volume} L</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'pumps':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Pump Operations</div>
              <div className="text-2xl font-bold text-orange-800">
                {data?.length || 0} Pumps
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data?.map((pump, index) => (
                <div key={pump.pumpId || index} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{pump.pumpName}</div>
                      <div className="text-sm text-gray-600">{pump.product?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {pump.totalVolume?.toLocaleString()} L
                      </div>
                      <div className="text-xs text-gray-500">dispensed</div>
                    </div>
                  </div>
                  
                  {pump.readings && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Meter Readings</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {pump.readings.map((reading, idx) => (
                          <div key={idx} className={`p-2 rounded ${
                            reading.readingType === 'START' ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            <div className="font-medium">{reading.readingType}</div>
                            <div>Electric: {reading.electricMeter}</div>
                            <div>Manual: {reading.manualMeter}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'attendants':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Attendant Assignments</div>
              <div className="text-2xl font-bold text-blue-800">
                {data?.length || 0} Attendants
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data?.map((attendant, index) => (
                <div key={attendant.id || index} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{attendant.name}</div>
                      <div className="text-sm text-gray-600">{attendant.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Island: {attendant.islandCode} • {attendant.assignmentType}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      attendant.assignmentType === 'PRIMARY' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {attendant.assignmentType}
                    </div>
                  </div>
                  
                  {attendant.assignedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      Assigned: {new Date(attendant.assignedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'sales':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
                <div className="text-2xl font-bold text-blue-800">
                  KES {data?.totalRevenue?.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Fuel Sales</div>
                <div className="text-xl font-bold text-green-800">
                  KES {data?.fuelRevenue?.toLocaleString()}
                </div>
              </div>
            </div>

            {data?.productSales && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-800">Product Sales Breakdown</h4>
                <div className="space-y-2">
                  {data.productSales.map((product, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: product.colorCode || '#6B7280' }}
                        ></div>
                        <span className="text-gray-600">{product.productName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">KES {product.revenue?.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{product.volume?.toLocaleString()} L</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            No details available for this section
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          {renderModalContent()}
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const MultiTable = ({
  columns,
  data,
  className,
  headerClass = "bg-gray-50",
  rowClass = "hover:bg-gray-50 transition-colors duration-150",
  emptyMessage = "No data available",
  paginate = true,
  pageSize = 10,
  showPageInfo = true,
  showPageControls = true,
  expandable = true,
  renderExpandedContent,
  onCellClick,
  responsiveBreakpoint = "md",
  loading = false
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
  const handleCellClick = (modalType, rowData, modalTitle, cellData) => {
    if (onCellClick) {
      onCellClick(modalType, rowData);
    } else {
      setActiveModal(modalType);
      setModalData({ 
        data: cellData || rowData, 
        title: modalTitle 
      });
    }
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // Get cell value safely
  const getCellValue = (item, accessor) => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    return getNestedValue(item, accessor);
  };

  // Render pagination controls
  const renderPagination = () => {
    if (!paginate || totalPages <= 1 || !data || data.length === 0) return null;
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 bg-white gap-4">
        {showPageInfo && (
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{startItem}</span> to{" "}
            <span className="font-semibold">{endItem}</span> of{" "}
            <span className="font-semibold">{totalItems}</span> records
          </div>
        )}
        
        {showPageControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[70px]",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              )}
            >
              First
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[90px]",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              )}
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setCurrentPage(Math.max(1, Math.min(totalPages, value)));
                  }
                }}
                className="w-16 px-2 py-2 text-sm border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-700">of {totalPages}</span>
            </div>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[70px]",
                currentPage === totalPages
                  ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              )}
            >
              Next
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[70px]",
                currentPage === totalPages
                  ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                  : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              )}
            >
              Last
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading data...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="py-12 text-center">
          <div className="text-gray-400 text-lg mb-2">{emptyMessage}</div>
          <div className="text-gray-500 text-sm">No records found</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={clsx("bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden", className)}>
        {/* Mobile Card View */}
        <div className={clsx("block", {
          "md:hidden": responsiveBreakpoint === "md",
          "lg:hidden": responsiveBreakpoint === "lg"
        })}>
          {currentData.map((item, index) => (
            <div key={item.id} className="border-b border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-gray-900">
                  {getCellValue(item, columns[0].accessor)}
                </div>
                {expandable && (
                  <button
                    onClick={() => toggleRowExpansion(item.id)}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
                  >
                    {expandedRows.has(item.id) ? '▼' : '▶'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {columns.slice(1, 5).map((column, colIndex) => {
                  const value = getCellValue(item, column.accessor);
                  return (
                    <div key={column.key || colIndex}>
                      <div className="text-gray-500 text-xs font-medium mb-1">{column.header}</div>
                      <div 
                        className={clsx(
                          column.clickable && "text-blue-600 cursor-pointer hover:underline font-medium"
                        )}
                        onClick={() => column.clickable && handleCellClick(
                          column.modalType, 
                          item,
                          column.modalTitle,
                          column.modalDataAccessor ? getCellValue(item, column.modalDataAccessor) : value
                        )}
                      >
                        {column.render ? column.render(value, item) : value}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expanded content for mobile */}
              {expandable && expandedRows.has(item.id) && renderExpandedContent && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
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
                      "px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider",
                      column.className
                    )}
                  >
                    {column.header}
                  </th>
                ))}
                {expandable && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                    Details
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((item, rowIndex) => {
                const isExpanded = expandedRows.has(item.id);
                
                return (
                  <React.Fragment key={item.id}>
                    <tr className={clsx(rowClass, isExpanded && "bg-blue-50")}>
                      {columns.map((column, colIndex) => {
                        const value = getCellValue(item, column.accessor);
                        return (
                          <td
                            key={colIndex}
                            className={clsx(
                              "px-6 py-4 text-sm",
                              column.cellClassName,
                              column.clickable && "cursor-pointer hover:bg-blue-50"
                            )}
                            onClick={() => column.clickable && handleCellClick(
                              column.modalType,
                              item,
                              column.modalTitle,
                              column.modalDataAccessor ? getCellValue(item, column.modalDataAccessor) : value
                            )}
                          >
                            {column.render 
                              ? column.render(value, item) 
                              : value
                            }
                          </td>
                        );
                      })}
                      
                      {expandable && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleRowExpansion(item.id)}
                            className={clsx(
                              "p-2 rounded-lg transition-colors",
                              isExpanded 
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
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
      
      <DataModal
        isOpen={!!activeModal}
        onClose={closeModal}
        type={activeModal}
        data={modalData?.data}
        title={modalData?.title}
      />
    </>
  );
};

export default MultiTable;