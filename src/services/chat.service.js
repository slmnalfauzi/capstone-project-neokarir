const ChatRepository = require('../repositories/chat.repository');
const { callAI1 } = require('../utils/aiClient');

const listByUserId = async (userId, accessToken) => {
	return ChatRepository.listByUserId(userId, accessToken);
};

const create = async (userId, payload, accessToken) => {
	return ChatRepository.create(userId, payload, accessToken);
};

const sendMessage = async (userId, chatId, message, accessToken) => {
	const chat = await ChatRepository.getById(chatId, accessToken);
	if (!chat) {
		const err = new Error('Chat session not found');
		err.statusCode = 404;
		throw err;
	}

	const aiResult = await callAI1('/api/v1/chat/', { user_id: userId, message });
	const botResponse = aiResult.data?.bot_response || 'Maaf, saya sedang tidak bisa membalas pesan saat ini.';

	const currentMessages = Array.isArray(chat.messages) ? chat.messages : [];
	const userMsg = { sender: 'user', text: message, timestamp: new Date().toISOString() };
	const botMsg = { sender: 'bot', text: botResponse, timestamp: new Date().toISOString() };
	const updatedMessages = [...currentMessages, userMsg, botMsg];

	const updatedChat = await ChatRepository.updateMessages(chatId, updatedMessages, aiResult.data || {}, accessToken);
	return updatedChat;
};

const updateTitle = async (userId, chatId, title, accessToken) => {
	const chat = await ChatRepository.getById(chatId, accessToken);
	if (!chat) {
		const err = new Error('Chat session not found');
		err.statusCode = 404;
		throw err;
	}
	if (chat.user_id !== userId) {
		const err = new Error('Forbidden');
		err.statusCode = 403;
		throw err;
	}
	return ChatRepository.updateTitle(chatId, userId, title, accessToken);
};

const deleteChat = async (userId, chatId, accessToken) => {
	const chat = await ChatRepository.getById(chatId, accessToken);
	if (!chat) {
		const err = new Error('Chat session not found');
		err.statusCode = 404;
		throw err;
	}
	if (chat.user_id !== userId) {
		const err = new Error('Forbidden');
		err.statusCode = 403;
		throw err;
	}
	return ChatRepository.deleteChat(chatId, userId, accessToken);
};

module.exports = {
	listByUserId,
	create,
	sendMessage,
	updateTitle,
	deleteChat,
};
