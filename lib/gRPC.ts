const PROTO_PATH = './mcstatus.proto';
import { GrpcObject, loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';

import { getMCStatus, ServerInfo } from './mcstatus.js';


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
export const server: Server = new Server();

// gRPC service
server.addService((<any>commandProto.Status).service, {
    GetMCStatus: async (input: { request: ServerInfo; }, callback) => {
        const serverInfo: ServerInfo = input.request;
        const response = await getMCStatus(serverInfo);
        callback(null, response);
    },
});
