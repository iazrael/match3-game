import { describe, it, expect } from 'vitest';
import { MatchDetector } from '../MatchDetector';
import { Tile, TileType, SpecialType } from '../../types';

describe('MatchDetector', () => {
  const createTestGrid = (layout: (TileType | null)[][]): Tile[][] => {
    const grid: Tile[][] = [];
    for (let row = 0; row < layout.length; row++) {
      grid[row] = [];
      for (let col = 0; col < layout[row]!.length; col++) {
        const type = layout[row]![col];
        if (type !== null) {
          grid[row]![col] = { type: type as TileType, special: SpecialType.NONE, position: { row, col } };
        } else {
          grid[row]![col] = null as unknown as Tile;
        }
      }
    }
    return grid;
  };

  describe('findAllMatches', () => {
    it('should detect horizontal match of 3', () => {
      const grid = createTestGrid([
        [0, 0, 0, 1, 2, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.direction).toBe('horizontal');
      expect(matches[0]!.length).toBe(3);
      expect(matches[0]!.startPos).toEqual({ row: 0, col: 0 });
      expect(matches[0]!.endPos).toEqual({ row: 0, col: 2 });
    });

    it('should detect vertical match of 3', () => {
      const grid = createTestGrid([
        [0, 1, 2, 3, 4, 5],
        [0, 2, 3, 4, 5, 0],
        [0, 3, 4, 5, 0, 1],
        [1, 4, 5, 0, 1, 2],
        [2, 5, 0, 1, 2, 3],
        [3, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.direction).toBe('vertical');
      expect(matches[0]!.length).toBe(3);
    });

    it('should detect horizontal match of 4', () => {
      const grid = createTestGrid([
        [0, 0, 0, 0, 2, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.length).toBe(4);
    });

    it('should detect horizontal match of 5', () => {
      const grid = createTestGrid([
        [0, 0, 0, 0, 0, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.length).toBe(5);
    });

    it('should detect multiple separate matches', () => {
      const grid = createTestGrid([
        [0, 0, 0, 1, 1, 1],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(2);
    });

    it('should detect both horizontal and vertical matches', () => {
      const grid = createTestGrid([
        [0, 0, 0, 1, 2, 3],
        [0, 2, 3, 4, 5, 0],
        [0, 3, 4, 5, 0, 1],
        [1, 4, 5, 0, 1, 2],
        [2, 5, 0, 1, 2, 3],
        [3, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(2);
      const horizontal = matches.find(m => m.direction === 'horizontal');
      const vertical = matches.find(m => m.direction === 'vertical');
      expect(horizontal).toBeDefined();
      expect(vertical).toBeDefined();
    });

    it('should return empty array when no matches exist', () => {
      const grid = createTestGrid([
        [0, 1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches).toHaveLength(0);
    });

    it('should detect T-shape pattern', () => {
      // T形: 横向3连 + 纵向3连，交点在中间
      const grid = createTestGrid([
        [0, 0, 0, 1, 2, 3],
        [1, 2, 0, 4, 5, 0],
        [2, 3, 0, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      // 应该检测到横向3连和纵向3连
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect L-shape pattern', () => {
      // L形: 横向3连 + 纵向3连，交点在端点
      const grid = createTestGrid([
        [0, 0, 0, 1, 2, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 0, 5, 0, 1],
        [3, 4, 0, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);

      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('checkPosition', () => {
    it('should return matches at specific position after swap', () => {
      const grid = createTestGrid([
        [0, 0, 0, 1, 2, 3],  // 横向3连
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      // 检查位置 (0, 2)，它是3连的一部分
      const matches = detector.checkPosition(grid, { row: 0, col: 2 });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.tiles.some(t => t.position.row === 0 && t.position.col === 2)).toBe(true);
    });

    it('should return empty array when position has no matches', () => {
      const grid = createTestGrid([
        [0, 1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.checkPosition(grid, { row: 0, col: 0 });

      expect(matches).toHaveLength(0);
    });
  });

  describe('detectSpecialPattern', () => {
    it('should detect LINE_4_HORIZONTAL pattern', () => {
      const grid = createTestGrid([
        [0, 0, 0, 0, 2, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);
      const pattern = detector.detectSpecialPattern(matches, grid);

      expect(pattern).toBeDefined();
      expect(pattern?.pattern).toBe('line_4_horizontal');
    });

    it('should detect LINE_4_VERTICAL pattern', () => {
      const grid = createTestGrid([
        [0, 1, 2, 3, 4, 5],
        [0, 2, 3, 4, 5, 0],
        [0, 3, 4, 5, 0, 1],
        [0, 4, 5, 0, 1, 2],
        [2, 5, 0, 1, 2, 3],
        [3, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);
      const pattern = detector.detectSpecialPattern(matches, grid);

      expect(pattern).toBeDefined();
      expect(pattern?.pattern).toBe('line_4_vertical');
    });

    it('should detect LINE_5 pattern', () => {
      const grid = createTestGrid([
        [0, 0, 0, 0, 0, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);
      const pattern = detector.detectSpecialPattern(matches, grid);

      expect(pattern).toBeDefined();
      expect(pattern?.pattern).toBe('line_5');
    });

    it('should return null for simple 3-match', () => {
      const grid = createTestGrid([
        [0, 0, 0, 1, 2, 3],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const detector = new MatchDetector();
      const matches = detector.findAllMatches(grid);
      const pattern = detector.detectSpecialPattern(matches, grid);

      expect(pattern).toBeNull();
    });
  });
});
