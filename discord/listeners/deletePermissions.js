const { EmbedBuilder } = require("discord.js");
const con = require("../../database");

let listener = {
    name: 'deletePermissions',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (interaction.isSelectMenu() && interaction.customId === "delete-token-permissions") {
            interaction.values.forEach(id => {
                con.query("select token__permission.id, token.created_by from token__permission join token on token__permission.token_id = token.id where token__permission.id = ?;", [id], (err, res) => {
                    if (err) {
                        console.error(err);
                        interaction.reply({ephemeral: true, embeds: [
                            new EmbedBuilder()
                                .setTitle("An error occurred")
                                .setDescription("Notify an administrator.")
                                .setColor(0xe83b3b)
                        ]});
                        return;
                    }

                    if (res.length === 1) {
                        if (res[0].created_by === interaction.member.id) {
                            con.query("delete from token__permission where id = ?;", [res[0].id], err => {
                                if (!err) {
                                    interaction.reply({ephemeral: true, embeds: [
                                        new EmbedBuilder()
                                            .setTitle("This token permission was successfully deleted!")
                                            .setColor(0x31ad67)
                                    ]});
                                } else {
                                    console.error(err);
                                    interaction.reply({ephemeral: true, embeds: [
                                        new EmbedBuilder()
                                            .setTitle("An error occurred")
                                            .setDescription("Notify an administrator.")
                                            .setColor(0xe83b3b)
                                    ]});
                                }
                            });
                        } else {
                            interaction.reply({ephemeral: true, embeds: [
                                new EmbedBuilder()
                                    .setTitle("You don't have permission to change this token")
                                    .setColor(0xe83b3b)
                            ]});
                        }
                    } else {
                        interaction.reply({ephemeral: true, embeds: [
                            new EmbedBuilder()
                                .setTitle("Token permission not found")
                                .setDescription("It may have already been deleted.")
                                .setColor(0xe83b3b)
                        ]});
                    }
                });
            });
        }
    }
};

module.exports = listener;