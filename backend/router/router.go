package router

import (
	"chatnet/handlers"   // Импорт хендлеров
	"chatnet/middleware" // Импорт мидлваров
	"chatnet/wsserver"

	"github.com/gin-gonic/gin"
)

func InitRouter(hub *wsserver.Hub) *gin.Engine {
	r := gin.Default()

	r.Static("/shity", "./public")

	// 3. Группа аутентификации
	authGroup := r.Group("/auth")
	{
		authGroup.GET("/:provider", handlers.AuthBegin)
		authGroup.GET("/:provider/callback", handlers.AuthCallback)
		authGroup.GET("/me", middleware.AuthMiddleware(), handlers.AuthMe)
	}

	// 4. Группа защищенных роутов
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/profile", handlers.ProtectedHandler)
	}

	r.GET("/ws", handlers.WebSocketHandler(hub))

	return r
}
