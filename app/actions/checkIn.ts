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
}): Promise<{ itemId: string | null; error: string | null }> {
  try {
    const supabase = createServiceClient();

    const isGiftCard = formData.itemType === 'gift_card';

    // Find or create inventory item
    const { data: existing, error: findError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('description', formData.description)
      .eq('category', formData.category)
      .eq('storage_location', formData.storageLocation)
      .maybeSingle();

    if (findError) {
      console.error('[checkIn] find item error:', findError);
      return { itemId: null, error: findError.message };
    }

    let itemId: string;
    if (existing) {
      itemId = existing.id;
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_quantity: existing.current_quantity + formData.quantity,
          program: formData.program,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (updateError) {
        console.error('[checkIn] update quantity error:', updateError);
        return { itemId: null, error: updateError.message };
      }
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
      if (insertError || !newItem) {
        console.error('[checkIn] insert item error:', insertError);
        return { itemId: null, error: insertError?.message ?? 'Failed to create item' };
      }
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
    if (ciError) {
      console.error('[checkIn] insert check_in error:', ciError);
      return { itemId: null, error: ciError.message };
    }

    // Attempt Bloomerang sync (non-blocking, never fails the check-in)
    try {
      await pushDonationToBloomerang({
        donorBloomerangId: formData.donorBloomerangId,
        amount: totalFmv,
        date: formData.dateReceived,
        note: isGiftCard
          ? `Gift card donation: ${formData.quantity}x ${formData.description}`
          : `In-kind donation: ${formData.quantity}x ${formData.description} (${formData.condition})`,
      });
    } catch {
      // Bloomerang sync failure never blocks a check-in
    }

    revalidatePath('/');
    revalidatePath('/inventory');
    return { itemId, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[checkIn] unexpected error:', message);
    return { itemId: null, error: message };
  }
}
