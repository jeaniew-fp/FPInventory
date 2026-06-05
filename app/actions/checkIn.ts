'use server';
import { createServiceClient } from '@/lib/supabase/service';
import { pushDonationToBloomerang } from '@/lib/bloomerang';
import { revalidatePath } from 'next/cache';

export async function submitCheckIn(formData: {
  donorId: string;
  donorBloomerangId?: string;
  program: string;
  category: string;
  description: string;
  storageLocation: string;
  condition: string;
  quantity: number;
  fmvPerUnit: number;
  photoUrl?: string;
  notes?: string;
  dateReceived: string;
  // Gift card fields
  itemType?: string;
  retailer?: string;
  faceValue?: number;
}) {
  const supabase = createServiceClient();

  const isGiftCard = formData.itemType === 'gift_card';

  // Find or create inventory item
  const { data: existing } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('description', formData.description)
    .eq('category', formData.category)
    .eq('storage_location', formData.storageLocation)
    .maybeSingle();

  let itemId: string;
  if (existing) {
    itemId = existing.id;
    await supabase
      .from('inventory_items')
      .update({
        current_quantity: existing.current_quantity + formData.quantity,
        program: formData.program,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
  } else {
    const { data: newItem, error: insertError } = await supabase
      .from('inventory_items')
      .insert({
        category: formData.category,
        description: formData.description,
        storage_location: formData.storageLocation,
        program: formData.program,
        current_quantity: formData.quantity,
        qr_code: '',
        item_type: formData.itemType ?? 'standard',
        retailer: formData.retailer ?? null,
        face_value: formData.faceValue ?? null,
      })
      .select()
      .single();
    if (insertError || !newItem) throw new Error(insertError?.message ?? 'Failed to create item');
    itemId = newItem.id;
    await supabase.from('inventory_items').update({ qr_code: itemId }).eq('id', itemId);
  }

  const totalFmv = formData.fmvPerUnit * formData.quantity;

  const { error: ciError } = await supabase.from('check_ins').insert({
    inventory_item_id: itemId,
    donor_id: formData.donorId,
    quantity: formData.quantity,
    condition: formData.condition,
    fmv_per_unit: formData.fmvPerUnit,
    total_fmv: totalFmv,
    photo_url: formData.photoUrl ?? null,
    notes: formData.notes ?? null,
    date_received: formData.dateReceived,
  });
  if (ciError) throw new Error(ciError.message);

  // Attempt Bloomerang sync (non-blocking)
  await pushDonationToBloomerang({
    donorBloomerangId: formData.donorBloomerangId,
    amount: totalFmv,
    date: formData.dateReceived,
    note: isGiftCard
      ? `Gift card donation: ${formData.quantity}x ${formData.description}`
      : `In-kind donation: ${formData.quantity}x ${formData.description} (${formData.condition})`,
  });

  revalidatePath('/');
  revalidatePath('/inventory');
  return { itemId };
}
