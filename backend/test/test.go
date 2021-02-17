package test

import (
	"fmt"
	"net/http"
	"time"
)

func main() {
	// Used to test rate limiting
	client := http.Client{
		Timeout: 10 * time.Second,
	}
	count := 0
	for {
		result, err := client.Get("http://localhost:8080/api/tokens")
		if err != nil {
			fmt.Println("Error:", err.Error())
		}
		if result != nil && result.StatusCode != http.StatusTooManyRequests {
			count += 1
			fmt.Println(count, result.Status)
		}
	}
}
