const mongoose = require("mongoose")

mongoose
	.connect(
		"mongodb+srv://Mysterium:JG3T8vfOhCzg6M3W@elobot.km4s1.mongodb.net/BotDatabase",
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
			userFindAndModify: false
		}
	)
	.then(() => {
		console.log("Mongo Connected")
	})
	.catch((err) => {
		console.log(err)
	})

const profileSchema = new mongoose.Schema({
	userID: { type: String, require: true, unique: true },
	elo: { type: Number, require: true, default: 1000 },
	username: { type: String, require: true },
	uuid: { type: String, require: true },
	wins: { type: Number, require: true, default: 0 },
	losses: { type: Number, require: true, default: 0 },
	records: { type: Array, require: true, default: [] }
})

const model = mongoose.model("user", profileSchema)

function main() {
	// model.find().then((res) => {
	// 	console.log(res)
	// })
	model.collection.deleteMany({})
	// console.log(await model.find())
}

main()
