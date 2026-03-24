const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is not set. Server cannot start without it in production.');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET not set. Using insecure fallback for development only.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-me';

const permissionCache = {};
const CACHE_TTL = 30000;

async function getRolePermissions(role) {
  const now = Date.now();
  if (permissionCache[role] && (now - permissionCache[role].ts) < CACHE_TTL) {
    return permissionCache[role].data;
  }
  const perms = await prisma.rolePermission.findMany({ where: { role } });
  const map = {};
  for (const p of perms) {
    map[p.permission] = p.enabled;
  }
  permissionCache[role] = { data: map, ts: now };
  return map;
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    if (req.user.role === 'dev' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
  };
};

const authenticateAndEnforceReadOnly = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (decoded.role === 'viewer' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      try {
        const perms = await getRolePermissions('viewer');
        const method = req.method;
        let actionKey = null;
        if (method === 'POST') {
          if (req.originalUrl.includes('/in')) actionKey = 'action:stock_in';
          else if (req.originalUrl.includes('/out')) actionKey = 'action:stock_out';
          else actionKey = 'action:create';
        } else if (method === 'PUT' || method === 'PATCH') {
          actionKey = 'action:edit';
        } else if (method === 'DELETE') {
          actionKey = 'action:delete';
        }
        if (actionKey && perms[actionKey] === true) {
          return next();
        }
      } catch {}
      return res.status(403).json({ error: 'Viewer accounts have read-only access.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requirePermission = (...permissionKeys) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    const role = req.user.role;
    if (role === 'dev' || role === 'admin') {
      return next();
    }

    try {
      const perms = await getRolePermissions(role);
      const hasAny = permissionKeys.some((key) => perms[key] === true);
      if (!hasAny) {
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
      }
      return next();
    } catch {
      return res.status(500).json({ error: 'Failed to check permissions.' });
    }
  };
};

module.exports = { authenticate, authorize, authenticateAndEnforceReadOnly, requirePermission, JWT_SECRET };
