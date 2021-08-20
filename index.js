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
                        
                        const createdClaim = await Claim.create({
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

const displayClaims =  async (data, status, viewMoreCounter=0) => {
    const chatid = data.message.chat.id;
    const username = data.message.chat.username;
    // await console.log(`username->${username}`);
    // console.log(`viewMOrCount->${viewMoreCounter}`);
    // console.log(`viewMOr->${JSON.stringify(data)}`);
    // let dataArr = data.data.split("+");
    // console.log(`viewMOrArr->${dataArr}`);
    let iter = 0;

    const userClaims =  await Claim.find({ claimer: username, status: status }).skip(viewMoreCounter*3).limit(3);
    // await console.log(`claims->${JSON.stringify(userClaims)}`);

    await userClaims.forEach( async (claim) => {
        // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
        const claimDetail = `ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status} \n Claim made on: ${claim.createdAt.getDate()}-${claim.createdAt.getMonth()+1}-${claim.createdAt.getYear()-100+2000} \n No of Docs: ${claim?.docs?.length ?? "No documents."}`;
        iter+=1;
        if(claim.status === "pending"){
            await bot.sendMessage(chatid, claimDetail, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🗑 Delete Claim", callback_data: "deleteClaim" },
                            { text: "📃 View Documents", callback_data: "viewDocuments" },
                            
                        ],
                    ],
                },
            });
        } else {
            bot.sendMessage(chatid, claimDetail, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📃 View Documents", callback_data: "viewDocuments" },
                            
                        ],
                    ],
                },
            });
        }


    });

    if(userClaims.length > 0 && iter === userClaims.length){
        setTimeout(()=>{
            bot.sendMessage(chatid, `To get more claims.`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "View More", callback_data: `viewMore+${status}+${++viewMoreCounter}`},
                        ],
                    ],
                },
            })
        },
            600
        );
    } else {
        bot.sendMessage(chatid, `No more claims.`);
    }

};

const deleteClaim = async (data) => {
    console.log(`delData->${JSON.stringify(data)}`);
    const chatid = data.message.chat.id;
    const claimId = data.message.text.split('\n')[0].slice(4).trim();
    console.log(`delClaimID->${claimId}`);
    
    await Claim.deleteOne({_id: claimId});
};

const viewDocuments = async (data) => {
    const chatId = data.message.chat.id;
    const claimId = data.message.text.split('\n')[0].slice(4).trim();

    const userClaims = await Claim.find({ _id: claimId });
    if (userClaims.length > 0){
        await userClaims.forEach(async (claim) => {
            // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
            // const claimDetail = `ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status} \n No of Docs: ${claim.docs.length}`;
            if(claim.docs.length > 0){
                claim.docs.forEach(async (doc) => {
                    bot.sendPhoto(chatId, doc, {
                        caption: `By claimer: ${claim.claimer}`
                    });
                });
            } else {
                bot.sendMessage(chatId, "No documents found.");
            }

        });
    } else {
        bot.sendMessage(chatId, "No claims found.");
    }
};


const displayClaimsToApprover = async(data, status, viewMoreCounter=0) => {
    const chatid = data.message.chat.id;
    const userClaims =  await Claim.find({status: status}).skip(viewMoreCounter*3).limit(3);
    let iter = 0;
    
    userClaims.forEach( (claim) => {
        // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
        const claimDetail = `ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status} \nClaimer: ${claim.claimer}\n Claim made on: ${claim.createdAt.getDate()}-${claim.createdAt.getMonth()+1}-${claim.createdAt.getYear()-100+2000} \n No of Docs: ${claim?.docs?.length ?? "No documents."}`;
        
        console.log(`iter->${userClaims.length}`);
        bot.sendMessage(chatid, claimDetail, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✔ Approve Claim", callback_data: "approveClaim" },
                        { text: "❌ Reject Claim", callback_data: "rejectClaim" },
                        { text: "📃 View Documents", callback_data: "viewDocuments" },
                    ],
                ],
            },
        });
        iter+=1;
    });

    if(userClaims.length > 0 && iter === userClaims.length){
        setTimeout(()=>{
            bot.sendMessage(chatid, `To get more claims.`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "View More", callback_data: `viewMoreApprover+${status}+${++viewMoreCounter}`},
                        ],
                    ],
                },
            })
        },
            600
        );
    } else {
        bot.sendMessage(chatid, `No more claims.`);
    }

};

const setClaimStatus = async (data, status) => {
    const chatid = data.message.chat.id;
    const claimId = data.message.text.split('\n')[0].slice(4).trim();

    const claim = await Claim.findOne({_id: claimId});

    if(status === "approve"){
        await Claim.updateOne({_id: claimId},{$set: {isApproved: true, status: "approved", approvedBy: data.message.chat?.username}});
    } else {
        await Claim.updateOne({_id: claimId},{$set: {isApproved: true, status: "rejected", rejectedBy: data.message.chat?.username}});
    }

    bot.sendMessage(chatid, `The claim ${claimId} ${status}ed successfully.`);
    await bot.sendMessage(claim.claimerChatId, `The claim ${claimId} ${status}ed successfully.`);
};

