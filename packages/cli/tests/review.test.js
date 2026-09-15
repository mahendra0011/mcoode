import { describe, it, expect, vi } from 'vitest';
import { runReview } from '../src/core/review/run-review.js';
import { ToolExecutor, WRITE_TOOLS } from '../src/core/tools.js';

describe('Review Mode (doc 49)', () => {
  it('runs review and returns parsed findings', async () => {
    const mockFindings = [
      {
        file: 'src/api/orders.js',
        line: 34,
        severity: 'high',
        category: 'security',
        comment: 'No input validation on req.body.quantity'
      },
      {
        file: 'src/api/orders.js',
        line: 52,
        severity: 'medium',
        category: 'bug',
        comment: 'Off-by-one: loop should be i < items.length'
      },
      {
        file: 'src/api/orders.js',
        line: 78,
        severity: 'info',
        category: 'praise',
        comment: 'Good use of a transaction here'
      },
      {
        file: 'src/components/Cart.jsx',
        line: 12,
        severity: 'low',
        category: 'style',
        comment: 'Consider extracting this into a custom hook'
      }
    ];

    const mockRouter = {
      pick: vi.fn().mockResolvedValue({
        model: { id: 'claude-3-5-sonnet' },
        provider: {
          complete: vi.fn().mockResolvedValue({
            text: JSON.stringify(mockFindings)
          })
        }
      })
    };

    // Target a specific file mock
    const findings = await runReview({
      scope: 'file',
      target: 'package.json',
      router: mockRouter
    });

    expect(mockRouter.pick).toHaveBeenCalledWith('reviewer');
    expect(findings).toHaveLength(4);
    expect(findings[0].category).toBe('security');
    expect(findings[1].category).toBe('bug');
    expect(findings[2].category).toBe('praise');
    expect(findings[3].category).toBe('style');
  });

  it('handles empty or clean code reviews', async () => {
    const mockRouter = {
      pick: vi.fn().mockResolvedValue({
        model: { id: 'mock' },
        provider: {
          complete: vi.fn().mockResolvedValue({
            text: '[]'
          })
        }
      })
    };

    const findings = await runReview({
      scope: 'file',
      target: 'package.json',
      router: mockRouter
    });

    expect(findings).toEqual([]);
  });

  it('enforces read-only mode by blocking WRITE_TOOLS in review mode', async () => {
    const executor = new ToolExecutor({
      projectPath: process.cwd(),
      mode: 'review'
    });

    expect(executor.readOnly).toBe(true);

    for (const toolName of WRITE_TOOLS) {
      const res = await executor.run(toolName, { path: 'test.js', content: 'hello' });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/write tools are blocked/i);
    }
  });
});
