# mcstatus

Minecraft server status API written in Go: <https://api.neuralnexus.dev/api/v1/mcstatus>

## Usage

Status Page (text/html):

`https://api.neuralnexus.dev/api/v1/mcstatus/{your.server.ip}`

Status API (application/json):

`https://api.neuralnexus.dev/api/v1/mcstatus/{your.server.ip}`

Query Parameters:

- `port` - The port of the server (default: 25565)
- `query_port` - The query port of the server (default: 25565)
- `is_bedrock` - Whether the server is bedrock or not (default: false)
- `query_enabled` - Whether the server has query enabled or not (default: true)

Example: `https://api.neuralnexus.dev/api/v1/mcstatus/localhost?port=25566&query_port=25567&query_enabled=false`

Returns:

```json
{
    "name": "Neural Nexus",
    "map": "",
    "maxplayers": 20,
    "onlineplayers": 1,
    "players": [
        {
            "name": "NeuralNexus"
        }
    ],
    "connect": "neuralnexus.dev",
    "version": "1.16.5",
    "favicon": "data:image/png;base64,iVBORw0KGgoAAA"
}
```

Server Icon:

`https://api.neuralnexus.dev/api/v1/mcstatus/icon/{your.server.ip}`

Query Parameters:

- `port` - The port of the server (default: 25565)
- `is_bedrock` - Whether the server is bedrock or not (default: false)

Example: `https://api.neuralnexus.dev/api/v1/mcstatus/icon/localhost?port=19127&is_bedrock=true`

Just to note, bedrock doesn't support server icons, so this will return a 204 No Content if the server is bedrock, allong with a picture of a bedrock block.

## TODO

- Add protobuf support
- Add REST body as a form of input
- Redo the response spec when the game status API has been redone
- Add basic response caching for query status
- Parse JSON MOTD (17)
