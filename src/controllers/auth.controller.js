const ApiResponse = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const AuthService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
	const { email, password, profile } = req.body;
	const result = await AuthService.register({ email, password, profile });
	return ApiResponse.success(res, result, 'Registered', 201);
});

const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	const result = await AuthService.login({ email, password });
	return ApiResponse.success(res, result, 'Logged in');
});

const me = asyncHandler(async (req, res) => {
	return ApiResponse.success(res, { user: req.user }, 'OK');
});

const forgotPassword = asyncHandler(async (req, res) => {
	const { email } = req.body;
	const result = await AuthService.forgotPassword(email);
	return ApiResponse.success(res, result, 'If the email is registered, a password reset link has been sent.');
});

const changePassword = asyncHandler(async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const result = await AuthService.changePassword(req.user.id, req.user.email, currentPassword, newPassword, req.accessToken);
	return ApiResponse.success(res, result, 'Password changed successfully');
});

const deleteAccount = asyncHandler(async (req, res) => {
	const { password } = req.body;
	const result = await AuthService.deleteAccount(req.user.id, req.user.email, password);
	return ApiResponse.success(res, result, 'Account deleted successfully');
});

module.exports = {
	register,
	login,
	me,
	forgotPassword,
	changePassword,
	deleteAccount,
};
