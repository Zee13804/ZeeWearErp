const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALL_PERMISSIONS = {
  pages: [
    { key: 'page:dashboard', label: 'Dashboard' },
    { key: 'page:articles', label: 'Articles' },
    { key: 'page:variants', label: 'Variants' },
    { key: 'page:fabric', label: 'Fabric' },
    { key: 'page:accessories', label: 'Accessories' },
    { key: 'page:production_orders', label: 'Production Orders' },
    { key: 'page:reports', label: 'Reports' },
    { key: 'page:settings', label: 'Settings' },
    { key: 'page:import', label: 'Import' },
  ],
  actions: [
    { key: 'action:create', label: 'Create Items' },
    { key: 'action:edit', label: 'Edit Items' },
    { key: 'action:delete', label: 'Delete Items' },
    { key: 'action:stock_in', label: 'Stock In' },
    { key: 'action:stock_out', label: 'Stock Out' },
    { key: 'action:export', label: 'Export Reports' },
    { key: 'action:import', label: 'Import Data' },
    { key: 'action:backup', label: 'Backup & Restore' },
  ],
};

const DEFAULT_PERMISSIONS = {
  store: {
    'page:dashboard': true,
    'page:articles': true,
    'page:variants': true,
    'page:fabric': true,
    'page:accessories': true,
    'page:production_orders': true,
    'page:reports': true,
    'page:settings': true,
    'page:import': true,
    'action:create': true,
    'action:edit': true,
    'action:delete': false,
    'action:stock_in': true,
    'action:stock_out': true,
    'action:export': true,
    'action:import': true,
    'action:backup': false,
  },
  viewer: {
    'page:dashboard': true,
    'page:articles': true,
    'page:variants': true,
    'page:fabric': true,
    'page:accessories': true,
    'page:production_orders': true,
    'page:reports': true,
    'page:settings': false,
    'page:import': false,
    'action:create': false,
    'action:edit': false,
    'action:delete': false,
    'action:stock_in': false,
    'action:stock_out': false,
    'action:export': true,
    'action:import': false,
    'action:backup': false,
  },
};

async function ensureDefaults(role) {
  const existing = await prisma.rolePermission.findMany({ where: { role } });
  const existingKeys = new Set(existing.map((p) => p.permission));
  const defaults = DEFAULT_PERMISSIONS[role];
  if (!defaults) return;

  const toCreate = [];
  for (const [key, enabled] of Object.entries(defaults)) {
    if (!existingKeys.has(key)) {
      toCreate.push({ role, permission: key, enabled });
    }
  }
  if (toCreate.length > 0) {
    await prisma.rolePermission.createMany({ data: toCreate });
  }
}

const getPermissions = async (req, res) => {
  try {
    await ensureDefaults('store');
    await ensureDefaults('viewer');

    const perms = await prisma.rolePermission.findMany({
      where: { role: { in: ['store', 'viewer'] } },
      orderBy: [{ role: 'asc' }, { permission: 'asc' }],
    });

    const grouped = { store: {}, viewer: {} };
    for (const p of perms) {
      grouped[p.role][p.permission] = p.enabled;
    }

    return res.json({
      permissions: grouped,
      schema: ALL_PERMISSIONS,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch permissions', details: err.message });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const { role, permissions } = req.body;

    if (!role || !['store', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be store or viewer' });
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Permissions object is required' });
    }

    for (const [key, enabled] of Object.entries(permissions)) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission: key } },
        update: { enabled: Boolean(enabled) },
        create: { role, permission: key, enabled: Boolean(enabled) },
      });
    }

    return res.json({ message: 'Permissions updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update permissions', details: err.message });
  }
};

const getMyPermissions = async (req, res) => {
  try {
    const role = req.user?.role;

    if (role === 'dev' || role === 'admin') {
      const allPerms = {};
      [...ALL_PERMISSIONS.pages, ...ALL_PERMISSIONS.actions].forEach((p) => {
        allPerms[p.key] = true;
      });
      return res.json({ permissions: allPerms, role });
    }

    await ensureDefaults(role);

    const perms = await prisma.rolePermission.findMany({ where: { role } });
    const permMap = {};
    for (const p of perms) {
      permMap[p.permission] = p.enabled;
    }

    return res.json({ permissions: permMap, role });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch permissions', details: err.message });
  }
};

module.exports = { getPermissions, updatePermissions, getMyPermissions, ALL_PERMISSIONS };
