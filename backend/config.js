require('dotenv').config();

module.exports = { 
  mysqlHost: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root12345',
  database: process.env.DB_NAME || 'quant_fund',
  mysqlPort: parseInt(process.env.DB_PORT || '3306', 10),
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'change-this-secret-key-in-production',
  SESSION_EXPIRES_IN: process.env.SESSION_EXPIRES_IN || '24h',
  imageUrl: process.env.IMAGE_URL || '',
  contractAddress: process.env.CONTRACT_ADDRESS || '0x98Ff86eD5B0dDd3C85115845A90A6066C25bedf9',
  clientDepositAddress: process.env.CLIENT_DEPOSIT_ADDRESS || '0xEfcd2e9ca6483147A25a106C654a6E557eb8f916',
  port: parseInt(process.env.PORT || '1357', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  blockedAddresses: (process.env.BLOCKED_ADDRESSES || '0x91db0dbd7ee9ea405852f65f044739c90cd076d5').split(',').filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:2468/google/redirect',
  googleAuthorizeUrl: process.env.GOOGLE_AUTHORIZE_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
  googleTokenUrl: process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
  googleUserInfoUrl: process.env.GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo',
};
