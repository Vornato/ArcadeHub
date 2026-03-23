// ui.js
// Handles DOM interactions for menus and HUD

class UIManager {
    constructor() {        
        this.scrMenu = document.getElementById('screen-menu');
        this.scrSetup = document.getElementById('screen-setup');
        this.scrGameover = document.getElementById('screen-gameover');
        this.scrPause = document.getElementById('screen-pause');
        this.scrOptions = document.getElementById('screen-options');
        this.hud = document.getElementById('hud');

        this.btnPlay = document.getElementById('btn-play');
        this.btnPlayChaos = document.getElementById('btn-chaos');
        this.btnStartGame = document.getElementById('btn-start-game');
        this.btnAddBot = document.getElementById('btn-add-bot');
        this.btnBotDiff = document.getElementById('btn-bot-diff');
        this.btnBackMenu = document.getElementById('btn-back-menu');
        this.btnRestart = document.getElementById('btn-restart');
        this.btnQuit = document.getElementById('btn-quit');

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
        this.balIndicator = document.getElementById('balance-indicator');
        this.dangerText = document.getElementById('danger-text');
        
        this.finalScoreItem = document.getElementById('final-score');
        this.finalHeightItem = document.getElementById('final-height');
        this.gameoverEpitaph = document.getElementById('gameover-epitaph');

        // Progression Elements
        this.flavorToast = document.getElementById('flavor-toast');
        this.flavorText = document.getElementById('flavor-text');
        this.weatherText = document.getElementById('weather-text'); // Added
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
    }

    bindEvents(callbacks) {
        this.btnPlay.addEventListener('click', () => callbacks.onPlayClicked(false));
        if (this.btnPlayChaos) this.btnPlayChaos.addEventListener('click', () => callbacks.onPlayClicked(true));
        this.btnStartGame.addEventListener('click', callbacks.onStartGameClicked);
        if (this.btnAddBot) this.btnAddBot.addEventListener('click', callbacks.onAddBotClicked);
        if (this.btnBotDiff) this.btnBotDiff.addEventListener('click', callbacks.onBotDiffClicked);
        this.btnBackMenu.addEventListener('click', callbacks.onBackClicked);
        this.btnRestart.addEventListener('click', callbacks.onRestartClicked);
        this.btnQuit.addEventListener('click', callbacks.onQuitClicked);
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

    showScreen(screenName) {
        this.scrMenu.classList.add('hidden');
        this.scrSetup.classList.add('hidden');
        this.scrGameover.classList.add('hidden');
        this.scrPause.classList.add('hidden');
        this.scrOptions.classList.add('hidden');

        if (screenName === 'menu') this.scrMenu.classList.remove('hidden');
        if (screenName === 'setup') this.scrSetup.classList.remove('hidden');
        if (screenName === 'gameover') this.scrGameover.classList.remove('hidden');
        if (screenName === 'pause') this.scrPause.classList.remove('hidden');
        if (screenName === 'options') this.scrOptions.classList.remove('hidden');
    }

    showHUD() { this.hud.classList.remove('hidden'); }
    hideHUD() { this.hud.classList.add('hidden'); }
    showPause() { this.scrPause.classList.remove('hidden'); }
    hidePause() { this.scrPause.classList.add('hidden'); }

    showGameOver(score, height, epitaph) {
        this.finalScoreItem.innerText = score;
        this.finalHeightItem.innerText = height;
        this.gameoverEpitaph.innerText = epitaph;
        this.weatherOverlay.style.opacity = '0';
        this.darknessOverlay.style.opacity = '0';
        this.showScreen('gameover');
    }

    setSkyColors(colors) {
        this.gameContainer.style.background = `radial-gradient(circle at top, ${colors[0]} 0%, ${colors[1]} 100%)`;
    }

    setWeather(isRaining, isDark) {
        this.weatherOverlay.style.opacity = isRaining ? '1' : '0';
        this.darknessOverlay.style.opacity = isDark ? '1' : '0';
    }

    showFlavorText(msg, type = "playful") {
        this.flavorText.innerHTML = msg;
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

        if (assigned) {
            slot.classList.add('active');
            status.innerText = `Joined! (${inputType.toUpperCase()})`;
            // Show the right control hints based on input type
            if (inputType === 'keyboard') {
                if (slotId === 0) {
                    // Crane / Drop Player - keyboard slot 0
                    mapping.innerHTML = 'Move: ← →  |  Drop: Enter';
                } else {
                    // Inside Player - keyboard slot 1
                    mapping.innerHTML = 'Move: A D  |  Jump: Space<br>Grab: F  |  Throw: G  |  Class: Q/E';
                }
            } else if (inputType === 'gamepad') {
                if (slotId === 0) {
                    mapping.innerHTML = 'Move: D-Pad/Stick  |  Drop: A / Cross';
                } else {
                    mapping.innerHTML = 'Jump: A  |  Grab: X  |  Throw: B<br>Class: LB/RB  |  Pause: Start';
                }
            } else {
                mapping.innerHTML = 'AI Controlled';
            }
            mapping.classList.remove('hidden');
            if (classSelector && slotId > 0) classSelector.classList.remove('hidden');
        } else {
            slot.classList.remove('active');
            status.innerText = 'Waiting for input...';
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

    updateClassSelector(slotId, classData) {
        const slot = document.getElementById(`slot-${slotId + 1}`);
        const className = slot.querySelector('.class-name');
        const classDesc = slot.querySelector('.class-desc');
        
        if (className && classDesc) {
            className.innerText = classData.name;
            className.style.color = classData.color;
            classDesc.innerText = classData.desc;
        }
    }

    enableStartGame() {
        this.btnStartGame.disabled = false;
    }

    updateScore(amount, height) {
        this.scoreDisp.innerText = amount;
        this.heightDisp.innerText = height + "m";
    }

    updateBalance(balanceValue, dangerLevel) {
        let percent = 50 + (balanceValue / 2);
        this.balIndicator.style.left = `${percent}%`;
        
        this.balIndicator.querySelector('.indicator-weight').style.borderColor = this.dangerColors[dangerLevel];
        
        this.dangerText.innerText = this.dangerLabels[dangerLevel];
        this.dangerText.style.color = this.dangerColors[dangerLevel];

        if (dangerLevel === 3) this.dangerText.classList.add('shake');
        else this.dangerText.classList.remove('shake');
    }

    updatePieceQueue(upcomingPieces) {
        for (let i = 0; i < 3; i++) {
            let el = document.getElementById(`queue-${i}`);
            if (el && upcomingPieces[i]) {
                el.innerText = upcomingPieces[i].name || upcomingPieces[i].id;
                if (i === 0) el.style.color = '#f1c40f'; // Highlight next
                else el.style.color = '#dfe6e9';
            }
        }
    }
}
