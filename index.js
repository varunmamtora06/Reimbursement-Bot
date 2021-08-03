require("dotenv").config();

//Creating Bot Instance
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const mongoose = require("mongoose");

//Importing Models
const User = require("./models/User");
const Claim = require("./models/Claim");

//Importing helpers
const isRegistered = require("./helpers/isRegistered");
const getUser = require("./helpers/getUser");

//Creating an express server
const express = require("express");
const app = express();

//Connecting to database
const db = require("./db");

db.connectMongo();

// To remove CROS (cross-resource-origin-platform) problem
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); // to allow all client we use *
    res.setHeader(
        "Access-Control-Allow-Methods",
        "OPTIONS,GET,POST,PUT,PATCH,DELETE"
    ); //these are the allowed methods
    res.setHeader("Access-Control-Allow-Headers", "*"); // allowed headers (Auth for extra data related to authoriaztion)
    next();
});

app.use(express.json());

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const resp =
        "This is a rembursement bot.";
    const replyMsg = await bot.sendMessage(chatId, resp);
    console.log(`Reply->${JSON.stringify(replyMsg)}`);
    console.log(`Msg->${JSON.stringify(msg)}`);

});

bot.onText(/\/register_as_claimer/, async (msg) => {
    const chatId = msg.chat.id;
    const resp = "You are registered as a claimer.";
    
    const user = await isRegistered(msg.chat.username);

    if(user){
        await bot.sendMessage(chatId, `You're already registered as a ${user.userType}.`);
    } else {
        await User.create({
            username: msg.chat.username,
            userType: "claimer",
            userChatId: chatId
        });
    
        await bot.sendMessage(chatId, resp);
    }

});

bot.onText(/\/register_as_approver/, async (msg) => {
    const chatId = msg.chat.id;
    const resp = "You are registered as a approver.";
    
    const user = await isRegistered(msg.chat.username);

    if(user){
        await bot.sendMessage(chatId, `You're already registered as a ${user.userType}.`);
    } else {
        await User.create({
            username: msg.chat.username,
            userType: "approver"
        });
    
        await bot.sendMessage(chatId, resp);
    }
});

bot.onText(/\/addclaim/, async (msg) => {
    
    const chatId = msg.chat.id;
    const resp = "Enter description,amount as a reply to this message.";
    const replyMsg = await bot.sendMessage(chatId, resp);
    // const claim = {
    //     description: '',
    //     totalAmount: 0,
    //     claimMade: false
    // };

    await bot.onReplyToMessage(
        replyMsg.chat.id,
        replyMsg.message_id,
        async (claim) => {
            const claimAttributeArray = claim.text.split(",");
            let claimObj = {};
            claimObj.description = claimAttributeArray[0].trim();
            claimObj.totalAmount = claimAttributeArray[1].trim();
            
            await Claim.create({
                description: claimObj.description,
                totalAmount: claimObj.totalAmount,
                claimer: replyMsg?.chat?.username,
                claimerChatId: chatId
            });

            bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);
        }
    );
    
    

});

bot.onText(/\/myclaims/, async (msg) => {
    const user = await getUser(msg.chat.username);
    const chatId = msg.chat.id;
    const resp = `Filter claims by:`;

    if(user.userType === "claimer"){
        bot.sendMessage(chatId, resp, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Approved", callback_data: "approved" },
                        { text: "Pending", callback_data: "pending" },
                        { text: "Rejected", callback_data: "rejected" },
                    ],
                ],
            },
        });
    } else {
        bot.sendMessage(chatId, `You are an ${user.userType}.\nPlease use /getclaims to get all the claims.`); // This if user is an approver.
    }

});

