import type { Env } from '@pulls.review/core/env'
import type { AiJobSnapshot, CliModelCatalog, MyPull } from '@pulls.review/core/local-rpc'
import type { Driver } from 'unstorage'
import { createLocalSource, readRepoInfo } from '@pulls.review/core/local'
import { LLM_ENGINES, LOCAL_RPC, MY_PULL_STATES, REVIEW_LENS_NAME } from '@pulls.review/core/local-rpc'
import { DiffsPayloadSchema } from '@pulls.review/core/types'
import { defineRpcFunction } from 'devframe'
import * as v from 'valibot'
import { listCliModels } from './ai/catalog'
import { cancelAiJob, listAiJobs, runAiJob, startAiJob, waitAiJob } from './ai/jobs'
import { resolveGithubToken } from './credentials'
import { getLens, listLenses } from './lenses'
import { cachedMyPulls, listMyPulls } from './my-pulls'

export interface LocalRpcOptions {
  /** Any directory inside the repository under review. */
  cwd: string
  /** Where the browser's cache lives (see `createRepoCacheDriver`). */
  driver: Driver
  env: Env
}

const target = v.object({ target: v.string() })

/** A return schema for values the server builds itself, so only their type needs declaring. */
function trusted<T>() {
  return v.custom<T>(() => true)
}

const aiJobRequest = v.object({
  engine: v.picklist(LLM_ENGINES),
  model: v.optional(v.string()),
  effort: v.optional(v.string()),
  system: v.string(),
  prompt: v.string(),
  schema: v.optional(v.unknown()),
  label: v.optional(v.string()),
  key: v.optional(v.string()),
  context: v.optional(v.object({
    owner: v.pipe(v.string(), v.regex(/^[\w.-]+$/)),
    repo: v.pipe(v.string(), v.regex(/^[\w.-]+$/)),
    number: v.optional(v.number()),
    title: v.optional(v.string()),
    headSha: v.pipe(v.string(), v.regex(/^[0-9a-f]{7,64}$/i)),
    baseSha: v.optional(v.string()),
    files: v.array(v.object({
      path: v.string(),
      previousPath: v.optional(v.string()),
      status: v.optional(v.string()),
      patch: v.optional(v.string()),
    })),
  })),
})

/**
 * Every function the `PR_LOCAL` SPA calls. Only a client devframe has trusted
 * reaches them; inputs are still validated, since they decide what `git` runs.
 */
