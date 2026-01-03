const sequelize = require('../config/db');

const fix = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connection OK');

        const [results] = await sequelize.query("SHOW COLUMNS FROM employees LIKE 'email'");
        if (results.length === 0) {
            console.log('Column email missing. Adding...');
            await sequelize.query("ALTER TABLE employees ADD COLUMN email VARCHAR(255) UNIQUE");
            console.log('Column email added.');
        } else {
            console.log('Column email already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fix();
