package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
	"github.com/google/uuid"
	appconfig "jacob.squizzlezig.com/burger-reviews/appconfig"
)

type Constants struct {
	ProdSheetsCsvUrl string `json:"prodSheetsCsvUrl"`
	DevSheetsCsvUrl  string `json:"devSheetsCsvUrl"`
	FormUrl          string `json:"formUrl"`
	FormFields       struct {
		DisplayName   string `json:"display name"`
		FormattedName string `json:"formatted name"`
		Deliciousness string `json:"deliciousness"`
		Price         string `json:"price"`
		Group         string `json:"group"`
	} `json:"fields"`
	Groups        []string        `json:"groups"`
	ActiveGroups  []string        `json:"activeGroups"`
	RedisConnPool *redis.Pool     `json:"-"`
	RedisCtx      context.Context `json:"-"`
}

type GroupValidation struct {
	Group string `json:"group"`
	Token string `json:"token"`
}

type CSRFToken struct {
	Token   string    `json:"token"`
	FromIP  string    `json:"fromIP"`
	Used    bool      `json:"used"`
	Created time.Time `json:"created"`
	Expires time.Time `json:"expires"`
}

type Review struct {
	Name          string   `json:"name"`
	FormattedName string   `json:"formattedName"`
	Deliciousness *float64 `json:"deliciousness"`
	Price         *float64 `json:"price"`
	Group         string   `json:"group"`
	Token         string   `json:"token"`
}

func main() {
	fmt.Println("Setting up")
	constants := GetConstants()
	ValidateAllActiveGroupsExist(&constants)
	constants.RedisConnPool = GetRedisConnPool()
	constants.RedisCtx = context.Background()

	httpServer := http.Server{
		Addr:              ":" + appconfig.ServerPort,
		ReadTimeout:       1 * time.Second,
		WriteTimeout:      1 * time.Second,
		IdleTimeout:       30 * time.Second,
		ReadHeaderTimeout: 1 * time.Second,
	}
	fileServer := http.FileServer(http.Dir(appconfig.FrontendDir))
	http.Handle(appconfig.ServeOnPath+"/", http.StripPrefix(appconfig.ServeOnPath, fileServer))

	http.HandleFunc(appconfig.ServeOnPath+"/api/tokens", constants.handleTokens)
	http.HandleFunc(appconfig.ServeOnPath+"/api", constants.handleAPI)
	fmt.Println("Running on port", appconfig.ServerPort, "at path", appconfig.ServeOnPath)
	log.Fatal(httpServer.ListenAndServe())
}

func FormatName(name string) string {
	// This is in no way perfect, but this is fun.
	var yeOldListOfMomsCookingVariants = []string{
		"moms cooking",
		"moms cookin",
		"moms burgers",
		"moms hamburgers",
		"mothers cooking",
		"mothers cookin",
		"mothers burgers",
		"mothers hamburgers",
		"my moms cooking",
		"my moms cookin",
		"my moms burgers",
		"my moms hamburgers",
		"my mothers cooking",
		"my mothers cookin",
		"my mothers burgers",
		"my mothers hamburgers",
		"moms cooking",
		"moms cookin",
		"moms burger",
		"moms hamburger",
		"mothers cooking",
		"mothers cookin",
		"mothers burger",
		"mothers hamburger",
		"my moms cooking",
		"my moms cookin",
		"my moms burger",
		"my moms hamburger",
		"my mothers cooking",
		"my mothers cookin",
		"my mothers burger",
		"my mothers hamburger",
	}

	replaceRegex := regexp.MustCompile(`([^\sa-z0-9])`)
	formattedName := replaceRegex.ReplaceAllString(strings.ToLower(name), "")
	replaceRegex = regexp.MustCompile(`[\s]+`)
	formattedName = replaceRegex.ReplaceAllString(formattedName, " ")

	formattedName = strings.Trim(formattedName, " ")
	if IndexInStringArray(formattedName, yeOldListOfMomsCookingVariants) != -1 {
		return "Mom's Cooking"
	}
	return formattedName
}

