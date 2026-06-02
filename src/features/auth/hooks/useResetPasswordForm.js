import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/authService';
import { useToast } from '../../../contexts/ToastContext';
import { supabase } from '../../../config/supabase';
import { USE_MOCK } from '../../../config/api';

export const useResetPasswordForm = () => {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = loading, true/false = result
  const [countdown, setCountdown] = useState(5);
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Validasi recovery session dari Supabase saat komponen dimount
  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (isMounted) {
          setTokenValid(true);
        }
        return;
      }

      if (!supabase) {
        if (isMounted) {
          setTokenValid(false);
        }
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError) {
        setTokenValid(false);
        return;
      }

      if (data?.session?.access_token) {
        setTokenValid(true);
        return;
      }

      setTokenValid(false);
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Countdown dan auto-redirect setelah reset berhasil
  useEffect(() => {
    if (!isSuccess) return;

    if (countdown <= 0) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSuccess, countdown, navigate]);

  const handleChange = useCallback((e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  }, [errors]);

  const validate = () => {
    const newErrors = {};
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await authService.resetPassword(form.password);
      success(response.message || 'Kata sandi berhasil diperbarui. Mengalihkan ke halaman login...');
      if (supabase) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      setIsSuccess(true);
    } catch (err) {
      error(err.message || 'Gagal memperbarui kata sandi. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    errors,
    isSubmitting,
    isSuccess,
    tokenValid,
    countdown,
    handleChange,
    handleSubmit,
  };
};
