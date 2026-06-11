<div align="center">

# Interprex Proxy

**Бесплатный прокси-сервер для [Interprex](https://github.com/CaHeK20021/Interprex)**  
Для пользователей из регионов, где AI-сервисы заблокированы (Россия и др.)

<br/>

<a href="https://vercel.com/new/clone?repository-url=https://github.com/CaHeK20021/interprex-proxy&env=PROVIDER,API_KEY&envDescription=PROVIDER%3A%20gemini%20%2F%20openai%20%2F%20claude%20%7C%20API_KEY%3A%20ваш%20API-ключ&project-name=interprex-proxy&repository-name=interprex-proxy">
  <img src="./deploy-button.svg" alt="Deploy with Vercel" width="320" height="64" />
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

| Значение | Сервис | Тариф | Где получить ключ |
|----------|--------|-------|-------------------|
| `gemini` | Google Gemini | ✅ Есть бесплатный тир | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `openai` | OpenAI (ChatGPT) | ❌ Только платный | [platform.openai.com](https://platform.openai.com/api-keys) |
| `claude` | Anthropic Claude | ❌ Только платный | [console.anthropic.com](https://console.anthropic.com) |

> 💡 Рекомендуем `gemini` — полностью бесплатный, лимитов хватает на перевод целых игр.

**`API_KEY`** — ключ от выбранного сервиса.

### 4. Нажми Deploy *(~1 минута)*

### 5. Скопируй URL деплоя

Например: `https://interprex-proxy-abc123.vercel.app`

### 6. Вставь в Interprex

- Нажми **⚙** в правом углу → вставь URL прокси (`https://твой-прокси.vercel.app/v1`) → **Сохранить**
- В поле **Адрес сервера** появится твой прокси — он будет перехватывать запросы к выбранному провайдеру
- Модель выберется из списка автоматически

---

## Как это работает

```
Interprex  →  твой прокси на Vercel  →  API провайдера
```

- Ключ хранится **только** на твоём Vercel — в коде его нет
- Весь код открытый — можно проверить

---

## Лимиты бесплатного плана

Vercel Functions — **1 000 000 вызовов в месяц**. Перевод игры на 60 000 строк занимает ~1 000 запросов — это 0.1% лимита.

**Результат: одна полная игра в день — бесплатно.**
