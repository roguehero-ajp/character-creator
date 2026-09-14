# Power-Up Monetization Bridge

The power-up store runs in clearly labeled demo mode by default. It never charges money or serves a real advertisement unless a production bridge is installed before `power-ups.js` loads.

## Production contract

Set live mode and expose these two asynchronous methods:

```js
window.JM_MONETIZATION_MODE = 'live';
window.JMMonetization = {
  async showRewardedAd({ placementId, powerUpId, quantity }) {
    // Resolve only after the ad provider confirms the reward callback.
    return { rewarded: true };
  },

  async purchasePowerUpPack({ productId, powerUpId, quantity }) {
    // Resolve only after the payment is verified by the server/store.
    return { purchased: true, quantity: 5 };
  }
};
```

The runtime grants an ad reward only for `true` or `{ rewarded: true }`. It grants a purchase only for `true` or `{ purchased: true }`.

## Product IDs

| Power-up | Product ID | Pack |
| --- | --- | --- |
| Kevlar Tank Top | `jm.powerup.kevlar_tank_top.pack5` | 5 charges |
| Backup Juice | `jm.powerup.backup_juice.pack5` | 5 charges |
| Flex Capacitor | `jm.powerup.flex_capacitor.pack5` | 5 charges |
| Tank Rocket Wax | `jm.powerup.tank_rocket_wax.pack5` | 5 charges |

## Before enabling real payments

- Choose the payment/store and rewarded-ad providers, prices, currencies, and ad placement IDs.
- Verify purchases and rewarded-ad callbacks with the provider, never from a client-supplied flag alone.
- Replace local-only inventory with authenticated, server-backed entitlements so paid charges survive devices and cannot be granted by editing browser storage.
- Add restore-purchase, refund/revocation, consent, privacy, age-rating, and regional-compliance flows required by the selected providers and storefronts.
