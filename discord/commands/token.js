const { SlashCommandBuilder, SlashCommandSubcommandBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const con = require("../../database");
const crypto = require("crypto");

const authorizeListener = require("../listeners/authorizeListener");

const TOKEN_LENGTH = 64;

function makeToken(length = TOKEN_LENGTH) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++)
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        
    return result;
}

async function createUniqueToken() {
    let token;
    while (true) {
        token = makeToken(TOKEN_LENGTH);

        const result = await con.pquery("select created_by from token where private = ?;", [token]);
        if (result.length === 0) break;

    }
    return token;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("token")
        .setDescription("Create or manage tokens for CC:Discord Wrapper")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("create")
                .setDescription("Creates a new CC:Discord Wrapper token")
        ).addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("delete")
                .setDescription("Deletes a CC:Discord Wrapper token")
                .addStringOption(option => option.setName("public").setDescription("Public key to delete").setRequired(true))
        ).addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("retrieve")
                .setDescription("Retrieves a CC:Discord Wrapper token public key")
        ).addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("authorize")
                .setDescription("Authorizes permissions to a pre-existing key")
                .addStringOption(option => option.setName("public").setDescription("Public key to modify").setRequired(true))
        ),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === "create") {
            const token = await createUniqueToken();
            const public = crypto.createHash('md5').update(token + ":" + interaction.user.id).digest("hex");
    
            con.query("insert into token (private, created_by) values (?, ?);", [token, interaction.user.id]);

            con.query("select id from token where private = ?;", [token], (err, tokenRes) => {
                if (err) {
                    interaction.error(err);
                    console.error(err);
                    return;
                }

                if (tokenRes.length > 0) {
                    con.query("insert into token__permission (token_id, channel_id) values (?, ?);", [tokenRes[0].id, interaction.user.id]);
        
                    const embed = new EmbedBuilder()
                        .setTitle("Token Created!")
                        .setColor(0x31ad67)
                        .setDescription("**CC:Discord Wrapper** token was generated.")
                        .addFields(
                            {name: "Private Token", value: "The following code is utilized to connect to the websocket and authorization via http. You must store this somewhere safe as it's not retrievable.\n```\n" + token + "```"},
                            {name: "Public Token", value: "The following code is used to manage your token. This code may be retrieved utilizing `/token retrieve`\n```\n" + public + "```"},
                            {name: "Authorization", value: "This denotes authorization channels for this token.\n```\nUser: " + interaction.user.id + " [" + interaction.user.tag + "]```"}
                            )
                        .setFooter({text: "Make sure you store the private key somewhere safe. Do not share your private key."});
            
                    interaction.reply({embeds: [embed], ephemeral: true});
                } else {
                    interaction.error("Could not retrieve generated token.");
                }
            });
        } else if (interaction.options.getSubcommand() === "delete") {
            con.query("delete from token where md5(concat(private, \":\", created_by)) = ?;", [interaction.options.getString("public")], (err, res) => {
                if (err) {
                    console.error(err);
                    interaction.error(err);
                    return;
                }

                interaction.success("Token was removed!");
            });
        } else if (interaction.options.getSubcommand() === "retrieve") {
            con.query("select created_timestamp, md5(concat(private, \":\", created_by)) as public_key from token where created_by = ?;", [interaction.user.id], (err, res) => {
                if (err) {
                    console.error(err);
                    interaction.error(err);
                    return;
                }

                let result = "";

                res.forEach(token => {
                    result += "\n" + token.public_key + " " + (new Date(token.created_timestamp)).toLocaleString();
                });

                if (result === "") result = "No tokens have been generated yet.";

                const embed = new EmbedBuilder()
                    .setTitle("Retrieve Tokens")
                    .setColor(0x31ad67)
                    .setDescription("Below is a list of your generated tokens.\n```Key                              Time Created" + result + "```");
        
                interaction.reply({embeds: [embed], ephemeral: true});
            });
        } else if (interaction.options.getSubcommand() === "authorize") {
            const embed = new EmbedBuilder()
                .setTitle("Authorize Permissions")
                .setDescription("Utilize the menu below to add channels to your private key.")
                .setColor(0x31ad67);

            const menu = new SelectMenuBuilder()
                .setCustomId(authorizeListener.AUTH_SELECT_HEADER + interaction.options.getString("public"))
                .setMinValues(1)
                .setPlaceholder("Select authorization channels to add");

            const menuRow = new ActionRowBuilder()
                .addComponents(menu);

            let token = await con.pquery("select id, private, created_by from token where md5(concat(private, \":\", created_by)) = ?;", [interaction.options.getString("public")]);

            if (token.length > 0) {

                let createdBy = await interaction.client.users.fetch(token[0].created_by);
                let id = token[0].id;
                token = token[0].private;
                
                if (createdBy.id !== interaction.user.id) {
                    embed.addFields({name: "Warning", value: "This token was created by " + createdBy.toString() + " (" + createdBy.tag + ")\nAuthorization to your user or any channels will allow this user to send messages to you unsupervised."});
                }

                const permissions = await con.pquery("select guild_id, channel_id from token__permission where token_id = ?;", id);

                if (!permissions.find(x => x.channel_id === interaction.user.id))
                    menu.addOptions(new SelectMenuOptionBuilder().setLabel("User " + interaction.user.id + " (" + interaction.user.tag + ")").setValue(interaction.user.id));
                
                let hasGuildPermission = false;
                try {
                    hasGuildPermission = interaction.member.permissions.has("ManageGuild");
                } catch (err) {console.log(err)}
                    
                if (interaction.guild && hasGuildPermission) {
                    interaction.guild.channels.fetch().then(channels => {
                        channels.forEach(channel => {
                            if (channel.isTextBased() && !permissions.find(x => x.guild_id === channel.guild.id && x.channel_id === channel.id)) {
                                menu.addOptions(new SelectMenuOptionBuilder().setLabel("#" + channel.name + " (" + channel.id + ")").setValue(channel.guild.id + ":" + channel.id));
                            }
                        });

                        menu.setMaxValues(menu.options.length);

                        interaction.reply({embeds: [embed], components: [menuRow], ephemeral: true});
                    });
                } else {
                    menu.setMaxValues(menu.options.length);

                    if (menu.options.length === 0) {
                        interaction.error("You've already authenticated with this token.");
                    } else interaction.reply({embeds: [embed], components: [menuRow], ephemeral: true});
                }
            } else {
                interaction.error("Could not find token from private key. Use `/token retrieve` to view active tokens.");
            }
        }
    },
};