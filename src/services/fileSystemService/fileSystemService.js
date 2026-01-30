// services/fileSystemService/fileSystemService.js

// In-memory storage for demo/simulation
const fileSystemStorage = {
  // Simulate file storage structure
  files: new Map(),
  
  // Simulate directory structure
  directories: new Set(['/', '/Documents', '/Documents/Energy', '/Documents/Energy/Shift Close Cash Summary Report'])
};

const fileSystemService = {
  /**
   * Save shift cash summary report
   * @param {Object} summaryData - Enhanced summary modal data
   * @param {string} customPath - Optional custom path
   * @returns {Object} - Result with file info
   */
  async saveShiftCashSummary(summaryData, customPath = null) {
    try {
      console.log('📁 Saving shift cash summary report...');
      
      // Validate summary data
      if (!summaryData || !summaryData.shiftId) {
        throw new Error('Invalid summary data: Missing shift information');
      }
      
      // Extract key data
      const {
        shiftId,
        shiftNumber,
        stationName,
        stationCode,
        islands = [],
        overallStats = {},
        timestamp
      } = summaryData;
      
      // Generate file name
      const date = new Date();
      const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '');
      const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '');
      
      const fileName = `cash_summary_${stationCode || 'STN'}_shift${shiftNumber}_${formattedDate}_${formattedTime}.json`;
      
      // Default save path
      const basePath = customPath || '/Documents/Energy/Shift Close Cash Summary Report';
      const fullPath = `${basePath}/${fileName}`;
      
      // Create data structure for saving
      const reportData = {
        // Metadata
        fileName,
        fullPath,
        stationCode,
        stationName,
        shiftId,
        shiftNumber,
        generatedAt: new Date().toISOString(),
        generatedBy: summaryData.generatedBy || 'System',
        
        // Report content
        report: {
          summary: {
            totalSales: overallStats.totalSales || 0,
            totalCashDrops: overallStats.totalCashDrops || 0,
            totalDebtCollections: overallStats.totalDebts || 0,
            totalReceipts: overallStats.totalReceipts || 0,
            totalExpenses: overallStats.totalExpenses || 0,
            totalVariance: overallStats.totalVariance || 0,
            totalIslands: overallStats.totalIslands || 0,
            islandsWithShortage: overallStats.islandsWithShortage || 0,
            islandsBalanced: overallStats.islandsBalanced || 0,
            generationTimestamp: timestamp || new Date().toISOString()
          },
          
          // Island reconciliation data
          islands: islands.map(island => ({
            islandName: island.islandName,
            islandId: island.islandId,
            attendants: island.attendants?.map(att => ({
              name: `${att.firstName || ''} ${att.lastName || ''}`.trim(),
              id: att.id
            })) || [],
            totalSales: island.totalActualSales || 0,
            cashDrops: island.cashCollection || 0,
            debtCollections: island.totalDebts || 0,
            receipts: island.receipts || 0,
            expenses: island.expenses || 0,
            variance: island.variance || 0,
            shortageStatus: island.shortageStatus || 'BALANCED',
            shortagePosted: island.shortagePosted || false,
            collectionsCount: island.collections?.length || 0
          })),
          
          // Debtor breakdown
          debtors: (() => {
            const debtorMap = new Map();
            islands.forEach(island => {
              const collections = island.collections || [];
              collections.forEach(collection => {
                if (collection?.type === 'debt' && collection.debtorName) {
                  const key = collection.debtorId || collection.debtorName;
                  if (!debtorMap.has(key)) {
                    debtorMap.set(key, {
                      name: collection.debtorName,
                      code: collection.debtorCode,
                      total: 0,
                      transactions: []
                    });
                  }
                  const debtor = debtorMap.get(key);
                  debtor.total += collection.amount || 0;
                  debtor.transactions.push({
                    island: island.islandName,
                    amount: collection.amount || 0,
                    timestamp: collection.timestamp || new Date().toISOString()
                  });
                }
              });
            });
            return Array.from(debtorMap.values());
          })(),
          
          // Financial summary
          financialSummary: {
            cashFlow: {
              openingBalance: summaryData.walletBalance || 0,
              totalRevenue: overallStats.totalSales || 0,
              totalCollections: overallStats.totalCollected || 0,
              closingBalance: (summaryData.walletBalance || 0) + (overallStats.totalSales || 0)
            },
            variances: {
              totalVariance: overallStats.totalVariance || 0,
              islandsWithIssues: islands.filter(island => Math.abs(island.variance || 0) > 10).length,
              totalShortageAmount: islands
                .filter(island => island.variance > 10)
                .reduce((sum, island) => sum + (island.variance || 0), 0),
              totalOverageAmount: Math.abs(islands
                .filter(island => island.variance < -10)
                .reduce((sum, island) => sum + (island.variance || 0), 0))
            }
          }
        },
        
        // Original data for reference
        rawData: {
          islandsCount: islands.length,
          totalCollections: islands.reduce((sum, island) => sum + (island.collections?.length || 0), 0),
          dataVersion: '1.0'
        }
      };
      
      // Simulate saving to file system
      // In a real implementation, this would save to server or localStorage
      fileSystemStorage.files.set(fullPath, {
        path: fullPath,
        name: fileName,
        data: reportData,
        size: JSON.stringify(reportData).length,
        type: 'application/json',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      // Also save to localStorage for persistence (demo purposes)
      try {
        const storageKey = `shift_report_${shiftId}_${Date.now()}`;
        localStorage.setItem(storageKey, JSON.stringify({
          ...reportData,
          localStorageKey: storageKey
        }));
        
        // Keep track of recent reports
        const recentReports = JSON.parse(localStorage.getItem('recent_shift_reports') || '[]');
        recentReports.unshift({
          shiftId,
          shiftNumber,
          stationCode,
          fileName,
          path: fullPath,
          savedAt: new Date().toISOString(),
          localStorageKey: storageKey
        });
        
        // Keep only last 50 reports
        localStorage.setItem('recent_shift_reports', JSON.stringify(recentReports.slice(0, 50)));
      } catch (storageError) {
        console.warn('Could not save to localStorage:', storageError);
      }
      
      console.log('✅ Report saved successfully:', {
        fileName,
        fullPath,
        dataSize: JSON.stringify(reportData).length,
        islands: islands.length,
        totalSales: overallStats.totalSales
      });
      
      return {
        success: true,
        message: 'Shift cash summary report saved successfully',
        file: {
          name: fileName,
          path: fullPath,
          size: JSON.stringify(reportData).length,
          downloadUrl: this.generateDownloadUrl(reportData, fileName),
          previewUrl: this.generatePreviewUrl(reportData)
        },
        metadata: {
          shiftId,
          shiftNumber,
          stationCode,
          stationName,
          savedAt: new Date().toISOString(),
          dataPoints: {
            islands: islands.length,
            debtors: reportData.report.debtors.length,
            totalTransactions: islands.reduce((sum, island) => sum + (island.collections?.length || 0), 0)
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error saving shift cash summary:', error);
      return {
        success: false,
        message: `Failed to save report: ${error.message}`,
        error: error.message
      };
    }
  },
  
  /**
   * Generate downloadable JSON file URL
   */
  generateDownloadUrl(reportData, fileName) {
    try {
      const jsonStr = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error generating download URL:', error);
      return null;
    }
  },
  
  /**
   * Generate preview URL for the report
   */
  generatePreviewUrl(reportData) {
    // For now, return the download URL
    // In a real implementation, this could generate a PDF or HTML preview
    return this.generateDownloadUrl(reportData, 'preview.json');
  },
  
  /**
   * Get saved report by shift ID
   */
  async getReportByShiftId(shiftId) {
    try {
      // Check localStorage for saved reports
      const recentReports = JSON.parse(localStorage.getItem('recent_shift_reports') || '[]');
      const reportInfo = recentReports.find(report => report.shiftId === shiftId);
      
      if (reportInfo && reportInfo.localStorageKey) {
        const reportData = JSON.parse(localStorage.getItem(reportInfo.localStorageKey));
        if (reportData) {
          return {
            success: true,
            report: reportData,
            metadata: {
              foundIn: 'localStorage',
              savedAt: reportInfo.savedAt
            }
          };
        }
      }
      
      // Check in-memory storage
      for (const [path, file] of fileSystemStorage.files.entries()) {
        if (file.data.shiftId === shiftId) {
          return {
            success: true,
            report: file.data,
            metadata: {
              foundIn: 'memory',
              path: path
            }
          };
        }
      }
      
      return {
        success: false,
        message: 'No report found for this shift'
      };
      
    } catch (error) {
      console.error('Error getting report:', error);
      return {
        success: false,
        message: `Error retrieving report: ${error.message}`
      };
    }
  },
  
  /**
   * Get all saved reports
   */
  async getAllReports() {
    try {
      const recentReports = JSON.parse(localStorage.getItem('recent_shift_reports') || '[]');
      
      return {
        success: true,
        reports: recentReports,
        total: recentReports.length,
        storageInfo: {
          type: 'localStorage',
          maxReports: 50
        }
      };
      
    } catch (error) {
      console.error('Error getting all reports:', error);
      return {
        success: false,
        reports: [],
        total: 0,
        error: error.message
      };
    }
  },
  
  /**
   * Delete a report
   */
  async deleteReport(shiftId) {
    try {
      const recentReports = JSON.parse(localStorage.getItem('recent_shift_reports') || '[]');
      const reportIndex = recentReports.findIndex(report => report.shiftId === shiftId);
      
      if (reportIndex !== -1) {
        const reportInfo = recentReports[reportIndex];
        
        // Remove from localStorage
        localStorage.removeItem(reportInfo.localStorageKey);
        
        // Remove from recent reports list
        recentReports.splice(reportIndex, 1);
        localStorage.setItem('recent_shift_reports', JSON.stringify(recentReports));
        
        // Remove from memory storage
        for (const [path, file] of fileSystemStorage.files.entries()) {
          if (file.data.shiftId === shiftId) {
            fileSystemStorage.files.delete(path);
            break;
          }
        }
        
        return {
          success: true,
          message: 'Report deleted successfully',
          deletedShiftId: shiftId
        };
      }
      
      return {
        success: false,
        message: 'Report not found'
      };
      
    } catch (error) {
      console.error('Error deleting report:', error);
      return {
        success: false,
        message: `Error deleting report: ${error.message}`
      };
    }
  },
  
  /**
   * Export report as JSON file (trigger download)
   */
  exportAsJson(reportData, fileName = 'shift_report.json') {
    try {
      const jsonStr = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      return {
        success: true,
        message: 'Report exported successfully',
        fileName
      };
      
    } catch (error) {
      console.error('Error exporting report:', error);
      return {
        success: false,
        message: `Export failed: ${error.message}`
      };
    }
  },
  
  /**
   * Export report as CSV (simplified version)
   */
  exportAsCsv(reportData, fileName = 'shift_report.csv') {
    try {
      const { report } = reportData;
      let csvContent = 'Shift Cash Summary Report\n\n';
      
      // Add summary section
      csvContent += 'SUMMARY\n';
      csvContent += `Total Sales,${report.summary.totalSales}\n`;
      csvContent += `Cash Drops,${report.summary.totalCashDrops}\n`;
      csvContent += `Debt Collections,${report.summary.totalDebtCollections}\n`;
      csvContent += `Total Variance,${report.summary.totalVariance}\n\n`;
      
      // Add islands section
      csvContent += 'ISLANDS\n';
      csvContent += 'Island Name,Cash Drops,Debt Collections,Variance,Status\n';
      report.islands.forEach(island => {
        csvContent += `${island.islandName},${island.cashDrops},${island.debtCollections},${island.variance},${island.shortageStatus}\n`;
      });
      csvContent += '\n';
      
      // Add debtors section
      if (report.debtors.length > 0) {
        csvContent += 'DEBTORS\n';
        csvContent += 'Debtor Name,Total Collected,Transactions\n';
        report.debtors.forEach(debtor => {
          csvContent += `${debtor.name},${debtor.total},${debtor.transactions.length}\n`;
        });
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      return {
        success: true,
        message: 'CSV exported successfully',
        fileName
      };
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return {
        success: false,
        message: `CSV export failed: ${error.message}`
      };
    }
  },
  
  /**
   * Check if directory exists (simulated)
   */
  async checkDirectoryExists(path) {
    // Simulate directory check
    return new Promise((resolve) => {
      setTimeout(() => {
        const exists = fileSystemStorage.directories.has(path);
        console.log(`Directory check: ${path} - ${exists ? 'Exists' : 'Not found'}`);
        resolve(exists);
      }, 100);
    });
  },
  
  /**
   * Create directory (simulated)
   */
  async createDirectory(path) {
    return new Promise((resolve) => {
      setTimeout(() => {
        fileSystemStorage.directories.add(path);
        console.log(`Directory created: ${path}`);
        resolve({ success: true, path });
      }, 150);
    });
  },
  
  /**
   * Ensure directory exists (create if doesn't)
   */
  async ensureDirectoryExists(path) {
    try {
      const exists = await this.checkDirectoryExists(path);
      if (!exists) {
        await this.createDirectory(path);
      }
      return { success: true, path, existed: exists };
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Get storage statistics
   */
  getStorageStats() {
    const recentReports = JSON.parse(localStorage.getItem('recent_shift_reports') || '[]');
    const totalSize = recentReports.reduce((size, report) => {
      const data = localStorage.getItem(report.localStorageKey);
      return size + (data ? data.length : 0);
    }, 0);
    
    return {
      totalReports: recentReports.length,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      memoryFiles: fileSystemStorage.files.size,
      directories: Array.from(fileSystemStorage.directories),
      lastUpdated: new Date().toISOString()
    };
  }
};

export default fileSystemService;