const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    date: {
        type: DataTypes.DATE, // Stores date only (time 00:00:00)
        allowNull: false
    },
    check_in_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    check_out_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PRESENT', 'ABSENT', 'ON_LEAVE'),
        defaultValue: 'PRESENT'
    },
    lunch_duration: {
        type: DataTypes.FLOAT, // In hours (e.g., 1.0 for 1 hour)
        defaultValue: 0
    },
    total_hours: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    overtime_hours: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    overtime_status: {
        type: DataTypes.ENUM('N/A', 'PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'N/A'
    },
    notes: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'attendance',
    timestamps: true
});

Employee.hasMany(Attendance, { foreignKey: 'employee_id' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = Attendance;