const addDocs = async(data) => {
    const chatId = data.message.chat.id;

    let isDocs = true;
    let claimObj = {};
    let claimDocArr = [];
    let dataArr = data.data.split("+");
    claimObj = JSON.parse(dataArr[1]);
    claimObj.docs = claimDocArr;
    let resp = "Enter document as a reply to this message.";
    let replyMsg = await bot.sendMessage(chatId, resp);

    await bot.onReplyToMessage(
        replyMsg.chat.id,
        replyMsg.message_id,
        async (document) => {
                console.log(`DoccIs->${JSON.stringify(document)}`);
                claimDocArr.push(document.photo[0].file_id);
                console.log(`claimDocArr->${claimDocArr}`);
                claimObj.docs.push(document.photo[0].file_id);
                console.log(`claimObjs->${JSON.stringify(claimObj)}`);
                

                const createdClaim = await Claim.create({
                    description: claimObj.description,
                    totalAmount: claimObj.totalAmount,
                    claimer: replyMsg?.chat?.username,
                    claimerChatId: chatId,
                    docs: [document.photo[0].file_id]
                });
                
                console.log(`createCl->${JSON.stringify(createdClaim)}`);

                let resp = "Do you have another bill document?";
                await bot.sendMessage(chatId, resp, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Yes", callback_data: `addMoreDoc+${createdClaim._id}` },
                                { text: "No", callback_data: `dontAddMoreDoc` },
                                // { text: "Yes", callback_data: obzS },
                                // { text: "No", callback_data: obzS },
                            ],
                        ],
                    },
                });
                
                // bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);
            }
        );
};

const dontAddDoc = async (data) => {
    const chatId = data.message.chat.id;
    let dataArr = data.data.split("+");

    let claimObj = JSON.parse(dataArr[1]);

    console.log(`MadeclaimIZ->${JSON.stringify(claimObj)}`);

    await Claim.create({
                            description: claimObj.description,
                            totalAmount: claimObj.totalAmount,
                            claimer: data?.message?.chat?.username ?? data?.message?.chat?.first_name ?? `${chatId}`,
                            claimerChatId: chatId
                        });
    bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);

};

const dontAddMoreDoc = async(data) => {
    const chatId = data.message.chat.id;
    // console.log(`dont->${JSON.stringify(data)}`);
    // let dataArr = data.data.split("+");
    // let claimDocId = JSON.parse(dataArr[1]);

    // await Claim.create({
    //                 description: claimObj.description,
    //                 totalAmount: claimObj.totalAmount,
    //                 claimer: data.message.chat.username,
    //                 claimerChatId: chatId,
    //                 docs: claimObj.docs
    //             });
    bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);
};

const addMoreDoc = async (data) => {
    const chatId = data.message.chat.id;
    console.log(`dont->${JSON.stringify(data)}`);
    let dataArr = data.data.split("+");
    console.log(`dataarr->${dataArr}`);
    let claimDocId = dataArr[1];

    let resp = "Add a doc as a response to this message";
    let replyMsg = await bot.sendMessage(chatId, resp);

    await bot.onReplyToMessage(
        replyMsg.chat.id,
        replyMsg.message_id,
        async (document) => {
                console.log(`DoccIs->${JSON.stringify(document)}`);
                // claimDocArr.push(document.photo[0].file_id);
                // console.log(`claimDocArr->${claimDocArr}`);
                // claimObj.docs.push(document.photo[0].file_id);
                // console.log(`claimObjs->${JSON.stringify(claimObj)}`);
                
                await Claim.updateOne({_id:claimDocId},{$push:{"docs":document.photo[0].file_id}});
                
                
                // bot.sendMessage(chatId, `Your claim is made successfully.\nUse /myclaims to get all of your claims.`);
                resp = "Do you have another bill document?";
                await bot.sendMessage(chatId, resp, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Yes", callback_data: `addMoreDoc+${claimDocId}` },
                                { text: "No", callback_data: `dontAddMoreDoc` },
                                // { text: "Yes", callback_data: obzS },
                                // { text: "No", callback_data: obzS },
                            ],
                        ],
                    },
                });
            }
        );

    

};


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

        case "viewMore":
            let dataArray = data.data.split("+");
            console.log(`this more->${dataArray}`)
            displayClaims(data, dataArray[1], parseInt(dataArray[2]));
            break;
        
        case "viewMoreApprover":
            let dataArrayApprover = data.data.split("+");
            console.log(`this more->${dataArrayApprover}`)
            displayClaimsToApprover(data, dataArrayApprover[1], parseInt(dataArrayApprover[2]));
            break;

        case "addDoc":
            addDocs(data);
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
            dontAddDoc(data);
            queryAnswer = "done";
            break;

        case "addMoreDoc":
            addMoreDoc(data);
            break;

        case "dontAddMoreDoc":
            dontAddMoreDoc(data);
            queryAnswer = "done";
            break;

        case "deleteClaim":
            deleteClaim(data);
            queryAnswer = "delete claim";
            break;
        
        case "viewDocuments":
            viewDocuments(data);
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