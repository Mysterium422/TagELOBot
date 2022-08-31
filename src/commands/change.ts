import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"

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
						.setDescription("Ping the player you would like to award elo to")
				]
			})
		}

		let first = message.mentions.members.first()
		if (!first) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you would like to award elo to")
				]
			})
		}

		let changeID = first.id

		if (!db.contains(db.TABLES.UserData, { discord: changeID })) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Player not verified")
				]
			})
		}

		let eloChange = parseInt(args[1])

		if (!eloChange) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Specify a valid number")
				]
			})
		}
		let player = await mongo.findOne(mongo.MODELS.Users, { userID: changeID })
		if (!player) throw new Error("Could not find mongo player")
		player.records.push({
			reason: "admin",
			elo: Math.max(player.elo + eloChange, 0) - player.elo,
			time: Date.now()
		})
		player.elo = Math.max(player.elo + eloChange, 0)
		await mongo.findOneAndReplace(mongo.MODELS.Users, { userID: changeID }, player)
		addAudit(
			`${message.author.id} changed ${changeID}'s score by ${eloChange} to ${player.elo}`
		)
		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("GREEN")
					.setDescription(`Changed <@!${changeID}>'s rating to ${Math.round(player.elo)}`)
			]
		})
	}
}
