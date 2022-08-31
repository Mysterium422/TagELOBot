import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as games from "../handlers/game"

export default {
	run: async ({ message }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (!message.member) throw new Error("Message member missing")
		if (!hasStaffPermission(message.member, Staff.STAFF)) return

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

		let result = await games.executeGame(pingedID)

		addAudit(`${message.author.id} resolved ${pingedID}'s game Game Over!`)
		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed().setColor("BLUE").setDescription(`**Game Results**
Winner: <@!${result.winner.userID}> (${result.winner.oldElo} --> ${result.winner.newElo})
Loser: <@!${result.loser.userID}> (${result.loser.oldElo} --> ${result.loser.newElo})`)
			]
		})
	}
}
