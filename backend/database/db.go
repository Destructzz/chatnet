package database

import (
	"fmt"
	"log"
	"os"

	"chatnet/models" // Замени на свой путь, если отличается

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	dsn := fmt.Sprintf(
		"host=postgres user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", // Хост
		os.Getenv("POSTGRES_USER"),     // User
		os.Getenv("POSTGRES_PASSWORD"), // Password
		os.Getenv("POSTGRES_DB"),       // DB Name
		os.Getenv("POSTGRES_PORT"),     // Port
	)

	log.Println("Connecting to DB...")

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	log.Println("🚀 Database connected successfully")

	// Миграция
	err = DB.AutoMigrate(&models.User{})
	if err != nil {
		log.Fatalf("❌ Failed to migrate database: %v", err)
	}
	log.Println("👍 Database migrated")
}
