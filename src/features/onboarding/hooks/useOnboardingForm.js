import { useState } from 'react';
import { replace, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { cvAnalyzerService } from '../../cv-analyzer/api/cvAnalyzerService';
import { profileService } from '../../profile-settings/api/profileService';
import { useToast } from '../../../contexts/ToastContext';

export const useOnboardingForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [careerGoal, setCareerGoal] = useState('');
  const [inputMethod, setInputMethod] = useState('upload'); // 'upload' | 'manual'
  const [cvFile, setCvFile] = useState(null);

  const [manualData, setManualData] = useState({
    domain: '',
    role: '',
    techStack: [],
    experience: '',
    education: ''
  });

  const [additionalSkills, setAdditionalSkills] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [cvData, setCvData] = useState({
    fullName: 'Bayu Wicaksono',
    targetDomain: 'Web Development',
    targetRole: 'Frontend Engineer',
    skills: ['React', 'JavaScript', 'Tailwind CSS', 'Node.js'],
    techStack: ['React', 'JavaScript', 'Tailwind CSS', 'Node.js'],
    experience: '< 1 Tahun (Termasuk Magang/Internship)',
    education: 'S1'
  });
  const { user, updateProfile, completeOnboarding, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { error, success } = useToast();
  const hasCompletedOnce = localStorage.getItem('neokarir_has_completed_onboarding_once') === 'true';
  const isOldUser = hasCompletedOnce || !!user?.target_role || !!user?.profile_data?.target_role;

  const nextStep = async () => {
    if (currentStep === 2 && inputMethod === 'upload') {
      if (!cvFile) {
        error("Silakan unggah CV terlebih dahulu");
        return;
      }
      setIsAnalyzing(true);
      try {
        const response = await cvAnalyzerService.uploadAndAnalyze(cvFile, () => {});
        const data = response.data || response.results || response || {};
        const profileData = data.profile || data.profile_data || data || {};
        
        setCvData({
          fullName: profileData.user_name || profileData.full_name || data.full_name || '',
          targetDomain: profileData.target_domain || data.target_domain || '',
          targetRole: profileData.target_role || data.target_role || '',
          skills: profileData.owned_skills || [],
          techStack: profileData.owned_skills || [],
          experience: profileData.user_experience || '',
          education: profileData.user_education || ''
        });
        setCurrentStep(prev => prev + 1);
      } catch (err) {
        error(err.response?.data?.message || err.message || "Gagal memproses CV");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      if (currentStep < 3) setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const updateManualData = (field, value) => {
    setManualData(prev => ({ ...prev, [field]: value }));
  };

  const updateCvData = (field, value) => {
    setCvData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill) => {
    if (!additionalSkills.includes(skill)) {
      setAdditionalSkills(prev => [...prev, skill]);
    }
  };

  const removeSkill = (skill) => {
    setAdditionalSkills(prev => prev.filter(s => s !== skill));
  };

  const submitOnboarding = async () => {
    setIsSubmitting(true);
    try {
      // Combine manual data tech stack, cv skills and additional skills
      const combinedSkills = Array.from(new Set([
        ...manualData.techStack, 
        ...(inputMethod === 'upload' ? (cvData.techStack || cvData.skills) : []),
        ...additionalSkills
      ])).filter(Boolean);
      
      const domain = inputMethod === 'upload' ? cvData.targetDomain : manualData.domain;
      const targetRole = inputMethod === 'upload' ? cvData.targetRole : (manualData.role || (careerGoal === 'first-job' ? 'Junior Engineer' : 'Engineer'));
      const experience = inputMethod === 'upload' ? (cvData.experience || 'Belum ada') : (manualData.experience || 'Belum ada');
      const education = inputMethod === 'upload' ? (cvData.education || 'S1') : (manualData.education || 'S1');
      const fullName = inputMethod === 'upload'
        ? (cvData.fullName || user?.name || user?.user_metadata?.full_name || '')
        : (user?.name || user?.user_metadata?.full_name || '');
      
      // current_role: for new users, use target_role as starting point
      const currentRole = targetRole;

      // Profile data to save
      const profileData = {
        full_name: fullName || undefined,
        current_role: currentRole,
        target_role: targetRole,
        target_domain: domain,
        education_level: education,
        skills_summary: combinedSkills.join(', '),
        profile_data: {
          career_goal: careerGoal,
          input_method: inputMethod,
          owned_skills: combinedSkills,
          user_experience: experience,
          user_education: education,
          target_domain: domain,
          target_role: targetRole,
          status: 'Open to Work'
        }
      };
      
      if (isOldUser || location.state?.fromSettings) {
        // Update backend with the full profile
        await profileService.updateProfile(profileData);
        
        // Update frontend state
        completeOnboarding({
          name: fullName || 'User',
          role: currentRole,
          current_role: currentRole,
          target_role: targetRole,
          target_domain: domain,
          experience,
          education,
          skills_summary: combinedSkills.join(', '),
          profile_data: profileData.profile_data
        });
        
        // Sync auth user context with DB profile
        await refreshUserProfile();
        
        try {
          // Trigger AI analysis with the new profile data before redirecting
          const { default: api } = await import('../../../config/api');
          await Promise.all([
            api.post('/recommendation/generate').catch(e => console.warn('Recommendation gen failed', e)),
            api.post('/skillgap/analyze', {}).catch(e => console.warn('Skillgap analyze failed', e))
          ]);
        } catch (e) {
          console.warn("AI pre-calculation failed, continuing to next page anyway.", e);
        }
        
        success("Profil berhasil disimpan!");
        navigate('/dashboard', { replace: true });
      } else {
        success("Profil berhasil disimpan!");
        navigate('/ai-career-profiling', { 
          replace: true, 
          state: { 
            reprocess: true, 
            pendingProfileData: profileData 
          } 
        });
      }
    } catch (err) {
      error(err.response?.data?.message || err.message || "Gagal menyimpan profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    careerGoal,
    setCareerGoal,
    inputMethod,
    setInputMethod,
    cvFile,
    setCvFile,
    manualData,
    updateManualData,
    cvData,
    updateCvData,
    additionalSkills,
    addSkill,
    removeSkill,
    isSubmitting,
    isAnalyzing,
    submitOnboarding
  };
};
