import { MongoUser } from "../mongo"
import * as queue from "./queue"

class Game {
	public type: "game" | "duel"
	public player1: {
		userID: string
		elo: number
	}
	public player2: {
		userID: string
		elo: number
	}
	public host: boolean

	constructor(
		userID1: string,
		elo1: number,
		userID2: string,
		elo2: number,
		type: "game" | "duel"
	) {
		this.type = type
		this.player1 = {
			userID: userID1,
			elo: elo1
		}
		this.player2 = {
			userID: userID2,
			elo: elo2
		}
		this.host = false
	}

	public hostRequested() {
		this.host = true
	}
}

let games: Game[] = []

function inGame(playerID: string): boolean {
	return games.some((entry) => {
		return entry.player1.userID == playerID || entry.player2.userID == playerID
	})
}

function newGame(userID1: string, elo1: number, userID2: string, elo2: number) {
	if (
		games.some((entry) => {
			return inGame(userID1) || inGame(userID2)
		})
	) {
		throw new Error("Player is already in a game")
	}

	let game = new Game(userID1, elo1, userID2, elo2, "game")
	games.push(game)

	if (queue.inQueue(userID1)) {
		queue.leave(userID1)
	}

	if (queue.inQueue(userID2)) {
		queue.leave(userID2)
	}
}

function findGame(playerID: string): Game | null {
	for (let i = 0; i < games.length; i++) {
		if (games[i].player1.userID == playerID) return games[i]
		if (games[i].player2.userID == playerID) return games[i]
	}
	return null
}

function findOpponent(playerID: string): string | null {
	let game = findGame(playerID)
	if (!game) return null
	if (playerID == game.player1.userID) return game.player2.userID
	return game.player1.userID
}

function deleteGame(playerID: string) {
	for (let i = 0; i < games.length; i++) {
		if (games[i].player1.userID == playerID) {
			games.splice(i, 1)
			return
		}
		if (games[i].player2.userID == playerID) {
			games.splice(i, 1)
			return
		}
	}
}

export { inGame, newGame, findGame, findOpponent, deleteGame }
