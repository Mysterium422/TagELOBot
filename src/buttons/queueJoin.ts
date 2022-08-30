import { ButtonParameters } from "../ButtonParameters"
import { MessageButton } from "discord.js"

export default {
	run: async ({ button }: ButtonParameters) => {},
	data: new MessageButton().setCustomId("queueJoin").setLabel("Join").setStyle("SUCCESS")
}
