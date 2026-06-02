import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useCareerRecommendations } from '../../career-recommendation/hooks/useCareerRecommendations';
import { useSkillGap } from '../../skill-gap-analysis/hooks/useSkillGap';

export const useAIProfiling = () => {
  const { user, completeOnboarding, refreshUserProfile } = useAuth();
  const location = useLocation();
  const pendingProfileData = location.state?.pendingProfileData;

  const [isSubmittingProfile, setIsSubmittingProfile] = useState(!!pendingProfileData);
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(
    pendingProfileData ? 'Menyimpan profil baru Anda...' : 'Membaca data profile...'
  );

  const { recommendations, overallReadiness: defaultOverallReadiness } = useCareerRecommendations();
  const { radarData, learningPath, heroData } = useSkillGap();
  const [profileScore, setProfileScore] = useState(null);

  // Submit profile settings if they were passed from onboarding page
  useEffect(() => {
    const submitPending = async () => {
      if (!pendingProfileData) return;
      try {
        setProcessingStatus('Menyimpan profil baru Anda...');
        const { profileService } = await import('../../profile-settings/api/profileService');
        await profileService.updateProfile(pendingProfileData);
        
        setProcessingStatus('Menganalisis karier dengan AI...');
        completeOnboarding(pendingProfileData);
        await refreshUserProfile();
      } catch (err) {
        console.error("Failed to submit pending profile", err);
      } finally {
        setIsSubmittingProfile(false);
      }
    };
    
    submitPending();
  }, [pendingProfileData]);

  useEffect(() => {
    const fetchProfileScore = async () => {
      try {
        const { default: api } = await import('../../../config/api');
        const response = await api.get('/profile/me/score');
        if (response.data && response.data.score !== undefined) {
           setProfileScore(response.data.score);
        }
      } catch (err) {
        console.warn("Failed to fetch profile score", err);
      }
    };
    
    if (user && !isSubmittingProfile) {
      fetchProfileScore();
    }
  }, [user, isSubmittingProfile]);

  useEffect(() => {
    // Mock processing sequence
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);
      
      if (currentProgress === 30) setProcessingStatus('Analisis skill dan pengalaman Anda...');
      if (currentProgress === 60) setProcessingStatus('Pemetaan ke standar industri...');
      if (currentProgress === 85) setProcessingStatus('Pembuatan rekomendasi yang dipersonalisasi...');
      
      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 60); // Total ~3 seconds

    return () => clearInterval(interval);
  }, []);

  // Control isProcessing completion
  useEffect(() => {
    if (progress >= 100 && !isSubmittingProfile) {
      const timer = setTimeout(() => setIsProcessing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [progress, isSubmittingProfile]);

  // Map recommendations to the topCareers format (limit to max 2 items)
  const topCareers = recommendations.slice(0, 2).map(rec => ({
    id: rec.job_id,
    title: rec.job_title,
    company: rec.company,
    matchScore: rec.matchScore,
    icon: rec.logo,
    requiredSkills: rec.required_skills
  }));

  // Map learningPath to the correct format for LearningPathSection (limit to max 2 items)
  const mappedLearningPath = learningPath.slice(0, 2).map(course => ({
    title: course.judul,
    platform: course.platform,
    duration: course.durasi,
    tag: course.prioritas === 'Tinggi' ? 'High Priority' : 'Medium Priority'
  }));

  const results = {
    overallScore: profileScore !== null ? profileScore : (heroData?.overallReadiness || defaultOverallReadiness || 81),
    topCareers,
    skillGap: radarData,
    learningPath: mappedLearningPath
  };

  return {
    isProcessing,
    progress,
    processingStatus,
    results,
    user
  };
};
