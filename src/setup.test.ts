import { describe, it, expect } from 'vitest'

describe('project setup', () => {
  it('should run tests successfully', () => {
    expect(1 + 1).toBe(2)
  })

  it('should resolve @/ path alias', async () => {
    const app = await import('@/App')
    expect(app.default).toBeDefined()
  })
})
