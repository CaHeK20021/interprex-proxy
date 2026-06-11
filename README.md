<div align="center">

# Interprex Proxy

**Бесплатный прокси-сервер для [Interprex](https://github.com/CaHeK20021/Interprex)**  
Для пользователей из регионов, где AI-сервисы заблокированы (Россия и др.)

<br/>

<a href="https://vercel.com/new/clone?repository-url=https://github.com/CaHeK20021/interprex-proxy&env=PROVIDER,API_KEY&envDescription=PROVIDER%3A%20gemini%20%2F%20openai%20%2F%20claude%20%7C%20API_KEY%3A%20ваш%20API-ключ&project-name=interprex-proxy&repository-name=interprex-proxy">
  <img src="https://img.shields.io/badge/_%20%20%20%20%20%20%20%20%20Deploy%20to%20Vercel%20%20%20%20%20%20%20%20%20-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Deploy with Vercel" />
</a>

<br/><br/>

> Нажми → войди через GitHub → вставь ключ → готово. **~1 минута.**

</div>

---

## Как развернуть

### 1. Нажми кнопку Deploy выше

### 2. Войди через GitHub *(бесплатно)*

### 3. Vercel спросит два поля:

**`PROVIDER`** — какой сервис использовать:

| Значение | Сервис | Бесплатный? | Где получить ключ |
|----------|--------|------------|-------------------|
| `gemini` | Google Gemini | ✅ Да | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `openai` | OpenAI (ChatGPT) | ❌ Платный | [platform.openai.com](https://platform.openai.com/api-keys) |
| `claude` | Anthropic Claude | ❌ Платный | [console.anthropic.com](https://console.anthropic.com) |

> 💡 Рекомендуем `gemini` — полностью бесплатный, лимитов хватает на перевод целых игр.

**`API_KEY`** — ключ от выбранного сервиса.

### 4. Нажми Deploy *(~1 минута)*

### 5. Скопируй URL деплоя

Например: `https://interprex-proxy-abc123.vercel.app`

### 6. Вставь в Interprex

- Нажми **⚙** в правом углу → вставь URL прокси → **Сохранить**
- Выбери провайдер **Ollama**, в поле **Адрес сервера** вставь `https://твой-прокси.vercel.app/v1`
- В поле **Модель** введи название модели (например `gemini-2.5-flash`)

---

## Как это работает

```
Interprex  →  твой прокси на Vercel  →  API провайдера
```

- Ключ хранится **только** на твоём Vercel — в коде его нет
- Весь код открытый — можно проверить

---

## Лимиты бесплатного плана (Gemini)

| Сервис | Лимит | Игра на 60 000 строк |
|--------|-------|----------------------|
| Vercel Functions | 1 000 000 вызовов / мес | ~1 000 запросов |
| Gemini API (free) | 1 500 запросов / день | ~1 000 запросов |

**Результат: одна полная игра в день — бесплатно.**
