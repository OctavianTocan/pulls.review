import { describe, expect, it } from 'vitest'
import { dropNulls, strictSchema } from './llm'

describe('codex structured-output schema', () => {
  const schema = {
    type: 'object',
    properties: { label: { type: 'string' }, children: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } } },
    required: ['label'],
  }

  it('closes every object and makes optional properties nullable', () => {
    expect(strictSchema(schema)).toEqual({
      type: 'object',
      properties: {
        label: { type: 'string' },
        children: { anyOf: [{ type: 'array', items: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'], additionalProperties: false } }, { type: 'null' }] },
      },
      required: ['label', 'children'],
      additionalProperties: false,
    })
  })

  it('removes the nulls it introduced', () => {
    expect(dropNulls({ label: 'a', children: null, nested: [{ x: null, y: 1 }] })).toEqual({ label: 'a', nested: [{ y: 1 }] })
  })
})
