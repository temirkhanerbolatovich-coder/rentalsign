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
| POST   | `/api/catalog/:slug/property` | Добавить публичную квартиру в свои объекты или вернуть существующий ID; сессия + Origin, без тела |
| POST   | `/api/catalog/import`        | Добавить недостающие 7 квартир в свои объекты; `{imported,total}`, без очистки демоданных |
| GET    | `/api/contract-template`     | Свои частные реквизиты и условия новых договоров |
| PUT    | `/api/contract-template`     | Сохранить полный шаблон по строгой схеме; сессия + Origin + JSON |
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

Дополнительные необязательные поля ContractInput: `landlordDocument` (до 200 символов), `landlordDocumentIssued` (до 300), `tenantDocument` (до 300), `tenantAddress` (до 500). Старые снимки без них поддерживаются. Шаблон содержит только поля `landlord*`, пять блоков условий и `additionalTerms`; квартиры, арендатора, даты и суммы он не принимает. Лимиты совпадают с формой; пустые реквизиты в шаблоне допустимы, в готовом договоре обязательные имя/телефон по-прежнему проверяются.

Для `Property` с `catalogSlug` договор требует `rent > 0`: это согласованная общая сумма за весь период, а не тариф карточки. Импорт возвращает `{id}`; неизвестный slug — 404, собственный архивный объект — 409. Повторный импорт не обновляет существующий объект. `catalogSlug` устанавливается сервером и не принимается обычным PropertyInput. Публичные `/apartments` и `/apartments/:slug` используют отдельный статический перечень, доступ к `/api/properties` остаётся закрытым.

## Ответы

Ошибки: `{ "error": "понятное сообщение" }`. Коды: 400 — валидация; 401 — нет сессии; 403 — Origin; 404 — объект/токен не найден; 409 — подписано, зафиксировано или конфликт revision; 410 — истекла/отозвана ссылка; 413 — тело слишком велико; 415 — неверный Content-Type; 429 — лимит; 500 — безопасное общее сообщение без внутренних данных.

Повторное демоподписание возвращает 409. Клиент может повторно читать действующую ссылку и после демоподписания. PDF: `application/pdf`, attachment, private/no-store. Запрос без сессии к административному PDF возвращает 401.

WhatsApp — обычный URL `https://wa.me/<digits>?text=<URL-encoded message>`. Ключ API не требуется; приложение не отправляет сообщения автоматически.


## Ручная занятость

Контракт `GET/POST/DELETE /api/availability`, авторизация и публичные поля описаны в [QUTTY_QONAQ.md](QUTTY_QONAQ.md#api-контракт).
