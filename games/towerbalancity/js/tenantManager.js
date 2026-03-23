// tenantManager.js
// Manages which factions/tenants are currently active and provides room themes.

class TenantManager {
    constructor() {
        // Defines the available factions/tenants
        this.factions = {
            ordinary: { name: "Ordinary Tenants", weight: 1.0 },
            office: { name: "Office Workers", weight: 0.0 },
            rich: { name: "Rich Buyers", weight: 0.0 },
            party: { name: "Party People", weight: 0.0 },
            engineers: { name: "Suspicious Engineers", weight: 0.0 },
            influencers: { name: "Rooftop Influencers", weight: 0.0 },
            hoarders: { name: "Weird Hoarders", weight: 0.0 }
        };

        // Base themes + advanced themes
        this.allThemes = [
            { id: "studio", name: "Studio", colors: ['#55efc4', '#00cec9'], props: ['couch', 'tv', 'plant'], massMult: 1, factions: ['ordinary'] },
            { id: "living", name: "Living Room", colors: ['#ffeaa7', '#fab1a0'], props: ['couch', 'tv', 'fridge'], massMult: 1.2, factions: ['ordinary', 'party'] },
            { id: "office", name: "Office", colors: ['#dfe6e9', '#b2bec3'], props: ['safe', 'plant'], massMult: 1.5, factions: ['office'] },
            { id: "gym", name: "Gym", colors: ['#ff7675', '#d63031'], props: ['barbell', 'safe'], massMult: 2.0, factions: ['ordinary', 'office'] },
            { id: "music", name: "Music Room", colors: ['#a29bfe', '#6c5ce7'], props: ['piano'], massMult: 2.5, factions: ['rich', 'influencers'] },
            { id: "ice", name: "Ice Room", colors: ['#74b9ff', '#0984e3'], props: ['fridge'], massMult: 1.0, factions: ['hoarders'] },
            { id: "gamer", name: "Gamer Den", colors: ['#2d3436', '#000000'], props: ['tv', 'fridge', 'couch'], massMult: 1.2, factions: ['ordinary', 'influencers'] },
            { id: "luxury", name: "Luxury Penthouse", colors: ['#fdcb6e', '#e17055'], props: ['statue', 'piano', 'safe'], massMult: 3.0, factions: ['rich'] },
            { id: "storage", name: "Heavy Storage", colors: ['#636e72', '#2d3436'], props: ['generator', 'safe', 'barbell'], massMult: 3.5, factions: ['hoarders', 'office'] },
            { id: "party", name: "Party Floor", colors: ['#ff9ff3', '#feca57'], props: ['couch', 'tv', 'piano'], massMult: 1.4, factions: ['party'] },
            { id: "vault", name: "Secure Vault", colors: ['#2f3640', '#718093'], props: ['safe', 'safe', 'generator'], massMult: 4.0, factions: ['rich', 'hoarders'] },
            { id: "machinery", name: "Machinery Room", colors: ['#cd6133', '#84817a'], props: ['generator', 'barbell'], massMult: 3.0, factions: ['engineers'] },
            { id: "rooftop", name: "Rooftop Lounge", colors: ['#0abde3', '#10ac84'], props: ['plant', 'statue'], massMult: 1.5, factions: ['influencers', 'rich'] },
            { id: "panic", name: "Panic Room", colors: ['#b33939', '#218c74'], props: ['generator', 'safe', 'fridge'], massMult: 2.5, factions: ['rich', 'hoarders'] }
        ];
    }

    updateFactionsForChapter(chapterId, projectTheme = null) {
        // Reset all
        for (let key in this.factions) {
            this.factions[key].weight = 0;
        }

        // Apply weights based on chapter 1..8
        this.factions.ordinary.weight = Math.max(0.1, 1.0 - ((chapterId - 1) * 0.1));
        
        if (chapterId >= 2) this.factions.office.weight = 0.5;
        if (chapterId >= 3) this.factions.party.weight = 0.6;
        if (chapterId >= 4) this.factions.rich.weight = 0.7;
        if (chapterId >= 5) { this.factions.engineers.weight = 0.5; this.factions.office.weight = 0.2; }
        if (chapterId >= 6) this.factions.hoarders.weight = 0.6;
        if (chapterId >= 7) this.factions.influencers.weight = 0.8;
        if (chapterId >= 8) { 
            this.factions.ordinary.weight = 0.05;
            this.factions.rich.weight = 0.8;
            this.factions.hoarders.weight = 0.8;
            this.factions.engineers.weight = 0.2;
        }

        if (projectTheme) {
            for (let f in projectTheme.roomWeights) {
                if (this.factions[f]) this.factions[f].weight += projectTheme.roomWeights[f];
            }
        }
    }

    getThemeForFloor() {
        // Build weighted pool of themes
        let pool = [];
        for (let theme of this.allThemes) {
            let weight = 0;
            for (let f of theme.factions) {
                if (this.factions[f]) weight += this.factions[f].weight;
            }
            if (weight > 0) {
                for (let i = 0; i < Math.ceil(weight * 10); i++) pool.push(theme);
            }
        }
        
        // Fallback
        if (pool.length === 0) pool = [this.allThemes[0]];
        return Utils.choose(pool);
    }
}
