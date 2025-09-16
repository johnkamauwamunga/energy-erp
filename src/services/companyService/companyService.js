import { apiService } from '../apiService';

export const companyService = {
  // Create a new company (Super Admin only)
  createCompany: async (companyData) => {
    const response = await apiService.post('/company/create', companyData);
    return response.data;
  },

  // Get all companies (Super Admin only)
  getCompanies: async () => {
    const response = await apiService.get('/company');
    return response.data;
  },

  // Get company by ID
  getCompanyById: async (id) => {
    const response = await apiService.get(`/company/${id}`);
    return response.data;
  },

  // Update company
  updateCompany: async (id, companyData) => {
    const response = await apiService.put(`/company/${id}`, companyData);
    return response.data;
  },

  // Delete company
  deleteCompany: async (id) => {
    const response = await apiService.delete(`/company/${id}`);
    return response.data;
  }
};