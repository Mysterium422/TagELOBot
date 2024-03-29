import Discord, { MessageEmbed, MessageOptions } from "discord.js"
import config from "./config"
import fs from "fs"
import { resolve } from "path"
import fetch from "node-fetch"

const AUDIT_PATH = resolve(__dirname, "../audit.txt")
const PLAYER_DATA_PATH = resolve(__dirname, "../player_data.json")
const player_data = JSON.parse(fs.readFileSync(PLAYER_DATA_PATH, "utf-8"))

let mojangQueries = 0
function newMojangQuery() {
	mojangQueries = mojangQueries + 1
	setTimeout(function () {
		mojangQueries = mojangQueries - 1
	}, 10 * 60 * 1000)
}

export let locked = false

export enum Staff {
	MYSTERIUM,
	ADMINISTRATOR,
	STAFF,
	HOST
}

export function hasStaffPermission(
	member: Discord.GuildMember,
	staffLevel: Staff
): boolean {
	if (member.id == config.ownerID) return true
	if (staffLevel == Staff.ADMINISTRATOR && member.permissions.has("ADMINISTRATOR")) {
		return true
	}
	if (staffLevel == Staff.STAFF && member.roles.cache.has(config.staffRoleID)) return true
	if (staffLevel == Staff.HOST && member.roles.cache.has(config.hostRoleID)) return true
	return false
}

export async function simulateDM(
	member: Discord.GuildMember | null,
	embedToSend: MessageEmbed,
	client: Discord.Client
) {
	let guild = await client.guilds.cache.get(config.guildID)
	if (!guild) throw new Error("Cannot find Guild ID")
	if (!member) throw new Error("Cannot find Message Member")

	let role = await guild.roles.cache.get(config.botDMRoleID)
	if (!role) throw new Error("Cannot find botDM Role ID")
	await member.roles.add(role)

	let channel = await client.channels.cache.get(config.dmsChannelID)
	if (!channel) throw new Error("Cannot find DM Channel ID")
	if (channel.type != "GUILD_TEXT") throw new Error("Cannot find DM Channel ID")

	let msg = await channel.send({
		content: `<@!${member.id}>`,
		embeds: [embedToSend]
	})

	await msg.react("✅")
	const filter = (reaction, user) => user.id === member.id && reaction.emoji.name == "✅"
	const collector = msg.createReactionCollector({ time: 30 * 1000, filter })

	collector.on("collect", async () => {
		collector.stop()
	})

	collector.on("end", () => {
		msg.delete()
		if (!role) return
		member.roles.remove(role)
	})
}

export function timeConverter(UNIX_timestamp: number): string {
	var a = new Date(UNIX_timestamp)
	var months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec"
	]
	var year = a.getFullYear()
	var month = months[a.getMonth()]
	var date = a.getDate()
	var hour = a.getHours()
	var min = a.getMinutes() < 10 ? "0" + a.getMinutes() : a.getMinutes()
	var sec = a.getSeconds() < 10 ? "0" + a.getSeconds() : a.getSeconds()
	var time = date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec
	return time
}

export function addAudit(text: string) {
	let auditLog = fs.readFileSync(AUDIT_PATH, "utf-8")
	// 17 Aug 2015 14:05:30 >>
	auditLog = `${auditLog}\n${timeConverter(Date.now())} >> ${text}`
	fs.writeFileSync(AUDIT_PATH, auditLog)
}

export type HypixelResponsePlayerData = {
	uuid: string
	displayname: string
	networkExp?: number
	firstLogin: number
	stats: { TNTGames: { [key: string]: number } }
	socialMedia?: { links?: { DISCORD?: string } }
}

export type HypixelResponse =
	| { success: false; cause: string }
	| { success: true; player: HypixelResponsePlayerData }

/** Query the Hypixel API */
export async function hypixelFetch(query: string): Promise<HypixelResponse | null> {
	const response = await fetch(
		`https://api.hypixel.net/${query}&key=${config.hypixel_key}`
	)
	if (response.status === 403 || response.status === 200) {
		try {
			return (await response.json()) as HypixelResponse
		} catch (e) {
			console.warn("[WARNING] Error while reading JSON:", e)
			return null
		}
	} else {
		return null
	}
}

type MojangResponse = { name: string; id: string }

export async function mojangUUIDFetch(query: string): Promise<MojangResponse> {
	if (mojangQueries > 599) {
		return { name: query, id: query }
	}
	newMojangQuery()

	const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${query}`)

	if (response.status === 403 || response.status === 200) {
		try {
			return (await response.json()) as MojangResponse
		} catch (e) {
			console.warn("[WARNING] Error while reading JSON:", e)
		}
	}

	return { name: query, id: query }
}

export function replaceError(a: any, defaultVar: any): any {
	if (a == undefined || a == Infinity) {
		return defaultVar
	} else {
		return a
	}
}

export function consolelog(text: string) {
	console.log(`[TAG ELO] ${text}`)
}

export function lockQueue() {
	locked = true
}

export function getAltBanisherUUID(discordID: string): string | null {
	let data = player_data[discordID]
	if (!data) return null
	return data.uuid
}
