export type CalculationItem = {
  quantity: number;
  rate: number;
  wastagePercent: number;
};

export type EstimateTotals = {
  subtotal: number;
  wastageTotal: number;
  contingencyAmount: number;
  taxAmount: number;
  grandTotal: number;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateItem(item: CalculationItem) {
  const baseAmount = item.quantity * item.rate;
  const wastageAmount = baseAmount * item.wastagePercent / 100;
  return {
    baseAmount: roundMoney(baseAmount),
    wastageAmount: roundMoney(wastageAmount),
    amount: roundMoney(baseAmount + wastageAmount),
  };
}

export function calculateEstimate(
  items: CalculationItem[],
  contingencyPercent: number,
  taxPercent: number,
): EstimateTotals {
  let subtotal = 0;
  let wastageTotal = 0;
  for (const item of items) {
    const calculated = calculateItem(item);
    subtotal += calculated.baseAmount;
    wastageTotal += calculated.wastageAmount;
  }
  subtotal = roundMoney(subtotal);
  wastageTotal = roundMoney(wastageTotal);
  const beforeContingency = subtotal + wastageTotal;
  const contingencyAmount = roundMoney(beforeContingency * contingencyPercent / 100);
  const taxAmount = roundMoney((beforeContingency + contingencyAmount) * taxPercent / 100);
  return {
    subtotal,
    wastageTotal,
    contingencyAmount,
    taxAmount,
    grandTotal: roundMoney(beforeContingency + contingencyAmount + taxAmount),
  };
}
