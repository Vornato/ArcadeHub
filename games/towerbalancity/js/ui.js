// ui.js
// Handles DOM interactions for menus and HUD

class UIManager {
    constructor() {        
        this.scrMenu = document.getElementById('screen-menu');
        this.scrSetup = document.getElementById('screen-setup');
        this.scrGameover = document.getElementById('screen-gameover');
        this.scrVictory = document.getElementById('screen-victory');
        this.scrPause = document.getElementById('screen-pause');
        this.scrOptions = document.getElementById('screen-options');
        this.hud = document.getElementById('hud');

        this.btnPlay = document.getElementById('btn-play');
        this.btnPlayDaily = document.getElementById('btn-daily');
        this.btnPlayChaos = document.getElementById('btn-chaos');
        this.btnStartGame = document.getElementById('btn-start-game');
        this.btnAddBot = document.getElementById('btn-add-bot');
        this.btnBotDiff = document.getElementById('btn-bot-diff');
        this.btnBackMenu = document.getElementById('btn-back-menu');
        this.btnRestart = document.getElementById('btn-restart');
        this.btnQuit = document.getElementById('btn-quit');
        this.btnVictoryRestart = document.getElementById('btn-victory-restart');
        this.btnVictoryQuit = document.getElementById('btn-victory-quit');

        // Options
        this.btnOptions = document.getElementById('btn-options');
        this.btnOptionsBack = document.getElementById('btn-options-back');
        this.volMaster = document.getElementById('vol-master');
        this.volMusic = document.getElementById('vol-music');
        this.volSfx = document.getElementById('vol-sfx');
        this.chkReduced = document.getElementById('chk-reduced-intensity');
        this.chkWeather = document.getElementById('chk-weather-effects');
        this.chkShake = document.getElementById('chk-camera-shake');
        
        this.lblMaster = document.getElementById('lbl-vol-master');
        this.lblMusic = document.getElementById('lbl-vol-music');
        this.lblSfx = document.getElementById('lbl-vol-sfx');

        this.btnResume = document.getElementById('btn-resume');
        this.btnQuitPause = document.getElementById('btn-quit-pause');

        this.scoreDisp = document.getElementById('score-display');
        this.heightDisp = document.getElementById('height-display');
        this.balanceMeterContainer = document.getElementById('balance-meter-container');
        this.balanceBg = document.getElementById('balance-bg');
        this.balIndicator = document.getElementById('balance-indicator');
        this.dangerText = document.getElementById('danger-text');
        this.comArrow = document.getElementById('com-arrow');
        this.comArrowTrail = document.getElementById('com-arrow-trail');
        this.comArrowVector = document.getElementById('com-arrow-vector');
        this.comArrowIcon = document.getElementById('com-arrow-icon');
        this.comArrowMass = document.getElementById('com-arrow-mass');
        this.windState = document.getElementById('wind-state');
        this.rainState = document.getElementById('rain-state');
        this.darkState = document.getElementById('dark-state');
        this.windForecast = document.getElementById('wind-forecast');
        this.rainForecast = document.getElementById('rain-forecast');
        this.darkForecast = document.getElementById('dark-forecast');
        this.actionCallout = document.getElementById('action-callout');
        this.minimap = document.getElementById('tower-minimap');
        this.minimapCtx = this.minimap ? this.minimap.getContext('2d') : null;
        this.queueTooltip = document.getElementById('queue-tooltip');
        this.goalProject = document.getElementById('goal-project');
        this.goalHeight = document.getElementById('goal-height');
        this.goalSeed = document.getElementById('goal-seed');
        this.contractEls = [0, 1, 2].map(i => document.getElementById(`contract-${i}`));
        
        this.finalScoreItem = document.getElementById('final-score');
        this.finalHeightItem = document.getElementById('final-height');
        this.finalXPItem = document.getElementById('final-xp');
        this.finalMedalItem = document.getElementById('final-medal');
        this.finalContractsItem = document.getElementById('final-contracts');
        this.gameoverEpitaph = document.getElementById('gameover-epitaph');
        this.victoryScoreItem = document.getElementById('victory-score');
        this.victoryHeightItem = document.getElementById('victory-height');
        this.victoryXPItem = document.getElementById('victory-xp');
        this.victoryMedalItem = document.getElementById('victory-medal');
        this.victoryContractsItem = document.getElementById('victory-contracts');
        this.victoryEpitaph = document.getElementById('victory-epitaph');
        this.menuXP = document.getElementById('menu-xp');
        this.menuBest = document.getElementById('menu-best');
        this.menuClears = document.getElementById('menu-clears');
        this.menuBestMedal = document.getElementById('menu-best-medal');
        this.menuNextUnlock = document.getElementById('menu-next-unlock');
        this.menuDailySeed = document.getElementById('menu-daily-seed');
        this.setupModeLabel = document.getElementById('setup-mode-label');
        this.setupGoalHeight = document.getElementById('setup-goal-height');
        this.setupContracts = document.getElementById('setup-contracts');

        // Progression Elements
        this.flavorToast = document.getElementById('flavor-toast');
        this.flavorText = document.getElementById('flavor-text');
        this.bossBanner = document.getElementById('boss-banner'); // Added
        this.bossBannerTitle = document.getElementById('boss-banner-title'); // Added
        this.bossBannerFlavor = document.getElementById('boss-banner-flavor'); // Added
        this.phaseBanner = document.getElementById('phase-banner');
        this.phaseTitle = document.getElementById('phase-title');
        
        this.weatherOverlay = document.getElementById('weather-overlay');
        this.darknessOverlay = document.getElementById('darkness-overlay');
        this.gameContainer = document.getElementById('game-container');

        this.dangerColors = ['#2ed573', '#ffa502', '#ff7f50', '#ff4757'];
        this.dangerLabels = ['STABLE', 'WARNING', 'DANGER', 'COLLAPSE IMMINENT'];
        
        this.flavorTimeout = null;
        this.phaseTimeout = null;
        this.calloutTimeout = null;
    }

