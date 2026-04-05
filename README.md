# 🎮 消消乐 H5 游戏

Match-3 消消乐游戏，使用 Phaser.js + TypeScript + Vite 构建。

## ✨ 功能特性

- 🎯 **经典玩法**：点击交换相邻元素，消除三个或以上同色元素
- 🔥 **连锁反应**：消除后自动下落，触发连锁消除
- 📊 **分数系统**：基础分数 + 连击加成 + 特殊元素加成
- 🔊 **程序化音效**：Web Audio API 实时合成，无需音频资源
- 📱 **移动端适配**：响应式设计，支持触摸操作
- ⏸️ **暂停/重置**：快捷键支持（P/R）

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Phaser.js | 3.90.0 | 游戏引擎 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Vitest | 3.x | 单元测试 |
| Web Audio API | - | 程序化音效 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 📁 项目结构

```
src/
├── core/           # 核心游戏逻辑
│   ├── MatchDetector.ts    # 匹配检测算法
│   ├── GravityEngine.ts    # 重力下落算法
│   ├── GridManager.ts      # 棋盘状态管理
│   ├── GameStateMachine.ts # 游戏状态机
│   ├── ScoreManager.ts     # 分数计算
│   └── GameEventEmitter.ts # 事件系统
├── audio/          # 音效系统
│   └── WebAudioSynthesizer.ts # 程序化音效合成
├── scenes/         # Phaser 场景
│   └── GameScene.ts        # 游戏主场景
├── types/          # 类型定义
│   └── index.ts            # Tile, Match, SpecialType 等
└── main.ts         # 入口文件
```

## 🎯 游戏玩法

1. **选择**：点击一个元素进行选择（高亮显示）
2. **交换**：点击相邻元素进行交换
3. **消除**：形成 3+ 同色连线自动消除
4. **连锁**：消除后上方元素下落，可能触发新消除
5. **分数**：连击越多，分数加成越高

## 🧪 测试覆盖

```
✅ 133 个单元测试
├── MatchDetector (15 tests)  - 匹配检测算法
├── GravityEngine (8 tests)   - 重力下落算法
├── GridManager (30 tests)    - 棋盘状态管理
├── GameStateMachine (48 tests) - 状态机转换
└── ScoreManager (32 tests)   - 分数计算
```

## 🔗 相关文档

- [PRD.md](docs/PRD.md) - 产品需求文档
- [TDD.md](docs/TDD.md) - 技术设计文档

## 🎮 在线演示

GitHub Pages: https://iazrael.github.io/match3-game/

## 📄 许可证

MIT License