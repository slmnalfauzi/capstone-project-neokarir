const ProfileRepository = require('../repositories/profile.repository');
const RecommendationRepository = require('../repositories/recommendation.repository');
const { callAI2 } = require('../utils/aiClient');
const { getSupabaseClient } = require('../config/database');

const listByUserId = async (userId, accessToken) => {
	return RecommendationRepository.listByUserId(userId, accessToken);
};

const isValidUuid = (uuid) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

const generate = async (userId, accessToken) => {
	const profile = await ProfileRepository.getByUserId(userId, accessToken);
	if (!profile) {
		const err = new Error('User profile not found. Please onboarding first.');
		err.statusCode = 404;
		throw err;
	}

	const ownedSkills = profile.profile_data?.owned_skills || 
		(profile.skills_summary ? profile.skills_summary.split(',').map(s => s.trim()).filter(Boolean) : []);
	
	const userExperience = profile.profile_data?.user_experience || 'Belum ada pengalaman';
	const userEducation = profile.profile_data?.user_education || 'Tidak Disebutkan';

	const payload = {
		target_domain: profile.target_domain || profile.profile_data?.target_domain || '',
		target_role: profile.target_role || profile.profile_data?.target_role || '',
		owned_skills: ownedSkills,
		user_experience: userExperience,
		user_education: userEducation,
	};

	const aiResult = await callAI2('/api/recommendation/dynamic', payload);

	if (aiResult.status !== 'success' || !Array.isArray(aiResult.recommendations)) {
		throw new Error('Failed to generate recommendations from AI service');
	}

	const recommendations = aiResult.recommendations;
	const jobIdsToCheck = recommendations
		.map(r => r.job_id)
		.filter(id => id && isValidUuid(id));

	let existingJobIdsSet = new Set();
	if (jobIdsToCheck.length > 0) {
		const supabase = getSupabaseClient(accessToken);
		const { data: existingJobs, error } = await supabase
			.from('jobs')
			.select('id')
			.in('id', jobIdsToCheck);
		
		if (!error && existingJobs) {
			existingJobIdsSet = new Set(existingJobs.map(j => j.id));
		}
	}

	// Clear old recommendations
	await RecommendationRepository.deleteByUserId(userId, accessToken);

	const ownedSkillsSet = new Set(ownedSkills.map(s => s.toLowerCase()));

	// Build records for inserting
	const records = await Promise.all(recommendations.map(async (rec) => {
		const isJobValid = rec.job_id && isValidUuid(rec.job_id) && existingJobIdsSet.has(rec.job_id);
		const reqSkills = rec.required_skills || [];
		const matched_skills = reqSkills.filter(s => ownedSkillsSet.has(s.toLowerCase()));
		const missing_skills = reqSkills.filter(s => !ownedSkillsSet.has(s.toLowerCase()));

		let courses = [];
		if (isJobValid) {
			try {
				const roadmapData = await getRoadmap(rec.job_id);
				courses = roadmapData.courses || [];
			} catch (err) {
				console.error(`Failed to fetch roadmap during recommendation generation for jobId ${rec.job_id}:`, err);
			}
		}

		return {
			user_id: userId,
			job_id: isJobValid ? rec.job_id : null,
			recommendation_type: 'job',
			title: rec.job_title || 'Recommended Job',
			description: `Lowongan di ${rec.company || 'Perusahaan Terkait'}`,
			reason: `Cocok dengan target domain ${rec.job_domain || ''}.`,
			score: rec.match_score || 0,
			matched_skills,
			missing_skills,
			metadata: {
				...rec,
				courses
			},
		};
	}));

	const saved = await RecommendationRepository.bulkCreate(records, accessToken);
	return saved;
};

const getRoadmap = async (jobId) => {
	const aiResult = await callAI2(`/api/roadmap/job-sync/${jobId}`, null, { method: 'GET' });
	if (aiResult.status !== 'success') {
		throw new Error('Failed to fetch roadmap from AI service');
	}

	const flatCourses = [];
	if (aiResult.data && Array.isArray(aiResult.data.learning_roadmap)) {
		aiResult.data.learning_roadmap.forEach((level) => {
			if (Array.isArray(level.items)) {
				level.items.forEach((item, idx) => {
					flatCourses.push({
						id: `${jobId}-${level.level_key}-${idx}`,
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
	}

	return { courses: flatCourses, raw_roadmap: aiResult.data };
};

module.exports = {
	listByUserId,
	generate,
	getRoadmap,
};
