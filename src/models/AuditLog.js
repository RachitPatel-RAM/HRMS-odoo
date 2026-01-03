const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    entity_type: {
        type: DataTypes.STRING, // e.g. 'Employee'
        allowNull: false
    },
    entity_id: {
        type: DataTypes.STRING, // e.g. Employee ID which is STRING
        allowNull: false
    },
    action: {
        type: DataTypes.STRING, // 'UPDATE', 'CREATE'
        allowNull: false
    },
    field_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    old_value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    new_value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    performed_by: {
        type: DataTypes.UUID, // User ID
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    timestamps: true,
    tableName: 'audit_logs'
});

AuditLog.belongsTo(User, { foreignKey: 'performed_by' });

module.exports = AuditLog;
