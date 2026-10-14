require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { protect } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const { startScheduler } = require('./services/scheduler');
const records = require('./routes/records');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Public
app.use('/api/auth', require('./routes/auth'));

// Logged-in only
app.use('/api/team', protect, require('./routes/team'));
app.use('/api/contacts', protect, records.contacts);
app.use('/api/leads', protect, records.leads);
app.use('/api/activities', protect, records.activities);
app.use('/api/tasks', protect, records.tasks);
app.use('/api/settings', protect, require('./routes/settings'));
app.use('/api/automation', protect, require('./routes/automation'));
app.use('/api', notFound);

// In production, serve the built React app from client/dist
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
    startScheduler();
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    console.error('Check that MongoDB is running and MONGO_URI in server/.env is correct.');
    process.exit(1);
  });
