class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentTab = 'general-chat';
        this.privateChatWith = null;
        this.currentGroup = null;
        this.messages = {
            general: [],
            private: {},
            groups: {}
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        // Загрузка списков доступна сразу (если API позволяет без авторизации, или токен уже есть)
        this.loadUsers();
        this.loadGroups();

        // Главная точка входа: проверяем токен (из URL или Storage) и восстанавливаем сессию
        this.checkAuth();
    }

    // Единая проверка авторизации при старте
    checkAuth() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const storedToken = localStorage.getItem('token');

        if (urlToken) {
            // Сценарий 1: Вернулись от Google
            localStorage.setItem('token', urlToken);
            window.history.replaceState({}, document.title, "/");
            this.fetchUserProfile();
        } else if (storedToken) {
            // Сценарий 2: Просто обновили страницу (F5)
            this.fetchUserProfile();
        } else {
            // Сценарий 3: Аноним, ничего не делаем или показываем кнопку входа
            console.log("No token found, waiting for login...");
        }
    }

    // Загрузка профиля текущего юзера по токену
    async fetchUserProfile() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // ВАЖНО: Убедитесь, что этот роут существует на бэкенде и возвращает JSON с user
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData;

                // Успех! Обновляем UI и подключаем сокет
                this.updateUIAfterLogin();
                this.connectToSocket(); // Подключаем сокет только когда знаем кто мы
            } else {
                // Токен протух или неверен
                console.warn('Token invalid, logging out');
                this.logout();
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }

    setupEventListeners() {
        // Навигация по табам
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Модальные окна
        // Проверка на null нужна, если кнопок нет (когда юзер уже залогинен и HTML перерисовался)
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showModal('loginModal'));
        }

        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showModal('registerModal'));
        }

        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // Формы
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        // Отправка сообщений
        document.getElementById('sendGeneralMessage').addEventListener('click', () => {
            this.sendGeneralMessage();
        });

        document.getElementById('generalMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendGeneralMessage();
        });

        document.getElementById('sendPrivateMessage').addEventListener('click', () => {
            this.sendPrivateMessage();
        });

        document.getElementById('privateMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendPrivateMessage();
        });

        document.getElementById('sendGroupMessage').addEventListener('click', () => {
            this.sendGroupMessage();
        });

        document.getElementById('groupMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendGroupMessage();
        });

        // Создание группы
        document.getElementById('createGroupBtn').addEventListener('click', () => {
            this.createGroup();
        });
    }

    connectToSocket() {
        // Если уже подключены - не дублируем, но можем обновить токен
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        this.socket = io('http://localhost:3000', {
            transports: ['websocket'],
            auth: {
                token: token
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });

        // Обработка сообщений
        this.socket.on('generalMessage', (message) => {
            this.addMessageToGeneralChat(message);
        });

        this.socket.on('privateMessage', (message) => {
            this.addMessageToPrivateChat(message);
        });

        this.socket.on('groupMessage', (message) => {
            this.addMessageToGroupChat(message);
        });

        this.socket.on('userOnline', (userId) => {
            this.updateUserStatus(userId, true);
        });

        this.socket.on('userOffline', (userId) => {
            this.updateUserStatus(userId, false);
        });
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.access_token);
                // Тут data.user уже есть, можно сразу использовать
                this.currentUser = data.user;

                this.updateUIAfterLogin();
                this.hideModal('loginModal');
                this.connectToSocket();
            } else {
                alert(data.message || 'Ошибка входа');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    async register() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Регистрация успешна! Теперь войдите в систему.');
                this.hideModal('registerModal');
                this.showModal('loginModal');
            } else {
                alert(data.message || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Register error:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    updateUIAfterLogin() {
        if (!this.currentUser) return;

        // Обновляем шапку
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-info-logged">
                    <span>Привет, ${this.currentUser.name}!</span>
                    <button class="btn btn-logout" id="logoutBtn">Выйти</button>
                </div>
            `;

            // Вешаем обработчик на новую кнопку (она только что создалась динамически)
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
        }

        // Обновляем боковую панель
        const userProfile = document.getElementById('userProfile');
        if (userProfile) userProfile.style.display = 'flex';

        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = this.currentUser.name;

        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = this.currentUser.email;

        const profileTab = document.getElementById('profileTab');
        if (profileTab) profileTab.style.display = 'block';

        // Активируем поля ввода сообщений
        document.querySelectorAll('.message-input input, .message-input button').forEach(el => {
            el.disabled = false;
        });
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        if (this.socket) {
            this.socket.disconnect();
        }
        location.reload();
    }

    switchTab(tab) {
        // Обновляем активный пункт меню
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (activeTabBtn) activeTabBtn.classList.add('active');

        // Показываем соответствующий контент
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(tab);
        if (activeContent) activeContent.classList.add('active');

        this.currentTab = tab;
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    async sendGeneralMessage() {
        const input = document.getElementById('generalMessageInput');
        const message = input.value.trim();

        if (!message || !this.currentUser) return;

        try {
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: message,
                    roomId: null, // Общий чат
                    receiverId: null
                })
            });

            if (response.ok) {
                input.value = '';
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async sendPrivateMessage() {
        if (!this.privateChatWith) return;

        const input = document.getElementById('privateMessageInput');
        const message = input.value.trim();

        if (!message || !this.currentUser) return;

        try {
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: message,
                    roomId: null,
                    receiverId: this.privateChatWith.id
                })
            });

            if (response.ok) {
                input.value = '';
            }
        } catch (error) {
            console.error('Error sending private message:', error);
        }
    }

    async sendGroupMessage() {
        if (!this.currentGroup) return;

        const input = document.getElementById('groupMessageInput');
        const message = input.value.trim();

        if (!message || !this.currentUser) return;

        try {
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: message,
                    roomId: this.currentGroup.id,
                    receiverId: null
                })
            });

            if (response.ok) {
                input.value = '';
            }
        } catch (error) {
            console.error('Error sending group message:', error);
        }
    }

    addMessageToGeneralChat(message) {
        const messagesContainer = document.getElementById('generalMessages');
        if (!messagesContainer) return;
        const messageElement = this.createMessageElement(message);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addMessageToPrivateChat(message) {
        const messagesContainer = document.getElementById('privateMessages');
        if (!messagesContainer) return;
        // Проверяем, что сообщение относится к текущему открытому чату
        // (чтобы не показывать сообщения от Васи в чате с Петей)
        const isRelated =
            (message.senderId === this.privateChatWith?.id) ||
            (message.receiverId === this.privateChatWith?.id);

        if (isRelated) {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    addMessageToGroupChat(message) {
        const messagesContainer = document.getElementById('groupMessages');
        if (!messagesContainer) return;

        if (this.currentGroup && message.roomId === this.currentGroup.id) {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    createMessageElement(message) {
        const isOwn = message.senderId === (this.currentUser?.id);

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;

        const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.sender?.name || 'Неизвестный'}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.content)}</div>
        `;

        return messageDiv;
    }

    escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadUsers() {
        const token = localStorage.getItem('token');
        if (!token) return; // Без токена, возможно, список не отдадут

        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                this.renderUsersList(users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadGroups() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/chat/rooms', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const groups = await response.json();
                this.renderGroupsList(groups);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    renderUsersList(users) {
        const container = document.getElementById('allUsersList');
        const privateList = document.getElementById('privateUsersList');

        if (container) container.innerHTML = '';
        if (privateList) privateList.innerHTML = '';

        users.forEach(user => {
            if (user.id === this.currentUser?.id) return;

            // Для вкладки "Все пользователи"
            if (container) {
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.innerHTML = `
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-info">
                        <h4>${user.name}</h4>
                        <p>${user.email}</p>
                    </div>
                    <button class="btn btn-chat" data-user-id="${user.id}">
                        <i class="fas fa-comment"></i> Чат
                    </button>
                `;
                container.appendChild(userCard);
            }

            // Для списка личных чатов
            if (privateList) {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <div class="user-avatar-small">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <span>${user.name}</span>
                `;
                userItem.addEventListener('click', () => {
                    this.startPrivateChat(user);
                });
                privateList.appendChild(userItem);
            }
        });

        // Добавляем обработчики для кнопок чата
        document.querySelectorAll('.btn-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.btn-chat').dataset.userId; // Используем closest, если клик по иконке
                const user = users.find(u => u.id == userId);
                if (user) {
                    this.switchTab('private-chat');
                    this.startPrivateChat(user);
                }
            });
        });
    }

    renderGroupsList(groups) {
        const container = document.getElementById('groupsList');
        if (!container) return;
        container.innerHTML = '';

        groups.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item';
            groupItem.innerHTML = `
                <div class="group-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p>${group.members?.length || 0} участников</p>
                </div>
            `;

            groupItem.addEventListener('click', () => {
                this.selectGroup(group);
            });

            container.appendChild(groupItem);
        });
    }

    startPrivateChat(user) {
        this.privateChatWith = user;
        const container = document.getElementById('privateMessages');
        if (container) {
            container.innerHTML = `
                <div class="message system">
                    <p>Начало переписки с ${user.name}</p>
                </div>
            `;
        }

        const input = document.getElementById('privateMessageInput');
        if (input) input.disabled = false;

        const sendBtn = document.getElementById('sendPrivateMessage');
        if (sendBtn) sendBtn.disabled = false;

        // Загружаем историю сообщений
        this.loadPrivateChatHistory(user.id);
    }

    selectGroup(group) {
        this.currentGroup = group;
        const container = document.getElementById('groupMessages');
        if (container) {
            container.innerHTML = `
                <div class="message system">
                    <p>Чат группы: ${group.name}</p>
                </div>
            `;
        }

        const input = document.getElementById('groupMessageInput');
        if (input) input.disabled = false;

        const sendBtn = document.getElementById('sendGroupMessage');
        if (sendBtn) sendBtn.disabled = false;

        // Загружаем историю сообщений группы
        this.loadGroupChatHistory(group.id);
    }

    async loadPrivateChatHistory(userId) {
        try {
            const response = await fetch(`/api/chat/messages/private/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.renderPrivateChatHistory(messages);
            }
        } catch (error) {
            console.error('Error loading private chat history:', error);
        }
    }

    async loadGroupChatHistory(groupId) {
        try {
            const response = await fetch(`/api/chat/messages/room/${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.renderGroupChatHistory(messages);
            }
        } catch (error) {
            console.error('Error loading group chat history:', error);
        }
    }

    renderPrivateChatHistory(messages) {
        const container = document.getElementById('privateMessages');
        if (!container) return;

        // Очищаем, но оставляем системное сообщение (если нужно, можно удалять всё)
        // container.innerHTML = ''; 
        // Если мы хотим добавить сообщения к уже существующему системному, то так:
        // Но лучше очищать и рисовать заново все, включая системное
        container.innerHTML = `
             <div class="message system">
                <p>Начало переписки с ${this.privateChatWith?.name}</p>
            </div>
        `;

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        container.scrollTop = container.scrollHeight;
    }

    renderGroupChatHistory(messages) {
        const container = document.getElementById('groupMessages');
        if (!container) return;

        container.innerHTML = `
             <div class="message system">
                <p>Чат группы: ${this.currentGroup?.name}</p>
            </div>
        `;

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        container.scrollTop = container.scrollHeight;
    }

    async createGroup() {
        const name = prompt('Введите название группы:');
        if (!name) return;

        try {
            const response = await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                alert('Группа создана успешно!');
                this.loadGroups();
            }
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Ошибка при создании группы');
        }
    }

    updateUserStatus(userId, isOnline) {
        // Обновляем статус пользователя в интерфейсе
        console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
    }
}

// Запускаем приложение при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
