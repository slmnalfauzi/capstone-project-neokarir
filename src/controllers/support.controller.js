const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/response');
const SupportService = require('../services/support.service');

const contactSupport = asyncHandler(async (req, res) => {
  const result = await SupportService.sendContactSupport(req.body);
  return ApiResponse.success(res, result, 'Pesan dukungan berhasil dikirim');
});

module.exports = {
  contactSupport,
};
