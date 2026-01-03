const attendanceService = require('../services/attendanceService');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const { Op } = require('sequelize');

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

exports.requestExtraTime = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });

        if (!user || !user.Employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }

        const result = await attendanceService.requestExtraTime(user.Employee.id);
        res.json({ message: 'Extra time allocated', data: result });
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

exports.getWeeklyAttendanceForAll = async (req, res) => {
    try {
        // RBAC
        if (!['ADMIN', 'HR'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) return res.status(400).json({ message: 'Start/End date required' });

        // 1. Get All Employees
        const employees = await Employee.findAll({
            where: {
                status: 'Active',
                [Op.not]: [
                    { first_name: 'Super', last_name: 'Admin' }
                ]
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_picture']
        });

        // 2. Get All Attendance in Range
        const sDate = new Date(start_date);
        const eDate = new Date(end_date);
        eDate.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findAll({
            where: {
                date: {
                    [Op.between]: [sDate, eDate]
                }
            }
        });

        // 3. Map Data
        const attMap = {}; // { empId: { date: record } }
        attendance.forEach(r => {
            // Ensure date is YYYY-MM-DD string for key matching
            let dateStr = r.date;
            if (r.date instanceof Date) {
                dateStr = r.date.toISOString().split('T')[0];
            } else if (typeof r.date === 'string' && r.date.includes('T')) {
                dateStr = r.date.split('T')[0];
            }

            if (!attMap[r.employee_id]) attMap[r.employee_id] = {};
            attMap[r.employee_id][dateStr] = r;
        });

        const result = employees.map(emp => ({
            employee: {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                profile_picture: emp.profile_picture
            },
            attendance: attMap[emp.id] || {}
        }));

        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateAttendanceRecord = async (req, res) => {
    const transaction = await Attendance.sequelize.transaction();
    try {
        if (!['ADMIN', 'HR'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const { employeeId } = req.params; // Note: this might be attendance ID or employee ID + date. 
        // Better: Identify by Employee + Date
        const { date, check_in, check_out, lunch_duration, notes, reason, overtime_status } = req.body;

        if (!reason) return res.status(400).json({ message: 'Reason for edit is mandatory' });

        // Find or Init
        let attendance = await Attendance.findOne({
            where: { employee_id: employeeId, date: date }
        });

        const oldValues = attendance ? attendance.toJSON() : null;

        if (!attendance) {
            attendance = await Attendance.create({
                employee_id: employeeId,
                date: date,
                status: 'Present' // Default if creating
            }, { transaction });
        }

        // Update fields
        if (check_in !== undefined) attendance.check_in = check_in ? `${date} ${check_in}` : null; // Expect HH:mm:ss
        if (check_out !== undefined) attendance.check_out = check_out ? `${date} ${check_out}` : null;
        if (lunch_duration !== undefined) attendance.lunch_duration = lunch_duration;
        if (notes !== undefined) attendance.notes = notes;
        if (overtime_status !== undefined) attendance.overtime_status = overtime_status;

        // Recalc status/hours if needed (simplified here)
        // In real app, recall service calculation logic

        await attendance.save({ transaction });

        // Audit Log
        await AuditLog.create({
            entity_type: 'Attendance',
            entity_id: attendance.id,
            action: oldValues ? 'UPDATE' : 'CREATE',
            field_name: 'Manual Edit',
            old_value: JSON.stringify(oldValues),
            new_value: JSON.stringify(req.body),
            performed_by: req.user.id,
            reason: reason // Assuming AuditLog has reason or we put in notes
        }, { transaction });

        await transaction.commit();
        res.json({ message: 'Attendance Updated', data: attendance });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Update Failed' });
    }
};

exports.exportAttendance = async (req, res) => {
    try {
        const { type, offset, start_date } = req.query; // type: week, month, year, all
        let start = new Date();
        let end = new Date();

        if (start_date) start = new Date(start_date);

        if (type === 'week') {
            const day = start.getDay(), diff = start.getDate() - day + (day == 0 ? -6 : 1);
            start.setDate(diff); start.setHours(0, 0, 0, 0);
            end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start.setDate(1); start.setHours(0, 0, 0, 0);
            end = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999);
        } else if (type === 'year') {
            start.setMonth(0, 1); start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31); end.setHours(23, 59, 59, 999);
        } else if (type === 'all') {
            start = new Date('2000-01-01'); // Beginning of time
            end = new Date('2100-12-31');
        }

        const employees = await Employee.findAll({ where: { status: 'Active' } });
        const allAttendance = await Attendance.findAll({
            where: {
                date: { [Op.between]: [start, end] }
            },
            include: [{ model: Employee, attributes: ['first_name', 'last_name'] }],
            order: [['date', 'ASC']]
        });

        // Generate CSV
        let csv = 'Employee ID,Employee Name,Date,Check In,Check Out,Lunch Duration,Overtime,Status,Notes\n';

        allAttendance.forEach(a => {
            const name = a.Employee ? `${a.Employee.first_name} ${a.Employee.last_name}` : 'Unknown';
            const date = a.date;
            const checkIn = a.check_in_time ? a.check_in_time : '-';
            const checkOut = a.check_out ? a.check_out : '-';
            const lunch = a.lunch_duration || 0;
            const ot = a.overtime_hours || 0;
            const status = a.status;
            const notes = a.notes ? `"${a.notes.replace(/"/g, '""')}"` : '';

            csv += `${a.employee_id},"${name}",${date},${checkIn},${checkOut},${lunch},${ot},${status},${notes}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`attendance_export_${type}_${Date.now()}.csv`);
        res.send(csv);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Export Failed' });
    }
};