    bindEvents(callbacks) {
        this.btnPlay.addEventListener('click', () => callbacks.onPlayClicked('normal'));
        if (this.btnPlayDaily) this.btnPlayDaily.addEventListener('click', () => callbacks.onPlayClicked('daily'));
        if (this.btnPlayChaos) this.btnPlayChaos.addEventListener('click', () => callbacks.onPlayClicked('chaos'));
        this.btnStartGame.addEventListener('click', callbacks.onStartGameClicked);
        if (this.btnAddBot) this.btnAddBot.addEventListener('click', callbacks.onAddBotClicked);
        if (this.btnBotDiff) this.btnBotDiff.addEventListener('click', callbacks.onBotDiffClicked);
        this.btnBackMenu.addEventListener('click', callbacks.onBackClicked);
        this.btnRestart.addEventListener('click', callbacks.onRestartClicked);
        this.btnQuit.addEventListener('click', callbacks.onQuitClicked);
        if (this.btnVictoryRestart) this.btnVictoryRestart.addEventListener('click', callbacks.onRestartClicked);
        if (this.btnVictoryQuit) this.btnVictoryQuit.addEventListener('click', callbacks.onQuitClicked);
        this.btnResume.addEventListener('click', callbacks.onResumeClicked);
        this.btnQuitPause.addEventListener('click', callbacks.onQuitClicked);
        
        this.btnOptions.addEventListener('click', callbacks.onOptionsClicked);
        this.btnOptionsBack.addEventListener('click', callbacks.onOptionsBackClicked);

        const updateVols = () => {
            let m = parseFloat(this.volMaster.value);
            let mu = parseFloat(this.volMusic.value);
            let s = parseFloat(this.volSfx.value);
            let r = this.chkReduced.checked;
            let w = this.chkWeather.checked;
            let c = this.chkShake.checked;
            
            this.lblMaster.innerText = Math.round(m * 100) + '%';
            this.lblMusic.innerText = Math.round(mu * 100) + '%';
            this.lblSfx.innerText = Math.round(s * 100) + '%';
            
            callbacks.onVolumeChanged(m, s, mu, r, w, c);
        };

        this.volMaster.addEventListener('input', updateVols);
        this.volMusic.addEventListener('input', updateVols);
        this.volSfx.addEventListener('input', updateVols);
        this.chkReduced.addEventListener('change', updateVols);
        this.chkWeather.addEventListener('change', updateVols);
        this.chkShake.addEventListener('change', updateVols);
    }

