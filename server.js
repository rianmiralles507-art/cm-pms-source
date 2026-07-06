require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { runSmartChecks } = require('./utils/statusUpdater');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contractRoutes = require('./routes/contracts');
const approvalRoutes = require('./routes/approvals');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Generic error handler (e.g. multer file-type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ message: err.message || 'Something went wrong.' });
});

// Smart feature: run overdue / auto-status checks every hour, and once at boot
runSmartChecks();
cron.schedule('0 * * * *', () => runSmartChecks());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CM-PMS API running on http://localhost:${PORT}`));
