require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

/* ---------- MIDDLEWARES ---------- */
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

/* ---------- ROUTES ---------- */
app.use('/api/auth', authRoutes);

/* ---------- DATABASE ---------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));