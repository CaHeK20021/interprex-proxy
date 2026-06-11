<div align="center">

<img src="https://raw.githubusercontent.com/CaHeK20021/Interprex/main/src/assets/icon.png" width="72" alt="Interprex" />

# Interprex Proxy

**Бесплатный прокси-сервер для [Interprex](https://github.com/CaHeK20021/Interprex)**  
Для пользователей из регионов, где API заблокированы (Россия и др.)

<br/>

<a href="https://vercel.com/new/clone?repository-url=https://github.com/CaHeK20021/interprex-proxy&env=TARGET_BASE_URL,API_KEY&envDescription=TARGET_BASE_URL%20%E2%80%94%20%D0%B0%D0%B4%D1%80%D0%B5%D1%81%20API%20%D0%BF%D1%80%D0%BE%D0%B2%D0%B0%D0%B9%D0%B4%D0%B5%D1%80%D0%B0%2C%20API_KEY%20%E2%80%94%20%D0%B2%D0%B0%D1%88%20%D0%BA%D0%BB%D1%8E%D1%87&project-name=interprex-proxy&repository-name=interprex-proxy">
  <img src="https://vercel.com/button" alt="Deploy with Vercel" height="40" />
</a>

<br/><br/>

> Нажми → войди через GitHub → вставь ключ → готово. Занимает **1 минуту**.

</div>

---

## Как развернуть

### 1. Нажми кнопку Deploy выше

### 2. Войди через GitHub
Аккаунт GitHub бесплатный. Vercel тоже бесплатный.

### 3. Заполни переменные окружения

| Переменная | Что вставить | Пример |
|-----------|-------------|--------|
| `TARGET_BASE_URL` | Адрес API провайдера | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `API_KEY` | Твой API ключ | `AIza...` |

**Популярные провайдеры:**

| Провайдер | TARGET_BASE_URL | Где получить ключ |
|-----------|----------------|-------------------|
| **Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **OpenAI** | `https://api.openai.com/v1` | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Mistral** | `https://api.mistral.ai/v1` | [console.mistral.ai](https://console.mistral.ai) |
| **Groq** | `https://api.groq.com/openai/v1` | [console.groq.com](https://console.groq.com/keys) |

### 4. Нажми Deploy

Через ~1 минуту получишь URL вида: `https://interprex-proxy-xxx.vercel.app`

### 5. Вставь URL в Interprex

- Открой Interprex → нажми ⚙ в правом углу
- Вставь URL прокси → Сохранить
- Выбери провайдер **Ollama**, в поле **Адрес сервера** вставь `https://твой-прокси.vercel.app/v1`
- В поле **Модель** введи название модели (например `gemini-2.5-flash`)

---

## Как это работает

```
Interprex  →  твой прокси на Vercel  →  API провайдера
```

- Ключ хранится **только** на твоём Vercel — в коде его нет
- Никто кроме тебя не знает URL прокси
- Весь код открытый — можно проверить

---

## Лимиты бесплатного плана

| Сервис | Лимит | Игра на 60 000 строк |
|--------|-------|----------------------|
| Vercel Functions | 1 000 000 вызовов / мес | ~1 000 запросов |
| Gemini API (free) | 1 500 запросов / день | ~1 000 запросов |

**Одна полная игра на 60 000 строк в день — бесплатно.**
