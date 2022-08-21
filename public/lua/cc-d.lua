local WS_URL = "wss://cc-d.twijn.dev/"
local NONCE_LENGTH = 8

local RETRY_INTERVAL = 5
local MAX_RETRIES = 20

local CCD = {}

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
                        os.queueEvent("ccd_" .. json.type, json)
                    end
                end
            elseif e == "websocket_closed" then
                os.queueEvent("ccd_closed")
                
                _.ws = _:connect()
            end
        end
    end
end

local function relay(_)
    while true do
        local e, url, arg1, arg2, arg3, arg4, arg5, arg6, arg7 = os.pullEvent()

        e = e:gsub("ccd_", "")
        if _.listeners[e] then
            for i,v in pairs(_.listeners[e]) do
                local status, err = pcall(function() v(arg1, arg2, arg3, arg4, arg5, arg6, arg7) end)
                if not status then error(err) end --  handle errors better than this later
            end
        end
    end
end

function CCD.create(private, url, retryInterval, maxRetries, nonceLength)
    assert(type(private) == "string" and #private == 64, "invalid private key. must be a 64 character string")

    local _ = {
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
        parallel.waitForAny(function() listen(_)end, function() relay(_)end)
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
            print(msg.user.tag)
            return msg.success, msg
        end,
        send = function(userId, message)
            local msg = _.send("send", {recipient = userId, message = message})
            print(textutils.serialize(msg))
            return msg.success, msg
        end
    }

    function _.on(event, func)
        event = event:gsub("ccd_", "")
        if not _.listeners[event] then _.listeners[event] = {} end
        table.insert(_.listeners[event], func)
    end

    return _
end

return CCD
