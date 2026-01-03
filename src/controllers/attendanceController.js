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

exports.getWeeklyAttendance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start and End dates are required' });
        }

        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999); // Include end of day

        const data = await attendanceService.getWeeklyAttendance(sDate, eDate);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });
        if (!user || !user.Employee) return res.status(404).json({ message: 'Profile not found' });

        const monthStr = req.query.month; // "YYYY-MM"
        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
            // Default to current month
            const now = new Date();
            const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const data = await attendanceService.getMonthlyAttendance(user.Employee.id, defaultMonth);
            return res.json(data);
        }

        const data = await attendanceService.getMonthlyAttendance(user.Employee.id, monthStr);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
