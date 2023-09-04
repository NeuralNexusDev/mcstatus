# mcstatus

Minecraft server status API written in Go: <https://api.neuralnexus.dev/api/v1/mcstatus>

## Usage

There's an `openapi.json` file in the root of the repository, which can be used to generate a client for the API, and just has the basic spec for the API (one of these days I'll set up SwaggerIO).

Status Page (text/html):

`https://api.neuralnexus.dev/api/v1/mcstatus/{your.server.ip}`

Status API (application/json):

`https://api.neuralnexus.dev/api/v1/mcstatus/{your.server.ip}`

Parameters (Either query or in the request body):

- `address` - The address of the server
- `port` - The port of the server (default: 25565)
- `query_port` - The query port of the server (default: 25565)
- `is_bedrock` - Whether the server is bedrock (default: false)
- `query_enabled` - Whether the server has query enabled (default: true)

Example: `https://api.neuralnexus.dev/api/v1/mcstatus/{your.server.ip}?port=25566&query_port=25567&query_enabled=false`

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
    "favicon": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

Server Icon:

`https://api.neuralnexus.dev/api/v1/mcstatus/icon/{your.server.ip}`

Parameters (Either query or in the request body):

- `address` - The address of the server
- `port` - The port of the server (default: 25565)
- `is_bedrock` - Whether the server is bedrock (default: false)

Example: `https://api.neuralnexus.dev/api/v1/mcstatus/icon/{your.server.ip}?port=19127&is_bedrock=true`

Just to note, bedrock doesn't support server icons, so this will return a 204 No Content if the server is bedrock, allong with a picture of a bedrock block.

## TODO

- Add protobuf support
- Redo the response spec when the game status API has been redone
- Add basic response caching for query status
- Parse JSON MOTD (17)
- Sanitize the section symbols (§) from the MOTD for embeds
- [Set up some tests](https://pkg.go.dev/testing)
- Rewrite the root web page to be a bit more interactive (maybe some HTMX)
