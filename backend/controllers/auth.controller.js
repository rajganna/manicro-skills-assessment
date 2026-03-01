const jwt = require('jsonwebtoken');
const ethUtil = require('ethereumjs-util');
const crypto = require('crypto');
const fetch = require('node-fetch');
const config = require('../config');
const UserModel = require('../models/user.model');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { promisePool } = require('../utils/database');
const { ensureBaseTables } = require('../utils/schema');

const LOGIN_MESSAGE = 'Login Quant Fund';
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = 'sha512';
const OIDC_STATE_TTL_MS = 10 * 60 * 1000;
const oidcStateStore = new Map();

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const makeReferralCode = () =>
  `REF${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const makeSyntheticAddress = (email) => `email:${email}`;

const hashPassword = (password, saltHex) => {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString('hex');
};

const createPasswordHash = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return { salt, hash };
};

const decodeJwtPayload = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length < 2) {
    return null;
  }
  const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payloadJson);
};

const getGoogleConfigError = () => {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleRedirectUri) {
    return 'Google OIDC is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.';
  }
  return null;
};

const isDatabaseUnavailableError = (error) =>
  error &&
  ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(
    error.code
  );

const issueToken = (user, extra = {}) =>
  jwt.sign(
    {
      id: user.id,
      address: user.address,
      email: extra.email,
      is_admin: user.is_admin === 1 ? 1 : 0,
      role: user.is_admin === 1 ? 'cpadmin' : 'user',
    },
    config.JWT_SECRET_KEY,
    { expiresIn: config.SESSION_EXPIRES_IN }
  );

const createGoogleState = () => {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  oidcStateStore.set(state, { nonce, createdAt: Date.now() });
  return { state, nonce };
};

const consumeGoogleState = (state) => {
  const record = oidcStateStore.get(state);
  oidcStateStore.delete(state);
  if (!record) {
    return null;
  }
  if (Date.now() - record.createdAt > OIDC_STATE_TTL_MS) {
    return null;
  }
  return record;
};

const findAuthUserByEmail = async (email) => {
  const [rows] = await promisePool.query(
    `SELECT au.user_id, au.email, au.first_name, au.last_name, au.password_hash, au.password_salt,
            u.address, u.referral_code, u.is_admin
     FROM auth_users au
     INNER JOIN users u ON u.id = au.user_id
     WHERE au.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

