const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { Op } = require('sequelize');

exports.getAdminStats = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Access Denied' });

        const totalEmployees = await Employee.count({ where: { status: 'Active' } });
        const totalHR = await User.count({ where: { role: 'HR' } });
        const totalUsers = await User.count();

        res.json({
            employees: totalEmployees,
            hrs: totalHR,
            total_users: totalUsers
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id; // From JWT
        const user = await User.findByPk(userId, {
            include: [{ model: Employee }]
        });

        if (!user || !user.Employee) {
            console.log('Dashboard 404 Debug:', { userFound: !!user, hasEmployee: user ? !!user.Employee : false, userId });
            return res.status(404).json({ message: 'User/Employee profile not found' });
        }

        const myEmployeeId = user.Employee.id;

        // 1. Fetch System Date (Start of Day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 2. Fetch All Employees
        const employees = await Employee.findAll({
            where: {
                [Op.not]: [
                    { first_name: 'Super', last_name: 'Admin' }
                ]
            },
            attributes: ['id', 'first_name', 'last_name', 'phone', 'profile_picture', 'designation', 'department', 'updatedAt'],
            order: [['first_name', 'ASC']]
        });

        // 3. Fetch Today's Attendance
        const attendances = await Attendance.findAll({
            where: {
                date: today
            }
        });

        // 4. Fetch Active Leaves
        const leaves = await Leave.findAll({
            where: {
                start_date: { [Op.lte]: today },
                end_date: { [Op.gte]: today },
                status: 'APPROVED'
            }
        });

        // 5. Fetch Active Session for "Me" (Fix for "Not Checked In" loop if session spans days)
        const myActiveSession = await Attendance.findOne({
            where: {
                employee_id: myEmployeeId,
                check_out_time: null
            }
        });

        // 5. Build Maps for O(1) Access
        const activeAttendanceMap = new Map();
        const latestAttendanceMap = new Map(); // Store full object for "Me"
        attendances.forEach(att => {
            if (!att.check_out_time) {
                activeAttendanceMap.set(att.employee_id, true);
            }
            latestAttendanceMap.set(att.employee_id, att);
        });

        const leaveMap = new Map();
        leaves.forEach(l => {
            leaveMap.set(l.employee_id, true);
        });

        // 6. Build Response List
        let employeeList = employees.map(emp => {
            const activeAtt = activeAttendanceMap.get(emp.id);
            const lve = leaveMap.get(emp.id);

            let status = 'ABSENT';
            if (activeAtt) {
                status = 'PRESENT';
            } else if (lve) {
                status = 'ON_LEAVE';
            }

            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                designation: emp.designation || 'Employee',
                department: emp.department || 'General',
                status: status,
                profile_picture: emp.profile_picture // Pass profile_picture
            };
        });

        let myAttendance = latestAttendanceMap.get(myEmployeeId);

        // If we have an active session (possibly from yesterday), override/use it
        if (myActiveSession) {
            console.log('DEBUG: Found active session for user:', myActiveSession.id, 'Date:', myActiveSession.date);
            myAttendance = myActiveSession;
        } else {
            console.log('DEBUG: No active session found for user.');
        }
        console.log('DEBUG: Sending myAttendance to frontend:', myAttendance ? { id: myAttendance.id, check_in: myAttendance.check_in_time, check_out: myAttendance.check_out_time } : 'null');

        const meData = {
            employeeId: myEmployeeId,
            name: `${user.Employee.first_name} ${user.Employee.last_name}`,
            email: user.email,
            designation: user.Employee.designation,
            profile_picture: user.Employee.profile_picture,
            role: user.role // Added role for frontend checks
        };

        res.json({
            me: meData,
            attendance: myAttendance || null,
            employees: employeeList
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};
