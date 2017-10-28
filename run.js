//
// Runs on web3.js version '1.0.0-beta.24'
// Needs Node 8 for async/await functionality
//
// 0. make all
// 1. Start testrpc with -d flag (e.g. /opt/node/bin/testrpc -d)
// 2. node run.js
//

// == Preamble ============================================================

// Set up Web3. Need testrpc to be running.
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

// The ABI is common to all the contracts
const ABI = '[{"constant":true,"inputs":[{"name":"message","type":"bytes"}],"name":"sha1","outputs":[{"name":"ret","type":"bytes20"}],"payable":false,"type":"function"}]';

// Generated as standard by testrpc -d
const ADDR0 = web3.utils.toChecksumAddress("0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1");

const SHA1 = new web3.eth.Contract(JSON.parse(ABI));
SHA1.options.from = ADDR0;
SHA1.options.gas  = 4000000

const fs = require('fs');

// == The tests to run ====================================================

const testCode = ['sha1_lll.hex', 'sha1_sol.hex', 'sha1_lll_opt.hex', 'sha1_sol_opt.hex'];

const testStrings = [
    'e',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ethereum is a decentralized platform that runs smart contracts: applications that run exactly as programmed without any possibility of downtime, censorship, fraud or third party interference. These apps run on a custom built blockchain, an enormously powerful shared global infrastructure that can move value around and represent the ownership of property. This enables developers to create markets, store registries of debts or promises, move funds in accordance with instructions given long in the past (like a will or a futures contract) and many other things that have not been invented yet, all without a middle man or counterparty risk. The project was bootstrapped via an ether presale in August 2014 by fans all around the world. It is developed by the Ethereum Foundation, a Swiss nonprofit, with contributions from great minds across the globe.',
    '1234567890123456789012345678901234567890123456789012345678901234',
    '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678'
];

// == Control Loop ========================================================

run();

async function run () {
    for (var i = 0; i < testCode.length; i++) {
        console.log('****Contract ' + testCode[i]);
        SHA1.options.data = fs.readFileSync(testCode[i],'utf8').trim();
        await deployAndRun(SHA1);
    }
}

async function deployAndRun(contract) {
    await contract.deploy().send().then(
        async function(myContract){
            if(myContract.options.address) {
                await runTests(myContract);
            } else {
                // TODO - error handling.
            }
        }
    );
}

async function runTests(sha1) {
    for (var i = 0; i < testStrings.length; i++) {
        console.log('String ' + i + ' : ' + testStrings[i].length + ' bytes.');
        await test(sha1, testStrings[i]);
    }
}

async function test(sha1, string) {
    var bytes = stringToHex(string);
    await sha1.methods.sha1(bytes).call().then(console.log);
    await sha1.methods.sha1(bytes).send({from:ADDR0}).then(gasPrint);
}

// == Helper functions ====================================================

function gasPrint(tx) {
    console.log(tx.gasUsed);
}

function stringToHex(s) {
    return "0x" + s.split("").map(function(c) {
        return ("0" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join("");
};
