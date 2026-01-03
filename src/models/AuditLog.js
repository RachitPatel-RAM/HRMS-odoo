const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_email: {
        type: DataTypes.STRING,
        allowNull: true // Could be null if login fails with unknown email
    },
    action: {
        type: DataTypes.ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'USER_CREATED', 'PASSWORD_RESET'),
        allowNull: false
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    details: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false, // Only createdAt matters
    tableName: 'audit_logs'
});

module.exports = AuditLog;
