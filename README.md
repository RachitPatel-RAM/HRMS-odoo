# 🏢 Odoo HRMS - Human Resource Management System

A comprehensive, production-ready HRMS built with Node.js, Express, MySQL, and modern web technologies. This system provides complete employee management, attendance tracking, leave management, and HR administration capabilities.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0%2B-orange.svg)

---

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### 👤 User Management
- **Multi-role system**: Admin, HR, and Employee roles
- **Secure authentication**: JWT-based with bcrypt password hashing
- **Profile management**: Upload profile pictures, update personal information
- **Role-based access control**: Different permissions for each role

### 📊 Attendance Management
- **Check-in/Check-out**: Real-time attendance tracking
- **Multi-session support**: Multiple check-ins per day
- **Extra hours tracking**: Request and track overtime
- **Weekly attendance reports**: Admin view with detailed spreadsheet

### 🏖️ Leave Management
- **Leave requests**: Paid time off, sick leave, unpaid leave, maternity leave
- **Approval workflow**: HR/Admin can approve or reject requests
- **Leave balance tracking**: Automatic calculation of remaining days
- **Email notifications**: Automated emails for approvals/rejections

### 👥 HR Administration
- **Employee onboarding**: Create and manage employee records
- **HR account creation**: Admin can create HR manager accounts
- **Department management**: Organize employees by department
- **Salary information**: View and manage employee compensation

### 📧 Communication
- **Email integration**: Nodemailer for automated notifications
- **Password reset**: OTP-based password recovery
- **Welcome emails**: Automated onboarding communications

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js (v16+)
- **Framework**: Express.js v5.2.1
- **Database**: MySQL 8.0+
- **ORM**: Sequelize v6.37.7
- **Authentication**: JWT (jsonwebtoken v9.0.3)
- **Password Hashing**: bcryptjs v3.0.3
- **Email**: Nodemailer v7.0.12
- **File Upload**: Multer v2.0.2
- **Cloud Storage**: Cloudinary v2.8.0

### Frontend
- **HTML5**: Semantic markup
- **CSS**: Tailwind CSS v4.1.18
- **JavaScript**: Vanilla ES6+
- **Icons**: Material Icons Outlined
- **Fonts**: Gochi Hand (custom handwritten style)

