import { apiService } from './apiService';

const logger = {
  debug: (...args) => console.log('🔍 [SalesService]', ...args),
  info: (...args) => console.log('ℹ️ [SalesService]', ...args),
  warn: (...args) => console.warn('⚠️ [SalesService]', ...args),
  error: (...args) => console.error('❌ [SalesService]', ...args)
};

const handleResponse = (response, operation) => {
  console.log("Sales API Response:", response.data);
  
  if (response.data) {
    logger.debug(`${operation} successful`);
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}:`, response);
  throw new Error('Invalid response format from server');
};

const handleError = (error, operation, defaultMessage) => {
  logger.error(`Error during ${operation}:`, error);
  
  if (error.response) {
    const { status, data } = error.response;
    
    if (status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Authentication failed. Please login again.');
    }
    
    if (status === 403) {
      throw new Error('You do not have permission to perform this action');
    }
    
    if (status === 404) {
      throw new Error('Requested resource not found');
    }
    
    if (status === 400 && data.errors) {
      const errorMessages = data.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    if (data && data.message) {
      throw new Error(data.message);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  
  throw new Error(defaultMessage || 'An unexpected error occurred');
};

export const salesService = {
  // ==================== SHIFT SALES ENDPOINTS ====================

  /**
   * Get comprehensive shift sales data
   */
  getShiftSales: async (shiftId) => {
    logger.info(`Fetching shift sales: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/sales/shift/${shiftId}`);
      return handleResponse(response, 'fetching shift sales');
    } catch (error) {
      throw handleError(error, 'fetching shift sales', 'Failed to fetch shift sales');
    }
  },

  /**
   * Get product-specific sales for a shift
   */
  getProductSales: async (shiftId, productId) => {
    logger.info(`Fetching product sales for shift ${shiftId}, product ${productId}`);
    
    try {
      const response = await apiService.get(`/sales/shift/${shiftId}/product/${productId}`);
      return handleResponse(response, 'fetching product sales');
    } catch (error) {
      throw handleError(error, 'fetching product sales', 'Failed to fetch product sales');
    }
  },

  /**
   * Get pump-specific sales for a shift
   */
  getPumpSales: async (shiftId, pumpId) => {
    logger.info(`Fetching pump sales for shift ${shiftId}, pump ${pumpId}`);
    
    try {
      const response = await apiService.get(`/sales/shift/${shiftId}/pump/${pumpId}`);
      return handleResponse(response, 'fetching pump sales');
    } catch (error) {
      throw handleError(error, 'fetching pump sales', 'Failed to fetch pump sales');
    }
  },

  /**
   * Generate comprehensive sales report
   */
  generateSalesReport: async (shiftId) => {
    logger.info(`Generating sales report for shift: ${shiftId}`);
    
    try {
      const response = await apiService.get(`/sales/shift/${shiftId}/report`);
      return handleResponse(response, 'generating sales report');
    } catch (error) {
      throw handleError(error, 'generating sales report', 'Failed to generate sales report');
    }
  },

  // ==================== SALES ANALYSIS UTILITIES ====================

  /**
   * Calculate sales metrics from raw data
   */
  calculateSalesMetrics: (salesData) => {
    if (!salesData) return null;

    const fuelSales = salesData.fuelSales || {};
    const nonFuelSales = salesData.nonFuelSales || {};

    const totalRevenue = (fuelSales.totalRevenue || 0) + (nonFuelSales.totalRevenue || 0);
    const totalQuantity = (fuelSales.totalLiters || 0) + (nonFuelSales.totalQuantity || 0);

    return {
      totalRevenue,
      totalQuantity,
      fuel: {
        revenue: fuelSales.totalRevenue || 0,
        liters: fuelSales.totalLiters || 0,
        avgPrice: fuelSales.totalLiters > 0 ? fuelSales.totalRevenue / fuelSales.totalLiters : 0
      },
      nonFuel: {
        revenue: nonFuelSales.totalRevenue || 0,
        units: nonFuelSales.totalQuantity || 0,
        avgPrice: nonFuelSales.totalQuantity > 0 ? nonFuelSales.totalRevenue / nonFuelSales.totalQuantity : 0
      },
      revenueBreakdown: {
        fuelPercentage: totalRevenue > 0 ? (fuelSales.totalRevenue / totalRevenue) * 100 : 0,
        nonFuelPercentage: totalRevenue > 0 ? (nonFuelSales.totalRevenue / totalRevenue) * 100 : 0
      }
    };
  },

  /**
   * Format sales data for charts
   */
  formatSalesForCharts: (salesData) => {
    const metrics = salesService.calculateSalesMetrics(salesData);
    if (!metrics) return null;

    // Revenue breakdown chart data
    const revenueChartData = {
      labels: ['Fuel Sales', 'Non-Fuel Sales'],
      datasets: [
        {
          data: [metrics.fuel.revenue, metrics.nonFuel.revenue],
          backgroundColor: ['#36A2EB', '#FF6384']
        }
      ]
    };

    // Product-wise sales data
    const productSales = salesData.fuelSales?.byProduct || [];
    const productChartData = {
      labels: productSales.map(product => product.product?.name || 'Unknown'),
      datasets: [
        {
          label: 'Liters Sold',
          data: productSales.map(product => product.totalLiters),
          backgroundColor: '#4BC0C0'
        },
        {
          label: 'Revenue',
          data: productSales.map(product => product.totalRevenue),
          backgroundColor: '#FF9F40'
        }
      ]
    };

    return {
      revenueChartData,
      productChartData,
      metrics
    };
  },

  /**
   * Calculate sales trends
   */
  calculateSalesTrends: (currentSales, previousSales) => {
    if (!currentSales || !previousSales) return null;

    const currentMetrics = salesService.calculateSalesMetrics(currentSales);
    const previousMetrics = salesService.calculateSalesMetrics(previousSales);

    const revenueTrend = currentMetrics.totalRevenue - previousMetrics.totalRevenue;
    const revenueTrendPercentage = previousMetrics.totalRevenue > 0 
      ? (revenueTrend / previousMetrics.totalRevenue) * 100 
      : 0;

    const fuelTrend = currentMetrics.fuel.revenue - previousMetrics.fuel.revenue;
    const fuelTrendPercentage = previousMetrics.fuel.revenue > 0 
      ? (fuelTrend / previousMetrics.fuel.revenue) * 100 
      : 0;

    return {
      revenue: {
        current: currentMetrics.totalRevenue,
        previous: previousMetrics.totalRevenue,
        trend: revenueTrend,
        trendPercentage: revenueTrendPercentage,
        direction: revenueTrend >= 0 ? 'up' : 'down'
      },
      fuel: {
        current: currentMetrics.fuel.revenue,
        previous: previousMetrics.fuel.revenue,
        trend: fuelTrend,
        trendPercentage: fuelTrendPercentage,
        direction: fuelTrend >= 0 ? 'up' : 'down'
      }
    };
  },

  // ==================== PRODUCT SALES UTILITIES ====================

  /**
   * Get top selling products
   */
  getTopSellingProducts: (salesData, limit = 5) => {
    const fuelProducts = salesData.fuelSales?.byProduct || [];
    const nonFuelProducts = salesData.nonFuelSales?.byProduct || [];

    const allProducts = [
      ...fuelProducts.map(product => ({
        ...product,
        type: 'FUEL',
        quantity: product.totalLiters,
        revenue: product.totalRevenue
      })),
      ...nonFuelProducts.map(product => ({
        ...product,
        type: 'NON_FUEL',
        quantity: product.totalQuantity,
        revenue: product.totalRevenue
      }))
    ];

    return allProducts
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  /**
   * Calculate product performance
   */
  calculateProductPerformance: (productSales) => {
    if (!productSales || productSales.length === 0) return null;

    const totalRevenue = productSales.reduce((sum, product) => sum + product.revenue, 0);
    
    return productSales.map(product => ({
      ...product,
      revenueShare: totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0,
      performance: product.revenue > (totalRevenue / productSales.length) ? 'above' : 'below'
    }));
  },

  // ==================== EXPORT UTILITIES ====================

  /**
   * Export sales data to CSV
   */
  exportSalesToCSV: (salesData) => {
    const metrics = salesService.calculateSalesMetrics(salesData);
    if (!metrics) return '';

    const csvRows = [];

    // Header
    csvRows.push('Sales Report');
    csvRows.push(`Generated,${new Date().toLocaleString()}`);
    csvRows.push('');

    // Summary Section
    csvRows.push('Sales Summary');
    csvRows.push('Category,Amount,Quantity,Average Price');
    csvRows.push(`Fuel Sales,$${metrics.fuel.revenue.toFixed(2)},${metrics.fuel.liters.toFixed(2)}L,$${metrics.fuel.avgPrice.toFixed(2)}`);
    csvRows.push(`Non-Fuel Sales,$${metrics.nonFuel.revenue.toFixed(2)},${metrics.nonFuel.units} units,$${metrics.nonFuel.avgPrice.toFixed(2)}`);
    csvRows.push(`Total,$${metrics.totalRevenue.toFixed(2)},${metrics.totalQuantity},`);
    csvRows.push('');

    // Fuel Products Breakdown
    csvRows.push('Fuel Products Breakdown');
    csvRows.push('Product,Liters Sold,Revenue,Unit Price');
    (salesData.fuelSales?.byProduct || []).forEach(product => {
      csvRows.push(`${product.product?.name || 'Unknown'},${product.totalLiters.toFixed(2)},$${product.totalRevenue.toFixed(2)},$${product.unitPrice.toFixed(2)}`);
    });
    csvRows.push('');

    // Non-Fuel Products Breakdown
    csvRows.push('Non-Fuel Products Breakdown');
    csvRows.push('Product,Units Sold,Revenue,Average Price');
    (salesData.nonFuelSales?.byProduct || []).forEach(product => {
      csvRows.push(`${product.product?.name || 'Unknown'},${product.totalQuantity},$${product.totalRevenue.toFixed(2)},$${product.avgUnitPrice.toFixed(2)}`);
    });

    return csvRows.join('\n');
  },

  /**
   * Format sales data for PDF report
   */
  formatSalesForPDF: (salesData) => {
    const metrics = salesService.calculateSalesMetrics(salesData);
    const topProducts = salesService.getTopSellingProducts(salesData, 10);
    const performanceData = salesService.calculateProductPerformance(topProducts);

    return {
      summary: {
        totalRevenue: metrics.totalRevenue,
        fuelRevenue: metrics.fuel.revenue,
        nonFuelRevenue: metrics.nonFuel.revenue,
        fuelLiters: metrics.fuel.liters,
        nonFuelUnits: metrics.nonFuel.units
      },
      topProducts: performanceData,
      charts: salesService.formatSalesForCharts(salesData),
      generatedAt: new Date().toLocaleString()
    };
  }
};

export default salesService;