export function localRpcFunctions({ cwd, driver, env }: LocalRpcOptions) {
  const source = (text: string) => createLocalSource({ cwd, target: text })
  return [
    defineRpcFunction({ name: LOCAL_RPC.repoInfo, type: 'query', handler: () => readRepoInfo(cwd) }),
    defineRpcFunction({ name: LOCAL_RPC.sourceKey, type: 'query', args: [target], returns: v.string(), handler: ({ target }) => source(target).key() }),
    defineRpcFunction({ name: LOCAL_RPC.sourceFetch, type: 'query', args: [target], returns: DiffsPayloadSchema, handler: ({ target }) => source(target).fetch() }),
    defineRpcFunction({ name: LOCAL_RPC.sourceFingerprint, type: 'query', args: [target], returns: v.string(), handler: ({ target }) => source(target).fingerprint() }),
    defineRpcFunction({
      name: LOCAL_RPC.sourceLoadFile,
      type: 'query',
      args: [v.object({ target: v.string(), path: v.string(), sha: v.string() })],
      returns: v.optional(v.string()),
      handler: ({ target, path, sha }) => source(target).loadFile(path, sha),
    }),
    defineRpcFunction({
      name: LOCAL_RPC.storageGetItem,
      type: 'query',
      args: [v.object({ key: v.string() })],
      returns: v.nullable(v.string()),
      handler: async ({ key }) => {
        const value = await driver.getItem(key, {})
        return typeof value === 'string' ? value : null
      },
    }),
    defineRpcFunction({
      name: LOCAL_RPC.storageSetItem,
      type: 'action',
      args: [v.object({ key: v.string(), value: v.string() })],
      returns: v.void(),
      handler: async ({ key, value }) => {
        await driver.setItem?.(key, value, {})
      },
    }),
    defineRpcFunction({
      name: LOCAL_RPC.storageRemoveItem,
      type: 'action',
      args: [v.object({ key: v.string() })],
      returns: v.void(),
      handler: async ({ key }) => {
        await driver.removeItem?.(key, {})
      },
    }),
    defineRpcFunction({
      name: LOCAL_RPC.storageGetKeys,
      type: 'query',
      args: [v.object({ base: v.string() })],
      returns: v.array(v.string()),
      handler: ({ base }) => driver.getKeys(base, {}),
    }),
    defineRpcFunction({ name: LOCAL_RPC.githubToken, type: 'query', handler: () => resolveGithubToken(env) }),
    defineRpcFunction({ name: LOCAL_RPC.myPulls, type: 'query', args: [v.object({ state: v.picklist(MY_PULL_STATES) })], returns: trusted<MyPull[]>(), handler: ({ state }) => listMyPulls(state) }),
    defineRpcFunction({ name: LOCAL_RPC.lensList, type: 'query', handler: () => listLenses() }),
    defineRpcFunction({
      name: LOCAL_RPC.lensGet,
      type: 'query',
      args: [v.object({ name: v.pipe(v.string(), v.regex(REVIEW_LENS_NAME)) })],
      returns: v.optional(v.string()),
      handler: ({ name }) => getLens(name),
    }),
    defineRpcFunction({
      name: LOCAL_RPC.llmRun,
      type: 'action',
      args: [v.object({
        engine: v.picklist(LLM_ENGINES),
        model: v.optional(v.string()),
        effort: v.optional(v.string()),
        system: v.string(),
        prompt: v.string(),
        schema: v.optional(v.unknown()),
      })],
      returns: v.string(),
      handler: async request => (await runAiJob(request)).text,
    }),
    defineRpcFunction({
      name: LOCAL_RPC.aiModels,
      type: 'query',
      args: [v.object({ engine: v.picklist(LLM_ENGINES), refresh: v.optional(v.boolean()) })],
      returns: trusted<CliModelCatalog>(),
      handler: ({ engine, refresh }) => listCliModels(engine, refresh),
    }),
    defineRpcFunction({ name: LOCAL_RPC.aiJobStart, type: 'action', args: [aiJobRequest], returns: v.string(), handler: request => startAiJob(request) }),
    defineRpcFunction({
      name: LOCAL_RPC.aiJobWait,
      type: 'query',
      args: [v.object({ id: v.string(), after: v.number() })],
      returns: trusted<AiJobSnapshot>(),
      handler: ({ id, after }) => waitAiJob(id, after),
    }),
    defineRpcFunction({ name: LOCAL_RPC.aiJobCancel, type: 'action', args: [v.object({ id: v.string() })], returns: v.boolean(), handler: ({ id }) => cancelAiJob(id) }),
    defineRpcFunction({ name: LOCAL_RPC.aiJobList, type: 'query', handler: () => listAiJobs() }),
    defineRpcFunction({
      name: LOCAL_RPC.myPullsCached,
      type: 'query',
      args: [v.object({ state: v.picklist(MY_PULL_STATES) })],
      returns: v.unknown(),
      handler: async ({ state }) => cachedMyPulls(state),
    }),
    defineRpcFunction({
      name: LOCAL_RPC.storageGetItems,
      type: 'query',
      args: [v.object({ keys: v.array(v.string()) })],
      returns: v.array(v.nullable(v.string())),
      handler: ({ keys }) => Promise.all(keys.map(async (key) => {
        const value = await driver.getItem(key, {})
        return typeof value === 'string' ? value : null
      })),
    }),
    defineRpcFunction({
      name: LOCAL_RPC.storageSetItems,
      type: 'action',
      args: [v.object({ items: v.array(v.object({ key: v.string(), value: v.string() })) })],
      returns: v.void(),
      handler: async ({ items }) => {
        await Promise.all(items.map(({ key, value }) => driver.setItem?.(key, value, {})))
      },
    }),
  ]
}
