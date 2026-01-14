const photoInput = document.getElementById('profile-photo');
const previewContainer = document.getElementById('image-preview');
const setupForm = document.getElementById('setup-form');

// 1. Image Compression & Preview Logic
photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Compress image before preview
        const compressedFile = await compressImage(file, 0.7);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            previewContainer.innerHTML = `<img src="${event.target.result}" id="profile-img">`;
        };
        reader.readAsDataURL(compressedFile);
        
        // Store compressed file for upload
        window.selectedFile = compressedFile;
    }
});

// 2. Form Submission (FIXED VERSION)
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile');
    saveBtn.innerText = "Processing...";
    saveBtn.disabled = true;

    try {
        const user = (await _supabase.auth.getUser()).data.user;
        let avatarUrl = null;

        // Upload Photo if selected
        if (window.selectedFile) {
            const fileExt = window.selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            
            const { data, error: uploadError } = await _supabase.storage
                .from('avatars')
                .upload(fileName, window.selectedFile);

            if (uploadError) throw uploadError;

            // FIX: Get the actual PUBLIC URL to save in the database
            const { data: urlData } = _supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);
            
            avatarUrl = urlData.publicUrl;
        }

        // Update Profile Table
        const { error: updateError } = await _supabase
            .from('profiles')
            .update({
                department: document.getElementById('department').value,
                level: parseInt(document.getElementById('level').value),
                relationship_status: document.getElementById('relationship-status').value,
                bio: document.getElementById('bio').value,
                hobbies: document.getElementById('hobbies').value,
                avatar_url: avatarUrl // Now saving the full https:// link
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Trigger notifications
        const fullName = "FUTIA Student"; // Or get from an input if you have one
        notifyDepartmentPeers(user.id, fullName, avatarUrl, document.getElementById('department').value);

        window.location.href = "home.html";

    } catch (err) {
        alert("Error: " + err.message);
        saveBtn.innerText = "Save & Enter Hub";
        saveBtn.disabled = false;
    }
});
     

// Browser Compression Function
async function compressImage(file, quality) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const MAX_SIZE = 600; 
    let { width, height } = bitmap;

    if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
    } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    
    return new Promise(resolve => {
        canvas.toBlob(blob => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
    });
}

// Function to notify department peers
async function notifyDepartmentPeers(newStudentId, fullName, avatarUrl, department) {
    // 1. Find all students in the same department (excluding the new student)
    const { data: peers, error: fetchError } = await _supabase
        .from('profiles')
        .select('id')
        .eq('department', department)
        .neq('id', newStudentId);

    if (fetchError || !peers) return;

    // 2. Prepare notifications for all peers
    const notifications = peers.map(peer => ({
        receiver_id: peer.id,
        sender_id: newStudentId,
        sender_name: fullName,
        sender_avatar: avatarUrl,
        type: 'new_student',
        department: department,
        is_read: false
    }));

    // 3. Insert into notifications table
    const { error: insertError } = await _supabase
        .from('notifications')
        .insert(notifications);

    if (insertError) console.error("Error sending peer notifications:", insertError);
}