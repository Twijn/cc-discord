const express = require("express");
const router = express.Router();

let unknownUsers = [];

const UNKNOWN_USER_ERR_ID = 10013;

router.get("/:id", (req, res) => {
    if (unknownUsers.includes(req.params.id.toLowerCase())) {
        res.json({success: false, error: {message: "Unknown User", code: UNKNOWN_USER_ERR_ID}});
        return;
    }

    global.discord.users.fetch(req.params.id).then(user => {
        res.json({success: true, user: user});
    }, err => {
        if (err.rawError.code === UNKNOWN_USER_ERR_ID) {
            unknownUsers = [
                ...unknownUsers,
                req.params.id.toLowerCase(),
            ];
        } else {
            console.error(err);
        }
        res.json({success: false, error: err.rawError});
    });
});

router.post("/:id/send", (req, res) => {

});

module.exports = router;