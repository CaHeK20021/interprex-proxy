# Interprex Proxy

Бесплатный прокси-сервер для приложения [Interprex](https://github.com/CaHeK20021/Interprex) — переводчика игровых текстов.

Позволяет пользователям из России и других регионов с блокировками использовать Gemini бесплатно, без VPN.

---

## Деплой за 1 минуту

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CaHeK20021/interprex-proxy&env=GEMINI_API_KEY&envDescription=Ваш%20Gemini%20API%20ключ%20с%20aistudio.google.com&envLink=https://aistudio.google.com/app/apikey&project-name=interprex-proxy&repository-name=interprex-proxy)

**Шаги:**
1. Нажмите кнопку выше
2. Войдите через GitHub (аккаунт бесплатный)
3. В поле `GEMINI_API_KEY` вставьте ваш ключ с [aistudio.google.com](https://aistudio.google.com/app/apikey) *(нужен VPN один раз чтобы получить ключ)*
4. Нажмите **Deploy** — займёт ~1 минуту
5. Скопируйте URL вашего деплоя (например: `https://interprex-proxy-abc123.vercel.app`)

---

## Как использовать в Interprex

1. Откройте Interprex, нажмите иконку ⚙ в правом углу
2. Вставьте URL вашего прокси в поле **Адрес прокси** и нажмите **Сохранить**
3. Выберите провайдер **Ollama** (он принимает любой OpenAI-совместимый URL)
4. В поле **Адрес сервера** вставьте `https://ваш-прокси.vercel.app/v1`
5. В поле **Модель** введите `gemini-2.5-flash` (или любую другую модель Gemini)
6. API-ключ вводить не нужно — он хранится на вашем Vercel сервере

---

## Как это работает

```
Interprex → ваш прокси на Vercel → Google Gemini API
```

- Ваш API-ключ хранится **только** в переменных окружения Vercel — в коде его нет
- Никто кроме вас не имеет доступа к вашему прокси (если не давать URL)
- Код открытый — можно проверить что никаких скрытых действий нет

---

## Лимиты бесплатного плана

| Сервис | Бесплатный лимит | Игра на 60 000 строк |
|--------|-----------------|----------------------|
| Vercel Functions | 1 000 000 вызовов/мес | ~1 000 запросов |
| Gemini API | 1 500 запросов/день | ~1 000 запросов |

**Итог: одна полная игра на 60 000 строк в день — бесплатно.**

---

## Структура проекта

```
interprex-proxy/
├── api/
│   └── [...path].js   # Edge Function — проксирует запросы к Gemini
├── vercel.json         # Маршрутизация Vercel
├── .env.example        # Пример переменных окружения
└── README.md
```
