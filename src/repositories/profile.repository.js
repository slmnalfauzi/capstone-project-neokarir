const { getSupabaseClient } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../constants/error');

const TABLE = 'profiles';

const PROFILE_FIELDS = new Set([
	'full_name',
	'headline',
	'bio',
	'summary',
	'current_role',
	'target_role',
	'target_domain',
	'years_experience',
	'location',
	'phone',
	'email',
	'gender',
	'website_url',
	'linkedin_url',
	'github_url',
	'portfolio_url',
	'avatar_url',
	'education_level',
	'employment_status',
	'work_mode',
	'availability',
	'resume_url',
	'skills_summary',
	'profile_data',
]);

const splitProfilePayload = (payload = {}) => {
	const record = {};
	const profileData = {};

	Object.entries(payload || {}).forEach(([key, value]) => {
		if (key === 'profile_data' && value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(profileData, value);
			return;
		}

		if (PROFILE_FIELDS.has(key)) {
			record[key] = value;
			return;
		}

		profileData[key] = value;
	});

	if (Object.keys(profileData).length > 0) {
		record.profile_data = {
			...(record.profile_data && typeof record.profile_data === 'object' ? record.profile_data : {}),
			...profileData,
		};
	}

	return record;
};

const getByUserId = async (userId, accessToken) => {
	const supabase = getSupabaseClient(accessToken);
	const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).maybeSingle();
	if (error) {
		throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
	}
	return data;
};

const upsertByUserId = async (userId, payload, accessToken) => {
	const supabase = getSupabaseClient(accessToken);
	
	// First, get existing profile to merge
	const { data: existing } = await supabase.from(TABLE).select('*').eq('user_id', userId).maybeSingle();
	
	const newRecord = splitProfilePayload(payload);
	
	// Deep merge profile_data: existing + new (new wins on conflicts)
	if (newRecord.profile_data || existing?.profile_data) {
		newRecord.profile_data = {
			...(existing?.profile_data || {}),
			...(newRecord.profile_data || {}),
		};
	}
	
	let email = newRecord.email || existing?.email;
	let full_name = newRecord.full_name || existing?.full_name;

	if (!existing) {
		const { data: userRecord } = await supabase.from('users').select('email, full_name').eq('id', userId).maybeSingle();
		if (userRecord) {
			if (!email) email = userRecord.email;
			if (!full_name) full_name = userRecord.full_name;
		}
	}
	
	const record = {
		user_id: userId,
		...newRecord,
		email,
		full_name,
	};
	
	const { data, error } = await supabase
		.from(TABLE)
		.upsert(record, { onConflict: 'user_id' })
		.select('*')
		.maybeSingle();

	if (error) {
		throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
	}
	return data;
};

module.exports = {
	getByUserId,
	upsertByUserId,
};
