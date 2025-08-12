import DiceUnit from '../DiceUnit.js';

// 使用全局 Phaser
const Phaser = window.Phaser;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.totalScore = 0;
    this.rollsCount = 0;
  }

  preload() {
    // 所有资源已在Start场景加载，这里不需要重复加载
  }

  create() {
    // 添加背景图片（固定在最底层）
    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'sceneBg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
    bg.setDepth(0);

    // 顶部栏背景
    const topBar = this.add.rectangle(this.scale.width/2, 26, this.scale.width, 52, 0x1f1f1f).setOrigin(0.5);
    topBar.setDepth(10);

    // Score Bar
    this.scoreText = this.add.text(16, 16, '', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    });
    this.scoreText.setDepth(11);
    this.updateScoreBar();

    // 在 scene.jpg 背景上放置 4 个骰子（单行水平一排）
    const rowY = this.scale.height / 2 + 40; // 单行 Y 坐标
    const w = this.scale.width;
    const xPositions = [w * 1/5, w * 2/5, w * 3/5, w * 4/5];

    const slots = [
      { key: 'dice4',  sides: 4,  label: 'Roll D4',  x: xPositions[0], y: rowY },
      { key: 'dice6',  sides: 6,  label: 'Roll D6',  x: xPositions[1], y: rowY },
      { key: 'dice8',  sides: 8,  label: 'Roll D8',  x: xPositions[2], y: rowY },
      { key: 'dice12', sides: 12, label: 'Roll D12', x: xPositions[3], y: rowY },
    ];

    // 顺序 roll 逻辑：只有当前索引等于 activeDiceIndex 的骰子可 roll
    this.activeDiceIndex = 0;

    this.diceUnits = slots.map((s, idx) => {
      console.log(`创建骰子 ${idx}: ${s.key} at (${s.x}, ${s.y})`);
      const du = new DiceUnit(this, s.x, s.y, s.key, s.sides, s.label);
      du.setDepth(5);
      // 权限：允许当前骰子或“下一个骰子” roll；一旦进入下一个，前一个被锁
      du.canRoll = () => {
        const isCurrent = idx === this.activeDiceIndex;
        const isNext = idx === this.activeDiceIndex + 1;
        return (isCurrent || isNext) && du.getRollsLeft() > 0;
      };
      du.on('rolled', (val) => this.onDiceRolled(idx, val));
      return du;
    });
    
    console.log(`总共创建了 ${this.diceUnits.length} 个骰子`);

    // 启动新局：清空各骰历史，显示 5/5 次数，并将分数与次数归零
    this.diceUnits.forEach(du => du.clearHistory());
    this.totalScore = 0;
    this.rollsCount = 0;
    this.updateScoreBar();

    // 初始化锁状态：只允许第一个和其“下一个”
    this.refreshDiceLocks();

    // 一键 Roll All（可选）
    this.createRollAllButton();
    
    // 创建清除按钮
    this.createClearButton();
    
    // 初始化时更新分数显示
    this.updateScoreDisplay();
  }

  onDiceRolled(idx, _val) {
    this.rollsCount += 1;
    this.updateScoreDisplay();
    // 若用户开始 roll 下一个骰子，则锁定之前的骰子
    if (idx > this.activeDiceIndex) {
      this.activeDiceIndex = idx;
    }
    this.refreshDiceLocks();
  }

  updateScoreDisplay() {
    const sum = this.diceUnits.reduce((acc, du) => acc + (du.value || 0), 0);
    this.totalScore = sum;
    this.updateScoreBar();
  }

  updateScoreBar() {
    this.scoreText.setText(`Score: ${this.totalScore}    Rolls: ${this.rollsCount}`);
  }

  createRollAllButton() {
    const w = 130, h = 40;
    const x = this.scale.width - w - 16;
    const y = 16 + h/2;

    const bg = this.add.rectangle(x, y, w, h, 0x444444).setStrokeStyle(2, 0xffffff).setOrigin(0.5);
    const txt = this.add.text(x, y, 'Roll All', { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x565656));
    bg.on('pointerout',  () => bg.setFillStyle(0x444444));
    bg.on('pointerdown', async () => {
      // 禁用所有骰子按钮防止重复点击
      this.diceUnits.forEach(du => du.setDisabled(true));
      bg.setAlpha(0.6); // 禁用Roll All按钮视觉反馈
      
      try {
        // 从当前起依次把每个骰子用满
        for (let i = this.activeDiceIndex; i < this.diceUnits.length; i += 1) {
          const du = this.diceUnits[i];
          while (du.getRollsLeft() > 0) {
            await du.roll();
          }
          this.activeDiceIndex = Math.min(i + 1, this.diceUnits.length - 1);
          this.refreshDiceLocks();
        }
        // Roll All操作算作一次roll
        this.rollsCount += 1;
        this.updateScoreDisplay();
      } finally {
        // 重新启用所有按钮
        this.diceUnits.forEach(du => du.setDisabled(false));
        bg.setAlpha(1);
      }
    });
  }

  // 根据 activeDiceIndex 刷新每个骰子的可交互状态
  refreshDiceLocks() {
    this.diceUnits.forEach((du, i) => {
      const isPast = i < this.activeDiceIndex;
      const isCurrent = i === this.activeDiceIndex;
      const isNext = i === this.activeDiceIndex + 1;
      const hasLeft = du.getRollsLeft() > 0;

      if (isPast) {
        du.setDisabled(true);
      } else if ((isCurrent || isNext) && hasLeft) {
        du.setDisabled(false);
      } else {
        du.setDisabled(true);
      }
    });
  }

  createClearButton() {
    const w = 130, h = 40;
    const x = this.scale.width - 280 - 16; // 放在Roll All按钮左边，增加间距
    const y = 16 + h/2;

    const bg = this.add.rectangle(x, y, w, h, 0x663333).setStrokeStyle(2, 0xffffff).setOrigin(0.5);
    const txt = this.add.text(x, y, 'Clear All', { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x774444));
    bg.on('pointerout',  () => bg.setFillStyle(0x663333));
    bg.on('pointerdown', () => {
      // 清除所有骰子的历史记录
      this.diceUnits.forEach(du => du.clearHistory());
      this.totalScore = 0;
      this.rollsCount = 0;
      this.updateScoreBar();
    });
  }
}
