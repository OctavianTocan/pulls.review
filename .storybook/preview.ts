import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import '@antfu/design/styles.css'
import 'virtual:uno.css'

// `<NuxtLink>` is Nuxt-runtime-only; stub it as a plain `<a>` so components that use it
// (AppHeader) render outside the Nuxt app.
setup((app) => {
  app.component('NuxtLink', {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  })
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
