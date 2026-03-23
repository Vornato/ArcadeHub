// main.js
// Entry point and state machine

window.onload = () => {
    console.log("Tower Panic Init");

    const canvas = document.getElementById('game-canvas');
    
    // Core systems
    const gamepadManager = new GamepadManager();
    const inputManager = new InputManager(gamepadManager);
    const audioSystem = new AudioSystem();
    const uiManager = new UIManager();
    const metaManager = new MetaManager(); // Track persistent progression
    const game = new Game(canvas, inputManager, audioSystem, uiManager, metaManager);

    let setupActive = false;
    let assignedPlayers = 0;
    let isChaosMode = false;
    let playerClasses = [null, 0, 0, 0]; // Index of ClassManager.getAll()
    let botDifficulty = 1; // 0: Rookie, 1: Normal, 2: Smart
    const botDiffNames = ['Rookie', 'Normal', 'Smart'];
    const allClasses = ClassManager.getAll();

    // Initial config
    audioSystem.setVolumes(metaManager.audioConfig.master, metaManager.audioConfig.sfx, metaManager.audioConfig.music, metaManager.audioConfig.reducedIntensity);
    uiManager.setOptionsUI(metaManager.audioConfig);

    // UI Event Binds
    uiManager.bindEvents({
        onPlayClicked: (chaos) => {
            isChaosMode = chaos;
            audioSystem.init(); // Init audio context on first user interaction
            uiManager.showScreen('setup');
            setupActive = true;
            assignedPlayers = 0;
            // Clear prior assignments
            for (let i = 0; i < 4; i++) {
                inputManager.playerMappings[i] = null;
                playerClasses[i] = 0;
                uiManager.updateSetupSlot(i, false);
                uiManager.updateClassSelector(i, allClasses[0]);
            }
            uiManager.btnStartGame.disabled = true;
        },

        onAddBotClicked: () => {
            if (assignedPlayers < 4) {
                inputManager.playerMappings[assignedPlayers] = { type: 'bot' };
                uiManager.updateSetupSlot(assignedPlayers, true, 'BOT');
                assignedPlayers++;
                if (assignedPlayers >= 2) uiManager.enableStartGame();
                audioSystem.play('creak');
            }
        },
        
        onBotDiffClicked: () => {
            botDifficulty = (botDifficulty + 1) % 3;
            uiManager.btnBotDiff.innerText = `Bot Difficulty: ${botDiffNames[botDifficulty]}`;
            audioSystem.play('throw');
        },
        
        onStartGameClicked: () => {
            if (assignedPlayers >= 2) {
                setupActive = false;
                uiManager.showScreen('none');
                
                // Map class indexes to actual class objects
                let chosenClasses = playerClasses.map(idx => idx !== null ? allClasses[idx] : allClasses[0]);
                let projectSelection = document.getElementById('project-selector') ? document.getElementById('project-selector').value : "random";
                game.start(assignedPlayers, isChaosMode, chosenClasses, botDifficulty, projectSelection);
            }
        },

        onBackClicked: () => {
            setupActive = false;
            uiManager.showScreen('menu');
        },

        onRestartClicked: () => {
            uiManager.showScreen('none');
            let chosenClasses = playerClasses.map(idx => idx !== null ? allClasses[idx] : allClasses[0]);
            let projectSelection = document.getElementById('project-selector') ? document.getElementById('project-selector').value : "random";
            game.start(assignedPlayers, isChaosMode, chosenClasses, botDifficulty, projectSelection);
        },

        onQuitClicked: () => {
            game.stop();
            uiManager.showScreen('menu');
        },

        onResumeClicked: () => {
            game.pause();
        },

        onOptionsClicked: () => {
            uiManager.showScreen('options');
        },

        onOptionsBackClicked: () => {
            uiManager.showScreen('menu');
        },

        onVolumeChanged: (master, sfx, music, reduced) => {
            audioSystem.setVolumes(master, sfx, music, reduced);
            metaManager.audioConfig = { master, sfx, music, reducedIntensity: reduced };
            metaManager.save();
        }
    });

    // Handle any input during setup for player assignment
    inputManager.onAnyInputCallback = (source) => {
        if (setupActive) {
            if (assignedPlayers < 4) {
                // Try assign
                if (inputManager.assignPlayer(assignedPlayers, source)) {
                    uiManager.updateSetupSlot(assignedPlayers, true, source.type);
                    assignedPlayers++;
                    
                    if (assignedPlayers >= 2) {
                        uiManager.enableStartGame();
                    }
                }
            }
        }
    };

    // Global loop for input handling outside of game
    function globalLoop() {
        inputManager.update();
        if (!game.isRunning || game.isPaused) {
            
            if (setupActive) {
                for (let i = 1; i < 4; i++) {
                    if (inputManager.isAssigned(i) && inputManager.playerMappings[i].type !== 'bot') {
                        let state = inputManager.getPlayerState(i);
                        if (state.bumperLJustPressed) {
                            playerClasses[i]--;
                            if (playerClasses[i] < 0) playerClasses[i] = allClasses.length - 1;
                            uiManager.updateClassSelector(i, allClasses[playerClasses[i]]);
                            audioSystem.play('throw'); // ui blip
                        }
                        if (state.bumperRJustPressed) {
                            playerClasses[i]++;
                            if (playerClasses[i] >= allClasses.length) playerClasses[i] = 0;
                            uiManager.updateClassSelector(i, allClasses[playerClasses[i]]);
                            audioSystem.play('throw'); // ui blip
                        }
                    }
                }
            }
            
            inputManager.postUpdate(); // allow clear of just pressed keys in UI screens
        }
        requestAnimationFrame(globalLoop);
    }
    
    uiManager.showScreen('menu');
    globalLoop();
};
