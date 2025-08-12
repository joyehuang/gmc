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

    // Reward images (try common extensions; use whichever exists later)
    this.load.image('reward1_png', 'assets/reward1.png');
    this.load.image('reward1_jpg', 'assets/reward1.jpg');

    // Success image (handle common typos)
    this.load.image('succeed_img', 'assets/succeed.jpg');
    this.load.image('succed_img', 'assets/succed.jpg');
    this.load.image('succed_png', 'assets/succed.png');

    // 加载背景音乐（注意文件名大小写）
    this.load.audio('bgm', [
      'assets/bgm.MP3'
    ]);
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
      // 解锁音频上下文（Safari/移动端需要用户手势）
      if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
      // 切换到关卡选择
      this.scene.start('LevelSelect');
    });
  }
}
