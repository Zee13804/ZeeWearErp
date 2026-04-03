const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPayments = async (req, res) => {
  try {
    const { source, accountId, from, to } = req.query;
    const where = {};
    if (source && source !== 'all') where.source = source;
    if (accountId) where.accountId = parseInt(accountId);
    if (from || to) {
      where.paymentDate = {};
      if (from) where.paymentDate.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = toDate;
      }
    }

    const payments = await prisma.courierPayment.findMany({
      where,
      include: { account: { select: { id: true, name: true } } },
      orderBy: { paymentDate: 'desc' },
    });

    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch courier payments', details: err.message });
  }
};

const getPayment = async (req, res) => {
  try {
    const payment = await prisma.courierPayment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { account: { select: { id: true, name: true } } },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    return res.json({ payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch payment', details: err.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const { source, shopifyOrderNos, grossAmount, serviceCharge, netReceived, paymentRef, accountId, paymentDate, notes } = req.body;

    if (!source || !['leopard', 'laam'].includes(source)) {
      return res.status(400).json({ error: 'source must be "leopard" or "laam"' });
    }
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const gross = parseFloat(grossAmount) || 0;
    const charge = parseFloat(serviceCharge) || 0;
    const net = netReceived !== undefined ? parseFloat(netReceived) : gross - charge;

    const payment = await prisma.courierPayment.create({
      data: {
        source,
        shopifyOrderNos: shopifyOrderNos ? shopifyOrderNos.trim() : null,
        grossAmount: gross,
        serviceCharge: charge,
        netReceived: net,
        paymentRef: paymentRef ? paymentRef.trim() : null,
        accountId: parseInt(accountId),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes || null,
      },
      include: { account: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ message: 'Courier payment recorded', payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create courier payment', details: err.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.courierPayment.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Payment not found' });

    const { source, shopifyOrderNos, grossAmount, serviceCharge, netReceived, paymentRef, accountId, paymentDate, notes } = req.body;

    const gross = grossAmount !== undefined ? parseFloat(grossAmount) : existing.grossAmount;
    const charge = serviceCharge !== undefined ? parseFloat(serviceCharge) : existing.serviceCharge;
    const net = netReceived !== undefined ? parseFloat(netReceived) : gross - charge;

    const payment = await prisma.courierPayment.update({
      where: { id: parseInt(id) },
      data: {
        ...(source && { source }),
        ...(shopifyOrderNos !== undefined && { shopifyOrderNos: shopifyOrderNos ? shopifyOrderNos.trim() : null }),
        grossAmount: gross,
        serviceCharge: charge,
        netReceived: net,
        ...(paymentRef !== undefined && { paymentRef: paymentRef ? paymentRef.trim() : null }),
        ...(accountId && { accountId: parseInt(accountId) }),
        ...(paymentDate && { paymentDate: new Date(paymentDate) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { account: { select: { id: true, name: true } } },
    });
    return res.json({ message: 'Payment updated', payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update payment', details: err.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.courierPayment.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Payment deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete payment', details: err.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.paymentDate = {};
      if (from) where.paymentDate.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = toDate;
      }
    }

    const [leopardData, laamData] = await Promise.all([
      prisma.courierPayment.aggregate({
        where: { ...where, source: 'leopard' },
        _sum: { grossAmount: true, serviceCharge: true, netReceived: true },
        _count: true,
      }),
      prisma.courierPayment.aggregate({
        where: { ...where, source: 'laam' },
        _sum: { grossAmount: true, netReceived: true },
        _count: true,
      }),
    ]);

    return res.json({
      summary: {
        leopard: {
          count: leopardData._count,
          totalGross: leopardData._sum.grossAmount || 0,
          totalServiceCharge: leopardData._sum.serviceCharge || 0,
          totalNetReceived: leopardData._sum.netReceived || 0,
        },
        laam: {
          count: laamData._count,
          totalGross: laamData._sum.grossAmount || 0,
          totalNetReceived: laamData._sum.netReceived || 0,
        },
        combined: {
          totalNetReceived: (leopardData._sum.netReceived || 0) + (laamData._sum.netReceived || 0),
          totalServiceCharge: leopardData._sum.serviceCharge || 0,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch summary', details: err.message });
  }
};

module.exports = { getPayments, getPayment, createPayment, updatePayment, deletePayment, getSummary };
