import { CommandParameters } from "../CommandParameters"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"

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
		if (!hasStaffPermission(message.member, Staff.ADMINISTRATOR)) return
		if (!message.mentions.members || message.mentions.members.size == 0) {
			return message.channel.send({
				content: "Ping the player you are trying to blacklist"
			})
		}

		let first = message.mentions.members.first()
		if (!first) {
			return message.channel.send({
				content: "Ping the player you are trying to blacklist"
			})
		}
		await first.roles.add(config.blacklistRoleID)

		addAudit(`${message.author.id} blacklisted ${first.id}`)
		let blacklisted = await mongo.findOne(mongo.MODELS.Users, { userID: first.id })
		if (!blacklisted) {
			return message.channel.send({
				content: "Player data not found"
			})
		}

		blacklisted.blacklisted = true
		await mongo.findOneAndReplace(mongo.MODELS.Users, { userID: first.id }, blacklisted)

		addAudit(`Blacklisted data: ${JSON.stringify(blacklisted)}`)
		await db.update(db.TABLES.UserData, { discord: first.id }, { blacklisted: true })
		return message.channel.send(`Blacklisted <@!${first.id}>`)
	},
	aliases: ["rb", "rankedblacklist"]
}
