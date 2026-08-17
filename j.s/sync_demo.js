function registerSync() {
    console.log("registerSync");
    return Promise.resolve();
}

function login() {
    console.log("login");
    return Promise.resolve();
}

function getData() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("getData");
            resolve();
        }, 1000);
    });
}

// callback hell is a situation where we have multiple nested callbacks, making the code hard to read and maintain.
// ORIGINAL (Callback Hell - Hard to read):
/*
registerSync(() => {
    login(() => {
        getData(() => {
            console.log("All done");
        });
    });
});
*/

// SOLUTION 1: Using Promise chaining (Better)
console.log("=== Using Promise Chaining ===");
registerSync()
    .then(login)
    .then(getData)
    .then(() => console.log("All done"))
    .catch(err => console.error("Error:", err));

// SOLUTION 2: Using async/await (Best - Most readable)
console.log("\n=== Using async/await ===");
(async function() {
    try {
        await registerSync();
        await login();
        await getData();
        console.log("All done");
    } catch (err) {
        console.error("Error:", err);
    }
})();

// SOLUTION 3: Using async function declaration
console.log("\n=== Using async function ===");
async function runTasks() {
    await registerSync();
    await login();
    await getData();
    console.log("All done");
}
runTasks();

// callback hell is a situation where we have multiple nested callbacks, making the code hard to read and maintain. It can be avoided by using Promises or async/await syntax in JavaScript.
