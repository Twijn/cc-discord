local WS_URL = "wss://cc-d.twijn.dev/"
local NONCE_LENGTH = 8

local RETRY_INTERVAL = 5
local MAX_RETRIES = 20

local buttonStyles = {
    PRIMARY = 1,
    SECONDARY = 2,
    SUCCESS = 3,
    DANGER = 4,
    LINK = 5,
}

local CCD = {

    EmbedBuilder = function(data)
        local _ = {
            data = data or {}
        }

        function _.addField(field) if not _.data.fields then _.data.fields = {} end table.insert(_.data.fields, field) return _ end
        function _.setAuthor(author) _.data.author = author return _ end
        function _.setColor(color) _.data.color = color return _ end
        function _.setDescription(description) _.data.description = description return _ end
        function _.setFields(fields) _.data.fields = fields return _ end
        function _.setFooter(footer) _.data.footer = footer return _ end
        function _.setImage(image) _.data.image = image return _ end
        function _.setThumbnail(thumbnail) _.data.thumbnail = thumbnail return _ end
        function _.setTimestamp(timestamp) _.data.timestamp = timestamp return _ end
        function _.setTitle(title) _.data.title = title return _ end
        function _.setURL(url) _.data.url = url return _ end
        
        function _.build() return _.data end

        return _
    end,
    ActionRowBuilder = function(data)
        local _ = {
            data = data or {}
        }
        _.data.type = 1

        _.data.components = _.data.components or {}

        function _.addComponent(component) if component.data then component = component.build() end table.insert(_.data.components, component) return _ end
        function _.addComponents(...) for i,v in pairs ({...}) do _.addComponent(v) end return _ end
        function _.setComponents(components) _.data.components = components return _ end
        
        function _.build() return _.data end

        return _
    end,
    SelectMenuOptionBuilder = function(data)
        local _ = {
            data = data or {}
        }

        function _.setDefault(default) _.data.default = default return _ end
        function _.setDescription(description) _.data.description = description return _ end
        function _.setEmoji(emoji) _.data.emoji = emoji return _ end
        function _.setLabel(label) _.data.label = label return _ end
        function _.setValue(value) _.data.value = value return _ end
        
        function _.build() return _.data end

        return _
    end,
    SelectMenuBuilder = function(data)
        local _ = {
            data = data or {}
        }
        _.data.type = 3

        _.data.options = _.data.options or {}

        function _.addOption(option) if option.data then option = option.build() end table.insert(_.data.options, option) return _ end
        function _.addOptions(...) local args = {...} for i,v in pairs(args) do _.addOption(v) end return _ end
        function _.setCustomId(customId) _.data.customId = customId return _ end
        function _.setDisabled(disabled) _.data.disabled = disabled return _ end
        function _.setMaxValues(maxValues) _.data.maxValues = maxValues return _ end
        function _.setMinValues(minValues) _.data.minValues = minValues return _ end
        function _.setOptions(options) _.data.options = options return _ end
        function _.setPlaceholder(placeholder) _.data.placeholder = placeholder return _ end
        
        function _.build() return _.data end

        return _
    end,
    ButtonBuilder = function(data)
        local _ = {
            data = data or {}
        }
        _.data.type = 2

        function _.setCustomId(customId) _.data.customId = customId return _ end
        function _.setDisabled(disabled) _.data.disabled = disabled return _ end
        function _.setEmoji(emoji) _.data.emoji = emoji return _ end
        function _.setLabel(label) _.data.label = label return _ end
        function _.setStyle(style)
            assert(buttonStyles[style:upper()], "button style not found, valid options: PRIMARY, SECONDARY, SUCCESS, DANGER, LINK")
            _.data.style = buttonStyles[style:upper()]
            return _
        end
        function _.setURL(url) _.data.url = url return _ end
        
        function _.build() return _.data end

        return _
    end
}

local charset = {}  do -- [0-9a-zA-Z]
    for c = 48, 57  do table.insert(charset, string.char(c)) end
    for c = 65, 90  do table.insert(charset, string.char(c)) end
    for c = 97, 122 do table.insert(charset, string.char(c)) end
end

