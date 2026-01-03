const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

class AttendanceService {
    // Check In
    async checkIn(employeeId) {
        // Strict Date (Start of Day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if there is an OPEN session (checked in but not checked out)
        const openSession = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                date: today,
                check_out_time: null // Still active
            }
        });

        if (openSession) {
            throw new Error('You are already checked in. Please check out first.');
        }

        const attendance = await Attendance.create({
            employee_id: employeeId,
            date: today,
            check_in_time: new Date(),
            status: 'PRESENT'
        });

        return attendance;
    }

    // Check Out
    async checkOut(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the OPEN session
        const attendance = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                date: today,
                check_out_time: null
            }
        });

        if (!attendance) {
            throw new Error('You are not currently checked in.');
        }

        attendance.check_out_time = new Date();
        await attendance.save();

        return attendance;
    }

    // Get Today's Status for Employee
    async getTodayStatus(employeeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            where: {
                employee_id: employeeId,
                date: today
            }
        });

        return attendance;
    }

    // Get All Statuses for Dashboard
    async getAllEmployeeStatuses() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await Employee.findAll({
            include: [{
                model: Attendance,
                required: false,
                where: {
                    date: today
                }
            }]
        });
    }
}

module.exports = new AttendanceService();
