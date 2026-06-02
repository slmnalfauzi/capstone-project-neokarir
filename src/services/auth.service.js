const { getSupabaseClient, getAdminSupabaseClient } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../constants/error');
const ProfileRepository = require('../repositories/profile.repository');

const bcrypt = require('bcryptjs');

const persistRegistrationProfile = async (userId, email, profile) => {
	const adminSupabase = getAdminSupabaseClient();
	const profilePayload = {
		full_name: profile?.full_name || profile?.name || null,
		email,
		profile_data: {
			...(profile || {}),
			email,
			registered_via: 'auth.register',
		},
	};

	if (adminSupabase) {
		const { error } = await adminSupabase.from('profiles').upsert({
			user_id: userId,
			...profilePayload,
		}, { onConflict: 'user_id' });
		if (error) {
			throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
		}
		return;
	}

	await ProfileRepository.upsertByUserId(userId, profilePayload);
};

const register = async ({ email, password, profile }) => {
	const supabase = getSupabaseClient();
	
	// Hash password before saving
	const salt = await bcrypt.genSalt(10);
	const password_hash = await bcrypt.hash(password, salt);
	
	// Pass the password_hash in the user metadata so the trigger can insert it
	const metadata = profile ? { ...profile, password_hash } : { password_hash };
	const adminSupabase = getAdminSupabaseClient();
	if (adminSupabase?.auth?.admin?.createUser) {
		const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: metadata,
		});

		if (!createError && createdUser?.user) {
			const loginResult = await supabase.auth.signInWithPassword({ email, password });
			if (!loginResult.error) {
				return {
					user: loginResult.data.user,
					session: loginResult.data.session,
				};
			}
		}

		if (createError) {
			const message = createError.message || '';
			if (message.toLowerCase().includes('already registered') || createError.code === 'email_exists') {
				throw new AppError(ERROR_CODES.DUPLICATE_ENTRY, 'User already registered', 409);
			}
			// Fall back to the standard sign-up flow when admin access is unavailable.
		}
	}

	let { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: { data: metadata },
	});

	if (error) {
		const message = error.message || '';
		if (message.toLowerCase().includes('already registered') || error.code === 'email_exists') {
			const loginResult = await supabase.auth.signInWithPassword({ email, password });
			if (loginResult.error) {
				throw new AppError(ERROR_CODES.DUPLICATE_ENTRY, 'User already registered', 409);
			}

			await persistRegistrationProfile(loginResult.data.user.id, email, profile);

			return {
				user: loginResult.data.user,
				session: loginResult.data.session,
			};
		}
		throw new AppError(ERROR_CODES.INVALID_INPUT, message, 400);
	}

	let session = data.session;
	let user = data.user;

	if ((!session || !session.access_token) && user) {
		const loginResult = await supabase.auth.signInWithPassword({ email, password });
		if (!loginResult.error) {
			session = loginResult.data.session;
			user = loginResult.data.user;
		}
	}

	if (user) {
		// Registration only needs to create the auth user here.
		// Profile persistence happens later in onboarding when a valid session exists.
	}

	return {
		user,
		session,
	};
};

const login = async ({ email, password }) => {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, error.message, 401);
	}

	return {
		user: data.user,
		session: data.session,
	};
};

const changePassword = async (userId, email, currentPassword, newPassword, accessToken) => {
	const { createClient } = require('@supabase/supabase-js');
	const env = require('../config/env');
	
	// Create a fresh client instance so we don't pollute the global singleton
	const tempClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		}
	});

	// Verify current password first, this also populates tempClient with an active session
	const { error: signInError } = await tempClient.auth.signInWithPassword({
		email,
		password: currentPassword
	});

	if (signInError) {
		throw new AppError(ERROR_CODES.INVALID_INPUT, 'Password saat ini salah', 400);
	}

	const adminSupabase = getAdminSupabaseClient();
	if (!adminSupabase) {
		throw new AppError(ERROR_CODES.SERVER_ERROR || 'SERVER_ERROR', 'Tidak dapat mengubah kata sandi: Admin client tidak dikonfigurasi.', 500);
	}

	// Update password using the admin client for guaranteed execution
	const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
		password: newPassword
	});

	if (updateError) {
		throw new AppError(ERROR_CODES.INVALID_INPUT, updateError.message, 400);
	}

	return {
		success: true,
	};
};

const forgotPassword = async (email) => {
	const supabase = getSupabaseClient();
	const env = require('../config/env');
	const redirectBase = (env.FRONTEND_URL || env.CORS_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');
	const redirectTo = `${redirectBase}/reset-password`;

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo,
	});

	if (error) {
		throw new AppError(ERROR_CODES.INVALID_INPUT, error.message, 400);
	}

	return {
		success: true,
	};
};

const deleteAccount = async (userId, email, password) => {
	const { createClient } = require('@supabase/supabase-js');
	const env = require('../config/env');
	const { getPrismaClient } = require('../config/prisma');
	
	const tempClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		}
	});

	// Verify password first
	const { error: signInError } = await tempClient.auth.signInWithPassword({
		email,
		password
	});

	if (signInError) {
		throw new AppError(ERROR_CODES.INVALID_INPUT, 'Kata sandi salah', 400);
	}

	const adminSupabase = getAdminSupabaseClient();
	if (!adminSupabase) {
		throw new AppError(ERROR_CODES.SERVER_ERROR || 'SERVER_ERROR', 'Tidak dapat menghapus akun: Admin client tidak dikonfigurasi.', 500);
	}
	
	const prisma = getPrismaClient();

	// Delete from Prisma first to satisfy foreign key constraints (cascades to profiles, etc.)
	try {
		await prisma.user.delete({ where: { id: userId } });
	} catch (dbErr) {
		// If user doesn't exist in Prisma or another error occurs, log it and proceed to delete from Supabase
		console.warn(`Prisma user deletion failed for ${userId}:`, dbErr.message);
	}

	// Delete from Supabase Auth
	const { error } = await adminSupabase.auth.admin.deleteUser(userId);
	if (error) {
		throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500);
	}

	return { success: true };
};

module.exports = {
	register,
	login,
	forgotPassword,
	changePassword,
	deleteAccount,
};
