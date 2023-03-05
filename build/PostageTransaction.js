"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
// const bitcore = require('@abcpros/bitcore-lib-xec');
const bitcore_lib_xec_1 = __importDefault(require("@abcpros/bitcore-lib-xec"));
class PostageTransaction {
    constructor() {
    }
    splitUtxosIntoStamps(sourceAddress, postOfficeAddress, weight, wif, utxos) {
        const sourceAddr = bitcore_lib_xec_1.default.Address.fromString(sourceAddress);
        const addr = bitcore_lib_xec_1.default.Address.fromString(postOfficeAddress);
        const privkey = bitcore_lib_xec_1.default.PrivateKey.fromWIF(wif);
        const tx = new bitcore_lib_xec_1.default.Transaction()
            .from(utxos.map(u => new bitcore_lib_xec_1.default.Transaction.UnspentOutput({
            txid: u.outpoint.txid,
            vout: u.outpoint.outIdx,
            satoshis: lodash_1.default.toNumber(u.value),
            script: u.outputScript
        })));
        tx.feePerByte(1);
        const stampSize = weight + PostageTransaction.MIN_BYTES_INPUT;
        const originalAmount = utxos.reduce((accumulator, utxo) => accumulator + lodash_1.default.toNumber(utxo.value), 0);
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
                if (tx._getUnspentValue() - fee > bitcore_lib_xec_1.default.Transaction.DUST_AMOUNT + PostageTransaction.XEC_P2PKH_OUTPUT_SIZE) {
                    tx.change(sourceAddr);
                }
            }
        }
        tx.sign(privkey);
        return tx;
    }
}
exports.default = PostageTransaction;
PostageTransaction.MIN_BYTES_INPUT = 148;
PostageTransaction.LOKAD_ID_INDEX = 1;
PostageTransaction.TOKEN_ID_INDEX = 4;
PostageTransaction.LOKAD_ID_INDEX_VALUE = '534c5000';
PostageTransaction.SLP_OP_RETURN_VOUT = 0;
PostageTransaction.XEC_MAX_OUTPUTS = 2500;
PostageTransaction.XEC_P2PKH_OUTPUT_SIZE = 34;
//# sourceMappingURL=PostageTransaction.js.map