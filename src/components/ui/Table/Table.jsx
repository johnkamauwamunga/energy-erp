import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

const Table = ({
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
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  
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

  // Handle page changes
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    if (!paginate || totalPages <= 1 || !data || data.length === 0) return null;
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
        {showPageInfo && (
          <div className="mb-2 sm:mb-0 text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalItems}</span> records
          </div>
        )}
        
        {showPageControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className={clsx(
                "px-3 py-1 rounded border text-sm",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              First
            </button>
            
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={clsx(
                "px-3 py-1 rounded border text-sm",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              Previous
            </button>
            
            <div className="flex items-center">
              <span className="px-2 text-sm text-gray-700">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-12 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
              <span className="px-2 text-sm text-gray-700">
                of {totalPages}
              </span>
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={clsx(
                "px-3 py-1 rounded border text-sm",
                currentPage === totalPages
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
              )}
            >
              Next
            </button>
            
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className={clsx(
                "px-3 py-1 rounded border text-sm",
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
    <div className={clsx("bg-white rounded-lg shadow overflow-hidden", className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className={headerClass}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                className={clsx(
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentData.map((item, rowIndex) => {
            // If renderRow is provided, use it to render the row
            if (typeof renderRow === 'function') {
              return (
                <tr 
                  key={item.id || rowIndex} 
                  className={clsx(rowClass, rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50")}
                >
                  {renderRow(item)}
                </tr>
              );
            }
            
            // Otherwise, automatically render based on columns
            return (
              <tr 
                key={item.id || rowIndex} 
                className={clsx(rowClass, rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50")}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={clsx(
                      "px-6 py-4 whitespace-nowrap text-sm text-left",
                      column.cellClassName
                    )}
                  >
                    {column.render 
                      ? column.render(item[column.accessor], item) 
                      : item[column.accessor]
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {renderPagination()}
    </div>
  );
};

export const TableRow = ({ children, className }) => (
  <tr className={className}>{children}</tr>
);

export const TableCell = ({ 
  children, 
  className, 
  align = "left",
  colSpan,
  rowSpan 
}) => (
  <td
    className={clsx(
      "px-6 py-4 whitespace-nowrap text-sm",
      `text-${align}`,
      className
    )}
    colSpan={colSpan}
    rowSpan={rowSpan}
  >
    {children}
  </td>
);

export default Table;