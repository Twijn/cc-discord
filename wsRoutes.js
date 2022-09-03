let routes = {
    interactionQueue: [],
    removeId: id => {
        routes.interactionQueue = routes.interactionQueue.filter(x => x.id !== id);
    },
    send: (message, reply, socket) => {
        if (message.hasOwnProperty("message")) {
            if (message.hasOwnProperty("channel") && message.hasOwnProperty("guild")) {
                if (socket.allowed.channels.find(x => x.guild === message.guild && x.channel === message.channel)) {
                    global.discord.channels.fetch(message.channel).then(channel => {
                        if (channel.guild.id === message.guild) {

                            // place public key in components to be able to track them down //
                            if (message.message.hasOwnProperty("components")) {
                                message.message.components.forEach(row => {
                                    if (row.hasOwnProperty("components")) {
                                        row.components.forEach(component => {
                                            if (component.hasOwnProperty("customId")) {
                                                component.customId = socket.public + "-" + component.customId
                                            } else if (component.hasOwnProperty("custom_id")) {
                                                component.custom_id = socket.public + "-" + component.custom_id
                                            }
                                        })
                                    }
                                });
                            }
                            
                            channel.send(message.message).then(msg => {
                                reply({success: true, message: {
                                    id: msg.id,
                                    content: msg.content,
                                    embeds: msg.embeds,
                                    components: msg.components
                                }});
                            }, err => {
                                console.error(err)
                                reply({success: false, error: err.rawError})
                            })
                        } else {
                            reply({success: false, error: "Guild does not match found channel"});
                        }
                    }, err => {
                        reply({success: false, error: err.rawError})
                    });
                } else {
                    reply({success: false, error: "Unable to send message to this channel", allowed: socket.allowed});
                }
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
            reply({success: false, error: "Invalid body, missing id"});
        }
    },
    keepAlive: (message, reply, socket) => {
        socket.timeSinceKeepalive = 0;
    },
    interactionReply: (message, reply, socket) => {
        if (message.hasOwnProperty("id") && message.hasOwnProperty("message")) {
            let target = routes.interactionQueue.find(x => x.id === message.id && x.public === socket.public);

            if (target) {
                // place public key in components to be able to track them down //
                if (message.message.hasOwnProperty("components")) {
                    message.message.components.forEach(row => {
                        if (row.hasOwnProperty("components")) {
                            row.components.forEach(component => {
                                if (component.hasOwnProperty("customId")) {
                                    component.customId = socket.public + "-" + component.customId
                                } else if (component.hasOwnProperty("custom_id")) {
                                    component.custom_id = socket.public + "-" + component.custom_id
                                }
                            })
                        }
                    });
                }
                
                target.reply(message.message).then(msg => {
                    reply({success: true, message: {
                        id: msg?.id,
                        content: msg?.content,
                        embeds: msg?.embeds,
                        components: msg?.components
                    }});
                }, err => {
                    reply({success: false, error: err.rawError})
                });
            } else {
                console.log(routes.interactionQueue);
                reply({success: false, error: "Interaction with target id does not exist"});
            }
        } else {
            reply({success: false, error: "Invalid body, missing id, message"});
        }
    },
}

module.exports = routes;