import { ButtonParameters } from "../ButtonParameters"
import { GuildMember, MessageActionRow, MessageButton } from "discord.js"
import config from "../config"
import { addAudit, locked, simulateDM } from "../utils"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"
import Discord from "discord.js"
import * as queueMessage from "../handlers/queueMessage"
import { ThreadAutoArchiveDuration } from "discord-api-types/v9"

export default {
	run: async ({ button, client }: ButtonParameters) => {
		if (button.message.id != config.queueMessageID) {
			return
		}
		if (!(button.member instanceof GuildMember)) {
			throw new Error("Button Member not GuildMember")
		}
		if (!button.guild) throw new Error("Button Guild does not exist")
		if (!button.channel) throw new Error("Button Channel does not exist")

		addAudit(`${button.member} tried to join`)

		/** Lock using button#setDisabled? */

		// if (locked) {
		// 	return message.channel.send({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription("The queue has been locked and games can no longer start")
		// 		]
		// 	})
		// }
		// setTimeout(async function () {
		// 	message.delete()
		// }, 200)

		if (queue.inQueue(button.member.id)) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You are already queued")
				],
				ephemeral: true
			})
		}
		if (games.inGame(button.member.id)) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							`You stil have a game against <@!${games.findOpponent(button.member.id)}>`
						)
				],
				ephemeral: true
			})
		}

		if (!(await db.contains(db.TABLES.UserData, { discord: button.member.id }))) {
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription(
							"You must be verified first. Do =register to start the verification process"
						)
				],
				ephemeral: true
			})
		}

		addAudit(`${button.member.id} successfully joined`)

		let player = await mongo.findOne(mongo.MODELS.Users, { userID: button.member.id })
		if (!player) throw new Error("Mongo player not found")

		let opponent = queue.findOpponent(player.userID, player)
		if (!opponent) {
			queue.join(player.userID, player)

			await queueMessage.updateMessage(client)
			return button.reply({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("GREEN")
						.setDescription("Added you to the queue!")
				],
				ephemeral: true
			})
		}

		let matchesRows = await db.where(db.TABLES.Matches, { channel: button.channel.id })
		let match = 1
		if (matchesRows.length == 0) {
			await db.add(db.TABLES.Matches, { channel: button.channel.id, matches: 0 })
		} else {
			match = matchesRows[0].matches + 1
			await db.update(
				db.TABLES.Matches,
				{ channel: button.channel.id },
				{ channel: button.channel.id, matches: match }
			)
		}

		games.newGame(player.userID, opponent.userID, match)

		await queueMessage.updateMessage(client)

		addAudit(`Starting match ${match} ${opponent.userID} vs ${button.member.id}`)

		let opponentData = await mongo.findOne(mongo.MODELS.Users, {
			userID: opponent.userID
		})
		if (!opponentData) throw new Error("Mongo player not found")

		let matchString: string = `${match < 1000 ? 0 : ""}${match < 100 ? 0 : ""}${
			match < 10 ? 0 : ""
		}${match}`

		let channel = await button.guild.channels.create(`Game-${matchString}`, {
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
					id: button.member.id,
					allow: ["VIEW_CHANNEL", "SEND_MESSAGES_IN_THREADS"],
					deny: ["SEND_MESSAGES", "CREATE_PUBLIC_THREADS", "USE_APPLICATION_COMMANDS"]
				},
				{
					id: opponent.userID,
					allow: ["VIEW_CHANNEL", "SEND_MESSAGES_IN_THREADS"],
					deny: ["SEND_MESSAGES", "CREATE_PUBLIC_THREADS", "USE_APPLICATION_COMMANDS"]
				}
			]
		})
		await channel.send({
			content: `<@!${button.member.id}> <@!${opponent.userID}>`,
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle(`Game ${match}`)
					.setDescription(
						`<@!${opponent.userID}> ${opponentData.username} (${Math.round(
							opponentData.elo
						)})\n<@!${button.member.id}> ${player.username} (${Math.round(player.elo)})`
					)
			],
			components: [
				new MessageActionRow().addComponents([
					new MessageButton().setCustomId("ilost").setLabel("iLost").setStyle("PRIMARY"),
					new MessageButton()
						.setCustomId("host")
						.setLabel("Find Host")
						.setStyle("PRIMARY")
				]),
				new MessageActionRow().addComponents([
					new MessageButton().setCustomId("abort").setLabel("Abort").setStyle("DANGER"),
					new MessageButton().setCustomId("scan").setLabel("Scan").setStyle("DANGER")
				])
			]
		})
		let msg = await channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle("Game Chat")
					.setDescription("Use this thread to discuss anything about your game")
			]
		})
		let thread = await msg.startThread({
			name: "Game Chat",
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
		})
		let msg2 = await thread.send({ content: "This thread is now available for use" })
		await msg2.delete()

		return button.reply({
			embeds: [
				new Discord.MessageEmbed().setColor("BLUE")
					.setDescription(`Game ${match} Starting:
<@!${opponent.userID}> ${opponentData.username} (${Math.round(opponentData.elo)}) vs <@!${
					button.member.id
				}> ${player.username} (${Math.round(player.elo)})`)
			],
			ephemeral: true
		})
	},
	data: new MessageButton().setCustomId("queue_join").setLabel("Join").setStyle("SUCCESS")
}