    setOptionsUI(config) {
        this.volMaster.value = config.master;
        this.volMusic.value = config.music;
        this.volSfx.value = config.sfx;
        this.chkReduced.checked = config.reducedIntensity;
        this.chkWeather.checked = config.weatherEffects !== false;
        this.chkShake.checked = config.cameraShake !== false;
        
        this.lblMaster.innerText = Math.round(config.master * 100) + '%';
        this.lblMusic.innerText = Math.round(config.music * 100) + '%';
        this.lblSfx.innerText = Math.round(config.sfx * 100) + '%';
    }

    updateMenuMeta(summary, dailyChallenge) {
        if (!summary) return;
        if (this.menuXP) this.menuXP.innerText = summary.xp;
        if (this.menuBest) this.menuBest.innerText = `${summary.maxHeightOverall}m`;
        if (this.menuClears) this.menuClears.innerText = summary.districtClears || 0;
        if (this.menuBestMedal) {
            this.menuBestMedal.innerText = summary.bestMedal || 'NONE';
            this.menuBestMedal.style.color = this.resolveMedalColor(summary.bestMedal || 'NONE');
        }
        if (this.menuNextUnlock) {
            this.menuNextUnlock.innerText = summary.nextUnlock
                ? `${summary.nextUnlock.name} @ ${summary.nextUnlock.reqXP} XP`
                : 'All systems online';
        }
        if (this.menuDailySeed) {
            this.menuDailySeed.innerText = dailyChallenge
                ? `${dailyChallenge.seedKey} / ${dailyChallenge.themeName}`
                : '---';
        }
    }

    resolveMedalColor(medal) {
        const colors = {
            NONE: '#7f8c8d',
            BRONZE: '#cd7f32',
            SILVER: '#cfd8dc',
            GOLD: '#f1c40f',
            PLATINUM: '#7bedff'
        };
        return colors[medal] || colors.NONE;
    }

    setPlayMode(modeLabel, chaosUnlocked = true) {
        if (this.btnPlayChaos) {
            this.btnPlayChaos.disabled = !chaosUnlocked;
            this.btnPlayChaos.innerText = chaosUnlocked ? 'PLAY (CHAOS)' : 'CHAOS LOCKED';
        }
        if (this.setupModeLabel) this.setupModeLabel.innerText = modeLabel;
    }

    updateSetupBrief(goalSummary, contracts = []) {
        if (!goalSummary) return;
        if (this.setupGoalHeight) {
            const prefix = goalSummary.isDaily ? 'Daily district' : 'District goal';
            this.setupGoalHeight.innerText = `${prefix}: clear ${goalSummary.targetHeight}m`;
        }
        if (this.setupContracts) {
            this.setupContracts.innerHTML = contracts.length > 0
                ? contracts.map(c => `&bull; ${c.desc}`).join('<br>')
                : 'Contracts load on run start.';
        }
    }

    showScreen(screenName) {
        this.scrMenu.classList.add('hidden');
        this.scrSetup.classList.add('hidden');
        this.scrGameover.classList.add('hidden');
        if (this.scrVictory) this.scrVictory.classList.add('hidden');
        this.scrPause.classList.add('hidden');
        this.scrOptions.classList.add('hidden');

        if (screenName === 'menu') this.scrMenu.classList.remove('hidden');
        if (screenName === 'setup') this.scrSetup.classList.remove('hidden');
        if (screenName === 'gameover') this.scrGameover.classList.remove('hidden');
        if (screenName === 'victory' && this.scrVictory) this.scrVictory.classList.remove('hidden');
        if (screenName === 'pause') this.scrPause.classList.remove('hidden');
        if (screenName === 'options') this.scrOptions.classList.remove('hidden');
    }

    showHUD() { this.hud.classList.remove('hidden'); }
    hideHUD() { this.hud.classList.add('hidden'); }
    showPause() { this.scrPause.classList.remove('hidden'); }
    hidePause() { this.scrPause.classList.add('hidden'); }

    showGameOver(score, height, epitaph, summary = null) {
        if (this.finalScoreItem) this.finalScoreItem.innerText = score;
        if (this.finalHeightItem) this.finalHeightItem.innerText = `${height}m`;
        if (this.gameoverEpitaph) this.gameoverEpitaph.innerText = epitaph;
        if (summary) {
            if (this.finalXPItem) this.finalXPItem.innerText = `+${summary.xpGained} XP`;
            if (this.finalMedalItem) {
                this.finalMedalItem.innerText = summary.medal;
                this.finalMedalItem.style.color = summary.medalColor || '#fff';
            }
            if (this.finalContractsItem) this.finalContractsItem.innerText = `${summary.completedContracts}/${summary.totalContracts}`;
        }
        this.weatherOverlay.style.opacity = '0';
        this.darknessOverlay.style.opacity = '0';
        this.showScreen('gameover');
    }

