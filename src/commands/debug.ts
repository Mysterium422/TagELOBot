import { CommandParameters } from "../CommandParameters"
import { hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"

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
		if (!hasStaffPermission(message.member, Staff.MYSTERIUM)) return
		queue.debugQueue()
		games.debugGames()
	}
}
