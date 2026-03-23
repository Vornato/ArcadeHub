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
    let lastJoinTime = 0; // Debounce joining to prevent double-joins
    const botDiffNames = ['Rookie', 'Normal', 'Smart'];
    const allClasses = ClassManager.getAll();

    // Initial config
    audioSystem.setVolumes(
        metaManager.audioConfig.master,
        metaManager.audioConfig.sfx,
        metaManager.audioConfig.music,
        metaManager.audioConfig.reducedIntensity
    );
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
            inputManager.onAnyInputCallback = setupInputCallback;
        },

        onAddBotClicked: () => {
            if (assignedPlayers < 4) {
                inputManager.playerMappings[assignedPlayers] = { type: 'bot' };
                uiManager.updateSetupSlot(assignedPlayers, true, 'BOT');
                assignedPlayers++;

                if (assignedPlayers >= 1) {
                    uiManager.enableStartGame();
                }

                audioSystem.play('creak');
            }
        },
        
        onBotDiffClicked: () => {
            botDifficulty = (botDifficulty + 1) % 3;
            uiManager.btnBotDiff.innerText = `Bot Difficulty: ${botDiffNames[botDifficulty]}`;
            audioSystem.play('throw');
        },
        
        onStartGameClicked: () => {
            if (assignedPlayers >= 1) {
                // If only 1 player joined and no bots were manually added, auto-spawn AI for all 3 worker slots
                if (assignedPlayers === 1) {
                    for (let i = 1; i < 4; i++) {
                        inputManager.playerMappings[i] = { type: 'bot' };
                    }
                    assignedPlayers = 4;
                }

                setupActive = false;
                inputManager.onAnyInputCallback = null; // Stop listening during game
                uiManager.showScreen('none');
                
                // Reset all gamepad prevButtons so no stale presses survive into the first game frame
                for (let gpState of Object.values(gamepadManager.gamepads)) {
                    if (gpState) gpState.prevButtons = [];
                }
                
                // Map class indexes to actual class objects
                const chosenClasses = playerClasses.map(idx => idx !== null ? allClasses[idx] : allClasses[0]);
                const projectSelection = document.getElementById('project-selector')
                    ? document.getElementById('project-selector').value
                    : "random";

                game.start(assignedPlayers, isChaosMode, chosenClasses, botDifficulty, projectSelection);
            }
        },

        onBackClicked: () => {
            setupActive = false;
            inputManager.onAnyInputCallback = null;
            uiManager.showScreen('menu');
        },

        onRestartClicked: () => {
            inputManager.onAnyInputCallback = null;
            uiManager.showScreen('none');

            // Reset stale gamepad state
            for (let gpState of Object.values(gamepadManager.gamepads)) {
                if (gpState) gpState.prevButtons = [];
            }

            const chosenClasses = playerClasses.map(idx => idx !== null ? allClasses[idx] : allClasses[0]);
            const projectSelection = document.getElementById('project-selector')
                ? document.getElementById('project-selector').value
                : "random";

            game.start(assignedPlayers, isChaosMode, chosenClasses, botDifficulty, projectSelection);
        },

        onQuitClicked: () => {
            game.isRunning = false;
            game.isPaused = false;
            if (game.music) game.music.stop();
            uiManager.hideHUD();
            inputManager.onAnyInputCallback = null;
            setupActive = false;
            uiManager.showScreen('menu');
        },

        onResumeClicked: () => {
            game.pause();
        },

        onOptionsClicked: () => {
            uiManager.showScreen('options');
        },

        onOptionsBackClicked: () => {
            if (game.isPaused) uiManager.showScreen('pause');
            else uiManager.showScreen('menu');
        },

        onVolumeChanged: (master, sfx, music, reduced, weather, shake) => {
            audioSystem.setVolumes(master, sfx, music, reduced);
            metaManager.audioConfig = {
                master,
                sfx,
                music,
                reducedIntensity: reduced,
                weatherEffects: weather,
                cameraShake: shake
            };
            metaManager.saveData();
            
            // Apply weather immediately if game is active
            if (game.isRunning) {
                const showWeather = weather !== false;
                uiManager.setWeather(
                    showWeather && game.progression.isRaining,
                    showWeather && game.progression.isDark
                );
            }
        }
    });

    // Handle any input during setup for player assignment
    function setupInputCallback(source) {
        if (setupActive && (Date.now() - lastJoinTime > 400)) {
            if (assignedPlayers < 4) {
                // Check if device is already assigned to ANY slot
                let alreadyAssigned = false;
                for (let i = 0; i < 4; i++) {
                    const e = inputManager.playerMappings[i];
                    if (e && e.type === source.type && e.index === source.index) {
                        alreadyAssigned = true;
                    }
                }
                
                // If device is already assigned, update debounce shield
                if (alreadyAssigned) {
                    lastJoinTime = Date.now();
                    return;
                }

                // Try assign
                if (inputManager.assignPlayer(assignedPlayers, source)) {
                    uiManager.updateSetupSlot(assignedPlayers, true, source.type);
                    assignedPlayers++;
                    lastJoinTime = Date.now();
                    
                    if (assignedPlayers >= 1) {
                        uiManager.enableStartGame();
                    }
                }
            }
        }
    }

    inputManager.onAnyInputCallback = setupInputCallback;

    // Global loop for input handling outside of game
    function globalLoop() {
        inputManager.update();

        if (!game.isRunning || game.isPaused) {
            if (setupActive) {
                for (let i = 1; i < 4; i++) {
                    if (inputManager.isAssigned(i) && inputManager.playerMappings[i].type !== 'bot') {
                        const state = inputManager.getPlayerState(i);

                        if (state.bumperLJustPressed) {
                            playerClasses[i]--;
                            if (playerClasses[i] < 0) playerClasses[i] = allClasses.length - 1;
                            uiManager.updateClassSelector(i, allClasses[playerClasses[i]]);
                            audioSystem.play('throw');
                        }

                        if (state.bumperRJustPressed) {
                            playerClasses[i]++;
                            if (playerClasses[i] >= allClasses.length) playerClasses[i] = 0;
                            uiManager.updateClassSelector(i, allClasses[playerClasses[i]]);
                            audioSystem.play('throw');
                        }
                    }
                }
            }
            
            // Check for START / ESC to resume or go back in menus
            let anyStart = false;
            for (let i = 0; i < 4; i++) {
                if (inputManager.isAssigned(i) && inputManager.playerMappings[i].type !== 'bot') {
                    const state = inputManager.getPlayerState(i);
                    if (state.startJustPressed) anyStart = true;
                }
            }
            
            if (anyStart) {
                if (!uiManager.scrPause.classList.contains('hidden')) {
                    uiManager.btnResume.click();
                } else if (!uiManager.scrOptions.classList.contains('hidden')) {
                    uiManager.btnOptionsBack.click();
                } else if (!uiManager.scrGameover.classList.contains('hidden')) {
                    uiManager.btnQuit.click();
                } else if (!uiManager.scrSetup.classList.contains('hidden')) {
                    uiManager.btnBackMenu.click();
                }
            }
            
            inputManager.postUpdate();
        }

        requestAnimationFrame(globalLoop);
    }
    
    uiManager.showScreen('menu');
    globalLoop();
};