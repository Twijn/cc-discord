module.exports = {
    send: (message, reply, socket) => {
        if (message.hasOwnProperty("message")) {
            if (message.hasOwnProperty("channel") && message.hasOwnProperty("guild")) {
                //TODO
            } else if (message.hasOwnProperty("recipient")) {
                if (socket.allowed.users.includes(message.recipient)) {
                    global.discord.users.fetch(message.recipient).then(user => {
                        user.send(message.message).then(msg => {
                            reply({success: true, message: {
                                id: msg.id,
                                content: msg.content,
                                embeds: msg.embeds,
                                components: msg.components
                            }});
                        }, err => {
                            reply({success: false, error: err.rawError})
                        });
                    }, err => {
                        reply({success: false, error: err.rawError})
                    });
                } else {
                    reply({success: false, error: "Unable to send message to this recipient", allowed: socket.allowed});
                }
            } else {
                reply({success: false, error: "Invalid body, missing recipient or channel/guild"});
            }
        } else {
            reply({success: false, error: "Invalid body, missing message"});
        }
    },
    getUser: (message, reply, socket) => {
        if (message.hasOwnProperty("id")) {
            global.discord.users.fetch(message.id).then(user => {
                reply({success: true, user: user});
            }, err => {
                reply({success: false, error: err.rawError});
            });
        } else {
            reply({success: false, error: "Invalid body, missing ID"});
        }
    },
}