import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { profileService } from '../api/profileService';

export const useCareerSkills = (initialUser) => {
  const navigate = useNavigate();
  const { resetOnboarding, updateProfile } = useAuth();
  const [newSkill, setNewSkill] = useState('');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [careerInfo, setCareerInfo] = useState({
    currentRole: initialUser?.current_role || initialUser?.role || '',
    targetRole: initialUser?.target_role || initialUser?.profile_data?.target_role || '',
    targetDomain: initialUser?.target_domain || initialUser?.profile_data?.target_domain || '',
    experienceLevel: initialUser?.experience || initialUser?.profile_data?.user_experience || 'Fresh Graduate',
    skills: [],
    education: initialUser?.education || initialUser?.profile_data?.user_education || 'S1',
  });

  useEffect(() => {
    if (initialUser) {
      const dbSkills = initialUser.profile_data?.owned_skills || 
        (initialUser.skills_summary ? initialUser.skills_summary.split(',').map(s => s.trim()).filter(Boolean) : []);
      
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setCareerInfo(prev => ({
        ...prev,
        currentRole: initialUser.current_role || initialUser.role || '',
        targetRole: initialUser.target_role || initialUser.profile_data?.target_role || '',
        targetDomain: initialUser.target_domain || initialUser.profile_data?.target_domain || '',
        experienceLevel: initialUser.experience || initialUser.profile_data?.user_experience || 'Fresh Graduate',
        skills: dbSkills,
        education: initialUser.education || initialUser.profile_data?.user_education || 'S1',
      }));
    }
  }, [initialUser]);

  const saveTimeoutRef = useRef(null);

  const updateCareerInfo = useCallback((field, value) => {
    setCareerInfo(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-save logic with debounce
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        profileService.updateCareerInfo({
          currentRole: next.currentRole,
          targetRole: next.targetRole,
          targetDomain: next.targetDomain,
          experienceLevel: next.experienceLevel,
          skills: next.skills,
          education: next.education,
        }).then(() => {
          updateProfile({
            role: next.currentRole,
            current_role: next.currentRole,
            target_role: next.targetRole,
            target_domain: next.targetDomain,
            experience: next.experienceLevel,
            education: next.education,
          });
        }).catch(err => console.error("Auto-save failed", err));
      }, 800);

      return next;
    });
  }, [updateProfile]);

  const saveCareerInfo = useCallback(async (currentCareerInfo) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const info = currentCareerInfo || careerInfo;
    await profileService.updateCareerInfo({
      currentRole: info.currentRole,
      targetRole: info.targetRole,
      targetDomain: info.targetDomain,
      experienceLevel: info.experienceLevel,
      skills: info.skills,
      education: info.education,
    });
    updateProfile({
      role: info.currentRole,
      current_role: info.currentRole,
      target_role: info.targetRole,
      target_domain: info.targetDomain,
      experience: info.experienceLevel,
      education: info.education,
    });
  }, [careerInfo, updateProfile]);

  const addSkill = useCallback(async (skill) => {
    if (skill && !careerInfo.skills.includes(skill)) {
      const updatedSkills = [...careerInfo.skills, skill];
      setCareerInfo(prev => ({
        ...prev,
        skills: updatedSkills,
      }));
      profileService.updateCareerInfo({ skills: updatedSkills });
    }
  }, [careerInfo.skills]);

  const removeSkill = useCallback(async (skillToRemove) => {
    const updatedSkills = careerInfo.skills.filter(s => s !== skillToRemove);
    setCareerInfo(prev => ({
      ...prev,
      skills: updatedSkills,
    }));
    profileService.updateCareerInfo({ skills: updatedSkills });
  }, [careerInfo.skills]);

  const handleReprocess = useCallback(async () => {
    setIsReprocessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsReprocessing(false);
    setIsModalOpen(false);
    resetOnboarding();
    navigate('/onboarding', { state: { fromSettings: true } });
  }, [navigate, resetOnboarding]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return {
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
  };
};
