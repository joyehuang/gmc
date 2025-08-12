// Use global Phaser injected by phaser.js script
const Phaser = window.Phaser;

export default class LevelSelect extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  preload() {
    // All assets already loaded in Start scene
  }

  create() {
    // Background
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'sceneBg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(0);

    // Title
    this.add.text(this.scale.width / 2, 120, 'Select Level', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1);

    // Levels grid (1..6) with lock based on progress
    const levels = [1, 2, 3, 4, 5, 6];
    const unlockedLevel = Math.max(1, parseInt(localStorage.getItem('unlocked_level') || '1', 10));
    const cols = 3;
    const size = 90; // square button size
    const gap = 28;
    const totalW = cols * size + (cols - 1) * gap;
    const startX = (this.scale.width - totalW) / 2 + size / 2;
    const startY = this.scale.height / 2 - size - 20;

    levels.forEach((lvl, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * (size + gap);
      const y = startY + row * (size + gap);

      const rect = this.add.rectangle(x, y, size, size, 0x000000)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0xffffff)
        .setDepth(2)
        .setAlpha(0.85)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(x, y, String(lvl), {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(3);

      const isLocked = lvl > unlockedLevel;
      if (isLocked) {
        rect.setAlpha(0.5);
        txt.setAlpha(0.5);
        rect.disableInteractive();
        // Locked badge
        this.add.text(x, y + size / 2 + 14, 'Locked', {
          fontSize: '14px', color: '#ff6666', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(3);
      } else {
        rect.on('pointerover', () => rect.setFillStyle(0x222222));
        rect.on('pointerout',  () => rect.setFillStyle(0x000000));
        rect.on('pointerdown', () => {
          this.scene.start('MainScene', { level: lvl });
        });
      }
    });

    // Back to Start
    const backW = 110, backH = 36;
    const backX = 16 + backW / 2;
    const backY = 16 + backH / 2;
    const backBg = this.add.rectangle(backX, backY, backW, backH, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0.85)
      .setInteractive({ useHandCursor: true });
    const backTxt = this.add.text(backX, backY, 'Back', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(10);
    backBg.on('pointerover', () => backBg.setFillStyle(0x333333));
    backBg.on('pointerout',  () => backBg.setFillStyle(0x000000));
    backBg.on('pointerdown', () => {
      this.scene.start('Start');
    });
  }
}

