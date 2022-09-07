import { ButtonParameters } from "../ButtonParameters"
import { GuildMember, MessageButton } from "discord.js"
import config from "../config"
import { addAudit, locked, simulateDM } from "../utils"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"
import Discord from "discord.js"

export default {
	run: async ({ button, client }: ButtonParameters) => {
		if (button.message.id != config.queueMessageID) {
			return
		}
		if (!(button.member instanceof GuildMember)) {
			throw new Error("Button Member not GuildMember")
		}
		if (!button.guild) throw new Error("Button Guild does not exist")
		if (!button.channel) throw new Error("Button Channel does not exist")

		addAudit(`${button.member} tried to join`)

		/** Lock using button#setDisabled? */

		// if (locked) {
		// 	return message.channel.send({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription("The queue has been locked and games can no longer start")
		// 		]
		// 	})
		// }
		// setTimeout(async function () {
		// 	message.delete()
		// }, 200)

		if (queue.inQueue(button.member.id)) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You are already queued")
				],
				ephemeral: true
			})
		}
		if (games.inGame(button.member.id)) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							`You stil have a game against <@!${games.findOpponent(button.member.id)}>`
						)
				],
				ephemeral: true
			})
		}

		if (!(await db.contains(db.TABLES.UserData, { discord: button.member.id }))) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							"You must be verified first. Do =register to start the verification process"
						)
				],
				ephemeral: true
			})
		}

		addAudit(`${button.member.id} successfully joined`)

		let player = await mongo.findOne(mongo.MODELS.Users, { userID: button.member.id })
		if (!player) throw new Error("Mongo player not found")

		let opponent = queue.findOpponent(player.userID, player)
		if (!opponent) {
			queue.join(player.userID, player)
			// TODO: Update Message

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

			return button.member
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("GREEN")
							.setDescription("Added you to the queue!")
					]
				})
				.catch((err) => {
					simulateDM(
						button.member as GuildMember,
						new Discord.MessageEmbed()
							.setColor("GREEN")
							.setDescription("Added you to the queue!"),
						client
					)
				})
		}

		games.newGame(player.userID, opponent.userID)

		// TODO: Update Message

		// button.channel.send({
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

		let matchesRows = await db.where(db.TABLES.Matches, { channel: button.channel.id })
		let match = 1
		if (matchesRows.length == 0) {
			await db.add(db.TABLES.Matches, { channel: button.channel.id, matches: 0 })
		} else {
			match = matchesRows[0].matches + 1
			await db.update(
				db.TABLES.Matches,
				{ channel: button.channel.id },
				{ channel: button.channel.id, matches: match }
			)
		}

		addAudit(`Starting match ${match} ${opponent.userID} vs ${button.member.id}`)

		let opponentData = await mongo.findOne(mongo.MODELS.Users, {
			userID: opponent.userID
		})
		if (!opponentData) throw new Error("Mongo player not found")

		// TODO: Game started msg

		// 		return message.channel.send({
		// 			content: `<@!${message.author.id}> <@!${opponent.userID}>`,
		// 			embeds: [
		// 				new Discord.MessageEmbed().setColor("BLUE")
		// 					.setDescription(`Game ${match} Starting:
		// <@!${opponent.userID}> ${opponentData.username} (${Math.round(opponentData.elo)}) vs <@!${
		// 					message.author.id
		// 				}> ${player.username} (${Math.round(player.elo)})`)
		// 			]
		// 		})
	},
	data: new MessageButton().setCustomId("queue_join").setLabel("Join").setStyle("SUCCESS")
}
