const Discord = require('discord.js'), client = new Discord.Client({partials: ["MESSAGE", "CHANNEL", "REACTION"]});
const yaml = require('js-yaml')
const fs = require('fs')
const db = require('quick.db')
const { pConversion } = require('./conversion.js')
const { hypixelFetch, mojangUUIDFetch } = require('../global/mystFetch')
const { replaceError, timeConverter } = require('../global/globalUtils')

let config = yaml.loadAll(fs.readFileSync('config.yaml', 'utf8'))[0]

console.log(config)

const prefix = "="
const k = 40

const embedColors = {
    green:"#3bcc71",
    red:"#e74c3c",
    blue:"#3498db",
    black:"#000000"
}

function addAudit(text) {
    auditLog = fs.readFileSync('audit.txt')
    // 17 Aug 2015 14:05:30 >> 
    auditLog = `${auditLog}\n${timeConverter(Date.now())} >> ${text}`
    fs.writeFileSync('audit.txt', auditLog)
}

async function executeGame(winnerID, loserID) {
    winnerRating = await db.get(`data.${winnerID}.rating`)
    loserRating = await db.get(`data.${loserID}.rating`)

    expectedWinner = 1/(1+Math.pow(10, (loserRating - winnerRating)/400))
    expectedLoser = 1/(1+Math.pow(10, (winnerRating - loserRating)/400))

    winnerNewRating = Math.max(Math.round(winnerRating + k * (1 - expectedWinner)), 0)
    loserNewRating = Math.max(Math.round(loserRating + k * (0 - expectedLoser)), 0)

    winnerPerformance = await db.get(`data.${winnerID}.performance.opponents`)
    winnerPerformance.push(loserID)
    await db.set(`data.${winnerID}.performance.opponents`, winnerPerformance)
    await db.set(`data.${winnerID}.performance.wins`, await db.get(`data.${winnerID}.performance.wins`) + 1)
    await db.set(`data.${winnerID}.rating`, winnerNewRating)

    loserPerformance = await db.get(`data.${loserID}.performance.opponents`)
    loserPerformance.push(winnerID)
    await db.set(`data.${loserID}.performance.opponents`, loserPerformance)
    await db.set(`data.${loserID}.performance.losses`, await db.get(`data.${loserID}.performance.losses`) + 1)
    await db.set(`data.${loserID}.rating`, loserNewRating)

    return `**Game Results**
Winner: <@!${winnerID}> (${winnerRating} --> ${winnerNewRating})
Loser: <@!${loserID}> (${loserRating} --> ${loserNewRating})`
}

async function calculatePerformance(ID) {

    let data = await db.get(`data`)

    let wins = data[ID].performance.wins
    let losses = data[ID].performance.losses
    if (wins + losses < 10) return "10 or more games needed"

    let opponents = data[ID].performance.opponents
    let opponentRatingSum = 0;

    for (let i = 0; i < opponents.length; i++) {
        opponentRatingSum = opponentRatingSum + data[opponents[i]].rating
    }
    winPercentage = wins/(wins+losses)
    dP = pConversion[winPercentage]
    averageRating = opponentRatingSum/(wins+losses)

    return Math.max(averageRating + dP, 0)
}

client.on('ready', async () => {
    console.log("Bot: Tag ELO Bot is online!")

    // await db.set('data', {})
    // await db.set('settings', {})
    // fs.writeFileSync('audit.txt', '')
    // addAudit('Reset Audit Log')

    console.log(await db.get('data'))

    addAudit("Bot Starting")
})

let tagEloQueues = {}
let tagEloGames = {}

/**
{
    authorID: [rating, deviation, Unix]
}
 */

