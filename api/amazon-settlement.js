/** Amazon SP-API finances → bruto / comissão / frete / estornos / outras. */

export const AMZ_COMMISSION_FEE_TYPES = new Set([
  'Commission',
  'GiftwrapCommission',
  'RefundCommission',
  'FixedClosingFee',
  'VariableClosingFee',
  'SalesTaxCollectionFee'
]);

export const AMZ_SHIPPING_FEE_TYPES = new Set([
  'ShippingHB',
  'MFNPostageFee',
  'MFNShippingChargeback',
  'FBAPerUnitFulfillmentFee',
  'FBAPerOrderFulfillmentFee',
  'FBAWeightBasedFee',
  'ShippingChargeback',
  'PostageBilling',
  'DeliveryServicesFee',
  'FBATransportationFee'
]);

export function amzMoney(amountObj) {
  return Number(amountObj?.CurrencyAmount || 0);
}

export function amzRound2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/**
 * Frete implícito quando já se conhece bruto, comissão, outras taxas e líquido marketplace.
 * Fórmula do admin: Bruto − Comissão − Líquido − Outras − Estornos = Frete.
 */
export function amazonImpliedShipping(gross, fees, net, otherFees = 0, refunds = 0) {
  const g = amzRound2(gross);
  const f = amzRound2(fees);
  const n = amzRound2(net);
  const o = amzRound2(otherFees);
  const r = amzRound2(refunds);
  if (!(g > 0) || !(n >= 0)) return null;
  const ship = amzRound2(g - f - n - o - r);
  if (ship >= 0 && ship < g) return ship;
  return ship >= 0 ? ship : null;
}

/** Identity check: bruto − tarifa − otherFees − líquido = frete. */
export function amazonReceiptIdentity(gross, fees, shipping, net, otherFees = 0, refunds = 0) {
  const left = amzRound2(gross - fees - otherFees - net - refunds);
  return Math.abs(left - amzRound2(shipping)) <= 0.02;
}

/** Walk Finances payload → bruto / comissão / frete / estornos / outras. */
export function summarizeAmzFinancialEvents(financialEvents) {
  const fe = financialEvents && typeof financialEvents === 'object' ? financialEvents : {};
  let principalSold = 0;
  let refunds = 0;
  let commission = 0;
  let shipping = 0;
  let pocket = 0;
  let otherFees = 0;
  let hasRefund = false;
  const feeSamples = [];

  function noteFee(feeType, amount) {
    pocket += amount;
    const t = String(feeType || '');
    if (AMZ_COMMISSION_FEE_TYPES.has(t)) {
      commission -= amount;
    } else if (AMZ_SHIPPING_FEE_TYPES.has(t)) {
      shipping -= amount;
    } else {
      otherFees -= amount;
    }
    if (feeSamples.length < 24 && amount !== 0) {
      feeSamples.push({ type: t || 'Fee', amount: amzRound2(amount) });
    }
  }

  function noteCharge(chargeType, amount, isRefundContext) {
    pocket += amount;
    if (String(chargeType || '') !== 'Principal') return;
    if (isRefundContext || amount < 0) {
      hasRefund = true;
      if (amount < 0) refunds -= amount;
    } else {
      principalSold += amount;
    }
  }

  function walkShipmentLike(list, isRefund) {
    for (const sh of list || []) {
      if (isRefund) hasRefund = true;
      for (const fee of sh.ShipmentFeeList || []) noteFee(fee.FeeType, amzMoney(fee.FeeAmount));
      for (const fee of sh.ShipmentFeeAdjustmentList || []) noteFee(fee.FeeType, amzMoney(fee.FeeAmount));
      for (const ch of sh.OrderChargeList || []) noteCharge(ch.ChargeType, amzMoney(ch.ChargeAmount), isRefund);
      for (const ch of sh.OrderChargeAdjustmentList || []) noteCharge(ch.ChargeType, amzMoney(ch.ChargeAmount), isRefund);
      const itemLists = [sh.ShipmentItemList, sh.ShipmentItemAdjustmentList];
      for (const items of itemLists) {
        for (const it of items || []) {
          for (const ch of it.ItemChargeList || []) noteCharge(ch.ChargeType, amzMoney(ch.ChargeAmount), isRefund);
          for (const ch of it.ItemChargeAdjustmentList || []) noteCharge(ch.ChargeType, amzMoney(ch.ChargeAmount), isRefund);
          for (const fee of it.ItemFeeList || []) noteFee(fee.FeeType, amzMoney(fee.FeeAmount));
          for (const fee of it.ItemFeeAdjustmentList || []) noteFee(fee.FeeType, amzMoney(fee.FeeAmount));
        }
      }
    }
  }

  walkShipmentLike(fe.ShipmentEventList, false);
  walkShipmentLike(fe.RefundEventList, true);
  walkShipmentLike(fe.GuaranteeClaimEventList, true);
  walkShipmentLike(fe.ChargebackEventList, true);

  for (const svc of fe.ServiceFeeEventList || []) {
    for (const fee of svc.FeeList || []) noteFee(fee.FeeType, amzMoney(fee.FeeAmount));
  }

  return {
    principalSold: amzRound2(principalSold),
    principal: amzRound2(principalSold - refunds),
    refunds: amzRound2(Math.max(0, refunds)),
    commission: amzRound2(Math.max(0, commission)),
    shipping: amzRound2(Math.max(0, shipping)),
    otherFees: amzRound2(Math.max(0, otherFees)),
    net: amzRound2(pocket),
    hasRefund,
    feeSamples
  };
}
