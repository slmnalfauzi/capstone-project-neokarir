import { MASTER_JOBS } from '../data/recommendationData';

export const useCareerMatchCalculator = (user, completedCourses, jobsData = []) => {
  const normalizeSkill = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizeCourseId = (value) => (value || '').toString().trim().toLowerCase();

  const isCompletedCourse = (courseId) => {
    const normalizedCourseId = normalizeCourseId(courseId);
    if (!normalizedCourseId || !Array.isArray(completedCourses)) return false;

    return completedCourses.some((completedCourseId) => {
      const normalizedCompletedCourseId = normalizeCourseId(completedCourseId);
      return normalizedCompletedCourseId === normalizedCourseId
        || normalizedCourseId.endsWith(`-${normalizedCompletedCourseId}`)
        || normalizedCompletedCourseId.endsWith(`-${normalizedCourseId}`);
    });
  };

  const calculateMatches = () => {
    const sourceData = jobsData.length > 0 ? jobsData : [];
    return sourceData.map(job => {
      // 1. Start with exact data from backend AI
      const backendMatched = job.matchedSkills || job.matched_skills || [];
      const backendMissing = job.missingSkills || job.missing_skills || [];
      const baseScore = job.matchScore || 0;
      
      // 2. If no completed courses, just return the AI's data as-is
      if (!completedCourses || completedCourses.length === 0) {
        return {
          ...job,
          matchedSkills: backendMatched,
          missingSkills: backendMissing,
        };
      }

      // 3. If there are completed courses, dynamically augment the skills
      // Look up what skills are covered by the completed courses
      const completedSkillsForJob = [];
      const allCourses = job.courses || job.learning_roadmap || [];
      
      allCourses.forEach(course => {
        if (isCompletedCourse(course.id)) {
          const skillTarget = course.skill || course.skillTarget || course.target_skill || course.skill_target || course.title;
          if (skillTarget) {
            completedSkillsForJob.push(skillTarget);
          }
        }
      });

      if (completedSkillsForJob.length === 0) {
        return {
          ...job,
          matchedSkills: backendMatched,
          missingSkills: backendMissing,
        };
      }

      const normCompletedSkills = completedSkillsForJob.map(normalizeSkill);

      // Shift newly learned skills from missing to matched
      const newMatched = [...backendMatched];
      const newMissing = [];

      backendMissing.forEach(skill => {
        if (normCompletedSkills.includes(normalizeSkill(skill))) {
          if (!newMatched.includes(skill)) {
            newMatched.push(skill);
          }
        } else {
          newMissing.push(skill);
        }
      });

      // Recalculate skill breakdown based on new matches
      const reqSkills = job.required_skills || [...newMatched, ...newMissing];
      const totalReq = reqSkills.length > 0 ? reqSkills.length : 1;
      const newSkillScore = Math.round((newMatched.length / totalReq) * 100);
      
      const baseSkillScore = job.matchBreakdown?.skills || Math.round((backendMatched.length / totalReq) * 100);
      const diff = newSkillScore - baseSkillScore;
      const roadmapCompletionPercentage = allCourses.length > 0
        ? Math.round((allCourses.filter(course => isCompletedCourse(course.id)).length / allCourses.length) * 100)
        : 0;
      const roadmapBonus = Math.round((roadmapCompletionPercentage / 100) * 20);
      
      // Usually skills account for ~80% of the weight in AI calculation
      const bumpedScore = Math.min(100, Math.round(baseScore + (diff * 0.8) + roadmapBonus));

      return {
        ...job,
        matchScore: bumpedScore,
        matchedSkills: newMatched,
        missingSkills: newMissing,
        matchBreakdown: {
          ...(job.matchBreakdown || {}),
          skills: newSkillScore
        }
      };
    });
  };

  return {
    recommendations: calculateMatches()
  };
};