func (constants *Constants) handleAPI(writer http.ResponseWriter, request *http.Request) {
	if strings.Contains(request.Referer(), appconfig.HttpOrHttps+appconfig.ServerDomain) == false {
		fmt.Println("API referrer denied at", request.Referer())
		writer.WriteHeader(http.StatusForbidden)
		writer.Write([]byte("Must be on same site"))
		return
	}
	if request.Method == "POST" {
		review := Review{}
		buf := new(bytes.Buffer)
		buf.ReadFrom(request.Body)
		err := json.Unmarshal(buf.Bytes(), &review)
		if err != nil {
			fmt.Println("ERROR:", err.Error())
			if err.Error() == "unexpected end of JSON input" {
				writer.WriteHeader(http.StatusBadRequest)
				writer.Write([]byte("Request must have body"))
				return
			}
			if _, ok := err.(*json.UnmarshalTypeError); ok {
				if strings.Contains(err.Error(), "Review.deliciousness") {
					writer.WriteHeader(http.StatusBadRequest)
					writer.Write([]byte("deliciousness must be a number"))
					return
				}
				if strings.Contains(err.Error(), "Review.price") {
					writer.WriteHeader(http.StatusBadRequest)
					writer.Write([]byte("price must be a number"))
					return
				}
				writer.WriteHeader(http.StatusInternalServerError)
				return
			}
		}
		if review.Token == "" {
			writer.WriteHeader(http.StatusBadRequest)
			writer.Write([]byte("Must have token field"))
			return
		}

		validityOfToken, err := ValidateAndUpdateToken(constants, review.Token)
		if err != nil {
			fmt.Println("ERROR (POST review token validation):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		if validityOfToken == false {
			writer.WriteHeader(http.StatusUnauthorized)
			writer.Write([]byte("Invalid token provided."))
			return
		}

		if IndexInStringArray(review.Group, constants.ActiveGroups) == -1 {
			writer.WriteHeader(http.StatusUnauthorized)
			writer.Write([]byte("Your group is either disabled or doesn't exist. Please try again later."))
			return
		}
		groupIndex := fmt.Sprint(IndexInStringArray(review.Group, constants.Groups))

		// DEV
		if appconfig.DevMode != "prod" {
			groupIndex = "-1"
		}

		err = ReviewErrorHandler(constants, review)
		if err != nil {
			writer.WriteHeader(http.StatusBadRequest)
			writer.Write([]byte(err.Error()))
			return
		}

		if appconfig.DevMode != "prod" {
			return
		}

		stringDeliciousness := strconv.FormatFloat(*review.Deliciousness, 'f', 2, 64)
		stringPrice := strconv.FormatFloat(*review.Price, 'f', 2, 64)

		fullFormUrl, err := url.Parse(constants.FormUrl)
		if err != nil {
			fmt.Println("ERROR:", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		queryParams := url.Values{}
		queryParams.Add(constants.FormFields.DisplayName, review.Name)
		queryParams.Add(constants.FormFields.FormattedName, review.FormattedName)
		queryParams.Add(constants.FormFields.Deliciousness, stringDeliciousness)
		queryParams.Add(constants.FormFields.Price, stringPrice)
		queryParams.Add(constants.FormFields.Group, groupIndex)
		fullFormUrl.RawQuery = queryParams.Encode()

		result, err := http.Post(fullFormUrl.String(), "application/json", nil)
		if err != nil {
			fmt.Println("ERROR:", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		} else if result.StatusCode != http.StatusOK {
			writer.WriteHeader(http.StatusInternalServerError)
			fmt.Println("ERROR: Got status", result.StatusCode, "when submitting review")
			writer.Write([]byte("Something went wrong when sumbitting the review"))
			return
		}
	}

	if request.Method == "GET" {
		// Get a CSV file of burger reviews and return it.
		csvUrl := constants.ProdSheetsCsvUrl
		if appconfig.DevMode != "prod" {
			csvUrl = constants.DevSheetsCsvUrl
		}
		csvFile, _ := http.Get(csvUrl)
		buf := new(bytes.Buffer)
		buf.ReadFrom(csvFile.Body)
		f, _ := os.Create("Burger Reviews.csv")
		defer f.Close()
		f.Write(buf.Bytes())
		http.ServeFile(writer, request, "Burger Reviews.csv")
	}

	if request.Method == "PUT" {
		groupRequest := GroupValidation{}
		buf := new(bytes.Buffer)
		buf.ReadFrom(request.Body)
		err := json.Unmarshal(buf.Bytes(), &groupRequest)
		if err != nil {
			fmt.Println("ERROR:", err.Error())
			if err.Error() == "unexpected end of JSON input" {
				writer.WriteHeader(http.StatusBadRequest)
				writer.Write([]byte("Request must have body"))
				return
			}
			if _, ok := err.(*json.UnmarshalTypeError); ok {
				if strings.Contains(err.Error(), "GroupValidation.group") {
					writer.WriteHeader(http.StatusBadRequest)
					writer.Write([]byte("group must be a string"))
					return
				}
				if strings.Contains(err.Error(), "GroupValidation.token") {
					writer.WriteHeader(http.StatusBadRequest)
					writer.Write([]byte("token must be a string"))
					return
				}
			}
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		if groupRequest.Group == "" {
			writer.WriteHeader(http.StatusBadRequest)
			writer.Write([]byte("Must have group field"))
			return
		}
		if groupRequest.Token == "" {
			writer.WriteHeader(http.StatusBadRequest)
			writer.Write([]byte("Must have token field"))
			return
		}

		validityOfToken, err := ValidateAndUpdateToken(constants, groupRequest.Token)
		if err != nil {
			fmt.Println("ERROR (Validate group token validation):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		if validityOfToken == false {
			writer.WriteHeader(http.StatusUnauthorized)
			writer.Write([]byte("Invalid token provided."))
			return
		}

		if IndexInStringArray(groupRequest.Group, constants.ActiveGroups) != -1 {
			writer.WriteHeader(http.StatusOK)
			return
		}
		writer.WriteHeader(http.StatusUnauthorized)
		writer.Write([]byte("Your group is either disabled or doesn't exist. Please try again later."))
	}
}

func ReviewErrorHandler(constants *Constants, review Review) error {
	if review.Name == "" || review.FormattedName == "" ||
		review.Price == nil || review.Deliciousness == nil || review.Group == "" {
		return errors.New("Can't have empty fields. Must have name, formattedName, deliciousness, price, and group.")
	}

	if FormatName(review.Name) != review.FormattedName {
		return fmt.Errorf(`Formatted name should match "%s", regex ([ a-z0-9]), and max one space in a row.
			If the name in this error doesn't match the regex, you shouldn't be messing with it.`, FormatName(review.Name))
	}

	if len(review.Name) < 3 {
		return errors.New("Name must be 3 or more characters.")
	}
	if review.FormattedName == "Mom's Cooking" && (*review.Price != 0 || *review.Deliciousness != 110) {
		errorString := "Mom's Cooking shall always be of 0 price and 110 deliciousness. "
		if *review.Deliciousness < 110.0 || *review.Price > 0.0 {
			errorString += "Thou art a fool, to think I would let you change this. "
		}
		if *review.Price > 0 {
			errorString += "Thou has never given payment for the best burgers. "
		} else if *review.Price < 0 {
			errorString += "Thou shall not take payment for Mom's Cooking. "
		}
		if *review.Deliciousness > 110 {
			errorString += "Thou art noble to try and raise deliciousness. However, deliciousness "
		} else if *review.Deliciousness < 110 {
			errorString += "The truth lies in your heart that no burger is better than Mom's cooking. Deliciousness "
		} else {
			errorString += "Deliciousness "
		}
		errorString += "is only at 110 to show it is better than the rest, " +
			"as this graph cannot contain the power of Mom's Cooking. " +
			"Call Mom and let her know that she makes the best burgers, and thank her for them."

		return errors.New(errorString)
	}

	if *review.Price < 0 {
		return errors.New("Price must be greater than 0.")
	}
	if review.FormattedName != "Mom's Cooking" && (*review.Deliciousness < 0 || *review.Deliciousness > 100) {
		return errors.New("Deliciousness must be between 0 and 100.")
	}

	return nil
}

func (constants *Constants) handleTokens(writer http.ResponseWriter, request *http.Request) {
	if strings.Contains(request.Referer(), appconfig.HttpOrHttps+appconfig.ServerDomain) == false {
		fmt.Println("TOKENS referrer denied at", request.Referer())
		writer.WriteHeader(http.StatusForbidden)
		writer.Write([]byte("Must be on same site"))
		return
	}
	if request.Method == "GET" {
		remoteIpAddress := strings.Split(request.RemoteAddr, ":")[0]
		if request.Header.Get("X-Forwarded-For") != "" {
			remoteIpAddress = request.Header.Get("X-Forwarded-For")
		}
		redisConn, err := constants.RedisConnPool.Dial()
		if err != nil {
			fmt.Println("ERROR (handleTokens0):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		listOfTokens, err := redis.Strings(redisConn.Do("lrange", remoteIpAddress, 0, -1))
		if err != nil {
			fmt.Println("ERROR (handleTokens1):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		newListOfTokens, err := RemoveAllExpiredTokensFromList(redisConn, listOfTokens, remoteIpAddress)
		if len(newListOfTokens) >= appconfig.MaxTokensPerIP {
			writer.WriteHeader(http.StatusTooManyRequests)
			writer.Write([]byte("Too many requests! Please wait one minute."))
			return
		}

		csrfToken, err := MakeCSRFToken(remoteIpAddress)
		if err != nil {
			fmt.Println("ERROR (handleTokens2):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		bytesCsrfToken, err := json.Marshal(csrfToken)
		if err != nil {
			fmt.Println("ERROR (handleTokens3):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}
		_, err = redisConn.Do("set", csrfToken.Token, string(bytesCsrfToken))
		if err != nil {
			fmt.Println("ERROR (handleTokens4):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}

		_, err = redisConn.Do("rpush", remoteIpAddress, csrfToken.Token)
		if err != nil {
			fmt.Println("ERROR (handleTokens5):", err.Error())
			writer.WriteHeader(http.StatusInternalServerError)
			return
		}
		writer.Write([]byte(fmt.Sprintf(`{"token": "%s"}`, csrfToken.Token)))
	}
}

func ValidateAndUpdateToken(constants *Constants, token string) (bool, error) {
	redisConn, err := constants.RedisConnPool.Dial()
	if err != nil {
		fmt.Println("Error (ValidateAndUpdateToken0):", err.Error())
		return false, err
	}
	stringCsrfToken, err := redis.String(redisConn.Do("get", token))
	if err != nil && stringCsrfToken != "0" {
		fmt.Println("Error (ValidateAndUpdateToken1):", err.Error(), token)
		return false, err
	}
	if stringCsrfToken == "0" {
		return false, nil
	}

	csrfToken := CSRFToken{}
	err = json.Unmarshal([]byte(stringCsrfToken), &csrfToken)
	if err != nil {
		return false, err
	}

	if csrfToken.Used || time.Now().UTC().After(csrfToken.Expires) {
		return false, nil
	}
	csrfToken.Used = true
	bytesCsrfToken, err := json.Marshal(csrfToken)
	if err != nil {
		return true, err
	}

	_, err = redis.String(redisConn.Do("set", token, string(bytesCsrfToken)))
	if err != nil {
		fmt.Println("Error (ValidateAndUpdateToken2):", err.Error())
		return true, err
	}
	return true, nil
}

func RemoveAllExpiredTokensFromList(redisConn redis.Conn, tokenList []string, listName string) ([]string, error) {
	var newList = []string{}
	for _, token := range tokenList {
		stringCsrfToken, err := redis.String(redisConn.Do("get", token))
		if err != nil && stringCsrfToken != "0" {
			return tokenList, err
		}
		if stringCsrfToken == "0" {
			_, err = redisConn.Do("lrem", listName, 1, token)
			if err != nil {
				return newList, err
			}
			continue
		}

		csrfToken := CSRFToken{}
		err = json.Unmarshal([]byte(stringCsrfToken), &csrfToken)
		if err != nil {
			return tokenList, err
		}

		if time.Now().UTC().After(csrfToken.Expires) {
			_, err := redisConn.Do("del", csrfToken.Token)
			if err != nil {
				return newList, err
			}

			_, err = redisConn.Do("lrem", listName, 1, csrfToken.Token)
			if err != nil {
				return newList, err
			}
		} else {
			newList = append(newList, stringCsrfToken)
		}
	}
	return newList, nil
}

func MakeCSRFToken(ipAddress string) (CSRFToken, error) {
	csrfToken := CSRFToken{}
	tokenExpiresDifference, err := time.ParseDuration(appconfig.TokenExpireTime)
	if err != nil {
		return csrfToken, err
	}

	csrfToken.Token = uuid.New().String()
	csrfToken.FromIP = ipAddress
	csrfToken.Created = time.Now().UTC()
	csrfToken.Expires = time.Now().UTC().Add(tokenExpiresDifference)
	return csrfToken, nil
}

func IndexInStringArray(item string, array []string) int {
	for i, x := range array {
		if x == item {
			return i
		}
	}
	return -1
}

func ValidateAllActiveGroupsExist(constants *Constants) {
	for _, x := range constants.ActiveGroups {
		if IndexInStringArray(x, constants.Groups) == -1 {
			panic(fmt.Sprintf(`Found group "%s" in constants.ActiveGroups that doesn't exist in constants.Groups`, x))
		}
	}
}

func GetConstants() Constants {
	constants := Constants{}
	constantsFile, err := os.Open(appconfig.ConstantsPath)
	if err != nil {
		fmt.Println("ERROR: " + err.Error())
		panic("Constants file is required!")
	}
	defer constantsFile.Close()

	constantsBytes, err := ioutil.ReadAll(constantsFile)
	if err != nil {
		fmt.Println("ERROR: " + err.Error())
		panic("Something went wrong reading the constants file")
	}

	err = json.Unmarshal(constantsBytes, &constants)
	if err != nil {
		fmt.Println("ERROR: " + err.Error())
		panic("Something went wrong unmarshalling the constants file")
	}
	return constants
}

func GetRedisConnPool() *redis.Pool {
	redisConnectionPool := &redis.Pool{
		MaxIdle:     5,
		IdleTimeout: 20 * time.Second,
		Dial: func() (redis.Conn, error) {
			return redis.Dial("tcp", appconfig.RedisAddress,
				redis.DialUsername(appconfig.RedisUser),
				redis.DialPassword(appconfig.RedisPassword),
			)
		},
	}
	return redisConnectionPool
}
