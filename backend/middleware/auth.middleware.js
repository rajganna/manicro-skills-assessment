const jwt = require('jsonwebtoken');
const config = require('../config');
const UserModel = require('../models/user.model');
const { unauthorizedResponse, forbiddenResponse } = require('../utils/response');

const extractToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, credentials] = authorizationHeader.split(' ');
  if (!credentials) {
    // Backward compatibility for clients that still send raw token in Authorization header.
    return authorizationHeader.trim();
  }
  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }
  return credentials.trim();
};

const parseTokenPayload = (req, res) => {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    const { response, statusCode } = unauthorizedResponse('Missing or invalid authorization header');
    res.status(statusCode).json(response);
    return null;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET_KEY);
    if (!payload || !payload.id || (!payload.address && !payload.email)) {
      const { response, statusCode } = unauthorizedResponse('Token payload is invalid');
      res.status(statusCode).json(response);
      return null;
    }

    req.user = payload;
    req.user_id = payload.id;
    req.email = payload.email;
    req.address = payload.address || null;
    return payload;
  } catch (_error) {
    const { response, statusCode } = unauthorizedResponse('Invalid or expired token');
    res.status(statusCode).json(response);
    return null;
  }
};

function ensureWebToken(req, res, next) {
  const payload = parseTokenPayload(req, res);
  if (!payload) {
    return;
  }
  return next();
}

async function ensureWebTokenForAdmin(req, res, next) {
  const payload = parseTokenPayload(req, res);
  if (!payload) {
    return;
  }

  const isAdminFromToken = payload.role === 'cpadmin' || payload.is_admin === 1 || payload.is_admin === true;
  if (isAdminFromToken) {
    return next();
  }

  try {
    const users = await UserModel.checkBalanceFromStaking({ user_id: payload.id });
    if (users.length > 0 && users[0].is_admin === 1) {
      return next();
    }
  } catch (_error) {
    // Treat DB lookup failures as forbidden to avoid leaking internals.
  }

  const { response, statusCode } = forbiddenResponse('Admin access required');
  return res.status(statusCode).json(response);
}

module.exports = { ensureWebToken, ensureWebTokenForAdmin };
