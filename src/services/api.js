import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://reporting-app-nj9a.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    const userData = await AsyncStorage.getItem('user_data');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Send user ID in headers for filtering
    if (userData) {
      const user = JSON.parse(userData);
      if (user.uid) {
        config.headers['X-User-Id'] = user.uid;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;