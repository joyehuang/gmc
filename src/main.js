import Start from './scenes/Start.js';
import LevelSelect from './scenes/LevelSelect.js';
import MainScene from './scenes/MainScene.js';

// 使用全局 Phaser（phaser.js 通过 script 标签注入）
const Phaser = window.Phaser;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#121212',
  parent: 'game-root',
  scene: [Start, LevelSelect, MainScene] // Start -> LevelSelect -> Main
};

new Phaser.Game(config);
