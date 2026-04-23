// server.js — bytesized_payroll_system API server
// Mirrors the localStorage DatabaseService schema in MySQL.
//
// Install deps:  npm install express mysql2 dotenv cors bcryptjs jsonwebtoken
// Run:           node server.js

require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2/promise');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ── MySQL connection pool ─────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
});

// ── Auth middleware ───────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, password, companyCode } = req.body;
  if (!firstName || !lastName || !email || !password || !companyCode) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) {
      return res.json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, company_code, role) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, hashed, companyCode, 'employee']
    );

    const newUser = { id: result.insertId, firstName, lastName, email, companyCode, role: 'employee' };
    const token   = jwt.sign(newUser, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ success: true, token, user: newUser });
  } finally {
    conn.release();
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, first_name AS firstName, last_name AS lastName, email, password_hash, company_code AS companyCode, role FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.json({ success: false, message: 'Invalid email or password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ success: false, message: 'Invalid email or password.' });

    delete user.password_hash;
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ success: true, token, user });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/departments?activeOnly=true
app.get('/api/departments', auth, async (req, res) => {
  const activeOnly = req.query.activeOnly !== 'false';
  const sql = activeOnly
    ? 'SELECT * FROM department WHERE active = 1 ORDER BY name'
    : 'SELECT * FROM department ORDER BY name';
  const [rows] = await pool.query(sql);
  res.json(rows);
});

// GET /api/departments/:id
app.get('/api/departments/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM department WHERE Department_id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Department not found.' });
  res.json(rows[0]);
});

// GET /api/departments/:id/headcount
app.get('/api/departments/:id/headcount', auth, async (req, res) => {
  const [[row]] = await pool.query(
    'SELECT COUNT(*) AS headcount FROM employees WHERE Department_id = ?',
    [req.params.id]
  );
  res.json({ headcount: row.headcount });
});

// POST /api/departments
app.post('/api/departments', auth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Department name is required.' });

  const [exists] = await pool.query(
    'SELECT Department_id FROM department WHERE LOWER(name) = LOWER(?) AND active = 1',
    [name.trim()]
  );
  if (exists.length) return res.json({ success: false, message: 'A department with this name already exists.' });

  const [result] = await pool.query(
    'INSERT INTO department (name, active) VALUES (?, 1)',
    [name.trim()]
  );
  const [newDept] = await pool.query('SELECT * FROM department WHERE Department_id = ?', [result.insertId]);
  res.status(201).json({ success: true, department: newDept[0] });
});

// PATCH /api/departments/:id/deactivate  (soft delete)
app.patch('/api/departments/:id/deactivate', auth, async (req, res) => {
  const [result] = await pool.query(
    'UPDATE department SET active = 0 WHERE Department_id = ?',
    [req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Department not found.' });
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/employees
app.get('/api/employees', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees ORDER BY last_name, first_name');
  res.json(rows);
});

// GET /api/employees/by-dept/:deptId
app.get('/api/employees/by-dept/:deptId', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM employees WHERE Department_id = ? ORDER BY last_name, first_name',
    [req.params.deptId]
  );
  res.json(rows);
});

// GET /api/employees/:id
app.get('/api/employees/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE Employee_id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Employee not found.' });
  res.json(rows[0]);
});

// POST /api/employees
app.post('/api/employees', auth, async (req, res) => {
  const { Department_id, first_name, last_name, middle_name, email, gender } = req.body;
  if (!first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ success: false, message: 'First and last name are required.' });
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'A valid email is required.' });
  }

  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.query(
      'SELECT Employee_id FROM employees WHERE LOWER(email) = LOWER(?)',
      [email.trim()]
    );
    if (exists.length) return res.json({ success: false, message: 'An employee with this email already exists.' });

    // Generate emp_no after insert (uses the new ID)
    const [result] = await conn.query(
      'INSERT INTO employees (Department_id, emp_no, last_name, first_name, middle_name, gender, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Department_id, 'TEMP', last_name.trim(), first_name.trim(), middle_name?.trim() || null, gender || 'Prefer not to say', email.trim()]
    );
    const empNo = `EMP-${String(result.insertId).padStart(5, '0')}`;
    await conn.query('UPDATE employees SET emp_no = ? WHERE Employee_id = ?', [empNo, result.insertId]);

    const [newEmp] = await conn.query('SELECT * FROM employees WHERE Employee_id = ?', [result.insertId]);
    res.status(201).json({ success: true, employee: newEmp[0] });
  } finally {
    conn.release();
  }
});

// DELETE /api/employees/:id
app.delete('/api/employees/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // Cascade: delete salary records
    await conn.query('DELETE FROM employee_salary WHERE Employee_id = ?', [req.params.id]);
    const [result] = await conn.query('DELETE FROM employees WHERE Employee_id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Employee not found.' });
    res.json({ success: true });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE SALARY ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/salaries
app.get('/api/salaries', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM employee_salary ORDER BY effective_date DESC'
  );
  res.json(rows);
});

// GET /api/salaries/employee/:empId
app.get('/api/salaries/employee/:empId', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM employee_salary WHERE Employee_id = ? ORDER BY effective_date DESC',
    [req.params.empId]
  );
  res.json(rows);
});

