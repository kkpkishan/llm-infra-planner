import { describe, it, expect } from 'vitest'

describe('project setup', () => {
  it('should run tests successfully', () => {
    expect(1 + 1).toBe(2)
  })

  it('should resolve @/ path alias', async () => {
    const precision = await import('@/lib/formulas/precision')
    expect(precision.DEFAULT_PRECISION).toBeDefined()
  })
})

