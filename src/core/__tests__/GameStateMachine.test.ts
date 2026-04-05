import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateMachine, GameState } from '../GameStateMachine';

describe('GameStateMachine', () => {
  let stateMachine: GameStateMachine;

  beforeEach(() => {
    stateMachine = new GameStateMachine();
  });

  describe('initialization', () => {
    it('should start in IDLE state', () => {
      expect(stateMachine.getCurrentState()).toBe(GameState.IDLE);
    });

    it('should have no previous state initially', () => {
      expect(stateMachine.getPreviousState()).toBeNull();
    });

    it('should not be paused initially', () => {
      expect(stateMachine.isPaused()).toBe(false);
    });
  });

  describe('getCurrentState', () => {
    it('should return current state', () => {
      expect(stateMachine.getCurrentState()).toBe(GameState.IDLE);

      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.getCurrentState()).toBe(GameState.SELECTING);
    });
  });

  describe('getPreviousState', () => {
    it('should return previous state after transition', () => {
      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.getPreviousState()).toBe(GameState.IDLE);

      stateMachine.transition(GameState.SWAPPING);
      expect(stateMachine.getPreviousState()).toBe(GameState.SELECTING);
    });

    it('should return null on first state', () => {
      expect(stateMachine.getPreviousState()).toBeNull();
    });
  });

  describe('canTransition', () => {
    it('should allow transition from IDLE to SELECTING', () => {
      expect(stateMachine.canTransition(GameState.SELECTING)).toBe(true);
    });

    it('should allow transition from SELECTING to SWAPPING', () => {
      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.canTransition(GameState.SWAPPING)).toBe(true);
    });

    it('should allow transition from SWAPPING to MATCHING', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      expect(stateMachine.canTransition(GameState.MATCHING)).toBe(true);
    });

    it('should allow transition from MATCHING to GRAVITY', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.transition(GameState.MATCHING);
      expect(stateMachine.canTransition(GameState.GRAVITY)).toBe(true);
    });

    it('should allow transition from GRAVITY to CASCADE', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.transition(GameState.MATCHING);
      stateMachine.transition(GameState.GRAVITY);
      expect(stateMachine.canTransition(GameState.CASCADE)).toBe(true);
    });

    it('should allow transition from CASCADE to MATCHING', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.transition(GameState.MATCHING);
      stateMachine.transition(GameState.GRAVITY);
      stateMachine.transition(GameState.CASCADE);
      expect(stateMachine.canTransition(GameState.MATCHING)).toBe(true);
    });

    it('should allow transition from CASCADE to IDLE', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.transition(GameState.MATCHING);
      stateMachine.transition(GameState.GRAVITY);
      stateMachine.transition(GameState.CASCADE);
      expect(stateMachine.canTransition(GameState.IDLE)).toBe(true);
    });

    it('should allow transition from SWAPPING to IDLE (no match)', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      expect(stateMachine.canTransition(GameState.IDLE)).toBe(true);
    });

    it('should allow transition to PAUSED from any state', () => {
      for (const state of Object.values(GameState)) {
        if (state === GameState.PAUSED) continue;
        stateMachine.forceSetState(state as GameState);
        expect(stateMachine.canTransition(GameState.PAUSED)).toBe(true);
      }
    });

    it('should allow transition from PAUSED to previous state', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.PAUSED);
      expect(stateMachine.canTransition(GameState.SELECTING)).toBe(true);
    });

    it('should disallow invalid transitions', () => {
      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.canTransition(GameState.GRAVITY)).toBe(false);
      expect(stateMachine.canTransition(GameState.CASCADE)).toBe(false);
    });

    it('should disallow transition to same state', () => {
      expect(stateMachine.canTransition(GameState.IDLE)).toBe(false);
    });

    it('should disallow GAME_OVER transitions except to PAUSED', () => {
      stateMachine.forceSetState(GameState.GAME_OVER);
      expect(stateMachine.canTransition(GameState.IDLE)).toBe(false);
      expect(stateMachine.canTransition(GameState.SELECTING)).toBe(false);
      expect(stateMachine.canTransition(GameState.PAUSED)).toBe(true);
    });
  });

  describe('transition', () => {
    it('should transition to valid state', () => {
      const result = stateMachine.transition(GameState.SELECTING);
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(GameState.SELECTING);
    });

    it('should fail transition to invalid state', () => {
      const result = stateMachine.transition(GameState.GRAVITY);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(stateMachine.getCurrentState()).toBe(GameState.IDLE);
    });

    it('should emit state-change event on successful transition', () => {
      let eventFired = false;
      let capturedFrom: GameState | undefined;
      let capturedTo: GameState | undefined;

      stateMachine.on('state-change', (from: GameState, to: GameState) => {
        eventFired = true;
        capturedFrom = from;
        capturedTo = to;
      });

      stateMachine.transition(GameState.SELECTING);

      expect(eventFired).toBe(true);
      expect(capturedFrom).toBe(GameState.IDLE);
      expect(capturedTo).toBe(GameState.SELECTING);
    });

    it('should not emit event on failed transition', () => {
      let eventFired = false;

      stateMachine.on('state-change', () => {
        eventFired = true;
      });

      stateMachine.transition(GameState.GRAVITY);

      expect(eventFired).toBe(false);
    });

    it('should track previous state', () => {
      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.getPreviousState()).toBe(GameState.IDLE);

      stateMachine.transition(GameState.SWAPPING);
      expect(stateMachine.getPreviousState()).toBe(GameState.SELECTING);
    });
  });

  describe('pause', () => {
    it('should transition to PAUSED state', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.pause();
      expect(stateMachine.getCurrentState()).toBe(GameState.PAUSED);
    });

    it('should return to previous state on resume', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.pause();
      stateMachine.resume();
      expect(stateMachine.getCurrentState()).toBe(GameState.SELECTING);
    });

    it('should emit pause event', () => {
      stateMachine.transition(GameState.SELECTING);

      let eventFired = false;
      stateMachine.on('paused', () => {
        eventFired = true;
      });

      stateMachine.pause();
      expect(eventFired).toBe(true);
    });

    it('should emit resumed event', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.pause();

      let eventFired = false;
      stateMachine.on('resumed', (previousState: GameState) => {
        eventFired = true;
        expect(previousState).toBe(GameState.SELECTING);
      });

      stateMachine.resume();
      expect(eventFired).toBe(true);
    });

    it('should handle pause from GAME_OVER', () => {
      stateMachine.transition(GameState.GAME_OVER);
      stateMachine.pause();
      expect(stateMachine.getCurrentState()).toBe(GameState.PAUSED);

      stateMachine.resume();
      expect(stateMachine.getCurrentState()).toBe(GameState.GAME_OVER);
    });
  });

  describe('isPaused', () => {
    it('should return true when paused', () => {
      expect(stateMachine.isPaused()).toBe(false);
      stateMachine.pause();
      expect(stateMachine.isPaused()).toBe(true);
    });

    it('should return false after resume', () => {
      stateMachine.pause();
      stateMachine.resume();
      expect(stateMachine.isPaused()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to IDLE state', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.pause();

      stateMachine.reset();

      expect(stateMachine.getCurrentState()).toBe(GameState.IDLE);
      expect(stateMachine.getPreviousState()).toBeNull();
      expect(stateMachine.isPaused()).toBe(false);
    });

    it('should emit reset event', () => {
      let eventFired = false;

      stateMachine.on('reset', () => {
        eventFired = true;
      });

      stateMachine.reset();
      expect(eventFired).toBe(true);
    });
  });

  describe('setGameOver', () => {
    it('should transition to GAME_OVER state', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.setGameOver();
      expect(stateMachine.getCurrentState()).toBe(GameState.GAME_OVER);
    });

    it('should emit game-over event', () => {
      let eventFired = false;

      stateMachine.on('game-over', () => {
        eventFired = true;
      });

      stateMachine.setGameOver();
      expect(eventFired).toBe(true);
    });
  });

  describe('isState', () => {
    it('should return true for current state', () => {
      expect(stateMachine.isState(GameState.IDLE)).toBe(true);
      expect(stateMachine.isState(GameState.SELECTING)).toBe(false);
    });

    it('should return true for any of multiple states', () => {
      stateMachine.forceSetState(GameState.MATCHING);
      expect(stateMachine.isState(GameState.MATCHING, GameState.GRAVITY, GameState.CASCADE)).toBe(true);
      expect(stateMachine.isState(GameState.SELECTING, GameState.SWAPPING)).toBe(false);
    });
  });

  describe('canPlayerAct', () => {
    it('should return true in IDLE state', () => {
      expect(stateMachine.canPlayerAct()).toBe(true);
    });

    it('should return true in SELECTING state', () => {
      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.canPlayerAct()).toBe(true);
    });

    it('should return false during animations', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      expect(stateMachine.canPlayerAct()).toBe(false);

      stateMachine.transition(GameState.MATCHING);
      expect(stateMachine.canPlayerAct()).toBe(false);

      stateMachine.transition(GameState.GRAVITY);
      expect(stateMachine.canPlayerAct()).toBe(false);

      stateMachine.transition(GameState.CASCADE);
      expect(stateMachine.canPlayerAct()).toBe(false);
    });

    it('should return false in GAME_OVER state', () => {
      stateMachine.setGameOver();
      expect(stateMachine.canPlayerAct()).toBe(false);
    });

    it('should return false when paused', () => {
      stateMachine.pause();
      expect(stateMachine.canPlayerAct()).toBe(false);
    });
  });

  describe('isAnimating', () => {
    it('should return true for animation states', () => {
      expect(stateMachine.isAnimating()).toBe(false);

      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      expect(stateMachine.isAnimating()).toBe(true);

      stateMachine.transition(GameState.MATCHING);
      expect(stateMachine.isAnimating()).toBe(true);

      stateMachine.transition(GameState.GRAVITY);
      expect(stateMachine.isAnimating()).toBe(true);

      stateMachine.transition(GameState.CASCADE);
      expect(stateMachine.isAnimating()).toBe(true);
    });

    it('should return false for non-animation states', () => {
      stateMachine.transition(GameState.SELECTING);
      expect(stateMachine.isAnimating()).toBe(false);

      stateMachine.setGameOver();
      expect(stateMachine.isAnimating()).toBe(false);

      stateMachine.pause();
      expect(stateMachine.isAnimating()).toBe(false);
    });
  });

  describe('forceSetState', () => {
    it('should set state without validation', () => {
      stateMachine.forceSetState(GameState.MATCHING);
      expect(stateMachine.getCurrentState()).toBe(GameState.MATCHING);
    });

    it('should emit state-change event', () => {
      let eventFired = false;

      stateMachine.on('state-change', () => {
        eventFired = true;
      });

      stateMachine.forceSetState(GameState.GRAVITY);
      expect(eventFired).toBe(true);
    });
  });

  describe('getTransitionHistory', () => {
    it('should track transition history', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.transition(GameState.MATCHING);

      const history = stateMachine.getTransitionHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
      expect(history[history.length - 1]).toBe(GameState.MATCHING);
    });

    it('should clear history on reset', () => {
      stateMachine.transition(GameState.SELECTING);
      stateMachine.transition(GameState.SWAPPING);
      stateMachine.reset();

      const history = stateMachine.getTransitionHistory();
      expect(history.length).toBe(1); // Only IDLE after reset
    });
  });
});