client.on('message', async (m) => {
    if (m.author.bot) return

    if (!m.content.startsWith(prefix)) return

    var args = m.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase()

    if (command == "join" || command == "j") {
        if (m.channel.id != config.mainChannelID) return
        addAudit(`${m.author.id} tried to join`)
        if (m.author.id in tagEloQueues) return m.channel.send("You are already queued")
        if (m.author.id in tagEloGames) return m.channel.send(`You stil have a game against <@!${tagEloGames[m.author.id]}>`)

        if (!(m.author.id in await db.get(`data`))) return m.channel.send("You must be verified first. Contact a Staff member for support")
        addAudit(`${m.author.id} successfully joined`)

        setTimeout(async function () {
            m.delete()
        }, 100);

        let rating = await db.get(`data.${m.author.id}.rating`)
        let deviation = await db.get(`settings.${m.author.id}.deviation`)

        let potentialOponents = await Object.entries(tagEloQueues).filter((a) => {return Math.abs(rating - a[1][0]) < deviation}).filter((a) => {return Math.abs(rating - a[1][0]) < a[1][1]}).sort((a, b) => {return (a[1][0] - rating) - (b[1][0] - rating)}).sort((a, b) => {return a[1][2] - b[1][2]})

        // Check if 
        if (potentialOponents.length == 0) {
            tagEloQueues[m.author.id] = [rating, deviation, Date.now()]
            return m.author.send("Added you to the queue!")
        }

        tagEloGames[m.author.id] = potentialOponents[0][0]
        tagEloGames[potentialOponents[0][0]] = m.author.id

        delete tagEloQueues[potentialOponents[0][0]]

        return m.channel.send(`Game Starting:
<@!${potentialOponents[0][0]}> ${await db.get(`nameData.${potentialOponents[0][0]}`)} (${potentialOponents[0][1][0]}) vs <@!${m.author.id}> ${await db.get(`nameData.${m.author.id}`)} (${rating})`)
    }
    else if (command == "register") {
        addAudit(`${m.author.id} tried to register with IGN: ${args[0]}`)
        if (args.length != 1) return m.channel.send("Please specify an ign")

        if (args[0].length > 20) {
            data = await hypixelFetch(`player?uuid=${args[0]}`)
        }
        else {
            let uuidInput = await mojangUUIDFetch(args[0]).catch(() => {return {id:"UUIDINVALID12345678910"}})

            if (uuidInput.id.length > 20) {
                data = await hypixelFetch(`player?uuid=${uuidInput.id}`)
            }
            else {    
                data = await hypixelFetch(`player?name=${args[0]}`)
            }
        }

        if(data == "API ERROR") { return m.channel.send("API Connection Issues, Hypixel might be offline") }
        if(!data.success || data.success == false || data.player == null || data.player == undefined || !data.player || data.player.stats == undefined) {
            return m.channel.send("Could not find IGN")
        }

        message = await m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.blue)
                .setTitle(`Verification Request`)
                .setDescription(`From <@!${m.author.id}>

**Username:** ${data.player.displayname}
**UUID:** ${data.player.uuid}
**Tag Wins:** ${replaceError(replaceError(data.player.stats.TNTGames, {}).wins_tntag, 0)}
**Network Level:** ${Math.floor((Math.sqrt((2 * replaceError(data.player.networkExp, 0)) + 30625) / 50) - 2.5)}
**Discord:** ${replaceError(replaceError(replaceError(data.player.socialMedia, {}).links, {}).DISCORD, "Not Set")}
**First Login:** ${timeConverter(data.player.firstLogin)}`))
        message.react('✅').then(message.react('❌'))
    }
    else if (command == "leave" || command == "l") {
        if (m.channel.id != config.mainChannelID) return
        addAudit(`${m.author.id} tried to leave a game`)
        if (m.author.id in tagEloGames) return m.channel.send(`You are in a game against <@!${tagEloGames[m.author.id]}>. If you can't make it you must either forfeit (do ${prefix}winner <@!${tagEloGames[m.author.id]}>) or abort (do ${prefix}abort)`)
        if (!(m.author.id in tagEloQueues)) return m.channel.send("You are not in a queue")

        delete tagEloQueues[m.author.id]
        m.author.send("Removed you from the queue")
        addAudit(`${m.author.id} left a game`)
    }
    else if (command == "abort") {
        if (!(m.author.id in tagEloGames)) return m.channel.send("You are not in a game")
        const msg = await m.channel.send(`<@!${m.author.id}> <@!${tagEloGames[m.author.id]}> React with a :thumbsup: if you consent to aborting the game`)
        addAudit(`${m.author.id} tried to abort a game with ${tagEloGames[m.author.id]}`)

        msg.react('👍')

        const filter = (reaction, user) => (user.id === m.author.id || user.id === tagEloGames[m.author.id])
        const collector = msg.createReactionCollector(filter, {time: 10000})

        let eSignatures = {}
        eSignatures[m.author.id] = false
        eSignatures[tagEloGames[m.author.id]] = false

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                eSignatures[user.id] = true
            }
        })

        collector.on('end', () => {
            if (eSignatures[m.author.id] && eSignatures[tagEloGames[m.author.id]]) {
                delete tagEloGames[tagEloGames[m.author.id]]
                delete tagEloGames[m.author.id]
                addAudit(`${m.author.id} aborted a game with ${tagEloGames[m.author.id]}`)
                return msg.edit("Game Aborted")
            }
            else {
                addAudit(`${m.author.id} failed to aborted a game with ${tagEloGames[m.author.id]}`)
                return msg.edit("Game abortion failed. You may have to =resign")
            }
        })
    }
    else if (command == "resign" || command == "forfeit" || command == "winner") {
        if (!(m.author.id in tagEloGames)) return m.channel.send("You are not in a game")
        const msg = await m.channel.send(`React with a :thumbsup: if you consent that <@!${tagEloGames[m.author.id]}> beat <@!${m.author.id}>`)
        
        addAudit(`${m.author.id} lost to ${tagEloGames[m.author.id]}`)

        const filter = (reaction, user) => (user.id === m.author.id || user.id === tagEloGames[m.author.id])
        const collector = msg.createReactionCollector(filter, {time: 10000})

        msg.react('👍').then(msg.react('👎'))

        let eSignatures = {}

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                eSignatures[user.id] = true
            }
            else if (reaction.emoji.name == "👎") {
                eSignatures[user.id] = false
            }

            if (Object.keys(eSignatures).length == 2) {
                collector.stop()
            }
        })

        collector.on('end', async () => {
            if (eSignatures[m.author.id] && eSignatures[tagEloGames[m.author.id]]) {
                if (!(m.author.id in tagEloGames)) return msg.edit("Game End Failed! If this is an issue contact Mysterium")
                let string = await executeGame(tagEloGames[m.author.id], m.author.id)
                delete tagEloGames[tagEloGames[m.author.id]]
                delete tagEloGames[m.author.id]
                addAudit(`${m.author.id} ${tagEloGames[m.author.id]} Game Over!`)
                return msg.edit(string)
            }
            else {
                addAudit(`${m.author.id} ${tagEloGames[m.author.id]} Game end failed`)
                return msg.edit("Game end failed. <@&752177298161008763>")
            }
        })
    }
    else if (command == "stats") {
        addAudit(`${m.author.id} checked stats`)
        if (!(m.author.id in await db.get(`data`))) {
            return m.channel.send("You must be verified first. Contact a Staff member for support")
        }

        let data = await db.get(`data`)
        wins = data[m.author.id].performance.wins
        losses = data[m.author.id].performance.losses

        let opponents = data[m.author.id].performance.opponents
        let opponentRatingSum = 0;

        for (let i = 0; i < opponents.length; i++) {
            console.log(opponents)
            opponentRatingSum = opponentRatingSum + replaceError(replaceError(data[opponents[i]], {}).rating, 1500)
        }

        let winPercentage = replaceError(wins/(wins+losses), 1)
        let dP = pConversion[winPercentage]
        let averageRating = opponentRatingSum/(wins+losses)

        if (wins + losses >= 10) {
            var performanceScore = Math.max(averageRating + dP, 0)
        }
        else {
            var performanceScore = "10 or more games needed"
        }

        return m.channel.send(`**Username:** ${await db.get(`nameData.${m.author.id}`)}
**Rating:** ${data[m.author.id].rating}
**Wins:** ${wins}
**Losses:** ${losses}
**Total Games:** ${wins+losses}
**Win %:** ${Math.round(winPercentage*1000)/1000}
**Avg Opponent:** ${averageRating}
**Estimated Performance:** ${performanceScore}`)
    }
    else if (command == "leaderboard" || command == "lb") {
        addAudit(`${m.author.id} checked leaderboards`)
        let data = Object.entries(await db.get(`data`))
        if (data.length < 10) return m.channel.send(`Not enough leaderboard entries (${data.length})!`)
        data = data.sort((a, b) => {return b[1].rating - a[1].rating})
        

        let position = null;
        if (m.author.id in await db.get(`data`)) { 
            for (let i = 0; i<data.length; i++) {
                if (data[i][0] == m.author.id) {
                    position = i+1
                    break;
                }
            }
        }
        
        let string = `**ELO Leaderboard**
${(position == 1) ? "**" : ""}#1 <@!${data[0][0]}> ${await db.get(`nameData.${data[0][0]}`)} - ${data[0][1].rating}${(position == 1) ? "**" : ""}
${(position == 2) ? "**" : ""}#2 <@!${data[1][0]}> ${await db.get(`nameData.${data[1][0]}`)} - ${data[1][1].rating}${(position == 2) ? "**" : ""}
${(position == 3) ? "**" : ""}#3 <@!${data[2][0]}> ${await db.get(`nameData.${data[2][0]}`)} - ${data[2][1].rating}${(position == 3) ? "**" : ""}
${(position == 4) ? "**" : ""}#4 <@!${data[3][0]}> ${await db.get(`nameData.${data[3][0]}`)} - ${data[3][1].rating}${(position == 4) ? "**" : ""}
${(position == 5) ? "**" : ""}#5 <@!${data[4][0]}> ${await db.get(`nameData.${data[4][0]}`)} - ${data[4][1].rating}${(position == 5) ? "**" : ""}
${(position == 6) ? "**" : ""}#6 <@!${data[5][0]}> ${await db.get(`nameData.${data[5][0]}`)} - ${data[5][1].rating}${(position == 6) ? "**" : ""}
${(position == 7) ? "**" : ""}#7 <@!${data[6][0]}> ${await db.get(`nameData.${data[6][0]}`)} - ${data[6][1].rating}${(position == 7) ? "**" : ""}
${(position == 8) ? "**" : ""}#8 <@!${data[7][0]}> ${await db.get(`nameData.${data[7][0]}`)} - ${data[7][1].rating}${(position == 8) ? "**" : ""}
${(position == 9) ? "**" : ""}#9 <@!${data[8][0]}> ${await db.get(`nameData.${data[8][0]}`)} - ${data[8][1].rating}${(position == 8) ? "**" : ""}
${(position == 10) ? "**" : ""}#10 <@!${data[9][0]}> ${await db.get(`nameData.${data[9][0]}`)} - ${data[9][1].rating}${(position == 10) ? "**" : ""}`

        if (position > 10) {
            string = `${string}\n. . .\n**#${position} <@!${data[position - 1][0]}> - ${data[position - 1][1].rating}**`
        }

        return m.channel.send(string)
    }
    // else if (command == "verify") {
    //     if (!(m.member.roles.cache.has('752177298161008763') || m.member.roles.cache.has('737003993494061216') || m.member.roles.cache.has('793227819391123457'))) return
    //     if (m.mentions.members.size != 1) return m.channel.send("Ping the *one* person you would like to verify")

    //     await db.set(`data.${m.mentions.members.first().id}`, {"rating":1500, "performance":{"wins":0, "losses":0, "opponents":[]}})
    //     await db.set(`settings.${m.mentions.members.first().id}.deviation`, 100)

    //     return m.channel.send(`Verified <@!${m.mentions.members.first().id}>`)
    // }
    else if (command == "duel") {
        if (m.channel.id != config.mainChannelID) return
        if (!(m.author.id in await db.get(`data`))) {
            return m.channel.send("You must be verified first. Contact a Staff member for support")
        }
        if (m.author.id in tagEloGames) return m.channel.send(`You are in a game against <@!${tagEloGames[m.author.id]}>. If you can't make it you must either forfeit (do ${prefix}winner <@!${tagEloGames[m.author.id]}>) or abort (do ${prefix}abort)`)
        if (m.author.id in tagEloQueues) return m.channel.send("You are in the queue. Leave it to duel")
        let pingedMemberID;
        if (m.mentions.members.size == 0) {
            if (args[0] in await db.get(`nameData`)) {
                pingedMemberID = await db.get(`nameData.${args[0]}`)
            }
            return m.channel.send("Ping the player you are trying to duel OR enter a valid ign")
        }
        pingedMemberID = m.mentions.members.first().id
        addAudit(`${m.author.id} tried to duel ${pingedMemberID}`)
        if (!(pingedMemberID in await db.get(`data`))) {
            return m.channel.send("That player isn't verified!")
        }
        if (pingedMemberID in tagEloGames) return m.channel.send("That player is already in a game")
        if (pingedMemberID in tagEloQueues) return m.channel.send("That player is in the queue. They must leave it to duel")
        if (!pingedMemberID in await db.get(`data`)) {
            return m.channel.send("You must be verified first. Contact a Staff member for support")
        }

        const msg = await m.channel.send(`<@!${pingedMemberID}> React with a :thumbsup: if you would like to duel <@!${m.author.id}> (Rated ${await db.get(`data.${m.author.id}.rating`)})`)

        const filter = (reaction, user) => (user.id === pingedMemberID)
        const collector = msg.createReactionCollector(filter, {time: 10000})

        msg.react('👍')

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                if (m.author.id in tagEloGames || pingedMemberID in tagEloGames) {return collector.stop("A")}
                tagEloGames[m.author.id] = pingedMemberID
                tagEloGames[pingedMemberID] = m.author.id
                addAudit(`${m.author.id} ${pingedMemberID} Game`)
                msg.edit(`Game Starting:
<@!${m.author.id}> ${await db.get(`nameData.${m.author.id}`)} (${await db.get(`data.${m.author.id}.rating`)}) vs <@!${pingedMemberID}> ${await db.get(`nameData.${pingedMemberID}`)} (${await db.get(`data.${pingedMemberID}.rating`)})`)
                collector.stop("A")
            }
        })

        collector.on('end', (collection, reason) => {
            console.log(reason)
            addAudit(`${m.author.id} ${pingedMemberID} Game Start Failed`)
            if (reason != "A") msg.edit("Duel request denied")
        })
    }
    else if (command == "debug") {
        addAudit(`${m.author.id} ran debug command`)
        console.log(await db.get('data'))
        console.log(await db.get('settings'))
        console.log(tagEloGames)
        console.log(tagEloQueues)
    }
    else if (command == "set") {
        if (m.channel.id !== config.mainChannelID) return;

        if (!(m.author.id in await db.get(`data`))) return m.channel.send("You must be verified first. Contact a Staff member for support")

        if (!isFinite(args[0])) {
            return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.black)
                .setDescription("Specify a valid number"))
        }

        if (args[0] < 100 || args[0] > 300) {
            return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.black)
                .setDescription("Must be between 100 and 300. Default: 100"))
        }

        await db.set(`settings.${m.author.id}.deviation`, eval(args[0]))

        addAudit(`${m.author.id} set their deviation to ${args[0]}`)

        return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.green)
                .setDescription(`Your deviation has been set to ${args[0]}`))
    }
    else if (command == "audit") {
        addAudit(`${m.author.id} checked audit logs`)
        if (m.member.hasPermission('VIEW_AUDIT_LOG')) return m.channel.send({files:['./audit.txt']})
    }
    else if (command == "scan") {
        if (args[0] in await db.get('nameData')) {
            addAudit(`${m.author.id} scanned ${await db.get(`nameData.${args[0]}`)}`)
        return m.channel.send(`<@!${await db.get(`nameData.${args[0]}`)}> A staff member will be with you shortly! If 15 min have passed and no staff has shown up, you may leave Hypixel.
<@&793227819391123457> <@&737003993494061216> <@&752177298161008763>`)
        }
        if (m.mentions.members.size == 0) return m.channel.send("Ping the player you are trying to scan OR use a valid ign")
        addAudit(`${m.author.id} scanned ${m.mentions.members.first().id}`)
        return m.channel.send(`<@!${m.mentions.members.first().id}> A staff member will be with you shortly! If 15 min have passed and no staff has shown up, you may leave Hypixel.
<@&793227819391123457> <@&737003993494061216> <@&752177298161008763>`)
    }
    else if (command == "blacklist") {
        if (!m.member.hasPermission('ADMINISTRATOR')) return
        if (m.mentions.members.size == 0) return m.channel.send("Ping the player you are trying to blacklist")
        addAudit(`${m.author.id} blacklisted ${m.mentions.members.first().id}`)
        addAudit(`Blacklisted data: ${JSON.stringify(await db.get(`data.${m.mentions.members.first().id}`))}`)
        db.delete(`data.${m.mentions.members.first().id}`)
        return m.channel.send(`Blacklisted <@!${m.mentions.members.first().id}>`)
    }
    else if (command == "change") {
        if (!m.member.hasPermission('ADMINISTRATOR')) return
        if (m.mentions.members.size == 0) return m.channel.send("Ping the player you would like to award elo to")
        if (!(m.mentions.members.first().id in await db.get(`data`))) return m.channel.send("Player not verified")
        db.delete('data.687055408417865733')

        if (!isFinite(args[1])) {
            return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.black)
                .setDescription("Specify a valid number"))
        }
        await db.set(`data.${m.mentions.members.first().id}.rating`, Math.max(await db.get(`data.${m.mentions.members.first().id}.rating`) + eval(args[1]), 0))
        addAudit(`${m.author.id} changed ${m.mentions.members.first().id}'s score by ${args[1]} to ${await db.get(`data.${m.mentions.members.first().id}.rating`)}`)
        return m.channel.send(`Changed <@!${m.mentions.members.first().id}>'s rating to ${await db.get(`data.${m.mentions.members.first().id}.rating`)}`)
    }
})

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.message.partial) await reaction.message.fetch()
    if (reaction.partial) await reaction.fetch()
    if (reaction.message.author.id != client.user.id) return
    if (!reaction.message.guild) return
    if (reaction.message.embeds.length == 0) return
    if (reaction.message.embeds[0].title != 'Verification Request') return
    member = await reaction.message.guild.members.cache.get(user.id)
    
    if (!(member.roles.cache.has('793227819391123457') || member.roles.cache.has('737003993494061216') || member.roles.cache.has('752177298161008763'))) return

    userID = reaction.message.embeds[0].description.slice(reaction.message.embeds[0].description.indexOf('!')+1, reaction.message.embeds[0].description.indexOf('>'))
    let playerUsername = reaction.message.embeds[0].description.slice(reaction.message.embeds[0].description.indexOf('**Username:** ') + '**Username:** '.length)
    playerUsername = playerUsername.slice(0, playerUsername.indexOf('\n'))
    console.log(userID)
    if (reaction.emoji.name === '✅') {
        if (userID in await db.get(`data`)) {
            reaction.message.channel.send("That player is already verified")
            return reaction.message.delete()
        }

        await db.set(`data.${userID}`, {"rating":1500, "performance":{"wins":0, "losses":0, "opponents":[]}})
        await db.set(`nameData.${userID}`, playerUsername)
        await db.set(`nameData.${playerUsername}`, userID.toString())
        await db.set(`settings.${userID}.deviation`, 100)

        reaction.message.channel.send(`Verified <@!${userID}>`)
        addAudit(`${user.id} verified ${userID}`)
        return reaction.message.delete()
    }
    else if (reaction.emoji.name === '❌') {
        reaction.message.channel.send(`Staff has denied your verification request <@!${userID}>`)
        addAudit(`${user.id} did not verify ${userID}`)
        return reaction.message.delete()
    }
    return
})

client.login(config.botToken)