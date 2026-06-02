import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCompletedCourses } from './useCompletedCourses';
import { useCareerMatchCalculator } from './useCareerMatchCalculator';

export const useCareerRecommendations = () => {
  const { user: authUser } = useAuth();
  
  const [rawRecommendations, setRawRecommendations] = useState([]);
  const [fullProfileUser, setFullProfileUser] = useState(null);
  
  // 1. Manage checklist courses via custom hook
  const { completedCourses, toggleCourse } = useCompletedCourses(authUser?.email);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedMatchFilter, setSelectedMatchFilter] = useState('all'); // 'all' | 'high' (>=80%) | 'medium' (50-79%) | 'low' (<50%)
  const [activeJobId, setActiveJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recommendations and profile from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { careerService } = await import('../api/careerService');
        const { profileService } = await import('../../profile-settings/api/profileService');
        
        const [recsData, profileRes] = await Promise.all([
          careerService.getRecommendations(),
          profileService.getMyProfile().catch(() => null)
        ]);
        
        setRawRecommendations(recsData || []);
        
        if (profileRes?.data?.profile) {
          const profile = profileRes.data.profile;
          setFullProfileUser({
            ...authUser,
            education: profile.education_level || authUser?.education,
            experience: profile.profile_data?.user_experience || authUser?.experience,
            domain: profile.target_domain || profile.profile_data?.target_domain || authUser?.domain,
            skills: profile.profile_data?.owned_skills || authUser?.skills || [],
            profile_data: profile.profile_data
          });
        } else {
          setFullProfileUser(authUser);
        }
      } catch (error) {
        console.error("Failed to load recommendations and profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (authUser) {
      fetchData();
    }
  }, [authUser]);

  // 2. Dynamically calculate match score based on completed courses
  const { recommendations } = useCareerMatchCalculator(fullProfileUser || authUser, completedCourses, rawRecommendations);

  // 3. Filter recommendations based on search query, domain, and match filter
  const filteredRecommendations = recommendations.filter(rec => {
    // Search query match (job title or company or skill)
    const matchesSearch = searchQuery === '' || 
      rec.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(rec.required_skills) && rec.required_skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())));

    // Domain filter
    const matchesDomain = selectedDomain === 'All' || rec.job_domain === selectedDomain;

    // Match Score filter
    let matchesMatchFilter = true;
    if (selectedMatchFilter === 'high') {
      matchesMatchFilter = rec.matchScore >= 80;
    } else if (selectedMatchFilter === 'medium') {
      matchesMatchFilter = rec.matchScore >= 50 && rec.matchScore < 80;
    } else if (selectedMatchFilter === 'low') {
      matchesMatchFilter = rec.matchScore < 50;
    }

    return matchesSearch && matchesDomain && matchesMatchFilter;
  });

  // Sort by match score descending
  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => b.matchScore - a.matchScore);

  // Find active job detail
  const activeJob = sortedRecommendations.find(rec => rec.job_id === activeJobId) || null;

  // Domain categories list for filters
  const domains = ['All', ...new Set(recommendations.map(job => job.job_domain).filter(Boolean))];

  // Calculate overall readiness (average of top 3 recommended match scores)
  const topThreeScores = sortedRecommendations.slice(0, 3).map(r => r.matchScore);
  const overallReadiness = topThreeScores.length > 0 
    ? Math.round(topThreeScores.reduce((a, b) => a + b, 0) / topThreeScores.length)
    : 0;

  return {
    isLoading,
    recommendations: sortedRecommendations,
    activeJob,
    activeJobId,
    setActiveJobId,
    completedCourses,
    toggleCourse,
    searchQuery,
    setSearchQuery,
    selectedDomain,
    setSelectedDomain,
    selectedMatchFilter,
    setSelectedMatchFilter,
    domains,
    overallReadiness,
    user: fullProfileUser || authUser
  };
};
