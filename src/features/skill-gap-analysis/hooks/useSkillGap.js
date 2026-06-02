import { useState, useEffect } from 'react';
import { useCareerRecommendations } from '../../career-recommendation/hooks/useCareerRecommendations';
import { useSkillGapMetrics } from './useSkillGapMetrics';
import { useSkillGapRecommendations } from './useSkillGapRecommendations';

export const useSkillGap = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Consume our new unified career recommendations hook
  const { 
    recommendations, 
    completedCourses, 
    toggleCourse, 
    user,
    isLoading: isRecommendationsLoading
  } = useCareerRecommendations();

  const [skillGapData, setSkillGapData] = useState(null);

  useEffect(() => {
    const fetchSkillGap = async () => {
      setIsLoading(true);
      try {
        const { skillGapService } = await import('../api/skillGapService');
        let data = await skillGapService.getMySkillGap();
        if (!data) {
           data = await skillGapService.analyzeSkillGap({});
        }
        setSkillGapData(data);
      } catch (error) {
        console.error("Failed to fetch skill gap analysis", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && !isRecommendationsLoading) {
      fetchSkillGap();
    } else if (!user && !isRecommendationsLoading) {
      setIsLoading(false);
    }
  }, [user, isRecommendationsLoading]);

  // Find targeted job based on user target role or recommendations
  const userTargetRole = skillGapData?.target_role || user?.role || 'Frontend Engineer';
  const targetJob = recommendations.find(
    rec => rec.job_title.toLowerCase() === userTargetRole.toLowerCase()
  ) || recommendations.find(
    rec => rec.job_title.toLowerCase().includes(userTargetRole.toLowerCase())
  ) || recommendations[0];

  const ownedSkills = skillGapData?.owned_skills || user?.profile_data?.owned_skills || [];

  // Construct target job from skillGapData if recommendations are missing/loading
  // We prioritize skillGapData to ensure match score and skills match the target career analysis precisely.
  const resolvedTargetJob = (skillGapData ? {
    job_title: skillGapData.target_role,
    job_domain: skillGapData.target_domain,
    job_id: skillGapData.job_id,
    matched_skills: skillGapData.matched_skills || [],
    missing_skills: skillGapData.missing_skills || [],
    required_skills: skillGapData.analysis_result?.required_skills || [
      ...(skillGapData.matched_skills || []),
      ...(skillGapData.missing_skills || [])
    ],
    matchScore: skillGapData.match_score,
    min_education: skillGapData.analysis_result?.min_education || 'Tidak Ditentukan',
    min_experience: skillGapData.analysis_result?.min_experience || 'Tidak Ditentukan',
    learning_roadmap: skillGapData.learning_roadmap || []
  } : null) || targetJob;

  const rawRadarData = skillGapData?.analysis_result?.radar_chart_data;

  // 1. Calculate metrics (hero, radar, breakdown)
  const { heroData: defaultHeroData, radarData: defaultRadarData, skillBreakdown: defaultSkillBreakdown } = useSkillGapMetrics(resolvedTargetJob, user, ownedSkills, rawRadarData);

  // 2. Calculate recommendations (actions, cards, path)
  const { recommendedActions: defaultActions, missingSkillCards: defaultMissingSkillCards, learningPath: defaultLearningPath } = useSkillGapRecommendations(resolvedTargetJob, ownedSkills, rawRadarData);

  const normalizeCourseId = (value) => (value || '').toString().trim().toLowerCase();
  const isCompletedCourse = (courseId, completedCourseIds = []) => {
    const normalizedCourseId = normalizeCourseId(courseId);
    if (!normalizedCourseId || !Array.isArray(completedCourseIds)) return false;

    return completedCourseIds.some((completedCourseId) => {
      const normalizedCompletedCourseId = normalizeCourseId(completedCourseId);
      return normalizedCompletedCourseId === normalizedCourseId
        || normalizedCourseId.endsWith(`-${normalizedCompletedCourseId}`)
        || normalizedCompletedCourseId.endsWith(`-${normalizedCourseId}`);
    });
  };

  const getRoadmapCompletionStats = (courses = [], completedCourseIds = []) => {
    const total = Array.isArray(courses) ? courses.length : 0;
    if (total === 0) {
      return { completedCount: 0, totalCount: 0, completionPercentage: 0, bonusScore: 0 };
    }

    const completedCount = courses.filter(course => isCompletedCourse(course.id, completedCourseIds)).length;
    const completionPercentage = Math.round((completedCount / total) * 100);

    return {
      completedCount,
      totalCount: total,
      completionPercentage,
      bonusScore: Math.round((completionPercentage / 100) * 20)
    };
  };

  // 3. Transform & Override radar chart data (Support dual series: A (current) and B (required))
  const finalRawRadarData = rawRadarData || defaultRadarData;
  const radarData = Array.isArray(finalRawRadarData) 
    ? finalRawRadarData.map(item => ({
        subject: item.category || item.subject,
        A: item.current !== undefined ? item.current : (item.A !== undefined ? item.A : 50),
        B: item.required !== undefined ? item.required : (item.B !== undefined ? item.B : 85),
        fullMark: 100
      }))
    : defaultRadarData;

  // 4. Normalize recommended actions to array
  const rawActions = skillGapData?.analysis_result?.recommended_actions || defaultActions;
  const normalizeActions = (actionsInput) => {
    if (!actionsInput) return [];
    if (Array.isArray(actionsInput)) {
      return actionsInput;
    }
    const actions = [];
    if (actionsInput.critical_gap || actionsInput.critical) {
      actions.push({
        type: 'critical',
        title: 'Gap Kritis',
        description: actionsInput.critical_gap || actionsInput.critical
      });
    }
    if (actionsInput.needs_improvement || actionsInput.improvement || actionsInput.improvements) {
      actions.push({
        type: 'improvement',
        title: 'Butuh Peningkatan',
        description: actionsInput.needs_improvement || actionsInput.improvements || actionsInput.improvement
      });
    }
    if (actionsInput.strengths || actionsInput.strength) {
      actions.push({
        type: 'strength',
        title: 'Keunggulan',
        description: actionsInput.strengths || actionsInput.strength
      });
    }
    return actions;
  };
  const recommendedActions = normalizeActions(rawActions);
    
  const parseExperience = (expStr) => {
    if (!expStr) return 0;
    const str = expStr.toLowerCase();
    if (str.includes('< 1') || str.includes('fresh')) return 0;
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const currentExpStr = skillGapData?.analysis_result?.experience_match?.current || user?.experience || 'Belum ada pengalaman';
  const reqExpStr = skillGapData?.analysis_result?.experience_match?.required || 'Tidak Ditentukan';
  
  const currentExpYears = parseExperience(currentExpStr);
  const reqExpYears = parseExperience(reqExpStr);
  
  // Exceeding or meeting requirements is NOT a gap
  const expHasGap = currentExpYears < reqExpYears;

  const currentEduStr = skillGapData?.analysis_result?.education_match?.current || 'Tidak Ditentukan';
  const reqEduStr = skillGapData?.analysis_result?.education_match?.required || 'Tidak Ditentukan';
  const eduHasGap = skillGapData?.analysis_result?.education_match?.has_gap || false; // Keep backend logic for education or override if needed

  const matchedSkills = skillGapData?.analysis_result?.skill_match?.matched_count || 0;
  const totalSkills = skillGapData?.analysis_result?.skill_match?.total_count || 1;
  const skillRatio = totalSkills > 0 ? (matchedSkills / totalSkills) : 1;

  // Recalculate a fairer match score that heavily rewards a good career (experience)
  // Base skill = 50%, Experience = 30%, Education = 20%
  let calculatedScore = skillRatio * 50;
  
  if (!expHasGap) {
    // Reward for meeting or exceeding experience
    calculatedScore += 30;
    // Extra bonus if they have significantly more experience
    if (currentExpYears > reqExpYears) {
      calculatedScore += Math.min(10, (currentExpYears - reqExpYears) * 5); 
    }
  } else {
    // Partial score for experience if they have some
    calculatedScore += (currentExpYears / (reqExpYears || 1)) * 30;
  }

  if (!eduHasGap) {
    calculatedScore += 20;
  }

  const finalReadinessScore = Math.min(100, Math.round(calculatedScore));
  const roadmapStats = getRoadmapCompletionStats(
    resolvedTargetJob?.learning_roadmap || resolvedTargetJob?.courses || [],
    completedCourses
  );
  const readinessWithRoadmap = Math.min(100, finalReadinessScore + roadmapStats.bonusScore);

  const roadmapCourses = skillGapData?.learning_roadmap || defaultLearningPath;
  const skillCompletionStats = Array.isArray(roadmapCourses)
    ? roadmapCourses.reduce((acc, course) => {
        const skillKey = (course.skill || '').toLowerCase().trim();
        if (!skillKey) return acc;

        if (!acc[skillKey]) {
          acc[skillKey] = { total: 0, completed: 0 };
        }

        acc[skillKey].total += 1;
        if (isCompletedCourse(course.id, completedCourses)) {
          acc[skillKey].completed += 1;
        }

        return acc;
      }, {})
    : {};

  let newlyClosedSkills = 0;
  const adjustedSkillBreakdown = (skillGapData?.analysis_result?.skill_breakdown || defaultSkillBreakdown).map((item) => {
    const skillKey = (item.skill || '').toLowerCase().trim();
    const stats = skillCompletionStats[skillKey];

    if (!stats || stats.total === 0) {
      return item;
    }

    const completionRatio = stats.completed / stats.total;
    const gapToClose = Math.max(0, (item.required || 0) - (item.current || 0));
    const current = Math.min(100, Math.round((item.current || 0) + (gapToClose * completionRatio)));

    if ((item.current || 0) < (item.required || 0) && current >= (item.required || 0)) {
      newlyClosedSkills += 1;
    }

    return {
      ...item,
      current,
      gap: Math.round(current - (item.required || 0)),
      trend: current >= item.required ? 'up' : 'down'
    };
  });

  const matchedSkillsCountWithRoadmap = Math.min(
    totalSkills,
    matchedSkills + newlyClosedSkills
  );
  const missingSkillsCountWithRoadmap = Math.max(0, totalSkills - matchedSkillsCountWithRoadmap);

  const heroData = skillGapData?.analysis_result ? {
    overallReadiness: readinessWithRoadmap,
    targetRole: skillGapData.analysis_result.target_role || skillGapData.target_role,
    targetDomain: skillGapData.analysis_result.target_domain || skillGapData.target_domain,
    matchedSkillsCount: matchedSkillsCountWithRoadmap,
    totalRequiredSkills: totalSkills,
    missingSkillsCount: missingSkillsCountWithRoadmap,
    experienceGap: {
      current: currentExpStr,
      required: reqExpStr,
      hasGap: expHasGap
    },
    educationMatch: {
      current: currentEduStr,
      required: reqEduStr,
      hasGap: eduHasGap
    },
    roadmapProgress: roadmapStats,
    readinessLevel: readinessWithRoadmap >= 80 ? 'Siap Kerja' : readinessWithRoadmap >= 60 ? 'Hampir Siap' : 'Perlu Persiapan'
  } : defaultHeroData;

  const skillBreakdown = adjustedSkillBreakdown;

  const missingSkillCards = skillGapData?.analysis_result?.detailed_skills_to_learn
    ? skillGapData.analysis_result.detailed_skills_to_learn.map(item => ({
        skill: item.skill,
        gap: item.gap,
        category: item.category || 'Umum',
        priority: item.priority || 'Medium',
        description: item.description,
        alasan: item.alasan,
        relatedSkills: item.relatedSkills || [],
        waktuBelajar: item.waktuBelajar || '4 - 6 Minggu'
      }))
    : defaultMissingSkillCards;

  // 5. Use learning path from AI-2 (via backend) with fallback to default recommendation learning path
  const learningPath = skillGapData?.learning_roadmap || defaultLearningPath;

  const isOverallLoading = isLoading || isRecommendationsLoading;

  return {
    isLoading: isOverallLoading,
    heroData,
    radarData,
    skillBreakdown,
    recommendedActions,
    missingSkillCards,
    learningPath,
    completedCourses,
    toggleCourse,
    ownedSkills
  };
};
