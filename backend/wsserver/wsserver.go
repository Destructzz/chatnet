package wsserver

import (
	"chatnet/cache/redis"
	"context"
	"encoding/json"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Hub struct {
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	clients    map[*Client]bool
	redis      *redis.Client // Redis клиент
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

type Message struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

func NewHub(redisClient *redis.Client) *Hub {
	h := &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
		clients:    make(map[*Client]bool),
		redis:      redisClient,
	}
	go h.run()
	return h
}

// ✅ ОСНОВНОЙ ЦИКЛ ХАБА
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			// Сохраняем в Redis + рассылаем клиентам
			h.saveToRedis(message)
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// ✅ СОХРАНЕНИЕ В REDIS
func (h *Hub) saveToRedis(msg []byte) {
	var message Message
	if err := json.Unmarshal(msg, &message); err != nil {
		return
	}
	// Сохраняем сообщение в Redis list
	ctx := context.Background()
	h.redis.Rdb.LPush(ctx, "chat:messages", string(msg))
}

// ✅ WEBSOCKET HANDLER
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade:", err)
		return
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}

	h.register <- client // ✅ Регистрируем клиента

	go client.writePump() // ✅ Запускаем горутины
	go client.readPump()
}

// ✅ ЧТЕНИЕ С КЛИЕНТА
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		c.hub.broadcast <- message // ✅ Рассылка всем
	}
}

// ✅ ОТПРАВКА КЛИЕНТУ
func (c *Client) writePump() {
	defer c.conn.Close()

	for msg := range c.send { // ← for range по каналу!
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}
