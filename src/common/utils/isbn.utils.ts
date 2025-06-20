export function generateISBN(): string {
  const prefix = '978';
  let middlePart = '';
  for (let i = 0; i < 9; i++) {
    middlePart += Math.floor(Math.random() * 10).toString();
  }
  const isbnWithoutChecksum = prefix + middlePart;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbnWithoutChecksum[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${prefix}-${middlePart.substring(0, 1)}-${middlePart.substring(1, 5)}-${middlePart.substring(5, 9)}-${checksum}`;
}
