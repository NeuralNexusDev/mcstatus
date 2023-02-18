import {expect, jest, test} from '@jest/globals';

import type * as MCStatus from "../src/mcstatus.js"
import type { ServerInfo } from "../src/mcstatus.js"
import type { StatusResponse } from "../src/mcstatus.js"
const { getSRVPort } = jest.requireActual<typeof MCStatus>("../src/mcstatus")
const { getMCStatus } = jest.requireActual<typeof MCStatus>("../src/mcstatus")


// Test getSRVPort
describe("getSRVPort Default Port", () => {
    it("should return port number 25565", async () => {
        const host: string = "mc.basmc.ca"
        const port: number = await getSRVPort(host)
        expect(port).toBe(25565)
    })
});

describe("getSRVPort Non-Default Port", () => {
    it("should return port number 25666", async () => {
        const host: string = "sb3.thexpnetwork.com"
        const port: number = await getSRVPort(host)
        expect(port).toBe(25666)
    })
});

describe("getSRVPort Errored", () => {
    it("should return port number 25565", async () => {
        const host: string = "example.com"
        const port: number = await getSRVPort(host)
        expect(port).not.toBe(25566)
    })
});


// Test getMCStatus
describe("getMCStatus Online Response", () => {
    it("should return a status response", async () => {
        const serverInfo: ServerInfo = {
            host: "mc.basmc.ca",
            port: 25565
        }
        const status: StatusResponse = await getMCStatus(serverInfo)
        console.log(status)
        expect(status).toMatchObject({
            name: expect.not.stringContaining("Server Offline"),
            nameHTML: expect.not.stringContaining("Server Offline"),
            map: expect.any(String),
            maxplayers: expect.any(Number),
            onlineplayers: expect.any(Number),
            players: expect.any(Array),
            connect: expect.any(String),
            version: expect.any(String),
            favicon: expect.any(String)
        })
    })
});

describe("getMCStatus Offline Response", () => {
    it("should return a status response", async () => {
        const serverInfo: ServerInfo = {
            host: "example.com",
            port: 25565
        }
        const status: StatusResponse = await getMCStatus(serverInfo)
        console.log(status)
        expect(status).toMatchObject({
            name: "Server Offline",
            nameHTML: "<p>Server Offline</p>",
            map: "Minecraft",
            maxplayers: 0,
            onlineplayers: 0,
            players: [],
            connect: expect.any(String),
            version: "Minecraft",
            favicon: ""
        })
    })
});

export {}