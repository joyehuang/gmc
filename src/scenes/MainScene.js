import DiceUnit from '../DiceUnit.js';

// 使用全局 Phaser
const Phaser = window.Phaser;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.totalScore = 0;
    this.rollsCount = 0;
    this.targetScore = 26; // default, will be overridden by level
    this.effectiveScore = 0; // after pair rule
  }

  preload() {
    // 所有资源已在Start场景加载，这里不需要重复加载
  }

  create(data) {
    // 添加背景图片（固定在最底层）
    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'sceneBg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
    bg.setDepth(0);

    // 顶部栏背景
    const topBar = this.add.rectangle(this.scale.width/2, 26, this.scale.width, 52, 0x1f1f1f).setOrigin(0.5);
    topBar.setDepth(10);

    // Level label（居中，放在上行）
    this.levelText = this.add.text(this.scale.width / 2, 8, '', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setDepth(11);

    // Left: raw dice sum and rolls（下行，避免与 Level 重叠）
    this.sumText = this.add.text(160, 32, '', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    }).setDepth(11);

    // Right: final score (after multiplier) and target（下行）
    this.finalText = this.add.text(this.scale.width - 16, 32, '', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(1, 0).setDepth(11);
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

    // 读取关卡参数，并设置目标分数
    this.level = data?.level ?? 1;
    // Target per level per latest spec
    const targetByLevel = { 1: 20, 2: 30, 3: 40, 4: 50, 5: 60, 6: 100 };
    this.targetScore = targetByLevel[this.level] ?? 26;
    this.levelText.setText(`Level ${this.level}`);

    // 启动新局：清空各骰历史，显示 5/5 次数，并将分数与次数归零
    this.diceUnits.forEach(du => du.clearHistory());
    this.totalScore = 0;
    this.rollsCount = 0;
    this.updateScoreBar();

    // 初始化锁状态：只允许第一个和其“下一个”
    this.refreshDiceLocks();

    // 启动 BGM
    this.initBgm();

    // 返回主页按钮
    this.createBackButton();

    // 右上角按钮已移除（不再创建 Roll All / Clear All）
    
    // 初始化时更新分数显示
    this.updateScoreDisplay();

    // 右下角 End 按钮（提交本关）
    this.createEndButton();

    // 重置结束标志
    this._ended = false;
  }

  initBgm() {
    // 读取本地静音状态，默认开启
    this.bgmOn = JSON.parse(localStorage.getItem('bgm_on') ?? 'true');
    // 创建音频并循环播放
    if (this.sound && this.cache.audio.exists('bgm')) {
      this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
      if (this.bgmOn) this.bgm.play();
    }
  }

  createBackButton() {
    const w = 110, h = 36;
    const x = 16 + w/2;
    const y = 16 + h/2;
    const bg = this.add.rectangle(x, y, w, h, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0.85);
    const txt = this.add.text(x, y, 'Back', { fontSize: '14px', color: '#ffffff', fontFamily: 'monospace' })
      .setOrigin(0.5)
      .setDepth(12);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x4d4d4d));
    bg.on('pointerout',  () => bg.setFillStyle(0x000000));
    bg.on('pointerdown', () => {
      // 停止 BGM 并返回 Start 场景
      if (this.bgm) {
        this.bgm.stop();
      }
      this.scene.start('Start');
    });
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
    // 计算基础分，并根据关卡应用倍率：
    // - Level 1: 只对子翻倍（已实现）
    // - Level 2+: 在 Level 1 规则基础上，若出现顺子（四个连续数，顺序不限），则将这四个数的和×3，再与其他部分累加。
    const values = this.diceUnits.map(du => du.value).filter(v => typeof v === 'number');
    const sum = values.reduce((acc, v) => acc + v, 0);

    const counts = new Map();
    for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);

    let effective = 0;
    let hasPair = false;
    const levelNum = this.level || 1;
    // Multipliers by level (pair, straight, triplet)
    const pairMultByLevel = { 1: 2, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4 };
    const straightMultByLevel = { 1: 1, 2: 3, 3: 3, 4: 3, 5: 5, 6: 5 };
    const tripletMultByLevel = { 1: null, 2: null, 3: 3, 4: 3, 5: 3, 6: 4 };
    const pairMultiplier = pairMultByLevel[levelNum] ?? 2;
    const straightMultiplier = straightMultByLevel[levelNum] ?? 1;
    const tripletMultiplier = tripletMultByLevel[levelNum] ?? null;
    // 第一阶段：按组加成
    for (const [v, c] of counts.entries()) {
      if (tripletMultiplier && c === 3) {
        // 三连：三个相同数字的和 ×3
        hasPair = true;
        effective += v * c * tripletMultiplier; // v*3*3 = v*9
      } else if (c >= 2) {
        // 对子/四同：按关卡对子倍率
        hasPair = true;
        effective += v * c * pairMultiplier;
      } else {
        effective += v * c;
      }
    }

    // 第二阶段（关卡>=2）：顺子（任意3个连续数字）
    if (levelNum >= 2 && values.length >= 3 && straightMultiplier > 1) {
      // 枚举所有3选组合，选择收益最大的顺子三元组
      const v = values;
      const triples = [
        [v[0], v[1], v[2]],
        [v[0], v[1], v[3]],
        [v[0], v[2], v[3]],
        [v[1], v[2], v[3]],
      ];
      let bestGain = 0;
      for (const t of triples) {
        if (t.includes(undefined)) continue;
        const s = [...t].sort((a, b) => a - b);
        const isStraight3 = (s[1] === s[0] + 1) && (s[2] === s[1] + 1);
        if (!isStraight3) continue;
        const straightSum3 = s[0] + s[1] + s[2];
        // 之前这三颗各自按对子/三连已计入的分
        const prev = t.reduce((acc, val) => {
          const cnt = counts.get(val) || 0;
          let mult = 1;
          if (tripletMultiplier && cnt === 3) mult = tripletMultiplier;
          else if (cnt >= 2) mult = pairMultiplier;
          return acc + val * mult;
        }, 0);
        const gain = straightSum3 * straightMultiplier - prev;
        if (gain > bestGain) bestGain = gain;
      }
      if (bestGain > 0) effective += bestGain;
    }

    // 4 连（四个相同数字）直接通关：显示成功图并跳到下一关
    const fourKind = [...counts.values()].some(c => c === 4);
    if (fourKind) {
      this.forcePassWithSucceedImage();
      return;
    }

    this.totalScore = sum;
    this.effectiveScore = effective;
    this.hasPairBonus = hasPair; // 不在UI展示，仅保留状态
    this.updateScoreBar();
  }

  // 用户主动提交结算
  endLevel() {
    if (this._ended) return;
    this._ended = true;
    // 禁用所有骰子交互
    this.diceUnits.forEach(du => du.setDisabled(true));

    const passed = this.effectiveScore >= this.targetScore;
    if (passed) {
      const currentUnlocked = Math.max(1, parseInt(localStorage.getItem('unlocked_level') || '1', 10));
      const next = Math.max(currentUnlocked, (this.level || 1) + 1);
      localStorage.setItem('unlocked_level', String(next));
      this.time.delayedCall(200, () => {
        this.scene.start('RewardSelect', { level: this.level || 1, nextLevel: next });
      });
    } else {
      this.showFailOverlay();
    }
  }

  forcePassWithSucceedImage() {
    if (this._ended) return;
    this._ended = true;
    this.diceUnits.forEach(du => du.setDisabled(true));
    // 直接通关：展示成功图并跳奖励/下一关
    const key = this.textures.exists('succeed_img') ? 'succeed_img' : 'succed_img';
    const img = this.add.image(this.scale.width / 2, this.scale.height / 2, key)
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0.7);

    const next = Math.max( (this.level || 1) + 1, parseInt(localStorage.getItem('unlocked_level') || '1', 10) );
    localStorage.setItem('unlocked_level', String(next));
    this.time.delayedCall(800, () => {
      this.scene.start('RewardSelect', { level: this.level || 1, nextLevel: next });
    });
  }

  createEndButton() {
    const w = 110, h = 40;
    const x = this.scale.width - 16 - w / 2;
    const y = this.scale.height - 16 - h / 2;
    const bg = this.add.rectangle(x, y, w, h, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0.85);
    const txt = this.add.text(x, y, 'End', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(12);

    // 固定在屏幕（即使镜头滚动）
    bg.setScrollFactor(0);
    txt.setScrollFactor(0);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x333333));
    bg.on('pointerout',  () => bg.setFillStyle(0x000000));
    bg.on('pointerdown', () => {
      console.log('[UI] End clicked');
      this.children.bringToTop(bg);
      this.children.bringToTop(txt);
      this.endLevel();
    });

    // 让点击文字也能触发
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', () => {
      console.log('[UI] End text clicked');
      this.endLevel();
    });
  }

  showFailOverlay() {
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.6
    ).setDepth(20);

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, 'Failed', {
      fontSize: '42px', color: '#ff6666', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(21);

    const sub = this.add.text(this.scale.width / 2, this.scale.height / 2, `Score ${this.effectiveScore} / ${this.targetScore}`,
    {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21);

    const btnW = 140, btnH = 40;
    const retryX = this.scale.width / 2 - btnW;
    const lvlX = this.scale.width / 2 + btnW;
    const btnY = this.scale.height / 2 + 60;

    const retryBg = this.add.rectangle(retryX, btnY, btnW, btnH, 0x000000)
      .setStrokeStyle(2, 0xffffff).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });
    const retryTxt = this.add.text(retryX, btnY, 'Retry', { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' })
      .setOrigin(0.5).setDepth(21);

    const lvlBg = this.add.rectangle(lvlX, btnY, btnW, btnH, 0x000000)
      .setStrokeStyle(2, 0xffffff).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });
    const lvlTxt = this.add.text(lvlX, btnY, 'Levels', { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' })
      .setOrigin(0.5).setDepth(21);

    retryBg.on('pointerover', () => retryBg.setFillStyle(0x333333));
    retryBg.on('pointerout',  () => retryBg.setFillStyle(0x000000));
    retryBg.on('pointerdown', () => {
      this.scene.start('MainScene', { level: this.level || 1 });
    });

    lvlBg.on('pointerover', () => lvlBg.setFillStyle(0x333333));
    lvlBg.on('pointerout',  () => lvlBg.setFillStyle(0x000000));
    lvlBg.on('pointerdown', () => {
      this.scene.start('LevelSelect');
    });
  }

  updateScoreBar() {
    this.sumText.setText(`Dice Sum: ${this.totalScore}    Rolls: ${this.rollsCount}`);
    this.finalText.setText(`Final: ${this.effectiveScore} / Target: ${this.targetScore}`);
  }

  createRollAllButton() {
    const w = 130, h = 40;
    const rightMargin = 16;
    const spacing = 12;
    // 清除按钮在最右，Roll All 在其左边
    const clearX = this.scale.width - rightMargin - w / 2;
    const rollAllX = clearX - spacing - w;
    const y = 16 + h / 2;

    const bg = this.add.rectangle(rollAllX, y, w, h, 0x444444)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5)
      .setDepth(12);
    const txt = this.add.text(rollAllX, y, 'Roll All', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(12);

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
    const rightMargin = 16;
    const x = this.scale.width - rightMargin - w / 2; // 紧贴右边缘内侧
    const y = 16 + h / 2;

    const bg = this.add.rectangle(x, y, w, h, 0x663333)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5)
      .setDepth(12);
    const txt = this.add.text(x, y, 'Clear All', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(12);

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
