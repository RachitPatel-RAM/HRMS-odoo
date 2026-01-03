// Admin Notification Logic
document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role'); // Assuming role is stored or we can check via API
    // We can also infer from page if we are on admin pages.

    // Find the notification button container
    // It assumes the simpler structure we edited in employee_profile.html, 
    // but we need to target ALL admin pages which might have different DOMs.
    // However, the user request specifically mentioned "globally in admin/hr side".
    // We should try to find the button we just added or similar ones.

    setupNotificationDropdown();
    fetchNotifications();

    // Poll every 30 seconds
    setInterval(fetchNotifications, 30000);
});

async function fetchNotifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            updateNotificationUI(data);
        }
    } catch (e) {
        console.error('Failed to fetch notifications', e);
    }
}

function updateNotificationUI(notifications) {
    const btn = document.getElementById('notificationBtn');
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');

    if (!btn || !list) return; // UI elements not found

    // Update Badge
    if (notifications.length > 0) {
        if (!badge) {
            const newBadge = document.createElement('span');
            newBadge.id = 'notificationBadge';
            newBadge.className = 'absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full';
            newBadge.innerText = notifications.length;
            btn.appendChild(newBadge);
        } else {
            badge.innerText = notifications.length;
            badge.style.display = 'inline-flex';
        }
    } else {
        if (badge) badge.style.display = 'none';
    }

    // Update List
    if (notifications.length === 0) {
        list.innerHTML = '<li class="px-4 py-2 text-gray-500 text-sm">No new notifications</li>';
    } else {
        list.innerHTML = notifications.map(n => `
            <li class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <p class="text-sm font-semibold text-gray-800">${n.message}</p>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-gray-400">${new Date(n.createdAt).toLocaleTimeString()}</span>
                     <!-- Could add view link if entity_id present -->
                </div>
            </li>
        `).join('');
    }
}

function setupNotificationDropdown() {
    // Only setup if not already setup (to be safe)
    if (document.getElementById('notificationList')) return;

    // Use a selector that targets the button we added in employee_profile.html 
    // AND similar structures in other admin pages.
    // The button added was: <button class="p-2 rounded-full hover:bg-gray-100 transition-colors">
    // We should probably add an ID to that button in the HTML first to be robust.

    // For now, let's inject logic to FIND it or let the HTML include the script which does it.

    // Find button containing 'notifications' icon
    const buttons = Array.from(document.querySelectorAll('button'));
    const targetBtn = buttons.find(btn => btn.innerHTML.includes('notifications'));

    if (targetBtn) {
        targetBtn.id = 'notificationBtn';
        targetBtn.classList.add('relative'); // Ensure relative for badge

        // Create Dropdown Container
        const dropdown = document.createElement('div');
        dropdown.id = 'notificationDropdown';
        dropdown.className = 'absolute right-0 mt-2 w-80 bg-white border-2 border-black rounded-md shadow-hand opacity-0 invisible transition-all transform origin-top-right z-50';
        dropdown.innerHTML = `
            <div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-md">
                <h3 class="font-bold text-gray-700">Notifications</h3>
                <button onclick="clearNotifications()" class="text-xs text-red-600 hover:text-red-800 font-semibold uppercase tracking-wider">Clear All</button>
            </div>
            <ul id="notificationList" class="max-h-64 overflow-y-auto">
                 <li class="px-4 py-2 text-gray-500 text-sm">Loading...</li>
            </ul>
        `;

        targetBtn.parentElement.appendChild(dropdown);

        // Toggle Logic
        targetBtn.onclick = (e) => {
            e.stopPropagation();
            const d = document.getElementById('notificationDropdown');
            if (d.classList.contains('invisible')) {
                d.classList.remove('opacity-0', 'invisible');
            } else {
                d.classList.add('opacity-0', 'invisible');
            }
        };

        // Close on click outside
        document.addEventListener('click', (e) => {
            const d = document.getElementById('notificationDropdown');
            if (d && !targetBtn.contains(e.target) && !d.contains(e.target)) {
                d.classList.add('opacity-0', 'invisible');
            }
        });
    }
}

async function clearNotifications() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/notifications/clear', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchNotifications(); // Refresh to empty
        }
    } catch (e) { console.error(e); }
}
