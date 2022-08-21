# cc-discord

CC-Discord is intended to be a simple way to complete basic tasks through Discord utilizing ComputerCraft computers. Functionality includes:

- Sending direct messages to users
- Taking feedback (button click, text input, etc) from users
- Posting messages from computers to channels
- More to come!

## config.json Contents

```json
{
    "port":6969,
    "mysql":{
        "host":"localhost",
        "user":"ccdiscord",
        "password":"1234",
        "database":"ccdiscord"
    },
    "discord":{
        "invite":"https://discord.com/invite/6mGFK6BFCW",
        "client":"<discord client>",
        "secret":"<discord secret>"
    }
}
```