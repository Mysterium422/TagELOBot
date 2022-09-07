import { ButtonParameters } from "../ButtonParameters"
import Discord, { TextChannel } from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"
import { ThreadAutoArchiveDuration } from "discord-api-types/v9"
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
		if (!(button.channel instanceof Discord.TextChannel)) {
			throw new Error("Button channel is not a Text CHannel")
		}

		await button.deferUpdate()

		let buttonMemberID = button.member.id

		addAudit(
			`${button.member.id} accused ${games.findOpponent(button.member.id)} of being afk`
		)

		button.message.components[0].components[0].setDisabled(true)
		button.message.components[1].components[0].setDisabled(true)
		button.message.components[2].components[0].setDisabled(true)
		await button.message.edit({
			content: button.message.content,
			embeds: button.message.embeds,
			components: button.message.components
		})

		let msg = await button.channel.send({
			content: `<@!${games.findOpponent(button.member.id)}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription("React to this now if you're not afk (1/3)")
			]
		})

		await msg.react("✅")
		const filter = (reaction, user) =>
			user.id === games.findOpponent(buttonMemberID) && reaction.emoji.name == "✅"
		const collector = msg.createReactionCollector({ time: 60 * 1000, filter })

		collector.on("collect", async (reaction, user) => {
			collector.stop("NOTAFK")
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "NOTAFK") {
				if (!(button.message instanceof Discord.Message)) {
					throw new Error("Button message is not a Message")
				}
				button.message.components[0].components[0].setDisabled(false)
				button.message.components[1].components[0].setDisabled(false)
				button.message.components[2].components[0].setDisabled(false)
				await button.message.edit({
					content: button.message.content,
					embeds: button.message.embeds,
					components: button.message.components
				})
				return msg.delete()
			}

			msg.delete()
			if (!button.channel) throw new Error("Button Channel undefined")

			let msg2 = await button.channel.send({
				content: `<@!${games.findOpponent(buttonMemberID)}>`,
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
				if (!(button.message instanceof Discord.Message)) {
					throw new Error("Button message is not a Message")
				}
				if (reason == "NOTAFK") {
					button.message.components[0].components[0].setDisabled(false)
					button.message.components[1].components[0].setDisabled(false)
					button.message.components[2].components[0].setDisabled(false)
					await button.message.edit({
						content: button.message.content,
						embeds: button.message.embeds,
						components: button.message.components
					})
					return msg2.delete()
				}

				msg2.delete()
				if (!button.channel) throw new Error("Button Channel undefined")

				let msg3 = await button.channel.send({
					content: `<@!${games.findOpponent(buttonMemberID)}>`,
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
						if (!(button.message instanceof Discord.Message)) {
							throw new Error("Button message is not a Message")
						}
						button.message.components[0].components[0].setDisabled(false)
						button.message.components[1].components[0].setDisabled(false)
						button.message.components[2].components[0].setDisabled(false)
						await button.message.edit({
							content: button.message.content,
							embeds: button.message.embeds,
							components: button.message.components
						})
						return msg3.delete()
					}

					msg3.delete()
					if (!button.channel) throw new Error("Button Channel undefined")

					if (!games.findOpponent(buttonMemberID)) {
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
						`${games.findOpponent(buttonMemberID)} was afk! gave win to ${buttonMemberID}`
					)

					let result = await games.executeGame(buttonMemberID)
					queueMessage.updateMessage(client)

					addAudit(`${buttonMemberID} resolved ${buttonMemberID}'s game Game Over!`)
					button.channel.delete()
				})
			})
		})
	}
}
