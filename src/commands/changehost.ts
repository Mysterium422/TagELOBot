import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as db from "../db"

export default {
	run: async ({ message, client, args }: CommandParameters) => {
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
						.setDescription("Ping the player you would like to change host points for")
				]
			})
		}

		let first = message.mentions.members.first()
		if (!first) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you would like to change host points for")
				]
			})
		}

		let changeID = first.id

		let hostChange = parseInt(args[1])

		if (!hostChange) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Specify a valid number")
				]
			})
		}

		let hostRows = await db.where(db.TABLES.HostData, { discord: changeID })
		let newHostAmt: number
		if (hostRows.length == 0) {
			await db.add(db.TABLES.HostData, { discord: changeID, host: hostChange })
			newHostAmt = hostChange
		} else {
			await db.update(
				db.TABLES.HostData,
				{ discord: changeID },
				{ discord: changeID, host: hostRows[0].host + hostChange }
			)
			newHostAmt = hostRows[0].host + hostChange
		}

		addAudit(
			`${message.author.id} changed ${changeID}'s hostScore by ${hostChange} to ${newHostAmt}`
		)
		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("GREEN")
					.setDescription(`Changed <@!${changeID}>'s hosting score to ${newHostAmt}`)
			]
		})
	}
}
