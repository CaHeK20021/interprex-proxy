<div align="center">

# Interprex Proxy

**Бесплатный прокси-сервер для [Interprex](https://github.com/CaHeK20021/Interprex) на Hugging Face Spaces**  
Для пользователей из регионов, где AI-сервисы заблокированы (Россия и др.)

<br/>

[![Duplicate Space](https://huggingface.co/datasets/huggingface/badges/resolve/main/duplicate-this-space-lg.svg)](https://huggingface.co/spaces/CaHeK20021/interprex-proxy?duplicate=true)

<br/><br/>

> Нажмите кнопку выше → войдите на Hugging Face → Duplicate Space → готово. **Полностью бесплатно и работает без ограничений по времени (без таймаутов).**
</div>

---

## Как развернуть на Hugging Face Spaces

### 1. Нажмите кнопку Duplicate Space выше
Или вручную создайте новый Space на Hugging Face:
- **SDK**: `Docker` (Blank шаблон).
- **Space License**: `mit` (или любая другая).

### 2. Задайте имя и настройки
- Выберите имя Space (например, `interprex-proxy`).
- **Visibility**: Рекомендуется сделать Space **Public** (так как в самом прокси нет ключей, это полностью безопасно, и ссылка будет стабильной).
- Нажмите кнопку **Duplicate Space** (или **Create Space**, если делаете вручную, и запушите файлы репозитория).

### 3. Скопируйте Direct URL вашего Space
После того как Space соберется и запустится (статус сменится на зеленый `Running`), вам нужен его прямой веб-адрес:
- Нажмите на меню из трех точек в правом верхнем углу Space.
- Выберите **Embed this Space**.
- Скопируйте ссылку из поля **Direct URL** (она имеет формат `https://username-space-name.hf.space`).

### 4. Вставьте адрес в Interprex
- Откройте Interprex на компьютере.
- Нажмите на иконку настроек **⚙** в правом верхнем углу.
- Вставьте скопированный URL с добавлением `/v1` на конце (например: `https://username-space-name.hf.space/v1`).
- Нажмите **Сохранить и проверить**.

---

## Как это работает

```
Interprex  →  твой прокси на Hugging Face Spaces (Docker)  →  API провайдера
```

* **Без таймаутов**: В отличие от Vercel, Hugging Face Spaces запускает полноценный постоянный Node.js/Express сервер. Запросы на перевод больших файлов могут длиться минуты и не оборвутся по таймауту.
* **Безопасность**: API-ключи передаются из программы Interprex в заголовках каждого запроса и не сохраняются на сервере. Прокси работает как чистый транзитный CORS/Geo-bypass узел.
* **Авто-определение**: Прокси автоматически перенаправляет запросы к нужному провайдеру (Gemini, OpenAI, Claude, OpenRouter и др.) на основе заголовка `x-provider`.
