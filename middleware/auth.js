const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing or malformed.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // TODO: look up active session in sessions collection using payload.sessionId.
    // TODO: load user document, check status + credit balance before allowing scraper access.

    req.user = {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles || []
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

module.exports = { authenticateJWT };
