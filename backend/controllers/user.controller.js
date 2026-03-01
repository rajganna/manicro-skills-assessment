const UserModel = require('../models/user.model');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { promisePool } = require('../utils/database');

exports.getMe = async (req, res, next) => {
  try {
    const users = req.address
      ? await UserModel.getUsersAddress({ address: req.address })
      : await UserModel.checkBalanceFromStaking({ user_id: req.user_id });

    if (users.length === 0) {
      const { response, statusCode } = notFoundResponse('User not found');
      return res.status(statusCode).json(response);
    }

    const user = users[0];
    let email = req.email || null;
    if (!email) {
      try {
        const [authUsers] = await promisePool.query(
          'SELECT email FROM auth_users WHERE user_id = ? LIMIT 1',
          [user.id]
        );
        if (authUsers.length > 0) {
          email = authUsers[0].email;
        }
      } catch (_error) {
        // auth_users table may not exist yet for wallet-only deployments
      }
    }

    const { response, statusCode } = successResponse({
      id: user.id,
      address: user.address,
      email,
      token_balance: user.token_balance,
      MBUSD_balance: user.MBUSD_balance,
      referral_code: user.referral_code,
    });

    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Get user error:', error);
    next(error);
  }
};

exports.updateMe = async (_req, res) => {
  const { response, statusCode } = errorResponse('Not implemented', 501);
  return res.status(statusCode).json(response);
};
