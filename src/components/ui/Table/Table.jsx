import React from 'react';
import clsx from 'clsx';

const Table = ({
  columns,
  data,
  renderRow,
  className,
  headerClass = "bg-gray-50",
  rowClass = "hover:bg-gray-50",
  emptyMessage = "No data available",
}) => {
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
          {data.map((item, rowIndex) => {
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