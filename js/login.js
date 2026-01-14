// js/login.js

const loginForm = document.getElementById('login-form');
const togglePassword = document.querySelector('#togglePassword');
const passwordField = document.querySelector('#login-password');

// 1. Password Visibility Toggle
togglePassword.addEventListener('click', function () {
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
});

// 2. Login Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const spinner = document.getElementById('login-spinner');

    // UI Feedback
    btn.querySelector('span').classList.add('hidden');
    spinner.classList.remove('hidden');
    btn.disabled = true;

    // Supabase Sign In
    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Login failed: " + error.message);
        btn.querySelector('span').classList.remove('hidden');
        spinner.classList.add('hidden');
        btn.disabled = false;
    } else {
        // SUCCESS: Now check if profile setup is complete
        checkProfileStatus(data.user.id);
    }
});

async function checkProfileStatus(userId) {
    const { data, error } = await _supabase
        .from('profiles')
        .select('department, level')
        .eq('id', userId)
        .single();

    if (data && data.department && data.level) {
        // Profile is complete
        window.location.href = "home.html";
    } else {
        // Needs setup
        window.location.href = "setup-profile.html";
    }
}