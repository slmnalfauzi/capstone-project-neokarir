import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Breadcrumb from '../components/ui/Breadcrumb';
import ProfileOverviewCard from '../features/profile-settings/components/ProfileOverviewCard';
import ProfileTabs from '../features/profile-settings/components/ProfileTabs';
import PersonalInfoTab from '../features/profile-settings/components/PersonalInfoTab';
import CareerSkillsTab from '../features/profile-settings/components/CareerSkillsTab';
import AccountSecurityTab from '../features/profile-settings/components/AccountSecurityTab';
import PreferencesTab from '../features/profile-settings/components/PreferencesTab';
import ProfileSettingsSkeleton from '../features/profile-settings/components/ProfileSettingsSkeleton';
import { useProfileSettings } from '../features/profile-settings/hooks/useProfileSettings';
import { useLanguage } from '../contexts/LanguageContext';

const ProfileSettingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const {
    activeTab,
    setActiveTab,
    personalInfo,
    updatePersonalInfo,
    careerInfo,
    updateCareerInfo,
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
  } = useProfileSettings();

  const breadcrumbItems = [
    { label: t.profile.title, icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <PersonalInfoTab
            personalInfo={personalInfo}
            updatePersonalInfo={updatePersonalInfo}
            onSave={handleSave}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
        );
      case 'career':
        return (
          <CareerSkillsTab
            careerInfo={careerInfo}
            updateCareerInfo={updateCareerInfo}
            addSkill={addSkill}
            removeSkill={removeSkill}
            newSkill={newSkill}
            setNewSkill={setNewSkill}
            isReprocessing={isReprocessing}
            handleReprocess={handleReprocess}
            isModalOpen={isModalOpen}
            openModal={openModal}
            closeModal={closeModal}
            onSave={handleSave}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
        );
      case 'security':
        return (
          <AccountSecurityTab
            security={security}
            updateSecurity={updateSecurity}
            removeSession={removeSession}
            onSave={handleSave}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            isDeletingAccount={isDeletingAccount}
            handleDeleteAccount={handleDeleteAccount}
          />
        );
      case 'preferences':
        return (
          <PreferencesTab
            preferences={preferences}
            updatePreferences={updatePreferences}
            onSave={handleSave}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      {isLoading ? (
        <ProfileSettingsSkeleton />
      ) : (
        <div className="animate-fade-in">
          {/* Page Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-title md:text-heading font-bold text-primary-text mb-1">
              {t.profile.title}
            </h1>
            <p className="text-body-sm md:text-body font-medium text-secondary-text">
              {t.profile.subtitle}
            </p>
          </div>

          {/* Profile Overview Card */}
          <div className="mb-6">
            <ProfileOverviewCard
              user={user}
              onEditProfile={() => setActiveTab('personal')}
              onAvatarUpload={handleAvatarUpload}
              isUploadingAvatar={isUploadingAvatar}
            />
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Tab Content */}
          <div className="pb-10">
            {renderTabContent()}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProfileSettingsPage;
