document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Side Menu
    const openBtn = document.getElementById('open-menu');
    const closeBtn = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    openBtn.onclick = () => { sideMenu.classList.add('active'); overlay.classList.add('active'); };
    closeBtn.onclick = () => { sideMenu.classList.remove('active'); overlay.classList.remove('active'); };
    overlay.onclick = () => { sideMenu.classList.remove('active'); overlay.classList.remove('active'); };

    // 2. Load Notifications
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) loadNotifications(user.id);
});

async function loadNotifications(userId) {
    const list = document.getElementById('notifications-list');
    
    // Fetch user's department first for departmental alerts
    const { data: currentUser } = await _supabase
        .from('profiles')
        .select('department')
        .eq('id', userId)
        .single();

    // Fetch notifications
    const { data: notifications, error } = await _supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        list.innerHTML = `<p style="text-align:center">Error loading notifications</p>`;
        return;
    }

    if (!notifications || notifications.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 50px 20px;">
                <i class="fas fa-bell-slash" style="font-size: 3rem; color: #ccc;"></i>
                <p style="margin-top:15px; color: var(--text-sub);">All quiet for now!</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${notif.is_read ? '' : 'unread'}`;
        
        let message = "";
        let icon = "";

        // Logic for different notification types
        switch(notif.type) {
            case 'comment':
                message = `<b>${notif.sender_name}</b> commented on your post.`;
                icon = '<i class="fas fa-comment"></i>';
                break;
            case 'like':
                message = `<b>${notif.sender_name}</b> liked your update.`;
                icon = '<i class="fas fa-heart"></i>';
                break;
            case 'new_student':
                message = `<b>${notif.sender_name}</b> from your department just joined the site!`;
                icon = '<i class="fas fa-user-plus"></i>';
                break;
            case 'pdf_upload':
                message = `<b>${notif.sender_name}</b> uploaded a new PDF file.`;
                icon = '<i class="fas fa-file-pdf"></i>';
                break;
            case 'photo_update':
                message = `<b>${notif.sender_name}</b> updated their profile photo.`;
                icon = '<i class="fas fa-image"></i>';
                break;
        }

        item.innerHTML = `
            <img src="${notif.sender_avatar}" class="notif-avatar">
            <div class="notif-content">
                <p>${message}</p>
                <span class="notif-time">${timeAgo(notif.created_at)}</span>
            </div>
            <div class="notif-icon">${icon}</div>
        `;

        item.onclick = () => markAsRead(notif.id);
        list.appendChild(item);
    });
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

async function markAsRead(id) {
    await _supabase.from('notifications').update({ is_read: true }).eq('id', id);
    // Add logic here to navigate to the specific post/profile if needed
}

let allNotifications = []; // Global store for filtering

document.addEventListener('DOMContentLoaded', async () => {
    // Menu Logic (Fixed)
    const openBtn = document.getElementById('open-menu');
    const closeBtn = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    if(openBtn) openBtn.onclick = () => { sideMenu.classList.add('active'); overlay.classList.add('active'); };
    if(closeBtn) closeBtn.onclick = () => { sideMenu.classList.remove('active'); overlay.classList.remove('active'); };
    
    // Initial Load
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        // Get user's department first
        const { data: profile } = await _supabase
            .from('profiles')
            .select('department')
            .eq('id', user.id)
            .single();
            
        loadNotifications(user.id, profile?.department);
    }
});

async function loadNotifications(userId, userDept) {
    const list = document.getElementById('notifications-list');
    
    const { data, error } = await _supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    allNotifications = data; // Store for filtering
    renderNotifications(allNotifications);

    // Setup Filter Chips
    const filters = document.querySelectorAll('.filter-chip');
    filters.forEach(chip => {
        chip.onclick = (e) => {
            filters.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            
            if(e.target.innerText === 'Department') {
                const filtered = allNotifications.filter(n => n.department === userDept || n.type === 'new_student');
                renderNotifications(filtered);
            } else {
                renderNotifications(allNotifications);
            }
        };
    });
}

function renderNotifications(data) {
    const list = document.getElementById('notifications-list');
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = `<p style="text-align:center; padding:20px;">No notifications found.</p>`;
        return;
    }

    data.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${notif.is_read ? '' : 'unread'} ${notif.type === 'new_student' ? 'dept-alert' : ''}`;
        
        item.innerHTML = `
            <img src="${notif.sender_avatar || 'https://via.placeholder.com/50'}" class="notif-avatar">
            <div class="notif-content">
                <p>${getNotifMessage(notif)}</p>
                <span class="notif-time">${timeAgo(notif.created_at)}</span>
            </div>
        `;
        list.appendChild(item);
    });
}

function getNotifMessage(n) {
    switch(n.type) {
        case 'new_student': return `<b>${n.sender_name}</b> from your department just joined!`;
        case 'pdf_upload': return `<b>${n.sender_name}</b> shared a new PDF in ${n.department}.`;
        case 'comment': return `<b>${n.sender_name}</b> commented on your post.`;
        default: return `<b>${n.sender_name}</b> sent an update.`;
    }
}