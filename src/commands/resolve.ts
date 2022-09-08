import { CommandParameters } from "../CommandParameters"
import Discord, { TextChannel } from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as games from "../handlers/game"
import * as queueMessage from "../handlers/queueMessage"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (!message.member) throw new Error("Message member missing")
		if (!hasStaffPermission(message.member, Staff.STAFF)) return
		if (!(message.channel instanceof TextChannel)) throw new Error("Not a txt channel")
		if (!message.channel.name.startsWith("game-")) return

		if (!message.mentions.members || message.mentions.members.size == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player who should get the *win*")
				]
			})
		}

		let first = message.mentions.members.first()
		if (!first) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player who should get the *win*")
				]
			})
		}

		let pingedID = first.id

		if (!games.inGame(pingedID)) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Game End Failed! If this is an issue contact Mysterium")
				]
			})
		}

		if (
			games.findGame(pingedID)?.match != games.getMatchFromString(message.channel.name)
		) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Incorrect Channel?")
				]
			})
		}

		await games.executeGame(pingedID)
		await queueMessage.updateMessage(client)

		addAudit(`${message.author.id} resolved ${pingedID}'s game Game Over!`)
		return message.channel.delete()
	}
}
