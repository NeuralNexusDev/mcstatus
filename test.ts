import { ping } from 'bedrock-protocol';
ping({ host: 'mc.basmc.ca', port: 19132 }).then(res => {
    console.log(res);
}).catch(err => {
    console.log(err);
});