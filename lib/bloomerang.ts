export async function pushDonationToBloomerang({
  donorBloomerangId,
  amount,
  date,
  note,
}: {
  donorBloomerangId?: string | null;
  amount: number;
  date: string;
  note: string;
}) {
  if (!donorBloomerangId) return null;
  const apiKey = process.env.BLOOMERANG_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.bloomerang.co/v2/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        AccountId: parseInt(donorBloomerangId),
        Date: date,
        Amount: amount,
        Type: 'Gift',
        InKind: true,
        Note: note,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
