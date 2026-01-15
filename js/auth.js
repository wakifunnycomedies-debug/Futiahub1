// Toggle Password Visibility
const togglePassword = document.querySelector('#togglePassword');
const password = document.querySelector('#password');

togglePassword.addEventListener('click', function () {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    // Toggle icon
    this.classList.toggle('fa-eye-slash');
});

// Handle Sign Up
const signupForm = document.querySelector('#signup-form');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    const fullName = document.querySelector('#full-name').value;
    const nickname = document.querySelector('#nickname').value;

    // 1. Sign up user in Supabase Auth
    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert(error.message);
    } else {
        // 2. Insert extra details into our public 'profiles' table
        const { error: profileError } = await _supabase
            .from('profiles')
            .insert([
                { id: data.user.id, full_name: fullName, nickname: nickname, email: email }
            ]);

        if (profileError) {
            alert("Profile error: " + profileError.message);
        } else {
            alert("Registration successful! Redirecting to setup...");
            window.location.href = "setup-profile.html";
        }
    }
});

// --- SIGNUP LOGIC ---

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('full-name').value;
        const nickname = document.getElementById('nickname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');

        // 1. Show Spinner & Disable Button
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Joining...`;

        try {
            // 2. Supabase Signup
            const { data, error } = await _supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        nickname: nickname
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // 3. Create the profile in the 'profiles' table automatically
                const { error: profileError } = await _supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: data.user.id, 
                            full_name: fullName, 
                            nickname: nickname 
                        }
                    ]);

                if (profileError) throw profileError;

                alert("Signup successful! Please check your email for a confirmation link.");
                window.location.href = 'index.html'; // Redirect to login
            }

        } catch (err) {
            console.error("Signup Error:", err.message);
            // Handle the 429 error specifically in the alert
            if (err.message.includes("429")) {
                alert("Too many requests! Please wait about 15 minutes before trying again.");
            } else {
                alert("Signup failed: " + err.message);
            }
        } finally {
            // 4. Restore Button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// --- PASSWORD TOGGLE ---

const passwordField = document.getElementById('password');

if (togglePassword && passwordField) {
    togglePassword.addEventListener('click', function () {
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        this.classList.toggle('fa-eye-slash');
    });
}