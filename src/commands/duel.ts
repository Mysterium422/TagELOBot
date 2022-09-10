import { CommandParameters } from "../CommandParameters"
import Discord, { MessageActionRow, MessageButton } from "discord.js"
import { simulateDM, locked, addAudit } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"
import * as queueMessage from "../handlers/queueMessage"
import { ThreadAutoArchiveDuration } from "discord-api-types/v9"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (message.channel.id != config.commandsChannelID) {
			setTimeout(async function () {
				message.delete()
			}, 200)
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.commandsChannelID}>`)
					]
				})
				.catch((err) =>
					simulateDM(
						message.member,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.commandsChannelID}>`),
						client
					)
				)
		}

		if (locked) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("The queue has been locked and games can no longer start")
				]
			})
		}

		let userData: db.UserRow[] = await db.where(db.TABLES.UserData, {
			discord: message.author.id
		})

		if (userData.length == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You must be verified first. =register to be verified")
				]
			})
		}

		if (userData[0].blacklisted) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You have been blacklisted and can no longer join games")
				]
			})
		}

		if (games.inGame(message.author.id))
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							`You are in a game against <@!${games.findOpponent(message.author.id)}>.`
						)
				]
			})

		if (queue.inQueue(message.author.id)) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You are in the queue. Leave it to duel")
				]
			})
		}

		if (!message.mentions.members || message.mentions.members.size == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you are trying to duel")
				]
			})
		}

		let first = message.mentions.members.first()
		if (!first) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you are trying to duel")
				]
			})
		}

		let pingedMemberID = first.id
		addAudit(`${message.author.id} tried to duel ${pingedMemberID}`)

		let pingedData: db.UserRow[] = await db.where(db.TABLES.UserData, {
			discord: pingedMemberID
		})

		if (pingedData.length == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("That player isn't verified!")
				]
			})
		}

		if (pingedData[0].blacklisted) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							"That player has been blacklisted and can no longer join games"
						)
				]
			})
		}

		if (pingedMemberID == message.author.id) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You cannot duel yourself")
				]
			})
		}
		if (games.inGame(pingedMemberID)) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("That player is already in a game")
				]
			})
		}
		if (queue.inQueue(pingedMemberID)) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("That player is in the queue. They must leave it to duel")
				]
			})
		}

		let challenger = await mongo.findOne(mongo.MODELS.Users, {
			userID: message.author.id
		})

		if (!challenger) throw new Error("Mongo challenger not found")

		let recentGamesTogether = challenger.records
			.filter((record) => {
				if (record.reason == "admin" || record.reason == "game") return false
				if (record.opponent != pingedMemberID) return false
				return Date.now() - record.time < 24 * 60 * 60 * 1000
			})
			.sort((a, b) => {
				return a.time - b.time
			})

		if (recentGamesTogether.length > 2) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed().setColor("NOT_QUITE_BLACK").setDescription(
						`You cannot duel the same person more than 3 times within 24 hours
Next available duel: <t:${Math.round(recentGamesTogether[0].time / 1000)}>`
					)
				]
			})
		}

		const msg = await message.channel.send({
			content: `<@!${pingedMemberID}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setDescription(
						`React with a :thumbsup: if you would like to duel <@!${
							message.author.id
						}> (Rated ${Math.round(challenger.elo)})`
					)
			]
		})

		const filter = (reaction, user) => user.id === pingedMemberID
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
			await msg.reactions.removeAll()
			if (reason == "success") {
				if (
					games.inGame(message.author.id) ||
					games.inGame(pingedMemberID) ||
					queue.inQueue(message.author.id) ||
					queue.inQueue(pingedMemberID)
				) {
					addAudit(`${message.author.id} ${pingedMemberID} Game Start Failed`)
					return msg.edit({
						embeds: [
							new Discord.MessageEmbed()
								.setColor("NOT_QUITE_BLACK")
								.setDescription("Internal Error: Duel Request failed")
						]
					})
				}

				let matchesRows = await db.where(db.TABLES.Matches, {
					channel: config.queueChannelID
				})
				let match = 1
				if (matchesRows.length == 0) {
					await db.add(db.TABLES.Matches, { channel: config.queueChannelID, matches: 0 })
				} else {
					match = matchesRows[0].matches + 1
					await db.update(
						db.TABLES.Matches,
						{ channel: config.queueChannelID },
						{ channel: config.queueChannelID, matches: match }
					)
				}

				games.newDuel(message.author.id, pingedMemberID, match)

				await queueMessage.updateMessage(client)

				addAudit(`${message.author.id} ${pingedMemberID} Game Start`)

				let player1 = await mongo.findOne(mongo.MODELS.Users, {
					userID: message.author.id
				})
				let player2 = await mongo.findOne(mongo.MODELS.Users, { userID: pingedMemberID })
				if (!player1) throw new Error("Couldnt find mongo duel player 1")
				if (!player2) throw new Error("Couldnt find mongo duel player 2")

				let matchString: string = `${match < 1000 ? 0 : ""}${match < 100 ? 0 : ""}${
					match < 10 ? 0 : ""
				}${match}`

				if (!message.guild) throw new Error("Message Guild gone")

				let channel = await message.guild.channels.create(`Game-${matchString}`, {
					type: "GUILD_TEXT",
					parent: config.rankedCategoryID,
					permissionOverwrites: [
						{
							id: config.guildID,
							deny: ["VIEW_CHANNEL"]
						},
						{
							id: config.staffRoleID,
							allow: ["VIEW_CHANNEL"]
						},
						{
							id: message.author.id,
							allow: ["VIEW_CHANNEL", "SEND_MESSAGES_IN_THREADS"],
							deny: ["SEND_MESSAGES", "CREATE_PUBLIC_THREADS", "USE_APPLICATION_COMMANDS"]
						},
						{
							id: pingedMemberID,
							allow: ["VIEW_CHANNEL", "SEND_MESSAGES_IN_THREADS"],
							deny: ["SEND_MESSAGES", "CREATE_PUBLIC_THREADS", "USE_APPLICATION_COMMANDS"]
						}
					]
				})

				await channel.send({
					content: `<@!${message.author.id}> <@!${pingedMemberID}>`,
					embeds: [
						new Discord.MessageEmbed()
							.setColor("BLUE")
							.setTitle(`Game ${match}`)
							.setDescription(
								`<@!${pingedMemberID}> ${player2.username} (${Math.round(
									player2.elo
								)})\n<@!${message.author.id}> ${player1.username} (${Math.round(
									player1.elo
								)})`
							)
					],
					components: [
						new MessageActionRow().addComponents([
							new MessageButton()
								.setCustomId("ilost")
								.setLabel("I Lost")
								.setStyle("PRIMARY"),
							new MessageButton()
								.setCustomId("host")
								.setLabel("Find Host")
								.setStyle("PRIMARY")
						]),
						new MessageActionRow().addComponents([
							new MessageButton()
								.setCustomId("abort")
								.setLabel("Abort")
								.setStyle("DANGER"),
							new MessageButton().setCustomId("scan").setLabel("Scan").setStyle("DANGER")
						]),
						new MessageActionRow().addComponents([
							new MessageButton()
								.setCustomId("opponentafk")
								.setLabel("AFK Opponent")
								.setStyle("SECONDARY"),
							new MessageButton()
								.setCustomId("staff")
								.setLabel("Staff Summon")
								.setStyle("SECONDARY")
						])
					]
				})

				let mesg = await channel.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("BLUE")
							.setTitle("Game Chat")
							.setDescription("Use this thread to discuss anything about your game")
					]
				})

				let thread = await mesg.startThread({
					name: "Game Chat",
					autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
				})
				let msg2 = await thread.send({ content: "This thread is now available for use" })
				await msg2.delete()

				return msg.edit({
					embeds: [
						new Discord.MessageEmbed().setColor("BLUE")
							.setDescription(`Game ${match} Starting:
<@!${message.author.id}> ${player1.username} (${Math.round(
							player1.elo
						)}) vs <@!${pingedMemberID}> ${player2.username} (${Math.round(
							player2.elo
						)})`)
					]
				})
			}
			if (reason == "failure") {
				return msg.edit({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("RED")
							.setDescription("Duel request denied")
					]
				})
			}
			return msg.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("Duel request timed out")
				]
			})
		})
	}
}
