const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

class AttendanceService {
    // Check In
    async checkIn(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check for TRULY active session (has check-in but no check-out)
        const activeSession = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                check_out_time: null,
                check_in_time: { [Op.ne]: null }
            }
        });

        if (activeSession) {
            throw new Error('You are already checked in.');
        }

        // Check for Placeholder (both null) for TODAY
        const placeholder = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                date: today,
                check_in_time: null,
                check_out_time: null
            }
        });

        let attendance;
        if (placeholder) {
            // Update existing placeholder
            placeholder.check_in_time = new Date();
            placeholder.status = 'PRESENT';
            await placeholder.save();
            attendance = placeholder;
        } else {
            // Create new
            attendance = await Attendance.create({
                employee_id: employeeId,
                date: today,
                check_in_time: new Date(),
                status: 'PRESENT',
                lunch_duration: 1.0,
                total_hours: 0,
                overtime_hours: 0,
                overtime_status: 'N/A',
                extra_allocations: []
            });
        }

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
        let endDate = new Date(year, month, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        // Logic to hide future dates:
        // If the requested month is the CURRENT month, clamp endDate to NOW.
        // If requested month is a FUTURE month, return empty or handle appropriately (the loop won't start if startDate > now? No, startDate is based on year/month).
        // Let's just clamp endDate to Math.min(endDate, now).
        const now = new Date();
        if (endDate > now) {
            endDate = now;
        }

        // Ensure startDate is not after endDate (e.g. if viewing future month)
        if (startDate > endDate) {
            return {
                summary: { presentDays: 0, leavesCount: 0, totalWorkingDays: 0 },
                records: []
            };
        }

        // Fetch Attendance
        const attendanceRecords = await Attendance.findAll({
            where: {
                employee_id: employeeId,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['date', 'ASC'], ['check_in_time', 'ASC']]
        });

        // 1. Group Records by Date
        const groupedMap = new Map(); // dateKey -> [records]

        attendanceRecords.forEach(a => {
            const dateKey = new Date(a.date).toISOString().split('T')[0];
            if (!groupedMap.has(dateKey)) {
                groupedMap.set(dateKey, []);
            }
            groupedMap.get(dateKey).push(a);
        });

        // 2. Format Daily Records & Calculate Summaries (Simultaneously)
        let presentDays = 0;
        const leavesCount = 0; // TODO: Integrate Leave Service

        // Total Working Days
        let totalWorkingDays = 0;
        let d = new Date(startDate);
        while (d <= endDate) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) totalWorkingDays++;
            d.setDate(d.getDate() + 1);
        }

        // Helper Duration Formatter
        const formatDurationMs = (ms) => {
            if (ms <= 0) return '0h 00m 00s';
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((ms % (1000 * 60)) / 1000);
            return `${hours}h ${minutes}m ${seconds}s`;
        };

        const dailyRecords = [];
        d = new Date(startDate);
        while (d <= endDate) {
            const dateKey = d.toISOString().split('T')[0];
            const records = groupedMap.get(dateKey) || [];

            const isWeekend = (d.getDay() === 0 || d.getDay() === 6);

            let record = {
                date: dateKey,
                dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
                displayDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                checkIn: '-',
                checkOut: '-',
                workHours: '-',
                extraHours: '-',
                status: isWeekend ? 'WEEKEND' : 'ABSENT',
                isHighlight: false
            };

            if (records.length > 0) {
                // Determine raw status first
                const isRawPresent = records.some(r => r.status === 'PRESENT');
                record.status = isRawPresent ? 'PRESENT' : records[0].status;

                // Aggregate Logic
                // Check In = First Check In
                // Check Out = Last Check Out (if multiple sessions, this shows range span? Or should we show last session's checkout?)
                // User asked for "Real Data". Showing First In and Last Out represents the "Work Day Span".

                const firstRecord = records[0];
                const lastRecord = records[records.length - 1];

                if (firstRecord.check_in_time) {
                    record.checkIn = new Date(firstRecord.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                }

                // Show Last Check Out ONLY if it exists. If last record is active (null checkout), show '-' or maybe 'Ongoing'?
                if (lastRecord.check_out_time) {
                    record.checkOut = new Date(lastRecord.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                } else if (records.length > 1) {
                    // If last record is ongoing, but previous had checkouts.
                    // It's tricky. Let's show '-' if currently checked in.
                }

                // Sum Work Hours and Extra Hours
                let totalWorkMs = 0;
                let totalOtMs = 0;
                let hasActiveSession = false;

                records.forEach(r => {
                    if (r.check_in_time && r.check_out_time) {
                        totalWorkMs += (new Date(r.check_out_time) - new Date(r.check_in_time));
                    } else if (r.check_in_time && !r.check_out_time) {
                        hasActiveSession = true;
                    }

                    if (r.overtime_hours > 0) {
                        totalOtMs += (r.overtime_hours * 60 * 60 * 1000); // OT is stored as hours float
                    }
                });

                record.workHours = formatDurationMs(totalWorkMs);
                if (hasActiveSession) {
                    record.workHours += ' (Active)';
                }

                if (totalOtMs > 0) {
                    record.extraHours = formatDurationMs(totalOtMs);
                    record.isHighlight = true;
                } else {
                    record.extraHours = '0h 00m 00s';
                }

                // Minimum Hours Logic
                // Threshold: 2 Hours (configurable). If less than this, treat as Absent for count.
                // Or maybe Half Day? For now, User implies strict "Short" is Absent.
                // 1 Min / 1 Hr mention => Let's use 2 Hours as a safe "Attendance" marker.
                const MIN_PRESENT_MS = 2 * 60 * 60 * 1000;

                if (totalWorkMs >= MIN_PRESENT_MS) {
                    // Count as Present
                    presentDays++;
                } else {
                    // Mark visual status as Absent/Short if not minimal duration?
                    // Or keep 'PRESENT' in DB but NOT count it? 
                    // User said "count as absent only". So display ABSENT.

                    // Exception: If current day is TODAY and still active, don't mark absent yet?
                    // The 'hasActiveSession' flag helps.
                    const isToday = (dateKey === new Date().toISOString().split('T')[0]);

                    if (!hasActiveSession) {
                        // Session closed and shorts -> ABSENT
                        record.status = 'ABSENT';
                        record.workHours += ' (Short)';
                    } else {
                        // Current/Active session < Threshold: Don't count yet, but display 'PRESENT' (or 'ONGOING')?
                        // Usually 'PRESENT' means "Has checked in".
                        // If we strictly follow user: "count as absent only".
                        // Let's not increment presentDays yet. And show status as 'SHORT' or 'PRESENT'?
                        // Let's keep status PRESENT in UI if active, but NOT count it in summary.

                        // Wait, if it's today and active, we effectively don't count it as a "Full Present Day" yet?
                        // Or do we? "Projected Earnings" depends on this.
                        // Better to be conservative: only count COMPLETED significant days or SUBSTANTIAL active days.
                        // Taking a stricter approach: Only `totalWorkMs >= Threshold` increments `presentDays`.
                        // Visual status:
                        if (totalWorkMs < MIN_PRESENT_MS) {
                            // record.status = 'SHORT'; // Maybe confusing.
                            // Let's leave visual status as PRESENT (checked in) but just NOT count it in summary.
                            // User asked: "how we can say that employee is present is count as absent only".
                            // They want the STATUS to be ABSENT likely.
                            if (!hasActiveSession) record.status = 'ABSENT';
                        }
                    }
                }
            }

            dailyRecords.push(record);
            d.setDate(d.getDate() + 1);
        }

        // Calculate Total Extra Hours for Summary (in decimal hours)
        const totalExtraHours = dailyRecords.reduce((acc, r) => {
            if (r.extraHours && r.extraHours !== '-' && r.extraHours !== '0h 00m 00s') {
                const parts = r.extraHours.match(/(\d+)h (\d+)m (\d+)s/);
                if (parts) {
                    const h = parseInt(parts[1]);
                    const m = parseInt(parts[2]);
                    const s = parseInt(parts[3]);
                    return acc + h + (m / 60) + (s / 3600);
                }
            }
            return acc;
        }, 0);

        return {
            summary: {
                presentDays,
                leavesCount,
                totalWorkingDays,
                totalExtraHours: parseFloat(totalExtraHours.toFixed(2))
            },
            records: dailyRecords // Now returning Ascending (1st to 31st) as built
        };
    }
}

module.exports = new AttendanceService();
