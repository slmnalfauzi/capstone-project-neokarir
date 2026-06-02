import api, { USE_MOCK } from '../../../config/api';
import { MASTER_JOBS } from '../data/recommendationData';

const normalizeCourseId = (value) => (value || '').toString().trim().toLowerCase();

const courseIdsMatch = (left, right) => {
  const normalizedLeft = normalizeCourseId(left);
  const normalizedRight = normalizeCourseId(right);

  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight
    || normalizedLeft.endsWith(`-${normalizedRight}`)
    || normalizedRight.endsWith(`-${normalizedLeft}`);
};

const flattenRecommendationCourses = (recommendations = []) => {
  const courses = [];

  recommendations.forEach((recommendation) => {
    const roadmapCourses = recommendation?.courses || recommendation?.learning_roadmap || [];
    roadmapCourses.forEach((course) => {
      if (course?.id) {
        courses.push(course.id);
      }
    });
  });

  return courses;
};

const canonicalizeCompletedCourses = (completedCourses = [], catalogCourseIds = []) => {
  const normalized = [];
  let changed = false;

  completedCourses.forEach((courseId) => {
    const match = catalogCourseIds.find((catalogCourseId) => courseIdsMatch(courseId, catalogCourseId));
    const canonicalCourseId = match || courseId;

    if (!match || canonicalCourseId !== courseId) {
      changed = true;
    }

    if (!normalized.some((existingCourseId) => courseIdsMatch(existingCourseId, canonicalCourseId))) {
      normalized.push(canonicalCourseId);
    }
  });

  return { courses: normalized, changed };
};

/**
 * Career Recommendation Service
 * Retrieves career tracks, match scores, and recommended study paths.
 */
export const careerService = {
  getRecommendations: async () => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return MASTER_JOBS;
    }

    try {
      // Fetch existing recommendations
      const response = await api.get('/recommendation/me');
      let recs = response?.data?.recommendations || response?.recommendations || [];
      
      // If none exist, auto-generate them
      if (!recs || recs.length === 0) {
        const genResponse = await api.post('/recommendation/generate');
        recs = genResponse?.data?.recommendations || genResponse?.recommendations || [];
      }
      
      return recs.map(rec => {
        // Map backend format to frontend format
        const metadata = rec.metadata || {};
        const reqSkills = metadata.required_skills || rec.required_skills || [];
        const matchedSkills = rec.matched_skills || [];
        const missingSkills = rec.missing_skills || [];
        
        return {
          ...metadata,
          job_id: rec.job_id,
          job_title: rec.title || metadata.job_title || 'Recommended Job',
          job_domain: metadata.job_domain || 'Teknologi Informasi',
          company: metadata.company || 'Perusahaan Terkait',
          matchScore: Number(rec.score || metadata.match_score || 0),
          logo: metadata.logo || '',
          min_experience: metadata.min_experience || 'Tidak Ditentukan',
          min_education: metadata.min_education || 'Tidak Ditentukan',
          matchedSkills: matchedSkills,
          matched_skills: matchedSkills,
          missing_skills: missingSkills,
          required_skills: reqSkills,
          courses: metadata.courses || [],
          matchBreakdown: metadata.match_breakdown || {
            skills: reqSkills.length > 0 ? Math.round((matchedSkills.length / reqSkills.length) * 100) : 50,
            experience: 100,
            education: 100
          },
          learning_roadmap: metadata.learning_roadmap || []
        };
      });
    } catch (error) {
      console.error('Failed to get career recommendations:', error);
      return [];
    }
  },

  getCompletedCourses: async (email) => {
    if (USE_MOCK) {
      const stored = localStorage.getItem(`completed_courses_${email}`);
      return stored ? JSON.parse(stored) : [];
    }
    
    try {
      const [profileResponse, recommendations] = await Promise.all([
        api.get('/profile/me'),
        careerService.getRecommendations().catch(() => []),
      ]);

      const profileData = profileResponse?.data?.profile?.profile_data || profileResponse?.profile?.profile_data || {};
      const completedCourses = Array.isArray(profileData.completed_courses) ? profileData.completed_courses : [];
      const catalogCourseIds = flattenRecommendationCourses(recommendations);
      const { courses: canonicalCourses, changed } = canonicalizeCompletedCourses(completedCourses, catalogCourseIds);

      if (changed) {
        await api.put('/profile/me', {
          profile_data: {
            completed_courses: canonicalCourses
          }
        });
      }

      return canonicalCourses;
    } catch (e) {
      console.error("Failed to fetch completed courses from backend", e);
      const stored = localStorage.getItem(`completed_courses_${email}`);
      return stored ? JSON.parse(stored) : [];
    }
  },

  toggleCourse: async (email, courseId) => {
    if (USE_MOCK) {
      const key = `completed_courses_${email}`;
      const stored = localStorage.getItem(key);
      let list = stored ? JSON.parse(stored) : [];
      if (list.some((id) => courseIdsMatch(id, courseId))) {
        list = list.filter((id) => !courseIdsMatch(id, courseId));
      } else {
        list.push(courseId);
      }
      localStorage.setItem(key, JSON.stringify(list));
      return list;
    }

    try {
      const recommendations = await careerService.getRecommendations().catch(() => []);
      const catalogCourseIds = flattenRecommendationCourses(recommendations);

      // Get current list
      const response = await api.get('/profile/me');
      const profileData = response?.data?.profile?.profile_data || response?.profile?.profile_data || {};
      let list = Array.isArray(profileData.completed_courses) ? profileData.completed_courses : [];
      list = canonicalizeCompletedCourses(list, catalogCourseIds).courses;
      
      // Toggle
      if (list.some((id) => courseIdsMatch(id, courseId))) {
        list = list.filter((id) => !courseIdsMatch(id, courseId));
      } else {
        const match = catalogCourseIds.find((catalogCourseId) => courseIdsMatch(courseId, catalogCourseId));
        list.push(match || courseId);
      }

      const { courses: canonicalCourses } = canonicalizeCompletedCourses(list, catalogCourseIds);

      // Save to backend
      await api.put('/profile/me', {
        profile_data: {
          completed_courses: canonicalCourses
        }
      });
      
      return canonicalCourses;
    } catch (e) {
      console.error("Failed to toggle course in backend", e);
      throw e;
    }
  },
};
