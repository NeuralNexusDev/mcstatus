package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ZeroErrors/go-bedrockping"
	"github.com/dreamscached/minequery/v2"
	"github.com/gin-gonic/gin"
)

var SERVER_URL string = os.Getenv("SERVER_URL")

var defaultIcon, _ = loadImgFromFile("./icons/default.png")

var offlineJavaResponse StausResponse = StausResponse{
	Name:          "Server Offline",
	Map:           "",
	MaxPlayers:    0,
	OnlinePlayers: 0,
	Players:       []Player{},
	Connect:       "",
	Version:       "",
	Favicon:       imgToBase64(defaultIcon),
	ServerType:    "java",
}

var bedrockIcon, _ = loadImgFromFile("./icons/bedrock.png")

var offlineBedrockResponse StausResponse = StausResponse{
	Name:          "Server Offline",
	Map:           "",
	MaxPlayers:    0,
	OnlinePlayers: 0,
	Players:       []Player{},
	Connect:       "",
	Version:       "",
	Favicon:       imgToBase64(bedrockIcon),
	ServerType:    "bedrock",
}

func main() {
	// Initialize env variables and constants
	if SERVER_URL == "" {
		SERVER_URL = "/" // "https://api.neuralnexus.dev/api/v1/mcstatus"
	}
	if SERVER_URL[len(SERVER_URL)-1:] == "/" {
		SERVER_URL = SERVER_URL[:len(SERVER_URL)-1]
	}

	var router *gin.Engine = gin.Default()

	// Minecraft Server Status
	router.GET("/", getRoot)
	router.GET("/:address", getServerStatus)
	router.GET("/icon/:address", getIcon)

	router.Run("0.0.0.0:8080")
}

// -------------- Structs --------------

// ServerInfo contains the server info
type ServerInfo struct {
	Host      string `json:"host"`
	Port      int    `json:"port"`
	QueryPort int    `json:"query_port"`
	IsBedrock bool   `json:"is_bedrock"`
}

// Simple Player definition
type Player struct {
	Name string `json:"name"`
}

// General status response
type StausResponse struct {
	Name          string   `json:"name"`
	Map           string   `json:"map"`
	MaxPlayers    int      `json:"maxplayers"`
	OnlinePlayers int      `json:"onlineplayers"`
	Players       []Player `json:"players"`
	Connect       string   `json:"connect"`
	Version       string   `json:"version"`
	Favicon       string   `json:"favicon"`
	ServerType    string   `json:"server_type"`
}

// -------------- Functions --------------

// Convert image.Image to base64 string
func imgToBase64(i image.Image) string {
	// Buffer to encode image
	var buff bytes.Buffer

	// Encode image to writer
	png.Encode(&buff, i)

	// Encode byte array into base64 string
	var encodedString string = base64.StdEncoding.EncodeToString(buff.Bytes())

	return "data:image/png;base64," + encodedString
}

// Load image from file
func loadImgFromFile(path string) (image.Image, error) {
	// Open the file
	iconFile, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer iconFile.Close()

	// Decode the image
	img, _, err := image.Decode(iconFile)
	if err != nil {
		return nil, err
	}

	return img, nil
}

// Get params
func getParams(c *gin.Context) ServerInfo {
	// Get is_bedrock from params
	is_bedrock, err := strconv.ParseBool(c.Query("is_bedrock"))
	if err != nil {
		is_bedrock = false
	}

	// Get port from params
	portString := c.Param("port")

	// Get slug from params
	var address string = c.Param("address")

	// Check if the address contains a colon anywhere
	if strings.Contains(address, ":") {
		// Split the address into host and port
		var split []string = strings.Split(address, ":")
		address = split[0]
		portString = split[1]
	}

	// Parse the port
	port, err := strconv.ParseInt(portString, 10, 16)
	if err != nil {
		if is_bedrock {
			port = 19132
		} else {
			port = 25565
		}
	}

	// Get query port from params
	query_port, err := strconv.ParseInt(c.Query("query_port"), 10, 16)
	if err != nil {
		query_port = port
	}

	// Return the server info
	return ServerInfo{
		Host:      address,
		Port:      int(port),
		QueryPort: int(query_port),
		IsBedrock: is_bedrock,
	}
}

// -------------- Status --------------

// Get Bedrock server status
func BedrockServerStatus(serverInfo ServerInfo) (StausResponse, image.Image, error) {
	// return bedrockping.Query(address+":"+fmt.Sprint(port), 5*time.Second, 150*time.Millisecond)

	connect := serverInfo.Host + ":" + fmt.Sprint(serverInfo.Port)

	respB, err := bedrockping.Query(connect, 5*time.Second, 150*time.Millisecond)
	if err != nil {
		return offlineBedrockResponse, defaultIcon, err
	}

	// Get the server name
	serverName := respB.ServerName
	if len(respB.Extra) > 1 {
		serverName += " " + respB.Extra[1]
	}

	var mapName string = ""
	if len(respB.Extra) > 2 {
		mapName = respB.Extra[2]
	}

	// Create the status response
	return StausResponse{
		Name:          serverName,
		Map:           mapName,
		MaxPlayers:    respB.MaxPlayers,
		OnlinePlayers: respB.PlayerCount,
		Players:       []Player{},
		Connect:       connect,
		Version:       respB.MCPEVersion,
		Favicon:       offlineBedrockResponse.Favicon,
		ServerType:    "bedrock",
	}, bedrockIcon, nil
}

