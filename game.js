/**
 * Reindeer Chase - A Festive Endless Runner Game
 * 
 * Created by: anirudha-simha
 * GitHub: https://github.com/anirudha-simha/CandyCaneRun
 * 
 * © 2025 anirudha-simha. All rights reserved.
 */

// ===== CONFIGURATION CONSTANTS =====

const COLORS = {
    BACKGROUND: 0x1A2E44,
    GROUND: 0xE0F2F7,
    GROUND_BORDER: 0xC5E4ED,
    MOUNTAIN: 0x2C4A6B,
    MOON: 0xFFF8DC,
    UI_BG: 0xFFFFFF,
    UI_TEXT: 0x333333,
    UI_BUTTON: 0xFF6B6B,
    UI_BUTTON_SHADOW: 0xD45050
};

const GAME_CONFIG = {
    GROUND_HEIGHT_RATIO: 0.15,
    OBSTACLE_SPAWN_DELAY_MIN: 1500,
    OBSTACLE_SPAWN_DELAY_MAX: 2200,
    OBSTACLE_START_SPEED: 150,
    OBSTACLE_MAX_SPEED: 500,
    OBSTACLE_SPEED_PER_POINT: 15,
    OBSTACLE_MIN_HEIGHT: 40,
    OBSTACLE_MAX_HEIGHT: 90,
    OBSTACLE_WIDTH: 20
};

const PLAYER_CONFIG = {
    JUMP_VELOCITY: -600,
    GRAVITY: 1000,
    SIZE: 30,
    OFFSET: 5,
    ROTATION_DURATION: 600,
    FONT_SIZE: '40px'
};

const MOUNTAIN_CONFIG = {
    NUM_PEAKS: 15,
    PEAK_SPACING: 400,
    PEAK_SPACING_VARIANCE: 150,
    MIN_WIDTH: 400,
    MAX_WIDTH: 800,
    HEIGHT_RATIO: 0.6,
    MIN_HEIGHT_PERCENT: 0.4,
    SCROLL_SPEED: 0.5,
    ALPHA: 1.0,
    BUFFER_DISTANCE: 800
};

const SNOW_CONFIG = {
    LIFESPAN_MIN: 8000,
    LIFESPAN_MAX: 15000,
    SPEED_Y_MIN: 30,
    SPEED_Y_MAX: 120,
    SPEED_X_MIN: -30,
    SPEED_X_MAX: 30,
    SCALE_START: 0.3,
    SCALE_END: 2,
    QUANTITY: 5,
    FREQUENCY: 50
};

const AUDIO_CONFIG = {
    SYNTH_VOLUME: -8,
    JUMP_VOLUME: -10,
    HIT_VOLUME: -5,
    BPM: 120,
    REVERB_DECAY: 2,
    REVERB_WET: 0.3
};

const MUSIC_TRACKS = [
    {
        name: "Jingle Bells",
        loopEnd: "8m",
        melody: [
            ["0:0", "E4"], ["0:1", "E4"], ["0:2", "E4"],
            ["1:0", "E4"], ["1:1", "E4"], ["1:2", "E4"],
            ["2:0", "E4"], ["2:1", "G4"], ["2:2", "C4"], ["2:2.5", "D4"],
            ["3:0", "E4"],
            ["4:0", "F4"], ["4:1", "F4"], ["4:2", "F4"], ["4:3", "F4"],
            ["5:0", "F4"], ["5:1", "E4"], ["5:2", "E4"], ["5:3", "E4"],
            ["6:0", "E4"], ["6:1", "D4"], ["6:2", "D4"], ["6:3", "E4"],
            ["7:0", "D4"], ["7:2", "G4"]
        ]
    }
];

const UI_CONFIG = {
    SAFE_AREA_MARGIN: 50,
    MOON_RADIUS: 40,
    MOON_ALPHA: 0.9,
    MOON_OFFSET_X: 80,
    MOON_OFFSET_Y: 60,
    REINDEER_FONT_SIZE: '60px',
    REINDEER_OFFSET_X: 100,
    REINDEER_OFFSET_Y: 200,
    REINDEER_BOB_DISTANCE: 20,
    REINDEER_BOB_DURATION: 1000,
    SCORE_FONT_SIZE: '32px',
    SCORE_OFFSET_X: 20,
    SCORE_OFFSET_Y: 20
};

