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

const tokenCmd = {
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
        ).addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("info")
                .setDescription("Retrieve info given a public key")
                .addStringOption(option => option.setName("public").setDescription("Public key to view").setRequired(true))
        ),
    async info(interaction, public) {
        const embed = new EmbedBuilder()
            .setTitle("View Token")
            .setColor(0x31ad67);

        let token = await con.pquery("select id, created_by, md5(concat(private, \":\", created_by)) as public from token where md5(concat(private, \":\", created_by)) = ?;", [public]);

        if (token.length > 0) {
            token = token[0];

            let createdBy = await interaction.client.users.fetch(token.created_by);
            let id = token.id;

            embed.setDescription("**Viewing token** `" + token.public + "`\n**Created by** " + createdBy.toString() + " *(" + createdBy.tag + ")*")
            
            const permissions = await con.pquery("select id, guild_id, channel_id from token__permission where token_id = ?;", id);

            let userPermissions = "";
            let channelPermissions = "";

            let channels = [];
            let users = [];

            for(let i = 0; i < permissions.length; i++) {
                let permission = permissions[i];

                if (permission.guild_id) {
                    try {
                        const channel = await interaction.client.channels.fetch(permission.channel_id);
                        
                        channels = [
                            ...channels,
                            {
                                id: permission.id,
                                name: channel.name + " (" + channel.guild.name + ")",
                            }
                        ];

                        channelPermissions += "\n#" + channel.name + " (" + channel.guild.name + ")";
                    } catch(err) {
                        channels = [
                            ...channels,
                            {
                                id: permission.id,
                                name: permission.channel_id,
                            }
                        ];
                        channelPermissions += "\nInvalid Channel: " + permission.channel_id
                    } 
                } else {
                    try {
                        const user = await interaction.client.users.fetch(permission.channel_id);
                        
                        users = [
                            ...users,
                            {
                                id: permission.id,
                                name: user.tag,
                            }
                        ];

                        userPermissions += "\n" + user.tag;
                    } catch (err) {
                        users = [
                            ...users,
                            {
                                id: permission.id,
                                name: permission.channel_id,
                            }
                        ];
                        userPermissions += "\nInvalid User: " + permission.channel_id
                    }
                }
            }

            if (channelPermissions === "") channelPermissions = "\nNo channel permissions defined";
            if (userPermissions === "") userPermissions = "\nNo user permissions defined";

            embed.addFields(
                {
                    name: "Channel Permissions",
                    value: "```" + channelPermissions + "```",
                    inline: false,
                },
                {
                    name: "User Permissions",
                    value: "```" + userPermissions + "```",
                    inline: false,
                });

            let msg = {embeds: [embed], ephemeral: true};

            if (createdBy.id === interaction.member.id) {
                const menu = new SelectMenuBuilder()
                    .setCustomId("delete-token-permissions")
                    .setPlaceholder("Delete Permissions");

                channels.forEach(channel => {
                    menu.addOptions(
                        new SelectMenuOptionBuilder()
                            .setValue(""+channel.id)
                            .setLabel("Channel: #" + channel.name)
                        );
                });

                users.forEach(user => {
                    menu.addOptions(
                        new SelectMenuOptionBuilder()
                            .setValue(""+user.id)
                            .setLabel("User: " + user.name)
                        );
                });

                if (channels.length + users.length > 0) {
                    msg.components = [
                        new ActionRowBuilder()
                            .addComponents(menu)
                    ];
                }
            }

            interaction.reply(msg);
        } else {
            interaction.error("Could not find token from public key. Use `/token retrieve` to view active tokens.");
        }
    },
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
                        interaction.error("You've already authenticated with this token");
                    } else interaction.reply({embeds: [embed], components: [menuRow], ephemeral: true});
                }
            } else {
                interaction.error("Could not find token from public key. Use `/token retrieve` to view active tokens.");
            }
        } else if (interaction.options.getSubcommand() === "info") {
            tokenCmd.info(interaction, interaction.options.getString("public"));
        }
    },
}

module.exports = tokenCmd;