import { ButtonParameters } from "../ButtonParameters"
import Discord, { TextChannel } from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"

export default {
	run: async ({ button }: ButtonParameters) => {
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

		await button.deferUpdate()

		let game = games.findGame(button.member.id)
		if (!game) {
			return button.message.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("An error occurred, contact Mysterium or Admin")
				]
			})
		}

		button.message.components[0].components[1].setDisabled(true)
		await button.message.edit({
			content: button.message.content,
			embeds: button.message.embeds,
			components: button.message.components
		})

		game.hostRequested()
		let channel = await button.guild.channels.fetch(config.commandsChannelID)
		if (!channel) throw new Error("Couldnt find Commands Channel")
		if (!(channel instanceof TextChannel)) {
			throw new Error("Commands Channel not Text Channel")
		}

		let msg = await channel.send(`Host Needed! <@&${config.hostRoleID}>`)
		await msg.react("✋")

		let buttonMemberID = button.member.id
		let opponentID = games.findOpponent(buttonMemberID)

		const filter = async (reaction, user) => {
			return (
				reaction.emoji.name == "✋" &&
				user.id != buttonMemberID &&
				user.id != buttonMemberID
			)
		}
		const collector = msg.createReactionCollector({ time: 600 * 1000, filter })
		collector.on("collect", async (reaction, user) => {
			if (!reaction.message.guild) throw new Error("Host reaction not in a guild")
			let member = await reaction.message.guild.members.cache.get(user.id)

			if (!member) throw new Error("Member not found in guild")
			if (!member.roles.cache.has(config.hostRoleID)) return
			if (user.bot) return
			if (!channel) throw new Error("Couldnt find Commands Channel")
			if (!(channel instanceof TextChannel)) {
				throw new Error("Commands Channel not Text Channel")
			}
			if (!button.member) throw new Error("Button Member undefined")
			if (!(button.member instanceof Discord.GuildMember)) {
				throw new Error("Button member is not a GuildMember")
			}

			channel.send(`<@!${button.member.id}> <@!${user.id}> can host!`)

			let hostRows = await db.where(db.TABLES.HostData, { discord: user.id })
			if (hostRows.length == 0) {
				await db.add(db.TABLES.HostData, { discord: user.id, host: 1 })
			} else {
				await db.update(
					db.TABLES.HostData,
					{ discord: user.id },
					{ discord: user.id, host: hostRows[0].host + 1 }
				)
			}

			msg.delete()
			collector.stop("reaction")
		})

		collector.on("end", (collection, reason) => {
			if (reason == "reaction") return
			msg.reactions.removeAll()
			msg.edit("Host Request Timed Out")
		})
	}
}
