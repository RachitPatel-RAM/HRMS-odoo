const { Sequelize } = require('sequelize');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
require('dotenv').config();

const sequelize = require('../config/db');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        const count = await Leave.count();
        console.log(`Total Leaves in DB: ${count}`);

        const leaves = await Leave.findAll({ include: [Employee] });
        console.log(JSON.stringify(leaves, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
