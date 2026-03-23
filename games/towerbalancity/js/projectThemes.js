// projectThemes.js
// Defines the architectural identities and their gameplay/visual modifiers.

class ProjectThemeManager {
    constructor() {
        this.projects = [
            {
                id: 'modern',
                name: 'Modern Apartment',
                desc: 'Standard rooms. Balanced stability.',
                traits: { stabilityMult: 1.0, windSensitivity: 1.0, fragileChance: 0.0 },
                visuals: { exterior: '#2c3e50', trim: '#ecf0f1', windowStyle: 'rect' },
                storyTags: { flavorPrefix: 'Modern Block', tone: 'playful' },
                roomWeights: { ordinary: 1.5, office: 0.5 }
            },
            {
                id: 'luxury',
                name: 'Luxury High-Rise',
                desc: 'Expensive heavy furniture. Overconfident architecture.',
                traits: { stabilityMult: 0.9, windSensitivity: 0.9, fragileChance: 0.0 },
                visuals: { exterior: '#f5f6fa', trim: '#e1b12c', windowStyle: 'wide' },
                storyTags: { flavorPrefix: 'Luxury Spire', tone: 'dramatic' },
                roomWeights: { rich: 2.0, ordinary: 0.2 }
            },
            {
                id: 'industrial',
                name: 'Industrial Stack',
                desc: 'Heavy machinery. Structurally rigid base.',
                traits: { stabilityMult: 1.2, windSensitivity: 1.1, fragileChance: 0.0 },
                visuals: { exterior: '#353b48', trim: '#e84118', windowStyle: 'small' },
                storyTags: { flavorPrefix: 'Sector 7 Tower', tone: 'warning' },
                roomWeights: { engineers: 2.0, hoarders: 1.0 }
            },
            {
                id: 'cheap',
                name: 'Rushed Build',
                desc: 'Very frail. Wobbly structure.',
                traits: { stabilityMult: 0.7, windSensitivity: 1.3, fragileChance: 0.2 },
                visuals: { exterior: '#a4b0be', trim: '#57606f', windowStyle: 'crooked' },
                storyTags: { flavorPrefix: 'Cheap Tower', tone: 'playful' },
                roomWeights: { ordinary: 1.0, party: 1.0 }
            },
            {
                id: 'glass',
                name: 'Glass HQ',
                desc: 'Sleek, heavily affected by wind.',
                traits: { stabilityMult: 1.0, windSensitivity: 1.8, fragileChance: 0.05 },
                visuals: { exterior: '#74b9ff', trim: '#dfe6e9', windowStyle: 'full' },
                storyTags: { flavorPrefix: 'Glass HQ', tone: 'dramatic' },
                roomWeights: { office: 3.0 }
            }
        ];
        
        this.selectedProject = this.projects[0];
    }
    
    setProject(id) {
        if (id === 'random') {
            this.selectedProject = Utils.choose(this.projects);
        } else {
            this.selectedProject = this.projects.find(p => p.id === id) || this.projects[0];
        }
    }
}
