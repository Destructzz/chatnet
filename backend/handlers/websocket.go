package handlers

import (
	"chatnet/wsserver"
	"github.com/gin-gonic/gin"
)

func WebSocketHandler(hub *wsserver.Hub) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		hub.ServeWS(ctx.Writer, ctx.Request)
	}
}
