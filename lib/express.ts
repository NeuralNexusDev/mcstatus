import express, { Router } from "express";
import bodyParser from "body-parser";
import motdParser from '@sfirew/mc-motd-parser'

import { getMCStatus, ServerInfo } from "./mcstatus.js";


const apiURL: string = process.env.API_URL || "https://api.neuralnexus.dev/api";
const apiVersion: string = process.env.API_VERSION || "v1";


// Default route function
export async function defaultRoute(req, res, next) {
    try {
        res.type("text/html")
            .status(200)
            .send(`
            <title>NeuralNexus.dev</title>
            <h1>How To:</h1>
            <p>${apiURL}/${apiVersion}/mcstatus/your.server.ip</p>
            <p>${apiURL}/${apiVersion}/mcstatus/your.server.ip?port=25566</p>
            <p>${apiURL}/${apiVersion}/mcstatus/your.server.ip?port=25566&query=25666</p>
            <p>${apiURL}/${apiVersion}/mcstatus/your.server.ip?port=25566&query=25666&is_bedrock=true</p>
            <p>${apiURL}/${apiVersion}/mcstatus/icon/your.server.ip</p>
            <p>${apiURL}/${apiVersion}/mcstatus/icon/your.server.ip?port=25566</p>
            <p>${apiURL}/${apiVersion}/mcstatus/icon/your.server.ip?port=25566&is_bedrock=true</p>
        `);
    // Serverside error response
    } catch (err) {
        console.log(err);
        res.type("application/json")
            .status(500)
            .json({ "message": "Internal Server Error", "error": err });
    }
}

// Server status route function
export async function serverStatusRoute(req, res, next) {
    try {
        // Get address and port from request
        const address = req.params.address;
        const port: number = <number><unknown>req.query.port;
        const queryPort: number = <number><unknown>req.query.query;
        const isBedrock: boolean = req.query.is_bedrock;

        // Build response address string
        let addressStr = port ? `${address}?port=${port}` : address;
        if (queryPort) {
            addressStr = port ? `${addressStr}&query=${queryPort}` : `${addressStr}?query=${queryPort}`;
            if (isBedrock) {
                addressStr = `${addressStr}&is_bedrock=${isBedrock}`;
            }
        } else if (isBedrock) {
            addressStr = port ? `${addressStr}&is_bedrock=${isBedrock}` : `${addressStr}?is_bedrock=${isBedrock}`;
            if (queryPort) {
                addressStr = `${addressStr}&query=${queryPort}`;
            }
        }

        // Ignore favicon requests
        if (address==="favicon.ico" || address==="undefined" || address===undefined) return

        // Get server status
        const serverResponse = await getMCStatus({ host: address, port: port, query_port: queryPort, is_bedrock: isBedrock });

        // Initialize response variables
        let motdtext: string = motdParser.cleanTags(serverResponse.name);
        let motdhtml: string = serverResponse.nameHTML;
        let players: string = `${serverResponse.onlineplayers}/${serverResponse.maxplayers}`;
        let version: string = serverResponse.version;
        let favicon: string = serverResponse.favicon;

        // Discord embed response
        if (req.get("accept")===undefined) {
            // Http status code based on server status
            if (serverResponse.name !== "Server Offline") {
                res.status(200);
            } else {
                res.status(400);
            }

            res.type("text/html").send(`
                <meta content="IP: ${address}" property="og:title" />
                <meta content="Powered by NeuralNexus.dev" property="og:site_name">
                <meta property="og:description" content="${motdtext}\nPlayers: ${players}\nVersion: ${version}"/>
                <meta content="${apiURL}/${apiVersion}/mcstatus/${addressStr}" property="og:url" />
                <meta content="${apiURL}/${apiVersion}/mcstatus/icon/${addressStr}" property="og:image" />
                <meta content="#7C0014" data-react-helmet="true" name="theme-color" />
            `);

        // HTML response
        } else if (req.get("accept")?.includes("text/html")) {
            // Http status code based on server status
            if (serverResponse.name !== "Server Offline") {
                res.status(200);
            } else {
                res.status(400);
            }

            const serverIcon: string = favicon ? `<img src="${favicon}" alt="Server Icon" />` : `<img src="${apiURL}/${apiVersion}/mcstatus/icon/${addressStr}" alt="Server Icon" />`;
            res.type("text/html")
                .send(`
                <title>${port ? `${address}:${port}` : address}</title>
                ${motdhtml}
                <br>
                ${serverIcon}
                <p>Players: ${players}</p>
                <p>Version: ${version}</p>
            `);

        // JSON response
        } else if (req.get("accept")?.includes("application/json")) {
            // Http status code based on server status
            if (serverResponse.name !== "Server Offline") {
                res.status(200);
            } else {
                res.status(400);
            }

            res.type("application/json")
                .json(serverResponse);

        // Unsupported response
        } else {
            res.type("application/json")
                .status(400)
                .json({ "message": "Unsupported Accept Headers", "error": {} });
        }

    // Serverside error response
    } catch (err) {
        console.log(err);
        res.type("application/json")
            .status(500)
            .json({ "message": "Internal Server Error", "error": err });
    }
}

// Server icon route function
export async function serverIconRoute(req, res, next) {
    try {
        // Get address and port from request
        const serverInfo: ServerInfo = {
            host: req.params.address,
            port: <number><unknown>req.query.port,
            query_port: <number><unknown>req.query.query,
            is_bedrock: req.query.is_bedrock
        }

        if (serverInfo.is_bedrock) {
            res.type("image/png")
                .status(200)
                .sendFile("bedrock.png", { root: "./" });
            return
        }

        // Build response address string
        let addressStr = serverInfo.port ? `${serverInfo.host}?port=${serverInfo.port}` : serverInfo.host;
        addressStr = serverInfo.query_port ? `${addressStr}?query=${serverInfo.query_port}` : addressStr;

        // Get server status
        const serverResponse = await getMCStatus(serverInfo);

        // Send favicon
        if (serverResponse?.favicon!==undefined && serverResponse.favicon!=="") {
            res.type("image/png")
                .status(200)
                .send(Buffer.from(serverResponse.favicon.replace(/^data:image\/png;base64,/, ""), "base64"));
        } else {
            res.type("image/png")
                .status(200)
                .sendFile("default.png", { root: "./" });
        }

    // Serverside error response
    } catch (err) {
        console.log(err);
        res.type("application/json")
            .status(500)
            .json({ "message": "Internal Server Error", "error": err });
    }
}

// Configure REST API/Webserver
export const app = express();
export const router = Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("", router);

// Default route
router.get("/", defaultRoute);

// Server status route
router.get("/:address", serverStatusRoute);

// Icon endpoint
router.get("/icon/:address", serverIconRoute);
