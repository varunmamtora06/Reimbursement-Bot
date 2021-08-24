require("dotenv").config();

//Creating Bot Instance
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const mongoose = require("mongoose");


//Importing controllers
const { displayClaims, displayClaimsToApprover, setClaimStatus, deleteClaim } = require("./controllers/claimController");
const { viewDocuments, addDocs, dontAddDoc, addMoreDoc, dontAddMoreDoc } = require("./controllers/documentController");

//Importing Models
const User = require("./models/User");
const Claim = require("./models/Claim");

//Importing helpers
const isRegistered = require("./helpers/isRegistered");
const getUser = require("./helpers/getUser");

//Importing utils
const refIdGenerator = require("./helpers/utils");

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

    bot.onReplyToMessage(
        replyMsg.chat.id,
        replyMsg.message_id,
        async (replyObj) => {
            console.log(`replyobjis->${JSON.stringify(replyObj)}`);
            console.log(`replyobjis->${replyObj.photo[0].file_id}`);
            const image = await bot.getFile("AgACAgUAAxkBAAIBJ2EWON8E4F-nOUKcE0jNLr8aeKFbAALSrTEbL6m4VBeciy-GQyTrAQADAgADcwADIAQ");
            console.log(`image->${JSON.stringify(image)}`);
            bot.sendPhoto(chatId, "AgACAgUAAxkBAAIBJ2EWON8E4F-nOUKcE0jNLr8aeKFbAALSrTEbL6m4VBeciy-GQyTrAQADAgADcwADIAQ");
        }
    );

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
    let isDocs = true;
    let resp = "Enter description as a reply to this message.";
    let replyMsg = await bot.sendMessage(chatId, resp);
    // const claim = {
    //     description: '',
    //     totalAmount: 0,
    //     claimMade: false
    // };

    await bot.onReplyToMessage(
        replyMsg.chat.id,
        replyMsg.message_id,
        async (claim) => {
            
            let claimObj = {};
            claimObj.description = claim.text;
            

            let resp = "Enter amount as a reply to this message.";
            let replyMsg = await bot.sendMessage(chatId, resp);

            

            await bot.onReplyToMessage(
                replyMsg.chat.id,
                replyMsg.message_id,
                async (amount) => {
                        claimObj.totalAmount = amount.text;
                        let id = refIdGenerator();
                        const createdClaim = await Claim.create({
                            claimRefId: `CL-${id}`,
                            description: claimObj.description,
                            totalAmount: claimObj.totalAmount,
                            claimer: replyMsg?.chat?.username,
                            claimerChatId: chatId
                        });

                        let resp = "Do you have another bill document?";
                        await bot.sendMessage(chatId, resp, {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: "Yes", callback_data: `addMoreDoc+${createdClaim._id}` },
                                        { text: "No", callback_data: `dontAddMoreDoc` },
                                    ],
                                ],
                            },
                        });
                        
                        
                        // bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);
                    }
                );
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


bot.on("callback_query", async (data) => {
    // Get the callback data specified
    let callback_data = data.data;
    
    let claimObj = {};
    if(data.data.includes("+")){
        let dataArr = data.data.split("+");
        callback_data = dataArr[0];
        // claimObj = JSON.parse(dataArr[1]);

        // console.log(`claimIZ->${JSON.stringify(claimObj)}`);
        // console.log(`callBackIz->${callback_data}`);
    }
    
    console.log(`dataIz->${JSON.stringify(data)}`);
    let queryAnswer = "";
    switch (callback_data) {
        case "approved":
            displayClaims(data, "approved", 0, bot);
            queryAnswer = "display approved";
            break;

        case "pending":
            displayClaims(data, "pending", 0, bot);
            queryAnswer = "display pending";
            break;
        
        case "rejected":
            displayClaims(data, "rejected", 0, bot);
            queryAnswer = "display rejected";
            break;

        case "viewMore":
            let dataArray = data.data.split("+");
            console.log(`this more->${dataArray}`)
            displayClaims(data, dataArray[1], parseInt(dataArray[2]), bot);
            break;
        
        case "viewMoreApprover":
            let dataArrayApprover = data.data.split("+");
            console.log(`this more->${dataArrayApprover}`)
            displayClaimsToApprover(data, dataArrayApprover[1], parseInt(dataArrayApprover[2]), bot);
            break;

        case "addDoc":
            addDocs(data, bot);
            queryAnswer = "add more";
            // await Claim.create({
            //                     description: claimObj.description,
            //                     totalAmount: claimObj.totalAmount,
            //                     claimer: replyMsg?.chat?.username,
            //                     claimerChatId: chatId
            //                 });
            //                 bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);
            break;
        
        case "dontAddDoc":
            dontAddDoc(data, bot);
            queryAnswer = "done";
            break;

        case "addMoreDoc":
            addMoreDoc(data, bot);
            break;

        case "dontAddMoreDoc":
            dontAddMoreDoc(data, bot);
            queryAnswer = "done";
            break;

        case "deleteClaim":
            deleteClaim(data, bot);
            queryAnswer = "delete claim";
            break;
        
        case "viewDocuments":
            viewDocuments(data, bot);
            break;

        //For approver
        case "approvedByApprover":
            displayClaimsToApprover(data, "approved", 0, bot);
            queryAnswer = "displaying approved claims";
            break;

        case "pendingByApprover":
            displayClaimsToApprover(data, "pending", 0, bot);
            queryAnswer = "displaying pending claims";
            break;
        
        case "rejectedByApprover":
            displayClaimsToApprover(data, "rejected", 0, bot);
            queryAnswer = "displaying rejected claims";
            break;

        case "approveClaim":
            setClaimStatus(data, "approve", bot);
            queryAnswer = "claim approved"
            break;
            
        case "rejectClaim":
            setClaimStatus(data, "reject", bot);
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