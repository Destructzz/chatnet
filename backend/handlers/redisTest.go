package handlers

import (
	r "chatnet/cache/redis"
	"chatnet/wsserver"
	"context"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"time"
)

func RedisTest(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	msgs, err := r.Cache.Rdb.LRange(ctx, "chat:messages", 0, -1).Result()

	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, err)
		return
	}

	var messages []wsserver.Message

	for _, msg := range msgs {
		var message wsserver.Message

		err := json.Unmarshal([]byte(msg), &message)

		if err != nil {
			log.Println("error while unmarshal json", err)
		}

		messages = append(messages, message)
	}

	c.JSON(http.StatusOK, messages)
}
