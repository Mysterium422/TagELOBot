import config from "./config"
import { consolelog } from "./utils"

const mongoose = require("mongoose")

mongoose
	.connect(config.mongoConnectionMain, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		userFindAndModify: false
	})
	.then(() => {
		consolelog("Connected to Mongo")
	})
	.catch((err) => {
		console.error(err)
	})

export enum MODELS {
	Users = "users"
}

type UserRecord =
	| {
			reason: "game"
			opponent: string
			elo: number
			time: number
	  }
	| {
			reason: "duel"
			opponent: string
			elo: number
			time: number
	  }
	| {
			reason: "admin"
			elo: number
			time: number
	  }

export type MongoUser = {
	userID: string
	elo: number
	username: string
	uuid: string
	wins: number
	losses: number
	records: UserRecord[]
	deviation: number
}

interface MongoMap {
	[MODELS.Users]: MongoUser
}

const userSchema = new mongoose.Schema({
	userID: { type: String, require: true, unique: true },
	elo: { type: Number, require: true, default: 1000 },
	username: { type: String, require: true },
	uuid: { type: String, require: true },
	wins: { type: Number, require: true, default: 0 },
	losses: { type: Number, require: true, default: 0 },
	records: { type: Array, require: true, default: [] },
	deviation: { type: Number, require: true, default: 100 }
})

const usersModel = mongoose.model("user", userSchema)
const models = {
	users: usersModel
}

export const findOne = <K extends keyof MongoMap>(
	model: K,
	query: Partial<MongoMap[K]>
): Promise<MongoMap[K]> => {
	return models[model].findOne(query).toJSON()
}

export const findOneAndReplace = <K extends keyof MongoMap>(
	model: K,
	query: Partial<MongoMap[K]>,
	newvalue: MongoMap[K]
) => {
	return models[model].findOneAndReplace(query, newvalue)
}

export const find = <K extends keyof MongoMap>(
	model: K,
	query: Partial<MongoMap[K]>
): Promise<MongoMap[K][]> => {
	return models[model].find(query)
}

export const findOneAndDelete = <K extends keyof MongoMap>(
	model: K,
	query: Partial<MongoMap[K]>
) => {
	return models[model].findOneAndDelete(query)
}

export const create = async <K extends keyof MongoMap>(model: K, data: MongoMap[K]) => {
	let user = await models[model].create(data)
	user.save()
	return
}
