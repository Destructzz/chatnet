package main

import (
	"chatnet/cache/redis"
	"chatnet/database"
	"chatnet/router"
	"chatnet/wsserver"
	"context"
	"fmt"
	"log"
	"os"
	"time"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/google"
)

func main() {
	database.Connect()

	redis.New("redis:6379", "", 0)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)

	defer cancel()

	err := redis.Cache.Ping(ctx)

	if err != nil {
		log.Fatalf("redis isn't responding")
	}

	log.Println("redis is working")

	goth.UseProviders(
		google.New(
			os.Getenv("GOOGLE_CLIENT_ID"),
			os.Getenv("GOOGLE_CLIENT_SECRET"),
			fmt.Sprintf("%s/auth/google/callback",
				os.Getenv("PUBLIC_URL"),
			),
			"email",
			"profile",
		),
	)

	hub := wsserver.NewHub(redis.Cache)

	r := router.InitRouter(hub)

	r.Run(":8080")
}
