const {Client} = require('./lib');
let c = new Client({
    clientType: 'user'
});
c.connect(process.env.TOKEN, 'datagutt');
c.on('message', msgs => {
    let msg = msgs[0];
    console.log('msg', msg);
    if(msg.content === '!ping'){
        c.say('pong');
    }
    if(msg.content === '!emote'){
        c.say('Kappa');
    }
})