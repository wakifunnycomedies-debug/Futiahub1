document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get ID from URL (?id=...)
    const params = new URLSearchParams(window.location.search);
    const viewedUserId = params.get('id'); 

    // 2. Get the currently logged-in user from Supabase
    const { data: { user: loggedInUser } } = await _supabase.auth.getUser();
    
    // 3. Decide which ID to load: The one from the URL OR the logged-in user
    const targetId = viewedUserId || loggedInUser?.id;

    if (targetId) {
        // We call loadProfile (which already exists in your code)
        loadProfile(targetId);
        fetchUserPosts(targetId);
    } else {
        // if no user is found at all, go back to login
        window.location.href = 'index.html';
    }
});

// --- SIDE MENU ---
const openMenuBtn = document.getElementById('open-menu');
const closeMenuBtn = document.getElementById('close-menu');
const sideMenu = document.getElementById('side-menu');
const overlay = document.getElementById('menu-overlay');

const toggleSideMenu = (show) => {
    sideMenu.classList.toggle('active', show);
    overlay.classList.toggle('active', show);
};

if(openMenuBtn) openMenuBtn.onclick = () => toggleSideMenu(true);
if(closeMenuBtn) closeMenuBtn.onclick = () => toggleSideMenu(false);
if(overlay) overlay.onclick = () => toggleSideMenu(false);

// --- PHOTO PREVIEW LOGIC ---
// This makes the image change instantly when you select a file
const avatarInput = document.getElementById('new-avatar');
const avatarPreview = document.getElementById('avatar-preview');

