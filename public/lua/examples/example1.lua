local private = "zaUni3LDy8fpQm4pGOr02n4qJtRRfkSRK3KsWbyTunDrNvKuJnCnnkWSyX9tGhlL"

local ccd = require("cc-d")

local discord = ccd.new(private, "ws://localhost:8080/")

discord.on("ready", function()
    local embed = ccd.EmbedBuilder()
        .setTitle("Hello, world!")
        .setDescription("Goodbye, world!")
        .setColor(0xbc544b).build()

    local button = ccd.ButtonBuilder()
        .setCustomId("myButton")
        .setLabel("My Button")
        .setStyle("PRIMARY")
    
    local selectMenu = ccd.SelectMenuBuilder()
        .setCustomId("mySelectMenu")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            ccd.SelectMenuOptionBuilder()
                .setLabel("Option 1")
                .setValue("option1"),
            ccd.SelectMenuOptionBuilder()
                .setLabel("Option 2")
                .setValue("option2")
        )

    local row = ccd.ActionRowBuilder()
        .addComponent(button).build()
    local row2 = ccd.ActionRowBuilder()
        .addComponent(selectMenu).build()

    local result, msg = discord.channels.send("1008071607853527040", "1008407252522238042", {embeds = {embed}, components = {row, row2}})
    
    if result then
        print("Sent new message")
    else
        print(textutils.serialize(msg.error))
    end
end)

discord.on("button", function(customId, interaction)
    local result = interaction.error("Computer ID: `" .. os.getComputerID() .. "`")
    print(result.success)
end)

discord.on("selectMenu", function(customId, interaction)
    print(customId)
    local result = interaction.success("We did it!")
    print(result.success)
end)

discord.on("closed", function()
    print("Closed :(((")
end)

discord:connect()

discord.listen()
