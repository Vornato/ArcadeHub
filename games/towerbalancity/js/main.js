// main.js
// Entry point and state machine

window.onload = () => {
    console.log('Tower Panic Init');
    const searchParams = new URLSearchParams(window.location.search);
    const autoTestMode = searchParams.get('autotest') === '1';
    const hudTestMode = searchParams.get('hudtest') === '1';
    const textDumpMode = searchParams.get('textdump') === '1';

    const canvas = document.getElementById('game-canvas');
    const projectSelector = document.getElementById('project-selector');

    const gamepadManager = new GamepadManager();
    const inputManager = new InputManager(gamepadManager);
    const audioSystem = new AudioSystem();
    const uiManager = new UIManager();
    const metaManager = new MetaManager();
    const game = new Game(canvas, inputManager, audioSystem, uiManager, metaManager);
    window.__towerPanicDebug = { game, inputManager, audioSystem, uiManager, metaManager };

    function renderGameToText() {
        const topFloor = game.floors.length > 0 ? game.floors[game.floors.length - 1] : null;
        const topBounds = topFloor && typeof topFloor.getInnerBounds === 'function'
            ? topFloor.getInnerBounds()
            : null;
        const topFloorIndex = topFloor ? game.getFloorIndex(topFloor) : -1;
        const topObjects = topFloor
            ? game.getFloorLooseObjects(topFloor).map((obj) => ({
                type: obj.type,
                x: Math.round(obj.x),
                y: Math.round(obj.y),
                w: obj.w,
                h: obj.h,
                mass: obj.mass
            }))
            : [];
        const players = game.players.map((player) => {
            const supportFloor = game.getSupportingFloor(player);
            return {
                slot: player.slot,
                x: Math.round(player.x),
                y: Math.round(player.y),
                vx: Number(player.vx.toFixed(2)),
                vy: Number(player.vy.toFixed(2)),
                supportFloor: game.getFloorIndex(supportFloor)
            };
        });

        return JSON.stringify({
            mode: game.currentMode,
            quickMode: game.isQuickMode,
            onboarding: game.isOnboardingRun,
            running: game.isRunning,
            paused: game.isPaused,
            coordSystem: 'origin top-left, +x right, +y down',
            tower: {
                floors: game.floors.length,
                height: game.height,
                balance: Number(game.balance.toFixed(2)),
                angle: Number(game.towerAngle.toFixed(4)),
                dangerLevel: game.dangerLevel,
                dangerTimer: game.dangerTimer,
                negativeStabilityTimer: game.negativeStabilityTimer,
                vulnerableFloorIndex: game.vulnerableFloorIndex,
                squadCommand: game.getSquadCommand ? game.getSquadCommand() : null
            },
            director: {
                status: game.directorStatus,
                detail: game.directorDetail,
                recoveryDirection: game.recoveryDirection
            },
            topFloor: topFloor ? {
                index: topFloorIndex,
                width: topFloor.w,
                innerWidth: topBounds ? Math.round(topBounds.innerW) : topFloor.w,
                x: Math.round(topFloor.x),
                y: Math.round(topFloor.y),
                objectCount: topObjects.length,
                objects: topObjects
            } : null,
            looseObjects: {
                total: game.getLooseObjectCount(),
                heavy: game.objects.filter(obj => !obj.heldBy && !obj.isThrown && obj.mass >= 70).length
            },
            players
        }, null, 2);
    }

    window.render_game_to_text = renderGameToText;
    window.advanceTime = (ms = 1000 / 60) => {
        const frameMs = game.fixedDeltaMs || (1000 / 60);
        const frames = Math.max(1, Math.round(ms / frameMs));
        game.manualStepMode = true;
        for (let i = 0; i < frames; i++) {
            inputManager.update();
            if (game.isRunning && !game.isPaused) {
                game.update();
            }
            inputManager.postUpdate();
        }
        game.draw();
        return renderGameToText();
    };

    if (textDumpMode) {
        const stateDump = document.createElement('pre');
        stateDump.id = 'state-dump';
        stateDump.style.cssText = 'position:absolute;right:18px;top:18px;z-index:9999;width:380px;max-height:70vh;overflow:auto;margin:0;padding:12px;background:rgba(0,0,0,0.82);border:1px solid rgba(255,255,255,0.18);color:#fff;font:12px/1.45 monospace;white-space:pre-wrap;';
        document.body.appendChild(stateDump);
        setInterval(() => {
            stateDump.textContent = renderGameToText();
        }, 120);
    }

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
        uiManager.setQuickModeRecommended(metaManager.needsFirstRunOnboarding());
        uiManager.setPlayMode(
            metaManager.needsFirstRunOnboarding()
                ? 'First run recommended: quick contract.'
                : 'Choose a district contract.',
            metaManager.isChaosUnlocked()
        );
    }

    function getPreviewGoal(projectId, mode = 'normal', isDaily = false) {
        const project = game.progression.projectManager.projects.find(p => p.id === projectId) || game.progression.projectManager.projects[0];
        const isQuick = mode === 'quick';
        const isOnboarding = isQuick && metaManager.needsFirstRunOnboarding();
        return {
            projectName: project.name,
            targetHeight: isQuick
                ? metaManager.getQuickGoalHeight(project.id, isOnboarding)
                : metaManager.getProjectGoalHeight(project.id),
            isDaily,
            isQuick,
            isOnboarding,
            dailySeed: activeDailyChallenge ? activeDailyChallenge.seedKey : null,
            completedContracts: 0,
            totalContracts: activeDailyChallenge ? activeDailyChallenge.contracts.length : (isQuick ? 2 : 3)
        };
    }

    function buildPreviewContracts(projectId, mode = 'normal') {
        if (activeDailyChallenge) return activeDailyChallenge.contracts;
        const previewProject = game.progression.projectManager.projects.find(p => p.id === projectId) || game.progression.projectManager.projects[0];
        return metaManager.previewContracts(previewProject, {
            runMode: mode,
            isOnboarding: mode === 'quick' && metaManager.needsFirstRunOnboarding()
        });
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
                isQuick: false,
                isOnboarding: false,
                dailySeed: activeDailyChallenge.seedKey,
                completedContracts: 0,
                totalContracts: activeDailyChallenge.contracts.length
            }
            : getPreviewGoal(selectedProjectId, currentMode, false);
        const previewContracts = activeDailyChallenge ? activeDailyChallenge.contracts : buildPreviewContracts(selectedProjectId, currentMode);
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
                : (currentMode === 'quick'
                    ? (metaManager.needsFirstRunOnboarding()
                        ? 'Quick contract: guided first run with lighter escalation.'
                        : 'Quick contract: shorter target height and cleaner pacing.')
                    : (isChaosMode ? 'Chaos contract: amplified worker collisions.' : 'Standard district contract.')),
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

    function runAutoTest() {
        const reportEl = document.createElement('pre');
        reportEl.id = 'autotest-report';
        reportEl.style.cssText = 'position:absolute;left:20px;top:20px;z-index:9999;width:760px;height:620px;overflow:auto;margin:0;padding:16px;background:rgba(0,0,0,0.9);border:2px solid rgba(255,255,255,0.22);color:#fff;font:16px/1.45 monospace;pointer-events:none;white-space:pre-wrap;';
        document.body.appendChild(reportEl);

        const report = {
            status: 'running',
            summary: 'booting',
            steps: [],
            errors: [],
            startedAt: Date.now()
        };
        window.__towerAutotestReport = report;
        const renderReport = () => {
            reportEl.textContent = JSON.stringify({
                status: report.status,
                summary: report.summary,
                lastStep: report.steps.length > 0 ? report.steps[report.steps.length - 1] : null,
                steps: report.steps.slice(-8),
                errors: report.errors
            }, null, 2);
        };
        const recordStep = (name, extra = {}) => {
            report.steps.push({ name, t: Date.now() - report.startedAt, ...extra });
            report.summary = name;
            renderReport();
        };
        const recordError = (type, message, extra = {}) => {
            report.errors.push({ type, message: String(message), t: Date.now() - report.startedAt, ...extra });
            report.summary = `${type}: ${String(message)}`;
            renderReport();
        };
        const finish = (status) => {
            report.status = status;
            report.finishedAt = Date.now() - report.startedAt;
            renderReport();
        };

        window.addEventListener('error', (event) => {
            recordError('error', event.message || 'Unknown error', {
                file: event.filename,
                line: event.lineno,
                col: event.colno
            });
        });
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason && event.reason.stack ? event.reason.stack : event.reason;
            recordError('unhandledrejection', reason || 'Unhandled promise rejection');
        });

        const fail = (message) => {
            recordError('assert', message);
            finish('failed');
        };
        const expect = (condition, message, extra = {}) => {
            if (!condition) {
                fail(message);
                return false;
            }
            recordStep(message, extra);
            return true;
        };

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const waitFor = async (predicate, timeoutMs = 8000, intervalMs = 120) => {
            const start = Date.now();
            while ((Date.now() - start) < timeoutMs) {
                if (predicate()) return true;
                await wait(intervalMs);
            }
            return false;
        };
        const pumpGame = (frames = 240) => {
            for (let i = 0; i < frames; i++) {
                if (!game.isRunning || game.isPaused) break;
                game.update();
                inputManager.postUpdate();
            }
        };

        (async () => {
            try {
                recordStep('menu_visible', {
                    menuVisible: !uiManager.scrMenu.classList.contains('hidden')
                });

                const dailyA = getDailyChallenge();
                const dailyB = getDailyChallenge();
                if (!expect(JSON.stringify(dailyA) === JSON.stringify(dailyB), 'daily_challenge_deterministic', {
                    seed: dailyA.seedKey,
                    theme: dailyA.themeName,
                    targetHeight: dailyA.targetHeight
                })) return;

                (uiManager.btnPlayQuick || uiManager.btnPlay).click();
                await wait(120);
                if (!expect(!uiManager.scrSetup.classList.contains('hidden'), 'setup_opened')) return;
                if (!expect((uiManager.setupGoalHeight && uiManager.setupGoalHeight.textContent.includes('Quick')) || currentMode === 'quick', 'quick_preview_loaded', {
                    setupGoal: uiManager.setupGoalHeight ? uiManager.setupGoalHeight.textContent : null
                })) return;

                uiManager.btnAddBot.click();
                await wait(120);
                if (!expect(assignedPlayers >= 1, 'bot_added', { assignedPlayers })) return;

                uiManager.btnStartGame.click();
                await wait(180);
                if (!expect(game.isRunning, 'run_started')) return;
                if (!expect(uiManager.hud && !uiManager.hud.classList.contains('hidden'), 'hud_visible')) return;
                if (!expect(game.currentMode === 'quick' && game.isQuickMode, 'quick_mode_started', {
                    mode: game.currentMode,
                    onboarding: game.isOnboardingRun
                })) return;
                if (!expect(uiManager.directorStatus && uiManager.directorStatus.textContent.length > 0, 'director_panel_live', {
                    status: uiManager.directorStatus ? uiManager.directorStatus.textContent : null
                })) return;
                if (!expect(uiManager.soloCommandPanel && !uiManager.soloCommandPanel.classList.contains('hidden'), 'solo_command_visible')) return;

                game.cycleSquadCommand();
                if (!expect(game.getSquadCommand() === 'clear', 'solo_command_cycle_clear', { squadCommand: game.getSquadCommand() })) return;
                game.cycleSquadCommand();
                if (!expect(game.getSquadCommand() === 'fire', 'solo_command_cycle_fire', { squadCommand: game.getSquadCommand() })) return;
                game.cycleSquadCommand();
                if (!expect(game.getSquadCommand() === 'balance', 'solo_command_cycle_balance', { squadCommand: game.getSquadCommand() })) return;

                let pieceA = game.upcomingPieces[0];
                game.dropPlayer.x = Utils.clamp(
                    game.towerCenterX - (pieceA.w / 2),
                    100,
                    game.dropPlayer.widthLimit - 100 - pieceA.w
                );
                game.dropPlayer.carriageCenterX = game.dropPlayer.x + (pieceA.w / 2);
                if (!expect(game.dropPlayer.startRelease(pieceA), 'guided_drop_started', {
                    archetype: pieceA.id,
                    x: game.dropPlayer.x
                })) return;
                recordStep('first_drop_triggered', { archetype: pieceA.id, guided: true });
                pumpGame(6);
                if (!expect(game.floors[1] && game.floors[1].guidedDrop === true, 'guided_drop_spawned', {
                    guided: game.floors[1] ? game.floors[1].guidedDrop : null
                })) return;
                if (!expect(game.floors[1] && Math.abs(game.floors[1].y - (game.floors[0].y - game.floors[1].h)) <= 80, 'guided_drop_starts_near_stack', {
                    y: game.floors[1] ? game.floors[1].y : null,
                    targetY: game.floors[1] ? (game.floors[0].y - game.floors[1].h) : null
                })) return;
                pumpGame(520);
                if (!expect(game.floors.length >= 2, 'first_floor_spawned', { floors: game.floors.length })) return;
                if (!expect(game.floors[1] && !game.floors[1].isFalling, 'first_floor_landed', { y: game.floors[1] ? game.floors[1].y : null })) return;

                let pieceB = game.upcomingPieces[0];
                game.dropFloor(game.towerCenterX - (pieceB.w / 2) + 28, 120, pieceB, 0.6);
                recordStep('second_drop_triggered', { archetype: pieceB.id });
                pumpGame(620);
                if (!expect(game.floors.length >= 3, 'second_floor_spawned', { floors: game.floors.length })) return;
                if (!expect(game.floors[2] && !game.floors[2].isFalling, 'second_floor_landed', { y: game.floors[2] ? game.floors[2].y : null })) return;
                if (!expect(game.floors[2] && game.floors[2].getInnerBounds().innerW >= 300, 'interior_width_expanded', {
                    innerWidth: game.floors[2] ? game.floors[2].getInnerBounds().innerW : null
                })) return;

                const topFloor = game.floors[game.floors.length - 1];
                if (!expect(game.getFloorLooseObjects(topFloor).length <= 2, 'spawn_clutter_capped', {
                    objectCount: game.getFloorLooseObjects(topFloor).length
                })) return;
                const testSafe = new Interactable(topFloor.x + topFloor.w / 2 - 20, topFloor.y - 140, 'safe');
                game.objects.push(testSafe);
                recordStep('heavy_object_spawned', { objectType: testSafe.type });
                pumpGame(360);
                if (!expect(Number.isFinite(game.balance), 'balance_finite', { balance: game.balance })) return;
                if (!expect(Number.isFinite(game.centerOfMassX) && Number.isFinite(game.centerOfMassY), 'com_finite', {
                    centerOfMassX: game.centerOfMassX,
                    centerOfMassY: game.centerOfMassY
                })) return;
                if (!expect(uiManager.comArrowMass && uiManager.comArrowMass.textContent.includes('LOAD'), 'hud_com_updated', {
                    comLabel: uiManager.comArrowMass ? uiManager.comArrowMass.textContent : null
                })) return;
                if (!expect(game.vulnerableFloorIndex >= -1, 'director_guidance_tracks_floor', {
                    vulnerableFloorIndex: game.vulnerableFloorIndex,
                    directorStatus: game.directorStatus
                })) return;

                const leadBot = game.players.find(p => p.isBot);
                const supportFloor = leadBot ? game.getSupportingFloor(leadBot) : null;
                if (!expect(!!leadBot && !!supportFloor, 'bot_support_floor_found', {
                    botSlot: leadBot ? leadBot.slot : null,
                    supportFloor: supportFloor ? game.getFloorIndex(supportFloor) : null
                })) return;
                const firePayload = new Interactable(0, 0, 'safe');
                const payloadX = Utils.clamp(
                    leadBot.x + 18,
                    supportFloor.x + supportFloor.wallL + 12,
                    supportFloor.x + supportFloor.w - supportFloor.wallR - firePayload.w - 12
                );
                firePayload.x = payloadX;
                firePayload.y = supportFloor.getSurfaceYAt(payloadX + firePayload.w / 2) - firePayload.h;
                game.objects.push(firePayload);
                const fireHazard = new FireHazard(payloadX + 28, supportFloor.y + supportFloor.h - 54);
                game.hazards.push(fireHazard);
                game.squadCommand = 'fire';
                leadBot.botController.update(leadBot, game.balance, game.towerCenterX, game.objects, game.dangerLevel, game);
                if (!expect(['FETCH_FIRE_PAYLOAD', 'FIRE_RESPONSE'].includes(leadBot.botController.stateMachine), 'bot_fire_command_targets_fire', {
                    stateMachine: leadBot.botController.stateMachine,
                    squadCommand: game.getSquadCommand()
                })) return;
                game.squadCommand = 'balance';

                const quickContract = metaManager.activeContracts[0];
                if (!expect(!!quickContract, 'contract_available_for_progression')) return;
                if (quickContract.type === 'maxHeight') {
                    metaManager.recordHeight(quickContract.target);
                } else {
                    metaManager.recordStat(quickContract.type, quickContract.target);
                }
                if (!expect(quickContract.done === true, 'contract_progress_updates', {
                    type: quickContract.type,
                    target: quickContract.target,
                    progress: quickContract.progress
                })) return;

                const bossDef = game.bossManager.defs.piano;
                const bossPiece = Object.assign({}, FloorArchetypes[bossDef.archetype]);
                bossPiece.isBoss = true;
                bossPiece.bossDef = bossDef;
                bossPiece.name = bossDef.name;
                game.upcomingPieces[0] = bossPiece;
                game.dropFloor(game.towerCenterX - (bossPiece.w / 2), 120, bossPiece, 0.2);
                recordStep('boss_drop_triggered', { boss: bossDef.id });
                pumpGame(620);
                const newestFloor = game.floors[game.floors.length - 1];
                if (!expect(newestFloor && newestFloor.bossDef && newestFloor.bossDef.id === bossDef.id, 'boss_floor_attached', {
                    bossId: newestFloor && newestFloor.bossDef ? newestFloor.bossDef.id : null
                })) return;
                if (!expect(game.objects.some(obj => obj.type === 'grand_piano'), 'boss_floor_payload_spawned')) return;

                game.pause();
                await wait(120);
                if (!expect(game.isPaused, 'pause_works')) return;
                game.pause();
                await wait(120);
                if (!expect(!game.isPaused, 'resume_works')) return;

                game.negativeStabilityTimer = game.maxNegativeStabilityTime - 1;
                game.towerAngle = -Math.PI / 8;
                game.towerAngularVelocity = -0.012;
                game.instabilityMemory = 0.84;
                recordStep('negative_stability_forced', {
                    threshold: game.negativeStabilityThreshold,
                    timer: game.negativeStabilityTimer
                });
                pumpGame(4);
                if (!expect(game.collapseDirector.isActive, 'negative_stability_collapse_triggered', {
                    balance: game.balance,
                    negativeTimer: game.negativeStabilityTimer
                })) return;

                if (report.errors.length > 0) {
                    finish('failed');
                    return;
                }
                finish('passed');
            } catch (error) {
                recordError('exception', error && error.stack ? error.stack : error);
                finish('failed');
            }
        })();
    }

    function runHudTest() {
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const pumpGame = (frames = 180) => {
            for (let i = 0; i < frames; i++) {
                if (!game.isRunning || game.isPaused) break;
                game.update();
                inputManager.postUpdate();
            }
        };

        (async () => {
            (uiManager.btnPlayQuick || uiManager.btnPlay).click();
            await wait(120);
            uiManager.btnAddBot.click();
            await wait(120);
            uiManager.btnStartGame.click();
            await wait(220);

            const pieceA = game.upcomingPieces[0];
            if (pieceA) {
                game.dropFloor(game.towerCenterX - (pieceA.w / 2), 120, pieceA, 0);
                pumpGame(480);
            }

            const pieceB = game.upcomingPieces[0];
            if (pieceB) {
                game.dropFloor(game.towerCenterX - (pieceB.w / 2) + 24, 120, pieceB, 0.48);
                pumpGame(560);
            }

            const topFloor = game.floors[game.floors.length - 1];
            if (topFloor) {
                const testSafe = new Interactable(topFloor.x + topFloor.w / 2 - 18, topFloor.y - 120, 'safe');
                game.objects.push(testSafe);
                pumpGame(220);
            }

            if (uiManager.phaseBanner) {
                uiManager.phaseBanner.classList.remove('show');
                uiManager.phaseBanner.style.display = 'none';
            }
            if (uiManager.actionCallout) {
                uiManager.actionCallout.classList.remove('show');
                uiManager.actionCallout.style.display = 'none';
            }
        })();
    }

    inputManager.onAnyInputCallback = setupInputCallback;

    function globalLoop() {
        if (!game.isRunning || game.isPaused) {
            inputManager.update();
        }

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
    if (autoTestMode) runAutoTest();
    if (hudTestMode) runHudTest();
    globalLoop();
};
