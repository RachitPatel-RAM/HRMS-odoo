const attendanceService = require('../services/attendanceService');
const User = require('../models/User');

exports.checkIn = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });

        if (!user || !user.Employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }

        const result = await attendanceService.checkIn(user.Employee.id);
        res.json({ message: 'Checked In Successfully', data: result });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

exports.checkOut = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });

        if (!user || !user.Employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }

        const result = await attendanceService.checkOut(user.Employee.id);
        res.json({ message: 'Checked Out Successfully', data: result });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};
