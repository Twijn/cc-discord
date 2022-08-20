const {EmbedBuilder} = require("discord.js");
const client = global.discord;
const con = require("../../database");

let listener = {
    name: 'authorizeListener',
    eventName: 'interactionCreate',
    eventType: 'on',
    AUTH_SELECT_HEADER: "authorize-",
    listener (interaction) {
        if (interaction.isSelectMenu()) {
            if (interaction.customId.startsWith(listener.AUTH_SELECT_HEADER)) {
                const public = interaction.customId.replace(listener.AUTH_SELECT_HEADER, "");

                con.query("select id, created_by, md5(concat(private, \":\", created_by)) as public from token where md5(concat(private, \":\", created_by)) = ? or id = ?;", [public, public], async (err, res) => {
                    if (err) {
                        interaction.reply({content: "Error: " + err, ephemeral: true});
                        console.error(err);
                        return;
                    }

                    if (res.length > 0) {
                        let createdBy = "???";

                        try {
                            createdBy = (await client.users.fetch(res[0].created_by)).toString();
                        } catch (err) {
                            console.error(err);
                        }
                        
                        let added = 0;

                        interaction.values.forEach(value => {
                            let guildId = null;
                            let channelId = value;

                            if (value.includes(":")) {
                                if (interaction.member.permissions.has("ManageGuild")) {
                                    [guildId, channelId] = value.split(":");
                                } else {
                                    return;
                                }
                            }

                            con.query("insert into token__permission (token_id, guild_id, channel_id) values (?, ?, ?);", [res[0].id, guildId, channelId], err => {
                                if (err) console.error(err);
                            });

                            added++;
                        });

                        const embed = new EmbedBuilder()
                            .setTitle("Authorization Added!")
                            .setDescription("You've authorized " + added + " channel" + (added === 1 ? "" : "s") + " to " + createdBy + "'s token, `" + res[0].public + "`")
                            .setColor(0x31ad67);

                        interaction.reply({embeds: [embed], ephemeral: true});
                    } else {e
                        interaction.reply({content: "Token does not exist", ephemeral: true});
                    }
                });
            }
        }
    }
};

module.exports = listener;