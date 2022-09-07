const mongoose = require("mongoose")
const config = {
	prefix: "=",
	token: "OTc1NDY3MzQ2MzAwOTIzOTU0.GOFS8Y.KXAz5St_d3TQ_g9muKWUx2lj03KP5Y9A-U6OeI",
	ownerID: "573340518130384896",
	staffRoleID: "1014437768866299934",
	hostRoleID: "1014437851406008340",
	guildID: "975467783921995816",
	scannerRoleID: "1014437987905454100",
	rankedRoleID: "1014438039537319946",
	rankedCategoryID: "1014438135356207126",
	scanRoleID: "1014438190402244608",
	botDMRoleID: "1014438263014039573",
	mainChannelID: "1014438630191796254",
	commandsChannelID: "1014438668255100971",
	registerChannelID: "1014438703692779550",
	queueChannelID: "1014438743769362463",
	dmsChannelID: "1014438775646064660",
	hypixel_key: "e0d60510-bfd7-40c6-af34-132a5409a275",
	mongoConnectionMain:
		"mongodb+srv://Mysterium:JG3T8vfOhCzg6M3W@elobot.km4s1.mongodb.net/BotDatabase",
	mongoConnection: "mongodb+srv://Elkk:Elkk123@elobot.km4s1.mongodb.net/BotDatabase",
	mutedRoleID: "975468858875990066",
	k: 30,
	queueMessageID: "1016969526195265557"
}

mongoose
	.connect(config.mongoConnectionMain, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		userFindAndModify: false
	})
	.then(() => {
		console.log("Connected to Mongo")
	})
	.catch((err) => {
		console.error(err)
	})

const userSchema = new mongoose.Schema({
	userID: { type: String, require: true, unique: true },
	elo: { type: Number, require: true, default: 1000 },
	username: { type: String, require: true },
	uuid: { type: String, require: true },
	wins: { type: Number, require: true, default: 0 },
	losses: { type: Number, require: true, default: 0 },
	records: { type: Array, require: true, default: [] },
	deviation: { type: Number, require: true, default: 100 },
	blacklisted: { type: Boolean, require: true, default: false }
})

const usersModel = mongoose.model("user", userSchema)

async function main() {
	console.log(usersModel)
	// console.log(await usersModel.find({}))
}
main()
