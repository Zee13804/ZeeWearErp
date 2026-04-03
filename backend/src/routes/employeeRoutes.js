const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getAdvances, createAdvance, repayAdvance, deleteAdvance,
  getSalaries, createSalary, markSalaryPaid, deleteSalary,
  getLabourPayments, createLabourPayment, deleteLabourPayment,
} = require('../controllers/employeeController');

const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/', ...accAuth, getEmployees);
router.post('/', ...adminAuth, createEmployee);
router.put('/:id', ...adminAuth, updateEmployee);
router.delete('/:id', ...adminAuth, deleteEmployee);

router.get('/advances', ...accAuth, getAdvances);
router.post('/advances', ...accAuth, createAdvance);
router.put('/advances/:id/repay', ...accAuth, repayAdvance);
router.delete('/advances/:id', ...adminAuth, deleteAdvance);

router.get('/salaries', ...accAuth, getSalaries);
router.post('/salaries', ...accAuth, createSalary);
router.put('/salaries/:id/paid', ...accAuth, markSalaryPaid);
router.delete('/salaries/:id', ...adminAuth, deleteSalary);

router.get('/labour', ...accAuth, getLabourPayments);
router.post('/labour', ...accAuth, createLabourPayment);
router.delete('/labour/:id', ...adminAuth, deleteLabourPayment);

module.exports = router;
