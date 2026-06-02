const { getSupabaseClient } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../constants/error');

const TABLE = 'chats';

const listByUserId = async (userId, accessToken) => {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  return data || [];
};

const create = async (userId, payload, accessToken) => {
  const supabase = getSupabaseClient(accessToken);
  const record = {
    user_id: userId,
    title: payload && payload.title ? payload.title : 'New Chat',
    messages: [],
    chat_data: {},
  };
  const { data, error } = await supabase.from(TABLE).insert(record).select('*').maybeSingle();
  if (error) throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  return data;
};

const isUuid = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
};

const getById = async (id, accessToken) => {
  console.log('getById called with:', { id, isUuid: isUuid(id) });
  if (!isUuid(id)) return null;
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  console.log('getById result:', { data, error });
  if (error) throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  return data;
};

const updateMessages = async (id, messages, chatData = {}, accessToken) => {
  if (!isUuid(id)) return null;
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ 
      messages, 
      chat_data: chatData,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  return data;
};

const updateTitle = async (id, userId, title, accessToken) => {
  if (!isUuid(id)) return null;
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ 
      title, 
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  return data;
};

const deleteChat = async (id, userId, accessToken) => {
  if (!isUuid(id)) return false;
  const supabase = getSupabaseClient(accessToken);
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new AppError(ERROR_CODES.DATABASE_ERROR, error.message, 500, error);
  return true;
};

module.exports = {
  listByUserId,
  create,
  getById,
  updateMessages,
  updateTitle,
  deleteChat,
};