if (avatarInput) {
    avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                avatarPreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- UPDATED LOAD PROFILE ---
async function loadProfile(userId) {
    try {
        const { data: { user: authUser } } = await _supabase.auth.getUser();
        
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (profile) { 
            // --- EDIT BUTTON VISIBILITY LOGIC ---
            const editBtn = document.getElementById('edit-profile-btn');
            if (editBtn && authUser) {
                // Only show Edit button if the ID in the URL matches your own ID
                editBtn.style.display = (authUser.id === userId) ? 'block' : 'none';
            }
            currentAvatarUrl = profile.avatar_url;

            // 1. VISIBILITY LOGIC: Hide "Message Me" if it's the owner
            const whatsappBtn = document.getElementById('whatsapp-link');
            if (authUser && authUser.id === userId) {
                whatsappBtn.style.display = 'none'; // Owner: Hide button
            } else if (profile.whatsapp_number) {
                whatsappBtn.style.display = 'inline-flex'; // Guest: Show button
                whatsappBtn.href = `https://wa.me/${profile.whatsapp_number}`;
            } else {
                whatsappBtn.style.display = 'none'; // No number: Hide button
            }

            // 2. DISPLAY DATA
            document.getElementById('display-avatar').src = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.nickname}`;
            document.getElementById('display-fullname').innerText = profile.full_name || "FUTIA Student";
            document.getElementById('display-nickname').innerText = `@${profile.nickname || 'user'}`;
            document.getElementById('display-bio').innerText = profile.bio || "Student at FUTIA";
            document.getElementById('display-dept').innerText = profile.department || "Not Set";
            document.getElementById('display-level').innerText = profile.level ? `${profile.level} Level` : "Not Set";
            document.getElementById('display-status').innerText = profile.relationship_status || "Single";


            // --- ADD THIS TO profile.js inside loadProfile() ---
const hobbiesContainer = document.getElementById('display-hobbies');
if (hobbiesContainer && profile.hobbies) {
    // Splits "Coding, Music" into ["Coding", "Music"] and creates span tags
    const hobbyList = profile.hobbies.split(',').map(h => h.trim());
    hobbiesContainer.innerHTML = hobbyList.map(h => `<span class="hobby-tag">${h}</span>`).join('');
} else if (hobbiesContainer) {
    hobbiesContainer.innerText = "No hobbies listed";
}
            
            // Date parsing
            const joinedDate = profile.created_at ? new Date(profile.created_at) : new Date();
            document.getElementById('display-joined').innerText = joinedDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            // Form Pre-fill
            document.getElementById('edit-fullname').value = profile.full_name || "";
            document.getElementById('edit-nickname').value = profile.nickname || "";
            document.getElementById('edit-bio').value = profile.bio || "";
            document.getElementById('edit-status').value = profile.relationship_status || "Single";
            document.getElementById('edit-hobbies').value = profile.hobbies || "";
            document.getElementById('avatar-preview').src = document.getElementById('display-avatar').src;
        }
    } catch (err) {
        console.error("Profile Load Error:", err);
    }
}

// --- SAVE UPDATES ---
document.getElementById('save-profile').onclick = async () => {
    const btn = document.getElementById('save-profile');
    const spinner = btn.querySelector('.spinner');
    btn.disabled = true;
    spinner.classList.remove('hidden');

    try {
        const user = (await _supabase.auth.getUser()).data.user;
        const newFile = document.getElementById('new-avatar').files[0];
        let finalUrl = currentAvatarUrl;

        // Photo Upload Logic
        if (newFile) {
            const path = `avatars/${user.id}_${Date.now()}.jpg`;
            await _supabase.storage.from('avatars').upload(path, newFile);
            finalUrl = _supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        }

        // DB Update
        const { error } = await _supabase.from('profiles').update({
            full_name: document.getElementById('edit-fullname').value,
            nickname: document.getElementById('edit-nickname').value,
            bio: document.getElementById('edit-bio').value,
            relationship_status: document.getElementById('edit-status').value,
            hobbies: document.getElementById('edit-hobbies').value,
            avatar_url: finalUrl,
            whatsapp_number: document.getElementById('edit-whatsapp').value
        }).eq('id', user.id);

        if (error) throw error;
        location.reload();
    } catch (err) {
        alert("Update failed: " + err.message);
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
    }
};


function toggleEditForm() {
    document.getElementById('edit-profile-section').classList.toggle('active');
}
async function fetchUserPosts(userId) {
    const feed = document.getElementById('user-posts-feed');
    try {
        // --- NEW: Check if the logged-in user is the one viewing their own profile ---
        const { data: { user: loggedInUser } } = await _supabase.auth.getUser();
        const isOwner = loggedInUser && loggedInUser.id === userId;

        const { data: posts, error } = await _supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!posts || posts.length === 0) {
            feed.innerHTML = '<div class="empty-state">No posts yet.</div>';
            return;
        }

        feed.innerHTML = ''; 
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'profile-post-item';
            
            postElement.innerHTML = `
                ${post.media_url ? `<img src="${post.media_url}" class="history-img">` : ''}
                <div class="history-content">
                    <p>${post.content}</p>
                    <div class="history-meta">
                        <span>${new Date(post.created_at).toLocaleDateString()}</span>
                        ${isOwner ? `
                            <button class="btn-delete-post" onclick="deletePost(${post.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            feed.appendChild(postElement);
        });
    } catch (err) {
        console.error("Error loading history:", err);
    }
}

window.switchTab = async (type) => {
    // 1. UI Update
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // 2. Identify the target user from the URL
    const params = new URLSearchParams(window.location.search);
    const viewedUserId = params.get('id');
    const { data: { user: loggedInUser } } = await _supabase.auth.getUser();
    
    // Use the ID from the URL, or default to self if no ID exists
    const targetId = viewedUserId || loggedInUser?.id;
    
    // 3. Load the correct data for THAT user
    if (type === 'posts') {
        fetchUserPosts(targetId);
    } else if (type === 'market') {
        fetchUserListings(targetId);
    }
};

async function fetchUserListings(userId) {
    const feed = document.getElementById('user-posts-feed');
    feed.innerHTML = '<p class="loading-text">Loading listings...</p>';

    try {
        // Check if the current viewer is the owner
        const { data: { user: loggedInUser } } = await _supabase.auth.getUser();
        const isOwner = loggedInUser && loggedInUser.id === userId;

        const { data: items, error } = await _supabase
            .from('marketplace')
            .select('*')
            .eq('seller_id', userId) 
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!items || items.length === 0) {
            feed.innerHTML = '<div class="empty-state">No products listed yet.</div>';
            return;
        }

        feed.innerHTML = ''; 
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'profile-post-item';
            const statusBadge = item.status === 'sold' ? '<span class="badge-sold">SOLD</span>' : '';

            itemEl.innerHTML = `
                <img src="${item.product_image}" class="history-img">
                <div class="history-content">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <h4>${item.product_name} ${statusBadge}</h4>
                        <b style="color:var(--forest-green)">₦${item.price.toLocaleString()}</b>
                    </div>
                    <div class="history-meta">
                        <span>${new Date(item.created_at).toLocaleDateString()}</span>
                        <div class="action-btns">
                            ${isOwner && item.status !== 'sold' ? `<button onclick="markAsSold(${item.id})" class="btn-sold">Mark Sold</button>` : ''}
                            ${isOwner ? `<button onclick="deleteListing(${item.id})" class="btn-delete-post"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                </div>
            `;
            feed.appendChild(itemEl);
        });
    } catch (err) {
        console.error("Listing error:", err);
    }
}