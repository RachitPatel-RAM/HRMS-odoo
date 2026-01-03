const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

class AttendanceService {
    // Check In
    async checkIn(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeSession = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                check_out_time: null
            }
        });

        if (activeSession) {
            throw new Error('You are already checked in.');
        }

        const attendance = await Attendance.create({
            employee_id: employeeId,
            date: today,
            check_in_time: new Date(),
            status: 'PRESENT',
            lunch_duration: 1.0, // Default 1 hour policy
            total_hours: 0,
            overtime_hours: 0,
            overtime_status: 'N/A',
            extra_allocations: [] // Initialize empty array
        });

        return attendance;
    }

    // Request Extra Time
    async requestExtraTime(employeeId) {
        const attendance = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                check_out_time: null
            }
        });

        if (!attendance) {
            throw new Error('No active session found.');
        }

        const now = new Date();

        // Validation: Cannot request if recently requested (simple check could be added here)
        // But logic says just button appears.

        let allocations = attendance.extra_allocations || [];
        // Ensure allocations is an array (sequelize JSON parsing)
        if (typeof allocations === 'string') allocations = JSON.parse(allocations);

        // Define Start Time
        // If this is the first allocation, start from max(now, checkIn + 7h)? 
        // Plan says: If click < 7h -> Block [7h, 9h]. If click > 7h -> Block [Now, Now+2h]

        const checkIn = new Date(attendance.check_in_time);
        const sevenHoursLater = new Date(checkIn.getTime() + 7 * 60 * 60 * 1000); // 7 hours work

        let startTime;
        if (now < sevenHoursLater) {
            startTime = sevenHoursLater;
        } else {
            startTime = now;
        }

        // Define End Time (Start + 2h)
        const twoHours = 2 * 60 * 60 * 1000;
        const endTime = new Date(startTime.getTime() + twoHours);

        // Add to allocations
        allocations.push({
            start: startTime.toISOString(),
            end: endTime.toISOString()
        });

        attendance.extra_allocations = allocations;
        // status might change to indicate OT active? Not strictly needed if we just track time.

        await attendance.save();

        return {
            message: 'Extra hours authorized.',
            block: { start: startTime, end: endTime }
        };
    }

    // Check Out
    async checkOut(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                check_out_time: null
            },
            order: [['check_in_time', 'DESC']]
        });

        if (!attendance) {
            throw new Error('No active check-in found for today.');
        }

        const checkOutTime = new Date();
        attendance.check_out_time = checkOutTime;

        // --- CALCULATION LOGIC ---
        const checkInTime = new Date(attendance.check_in_time);
        const allocations = attendance.extra_allocations || [];

        // 1. Calculate Raw Duration
        // We will sum up minute by minute? Or intervals.
        // Simplified Logic: 
        // Regular Time = Time worked within [CheckIn, CheckIn + 7h] - Lunch
        // Extra Time = Time worked that overlaps with [Allocations]

        // Lunch deduction logic needs to be robust. 
        // Assuming lunch is taken during the first 7 hours.
        const LUNCH_HOURS = 1.0;

        const sevenHoursMs = 7 * 60 * 60 * 1000;
        const standardEnd = new Date(checkInTime.getTime() + sevenHoursMs);

        // A. Regular Hours Calculation
        // Active worked interval for regular: [CheckIn, Min(CheckOut, StandardEnd)]
        let regularEnd = (checkOutTime < standardEnd) ? checkOutTime : standardEnd;
        let regularMs = regularEnd - checkInTime;
        if (regularMs < 0) regularMs = 0;

        let regularHours = regularMs / (1000 * 60 * 60);
        regularHours = Math.max(0, regularHours - LUNCH_HOURS);

        // B. Extra Hours Calculation
        let extraMs = 0;

        // For each allocation, find overlap with actual work interval [StandardEnd, CheckOut]
        // Note: Actual work interval for OT starts effectively after StandardEnd? 
        // Or specific to allocation blocks?
        // Logic: "Block covers [7h, 9h]" -> Logic implies OT counts ONLY if in block.
        // So we intersect [CheckIn, CheckOut] with [BlockStart, BlockEnd].
        // And we subtract any overlap with Regular Time?
        // Actually, if blocks Start >= StandardEnd, no overlap with regular.

        if (Array.isArray(allocations)) {
            for (const block of allocations) {
                const bStart = new Date(block.start);
                const bEnd = new Date(block.end);

                // Intersection of [bStart, bEnd] AND [CheckIn, CheckOut]
                const start = (checkInTime > bStart) ? checkInTime : bStart;
                const end = (checkOutTime < bEnd) ? checkOutTime : bEnd;

                if (end > start) {
                    extraMs += (end - start);
                }
            }
        }

        const extraHours = extraMs / (1000 * 60 * 60);

        // Update Fields
        attendance.total_hours = parseFloat((regularHours + extraHours).toFixed(2));
        attendance.overtime_hours = parseFloat(extraHours.toFixed(2));

        if (extraHours > 0) {
            attendance.overtime_status = 'PENDING';
        } else {
            attendance.overtime_status = 'N/A';
        }

        // Just to be safe store lunch
        attendance.lunch_duration = LUNCH_HOURS;

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

                // Format Work Hours (float to Xh Ym)
                if (att.total_hours > 0) {
                    const h = Math.floor(att.total_hours);
                    const m = Math.round((att.total_hours - h) * 60);
                    record.workHours = `${h}h ${m}m`;
                }

                // Format Extra Hours
                if (att.overtime_hours > 0) {
                    const h = Math.floor(att.overtime_hours);
                    const m = Math.round((att.overtime_hours - h) * 60);
                    record.extraHours = `${h}h ${m}m`;
                    record.isHighlight = true;
                } else {
                    record.extraHours = '0h 00m';
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
