import { getSRVPort, getMCStatus, ServerInfo, StatusResponse } from "../lib/mcstatus.js";

// Test getSRVPort
describe("getSRVPort Default Port", () => {
    it("should return port number 25565", async () => {
        const host: string = "mc.basmc.ca";
        const port: number = await getSRVPort(host);
        expect(port).toBe(25565);
    });
});

describe("getSRVPort Non-Default Port", () => {
    it("should return port number 25666", async () => {
        const host: string = "sb3.thexpnetwork.com";
        const port: number = await getSRVPort(host);
        expect(port).toBe(25666);
    });
});

describe("getSRVPort Errored", () => {
    it("should return port number 25565", async () => {
        const host: string = "example.test";
        const port: number = await getSRVPort(host);
        expect(port).not.toBe(25566);
    });
});


// Test getMCStatus
describe("getMCStatus", () => {
    it("should return an online java status response", async () => {
        const serverInfo: ServerInfo = {
            host: "mc.basmc.ca",
            port: 25565
        };

        const status: StatusResponse = await getMCStatus(serverInfo);

        expect(status.name).not.toContain("Server Offline");
        expect(status.nameHTML).not.toContain("Server Offline");
        expect(status.map).toBeDefined();
        expect(status.maxplayers).toBeDefined();
        expect(status.onlineplayers).toBeDefined();
        expect(status.players).toBeDefined();
        expect(status.connect).toBeDefined();
        expect(status.version).toBeDefined();
        expect(status.favicon).toBeDefined();
        expect(status.server_type).toBe("java");
    });

    it("should return an online bedrock status response", async () => {
        const serverInfo: ServerInfo = {
            host: "mc.basmc.ca",
            port: 19132,
            is_bedrock: true
        };

        const status: StatusResponse = await getMCStatus(serverInfo);

        expect(status.name).not.toContain("Server Offline");
        expect(status.nameHTML).not.toContain("Server Offline");
        expect(status.map).toBeDefined();
        expect(status.maxplayers).toBeDefined();
        expect(status.onlineplayers).toBeDefined();
        expect(status.players).toBeDefined();
        expect(status.connect).toBeDefined();
        expect(status.version).toBeDefined();
        expect(status.favicon).toBeDefined();
        expect(status.server_type).toBe("bedrock");
    });

    it("should return an offline status response", async () => {
        const serverInfo: ServerInfo = {
            host: "example.test",
            port: 25565
        };

        const status: StatusResponse = await getMCStatus(serverInfo);

        expect(status.name).toContain("Server Offline");
        expect(status.nameHTML).toContain("Server Offline");
        expect(status.map).toBe("Minecraft");
        expect(status.maxplayers).toBe(0);
        expect(status.onlineplayers).toBe(0);
        expect(status.players).toEqual([]);
        expect(status.connect).toBeDefined();
        expect(status.version).toBe("Minecraft");
        expect(status.favicon).toBe("");
        expect(status.server_type).toBeDefined();
    });
});
