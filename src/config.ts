import { readFileSync } from "fs"
import { resolve } from "path"

const CONFIG_PATH = resolve(__dirname, "../config.json")
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as {
	readonly prefix: string
	readonly ownerID: string
	readonly staffRoleID: string
	readonly hostRoleID: string
	readonly guildID: string
	readonly scannerRoleID: string
	readonly rankedRoleID: string
	readonly scanRoleID: string
	readonly botDMRoleID: string
	readonly mainChannelID: string
	readonly commandsChannelID: string
	readonly registerChannelID: string
	readonly queueChannelID: string
	readonly dmsChannelID: string
	readonly hypixel_key: string
	readonly mongoConnectionMain: string
}

export default config
