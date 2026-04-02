const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getAdvances, createAdvance, repayAdvance, deleteAdvance,
  getSalaries, createSalary, markSalaryPaid, deleteSalary,
  getLabourPayments, createLabourPayment, deleteLabourPayment,
} = require('../controllers/employeeController');

const adminAuth = [authenticate, authorize('admin')];

router.get('/', authenticate, getEmployees);
router.post('/', ...adminAuth, createEmployee);
router.put('/:id', ...adminAuth, updateEmployee);
router.delete('/:id', ...adminAuth, deleteEmployee);

router.get('/advances', authenticate, getAdvances);
router.post('/advances', ...adminAuth, createAdvance);
router.put('/advances/:id/repay', ...adminAuth, repayAdvance);
router.delete('/advances/:id', ...adminAuth, deleteAdvance);

router.get('/salaries', authenticate, getSalaries);
router.post('/salaries', ...adminAuth, createSalary);
router.put('/salaries/:id/paid', ...adminAuth, markSalaryPaid);
router.delete('/salaries/:id', ...adminAuth, deleteSalary);

router.get('/labour', authenticate, getLabourPayments);
router.post('/labour', ...adminAuth, createLabourPayment);
router.delete('/labour/:id', ...adminAuth, deleteLabourPayment);

module.exports = router;
