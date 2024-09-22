// server/routes/auth.js

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const passport = require('passport');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    // Simple validation
    if(!username || !password || !role){
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Check for existing user
    const user = await User.findOne({ username });
    if(user) return res.status(400).json({ msg: 'User already exists' });

    const newUser = new User({
        username,
        password,
        role
    });

    try{
        const savedUser = await newUser.save();
        jwt.sign(
            { id: savedUser._id, role: savedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if(err) throw err;
                res.json({
                    token,
                    user: {
                        id: savedUser._id,
                        username: savedUser.username,
                        role: savedUser.role
                    }
                });
            }
        );
    } catch(err){
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Simple validation
    if(!username || !password){
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try{
        // Check for existing user
        const user = await User.findOne({ username });
        if(!user) return res.status(400).json({ msg: 'User does not exist' });

        // Validate password
        const isMatch = await user.matchPassword(password);
        if(!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if(err) throw err;
                res.json({
                    token,
                    user: {
                        id: user._id,
                        username: user.username,
                        role: user.role
                    }
                });
            }
        );

    } catch(err){
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
