export function formatCurrency(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return '₹' + value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
