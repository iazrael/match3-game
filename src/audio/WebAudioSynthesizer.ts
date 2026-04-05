/**
 * Web Audio 音效合成器 - 生成程序化音效
 * 无需预加载音频文件，运行时实时生成
 */
export class WebAudioSynthesizer {
  private audioContext: AudioContext | null;
  private masterGain: GainNode | null;
  private volume: number;

  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.volume = 0.3;

    // 延迟初始化 AudioContext（需要用户交互）
    this.initAudioContext();
  }

  /**
   * 初始化 AudioContext（需要用户交互触发）
   */
  private initAudioContext(): void {
    if (this.audioContext) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.audioContext.destination);
      }
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  /**
   * 确保音频上下文已初始化并恢复
   */
  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * 设置主音量
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * 获取主音量
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * 播放选择音效（短促的高频音）
   */
  public playSelect(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * 播放交换音效（滑音效果）
   */
  public playSwap(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.linearRampToValueAtTime(600, now + 0.15);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  /**
   * 播放消除音效（连击时音调升高）
   * @param combo 连击数（0-10+），影响音调
   */
  public playClear(combo: number = 0): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const comboClamped = Math.min(combo, 10);

    // 基础频率 + 连击加成
    const baseFreq = 400 + comboClamped * 50;
    const duration = 0.15 + comboClamped * 0.01;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(baseFreq, now);
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + duration / 2);
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + duration);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + duration);

    // 连击高时添加额外的"叮"音效
    if (comboClamped >= 3) {
      this.playSparkle(comboClamped);
    }
  }

  /**
   * 播放特殊元素激活音效（多层和弦）
   */
  public playSpecial(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // 创建三个振荡器形成和弦
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      const startTime = now + index * 0.02;
      const duration = 0.3;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * 播放游戏结束音效（下行旋律）
   */
  public playGameOver(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const melody = [523.25, 493.88, 440.00, 392.00, 349.23]; // C5, B4, A4, G4, F4

    melody.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.value = freq;

      const startTime = now + index * 0.15;
      const duration = 0.2;

      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * 播放连击高时的闪光音效
   */
  private playSparkle(combo: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const sparkleCount = Math.min(Math.floor(combo / 3), 3);

    for (let i = 0; i < sparkleCount; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200 + i * 200, now);
      oscillator.frequency.exponentialRampToValueAtTime(800 + i * 100, now + 0.05);

      const startTime = now + i * 0.03;
      gainNode.gain.setValueAtTime(0.1, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.05);
    }
  }

  /**
   * 播放下落音效
   */
  public playDrop(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * 播放无效移动音效（低沉的错误音）
   */
  public playInvalid(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, now);
    oscillator.frequency.linearRampToValueAtTime(100, now + 0.15);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  /**
   * 播放暂停音效
   */
  public playPause(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, now);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * 播放恢复音效
   */
  public playResume(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, now);
    oscillator.frequency.linearRampToValueAtTime(660, now + 0.1);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * 停止所有正在播放的声音
   */
  public stopAll(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
  }

  /**
   * 销毁音频合成器
   */
  public destroy(): void {
    this.stopAll();
  }
}
