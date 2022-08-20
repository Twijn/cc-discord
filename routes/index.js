const guild = require("./guild");
const user = require("./user");

module.exports = app => {
    app.use("/guild", guild);
    app.use("/user", user);
}