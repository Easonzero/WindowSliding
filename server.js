/**
 * Created by eason on 16-10-24.
 */
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const WINDOWNUM = 6;
const SEQSIZE = 15;
const TIMEOUT = 10;
const users = {};

const data = 'good good study,day day up!';

server.on('listening', () => {
    var address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, info) => {
    let cmd = msg.toString();
    if(cmd=='-time'){
        let date = new Date();
        server.send(
            Buffer.from(
                `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
            ),
            info.port, info.address
        );
    }else if(cmd=='-quit'){
        server.send(Buffer.from('Good bye!'), info.port, info.address);
        delete users[info.address];
    }else if(cmd=='-testgbn'){
        console.log(`testgbn from ${info.port}`);
        users[info.address]={time:0,state:0,port:info.port,method:'GBN'};
        server.send(Buffer.from('205'), info.port, info.address);
    }else if(cmd=='-testsr'){
        console.log(`testsr from ${info.port}`);
        users[info.address]={time:0,state:0,port:info.port,method:'SR'};
        server.send(Buffer.from('205'), info.port, info.address);
    }else if(cmd=='200') {
        if(!users[info.address]) return;
        console.log(`200 from ${info.address}`);
        users[info.address].curSeq = 0;
        users[info.address].startSeq = 0;
        users[info.address].state=1;

        if(users[info.address].method=='GBN') users[info.address].time=0;
        else{
            users[info.address].time=[];
            for(let i=1;i <= SEQSIZE;i++)
                users[info.address].time[i]=0;
        }

        while(users[info.address].curSeq-users[info.address].startSeq<WINDOWNUM&&users[info.address].curSeq<SEQSIZE){
            users[info.address].curSeq++;
            let buffer = Buffer.from(users[info.address].method+users[info.address].curSeq+data+'0');
            console.log(`send ${buffer}`);
            server.send(buffer, info.port, info.address);
        }
    }else if(cmd=='ack') {
        if(!users[info.address]) return;
        console.log('window floating!');
        users[info.address].startSeq++;
        users[info.address].time = 0;

        if(users[info.address].startSeq==SEQSIZE){
            server.send(Buffer.from('finish'), info.port, info.address);
            delete users[info.address];
        }else if(users[info.address].curSeq<SEQSIZE){
            users[info.address].curSeq++;
            let buffer = Buffer.from(users[info.address].method+users[info.address].curSeq+data+'0');
            console.log(`send ${buffer}`);
            server.send(buffer, info.port, info.address);
        }
    }else if(/pkt/.test(cmd)) {
        let index = parseInt(cmd.match(/\d+/));
        users[info.address].time[index] = -1;

        let d = 0;
        for(let i in users[info.address].time) {
            if(users[info.address].time[i]!=-1){
                users[info.address].startSeq=i-1;
                d = i-1-users[info.address].curSeq+WINDOWNUM;
                break;
            }
        }
        if(users[info.address].startSeq==SEQSIZE){
            server.send(Buffer.from('finish'), info.port, info.address);
            delete users[info.address];
        }else if(users[info.address].curSeq<SEQSIZE){
            while(d>0){
                users[info.address].curSeq++;
                d--;
                let buffer = Buffer.from(users[info.address].method+users[info.address].curSeq+data+'0');
                console.log(`send ${buffer}`);
                server.send(buffer, info.port, info.address);
            }
        }

    }else {
        server.send(msg, info.port, info.address);
    }
});

setInterval(()=>{
    for(let user in users){
        if(users[user].state==0) {
            users[user].time++;
            if(users[user].time>TIMEOUT) {
                users[user].time = 0;
                server.send(Buffer.from('205'), users[user].port, user);
            }
        }else if(users[user].state==1){
            if(users[user].method=='GBN'){
                users[user].time++;
                if(users[user].time>TIMEOUT){
                    console.log('window floating back!');
                    users[user].curSeq = users[user].startSeq;
                    while(users[user].curSeq-users[user].startSeq<WINDOWNUM&&users[user].curSeq<SEQSIZE){
                        users[user].curSeq++;
                        let buffer = Buffer.from(users[user].method+users[user].curSeq+data+'0');
                        console.log(`send ${buffer}`);
                        server.send(buffer, users[user].port, user);
                    }
                }
            }else{
                for(let i=users[user].startSeq+1;i<users[user].curSeq+1;i++){
                    if(users[user].time[i]!=-1)
                        users[user].time[i]++;
                    if(users[user].time[i]>TIMEOUT){
                        users[user].time[i] = 0;
                        console.log(`index:${i} resend`);
                        let buffer = Buffer.from(users[user].method+i+data+'0');
                        console.log(`send ${buffer}`);
                        server.send(buffer, users[user].port, user);
                    }
                }
            }
        }
    }
},100);

server.bind(3000,'127.0.0.1');