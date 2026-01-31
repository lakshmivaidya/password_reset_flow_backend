const express = require('express');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail'); // only once here
const User = require('../models/User');

const router = express.Router();

// Configure SendGrid once
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// REGISTER
router.post('/register', async (req, res) => {
  try {
    let { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ msg: 'All fields required' });

    email = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ msg: 'User already exists' });

    const user = new User({ name, email, password });
    await user.save();

    res.json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: 'All fields required' });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ msg: 'Invalid email or password' });

    res.json({ msg: 'Login successful' });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    let { email } = req.body;
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    const responseMsg = 'If this email exists, a reset link has been sent';

    if (!user) return res.json({ msg: responseMsg });

    // Generate reset token and hash
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const msg = {
      to: user.email,
      from: process.env.EMAIL_FROM, // your verified SendGrid email
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
      `
    };

    await sgMail.send(msg);
    console.log(`Password reset email sent to ${user.email}`);

    res.json({ msg: responseMsg });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// RESET PASSWORD
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

    user.password = password; // will hash automatically
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;