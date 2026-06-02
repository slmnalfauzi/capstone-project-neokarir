const ProfileRepository = require('../repositories/profile.repository');
const SkillgapRepository = require('../repositories/skillgap.repository');
const RecommendationRepository = require('../repositories/recommendation.repository');
const RecommendationService = require('./recommendation.service');
const { callAI2 } = require('../utils/aiClient');

const normalizeCourseId = (value) => (value || '').toString().trim().toLowerCase();

const isCompletedCourse = (courseId, completedCourses = []) => {
	const normalizedCourseId = normalizeCourseId(courseId);
	if (!normalizedCourseId) return false;

	return completedCourses.some((completedCourseId) => {
		const normalizedCompletedCourseId = normalizeCourseId(completedCourseId);
		return normalizedCompletedCourseId === normalizedCourseId
			|| normalizedCourseId.endsWith(`-${normalizedCompletedCourseId}`)
			|| normalizedCompletedCourseId.endsWith(`-${normalizedCourseId}`);
	});
};

const buildRoadmapProgress = (learningRoadmap, completedCourses = []) => {
	const totalCourses = Array.isArray(learningRoadmap) ? learningRoadmap.length : 0;
	if (totalCourses === 0) {
		return {
			completedCount: 0,
			totalCount: 0,
			completionPercentage: 0,
			bonusScore: 0,
		};
	}

	const completedCount = learningRoadmap.filter((course) => isCompletedCourse(course.id, completedCourses)).length;
	const completionPercentage = Math.round((completedCount / totalCourses) * 100);
	const bonusScore = Math.round((completionPercentage / 100) * 20);

	return {
		completedCount,
		totalCount: totalCourses,
		completionPercentage,
		bonusScore,
	};
};

const fetchLearningRoadmap = async (jobId) => {
	if (!jobId) return null;

	try {
		const roadmapData = await RecommendationService.getRoadmap(jobId);
		return roadmapData.courses || [];
	} catch (err) {
		console.error(`Failed to fetch roadmap from AI-2 for jobId ${jobId}:`, err);
		return null;
	}
};

const getByUserId = async (userId, accessToken, jobId = null) => {
	const record = await SkillgapRepository.getByUserId(userId, accessToken, jobId);
	if (!record) return null;

	let learningRoadmap = null;
	if (record.job_id) {
		learningRoadmap = await fetchLearningRoadmap(record.job_id);
	}

	return {
		...record,
		learning_roadmap: learningRoadmap
	};
};

