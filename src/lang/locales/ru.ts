export default {
    // Commands
    cmd_open_panel: 'Открыть Боковую Панель',
    cmd_force_sync: 'Принудительно синхронизировать сейчас',
    cmd_debug_connect: 'Отладка: Проверить Соединение',

    // Ribbon Icon
    ribbon_tooltip: 'Открыть контроллер Syncthing',

    // Status / View
    status_synced: 'Синхронизировано',
    status_syncing: 'Синхронизация...',
    status_offline: 'Не в сети',
    status_error: 'Ошибка',
    status_unknown: 'Неизвестно',
    
    info_last_sync: 'Последняя синхронизация',
    info_devices: 'Устройств в сети',
    info_folder: 'Папка хранилища',
    btn_sync_now: 'Синхронизировать сейчас',
    btn_requesting: 'Запрашивается...',

    // Settings - Headers
    setting_header_conn: 'Настройки соединения',
    setting_header_folder: 'Папки и файлы',
    setting_header_interface: 'Параметры интерфейса',
    setting_header_general: 'Основные',

    // Settings - General
    setting_lang_name: 'Язык интерфейса',
    setting_lang_desc: 'Выберите предпочитаемый язык или используйте выставленный в Obsidian.',

    // Settings - Connection
    setting_https_name: 'Использовать HTTPS',
    setting_https_desc: 'ВАЖНО: Для корректной работы c Android/Mobile ОТКЛЮЧИТЕ эту функцию, она также должна быть ОТКЛЮЧЕНА в Syncthing. Включайте только в том случае, если вы настроили действующий сертификат TLS на своем Устройстве.',
    setting_host_name: 'IP Адрес / Хост',
    setting_host_desc: 'Адрес, по которому открывается доступ к интерфейсу Syncthing. Используйте "127.0.0.1" для локальной сети.',
    setting_port_name: 'Порт',
    setting_port_desc: 'Стандартный 8384. Проверьте настройки Syncthing через интерфейс, если вы его изменили.',
    setting_api_name: 'API Ключ',
    setting_api_desc: 'Найдите его по пути Syncthing > Действия > Настройки > Общие.',
    btn_test_conn: 'Проверить соединение',
    
    // Settings - Folder
    setting_folder_name: 'ID папки хранилища',
    setting_folder_desc: 'Выберите ID папки в Syncthing, соответствующий этому хранилищу Obsidian, чтобы отслеживать ее конкретный статус.',
    dropdown_default: 'Выберите папку...',
    dropdown_none: 'Папка не выбрана',
    btn_search_folders: 'Найти папки из Syncthing',
    
    // Settings - Conflict
    setting_modal_conflict_name: 'Обнаружение конфликтов',
    setting_modal_conflict_desc: 'Включить автоматический поиск ".sync-conflict" файлов. При обнаружении конфликтов на Боковой Панели появится красное предупреждение.',

    // Settings - Interface
    setting_status_bar_name: 'Показывать значок в Строке Состояния',
    setting_status_bar_desc: 'Отображает значок подключения и быстрые действия в нижней правой строке состояния (Только для ПК). Перезапустите Obsidian, чтобы применить.',
    setting_ribbon_name: 'Показывать иконку на Вертикальной Панели',
    setting_ribbon_desc: 'Отображает значок на левой вертикальной панели, чтобы быстро открыть панель управления. Перезапустите Obsidian, чтобы применить.',

    // Notices / Errors
    notice_syncing: 'Запрошена синхронизация...',
    notice_success_conn: 'Подключение прошло успешно! ID устройства: ',
    notice_fail_conn: 'Не удалось установить соединение. Пожалуйста, проверьте IP, Порт, и убедитесь,что HTTPS отключен (особенно на Android).',
    notice_error_auth: 'Не удалось выполнить авторизацию. Пожалуйста, проверьте Ваш API Ключ.',
    notice_offline: 'Syncthing недоступен. Запущен ли он?',
    notice_folders_found: 'папки(ок) найдено.',
    notice_config_first: 'Пожалуйста, сначала настройте API Ключ и Ссылку.',
    notice_searching: 'Подключение к Syncthing...',

    // Conflict Modal
    modal_conflict_title: 'Разрешить конфликты синхронизации',
    modal_conflict_empty: 'Отличные новости! Конфликтующих файлов в Вашем хранилище не найдено.',
    modal_conflict_desc: 'Данные файлы имеют конфликтующие версии. Сравните содержимое и выберите какой оставить.',
    btn_compare: 'Сравнить содержимое',
    btn_keep_original: 'Оставить оригинал',
    tooltip_keep_original: 'Удалит конфликтные файлы (правая сторона) и оставит Ваши локальные.',
    btn_keep_conflict: 'Использовать конфликтную',
    tooltip_keep_conflict: 'Заменяет Ваши локальные файлы на конфликтные (правая сторона).',
    
    // Diff View
    diff_original_header: 'Текущий файл (Оригинал)',
    diff_conflict_header: 'Конфликтующая версия',
    diff_loading: 'Загружаю содержимое файла...',
    diff_original_missing: '(Оригинальный файл удален или не был найден)',
    diff_read_error: 'Ошибка при чтении содержимого файла.',

    // Ignore (.stignore)
    setting_ignore_name: 'Шаблон игнорирования (.stignore)',
    setting_ignore_desc: 'Редактируйте .stignore файл, чтобы предотвратить синхронизацию конкретных файлов (например настройки пространств) между устройствами.',
    btn_edit_ignore: 'Редактировать .stignore',
    
    // Ignore Modal
    modal_ignore_title: 'Редактирование .stignore',
    modal_ignore_desc: 'Файлы или шаблоны вписанные ниже будут полностью проигнорированы Syncthing.',
    header_ignore_templates: 'Встроенные Шаблоны',
    btn_add_ignore: 'Добавить',
    btn_save_ignore: 'Сохранить изменения',
    notice_ignore_saved: '.stignore успешно сохранен.',
    notice_ignore_exists: 'Это правило уже в есть в списке.',

    // Conflict Alert (View)
    alert_conflict_detected: 'Обнаружен конфликт(ы)!',
    alert_click_to_resolve: 'Нажмите здесь, чтобы решить',
};
