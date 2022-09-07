import { ButtonParameters } from "../ButtonParameters"
import Discord, { TextChannel } from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"
import { ThreadAutoArchiveDuration } from "discord-api-types/v9"

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
		if (!(button.channel instanceof Discord.TextChannel)) {
			throw new Error("Button channel is not a Text CHannel")
		}

		button.message.components[2].components[1].setDisabled(true)
		button.channel.send(`<@&${config.staffRoleID}> has been requested`)
	}
}
