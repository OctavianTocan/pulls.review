import { presetAnthonyDesign } from '@antfu/design/unocss'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    ['btn', 'px-4 py-1 rounded inline-block bg-teal-600 text-white cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50'],
    ['icon-btn', 'inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600'],
    // Named z-index layers used by @antfu/design's overlay components (OverlayModal, etc.)
    // The preset ships no z-index scale and blocks plain `z-<number>` on purpose.
    {
      'z-nav': 'z-[30]',
      'z-dropdown': 'z-[40]',
      'z-tooltip': 'z-[45]',
      'z-toast': 'z-[50]',
      'z-modal-backdrop': 'z-[60]',
      'z-modal-content': 'z-[70]',
      'z-drawer-backdrop': 'z-[80]',
      'z-drawer-content': 'z-[90]',
    },
  ],
  presets: [
    presetAnthonyDesign(),
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
