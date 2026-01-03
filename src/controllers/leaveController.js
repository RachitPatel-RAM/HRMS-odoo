const leaveService = require('../services/leaveService');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const nodemailer = require('nodemailer');
const { uploadToCloudinary } = require('../utils/storageService');

// Email Config
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rampateluni@gmail.com', // Provided by user
        pass: 'jlrk aemd fovj wlhj'   // Provided by user
    }
});

async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({ from: '"HR System" <rampateluni@gmail.com>', to, subject, html });
    } catch (e) { console.error("Email Error:", e); }
}

exports.getMyLeaves = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });
        if (!user || !user.Employee) return res.status(404).json({ message: 'Profile not found' });

        const leaves = await leaveService.getMyLeaves(user.Employee.id);
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBalances = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });
        if (!user || !user.Employee) return res.status(404).json({ message: 'Profile not found' });

        const balances = await leaveService.getBalances(user.Employee.id);
        res.json(balances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { include: ['Employee'] });
        if (!user || !user.Employee) return res.status(404).json({ message: 'Profile not found' });

        const requestData = req.body;

        // Handle Attachment
        if (req.file) {
            const url = await uploadToCloudinary(req.file.buffer);
            requestData.attachment_url = url;
        }

        const leave = await leaveService.createRequest(user.Employee.id, requestData);

        // Notify Admins
        const notificationController = require('./notificationController');
        const msg = `New Leave Request: ${user.Employee.first_name} ${user.Employee.last_name} - ${leave.type} (${leave.days_count} days)`;
        await notificationController.createNotification('LEAVE_REQUEST', msg, 'ADMIN', leave.id, 'Leave');

        res.status(201).json(leave);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Admin Methods ---

