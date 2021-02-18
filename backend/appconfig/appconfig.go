package appconfig

import (
	"os"
	"strconv"
)

var DevMode = getEnvOrDefault("BURGER_REVIEWS_DEV_MODE", "dev")
var TokenExpireTime = getEnvOrDefault("TOKEN_EXPIRE_TIME", "1m")
var MaxTokensPerIP, _ = strconv.Atoi(getEnvOrDefault("MAX_TOKENS_PER_IP", "100"))
var HttpOrHttps = getHttpOrHttpsValue(getEnvOrDefault("IS_HTTPS", "false"))
var ServerDomain = getEnvOrDefault("SERVER_DOMAIN", "localhost")
var ServerPort = getEnvOrDefault("SERVER_PORT", "9090")
var ServeOnPath = getEnvOrDefault("SERVE_ON_PATH", "/burgerreviews")
var ConstantsPath = getEnvOrDefault("CONSTANTS_PATH", "constants.json")
var FrontendDir = getEnvOrDefault("FRONTEND_DIR", "/app/frontend")
var RedisHost = getEnvOrDefault("REDIS_HOST", "burger-reviews-redis")
var RedisPort = getEnvOrDefault("REDIS_PORT", "6379")
var RedisAddress = RedisHost + ":" + RedisPort
var RedisUser = getEnvOrDefault("REDIS_USER", "")
var RedisPassword = getEnvOrDefault("REDIS_PASSWORD", "")
var RedisDB = getEnvOrDefault("REDIS_DB", "0")

func getHttpOrHttpsValue(isHttps string) string {
	if isHttps == "false" {
		return "http://"
	}
	return "https://"
}

func getEnvOrDefault(envVar string, defaultValue string) string {
	value := os.Getenv(envVar)
	if value == "" {
		value = defaultValue
	}
	return value
}
