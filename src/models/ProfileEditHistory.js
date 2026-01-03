const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');
const User = require('./User');

const ProfileEditHistory = sequelize.define('ProfileEditHistory', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Employee,
            key: 'id'
        }
    },
    section: {
        type: DataTypes.STRING, // e.g., 'ABOUT', 'INTERESTS', 'SKILLS'
        allowNull: false
    },
    old_value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    new_value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    edited_by: {
        type: DataTypes.UUID, // User ID
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    timestamps: true,
    updatedAt: false, // History logs are immutable
    tableName: 'profile_edit_history'
});

Employee.hasMany(ProfileEditHistory, { foreignKey: 'employee_id' });
ProfileEditHistory.belongsTo(Employee, { foreignKey: 'employee_id' });
ProfileEditHistory.belongsTo(User, { foreignKey: 'edited_by', as: 'Editor' });

module.exports = ProfileEditHistory;
