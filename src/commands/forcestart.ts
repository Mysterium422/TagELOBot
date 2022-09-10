import { CommandParameters } from "../CommandParameters"
import Discord, { TextChannel } from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as games from "../handlers/game"
import * as queueMessage from "../handlers/queueMessage"
import * as queue from "../handlers/queue"
import * as db from "../db"

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
						.setDescription("Ping the two players to start the game")
				]
			})
		}

		let mentions = Array.from(message.mentions.members.entries())

		if (mentions[0]) {
			queue.inQueue(mentions[0][0])

			if (queue.inQueue(mentions[0][0])) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("Player already queued")
					]
				})
			}

			if (games.inGame(mentions[0][0])) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(
								`Stil have a game against <@!${games.findOpponent(mentions[0][0])}>`
							)
					]
				})
			}

			let userData: db.UserRow[] = await db.where(db.TABLES.UserData, {
				discord: mentions[0][0]
			})

			if (userData.length == 0) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(
								"You must be verified first. Do =register to start the verification process"
							)
					]
				})
			}

			if (userData[0].blacklisted) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("You have been blacklisted and can no longer join games")
					]
				})
			}
		} else return
		if (mentions[1]) {
			queue.inQueue(mentions[1][0])

			if (queue.inQueue(mentions[1][0])) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("Player already queued")
					]
				})
			}

			if (games.inGame(mentions[1][0])) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(
								`Stil have a game against <@!${games.findOpponent(mentions[1][0])}>`
							)
					]
				})
			}

			let userData: db.UserRow[] = await db.where(db.TABLES.UserData, {
				discord: mentions[1][0]
			})

			if (userData.length == 0) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(
								"You must be verified first. Do =register to start the verification process"
							)
					]
				})
			}

			if (userData[0].blacklisted) {
				return message.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("You have been blacklisted and can no longer join games")
					]
				})
			}
		} else return

		games.newGame(
			mentions[0][0],
			mentions[1][0],
			games.getMatchFromString(message.channel.name)
		)
		await queueMessage.updateMessage(client)

		message.channel.send({ content: "Game Restarted, buttons should work" })

		addAudit(
			`${message.author.id} created game between ${mentions[0][0]} and ${mentions[1][0]}`
		)
	}
}
