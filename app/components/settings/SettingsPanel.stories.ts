import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SettingsPanel from './SettingsPanel.vue'

const meta: Meta<typeof SettingsPanel> = {
  title: 'Settings/SettingsPanel',
  component: SettingsPanel,
}
export default meta

type Story = StoryObj<typeof SettingsPanel>

export const Empty: Story = {
  args: { modelValue: '' },
}

export const WithToken: Story = {
  args: { modelValue: 'ghp_examplefaketoken1234' },
}