local function randomString(length)
    if not length or length <= 0 then return '' end
    math.randomseed(os.clock()^5)
    return randomString(length - 1) .. charset[math.random(1, #charset)]
end

local function connect(_, retryCount)
    local retryInterval = _.retryInterval or RETRY_INTERVAL
    local maxRetries = _.maxRetries or MAX_RETRIES
    retryCount = retryCount or 0

    local uri = _.uri

    http.websocketAsync(uri)

    local e, url, arg
    repeat
        e, url, arg = os.pullEvent()
    until url == uri and (e == "websocket_success" or e == "websocket_failure")

    if e == "websocket_success" then
        os.queueEvent("ccd_ready")

        return arg
    else
        if retryCount < maxRetries then
            os.queueEvent("ccd_retry")
            sleep(retryInterval)
            return connect(_, retryCount + 1)
        else
            error(arg)
        end
    end
end

-- This listens to general messages, relaying it as its own event or as a reply event if it contains a nonce value
-- This also will attempt to reconnect when the WS is closed.
local function listen(_)
    while true do
        local e, url, msg = os.pullEvent()
        
        if url == _.uri then
            if e == "websocket_message" then
                local json = textutils.unserializeJSON(msg)
                if json ~= nil then
                    if json.nonce then
                        os.queueEvent("websocket_reply", json.nonce, json)
                    elseif json.type then
                        if json.type == "button" or json.type == "selectMenu" then
                            os.queueEvent("ccd_" .. json.type, json.customId, json)
                        else
                            os.queueEvent("ccd_" .. json.type, json)
                        end
                    end
                end
            elseif e == "websocket_closed" then
                os.queueEvent("ccd_closed")
                
                _.ws = _:connect()
            end
        end
    end
end

-- This handles events registered by #.on()
local function relay(_)
    while true do
        local e, arg1, arg2, arg3, arg4, arg5, arg6, arg7 = os.pullEvent()

        e = e:gsub("ccd_", "")

        if e == "button" or e == "selectMenu" then
            local replyId = arg2.replyId
            arg2 = arg2.interaction
            arg2.reply = function(message)
                return _.send("interactionReply", {id = replyId, message = message})
            end

            arg2.replyEmbed = function(title, message, color)
                return _.send("interactionReply", {id = replyId, message = {embeds = {CCD.EmbedBuilder().setTitle(title).setDescription(message).setColor(color).build()}}})
            end

            arg2.success = function(message)
                if type(message) ~= "string" then
                    return arg2.reply(message)
                end

                return arg2.replyEmbed("Success!", message, 0x31ad67)
            end

            arg2.error = function(message)
                if type(message) ~= "string" then
                    return arg2.reply(message)
                end

                return arg2.replyEmbed("Error!", message, 0xe83b3b)
            end
        end

        if _.listeners[e] then
            for i,v in pairs(_.listeners[e]) do
                local status, err = pcall(function() v(arg1, arg2, arg3, arg4, arg5, arg6, arg7) end)
                if not status then error(err) end --  handle errors better than this later
            end
        end
    end
end

local function keepAlive(_)
    while true do
        if _.ws then
            _.ws.send("{\"type\":\"keepAlive\"}")
        end
        sleep(10)
    end
end

function CCD.new(private, url, retryInterval, maxRetries, nonceLength)
    assert(type(private) == "string" and #private == 64, "invalid private key. must be a 64 character string")

    local _ = {
        builders = CCD.builders,
        private = private,
        url = url or WS_URL,
        retryInterval = retryInterval or RETRY_INTERVAL,
        maxRetries = maxRetries or MAX_RETRIES,
        nonceLength = nonceLength or NONCE_LENGTH,
        listeners = {}
    }

    _.uri = _.url .. _.private

    function _.connect(...)
        local args = {...}
        _.ws = connect(table.unpack(args))
    end

    function _.listen()
        parallel.waitForAny(function() listen(_)end, function() relay(_)end, function() keepAlive(_)end)
    end

    function _.send(msgType, msg)
        msg = msg or {}
        if not _.ws then
            repeat sleep(1) until _.ws
        end
        local nonce = randomString(_.nonceLength)

        msg.type = msgType
        msg.nonce = nonce

        _.ws.send(textutils.serializeJSON(msg))

        local e, r_nonce, msg
        repeat
            e, r_nonce, msg = os.pullEvent("websocket_reply")
        until nonce == r_nonce

        return msg
    end

    _.users = {
        get = function(userId)
            local msg = _.send("getUser", {id = userId})
            return msg.success, msg
        end,
        send = function(userId, message)
            local msg = _.send("send", {recipient = userId, message = message})
            return msg.success, msg
        end,
    }

    _.channels = {
        send = function(guildId, channelId, message)
            local msg = _.send("send", {guild = guildId, channel = channelId, message = message})
            return msg.success, msg
        end,
    }

    function _.on(event, func)
        event = event:gsub("ccd_", "")
        if not _.listeners[event] then _.listeners[event] = {} end
        table.insert(_.listeners[event], func)
    end

    return _
end

return CCD
