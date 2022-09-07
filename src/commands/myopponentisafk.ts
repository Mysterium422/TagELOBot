import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"
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
						message.member,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.queueChannelID}>`),
						client
					)
				)
		}
		if (!games.inGame(message.author.id)) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You are not in a game")
				]
			})
		}

		addAudit(
			`${message.author.id} accused ${games.findOpponent(message.author.id)} of being afk`
		)

		let msg = await message.channel.send({
			content: `<@!${games.findOpponent(message.author.id)}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription("React to this now if you're not afk (1/3)")
			]
		})

		await msg.react("✅")
		const filter = (reaction, user) =>
			user.id === games.findOpponent(message.author.id) && reaction.emoji.name == "✅"
		const collector = msg.createReactionCollector({ time: 60 * 1000, filter })

		collector.on("collect", async (reaction, user) => {
			collector.stop("NOTAFK")
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "NOTAFK") {
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("BLUE")
							.setDescription("That player is not afk")
					]
				})
			}

			msg.delete()

			let msg2 = await message.channel.send({
				content: `<@!${games.findOpponent(message.author.id)}>`,
				embeds: [
					new Discord.MessageEmbed()
						.setColor("BLUE")
						.setDescription("React to this now if you're not afk (2/3)")
				]
			})

			await msg2.react("✅")
			const collector2 = msg2.createReactionCollector({ time: 60 * 1000, filter })

			collector2.on("collect", async (reaction, user) => {
				collector2.stop("NOTAFK")
			})

			collector2.on("end", async (collection, reason) => {
				msg2.reactions.removeAll()
				if (reason == "NOTAFK") {
					return msg2.edit({
						embeds: [
							new Discord.MessageEmbed()
								.setColor("BLUE")
								.setDescription("That player is not afk")
						]
					})
				}

				msg2.delete()

				let msg3 = await message.channel.send({
					content: `<@!${games.findOpponent(message.author.id)}>`,
					embeds: [
						new Discord.MessageEmbed()
							.setColor("BLUE")
							.setDescription("React to this now if you're not afk (3/3)")
					]
				})

				msg3.react("✅")

				const collector3 = msg3.createReactionCollector({ time: 180 * 1000, filter })

				collector3.on("collect", async (reaction, user) => {
					collector3.stop("NOTAFK")
				})

				collector3.on("end", async (collection, reason) => {
					msg3.reactions.removeAll()
					if (reason == "NOTAFK") {
						return msg3.edit({
							embeds: [
								new Discord.MessageEmbed()
									.setColor("BLUE")
									.setDescription("That player is not afk")
							]
						})
					}

					msg3.delete()

					if (!games.findOpponent(message.author.id)) {
						return msg3.edit({
							embeds: [
								new Discord.MessageEmbed()
									.setColor("NOT_QUITE_BLACK")
									.setDescription(
										"Game End Failed! If this is an issue contact Mysterium"
									)
							]
						})
					}

					addAudit(
						`${games.findOpponent(message.author.id)} was afk! gave win to ${
							message.author.id
						}`
					)

					let result = await games.executeGame(message.author.id)

					addAudit(`${message.author.id} resolved ${message.author.id}'s game Game Over!`)
					return message.channel.send({
						embeds: [
							new Discord.MessageEmbed().setColor("BLUE").setDescription(`**Game Results**
			Winner: <@!${result.winner.userID}> (${result.winner.oldElo} --> ${result.winner.newElo})
			Loser: <@!${result.loser.userID}> (${result.loser.oldElo} --> ${result.loser.newElo})`)
						]
					})
				})
			})
		})
	}
}
