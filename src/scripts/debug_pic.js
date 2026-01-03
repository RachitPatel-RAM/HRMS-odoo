const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');

async function debug() {
    try {
        await sequelize.authenticate();
        console.log("DB Connected.");

        // Fetch all employees
        const employees = await Employee.findAll({
            attributes: ['id', 'first_name', 'last_name', 'profile_picture']
        });

        console.log("\n--- Employee Records ---");
        employees.forEach(e => {
            console.log(`ID: ${e.id}, Name: ${e.first_name} ${e.last_name}, Pic: ${e.profile_picture}`);
        });

        console.log("\n--- Public/Uploads Directory ---");
        const uploadsDir = path.join(__dirname, '../../public/uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            console.log(files);
        } else {
            console.log("Uploads directory does not exist!");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

debug();
