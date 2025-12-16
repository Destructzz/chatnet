package models

import (
	"gorm.io/gorm"
	"time"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Основные поля
	Email     string `gorm:"uniqueIndex;not null" json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`

	// Поля для OAuth (опционально, но полезно)
	Provider string `json:"provider"` // google, github, email
}

type PublicUser struct {
	Id        int    `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}
