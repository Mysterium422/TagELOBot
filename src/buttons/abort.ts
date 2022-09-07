import { ButtonParameters } from "../ButtonParameters"
import Discord, { TextChannel } from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"
import * as queueMessage from "../handlers/queueMessage"

export default {
	run: async ({ button, client }: ButtonParameters) => {
		// args are: host

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

		let buttonMemberID = button.member.id

		if (!games.inGame(button.member.id)) {
			return button.message.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("An error occurred, contact Mysterium or Admin")
				]
			})
		}

		let opponent = games.findOpponent(button.member.id)

		button.message.components[1].components[0].setDisabled(true)

		const msg = await button.channel.send({
			content: `<@!${button.member.id}> <@!${opponent}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription(`React with a :thumbsup: if you consent to aborting the game`)
			]
		})

		addAudit(`${button.member.id} tried to abort a game with ${opponent}`)

		await msg.react("👍")
		await msg.react("👎")

		const filter = (reaction, user) => user.id == opponent
		const collector = msg.createReactionCollector({ time: 60 * 1000, filter })

		collector.on("collect", async (reaction, user) => {
			if (reaction.emoji.name == "👍") {
				return collector.stop("success")
			} else if (reaction.emoji.name == "👎") {
				return collector.stop("failure")
			}
		})

		collector.on("end", (collection, reason) => {
			msg.reactions.removeAll()

			if (!(button.message instanceof Discord.Message)) {
				throw new Error("Button message is not a Message")
			}

			if (reason == "success") {
				if (games.findOpponent(buttonMemberID) != opponent) {
					return msg.edit({
						embeds: [
							new Discord.MessageEmbed()
								.setColor("NOT_QUITE_BLACK")
								.setDescription("An internal error has occured. Game not found.")
						]
					})
				}

				addAudit(`${buttonMemberID} aborted a game with ${opponent}`)

				games.deleteGame(buttonMemberID)
				queueMessage.updateMessage(client)

				return button.channel?.delete()
			}
			if (reason == "failure") {
				addAudit(`${buttonMemberID} failed to aborted a game with ${opponent}`)
				button.message.components[1].components[0].setDisabled(false)
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("Game abortion rejected. You may have to =resign")
					]
				})
			}
			addAudit(`${buttonMemberID} failed to aborted a game with ${opponent}`)
			button.message.components[1].components[0].setDisabled(false)
			return msg.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Game abortion request timed out")
				]
			})
		})
	}
}
