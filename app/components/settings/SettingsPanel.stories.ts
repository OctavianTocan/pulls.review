import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defaultLlmSettings } from '../../state/settings'
import SettingsPanel from './SettingsPanel.vue'

const meta: Meta<typeof SettingsPanel> = {
  title: 'Settings/SettingsPanel',
  component: SettingsPanel,
}
export default meta

type Story = StoryObj<typeof SettingsPanel>

export const Empty: Story = {
  args: { modelValue: '', llmSettings: defaultLlmSettings },
}

export const WithToken: Story = {
  args: { modelValue: 'ghp_examplefaketoken1234', llmSettings: defaultLlmSettings },
}

export const WithLlmConfigured: Story = {
  args: {
    modelValue: 'ghp_examplefaketoken1234',
    llmSettings: { ...defaultLlmSettings, gatewayToken: 'vck_exampletoken1234' },
  },
}
