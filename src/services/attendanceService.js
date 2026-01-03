const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

class AttendanceService {
    // Check In
    async checkIn(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check for existing session today (OPEN or CLOSED)
        // User rule: "One Check In + One Check Out per day"
        // So if any record exists for today, block it.
        const existing = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                date: today
            }
        });

        if (existing) {
            throw new Error('You have already checked in today.');
        }

        const attendance = await Attendance.create({
            employee_id: employeeId,
            date: today,
            check_in_time: new Date(),
            status: 'PRESENT',
            lunch_duration: 1.0, // Default 1 hour policy
            total_hours: 0,
            overtime_hours: 0,
            overtime_status: 'N/A'
        });

        return attendance;
    }

    // Check Out
    async checkOut(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                date: today,
                check_out_time: null
            }
        });

        if (!attendance) {
            throw new Error('No active check-in found for today.');
        }

        const checkOutTime = new Date();
        attendance.check_out_time = checkOutTime;

        // Calculations
        const checkInTime = new Date(attendance.check_in_time);
        const diffMs = checkOutTime - checkInTime;
        const diffHours = diffMs / (1000 * 60 * 60); // Total duration in hours

        // Lunch Deduction (Fixed 1hr for now)
        // In real world, user might input lunch, but requirement says "Lunch duration defaulted"
        const lunch = 1.0;
        attendance.lunch_duration = lunch;

        let workingHours = diffHours - lunch;
        if (workingHours < 0) workingHours = 0;

        attendance.total_hours = parseFloat(workingHours.toFixed(2));

        // OT Calculation (Threshold: 9 hours)
        const STANDARD_HOURS = 9.0;
        if (workingHours > STANDARD_HOURS) {
            attendance.overtime_hours = parseFloat((workingHours - STANDARD_HOURS).toFixed(2));
            attendance.overtime_status = 'PENDING';
        } else {
            attendance.overtime_hours = 0;
            attendance.overtime_status = 'N/A';
        }

        await attendance.save();

        return attendance;
    }

    // Get Weekly Attendance for Spreadsheet
    async getWeeklyAttendance(startDate, endDate) {
        // Fetch all employees + their attendance/leaves in range
        // Similar to Dashboard but for a specific range

        // 1. Fetch Employees
        const employees = await Employee.findAll({
            where: {
                [Op.not]: [
                    { first_name: 'Super', last_name: 'Admin' } // Exclude Super Admin
                ]
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
            include: [
                {
                    model: Attendance,
                    required: false,
                    where: {
                        date: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }
                // Add Leave model later if needed for 'ON_LEAVE' status
            ],
            order: [['first_name', 'ASC']]
        });

        return employees;
    }

    // Get Monthly Attendance for Employee View
    async getMonthlyAttendance(employeeId, monthStr) {
        // monthStr format: "YYYY-MM"
        const [year, month] = monthStr.split('-').map(Number);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        // Fetch Attendance
        const attendanceRecords = await Attendance.findAll({
            where: {
                employee_id: employeeId,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['date', 'ASC']]
        });

        // 1. Calculate Summaries
        // Days Present: Unique days with status PRESENT
        const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT').length;

        // Leaves Count (Placeholder for now, assuming Leave model exists and is synced)
        // const leaves = await Leave.count({ where: { employee_id: employeeId, status: 'APPROVED', ...dateRange } });
        const leavesCount = 0; // TODO: Integrate Leave Service

        // Total Working Days (Business Days: Mon-Fri)
        let totalWorkingDays = 0;
        let d = new Date(startDate);
        while (d <= endDate) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) { // Exclude Sun(0) and Sat(6)
                totalWorkingDays++;
            }
            d.setDate(d.getDate() + 1);
        }

        // 2. Format Daily Records
        // Map by date string YYYY-MM-DD
        const attendanceMap = new Map();
        attendanceRecords.forEach(a => {
            const dateKey = new Date(a.date).toISOString().split('T')[0];
            attendanceMap.set(dateKey, a);
        });

        const dailyRecords = [];
        d = new Date(startDate);
        while (d <= endDate) {
            const dateKey = d.toISOString().split('T')[0];
            const att = attendanceMap.get(dateKey);

            const isWeekend = (d.getDay() === 0 || d.getDay() === 6);

            let record = {
                date: dateKey,
                dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
                displayDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }), // DD/MM/YYYY
                checkIn: '-',
                checkOut: '-',
                workHours: '-',
                extraHours: '-',
                status: isWeekend ? 'WEEKEND' : 'ABSENT',
                isHighlight: false
            };

            if (att) {
                record.status = att.status;
                if (att.check_in_time) {
                    record.checkIn = new Date(att.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // 10:00
                }
                if (att.check_out_time) {
                    record.checkOut = new Date(att.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // 19:00
                }

                // Format Work Hours (float to HH:MM)
                if (att.total_hours > 0) {
                    const h = Math.floor(att.total_hours);
                    const m = Math.round((att.total_hours - h) * 60);
                    record.workHours = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }

                // Format Extra Hours
                if (att.overtime_hours > 0) {
                    const h = Math.floor(att.overtime_hours);
                    const m = Math.round((att.overtime_hours - h) * 60);
                    record.extraHours = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    record.isHighlight = true;
                } else {
                    record.extraHours = '00:00';
                }
            }

            dailyRecords.push(record);
            d.setDate(d.getDate() + 1);
        }

        return {
            summary: {
                presentDays,
                leavesCount,
                totalWorkingDays
            },
            records: dailyRecords.reverse() // Newest first? User design shows ascending. Let's keep ascending. Wait, usually logs are desc. Reference table shows ascending? 28/10, 29/10... Ascending.
                .reverse() // Original was Ascending logic, reverse makes it Descending? 
            // Logic above build Ascending. Reference UI shows Ascending (28, 29, 30).
            // Let's return Ascending.
            // Actually, `dailyRecords` is built start->end. So it IS ascending.
        };
    }
}

module.exports = new AttendanceService();
