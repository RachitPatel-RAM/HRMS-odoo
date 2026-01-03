const { Sequelize } = require('sequelize');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
require('dotenv').config();

const sequelize = require('../config/db');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        const emp = await Employee.findOne();
        if (!emp) { console.log('No employee found, skipping leaf seed'); return; }

        await Leave.create({
            employee_id: emp.id,
            start_date: new Date(),
            end_date: new Date(new Date().setDate(new Date().getDate() + 2)),
            type: 'Paid Time Off',
            reason: 'Vacation',
            status: 'PENDING'
        });

        console.log('Leaf seeded');

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

seed();
