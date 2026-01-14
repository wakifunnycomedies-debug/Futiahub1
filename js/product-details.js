document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    if (!postId) {
        window.location.href = 'home.html';
        return;
    }

    // Load initial data
    fetchPostAndComments(postId);

    // Setup Submit Button
    const submitBtn = document.getElementById('submit-comment');
    if (submitBtn) {
        submitBtn.onclick = () => submitComment(postId);
    }
});

async function fetchPostAndComments(postId) {
    try {
        // 1. Fetch Post Details
        const { data: post, error: postError } = await _supabase
            .from('posts')
            .select(`*, profiles!user_id (full_name, avatar_url)`)
            .eq('id', postId)
            .single();

        if (postError) throw postError;
        renderMainPost(post);

        // 2. Fetch Comments
        const { data: comments, error: commError } = await _supabase
            .from('comments')
            .select(`*, profiles!user_id (full_name, avatar_url)`)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (commError) throw commError;
        renderComments(comments);

    } catch (err) {
        console.error("Error:", err.message);
    }
}

function renderMainPost(post) {
    const container = document.getElementById('post-detail-container');
    const userImg = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name)}`;
    
    container.innerHTML = `
        <div class="post-card detail-view">
            <div class="post-header">
                <img src="${userImg}" class="user-avatar">
                <div class="user-info">
                    <strong>${post.profiles?.full_name}</strong>
                    <span>${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="post-body">
                <p class="post-content-text">${post.content}</p>
                ${post.media_url ? `<img src="${post.media_url}" class="post-img">` : ''}
            </div>
        </div>
    `;
}

function renderComments(comments) {
    const list = document.getElementById('comment-list');
    list.innerHTML = '';

    if (comments.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No comments yet.</p>';
        return;
    }

    comments.forEach(comment => {
        const userImg = comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.full_name)}`;
        list.innerHTML += `
            <div class="comment-item" style="display:flex; gap:10px; padding:10px 15px;">
                <img src="${userImg}" class="comment-avatar" style="width:35px; height:35px; border-radius:50%;">
                <div class="comment-bubble" style="background:#f0f2f5; padding:8px 12px; border-radius:15px; flex:1;">
                    <strong style="font-size:0.8rem; display:block;">${comment.profiles?.full_name}</strong>
                    <p style="margin:0; font-size:0.9rem;">${comment.content}</p>
                </div>
            </div>
        `;
    });
}

async function submitComment(postId) {
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        const { error } = await _supabase.from('comments').insert([
            { post_id: postId, user_id: user.id, content: text }
        ]);

        if (error) throw error;
        input.value = '';
        fetchPostAndComments(postId); // Refresh
    } catch (err) {
        alert(err.message);
    }
}