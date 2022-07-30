import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { hasStaffPermission, Staff } from "../utils"
import config from "../config"

export default {
	run: async ({ message }: CommandParameters) => {
		if (!message.member) throw new Error("Message Member is null")
		if (!hasStaffPermission(message.member, Staff.STAFF)) return

		if (message.channel.type != "GUILD_TEXT") return
		if (!message.channel.name.startsWith("scan-request")) return
		if (!message.guild) throw new Error("Message Guild is null")

		let msg = await message.channel.send(
			"<a:Loading:851630056014741534> Updating Channel. This might take a while."
		)
		let userIDS = Array.from(message.channel.permissionOverwrites.cache.keys()).filter(
			(a) => {
				let roleArray = [config.guildID, config.staffRoleID, config.scannerRoleID]
				return !roleArray.includes(a)
			}
		)

		let ID1 = userIDS[0]
		let ID2 = userIDS[1]

		await message.channel.permissionOverwrites.set([
			{
				id: config.guildID,
				deny: ["VIEW_CHANNEL"]
			}
		])

		let role1 = await message.guild.roles.cache.get(config.rankedRoleID)
		let role2 = await message.guild.roles.cache.get(config.scanRoleID)
		let member1 = await message.guild.members.cache.get(ID1)
		let member2 = await message.guild.members.cache.get(ID2)

		if (!member1) throw new Error("Couldn't find member1")
		if (!member2) throw new Error("Couldn't find member2")
		if (!role1) throw new Error("Couldn't find role1")
		if (!role2) throw new Error("Couldn't find role2")

		member1.roles.add(role1)
		member1.roles.remove(role2)
		member2.roles.add(role1)
		member2.roles.remove(role2)

		msg.delete()
	}
}
