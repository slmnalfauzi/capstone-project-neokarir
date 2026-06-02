const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const ChatService = require('../services/chat.service');

const listChats = asyncHandler(async (req, res) => {
	const chats = await ChatService.listByUserId(req.user.id, req.accessToken);
	return ApiResponse.success(res, { chats }, 'OK');
});

const createChat = asyncHandler(async (req, res) => {
	const chat = await ChatService.create(req.user.id, req.body, req.accessToken);
	return ApiResponse.success(res, { chat }, 'Created', 201);
});

const sendMessage = asyncHandler(async (req, res) => {
	const chat = await ChatService.sendMessage(req.user.id, req.params.chatId, req.body.message, req.accessToken);
	return ApiResponse.success(res, { chat }, 'Message sent and processed');
});

const updateChatTitle = asyncHandler(async (req, res) => {
	const { title } = req.body;
	if (!title) {
		const err = new Error('Title is required');
		err.statusCode = 400;
		throw err;
	}
	const chat = await ChatService.updateTitle(req.user.id, req.params.chatId, title, req.accessToken);
	return ApiResponse.success(res, { chat }, 'Chat title updated');
});

const deleteChat = asyncHandler(async (req, res) => {
	await ChatService.deleteChat(req.user.id, req.params.chatId, req.accessToken);
	return ApiResponse.success(res, null, 'Chat deleted successfully');
});

module.exports = {
	listChats,
	createChat,
	sendMessage,
	updateChatTitle,
	deleteChat,
};
