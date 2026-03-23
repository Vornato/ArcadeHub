// endingSummary.js
// Evaluates the metrics of the run when context-aware summary narrative is needed on game over.

class EndingSummarySystem {
    constructor() {}

    generateSummary(stats, progression) {
        const height = stats.maxHeight || 0;
        const chapter = progression.currentChapterData ? progression.currentChapterData.id : 1;
        const project = progression.projectManager ? progression.projectManager.selectedProject : null;
        let pName = project ? project.storyTags.flavorPrefix : "tower";
        
        let epitaphs = [];

        if (chapter <= 1) {
            epitaphs.push(`The ${pName} didn't even make it past the planning committee.`);
            epitaphs.push(`A catastrophic start to a terrible ${pName} idea.`);
        } else if (chapter <= 3) {
            epitaphs.push(`An ambitious ${pName} that crumbled prematurely.`);
            epitaphs.push("The tenants barely had time to unpack.");
        } else if (chapter <= 5) {
            epitaphs.push(`A structural nightmare that somehow reached the skyline.`);
            epitaphs.push(`Too many heavy objects. Not enough structural supports for this ${pName}.`);
            epitaphs.push(`The city watched the ${pName} become a landmark, briefly.`);
        } else if (chapter <= 7) {
            epitaphs.push(`The beautiful ${pName}, finally brought down by hubris.`);
            epitaphs.push(`Engineers will study this ${pName} collapse for generations.`);
        } else {
            epitaphs.push(`A legendary survival ballet that finally bowed to reality.`);
            epitaphs.push(`The ${pName} reached the clouds, but gravity always wins in the end.`);
            epitaphs.push(`An absolute masterpiece of catastrophic architecture.`);
        }

        if (progression.isRaining || progression.windForce > 0) {
            epitaphs.push("The storm arrived. The structure disagreed.");
        }
        
        if (progression.isDark) {
            epitaphs.push("It fell in darkness. No one saw it coming.");
        }

        return Utils.choose(epitaphs);
    }
}
