import { getSkillCategory } from '../data/skillTaxonomy';

export const useSkillGapRecommendations = (targetJob, ownedSkills, radarChartData) => {
  if (!targetJob) {
    return {
      recommendedActions: [],
      missingSkillCards: [],
      learningPath: []
    };
  }

  // 1. Calculate recommended actions
  const recommendedActions = [];
  const missingSkills = targetJob.missing_skills || [];
  const matchedSkills = targetJob.matched_skills || [];
  const requiredSkills = targetJob.required_skills || [];

  if (missingSkills.length > 0) {
    recommendedActions.push({
      type: "critical",
      title: "Gap Kritis",
      color: "red",
      description: `Fokus tingkatkan skill: ${missingSkills.join(', ')} untuk memenuhi kriteria peran ${targetJob.job_title}.`
    });
  }
  if (matchedSkills.length > 0) {
    recommendedActions.push({
      type: "strength",
      title: "Keunggulan",
      color: "green",
      description: `Skill Anda di bidang: ${matchedSkills.join(', ')} sudah sesuai kriteria industri.`
    });
  }

  // 2. Calculate missing skills breakdown cards
  const courses = targetJob.learning_roadmap || targetJob.courses || [];
  const missingSkillCards = missingSkills.map(skill => {
    const course = courses.find(c => c.skill === skill);
    
    // Find gap percentage in radarChartData if available
    let gapVal = 35; // Default fallback
    let category = '';
    
    const categoryName = getSkillCategory(targetJob.job_domain || targetJob.job_title, skill);
    category = categoryName;

    if (Array.isArray(radarChartData)) {
      const matchedCategory = radarChartData.find(item => {
        const catName = (item.category || item.subject || '').toLowerCase().trim();
        return catName === categoryName.toLowerCase().trim();
      });
      if (matchedCategory) {
        const rawGap = matchedCategory.gap !== undefined ? matchedCategory.gap : (matchedCategory.required - matchedCategory.current);
        gapVal = Math.abs(rawGap) || 35;
      }
    }

    return {
      skill,
      gap: gapVal,
      category: category || 'Umum',
      priority: course?.prioritas || 'Medium',
      description: course?.deskripsi || `Kemampuan relevan untuk perancangan dan implementasi ${skill} pada peran ${targetJob.job_title}.`,
      alasan: `Dibutuhkan untuk menutupi skill gap peran ${targetJob.job_title}.`,
      relatedSkills: requiredSkills.filter(s => s !== skill).slice(0, 2),
      waktuBelajar: course?.durasi ? `${course.durasi} Belajar` : "4 - 6 Minggu"
    };
  });

  // 3. Calculate learning path timeline courses
  const learningPath = courses.map(course => {
    return {
      id: course.id || ((course.skill || '') + '_' + (course.judul || '')).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      skill: course.skill,
      judul: course.judul,
      platform: course.platform,
      link: course.link,
      durasi: course.durasi,
      prioritas: course.prioritas,
      deskripsi: course.deskripsi
    };
  });

  return {
    recommendedActions,
    missingSkillCards,
    learningPath
  };
};
