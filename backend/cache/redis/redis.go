package redis

import (
	"context"
	"github.com/redis/go-redis/v9"
)

type Client struct {
	Rdb *redis.Client
}

var Cache *Client

func New(addr, password string, db int) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	Cache = &Client{Rdb: rdb}
}

func (c *Client) Ping(ctx context.Context) error {
	return c.Rdb.Ping(ctx).Err()
}

func (c *Client) Set(ctx context.Context, key string, value any) error {
	return c.Rdb.Set(ctx, key, value, 0).Err()
}

func (c *Client) Get(ctx context.Context, key string) (string, error) {
	return c.Rdb.Get(ctx, key).Result()
}
