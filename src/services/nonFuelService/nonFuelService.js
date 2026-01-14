// src/services/nonFuelService.js
import { apiService } from '../apiService';

// Enhanced logging utility with production control
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [NonFuelService]', ...args);
    }
  },
  info: (...args) => console.log('ℹ️ [NonFuelService]', ...args),
  warn: (...args) => console.warn('⚠️ [NonFuelService]', ...args),
  error: (...args) => console.error('❌ [NonFuelService]', ...args)
};

// Enhanced error handler with non-fuel specific messages
const handleError = (error, operation, context = {}) => {
  const errorMessages = {
    // Category operations
    createCategory: 'Failed to create category',
    updateCategory: 'Failed to update category',
    getCategories: 'Failed to fetch categories',
    getCategoryById: 'Failed to fetch category details',
    deleteCategory: 'Failed to delete category',
    
    // Sub-category operations
    createSubCategory: 'Failed to create sub-category',
    updateSubCategory: 'Failed to update sub-category',
    getSubCategories: 'Failed to fetch sub-categories',
    getSubCategoryById: 'Failed to fetch sub-category details',
    deleteSubCategory: 'Failed to delete sub-category',
    
    // Product operations
    createNonFuelProduct: 'Failed to create non-fuel product',
    updateNonFuelProduct: 'Failed to update non-fuel product',
    getNonFuelProducts: 'Failed to fetch non-fuel products',
    getNonFuelProductById: 'Failed to fetch product details',
    deleteNonFuelProduct: 'Failed to delete product',
    getNonFuelProductsByCategory: 'Failed to fetch products by category',
    getNonFuelProductsBySubCategory: 'Failed to fetch products by sub-category',
    
    // Pricing operations
    updateNonFuelProductPrices: 'Failed to update product prices',
    bulkUpdatePrices: 'Failed to bulk update prices',
    
    // Stock level operations
    updateProductStockLevels: 'Failed to update stock levels',
    bulkUpdateStockLevels: 'Failed to bulk update stock levels',
    
    // Analytics & Export
    getNonFuelAnalytics: 'Failed to fetch non-fuel analytics',
    exportNonFuelProducts: 'Failed to export non-fuel products',
    
    // Admin operations
    getAllNonFuelDataByCompany: 'Failed to fetch company non-fuel data'
  };

  logger.error(`Error during ${operation}:`, { error, context });

  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        throw new Error(data.message || 'Invalid request data');
      case 401:
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      case 403:
        throw new Error('You do not have permission for this action');
      case 404:
        throw new Error(data.message || 'Requested resource not found');
      case 409:
        throw new Error(data.message || 'Resource already exists');
      case 422:
        const validationErrors = data.errors 
          ? Object.values(data.errors).flat().join(', ')
          : data.message;
        throw new Error(`Validation failed: ${validationErrors}`);
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(data?.message || errorMessages[operation] || 'Operation failed');
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection.');
  } else {
    throw new Error(error.message || errorMessages[operation] || 'Unexpected error occurred');
  }
};

// Response handler for consistent response structure
const handleResponse = (response, operation) => {
  if (response.data && response.data.success) {
    // Return both data and pagination if available
    if (response.data.pagination) {
      return {
        data: response.data.data,
        pagination: response.data.pagination,
        summary: response.data.summary,
        statistics: response.data.statistics
      };
    }
    return response.data.data;
  }
  
  if (response.data) {
    return response.data;
  }
  
  logger.warn(`Unexpected response structure for ${operation}`);
  throw new Error('Invalid server response format');
};

// Request builder with query parameters
const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, item));
      } else if (typeof value === 'boolean') {
        params.append(key, value.toString());
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        // Handle nested objects (if any)
        params.append(key, JSON.stringify(value));
      } else if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  return params.toString();
};

class NonFuelService {
  // =====================
  // CATEGORY METHODS
  // =====================
  
