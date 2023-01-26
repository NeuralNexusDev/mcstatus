var PROTO_PATH = './server_status.proto';
import { credentials, loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

var options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
}
var packageDefinition = loadSync(PROTO_PATH, options);
const commandProto = loadPackageDefinition(packageDefinition);

const Status = commandProto.Status;

export async function Client(message) {
    const client = new Status(
    "0.0.0.0:50052",
    credentials.createInsecure()
    );

    client.GetStatus(message, (error, response) => {
        if (error) throw error
        console.log(response);
    });
}