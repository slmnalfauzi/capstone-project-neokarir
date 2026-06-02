const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const { connectPrisma } = require('./prisma');

let supabaseClient = null;
let adminSupabaseClient = null;

const createSupabaseClient = (accessToken) => {
  const clientOptions = {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  };

  if (accessToken) {
    clientOptions.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY, clientOptions);
};

const createAdminSupabaseClient = () => {
  const adminKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || null;
  if (!adminKey) {
    return null;
  }

  return createClient(env.SUPABASE_URL, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const getSupabaseClient = (accessToken = null) => {
  if (accessToken) {
    return createSupabaseClient(accessToken);
  }

  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
      throw new Error(
        'Supabase URL and key are required (set SUPABASE_URL and one of SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY)'
      );
    }

    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
};

const getAdminSupabaseClient = () => {
  if (!adminSupabaseClient) {
    adminSupabaseClient = createAdminSupabaseClient();
  }

  return adminSupabaseClient;
};

const connectDatabase = async () => {
  try {
    const supabase = getSupabaseClient();
    // Optional lightweight healthcheck against a table if provided.
    // Avoid hard-failing when schema isn't ready yet.
    const healthcheckTable = process.env.DB_HEALTHCHECK_TABLE;
    if (healthcheckTable) {
      const { error } = await supabase.from(healthcheckTable).select('*').limit(1);
      if (error) {
        throw error;
      }
    }

    console.log('✓ Supabase client initialized');

	try {
		await connectPrisma();
	} catch (error) {
		console.warn('Prisma client could not be initialized:', error.message);
	}

    return supabase;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
};

module.exports = {
  getSupabaseClient,
  getAdminSupabaseClient,
  connectDatabase,
};
