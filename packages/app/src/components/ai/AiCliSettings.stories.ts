import type { LlmSettings } from '@pulls.review/core/analyze'
import type { CliModelCatalog } from '@pulls.review/core/local-rpc'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { CliModelsState } from '../../composables/useCliModels'
import { defaultLlmSettings } from '@pulls.review/core/analyze'
import { ref } from 'vue'
import AiCliSettings from './AiCliSettings.vue'

const meta: Meta<typeof AiCliSettings> = {
  title: 'Settings/AiCliSettings',
  component: AiCliSettings,
  // Holds the settings so picking a model or effort updates the story.
  render: args => ({
    components: { AiCliSettings },
    setup() {
      const settings = ref<LlmSettings>(args.llmSettings)
      return { args, settings }
    },
    template: '<div class="max-w-120 flex flex-col gap-4 p-4"><AiCliSettings v-bind="args" v-model:llm-settings="settings" /></div>',
  }),
}
export default meta

type Story = StoryObj<typeof AiCliSettings>

const claude: CliModelCatalog = {
  engine: 'claude-code',
  account: 'octavian@example.com (Max)',
  version: '3.4.1 (Claude Code)',
  models: [
    { id: 'claude-sonnet-5', name: 'Sonnet 5', description: 'Best for everyday tasks', efforts: ['low', 'medium', 'high', 'xhigh', 'max'], isDefault: true },
    { id: 'claude-opus-5', name: 'Opus 5', description: 'Most capable for complex work', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
    { id: 'claude-haiku-5', name: 'Haiku 5', description: 'Fastest for quick answers', efforts: [] },
  ],
}

const codex: CliModelCatalog = {
  engine: 'codex',
  version: 'codex-cli 0.98.0',
  models: [
    { id: 'gpt-5.6-sol', name: 'gpt-5.6-sol', description: 'Latest frontier agentic coding model.', efforts: ['low', 'medium', 'high', 'xhigh'], defaultEffort: 'medium', isDefault: true },
    { id: 'gpt-5.6-mini', name: 'gpt-5.6-mini', description: 'Smaller, faster and cheaper.', efforts: ['minimal', 'low', 'medium', 'high'], defaultEffort: 'medium' },
  ],
}

const loaded = (catalog: CliModelCatalog): CliModelsState => ({ catalog, loading: false })
const idle: CliModelsState = { loading: false }

export const ClaudeCode: Story = {
  args: {
    llmSettings: { ...defaultLlmSettings, provider: 'claude-code', claudeCodeModel: 'claude-opus-5', claudeCodeEffort: 'high' },
    analysisModels: loaded(claude),
    askModels: idle,
  },
}

export const CodexWithAskOnClaude: Story = {
  args: {
    llmSettings: { ...defaultLlmSettings, provider: 'codex', codexModel: 'gpt-5.6-sol', askProvider: 'claude-code', askModel: 'claude-haiku-5' },
    analysisModels: loaded(codex),
    askModels: loaded(claude),
  },
}

export const Loading: Story = {
  args: {
    llmSettings: { ...defaultLlmSettings, provider: 'claude-code' },
    analysisModels: { loading: true },
    askModels: idle,
  },
}

/** The CLI couldn't be asked for its models, so the model id is typed. */
export const CatalogFailed: Story = {
  args: {
    llmSettings: { ...defaultLlmSettings, provider: 'codex' },
    analysisModels: { loading: false, error: 'codex: command not found' },
    askModels: idle,
  },
}
