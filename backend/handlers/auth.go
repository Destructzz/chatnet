package handlers

import (
	"chatnet/database"
	"chatnet/models"
	"chatnet/utils"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/markbates/goth/gothic"
)

func AuthBegin(c *gin.Context) {
	// Трюк для передачи провайдера в Gothic через Gin

	q := c.Request.URL.Query()
	q.Set("provider", c.Param("provider"))
	c.Request.URL.RawQuery = q.Encode()
	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func AuthCallback(c *gin.Context) {
	user, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		c.AbortWithError(http.StatusUnauthorized, err)
		return
	}

	// Генерируем наш JWT через utils
	tokenString, err := utils.GenerateJWT(user.Email)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	userDatabase := models.User{
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
		Name:      user.Name,
		Provider:  user.Provider,
	}

	log.Println("user name:", user.Name)

	result := database.DB.Where(models.User{Email: user.Email}).
		Assign(userDatabase).
		FirstOrCreate(&userDatabase)

	if result.Error != nil {
		c.AbortWithError(http.StatusInternalServerError, result.Error)
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, "/?token="+tokenString)
}

func AuthMe(c *gin.Context) {
	v, ok := c.Get("email")
	email, typeOk := v.(string)

	if !ok || !typeOk || email == "" {
		c.AbortWithError(http.StatusUnauthorized, fmt.Errorf("no email in context"))
		return
	}

	var user models.PublicUser

	// database.DB.Where(models.User{Email: email}).First(&user)

	if err := database.DB.Model(&models.User{}).
		Where(&models.User{Email: email}).
		Select("id", "email", "name", "avatar_url").
		First(&user).Error; err != nil {
		c.AbortWithError(http.StatusUnauthorized, err)
		return
	}

	c.JSON(http.StatusOK, user)
}
