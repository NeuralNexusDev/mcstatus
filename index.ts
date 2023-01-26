import express from "express";
import bodyParser from "body-parser";
import { MinecraftServerListPing, MinecraftQuery } from "minecraft-status";
import motdParser from '@sfirew/mc-motd-parser'
import dnsPromises from 'dns';


// Interfaces matching the protobuffs
interface ServerInfo {
    host: string,
    port: number
}

interface StatusResponse {
    name?: string,
    map?: string,
    password?: boolean,
    maxplayers?: number,
//    players?: Gamedig.Player[],
//    bots?: Gamedig.Player[],
    connect?: string,
    ping?: number
}


async function getMCStatus(address: string, port?: number, query?: number): Promise<any> {
    // SRV lookup and port fallback
    const srvPort: number = port || await (new Promise((resolve) => {
        dnsPromises.resolveSrv("_minecraft._tcp." + address, (error, addresses) => {
            try {
                if (error) console.log(error);
                resolve(addresses[0].port);
            } catch (err) {
                console.log(err);
                resolve(25565);
            }
        });
    }));

    const queryPort: number = query || srvPort;

    // Server status lookup
    const serverData = await MinecraftServerListPing.ping(4, address, srvPort)
    .then(response => {
        return response;
    }).catch(error => {
        console.log(error);
        return undefined;
    });
    return serverData;
}

const REST_PORT: number = <number><unknown>process.env.REST_PORT || 3000
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(REST_PORT, () => {
    console.log(`MC Status REST API running on port ${REST_PORT}`);
});

app.get("/", async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500);
        console.error(err);
    }
});

app.get("/:address", async (req, res) => {
    try {
        const address = req.params.address;
        const port: number = <number><unknown>req.query.port;
        const addressStr = port ? `${address}?port=${port}` : address;

        if (address==="favicon.ico" || address==="undefined" || address===undefined) return

        const serverData = await getMCStatus(address, port);

        let motdtext = "";
        let motdhtml: string;
        let players: string;
        let version: string;
        let favicon: string;
        if (serverData!==undefined) {
            res.status(200);
            const description = serverData.description;
            if (description.hasOwnProperty("extra")) {
                motdhtml = motdParser.JSONToHtml(description);
                for (const element of description.extra) {
                    motdtext += element.text;
                }
            } else {
                try {
                    motdtext = motdParser.cleanTags(description);
                } catch {
                    motdtext = description?.text;
                }
                try{
                    motdhtml = motdParser.textToHTML(description);
                } catch {
                    motdhtml = description?.text;
                }
            }
            players = `${serverData.players.online}/${serverData.players.max}`;
            version = serverData.version.name;
            favicon = serverData.favicon;
        } else {
            res.status(400);
            motdtext = "Server Offline";
            motdhtml = "<p>Server Offline</p>";
            players = "0/0";
            version = "Minecraft";
            favicon = "";
        }

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
        } else if (req.get("accept")?.includes("text/html")) {
            res.type("text/html")
                .send(`
                <title>${port ? `${address}:${port}` : address}</title>
                ${motdhtml}
                <br>
                <img src="${favicon}" alt="icon" />
                <p>Players: ${players}</p>
                <p>Version: ${version}</p>
            `);
        } else {
            res.type("application/json")
                .json(serverData);
        }
    } catch (err) {
        res.status(500);
        console.error(err);
    }
});

app.get("/icon/:address", async (req, res) => {
    try {
        const serverData = await getMCStatus(req.params.address, <number><unknown>req.query.port);
        
        if (serverData?.favicon!==undefined) {
            res.type("image/png")
            .status(200)
            .send(Buffer.from(serverData.favicon.replace("data:image/png;base64,", ""), 'base64'));
        } else {
            res.status(400).json({});
        }
    } catch (err) {
        res.status(500);
        console.error(err);
    }
});
