const { getSupabaseClient } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../constants/error');

const TABLE = 'market';

const list = async ({ limit = 10, offset = 0 } = {}) => {
  const supabase = getSupabaseClient();

  const { data, error, count } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);

  if (error) {
    if (error.code === 'PGRST103') {
      return {
        items: [],
        total: 0,
      };
    }
    throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  }

  return {
    items: data || [],
    total: typeof count === 'number' ? count : (data ? data.length : 0),
  };
};

const getHistoricalTrends = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('category, trend_date, job_count, market_data')
    .order('trend_date', { ascending: true });

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  }

  const isForecast = (marketData) => {
    if (!marketData) return false;
    if (typeof marketData === 'object') {
      return marketData.is_forecast === true;
    }
    if (typeof marketData === 'string') {
      try {
        if (marketData.includes('is_forecast')) {
          const parsed = JSON.parse(marketData);
          const finalObj = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          return finalObj.is_forecast === true;
        }
      } catch (_e) {
        return false;
      }
    }
    return false;
  };

  return (data || []).filter(row => !isForecast(row.market_data));
};

const upsertForecastTrend = async (record) => {
  const supabase = getSupabaseClient();
  
  // Find if an entry already exists for same category and trend_date
  const { data: existing, error: fetchError } = await supabase
    .from(TABLE)
    .select('id')
    .eq('category', record.category)
    .eq('trend_date', record.trend_date)
    .limit(1);

  if (fetchError) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, fetchError.message, 500, fetchError);
  }

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({
        job_count: record.job_count,
        growth_rate: record.growth_rate,
        avg_salary: record.avg_salary,
        market_data: record.market_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing[0].id);

    if (updateError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, updateError.message, 500, updateError);
    }
  } else {
    const { error: insertError } = await supabase
      .from(TABLE)
      .insert({
        title: record.title,
        category: record.category,
        trend_date: record.trend_date,
        job_count: record.job_count,
        growth_rate: record.growth_rate,
        avg_salary: record.avg_salary,
        market_data: record.market_data
      });

    if (insertError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, insertError.message, 500, insertError);
    }
  }
};

module.exports = {
  list,
  getHistoricalTrends,
  upsertForecastTrend,
};