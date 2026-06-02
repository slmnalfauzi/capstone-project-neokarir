import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * useSupport — Custom hook untuk mengelola state halaman Support.
 * Mengapa hook terpisah: Memisahkan logika bisnis dari presentasi,
 * konsisten dengan pola hook lain di codebase (useDashboardData, useSkillGap, dll).
 */
export const useSupport = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('faq');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    category: 'question',
    message: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const toggleFAQ = (index) => {
    setExpandedFAQ(prev => prev === index ? null : index);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));

    // Hapus error saat user mengetik kembali
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!contactForm.name.trim()) {
      errors.name = t.support.errorNameRequired;
    }

    if (!contactForm.email.trim()) {
      errors.email = t.support.errorEmailRequired;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactForm.email)) {
        errors.email = t.support.errorEmailInvalid;
      }
    }

    if (!contactForm.message.trim()) {
      errors.message = t.support.errorMessageRequired;
    } else if (contactForm.message.trim().length < 10) {
      errors.message = t.support.errorMessageMin;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Simulasi submit — belum terhubung API backend
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Open Gmail compose window with form data
      const subject = encodeURIComponent(`Support Request: ${contactForm.category}`);
      const body = encodeURIComponent(`Name: ${contactForm.name}\nEmail: ${contactForm.email}\nCategory: ${contactForm.category}\n\nMessage:\n${contactForm.message}`);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=mfuture561@gmail.com&su=${subject}&body=${body}`, '_blank');

      setContactForm({ name: '', email: '', category: 'question', message: '' });

      setTimeout(() => setSubmitSuccess(false), 5000);
    }, 1500);
  };

  return {
    activeTab,
    setActiveTab,
    expandedFAQ,
    toggleFAQ,
    searchQuery,
    setSearchQuery,
    contactForm,
    handleInputChange,
    formErrors,
    isSubmitting,
    submitSuccess,
    handleSubmit
  };
};
