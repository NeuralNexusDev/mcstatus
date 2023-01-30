const PROTO_PATH = './mcstatus.proto';
import { GrpcObject, loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';
import express from "express";
import bodyParser from "body-parser";
import { MinecraftServerListPing, MinecraftQuery } from "minecraft-status";
import Query from "minecraft-query";
import motdParser from '@sfirew/mc-motd-parser'
import dnsPromises from 'dns';
import fs from 'fs';


// Interfaces matching the protobuffs
interface ServerInfo {
    host?: string,
    port?: number,
    query_port?: number
}

interface Player {
    name?: string | undefined;
}

interface StatusResponse {
    name?: string,
    nameHTML?: string,
    map?: string,
    maxplayers?: number,
    onlineplayers?: number,
    players?: Player[],
    connect?: string,
    version?: string,
    favicon?: string
}

async function getMCStatus(address: string, port?: number, query?: number): Promise<StatusResponse> {
    // SRV lookup and port fallback
    const srvPort: number = port || await (new Promise((resolve) => {
        dnsPromises.resolveSrv("_minecraft._tcp." + address, (error, addresses) => {
            try {
                // Return SRV port
                const srvPort = addresses ? addresses[0].port : undefined;
                if (srvPort) {
                    resolve(srvPort);
                    return;
                } else {
                    resolve(25565);
                }
            } catch (err) {
                // Fallback to default port
                if (error) console.log(error);
                console.log(err);
                resolve(25565);
            }
        });
    }));

    // Server status lookup
    const serverStatus = await MinecraftServerListPing.ping(4, address, srvPort)
    .then((response: any) => {
        return response;
    }).catch((error: any) => {
        console.log(error);
        return undefined;
    });

    // Server online response
    if (serverStatus) {
        const statusResponse: StatusResponse = {
            name: "",
            nameHTML: motdParser.JSONToHtml(serverStatus.description),
            map: serverStatus.version.name,
            maxplayers: serverStatus.players.max,
            onlineplayers: serverStatus.players.online,
            players: serverStatus.players.sample,
            connect: `${address}:${srvPort}`,
            version: serverStatus.version.name,
            favicon: serverStatus.favicon
        }

        // Default query port to SRV port if not specified
        const queryPort: number = query || srvPort;

        // Server query lookup
        const q = new Query({host: address, port: queryPort, timeout: 3000});
        const serverQuery = await q.fullStat()
        .then((success: any) => {
            q.close();
            return success;
        }).catch((error: any) => {
            q.close();
            console.log(error);
            return undefined;
        });

        // Add query data to status response
        if (serverQuery) {
            statusResponse.name = serverQuery.motd.replaceAll("�", "§");
            statusResponse.players = serverQuery.players;
            
        } else {
            if (serverStatus.description.hasOwnProperty("extra")) {
                for (const element of serverStatus.description.extra) {
                    statusResponse.name += element.text;
                }
            } else {
                statusResponse.name = motdParser.cleanTags(serverStatus.description);
            }
        }

        return statusResponse;

    // Server offline response
    } else {
        return {
            name: "Server Offline",
            nameHTML: "<p>Server Offline</p>",
            map: "Minecraft",
            maxplayers: 0,
            onlineplayers: 0,
            players: [],
            connect: `${address}:${srvPort}`,
            version: "Minecraft",
            favicon: ""
        }
    }
}


// gRPC options
const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
}

// gRPC setup
const packageDefinition: PackageDefinition = loadSync(PROTO_PATH, options);
const commandProto: GrpcObject = loadPackageDefinition(packageDefinition);
const server: Server = new Server();

// gRPC service
server.addService((<any>commandProto.Status).service, {
    GetMCStatus: async (input: { request: ServerInfo; }, callback) => {
        const serverInfo: ServerInfo = input.request;
        const response = await getMCStatus(serverInfo?.host, serverInfo?.port, serverInfo?.query_port);
        callback(null, response);
    },
});

// Start gRPC server
const GRPC_PORT: number = <number><unknown>process.env.GRPC_PORT || 50051
server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    ServerCredentials.createInsecure(),
    (error, port) => {
      console.log(`Game Server Status gRPC server running on port ${GRPC_PORT}`);
      server.start();
    }
);


