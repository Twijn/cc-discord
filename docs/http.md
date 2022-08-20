# cc-discord HTTP API

CC-Discord provides a significant amount of methods available to both HTTP and WebSocket manipulation.

## Authentication

**All methods** listed below require an authorization header. This key is obtained utilizing the `/token create` command in Discord.

Utilize the following table structure as an example for header layout.

| Header Name | Header Value |
| ----------- | ------------ |
| Authorization | vjW8cHc0TW04bjmkgnTcWOahh[^1] |

[^1]: 64 character string obtained by `/token create`

## Users

### Retrieving users

```
https://cc-d.twijn.dev/user/<discord ID>
```

Example response:

```json
{
    "success": true,
    "user": {
        "id": "267380687345025025",
        "bot": false,
        "system": false,
        "flags": 576,
        "username": "Twijn",
        "discriminator": "8888",
        "avatar": "77207fc3e5e4ed3edb5e9f11d5ea5680",
        "banner": null,
        "accentColor": null,
        "createdTimestamp": 1483818923556,
        "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png",
        "hexAccentColor": null,
        "tag": "Twijn#8888",
        "avatarURL": "https://cdn.discordapp.com/avatars/267380687345025025/77207fc3e5e4ed3edb5e9f11d5ea5680.webp",
        "displayAvatarURL": "https://cdn.discordapp.com/avatars/267380687345025025/77207fc3e5e4ed3edb5e9f11d5ea5680.webp",
        "bannerURL": null
    }
}
```