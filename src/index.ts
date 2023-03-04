import bitcore from '@abcpros/bitcore-lib-xec';
import BigNumber from 'bignumber.js';
import * as ecashaddr from "ecashaddrjs";
import { ChronikClient, ScriptType, ScriptUtxos, Token } from "chronik-client";
import * as _ from 'lodash';
import yargs from "yargs";
import { hideBin } from 'yargs/helpers';
import PostageTransaction from './PostageTransaction';


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

const chronik = new ChronikClient(`${process.env.CHRONIK_URL}/${network}`);
(async () => {
  try {
    const postageTx = new PostageTransaction();
    const weight = args['weight'] ?? 1000;
    const wif = args['wif'];

    const privkey = bitcore.PrivateKey.fromWIF(args['wif']);
    const sourceAddress = privkey.publicKey.toAddress().toString(true);
    const { scriptPayload, type } = toScriptPayload(sourceAddress);
    const scriptType: ScriptType = <ScriptType>_.toLower(type) || "p2pkh";
    const utxosData: ScriptUtxos[] = await chronik
      .script(scriptType, scriptPayload)
      .utxos();
    const utxos = _.flatMap(utxosData, (scriptUtxos: ScriptUtxos) => {
      return scriptUtxos.utxos
    });

    const postOfficeAddress = args['address'];

    const splitTx: bitcore.Transaction = postageTx.splitUtxosIntoStamps(postOfficeAddress, weight, wif, utxos);
    const txid = chronik.broadcastTx(Buffer.from(splitTx.serialize(), 'hex'));
    console.log(`Broadcasted stamp split tx: ${txid}`);
  } catch (error) {
    console.error('Unable to generate stamps');
    console.error(JSON.stringify(error));
  }
})();