// Configure/start REST API/Webserver
const REST_PORT: number = <number><unknown>process.env.REST_PORT || 3000
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(REST_PORT, () => {
    console.log(`MC Status REST API running on port ${REST_PORT}`);
});

// Default route
app.get("/", async (req, res) => {
    try {
        // Default HTML response
        res.type("text/html")
            .status(200)
            .send(`
                <title>NeuralNexus.dev</title>
                <h1>How To:</h1>
                <p>https://api.neuralnexus.dev/api/mcstatus/your.server.ip</p>
                <p>https://api.neuralnexus.dev/api/mcstatus/your.server.ip?port=25566</p>
                <p>https://api.neuralnexus.dev/api/mcstatus/icon/your.server.ip</p>
                <p>https://api.neuralnexus.dev/api/mcstatus/icon/your.server.ip?port=25566</p>
            `);

    // Serverside error response
    } catch (err) {
        console.error(err);
        res.status(500)
        .json({ "message": "Internal Server Error", "error": err });
    }
});

// Server status route
app.get("/:address", async (req, res) => {
    try {
        // Get address and port from request
        const address = req.params.address;
        const port: number = <number><unknown>req.query.port;
        const queryPort: number = <number><unknown>req.query.query;

        // Build response address string
        let addressStr = port ? `${address}?port=${port}` : address;
        addressStr = queryPort ? `${addressStr}?query=${queryPort}` : addressStr;

        // Ignore favicon requests
        if (address==="favicon.ico" || address==="undefined" || address===undefined) return

        // Get server status
        const serverResponse = await getMCStatus(address, port, queryPort);

        // Initialize response variables
        let motdtext: string = motdParser.cleanTags(serverResponse.name);
        let motdhtml: string = serverResponse.nameHTML;
        let players: string = `${serverResponse.onlineplayers}/${serverResponse.maxplayers}`;
        let version: string = serverResponse.version;
        let favicon: string = serverResponse.favicon;

        // Http status code based on server status
        if (serverResponse.name !== "Server Offline") {
            res.status(200);
        } else {
            res.status(400);
        }

        // Discord embed response
        if (req.get("accept")===undefined) {
            res.type("text/html").send(`
                <meta content="IP: ${address}" property="og:title" />
                <meta content="Powered by NeuralNexus.dev" property="og:site_name">
                <meta property="og:description" content="
                        ${motdtext}
                        Players: ${players}
                        Version: ${version}
                        "/>
                <meta content="https://api.neuralnexus.dev/api/mcstatus/${addressStr}" property="og:url" />
                <meta content="https://api.neuralnexus.dev/api/mcstatus/icon/${addressStr}" property="og:image" />
                <meta content="#7C0014" data-react-helmet="true" name="theme-color" />
            `);

        // HTML response
        } else if (req.get("accept")?.includes("text/html")) {
            res.type("text/html")
                .send(`
                <title>${port ? `${address}:${port}` : address}</title>
                ${motdhtml}
                <br>
                <img src="https://api.neuralnexus.dev/api/mcstatus/icon/${addressStr}" alt="icon" />
                <p>Players: ${players}</p>
                <p>Version: ${version}</p>
            `);

        // JSON response
        } else {
            res.type("application/json")
                .json(serverResponse);
        }

    // Serverside error response
    } catch (err) {
        console.error(err);
        res.status(500)
        .json({ "message": "Internal Server Error", "error": err });
    }
});

// Icon endpoint
app.get("/icon/:address", async (req, res) => {
    try {
        // Server status response
        const serverResponse = await getMCStatus(req.params.address, <number><unknown>req.query.port, <number><unknown>req.query.query);

        // Send favicon
        if (serverResponse?.favicon!==undefined && serverResponse.favicon!=="") {
            res.type("image/png")
            .status(200)
            .send(Buffer.from(serverResponse.favicon.replace("data:image/png;base64,", ""), 'base64'));

        // Send default icon
        } else {
            res.type("image/png")
            .status(400)
            .send(Buffer.from(fs.readFileSync("./default.png")));
        }

    // Serverside error response
    } catch (err) {
        console.error(err);
        res.status(500)
        .json({ "message": "Internal Server Error", "error": err });
    }
});
