import type { JSONSchema7 } from 'ai'
import type { GenericSchema } from 'valibot'
import { toJsonSchema } from '@valibot/to-json-schema'
import { jsonSchema } from 'ai'
import * as v from 'valibot'

/**
 * Bridges a valibot schema into the AI SDK's `FlexibleSchema`. valibot implements
 * Standard Schema (so `v.safeParse` works fine as the runtime source of truth), but
 * the AI SDK's `jsonSchema` vendor conversion doesn't recognize valibot, and
 * structured-output providers need an actual JSON Schema to constrain generation -
 * so this converts the schema once for that, and still validates the model's
 * response with valibot itself rather than trusting the JSON Schema round-trip.
 */
export function toModelSchema<T>(schema: GenericSchema<unknown, T>) {
  return jsonSchema<T>(toJsonSchema(schema) as JSONSchema7, {
    validate: (value) => {
      const result = v.safeParse(schema, value)
      return result.success
        ? { success: true, value: result.output }
        : { success: false, error: new Error(v.summarize(result.issues)) }
    },
  })
}