### Security & Utilities
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: express-rate-limit
- **Validation**: Joi v18.0.2
- **Logging**: Winston v3.19.0
- **Environment Variables**: dotenv v17.2.3

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16.0.0 or higher ([Download](https://nodejs.org/))
- **MySQL**: v8.0 or higher ([Download](https://dev.mysql.com/downloads/))
- **npm**: v7.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository ([Download](https://git-scm.com/))

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/RachitPatel-RAM/HRMS-odoo.git
cd HRMS-odoo
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`.

---

## ⚙️ Configuration

### 1. Create Environment File

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=hrms_db

# JWT Secret (change this to a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 2. Email Setup (Gmail)

To enable email notifications:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
4. Use the generated password in `EMAIL_PASS`

### 3. Cloudinary Setup (Optional)

For profile picture uploads:

1. Create a free account at [Cloudinary](https://cloudinary.com/)
2. Get your credentials from the dashboard
3. Add them to your `.env` file

---

## 🗄️ Database Setup

### 1. Create MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE hrms_db;

# Exit MySQL
exit;
```

### 2. Run Database Migrations

The application uses Sequelize ORM with auto-sync enabled. Tables will be created automatically on first run.

```bash
# Sync database schema
node src/scripts/sync_db.js
```

### 3. Seed Admin Account

Create the default admin account:

```bash
npm run seed
```

This creates:
- **Email**: `admin@hrms.com`
- **Password**: `Admin@123`
- **Role**: ADMIN

---

## 🏃 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Mode

```bash
npm start
```

### Build Tailwind CSS (if needed)

```bash
npm run build:css
```

---

## 🔐 Default Credentials

### Super Admin Account
```
Email: admin@hrms.com
Password: Admin@123
Role: ADMIN
```

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

### Creating Additional Accounts

#### HR Manager Account
1. Login as Admin
2. Navigate to "HR Management"
3. Enter HR email address
4. System generates credentials and sends email

#### Employee Account
1. HR/Admin creates employee record
2. System sends signup invitation email
3. Employee completes registration via email link

---

## 📁 Project Structure

```
HRMS_odoo/
├── public/                      # Frontend files
│   ├── admin-dashboard.html     # Admin employee management
│   ├── admin_attendance.html    # Admin attendance view
│   ├── admin_timeoff.html       # Leave approval interface
│   ├── admin_hr_management.html # HR account creation
│   ├── admin_profile.html       # Admin/HR profile page
│   ├── dashboard.html           # Employee dashboard
│   ├── attendance.html          # Employee attendance view
│   ├── timeoff.html             # Employee leave requests
│   ├── profile.html             # Employee profile page
│   ├── login.html               # Login page
│   ├── css/                     # Compiled CSS
│   ├── js/                      # Frontend JavaScript
│   └── assets/                  # Images and static files
│
├── src/
│   ├── config/
│   │   └── db.js                # Database connection
│   ├── controllers/             # Request handlers
│   │   ├── authController.js    # Authentication logic
│   │   ├── attendanceController.js
│   │   ├── leaveController.js
│   │   ├── profileController.js
│   │   └── employeeController.js
│   ├── models/                  # Sequelize models
│   │   ├── User.js              # User accounts
│   │   ├── Employee.js          # Employee details
│   │   ├── Attendance.js        # Attendance records
│   │   ├── Leave.js             # Leave requests
│   │   ├── Company.js
│   │   └── SalaryDetails.js
│   ├── services/                # Business logic
│   │   ├── authService.js
│   │   ├── attendanceService.js
│   │   └── leaveService.js
│   ├── middleware/              # Express middleware
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── uploadMiddleware.js  # File upload handling
│   ├── routes/                  # API routes
│   │   ├── api.js               # Main API router
│   │   ├── authRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── leaveRoutes.js
│   │   └── profileRoutes.js
│   ├── scripts/                 # Utility scripts
│   │   ├── seed_admin.js        # Create admin account
│   │   ├── sync_db.js           # Sync database schema
│   │   └── fix_db_schema.js     # Schema fixes
│   ├── utils/                   # Helper functions
│   │   └── storageService.js    # Cloudinary integration
│   └── server.js                # Application entry point
│
├── .env                         # Environment variables (create this)
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind configuration
└── README.md                    # This file
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login              # Login with email/employee ID
POST   /api/auth/create-hr          # Create HR account (Admin only)
POST   /api/auth/change-password    # Change password
POST   /api/auth/send-otp           # Request password reset OTP
POST   /api/auth/reset-password     # Reset password with OTP
GET    /api/auth/me                 # Get current user info
```

### Attendance
```
GET    /api/attendance/my           # Get my attendance records
POST   /api/attendance/check-in     # Check in
POST   /api/attendance/check-out    # Check out
POST   /api/attendance/extra-time   # Request extra hours
GET    /api/attendance/admin/weekly # Admin: Weekly attendance (all employees)
```

### Leave Management
```
GET    /api/leaves/my               # Get my leave requests
GET    /api/leaves/balances         # Get leave balances
POST   /api/leaves/request          # Submit leave request
GET    /api/leaves/admin/all        # Admin: All leave requests
PUT    /api/leaves/admin/:id/approve  # Admin: Approve leave
PUT    /api/leaves/admin/:id/reject   # Admin: Reject leave
```

### Profile
```
GET    /api/profile/me              # Get my profile
PUT    /api/profile/me              # Update my profile
POST   /api/profile/avatar          # Upload profile picture
```

### Dashboard
```
GET    /api/dashboard               # Get dashboard data
```

---

## 🎨 UI Features

- **Hand-drawn aesthetic**: Unique Gochi Hand font with sketch-style borders
- **Responsive design**: Works on desktop, tablet, and mobile
- **Dark mode ready**: Prepared for theme switching
- **Material Icons**: Modern iconography
- **Smooth animations**: Hover effects and transitions
- **Toast notifications**: User-friendly feedback messages

---

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent brute force attacks
- **Helmet**: Security headers
- **CORS**: Controlled cross-origin access
- **Input Validation**: Joi schema validation
- **SQL Injection Protection**: Sequelize ORM parameterized queries

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env file
# Ensure DB_NAME database exists
```

### Port Already in Use
```bash
# Change PORT in .env file
# Or kill process using port 3000
```

### Email Not Sending
```bash
# Verify EMAIL_USER and EMAIL_PASS in .env
# Ensure Gmail App Password is correct
# Check 2FA is enabled on Google account
```

### Profile Pictures Not Uploading
```bash
# Verify Cloudinary credentials in .env
# Check file size (max 5MB)
# Ensure file is an image type
```

---

## 📝 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed       # Create admin account
npm run build:css  # Compile Tailwind CSS
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Rachit Patel**
- GitHub: [@RachitPatel-RAM](https://github.com/RachitPatel-RAM)
- Repository: [HRMS-odoo](https://github.com/RachitPatel-RAM/HRMS-odoo)

---

## 🙏 Acknowledgments

- Tailwind CSS for the styling framework
- Material Icons for the icon set
- Sequelize for the excellent ORM
- Express.js community for the robust framework

---

## 📞 Support

For support, email rampateluni@gmail.com or open an issue in the GitHub repository.

---

**© 2026 odoo HRMS - All Right Reserved.**
