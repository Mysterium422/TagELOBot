import { ButtonParameters } from "../ButtonParameters"
import Discord from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"
import * as queueMessage from "../handlers/queueMessage"

export default {
	run: async ({ button, client }: ButtonParameters) => {
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
		if (!(button.channel instanceof Discord.TextChannel)) {
			throw new Error("Button Channel not text")
		}

		await button.deferUpdate()

		if (
			games.findGame(button.member.id)?.match !=
			games.getMatchFromString(button.channel.name)
		) {
			return
		}

		let opponent = games.findOpponent(button.member.id)

		button.message.components[0].components[0].setDisabled(true)
		button.message.components[1].components[0].setDisabled(true)
		button.message.components[2].components[0].setDisabled(true)

		await button.message.edit({
			content: button.message.content,
			embeds: button.message.embeds,
			components: button.message.components
		})

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
			content: `<@!${opponent}> <@!${button.member.id}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription(
						`React with a :thumbsup: if you consent that <@!${opponent}> beat <@!${button.member.id}>`
					)
			]
		})

		await msg.react("👍")
		await msg.react("👎")

		addAudit(`${button.member.id} ilost to ${opponent}`)

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
			if (!button.member) throw new Error("Button Member undefined")
			if (!(button.message instanceof Discord.Message)) {
				throw new Error("Button message is not a Message")
			}
			if (!(button.member instanceof Discord.GuildMember)) {
				throw new Error("Button member is not a GuildMember")
			}

			if (reason == "success") {
				if (!opponent) return
				await games.executeGame(opponent)

				addAudit(`${button.member.id} ${opponent} Game Over!`)
				queueMessage.updateMessage(client)
				return button.channel?.delete()
			}

			if (reason == "failure") {
				addAudit(`${button.member.id} ${opponent} Game end failed`)
				button.message.components[0].components[0].setDisabled(false)
				button.message.components[1].components[0].setDisabled(false)
				button.message.components[2].components[0].setDisabled(false)
				button.message.edit({
					content: button.message.content,
					embeds: button.message.embeds,
					components: button.message.components
				})
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("Your opponent denied the win")
					]
				})
			}

			addAudit(`${button.member.id} ${opponent} Game end failed`)
			button.message.components[0].components[0].setDisabled(false)
			button.message.components[1].components[0].setDisabled(false)
			button.message.components[2].components[0].setDisabled(false)
			button.message.edit({
				content: button.message.content,
				embeds: button.message.embeds,
				components: button.message.components
			})
		})
	}
}
