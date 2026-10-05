type Schema = Record<string, unknown>

/**
 * OpenAI's structured outputs accept only closed objects whose properties are all required,
 * so optional properties become nullable.
 * @param node - A JSON Schema, or any node inside one.
 * @returns The same schema in the strict form Codex's `--output-schema` accepts.
 */
export function strictSchema(node: unknown): unknown {
  if (Array.isArray(node))
    return node.map(strictSchema)
  if (!node || typeof node !== 'object')
    return node
  const schema = Object.fromEntries(Object.entries(node as Schema).map(([key, value]) => [key, strictSchema(value)])) as Schema
  const properties = schema.properties as Record<string, Schema> | undefined
  if (schema.type !== 'object' || !properties)
    return schema
  const required = new Set(schema.required as string[] | undefined)
  const strict = Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, required.has(key) ? value : { anyOf: [value, { type: 'null' }] }]))
  return { ...schema, properties: strict, required: Object.keys(strict), additionalProperties: false }
}

/**
 * Undoes the nullable optionals `strictSchema` introduced.
 * @param value - An answer that matched a strict schema.
 * @returns The answer with every `null` property left out.
 */
export function dropNulls(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(dropNulls)
  if (!value || typeof value !== 'object')
    return value
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null).map(([key, item]) => [key, dropNulls(item)]))
}