// ===== BACKGROUND SCENE =====
// Runs continuously behind all other scenes
// Contains: moon, mountains, snow, ground, reindeer

class BackgroundScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BackgroundScene' });
    }

    create() {
        this.groundHeight = this.scale.height * GAME_CONFIG.GROUND_HEIGHT_RATIO;

        this.createBackground();
        this.createMoon();
        this.createMountains();
        this.createSnow();
        this.createGround();
        this.createReindeer();

        this.scale.on('resize', this.resize, this);
    }

    createBackground() {
        this.bg = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            COLORS.BACKGROUND
        );
    }

    createMoon() {
        const safeMargin = UI_CONFIG.SAFE_AREA_MARGIN;
        this.moon = this.add.circle(
            this.scale.width - UI_CONFIG.MOON_OFFSET_X - safeMargin,
            UI_CONFIG.MOON_OFFSET_Y + safeMargin,
            UI_CONFIG.MOON_RADIUS,
            COLORS.MOON,
            UI_CONFIG.MOON_ALPHA
        );
        this.moon.setDepth(1);

        // Add a slight glow effect
        // color, outerStrength, innerStrength, knockout
        this.moon.postFX.addGlow(COLORS.MOON, 1.5, 0, false);
    }

    createMountains() {
        // Create a container or group for mountain peaks
        // We will create enough peaks to cover the screen width + buffer
        // Each peak is a separate Graphics object
        this.mountainPixelsPerUnit = 1; // logical width
        this.mountainPeaks = [];

        const width = this.scale.width;
        // Calculate how many peaks we need to cover the screen + buffer
        // Assuming average width is (MIN + MAX) / 2
        const avgWidth = (MOUNTAIN_CONFIG.MIN_WIDTH + MOUNTAIN_CONFIG.MAX_WIDTH) / 2;
        const totalWidthNeeded = width + MOUNTAIN_CONFIG.BUFFER_DISTANCE * 2;
        const count = Math.ceil(totalWidthNeeded / (avgWidth + MOUNTAIN_CONFIG.PEAK_SPACING)) + 2;

        let currentX = -MOUNTAIN_CONFIG.BUFFER_DISTANCE;

        for (let i = 0; i < count; i++) {
            const peak = this.add.graphics();
            peak.setDepth(2); // Ensure mountains are above moon/bg but below ground/snow
            this.mountainPeaks.push(peak);
            currentX = this.recyclePeak(peak, currentX);
        }
    }

    // Draws a new random peak at specified X and returns the X for the NEXT peak
    recyclePeak(peak, startX) {
        peak.clear();

        const width = MOUNTAIN_CONFIG.MIN_WIDTH + Math.random() * (MOUNTAIN_CONFIG.MAX_WIDTH - MOUNTAIN_CONFIG.MIN_WIDTH);
        const maxMountainHeight = this.scale.height * MOUNTAIN_CONFIG.HEIGHT_RATIO;
        const height = maxMountainHeight * MOUNTAIN_CONFIG.MIN_HEIGHT_PERCENT +
            Math.random() * maxMountainHeight * (1 - MOUNTAIN_CONFIG.MIN_HEIGHT_PERCENT);

        const groundY = this.scale.height - this.groundHeight;

        peak.fillStyle(COLORS.MOUNTAIN, MOUNTAIN_CONFIG.ALPHA);
        peak.beginPath();

        // Draw the peak relative to (0, 0) of the Graphics object
        // Then we set the position of the Graphics object to (startX, 0)

        // Start bottom-left
        peak.moveTo(0, groundY);

        // Go up and across
        for (let x = 0; x <= width; x += 20) {
            const progress = x / width;
            const y = groundY - Math.sin(progress * Math.PI) * height;
            peak.lineTo(x, y);
        }

        // Bottom-right
        peak.lineTo(width, groundY);
        peak.closePath();
        peak.fillPath();

        // Store metadata for recycling
        peak.x = startX;
        peak.y = 0; // We draw relative to groundY, so y is 0
        peak.peakWidth = width;

        // Return the start X for the next mountain
        return startX + MOUNTAIN_CONFIG.PEAK_SPACING + Math.random() * MOUNTAIN_CONFIG.PEAK_SPACING_VARIANCE;
    }

    createSnow() {
        const snowGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        snowGraphics.fillStyle(0xffffff);
        snowGraphics.fillCircle(2, 2, 2);
        snowGraphics.generateTexture('snowflake', 4, 4);

        this.snowEmitter = this.add.particles(0, 0, 'snowflake', {
            x: { min: 0, max: this.scale.width },
            y: -10,
            lifespan: { min: SNOW_CONFIG.LIFESPAN_MIN, max: SNOW_CONFIG.LIFESPAN_MAX },
            speedY: { min: SNOW_CONFIG.SPEED_Y_MIN, max: SNOW_CONFIG.SPEED_Y_MAX },
            speedX: { min: SNOW_CONFIG.SPEED_X_MIN, max: SNOW_CONFIG.SPEED_X_MAX },
            scale: { start: SNOW_CONFIG.SCALE_START, end: SNOW_CONFIG.SCALE_END },
            quantity: SNOW_CONFIG.QUANTITY,
            frequency: SNOW_CONFIG.FREQUENCY
        });
        this.snowEmitter.setDepth(3);
    }

    createGround() {
        this.ground = this.add.graphics();
        this.ground.fillStyle(COLORS.GROUND, 1);
        this.ground.fillRect(0, this.scale.height - this.groundHeight, this.scale.width, this.groundHeight);
        this.ground.fillStyle(COLORS.GROUND_BORDER, 1);
        this.ground.fillRect(0, this.scale.height - this.groundHeight, this.scale.width, 10);
        this.ground.setDepth(4);
    }

    createReindeer() {
        const safeMargin = UI_CONFIG.SAFE_AREA_MARGIN;
        this.reindeer = this.add.text(
            this.scale.width - UI_CONFIG.REINDEER_OFFSET_X - safeMargin,
            this.scale.height - this.groundHeight - UI_CONFIG.REINDEER_OFFSET_Y,
            "🦌",
            { fontSize: UI_CONFIG.REINDEER_FONT_SIZE }
        );
        this.reindeer.setDepth(5);
        this.reindeer.setOrigin(0.5, 0.5);
        this.reindeer.setFlipX(true);

        this.tweens.add({
            targets: this.reindeer,
            y: this.reindeer.y - UI_CONFIG.REINDEER_BOB_DISTANCE,
            duration: UI_CONFIG.REINDEER_BOB_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.groundHeight = height * GAME_CONFIG.GROUND_HEIGHT_RATIO;

        this.bg.setPosition(width / 2, height / 2);
        this.bg.setSize(width, height);

        this.moon.x = width - UI_CONFIG.MOON_OFFSET_X - UI_CONFIG.SAFE_AREA_MARGIN;

        this.ground.clear();
        this.ground.fillStyle(COLORS.GROUND, 1);
        this.ground.fillRect(0, height - this.groundHeight, width, this.groundHeight);
        this.ground.fillStyle(COLORS.GROUND_BORDER, 1);
        this.ground.fillRect(0, height - this.groundHeight, width, 10);

        this.reindeer.x = width - UI_CONFIG.REINDEER_OFFSET_X - UI_CONFIG.SAFE_AREA_MARGIN;
        this.reindeer.y = height - this.groundHeight - UI_CONFIG.REINDEER_OFFSET_Y;

        // Recreate mountains entirely on resize for simplicity
        this.mountainPeaks.forEach(peak => peak.destroy());
        this.createMountains();

        this.snowEmitter.setEmitZone({
            type: 'random',
            source: new Phaser.Geom.Rectangle(0, 0, width, 1)
        });
    }

    update() {
        const buffer = MOUNTAIN_CONFIG.BUFFER_DISTANCE;

        // Find the right-most peak to append after
        let rightMostPeak = null;
        let rightMostX = -Infinity;
        this.mountainPeaks.forEach(peak => {
            if (peak.x > rightMostX) {
                rightMostX = peak.x;
                rightMostPeak = peak;
            }
        });

        this.mountainPeaks.forEach(peak => {
            peak.x -= MOUNTAIN_CONFIG.SCROLL_SPEED;

            // If peak is completely off screen to the left
            if (peak.x + peak.peakWidth < -buffer) {
                // Recycle it! Place it after the right-most peak
                // We use the rightMostPeak's END position (x + width) plus spacing
                const spacing = MOUNTAIN_CONFIG.PEAK_SPACING + Math.random() * MOUNTAIN_CONFIG.PEAK_SPACING_VARIANCE;

                // If rightMostPeak is the one we are currently moving (unlikely but possible if only 1 peak), fallback
                let anchorX = rightMostPeak ? (rightMostPeak.x + rightMostPeak.peakWidth) : (this.scale.width + buffer);

                // Update this peak
                this.recyclePeak(peak, anchorX + spacing);

                // Update rightMostPeak tracking for next iteration in same frame
                rightMostPeak = peak;
                // Note: we can't easily update rightMostX accurately without recalculating width, 
                // but we updated the peak physically so next iteration will find it if needed.
            }
        });
    }
}

// ===== MENU SCENE =====
// Start screen with title and play button

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Semi-transparent panel
        const panel = this.add.rectangle(centerX, centerY, 350, 280, COLORS.UI_BG, 0.95);
        panel.setStrokeStyle(0);

        // Title
        this.add.text(centerX, centerY - 80, '🎄 Reindeer Chase 🎄', {
            fontSize: '28px',
            color: '#333',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(centerX, centerY - 35, 'Help Noodles catch the reindeer!', {
            fontSize: '16px',
            color: '#666',
            fontFamily: 'Segoe UI, sans-serif'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(centerX, centerY, 'Tap or Space to Jump', {
            fontSize: '14px',
            color: '#888',
            fontFamily: 'Segoe UI, sans-serif'
        }).setOrigin(0.5);

        // Play button
        const btnY = centerY + 50;
        const btn = this.add.rectangle(centerX, btnY, 150, 50, COLORS.UI_BUTTON);
        btn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(centerX, btnY, 'Play Now', {
            fontSize: '20px',
            color: '#fff',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Button hover effects
        btn.on('pointerover', () => btn.setFillStyle(0xFF8888));
        btn.on('pointerout', () => btn.setFillStyle(COLORS.UI_BUTTON));
        btn.on('pointerdown', () => this.startGame());

        // Attribution (clickable link to GitHub)
        const attribution = this.add.text(centerX, centerY + 110, 'A game by anirudha-simha', {
            fontSize: '12px',
            color: '#888',
            fontFamily: 'Segoe UI, sans-serif'
        }).setOrigin(0.5);

        attribution.setInteractive({ useHandCursor: true });
        attribution.on('pointerover', () => attribution.setColor('#FF6B6B'));
        attribution.on('pointerout', () => attribution.setColor('#888'));
        attribution.on('pointerdown', () => {
            window.open('https://github.com/anirudha-simha', '_blank');
        });

        // Also allow space/tap to start
        this.input.keyboard.once('keydown-SPACE', () => this.startGame());
        this.input.once('pointerdown', (pointer) => {
            // Only if not clicking the button
            if (!btn.getBounds().contains(pointer.x, pointer.y)) {
                this.startGame();
            }
        });
    }

    startGame() {
        this.scene.start('GameScene');
    }
}

// ===== GAME OVER SCENE =====
// Shows score and try again button

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const score = this.scene.settings.data?.score || 0;

        // Semi-transparent panel
        const panel = this.add.rectangle(centerX, centerY, 300, 220, COLORS.UI_BG, 0.95);

        // Title
        this.add.text(centerX, centerY - 60, 'Ouch!', {
            fontSize: '36px',
            color: '#333',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Score
        this.add.text(centerX, centerY - 10, `Score: ${score}`, {
            fontSize: '24px',
            color: '#666',
            fontFamily: 'Segoe UI, sans-serif'
        }).setOrigin(0.5);

        // Try Again button
        const btnY = centerY + 50;
        const btn = this.add.rectangle(centerX, btnY, 150, 50, COLORS.UI_BUTTON);
        btn.setInteractive({ useHandCursor: true });

        this.add.text(centerX, btnY, 'Try Again', {
            fontSize: '20px',
            color: '#fff',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.on('pointerover', () => btn.setFillStyle(0xFF8888));
        btn.on('pointerout', () => btn.setFillStyle(COLORS.UI_BUTTON));
        btn.on('pointerdown', () => this.restartGame());

        // Also allow space/tap to restart
        this.input.keyboard.once('keydown-SPACE', () => this.restartGame());
    }

    restartGame() {
        this.scene.start('GameScene');
    }
}

// ===== GAME SCENE =====
// Main gameplay - player, obstacles, scoring

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.score = 0;
        this.audioStarted = false;
        this.groundHeight = this.scale.height * GAME_CONFIG.GROUND_HEIGHT_RATIO;

        this.createObstacleTexture();
        this.createPlayer();
        this.createObstacleSystem();
        this.createPhysics();
        this.createInput();
        this.createUI();

        // Start audio
        this.initAudio();

        // Schedule first obstacle
        this.scheduleNextObstacle();

        this.scale.on('resize', this.resize, this);
    }

    createObstacleTexture() {
        if (!this.textures.exists('candyCane')) {
            const width = GAME_CONFIG.OBSTACLE_WIDTH;
            const height = GAME_CONFIG.OBSTACLE_MAX_HEIGHT;
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff);
            graphics.fillRect(0, 0, width, height);
            graphics.fillStyle(0xff0000);
            const stripeHeight = height / 6;
            for (let i = 1; i < 6; i += 2) {
                graphics.fillRect(0, i * stripeHeight, width, stripeHeight);
            }
            graphics.generateTexture('candyCane', width, height);
        }
    }

    createPlayer() {
        const groundY = this.scale.height - this.groundHeight - 25;
        this.cat = this.add.text(100, groundY, "🐈‍⬛", { fontSize: PLAYER_CONFIG.FONT_SIZE });
        this.cat.setOrigin(0.5, 0.5);
        this.cat.setFlipX(true);

        this.physics.add.existing(this.cat);
        this.cat.body.setCollideWorldBounds(true);
        this.cat.body.setGravityY(PLAYER_CONFIG.GRAVITY);
        this.cat.body.setSize(PLAYER_CONFIG.SIZE, PLAYER_CONFIG.SIZE);
        this.cat.body.setOffset(PLAYER_CONFIG.OFFSET, PLAYER_CONFIG.OFFSET);
        // Removing isGrounded property - we will use body.touching.down
    }

    createObstacleSystem() {
        this.obstacles = this.physics.add.group();
        this.spawnEvent = null;
    }

    getRandomSpawnDelay() {
        return GAME_CONFIG.OBSTACLE_SPAWN_DELAY_MIN +
            Math.random() * (GAME_CONFIG.OBSTACLE_SPAWN_DELAY_MAX - GAME_CONFIG.OBSTACLE_SPAWN_DELAY_MIN);
    }

    scheduleNextObstacle() {
        this.spawnEvent = this.time.delayedCall(
            this.getRandomSpawnDelay(),
            () => {
                this.spawnObstacle();
                this.scheduleNextObstacle();
            }
        );
    }

    createPhysics() {
        this.physicsFloor = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height - this.groundHeight,
            this.scale.width,
            10,
            0x000000,
            0
        );
        this.physics.add.existing(this.physicsFloor, true);

        this.physics.add.collider(this.cat, this.physicsFloor, () => {
            // Collision callback no longer needed for state, can be used for FX if needed
            this.cat.rotation = 0;
        });

        this.physics.add.overlap(this.cat, this.obstacles, this.hitObstacle, null, this);
    }

    createInput() {
        this.input.on('pointerdown', this.handleInput, this);
        this.input.keyboard.on('keydown-SPACE', this.handleInput, this);
    }

    createUI() {
        const safeMargin = UI_CONFIG.SAFE_AREA_MARGIN;
        this.scoreText = this.add.text(
            UI_CONFIG.SCORE_OFFSET_X + safeMargin,
            UI_CONFIG.SCORE_OFFSET_Y + safeMargin,
            'Score: 0',
            {
                fontSize: UI_CONFIG.SCORE_FONT_SIZE,
                color: '#fff',
                fontFamily: 'Segoe UI, sans-serif'
            }
        );
        this.scoreText.setDepth(10);
    }

    async initAudio() {
        if (this.audioStarted) return;

        try {
            await Tone.start();
            this.audioStarted = true;

            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "sine" },
                envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 1.5 }
            }).toDestination();
            this.synth.volume.value = AUDIO_CONFIG.SYNTH_VOLUME;

            const reverb = new Tone.Reverb({
                decay: AUDIO_CONFIG.REVERB_DECAY,
                wet: AUDIO_CONFIG.REVERB_WET
            }).toDestination();
            this.synth.connect(reverb);

            this.jumpSynth = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).toDestination();
            this.jumpSynth.volume.value = AUDIO_CONFIG.JUMP_VOLUME;

            this.hitSynth = new Tone.MembraneSynth().toDestination();
            this.hitSynth.volume.value = AUDIO_CONFIG.HIT_VOLUME;

            Tone.Transport.bpm.value = AUDIO_CONFIG.BPM;

            // Start music
            const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
            this.musicPart = new Tone.Part((time, note) => {
                this.synth.triggerAttackRelease(note, "8n", time);
            }, track.melody);
            this.musicPart.loop = true;
            this.musicPart.loopEnd = track.loopEnd;
            Tone.Transport.start();
            this.musicPart.start(0);
        } catch (e) {
            console.log('Audio initialization failed:', e);
        }
    }

    handleInput() {
        this.jump();
    }

    spawnObstacle() {
        const obstacleHeight = GAME_CONFIG.OBSTACLE_MIN_HEIGHT +
            Math.random() * (GAME_CONFIG.OBSTACLE_MAX_HEIGHT - GAME_CONFIG.OBSTACLE_MIN_HEIGHT);

        const x = this.scale.width;
        const y = this.scale.height - this.groundHeight - (obstacleHeight / 2);

        const obstacle = this.obstacles.create(x, y, 'candyCane');
        obstacle.setOrigin(0.5, 0.5);
        const scaleY = obstacleHeight / GAME_CONFIG.OBSTACLE_MAX_HEIGHT;
        obstacle.setScale(1, scaleY);
        obstacle.setVelocityX(-this.getCurrentSpeed());
        obstacle.body.allowGravity = false;
        obstacle.body.setImmovable(true);
        obstacle.body.setSize(GAME_CONFIG.OBSTACLE_WIDTH, obstacleHeight);
    }

    getCurrentSpeed() {
        const speed = GAME_CONFIG.OBSTACLE_START_SPEED + (this.score * GAME_CONFIG.OBSTACLE_SPEED_PER_POINT);
        return Math.min(speed, GAME_CONFIG.OBSTACLE_MAX_SPEED);
    }

    hitObstacle() {
        // Stop game
        if (this.spawnEvent) this.spawnEvent.remove();
        this.physics.pause();

        // Stop music
        if (this.audioStarted) {
            this.hitSynth.triggerAttackRelease("C2", "8n");
            Tone.Transport.stop();
            if (this.musicPart) this.musicPart.stop();
        }

        // Transition to game over scene with score
        this.scene.start('GameOverScene', { score: this.score });
    }

    jump() {
        if (this.cat.body.touching.down) {
            this.cat.body.setVelocityY(PLAYER_CONFIG.JUMP_VELOCITY);

            if (this.audioStarted) {
                this.jumpSynth.triggerAttackRelease("C5", "16n");
            }

            this.tweens.add({
                targets: this.cat,
                angle: 360,
                duration: PLAYER_CONFIG.ROTATION_DURATION,
                ease: 'Cubic.easeOut'
            });
        }
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.groundHeight = height * GAME_CONFIG.GROUND_HEIGHT_RATIO;

        this.physicsFloor.setPosition(width / 2, height - this.groundHeight);
        this.physicsFloor.setSize(width, 10);
        this.physicsFloor.body.updateFromGameObject();

        if (this.cat.y > height - this.groundHeight) {
            this.cat.y = height - this.groundHeight - 25;
        }
    }

    update() {
        // Sync all obstacles to current speed
        const currentSpeed = this.getCurrentSpeed();
        this.obstacles.children.iterate((obstacle) => {
            if (obstacle) {
                obstacle.setVelocityX(-currentSpeed);
                if (obstacle.x < -50) {
                    obstacle.destroy();
                    this.score++;
                    this.scoreText.setText('Score: ' + this.score);
                }
            }
        });
    }

    shutdown() {
        // Clean up when scene stops
        if (this.audioStarted && this.musicPart) {
            Tone.Transport.stop();
            this.musicPart.stop();
        }
    }
}

// ===== GAME INITIALIZATION =====

const gameWrapper = document.getElementById('game-wrapper');

const config = {
    type: Phaser.AUTO,
    parent: 'game-wrapper',
    width: gameWrapper.clientWidth || window.innerWidth,
    height: gameWrapper.clientHeight || window.innerHeight,
    backgroundColor: '#1A2E44',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-wrapper'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BackgroundScene, MenuScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);

// Start with background + menu
game.events.once('ready', () => {
    game.scene.start('BackgroundScene');
    game.scene.start('MenuScene');
});

// Reload on orientation change
let initialOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
window.addEventListener('resize', () => {
    const currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    if (currentOrientation !== initialOrientation) {
        location.reload();
    }
});