    showVictory(score, height, epitaph, summary) {
        if (this.victoryScoreItem) this.victoryScoreItem.innerText = score;
        if (this.victoryHeightItem) this.victoryHeightItem.innerText = `${height}m`;
        if (this.victoryEpitaph) this.victoryEpitaph.innerText = epitaph;
        if (summary) {
            if (this.victoryXPItem) this.victoryXPItem.innerText = `+${summary.xpGained} XP`;
            if (this.victoryMedalItem) {
                this.victoryMedalItem.innerText = summary.medal;
                this.victoryMedalItem.style.color = summary.medalColor || '#fff';
            }
            if (this.victoryContractsItem) this.victoryContractsItem.innerText = `${summary.completedContracts}/${summary.totalContracts}`;
        }
        this.weatherOverlay.style.opacity = '0';
        this.darknessOverlay.style.opacity = '0';
        this.showScreen('victory');
    }

    setSkyColors(colors) {
        this.gameContainer.style.background = `radial-gradient(circle at top, ${colors[0]} 0%, ${colors[1]} 100%)`;
    }

    setWeather(isRaining, isDark) {
        const rainLevel = typeof isRaining === 'number' ? Utils.clamp(isRaining, 0, 1) : (isRaining ? 1 : 0);
        const darkLevel = typeof isDark === 'number' ? Utils.clamp(isDark, 0, 1) : (isDark ? 1 : 0);
        this.weatherOverlay.style.opacity = `${rainLevel}`;
        this.weatherOverlay.style.filter = `blur(${rainLevel * 0.6}px)`;
        this.darknessOverlay.style.opacity = `${darkLevel}`;
        this.gameContainer.style.setProperty('--exposure-size', `${Utils.lerp(68, 26, darkLevel)}%`);
    }

    showFlavorText(msg, type = "playful") {
        this.flavorText.textContent = msg;
        this.flavorToast.classList.add('show');
        
        // Color coding by type
        let borderColors = {
            'playful': '#2ecc71',
            'dramatic': '#e74c3c',
            'warning': '#f1c40f',
            'relief': '#3498db'
        };
        this.flavorToast.style.borderColor = borderColors[type] || '#fff';

        if (this.flavorTimeout) clearTimeout(this.flavorTimeout);
        this.flavorTimeout = setTimeout(() => {
            this.flavorToast.classList.remove('show');
        }, 4000); // 4 seconds
    }

    showPhaseBanner(phaseName) {
        this.phaseTitle.innerText = phaseName;
        this.phaseBanner.classList.add('show');
        
        if (this.phaseTimeout) clearTimeout(this.phaseTimeout);
        this.phaseTimeout = setTimeout(() => {
            this.phaseBanner.classList.remove('show');
        }, 3000);
    }

    updateSetupSlot(slotId, assigned, inputType) {
        const slot = document.getElementById(`slot-${slotId + 1}`);
        const status = slot.querySelector('.status');
        const mapping = slot.querySelector('.mapping');
        const classSelector = slot.querySelector('.class-selector');
        const keyboardMappings = [
            'Move: Left/Right  |  Drop: Enter',
            'Move: A D  |  Jump: Space<br>Grab: F  |  Throw: G  |  Brace: Q/E',
            'Move: J L  |  Jump: I<br>Grab: O  |  Throw: P  |  Brace: U/Y',
            'Move: Num4 Num6  |  Jump: Num8<br>Grab: Num7  |  Throw: Num9  |  Brace: Num1/Num3'
        ];
        const joinPrompts = [
            'Arrow keys or Gamepad to join...',
            'A/D keys or Gamepad to join...',
            'J/L keys or Gamepad to join...',
            'Numpad 4/6 or Gamepad to join...'
        ];

        if (assigned) {
            slot.classList.add('active');
            status.innerText = `Joined! (${inputType.toUpperCase()})`;
            if (inputType === 'keyboard') {
                mapping.innerHTML = keyboardMappings[slotId] || keyboardMappings[1];
            } else if (inputType === 'gamepad') {
                if (slotId === 0) {
                    mapping.innerHTML = 'Move: D-Pad/Stick  |  Drop: A / Cross';
                } else {
                    mapping.innerHTML = 'Jump: A  |  Grab: X  |  Throw: B<br>Brace: LB/RB  |  Pause: Start';
                }
            } else {
                mapping.innerHTML = 'AI Controlled';
            }
            mapping.classList.remove('hidden');
            if (classSelector && slotId > 0) classSelector.classList.remove('hidden');
        } else {
            slot.classList.remove('active');
            status.innerText = joinPrompts[slotId] || joinPrompts[1];
            mapping.classList.add('hidden');
            if (classSelector) classSelector.classList.add('hidden');
        }
    }

