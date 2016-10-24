/**
 * Created by eason on 16-10-24.
 */
const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const SERVERPORT = 3000;
const SERVERIP = 'localhost';
const state = {s:0,data:[],num:0};

client.on('listening', () => {
    console.log('Welcome to WindowSliding TestDemo!');
    rl.question('userName?',(answer)=>{
        rl.setPrompt(`${answer}> `);
        rl.prompt();
    });
});

client.on('message', (msg) => {
    let res = msg.toString();
    if(res == '205') {
        console.log(`205 from server`);
        client.send(Buffer.from('200'), SERVERPORT, SERVERIP)
        state.data.length = 0;
        state.num = 0;
    }
    else if(/SR/.test(res)){
        state.num++;
        let index = parseInt(res.match(/\d+/g));
        if(state.num%10!=0) {
            console.log(`Received msg:${msg}`);
            state.data[index]=res;
            client.send(Buffer.from(`pkt${index}`), SERVERPORT, SERVERIP);
        }
    }
    else if(/GBN/.test(res)) {
        state.num++;
        let index = parseInt(res.match(/\d+/g));
        if(index==1||state.data[index-1]&&state.num%10!=0) {
            console.log(`Received msg:${msg}`);
            state.data[index]=res;
            client.send(Buffer.from('ack'), SERVERPORT, SERVERIP);
        }
    }
    else{
        console.log(`Received msg:${msg}`);
        client.unref();
        rl.prompt();
    }
});

client.bind();

rl.on('line', (input) => {
    client.send(Buffer.from(input), SERVERPORT, SERVERIP);
});