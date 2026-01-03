const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        if (!['ADMIN', 'HR'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        // Fetch unread notifications for ADMIN or HR
        const notifications = await Notification.findAll({
            where: {
                recipient_role: ['ADMIN', 'HR'], // Simplified: fetch shared notifications
                is_read: false
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.clearAll = async (req, res) => {
    try {
        if (!['ADMIN', 'HR'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        // Mark all as read (or delete)
        await Notification.update({ is_read: true }, {
            where: {
                recipient_role: ['ADMIN', 'HR'],
                is_read: false
            }
        });

        res.json({ message: 'Notifications cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createNotification = async (type, message, role = 'ADMIN', entityId = null, entityType = null) => {
    try {
        await Notification.create({
            type,
            message,
            recipient_role: role,
            entity_id: entityId,
            entity_type: entityType
        });
    } catch (e) {
        console.error('Notification Creation Failed:', e);
    }
};
