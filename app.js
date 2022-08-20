const express = require("express");
const ws = require("ws");
const con = require("./database");
const bodyParser = require("body-parser");

const app = express();
const config = require("./config.json");

const wsServer = new ws.Server({noServer: true});

const wsRoutes = require("./wsRoutes");

wsServer.on("connection", socket => {
    socket.on("message", message => {
        try {
            let msg = JSON.parse(message.toString());

            if (msg.hasOwnProperty("type") && wsRoutes.hasOwnProperty(msg.type)) {
                wsRoutes[msg.type](msg, replyMessage => {
                    if (msg.hasOwnProperty("nonce")) replyMessage.nonce = msg.nonce;
                    socket.send(JSON.stringify(replyMessage));
                }, socket);
            }
        } catch (err) {
            console.error(err);
        }
    });
});

app.get('/', function (req, res) {
    res.send("We're running!");
});

const discord = (req, res) => {
    res.redirect(config.discord.invite);
}

app.get('/discord', discord);
app.get("/d", discord);

app.use(express.static("public"));

app.use(require("./expressAuthenticate"));

app.use(bodyParser.json());

require("./routes/")(app);

const server = app.listen(config.port);

server.on("upgrade", (request, socket, head) => {
    let key = request.url;

    const failAuth = () => {
        socket.write('HTTP/1.1 401 Web Socket Protocol Handshake\r\n' +
                     'Upgrade: WebSocket\r\n' +
                     'Connection: Upgrade\r\n' +
                     '\r\n');
        socket.destroy();
    }

    if (key) {
        key = key.replace("/", "");
        con.query("select * from token where private = ?;", [key], (err, result) => {
            if (err) {
                console.error(err)
                failAuth();
                return;
            }
    
            if (result.length > 0) {
                wsServer.handleUpgrade(request, socket, head, socket => {
                    socket.key = key;
                    socket.allowed = {
                        users: [],
                        channels: [],
                    }
                    wsServer.emit("connection", socket, request);

                    con.query("select guild_id, channel_id from token__permission where token_id = ?;", [result[0].id], (err, result) => {
                        if (err) {
                            console.error(err);
                            return;
                        }

                        result.forEach(row => {
                            if (row.guild_id) {
                                socket.allowed.channels = [
                                    ...socket.allowed.channels,
                                    {
                                        guild: row.guild_id,
                                        channel: row.channel_id,
                                    }
                                ];
                            } else {
                                socket.allowed.users = [
                                    ...socket.allowed.users,
                                    row.channel_id,
                                ];
                            }
                        });
                        console.log(socket.allowed);
                    });
                });
            } else {
                failAuth();
            }
        });
    } else {
        failAuth();
    }
});

console.log("Started Express webserver on " + config.port);

require("./discord/");