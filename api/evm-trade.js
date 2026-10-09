// EVM trading (Robinhood Chain, BNB Chain, Base): buy or sell a tweetpad coin in its Uniswap v4 pool, signed and paid by the user's own wallet.
// GET  ?chain&coin=0x…&side=buy|sell&amount=0.01          → { expected }   (a live quote: the native coin in for a buy, coins in for a sell)
// POST { chain, wallet, coin, side, amount, slippageBps }  → { calls: [{ label, to, data, value }], expected, minimum }
// chain defaults to robinhood. Amounts are decimal strings (native coins and tweetpad coins all have 18 decimals); returned
// amounts are base units as decimal strings.
const { cors, readJson, isEvmAddress, EVM_CHAINS, rateLimit, fail } = require('./_lib');

/* "0.25" → 0.25e18, without going through floating point */
function toUnits(s) {
  const m = /^(\d{1,12})(?:\.(\d{1,18}))?$/.exec(String(s || '').trim());
  return m ? BigInt(m[1]) * 10n ** 18n + BigInt((m[2] || '').padEnd(18, '0')) : null;
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'GET, POST')) return;
  if (!await rateLimit(req, res, 'evm-trade', 120, 600)) return;
  const b = req.method === 'POST' ? await readJson(req) : req.query;
  if (!b) return fail(res, 400, 'invalid JSON');
  const amountIn = toUnits(b.amount);
  const chain = b.chain || 'robinhood';
  if (!EVM_CHAINS.includes(chain)) return fail(res, 400, 'unknown chain');
  if (!isEvmAddress(b.coin)) return fail(res, 400, 'invalid coin address');
  if (b.side !== 'buy' && b.side !== 'sell') return fail(res, 400, 'side must be buy or sell');
  if (!amountIn) return fail(res, 400, 'enter an amount');
  if (b.side === 'buy' && amountIn > 10n * 10n ** 18n) return fail(res, 400, 'buy at most 10 ' + (chain === 'bnb' ? 'BNB' : 'ETH') + ' at a time');

  const evm = require('./_evm');   // viem is only loaded for EVM chains
  try {
    if (req.method !== 'POST') {
      const expected = await evm.quoteTrade(chain, b.coin, b.side, amountIn).catch(() => { throw Object.assign(new Error('this coin has no pool to trade in yet'), { status: 400 }); });
      return res.status(200).json({ expected: expected.toString() });
    }
    if (!isEvmAddress(b.wallet)) return fail(res, 400, 'connect an EVM wallet');
    const slippageBps = Number(b.slippageBps);
    if (!Number.isInteger(slippageBps) || slippageBps < 10 || slippageBps > 5000) return fail(res, 400, 'slippage must be 0.1–50%');
    const t = await evm.buildTrade({ chain, wallet: evm.getAddress(b.wallet), coin: b.coin, side: b.side, amountIn, slippageBps });
    const hex = (n) => '0x' + n.toString(16);
    return res.status(200).json({ calls: t.calls.map(c => ({ label: c.label, to: c.to, data: c.data, value: hex(c.value) })),
      expected: t.expected.toString(), minimum: t.minimum.toString() });
  } catch (err) {
    return fail(res, err.status || 502, err.status ? err.message : 'could not quote: ' + (err.shortMessage || err.message || '').split('\n')[0].slice(0, 140));
  }
};
