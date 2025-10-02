import { apiService } from '../apiService';

export const superAdminService = {
  // Get comprehensive company details
  getCompanyDetails: async (companyId) => {
    const response = await apiService.get(`/super-admin/companies/${companyId}`);
    return response.data;
  },
};