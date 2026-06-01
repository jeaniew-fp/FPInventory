'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitCheckOut(formData: {
  inventoryItemId: string;
  clientFirstName: string;
  clientLastName: string;
  hmisNumber?: string;
  caseManagerId: string;
  program: string;
  quantity: number;
  dateGiven: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('current_quantity')
    .eq('id', formData.inventoryItemId)
    .single();

  if (fetchError || !item) throw new Error('Item not found');
  if (item.current_quantity < formData.quantity)
    throw new Error(`Only ${item.current_quantity} available`);

  const { error: coError } = await supabase.from('check_outs').insert({
    inventory_item_id: formData.inventoryItemId,
    client_first_name: formData.clientFirstName,
    client_last_name: formData.clientLastName,
    hmis_number: formData.hmisNumber ?? null,
    case_manager_id: formData.caseManagerId,
    program: formData.program,
    quantity: formData.quantity,
    date_given: formData.dateGiven,
    created_by: user.id,
  });
  if (coError) throw new Error(coError.message);

  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({
      current_quantity: item.current_quantity - formData.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formData.inventoryItemId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath('/');
  revalidatePath('/inventory');
}
