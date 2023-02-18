import { MinecraftServerListPing } from "minecraft-status";
import Query from "minecraft-query";
import motdParser from '@sfirew/mc-motd-parser'
import dnsPromises from 'dns';

export interface ServerInfo {
    host?: string,
    port?: number,
    query_port?: number
}

interface Player {
    name?: string | undefined;
}

export interface StatusResponse {
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

export async function getSRVPort(host: string): Promise<number> {
    return new Promise((resolve) => {
        dnsPromises.resolveSrv("_minecraft._tcp." + host, (error, addresses) => {
            try {
                // Return SRV port
                const srvPort = addresses ? addresses[0].port : undefined;
                if (srvPort) {
                    resolve(srvPort);
                    return;

                // Fallback to default port if no SRV record
                } else {
                    resolve(25565);
                }
            } catch (err) {
                // Fallback to default port if error
                if (error) console.log(error);
                console.log(err);
                resolve(25565);
            }
        });
    });
}

export async function getMCStatus(serverInfo: ServerInfo): Promise<StatusResponse> {
    const host = serverInfo.host;
    const port = serverInfo.port;
    const query = serverInfo.query_port;

    // SRV lookup and port fallback
    const srvPort: number = port || await getSRVPort(host);

    // Server status lookup
    let serverStatus;
    try {
        serverStatus = await MinecraftServerListPing.ping(4, host, srvPort);
    } catch (error) {
        console.log(error);
        serverStatus = undefined;
    }

    // Server online response
    if (serverStatus) {
        const statusResponse: StatusResponse = {
            name: "",
            nameHTML: motdParser.JSONToHtml(serverStatus.description),
            map: serverStatus.version.name,
            maxplayers: serverStatus.players?.max || 0,
            onlineplayers: serverStatus.players.online,
            players: serverStatus.players.sample,
            connect: `${host}:${srvPort}`,
            version: serverStatus.version.name,
            favicon: serverStatus.favicon
        }

        // Default query port to SRV port if not specified
        const queryPort: number = query || srvPort;

        // Server query lookup
        const q = new Query({host: host, port: queryPort, timeout: 3000});
        let serverQuery;
        try {
            serverQuery = await q.fullStat()
            q.close();
        } catch (error) {
            q.close();
            console.log(error);
            serverQuery = undefined;
        }

        // Add query data to status response
        if (serverQuery) {
            statusResponse.name = serverQuery.motd.replaceAll("�", "§");
            statusResponse.players = serverQuery.players;
            
        } else {
            // Playercount mismatch between sample and online
            if (!serverStatus.players.sample || serverStatus.players.sample.length !== serverStatus.players.online) {
                statusResponse.players = [];
                for (let i = 0; i < serverStatus.players.online; i++) {
                    statusResponse.players.push({ name: "" });
                }
            }
            // MOTD parsing
            if (serverStatus.description.hasOwnProperty("extra")) {
                for (const element of serverStatus.description.extra) {
                    statusResponse.name += element.text;
                }
            } else if (serverStatus.description.hasOwnProperty("text")) {
                statusResponse.name = motdParser.cleanTags(serverStatus.description.text);
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
            connect: `${host}:${srvPort}`,
            version: "Minecraft",
            favicon: ""
        }
    }
}