// --- NEW ACTION LOGIC ---
window.editPost = async (id) => {
    const newContent = prompt("Edit your post:");
    if (!newContent) return;
    const { error } = await _supabase.from('posts').update({ content: newContent }).eq('id', id);
    if (!error) location.reload();
};

window.shareToWhatsApp = (id, content) => {
    const text = encodeURIComponent(`Check out this update on FUTIAHub: ${content}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};

document.getElementById('invite-friend').onclick = () => {
    const text = "Join me on FUTIAHub! The ultimate student hub: https://futiahub.com";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
};

window.openComments = (id) => {
    // Basic redirect to a post detail page or an alert for now
    alert("Comments feature: Opening post #" + id);
};

const setupMenu = () => {
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    if (!sideMenu || !overlay || !openMenuBtn) return;

    openMenuBtn.onclick = (e) => {
        e.preventDefault();
        sideMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop page scrolling when menu is open
    };

    const close = () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    };

    if (closeMenuBtn) closeMenuBtn.onclick = close;
    overlay.onclick = close;
};

let selectedPhotos = [];
let page = 0;
const postsPerPage = 5;

// --- 1. UTILITY: TIME FORMATTER ---
function formatTime(dateString) {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return postDate.toLocaleDateString();
}

// --- 2. MODAL LOGIC ---
window.openModal = (id) => {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeModal = (id) => {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = 'auto';
    if (id === 'photo-modal') {
        document.getElementById('preview-container').innerHTML = '';
        document.getElementById('post-caption').value = '';
        selectedPhotos = [];
    }
};

// --- 3. FEED LOGIC ---
async function fetchFeed() {
    const feedContainer = document.getElementById('main-feed');
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        const { data: posts, error } = await _supabase
            .from('posts')
            .select(`*, profiles!user_id (id, full_name, avatar_url)`)
            .order('created_at', { ascending: false })
            .range(page * postsPerPage, (page + 1) * postsPerPage - 1);

        if (error) throw error;
        if (page === 0) feedContainer.innerHTML = '';

        if (posts && posts.length > 0) {
            posts.forEach((post, index) => {
                renderPost(post, user?.id);
                if ((page * postsPerPage + index + 1) % 5 === 0) renderMarketplaceSuggestions();
            });
            page++;
        }
    } catch (err) {
        console.error("Feed Error:", err.message);
    }
}

function renderPost(post, currentUserId) {
    const feed = document.getElementById('main-feed');
    const isOwner = currentUserId === post.user_id;
    const profile = post.profiles;
    // Default fallback to a standard user icon if no photo exists
    const userImg = profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile?.full_name || 'User') + '&background=random';

    const html = `
        <div class="post-card" id="post-${post.id}">
            <div class="post-header">
                <div class="user-meta" onclick="window.location.href='profile.html?id=${post.user_id}'">
                    <img src="${userImg}" class="user-avatar">
                    <div class="user-info">
                        <strong>${profile?.full_name || 'FUTIA Student'}</strong>
                        <span>${formatTime(post.created_at)}</span>
                    </div>
                </div>
                <div class="post-menu-container">
                    <i class="fas fa-ellipsis-v post-menu-trigger" onclick="togglePostMenu(${post.id})"></i>
                    <div class="post-options-dropdown" id="menu-${post.id}">
                        ${isOwner ? `
                            <button onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deletePost(${post.id})" class="delete-opt"><i class="fas fa-trash"></i> Delete</button>
                        ` : `
                            <button onclick="reportPost(${post.id})"><i class="fas fa-flag"></i> Report</button>
                        `}
                    </div>
                </div>
            </div>
            <div class="post-body">
                <p class="post-content-text">${post.content}</p>
                ${post.media_url ? `<img src="${post.media_url}" class="post-img" onclick="viewFullImage('${post.media_url}')">` : ''}
            </div>
            <div class="post-footer">
                <button onclick="openComments(${post.id})"><i class="fas fa-comment"></i> 0</button>
                <button onclick="shareToWhatsApp(${post.id}, '${post.content.substring(0, 50)}')"><i class="fab fa-whatsapp"></i> Share</button>
            </div>
        </div>
    `;
    feed.insertAdjacentHTML('beforeend', html);
}

// --- 4. POST SUBMISSION (THE FIX) ---
async function submitPost() {
    const btn = document.getElementById('submit-post');
    const caption = document.getElementById('post-caption').value;
    
    if (!caption && selectedPhotos.length === 0) return alert("Please add content!");

    btn.disabled = true;
    btn.innerHTML = 'Posting...';

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        let mediaUrl = null;

        if (selectedPhotos.length > 0) {
            const file = selectedPhotos[0];
            const path = `posts/${user.id}/${Date.now()}_${file.name}`;
            const { error: upError } = await _supabase.storage.from('posts').upload(path, file);
            if (upError) throw upError;
            const { data: { publicUrl } } = _supabase.storage.from('posts').getPublicUrl(path);
            mediaUrl = publicUrl;
        }

        const { error: dbError } = await _supabase.from('posts').insert([{
            user_id: user.id,
            content: caption,
            media_url: mediaUrl,
            post_type: 'photo'
        }]);

        if (dbError) throw dbError;
        location.reload();
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerHTML = 'Post';
    }
}

// --- 5. POST ACTIONS ---
window.togglePostMenu = (id) => {
    document.querySelectorAll('.post-options-dropdown').forEach(m => {
        if(m.id !== `menu-${id}`) m.classList.remove('active');
    });
    document.getElementById(`menu-${id}`).classList.toggle('active');
};

window.deletePost = async (id) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
        const { error } = await _supabase
            .from('posts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // --- THE FIX: Visual Removal ---
        const postElement = document.getElementById(`post-${id}`);
        if (postElement) {
            postElement.style.opacity = '0';
            postElement.style.transform = 'scale(0.9)';
            postElement.style.transition = '0.3s ease';
            
            setTimeout(() => {
                postElement.remove();
                // If feed is empty after delete, show the empty message
                if (document.querySelectorAll('.post-card').length === 0) {
                    document.getElementById('main-feed').innerHTML = '<p class="empty-msg">No updates yet.</p>';
                }
            }, 300);
        }

    } catch (err) {
        console.error("Delete Error:", err.message);
        alert("Could not delete post. You might not have permission.");
    }
};

window.openComments = (id) => {
    // Redirecting to a dedicated post page (you'll need to create post-details.html)
    window.location.href = `post-details.html?id=${id}`;
};

window.viewFullImage = (url) => {
    window.open(url, '_blank');
};


// --- 6. CLEAN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Setup side menu
    setupMenu();
    
    // 2. Get User & Verify Profile
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        // Ensure profile exists in DB
        const { data: profile } = await _supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            await _supabase.from('profiles').insert([
                { id: user.id, full_name: user.user_metadata.full_name || 'FUTIA Student' }
            ]);
        }
    } else {
        window.location.href = 'index.html'; // Redirect if not logged in
        return;
    }

    // 3. LOAD FEED ONCE
    // Removed the extra fetchFeed() calls that were causing duplicates
    fetchFeed();

    // 4. Global Click Listener for dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('post-menu-trigger')) {
            document.querySelectorAll('.post-options-dropdown').forEach(m => m.classList.remove('active'));
        }
    });

    // 5. Button Listeners (Assigned once)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
        };
    }

    const submitBtn = document.getElementById('submit-post');
    if (submitBtn) {
        submitBtn.onclick = null; // Clear any old listeners
        submitBtn.onclick = submitPost;
    }

    const postPhotoInput = document.getElementById('post-photo');
    if (postPhotoInput) {
        postPhotoInput.onchange = (e) => {
            const container = document.getElementById('preview-container');
            const files = Array.from(e.target.files);
            container.innerHTML = ''; // Clear previous previews
            selectedPhotos = []; // Reset selection
            files.forEach(file => {
                selectedPhotos.push(file);
                const reader = new FileReader();
                reader.onload = (ex) => {
                    container.innerHTML += `<img src="${ex.target.result}" class="preview-img">`;
                };
                reader.readAsDataURL(file);
            });
        };
    }
});

    fetchFeed();
    
    // --- LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        const { error } = await _supabase.auth.signOut();
        if (error) alert(error.message);
        else window.location.href = 'index.html'; // Redirect to login/landing
    };
}

// --- PROFILE CHECK ---
const checkUserProfile = async (user) => {
    const { data: profile } = await _supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        console.warn("Profile missing! Creating a temporary one...");
        await _supabase.from('profiles').insert([
            { id: user.id, full_name: user.user_metadata.full_name || 'FUTIA Student' }
        ]);
    }
};

// Call this inside your initialization
_supabase.auth.getUser().then(({data}) => {
    if (data.user) checkUserProfile(data.user);
});

    const submitBtn = document.getElementById('submit-post');
    if (submitBtn) submitBtn.onclick = submitPost;

    const postPhotoInput = document.getElementById('post-photo');
    if (postPhotoInput) {
        postPhotoInput.onchange = (e) => {
            const container = document.getElementById('preview-container');
            const files = Array.from(e.target.files);
            files.forEach(file => {
                selectedPhotos.push(file);
                const reader = new FileReader();
                reader.onload = (ex) => {
                    container.innerHTML += `<img src="${ex.target.result}" class="preview-img">`;
                };
                reader.readAsDataURL(file);
            });
        };
    }


async function fetchUserPosts(userId) {
    const feed = document.getElementById('user-posts-feed');
    
    try {
        // Get the logged-in user to check ownership
        const { data: { user: currentUser } } = await _supabase.auth.getUser();
        const isOwner = currentUser && currentUser.id === userId;

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


async function fetchUserListings(userId) {
    const feed = document.getElementById('user-posts-feed');
    feed.innerHTML = '<p class="loading-text">Loading listings...</p>';

    try {
        const { data: { user: currentUser } } = await _supabase.auth.getUser();
        const isOwner = currentUser && currentUser.id === userId;

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
                        ${isOwner ? `
                            <div class="action-btns">
                                ${item.status !== 'sold' ? `<button onclick="markAsSold(${item.id})" class="btn-sold">Mark Sold</button>` : ''}
                                <button onclick="deleteListing(${item.id})" class="btn-delete-post"><i class="fas fa-trash"></i></button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            feed.appendChild(itemEl);
        });
    } catch (err) {
        console.error("Listing error:", err);
    }
}