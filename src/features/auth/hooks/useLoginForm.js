import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { authService } from '../api/authService';
import { useToast } from '../../../contexts/ToastContext';

export const useLoginForm = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSubmitting(true);
    
    try {
      const response = await authService.login(form.email, form.password);
      
      const responseData = response.data || response;
      const user = responseData.user;
      const token = responseData.session?.access_token;
      
      // Determine if user has completed onboarding by checking profile
      let isNew = true;
      let userName = user.user_metadata?.full_name || user.name;
      
      try {
        const { default: api } = await import('../../../config/api');
        const profileRes = await api.get('/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profile = profileRes.data?.profile;
        
        if (profile) {
          if (profile.target_role) {
            isNew = false;
          }
          if (profile.full_name) {
            userName = profile.full_name;
          }
        }
      } catch (e) {
        console.warn("Could not fetch profile during login, assuming new user", e);
      }
      
      await login(user, token, isNew);
      
      success(`Selamat datang kembali, ${userName || 'User'}!`);
      
      if (isNew) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || '';
      
      if (errorMessage.toLowerCase().includes('invalid login credentials') || errorMessage.toLowerCase().includes('kata sandi salah')) {
        setErrors({ password: 'Kata sandi salah' });
        error('Kata sandi salah');
      } else {
        error(errorMessage || 'Gagal masuk. Silakan periksa kembali email dan password Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    remember,
    setRemember,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
  };
};
