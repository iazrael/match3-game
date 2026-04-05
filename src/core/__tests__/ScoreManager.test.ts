import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../ScoreManager';
import { SpecialType } from '../../types';

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
  });

  describe('initialization', () => {
    it('should start with zero score', () => {
      expect(scoreManager.getScore()).toBe(0);
    });

    it('should start with zero combo', () => {
      expect(scoreManager.getCombo()).toBe(0);
    });

    it('should start with zero moves', () => {
      expect(scoreManager.getMoves()).toBe(0);
    });
  });

  describe('getScore', () => {
    it('should return current score', () => {
      expect(scoreManager.getScore()).toBe(0);

      scoreManager.addScore(100);
      expect(scoreManager.getScore()).toBe(100);

      scoreManager.addScore(50);
      expect(scoreManager.getScore()).toBe(150);
    });
  });

  describe('addScore', () => {
    it('should add score to total', () => {
      scoreManager.addScore(100);
      expect(scoreManager.getScore()).toBe(100);
    });

    it('should emit score-changed event', () => {
      let eventFired = false;
      let capturedScore = 0;

      scoreManager.on('score-changed', (score: number) => {
        eventFired = true;
        capturedScore = score;
      });

      scoreManager.addScore(100);

      expect(eventFired).toBe(true);
      expect(capturedScore).toBe(100);
    });

    it('should handle multiple additions', () => {
      scoreManager.addScore(100);
      scoreManager.addScore(200);
      scoreManager.addScore(50);

      expect(scoreManager.getScore()).toBe(350);
    });
  });

  describe('calculateScore', () => {
    it('should calculate base score for 3-match with no special', () => {
      const score = scoreManager.calculateScore(3, SpecialType.NONE, false);
      expect(score).toBe(30); // 3 * 10 = 30
    });

    it('should calculate base score for 4-match', () => {
      const score = scoreManager.calculateScore(4, SpecialType.NONE, false);
      expect(score).toBe(60); // 4 * 15 = 60
    });

    it('should calculate base score for 5-match', () => {
      const score = scoreManager.calculateScore(5, SpecialType.NONE, false);
      expect(score).toBe(100); // 5 * 20 = 100
    });

    it('should apply combo multiplier for cascade matches', () => {
      scoreManager.incrementCombo();
      const score = scoreManager.calculateScore(3, SpecialType.NONE, true);
      expect(score).toBe(60); // 30 * 2 = 60 (combo multiplier)

      scoreManager.incrementCombo();
      const score2 = scoreManager.calculateScore(3, SpecialType.NONE, true);
      expect(score2).toBe(90); // 30 * 3 = 90
    });

    it('should apply special type bonus', () => {
      const lineScore = scoreManager.calculateScore(4, SpecialType.LINE_HORIZONTAL, false);
      expect(lineScore).toBeGreaterThan(60); // Base 60 + bonus

      const areaScore = scoreManager.calculateScore(4, SpecialType.AREA, false);
      expect(areaScore).toBeGreaterThan(60);

      const rainbowScore = scoreManager.calculateScore(5, SpecialType.RAINBOW, false);
      expect(rainbowScore).toBeGreaterThan(100);
    });

    it('should combine all bonuses', () => {
      scoreManager.incrementCombo();
      scoreManager.incrementCombo();
      const score = scoreManager.calculateScore(5, SpecialType.RAINBOW, true);
      expect(score).toBe(100 * 3 + 200); // Base * (combo+1) + RAINBOW bonus
    });
  });

  describe('getCombo', () => {
    it('should return current combo count', () => {
      expect(scoreManager.getCombo()).toBe(0);

      scoreManager.incrementCombo();
      expect(scoreManager.getCombo()).toBe(1);

      scoreManager.incrementCombo();
      expect(scoreManager.getCombo()).toBe(2);
    });
  });

  describe('incrementCombo', () => {
    it('should increase combo count', () => {
      scoreManager.incrementCombo();
      expect(scoreManager.getCombo()).toBe(1);

      scoreManager.incrementCombo();
      expect(scoreManager.getCombo()).toBe(2);
    });

    it('should emit combo-changed event', () => {
      let eventFired = false;
      let capturedCombo = 0;

      scoreManager.on('combo-changed', (combo: number) => {
        eventFired = true;
        capturedCombo = combo;
      });

      scoreManager.incrementCombo();

      expect(eventFired).toBe(true);
      expect(capturedCombo).toBe(1);
    });
  });

  describe('resetCombo', () => {
    it('should reset combo to zero', () => {
      scoreManager.incrementCombo();
      scoreManager.incrementCombo();
      expect(scoreManager.getCombo()).toBe(2);

      scoreManager.resetCombo();
      expect(scoreManager.getCombo()).toBe(0);
    });

    it('should emit combo-reset event', () => {
      scoreManager.incrementCombo();

      let eventFired = false;
      scoreManager.on('combo-reset', () => {
        eventFired = true;
      });

      scoreManager.resetCombo();

      expect(eventFired).toBe(true);
    });
  });

  describe('getMoves', () => {
    it('should return current move count', () => {
      expect(scoreManager.getMoves()).toBe(0);

      scoreManager.incrementMoves();
      expect(scoreManager.getMoves()).toBe(1);

      scoreManager.incrementMoves();
      expect(scoreManager.getMoves()).toBe(2);
    });
  });

  describe('incrementMoves', () => {
    it('should increase move count', () => {
      scoreManager.incrementMoves();
      expect(scoreManager.getMoves()).toBe(1);

      scoreManager.incrementMoves();
      expect(scoreManager.getMoves()).toBe(2);
    });

    it('should emit moves-changed event', () => {
      let eventFired = false;
      let capturedMoves = 0;

      scoreManager.on('moves-changed', (moves: number) => {
        eventFired = true;
        capturedMoves = moves;
      });

      scoreManager.incrementMoves();

      expect(eventFired).toBe(true);
      expect(capturedMoves).toBe(1);
    });
  });

  describe('getStars', () => {
    it('should return 0 stars for low score', () => {
      expect(scoreManager.getStars()).toBe(0);
    });

    it('should return 1 star for medium score', () => {
      scoreManager.addScore(1000);
      expect(scoreManager.getStars()).toBe(1);
    });

    it('should return 2 stars for high score', () => {
      scoreManager.addScore(3000);
      expect(scoreManager.getStars()).toBe(2);
    });

    it('should return 3 stars for very high score', () => {
      scoreManager.addScore(5000);
      expect(scoreManager.getStars()).toBe(3);
    });

    it('should emit stars-changed event when threshold crossed', () => {
      let eventFired = false;
      let capturedStars = 0;

      scoreManager.on('stars-changed', (stars: number) => {
        eventFired = true;
        capturedStars = stars;
      });

      scoreManager.addScore(1000);

      expect(eventFired).toBe(true);
      expect(capturedStars).toBe(1);
    });

    it('should not emit event when star count unchanged', () => {
      scoreManager.addScore(500);

      let eventFired = false;
      scoreManager.on('stars-changed', () => {
        eventFired = true;
      });

      scoreManager.addScore(100);

      expect(eventFired).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all values to initial state', () => {
      scoreManager.addScore(1000);
      scoreManager.incrementCombo();
      scoreManager.incrementCombo();
      scoreManager.incrementMoves();
      scoreManager.incrementMoves();

      scoreManager.reset();

      expect(scoreManager.getScore()).toBe(0);
      expect(scoreManager.getCombo()).toBe(0);
      expect(scoreManager.getMoves()).toBe(0);
    });

    it('should emit reset event', () => {
      let eventFired = false;

      scoreManager.on('reset', () => {
        eventFired = true;
      });

      scoreManager.reset();

      expect(eventFired).toBe(true);
    });
  });

  describe('setScoreThresholds', () => {
    it('should allow custom star thresholds', () => {
      scoreManager.setScoreThresholds([500, 1500, 3000]);

      scoreManager.addScore(500);
      expect(scoreManager.getStars()).toBe(1);

      scoreManager.addScore(1000);
      expect(scoreManager.getStars()).toBe(2);

      scoreManager.addScore(1500);
      expect(scoreManager.getStars()).toBe(3);
    });
  });

  describe('getMaxCombo', () => {
    it('should track maximum combo achieved', () => {
      expect(scoreManager.getMaxCombo()).toBe(0);

      scoreManager.incrementCombo();
      scoreManager.incrementCombo();
      expect(scoreManager.getMaxCombo()).toBe(2);

      scoreManager.resetCombo();
      scoreManager.incrementCombo();
      expect(scoreManager.getMaxCombo()).toBe(2); // Max stays at 2
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', () => {
      scoreManager.addScore(1500);
      scoreManager.incrementCombo();
      scoreManager.incrementCombo();
      scoreManager.incrementMoves();

      const stats = scoreManager.getStatistics();

      expect(stats.score).toBe(1500);
      expect(stats.combo).toBe(2);
      expect(stats.maxCombo).toBe(2);
      expect(stats.moves).toBe(1);
      expect(stats.stars).toBe(1);
    });
  });
});
