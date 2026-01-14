// js/theme.js
const toggleBtn = document.getElementById('dark-mode-toggle');
const currentTheme = localStorage.getItem('theme') || 'light';

// Apply theme on load
document.documentElement.setAttribute('data-theme', currentTheme);

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        let newTheme = theme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        toggleBtn.classList.toggle('fa-sun');
        toggleBtn.classList.toggle('fa-moon');
    });
}