const analyze = async (userId, payload, accessToken) => {
	let { target_domain, target_role, owned_skills } = payload || {};
	
	const profile = await ProfileRepository.getByUserId(userId, accessToken);
	if (!profile) {
		const err = new Error('User profile not found. Please onboarding first.');
		err.statusCode = 404;
		throw err;
	}
	
	target_domain = target_domain || profile.target_domain || profile.profile_data?.target_domain || 'Teknologi Informasi';
	target_role = target_role || profile.target_role || profile.profile_data?.target_role || 'Software Engineer';
	
	if (!owned_skills) {
		if (profile.profile_data && Array.isArray(profile.profile_data.owned_skills)) {
			owned_skills = profile.profile_data.owned_skills;
		} else if (profile.skills_summary) {
			owned_skills = profile.skills_summary.split(',').map(s => s.trim()).filter(Boolean);
		} else {
			owned_skills = [];
		}
	}

	const user_experience = profile.profile_data?.user_experience || 
                            (profile.years_experience !== null ? `${profile.years_experience} Tahun` : 'Belum ada pengalaman');
	const user_education = profile.profile_data?.user_education || profile.education_level || 'Tidak Disebutkan';
	const current_role = profile.current_role || 'Fresh Graduate';
	
	// 1. Call AI-2 to get radar data & recommended actions
	let aiResult;
	try {
		aiResult = await callAI2('/api/profile/skill-gap', {
			target_domain,
			target_role,
			owned_skills,
			user_experience,
			user_education,
			current_role,
		});
	} catch (error) {
		console.error('Error calling AI-2 skill-gap API:', error);
		aiResult = {
			status: 'error',
			message: error.message
		};
	}

	if (aiResult.status !== 'success' || !aiResult.data) {
		// Fallback/mock radar data based on taxonomy if AI-2 is down or fails
		aiResult = {
			status: 'success',
			data: {
				radar_chart_data: [
					{ category: 'Programming', current: 75, required: 90, gap: -15 },
					{ category: 'Database', current: 80, required: 85, gap: -5 },
					{ category: 'DevOps', current: 50, required: 70, gap: -20 }
				],
				recommended_actions: {
					critical_gap: 'Focus on Programming & DevOps skills.',
					needs_improvement: 'Enhance Database expertise.',
					strengths: 'Your core skills are solid.'
				},
				match_score: 50,
				matched_skills: [],
				missing_skills: [],
				required_skills: [],
				min_education: 'Tidak Ditentukan',
				min_experience: 'Tidak Ditentukan',
				job_id: null
			}
		};
	}
	
	let matched_skills = aiResult.data.matched_skills || [];
	let missing_skills = aiResult.data.missing_skills || [];
	let match_score = aiResult.data.match_score !== undefined ? aiResult.data.match_score : 0;
	let job_id = aiResult.data.job_id || null;
	let min_education = aiResult.data.min_education || aiResult.data.education_match?.required || 'Tidak Ditentukan';
	let min_experience = aiResult.data.min_experience || aiResult.data.experience_match?.required || 'Tidak Ditentukan';
	let required_skills = aiResult.data.required_skills || [];
	const completedCourses = Array.isArray(profile.profile_data?.completed_courses)
		? profile.profile_data.completed_courses
		: [];

	let learningRoadmap = await fetchLearningRoadmap(job_id);
	if (!learningRoadmap && aiResult.data.learning_roadmap && Array.isArray(aiResult.data.learning_roadmap)) {
		const roadmapPrefix = job_id || target_role || 'roadmap';
		const flatCourses = [];
		aiResult.data.learning_roadmap.forEach((level) => {
			if (Array.isArray(level.items)) {
				level.items.forEach((item, idx) => {
					flatCourses.push({
						id: `${roadmapPrefix}-${level.level_key}-${idx}`,
						skill: item.skill,
						judul: item.judul_materi,
						platform: item.provider,
						link: item.link,
						durasi: level.level_label.includes('1-2') ? '4-8 Minggu' : 'Tergantung progres',
						prioritas: item.is_required_by_company ? 'Tinggi' : 'Sedang',
						deskripsi: `Pelajari fundamental dan praktik untuk menguasai ${item.skill} melalui ${item.provider}.`
					});
				});
			}
		});
		learningRoadmap = flatCourses;
	}

	const roadmapProgress = buildRoadmapProgress(learningRoadmap, completedCourses);
	if (roadmapProgress.bonusScore > 0) {
		match_score = Math.min(100, Math.round(match_score + roadmapProgress.bonusScore));
	}

	if (match_score === 0 && matched_skills.length === 0) {
		// Fallback to recommendation-matching logic if AI response doesn't provide them
		let recommendations = await RecommendationRepository.listByUserId(userId, accessToken);
		if (!recommendations || recommendations.length === 0) {
			try {
				recommendations = await RecommendationService.generate(userId, accessToken);
			} catch (err) {
				console.error('Failed to generate recommendations during skill gap analysis:', err);
				recommendations = [];
			}
		}

		let targetJob = recommendations.find(
			rec => rec.title.toLowerCase() === target_role.toLowerCase()
		);

		if (!targetJob) {
			targetJob = recommendations.find(
				rec => rec.title.toLowerCase().includes(target_role.toLowerCase()) ||
				       target_role.toLowerCase().includes(rec.title.toLowerCase())
			);
		}

		if (!targetJob) {
			const targetTokens = target_role.toLowerCase().split(/[\s&,/()_-]+/).filter(t => t.length > 1);
			let bestScore = 0;
			let bestRec = null;

			for (const rec of recommendations) {
				const recTokens = rec.title.toLowerCase().split(/[\s&,/()_-]+/).filter(t => t.length > 1);
				const intersection = recTokens.filter(t => targetTokens.includes(t));
				const score = intersection.length / Math.max(targetTokens.length, 1);
				if (score > bestScore) {
					bestScore = score;
					bestRec = rec;
				}
			}

			if (bestScore > 0) {
				targetJob = bestRec;
			}
		}

		if (!targetJob) {
			targetJob = recommendations[0];
		}

		matched_skills = targetJob ? targetJob.matched_skills : [];
		missing_skills = targetJob ? targetJob.missing_skills : [];
		match_score = targetJob ? targetJob.score : 0;
		job_id = targetJob ? targetJob.job_id : null;

		min_education = targetJob?.metadata?.min_education || profile.profile_data?.user_education || 'Tidak Ditentukan';
		min_experience = targetJob?.metadata?.min_experience || profile.profile_data?.user_experience || 'Tidak Ditentukan';
		required_skills = targetJob?.metadata?.required_skills || [];
	}

	// 3. Upsert into DB
	const upsertPayload = {
		target_role,
		target_domain,
		owned_skills,
		matched_skills,
		missing_skills,
		match_score,
		analysis_result: {
			...aiResult.data,
			min_education,
			min_experience,
			required_skills,
			completed_courses: completedCourses,
			roadmap_progress: roadmapProgress,
			overall_readiness: match_score
		},
	};

	const savedRecord = await SkillgapRepository.upsertByUserId(userId, upsertPayload, accessToken, job_id);

	return {
		...savedRecord,
		learning_roadmap: learningRoadmap
	};
};

module.exports = {
	getByUserId,
	analyze,
};

