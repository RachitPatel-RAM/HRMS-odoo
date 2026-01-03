const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { Op } = require('sequelize');

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id; // From JWT
        const user = await User.findByPk(userId, {
            include: [{ model: Employee }]
        });

        if (!user || !user.Employee) {
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

        // ... (intermediate code for attendance/leave maps) ...

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

        // ... (intermediate code for uniqueness and sorting) ...

        const myAttendance = latestAttendanceMap.get(myEmployeeId);

        const meData = {
            employeeId: myEmployeeId,
            name: `${user.Employee.first_name} ${user.Employee.last_name}`,
            email: user.email,
            designation: user.Employee.designation,
            profile_picture: user.Employee.profile_picture
        };
        console.log('Sending Me Data:', meData); // DEBUG

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
