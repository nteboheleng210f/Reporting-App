const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const classRoutes = require('./routes/classRoutes');
const courseRoutes = require('./routes/courseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const studentDashboardRoutes = require('./routes/studentDashboardRoutes');
const prlDashboardRoutes = require('./routes/prlDashboardRoutes');
const plDashboardRoutes = require('./routes/plDashboardRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/student', studentDashboardRoutes);
app.use('/api/prl', prlDashboardRoutes);
app.use('/api/pl', plDashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = app;