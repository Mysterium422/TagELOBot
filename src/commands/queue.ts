import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { hasStaffPermission, simulateDM, Staff } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		setTimeout(async function () {
			message.delete()
		}, 200)
		if (message.channel.id !== config.queueChannelID) {
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					]
				})
				.catch((err) =>
					simulateDM(
						message,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.queueChannelID}>`),
						client
					)
				)
		}
		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription(
						`There ${queue.queueSize() != 1 ? "are" : "is"} ${queue.queueSize()} ${
							queue.queueSize() != 1 ? "players" : "player"
						} in the queue`
					)
			]
		})
	},
	aliases: ["q"]
}
