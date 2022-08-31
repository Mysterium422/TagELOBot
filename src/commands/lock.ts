import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, Staff, lockQueue } from "../utils"
import config from "../config"

export default {
	run: async ({ message }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (!message.member) throw new Error("Message member missing")
		addAudit(`${message.author.id} locked the queue`)
		if (hasStaffPermission(message.member, Staff.ADMINISTRATOR)) return
		lockQueue()

		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("RED")
					.setDescription("Locked Channel, players will no longer be able to join games")
			]
		})
	}
}
