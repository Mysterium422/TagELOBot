import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { hasStaffPermission, Staff, addAudit } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (!message.member) throw new Error("Message member missing")
		addAudit(`${message.author.id} checked audit logs`)
		if (hasStaffPermission(message.member, Staff.ADMINISTRATOR)) return

		return message.author.send({ files: ["../../audit.txt"] }).catch((err) => {
			return message.channel.send({
				content: "Error while sending file (file too large? bot blocked?)"
			})
		})
	}
}
