// server/routes/signals.js

const express = require('express');
const router = express.Router();
const Signal = require('../models/signal');

// @route   POST api/signals
// @desc    Create a new emergency signal
// @access  Private (Requester)
router.post('/', async (req, res) => {
    const { type, description, location } = req.body;

    if(!type || !location){
        return res.status(400).json({ msg: 'Please enter all required fields' });
    }

    const newSignal = new Signal({
        requester: req.user.id,
        type,
        description,
        location
    });

    try{
        const savedSignal = await newSignal.save();
        res.json(savedSignal);
    } catch(err){
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET api/signals
// @desc    Get all signals (Responders)
// @access  Private (Responder)
router.get('/', async (req, res) => {
    try{
        const signals = await Signal.find().populate('requester', ['username']);
        res.json(signals);
    } catch(err){
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
