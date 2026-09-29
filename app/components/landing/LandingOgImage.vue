<script setup lang="ts">
import LandingDemo from './LandingDemo.vue'
import LandingHero from './LandingHero.vue'
</script>

<template>
  <!-- Fixed 1200x630 (Open Graph size) so the story canvas can be screenshotted 1:1 into `og.png`. -->
  <div
    id="og-image"
    class="color-base px20 py-12 bg-base shrink-0 gap-14 grid grid-cols-[minmax(0,1fr)_30rem] items-center relative overflow-hidden"
    style="width: 1200px; height: 630px"
  >
    <div class="flex flex-col gap-8">
      <div class="flex gap-3 items-center">
        <span class="text-xl font-medium font-mono">pulls.review</span>
      </div>
      <LandingHero style="font-size: 72px" />
      <p class="text-xl leading-relaxed op-fade max-w-md">
        Groups changed files, summarizes what matters, review them one scope at a time.
      </p>
    </div>

    <div
      class="p-5 border border-base rounded-xl bg-base h-full max-h-[calc(100%+1rem)] shadow-xl scale-110 overflow-hidden"
      style="mask-image: linear-gradient(to bottom, #000 80%, transparent)"
    >
      <LandingDemo still class="w-full scale-105" :show-header="false" />
    </div>
  </div>
</template>
