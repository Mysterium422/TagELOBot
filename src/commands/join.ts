import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, simulateDM, locked } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (message.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				message.delete()
			}, 200)
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

		addAudit(`${message.author.id} tried to join`)
		if (locked) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("The queue has been locked and games can no longer start")
				]
			})
		}
		setTimeout(async function () {
			message.delete()
		}, 200)

		if (queue.inQueue(message.author.id)) {
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("You are already queued")
					]
				})
				.catch((err) =>
					simulateDM(
						message,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("You are already queued"),
						client
					)
				)
		}
		if (games.inGame(message.author.id)) {
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(
								`You stil have a game against <@!${games.findOpponent(
									message.author.id
								)}>`
							)
					]
				})
				.catch((err) =>
					simulateDM(
						message,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(
								`You stil have a game against <@!${games.findOpponent(
									message.author.id
								)}>`
							),
						client
					)
				)
		}

		if (!(await db.contains(db.TABLES.UserData, { discord: message.author.id }))) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							"You must be verified first. Do =register to start the verification process"
						)
				]
			})
		}

		addAudit(`${message.author.id} successfully joined`)

		let player = await mongo.findOne(mongo.MODELS.Users, { userID: message.author.id })
		if (!player) throw new Error("Mongo player not found")

		let opponent = queue.findOpponent(player.userID, player)
		if (!opponent) {
			queue.join(player.userID, player)
			message.channel.send({
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

			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("GREEN")
							.setDescription("Added you to the queue!")
					]
				})
				.catch((err) => {
					simulateDM(
						message,
						new Discord.MessageEmbed()
							.setColor("GREEN")
							.setDescription("Added you to the queue!"),
						client
					)
				})
		}

		games.newGame(player.userID, opponent.userID)

		message.channel.send({
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

		let matchesRows = await db.where(db.TABLES.Matches, { channel: message.channel.id })
		let match = 1
		if (matchesRows.length == 0) {
			await db.add(db.TABLES.Matches, { channel: message.channel.id, matches: 0 })
		} else {
			match = matchesRows[0].matches + 1
			await db.update(
				db.TABLES.Matches,
				{ channel: message.channel.id },
				{ channel: message.channel.id, matches: match }
			)
		}

		addAudit(`Starting match ${match} ${opponent.userID} vs ${message.author.id}`)

		let opponentData = await mongo.findOne(mongo.MODELS.Users, {
			userID: opponent.userID
		})
		if (!opponentData) throw new Error("Mongo player not found")

		return message.channel.send({
			content: `<@!${message.author.id}> <@!${opponent.userID}>`,
			embeds: [
				new Discord.MessageEmbed().setColor("BLUE")
					.setDescription(`Game ${match} Starting:
<@!${opponent.userID}> ${opponentData.username} (${Math.round(opponentData.elo)}) vs <@!${
					message.author.id
				}> ${player.username} (${Math.round(player.elo)})`)
			]
		})
	},
	aliases: ["j"]
}
