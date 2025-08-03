import axios from 'axios';
//import { API_BASE_URL } from '@/config';

// Simulates API calls - replace with real API endpoints
export const fetchStations = async (companyId) => {
  const API_BASE_URL = 'https://api.example.com'; // Replace with your actual API base URL
  try {
    // In a real app: 
    // const response = await axios.get(`${API_BASE_URL}/stations?companyId=${companyId}`);
    // return response.data;
    
    // Simulated response
    return new Promise(resolve => setTimeout(() => resolve([
      {
        id: 'JOSKA',
        name: 'Joska Service Station',
        location: 'Joska, Machakos Road',
        manager: 'Peter Mwangi',
        phone: '+254 722 123 456',
        dailyTarget: 400000,
        status: 'active'
      },
      {
        id: 'THIKA',
        name: 'Thika Highway Station',
        location: 'Thika Road, Exit 15',
        manager: 'Jane Kamau',
        phone: '+254 733 456 789',
        dailyTarget: 550000,
        status: 'active'
      }
    ]), 500));
  } catch (error) {
    console.error('Error fetching stations:', error);
    throw error;
  }
};

export const createStation = async (stationData) => {
  try {
    // In a real app:
    // const response = await axios.post(`${API_BASE_URL}/stations`, stationData);
    // return response.data;
    
    // Simulated response
    return new Promise(resolve => setTimeout(() => resolve({
      ...stationData,
      id: `STATION_${Date.now()}`,
      islandsCount: 0,
      createdAt: new Date().toISOString()
    }), 500));
  } catch (error) {
    console.error('Error creating station:', error);
    throw error;
  }
};

export const updateStation = async (stationId, updates) => {
  try {
    // const response = await axios.patch(`${API_BASE_URL}/stations/${stationId}`, updates);
    // return response.data;
    
    return new Promise(resolve => setTimeout(() => resolve({
      ...updates,
      id: stationId
    }), 500));
  } catch (error) {
    console.error('Error updating station:', error);
    throw error;
  }
};