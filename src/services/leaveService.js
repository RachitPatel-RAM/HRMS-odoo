const Leave = require('../models/Leave');
const { Op } = require('sequelize');

class LeaveService {

    // Create a new Leave Request
    async createRequest(employeeId, data) {
        const { start_date, end_date, type, reason, attachment_url } = data;

        const sDate = new Date(start_date);
        const eDate = new Date(end_date);

        if (sDate > eDate) {
            throw new Error('Start date cannot be after end date.');
        }

        // 1. Check for Overlaps with Existing PENDING or APPROVED requests
        // (Ignoring REJECTED)
        const conflict = await Leave.findOne({
            where: {
                employee_id: employeeId,
                status: { [Op.in]: ['PENDING', 'APPROVED', 'TAKEN'] },
                [Op.or]: [
                    {
                        start_date: { [Op.between]: [sDate, eDate] }
                    },
                    {
                        end_date: { [Op.between]: [sDate, eDate] }
                    },
                    {
                        [Op.and]: [
                            { start_date: { [Op.lte]: sDate } },
                            { end_date: { [Op.gte]: eDate } }
                        ]
                    }
                ]
            }
        });

        if (conflict) {
            throw new Error('You already have a leave request for this period.');
        }

        // 2. Calculate Days Count (Business logic: exclude weekends? For now, simple day diff)
        // User requirement mentions "Weekend & holiday handling must follow company calendar"
        // For MVP, we'll exclude Sat/Sun from count but save full range.
        let daysCount = 0;
        let d = new Date(sDate);
        while (d <= eDate) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) {
                daysCount++;
            }
            d.setDate(d.getDate() + 1);
        }

        // 3. Check Balance (Mock Logic)
        const balances = await this.getBalances(employeeId);
        let available = 0;
        if (type === 'Paid Time Off') available = balances.paid_time_off;
        else if (type === 'Sick Leave') available = balances.sick_leave;
        else available = 999; // Unpaid limit?

        if (daysCount > available) {
            throw new Error(`Insufficient leave balance. Available: ${available}, Requested: ${daysCount}`);
        }

        const leave = await Leave.create({
            employee_id: employeeId,
            start_date: sDate,
            end_date: eDate,
            days_count: daysCount,
            type,
            reason,
            attachment_url,
            status: 'PENDING'
        });

        return leave;
    }

    // Get Leave Balances (Total - Used)
    async getBalances(employeeId) {
        // Mock Total Allocations per year
        const TOTAL_PTO = 24;
        const TOTAL_SICK = 7;

        // Fetch used (Approved + Taken + Pending?) typically Pending reserves balance.
        const usedLeaves = await Leave.findAll({
            where: {
                employee_id: employeeId,
                status: { [Op.in]: ['APPROVED', 'TAKEN', 'PENDING'] }
            }
        });

        let usedPto = 0;
        let usedSick = 0;

        usedLeaves.forEach(l => {
            if (l.type === 'Paid Time Off') usedPto += l.days_count;
            if (l.type === 'Sick Leave') usedSick += l.days_count;
        });

        return {
            paid_time_off: TOTAL_PTO - usedPto,
            sick_leave: TOTAL_SICK - usedSick,
            unpaid_leave: 'Unlimited' // or calculated
        };
    }

    // Get My Leaves
    async getMyLeaves(employeeId) {
        return await Leave.findAll({
            where: { employee_id: employeeId },
            order: [['createdAt', 'DESC']]
        });
    }
}

module.exports = new LeaveService();