    showBossBanner(name, flavorText) {
        this.bossBannerTitle.innerText = `WARNING: ${name.toUpperCase()}`;
        this.bossBannerFlavor.innerText = flavorText;
        this.bossBanner.classList.remove('hidden');
        
        // Force reflow
        void this.bossBanner.offsetWidth;
        this.bossBanner.style.transform = 'scaleY(1)';

        setTimeout(() => {
            this.bossBanner.style.transform = 'scaleY(0)';
            setTimeout(() => this.bossBanner.classList.add('hidden'), 300);
        }, 4000);
    }

    updateClassSelector(slotId, classData, isLocked = false) {
        const slot = document.getElementById(`slot-${slotId + 1}`);
        const className = slot.querySelector('.class-name');
        const classDesc = slot.querySelector('.class-desc');
        
        if (className && classDesc) {
            className.innerText = isLocked ? `${classData.name} (LOCKED)` : classData.name;
            className.style.color = isLocked ? '#7f8c8d' : classData.color;
            classDesc.innerText = isLocked
                ? `Earn ${classData.unlockId ? classData.unlockId.replace('class_', '').toUpperCase() : 'XP'} to unlock.`
                : classData.desc;
        }
    }

    enableStartGame() {
        this.btnStartGame.disabled = false;
    }

    updateScore(amount, height) {
        this.scoreDisp.innerText = amount;
        this.heightDisp.innerText = height + "m";
    }

    updateGoalPanel(goalSummary) {
        if (!goalSummary) return;
        if (this.goalProject) this.goalProject.innerText = goalSummary.projectName || 'District';
        if (this.goalHeight) this.goalHeight.innerText = `Clear ${goalSummary.targetHeight}m`;
        if (this.goalSeed) {
            this.goalSeed.innerText = goalSummary.isDaily
                ? `Daily seed ${goalSummary.dailySeed}`
                : `${goalSummary.completedContracts}/${goalSummary.totalContracts} contracts complete`;
        }
    }

    updateContracts(contracts = []) {
        for (let i = 0; i < this.contractEls.length; i++) {
            const el = this.contractEls[i];
            if (!el) continue;
            const contract = contracts[i];
            if (!contract) {
                el.innerText = '---';
                el.className = 'contract-entry';
                continue;
            }
            el.innerText = `${contract.done ? 'DONE' : `${Math.min(contract.progress || 0, contract.target)}/${contract.target}`}  ${contract.desc}`;
            el.className = `contract-entry${contract.done ? ' done' : ''}`;
        }
    }

