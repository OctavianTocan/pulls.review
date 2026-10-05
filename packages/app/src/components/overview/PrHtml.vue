<script setup lang="ts">
// GitHub renders and sanitizes `bodyHTML` itself; this only restyles it to match the app.
defineProps<{
  html: string
}>()

function openLinksInNewTab(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest?.('a[href]')
  if (!link || link.getAttribute('href')?.startsWith('#'))
    return
  link.setAttribute('target', '_blank')
  link.setAttribute('rel', 'noopener noreferrer')
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div
    class="chat-markdown min-w-0 [&_.task-list-item_input]:mr-1 [&_details]:mt-2 [&_img]:inline-block [&_.octicon]:hidden [&_clipboard-copy]:hidden [&_img]:h-auto [&_img]:max-w-full [&_summary]:cursor-pointer [&_.task-list-item]:list-none [&_.markdown-alert]:border-l-3 [&_.markdown-alert]:border-base [&_.markdown-alert]:pl-3 [&_.markdown-alert-title]:font-semibold [&_.user-mention]:font-semibold [&_.user-mention]:no-underline"
    @click.capture="openLinksInNewTab"
    v-html="html"
  />
</template>
