import { ButtonParameters } from "../ButtonParameters"
import { MessageButton } from "discord.js"

export default {
	run: async ({ button }: ButtonParameters) => {},
	data: new MessageButton().setCustomId("queueLeave").setLabel("Leave").setStyle("DANGER")
}