exports.getAllLeaves = async (req, res) => {
    try {
        if (!['ADMIN', 'HR'].includes(req.user.role)) return res.status(403).json({ message: 'Access Denied' });

        const leaves = await Leave.findAll({
            include: [{ model: Employee, attributes: ['id', 'first_name', 'last_name', 'profile_picture'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(leaves);
    } catch (e) {
        console.error("GET ALL LEAVES ERROR:", e);
        res.status(500).json({ message: e.message });
    }
};

exports.approveRequest = async (req, res) => {
    // Transaction handled manually or rely on correct sequencing. 
    // Using transaction for safety.
    const t = await Leave.sequelize.transaction();
    try {
        if (!['ADMIN', 'HR'].includes(req.user.role)) return res.status(403).json({ message: 'Access Denied' });

        const leave = await Leave.findByPk(req.params.id, { include: ['Employee'] }, { transaction: t });
        if (!leave) { await t.rollback(); return res.status(404).json({ message: 'Not Found' }); }

        if (leave.status !== 'PENDING') {
            await t.rollback();
            return res.status(400).json({ message: 'Only PENDING requests can be processed' });
        }

        // Update Leave
        leave.status = 'APPROVED';
        await leave.save({ transaction: t });

        // Update Attendance (Mark days as Leave)
        const sDate = new Date(leave.start_date);
        const eDate = new Date(leave.end_date);

        let loop = new Date(sDate);
        while (loop <= eDate) {
            const dateStr = loop.toISOString().split('T')[0];

            // Check existing
            let att = await Attendance.findOne({ where: { employee_id: leave.employee_id, date: dateStr }, transaction: t });
            if (att) {
                att.status = 'ON_LEAVE';
                att.notes = `Leave: ${leave.type}`;
                await att.save({ transaction: t });
            } else {
                await Attendance.create({
                    employee_id: leave.employee_id,
                    date: dateStr,
                    status: 'ON_LEAVE',
                    notes: `Leave: ${leave.type}`
                }, { transaction: t });
            }
            loop.setDate(loop.getDate() + 1);
        }

        // Audit & Notify
        await AuditLog.create({
            entity_type: 'Leave', entity_id: leave.id, action: 'APPROVE', performed_by: req.user.id
        }, { transaction: t });

        await t.commit();

        // Fetch updated balances for email
        const balances = await leaveService.getBalances(leave.employee_id);
        const user = await User.findOne({ where: { employee_id: leave.employee_id } }); // Get email

        // Email (Async - fire and forget)
        const emailHtml = `
            <div style="font-family: 'Courier New', monospace; padding: 20px; border: 2px solid #000; max-width: 600px;">
                <h2 style="color: #16a34a; border-bottom: 2px solid #000; padding-bottom: 10px;">✅ LEAVE APPROVED</h2>
                <p>Dear <b>${leave.Employee.first_name}</b>,</p>
                <p>Your leave request has been officially approved.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #000;">
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; border: 1px solid #000;"><b>Type</b></td>
                        <td style="padding: 10px; border: 1px solid #000;">${leave.type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000;"><b>Dates</b></td>
                        <td style="padding: 10px; border: 1px solid #000;">${new Date(leave.start_date).toDateString()} - ${new Date(leave.end_date).toDateString()}</td>
                    </tr>
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; border: 1px solid #000;"><b>Duration</b></td>
                        <td style="padding: 10px; border: 1px solid #000;">${leave.days_count} Days</td>
                    </tr>
                </table>

                <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px;">📊 Updated Leave Balance</h3>
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
                    <tr style="background: #000; color: #fff;">
                        <td style="padding: 10px; border: 1px solid #000;">Category</td>
                        <td style="padding: 10px; border: 1px solid #000;">Remaining</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000;">Paid Time Off</td>
                        <td style="padding: 10px; border: 1px solid #000;"><b>${balances.paid_time_off}</b> Days</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000;">Sick Leave</td>
                        <td style="padding: 10px; border: 1px solid #000;"><b>${balances.sick_leave}</b> Days</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated message from your HRMS.</p>
            </div>
        `;

        if (user && user.email) sendEmail(user.email, 'Leave Request Approved', emailHtml);

        res.json({ message: 'Approved' });

    } catch (e) {
        if (t) await t.rollback();
        console.error(e);
        res.status(500).json({ message: e.message });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        if (!['ADMIN', 'HR'].includes(req.user.role)) return res.status(403).json({ message: 'Access Denied' });

        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Reason required' });

        const leave = await Leave.findByPk(req.params.id, { include: ['Employee'] });
        if (!leave) return res.status(404).json({ message: 'Not Found' });

        leave.status = 'REJECTED';
        // leave.reason = reason; // Ensure field exists
        await leave.save();

        await AuditLog.create({
            entity_type: 'Leave', entity_id: leave.id, action: 'REJECT', performed_by: req.user.id, reason: reason
        });

        // Email
        const balances = await leaveService.getBalances(leave.employee_id);
        const user = await User.findOne({ where: { employee_id: leave.employee_id } });

        const emailHtml = `
            <div style="font-family: 'Courier New', monospace; padding: 20px; border: 2px solid #000; max-width: 600px;">
                <h2 style="color: #dc2626; border-bottom: 2px solid #000; padding-bottom: 10px;">❌ LEAVE REJECTED</h2>
                <p>Dear <b>${leave.Employee.first_name}</b>,</p>
                <p>Your leave request has been rejected.</p>
                
                <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #dc2626; font-weight: bold;">Reason: ${reason}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #000;">
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; border: 1px solid #000;"><b>Type</b></td>
                        <td style="padding: 10px; border: 1px solid #000;">${leave.type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000;"><b>Dates</b></td>
                        <td style="padding: 10px; border: 1px solid #000;">${new Date(leave.start_date).toDateString()} - ${new Date(leave.end_date).toDateString()}</td>
                    </tr>
                </table>

                <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px;">📊 Current Leave Balance</h3>
                 <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
                    <tr style="background: #000; color: #fff;">
                        <td style="padding: 10px; border: 1px solid #000;">Category</td>
                        <td style="padding: 10px; border: 1px solid #000;">Remaining</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000;">Paid Time Off</td>
                        <td style="padding: 10px; border: 1px solid #000;"><b>${balances.paid_time_off}</b> Days</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000;">Sick Leave</td>
                        <td style="padding: 10px; border: 1px solid #000;"><b>${balances.sick_leave}</b> Days</td>
                    </tr>
                </table>
            </div>
        `;

        if (user && user.email) sendEmail(user.email, 'Leave Request Rejected', emailHtml);

        res.json({ message: 'Rejected' });
    } catch (e) { console.error(e); res.status(500).json({ message: e.message }); }
};
