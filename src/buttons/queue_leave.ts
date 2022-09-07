import { ButtonParameters } from "../ButtonParameters"
import { GuildMember, MessageButton } from "discord.js"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"

export default {
	run: async ({ button }: ButtonParameters) => {
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
							)}>. If you can't make it you must either forfeit (do ${
								config.prefix
							}forfeit <@!${games.findOpponent(button.member.id)}>) or abort (do ${
								config.prefix
							}abort)`
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

		// TODO: Update message

		// message.channel.send({
		// 	embeds: [
		// 		new Discord.MessageEmbed()
		// 			.setColor("BLUE")
		// 			.setDescription(
		// 				`There ${queue.queueSize() != 1 ? "are" : "is"} ${queue.queueSize()} ${
		// 					queue.queueSize() != 1 ? "players" : "player"
		// 				} in the queue`
		// 			)
		// 	]
		// })
		button.member.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("RED")
					.setDescription("Removed you from the queue")
			]
		})

		// TODO: Make catch work

		// .catch((err) =>
		// 	simulateDM(
		// 		message,
		// 		new Discord.MessageEmbed()
		// 			.setColor("RED")
		// 			.setDescription("Removed you from the queue"),
		// 		client
		// 	)
		// )
		addAudit(`${button.member.id} left a game`)
		return
	},
	data: new MessageButton()
		.setCustomId("queue_leave")
		.setLabel("Leave")
		.setStyle("DANGER")
}
