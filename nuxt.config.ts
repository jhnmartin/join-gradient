// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui-pro", "@nuxtjs/supabase"],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1,
        },
      },
    },
  },

  routeRules: {
    "/": { prerender: true },
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2025-01-15",

  fonts: {
    families: [
      { name: "Unigeo64", provider: "local" },
      { name: "Plus Jakarta Sans", provider: "google" },
    ],
  },

  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      include: undefined,
      exclude: ["/register", "forgot-password"],
      saveRedirectToCookie: false,
    },
  },
});
