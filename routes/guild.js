const express = require("express");
const router = express.Router();

let unknownGuild = [];

const UNKNOWN_GUILD_ERR_ID = 50001;

router.get("/all", (req, res) => {
    global.discord.guilds.fetch(req.params.id).then(guilds => {
        let finalGuilds = [];
        guilds.forEach(guild => {
            if (req.allowed.channels.find(x => x.guild === guild.id)) {
                finalGuilds = [
                    ...finalGuilds,
                    {
                        id: guild.id,
                        name: guild.name,
                        icon: guild.icon,
                        iconURL: guild.iconURL(),
                    },
                ]
            }
        });

        res.json({success: true, guilds: finalGuilds});
    }, err => {
        console.error(err);
        res.json({success: false, error: err.rawError});
    });
});

router.get("/:id", (req, res) => {
    if (unknownGuild.includes(req.params.id.toLowerCase())) {
        res.json({success: false, error: {message: "Unknown Guild", code: UNKNOWN_GUILD_ERR_ID}});
        return;
    }

    global.discord.guilds.fetch(req.params.id).then(guild => {
        res.json({success: true, guild: guild});
    }, err => {
        if (err.rawError.code === UNKNOWN_GUILD_ERR_ID) {
            unknownGuild = [
                ...unknownGuild,
                req.params.id.toLowerCase(),
            ];
        } else {
            console.error(err);
        }
        res.json({success: false, error: err.rawError});
    });
});

router.get("/:guild/all", (req, res) => {
    if (unknownGuild.includes(req.params.guild.toLowerCase())) {
        res.json({success: false, error: {message: "Unknown Guild", code: UNKNOWN_GUILD_ERR_ID}});
        return;
    }

    global.discord.guilds.fetch(req.params.guild).then(guild => {
        guild.channels.fetch().then(channels => {
            let finalChannels = [];
            channels.forEach(channel => {
                if (req.allowed.channels.find(x => x.channel === channel.id && x.guild === guild.id)) {
                    finalChannels = [
                        ...finalChannels,
                        channel,
                    ]
                }
            });
            res.json({success: true, channels: finalChannels});
        });
    }, err => {
        if (err.rawError.code === UNKNOWN_GUILD_ERR_ID) {
            unknownGuild = [
                ...unknownGuild,
                req.params.guild.toLowerCase(),
            ];
        } else {
            console.error(err);
        }
        res.json({success: false, error: err.rawError});
    });
});

router.get("/:guild/:channel", (req, res) => {
    if (unknownGuild.includes(req.params.guild.toLowerCase())) {
        res.json({success: false, error: {message: "Unknown Guild", code: UNKNOWN_GUILD_ERR_ID}});
        return;
    }

    global.discord.guilds.fetch(req.params.guild).then(guild => {
        guild.channels.fetch(req.params.channel).then(channel => {
            if (req.allowed.channels.find(x => x.channel === channel.id && x.guild === guild.id)) {
                res.json({success: true, channel: channel});
            } else {
                res.json({success: false, error: {message: "Unknown Channel", code: UNKNOWN_GUILD_ERR_ID}});
            }
        }, err => {
            console.error(err);
            res.json({success: false, error: err.rawError});
        });
    }, err => {
        if (err.rawError.code === UNKNOWN_GUILD_ERR_ID) {
            unknownGuild = [
                ...unknownGuild,
                req.params.guild.toLowerCase(),
            ];
        } else {
            console.error(err);
        }
        res.json({success: false, error: err.rawError});
    });
});

router.post("/:guild/:channel/send", (req, res) => {
    if (unknownGuild.includes(req.params.guild.toLowerCase())) {
        res.json({success: false, error: {message: "Unknown Guild", code: UNKNOWN_GUILD_ERR_ID}});
        return;
    }

    global.discord.channels.fetch(req.params.channel).then(channel => {
        
    }, err => {
        console.error(err);
        res.json({success: false, error: err.rawError});
    });
});

module.exports = router;