bot.onText(/\/getclaims/, async (msg) => {
    const user = await getUser(msg.chat.username);
    const chatId = msg.chat.id;
    const resp = `Filter claims by:`;

    if(user.userType === "approver"){
        bot.sendMessage(chatId, resp, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Approved", callback_data: "approvedByApprover" },
                        { text: "Pending", callback_data: "pendingByApprover" },
                        { text: "Rejected", callback_data: "rejectedByApprover" },
                    ],
                ],
            },
        });
    } else {
        bot.sendMessage(chatId, `You are a ${user.userType}.\nPlease use /myclaims to get your claims.`);
    }

});

const displayClaims = async (data, status) => {
    const chatid = data.message.chat.id;
    const username = data.message.chat.username;
    // await console.log(`username->${username}`);

    const userClaims = await Claim.find({ claimer: username, status: status }).sort({createdAt: 1});
    // await console.log(`claims->${JSON.stringify(userClaims)}`);

    await userClaims.forEach(async (claim) => {
        // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
        const claimDetail = `ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`;
        bot.sendMessage(chatid, claimDetail, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🗑 Delete Claim", callback_data: "deleteClaim" },
                        
                    ],
                ],
            },
        });
    });
};

const deleteClaim = async (data) => {
    console.log(`delData->${JSON.stringify(data)}`);
    const chatid = data.message.chat.id;
    const claimId = data.message.text.split('\n')[0].slice(4).trim();
    console.log(`delClaimID->${claimId}`);
    
    await Claim.deleteOne({_id: claimId});
};


const displayClaimsToApprover = async (data, status) => {
    const chatid = data.message.chat.id;
    const userClaims = await Claim.find({status: status}).sort({createdAt: 1});

    await userClaims.forEach(async (claim) => {
        // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
        const claimDetail = `ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status} \nClaimer: ${claim.claimer}`;
        bot.sendMessage(chatid, claimDetail, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✔ Approve Claim", callback_data: "approveClaim" },
                        { text: "❌ Reject Claim", callback_data: "rejectClaim" },
                        
                    ],
                ],
            },
        });
    });

};

const setClaimStatus = async (data, status) => {
    const chatid = data.message.chat.id;
    const claimId = data.message.text.split('\n')[0].slice(4).trim();

    const claim = await Claim.findOne({_id: claimId});

    if(status === "approve"){
        await Claim.updateOne({_id: claimId},{$set: {isApproved: true, status: "approved"}});
    } else {
        await Claim.updateOne({_id: claimId},{$set: {isApproved: true, status: "rejected"}});
    }

    bot.sendMessage(chatid, `The claim ${claimId} ${status}ed successfully.`);
    await bot.sendMessage(claim.claimerChatId, `The claim ${claimId} ${status}ed successfully.`);
};

bot.on("callback_query", async (data) => {
    // Get the callback data specified
    let callback_data = data.data;
    console.log(data);
    let queryAnswer = "";
    switch (callback_data) {
        case "approved":
            displayClaims(data, "approved");
            queryAnswer = "display approved";
            break;

        case "pending":
            displayClaims(data, "pending");
            queryAnswer = "display pending";
            break;
        
        case "rejected":
            displayClaims(data, "rejected");
            queryAnswer = "display rejected";
            break;

        case "deleteClaim":
            deleteClaim(data);
            queryAnswer = "delete claim";
            break;

        //For approver
        case "approvedByApprover":
            displayClaimsToApprover(data, "approved");
            queryAnswer = "displaying approved claims";
            break;

        case "pendingByApprover":
            displayClaimsToApprover(data, "pending");
            queryAnswer = "displaying pending claims";
            break;
        
        case "rejectedByApprover":
            displayClaimsToApprover(data, "rejected");
            queryAnswer = "displaying rejected claims";
            break;

        case "approveClaim":
            setClaimStatus(data, "approve");
            queryAnswer = "claim approved"
            break;
            
        case "rejectClaim":
            setClaimStatus(data, "reject");
            queryAnswer = "claim rejected"
            break;
    }

    bot.answerCallbackQuery(data.id, {
        text: queryAnswer,
    });
});

app.listen(3000, () => {
    console.log("Running on port http://localhost:3000");
});