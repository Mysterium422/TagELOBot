import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { hasStaffPermission, Staff } from "../utils"
import config from "../config"

export default {
	run: async ({ message }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}
	}
}
