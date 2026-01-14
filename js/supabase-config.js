// js/supabase-config.js

// Initialize the Supabase client
const SUPABASE_URL = 'https://vqgmbgnvigooxvwpbhnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZ21iZ252aWdvb3h2d3BiaG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjQ4MTUsImV4cCI6MjA4MzgwMDgxNX0.8iYpGoQ_EMoqGn5x0RzXxEtTWr1zqwEQ_37J2ao9lBw';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * UTILITY: Get the currently logged-in user
 * This helps keep our other scripts clean.
 */
async function getCurrentUser() {
    const { data: { user }, error } = await _supabase.auth.getUser();
    if (error || !user) {
        console.error("No active session:", error);
        return null;
    }
    return user;
}

/**
 * UTILITY: Format Timestamps
 * Converts Postgres timestamps to "Joined January 2026" format
 */
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Exporting is handled via the global scope since we're using CDN scripts
console.log("FUTIAHub: Supabase initialized successfully.");