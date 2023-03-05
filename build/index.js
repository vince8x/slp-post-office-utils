"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chronik_client_1 = require("chronik-client");
const _ = __importStar(require("lodash"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const PostageTransaction_1 = __importDefault(require("./PostageTransaction"));
const bitcore_lib_xec_1 = __importDefault(require("@abcpros/bitcore-lib-xec"));
// const bitcore = require('@abcpros/bitcore-lib-xec');
const ecashaddr = require('ecashaddrjs');
require('dotenv').config();
const args = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .alias('v', 'version')
    .alias('h', 'help')
    .usage('Usage: Utility for slp postage server')
    .showHelpOnFail(false, 'Specify --help for avalable options')
    .options({
    'help': { alias: 'h', describe: 'Show help' },
    'address': { type: 'string', demandOption: false, alias: 'a', desc: 'Specify the stamp address' },
    'wif': { type: 'string', demandOption: false, alias: 'w', desc: 'Specify the WIF' },
})
    .check((argv) => {
    if (argv.address && argv.wif) {
        return true;
    }
    throw new Error(`
      You must specify the address to send the stamp to and the wif of the source
    `);
}).parse();
const network = 'xec';
const toScriptPayload = (address) => {
    const { prefix, type, hash } = ecashaddr.decode(address);
    const scriptPayload = Buffer.from(hash).toString("hex");
    return { type, scriptPayload };
};
console.log('url:', process.env.CHRONIK_URL);
const chronik = new chronik_client_1.ChronikClient(`${process.env.CHRONIK_URL}/${network}`);
(async () => {
    var _a;
    try {
        const postageTx = new PostageTransaction_1.default();
        const weight = (_a = args['weight']) !== null && _a !== void 0 ? _a : 1000;
        const wif = args['wif'];
        const privkey = bitcore_lib_xec_1.default.PrivateKey.fromWIF(wif);
        const sourceAddress = bitcore_lib_xec_1.default.Address.fromPublicKey(privkey.publicKey).toString();
        const { scriptPayload, type } = toScriptPayload(sourceAddress);
        const scriptType = _.toLower(type) || "p2pkh";
        const utxosData = await chronik
            .script(scriptType, scriptPayload)
            .utxos();
        const utxos = _.flatMap(utxosData, (scriptUtxos) => {
            return scriptUtxos.utxos.map((utxo) => {
                return Object.assign(Object.assign({}, utxo), { outputScript: scriptUtxos.outputScript });
            });
        });
        const postOfficeAddress = args['address'];
        const splitTx = postageTx.splitUtxosIntoStamps(sourceAddress, postOfficeAddress, weight, wif, utxos);
        console.log('splitTx', splitTx);
        const txid = await chronik.broadcastTx(Buffer.from(splitTx.serialize(), 'hex'));
        console.log(`Broadcasted stamp split tx: ${txid}`);
    }
    catch (error) {
        console.error('Unable to generate stamps');
        console.error(JSON.stringify(error));
    }
})();
//# sourceMappingURL=index.js.map