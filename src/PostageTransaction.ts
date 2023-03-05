import _ from 'lodash';
import { Utxo } from 'chronik-client';
// const bitcore = require('@abcpros/bitcore-lib-xec');
import bitcore from '@abcpros/bitcore-lib-xec';
export default class PostageTransaction {
  static MIN_BYTES_INPUT = 148
  static LOKAD_ID_INDEX = 1
  static TOKEN_ID_INDEX = 4
  static LOKAD_ID_INDEX_VALUE = '534c5000'
  static SLP_OP_RETURN_VOUT = 0
  static XEC_MAX_OUTPUTS = 2500;
  static XEC_P2PKH_OUTPUT_SIZE = 34;

  constructor() {
  }

  splitUtxosIntoStamps(
    sourceAddress: string,
    postOfficeAddress: string,
    weight: number,
    wif: string,
    utxos: Array<Utxo & { outputScript: string }>,
  ) {

    const sourceAddr = bitcore.Address.fromString(sourceAddress);
    const addr = bitcore.Address.fromString(postOfficeAddress);

    const privkey = bitcore.PrivateKey.fromWIF(wif);

    const tx = new bitcore.Transaction()
      .from(utxos.map(u => new bitcore.Transaction.UnspentOutput({
        txid: u.outpoint.txid,
        vout: u.outpoint.outIdx,
        satoshis: _.toNumber(u.value),
        script: u.outputScript
      })));
    tx.feePerByte(1);

    const stampSize = weight + PostageTransaction.MIN_BYTES_INPUT;

    const originalAmount = utxos.reduce((accumulator, utxo) => accumulator + _.toNumber(utxo.value), 0);

    let numberOfPossibleStamps = Math.floor(originalAmount / stampSize);

    if (numberOfPossibleStamps > PostageTransaction.XEC_MAX_OUTPUTS) {
      numberOfPossibleStamps = PostageTransaction.XEC_MAX_OUTPUTS - 1;
    }

    for (let i = 0; i < numberOfPossibleStamps; i++) {
      // @ts-ignore
      let fee = tx._estimateSize();
      // @ts-ignore
      if (tx._getUnspentValue() - fee > stampSize + PostageTransaction.XEC_P2PKH_OUTPUT_SIZE) {
        tx.to(addr, stampSize);
      }
      if (i == numberOfPossibleStamps - 1) {
        // @ts-ignore
        fee = tx._estimateSize();
        // @ts-ignore
        if (tx._getUnspentValue() - fee > bitcore.Transaction.DUST_AMOUNT + PostageTransaction.XEC_P2PKH_OUTPUT_SIZE) {
          tx.change(sourceAddr);
        }
      }
    }

    tx.sign(privkey);

    return tx;
  }
}