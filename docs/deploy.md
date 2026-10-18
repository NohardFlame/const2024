# Деплой и доступ к хостингу (informatics384.ru)

Прод: **https://informatics384.ru/const2024/**  
Аккаунт Sprinthost, логин вида `a0……` (см. локальный `ssh_auth`).  
IP сервера: `141.8.192.14` (для справки; **для заливки используйте FTP-хост `informatics384.ru`**).

Корень сайта проекта на сервере:

```text
/domains/informatics384.ru/public_html/const2024
```

(в `public_html` лежат и другие проекты — **не** заливать в корень `public_html`).

## Секреты

Файлы в корне клона (в [`.gitignore`](../.gitignore), **не коммитить**):

| Файл | Назначение |
| --- | --- |
| `ssh_auth` | FTP/SSH логин хостинга — [`ssh_auth.example`](../ssh_auth.example) |
| `admin_auth` | пароль админ-UI + ключ cron — [`admin_auth.example`](../admin_auth.example) |

```text
# admin_auth
password: ADMIN_UI_PASSWORD
sync_key: CRON_SHEETSYNC_KEY
```

Агентам: читать только через скрипты деплоя. **Не** печатать пароли в чат/логи/`echo`.

## Как ходить на сервер (агенты)

### FTP (основной рабочий способ)

```powershell
python scripts/Deploy-To-Host.py
```

`admin_auth` деплой **не** заливает (SKIP). После смены секретов залить вручную в корень `const2024` на сервере.

### SSH (если включён в панели и проходит)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Invoke-HostSsh.ps1 -RemoteCommand "pwd; ls domains/informatics384.ru/public_html/const2024 | head"
```

## После деплоя

| Страница | URL |
| --- | --- |
| Доска | https://informatics384.ru/const2024/index.html |
| Вход | https://informatics384.ru/const2024/login.php |
| Дефолты сайта | https://informatics384.ru/const2024/settings.php |
| Звёзды (drag) | https://informatics384.ru/const2024/add_new_star.php |
| Обводка | https://informatics384.ru/const2024/trace.php |
| Синк (cron) | https://informatics384.ru/const2024/SheetSync.php?key=SYNC_KEY |

PHP (`AssetSaver.php`, `JSONSaver.php`, `SheetSync.php`) пишет на диск только после админ-сессии (или `sync_key` для синка).

### Cron каждые 5 минут (Sprinthost)

1. Панель Sprinthost → **Планировщик заданий** / Cron.
2. Расписание: каждые 5 минут (`*/5 * * * *` или аналог в UI).
3. Команда (подставьте `sync_key` из `admin_auth` на сервере):

```bash
curl -fsS "https://informatics384.ru/const2024/SheetSync.php?key=SYNC_KEY" >/dev/null
```

Альтернатива, если `curl` нет: `wget -q -O /dev/null "…"`.

Проверка вручную: тот же URL в браузере; dry-run: `&dry=1` или `&dry=1&class=3-1`.

Книга Google должна отдаваться по ссылке (экспорт CSV).

### Колонки Google Sheets (вручную)

Код **не** пишет в таблицу — только читает CSV. На каждой вкладке из `assets/json/classes.json`:

**Листы `N-N класс`** (A = номер, B = текст, C = заголовок):

1. В столбец **D** (или следующий свободный) в строке заголовка/первой строке листа напишите `опубликовать`.
2. Выделите столбец → Данные → Проверка данных → **Checkbox**.
3. В первой строке звезды (`A=1`) поставьте одну галочку — шаблон для копирования вниз.
4. Синк берёт только строки, где галочка включена и заполнены B и/или C.

**Листы `N-N инд`** (детальная таблица с `Итог`):

1. Добавьте столбцы `текст звезды` и `опубликовать` рядом с `Итог`.
2. На `опубликовать` — Checkbox.
3. Галочку-шаблон — в первой строке группы (`N=1`).
4. Заголовок звезды = `Итог`, текст = `текст звезды`; без галочки группа не публикуется.

Примеры CSV: `assets/json/sample_3-3_class.csv`, `sample_3-3_ind.csv`.

## Не делать

- Не коммитить `ssh_auth`, `admin_auth`, `sync_auth`
- Не класть пароль в `docs/`
- Не заливать весь `public_html` — только каталог `const2024`
