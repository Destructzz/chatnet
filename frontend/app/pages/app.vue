<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100">
    <!-- Верхняя панель -->
    <header class="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/90">
            <span class="text-xs font-semibold tracking-tight">CN</span>
          </div>
          <span class="text-sm font-medium text-neutral-200">ChatNet</span>
          
          <!-- Статус подключения -->
          <div 
            v-if="tab === 'chat'" 
            class="ml-3 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]"
            :class="connected 
              ? 'border-green-900/30 bg-green-500/10 text-green-400' 
              : 'border-red-900/30 bg-red-500/10 text-red-400'"
          >
            <div class="h-1.5 w-1.5 rounded-full" :class="connected ? 'bg-green-500' : 'bg-red-500'"></div>
            {{ connected ? 'Connected' : 'Disconnected' }}
          </div>
        </div>

        <div v-if="me" class="flex items-center gap-3">
          <div class="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-semibold flex items-center justify-center">
            {{ me.name.slice(0, 1).toUpperCase() }}
          </div>
          <div class="text-xs leading-tight">
            <p class="font-medium text-neutral-100 truncate max-w-[140px]">
              {{ me.name }}
            </p>
            <p class="text-neutral-400 truncate max-w-[160px]">
              {{ me.email }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- Основной layout -->
    <div class="mx-auto flex max-w-6xl gap-4 px-4 py-4">
      <!-- Sidebar -->
      <aside class="mt-3 h-[calc(100vh-4.5rem)] w-56 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-4 text-sm">
        <p class="px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
          Navigation
        </p>

        <nav class="mt-2 space-y-1">
          <button
            class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium transition"
            :class="tab === 'profile' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'"
            @click="tab = 'profile'"
          >
            <span class="inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-violet-500/90 text-[9px] font-semibold">P</span>
            Профиль
          </button>

          <button
            class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium transition"
            :class="tab === 'chat' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'"
            @click="tab = 'chat'"
          >
            <span class="inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-sky-500/90 text-[9px] font-semibold">C</span>
            Общий чат
          </button>
        </nav>

        <div class="mt-6 border-t border-neutral-800 pt-3">
          <button
            class="w-full rounded-lg border border-neutral-700 bg-transparent py-1.5 text-xs font-medium text-neutral-300 transition hover:border-red-500/80 hover:bg-red-500/5 hover:text-red-400"
            type="button"
            @click="logout"
          >
            Выйти
          </button>
        </div>
      </aside>

      <!-- Контентная область -->
      <main class="mt-3 flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-sm">
        <div v-if="loading" class="mt-16 text-center text-neutral-400">Загрузка профиля…</div>
        <div v-else-if="error" class="mt-16 text-center text-red-400">{{ error }}</div>

        <template v-else>
          <!-- Профиль -->
          <section v-if="tab === 'profile'">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h1 class="text-base font-semibold text-neutral-50">Профиль</h1>
                <p class="mt-1 text-xs text-neutral-400">Основная информация об аккаунте.</p>
              </div>
            </div>

            <div class="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div class="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
                <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">Account</p>
                <div class="space-y-3 text-xs">
                  <div>
                    <p class="text-neutral-500">Имя</p>
                    <p class="mt-0.5 text-neutral-100">{{ me?.name }}</p>
                  </div>
                  <div>
                    <p class="text-neutral-500">Email</p>
                    <p class="mt-0.5 text-neutral-100">{{ me?.email }}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ✅ ОБНОВЛЕННЫЙ ЧАТ -->
          <section v-else class="flex h-[calc(100vh-12rem)] flex-col">
            <div class="mb-4">
              <h1 class="text-base font-semibold text-neutral-50">Общий чат</h1>
              <p class="mt-1 text-xs text-neutral-400">Сообщения сохраняются в истории.</p>
            </div>

            <!-- Список сообщений -->
            <div ref="chatContainer" class="flex-1 space-y-3 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
              <div v-if="messages.length === 0" class="flex h-full items-center justify-center text-xs text-neutral-500">
                Нет сообщений. Будьте первым!
              </div>
              
              <div v-for="(msg, i) in messages" :key="i" class="flex flex-col gap-1">
                <!-- Сообщение -->
                <div class="flex items-end gap-2" :class="msg.isMe ? 'flex-row-reverse' : ''">
                  <!-- Аватар -->
                  <div 
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    :class="msg.isMe ? 'bg-violet-500 text-white' : 'bg-neutral-700 text-neutral-300'"
                  >
                    {{ msg.user?.[0]?.toUpperCase() || '?' }}
                  </div>
                  
                  <!-- Бабл сообщения -->
                  <div 
                    class="max-w-[70%] rounded-2xl px-3 py-2 text-xs"
                    :class="msg.isMe 
                      ? 'bg-violet-600/20 text-violet-100 rounded-tr-none border border-violet-500/20' 
                      : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700'"
                  >
                    <p class="font-medium text-[10px] opacity-50 mb-0.5" :class="msg.isMe ? 'text-violet-300' : 'text-neutral-400'">
                      {{ msg.user }}
                    </p>
                    {{ msg.data }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Ввод сообщения -->
            <div class="mt-3 flex items-center gap-2">
              <input
                v-model="inputMessage"
                @keyup.enter="sendMessage"
                class="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                placeholder="Напишите сообщение..."
                :disabled="!connected"
              />
              <button
                @click="sendMessage"
                class="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!connected || !inputMessage.trim()"
              >
                Отправить
              </button>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'

type Me = { id: string | number; name: string; email: string }
type ChatMessage = { type: string; data: string; user?: string; isMe?: boolean }

const router = useRouter()
const loading = ref(true)
const error = ref('')
const me = ref<Me | null>(null)
const tab = ref<'profile' | 'chat'>('profile')

// WebSocket state
const ws = ref<WebSocket | null>(null)
const connected = ref(false)
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const chatContainer = ref<HTMLElement | null>(null)

// Авто-скролл вниз
watch(messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })

// Подключение при смене таба на чат
watch(tab, (newTab) => {
  if (newTab === 'chat' && !ws.value) {
    connectWebSocket()
  }
})

function connectWebSocket() {
  if (ws.value) return

  // Используем Caddy URL (wss:// если https, ws:// если http)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws.value = new WebSocket(`${protocol}//${window.location.host}/ws`)

  ws.value.onopen = () => {
    connected.value = true
    console.log('WS Connected')
  }

  ws.value.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      // Добавляем флаг, если сообщение от меня (пока заглушка, т.к. бэк не шлёт ID юзера)
      // В реальности нужно сравнивать msg.userId === me.value.id
      messages.value.push({
        ...msg,
        user: msg.user || 'Anon', // Пока нет юзера в сообщении
        isMe: false // Временно false, пока бэк не вернёт ID
      })
    } catch (e) {
      console.error('WS parse error', e)
    }
  }

  ws.value.onclose = () => {
    connected.value = false
    ws.value = null
    // Реконнект через 3 сек
    if (tab.value === 'chat') setTimeout(connectWebSocket, 3000)
  }
}

function sendMessage() {
  if (!inputMessage.value.trim() || !ws.value || !connected.value) return

  const msg = {
    type: 'message',
    data: inputMessage.value,
    user: me.value?.name // Отправляем имя (бэк должен его прокинуть)
  }

  ws.value.send(JSON.stringify(msg))
  
  // Оптимистичное добавление (опционально, если бэк не эхо-сервер)
  // messages.value.push({ ...msg, isMe: true }) 
  
  inputMessage.value = ''
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    await router.push('/')
    return
  }

  try {
    me.value = await $fetch<Me>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    // Сразу грузим WS если юзер уже в чате (после рефреша)
    if (tab.value === 'chat') connectWebSocket()
  } catch (e: any) {
    error.value = e?.data?.message || 'Ошибка авторизации'
    localStorage.removeItem('token')
    await router.push('/')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (ws.value) ws.value.close()
})

async function logout() {
  if (ws.value) ws.value.close()
  localStorage.removeItem('token')
  await router.push('/')
}
</script>