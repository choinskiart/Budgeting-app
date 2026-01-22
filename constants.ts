export const CURRENCY_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});

export const PERCENTAGE_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const getCurrentMonthId = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthName = (monthId: string) => {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
};