const createAuthUserForEmail = async ({ email, firstName, lastName }) => {
  const syntheticAddress = makeSyntheticAddress(email);
  const existingUsers = await UserModel.getUsersDetailsAddress({ address: syntheticAddress });

  let user;
  if (existingUsers.length === 0) {
    const referralCode = makeReferralCode();
    const saved = await UserModel.saveUserAddressDetails({
      address: syntheticAddress,
      referral_code: referralCode,
    });
    user = {
      id: saved.insertId,
      address: syntheticAddress,
      referral_code: referralCode,
      is_admin: 0,
    };
  } else {
    user = existingUsers[0];
  }

  const { salt, hash } = createPasswordHash(crypto.randomBytes(24).toString('hex'));
  await promisePool.query(
    `INSERT INTO auth_users (user_id, email, first_name, last_name, password_hash, password_salt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, email, firstName, lastName, hash, salt]
  );

  return {
    user_id: user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    address: user.address,
    referral_code: user.referral_code,
    is_admin: user.is_admin,
  };
};

const verifyWalletAddress = async (publicAddress, signature, message = LOGIN_MESSAGE) => {
  try {
    const msgBuffer = Buffer.from(message, 'utf8');
    const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
    const signatureBuffer = ethUtil.toBuffer(signature);
    const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
    const publicKey = ethUtil.ecrecover(
      msgHash,
      signatureParams.v,
      signatureParams.r,
      signatureParams.s
    );
    const addressBuffer = ethUtil.publicToAddress(publicKey);
    const address = ethUtil.bufferToHex(addressBuffer);
    return address.toLowerCase() === publicAddress.toLowerCase();
  } catch (error) {
    logger.error('Wallet verification error:', error);
    return false;
  }
};

exports.loginWithSignature = async (req, res, next) => {
  try {
    const { address, signature, referral_address } = req.body;
    
    if (!address || !signature) {
      const { response, statusCode } = validationErrorResponse('Address and signature are required');
      return res.status(statusCode).json(response);
    }

    // Check if address is blocked
    if (config.blockedAddresses.includes(address.toLowerCase())) {
      const { response, statusCode } = errorResponse('This address is blocked', 403);
      return res.status(statusCode).json(response);
    }

    const isValid = await verifyWalletAddress(address, signature);
    if (!isValid) {
      const { response, statusCode } = errorResponse('Wallet signature verification failed', 401);
      return res.status(statusCode).json(response);
    }

    let users = await UserModel.getUsersDetailsAddress({ address });
    
    if (users.length === 0) {
      let referralId = null;
      if (referral_address) {
        const refUsers = await UserModel.getUserDetailsByAddress(referral_address);
        if (refUsers.length === 0) {
          const { response, statusCode } = validationErrorResponse('Invalid referral code');
          return res.status(statusCode).json(response);
        }
        referralId = refUsers[0].id;
      }
      
      const referralCode = 'REF' + Math.random().toString(36).substr(2, 5).toUpperCase();
      const saved = await UserModel.saveUserAddressDetails({ 
        address, 
        referral_id: referralId, 
        referral_code: referralCode 
      });
      users = [{ id: saved.insertId, address, referral_code: referralCode, is_admin: 0 }];
    }

    const user = users[0];
    const token = issueToken(user);

    const { response, statusCode } = successResponse({
      id: user.id,
      address: user.address,
      referral_code: user.referral_code,
      authToken: token,
      is_admin: user.is_admin,
    }, 'Login successful');

    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

exports.googleAuthUrl = async (_req, res) => {
  const configError = getGoogleConfigError();
  if (configError) {
    const { response, statusCode } = errorResponse(configError, 500);
    return res.status(statusCode).json(response);
  }

  const { state, nonce } = createGoogleState();
  const authUrl = new URL(config.googleAuthorizeUrl);
  authUrl.searchParams.set('client_id', config.googleClientId);
  authUrl.searchParams.set('redirect_uri', config.googleRedirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  const { response, statusCode } = successResponse(
    { url: authUrl.toString() },
    'Google OIDC URL generated'
  );
  return res.status(statusCode).json(response);
};

exports.googleAuth = async (req, res, next) => {
  try {
    const configError = getGoogleConfigError();
    if (configError) {
      const { response, statusCode } = errorResponse(configError, 500);
      return res.status(statusCode).json(response);
    }

    const { code, state } = req.body;
    if (!code || !state) {
      const { response, statusCode } = validationErrorResponse('Google auth code and state are required');
      return res.status(statusCode).json(response);
    }

    const stateRecord = consumeGoogleState(state);
    if (!stateRecord) {
      const { response, statusCode } = errorResponse('Invalid or expired Google auth state', 401);
      return res.status(statusCode).json(response);
    }

    const tokenResult = await fetch(config.googleTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResult.ok) {
      const tokenErrorText = await tokenResult.text();
      const { response, statusCode } = errorResponse(`Google token exchange failed: ${tokenErrorText}`, 401);
      return res.status(statusCode).json(response);
    }

    const tokenData = await tokenResult.json();
    const idTokenPayload = decodeJwtPayload(tokenData.id_token);
    if (!idTokenPayload) {
      const { response, statusCode } = errorResponse('Invalid Google id_token', 401);
      return res.status(statusCode).json(response);
    }

    const expectedIssuers = ['https://accounts.google.com', 'accounts.google.com'];
    if (!expectedIssuers.includes(idTokenPayload.iss)) {
      const { response, statusCode } = errorResponse('Invalid Google issuer', 401);
      return res.status(statusCode).json(response);
    }
    if (idTokenPayload.aud !== config.googleClientId) {
      const { response, statusCode } = errorResponse('Google audience mismatch', 401);
      return res.status(statusCode).json(response);
    }
    if (!idTokenPayload.exp || Number(idTokenPayload.exp) * 1000 <= Date.now()) {
      const { response, statusCode } = errorResponse('Google id_token expired', 401);
      return res.status(statusCode).json(response);
    }
    if (idTokenPayload.nonce && idTokenPayload.nonce !== stateRecord.nonce) {
      const { response, statusCode } = errorResponse('Google nonce mismatch', 401);
      return res.status(statusCode).json(response);
    }

    let profile = {};
    if (tokenData.access_token) {
      const profileResult = await fetch(config.googleUserInfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileResult.ok) {
        profile = await profileResult.json();
      }
    }

    const normalizedEmail = normalizeEmail(profile.email || idTokenPayload.email);
    if (!normalizedEmail) {
      const { response, statusCode } = errorResponse('Google account email is required', 400);
      return res.status(statusCode).json(response);
    }

    const firstName = profile.given_name || idTokenPayload.given_name || 'Google';
    const lastName = profile.family_name || idTokenPayload.family_name || 'User';

    await ensureBaseTables();
    let authUser = await findAuthUserByEmail(normalizedEmail);
    if (!authUser) {
      authUser = await createAuthUserForEmail({
        email: normalizedEmail,
        firstName,
        lastName,
      });
    }

    const user = {
      id: authUser.user_id,
      address: authUser.address,
      referral_code: authUser.referral_code,
      is_admin: authUser.is_admin,
    };

    const token = issueToken(user, { email: authUser.email });
    const { response, statusCode } = successResponse(
      {
        id: user.id,
        address: user.address,
        email: authUser.email,
        first_name: authUser.first_name,
        last_name: authUser.last_name,
        referral_code: user.referral_code,
        authToken: token,
        is_admin: user.is_admin,
      },
      'Google login successful'
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const { response, statusCode } = errorResponse(
        'Database is unavailable. Check DB host/port and MySQL service.',
        503
      );
      return res.status(statusCode).json(response);
    }
    logger.error('Google auth error:', error);
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!firstName || !lastName || !normalizedEmail || !password) {
      const { response, statusCode } = validationErrorResponse(
        'First name, last name, email and password are required'
      );
      return res.status(statusCode).json(response);
    }

    if (password.length < 8) {
      const { response, statusCode } = validationErrorResponse(
        'Password must be at least 8 characters long'
      );
      return res.status(statusCode).json(response);
    }

    await ensureBaseTables();

    const [existingAuthUsers] = await promisePool.query(
      'SELECT id FROM auth_users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingAuthUsers.length > 0) {
      const { response, statusCode } = errorResponse('Email is already registered', 409);
      return res.status(statusCode).json(response);
    }

    const authUser = await createAuthUserForEmail({
      email: normalizedEmail,
      firstName,
      lastName,
    });
    const { salt, hash } = createPasswordHash(password);
    await promisePool.query(
      'UPDATE auth_users SET password_hash = ?, password_salt = ? WHERE user_id = ?',
      [hash, salt, authUser.user_id]
    );

    const user = {
      id: authUser.user_id,
      address: authUser.address,
      referral_code: authUser.referral_code,
      is_admin: authUser.is_admin,
    };

    const token = issueToken(user, { email: normalizedEmail });
    const { response, statusCode } = successResponse(
      {
        id: user.id,
        address: user.address,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        referral_code: user.referral_code,
        authToken: token,
        is_admin: user.is_admin,
      },
      'Registration successful'
    );

    return res.status(statusCode).json(response);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const { response, statusCode } = errorResponse(
        'Database is unavailable. Check DB host/port and MySQL service.',
        503
      );
      return res.status(statusCode).json(response);
    }
    logger.error('Register error:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      const { response, statusCode } = validationErrorResponse('Email and password are required');
      return res.status(statusCode).json(response);
    }

    await ensureBaseTables();

    const authUser = await findAuthUserByEmail(normalizedEmail);
    if (!authUser) {
      const { response, statusCode } = errorResponse('Invalid email or password', 401);
      return res.status(statusCode).json(response);
    }

    const candidateHash = hashPassword(password, authUser.password_salt);
    if (candidateHash !== authUser.password_hash) {
      const { response, statusCode } = errorResponse('Invalid email or password', 401);
      return res.status(statusCode).json(response);
    }

    const user = {
      id: authUser.user_id,
      address: authUser.address,
      referral_code: authUser.referral_code,
      is_admin: authUser.is_admin,
    };

    const token = issueToken(user, { email: authUser.email });
    const { response, statusCode } = successResponse(
      {
        id: user.id,
        address: user.address,
        email: authUser.email,
        first_name: authUser.first_name,
        last_name: authUser.last_name,
        referral_code: user.referral_code,
        authToken: token,
        is_admin: user.is_admin,
      },
      'Login successful'
    );

    return res.status(statusCode).json(response);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const { response, statusCode } = errorResponse(
        'Database is unavailable. Check DB host/port and MySQL service.',
        503
      );
      return res.status(statusCode).json(response);
    }
    logger.error('Email login error:', error);
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const { response, statusCode } = successResponse({
      id: req.user_id,
      address: req.address,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (_req, res) => {
  const { response, statusCode } = errorResponse('Not implemented', 501);
  return res.status(statusCode).json(response);
};

exports.logout = async (_req, res) => {
  const { response, statusCode } = successResponse(null, 'Logout successful');
  return res.status(statusCode).json(response);
};
