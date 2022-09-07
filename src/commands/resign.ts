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

		let opponent = games.findOpponent(message.author.id)

		if (!opponent) {
			return message.channel.send("You are not in a game")
		}

		const msg = await message.channel.send({
			content: `<@!${opponent}> <@!${message.author.id}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription(
						`React with a :thumbsup: if you consent that <@!${opponent}> beat <@!${message.author.id}>`
					)
			]
		})

		addAudit(`${message.author.id} lost to ${opponent}`)

		const filter = (reaction, user) => user.id === opponent
		const collector = msg.createReactionCollector({ time: 60 * 1000, filter })

		await msg.react("👍")
		await msg.react("👎")

		collector.on("collect", async (reaction, user) => {
			if (reaction.emoji.name == "👍") {
				collector.stop("success")
			} else if (reaction.emoji.name == "👎") {
				collector.stop("failure")
			}
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "success") {
				if (opponent != games.findOpponent(message.author.id))
					return msg.edit({
						embeds: [
							new Discord.MessageEmbed()
								.setColor("NOT_QUITE_BLACK")
								.setDescription(
									"Internal Error: Game End Failed! If this is an issue contact Mysterium"
								)
						]
					})

				if (!opponent) return
				let result = await games.executeGame(opponent)

				addAudit(`${message.author.id} ${opponent} Game Over!`)
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed().setColor("BLUE").setDescription(`**Game Results**
Winner: <@!${result.winner.userID}> (${result.winner.oldElo} --> ${result.winner.newElo})
Loser: <@!${result.loser.userID}> (${result.loser.oldElo} --> ${result.loser.newElo})`)
					]
				})
			}
			if (reason == "failure") {
				addAudit(`${message.author.id} ${opponent} Game end failed`)
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("Your opponent denied the win")
					]
				})
			}

			addAudit(`${message.author.id} ${opponent} Game end failed`)
			return msg.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Request timed out")
				]
			})
		})
	},
	aliase: ["forfeit", "ilose", "ilost"]
}
