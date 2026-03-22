const elements = {
    grid: document.getElementById('gameGrid'),
    filters: document.getElementById('filterContainer'),
    overlay: document.getElementById('gameOverlay'),
    frame: document.getElementById('gameFrame'),
    title: document.getElementById('activeGameTitle'),
    empty: document.getElementById('emptyState')
};

export function renderGames(games, onPlay) {
    elements.grid.innerHTML = '';
    
    if (games.length === 0) {
        elements.empty.classList.remove('hidden');
        return;
    }
    elements.empty.classList.add('hidden');

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        // Generate tag HTML
        const tagHtml = (game.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
        
        card.innerHTML = `
            <div class="thumb-container">
                <img src="${game.thumbnail}" alt="${game.title}" class="card-thumb" loading="lazy">
            </div>
            <div class="card-body">
                <h3 class="card-title">${game.title}</h3>
                <p class="card-desc">${game.description}</p>
                <div class="tags">${tagHtml}</div>
            </div>
        `;
        
        card.addEventListener('click', () => onPlay(game));
        elements.grid.appendChild(card);
    });
}

export function renderFilters(tags, activeTag, onTagClick) {
    // If tags provided, rebuild. If null, just update active class (optimization skipped for simplicity)
    if(tags) {
        elements.filters.innerHTML = '';
        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `filter-btn ${tag === activeTag ? 'active' : ''}`;
            btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
            btn.onclick = () => onTagClick(tag);
            elements.filters.appendChild(btn);
        });
    } else {
        // Just update classes
        const btns = elements.filters.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            if(btn.textContent.toLowerCase() === activeTag.toLowerCase()) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }
}

export function filterGames(games, query, tag) {
    const lowerQuery = query.toLowerCase();
    return games.filter(g => {
        const matchesTag = tag === 'all' || (g.tags && g.tags.includes(tag));
        const matchesSearch = g.title.toLowerCase().includes(lowerQuery) || 
                              g.description.toLowerCase().includes(lowerQuery);
        return matchesTag && matchesSearch;
    });
}

export function launchGame(game) {
    const url = `games/${game.folder}/index.html`;
    elements.title.textContent = game.title;
    elements.frame.src = url;
    elements.overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

export function closeGame() {
    elements.frame.src = '';
    elements.overlay.classList.add('hidden');
    document.body.style.overflow = '';
}
