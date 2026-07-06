const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication token missing.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'cmpms_super_secret_change_me');
    req.user = payload; // { id, name, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated.' });
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