// GET /api/salaries/employee/:empId/current
app.get('/api/salaries/employee/:empId/current', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    'SELECT * FROM employee_salary WHERE Employee_id = ? AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1',
    [req.params.empId, today]
  );
  if (!rows.length) return res.status(404).json({ message: 'No current salary found.' });
  res.json(rows[0]);
});

// POST /api/salaries
app.post('/api/salaries', auth, async (req, res) => {
  const { Employee_id, monthly_salary, effective_date } = req.body;
  if (!Employee_id) return res.status(400).json({ success: false, message: 'Employee is required.' });
  if (!monthly_salary || Number(monthly_salary) <= 0) {
    return res.status(400).json({ success: false, message: 'Monthly salary must be greater than 0.' });
  }
  if (!effective_date) return res.status(400).json({ success: false, message: 'Effective date is required.' });

  const [exists] = await pool.query(
    'SELECT Salary_id FROM employee_salary WHERE Employee_id = ? AND effective_date = ?',
    [Employee_id, effective_date]
  );
  if (exists.length) {
    return res.json({ success: false, message: 'A salary record for this employee on this date already exists.' });
  }

  const [result] = await pool.query(
    'INSERT INTO employee_salary (Employee_id, monthly_salary, effective_date) VALUES (?, ?, ?)',
    [Employee_id, monthly_salary, effective_date]
  );
  const [newSalary] = await pool.query('SELECT * FROM employee_salary WHERE Salary_id = ?', [result.insertId]);
  res.status(201).json({ success: true, salary: newSalary[0] });
});

// ═══════════════════════════════════════════════════════════════
// PAYROLL ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/payrolls
app.get('/api/payrolls', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM payroll ORDER BY payroll_date DESC');
  res.json(rows);
});

// GET /api/payrolls/:id
app.get('/api/payrolls/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM payroll WHERE Payroll_id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Payroll not found.' });
  res.json(rows[0]);
});

// POST /api/payrolls
app.post('/api/payrolls', auth, async (req, res) => {
  const { period_start, period_end, payroll_date } = req.body;
  if (!period_start || !period_end || !payroll_date) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  if (period_end < period_start) {
    return res.status(400).json({ success: false, message: 'Period end must be on or after period start.' });
  }

  const [result] = await pool.query(
    'INSERT INTO payroll (period_start, period_end, payroll_date) VALUES (?, ?, ?)',
    [period_start, period_end, payroll_date]
  );
  const [newPayroll] = await pool.query('SELECT * FROM payroll WHERE Payroll_id = ?', [result.insertId]);
  res.status(201).json({ success: true, payroll: newPayroll[0] });
});

// DELETE /api/payrolls/:id
app.delete('/api/payrolls/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // Cascade: delete payslips
    await conn.query('DELETE FROM payslip WHERE Payroll_id = ?', [req.params.id]);
    const [result] = await conn.query('DELETE FROM payroll WHERE Payroll_id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Payroll not found.' });
    res.json({ success: true });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// PAYSLIP ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/payslips
app.get('/api/payslips', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM payslip ORDER BY Payslip_id DESC');
  res.json(rows);
});

// GET /api/payslips/payroll/:payrollId
app.get('/api/payslips/payroll/:payrollId', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM payslip WHERE Payroll_id = ?',
    [req.params.payrollId]
  );
  res.json(rows);
});

// GET /api/payslips/employee/:empId
app.get('/api/payslips/employee/:empId', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM payslip WHERE Employee_id = ? ORDER BY Payslip_id DESC',
    [req.params.empId]
  );
  res.json(rows);
});

// POST /api/payslips
app.post('/api/payslips', auth, async (req, res) => {
  const { Payroll_id, Employee_id, gross_pay, total_deductions } = req.body;
  if (!Payroll_id) return res.status(400).json({ success: false, message: 'Select a payroll period.' });
  if (!Employee_id) return res.status(400).json({ success: false, message: 'Select an employee.' });
  if (Number(gross_pay) < 0) return res.status(400).json({ success: false, message: 'Gross pay cannot be negative.' });
  if (Number(total_deductions) < 0) return res.status(400).json({ success: false, message: 'Total deductions cannot be negative.' });

  const [exists] = await pool.query(
    'SELECT Payslip_id FROM payslip WHERE Payroll_id = ? AND Employee_id = ?',
    [Payroll_id, Employee_id]
  );
  if (exists.length) {
    return res.json({ success: false, message: 'A payslip for this employee in this payroll period already exists.' });
  }

  const net_pay = Math.max(0, Number(gross_pay) - Number(total_deductions));
  const [result] = await pool.query(
    'INSERT INTO payslip (Payroll_id, Employee_id, gross_pay, total_deductions, net_pay) VALUES (?, ?, ?, ?, ?)',
    [Payroll_id, Employee_id, gross_pay, total_deductions, net_pay]
  );
  const [newSlip] = await pool.query('SELECT * FROM payslip WHERE Payslip_id = ?', [result.insertId]);
  res.status(201).json({ success: true, payslip: newSlip[0] });
});

// DELETE /api/payslips/:id
app.delete('/api/payslips/:id', auth, async (req, res) => {
  const [result] = await pool.query('DELETE FROM payslip WHERE Payslip_id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Payslip not found.' });
  res.json({ success: true });
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Payroll API running → http://localhost:${PORT}`);
});