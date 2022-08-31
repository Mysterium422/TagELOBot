import type { ButtonInteraction, Client } from "discord.js"

export type ButtonParameters = {
	readonly client: Client
	readonly button: ButtonInteraction
}
