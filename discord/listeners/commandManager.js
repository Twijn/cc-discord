const {EmbedBuilder} = require("discord.js");
const client = global.discord;

const listener = {
    name: 'commandManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (!interaction.isCommand()) return;
    
        if (!client.commands.has(interaction.commandName)) return;
    
        let cmd = client.commands.get(interaction.commandName);

        interaction.success = message => {
            const embed = new EmbedBuilder()
                .setTitle("Success!")
                .setDescription(message)
                .setColor(0x31ad67);

            interaction.reply({embeds: [embed], ephemeral: true})
        }

        interaction.error = message => {
            const embed = new EmbedBuilder()
                .setTitle("Error!")
                .setDescription(message)
                .setColor(0xe83b3b);

            interaction.reply({embeds: [embed], ephemeral: true})
        }

        try {
            cmd.execute(interaction);
        } catch (error) {
            console.error(error);
            interaction.error("There was an error trying to execute that command!");
        }
    }
};

module.exports = listener;