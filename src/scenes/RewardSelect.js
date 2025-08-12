// Use global Phaser injected by phaser.js
const Phaser = window.Phaser;

export default class RewardSelect extends Phaser.Scene {
  constructor() {
    super('RewardSelect');
  }

  preload() {
    // Assets already loaded in Start scene
  }

  create(data) {
    const level = data?.level ?? 1;
    const nextLevel = data?.nextLevel ?? level + 1;

    // Background
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'sceneBg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(0);

    // Title
    this.add.text(this.scale.width / 2, 110, 'Reward', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1);

    const y = this.scale.height / 2 + 10;

    // 展示统一的 reward1 + Continue 按钮
    const imgKey = this.textures.exists('reward1_png') ? 'reward1_png' :
                   (this.textures.exists('reward1_jpg') ? 'reward1_jpg' : null);
    if (imgKey) {
      this.add.image(this.scale.width / 2, y, imgKey)
        .setOrigin(0.5)
        .setDepth(2)
        .setScale(0.5);
    } else {
      const card = this.add.rectangle(this.scale.width / 2, y, 220, 320, 0x000000)
        .setStrokeStyle(3, 0xffffff)
        .setOrigin(0.5)
        .setAlpha(0.85)
        .setDepth(2);
      this.add.text(this.scale.width / 2, y, 'Reward 1', {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(3);
    }

    const btnW = 140, btnH = 44;
    const x = this.scale.width / 2, by = y + 220;
    const bg = this.add.rectangle(x, by, btnW, btnH, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5)
      .setAlpha(0.9)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, by, 'Continue', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(4);
    bg.on('pointerover', () => bg.setFillStyle(0x333333));
    bg.on('pointerout',  () => bg.setFillStyle(0x000000));
    bg.on('pointerdown', () => {
      localStorage.setItem('last_reward', 'reward1');
      const currentUnlocked = Math.max(1, parseInt(localStorage.getItem('unlocked_level') || '1', 10));
      const ensure = Math.max(currentUnlocked, nextLevel);
      localStorage.setItem('unlocked_level', String(ensure));
      this.scene.start('MainScene', { level: nextLevel });
    });

    // Back to Level Select
    const backW = 120, backH = 36;
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
      this.scene.start('LevelSelect');
    });
  }
}

