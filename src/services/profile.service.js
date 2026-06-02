const ProfileRepository = require('../repositories/profile.repository');
const AiService = require('./ai.service');

const getByUserId = async (userId, accessToken) => {
	return ProfileRepository.getByUserId(userId, accessToken);
};

const { getSupabaseClient, getAdminSupabaseClient } = require('../config/database');

const upsertByUserId = async (userId, payload, accessToken) => {
	const supabaseAdmin = getAdminSupabaseClient();
	
	const authUpdatePayload = {};
	if (payload.full_name) {
		authUpdatePayload.user_metadata = { full_name: payload.full_name, name: payload.full_name };
	}
	// Note: Updating email in Supabase typically triggers a confirmation email
	if (payload.email) {
		authUpdatePayload.email = payload.email;
	}
	
	if (Object.keys(authUpdatePayload).length > 0 && supabaseAdmin) {
		const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdatePayload);
		if (authError) {
			console.warn('Failed to update Supabase Auth user:', authError.message);
		}
	}

	const savedProfile = await ProfileRepository.upsertByUserId(userId, payload, accessToken);

	// Trigger recommendations regeneration and skill gap analysis synchronously to ensure data is ready before responding to frontend
	if (savedProfile && savedProfile.target_role) {
		const SkillgapService = require('./skillgap.service');
		const RecommendationService = require('./recommendation.service');
		try {
			await RecommendationService.generate(userId, accessToken);
		} catch (err) {
			console.error('Auto-generation of recommendations failed:', err);
		}
		try {
			await SkillgapService.analyze(userId, null, accessToken);
		} catch (err) {
			console.error('Auto-analysis of skill gap failed:', err);
		}
	}

	return savedProfile;
};

const getProfileScore = async (userId, accessToken) => {
	const profile = await ProfileRepository.getByUserId(userId, accessToken);
	if (!profile) {
		const err = new Error('User profile not found. Please onboarding first.');
		err.statusCode = 404;
		throw err;
	}

	const owned_skills = profile.profile_data?.owned_skills || 
		(profile.skills_summary ? profile.skills_summary.split(',').map(s => s.trim()).filter(Boolean) : []);

	const payload = {
		target_domain: profile.target_domain || profile.profile_data?.target_domain || '',
		target_role: profile.target_role || profile.profile_data?.target_role || '',
		owned_skills,
	};

	return AiService.getProfileScore(payload);
};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../constants/error');

const uploadAvatarByUserId = async (userId, file, accessToken) => {
	if (!file) {
		throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Foto profil wajib diunggah', 400);
	}

	const supabase = getAdminSupabaseClient() || getSupabaseClient(accessToken);
	
	let fileBuffer;
	try {
		fileBuffer = file.buffer ? file.buffer : fs.readFileSync(file.path);
	} catch (_err) {
		throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Gagal membaca file foto profil', 400);
	}

	const safeName = path.basename(file.originalname || 'avatar.png').replace(/[^a-zA-Z0-9._-]/g, '_');
	const storageObjectPath = `${userId}/avatar_${Date.now()}_${crypto.randomUUID()}_${safeName}`;

	try {
		const { error } = await supabase
			.storage
			.from('avatars')
			.upload(storageObjectPath, fileBuffer, {
				contentType: file.mimetype,
				upsert: true,
			});

		if (error) {
			throw new AppError(ERROR_CODES.DATABASE_ERROR, `Gagal mengunggah foto profil ke storage: ${error.message}`, 500, error);
		}

		const { data: { publicUrl } } = supabase
			.storage
			.from('avatars')
			.getPublicUrl(storageObjectPath);

		// Simpan avatar_url ke database profile
		const updatedProfile = await ProfileRepository.upsertByUserId(userId, { avatar_url: publicUrl }, accessToken);

		return {
			avatar_url: publicUrl,
			profile: updatedProfile,
		};
	} finally {
		if (file.path) {
			try {
				fs.unlinkSync(file.path);
			} catch (_e) {
				// ignore
			}
		}
	}
};

module.exports = {
	getByUserId,
	upsertByUserId,
	getProfileScore,
	uploadAvatarByUserId,
};
