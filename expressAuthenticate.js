const con = require("./database");

module.exports = (req, res, next) => {
    if (!req.get("authorization"))
        return res.status(403).json({success: false, error: {message: "Missing authorization token", code: 403}});

    con.query("select * from token where private = ?;", [req.get("authorization")], (err, result) => {
        if (err) {
            console.error(err)
            return res.status(500).json({success: false, error: {message: "Server error occurred", code: 500}});
        }

        if (result.length > 0) {
            req.allowed = {
                channels: [],
                users: [],
            }
            con.query("select guild_id, channel_id from token__permission where token_id = ?;", [result[0].id], (err, result) => {
                if (err) {
                    console.error(err);
                    return;
                }

                result.forEach(row => {
                    if (row.guild_id) {
                        req.allowed.channels = [
                            ...req.allowed.channels,
                            {
                                guild: row.guild_id,
                                channel: row.channel_id,
                            }
                        ];
                    } else {
                        req.allowed.users = [
                            ...req.allowed.users,
                            row.channel_id,
                        ];
                    }
                });
                
                next();
            });
        } else {
            return res.status(401).json({success: false, error: {message: "Unauthorized", code: 401}});
        }
    });
}