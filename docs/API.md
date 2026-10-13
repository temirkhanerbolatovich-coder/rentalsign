# API

JSON, UTF-8. Административные методы требуют живой HttpOnly-сессии и владения объектом. Все изменяющие методы, включая login и публичное демоподписание, требуют `Origin`, точно совпадающий с `APP_URL`. JSON-тела требуют `Content-Type: application/json`. Максимальный размер тела — 96 KiB.

## Маршруты

`GET /api/health` — публичная проверка мигрированной базы без персональных данных; 200 `{status:"ok"}` или 503 `{status:"unavailable"}`.

| Метод  | URL                            | Действие                                                    |
| ------ | ------------------------------ | ----------------------------------------------------------- |
| POST   | `/api/auth/login`              | `{email,password}`; создать сессию                          |
| POST   | `/api/auth/logout`             | Удалить сессию, сбросить cookie                             |
| GET    | `/api/properties`              | Список своих объектов, включая архив                        |
| POST   | `/api/properties`              | Создать объект                                              |
| PATCH  | `/api/properties/:id`          | Полная форма объекта **либо** `{archived:boolean}`          |
| GET    | `/api/contracts`               | Свои договоры, effectiveStatus и события                    |
| POST   | `/api/contracts`               | Сохранить черновик                                          |
| GET    | `/api/contracts/:id`           | Детали своего договора                                      |
| PATCH  | `/api/contracts/:id`           | `{content:ContractInput,revision}`; только черновик         |
| POST   | `/api/contracts/:id/link`      | `{ttlHours,revision}`; зафиксировать версию и выдать ссылку |
| GET    | `/api/contracts/:id/link`      | Получить действующую ссылку для копирования                 |
| DELETE | `/api/contracts/:id/link`      | Отозвать ссылки; недоступно после DEMO_SIGNED               |
| POST   | `/api/contracts/:id/duplicate` | Новый черновик с новым ID и номером                         |
| GET    | `/api/contracts/:id/pdf`       | Последний снимок / черновик; PDF администратора             |
| GET    | `/api/sign/:token`             | Публичный снимок при действующей ссылке                     |
| POST   | `/api/sign/:token`             | `{acknowledged:true}`; демонстрационное действие            |
| GET    | `/api/sign/:token/pdf`         | Предварительный / итоговый демо PDF                         |

PropertyInput: `name,address,type,unit,description,rent,deposit`. type: `APARTMENT`, `APARTMENTS`, `HOTEL`. Суммы: целые значения 0–100 000 000 тенге.

ContractInput: `propertyId,landlordName,landlordId,landlordPhone,tenantName,tenantId,tenantPhone,checkIn,checkOut,rent,deposit,additionalTerms,obligations,payment,depositTerms,damage,handover`. ID сторон — пустая строка либо 12 цифр; это проверка формата, а не идентичности. Даты ISO 8601 с offset; checkOut > checkIn. Текст условий — до 10 000 символов на поле, суммарный лимит JSON сохраняется. Неизвестные ключи отклоняются.

## Ответы

Ошибки: `{ "error": "понятное сообщение" }`. Коды: 400 — валидация; 401 — нет сессии; 403 — Origin; 404 — объект/токен не найден; 409 — подписано, зафиксировано или конфликт revision; 410 — истекла/отозвана ссылка; 413 — тело слишком велико; 415 — неверный Content-Type; 429 — лимит; 500 — безопасное общее сообщение без внутренних данных.

Повторное демоподписание возвращает 409. Клиент может повторно читать действующую ссылку и после демоподписания. PDF: `application/pdf`, attachment, private/no-store. Запрос без сессии к административному PDF возвращает 401.

WhatsApp — обычный URL `https://wa.me/<digits>?text=<URL-encoded message>`. Ключ API не требуется; приложение не отправляет сообщения автоматически.
