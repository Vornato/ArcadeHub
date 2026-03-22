export async function loadGames() {
    try {
        const res = await fetch('games.json');
        if (!res.ok) throw new Error("Failed to load games.json");
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}
