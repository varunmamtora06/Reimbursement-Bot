const refIdGenerator = () => {
    //generates a random 4 digit id
    let id = Math.floor(1000 + Math.random() * 9000);

    return id.toString();
};

module.exports = refIdGenerator;