    updateBalance(balanceValue, dangerLevel, comState = 0) {
        let percent = 50 + (balanceValue / 2);
        this.balIndicator.style.left = `${percent}%`;
        
        this.balIndicator.querySelector('.indicator-weight').style.borderColor = this.dangerColors[dangerLevel];
        
        this.dangerText.innerText = this.dangerLabels[dangerLevel];
        this.dangerText.style.color = this.dangerColors[dangerLevel];

        const data = typeof comState === 'object'
            ? comState
            : { horizontalOffset: comState, verticalOffset: 0, totalMass: 0, dangerRatio: 0 };
        const horizontalNorm = Utils.clamp((data.horizontalOffset || 0) / 180, -1, 1);
        const verticalNorm = Utils.clamp((data.verticalOffset || 0) / 260, -1, 1);
        const vectorMagnitude = Utils.clamp(Math.hypot(horizontalNorm, verticalNorm), 0, 1);
        const massRatio = Utils.clamp((data.massRatio !== undefined ? data.massRatio : (data.totalMass || 0) / 9000), 0, 1);
        const dangerRatio = Utils.clamp(data.dangerRatio !== undefined ? data.dangerRatio : (Math.abs(balanceValue) / 100), 0, 1);
        const instabilitySignal = Utils.clamp(Math.max(dangerRatio, (vectorMagnitude * 0.78) + (massRatio * 0.22)), 0, 1);
        const vectorAngle = Math.atan2(-verticalNorm, horizontalNorm || 0.001);
        const vectorLength = Utils.lerp(42, 104, Utils.clamp((vectorMagnitude * 0.58) + (massRatio * 0.42), 0, 1));
        const trailLength = Utils.lerp(28, 112, Utils.clamp((instabilitySignal * 0.72) + (massRatio * 0.28), 0, 1));
        const arrowColor = instabilitySignal > 0.82 ? '#ff4757' : (instabilitySignal > 0.55 ? '#ff9f43' : '#8ad8ff');

        if (this.comArrowVector) {
            this.comArrowVector.style.width = `${vectorLength}px`;
            this.comArrowVector.style.transform = `translate(-50%, -50%) rotate(${vectorAngle}rad)`;
            this.comArrowVector.style.background = `linear-gradient(90deg, rgba(117,183,255,0.18) 0%, ${arrowColor} 88%, rgba(255,255,255,0.95) 100%)`;
            this.comArrowVector.style.boxShadow = `0 0 ${10 + (instabilitySignal * 22)}px ${arrowColor}`;
        }
        if (this.comArrowTrail) {
            this.comArrowTrail.style.width = `${trailLength}px`;
            this.comArrowTrail.style.opacity = `${0.18 + (instabilitySignal * 0.7)}`;
            this.comArrowTrail.style.transform = `translate(-50%, -50%) rotate(${vectorAngle}rad)`;
        }
        if (this.comArrowIcon) this.comArrowIcon.style.color = arrowColor;
        if (this.comArrow) this.comArrow.style.opacity = `${0.72 + (instabilitySignal * 0.28)}`;
        if (this.comArrowMass) {
            const tons = (data.totalMass || 0) / 1000;
            this.comArrowMass.textContent = `LOAD ${tons.toFixed(1)}T`;
        }

        this.balanceMeterContainer.classList.toggle('critical', dangerLevel >= 2 || instabilitySignal > 0.72);
        if (this.balanceBg) {
            this.balanceBg.style.opacity = `${0.42 + (instabilitySignal * 0.46)}`;
        }

        if (dangerLevel === 3) this.dangerText.classList.add('shake');
        else this.dangerText.classList.remove('shake');
    }

    updateWeatherStates(weatherState, isRaining, isDark) {
        const state = typeof weatherState === 'object'
            ? weatherState
            : {
                windForce: weatherState || 0,
                rainIntensity: isRaining ? 1 : 0,
                darkness: isDark ? 1 : 0,
                forecastWind: Math.abs(weatherState || 0) / 8,
                forecastRain: isRaining ? 1 : 0,
                forecastDark: isDark ? 1 : 0
            };
        const windy = Math.abs(state.windForce || 0) > 0.75;
        const raining = (state.rainIntensity || 0) > 0.15;
        const dark = (state.darkness || 0) > 0.15;
        this.windState.classList.toggle('active', windy);
        this.windState.classList.toggle('wind', windy);
        this.rainState.classList.toggle('active', raining);
        this.rainState.classList.toggle('rain', raining);
        this.darkState.classList.toggle('active', dark);
        this.darkState.classList.toggle('dark', dark);

        if (this.windForecast) this.windForecast.textContent = this.describeWindForecast(state);
        if (this.rainForecast) this.rainForecast.textContent = this.describeForecast(state.forecastRain, state.rainTrend, 'CLEAR', 'SHOWERS', 'SQUALL');
        if (this.darkForecast) this.darkForecast.textContent = this.describeForecast(state.forecastDark, state.darkTrend, 'OPEN', 'DIM', 'BLACKOUT');
    }

    describeWindForecast(state) {
        const strength = Utils.clamp(state.forecastWind || 0, 0, 1);
        const trend = state.windTrend || 0;
        const dirSource = state.forecastWindDirection !== undefined
            ? state.forecastWindDirection
            : (state.windForce || 0);
        const dirLabel = dirSource < -0.08 ? 'L' : (dirSource > 0.08 ? 'R' : '0');
        const pace = trend > 0.08 ? 'UP' : (trend < -0.08 ? 'DN' : 'ST');
        const tier = strength < 0.18 ? 'CALM' : (strength < 0.55 ? 'GUST' : 'GALE');
        return dirLabel === '0' ? `${pace} ${tier}` : `${pace} ${dirLabel}-${tier}`;
    }

