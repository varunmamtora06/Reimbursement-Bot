//Importing Models
const Claim = require("../models/Claim");

const displayClaims =  async (data, status, viewMoreCounter=0, bot) => {
    const chatid = data.message.chat.id;
    const username = data.message.chat.username;
    let iter = 0;

    const userClaims =  await Claim.find({ claimer: username, status: status }).skip(viewMoreCounter*3).limit(3);
    // await console.log(`claims->${JSON.stringify(userClaims)}`);

    await userClaims.forEach( async (claim) => {
        // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
        const claimDetail = `Claim Reference: ${claim.claimRefId} \nAmount: ${claim.totalAmount} \nDescription: ${claim.description} \nStatus: ${claim.status} \nClaim made on: ${claim.createdAt.getDate()}-${claim.createdAt.getMonth()+1}-${claim.createdAt.getYear()-100+2000} \nNo of Docs: ${claim?.docs?.length ?? "No documents."}`;
        iter+=1;
        if(claim.status === "pending"){
            await bot.sendMessage(chatid, claimDetail, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🗑 Delete Claim", callback_data: `deleteClaim+${claim._id}` },
                            { text: "📃 View Documents", callback_data: `viewDocuments+${claim._id}` },
                            
                        ],
                    ],
                },
            });
        } else {
            bot.sendMessage(chatid, claimDetail, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📃 View Documents", callback_data: `viewDocuments+${claim._id}` },
                            
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


const displayClaimsToApprover = async(data, status, viewMoreCounter=0, bot) => {
    const chatid = data.message.chat.id;
    const userClaims =  await Claim.find({status: status}).skip(viewMoreCounter*3).limit(3);
    let iter = 0;
    
    userClaims.forEach( (claim) => {
        // console.log(`ID: ${claim._id} \n Amount: ${claim.totalAmount} \n Description: ${claim.description} \n Status: ${claim.status}`);
        const claimDetail = `Claim Reference: ${claim.claimRefId} \nAmount: ${claim.totalAmount} \nDescription: ${claim.description} \nStatus: ${claim.status} \nClaimer: ${claim.claimer}\nClaim made on: ${claim.createdAt.getDate()}-${claim.createdAt.getMonth()+1}-${claim.createdAt.getYear()-100+2000} \nNo of Docs: ${claim?.docs?.length ?? "No documents."}`;
        
        console.log(`iter->${userClaims.length}`);
        bot.sendMessage(chatid, claimDetail, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✔ Approve Claim", callback_data: `approveClaim+${claim._id}` },
                        { text: "❌ Reject Claim", callback_data: `rejectClaim+${claim._id}` },
                        { text: "📃 View Documents", callback_data: `viewDocuments+${claim._id}` },
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


const setClaimStatus = async (data, status, bot) => {
    const chatid = data.message.chat.id;
    // const claimId = data.message.text.split('\n')[0].slice(4).trim();
    const claimId = data.data.split("+")[1];

    const claim = await Claim.findOne({_id: claimId});

    if(status === "approve"){
        await Claim.updateOne({_id: claimId},{$set: {isApproved: true, status: "approved", approvedBy: data.message.chat?.username}});
    } else {
        await Claim.updateOne({_id: claimId},{$set: {isApproved: true, status: "rejected", rejectedBy: data.message.chat?.username}});
    }

    bot.sendMessage(chatid, `The claim ${claim.claimRefId} ${status}ed successfully.`);
    await bot.sendMessage(claim.claimerChatId, `The claim ${claim.claimRefId} ${status}ed successfully.`);
};


const deleteClaim = async (data, bot) => {
    console.log(`delData->${JSON.stringify(data)}`);
    const chatid = data.message.chat.id;
    // const claimId = data.message.text.split('\n')[0].slice(4).trim();
    const claimId = data.data.split("+")[1];
    console.log(`delClaimID->${claimId}`);
    
    await Claim.deleteOne({_id: claimId});
};

module.exports = {
    displayClaims,
    displayClaimsToApprover,
    setClaimStatus,
    deleteClaim
};