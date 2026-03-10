const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const getAllUsers = async (req, res) => {
  try {
    const callerRole = req.user?.role;
    const where = {};
    if (callerRole !== 'dev') {
      where.role = { not: 'dev' };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true },
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
};

const createUser = async (req, res) => {
  try {
    const callerRole = req.user?.role;

    if (callerRole !== 'dev') {
      return res.status(403).json({ error: 'Only developer accounts can create users.' });
    }

    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const validRoles = ['admin', 'store', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, store, or viewer' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'store',
      },
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const callerRole = req.user?.role;
    const { id } = req.params;
    const { role, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existing.role === 'dev' && callerRole !== 'dev') {
      return res.status(403).json({ error: 'Cannot modify developer accounts.' });
    }

    if (callerRole !== 'dev') {
      return res.status(403).json({ error: 'Only developer accounts can modify users.' });
    }

    const validRoles = ['admin', 'store', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, store, or viewer' });
    }

    const data = {};
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Provide role or password to update' });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
    });

    return res.status(200).json({
      message: 'User updated successfully',
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user', details: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const callerRole = req.user?.role;

    if (callerRole !== 'dev') {
      return res.status(403).json({ error: 'Only developer accounts can delete users.' });
    }

    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existing.role === 'dev') {
      return res.status(403).json({ error: 'Cannot delete developer accounts.' });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
