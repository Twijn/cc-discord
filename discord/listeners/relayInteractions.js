const { EmbedBuilder } = require("discord.js");
const wsRoutes = require("../../wsRoutes");
const con = require("../../database");

const regex = /^\w{32}-.+/

let listener = {
    name: 'relayInteractions',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isButton() || interaction.isSelectMenu()) {
            let type = "button";

            if (interaction.isSelectMenu()) type = "selectMenu";
            
            if (interaction.customId.match(regex)) {
                let public = interaction.customId.substr(0,32);
                let customId = interaction.customId.substr(33);

                const id = con.generateRandomString(32);

                function retry(num = 0) {
                    let matchingSockets = global.sockets.filter(x => x.public === public);

                    const embed = new EmbedBuilder()
                        .setTitle("Awaiting response...")
                        .setDescription("Sending interaction to `" + matchingSockets.length + " clients`.")
                        .setColor(matchingSockets.length === 0 ? 0xe83b3b : 0x31ad67);

                    if (matchingSockets.length === 0)
                        embed.addFields({name: "No Listening Clients", value: "There currently aren't any clients listening on this token.\nWe'll wait for one for 10 seconds, and if we don't get one this interaction may fail."})
                    
                    interaction.editReply({embeds: [embed]});
                    
                    matchingSockets.forEach(socket => {
                        socket.send(JSON.stringify({type: type, customId: customId, replyId: id, interaction: {
                            message: {
                                id: interaction.message.id,
                                content: interaction.message.content,
                                embeds: interaction.message.embeds,
                                components: interaction.message.components
                            },
                            member: {
                                id: interaction.member.id,
                                name: interaction.member.name,
                                discriminator: interaction.member.discriminator,
                                tag: interaction.member.tag,
                                avatar: interaction.member.displayAvatarURL()
                            },
                            guild: {
                                id: interaction.guild.id,
                                name: interaction.guild.name,
                                description: interaction.guild.description,
                                icon: interaction.guild.iconURL(),
                                banner: interaction.guild.bannerURL(),
                            },
                            channel: {
                                id: interaction.channel.id,
                                name: interaction.channel.name
                            },
                            values: interaction.values,
                        }}));
                    });

                    if (num > 10) {
                        const errorEmbed = new EmbedBuilder()
                            .setTitle("We didn't receive a client in time")
                            .setDescription("No client connected in time to process this command.")
                            .setColor(0xe83b3b);

                        interaction.editReply({embeds: [errorEmbed]});
                        wsRoutes.removeId(id);
                    } else if (matchingSockets.length === 0) {
                        setTimeout(() => {
                            retry(num + 1);
                        }, 1000);
                    }
                }

                let timeout = setTimeout(() => {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle("We didn't receive a reply in time")
                        .setDescription("No client responded in time to process this command.\nAn action may have been carried out by the recipient as the message was sent, we just didn't receive a reply back.")
                        .setColor(0xe83b3b);

                    interaction.editReply({embeds: [errorEmbed]});
                    wsRoutes.removeId(id);
                }, 30000);

                wsRoutes.interactionQueue = [
                    ...wsRoutes.interactionQueue,
                    {
                        id: id,
                        public: public,
                        reply: message => {
                            if (typeof(message) === "string") message = {content: message};
                            if (!message.hasOwnProperty("embeds")) message.embeds = [];
                            
                            clearTimeout(timeout);
                            wsRoutes.removeId(id);

                            return interaction.editReply(message);
                        }
                    }
                ]

                interaction.deferReply({ephemeral: true}).then(() => {retry()}, console.error);
            }
        }
    }
};

module.exports = listener;