// Global State
let selectedMarketPhoto = null;

// --- 1. CORE UTILITIES ---
async function compressImage(file, quality) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 800;
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise(res => canvas.toBlob(b => res(new File([b], file.name, {type:'image/jpeg'})), 'image/jpeg', quality));
}

window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

// --- 2. DATA FETCHING (Optimized to prevent blinking) ---
async function fetchListings(query = "") {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // Show skeleton or clear only once
    if (!query) grid.innerHTML = '<div class="loading-state">Loading Marketplace...</div>';

    try {
        let supabaseQuery = _supabase.from('marketplace').select('*').eq('status', 'active');
        
        if (query) {
            supabaseQuery = supabaseQuery.or(`product_name.ilike.%${query}%,description.ilike.%${query}%`);
        }

        const { data: items, error } = await supabaseQuery.order('created_at', { ascending: false });

        if (error) throw error;

        // Final render (The only time innerHTML is changed)
        let html = '';
        if (!items || items.length === 0) {
            html = `<p style="grid-column: 1/-1; text-align:center; padding:20px;">No items found.</p>`;
        } else {
            items.forEach(item => {
                html += `
                    <div class="product-card" onclick="window.location.href='product-detail.html?id=${item.id}'">
                        <img src="${item.product_image}" class="product-image" loading="lazy">
                        <div class="product-info">
                            <span class="product-price">₦${item.price.toLocaleString()}</span>
                            <span class="product-name">${item.product_name}</span>
                        </div>
                    </div>`;
            });
        }
        grid.innerHTML = html;
    } catch (err) {
        console.error("Fetch Error:", err);
        grid.innerHTML = `<p style="color:red; text-align:center;">Failed to load items.</p>`;
    }
}

// --- 3. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Menu Logic
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    const toggleMenu = (show) => {
        sideMenu?.classList.toggle('active', show);
        overlay?.classList.toggle('active', show);
    };

    openMenuBtn?.addEventListener('click', () => toggleMenu(true));
    closeMenuBtn?.addEventListener('click', () => toggleMenu(false));
    overlay?.addEventListener('click', () => toggleMenu(false));

    // Search Logic
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('market-search-input');
    
    searchBtn?.addEventListener('click', () => fetchListings(searchInput.value));
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchListings(searchInput.value);
    });

    // Image logic
    document.getElementById('product-photo')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file, 0.7);
            selectedMarketPhoto = compressed;
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('market-preview-container').innerHTML = `
                    <img src="${event.target.result}" style="width:100px; height:100px; object-fit:cover; border-radius:10px;">
                `;
            };
            reader.readAsDataURL(compressed);
        }
    });

    // Submit logic
    document.getElementById('submit-listing')?.addEventListener('click', async (e) => {
        const btn = e.target;
        const name = document.getElementById('item-name').value;
        const price = document.getElementById('item-price').value;
        const category = document.getElementById('item-category').value;
        const desc = document.getElementById('item-desc').value;

        if (!name || !price || !selectedMarketPhoto) return alert("Fill all fields!");

        btn.disabled = true;
        btn.innerText = "Listing...";

        try {
            const { data: { user } } = await _supabase.auth.getUser();
            const fileName = `marketplace/${user.id}/${Date.now()}.jpg`;
            const { error: upError } = await _supabase.storage.from('marketplace').upload(fileName, selectedMarketPhoto);
            if (upError) throw upError;

            const { data: { publicUrl } } = _supabase.storage.from('marketplace').getPublicUrl(fileName);

            const { error: dbError } = await _supabase.from('marketplace').insert([{
                seller_id: user.id,
                product_name: name,
                price: parseFloat(price),
                category: category,
                description: desc,
                product_image: publicUrl,
                status: 'active'
            }]);

            if (dbError) throw dbError;
            location.reload();
        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.innerText = "List Item";
        }
    });

    fetchListings(); // Called EXACTLY once
});

// Global State
let isFetching = false; // SAFETY LOCK

// --- 1. CORE UTILITIES ---
async function compressImage(file, quality) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 800;
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise(res => canvas.toBlob(b => res(new File([b], file.name, {type:'image/jpeg'})), 'image/jpeg', quality));
}

// --- 2. DATA FETCHING (No-Blink Version) ---
async function fetchListings(query = "") {
    if (isFetching) return; // Stop the loop if already running
    isFetching = true;

    const grid = document.getElementById('product-grid');
    if (!grid) return;

    try {
        let supabaseQuery = _supabase.from('marketplace').select('*').eq('status', 'active');
        if (query) {
            supabaseQuery = supabaseQuery.or(`product_name.ilike.%${query}%,description.ilike.%${query}%`);
        }

        const { data: items, error } = await supabaseQuery.order('created_at', { ascending: false });
        if (error) throw error;

        // Create a buffer string so we only update the DOM ONCE (Prevents blinking)
        let htmlBuffer = "";
        if (!items || items.length === 0) {
            htmlBuffer = `<p style="grid-column: 1/-1; text-align:center; padding:20px;">No items found.</p>`;
        } else {
            items.forEach(item => {
                htmlBuffer += `
                    <div class="product-card" onclick="window.location.href='product-detail.html?id=${item.id}'">
                        <img src="${item.product_image}" class="product-image" loading="lazy">
                        <div class="product-info">
                            <span class="product-price">₦${item.price.toLocaleString()}</span>
                            <span class="product-name">${item.product_name}</span>
                        </div>
                    </div>`;
            });
        }
        grid.innerHTML = htmlBuffer;
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        isFetching = false; // Release the lock
    }
}

// --- 3. THE INITIALIZER ---
const initMarketplace = () => {
    // A. Side Menu
    const openMenuBtn = document.getElementById('open-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    if (openMenuBtn && sideMenu) {
        openMenuBtn.onclick = () => { sideMenu.classList.add('active'); overlay.classList.add('active'); };
        const close = () => { sideMenu.classList.remove('active'); overlay.classList.remove('active'); };
        if (closeMenuBtn) closeMenuBtn.onclick = close;
        if (overlay) overlay.onclick = close;
    }

    // B. Search
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('market-search-input');
    if (searchBtn && searchInput) {
        searchBtn.onclick = () => fetchListings(searchInput.value);
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') fetchListings(searchInput.value); };
    }

    // C. Initial Load
    fetchListings();
};

// Start exactly once
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarketplace);
} else {
    initMarketplace();
}