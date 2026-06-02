import api, { USE_MOCK } from '../../../config/api';
import { supabase } from '../../../config/supabase';

/**
 * Authentication service layer.
 * Standardizes API calls with conditional mock fallbacks based on USE_MOCK config.
 */
export const authService = {
  login: async (email, password) => {
    if (USE_MOCK) {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Standard credentials check for convenience
      if (email === 'error@test.com') {
        throw new Error('Email atau password salah.');
      }
      
      const isNew = email === 'new@test.com';
      return {
        success: true,
        session: { access_token: 'mock_jwt_token_neokarir_123' },
        user: {
          name: 'Franz Hermann',
          email,
          role: 'Fullstack Engineer',
          location: 'Yogyakarta, Indonesia',
          status: 'Open to Work',
          experience: 'Belum ada (Fresh Graduate / Sedang belajar)',
          education: 'S1',
        },
        isNew,
      };
    }

    // Call real backend endpoint
    return api.post('/auth/login', { email, password });
  },

  register: async (name, email, password) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        success: true,
        session: { access_token: 'mock_jwt_token_neokarir_123' },
        user: {
          name,
          email,
          role: 'Fullstack Engineer',
          location: 'Yogyakarta, Indonesia',
          status: 'Open to Work',
          experience: 'Belum ada (Fresh Graduate / Sedang belajar)',
          education: 'S1',
        },
        isNew: true,
      };
    }

    return api.post('/auth/register', { 
      email, 
      password, 
      profile: { full_name: name } 
    });
  },

  forgotPassword: async (email) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        message: 'Link pemulihan kata sandi telah dikirim ke email Anda.',
      };
    }

    return api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (newPassword) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        message: 'Kata sandi berhasil diperbarui.',
      };
    }

    if (!supabase) {
      throw new Error('Konfigurasi Supabase frontend belum tersedia.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message || 'Gagal memperbarui kata sandi.');
    }

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui.',
    };
  },

  me: async () => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        user: {
          name: 'Franz Hermann',
          email: 'hello@example.com',
          role: 'Fullstack Engineer',
          location: 'Yogyakarta, Indonesia',
          status: 'Open to Work',
          experience: 'Belum ada (Fresh Graduate / Sedang belajar)',
          education: 'S1',
        },
      };
    }

    return api.get('/auth/me');
  },
};
