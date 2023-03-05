import BigNumber from 'bignumber.js';
import { ChronikClient, ScriptType, ScriptUtxos, Token, Utxo } from "chronik-client";
import * as _ from 'lodash';
import yargs from "yargs";
import { hideBin } from 'yargs/helpers';
import PostageTransaction from './PostageTransaction';
import bitcore from '@abcpros/bitcore-lib-xec';
// const bitcore = require('@abcpros/bitcore-lib-xec');
const ecashaddr = require('ecashaddrjs');
require('dotenv').config();


const args = yargs(hideBin(process.argv))
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

const toScriptPayload = (
  address: string
): { type: string; scriptPayload: string } => {
  const { prefix, type, hash } = ecashaddr.decode(address);
  const scriptPayload = Buffer.from(hash).toString("hex");
  return { type, scriptPayload };
};

console.log('url:', process.env.CHRONIK_URL);
const chronik = new ChronikClient(`${process.env.CHRONIK_URL}/${network}`);
(async () => {
  try {
    const postageTx = new PostageTransaction();
    const weight = (args as any)['weight'] ?? 1000;
    const wif = (args as any)['wif'];

    const privkey = bitcore.PrivateKey.fromWIF(wif);
    const sourceAddress = bitcore.Address.fromPublicKey(privkey.publicKey).toString();
    const { scriptPayload, type } = toScriptPayload(sourceAddress);
    const scriptType: ScriptType = <ScriptType>_.toLower(type) || "p2pkh";
    const utxosData: ScriptUtxos[] = await chronik
      .script(scriptType, scriptPayload)
      .utxos();
    const utxos = _.flatMap(utxosData, (scriptUtxos: ScriptUtxos) => {
      return scriptUtxos.utxos.map((utxo: Utxo) => {
        return {
          ...utxo,
          outputScript: scriptUtxos.outputScript
        }
      })
    });

    const postOfficeAddress = (args as any)['address'];

    const splitTx = postageTx.splitUtxosIntoStamps(sourceAddress, postOfficeAddress, weight, wif, utxos);
    console.log('splitTx', splitTx);
    const txid = await chronik.broadcastTx(Buffer.from(splitTx.serialize(), 'hex'));
    console.log(`Broadcasted stamp split tx: ${txid}`);
  } catch (error) {
    console.error('Unable to generate stamps');
    console.error(JSON.stringify(error));
  }
})();
