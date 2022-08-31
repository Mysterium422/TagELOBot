import { MongoUser } from "../mongo"
import * as queue from "./queue"

type gameEntry =
	| {
			type: "game"
			player1: {
				userID: string
				elo: number
			}
			player2: {
				userID: string
				elo: number
			}
			host: boolean
	  }
	| {
			type: "duel"
			player1: {
				userID: string
				elo: number
			}
			player2: {
				userID: string
				elo: number
			}
	  }

let games: gameEntry[] = []

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

	games.push({
		type: "game",
		player1: {
			userID: userID1,
			elo: elo1
		},
		player2: {
			userID: userID2,
			elo: elo2
		},
		host: false
	})

	if (queue.inQueue(userID1)) {
		queue.leave(userID1)
	}

	if (queue.inQueue(userID2)) {
		queue.leave(userID2)
	}
}

function findGame(playerID: string): gameEntry | null {
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

export { inGame, newGame, findGame, findOpponent }
