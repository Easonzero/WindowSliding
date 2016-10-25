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
const DATA = 'day day up,good good study!';
const TIMEOUT = 10;
const WINDOWNUM = 6;
const SEQSIZE = 15;
const server = {time:0,prepare:false,startSeq:0,curSeq:0};

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
    }else if(/ack/.test(res)){
        let index = parseInt(res.match(/\d+/));
        console.log('window floating!');
        if(index > server.startSeq){
            server.startSeq = index;
            server.time = 0;
        }

        if(server.startSeq==SEQSIZE){
            client.send(Buffer.from('finish'), SERVERPORT, SERVERIP);
            server.time = 0;
            server.prepare = false;
            server.startSeq = 0;
            server.curSeq = 0;
        }else if(server.curSeq<SEQSIZE){
            server.curSeq++;
            let buffer = Buffer.from(server.curSeq+DATA+'0');
            console.log(`send ${buffer}`);
            client.send(buffer, SERVERPORT, SERVERIP);
        }
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
            client.send(Buffer.from(`ack${index}`), SERVERPORT, SERVERIP);
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
    if(input == '-send'){
        server.prepare = true;

        while(server.curSeq-server.startSeq<WINDOWNUM&&server.curSeq<SEQSIZE){
            server.curSeq++;
            let buffer = Buffer.from(server.curSeq+DATA+'0');
            console.log(`send ${buffer}`);
            client.send(buffer, SERVERPORT, SERVERIP);
        }
    }else client.send(Buffer.from(input), SERVERPORT, SERVERIP);
});

setInterval(()=>{
    if(!server.prepare) return;
    server.time++;
    if(server.time>TIMEOUT){
        console.log('window floating back!');
        server.curSeq = server.startSeq;
        while(server.curSeq-server.startSeq<WINDOWNUM&&server.curSeq<SEQSIZE){
            server.curSeq++;
            let buffer = Buffer.from(server.curSeq+DATA+'0');
            console.log(`send ${buffer}`);
            client.send(buffer, SERVERPORT, SERVERIP);
        }
    }
},100);