    describeForecast(level, trend, calmLabel, midLabel, intenseLabel) {
        const strength = Utils.clamp(level || 0, 0, 1);
        const prefix = trend > 0.08 ? 'UP' : (trend < -0.08 ? 'DOWN' : 'HOLD');
        if (strength < 0.18) return `${prefix} ${calmLabel}`;
        if (strength < 0.55) return `${prefix} ${midLabel}`;
        return `${prefix} ${intenseLabel}`;
    }

    updateMinimap(floors, players, objects, towerCenterX, comState = null) {
        if (!this.minimapCtx || !this.minimap) return;

        const ctx = this.minimapCtx;
        const width = this.minimap.width;
        const height = this.minimap.height;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(11, 21, 38, 0.92)';
        ctx.fillRect(0, 0, width, height);

        if (!floors || floors.length === 0) return;

        const foundation = floors[0];
        const topFloor = floors[floors.length - 1];
        const minY = topFloor.y - 120;
        const maxY = foundation.y + foundation.h;
        const rangeY = Math.max(240, maxY - minY);
        const centerX = width / 2;

        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, 12);
        ctx.lineTo(centerX, height - 12);
        ctx.stroke();

        const mapX = (worldX) => centerX + Utils.clamp(((worldX - towerCenterX) / 280) * (width * 0.42), -width * 0.42, width * 0.42);
        const mapY = (worldY) => 12 + (((worldY - minY) / rangeY) * (height - 24));

        for (let floor of floors) {
            const y = mapY(floor.y + floor.h * 0.5);
            const left = mapX(floor.x);
            const right = mapX(floor.x + floor.w);
            ctx.strokeStyle = floor.archetype && floor.archetype.isSeesaw ? 'rgba(255,208,98,0.9)' : 'rgba(138,216,255,0.72)';
            ctx.lineWidth = floor.isFoundation ? 5 : 3;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();
        }

        for (let obj of objects) {
            if (obj.heldBy || obj.mass < 60) continue;
            ctx.fillStyle = obj.mass >= 120 ? '#ff4757' : '#ff9f43';
            ctx.beginPath();
            ctx.arc(mapX(obj.x + obj.w / 2), mapY(obj.y + obj.h / 2), obj.mass >= 120 ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        }

        const playerColors = ['#f39c12', '#3498db', '#2ecc71', '#9b59b6'];
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            ctx.fillStyle = playerColors[(p.slot - 1 + playerColors.length) % playerColors.length] || '#ffffff';
            ctx.fillRect(mapX(p.x + p.w / 2) - 3, mapY(p.y + p.h) - 3, 6, 6);
        }

        if (comState) {
            const comX = comState.centerX !== undefined ? comState.centerX : (towerCenterX + (comState.horizontalOffset || 0));
            const comY = comState.centerY !== undefined ? comState.centerY : ((minY + maxY) / 2);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            ctx.arc(mapX(comX), mapY(comY), 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(mapX(comX), mapY(comY), 4, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    showActionCallout(text, type = 'perfect') {
        if (!this.actionCallout) return;
        this.actionCallout.textContent = text;
        this.actionCallout.className = '';
        this.actionCallout.classList.add(type);
        this.actionCallout.classList.add('show');

        if (this.calloutTimeout) clearTimeout(this.calloutTimeout);
        this.calloutTimeout = setTimeout(() => {
            this.actionCallout.classList.remove('show');
        }, 1200);
    }

    updatePieceQueue(upcomingPieces) {
        for (let i = 0; i < 3; i++) {
            let el = document.getElementById(`queue-${i}`);
            if (!el) continue;

            if (upcomingPieces[i]) {
                el.innerText = upcomingPieces[i].name || upcomingPieces[i].id;
                el.style.color = i === 0 ? '#f1c40f' : '#dfe6e9';
            } else {
                el.innerText = '---';
                el.style.color = '#7f8c8d';
            }
        }

        if (this.queueTooltip) {
            const nextPiece = upcomingPieces && upcomingPieces[0];
            if (nextPiece) {
                const material = nextPiece.material ? ` ${nextPiece.material.toUpperCase()}.` : '';
                this.queueTooltip.textContent = `${nextPiece.tooltip || 'Balanced floor segment.'}${material}`;
            } else {
                this.queueTooltip.textContent = 'Stable starter floor.';
            }
        }
    }
}
