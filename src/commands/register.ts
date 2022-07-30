import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import { embedColors } from "../constants"

export default {
	run: async ({ message, args }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID &&
			message.channel.id != config.registerChannelID
		) {
			return
		}

		if (message.channel.id != config.registerChannelID) {
			setTimeout(async function () {
				message.delete()
			}, 200)

			return message.author.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(`That command goes in <#${config.registerChannelID}>`)
				]
			})
		}

		addAudit(`${message.author.id} tried to register with IGN: ${args[0]}`)
	}
}
