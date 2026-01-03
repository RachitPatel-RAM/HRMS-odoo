const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User'); // Optional: if we want to link a notification to a specific admin (or all admins)

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.STRING, // 'LEAVE_REQUEST', 'SYSTEM', etc.
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    recipient_role: { // 'ADMIN', 'HR', or specific userId if null
        type: DataTypes.STRING,
        defaultValue: 'ADMIN'
    },
    // Optional: link to entity
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    entity_type: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

module.exports = Notification;