  async createCategory(categoryData) {
    try {
      logger.info('Creating non-fuel category:', categoryData);
      
      const formattedData = {
        ...categoryData,
        isForFuel: false // Always false for non-fuel
      };
      
      const response = await apiService.post('/nonfuel/categories', formattedData);
      return handleResponse(response, 'createCategory');
    } catch (error) {
      throw handleError(error, 'createCategory', { categoryData });
    }
  }

  async updateCategory(categoryData) {
    try {
      logger.info(`Updating non-fuel category: ${categoryData.id}`, categoryData);
      
      const formattedData = {
        ...categoryData,
        isForFuel: false // Always false for non-fuel
      };
      
      const response = await apiService.put('/nonfuel/categories', formattedData);
      return handleResponse(response, 'updateCategory');
    } catch (error) {
      throw handleError(error, 'updateCategory', { categoryData });
    }
  }

  async getCategories(filters = {}) {
    try {
      logger.info('Fetching non-fuel categories with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 100,
        search: filters.search || undefined,
        includeSubCategories: filters.includeSubCategories || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel/categories?${queryString}` : '/nonfuel/categories';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getCategories');
    } catch (error) {
      throw handleError(error, 'getCategories', { filters });
    }
  }

  async getCategoryById(id) {
    try {
      logger.info(`Fetching non-fuel category: ${id}`);
      const response = await apiService.get(`/nonfuel/categories/${id}`);
      return handleResponse(response, 'getCategoryById');
    } catch (error) {
      throw handleError(error, 'getCategoryById', { id });
    }
  }

  async deleteCategory(id) {
    try {
      logger.info(`Deleting non-fuel category: ${id}`);
      const response = await apiService.delete(`/nonfuel/categories/${id}`);
      return handleResponse(response, 'deleteCategory');
    } catch (error) {
      throw handleError(error, 'deleteCategory', { id });
    }
  }

  // =====================
  // SUB-CATEGORY METHODS
  // =====================

  async createSubCategory(subCategoryData) {
    try {
      logger.info('Creating non-fuel sub-category:', subCategoryData);
      const response = await apiService.post('/nonfuel/subcategories', subCategoryData);
      return handleResponse(response, 'createSubCategory');
    } catch (error) {
      throw handleError(error, 'createSubCategory', { subCategoryData });
    }
  }

  async updateSubCategory(subCategoryData) {
    try {
      logger.info(`Updating non-fuel sub-category: ${subCategoryData.id}`, subCategoryData);
      const response = await apiService.put('/nonfuel/subcategories', subCategoryData);
      return handleResponse(response, 'updateSubCategory');
    } catch (error) {
      throw handleError(error, 'updateSubCategory', { subCategoryData });
    }
  }

  async getSubCategories(filters = {}) {
    try {
      logger.info('Fetching non-fuel sub-categories with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 100,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel/subcategories?${queryString}` : '/nonfuel/subcategories';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getSubCategories');
    } catch (error) {
      throw handleError(error, 'getSubCategories', { filters });
    }
  }

  async getSubCategoryById(id) {
    try {
      logger.info(`Fetching non-fuel sub-category: ${id}`);
      const response = await apiService.get(`/nonfuel/subcategories/${id}`);
      return handleResponse(response, 'getSubCategoryById');
    } catch (error) {
      throw handleError(error, 'getSubCategoryById', { id });
    }
  }

  async deleteSubCategory(id) {
    try {
      logger.info(`Deleting non-fuel sub-category: ${id}`);
      const response = await apiService.delete(`/nonfuel/subcategories/${id}`);
      return handleResponse(response, 'deleteSubCategory');
    } catch (error) {
      throw handleError(error, 'deleteSubCategory', { id });
    }
  }

  // =====================
  // PRODUCT METHODS
  // =====================

  async createNonFuelProduct(productData) {
    try {
      logger.info('Creating non-fuel product:', productData);
      
      const response = await apiService.post('/nonfuel/products', productData);
      return handleResponse(response, 'createNonFuelProduct');
    } catch (error) {
      throw handleError(error, 'createNonFuelProduct', { productData });
    }
  }

  async updateNonFuelProduct(productData) {
    try {
      logger.info(`Updating non-fuel product: ${productData.id}`, productData);
      
      const response = await apiService.put('/nonfuel/products', productData);
      return handleResponse(response, 'updateNonFuelProduct');
    } catch (error) {
      throw handleError(error, 'updateNonFuelProduct', { productData });
    }
  }

  async getNonFuelProducts(filters = {}) {
    try {
      logger.info('Fetching non-fuel products with filters:', filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 10,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        subCategoryId: filters.subCategoryId || undefined,
        brand: filters.brand || undefined,
        hasPricing: filters.hasPricing || undefined,
        lowStock: filters.lowStock || undefined,
        includeInactive: filters.includeInactive || undefined,
        sortBy: filters.sortBy || undefined,
        sortOrder: filters.sortOrder || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel/products?${queryString}` : '/nonfuel/products';
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getNonFuelProducts');
    } catch (error) {
      throw handleError(error, 'getNonFuelProducts', { filters });
    }
  }

  async getNonFuelProductById(id) {
    try {
      logger.info(`Fetching non-fuel product: ${id}`);
      const response = await apiService.get(`/nonfuel/products/${id}`);
      return handleResponse(response, 'getNonFuelProductById');
    } catch (error) {
      throw handleError(error, 'getNonFuelProductById', { id });
    }
  }

  async getNonFuelProductsByCategory(categoryId, filters = {}) {
    try {
      logger.info(`Fetching non-fuel products by category: ${categoryId}`, filters);
      
      const formattedFilters = {
        ...filters,
        includeSubCategories: filters.includeSubCategories || undefined,
        page: filters.page || 1,
        limit: filters.limit || 20
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel/products/category/${categoryId}?${queryString}`
        : `/nonfuel/products/category/${categoryId}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getNonFuelProductsByCategory');
    } catch (error) {
      throw handleError(error, 'getNonFuelProductsByCategory', { categoryId, filters });
    }
  }

  async getNonFuelProductsBySubCategory(subCategoryId, filters = {}) {
    try {
      logger.info(`Fetching non-fuel products by sub-category: ${subCategoryId}`, filters);
      
      const formattedFilters = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 20
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString 
        ? `/nonfuel/products/subcategory/${subCategoryId}?${queryString}`
        : `/nonfuel/products/subcategory/${subCategoryId}`;
      
      const response = await apiService.get(url);
      return handleResponse(response, 'getNonFuelProductsBySubCategory');
    } catch (error) {
      throw handleError(error, 'getNonFuelProductsBySubCategory', { subCategoryId, filters });
    }
  }

  async deleteNonFuelProduct(id) {
    try {
      logger.info(`Deleting non-fuel product: ${id}`);
      const response = await apiService.delete(`/nonfuel/products/${id}`);
      return handleResponse(response, 'deleteNonFuelProduct');
    } catch (error) {
      throw handleError(error, 'deleteNonFuelProduct', { id });
    }
  }

  // =====================
  // PRICING METHODS
  // =====================

  async updateNonFuelProductPrices(priceData) {
    try {
      logger.info(`Updating non-fuel product prices:`, priceData);
      
      const response = await apiService.put('/nonfuel/products/prices', priceData);
      return handleResponse(response, 'updateNonFuelProductPrices');
    } catch (error) {
      throw handleError(error, 'updateNonFuelProductPrices', { priceData });
    }
  }

  async bulkUpdatePrices(bulkPriceData) {
    try {
      logger.info('Bulk updating non-fuel product prices:', bulkPriceData);
      
      const response = await apiService.put('/nonfuel/products/prices/bulk', bulkPriceData);
      return handleResponse(response, 'bulkUpdatePrices');
    } catch (error) {
      throw handleError(error, 'bulkUpdatePrices', { bulkPriceData });
    }
  }

  // =====================
  // STOCK LEVEL METHODS
  // =====================

  async updateProductStockLevels(stockData) {
    try {
      logger.info(`Updating product stock levels:`, stockData);
      
      const response = await apiService.put('/nonfuel/products/stock-levels', stockData);
      return handleResponse(response, 'updateProductStockLevels');
    } catch (error) {
      throw handleError(error, 'updateProductStockLevels', { stockData });
    }
  }

  async bulkUpdateStockLevels(bulkStockData) {
    try {
      logger.info('Bulk updating product stock levels:', bulkStockData);
      
      const response = await apiService.put('/nonfuel/products/stock-levels/bulk', bulkStockData);
      return handleResponse(response, 'bulkUpdateStockLevels');
    } catch (error) {
      throw handleError(error, 'bulkUpdateStockLevels', { bulkStockData });
    }
  }

  // =====================
  // ANALYTICS & EXPORT
  // =====================

  async getNonFuelAnalytics() {
    try {
      logger.info('Fetching non-fuel analytics');
      
      const response = await apiService.get('/nonfuel/analytics');
      return handleResponse(response, 'getNonFuelAnalytics');
    } catch (error) {
      throw handleError(error, 'getNonFuelAnalytics');
    }
  }

  async exportNonFuelProducts(format = 'json', filters = {}) {
    try {
      logger.info(`Exporting non-fuel products in ${format} format`, filters);
      
      const formattedFilters = {
        ...filters,
        format: format,
        includeInactive: filters.includeInactive || undefined,
        fields: filters.fields || undefined
      };
      
      const queryString = buildQueryString(formattedFilters);
      const url = queryString ? `/nonfuel/export?${queryString}` : '/nonfuel/export';
      
      if (format === 'csv') {
        const response = await apiService.get(url, {
          responseType: 'blob'
        });
        
        // Handle CSV blob response
        const blob = new Blob([response.data], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `nonfuel-products-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        return { success: true, message: 'CSV export initiated' };
      } else {
        const response = await apiService.get(url);
        return handleResponse(response, 'exportNonFuelProducts');
      }
    } catch (error) {
      throw handleError(error, 'exportNonFuelProducts', { format, filters });
    }
  }

  // =====================
  // ADMIN METHODS (Super Admin Only)
  // =====================

  async getAllNonFuelDataByCompany(companyId) {
    try {
      logger.info(`Fetching all non-fuel data for company: ${companyId}`);
      
      const response = await apiService.get(`/nonfuel/admin/company/${companyId}`);
      return handleResponse(response, 'getAllNonFuelDataByCompany');
    } catch (error) {
      throw handleError(error, 'getAllNonFuelDataByCompany', { companyId });
    }
  }

  // =====================
  // VALIDATION METHODS
  // =====================

  validateCategory(categoryData, isUpdate = false) {
    const errors = {};

    if (!isUpdate || categoryData.name !== undefined) {
      if (!categoryData.name || !categoryData.name.trim()) {
        errors.name = 'Category name is required';
      } else if (categoryData.name.length > 100) {
        errors.name = 'Category name must be less than 100 characters';
      }
    }

    if (categoryData.description !== undefined && categoryData.description) {
      if (categoryData.description.length > 500) {
        errors.description = 'Description must be less than 500 characters';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateSubCategory(subCategoryData, isUpdate = false) {
    const errors = {};

    if (!isUpdate || subCategoryData.name !== undefined) {
      if (!subCategoryData.name || !subCategoryData.name.trim()) {
        errors.name = 'Sub-category name is required';
      } else if (subCategoryData.name.length > 100) {
        errors.name = 'Sub-category name must be less than 100 characters';
      }
    }

    if (!subCategoryData.categoryId) {
      errors.categoryId = 'Category is required';
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(subCategoryData.categoryId)) {
        errors.categoryId = 'Invalid category ID format';
      }
    }

    if (subCategoryData.description !== undefined && subCategoryData.description) {
      if (subCategoryData.description.length > 500) {
        errors.description = 'Description must be less than 500 characters';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateProduct(productData, isUpdate = false) {
    const errors = {};

    if (!isUpdate || productData.name !== undefined) {
      if (!productData.name || !productData.name.trim()) {
        errors.name = 'Product name is required';
      } else if (productData.name.length > 200) {
        errors.name = 'Product name must be less than 200 characters';
      }
    }

    if (!productData.categoryId) {
      errors.categoryId = 'Category is required';
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productData.categoryId)) {
        errors.categoryId = 'Invalid category ID format';
      }
    }

    if (productData.sku !== undefined && productData.sku && productData.sku.length > 50) {
      errors.sku = 'SKU must be less than 50 characters';
    }

    if (productData.variantName !== undefined && productData.variantName && productData.variantName.length > 100) {
      errors.variantName = 'Variant name must be less than 100 characters';
    }

    if (productData.description !== undefined && productData.description && productData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    // Validate pricing hierarchy if all provided
    if (productData.baseCostPrice !== undefined && 
        productData.minSellingPrice !== undefined && 
        productData.maxSellingPrice !== undefined) {
      if (productData.baseCostPrice > productData.minSellingPrice) {
        errors.baseCostPrice = 'Base cost price cannot exceed minimum selling price';
      }
      if (productData.minSellingPrice > productData.maxSellingPrice) {
        errors.minSellingPrice = 'Minimum selling price cannot exceed maximum selling price';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // =====================
  // FORMATTING UTILITIES
  // =====================

  formatCategory(category) {
    if (!category) return null;
    
    return {
      ...category,
      displayName: category.name,
      type: 'Non-Fuel',
      hasSubCategories: category._count?.subCategories > 0,
      hasProducts: category._count?.products > 0,
      subCategoryCount: category._count?.subCategories || 0,
      productCount: category._count?.products || 0,
      status: category.isActive ? 'Active' : 'Inactive',
      statusColor: category.isActive ? 'success' : 'default',
      // Format sub-categories if included
      subCategories: category.subCategories ? 
        category.subCategories.map(sc => this.formatSubCategory(sc)) : []
    };
  }

  formatSubCategory(subCategory) {
    if (!subCategory) return null;
    
    return {
      ...subCategory,
      displayName: subCategory.name,
      categoryName: subCategory.category?.name || 'Unknown',
      hasProducts: subCategory._count?.products > 0,
      productCount: subCategory._count?.products || 0,
      status: 'Active',
      statusColor: 'success'
    };
  }

  formatProduct(product) {
    if (!product) return null;
    
    // Calculate margin if pricing exists
    let margin = null;
    let priceStatus = 'no-pricing';
    let marginColor = 'default';
    
    if (product.baseCostPrice && product.maxSellingPrice) {
      margin = ((product.maxSellingPrice - product.baseCostPrice) / product.baseCostPrice) * 100;
      if (margin > 30) {
        priceStatus = 'excellent';
        marginColor = 'success';
      } else if (margin > 20) {
        priceStatus = 'good';
        marginColor = 'success';
      } else if (margin > 10) {
        priceStatus = 'fair';
        marginColor = 'warning';
      } else if (margin > 0) {
        priceStatus = 'low';
        marginColor = 'warning';
      } else {
        priceStatus = 'unprofitable';
        marginColor = 'error';
      }
    }
    
    // Format display name with variant
    const displayName = product.fullName || product.name;
    
    // Format specifications
    const specifications = [];
    if (product.weight && product.weightUnit) {
      specifications.push(`${product.weight} ${product.weightUnit}`);
    }
    if (product.capacity && product.capacityUnit) {
      specifications.push(`${product.capacity} ${product.capacityUnit}`);
    }
    if (product.dimensions) {
      specifications.push(product.dimensions);
    }
    
    return {
      ...product,
      displayName,
      specifications: specifications.length > 0 ? specifications.join(' | ') : null,
      margin: margin ? Number(margin.toFixed(1)) : null,
      priceStatus,
      marginColor,
      hasPricing: !!(product.baseCostPrice && product.minSellingPrice && product.maxSellingPrice),
      hasVariant: !!product.variantName,
      categoryName: product.category?.name || 'Unknown',
      subCategoryName: product.subCategory?.name || 'None',
      status: product.isActive ? 'Active' : 'Inactive',
      statusColor: product.isActive ? 'success' : 'default',
      // Stock information if available
      stockStatus: product.warehouseStock?.length > 0 ? 'In Stock' : 'No Stock',
      stockStatusColor: product.warehouseStock?.length > 0 ? 'success' : 'default',
      totalStock: product.warehouseStock?.reduce((sum, stock) => sum + (stock.availableQty || 0), 0) || 0,
      // Formatted dates
      createdAtFormatted: product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A',
      updatedAtFormatted: product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A',
      // Quick access properties
      baseName: product.name,
      variantInfo: product.variantName,
      hasStockInfo: !!(product.minStockLevel || product.reorderPoint || product.maxStockLevel)
    };
  }

  formatAnalytics(analytics) {
    if (!analytics) return null;
    
    return {
      ...analytics,
      overview: {
        ...analytics.overview,
        formatted: {
          totalProducts: `${analytics.overview.totalProducts} products`,
          productsWithPricing: `${analytics.overview.productsWithPricing} with pricing`,
          productsWithStockInfo: `${analytics.overview.productsWithStockInfo} with stock info`
        }
      },
      pricingAnalysis: {
        ...analytics.pricingAnalysis,
        formatted: {
          excellent: `${analytics.pricingAnalysis.marginDistribution.excellent} products`,
          good: `${analytics.pricingAnalysis.marginDistribution.good} products`,
          fair: `${analytics.pricingAnalysis.marginDistribution.fair} products`,
          low: `${analytics.pricingAnalysis.marginDistribution.low} products`,
          unprofitable: `${analytics.pricingAnalysis.marginDistribution.unprofitable} products`
        }
      }
    };
  }

  // =====================
  // UTILITY METHODS
  // =====================

  async searchCategories(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      return await this.getCategories(filters);
    } catch (error) {
      throw handleError(error, 'searchCategories', { searchTerm, additionalFilters });
    }
  }

  async searchProducts(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        ...additionalFilters
      };
      return await this.getNonFuelProducts(filters);
    } catch (error) {
      throw handleError(error, 'searchProducts', { searchTerm, additionalFilters });
    }
  }

  async getCategoriesWithProductCount() {
    try {
      const result = await this.getCategories({ includeSubCategories: true });
      if (result.data) {
        return result.data.map(category => ({
          id: category.id,
          name: category.name,
          productCount: category._count?.products || 0,
          subCategoryCount: category._count?.subCategories || 0
        }));
      }
      return [];
    } catch (error) {
      throw handleError(error, 'getCategoriesWithProductCount');
    }
  }

  // Generate unique SKU for product
  generateSku(productName, categoryName = '', variantName = '') {
    const categoryCode = categoryName.substring(0, 3).toUpperCase() || 'GEN';
    const productCode = productName.substring(0, 3).toUpperCase();
    const variantCode = variantName ? variantName.substring(0, 3).toUpperCase() : 'GEN';
    const timestamp = Date.now().toString().slice(-6);
    
    return `NF-${categoryCode}-${productCode}-${variantCode}-${timestamp}`;
  }

  // =====================
  // EXPORT METHODS
  // =====================

  prepareCategoriesExport(categories) {
    return categories.map(category => ({
      'Category ID': category.id || 'N/A',
      'Category Name': category.name || 'N/A',
      'Description': category.description || 'N/A',
      'Type': 'Non-Fuel',
      'Sub-Categories': category._count?.subCategories || 0,
      'Products': category._count?.products || 0,
      'Status': category.isActive ? 'Active' : 'Inactive',
      'Created Date': category.createdAt ? new Date(category.createdAt).toLocaleDateString() : 'N/A',
      'Last Updated': category.updatedAt ? new Date(category.updatedAt).toLocaleDateString() : 'N/A'
    }));
  }

  prepareProductsExport(products) {
    return products.map(product => ({
      'Product ID': product.id || 'N/A',
      'Product Name': product.fullName || product.name || 'N/A',
      'Base Name': product.name || 'N/A',
      'Variant Name': product.variantName || 'N/A',
      'SKU': product.sku || 'N/A',
      'Barcode': product.barcode || 'N/A',
      'Category': product.category?.name || 'N/A',
      'Sub-Category': product.subCategory?.name || 'N/A',
      'Brand': product.brand || 'N/A',
      'Unit': product.unit || 'PIECE',
      'Base Cost': product.baseCostPrice || 0,
      'Min Price': product.minSellingPrice || 0,
      'Max Price': product.maxSellingPrice || 0,
      'Margin %': product.margin || 0,
      'Price Status': product.priceStatus || 'no-pricing',
      'Weight': product.weight || '',
      'Weight Unit': product.weightUnit || '',
      'Capacity': product.capacity || '',
      'Capacity Unit': product.capacityUnit || '',
      'Dimensions': product.dimensions || '',
      'Volume': product.volume || '',
      'Color': product.color || '',
      'Material': product.material || '',
      'Manufacturer': product.manufacturer || '',
      'Country of Origin': product.countryOfOrigin || '',
      'Batch Tracked': product.isBatchTracked ? 'Yes' : 'No',
      'Serial Tracked': product.isSerialTracked ? 'Yes' : 'No',
      'Status': product.isActive ? 'Active' : 'Inactive',
      'Created Date': product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A',
      'Last Updated': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'
    }));
  }

  // =====================
  // CACHE MANAGEMENT
  // =====================

  createCache() {
    let cache = {
      categories: new Map(),
      subCategories: new Map(),
      products: new Map(),
      analytics: null,
      lastUpdated: null
    };

    return {
      getCategories(companyId) {
        return cache.categories.get(companyId);
      },

      setCategories(companyId, data) {
        cache.categories.set(companyId, {
          data,
          timestamp: Date.now()
        });
      },

      getProducts(companyId) {
        return cache.products.get(companyId);
      },

      setProducts(companyId, data) {
        cache.products.set(companyId, {
          data,
          timestamp: Date.now()
        });
      },

      getAnalytics(companyId) {
        return cache.analytics && cache.analytics.companyId === companyId ? cache.analytics : null;
      },

      setAnalytics(companyId, data) {
        cache.analytics = {
          companyId,
          data,
          timestamp: Date.now()
        };
      },

      clearCategories(companyId) {
        cache.categories.delete(companyId);
      },

      clearProducts(companyId) {
        cache.products.delete(companyId);
      },

      clearAnalytics() {
        cache.analytics = null;
      },

      clearAll() {
        cache.categories.clear();
        cache.subCategories.clear();
        cache.products.clear();
        cache.analytics = null;
        cache.lastUpdated = null;
      },

      isStale(timestamp, maxAge = 5 * 60 * 1000) { // 5 minutes default
        return !timestamp || (Date.now() - timestamp) > maxAge;
      }
    };
  }
}

// Create and export a singleton instance
export const nonFuelService = new NonFuelService();

// Create and export cache instance
export const nonFuelCache = nonFuelService.createCache();

// Example usage patterns
export const nonFuelExamples = {
  createCategory: {
    name: "ELECTRONICS",
    description: "Electronic products and accessories",
    isForFuel: false
  },

  createSubCategory: {
    categoryId: "123e4567-e89b-12d3-a456-426614174000",
    name: "SMARTPHONES",
    description: "Smartphones and mobile devices"
  },

  createProduct: {
    name: "iPhone 15 Pro",
    variantName: "256GB Titanium Blue",
    description: "Latest Apple smartphone",
    categoryId: "123e4567-e89b-12d3-a456-426614174000",
    subCategoryId: "223e4567-e89b-12d3-a456-426614174000",
    unit: "PIECE",
    brand: "APPLE",
    baseCostPrice: 85000,
    minSellingPrice: 95000,
    maxSellingPrice: 105000
  },

  updatePrices: {
    productId: "323e4567-e89b-12d3-a456-426614174000",
    baseCostPrice: 82000,
    minSellingPrice: 92000,
    maxSellingPrice: 102000
  }
};

export default nonFuelService;