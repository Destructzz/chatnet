<!-- app/pages/index.vue -->
<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
    <div class="w-full max-w-5xl grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <!-- Левая панель: бренд + описание -->
      <section
        class="hidden md:flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/70 px-8 py-7"
      >
        <div>
          <div class="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1">
            <span class="h-5 w-5 rounded-md bg-violet-500/90 text-[10px] font-semibold flex items-center justify-center">
              CN
            </span>
            <span class="text-[11px] font-medium tracking-[0.16em] uppercase text-neutral-400">
              ChatNet
            </span>
          </div>

          <h1 class="mt-6 text-2xl font-semibold text-neutral-50">
            Централизованный чат для команды
          </h1>
          <p class="mt-3 text-sm text-neutral-400">
            Управляй общим чат‑каналом и личными сообщениями в одном месте.
            Вход — только через Google, регистрация создаёт профиль автоматически.
          </p>
        </div>

        <div class="mt-6 space-y-2 text-xs text-neutral-500">
          <p>• Авторизация через Google OAuth 2.0</p>
          <p>• JWT‑сессия с проверкой профиля на бэкенде</p>
        </div>
      </section>

      <!-- Правая панель: форма + Google -->
      <section
        class="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-6 py-7 sm:px-7"
      >
        <h2 class="text-base font-semibold text-neutral-50 text-center">
          Вход или регистрация
        </h2>
        <p class="mt-1 text-xs text-neutral-400 text-center">
          Новый пользователь будет создан автоматически после входа через Google.
        </p>

        <!-- Кнопка Google -->
        <a
          class="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-neutral-100 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-800"
          :href="googleAuthUrl"
        >
          <img
            class="h-4 w-4"
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
          />
          <span>Войти через Google</span>
        </a>

        <!-- Разделитель -->
        <div class="my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-neutral-800" />
          <span class="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            или
          </span>
          <div class="h-px flex-1 bg-neutral-800" />
        </div>

        <!-- Условная "регистрация" (заглушка) -->
        <div class="space-y-4 text-xs">
          <div>
            <label class="block text-neutral-400 mb-1">Имя</label>
            <input
              class="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600"
              placeholder="Имя подтянется из Google профиля"
              disabled
            />
          </div>

          <div>
            <label class="block text-neutral-400 mb-1">Email</label>
            <input
              class="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600"
              placeholder="Email также придёт из Google"
              disabled
            />
          </div>

          <p class="text-[11px] text-neutral-500">
            Регистрация аккаунта происходит автоматически после успешного входа
            через Google. Никаких паролей, только OAuth.
          </p>
        </div>

        <p v-if="error" class="mt-4 text-xs text-red-400 text-center">
          {{ error }}
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const route = useRoute()
const router = useRouter()
const error = ref('')

const googleAuthUrl = computed(() => '/auth/google')

onMounted(async () => {
  // Вернулись от Google с токеном в query (?token=...)
  const urlToken = route.query.token
  if (typeof urlToken === 'string' && urlToken.length > 0) {
    localStorage.setItem('token', urlToken)
    await router.replace({ path: '/' })
    await router.push('/app')
    return
  }

  // Уже залогинен — сразу в приложение
  const token = localStorage.getItem('token')
  if (token) {
    await router.push('/app')
  }
})
</script>
