//Importing Models
const Claim = require("../models/Claim");

const viewDocuments = async (data, bot) => {
    const chatId = data.message.chat.id;
    // const claimId = data.message.text.split('\n')[0].slice(4).trim();
    const claimId = data.data.split("+")[1];
    console.log(`disz->${JSON.stringify(data)}`);
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


const addDocs = async(data, bot) => {
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

const dontAddDoc = async (data, bot) => {
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

const addMoreDoc = async (data, bot) => {
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

const dontAddMoreDoc = async(data, bot) => {
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

module.exports = {
    viewDocuments,
    addDocs,
    dontAddDoc,
    addMoreDoc,
    dontAddMoreDoc
};