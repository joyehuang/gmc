export default class Start extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  preload() {
    // 统一加载所有游戏资源
    this.load.image('sceneBg', 'assets/scene.jpg');
    // 加载所有骰子图片
    this.load.image('dice4',  'assets/dice_4.png');
    this.load.image('dice6',  'assets/dice_6.png');
    this.load.image('dice8',  'assets/dice_8.png');
    this.load.image('dice12', 'assets/dice_12.png');
  }

  create() {
    // 背景
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'sceneBg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // 游戏标题
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'Dice Game', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Start 按钮
    const btnW = 200, btnH = 60;
    const btn = this.add.rectangle(this.scale.width / 2, this.scale.height / 2 + 50, btnW, btnH, 0x333333)
      .setStrokeStyle(3, 0xffffff)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'START GAME', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x4d4d4d));
    btn.on('pointerout',  () => btn.setFillStyle(0x333333));
    btn.on('pointerdown', () => {
      // 切换到主场景
      this.scene.start('MainScene');
    });
  }
}
