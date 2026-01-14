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