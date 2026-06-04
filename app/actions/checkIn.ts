'use server';
import { createServiceClient } from '@/lib/supabase/service';
import { pushDonationToBloomerang } from '@/lib/bloomerang';
import { revalidatePath } from 'next/cache';

export async function submitCheckIn(formData: {
  donorId: string;
  donorBloomerangId?: string;
  category: string;
  description: string;
  storageLocation: string;
  condition: string;
  quantity: number;
  fmvPerUnit: number;
  photoUrl?: string;
  notes?: string;
  dateReceived: string;
}) {
  const supabase = createServiceClient();

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
        current_quantity: formData.quantity,
        qr_code: '',
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

  // Attempt Bloomerang sync (non-blocking, failure is OK)
  await pushDonationToBloomerang({
    donorBloomerangId: formData.donorBloomerangId,
    amount: totalFmv,
    date: formData.dateReceived,
    note: `In-kind donation: ${formData.quantity}x ${formData.description} (${formData.condition})`,
  });

  revalidatePath('/');
  revalidatePath('/inventory');
  return { itemId };
}
