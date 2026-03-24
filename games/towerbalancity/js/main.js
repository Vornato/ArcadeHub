// main.js
// Entry point and state machine

window.onload = () => {
    console.log('Tower Panic Init');

    const canvas = document.getElementById('game-canvas');
    const projectSelector = document.getElementById('project-selector');

    const gamepadManager = new GamepadManager();
    const inputManager = new InputManager(gamepadManager);
    const audioSystem = new AudioSystem();
    const uiManager = new UIManager();
    const metaManager = new MetaManager();
    const game = new Game(canvas, inputManager, audioSystem, uiManager, metaManager);

    let setupActive = false;
    let assignedPlayers = 0;
    let isChaosMode = false;
    let currentMode = 'normal';
    let activeDailyChallenge = null;
    let playerClasses = [null, 0, 0, 0];
    let botDifficulty = 1;
    let lastJoinTime = 0;
    const botDiffNames = ['Rookie', 'Normal', 'Smart'];
    const allClasses = ClassManager.getAll();

    audioSystem.setVolumes(
        metaManager.audioConfig.master,
        metaManager.audioConfig.sfx,
        metaManager.audioConfig.music,
        metaManager.audioConfig.reducedIntensity
    );
    uiManager.setOptionsUI(metaManager.audioConfig);

    function getDailyChallenge() {
        return metaManager.getDailyChallenge(game.progression.projectManager.projects);
    }

    function updateMenuMeta() {
        uiManager.updateMenuMeta(metaManager.getMenuSummary(), getDailyChallenge());
        uiManager.setPlayMode('Choose a district contract.', metaManager.isChaosUnlocked());
    }

    function getPreviewGoal(projectId, isDaily = false) {
        const project = game.progression.projectManager.projects.find(p => p.id === projectId) || game.progression.projectManager.projects[0];
        return {
            projectName: project.name,
            targetHeight: metaManager.getProjectGoalHeight(project.id),
            isDaily,
            dailySeed: activeDailyChallenge ? activeDailyChallenge.seedKey : null,
            completedContracts: 0,
            totalContracts: activeDailyChallenge ? activeDailyChallenge.contracts.length : 3
        };
    }

    function buildPreviewContracts(projectId) {
        if (activeDailyChallenge) return activeDailyChallenge.contracts;
        const previewProject = game.progression.projectManager.projects.find(p => p.id === projectId) || game.progression.projectManager.projects[0];
        return metaManager.previewContracts(previewProject);
    }

    function refreshSetupPreview() {
        const selectedProjectId = activeDailyChallenge
            ? activeDailyChallenge.themeId
            : ((projectSelector && projectSelector.value !== 'random') ? projectSelector.value : game.progression.projectManager.projects[0].id);
        const goalSummary = activeDailyChallenge
            ? {
                projectName: activeDailyChallenge.themeName,
                targetHeight: activeDailyChallenge.targetHeight,
                isDaily: true,
                dailySeed: activeDailyChallenge.seedKey,
                completedContracts: 0,
                totalContracts: activeDailyChallenge.contracts.length
            }
            : getPreviewGoal(selectedProjectId, false);
        const previewContracts = activeDailyChallenge ? activeDailyChallenge.contracts : buildPreviewContracts(selectedProjectId);
        uiManager.updateSetupBrief(goalSummary, previewContracts);
    }

    function getProjectSelection() {
        if (activeDailyChallenge) return activeDailyChallenge.themeId;
        if (!projectSelector) return 'random';
        return projectSelector.value;
    }

    function getChosenClasses() {
        return playerClasses.map(idx => idx !== null ? allClasses[idx] : allClasses[0]);
    }

    function stepClassIndex(currentIndex, direction) {
        let nextIndex = currentIndex;
        for (let i = 0; i < allClasses.length; i++) {
            nextIndex += direction;
            if (nextIndex < 0) nextIndex = allClasses.length - 1;
            if (nextIndex >= allClasses.length) nextIndex = 0;
            if (ClassManager.isUnlocked(allClasses[nextIndex], metaManager)) {
                return nextIndex;
            }
        }
        return 0;
    }

    function resetSetupState() {
        assignedPlayers = 0;
        for (let i = 0; i < 4; i++) {
            inputManager.playerMappings[i] = null;
            playerClasses[i] = 0;
            uiManager.updateSetupSlot(i, false);
            uiManager.updateClassSelector(i, allClasses[0], !ClassManager.isUnlocked(allClasses[0], metaManager));
        }
        uiManager.btnStartGame.disabled = true;
    }

    function beginMode(mode) {
        if (mode === 'chaos' && !metaManager.isChaosUnlocked()) {
            audioSystem.init();
            audioSystem.play('slide');
            return;
        }

        currentMode = mode;
        isChaosMode = mode === 'chaos';
        activeDailyChallenge = mode === 'daily' ? getDailyChallenge() : null;

        if (projectSelector) {
            projectSelector.disabled = !!activeDailyChallenge;
            if (activeDailyChallenge) {
                projectSelector.value = activeDailyChallenge.themeId;
            }
        }

        audioSystem.init();
        uiManager.setPlayMode(
            activeDailyChallenge
                ? `Daily contract: ${activeDailyChallenge.themeName} / seed ${activeDailyChallenge.seedKey}`
                : (isChaosMode ? 'Chaos contract: amplified worker collisions.' : 'Standard district contract.'),
            metaManager.isChaosUnlocked()
        );
        uiManager.showScreen('setup');
        setupActive = true;
        resetSetupState();
        refreshSetupPreview();
        inputManager.onAnyInputCallback = setupInputCallback;
    }

    function startRun() {
        if (assignedPlayers < 1) return;

        if (assignedPlayers === 1) {
            for (let i = 1; i < 4; i++) {
                inputManager.playerMappings[i] = { type: 'bot' };
            }
            assignedPlayers = 4;
        }

        setupActive = false;
        inputManager.onAnyInputCallback = null;
        uiManager.showScreen('none');

        for (let gpState of Object.values(gamepadManager.gamepads)) {
            if (gpState) gpState.prevButtons = [];
        }

        const chosenClasses = getChosenClasses();
        const projectSelection = getProjectSelection();
        game.start(assignedPlayers, isChaosMode, chosenClasses, botDifficulty, projectSelection, activeDailyChallenge, currentMode);
    }

    uiManager.bindEvents({
        onPlayClicked: (mode) => beginMode(mode),

        onAddBotClicked: () => {
            if (assignedPlayers < 4) {
                inputManager.playerMappings[assignedPlayers] = { type: 'bot' };
                uiManager.updateSetupSlot(assignedPlayers, true, 'BOT');
                assignedPlayers++;

                if (assignedPlayers >= 1) {
                    uiManager.enableStartGame();
                }

                audioSystem.play('grab');
            }
        },

        onBotDiffClicked: () => {
            botDifficulty = (botDifficulty + 1) % 3;
            uiManager.btnBotDiff.innerText = `Bot Difficulty: ${botDiffNames[botDifficulty]}`;
            audioSystem.play('throw');
        },

        onStartGameClicked: () => startRun(),

        onBackClicked: () => {
            setupActive = false;
            inputManager.onAnyInputCallback = null;
            updateMenuMeta();
            uiManager.showScreen('menu');
        },

        onRestartClicked: () => {
            inputManager.onAnyInputCallback = null;
            uiManager.showScreen('none');

            for (let gpState of Object.values(gamepadManager.gamepads)) {
                if (gpState) gpState.prevButtons = [];
            }

            const chosenClasses = getChosenClasses();
            const projectSelection = getProjectSelection();
            game.start(assignedPlayers, isChaosMode, chosenClasses, botDifficulty, projectSelection, activeDailyChallenge, currentMode);
        },

        onQuitClicked: () => {
            game.isRunning = false;
            game.isPaused = false;
            if (game.music) game.music.stop();
            uiManager.hideHUD();
            inputManager.onAnyInputCallback = null;
            setupActive = false;
            updateMenuMeta();
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

            if (game.isRunning) {
                const showWeather = weather !== false;
                uiManager.setWeather(
                    showWeather && game.progression.isRaining,
                    showWeather && game.progression.isDark
                );
            }
        }
    });

    if (projectSelector) {
        projectSelector.addEventListener('change', () => {
            if (!activeDailyChallenge) refreshSetupPreview();
        });
    }

    function setupInputCallback(source) {
        if (setupActive && (Date.now() - lastJoinTime > 400)) {
            if (assignedPlayers < 4) {
                let alreadyAssigned = false;
                for (let i = 0; i < 4; i++) {
                    const existing = inputManager.playerMappings[i];
                    if (existing && existing.type === source.type && existing.index === source.index) {
                        alreadyAssigned = true;
                    }
                }

                if (alreadyAssigned) {
                    lastJoinTime = Date.now();
                    return;
                }

                if (inputManager.assignPlayer(assignedPlayers, source)) {
                    uiManager.updateSetupSlot(assignedPlayers, true, source.type);
                    assignedPlayers++;
                    lastJoinTime = Date.now();
                    if (assignedPlayers >= 1) uiManager.enableStartGame();
                }
            }
        }
    }

    inputManager.onAnyInputCallback = setupInputCallback;

    function globalLoop() {
        inputManager.update();

        if (!game.isRunning || game.isPaused) {
            if (setupActive) {
                for (let i = 1; i < 4; i++) {
                    if (inputManager.isAssigned(i) && inputManager.playerMappings[i].type !== 'bot') {
                        const state = inputManager.getPlayerState(i);

                        if (state.bumperLJustPressed) {
                            playerClasses[i] = stepClassIndex(playerClasses[i], -1);
                            uiManager.updateClassSelector(i, allClasses[playerClasses[i]]);
                            audioSystem.play('throw');
                        }

                        if (state.bumperRJustPressed) {
                            playerClasses[i] = stepClassIndex(playerClasses[i], 1);
                            uiManager.updateClassSelector(i, allClasses[playerClasses[i]]);
                            audioSystem.play('throw');
                        }
                    }
                }
            }

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
                } else if (!uiManager.scrVictory.classList.contains('hidden')) {
                    uiManager.btnVictoryQuit.click();
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

    updateMenuMeta();
    uiManager.showScreen('menu');
    globalLoop();
};
