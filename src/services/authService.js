import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        // Store token and user data
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_role', response.data.user.role);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        return {
          success: true,
          user: response.data.user,
          role: response.data.user.role
        };
      }
      return { success: false, error: response.data.error };
      
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  }

  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        // Store token and user data
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_role', response.data.user.role);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        return {
          success: true,
          user: response.data.user,
          role: response.data.user.role
        };
      }
      return { success: false, error: response.data.error };
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_role', 'user_data']);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return null;
      
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      return null;
    }
  }

  async getUserRole() {
    return await AsyncStorage.getItem('user_role');
  }
}

export default new AuthService();