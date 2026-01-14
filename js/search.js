let searchMode = 'students';
let timeout = null;

// Side Menu Logic
document.getElementById('open-menu').onclick = () => {
    document.getElementById('side-menu').classList.add('active');
    document.getElementById('menu-overlay').classList.add('active');
};
document.getElementById('close-menu').onclick = () => {
    document.getElementById('side-menu').classList.remove('active');
    document.getElementById('menu-overlay').classList.remove('active');
};

function setSearchMode(mode) {
    searchMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(mode.substring(0,3)));
    });
    performSearch(document.getElementById('global-search').value);
}

document.getElementById('global-search').addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        performSearch(e.target.value);
    }, 500); // Wait 500ms after user stops typing
});

async function performSearch(query) {
    const resultsDiv = document.getElementById('search-results');
    if (!query || query.length < 2) return;

    resultsDiv.innerHTML = '<div class="loader">Searching...</div>';

    if (searchMode === 'students') {
        const { data } = await _supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%,department.ilike.%${query}%`)
            .limit(10);
        renderStudents(data);
    } else {
        const { data } = await _supabase
            .from('marketplace')
            .select('*')
            .ilike('product_name', `%${query}%`)
            .limit(10);
        renderMarket(data);
    }
}

function renderStudents(students) {
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = students.length ? '' : '<p>No students found.</p>';
    students.forEach(s => {
        resultsDiv.innerHTML += `
            <div class="user-result-card" onclick="location.href='user-profile.html?id=${s.id}'">
                <img src="${s.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+s.id}">
                <div>
                    <h4>${s.full_name}</h4>
                    <span>@${s.nickname} • ${s.department}</span>
                </div>
            </div>`;
    });
}

function renderMarket(items) {
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = items.length ? '' : '<p>No items found.</p>';
    items.forEach(i => {
        resultsDiv.innerHTML += `
            <div class="market-result-card" onclick="location.href='product-detail.html?id=${i.id}'">
                <img src="${i.product_image}">
                <div>
                    <h4>${i.product_name}</h4>
                    <b style="color:var(--forest-green)">₦${i.price.toLocaleString()}</b>
                </div>
            </div>`;
    });
}