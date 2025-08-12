// 使用全局 Phaser
const Phaser = window.Phaser;

export default class DiceUnit extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} iconKey  // 显示的骰子图标（例如 dice6/dice8 等）
   * @param {number} sides    // 面数，比如 6、8、12
   * @param {string} label    // 按钮文案
   */
  constructor(scene, x, y, iconKey, sides = 6, label = 'Roll') {
    super(scene, x, y);
    console.log(`DiceUnit构造: ${iconKey} at (${x}, ${y}), sides: ${sides}`);
    this.scene = scene;
    this.sides = sides;
    this.value = null;
    this.isRolling = false;
    this.rollHistory = []; // 保存roll历史记录
    this.maxRolls = 5; // 每个骰子的最大可roll次数

    // 固定骰子显示大小，避免原图过大遮挡布局
    this.iconSize = 120; // 统一的显示尺寸（宽高）
    this.icon = scene.add.image(0, 0, iconKey).setOrigin(0.5);
    this.icon.setDisplaySize(this.iconSize, this.iconSize);
    this.add(this.icon);

    // 当前点数文本（显示在骰子中心）
    this.valueText = scene.add.text(0, 0, '-', {
      fontSize: '28px',
      color: '#ffff00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.add(this.valueText);

    // 次数显示（放在骰子下缘附近）
    // 将剩余次数上调，避免与按钮重叠
    this.limitText = scene.add.text(0, this.iconSize / 2 - 8, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5, 0);
    this.add(this.limitText);

    // Roll按钮（放在骰子下方一定距离）
    const buttonWidth = 120, buttonHeight = 40;
    const buttonY = this.iconSize / 2 + 30;
    this.btn = scene.add.rectangle(0, buttonY, buttonWidth, buttonHeight, 0x333333)
      .setStrokeStyle(2, 0xffffff).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.btnText = scene.add.text(0, buttonY, label, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.btn.on('pointerover', () => this.btn.setFillStyle(0x4d4d4d));
    this.btn.on('pointerout',  () => this.btn.setFillStyle(0x333333));
    this.btn.on('pointerdown', () => this.roll());

    this.add(this.btn);
    this.add(this.btnText);

    scene.add.existing(this);
    
    // 加载历史记录
    this.loadFromLocalStorage();

    // 初始化显示剩余次数
    this.updateLimitText();
    if (this.getRollsLeft() <= 0) this.setDisabled(true);
  }

  roll() {
    if (this.isRolling) return Promise.resolve();
    this.isRolling = true;

    // 外部可选的权限检查（例如场景内的顺序锁）
    if (typeof this.canRoll === 'function' && !this.canRoll()) {
      // 小幅抖动提醒不可 roll
      this.scene.tweens.add({
        targets: this,
        x: this.x + 4,
        yoyo: true,
        duration: 60,
        repeat: 2
      });
      return Promise.resolve();
    }

    // 次数用尽则不给 roll
    if (this.getRollsLeft() <= 0) {
      // 闪烁提示
      this.scene.tweens.add({
        targets: this.limitText,
        alpha: { from: 1, to: 0.2 },
        yoyo: true,
        duration: 100,
        repeat: 2
      });
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // 记录当前缩放，做相对抖动，避免跳到原图尺寸
      const baseScaleX = this.icon.scaleX;
      const baseScaleY = this.icon.scaleY;

      this.scene.tweens.add({
        targets: this.icon,
        scaleX: { from: baseScaleX, to: baseScaleX * 1.08 },
        scaleY: { from: baseScaleY, to: baseScaleY * 1.08 },
        angle: { from: 0, to: 12 },
        yoyo: true,
        repeat: 2,
        duration: 120,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          const v = Phaser.Math.Between(1, this.sides);
          this.setValue(v);
          this.icon.setAngle(0);
          // yoyo 会回到 baseScale
          this.isRolling = false;
          this.emit('rolled', v);
          resolve(v);
        }
      });
    });
  }

  // 设置骰子数值并保存到历史记录
  setValue(value) {
    this.value = value;
    this.rollHistory.push({
      value: value,
      timestamp: Date.now()
    });
    this.valueText.setText(String(value));
    
    // 保存到本地存储
    this.saveToLocalStorage();

    // 更新剩余次数显示，必要时禁用按钮
    this.updateLimitText();
    if (this.getRollsLeft() <= 0) this.setDisabled(true);
  }

  // 保存到本地存储
  saveToLocalStorage() {
    const key = `dice_${this.sides}_history`;
    try {
      localStorage.setItem(key, JSON.stringify(this.rollHistory));
    } catch (error) {
      console.warn('无法保存到本地存储:', error);
    }
  }

  // 从本地存储加载历史记录
  loadFromLocalStorage() {
    const key = `dice_${this.sides}_history`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        this.rollHistory = JSON.parse(saved);
        // 如果有历史记录，显示最后一次的结果
        if (this.rollHistory.length > 0) {
          const lastRoll = this.rollHistory[this.rollHistory.length - 1];
          this.value = lastRoll.value;
          this.valueText.setText(String(this.value));
        }
      }
    } catch (error) {
      console.warn('无法从本地存储加载:', error);
      this.rollHistory = [];
    }

    // 同步 UI 状态
    this.updateLimitText();
    this.setDisabled(this.getRollsLeft() <= 0);
  }

  // 获取roll历史记录
  getHistory() {
    return [...this.rollHistory];
  }

  // 清除历史记录
  clearHistory() {
    this.rollHistory = [];
    this.value = null;
    this.valueText.setText('-');
    const key = `dice_${this.sides}_history`;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('无法清除本地存储:', error);
    }

    // 重置剩余次数与按钮
    this.updateLimitText();
    this.setDisabled(false);
  }

  setDisabled(disabled) {
    // 根据 disabled 或剩余次数控制交互
    const shouldDisable = disabled || this.getRollsLeft() <= 0;
    if (shouldDisable) {
      if (typeof this.btn.disableInteractive === 'function') this.btn.disableInteractive();
      this.btn.setAlpha(0.6);
      this.btnText.setAlpha(0.6);
    } else {
      if (!this.btn.input || !this.btn.input.enabled) {
        this.btn.setInteractive({ useHandCursor: true });
      }
      this.btn.setAlpha(1);
      this.btnText.setAlpha(1);
    }
  }

  getRollsLeft() {
    return Math.max(0, this.maxRolls - this.rollHistory.length);
  }

  updateLimitText() {
    const left = this.getRollsLeft();
    this.limitText.setText(`Left: ${left}/${this.maxRolls}`);
  }
}
