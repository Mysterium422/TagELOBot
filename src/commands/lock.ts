import { CommandParameters } from "../CommandParameters"
import Discord, { TextChannel } from "discord.js"
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
		if (!hasStaffPermission(message.member, Staff.ADMINISTRATOR)) return
		lockQueue()
		const channel = await message.guild?.channels.fetch(config.queueChannelID)
		if (!(channel instanceof TextChannel)) throw new Error("Not a txt channel")
		const msg = await channel.messages.fetch(config.queueMessageID)
		msg.components[0].components[0].setDisabled(true)
		msg.components[0].components[1].setDisabled(true)
		msg.edit({ embeds: msg.embeds, components: msg.components })

		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("RED")
					.setDescription("Locked Channel, players will no longer be able to join games")
			]
		})
	}
}
