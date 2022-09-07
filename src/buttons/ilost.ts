import { ButtonParameters } from "../ButtonParameters"
import Discord from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"

export default {
	run: async ({ button }: ButtonParameters) => {
		// args are: ilost

		// None of these errors should fire since buttons can only be in the Guild
		if (!button.member) throw new Error("Button Member undefined")
		if (!button.channel) throw new Error("Button Channel undefined")
		if (!button.guild) throw new Error("Button Guild undefined")
		if (!(button.member instanceof Discord.GuildMember)) {
			throw new Error("Button member is not a GuildMember")
		}
		if (!(button.message instanceof Discord.Message)) {
			throw new Error("Button message is not a Message")
		}

		let opponent = games.findOpponent(button.member.id)

		if (!opponent) {
			return button.message.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("An error occurred, contact Mysterium or Admin")
				]
			})
		}

		const msg = await button.channel.send({
			content: `<@!${opponent}> <@!${button.id}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription(
						`React with a :thumbsup: if you consent that <@!${opponent}> beat <@!${button.id}>`
					)
			]
		})

		await msg.react("👍")
		await msg.react("👎")

		addAudit(`${button.id} ilost to ${opponent}`)

		const filter = (reaction, user) => user.id === opponent
		const collector = msg.createReactionCollector({ time: 60 * 1000, filter })

		collector.on("collect", async (reaction, user) => {
			if (reaction.emoji.name == "👍") {
				collector.stop("success")
			} else if (reaction.emoji.name == "👎") {
				collector.stop("failure")
			}
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (!button.member) throw new Error("Button Member undefined")
			if (!(button.message instanceof Discord.Message)) {
				throw new Error("Button message is not a Message")
			}
			if (!(button.member instanceof Discord.GuildMember)) {
				throw new Error("Button member is not a GuildMember")
			}

			if (reason == "success") {
				if (opponent != games.findOpponent(button.message.id)) {
					return button.message.edit({
						embeds: [
							new Discord.MessageEmbed()
								.setColor("RED")
								.setDescription(
									"Internal Error: Game End Failed! If this is an issue contact Mysterium"
								)
						]
					})
				}

				if (!opponent) return
				let result = await games.executeGame(opponent)

				addAudit(`${button.member.id} ${opponent} Game Over!`)
				return button.channel?.delete()
			}
			if (reason == "failure") {
				addAudit(`${button.member.id} ${opponent} Game end failed`)
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("Your opponent denied the win")
					]
				})
			}

			addAudit(`${button.member.id} ${opponent} Game end failed`)
		})
	}
}
