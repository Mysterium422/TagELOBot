import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (message.channel.id != config.queueChannelID) {
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
		addAudit(`${message.author.id} tried to leave a game`)
		setTimeout(async function () {
			message.delete()
		}, 200)
		if (games.inGame(message.author.id)) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							`You are in a game against <@!${games.findOpponent(
								message.author.id
							)}>. If you can't make it you must either forfeit (do ${
								config.prefix
							}forfeit <@!${games.findOpponent(message.author.id)}>) or abort (do ${
								config.prefix
							}abort)`
						)
				]
			})
		}

		if (!queue.inQueue(message.author.id)) {
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("You are not in a queue")
					]
				})
				.catch((err) =>
					simulateDM(
						message,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("You are not in a queue"),
						client
					)
				)
		}

		queue.leave(message.author.id)
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
		message.author
			.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("Removed you from the queue")
				]
			})
			.catch((err) =>
				simulateDM(
					message,
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("Removed you from the queue"),
					client
				)
			)
		addAudit(`${message.author.id} left a game`)
		return
	},
	aliases: ["l"]
}
