import { loadGames } from './data.js';
import { renderGames, renderFilters, launchGame, closeGame, filterGames } from './ui.js';

let allGames = [];
let activeTag = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Data
    allGames = await loadGames();
    
    // 2. Setup Filters
    const tags = ['all', ...new Set(allGames.flatMap(g => g.tags))].sort();
    renderFilters(tags, activeTag, handleTagClick);

    // 3. Initial Render
    updateView();

    // 4. Events
    setupEventListeners();
});

function handleTagClick(tag) {
    activeTag = tag;
    renderFilters(null, activeTag, handleTagClick); // Re-render to update active class
    updateView();
}

function updateView() {
    const searchQuery = document.getElementById('searchInput').value;
    const filtered = filterGames(allGames, searchQuery, activeTag);
    renderGames(filtered, handleGameClick);
}

function handleGameClick(game) {
    launchGame(game);
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', updateView);
    document.getElementById('closeGameBtn').addEventListener('click', closeGame);
    
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
        const iframe = document.getElementById('gameFrame');
        if(!document.fullscreenElement) iframe.requestFullscreen().catch(console.error);
        else document.exitFullscreen();
    });
}
