/**
 * AudioManager - Handles all game audio (music and sound effects)
 * 
 * Uses Phaser audio for MP3 music playback with Tone.js synth fallback.
 * Sound effects (jump, hit) always use Tone.js synthesizers.
 */

const AUDIO_CONFIG = {
    MUSIC_FILE: 'carol-of-the-bells-xmas-background-orchestral-hip-hop-music-1-minute-278984.mp3',
    MUSIC_VOLUME: 0.5,
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

class AudioManager {
    constructor() {
        this.initialized = false;
        this.unlocked = false;
        this.musicLoaded = false;
        this.usingPhaserMusic = false;

        // Phaser audio references
        this.bgMusic = null;

        // Tone.js references
        this.synth = null;
        this.jumpSynth = null;
        this.hitSynth = null;
        this.musicPart = null;
    }

    /**
     * Preload audio assets via Phaser's loader
     * Call this in your scene's preload() method
     */
    preload(scene) {
        scene.load.audio('bgMusic', AUDIO_CONFIG.MUSIC_FILE);

        scene.load.on('filecomplete-audio-bgMusic', () => {
            this.musicLoaded = true;
        });

        scene.load.on('loaderror', (file) => {
            if (file.key === 'bgMusic') {
                console.log('Music file failed to load, will use Tone.js fallback');
                this.musicLoaded = false;
            }
        });
    }

    /**
     * Unlock the Web Audio context (must be called on user gesture)
     * Call this on button click before starting the game
     */
    async unlock() {
        if (this.unlocked) return true;

        try {
            await Tone.start();
            this.unlocked = true;
            return true;
        } catch (e) {
            console.log('Audio context failed to unlock:', e);
            return false;
        }
    }

    /**
     * Initialize all audio systems and start music
     * Call this in your scene's create() method
     */
    async init(scene) {
        if (this.initialized) return;
        this.initialized = true;

        // Initialize Tone.js sound effects (context should already be unlocked)
        this.initSoundEffects();

        // Start music (Phaser MP3 or Tone.js fallback)
        this.startMusic(scene);
    }

    initSoundEffects() {
        try {
            this.jumpSynth = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).toDestination();
            this.jumpSynth.volume.value = AUDIO_CONFIG.JUMP_VOLUME;

            this.hitSynth = new Tone.MembraneSynth().toDestination();
            this.hitSynth.volume.value = AUDIO_CONFIG.HIT_VOLUME;
        } catch (e) {
            console.log('Tone.js sound effects initialization failed:', e);
        }
    }

    startMusic(scene) {
        if (this.musicLoaded && scene.cache.audio.exists('bgMusic')) {
            this.bgMusic = scene.sound.add('bgMusic', {
                loop: true,
                volume: AUDIO_CONFIG.MUSIC_VOLUME
            });
            this.bgMusic.play();
            this.usingPhaserMusic = true;
            console.log('Playing MP3 background music');
        } else {
            this.startFallbackMusic();
        }
    }

    startFallbackMusic() {
        try {
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

            Tone.Transport.bpm.value = AUDIO_CONFIG.BPM;

            const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
            this.musicPart = new Tone.Part((time, note) => {
                this.synth.triggerAttackRelease(note, "8n", time);
            }, track.melody);
            this.musicPart.loop = true;
            this.musicPart.loopEnd = track.loopEnd;
            Tone.Transport.start();
            this.musicPart.start(0);
            this.usingPhaserMusic = false;
            console.log('Playing Tone.js fallback music (Jingle Bells)');
        } catch (e) {
            console.log('Tone.js fallback music failed:', e);
        }
    }

    /**
     * Play jump sound effect
     */
    playJump() {
        if (this.jumpSynth) {
            this.jumpSynth.triggerAttackRelease("C5", "16n");
        }
    }

    /**
     * Play hit/collision sound effect
     */
    playHit() {
        if (this.hitSynth) {
            this.hitSynth.triggerAttackRelease("C2", "8n");
        }
    }

    /**
     * Stop all music
     */
    stopMusic() {
        if (this.usingPhaserMusic && this.bgMusic) {
            this.bgMusic.stop();
        }

        if (!this.usingPhaserMusic) {
            Tone.Transport.stop();
            if (this.musicPart) {
                this.musicPart.stop();
            }
        }
    }

    /**
     * Clean up audio resources
     * Call this in your scene's shutdown() method
     */
    cleanup() {
        this.stopMusic();
        this.initialized = false;
    }

    /**
     * Reset manager state for scene restart
     */
    reset() {
        this.initialized = false;
        this.bgMusic = null;
        this.musicPart = null;
    }
}

// Global instance for use across scenes
const audioManager = new AudioManager();