// Parse players
func parsePlayers(players []minequery.PlayerEntry17) []Player {
	// Create a new array of players
	var playerList []Player = []Player{}

	// Loop through the players
	for _, player := range players {
		// Append the player to the player list
		playerList = append(playerList, Player{
			Name: player.Nickname,
		})
	}

	return playerList
}

// Get Java server status
func JavaServerStatus(serverInfo ServerInfo) (StausResponse, image.Image, error) {
	// Create a new pinger
	pinger := minequery.NewPinger(
		minequery.WithTimeout(5 * time.Second),
	)

	// Default struct data
	statusResponse := StausResponse{
		Name:          "",
		Map:           "",
		MaxPlayers:    0,
		OnlinePlayers: 0,
		Players:       []Player{},
		Connect:       serverInfo.Host + ":" + fmt.Sprint(serverInfo.Port),
		Version:       "",
		Favicon:       "",
		ServerType:    "java",
	}

	// Now the glorious if else chain
	var icon image.Image
	resp17, err := pinger.Ping17(serverInfo.Host, serverInfo.Port)
	if err != nil {
		// Load the default icon from the filesystem
		icon, err = loadImgFromFile("./icons/default.png")

		resp16, err := pinger.Ping16(serverInfo.Host, serverInfo.Port)
		if err != nil {
			resp14, err := pinger.Ping14(serverInfo.Host, serverInfo.Port)
			if err != nil {
				resp15, err := pinger.PingBeta18(serverInfo.Host, serverInfo.Port)
				if err != nil {
					// Now try for Bedrock
					respB, bImage, err := BedrockServerStatus(serverInfo)
					if err != nil {
						// Try bedrock on 19132
						serverInfo.Port = 19132
						respB, bImage, err := BedrockServerStatus(serverInfo)
						if err != nil {
							return offlineJavaResponse, icon, err
						}
						return respB, bImage, nil
					}
					return respB, bImage, nil
				}
				statusResponse.Name = resp15.MOTD
				statusResponse.MaxPlayers = resp15.MaxPlayers
				statusResponse.OnlinePlayers = resp15.OnlinePlayers
				statusResponse.Version = "1.5"
			}
			statusResponse.Name = resp14.MOTD
			statusResponse.MaxPlayers = resp14.MaxPlayers
			statusResponse.OnlinePlayers = resp14.OnlinePlayers
			statusResponse.Version = "1.4"
		}
		statusResponse.Name = resp16.MOTD
		statusResponse.MaxPlayers = resp16.MaxPlayers
		statusResponse.OnlinePlayers = resp16.OnlinePlayers
		statusResponse.Version = resp16.ServerVersion
	} else {
		icon = resp17.Icon
		statusResponse.Name = resp17.Description.String()
		statusResponse.MaxPlayers = resp17.MaxPlayers
		statusResponse.OnlinePlayers = resp17.OnlinePlayers
		statusResponse.Players = parsePlayers(resp17.SamplePlayers)
		statusResponse.Version = resp17.VersionName
		statusResponse.Favicon = imgToBase64(icon)
	}

	return statusResponse, icon, nil
}

// Sevrer status
func ServerStatus(serverInfo ServerInfo) (StausResponse, image.Image, error) {
	if serverInfo.IsBedrock {
		return BedrockServerStatus(serverInfo)
	}
	return JavaServerStatus(serverInfo)
}

// -------------- Routes --------------

// Route that returns general API info
func getRoot(c *gin.Context) {
	// Read the html file
	html, err := os.ReadFile("index.html")
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
	}

	// Replace the server url
	htmlString := string(html)
	htmlString = strings.ReplaceAll(htmlString, "{{SERVER_URL}}", SERVER_URL)

	// Serve the html
	c.Header("Content-Type", "text/html")
	c.String(http.StatusOK, htmlString)
}

// Route that returns the server icon as a PNG (base64 encoded string didn't work for some reason)
func getIcon(c *gin.Context) {
	// Get the query params
	serverInfo := getParams(c)

	var icon image.Image
	var status int = http.StatusOK
	var err error

	// Get the server status
	if serverInfo.IsBedrock {
		// Load the bedrock icon from the filesystem (Bedrock doesn't have a server icon)
		icon, err = loadImgFromFile("./icons/bedrock.png")
		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
		}
	} else {
		// Get Java server status
		_, image, err := JavaServerStatus(serverInfo)

		if err == nil {
			// Set the icon as the server icon
			icon = image
		} else {
			// Load the default icon from the filesystem
			img, err := loadImgFromFile("./icons/default.png")
			if err != nil {
				c.String(http.StatusInternalServerError, err.Error())
			}
			icon = img
			status = http.StatusNotFound
		}
	}

	// Set the content type as image/png
	c.Header("Content-Type", "image/png")
	c.Status(status)
	png.Encode(c.Writer, icon)
}

// TODO Get Embeds working
// Route that returns the server status
func getServerStatus(c *gin.Context) {
	// Get the query params
	serverInfo := getParams(c)

	var status int = http.StatusOK

	// Fix this error handling later
	resp, _, err := ServerStatus(serverInfo)
	if err != nil {
		status = http.StatusNotFound
	}

	c.IndentedJSON(status, resp)
}
