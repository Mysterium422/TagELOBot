import { ButtonParameters } from "../ButtonParameters"
import { GuildMember, MessageButton } from "discord.js"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as queueMessage from "../handlers/queueMessage"

export default {
	run: async ({ button, client }: ButtonParameters) => {
		if (button.message.id != config.queueMessageID) {
			return
		}
		if (!(button.member instanceof GuildMember)) return
		if (!button.guild) return

		addAudit(`${button.member.id} tried to leave a game`)
		if (games.inGame(button.member.id)) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							`You are in a game against <@!${games.findOpponent(
								button.member.id
							)}>. If you can't make it you must either hit the I Lose or Abort buttons`
						)
				],
				ephemeral: true
			})
		}

		if (!queue.inQueue(button.member.id)) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You are not in a queue")
				],
				ephemeral: true
			})
		}

		queue.leave(button.member.id)

		await queueMessage.updateMessage(client)
		await button.reply({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("RED")
					.setDescription("Removed you from the queue")
			],
			ephemeral: true
		})

		addAudit(`${button.member.id} left a game`)
		return
	},
	data: new MessageButton()
		.setCustomId("queue_leave")
		.setLabel("Leave")
		.setStyle("DANGER")
}
