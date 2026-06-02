import { useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePersonalInfo } from './usePersonalInfo';
import { useCareerSkills } from './useCareerSkills';
import { useAccountSecurity } from './useAccountSecurity';
import { usePreferences } from './usePreferences';
import { profileService } from '../api/profileService';
import { useToast } from '../../../contexts/ToastContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import idTranslations from '../../../locales/id';
import enTranslations from '../../../locales/en';

export const useProfileSettings = () => {
  const { user, updateProfile, refreshUserProfile, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const t = language === 'en' ? enTranslations : idTranslations;

  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  // Sub-hooks delegasi
  const { personalInfo, updatePersonalInfo } = usePersonalInfo(user);
  const {
    careerInfo,
    updateCareerInfo,
    saveCareerInfo,
    addSkill,
    removeSkill,
    newSkill,
    setNewSkill,
    isReprocessing,
    handleReprocess,
    isModalOpen,
    openModal,
    closeModal
  } = useCareerSkills(user);

  const { security, updateSecurity, removeSession } = useAccountSecurity();
  const { preferences, updatePreferences } = usePreferences(user);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (activeTab === 'personal') {
        await profileService.updatePersonalInfo(personalInfo);
        await refreshUserProfile();
        toastSuccess(t.profile.personalSaveSuccess);
      } else if (activeTab === 'career') {
        await saveCareerInfo();
        await refreshUserProfile();
        toastSuccess(t.profile.careerSaveSuccess);
      } else if (activeTab === 'security') {
        if (security.newPassword && security.newPassword !== security.confirmPassword) {
          throw new Error(language === 'en' ? 'New password confirmation does not match.' : 'Konfirmasi kata sandi baru tidak cocok.');
        }
        await profileService.updateSecurity({
          currentPassword: security.currentPassword,
          newPassword: security.newPassword,
        });
        updateSecurity('currentPassword', '');
        updateSecurity('newPassword', '');
        updateSecurity('confirmPassword', '');
        toastSuccess(t.profile.securitySaveSuccess);
      } else if (activeTab === 'preferences') {
        await profileService.updatePreferences(preferences);
        if (preferences.language && preferences.language !== language) {
          setLanguage(preferences.language);
        }
        await refreshUserProfile();
        const activeT = preferences.language === 'en' ? enTranslations : idTranslations;
        toastSuccess(activeT.profile.saveSuccess);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      toastError(err.message || (language === 'en' ? 'Failed to save changes. Please try again.' : 'Gagal menyimpan perubahan. Silakan coba kembali.'));
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, personalInfo, security, preferences, saveCareerInfo, refreshUserProfile, updateSecurity, toastSuccess, toastError, t, language, setLanguage]);

  const handleAvatarUpload = useCallback(async (file) => {
    setIsUploadingAvatar(true);
    try {
      const response = await profileService.uploadAvatar(file);
      const responseData = response.data || response;
      if (responseData && responseData.avatar_url) {
        await refreshUserProfile();
        toastSuccess(t.profile.avatarSaveSuccess);
      } else {
        throw new Error(language === 'en' ? 'Failed to get new profile picture URL.' : 'Gagal mendapatkan URL foto profil baru.');
      }
    } catch (err) {
      toastError(err.message || (language === 'en' ? 'Failed to upload profile picture.' : 'Gagal mengunggah foto profil.'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [refreshUserProfile, toastSuccess, toastError, t, language]);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = useCallback(async (password) => {
    setIsDeletingAccount(true);
    try {
      await profileService.deleteAccount(password);
      toastSuccess(language === 'en' ? 'Account successfully deleted.' : 'Akun berhasil dihapus.');
      setTimeout(() => {
        logout();
      }, 500);
    } catch (err) {
      toastError(err.message || (language === 'en' ? 'Failed to delete account. Please check your password.' : 'Gagal menghapus akun. Silakan periksa password Anda.'));
      throw err; // Re-throw so modal can stay open on error
    } finally {
      setIsDeletingAccount(false);
    }
  }, [toastSuccess, toastError, language, logout]);

  return {
    activeTab,
    setActiveTab,
    personalInfo,
    updatePersonalInfo,
    careerInfo,
    updateCareerInfo,
    saveCareerInfo,
    addSkill,
    removeSkill,
    newSkill,
    setNewSkill,
    isReprocessing,
    handleReprocess,
    isModalOpen,
    openModal,
    closeModal,
    security,
    updateSecurity,
    removeSession,
    preferences,
    updatePreferences,
    isSaving,
    saveSuccess,
    handleSave,
    user,
    handleAvatarUpload,
    isUploadingAvatar,
    isDeletingAccount,
    handleDeleteAccount,
  };
};
