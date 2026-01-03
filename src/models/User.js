const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'HR', 'EMPLOYEE'),
        allowNull: false,
        defaultValue: 'EMPLOYEE'
    },
    is_email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_first_login: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    employee_id: {
        type: DataTypes.STRING,
        references: {
            model: Employee,
            key: 'id'
        },
        allowNull: true // Admin might not be an employee? Or yes. Let's say all users are employees, but maybe Super Admin is special. I'll make it nullable for safety.
    }
}, {
    timestamps: true,
    tableName: 'users'
});

User.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasOne(User, { foreignKey: 'employee_id' });

module.exports = User;
