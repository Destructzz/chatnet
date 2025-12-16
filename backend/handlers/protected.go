package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func ProtectedHandler(c *gin.Context) {
	email, _ := c.Get("email")
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to protected area!",
		"email":   email,
	})
}
