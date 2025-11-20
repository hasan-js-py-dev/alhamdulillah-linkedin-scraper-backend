require('dotenv').config();
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Set it via environment variable before running this script.');
  process.exit(1);
}

const userId = process.argv[2];
const email = process.argv[3] || 'user@example.com';

if (!userId) {
  console.error('Usage: node mintToken.js <userId> [email] ["role1,role2"]');
  process.exit(1);
}

const rolesArg = process.argv[4];
const roles = rolesArg ? rolesArg.split(',').map((role) => role.trim()).filter(Boolean) : ['scraper-user'];

const payload = {
  userId,
  email,
  roles
};

const options = {
  expiresIn: process.env.JWT_EXPIRES_IN || '2h'
};

const token = jwt.sign(payload, process.env.JWT_SECRET, options);
console.log(token);
